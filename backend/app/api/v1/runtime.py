"""
Runtime Evidence & Continuous Contract Verification REST API Endpoints.
Complies with Step 13 Specification: Section 51, 52, 53, 72.
"""

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.runtime.enums import EvidenceSourceType
from app.runtime.schemas import (
    RuntimeEvidenceIngestRequest,
    RuntimeEvidenceIngestResponse,
    RuntimeEvidenceResponse,
    RuntimeEvidenceSourceResponse,
    RuntimeHealthResponse,
    RuntimeViolationResponse,
)
from app.runtime.service import RuntimeEvidenceService

router = APIRouter(tags=["Runtime Evidence & Verification"])


def _to_evidence_response(e) -> RuntimeEvidenceResponse:
    corrs = []
    if hasattr(e, "correlations") and e.correlations:
        corrs = [
            {
                "id": str(c.id),
                "correlation_type": c.correlation_type,
                "correlation_key": c.correlation_key,
                "related_resource_type": c.related_resource_type,
                "related_resource_id": c.related_resource_id,
                "confidence": c.confidence,
            }
            for c in e.correlations
        ]

    return RuntimeEvidenceResponse(
        id=e.id,
        project_id=e.project_id,
        event_id=e.event_id,
        source_type=e.source_type,
        source_id=e.source_id,
        source_event_id=e.source_event_id,
        event_type=e.event_type,
        occurred_at=e.occurred_at,
        received_at=e.received_at,
        processed_at=e.processed_at,
        subject_type=e.subject_type,
        subject_id=e.subject_id,
        action_type=e.action_type,
        resource_type=e.resource_type,
        resource_id=e.resource_id,
        trace_id=e.trace_id,
        span_id=e.span_id,
        environment=e.environment,
        classification=e.classification,
        trust_level=e.trust_level,
        timestamp_quality=e.timestamp_quality,
        payload_hash=e.payload_hash,
        schema_version=e.schema_version,
        collector_version=e.collector_version,
        status=e.status,
        normalized_payload=e.normalized_payload,
        created_at=e.created_at,
        correlations=corrs,
    )


def _to_source_response(s) -> RuntimeEvidenceSourceResponse:
    return RuntimeEvidenceSourceResponse(
        id=s.id,
        project_id=s.project_id,
        name=s.name,
        source_type=s.source_type,
        configuration=s.configuration,
        status=s.status,
        last_seen_at=s.last_seen_at,
        last_event_at=s.last_event_at,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


# ==================== 1. INGEST EVIDENCE ====================

@router.post(
    "/projects/{project_id}/runtime/evidence",
    response_model=RuntimeEvidenceIngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a runtime evidence event and evaluate active security contracts",
)
async def ingest_runtime_evidence(
    project_id: uuid.UUID,
    payload: RuntimeEvidenceIngestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeEvidenceIngestResponse:
    # Ensure project_id matches path
    if payload.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload project_id does not match route project_id",
        )
    service = RuntimeEvidenceService(db)
    try:
        response = await service.ingest_evidence(payload, actor_id=str(current_user.id))
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))


# ==================== 2. LIST EVIDENCE ====================

