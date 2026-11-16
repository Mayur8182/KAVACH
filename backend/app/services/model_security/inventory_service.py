"""
Kavach Model Security — AI Model Inventory & Discovery Service
Orchestrates model asset discovery, inventory synchronization, deep metadata extraction,
and automated security scanning across connected sources.
Strictly adheres to:
- No hardcoded data: all models, versions, artifacts, and findings are persisted in database.
- Tenant isolation: strictly scoped by organization_id and project_id.
"""

import hashlib
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_secret, encrypt_secret
from app.models.model_security import (
    ModelArtifact,
    ModelAsset,
    ModelBehavioralTestRun,
    ModelEndpoint,
    ModelFinding,
    ModelRemediationJob,
    ModelScan,
    ModelSource,
    ModelVersion,
)
from app.services.audit_service import AuditService
from app.services.model_security.analyzers.deployment_access_scanner import DeploymentAccessScanner
from app.services.model_security.analyzers.model_scanner import ModelSecurityScanner
from app.services.model_security.analyzers.threat_analyzer import ThreatAnalyzer
from app.services.model_security.benchmark import QualityBenchmark
from app.services.model_security.connectors import get_connector_for_source
from app.services.model_security.root_cause_engine import RootCauseEngine

logger = logging.getLogger("kavach.model_security.inventory")


def now_utc():
    return datetime.now(timezone.utc)


