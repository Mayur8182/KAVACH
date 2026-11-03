"""
Runtime Evidence Service.
Orchestrates ingestion pipeline:
1. Validation (size, timestamp skew)
2. Normalization & Secret Redaction
3. Integrity Hashing (Canonical SHA-256)
4. Idempotency & Deduplication
5. Persistence & Checkpoints
6. Correlation Extraction (Traces, Agents, Delegations, Commits)
7. Contract Matching & Continuous Verification
8. Violation Recording & Step 7 Policy Integration
9. Comprehensive Audit Trails
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.audit_service import AuditService
from app.runtime.collectors import (
    ApplicationEvidenceCollector,
    ContainerEvidenceCollector,
    GitHubEvidenceCollector,
    KubernetesEvidenceCollector,
    MCPEvidenceCollector,
    OTELEvidenceCollector,
)
from app.runtime.correlation.engine import CorrelationEngine
from app.runtime.enums import (
    EvidenceClassification,
    EvidenceSourceStatus,
    EvidenceSourceType,
    EvidenceStatus,
    RuntimeVerificationStatus,
    ViolationStatus,
)
from app.runtime.ingestion.deduplicator import EvidenceDeduplicator
from app.runtime.ingestion.integrity import EvidenceIntegrity
from app.runtime.ingestion.normalizer import EvidenceNormalizer
from app.runtime.ingestion.validator import EvidenceValidator
from app.runtime.models import (
    EvidenceCorrelation,
    RuntimeEvidence,
    RuntimeEvidenceSource,
)
from app.runtime.repository import RuntimeEvidenceRepository
from app.runtime.schemas import (
    RuntimeEvidenceIngestRequest,
    RuntimeEvidenceIngestResponse,
    RuntimeEvidenceResponse,
    RuntimeEvidenceSourceResponse,
    RuntimeHealthResponse,
    RuntimeViolationResponse,
)
from app.runtime.verification.evaluator import RuntimeContractVerificationEngine
from app.runtime.verification.matcher import ContractMatcher


class RuntimeEvidenceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = RuntimeEvidenceRepository(session)
        self.audit = AuditService(session)

        # Registered collectors
        self.collectors = {
            EvidenceSourceType.APPLICATION: ApplicationEvidenceCollector(),
            EvidenceSourceType.MCP: MCPEvidenceCollector(),
            EvidenceSourceType.OPEN_TELEMETRY: OTELEvidenceCollector(),
            EvidenceSourceType.GITHUB: GitHubEvidenceCollector(),
            EvidenceSourceType.CONTAINER: ContainerEvidenceCollector(),
            EvidenceSourceType.KUBERNETES: KubernetesEvidenceCollector(),
        }

    async def ingest_evidence(
        self, request: RuntimeEvidenceIngestRequest, actor_id: Optional[str] = None
    ) -> RuntimeEvidenceIngestResponse:
        """
        Processes and stores a single runtime evidence event through the complete verification pipeline.
        """
        received_at = datetime.now(timezone.utc)

        # 1. Validation: Payload size
        raw_size = len(str(request.raw_payload or ""))
        size_valid, size_err = EvidenceValidator.validate_event_size(raw_size)
        if not size_valid:
            await self.audit.log(
                project_id=request.project_id,
                action="RUNTIME_EVIDENCE_REJECTED",
                actor_id=actor_id or "system",
                actor_type="SYSTEM",
                resource_type="RUNTIME_EVIDENCE",
                resource_id="none",
                status="DENIED",
                details={"reason": size_err},
            )
            raise ValueError(f"Payload validation rejected: {size_err}")

        # 2. Validation: Timestamp skew
        skew_valid, skew_quality, skew_err = EvidenceValidator.validate_timestamp_skew(request.occurred_at)
        timestamp_quality = request.timestamp_quality if skew_valid else skew_quality

        # 3. Normalization and Sensitive Secret Redaction
        normalized = EvidenceNormalizer.normalize(
            event_id=request.event_id,
            project_id=request.project_id,
            source_type=request.source_type,
            source_id=request.source_id,
            event_type=request.event_type,
            occurred_at=request.occurred_at,
            received_at=received_at,
            subject=request.subject,
            action=request.action,
            resource=request.resource,
            context=request.context,
            result=request.result,
            classification=request.classification,
            environment=request.environment,
            raw_payload=request.raw_payload,
        )

        # 4. Canonical Integrity Hash (SHA-256)
        payload_hash = EvidenceIntegrity.hash_payload(normalized)

        # 5. Deduplication Check
        # Check source_event_id idempotency
        if request.source_event_id:
            existing_event = await self.repo.get_evidence_by_source_event_id(
                request.source_id, request.source_event_id
            )
            if existing_event:
                await self.audit.log(
                    project_id=request.project_id,
                    action="RUNTIME_EVIDENCE_DUPLICATE",
                    actor_id=actor_id or "system",
                    actor_type="SYSTEM",
                    resource_type="RUNTIME_EVIDENCE",
                    resource_id=str(existing_event.id),
                    status="SUCCESS",
                    details={
                        "source_id": request.source_id,
                        "source_event_id": request.source_event_id,
                        "reason": "Duplicate source event received; returning existing record without duplicating violations",
                    },
                )
                return RuntimeEvidenceIngestResponse(
                    evidence_id=existing_event.id,
                    event_id=existing_event.event_id,
                    status=EvidenceStatus.PROCESSED.value,
                    payload_hash=existing_event.payload_hash,
                    is_duplicate=True,
                    verifications_count=0,
                    violations_count=0,
                    message="Duplicate event accepted idempotently",
                )

        # Also check payload hash duplicate for the project
        existing_hash = await self.repo.get_evidence_by_hash(request.project_id, payload_hash)
        if existing_hash:
            return RuntimeEvidenceIngestResponse(
                evidence_id=existing_hash.id,
                event_id=existing_hash.event_id,
                status=EvidenceStatus.PROCESSED.value,
                payload_hash=existing_hash.payload_hash,
                is_duplicate=True,
                verifications_count=0,
                violations_count=0,
                message="Duplicate payload hash accepted idempotently",
            )

        # 6. Extract Subject, Action, Resource IDs
        subject_data = request.subject or {}
        action_data = request.action or {}
        resource_data = request.resource or {}
        context_data = request.context or {}

        subject_type = subject_data.get("type", "UNKNOWN")
        subject_id = subject_data.get("id")
        action_type = action_data.get("type", "UNKNOWN")
        resource_type = resource_data.get("type")
        resource_id = resource_data.get("id")

        trace_id = (
            context_data.get("trace_id")
            or normalized.get("trace", {}).get("trace_id")
            or request.raw_payload.get("trace_id")
        )
        span_id = (
            context_data.get("span_id")
            or normalized.get("trace", {}).get("span_id")
            or request.raw_payload.get("span_id")
        )

        st_val = request.source_type.value if hasattr(request.source_type, "value") else str(request.source_type)
        et_val = request.event_type.value if hasattr(request.event_type, "value") else str(request.event_type)
        cl_val = request.classification.value if hasattr(request.classification, "value") else str(request.classification)
        tl_val = request.trust_level.value if hasattr(request.trust_level, "value") else str(request.trust_level)
        tq_val = timestamp_quality.value if hasattr(timestamp_quality, "value") else str(timestamp_quality)

        # 7. Create and persist RuntimeEvidence
        evidence = RuntimeEvidence(
            id=uuid.uuid4(),
            project_id=request.project_id,
            event_id=normalized["event_id"],
            source_type=st_val,
            source_id=request.source_id,
            source_event_id=request.source_event_id,
            event_type=et_val,
            occurred_at=request.occurred_at,
            received_at=received_at,
            processed_at=datetime.now(timezone.utc),
            subject_type=subject_type,
            subject_id=str(subject_id) if subject_id else None,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            trace_id=str(trace_id) if trace_id else None,
            span_id=str(span_id) if span_id else None,
            environment=request.environment or "production",
            classification=cl_val,
            trust_level=tl_val,
            timestamp_quality=tq_val,
            normalized_payload=normalized,
            raw_payload=EvidenceNormalizer.redact_sensitive_keys(request.raw_payload),
            payload_hash=payload_hash,
            schema_version="1.0",
            collector_version="1.0.0",
            status=EvidenceStatus.PROCESSED.value,
        )
        evidence = await self.repo.create_evidence(evidence)

        # 8. Extract & persist Correlations
        correlations = CorrelationEngine.extract_correlations(evidence)
        if correlations:
            await self.repo.save_correlations(correlations)

        # 9. Track Source Health & Activity
        source_record = await self.repo.get_source_by_name(request.project_id, request.source_id)
        if not source_record:
            source_record = RuntimeEvidenceSource(
                id=uuid.uuid4(),
                project_id=request.project_id,
                name=request.source_id,
                source_type=st_val,
                configuration={},
                status=EvidenceSourceStatus.ACTIVE.value,
                last_seen_at=received_at,
                last_event_at=request.occurred_at,
            )
            await self.repo.create_source(source_record)
        else:
            await self.repo.update_source_activity(
                source_record.id,
                status=EvidenceSourceStatus.ACTIVE.value,
                last_event_at=request.occurred_at,
            )

        # 10. Contract Matching & Verification
        active_contract_versions = await self.repo.get_active_contract_versions(request.project_id)
        candidate_versions = ContractMatcher.filter_candidates(active_contract_versions, evidence)

        verifications_created = 0
        violations_created = 0

        for contract_version in candidate_versions:
            verification, violation = RuntimeContractVerificationEngine.evaluate_contract(
                contract_version=contract_version,
                evidence=evidence,
            )
            await self.repo.create_verification(verification)
            verifications_created += 1

            if violation:
                await self.repo.create_violation(violation)
                violations_created += 1

                # Audit Violation
                await self.audit.log(
                    project_id=request.project_id,
                    action="RUNTIME_CONTRACT_VIOLATED",
                    actor_id=actor_id or "system",
                    actor_type="SYSTEM",
                    resource_type="SECURITY_CONTRACT_VIOLATION",
                    resource_id=str(violation.id),
                    status="DENIED",
                    details={
                        "contract_version_id": str(contract_version.id),
                        "contract_name": contract_version.contract.name if contract_version.contract else "unknown",
                        "severity": violation.severity,
                        "evidence_id": str(evidence.id),
                        "violation_type": violation.violation_type,
                    },
                )

        # 11. Audit Evidence Ingestion
        await self.audit.log(
            project_id=request.project_id,
            action="RUNTIME_EVIDENCE_PROCESSED",
            actor_id=actor_id or "system",
            actor_type="SYSTEM",
            resource_type="RUNTIME_EVIDENCE",
            resource_id=str(evidence.id),
            status="SUCCESS",
            details={
                "event_type": evidence.event_type,
                "source_type": evidence.source_type,
                "source_id": evidence.source_id,
                "verifications_evaluated": verifications_created,
                "violations_detected": violations_created,
            },
        )

        return RuntimeEvidenceIngestResponse(
            evidence_id=evidence.id,
            event_id=evidence.event_id,
            status=evidence.status,
            payload_hash=evidence.payload_hash,
            verifications_count=verifications_created,
            violations_count=violations_created,
            message="Runtime evidence processed and verified successfully",
        )

    # ==================== QUERY METHODS ====================

    async def list_evidence(
        self,
        project_id: uuid.UUID,
        source_type: Optional[str] = None,
        event_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        environment: Optional[str] = None,
        status: Optional[str] = None,
        trace_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[RuntimeEvidence]:
        return await self.repo.list_evidence(
            project_id=project_id,
            source_type=source_type,
            event_type=event_type,
            subject_id=subject_id,
            resource_id=resource_id,
            environment=environment,
            status=status,
            trace_id=trace_id,
            limit=limit,
            offset=offset,
        )

    async def list_all_evidence(
        self,
        project_ids: Optional[List[uuid.UUID]] = None,
        source_type: Optional[str] = None,
        event_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        environment: Optional[str] = None,
        status: Optional[str] = None,
        trace_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[RuntimeEvidence]:
        return await self.repo.list_all_evidence(
            project_ids=project_ids,
            source_type=source_type,
            event_type=event_type,
            subject_id=subject_id,
            resource_id=resource_id,
            environment=environment,
            status=status,
            trace_id=trace_id,
            limit=limit,
            offset=offset,
        )

    async def get_evidence(
        self, evidence_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[RuntimeEvidence]:
        return await self.repo.get_evidence_by_id(evidence_id, project_id)

    async def ensure_baseline_sources_seeded(self, project_id: uuid.UUID) -> None:
        check = await self.repo.list_sources(project_id)
        if len(check) > 0:
            return

        default_sources = [
            ("Kubernetes eBPF DaemonSet Collector", EvidenceSourceType.KUBERNETES.value, {"namespace": "seculayer-system", "kernel_probes": ["sys_enter_execve", "tcp_connect", "security_socket_sendmsg"], "mode": "STRICT_ENFORCE"}),
            ("Container Runtime Hook (containerd/dockerd)", EvidenceSourceType.CONTAINER.value, {"socket": "/var/run/containerd/containerd.sock", "cgroup_driver": "systemd", "isolation": "read-only-rootfs"}),
            ("API Gateway Ingress Inspector", EvidenceSourceType.APPLICATION.value, {"endpoint": "/api/v1/telemetry/ingress", "protocol": "gRPC", "rate_limit": "5000/s"}),
            ("MCP Security Enforcement Gateway", EvidenceSourceType.MCP.value, {"server_url": "mcp://gateway.local:8080", "identity_wrapping": True, "policy_engine": "OPA"}),
        ]
        for name, stype, config in default_sources:
            source = RuntimeEvidenceSource(
                id=uuid.uuid4(),
                project_id=project_id,
                name=name,
                source_type=stype,
                configuration=config,
                status=EvidenceSourceStatus.ACTIVE.value,
                last_seen_at=datetime.now(timezone.utc),
                last_event_at=datetime.now(timezone.utc),
            )
            await self.repo.create_source(source)
        await self.session.commit()

    async def list_sources(self, project_id: uuid.UUID) -> List[RuntimeEvidenceSource]:
        await self.ensure_baseline_sources_seeded(project_id)
        return await self.repo.list_sources(project_id)

    async def get_source(
        self, source_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[RuntimeEvidenceSource]:
        return await self.repo.get_source_by_id(source_id, project_id)

    async def list_verifications(
        self,
        project_id: uuid.UUID,
        contract_version_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ):
        return await self.repo.list_verifications(
            project_id=project_id,
            contract_version_id=contract_version_id,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def get_verification(
        self, verification_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ):
        return await self.repo.get_verification_by_id(verification_id, project_id)

    async def list_violations(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ):
        return await self.repo.list_violations(
            project_id=project_id,
            status=status,
            severity=severity,
            limit=limit,
            offset=offset,
        )

    async def get_violation(
        self, violation_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ):
        return await self.repo.get_violation_by_id(violation_id, project_id)

    async def get_health(self) -> RuntimeHealthResponse:
        collectors_status = {}
        for src_type, collector in self.collectors.items():
            status = collector.get_status()
            collectors_status[src_type.value.lower()] = status.value.lower()

        return RuntimeHealthResponse(
            status="healthy",
            timestamp=datetime.now(timezone.utc),
            collectors=collectors_status,
        )
