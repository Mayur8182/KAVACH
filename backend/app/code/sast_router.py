"""
Thing Code — SAST API Router
Exposes /api/sast/* and /api/v1/sast/* endpoints for SAST Overview, Trends, Severity,
Categories, Recent Findings, Scan Status, Schedules, and Execution Control.
All endpoints require authentication and enforce multi-tenant project/workspace scoping.
"""

from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.code.sast_schemas import (
    SASTOverviewResponse,
    SASTTrendsResponse,
    SASTSeverityResponse,
    SASTCategoriesResponse,
    SASTRecentFindingsResponse,
    SASTRecentFindingItem,
    SASTScanStatusResponse,
    SASTScanItem,
    TriggerScanRequest,
    ScanPullRequestRequest,
    ScheduleScanRequest,
    UpdateFindingRequest,
    SASTScheduleItem,
    SASTScanDetailResponse,
    SASTExportResponse,
    SASTRuleItem,
    SASTRulesResponse,
    CreateSASTRuleRequest,
    UpdateSASTRuleRequest,
    SASTBaselineItem,
    SASTBaselinesResponse,
    CreateSASTBaselineRequest,
    SASTExceptionItem,
    SASTExceptionsResponse,
    CreateSASTExceptionRequest,
    UpdateSASTExceptionRequest,
    SASTCoverageResponse,
    SASTScanLogsResponse,
    SASTScanCompareResponse,
)
from app.code.sast_service import SASTService

router = APIRouter(prefix="/sast", tags=["Thing Code — SAST Security Dashboard"])


