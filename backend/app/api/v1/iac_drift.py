"""
API Router for Infrastructure as Code (IaC) Drift Detection.
Prefix: /api/v1/iac/drift
Authoritative endpoints backed by PostgreSQL database and real drift engine.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.iac_drift import (
    IaCDriftOverviewResponse,
    IaCDriftResourcesPage,
    IaCDriftResourceItem,
    IaCDriftEventItem,
    IaCDriftConfigDTO,
    IaCBaselineStateDTO,
    IaCBaselineCompareRequest,
    IaCBaselineCompareResult,
    IaCRemediationPlanResponse,
    IaCApplyRemediationRequest,
    IaCApplyRemediationResponse,
    IaCIgnoreResourceRequest,
    IaCDriftGlobalSettingsDTO,
    IaCIgnoredResourceItem,
    IaCCreateIgnoredPatternRequest,
    IaCDriftSuiteOverviewResponse,
    IaCDriftEnvironmentItem,
    IaCDriftEnvironmentsResponse,
    CreateDriftEnvironmentRequest,
    IaCDriftChangeItem,
    IaCDriftChangesResponse,
    IaCDriftResourceDetailResponse,
    IaCDriftRemediationItem,
    IaCDriftRemediationResponse,
    ApplyDriftRemediationResponse,
    IaCDriftHistoryItem,
    IaCDriftHistoryResponse,
    IaCDriftSettingsDTO,
    IaCDriftCompareResponse,
)
from app.services.iac_drift_service import IaCDriftService

router = APIRouter(prefix="/iac/drift", tags=["Thing Code — IaC Drift Detection"])


@router.get(
    "/overview",
    response_model=IaCDriftOverviewResponse,
    summary="Get aggregated drift detection metrics and recent drift events",
)
async def get_drift_overview(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftOverviewResponse:
    service = IaCDriftService(db)
    return await service.get_overview()


@router.get(
    "/resources",
    response_model=IaCDriftResourcesPage,
    summary="List paginated infrastructure resources with drift status",
)
async def get_drift_resources(
    search: Optional[str] = Query(None, description="Search resource name, ID, or type"),
    provider: Optional[str] = Query(None, description="Filter by cloud provider: AWS, GCP, Azure, Kubernetes"),
    status: Optional[str] = Query(None, description="Filter by drift status: Drifted, In Sync, Ignored"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftResourcesPage:
    service = IaCDriftService(db)
    return await service.get_resources(
        search=search,
        provider=provider,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/resources/{resource_id}",
    response_model=IaCDriftResourceItem,
    summary="Get detailed drift specification and side-by-side HCL for a resource",
)
async def get_resource_detail(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftResourceItem:
    service = IaCDriftService(db)
    item = await service.get_resource_detail(resource_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' not found in drift tracking ledger",
        )
    return item


@router.post(
    "/resources/{resource_id}/rescan",
    response_model=IaCDriftResourceItem,
    summary="Trigger real-time re-scan of resource against desired IaC state",
)
async def rescan_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftResourceItem:
    service = IaCDriftService(db)
    try:
        return await service.rescan_resource(resource_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/rescan-all",
    summary="Trigger fleet-wide drift re-scan across all tracked infrastructure resources",
)
async def rescan_all(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Dict[str, Any]:
    service = IaCDriftService(db)
    return await service.rescan_all()


@router.get(
    "/resources/{resource_id}/timeline",
    response_model=List[IaCDriftEventItem],
    summary="Get chronological change history and audit events for a resource",
)
async def get_resource_timeline(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> List[IaCDriftEventItem]:
    service = IaCDriftService(db)
    return await service.get_resource_timeline(resource_id)


@router.get(
    "/resources/{resource_id}/config",
    response_model=IaCDriftConfigDTO,
    summary="Get drift detection configuration rules for a specific resource",
)
async def get_resource_config(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftConfigDTO:
    service = IaCDriftService(db)
    return await service.get_resource_config(resource_id)


@router.put(
    "/resources/{resource_id}/config",
    response_model=IaCDriftConfigDTO,
    summary="Update drift detection configuration rules for a specific resource",
)
async def update_resource_config(
    resource_id: str,
    data: IaCDriftConfigDTO,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftConfigDTO:
    service = IaCDriftService(db)
    return await service.update_resource_config(resource_id, data)


@router.get(
    "/baseline",
    response_model=IaCBaselineStateDTO,
    summary="Get active baseline state configuration and tracked metadata",
)
async def get_baseline_info(
    workspace: str = Query("production", description="Target workspace"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCBaselineStateDTO:
    service = IaCDriftService(db)
    return await service.get_baseline_info(workspace)


@router.post(
    "/baseline/compare",
    response_model=IaCBaselineCompareResult,
    summary="Execute state comparison against target state file or baseline snapshot",
)
async def compare_baseline(
    req: IaCBaselineCompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCBaselineCompareResult:
    service = IaCDriftService(db)
    return await service.compare_baseline(req)


@router.put(
    "/baseline",
    response_model=IaCBaselineStateDTO,
    summary="Save baseline configuration options and ignore rules",
)
async def update_baseline(
    req: IaCBaselineCompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCBaselineStateDTO:
    service = IaCDriftService(db)
    return await service.update_baseline_settings(req)


@router.post(
    "/resources/{resource_id}/remediate/plan",
    response_model=IaCRemediationPlanResponse,
    summary="Generate deterministic Terraform remediation plan for drifted resource",
)
async def generate_remediation_plan(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCRemediationPlanResponse:
    service = IaCDriftService(db)
    try:
        return await service.generate_remediation_plan(resource_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/resources/{resource_id}/remediate/apply",
    response_model=IaCApplyRemediationResponse,
    summary="Apply Terraform plan to remediate drift and restore desired state",
)
async def apply_remediation(
    resource_id: str,
    req: IaCApplyRemediationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCApplyRemediationResponse:
    service = IaCDriftService(db)
    try:
        return await service.apply_remediation(resource_id, comment=req.comment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/resources/{resource_id}/ignore",
    response_model=IaCDriftResourceItem,
    summary="Mark resource drift as accepted difference / ignored",
)
async def ignore_resource(
    resource_id: str,
    req: IaCIgnoreResourceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftResourceItem:
    service = IaCDriftService(db)
    try:
        return await service.ignore_resource(resource_id, reason=req.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/settings",
    response_model=IaCDriftGlobalSettingsDTO,
    summary="Get global drift detection engine settings",
)
async def get_global_settings(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftGlobalSettingsDTO:
    service = IaCDriftService(db)
    return await service.get_global_settings()


@router.put(
    "/settings",
    response_model=IaCDriftGlobalSettingsDTO,
    summary="Update global drift detection engine settings",
)
async def update_global_settings(
    data: IaCDriftGlobalSettingsDTO,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftGlobalSettingsDTO:
    service = IaCDriftService(db)
    return await service.update_global_settings(data)


@router.post(
    "/settings/ignored-patterns",
    response_model=IaCIgnoredResourceItem,
    summary="Add an ignored resource pattern rule",
)
async def add_ignored_pattern(
    req: IaCCreateIgnoredPatternRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCIgnoredResourceItem:
    service = IaCDriftService(db)
    return await service.add_ignored_pattern(
        pattern=req.resource_pattern,
        reason=req.reason,
        added_by=req.added_by or "@platform-team",
    )


@router.delete(
    "/settings/ignored-patterns/{pattern_id}",
    summary="Remove an ignored resource pattern rule",
)
async def delete_ignored_pattern(
    pattern_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Dict[str, Any]:
    service = IaCDriftService(db)
    deleted = await service.delete_ignored_pattern(pattern_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")
    return {"success": True, "deleted_id": pattern_id}


# =========================================================================
# SECTION 10: DRIFT DETECTION SUITE ROUTES (SCREENS 10.1 THROUGH 10.8)
# =========================================================================

# 10.1 Drift Detection Overview
@router.get(
    "/suite/overview",
    response_model=IaCDriftSuiteOverviewResponse,
    summary="Get drift suite overview KPIs, donut breakdown, trend chart, and recent events (Screen 10.1)",
)
async def get_drift_suite_overview(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftSuiteOverviewResponse:
    service = IaCDriftService(db)
    return await service.get_suite_overview(environment=environment)


# 10.2 Environments
@router.get(
    "/suite/environments",
    response_model=IaCDriftEnvironmentsResponse,
    summary="List all tracked environments and drift statuses (Screen 10.2)",
)
async def get_drift_suite_environments(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftEnvironmentsResponse:
    service = IaCDriftService(db)
    return await service.get_suite_environments()


@router.post(
    "/suite/environments",
    response_model=IaCDriftEnvironmentItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new tracked environment (Screen 10.2 + Add Environment modal)",
)
async def create_drift_suite_environment(
    req: CreateDriftEnvironmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftEnvironmentItem:
    service = IaCDriftService(db)
    return await service.create_suite_environment(req)


@router.post(
    "/suite/environments/{name}/scan",
    summary="Trigger drift scan on environment (Screen 10.2 action)",
)
async def scan_drift_suite_environment(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Dict[str, Any]:
    service = IaCDriftService(db)
    return await service.scan_suite_environment(name)


@router.delete(
    "/suite/environments/{name}",
    summary="Delete environment from drift monitoring (Screen 10.2 action)",
)
async def delete_drift_suite_environment(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> Dict[str, Any]:
    service = IaCDriftService(db)
    return await service.delete_suite_environment(name)


# 10.3 Drift Changes
@router.get(
    "/suite/changes",
    response_model=IaCDriftChangesResponse,
    summary="Get drift changes list with filters and pagination (Screen 10.3)",
)
async def get_drift_suite_changes(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    change_type: Optional[str] = Query(None, description="Filter by change type (Modified, Deleted, Added)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Drifted, In Sync)"),
    search: Optional[str] = Query(None, description="Search resource or type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftChangesResponse:
    service = IaCDriftService(db)
    return await service.get_suite_changes(
        environment=environment,
        change_type=change_type,
        status=status_filter,
        search=search,
        page=page,
        page_size=page_size,
    )


# 10.4 Resource Detail
@router.get(
    "/suite/resources/{resource_name}",
    response_model=IaCDriftResourceDetailResponse,
    summary="Get deep resource details, drift summary, and deployed configurations (Screen 10.4)",
)
async def get_drift_suite_resource_detail(
    resource_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftResourceDetailResponse:
    service = IaCDriftService(db)
    return await service.get_suite_resource_detail(resource_name)


# 10.5 Remediation
@router.get(
    "/suite/remediation",
    response_model=IaCDriftRemediationResponse,
    summary="Get drift remediation recommendations with filters (Screen 10.5)",
)
async def get_drift_suite_remediation(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    severity: Optional[str] = Query(None, description="Filter by severity (High, Medium, Low)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Open, In Progress, Resolved)"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftRemediationResponse:
    service = IaCDriftService(db)
    return await service.get_suite_remediation(
        environment=environment,
        severity=severity,
        status=status_filter,
    )


@router.post(
    "/suite/remediation/{remediation_id}/apply",
    response_model=ApplyDriftRemediationResponse,
    summary="Apply remediation fix for drifted resource (Screen 10.5 Apply button)",
)
async def apply_drift_suite_remediation(
    remediation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> ApplyDriftRemediationResponse:
    service = IaCDriftService(db)
    return await service.apply_suite_remediation(remediation_id)


# 10.6 Drift History
@router.get(
    "/suite/history",
    response_model=IaCDriftHistoryResponse,
    summary="Get drift history event stream with resource and date filters (Screen 10.6)",
)
async def get_drift_suite_history(
    resource: Optional[str] = Query(None, description="Filter by resource"),
    date_range: Optional[str] = Query(None, description="Filter by date range"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftHistoryResponse:
    service = IaCDriftService(db)
    return await service.get_suite_history(
        resource=resource,
        date_range=date_range,
        page=page,
        page_size=page_size,
    )


# 10.7 Settings
@router.get(
    "/suite/settings",
    response_model=IaCDriftSettingsDTO,
    summary="Get drift detection suite configuration settings (Screen 10.7)",
)
async def get_drift_suite_settings(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftSettingsDTO:
    service = IaCDriftService(db)
    return await service.get_suite_settings()


@router.put(
    "/suite/settings",
    response_model=IaCDriftSettingsDTO,
    summary="Update drift detection suite configuration settings (Screen 10.7 Save Changes action)",
)
async def update_drift_suite_settings(
    data: IaCDriftSettingsDTO,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftSettingsDTO:
    service = IaCDriftService(db)
    return await service.update_suite_settings(data)


# 10.8 Compare Configuration
@router.get(
    "/suite/compare/{resource_name}",
    response_model=IaCDriftCompareResponse,
    summary="Get side-by-side IaC Git vs Deployed AWS configuration comparison (Screen 10.8)",
)
async def get_drift_suite_compare(
    resource_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
) -> IaCDriftCompareResponse:
    service = IaCDriftService(db)
    return await service.get_suite_compare(resource_name)