@router.get(
    "/projects/{project_id}/runtime/evidence",
    response_model=List[RuntimeEvidenceResponse],
    summary="List runtime evidence records for a project with rich filtering",
)
async def list_project_evidence(
    project_id: uuid.UUID,
    source_type: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    trace_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RuntimeEvidenceResponse]:
    service = RuntimeEvidenceService(db)
    items = await service.list_evidence(
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
    return [_to_evidence_response(item) for item in items]


@router.get(
    "/runtime/events",
    response_model=List[RuntimeEvidenceResponse],
    summary="List runtime events across projects for current user",
)
async def list_runtime_events(
    product: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RuntimeEvidenceResponse]:
    service = RuntimeEvidenceService(db)
    items = await service.list_all_evidence(
        limit=limit,
        offset=offset,
    )
    return [_to_evidence_response(item) for item in items]


# ==================== 3. GET EVIDENCE BY ID ====================

@router.get(
    "/runtime/evidence/{evidence_id}",
    response_model=RuntimeEvidenceResponse,
    summary="Get detailed runtime evidence record by ID",
)
async def get_evidence(
    evidence_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeEvidenceResponse:
    service = RuntimeEvidenceService(db)
    item = await service.get_evidence(evidence_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence record not found")
    return _to_evidence_response(item)


# ==================== 4. SOURCES ====================

@router.get(
    "/projects/{project_id}/runtime/sources",
    response_model=List[RuntimeEvidenceSourceResponse],
    summary="List runtime evidence sources for a project",
)
async def list_sources(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RuntimeEvidenceSourceResponse]:
    service = RuntimeEvidenceService(db)
    items = await service.list_sources(project_id)
    return [_to_source_response(s) for s in items]


@router.get(
    "/runtime/sources/{source_id}",
    response_model=RuntimeEvidenceSourceResponse,
    summary="Get runtime evidence source by ID",
)
async def get_source(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeEvidenceSourceResponse:
    service = RuntimeEvidenceService(db)
    item = await service.get_source(source_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence source not found")
    return _to_source_response(item)


# ==================== 5. VERIFICATIONS ====================

@router.get(
    "/projects/{project_id}/runtime/verifications",
    summary="List runtime contract verification history for a project",
)
async def list_verifications(
    project_id: uuid.UUID,
    contract_version_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeEvidenceService(db)
    items = await service.list_verifications(
        project_id=project_id,
        contract_version_id=contract_version_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(v.id),
            "contract_version_id": str(v.contract_version_id),
            "project_id": str(v.project_id),
            "status": v.status,
            "evaluation_result": v.evaluation_result,
            "evidence_summary": v.evidence_summary,
            "verifier_type": v.verifier_type,
            "verifier_version": v.verifier_version,
            "evaluated_at": v.evaluated_at.isoformat() if v.evaluated_at else None,
            "contract_name": v.contract_version.contract.name if (v.contract_version and v.contract_version.contract) else None,
        }
        for v in items
    ]


@router.get(
    "/runtime/verifications/{verification_id}",
    summary="Get runtime contract verification details by ID",
)
async def get_verification(
    verification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeEvidenceService(db)
    v = await service.get_verification(verification_id)
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found")
    return {
        "id": str(v.id),
        "contract_version_id": str(v.contract_version_id),
        "project_id": str(v.project_id),
        "status": v.status,
        "evaluation_result": v.evaluation_result,
        "evidence_summary": v.evidence_summary,
        "verifier_type": v.verifier_type,
        "verifier_version": v.verifier_version,
        "evaluated_at": v.evaluated_at.isoformat() if v.evaluated_at else None,
        "error_message": v.error_message,
        "contract_name": v.contract_version.contract.name if (v.contract_version and v.contract_version.contract) else None,
    }


# ==================== 6. VIOLATIONS ====================

@router.get(
    "/projects/{project_id}/runtime/violations",
    response_model=List[RuntimeViolationResponse],
    summary="List active runtime contract violations for a project",
)
async def list_violations(
    project_id: uuid.UUID,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RuntimeViolationResponse]:
    service = RuntimeEvidenceService(db)
    items = await service.list_violations(
        project_id=project_id,
        status=status,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return [
        RuntimeViolationResponse(
            id=v.id,
            contract_version_id=v.contract_version_id,
            verification_id=v.verification_id,
            project_id=v.project_id,
            severity=v.severity,
            violation_type=v.violation_type,
            description=v.description,
            subject=v.subject,
            resource=v.resource,
            action=v.action,
            evidence=v.evidence,
            status=v.status,
            detected_at=v.detected_at,
            resolved_at=v.resolved_at,
            resolution_reference=v.resolution_reference,
            contract_name=v.contract_version.contract.name if (v.contract_version and v.contract_version.contract) else None,
        )
        for v in items
    ]


@router.get(
    "/runtime/violations/{violation_id}",
    response_model=RuntimeViolationResponse,
    summary="Get runtime violation details by ID",
)
async def get_violation(
    violation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuntimeViolationResponse:
    service = RuntimeEvidenceService(db)
    v = await service.get_violation(violation_id)
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")
    return RuntimeViolationResponse(
        id=v.id,
        contract_version_id=v.contract_version_id,
        verification_id=v.verification_id,
        project_id=v.project_id,
        severity=v.severity,
        violation_type=v.violation_type,
        description=v.description,
        subject=v.subject,
        resource=v.resource,
        action=v.action,
        evidence=v.evidence,
        status=v.status,
        detected_at=v.detected_at,
        resolved_at=v.resolved_at,
        resolution_reference=v.resolution_reference,
        contract_name=v.contract_version.contract.name if (v.contract_version and v.contract_version.contract) else None,
    )


# ==================== 7. OTLP TELEMETRY INGESTION ====================

@router.post(
    "/runtime/otlp/v1/traces",
    status_code=status.HTTP_202_ACCEPTED,
    summary="OpenTelemetry OTLP Traces ingestion endpoint",
)
async def ingest_otlp_traces(
    payload: Dict[str, Any],
    project_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeEvidenceService(db)
    collector = service.collectors[EvidenceSourceType.OPEN_TELEMETRY]
    req = collector.translate_event(payload, str(project_id))
    resp = await service.ingest_evidence(req, actor_id=str(current_user.id))
    return {"status": "accepted", "evidence_id": str(resp.evidence_id)}


@router.post(
    "/runtime/otlp/v1/logs",
    status_code=status.HTTP_202_ACCEPTED,
    summary="OpenTelemetry OTLP Logs ingestion endpoint",
)
async def ingest_otlp_logs(
    payload: Dict[str, Any],
    project_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeEvidenceService(db)
    collector = service.collectors[EvidenceSourceType.OPEN_TELEMETRY]
    req = collector.translate_event(payload, str(project_id))
    resp = await service.ingest_evidence(req, actor_id=str(current_user.id))
    return {"status": "accepted", "evidence_id": str(resp.evidence_id)}


# ==================== 8. HEALTH ====================

@router.get(
    "/runtime/health",
    response_model=RuntimeHealthResponse,
    summary="Runtime collectors health status",
)
async def runtime_health(
    db: AsyncSession = Depends(get_db),
) -> RuntimeHealthResponse:
    service = RuntimeEvidenceService(db)
    return await service.get_health()