@router.get("/overview", response_model=SASTOverviewResponse)
async def get_sast_overview(
    project_id: Optional[str] = Query(None, description="Scope to project or organization UUID"),
    repository: Optional[str] = Query(None, description="Filter by repository"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    date_range: Optional[str] = Query(None, description="Filter by date range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_overview(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        date_range=date_range,
    )


@router.get("/overview/trends", response_model=SASTTrendsResponse)
async def get_sast_trends(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    group_by: Optional[str] = Query("day"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_trends(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        date_range=date_range,
        group_by=group_by,
    )


@router.get("/overview/severity", response_model=SASTSeverityResponse)
async def get_sast_severity(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_severity(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        date_range=date_range,
    )


@router.get("/overview/categories", response_model=SASTCategoriesResponse)
async def get_sast_categories(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_categories(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        date_range=date_range,
    )


@router.get("/findings/recent", response_model=SASTRecentFindingsResponse)
async def get_sast_recent_findings(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_recent_findings(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        category=category,
        severity=severity,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.patch("/findings/{finding_id}", response_model=SASTRecentFindingItem)
async def update_sast_finding(
    finding_id: str,
    payload: UpdateFindingRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    updated = await service.update_finding(finding_id, payload, project_id=project_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found or access denied.",
        )
    return updated


@router.get("/scans", response_model=SASTScanStatusResponse)
async def get_sast_scans(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_scan_status(project_id=project_id, status_filter=status)


@router.post("/scans", response_model=SASTScanItem)
async def trigger_sast_scan(
    payload: TriggerScanRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.trigger_scan(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/scans/{scan_id}/cancel")
async def cancel_sast_scan(
    scan_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    success = await service.cancel_scan(scan_id, project_id=project_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found or cannot be cancelled.")
    return {"status": "cancelled", "scan_id": scan_id}


@router.post("/scans/{scan_id}/retry", response_model=SASTScanItem)
async def retry_sast_scan(
    scan_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    item = await service.retry_scan(scan_id, project_id=project_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found or cannot be retried.")
    return item


@router.post("/scans/schedule", response_model=SASTScheduleItem)
async def schedule_sast_scan(
    payload: ScheduleScanRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.schedule_scan(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/scans/schedules", response_model=List[SASTScheduleItem])
async def list_sast_schedules(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.list_schedules(project_id=project_id)


@router.get("/repositories")
async def get_sast_repositories(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_repositories(project_id=project_id)


@router.get("/repositories/{repository_id}/branches")
async def get_sast_repository_branches(
    repository_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_branches(repository_id, project_id=project_id)


@router.get("/scans/{scan_id}", response_model=SASTScanDetailResponse)
async def get_sast_scan_detail(
    scan_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    detail = await service.get_scan_detail(scan_id, project_id=project_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found or access denied.")
    return detail


@router.post("/scans/pull-request", response_model=SASTScanItem)
async def scan_sast_pull_request(
    payload: ScanPullRequestRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.scan_pull_request(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/scans/schedules/{schedule_id}")
async def delete_sast_schedule(
    schedule_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    deleted = await service.delete_schedule(schedule_id, project_id=project_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found or cannot be deleted.")
    return {"status": "deleted", "schedule_id": schedule_id}


@router.get("/export", response_model=SASTExportResponse)
async def export_sast_findings(
    project_id: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.export_findings(
        project_id=project_id,
        repository_id=repository,
        branch=branch,
        category=category,
        severity=severity,
    )


@router.get("/rules", response_model=SASTRulesResponse)
async def get_sast_rules(
    project_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_rules(
        project_id=project_id,
        category=category,
        severity=severity,
        search=search,
    )


@router.post("/rules", response_model=SASTRuleItem)
async def create_sast_rule(
    payload: CreateSASTRuleRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.create_rule(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/rules/{rule_id}", response_model=SASTRuleItem)
async def update_sast_rule(
    rule_id: str,
    payload: UpdateSASTRuleRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    updated = await service.update_rule(rule_id, payload, project_id=project_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found or cannot be modified.")
    return updated


# =========================================================================
# Baselines
# =========================================================================
@router.get("/baselines", response_model=SASTBaselinesResponse)
async def get_sast_baselines(
    project_id: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_baselines(project_id=project_id, repository_id=repository_id)


@router.post("/baselines", response_model=SASTBaselineItem)
async def create_sast_baseline(
    payload: CreateSASTBaselineRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.create_baseline(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# =========================================================================
# Exceptions (Risk Acceptance)
# =========================================================================
@router.get("/exceptions", response_model=SASTExceptionsResponse)
async def get_sast_exceptions(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query("all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_exceptions(project_id=project_id, status_filter=status)


@router.post("/exceptions", response_model=SASTExceptionItem)
async def create_sast_exception(
    payload: CreateSASTExceptionRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    try:
        return await service.create_exception(payload, project_id=project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/exceptions/{exception_id}", response_model=SASTExceptionItem)
async def update_sast_exception(
    exception_id: str,
    payload: UpdateSASTExceptionRequest,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    updated = await service.update_exception(exception_id, payload, project_id=project_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found.")
    return updated


# =========================================================================
# Coverage Details
# =========================================================================
@router.get("/coverage", response_model=SASTCoverageResponse)
async def get_sast_coverage(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    return await service.get_coverage(project_id=project_id)


# =========================================================================
# Scan Logs & Diagnostics
# =========================================================================
@router.get("/scans/{scan_id}/logs", response_model=SASTScanLogsResponse)
async def get_sast_scan_logs(
    scan_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    logs = await service.get_scan_logs(scan_id, project_id=project_id)
    if not logs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    return logs


# =========================================================================
# Scan Comparison
# =========================================================================
class CompareScansPayload(BaseModel):
    base_scan_id: str
    compare_scan_id: str


@router.post("/scans/compare", response_model=SASTScanCompareResponse)
async def compare_sast_scans(
    payload: CompareScansPayload,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    result = await service.compare_scans(payload.base_scan_id, payload.compare_scan_id, project_id=project_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both scans not found.")
    return result


# =========================================================================
# Rule Detail
# =========================================================================
@router.get("/rules/{rule_id}")
async def get_sast_rule_detail(
    rule_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = SASTService(db, current_user)
    detail = await service.get_rule_detail(rule_id, project_id=project_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")
    return detail


# =========================================================================
# SAST Agent Status & Telemetry
# =========================================================================
@router.get("/agent/status")
async def get_sast_agent_status(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.code.sast_agent_orchestrator import SASTAgentOrchestrator
    import uuid
    service = SASTService(db, current_user)
    _, p_uuids = await service._resolve_scoped_project_ids(project_id)
    target_p_uuid = p_uuids[0] if p_uuids else uuid.uuid4()
    orch = SASTAgentOrchestrator(db, current_user)
    return await orch.get_agent_status_summary(target_p_uuid)




