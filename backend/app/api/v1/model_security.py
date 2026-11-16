"""
Kavach Model Security — REST API Router (/api/v1/model-security)
Provides production-grade endpoints for:
- Model Sources (connect, list, test, disconnect)
- AI Model Inventory (discovery, list, detail, versions, artifacts)
- Model Scanning (orchestrate, list, detail, cancel)
- Security Findings (query, inspect, triage status)
- Remediation & AutoFix (plan, approve, execute, verify, rollback, logs)
- Activity, Audit Logs, Compliance Evidence & PDF/JSON Reporting
"""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.v1.auth import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.model_security import (
    ModelSource,
    ModelAsset,
    ModelVersion,
    ModelArtifact,
    ModelScan,
    ModelFinding,
    ModelRemediationJob,
)
from app.services.model_security.inventory_service import ModelInventoryService
from app.services.model_security.autofix_engine import AutoFixExecutionEngine
from app.services.model_security.compliance_service import ModelComplianceService
from app.services.audit_service import AuditService

logger = logging.getLogger("kavach.model_security.api")

router = APIRouter(prefix="/model-security", tags=["Model Security"])


# =============================================================================
# Request / Response Schemas
# =============================================================================

class ConnectModelSourcePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    source_type: str = Field(..., description="huggingface | aws_sagemaker | aws_bedrock | github | local_directory | upload")
    endpoint_url: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None
    project_id: Optional[str] = None


class DiscoverModelsPayload(BaseModel):
    source_id: str
    limit: int = Field(default=50, ge=1, le=100)
    query: Optional[str] = None


class StartScanPayload(BaseModel):
    scan_type: str = Field(default="FULL", description="FULL | ARTIFACT_ONLY | CONFIG_ONLY | SUPPLY_CHAIN")


class UpdateFindingStatusPayload(BaseModel):
    status: str = Field(..., description="OPEN | CONFIRMED | IN_PROGRESS | REMEDIATED | VERIFIED | ACCEPTED_RISK | FALSE_POSITIVE")
    notes: Optional[str] = None


class AuditEndpointPayload(BaseModel):
    endpoint_url: str = Field(..., description="Full URL to model inference endpoint (e.g. https://api.models.corp/v1/models/llama-3)")
    auth_type: str = Field(default="BEARER", description="BEARER | API_KEY | MTLS | NONE")
    auth_token: Optional[str] = None
    is_public: bool = Field(default=False)
    environment: str = Field(default="production")


class BehavioralTestPayload(BaseModel):
    test_suite_name: str = Field(..., min_length=2, max_length=150)
    evaluation_samples: List[Dict[str, str]] = Field(..., min_length=1)


# =============================================================================
# 1. Model Source Management Endpoints
# =============================================================================