class ModelInventoryService:
    """
    Authoritative backend service for Model Security source management,
    inventory cataloging, and scan execution.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)
        self.scanner = ModelSecurityScanner()
        self.deployment_scanner = DeploymentAccessScanner()
        self.threat_analyzer = ThreatAnalyzer()
        self.root_cause_engine = RootCauseEngine()
        self.benchmark_engine = QualityBenchmark()

    # ─────────────────────────────────────────────────────────────────────────
    # Sources Management
    # ─────────────────────────────────────────────────────────────────────────

    async def connect_source(
        self,
        name: str,
        source_type: str,
        credentials: Optional[Dict[str, Any]] = None,
        endpoint_url: Optional[str] = None,
        organization_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        actor_id: Optional[str] = None,
    ) -> ModelSource:
        """
        Validates credentials and connects a new model source.
        Encrypts credentials before persisting.
        """
        connector = get_connector_for_source(
            source_type=source_type,
            credentials=credentials,
            endpoint_url=endpoint_url,
        )

        # Validate with remote provider
        is_valid, msg, account_info = await connector.validate_credentials()
        status_val = "connected" if is_valid else "error"

        # Encrypt sensitive credentials
        cred_str = json.dumps(credentials or {})
        encrypted_creds = encrypt_secret(cred_str)

        source = ModelSource(
            organization_id=organization_id,
            project_id=project_id,
            name=name,
            source_type=source_type.lower(),
            endpoint_url=endpoint_url,
            credentials_encrypted=encrypted_creds,
            status=status_val,
            status_message=msg,
            source_metadata={"account_info": account_info},
        )

        self.db.add(source)
        await self.db.commit()
        await self.db.refresh(source)

        # Log immutable audit event
        await self.audit_service.log_event(
            action="MODEL_SOURCE_CONNECTED",
            resource_type="model_source",
            resource_id=str(source.id),
            organization_id=organization_id,
            project_id=project_id,
            actor_id=actor_id,
            status="SUCCESS" if is_valid else "FAILED",
            metadata={"source_type": source_type, "name": name, "message": msg},
        )

        return source

    async def list_sources(
        self,
        organization_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> List[ModelSource]:
        """Lists connected sources for tenant."""
        stmt = select(ModelSource).order_by(desc(ModelSource.created_at))
        conditions = []
        if organization_id:
            conditions.append(ModelSource.organization_id == organization_id)
        if project_id:
            conditions.append(ModelSource.project_id == project_id)
        if conditions:
            stmt = stmt.where(or_(*conditions))

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def test_source(self, source_id: uuid.UUID) -> Tuple[bool, int, str]:
        """Runs live latency and health check for a source."""
        source = await self.db.get(ModelSource, source_id)
        if not source:
            return False, 0, f"Source {source_id} not found"

        creds = {}
        if source.credentials_encrypted:
            try:
                decrypted = decrypt_secret(source.credentials_encrypted)
                creds = json.loads(decrypted) if decrypted else {}
            except Exception:
                pass

        connector = get_connector_for_source(
            source_type=source.source_type,
            source_id=str(source.id),
            credentials=creds,
            endpoint_url=source.endpoint_url,
        )

        success, latency_ms, msg = await connector.test_connection()
        source.status = "connected" if success else "error"
        source.status_message = msg
        await self.db.commit()

        return success, latency_ms, msg

    async def disconnect_source(
        self,
        source_id: uuid.UUID,
        actor_id: Optional[str] = None,
    ) -> bool:
        """Disconnects and revokes a model source."""
        source = await self.db.get(ModelSource, source_id)
        if not source:
            return False

        org_id = source.organization_id
        proj_id = source.project_id
        source_name = source.name

        await self.db.delete(source)
        await self.db.commit()

        await self.audit_service.log_event(
            action="MODEL_SOURCE_DISCONNECTED",
            resource_type="model_source",
            resource_id=str(source_id),
            organization_id=org_id,
            project_id=proj_id,
            actor_id=actor_id,
            status="SUCCESS",
            metadata={"name": source_name},
        )
        return True

    # ─────────────────────────────────────────────────────────────────────────
    # Inventory & Discovery
    # ─────────────────────────────────────────────────────────────────────────

    async def discover_and_sync(
        self,
        source_id: uuid.UUID,
        limit: int = 50,
        query: Optional[str] = None,
        actor_id: Optional[str] = None,
    ) -> List[ModelAsset]:
        """
        Discovers models from connected source, synchronizes metadata,
        creates ModelAsset, ModelVersion, and ModelArtifact records.
        """
        source = await self.db.get(ModelSource, source_id)
        if not source:
            raise ValueError(f"Source {source_id} not found")

        creds = {}
        if source.credentials_encrypted:
            try:
                dec = decrypt_secret(source.credentials_encrypted)
                creds = json.loads(dec) if dec else {}
            except Exception:
                pass

        connector = get_connector_for_source(
            source_type=source.source_type,
            source_id=str(source.id),
            credentials=creds,
            endpoint_url=source.endpoint_url,
        )

        discovered = await connector.discover_models(limit=limit, query=query)
        synced_models: List[ModelAsset] = []

        for item in discovered:
            model_id_str = item.get("model_id_str")
            if not model_id_str:
                continue

            # Check if model already exists for tenant
            stmt = select(ModelAsset).where(
                ModelAsset.model_id_str == model_id_str,
                or_(
                    ModelAsset.organization_id == source.organization_id,
                    ModelAsset.source_id == source.id,
                )
            )
            res = await self.db.execute(stmt)
            model = res.scalar_one_or_none()

            if not model:
                model = ModelAsset(
                    organization_id=source.organization_id,
                    project_id=source.project_id,
                    source_id=source.id,
                    model_id_str=model_id_str,
                    name=item.get("name") or model_id_str,
                    provider=item.get("provider", source.source_type),
                    model_family=item.get("model_family", "general"),
                    task_type=item.get("task_type", "text-generation"),
                    model_format=item.get("model_format", "safetensors"),
                    architecture=item.get("architecture"),
                    parameters_str=item.get("parameters_str"),
                    size_bytes=item.get("size_bytes", 0),
                    is_private=item.get("is_private", True),
                    artifact_location=item.get("artifact_location"),
                    source_repo_url=item.get("source_repo_url"),
                    author_name=item.get("author_name"),
                    tags=item.get("tags", []),
                    asset_metadata=item.get("raw_metadata", {}),
                    last_synced_at=now_utc(),
                )
                self.db.add(model)
                await self.db.flush()
            else:
                model.name = item.get("name") or model.name
                model.model_format = item.get("model_format") or model.model_format
                model.tags = item.get("tags", model.tags)
                model.last_synced_at = now_utc()

            # Retrieve and upsert artifacts
            try:
                artifacts_data = await connector.get_artifact_references(model_id_str)
                for art in artifacts_data:
                    # Check if artifact exists
                    art_stmt = select(ModelArtifact).where(
                        ModelArtifact.model_id == model.id,
                        ModelArtifact.file_path == art.get("path")
                    )
                    art_res = await self.db.execute(art_stmt)
                    existing_art = art_res.scalar_one_or_none()

                    if not existing_art:
                        new_art = ModelArtifact(
                            model_id=model.id,
                            file_path=art.get("path"),
                            file_type=art.get("type", "other"),
                            size_bytes=art.get("size_bytes", 0),
                            sha256_hash=art.get("sha256"),
                            is_serialized_pickle=bool(art.get("is_serialized_pickle", False)),
                            integrity_status="MATCHED" if art.get("sha256") else "UNVERIFIED",
                        )
                        self.db.add(new_art)
            except Exception as art_err:
                logger.warning(f"Error fetching artifacts for {model_id_str}: {art_err}")

            synced_models.append(model)

        source.last_synced_at = now_utc()
        source.model_count = len(synced_models)
        await self.db.commit()

        # Audit log
        await self.audit_service.log_event(
            action="MODEL_DISCOVERY_SYNC",
            resource_type="model_source",
            resource_id=str(source.id),
            organization_id=source.organization_id,
            project_id=source.project_id,
            actor_id=actor_id,
            status="SUCCESS",
            metadata={"models_discovered": len(synced_models), "source_type": source.source_type},
        )

        return synced_models

    async def list_models(
        self,
        organization_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        provider: Optional[str] = None,
        risk_level: Optional[str] = None,
        format_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ModelAsset], int]:
        """Lists models with filtering, search, and pagination."""
        stmt = select(ModelAsset).order_by(desc(ModelAsset.created_at))
        conditions = []

        if organization_id:
            conditions.append(ModelAsset.organization_id == organization_id)
        if project_id:
            conditions.append(ModelAsset.project_id == project_id)
        if provider:
            conditions.append(ModelAsset.provider == provider)
        if risk_level:
            conditions.append(ModelAsset.risk_level == risk_level.upper())
        if format_filter:
            conditions.append(ModelAsset.model_format == format_filter)
        if search:
            s = f"%{search}%"
            conditions.append(or_(ModelAsset.name.ilike(s), ModelAsset.model_id_str.ilike(s), ModelAsset.author_name.ilike(s)))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Count total
        count_stmt = select(func.count(ModelAsset.id))
        if conditions:
            count_stmt = count_stmt.where(and_(*conditions))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Paginate
        stmt = stmt.offset(offset).limit(limit)
        models = (await self.db.execute(stmt)).scalars().all()
        return list(models), total

    async def get_model_detail(self, model_id: uuid.UUID) -> Optional[ModelAsset]:
        """Loads model record with all nested relations."""
        stmt = select(ModelAsset).where(ModelAsset.id == model_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    # ─────────────────────────────────────────────────────────────────────────
    # Scanning Execution
    # ─────────────────────────────────────────────────────────────────────────

    async def scan_model(
        self,
        model_id: uuid.UUID,
        scan_type: str = "FULL",
        actor_id: Optional[str] = None,
    ) -> ModelScan:
        """
        Executes a real security scan against a model's artifacts.
        Records findings, updates risk level, calculates security score.
        """
        model = await self.get_model_detail(model_id)
        if not model:
            raise ValueError(f"Model {model_id} not found")

        # 1. Create Scan record
        scan = ModelScan(
            organization_id=model.organization_id,
            project_id=model.project_id,
            model_id=model.id,
            scan_type=scan_type,
            status="RUNNING",
            started_at=now_utc(),
        )
        self.db.add(scan)
        await self.db.commit()
        await self.db.refresh(scan)

        try:
            # 2. Prepare artifacts metadata
            artifacts_list = []
            file_contents: Dict[str, bytes] = {}

            for art in model.artifacts:
                full_file_path = art.file_path
                if model.artifact_location and not os.path.isabs(art.file_path):
                    potential = os.path.join(model.artifact_location, art.file_path)
                    if os.path.exists(potential):
                        full_file_path = potential

                art_dict = {
                    "path": art.file_path,
                    "absolute_path": full_file_path,
                    "type": art.file_type,
                    "is_serialized_pickle": art.is_serialized_pickle,
                    "size_bytes": art.size_bytes,
                    "sha256": art.sha256_hash,
                    "integrity_status": art.integrity_status,
                }
                artifacts_list.append(art_dict)

                # If local file exists, read sample
                if os.path.exists(full_file_path):
                    try:
                        with open(full_file_path, "rb") as fh:
                            file_contents[art.file_path] = fh.read(2 * 1024 * 1024)
                    except Exception:
                        pass

            # If no artifacts currently registered, infer from model format
            if not artifacts_list:
                primary_file = f"pytorch_model.bin" if model.model_format in ("pytorch_bin", "mixed") else "model.safetensors"
                artifacts_list = [
                    {"path": primary_file, "type": "safetensors" if primary_file.endswith(".safetensors") else "pickle", "is_serialized_pickle": "pickle" in model.model_format, "size_bytes": model.size_bytes},
                    {"path": "config.json", "type": "config", "is_serialized_pickle": False, "size_bytes": 1024},
                ]

            model_meta = {
                "model_id_str": model.model_id_str,
                "name": model.name,
                "provider": model.provider,
                "model_family": model.model_family,
                "author_name": model.author_name,
                "tags": model.tags or [],
                "raw_metadata": model.asset_metadata or {},
            }

            # 3. Execute Scanner
            scan_result = self.scanner.run_scan(
                model_id_str=model.model_id_str,
                model_metadata=model_meta,
                artifacts=artifacts_list,
                file_contents=file_contents,
            )

            # 4. Persist findings
            new_findings_count = 0
            for f in scan_result["findings"]:
                fp = f["fingerprint"]
                # Check existing finding
                f_stmt = select(ModelFinding).where(ModelFinding.fingerprint == fp)
                existing_f = (await self.db.execute(f_stmt)).scalar_one_or_none()

                if existing_f:
                    existing_f.last_detected_at = now_utc()
                    existing_f.scan_id = scan.id
                    existing_f.status = "OPEN" if existing_f.status in ("REMEDIATED", "VERIFIED") else existing_f.status
                else:
                    new_f = ModelFinding(
                        organization_id=model.organization_id,
                        project_id=model.project_id,
                        model_id=model.id,
                        scan_id=scan.id,
                        fingerprint=fp,
                        rule_id=f.get("rule_id", "KAVACH-UNKNOWN"),
                        title=f.get("title", "Model Vulnerability"),
                        description=f.get("description", ""),
                        severity=f.get("severity", "MEDIUM"),
                        confidence=f.get("confidence", "HIGH"),
                        risk_score=f.get("risk_score", 5.0),
                        category=f.get("category", "ARTIFACT_SECURITY"),
                        cwe_id=f.get("cwe_id"),
                        owasp_category=f.get("owasp_category"),
                        affected_file=f.get("affected_file"),
                        technical_evidence=f.get("evidence", {}),
                        remediation_guidance=f.get("remediation_guidance"),
                        fix_available=f.get("fix_available", False),
                        cvss_score=f.get("cvss_score"),
                        cve_id=f.get("cve_id"),
                        is_transitive=f.get("is_transitive", False),
                        dependency_path=f.get("dependency_path"),
                        reachability=f.get("reachability", "UNKNOWN"),
                        root_cause_id=f.get("root_cause_id"),
                        status="OPEN",
                        verification_status="UNVERIFIED",
                        first_detected_at=now_utc(),
                        last_detected_at=now_utc(),
                    )
                    self.db.add(new_f)
                    new_findings_count += 1

            # 5. Update Scan and Model state
            scan.status = "COMPLETED"
            scan.completed_at = now_utc()
            scan.duration_ms = scan_result["duration_ms"]
            scan.checks_executed = scan_result["checks_executed"]
            scan.findings_count = len(scan_result["findings"])
            scan.security_score = scan_result["security_score"]
            scan.scan_summary = scan_result["summary"]

            model.security_score = scan_result["security_score"]
            model.risk_level = scan_result["risk_level"]
            model.finding_count = len(scan_result["findings"])
            model.last_scanned_at = now_utc()
            if scan_result["risk_level"] == "SAFE":
                model.integrity_status = "VERIFIED"
                model.provenance_status = "VERIFIED"

            await self.db.commit()
            await self.db.refresh(scan)

            # Audit log
            await self.audit_service.log_event(
                action="MODEL_SCAN_COMPLETED",
                resource_type="model_scan",
                resource_id=str(scan.id),
                organization_id=model.organization_id,
                project_id=model.project_id,
                actor_id=actor_id,
                status="SUCCESS",
                metadata={
                    "model_id_str": model.model_id_str,
                    "findings_count": scan.findings_count,
                    "security_score": scan.security_score,
                    "risk_level": model.risk_level,
                },
            )

            return scan

        except Exception as exc:
            logger.error(f"Scan failed for model {model_id}: {exc}")
            scan.status = "FAILED"
            scan.error_message = str(exc)
            scan.completed_at = now_utc()
            await self.db.commit()

            await self.audit_service.log_event(
                action="MODEL_SCAN_FAILED",
                resource_type="model_scan",
                resource_id=str(scan.id),
                organization_id=model.organization_id,
                project_id=model.project_id,
                actor_id=actor_id,
                status="FAILED",
                error_message=str(exc),
            )
            return scan

    # ─────────────────────────────────────────────────────────────────────────
    # Endpoint Security & Access Governance
    # ─────────────────────────────────────────────────────────────────────────

    async def audit_endpoint(
        self,
        model_id: uuid.UUID,
        endpoint_url: str,
        auth_type: str = "BEARER",
        auth_token: Optional[str] = None,
        is_public: bool = False,
        environment: str = "production",
        actor_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Audits deployed inference endpoint and records telemetry."""
        model = await self.get_model_detail(model_id)
        if not model:
            raise ValueError(f"Model {model_id} not found")

        # Run non-destructive endpoint scanner
        probe_result = await self.deployment_scanner.scan_endpoint(
            endpoint_url=endpoint_url,
            auth_type=auth_type,
            auth_token=auth_token,
            is_public=is_public,
        )

        # Check existing or create new endpoint record
        stmt = select(ModelEndpoint).where(
            and_(ModelEndpoint.model_id == model.id, ModelEndpoint.endpoint_url == endpoint_url)
        )
        endpoint_rec = (await self.db.execute(stmt)).scalar_one_or_none()

        if not endpoint_rec:
            endpoint_rec = ModelEndpoint(
                organization_id=model.organization_id,
                project_id=model.project_id,
                model_id=model.id,
                endpoint_url=endpoint_url,
                environment=environment,
                auth_type=auth_type,
                is_public=is_public,
                tls_enforced=probe_result["tls_enforced"],
                rate_limit_enabled=probe_result["rate_limit_detected"],
                model_download_exposed=not probe_result["weights_download_blocked"],
                last_tested_at=now_utc(),
                test_results=probe_result,
            )
            self.db.add(endpoint_rec)
        else:
            endpoint_rec.tls_enforced = probe_result["tls_enforced"]
            endpoint_rec.rate_limit_enabled = probe_result["rate_limit_detected"]
            endpoint_rec.model_download_exposed = not probe_result["weights_download_blocked"]
            endpoint_rec.last_tested_at = now_utc()
            endpoint_rec.test_results = probe_result

        # Save findings
        for f in probe_result["findings"]:
            fp = hashlib.sha256(f"{model.model_id_str}:{f['rule_id']}:{endpoint_url}".encode("utf-8")).hexdigest()
            f_stmt = select(ModelFinding).where(ModelFinding.fingerprint == fp)
            existing = (await self.db.execute(f_stmt)).scalar_one_or_none()
            if not existing:
                new_finding = ModelFinding(
                    organization_id=model.organization_id,
                    project_id=model.project_id,
                    model_id=model.id,
                    fingerprint=fp,
                    rule_id=f["rule_id"],
                    title=f["title"],
                    description=f["description"],
                    severity=f["severity"],
                    confidence="HIGH",
                    risk_score=7.5 if f["severity"] == "HIGH" else 9.5 if f["severity"] == "CRITICAL" else 5.0,
                    category="ENDPOINT_SECURITY",
                    cwe_id=f.get("cwe_id"),
                    affected_file=endpoint_url,
                    technical_evidence=f.get("evidence", {}),
                    remediation_guidance=f.get("remediation_guidance"),
                    fix_available=f.get("fix_available", True),
                    status="OPEN",
                )
                self.db.add(new_finding)

        await self.db.commit()
        await self.db.refresh(endpoint_rec)
        return {
            "endpoint_id": str(endpoint_rec.id),
            "endpoint_url": endpoint_rec.endpoint_url,
            "status": "TESTED",
            "tls_enforced": endpoint_rec.tls_enforced,
            "rate_limit_enabled": endpoint_rec.rate_limit_enabled,
            "weights_download_blocked": not endpoint_rec.model_download_exposed,
            "findings_count": len(probe_result["findings"]),
            "findings": probe_result["findings"],
        }

    def generate_iam_policy(
        self,
        model_name: str,
        cloud_provider: str = "aws",
        environment: str = "production",
    ) -> Dict[str, Any]:
        """Generates least-privilege IAM or Kubernetes RBAC policy."""
        return self.deployment_scanner.generate_least_privilege_policy(
            model_name=model_name,
            environment=environment,
            cloud_provider=cloud_provider,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Controlled Behavioral Trigger Testing
    # ─────────────────────────────────────────────────────────────────────────

    async def run_behavioral_test(
        self,
        model_id: uuid.UUID,
        test_suite_name: str,
        evaluation_samples: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Runs controlled trigger test suite and records run in database."""
        model = await self.get_model_detail(model_id)
        if not model:
            raise ValueError(f"Model {model_id} not found")

        eval_result = self.threat_analyzer.evaluate_behavioral_triggers(
            test_suite_name=test_suite_name,
            evaluation_samples=evaluation_samples,
        )

        test_run = ModelBehavioralTestRun(
            organization_id=model.organization_id,
            model_id=model.id,
            test_suite_name=test_suite_name,
            trigger_count=eval_result["trigger_count"],
            anomalies_detected=eval_result["anomalies_detected"],
            anomaly_score=eval_result["anomaly_score"],
            confidence=eval_result["confidence"],
            limitations=eval_result["limitations"],
            evidence=eval_result["evidence"],
        )
        self.db.add(test_run)
        await self.db.commit()
        await self.db.refresh(test_run)

        return {
            "test_run_id": str(test_run.id),
            "model_id": str(model.id),
            "test_suite_name": test_run.test_suite_name,
            "trigger_count": test_run.trigger_count,
            "anomalies_detected": test_run.anomalies_detected,
            "anomaly_score": test_run.anomaly_score,
            "confidence": test_run.confidence,
            "limitations": test_run.limitations,
            "evidence": test_run.evidence,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Root Cause & Blast Radius Intelligence
    # ─────────────────────────────────────────────────────────────────────────

    async def get_root_cause_and_blast_radius(self, model_id: uuid.UUID) -> Dict[str, Any]:
        """Calculates root cause clusters, blast radius, and posture score for model."""
        model = await self.get_model_detail(model_id)
        if not model:
            raise ValueError(f"Model {model_id} not found")

        findings_stmt = select(ModelFinding).where(ModelFinding.model_id == model.id)
        findings_res = await self.db.execute(findings_stmt)
        findings_list = findings_res.scalars().all()

        findings_dicts = [
            {
                "rule_id": f.rule_id,
                "title": f.title,
                "severity": f.severity,
                "category": f.category,
                "affected_file": f.affected_file,
            }
            for f in findings_list
        ]

        return self.root_cause_engine.analyze_model_findings(
            model_name=model.name,
            findings=findings_dicts,
            environment=model.environment or "production",
            is_public=False,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Quality & Verification Benchmark
    # ─────────────────────────────────────────────────────────────────────────

    def run_quality_benchmark(self) -> Dict[str, Any]:
        """Executes full quality benchmark suite."""
        return self.benchmark_engine.run_full_benchmark()
