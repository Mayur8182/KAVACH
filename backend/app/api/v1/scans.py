import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.scan import (
    RequirementVerificationResponse,
    ScannerExecutionResponse,
    ScannerHealthResponse,
    ScanTriggerRequest,
    SecurityFindingResponse,
    SecurityScanResponse,
)
from app.services.scan_service import ScanService

router = APIRouter(tags=["Security Verification & Scanners"])


def _to_scan_response(scan) -> SecurityScanResponse:
    executions_data = [
        ScannerExecutionResponse.model_validate(e)
        for e in getattr(scan, "executions", [])
    ]
    findings_data = [
        SecurityFindingResponse.model_validate(f)
        for f in getattr(scan, "findings", [])
    ]
    verifications_data = [
        RequirementVerificationResponse.model_validate(v)
        for v in getattr(scan, "verifications", [])
    ]
    return SecurityScanResponse(
        id=scan.id,
        project_id=scan.project_id,
        blueprint_id=scan.blueprint_id,
        intent_id=scan.intent_id,
        target_type=scan.target_type,
        target_path=scan.target_path,
        target_reference=scan.target_reference,
        status=scan.status,
        requested_by=scan.requested_by,
        started_at=scan.started_at,
        completed_at=scan.completed_at,
        scanner_count=scan.scanner_count,
        finding_count=scan.finding_count,
        error_message=scan.error_message,
        created_at=scan.created_at,
        updated_at=scan.updated_at,
        executions=executions_data,
        findings=findings_data,
        verifications=verifications_data,
    )


@router.get(
    "/scans/tools/health",
    response_model=List[ScannerHealthResponse],
    summary="Get Security Scanner Tool Statuses",
    description="Returns operational availability and version info for all registered CLI scanner binaries.",
)
async def get_scanners_health(
    db: AsyncSession = Depends(get_db),
) -> List[ScannerHealthResponse]:
    service = ScanService(db)
    return await service.get_scanners_health()


@router.post(
    "/projects/{project_id}/scans",
    response_model=SecurityScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Real Security Verification Scan",
    description="Executes registered security scanners against real source code and evaluates Step 5 blueprint requirements.",
)
async def trigger_scan(
    project_id: uuid.UUID,
    payload: Optional[ScanTriggerRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_request_id: Optional[str] = Header(None),
) -> SecurityScanResponse:
    service = ScanService(db)
    req_payload = payload or ScanTriggerRequest()
    scan = await service.trigger_scan(
        project_id=project_id,
        payload=req_payload,
        current_user=current_user,
        request_id=x_request_id,
    )
    return _to_scan_response(scan)


@router.get(
    "/projects/{project_id}/scans",
    response_model=List[SecurityScanResponse],
    summary="List Security Scans for Project",
    description="Retrieves history of security verification scans executed for a project.",
)
async def list_project_scans(
    project_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecurityScanResponse]:
    service = ScanService(db)
    scans = await service.list_scans_for_project(project_id, current_user, limit=limit, offset=offset)
    return [_to_scan_response(s) for s in scans]


@router.get(
    "/scans/{scan_id}",
    response_model=SecurityScanResponse,
    summary="Get Security Scan Details",
    description="Retrieves a complete security scan record including scanner executions, findings, and requirement verifications.",
)
async def get_scan(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityScanResponse:
    service = ScanService(db)
    scan = await service.get_scan(scan_id, current_user)
    return _to_scan_response(scan)


@router.get(
    "/scans/{scan_id}/findings",
    response_model=List[SecurityFindingResponse],
    summary="Get Scan Security Findings",
    description="Retrieves normalized security findings discovered by real scanners during a scan.",
)
async def get_scan_findings(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecurityFindingResponse]:
    service = ScanService(db)
    findings = await service.get_findings(scan_id, current_user)
    return [SecurityFindingResponse.model_validate(f) for f in findings]


@router.get(
    "/scans/{scan_id}/executions",
    response_model=List[ScannerExecutionResponse],
    summary="Get Individual Scanner Execution Logs",
    description="Retrieves process logs, commands, exit codes, and durations for each scanner tool.",
)
async def get_scan_executions(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ScannerExecutionResponse]:
    service = ScanService(db)
    executions = await service.get_executions(scan_id, current_user)
    return [ScannerExecutionResponse.model_validate(e) for e in executions]


@router.get(
    "/scans/{scan_id}/verifications",
    response_model=List[RequirementVerificationResponse],
    summary="Get Requirement Verification States",
    description="Retrieves SATISFIED / VIOLATED / UNKNOWN states for Step 5 Blueprint requirements based on scanner evidence.",
)
async def get_scan_verifications(
    scan_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[RequirementVerificationResponse]:
    service = ScanService(db)
    verifications = await service.get_verifications(scan_id, current_user)
    return [RequirementVerificationResponse.model_validate(v) for v in verifications]