@router.post("/sources/connect", summary="Connect a Model Source", status_code=status.HTTP_201_CREATED)
async def connect_model_source(
    payload: ConnectModelSourcePayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    proj_uuid = uuid.UUID(payload.project_id) if payload.project_id else None
    actor = str(current_user.id) if current_user else "api-user"

    source = await service.connect_source(
        name=payload.name,
        source_type=payload.source_type,
        credentials=payload.credentials,
        endpoint_url=payload.endpoint_url,
        project_id=proj_uuid,
        actor_id=actor,
    )

    return {
        "success": True,
        "source": {
            "id": str(source.id),
            "name": source.name,
            "source_type": source.source_type,
            "status": source.status,
            "status_message": source.status_message,
            "created_at": source.created_at.isoformat() if source.created_at else None,
        }
    }


@router.get("/sources", summary="List Connected Model Sources")
async def list_model_sources(
    project_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    proj_uuid = uuid.UUID(project_id) if project_id else None
    sources = await service.list_sources(project_id=proj_uuid)

    return {
        "sources": [
            {
                "id": str(s.id),
                "name": s.name,
                "source_type": s.source_type,
                "status": s.status,
                "status_message": s.status_message,
                "model_count": s.model_count,
                "last_synced_at": s.last_synced_at.isoformat() if s.last_synced_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sources
        ]
    }


@router.post("/sources/{source_id}/test", summary="Test Connection to Model Source")
async def test_model_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    try:
        s_uuid = uuid.UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source_id format")

    success, latency_ms, msg = await service.test_source(s_uuid)
    return {
        "success": success,
        "latency_ms": latency_ms,
        "message": msg,
    }


@router.delete("/sources/{source_id}", summary="Disconnect Model Source")
async def disconnect_model_source(
    source_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    try:
        s_uuid = uuid.UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source_id format")

    actor = str(current_user.id) if current_user else "api-user"
    deleted = await service.disconnect_source(s_uuid, actor_id=actor)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")

    return {"success": True, "message": "Source disconnected successfully"}


# =============================================================================
# 2. AI Model Inventory Endpoints
# =============================================================================

@router.post("/discovery", summary="Discover Models from Source")
async def discover_models(
    payload: DiscoverModelsPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    try:
        s_uuid = uuid.UUID(payload.source_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source_id format")

    actor = str(current_user.id) if current_user else "api-user"
    models = await service.discover_and_sync(
        source_id=s_uuid,
        limit=payload.limit,
        query=payload.query,
        actor_id=actor,
    )

    return {
        "success": True,
        "discovered_count": len(models),
        "models": [
            {
                "id": str(m.id),
                "model_id_str": m.model_id_str,
                "name": m.name,
                "provider": m.provider,
                "model_family": m.model_family,
                "model_format": m.model_format,
                "risk_level": m.risk_level,
                "security_score": m.security_score,
            }
            for m in models
        ]
    }


@router.get("/models", summary="List Discovered AI Models")
async def list_models(
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    proj_uuid = uuid.UUID(project_id) if project_id else None

    models, total = await service.list_models(
        project_id=proj_uuid,
        search=search,
        provider=provider,
        risk_level=risk_level,
        format_filter=format,
        limit=limit,
        offset=offset,
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "models": [
            {
                "id": str(m.id),
                "model_id_str": m.model_id_str,
                "name": m.name,
                "provider": m.provider,
                "model_family": m.model_family,
                "task_type": m.task_type,
                "model_format": m.model_format,
                "architecture": m.architecture,
                "parameters_str": m.parameters_str,
                "environment": m.environment,
                "deployment_status": m.deployment_status,
                "integrity_status": m.integrity_status,
                "provenance_status": m.provenance_status,
                "risk_level": m.risk_level,
                "security_score": m.security_score,
                "finding_count": m.finding_count,
                "author_name": m.author_name,
                "artifact_location": m.artifact_location,
                "last_scanned_at": m.last_scanned_at.isoformat() if m.last_scanned_at else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in models
        ]
    }


@router.get("/models/{model_id}", summary="Get Model Detail")
async def get_model_detail(
    model_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    model = await service.get_model_detail(m_uuid)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    return {
        "model": {
            "id": str(model.id),
            "model_id_str": model.model_id_str,
            "name": model.name,
            "provider": model.provider,
            "model_family": model.model_family,
            "task_type": model.task_type,
            "model_format": model.model_format,
            "architecture": model.architecture,
            "parameters_str": model.parameters_str,
            "size_bytes": model.size_bytes,
            "environment": model.environment,
            "deployment_status": model.deployment_status,
            "integrity_status": model.integrity_status,
            "provenance_status": model.provenance_status,
            "risk_level": model.risk_level,
            "security_score": model.security_score,
            "finding_count": model.finding_count,
            "author_name": model.author_name,
            "artifact_location": model.artifact_location,
            "source_repo_url": model.source_repo_url,
            "tags": model.tags,
            "last_scanned_at": model.last_scanned_at.isoformat() if model.last_scanned_at else None,
            "artifacts_count": len(model.artifacts),
            "scans_count": len(model.scans),
            "findings_count": len(model.findings),
        }
    }


@router.get("/models/{model_id}/artifacts", summary="List Model Artifacts")
async def list_model_artifacts(
    model_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    stmt = select(ModelArtifact).where(ModelArtifact.model_id == m_uuid)
    res = await db.execute(stmt)
    artifacts = res.scalars().all()

    return {
        "artifacts": [
            {
                "id": str(a.id),
                "file_path": a.file_path,
                "file_type": a.file_type,
                "size_bytes": a.size_bytes,
                "sha256_hash": a.sha256_hash,
                "is_serialized_pickle": a.is_serialized_pickle,
                "integrity_status": a.integrity_status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in artifacts
        ]
    }


# =============================================================================
# 3. Model Security Scanning Endpoints
# =============================================================================

@router.post("/models/{model_id}/scans", summary="Trigger Security Scan for Model", status_code=status.HTTP_201_CREATED)
async def scan_model(
    model_id: str,
    payload: StartScanPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    actor = str(current_user.id) if current_user else "api-user"

    scan = await service.scan_model(
        model_id=m_uuid,
        scan_type=payload.scan_type,
        actor_id=actor,
    )

    return {
        "success": True,
        "scan": {
            "id": str(scan.id),
            "model_id": str(scan.model_id),
            "status": scan.status,
            "scan_type": scan.scan_type,
            "security_score": scan.security_score,
            "findings_count": scan.findings_count,
            "checks_executed": scan.checks_executed,
            "duration_ms": scan.duration_ms,
            "summary": scan.scan_summary,
            "error_message": scan.error_message,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        }
    }


@router.get("/scans", summary="List Model Scans")
async def list_model_scans(
    model_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ModelScan).order_by(desc(ModelScan.created_at)).limit(limit)
    if model_id:
        try:
            stmt = stmt.where(ModelScan.model_id == uuid.UUID(model_id))
        except ValueError:
            pass

    scans = (await db.execute(stmt)).scalars().all()
    return {
        "scans": [
            {
                "id": str(s.id),
                "model_id": str(s.model_id),
                "status": s.status,
                "scan_type": s.scan_type,
                "security_score": s.security_score,
                "findings_count": s.findings_count,
                "duration_ms": s.duration_ms,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans
        ]
    }


@router.get("/scans/{scan_id}", summary="Get Scan Details")
async def get_scan_details(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        s_uuid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan_id format")

    scan = await db.get(ModelScan, s_uuid)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return {
        "scan": {
            "id": str(scan.id),
            "model_id": str(scan.model_id),
            "status": scan.status,
            "scan_type": scan.scan_type,
            "security_score": scan.security_score,
            "findings_count": scan.findings_count,
            "checks_executed": scan.checks_executed,
            "duration_ms": scan.duration_ms,
            "summary": scan.scan_summary,
            "error_message": scan.error_message,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        }
    }


# =============================================================================
# 4. Security Findings & Triage Endpoints
# =============================================================================

@router.get("/findings", summary="List Model Security Findings")
async def list_findings(
    model_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ModelFinding).order_by(desc(ModelFinding.first_detected_at))
    if model_id:
        try:
            stmt = stmt.where(ModelFinding.model_id == uuid.UUID(model_id))
        except ValueError:
            pass
    if severity:
        stmt = stmt.where(ModelFinding.severity == severity.upper())
    if category:
        stmt = stmt.where(ModelFinding.category == category)
    if status_filter:
        stmt = stmt.where(ModelFinding.status == status_filter.upper())

    findings = (await db.execute(stmt.offset(offset).limit(limit))).scalars().all()

    return {
        "findings": [
            {
                "id": str(f.id),
                "model_id": str(f.model_id),
                "rule_id": f.rule_id,
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "risk_score": f.risk_score,
                "category": f.category,
                "cwe_id": f.cwe_id,
                "owasp_category": f.owasp_category,
                "affected_file": f.affected_file,
                "fix_available": f.fix_available,
                "status": f.status,
                "verification_status": f.verification_status,
                "first_detected_at": f.first_detected_at.isoformat() if f.first_detected_at else None,
                "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
            }
            for f in findings
        ]
    }


@router.get("/findings/{finding_id}", summary="Get Finding Details")
async def get_finding_detail(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        f_uuid = uuid.UUID(finding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid finding_id format")

    finding = await db.get(ModelFinding, f_uuid)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    return {
        "finding": {
            "id": str(finding.id),
            "model_id": str(finding.model_id),
            "rule_id": finding.rule_id,
            "title": finding.title,
            "description": finding.description,
            "severity": finding.severity,
            "confidence": finding.confidence,
            "risk_score": finding.risk_score,
            "category": finding.category,
            "cwe_id": finding.cwe_id,
            "owasp_category": finding.owasp_category,
            "affected_file": finding.affected_file,
            "technical_evidence": finding.technical_evidence,
            "remediation_guidance": finding.remediation_guidance,
            "fix_available": finding.fix_available,
            "status": finding.status,
            "verification_status": finding.verification_status,
            "first_detected_at": finding.first_detected_at.isoformat() if finding.first_detected_at else None,
            "last_detected_at": finding.last_detected_at.isoformat() if finding.last_detected_at else None,
            "resolved_at": finding.resolved_at.isoformat() if finding.resolved_at else None,
        }
    }


@router.patch("/findings/{finding_id}/status", summary="Update Finding Triage Status")
async def update_finding_status(
    finding_id: str,
    payload: UpdateFindingStatusPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        f_uuid = uuid.UUID(finding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid finding_id format")

    finding = await db.get(ModelFinding, f_uuid)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_status = finding.status
    finding.status = payload.status.upper()
    if finding.status in ("REMEDIATED", "VERIFIED"):
        finding.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    # Audit log
    audit_service = AuditService(db)
    await audit_service.log_event(
        action="MODEL_FINDING_STATUS_UPDATED",
        resource_type="model_finding",
        resource_id=str(finding.id),
        organization_id=finding.organization_id,
        project_id=finding.project_id,
        actor_id=str(current_user.id) if current_user else "api-user",
        status="SUCCESS",
        metadata={"old_status": old_status, "new_status": finding.status, "notes": payload.notes},
    )

    return {"success": True, "finding_id": str(finding.id), "status": finding.status}


# =============================================================================
# 5. Remediation & AutoFix Endpoints
# =============================================================================

@router.post("/findings/{finding_id}/remediation/plan", summary="Generate Remediation Plan for Finding", status_code=status.HTTP_201_CREATED)
async def generate_remediation_plan(
    finding_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        f_uuid = uuid.UUID(finding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid finding_id format")

    engine = AutoFixExecutionEngine(db)
    actor = str(current_user.id) if current_user else "api-user"
    job = await engine.create_remediation_plan(finding_id=f_uuid, user_id=actor)

    return {
        "success": True,
        "job": {
            "id": str(job.id),
            "status": job.status,
            "strategy": job.strategy,
            "plan": job.plan_json,
            "patch_diff": job.patch_diff,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }
    }


@router.post("/remediations/{job_id}/approve", summary="Approve Remediation Job")
async def approve_remediation_job(
    job_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        j_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    engine = AutoFixExecutionEngine(db)
    actor = str(current_user.id) if current_user else "api-user"
    job = await engine.approve_job(job_id=j_uuid, user_id=actor)

    return {"success": True, "job_id": str(job.id), "status": job.status}


@router.post("/remediations/{job_id}/execute", summary="Execute AutoFix Workflow")
async def execute_remediation_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        j_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    engine = AutoFixExecutionEngine(db)
    job = await engine.execute_job(job_id=j_uuid)

    return {
        "success": job.status == "COMPLETED",
        "job": {
            "id": str(job.id),
            "status": job.status,
            "strategy": job.strategy,
            "test_results": job.test_results,
            "verification_results": job.verification_results,
            "error_message": job.error_message,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    }


@router.get("/remediations/{job_id}", summary="Get Remediation Job Status")
async def get_remediation_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        j_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    job = await db.get(ModelRemediationJob, j_uuid)
    if not job:
        raise HTTPException(status_code=404, detail="Remediation job not found")

    return {
        "job": {
            "id": str(job.id),
            "model_id": str(job.model_id),
            "finding_id": str(job.finding_id),
            "status": job.status,
            "strategy": job.strategy,
            "plan": job.plan_json,
            "patch_diff": job.patch_diff,
            "test_results": job.test_results,
            "verification_results": job.verification_results,
            "execution_logs": job.execution_logs,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
    }


@router.get("/remediations/{job_id}/logs", summary="Get Remediation Execution Logs")
async def get_remediation_logs(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        j_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    job = await db.get(ModelRemediationJob, j_uuid)
    if not job:
        raise HTTPException(status_code=404, detail="Remediation job not found")

    return {"job_id": str(job.id), "status": job.status, "logs": job.execution_logs or []}


# =============================================================================
# 6. Governance, Compliance & Reporting Endpoints
# =============================================================================

@router.get("/compliance", summary="Get AI Governance & Compliance Posture")
async def get_model_compliance(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ModelComplianceService(db)
    proj_uuid = uuid.UUID(project_id) if project_id else None
    data = await service.evaluate_compliance(project_id=proj_uuid)
    return data


@router.get("/reports", summary="Export Compliance Report (PDF or JSON)")
async def export_model_report(
    format: str = Query("json", description="json | pdf"),
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ModelComplianceService(db)
    proj_uuid = uuid.UUID(project_id) if project_id else None

    if format.lower() == "pdf":
        pdf_bytes = await service.generate_pdf_report(project_id=proj_uuid)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=kavach_model_security_report.pdf"},
        )
    else:
        return await service.evaluate_compliance(project_id=proj_uuid)


@router.get("/audit-logs", summary="Get Model Security Audit Logs")
async def get_model_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    audit_service = AuditService(db)
    events = await audit_service.list_events(limit=limit)
    model_events = [e for e in events if e.resource_type in ("model_source", "model_asset", "model_scan", "model_finding", "model_remediation")]

    return {
        "audit_logs": [
            {
                "id": str(e.id),
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "actor_id": e.actor_id,
                "status": e.status,
                "metadata": e.event_metadata,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            }
            for e in model_events
        ]
    }


# =============================================================================
# 7. Endpoint Security, Threats, Root Cause & Benchmark Endpoints
# =============================================================================

@router.post("/models/{model_id}/endpoints", summary="Audit Model Inference Endpoint")
async def audit_model_endpoint(
    model_id: str,
    payload: AuditEndpointPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    actor = str(current_user.id) if current_user else "api-user"
    try:
        res = await service.audit_endpoint(
            model_id=m_uuid,
            endpoint_url=payload.endpoint_url,
            auth_type=payload.auth_type,
            auth_token=payload.auth_token,
            is_public=payload.is_public,
            environment=payload.environment,
            actor_id=actor,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/models/{model_id}/iam-policy", summary="Generate Least-Privilege IAM Policy")
async def generate_model_iam_policy(
    model_id: str,
    cloud_provider: str = Query("aws", description="aws | kubernetes"),
    environment: str = Query("production"),
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    model = await service.get_model_detail(m_uuid)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    policy = service.generate_iam_policy(
        model_name=model.name,
        cloud_provider=cloud_provider,
        environment=environment,
    )
    return policy


@router.post("/models/{model_id}/behavioral-tests", summary="Run Controlled Behavioral Trigger Test")
async def run_model_behavioral_test(
    model_id: str,
    payload: BehavioralTestPayload,
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    try:
        res = await service.run_behavioral_test(
            model_id=m_uuid,
            test_suite_name=payload.test_suite_name,
            evaluation_samples=payload.evaluation_samples,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/models/{model_id}/root-cause", summary="Get Root Cause & Blast Radius Analysis")
async def get_model_root_cause(
    model_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        m_uuid = uuid.UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid model_id format")

    service = ModelInventoryService(db)
    try:
        analysis = await service.get_root_cause_and_blast_radius(m_uuid)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/benchmark", summary="Execute Full Quality & Verification Benchmark")
async def execute_quality_benchmark(
    db: AsyncSession = Depends(get_db),
):
    service = ModelInventoryService(db)
    benchmark_report = service.run_quality_benchmark()
    return benchmark_report

