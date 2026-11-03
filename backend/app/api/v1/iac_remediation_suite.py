"""
IaC Remediation Suite API Router — Section 5: Screens 5.1 through 5.8
Prefix: /api/v1/iac/remediation-suite
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.iac_remediation_suite import (
    IaCRemediationOverviewSuiteResponse,
    FixRecommendationsPageResponse,
    RemediationDetailResponse,
    AutoFixListResponse,
    GeneratePRRequest,
    GeneratePRResponse,
    RemediationPRsPageResponse,
    SuppressedFindingsPageResponse,
    SuppressedFindingItem,
    UpdateSuppressionRequest,
    RemediationActivityPageResponse,
    RemediationSettingsDTO,
    UpdateRemediationSettingsRequest,
)
from app.services.iac_remediation_suite_service import IaCRemediationSuiteService

router = APIRouter(prefix="/iac/remediation-suite", tags=["IaC Remediation Suite"])


@router.get(
    "/overview",
    response_model=IaCRemediationOverviewSuiteResponse,
    summary="5.1 Remediation Overview (KPIs, Status Trend, Top Categories)",
)
async def get_overview(
    time_range: str = Query("Last 30 days", description="Time window filter"),
) -> IaCRemediationOverviewSuiteResponse:
    return IaCRemediationSuiteService.get_overview(time_range)


@router.get(
    "/recommendations",
    response_model=FixRecommendationsPageResponse,
    summary="5.2 Fix Recommendations matrix with multi-filters and search",
)
async def get_recommendations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    severity: Optional[str] = Query(None),
    framework: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> FixRecommendationsPageResponse:
    return IaCRemediationSuiteService.get_recommendations(
        page=page,
        page_size=page_size,
        severity=severity,
        framework=framework,
        provider=provider,
        search=search,
    )


@router.get(
    "/detail/{item_id}",
    response_model=RemediationDetailResponse,
    summary="5.3 Remediation Detail with Code Examples diff and Fix Steps",
)
async def get_remediation_detail(item_id: str) -> RemediationDetailResponse:
    return IaCRemediationSuiteService.get_remediation_detail(item_id)


@router.get(
    "/autofix",
    response_model=AutoFixListResponse,
    summary="5.4 Auto-Fix (AI Remediation) list of supported issues",
)
async def get_autofix_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    severity: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    framework: Optional[str] = Query(None),
) -> AutoFixListResponse:
    return IaCRemediationSuiteService.get_autofix_list(
        page=page,
        page_size=page_size,
        severity=severity,
        provider=provider,
        framework=framework,
    )


@router.post(
    "/autofix/generate-pr",
    response_model=GeneratePRResponse,
    status_code=status.HTTP_201_CREATED,
    summary="5.4 Auto-Fix: Generate Pull Request for finding",
)
async def generate_autofix_pr(req: GeneratePRRequest) -> GeneratePRResponse:
    return IaCRemediationSuiteService.generate_autofix_pr(req)


@router.get(
    "/prs",
    response_model=RemediationPRsPageResponse,
    summary="5.5 Pull Request Integration list with statuses and repos",
)
async def get_prs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    repository: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> RemediationPRsPageResponse:
    return IaCRemediationSuiteService.get_prs(
        page=page,
        page_size=page_size,
        status=status,
        repository=repository,
        search=search,
    )


@router.get(
    "/suppressions",
    response_model=SuppressedFindingsPageResponse,
    summary="5.6 Suppressed Findings with expiration dates and reasons",
)
async def get_suppressions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    reason: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    active_only: bool = Query(True),
) -> SuppressedFindingsPageResponse:
    return IaCRemediationSuiteService.get_suppressions(
        page=page,
        page_size=page_size,
        reason=reason,
        resource=resource,
        search=search,
        active_only=active_only,
    )


@router.patch(
    "/suppressions/{suppression_id}",
    response_model=SuppressedFindingItem,
    summary="5.6 Update or Revoke Finding Suppression",
)
async def update_suppression(
    suppression_id: str,
    req: UpdateSuppressionRequest,
) -> SuppressedFindingItem:
    try:
        return IaCRemediationSuiteService.update_suppression(suppression_id, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/activity",
    response_model=RemediationActivityPageResponse,
    summary="5.7 Remediation Activity feed with action and user filters",
)
async def get_activity(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    action: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> RemediationActivityPageResponse:
    return IaCRemediationSuiteService.get_activity(
        page=page,
        page_size=page_size,
        action=action,
        user=user,
        search=search,
    )


@router.get(
    "/settings",
    response_model=RemediationSettingsDTO,
    summary="5.8 Get Remediation Settings",
)
async def get_settings() -> RemediationSettingsDTO:
    return IaCRemediationSuiteService.get_settings()


@router.post(
    "/settings",
    response_model=RemediationSettingsDTO,
    summary="5.8 Save Remediation Settings",
)
async def save_settings(req: UpdateRemediationSettingsRequest) -> RemediationSettingsDTO:
    return IaCRemediationSuiteService.update_settings(req)


@router.post(
    "/settings/reset",
    response_model=RemediationSettingsDTO,
    summary="5.8 Reset Remediation Settings to factory defaults",
)
async def reset_settings() -> RemediationSettingsDTO:
    return IaCRemediationSuiteService.reset_settings()
