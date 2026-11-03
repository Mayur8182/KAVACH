"""
IaC Findings Suite API Router — Section 2: Screens 2.1 through 2.8
Prefix: /api/v1/iac/findings-suite
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.iac_findings_suite import (
    IaCFindingsOverviewResponse,
    IaCFindingsAllResponse,
    IaCFindingsByProviderResponse,
    IaCFindingsBySeverityResponse,
    IaCFindingsByCategoryResponse,
    IaCFindingsByFrameworkResponse,
    IaCFindingsByEnvironmentResponse,
    ExportFindingsRequest,
    ExportFindingsResponse,
    UpdateSuiteFindingStatusRequest,
    IaCFindingRowItem,
    IaCFindingDetailResponse,
    AssignFindingRequest,
    CommentFindingRequest,
    RemediateFindingRequest,
    IaCFindingsTriageResponse,
    BulkFindingActionRequest,
    IaCFindingsTrendsResponse,
    IaCFindingsByResourceResponse,
    IaCFindingsByFrameworkSummaryResponse,
    ExportFindingsAdvancedRequest,
    ScheduledReportItem,
    ScheduledReportCreateRequest,
    ReportHistoryItem,
)
from app.services.iac_findings_suite_service import IaCFindingsSuiteService

router = APIRouter(prefix="/iac/findings-suite", tags=["IaC Findings Suite"])


@router.get(
    "/overview",
    response_model=IaCFindingsOverviewResponse,
    summary="2.1 Findings Overview (KPIs, Trend, Donut, Top Resources)",
)
async def get_findings_overview(
    time_range: str = Query("Last 30 days", description="Time range filter"),
) -> IaCFindingsOverviewResponse:
    return IaCFindingsSuiteService.get_overview(time_range)


@router.get(
    "/all",
    response_model=IaCFindingsAllResponse,
    summary="2.2 All Findings with multi-filters and pagination",
)
async def get_all_findings(
    severity: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    framework: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsAllResponse:
    return IaCFindingsSuiteService.get_all(
        severity=severity,
        provider=provider,
        framework=framework,
        status=status,
        environment=environment,
        category=category,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/by-provider",
    response_model=IaCFindingsByProviderResponse,
    summary="2.3 Findings grouped by Cloud Provider",
)
async def get_findings_by_provider(
    provider: str = Query("AWS"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByProviderResponse:
    return IaCFindingsSuiteService.get_by_provider(
        provider=provider,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/by-severity",
    response_model=IaCFindingsBySeverityResponse,
    summary="2.4 Findings filtered by Severity level",
)
async def get_findings_by_severity(
    severity: str = Query("Critical"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsBySeverityResponse:
    return IaCFindingsSuiteService.get_by_severity(
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/by-category",
    response_model=IaCFindingsByCategoryResponse,
    summary="2.5 Findings breakdown by Security Category",
)
async def get_findings_by_category(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByCategoryResponse:
    return IaCFindingsSuiteService.get_by_category(
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/by-framework",
    response_model=IaCFindingsByFrameworkResponse,
    summary="2.6 Findings mapped to Compliance Frameworks",
)
async def get_findings_by_framework(
    framework: str = Query("CIS AWS"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByFrameworkResponse:
    return IaCFindingsSuiteService.get_by_framework(
        framework=framework,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/by-environment",
    response_model=IaCFindingsByEnvironmentResponse,
    summary="2.7 Findings grouped by Deployment Environment",
)
async def get_findings_by_environment(
    environment: str = Query("Production"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByEnvironmentResponse:
    return IaCFindingsSuiteService.get_by_environment(
        environment=environment,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/export",
    response_model=ExportFindingsResponse,
    summary="Export findings to CSV or JSON",
)
async def export_findings(
    payload: ExportFindingsRequest,
) -> ExportFindingsResponse:
    return IaCFindingsSuiteService.export(payload)


@router.patch(
    "/{finding_id}/status",
    response_model=IaCFindingRowItem,
    summary="Update status of an IaC finding (Open, In Progress, Resolved)",
)
async def update_finding_status(
    finding_id: str,
    payload: UpdateSuiteFindingStatusRequest,
) -> IaCFindingRowItem:
    updated = IaCFindingsSuiteService.update_status(finding_id, payload.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return updated


# ── 3.3 Finding Detail ───────────────────────────────────────────────────────────

@router.get(
    "/detail/{finding_id}",
    response_model=IaCFindingDetailResponse,
    summary="3.3 Finding Detail with Overview, Evidence, Remediation, Comments, Activity",
)
async def get_finding_detail(finding_id: str) -> IaCFindingDetailResponse:
    detail = IaCFindingsSuiteService.get_finding_detail(finding_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return detail


@router.post(
    "/detail/{finding_id}/assign",
    response_model=IaCFindingDetailResponse,
    summary="Assign a finding to an engineer or team",
)
async def assign_finding(
    finding_id: str,
    payload: AssignFindingRequest,
) -> IaCFindingDetailResponse:
    updated = IaCFindingsSuiteService.assign_finding(finding_id, payload.assignee)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return updated


@router.post(
    "/detail/{finding_id}/comment",
    response_model=IaCFindingDetailResponse,
    summary="Add a comment to a finding",
)
async def add_finding_comment(
    finding_id: str,
    payload: CommentFindingRequest,
) -> IaCFindingDetailResponse:
    updated = IaCFindingsSuiteService.add_comment(finding_id, payload.comment, payload.author or "Dev Security Admin")
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return updated


@router.post(
    "/detail/{finding_id}/remediate",
    response_model=IaCFindingDetailResponse,
    summary="Apply automated remediation for a finding",
)
async def remediate_finding(
    finding_id: str,
    payload: RemediateFindingRequest,
) -> IaCFindingDetailResponse:
    updated = IaCFindingsSuiteService.remediate_finding(finding_id, payload.action)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return updated


# ── 3.4 Findings Triage ─────────────────────────────────────────────────────────

@router.get(
    "/triage",
    response_model=IaCFindingsTriageResponse,
    summary="3.4 Findings Triage (Status counts, assignees, action buttons)",
)
async def get_findings_triage(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsTriageResponse:
    return IaCFindingsSuiteService.get_triage(
        status=status,
        severity=severity,
        provider=provider,
        assignee=assignee,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/triage/bulk",
    summary="Execute bulk action on selected findings (assign, set_status, suppress)",
)
async def execute_bulk_triage_action(
    payload: BulkFindingActionRequest,
):
    return IaCFindingsSuiteService.bulk_action(payload)


# ── 3.5 Findings Trends ─────────────────────────────────────────────────────────

@router.get(
    "/trends",
    response_model=IaCFindingsTrendsResponse,
    summary="3.5 Findings Trends (90 days trend, providers bar chart, environment donut)",
)
async def get_findings_trends(
    time_range: str = Query("Last 90 days"),
) -> IaCFindingsTrendsResponse:
    return IaCFindingsSuiteService.get_trends(time_range=time_range)


# ── 3.6 Findings by Resource ───────────────────────────────────────────────────

@router.get(
    "/by-resource",
    response_model=IaCFindingsByResourceResponse,
    summary="3.6 Findings grouped by Resource Type (S3, Security Group, IAM, etc.)",
)
async def get_findings_by_resource(
    provider: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByResourceResponse:
    return IaCFindingsSuiteService.get_by_resource(
        provider=provider,
        environment=environment,
        search=search,
        page=page,
        page_size=page_size,
    )


# ── 3.7 Findings by Framework (Compliance Summary) ─────────────────────────────

@router.get(
    "/by-framework-summary",
    response_model=IaCFindingsByFrameworkSummaryResponse,
    summary="3.7 Findings mapped to compliance and security frameworks summary table",
)
async def get_findings_by_framework_summary(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> IaCFindingsByFrameworkSummaryResponse:
    return IaCFindingsSuiteService.get_by_framework_summary(
        page=page,
        page_size=page_size,
    )


# ── 3.8 Export & Reports ───────────────────────────────────────────────────────

@router.post(
    "/export-advanced",
    response_model=ExportFindingsResponse,
    summary="3.8 Advanced Export with Format, Include Options, and Filters",
)
async def export_findings_advanced(
    payload: ExportFindingsAdvancedRequest,
) -> ExportFindingsResponse:
    return IaCFindingsSuiteService.export_advanced(payload)


@router.get(
    "/reports/scheduled",
    response_model=List[ScheduledReportItem],
    summary="List automated scheduled reports",
)
async def get_scheduled_reports() -> List[ScheduledReportItem]:
    return IaCFindingsSuiteService.get_scheduled_reports()


@router.post(
    "/reports/scheduled",
    response_model=ScheduledReportItem,
    summary="Create a new scheduled report",
)
async def create_scheduled_report(
    payload: ScheduledReportCreateRequest,
) -> ScheduledReportItem:
    return IaCFindingsSuiteService.create_scheduled_report(payload)


@router.patch(
    "/reports/scheduled/{report_id}/toggle",
    response_model=ScheduledReportItem,
    summary="Toggle scheduled report active/paused status",
)
async def toggle_scheduled_report(report_id: str) -> ScheduledReportItem:
    updated = IaCFindingsSuiteService.toggle_scheduled_report(report_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found",
        )
    return updated


@router.get(
    "/reports/history",
    response_model=List[ReportHistoryItem],
    summary="Get history of generated and exported security reports",
)
async def get_report_history() -> List[ReportHistoryItem]:
    return IaCFindingsSuiteService.get_report_history()
