"""
IaC Security API Router — /api/v1/iac
Exposes endpoints for Infrastructure as Code security posture, finding drill-downs,
provider and framework analytics, and scan job management.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.iac import (
    IaCComplianceResponse,
    IaCFileContentResponse,
    IaCFilesListResponse,
    IaCFindingItem,
    IaCFindingsPageResponse,
    IaCPoliciesListResponse,
    IaCPolicyItem,
    IaCRemediationOverviewResponse,
    IaCScanConfig,
    IaCScanJobResponse,
    IaCScansListResponse,
    IaCSummaryResponse,
    TriggerIaCScanRequest,
    UpdateFindingStatusRequest,
    UpdatePolicyStatusRequest,
    IaCScanDetailResponse,
    IaCUpdateScanConfigRequest,
    IaCScanConfigDetails,
    IaCConfigAnalysisOverviewResponse,
    IaCInventoryPageResponse,
    IaCMisconfigurationsPageResponse,
    IaCSecureConfigsPageResponse,
    IaCConfigDriftPageResponse,
    IaCBestPracticesResponse,
    IaCResourceAnalysisDetailResponse,
    IaCComparisonDiffResponse,
    IaCSecurityOverviewDashboardResponse,
    IaCEnvironmentOverviewResponse,
    IaCProviderOverviewResponse,
    IaCOverviewResourcesResponse,
    IaCCoverageResponse,
    IaCOverviewComplianceResponse,
    IaCRiskSummaryResponse,
    IaCRecentActivityResponse,
    IaCPoliciesQualityGatesOverviewResponse,
    IaCPoliciesCatalogResponse,
    IaCPolicyDetailResponse,
    CreatePolicyRequest,
    IaCQualityGatesListResponse,
    IaCQualityGateDetailResponse,
    CreateQualityGateRequest,
    AddQualityGateRuleRequest,
    IaCPolicyViolationsResponse,
    IaCPolicyExceptionsResponse,
    CreatePolicyExceptionRequest,
    IaCPolicyExceptionItem,
    IaCPoliciesSettings,
    IaCRulesOverviewResponse,
    IaCRulesListResponse,
    IaCRuleDetailResponse,
    CreateRuleRequest,
    UpdateRuleRequest,
    IaCRuleItem,
    ValidateRegoRequest,
    ValidateRegoResponse,
    IaCRulePacksListResponse,
    IaCRulePackItem,
    IaCTopRepoFindingsItem,
    IaCScansOverviewResponse,
    IaCScanHistoryRow,
    IaCScanHistoryResponse,
    IaCScheduledScanItem,
    IaCScheduledScansResponse,
    CreateScheduledScanRequest,
    TriggerOnDemandScanRequest,
    TriggerOnDemandScanResponse,
    IaCScanConfigurationsDTO,
    IaCComparisonSeverityDiff,
    IaCChangedResourceItem,
    IaCResultsComparisonResponse,
    IaCQueueScanItem,
    IaCScanQueueResponse,
    IaCScanGlobalSettings,
    IaCComplianceOverviewResponse,
    IaCComplianceFrameworkItem,
    IaCComplianceFrameworksResponse,
    CreateFrameworkRequest,
    IaCComplianceControlMappingItem,
    IaCComplianceControlsResponse,
    IaCControlDetailResponse,
    GenerateComplianceReportRequest,
    ComplianceReportGeneratedResponse,
    ComplianceReportHistoryResponse,
    IaCComplianceEvidenceItem,
    IaCComplianceEvidenceResponse,
    CreateEvidenceRequest,
    IaCComplianceExceptionItem,
    IaCComplianceExceptionsResponse,
    CreateComplianceExceptionRequest,
    IaCComplianceAuditLogItem,
    IaCComplianceAuditLogsResponse,
    IaCComplianceSettings,
)
from app.services.iac_service import IaCService

router = APIRouter(prefix="/iac", tags=["Thing Code — IaC Security"])


@router.get(
    "/summary",
    response_model=IaCSummaryResponse,
    summary="Get aggregated IaC security metrics and distribution charts",
    description="Returns real issue counts by severity, provider breakdown, framework breakdown, and top affected resources.",
)
async def get_iac_summary(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCSummaryResponse:
    service = IaCService(db)
    return await service.get_summary(repository_id=repository_id, project_id=project_id)


@router.get(
    "/findings",
    response_model=IaCFindingsPageResponse,
    summary="List paginated IaC security findings with filtering",
    description="Returns filtered and paginated IaC violations detected by Checkov and Trivy on Terraform, Helm, and Kubernetes manifests.",
)
async def get_iac_findings(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search across rule ID, title, description, file, or resource"),
    provider: Optional[str] = Query(None, description="Filter by cloud provider: AWS, Kubernetes, Azure, GCP"),
    framework: Optional[str] = Query(None, description="Filter by framework: Terraform, Helm, Kubernetes, CloudFormation"),
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low"),
    status: Optional[str] = Query(None, description="Filter by status: Open, In Progress, Resolved"),
    category: Optional[str] = Query(None, description="Filter by category: Network & Firewall, Identity & Access, Storage, Compute, Container Security"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFindingsPageResponse:
    service = IaCService(db)
    return await service.get_findings(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        provider=provider,
        framework=framework,
        severity=severity,
        status_filter=status,
        category=category,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/findings/{finding_id}",
    response_model=IaCFindingItem,
    summary="Get single IaC finding detail",
)
async def get_iac_finding_detail(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFindingItem:
    service = IaCService(db)
    item = await service.get_finding_detail(finding_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Finding '{finding_id}' not found")
    return item


@router.post(
    "/findings/{finding_id}/apply-fix",
    response_model=IaCFindingItem,
    summary="Apply automated remediation for IaC finding",
    description="Updates the infrastructure finding to Resolved status with code fix evidence and audit history.",
)
async def apply_iac_finding_fix(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFindingItem:
    service = IaCService(db)
    return await service.apply_fix(finding_id, current_user=current_user)


@router.post(
    "/findings/{finding_id}/create-pr",
    summary="Create a GitHub Pull Request with the IaC remediation patch",
)
async def create_iac_finding_pr(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.create_pr(finding_id, current_user=current_user)


@router.post(
    "/findings/{finding_id}/suppress",
    response_model=IaCFindingItem,
    summary="Suppress / ignore an IaC finding with accepted risk",
)
async def suppress_iac_finding(
    finding_id: str,
    reason: str = Query("Accepted Business Risk"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFindingItem:
    service = IaCService(db)
    return await service.suppress_finding(finding_id, reason=reason)


@router.put(
    "/findings/{finding_id}/status",
    response_model=IaCFindingItem,
    summary="Update IaC finding status (Open, In Progress, Resolved, Suppressed)",
)
async def update_iac_finding_status(
    finding_id: str,
    payload: UpdateFindingStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFindingItem:
    service = IaCService(db)
    return await service.update_finding_status(finding_id, new_status=payload.status, current_user=current_user)


@router.get(
    "/export",
    summary="Export IaC security report as CSV or JSON",
    description="Generates downloadable compliance and security report of all infrastructure findings.",
)
async def export_iac_report(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    format: str = Query("csv", description="Export format: csv or json"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.export_report(repository_id=repository_id, project_id=project_id, format=format)


@router.post(
    "/scan",
    response_model=IaCScanJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger real IaC security verification scan",
    description="Launches an asynchronous scan job running Checkov/Trivy across repository infrastructure files.",
)
async def trigger_iac_scan(
    payload: TriggerIaCScanRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanJobResponse:
    service = IaCService(db)
    return await service.trigger_scan(
        repository_id=payload.repository_id,
        branch=payload.branch or "main",
        frameworks=payload.frameworks,
        current_user=current_user,
        background_tasks=background_tasks,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=IaCScanJobResponse,
    summary="Get IaC scan job status",
)
async def get_iac_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanJobResponse:
    service = IaCService(db)
    return await service.get_job_status(job_id)


@router.get(
    "/config",
    response_model=IaCScanConfig,
    summary="Get repository IaC scan configuration",
)
async def get_iac_config(
    repository_id: str = Query(..., description="Repository UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanConfig:
    return IaCScanConfig(
        repository_id=repository_id,
        enabled_frameworks=["terraform", "helm", "kubernetes", "cloudformation"],
        fail_on_severity="HIGH",
        custom_policies_dir="policies/iac",
        auto_scan_on_push=True,
    )


@router.post(
    "/config",
    response_model=IaCScanConfig,
    summary="Update repository IaC scan configuration",
)
async def update_iac_config(
    payload: IaCScanConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanConfig:
    return payload


@router.get(
    "/scans",
    response_model=IaCScansListResponse,
    summary="List past IaC scans history for repository",
)
async def get_iac_scans(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScansListResponse:
    service = IaCService(db)
    return await service.get_scans(repository_id=repository_id, project_id=project_id)


@router.get(
    "/scans/{scan_id}",
    response_model=IaCScanDetailResponse,
    summary="Get full IaC Scan Detail (Views 9.1 - 9.8)",
    description="Returns complete scan detail including Overview, Findings, Resources, Rules, Compliance, Logs, Configuration, and Run Details.",
)
async def get_iac_scan_detail(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanDetailResponse:
    service = IaCService(db)
    return await service.get_scan_detail(scan_id=scan_id)


@router.post(
    "/scans/{scan_id}/rerun",
    response_model=IaCScanJobResponse,
    summary="Re-run IaC security scan",
)
async def rerun_iac_scan(
    scan_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanJobResponse:
    service = IaCService(db)
    return await service.rerun_scan(scan_id=scan_id, background_tasks=background_tasks)


@router.put(
    "/scans/{scan_id}/config",
    response_model=IaCScanConfigDetails,
    summary="Update Scan Configuration",
)
async def update_iac_scan_config(
    scan_id: str,
    payload: IaCUpdateScanConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanConfigDetails:
    service = IaCService(db)
    return await service.update_scan_config(scan_id=scan_id, payload=payload)


@router.get(
    "/scans/{scan_id}/export",
    summary="Export Scan Report (JSON, SARIF, or CSV)",
)
async def export_iac_scan_report(
    scan_id: str,
    format: str = Query("json", description="Export format: json, sarif, or csv"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.export_scan_report(scan_id=scan_id, format=format)


@router.get(
    "/scans/{scan_id}/logs/download",
    summary="Download plain-text Scan Execution Logs",
)
async def download_iac_scan_logs(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.download_scan_logs(scan_id=scan_id)



@router.get(
    "/files",
    response_model=IaCFilesListResponse,
    summary="List infrastructure files analyzed in repository",
)
async def get_iac_files(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFilesListResponse:
    service = IaCService(db)
    return await service.get_files(repository_id=repository_id, project_id=project_id)


@router.get(
    "/files/{file_path:path}",
    response_model=IaCFileContentResponse,
    summary="Get infrastructure file content and its associated findings",
)
async def get_iac_file_content(
    file_path: str,
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCFileContentResponse:
    service = IaCService(db)
    return await service.get_file_content(file_path=file_path, repository_id=repository_id)


@router.get(
    "/policies",
    response_model=IaCPoliciesListResponse,
    summary="Get IaC security policies catalogue and enforcement status",
)
async def get_iac_policies(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPoliciesListResponse:
    service = IaCService(db)
    return await service.get_policies(repository_id=repository_id, project_id=project_id)


@router.put(
    "/policies/{rule_id}/status",
    response_model=IaCPolicyItem,
    summary="Update IaC policy enforcement status (ENFORCED, AUDIT_ONLY, DISABLED)",
)
async def update_iac_policy_status(
    rule_id: str,
    payload: UpdatePolicyStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyItem:
    service = IaCService(db)
    return await service.update_policy_status(rule_id=rule_id, new_status=payload.status)


@router.get(
    "/compliance",
    response_model=IaCComplianceResponse,
    summary="Get CIS and regulatory compliance benchmark evaluations",
)
async def get_iac_compliance(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search compliance checks"),
    framework: Optional[str] = Query(None, description="Filter by framework (CIS, Kubernetes, Terraform)"),
    status: Optional[str] = Query(None, description="Filter by status (Passed, Failed, Skipped)"),
    provider: Optional[str] = Query(None, description="Filter by provider (AWS, Kubernetes, Terraform)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceResponse:
    service = IaCService(db)
    return await service.get_compliance(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        framework=framework,
        status=status,
        provider=provider,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/remediation",
    response_model=IaCRemediationOverviewResponse,
    summary="Get automated remediation items, proposed diffs, and pull requests",
)
async def get_iac_remediation(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRemediationOverviewResponse:
    service = IaCService(db)
    return await service.get_remediation(repository_id=repository_id, project_id=project_id)


# ============================================================================
# Section 4: Configuration Analysis Endpoints (Screens 4.1 to 4.8)
# ============================================================================

@router.get(
    "/config-analysis/overview",
    response_model=IaCConfigAnalysisOverviewResponse,
    summary="Configuration Analysis Overview metrics, trends, and type distribution (Screen 4.1)",
)
async def get_config_analysis_overview(
    repository_id: Optional[str] = Query(None, description="Optional repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    time_range: str = Query("Last 30 days", description="Time window for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCConfigAnalysisOverviewResponse:
    service = IaCService(db)
    return await service.get_config_analysis_overview(
        repository_id=repository_id,
        project_id=project_id,
        time_range=time_range,
    )


@router.get(
    "/config-analysis/inventory",
    response_model=IaCInventoryPageResponse,
    summary="Resource Inventory with compliance statuses and issues (Screen 4.2)",
)
async def get_config_analysis_inventory(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search resources"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCInventoryPageResponse:
    service = IaCService(db)
    return await service.get_config_analysis_inventory(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        provider=provider,
        resource_type=resource_type,
        environment=environment,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/config-analysis/misconfigurations",
    response_model=IaCMisconfigurationsPageResponse,
    summary="Security misconfigurations table (Screen 4.3)",
)
async def get_config_analysis_misconfigurations(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search misconfigurations"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCMisconfigurationsPageResponse:
    service = IaCService(db)
    return await service.get_config_analysis_misconfigurations(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        severity=severity,
        provider=provider,
        resource_type=resource_type,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/config-analysis/secure-configs",
    response_model=IaCSecureConfigsPageResponse,
    summary="Hardened and secure configurations table (Screen 4.4)",
)
async def get_config_analysis_secure_configs(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search secure resources"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCSecureConfigsPageResponse:
    service = IaCService(db)
    return await service.get_config_analysis_secure_configs(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        provider=provider,
        resource_type=resource_type,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/config-analysis/drift",
    response_model=IaCConfigDriftPageResponse,
    summary="Configuration drift detection between declared IaC and actual state (Screen 4.5)",
)
async def get_config_analysis_drift(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    search: Optional[str] = Query(None, description="Search drift items"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    status: Optional[str] = Query(None, description="Filter by drift status (Drifted, In Sync)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCConfigDriftPageResponse:
    service = IaCService(db)
    return await service.get_config_analysis_drift(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        provider=provider,
        resource_type=resource_type,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/config-analysis/best-practices",
    response_model=IaCBestPracticesResponse,
    summary="Security best practices compliance audit against industry benchmarks (Screen 4.6)",
)
async def get_config_analysis_best_practices(
    repository_id: Optional[str] = Query(None, description="Repository UUID"),
    project_id: Optional[str] = Query(None, description="Project UUID"),
    framework: str = Query("CIS Benchmarks", description="Framework name (CIS Benchmarks, AWS Well-Architected, NIST, Custom)"),
    search: Optional[str] = Query(None, description="Search control ID or title"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCBestPracticesResponse:
    service = IaCService(db)
    return await service.get_config_analysis_best_practices(
        repository_id=repository_id,
        project_id=project_id,
        framework=framework,
        search=search,
    )


@router.get(
    "/config-analysis/resources/{resource_id}",
    response_model=IaCResourceAnalysisDetailResponse,
    summary="Configuration Analysis Resource Detail with Terraform code and detected issues (Screen 4.7)",
)
async def get_config_analysis_resource_detail(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCResourceAnalysisDetailResponse:
    service = IaCService(db)
    return await service.get_config_analysis_resource_detail(resource_id=resource_id)


@router.get(
    "/config-analysis/compare/{resource_id}",
    response_model=IaCComparisonDiffResponse,
    summary="Side-by-side comparison between declared IaC and actual live state (Screen 4.8)",
)
async def get_config_analysis_comparison(
    resource_id: str,
    view_mode: str = Query("Side by side", description="Comparison mode (Side by side | Inline)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComparisonDiffResponse:
    service = IaCService(db)
    return await service.get_config_analysis_comparison(
        resource_id=resource_id,
        view_mode=view_mode,
    )


@router.post(
    "/config-analysis/reconcile/{resource_id}",
    summary="Trigger drift reconciliation workflow for a resource",
)
async def reconcile_config_analysis_drift(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.reconcile_config_drift(resource_id=resource_id)


# ============================================================================
# Section 1: IaC Security Overview Endpoints (Screens 1.1 to 1.8)
# ============================================================================

@router.get(
    "/overview/dashboard",
    response_model=IaCSecurityOverviewDashboardResponse,
    summary="IaC Security Overview dashboard metrics, trends, and breakdown (Screen 1.1)",
)
async def get_overview_dashboard(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    time_range: str = Query("Last 30 days", description="Time range (e.g. Last 30 days)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCSecurityOverviewDashboardResponse:
    service = IaCService(db)
    return await service.get_overview_dashboard(
        repository_id=repository_id,
        project_id=project_id,
        time_range=time_range,
    )


@router.get(
    "/overview/environments",
    response_model=IaCEnvironmentOverviewResponse,
    summary="Environment Overview with severity breakdown and compliance trends (Screen 1.2)",
)
async def get_overview_environments(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCEnvironmentOverviewResponse:
    service = IaCService(db)
    return await service.get_overview_environments(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/overview/providers",
    response_model=IaCProviderOverviewResponse,
    summary="Cloud Provider findings and resource coverage breakdown (Screen 1.3)",
)
async def get_overview_providers(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCProviderOverviewResponse:
    service = IaCService(db)
    return await service.get_overview_providers(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/overview/resources",
    response_model=IaCOverviewResourcesResponse,
    summary="IaC Resource Inventory with scanning status and findings count (Screen 1.4)",
)
async def get_overview_resources(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    search: Optional[str] = Query(None, description="Search resources"),
    provider: Optional[str] = Query(None, description="Provider filter"),
    environment: Optional[str] = Query(None, description="Environment filter"),
    resource_type: Optional[str] = Query(None, description="Resource type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCOverviewResourcesResponse:
    service = IaCService(db)
    return await service.get_overview_resources(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        provider=provider,
        environment=environment,
        resource_type=resource_type,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/overview/coverage",
    response_model=IaCCoverageResponse,
    summary="IaC Coverage across repositories, files, and file types (Screen 1.5)",
)
async def get_overview_coverage(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCCoverageResponse:
    service = IaCService(db)
    return await service.get_overview_coverage(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/overview/compliance",
    response_model=IaCOverviewComplianceResponse,
    summary="Compliance Overview posture across CIS, NIST, PCI DSS, ISO 27001 (Screen 1.6)",
)
async def get_overview_compliance(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCOverviewComplianceResponse:
    service = IaCService(db)
    return await service.get_overview_compliance(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/overview/risk",
    response_model=IaCRiskSummaryResponse,
    summary="Risk Summary score, risk level, category breakdown, and risk trend (Screen 1.7)",
)
async def get_overview_risk(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRiskSummaryResponse:
    service = IaCService(db)
    return await service.get_overview_risk(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/overview/activity",
    response_model=IaCRecentActivityResponse,
    summary="Recent Activity feed with filtering by activity type and user (Screen 1.8)",
)
async def get_overview_activity(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    user_filter: Optional[str] = Query(None, description="Filter by user"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRecentActivityResponse:
    service = IaCService(db)
    return await service.get_overview_activity(
        repository_id=repository_id,
        project_id=project_id,
        activity_type=activity_type,
        user_filter=user_filter,
    )


# =============================================================================
# SECTION 13: POLICIES & QUALITY GATES ENDPOINTS (13.1 - 13.8)
# =============================================================================

@router.get(
    "/policies-gates/overview",
    response_model=IaCPoliciesQualityGatesOverviewResponse,
    summary="Policies & Quality Gates Overview metrics, gauges, trend and top violations (Screen 13.1)",
)
async def get_policies_quality_gates_overview(
    repository_id: Optional[str] = Query(None, description="Optional GitHub repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPoliciesQualityGatesOverviewResponse:
    service = IaCService(db)
    return await service.get_policies_quality_gates_overview(
        repository_id=repository_id,
        project_id=project_id,
    )


@router.get(
    "/policies-gates/policies",
    response_model=IaCPoliciesCatalogResponse,
    summary="List policies catalog with search, filters and pagination (Screen 13.2)",
)
async def get_policies_catalog(
    repository_id: Optional[str] = Query(None, description="Optional repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    search: Optional[str] = Query(None, description="Search query across policies"),
    type: Optional[str] = Query(None, description="Filter by type (Resource, Security, etc.)"),
    status: Optional[str] = Query(None, description="Filter by status (Enforced, Draft, Disabled)"),
    framework: Optional[str] = Query(None, description="Filter by framework (CIS AWS, etc.)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPoliciesCatalogResponse:
    service = IaCService(db)
    return await service.get_policies_catalog(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        policy_type=type,
        status=status,
        framework=framework,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/policies-gates/policies/{policy_id}",
    response_model=IaCPolicyDetailResponse,
    summary="Get full policy detail, rules, exceptions, affected repos and audit logs (Screen 13.3)",
)
async def get_policy_detail(
    policy_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyDetailResponse:
    service = IaCService(db)
    return await service.get_policy_detail(policy_id=policy_id)


@router.post(
    "/policies-gates/policies",
    response_model=IaCPolicyDetailResponse,
    summary="Create a new policy in the catalog (Screen 13.2 modal)",
)
async def create_policy(
    payload: CreatePolicyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyDetailResponse:
    service = IaCService(db)
    return await service.create_policy(payload=payload)


@router.put(
    "/policies-gates/policies/{policy_id}",
    response_model=IaCPolicyDetailResponse,
    summary="Update existing policy metadata or logic",
)
async def update_policy(
    policy_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyDetailResponse:
    service = IaCService(db)
    return await service.update_policy(policy_id=policy_id, updates=payload)


@router.get(
    "/policies-gates/quality-gates",
    response_model=IaCQualityGatesListResponse,
    summary="List Quality Gates with fail condition, status, affected repos and pagination (Screen 13.4)",
)
async def get_quality_gates(
    repository_id: Optional[str] = Query(None, description="Optional repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    search: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    repository: Optional[str] = Query(None, description="Filter by affected repository"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCQualityGatesListResponse:
    service = IaCService(db)
    return await service.get_quality_gates(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        status=status,
        repository=repository,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/policies-gates/quality-gates/{gate_id}",
    response_model=IaCQualityGateDetailResponse,
    summary="Get full Quality Gate detail with rules, repositories, pipeline integrations (Screen 13.5)",
)
async def get_quality_gate_detail(
    gate_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCQualityGateDetailResponse:
    service = IaCService(db)
    return await service.get_quality_gate_detail(gate_id=gate_id)


@router.post(
    "/policies-gates/quality-gates",
    response_model=IaCQualityGateDetailResponse,
    summary="Create a new Quality Gate (Screen 13.4 modal)",
)
async def create_quality_gate(
    payload: CreateQualityGateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCQualityGateDetailResponse:
    service = IaCService(db)
    return await service.create_quality_gate(payload=payload)


@router.post(
    "/policies-gates/quality-gates/{gate_id}/rules",
    response_model=IaCQualityGateDetailResponse,
    summary="Add a rule to a Quality Gate (Screen 13.5 modal)",
)
async def add_quality_gate_rule(
    gate_id: str,
    payload: AddQualityGateRuleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCQualityGateDetailResponse:
    service = IaCService(db)
    return await service.add_quality_gate_rule(gate_id=gate_id, payload=payload)


@router.delete(
    "/policies-gates/quality-gates/{gate_id}/rules/{rule_id}",
    response_model=IaCQualityGateDetailResponse,
    summary="Remove a rule from a Quality Gate (Screen 13.5 trash action)",
)
async def remove_quality_gate_rule(
    gate_id: str,
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCQualityGateDetailResponse:
    service = IaCService(db)
    return await service.remove_quality_gate_rule(gate_id=gate_id, rule_id=rule_id)


@router.get(
    "/policies-gates/violations",
    response_model=IaCPolicyViolationsResponse,
    summary="List policy violations with severity, status, repo, date range and pagination (Screen 13.6)",
)
async def get_violations(
    repository_id: Optional[str] = Query(None, description="Optional repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    search: Optional[str] = Query(None, description="Search query"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    status: Optional[str] = Query(None, description="Filter by status"),
    repository: Optional[str] = Query(None, description="Filter by repository"),
    time_range: Optional[str] = Query(None, description="Time range filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyViolationsResponse:
    service = IaCService(db)
    return await service.get_violations(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        severity=severity,
        status=status,
        repository=repository,
        time_range=time_range,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/policies-gates/exceptions",
    response_model=IaCPolicyExceptionsResponse,
    summary="List policy exceptions with validity date, status and search (Screen 13.7)",
)
async def get_exceptions(
    repository_id: Optional[str] = Query(None, description="Optional repository ID"),
    project_id: Optional[str] = Query(None, description="Optional project ID"),
    search: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyExceptionsResponse:
    service = IaCService(db)
    return await service.get_exceptions(
        repository_id=repository_id,
        project_id=project_id,
        search=search,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/policies-gates/exceptions",
    response_model=IaCPolicyExceptionItem,
    summary="Create a new policy exception (Screen 13.7 modal)",
)
async def create_exception(
    payload: CreatePolicyExceptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPolicyExceptionItem:
    service = IaCService(db)
    return await service.create_exception(payload=payload)


@router.get(
    "/policies-gates/settings",
    response_model=IaCPoliciesSettings,
    summary="Get Policies & Quality Gates enforcement settings (Screen 13.8)",
)
async def get_policies_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPoliciesSettings:
    service = IaCService(db)
    return await service.get_policies_settings()


@router.put(
    "/policies-gates/settings",
    response_model=IaCPoliciesSettings,
    summary="Update Policies & Quality Gates enforcement settings (Screen 13.8)",
)
async def update_policies_settings(
    payload: IaCPoliciesSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCPoliciesSettings:
    service = IaCService(db)
    return await service.update_policies_settings(payload=payload)


# ============================================================================
# Section 6: Rules Endpoints (Screens 6.1 to 6.8)
# ============================================================================

@router.get(
    "/rules/overview",
    response_model=IaCRulesOverviewResponse,
    summary="Get IaC Rules Overview metrics and distributions (Screen 6.1)",
    description="Returns total rules (512), enabled (368), disabled (124), custom rules (20), severity distribution bar chart, and framework donut distribution.",
)
async def get_rules_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRulesOverviewResponse:
    service = IaCService(db)
    return await service.get_rules_overview()


@router.get(
    "/rules",
    response_model=IaCRulesListResponse,
    summary="List and filter IaC rules catalog (Screens 6.2, 6.3, 6.4, 6.5, 6.7)",
    description="Supports search, framework, provider, severity, status, category, rule type, and custom flag filtering with pagination.",
)
async def get_rules_catalog(
    search: Optional[str] = Query(None, description="Search by ID, name, or description"),
    framework: Optional[str] = Query(None, description="Filter by framework (CIS, NIST, AWS Best Practices, etc.)"),
    provider: Optional[str] = Query(None, description="Filter by cloud/IaC provider (AWS, Kubernetes, Helm, CloudFormation, Terraform)"),
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low"),
    status: Optional[str] = Query(None, description="Filter by status: Enabled, Disabled"),
    category: Optional[str] = Query(None, description="Filter by category"),
    rule_type: Optional[str] = Query(None, description="Filter by rule type"),
    is_custom: Optional[bool] = Query(None, description="Filter custom rules only"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRulesListResponse:
    service = IaCService(db)
    return await service.get_rules_catalog(
        search=search,
        framework=framework,
        provider=provider,
        severity=severity,
        status=status,
        category=category,
        rule_type=rule_type,
        is_custom=is_custom,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/rules",
    response_model=IaCRuleDetailResponse,
    summary="Create a new IaC security rule (Screens 6.2, 6.5)",
)
async def create_rule(
    payload: CreateRuleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRuleDetailResponse:
    service = IaCService(db)
    return await service.create_rule(payload=payload)


@router.get(
    "/rules/packs",
    response_model=IaCRulePacksListResponse,
    summary="List built-in and custom rule packs (Screen 6.6)",
)
async def get_rule_packs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRulePacksListResponse:
    service = IaCService(db)
    return await service.get_rule_packs()


@router.patch(
    "/rules/packs/{pack_name}/status",
    response_model=IaCRulePackItem,
    summary="Enable or disable a rule pack (Screen 6.6)",
)
async def toggle_rule_pack(
    pack_name: str,
    status: str = Query(..., description="Enabled or Disabled"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRulePackItem:
    service = IaCService(db)
    return await service.toggle_rule_pack(pack_name=pack_name, new_status=status)


@router.post(
    "/rules/validate-rego",
    response_model=ValidateRegoResponse,
    summary="Validate Rego policy logic syntax (Screen 6.8 Validate action)",
)
async def validate_rego(
    payload: ValidateRegoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ValidateRegoResponse:
    service = IaCService(db)
    return await service.validate_rego(rego_code=payload.rego_code)


@router.get(
    "/rules/{rule_id}",
    response_model=IaCRuleDetailResponse,
    summary="Get Rule Configuration detail (Screen 6.8)",
)
async def get_rule_detail(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRuleDetailResponse:
    service = IaCService(db)
    return await service.get_rule_detail(rule_id=rule_id)


@router.put(
    "/rules/{rule_id}",
    response_model=IaCRuleDetailResponse,
    summary="Update Rule Configuration (Screen 6.8 Save Changes action)",
)
async def update_rule(
    rule_id: str,
    payload: UpdateRuleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRuleDetailResponse:
    service = IaCService(db)
    return await service.update_rule(rule_id=rule_id, payload=payload)


@router.patch(
    "/rules/{rule_id}/status",
    response_model=IaCRuleItem,
    summary="Toggle rule status between Enabled and Disabled (Screen 6.2, 6.3, 6.4, 6.8)",
)
async def update_rule_status(
    rule_id: str,
    status: str = Query(..., description="Enabled or Disabled"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCRuleItem:
    service = IaCService(db)
    return await service.update_rule_status(rule_id=rule_id, new_status=status)


@router.delete(
    "/rules/{rule_id}",
    summary="Delete a rule from the repository (Screen 6.2, 6.5)",
)
async def delete_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.delete_rule(rule_id=rule_id)


# =========================================================================
# SECTION 8: SCANS SUITE ROUTERS (SCREENS 8.1 THROUGH 8.8)
# =========================================================================

# 8.1 Scans Overview
@router.get(
    "/scans-suite/overview",
    response_model=IaCScansOverviewResponse,
    summary="Get Scans Suite Overview metrics and trend (Screen 8.1)",
)
async def get_scans_suite_overview(
    time_range: str = Query("Last 30 days", description="Time window for trends"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScansOverviewResponse:
    service = IaCService(db)
    return await service.get_scans_suite_overview(time_range=time_range)


# 8.2 Scan History
@router.get(
    "/scans-suite/history",
    response_model=IaCScanHistoryResponse,
    summary="Get filtered and paginated scan history (Screen 8.2)",
)
async def get_scans_suite_history(
    repository: Optional[str] = Query(None, description="Repository filter"),
    environment: Optional[str] = Query(None, description="Environment filter"),
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanHistoryResponse:
    service = IaCService(db)
    return await service.get_scans_suite_history(
        repository=repository,
        environment=environment,
        search=search,
        page=page,
        page_size=page_size,
    )


# 8.3 Scheduled Scans
@router.get(
    "/scans-suite/schedules",
    response_model=IaCScheduledScansResponse,
    summary="Get scheduled recurring scans (Screen 8.3)",
)
async def get_scans_suite_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScheduledScansResponse:
    service = IaCService(db)
    return await service.get_scans_suite_schedules()


@router.post(
    "/scans-suite/schedules",
    response_model=IaCScheduledScanItem,
    summary="Create new recurring scheduled scan (Screen 8.3 + New Schedule)",
)
async def create_scans_suite_schedule(
    payload: CreateScheduledScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScheduledScanItem:
    service = IaCService(db)
    return await service.create_scans_suite_schedule(payload=payload)


@router.patch(
    "/scans-suite/schedules/{schedule_id}/status",
    response_model=IaCScheduledScanItem,
    summary="Toggle scheduled scan status (Screen 8.3)",
)
async def toggle_scans_suite_schedule(
    schedule_id: str,
    status: str = Query(..., description="Active or Inactive"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScheduledScanItem:
    service = IaCService(db)
    return await service.toggle_scans_suite_schedule(schedule_id=schedule_id, new_status=status)


@router.delete(
    "/scans-suite/schedules/{schedule_id}",
    summary="Delete scheduled scan (Screen 8.3)",
)
async def delete_scans_suite_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.delete_scans_suite_schedule(schedule_id=schedule_id)


# 8.4 On-Demand Scan
@router.post(
    "/scans-suite/on-demand",
    response_model=TriggerOnDemandScanResponse,
    summary="Run new on-demand scan (Screen 8.4 Run Scan action)",
)
async def trigger_scans_suite_on_demand(
    payload: TriggerOnDemandScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TriggerOnDemandScanResponse:
    service = IaCService(db)
    return await service.trigger_scans_suite_on_demand(payload=payload)


# 8.5 Scan Configurations
@router.get(
    "/scans-suite/configurations",
    response_model=IaCScanConfigurationsDTO,
    summary="Get scan options and scanner configurations (Screen 8.5)",
)
async def get_scans_suite_configurations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanConfigurationsDTO:
    service = IaCService(db)
    return await service.get_scans_suite_configurations()


@router.put(
    "/scans-suite/configurations",
    response_model=IaCScanConfigurationsDTO,
    summary="Save scan configuration (Screen 8.5 Save Configuration action)",
)
async def update_scans_suite_configurations(
    payload: IaCScanConfigurationsDTO,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanConfigurationsDTO:
    service = IaCService(db)
    return await service.update_scans_suite_configurations(payload=payload)


# 8.6 Results Comparison
@router.get(
    "/scans-suite/comparison",
    response_model=IaCResultsComparisonResponse,
    summary="Compare scan results between two scans (Screen 8.6)",
)
async def get_scans_suite_comparison(
    scan_1_id: Optional[str] = Query("SCN-2026-09-30-001", description="First scan ID"),
    scan_2_id: Optional[str] = Query("SCN-2026-09-23-004", description="Second scan ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCResultsComparisonResponse:
    service = IaCService(db)
    return await service.get_scans_suite_comparison(scan_1_id=scan_1_id, scan_2_id=scan_2_id)


# 8.7 Scan Queue
@router.get(
    "/scans-suite/queue",
    response_model=IaCScanQueueResponse,
    summary="Get currently running and queued scans (Screen 8.7)",
)
async def get_scans_suite_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanQueueResponse:
    service = IaCService(db)
    return await service.get_scans_suite_queue()


@router.post(
    "/scans-suite/queue/cancel-all",
    summary="Cancel all running and queued scans (Screen 8.7 Cancel All action)",
)
async def cancel_scans_suite_queue_all(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.cancel_scans_suite_queue_all()


@router.post(
    "/scans-suite/queue/{scan_id}/cancel",
    summary="Cancel a specific running or queued scan (Screen 8.7 cancel row action)",
)
async def cancel_scans_suite_queue_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.cancel_scans_suite_queue_scan(scan_id=scan_id)


# 8.8 Scan Settings
@router.get(
    "/scans-suite/settings",
    response_model=IaCScanGlobalSettings,
    summary="Get global scan settings (Screen 8.8)",
)
async def get_scans_suite_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanGlobalSettings:
    service = IaCService(db)
    return await service.get_scans_suite_settings()


@router.put(
    "/scans-suite/settings",
    response_model=IaCScanGlobalSettings,
    summary="Save global scan settings (Screen 8.8 Save Settings action)",
)
async def update_scans_suite_settings(
    payload: IaCScanGlobalSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCScanGlobalSettings:
    service = IaCService(db)
    return await service.update_scans_suite_settings(payload=payload)


# =========================================================================
# SECTION 11: COMPLIANCE & BENCHMARKS SUITE (SCREENS 11.1 THROUGH 11.8)
# =========================================================================

# 11.1 Compliance Overview
@router.get(
    "/compliance-suite/overview",
    response_model=IaCComplianceOverviewResponse,
    summary="Get compliance overview KPIs, status donut, framework coverage and trends (Screen 11.1)",
)
async def get_compliance_suite_overview(
    repository: Optional[str] = Query(None, description="Filter by repository"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceOverviewResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_overview(repository=repository)


# 11.2 Frameworks
@router.get(
    "/compliance-suite/frameworks",
    response_model=IaCComplianceFrameworksResponse,
    summary="List all compliance frameworks with search filter (Screen 11.2)",
)
async def get_compliance_suite_frameworks(
    search: Optional[str] = Query(None, description="Search framework name or description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceFrameworksResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_frameworks(search=search)


@router.post(
    "/compliance-suite/frameworks",
    response_model=IaCComplianceFrameworkItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new compliance framework (Screen 11.2 + Add Framework modal)",
)
async def create_compliance_suite_framework(
    payload: CreateFrameworkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceFrameworkItem:
    service = IaCService(db)
    return await service.create_compliance_suite_framework(payload=payload)


# 11.3 Controls Mapping
@router.get(
    "/compliance-suite/controls",
    response_model=IaCComplianceControlsResponse,
    summary="Get controls mapping table with framework, status, severity filters and pagination (Screen 11.3)",
)
async def get_compliance_suite_controls(
    framework: Optional[str] = Query(None, description="Filter by framework (e.g. CIS AWS, CIS K8s)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Compliant, Non-Compliant)"),
    severity: Optional[str] = Query(None, description="Filter by severity (Critical, High, Medium, Low)"),
    search: Optional[str] = Query(None, description="Search control ID or description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceControlsResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_controls(
        framework=framework,
        status=status_filter,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )


# 11.4 Control Detail
@router.get(
    "/compliance-suite/controls/{control_id}",
    response_model=IaCControlDetailResponse,
    summary="Get single control details, findings breakdown, remediation and evidence (Screen 11.4)",
)
async def get_compliance_suite_control_detail(
    control_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCControlDetailResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_control_detail(control_id=control_id)


# 11.5 Compliance Report
@router.post(
    "/compliance-suite/reports/generate",
    response_model=ComplianceReportGeneratedResponse,
    summary="Generate compliance report with custom frameworks, formats, and sections (Screen 11.5)",
)
async def generate_compliance_suite_report(
    payload: GenerateComplianceReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ComplianceReportGeneratedResponse:
    service = IaCService(db)
    return await service.generate_compliance_suite_report(payload=payload)


@router.get(
    "/compliance-suite/reports",
    response_model=ComplianceReportHistoryResponse,
    summary="List generated compliance reports history (Screen 11.5 Report History sub-tab)",
)
async def get_compliance_suite_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ComplianceReportHistoryResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_reports()


# 11.6 Evidence
@router.get(
    "/compliance-suite/evidence",
    response_model=IaCComplianceEvidenceResponse,
    summary="Get compliance evidence records with filters and pagination (Screen 11.6)",
)
async def get_compliance_suite_evidence(
    framework: Optional[str] = Query(None, description="Filter by framework"),
    control_id: Optional[str] = Query(None, description="Filter by control ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by evidence status (Valid, Pending, Expired)"),
    search: Optional[str] = Query(None, description="Search evidence description or ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceEvidenceResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_evidence(
        framework=framework,
        control_id=control_id,
        status=status_filter,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/compliance-suite/evidence",
    response_model=IaCComplianceEvidenceItem,
    status_code=status.HTTP_201_CREATED,
    summary="Upload or record compliance evidence (Screen 11.6 + Add Evidence modal)",
)
async def create_compliance_suite_evidence(
    payload: CreateEvidenceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceEvidenceItem:
    service = IaCService(db)
    return await service.create_compliance_suite_evidence(payload=payload)


@router.delete(
    "/compliance-suite/evidence/{evidence_id}",
    summary="Delete compliance evidence record (Screen 11.6 delete row action)",
)
async def delete_compliance_suite_evidence(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.delete_compliance_suite_evidence(evidence_id=evidence_id)


# 11.7 Exceptions
@router.get(
    "/compliance-suite/exceptions",
    response_model=IaCComplianceExceptionsResponse,
    summary="Get compliance exceptions list with filters (Screen 11.7)",
)
async def get_compliance_suite_exceptions(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Approved, Pending, Rejected)"),
    search: Optional[str] = Query(None, description="Search exception ID, control ID or reason"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceExceptionsResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_exceptions(status=status_filter, search=search)


@router.post(
    "/compliance-suite/exceptions",
    response_model=IaCComplianceExceptionItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new compliance exception (Screen 11.7 + Add Exception modal)",
)
async def create_compliance_suite_exception(
    payload: CreateComplianceExceptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceExceptionItem:
    service = IaCService(db)
    return await service.create_compliance_suite_exception(payload=payload)


@router.patch(
    "/compliance-suite/exceptions/{exception_id}/status",
    response_model=IaCComplianceExceptionItem,
    summary="Update exception status (Screen 11.7 approve/reject actions)",
)
async def update_compliance_suite_exception_status(
    exception_id: str,
    status_value: str = Query(..., alias="status", description="Approved, Pending, or Rejected"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceExceptionItem:
    service = IaCService(db)
    return await service.update_compliance_suite_exception_status(exception_id=exception_id, new_status=status_value)


@router.delete(
    "/compliance-suite/exceptions/{exception_id}",
    summary="Delete compliance exception (Screen 11.7 delete row action)",
)
async def delete_compliance_suite_exception(
    exception_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCService(db)
    return await service.delete_compliance_suite_exception(exception_id=exception_id)


# 11.8 Audit Logs
@router.get(
    "/compliance-suite/audit-logs",
    response_model=IaCComplianceAuditLogsResponse,
    summary="Get compliance audit logs with event, user, date filters and pagination (Screen 11.8)",
)
async def get_compliance_suite_audit_logs(
    event: Optional[str] = Query(None, description="Filter by event type"),
    user_name: Optional[str] = Query(None, alias="user", description="Filter by user"),
    date_range: Optional[str] = Query(None, description="Date range"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceAuditLogsResponse:
    service = IaCService(db)
    return await service.get_compliance_suite_audit_logs(
        event=event,
        user=user_name,
        date_range=date_range,
        page=page,
        page_size=page_size,
    )


# Compliance Settings
@router.get(
    "/compliance-suite/settings",
    response_model=IaCComplianceSettings,
    summary="Get compliance global settings",
)
async def get_compliance_suite_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceSettings:
    service = IaCService(db)
    return await service.get_compliance_suite_settings()


@router.put(
    "/compliance-suite/settings",
    response_model=IaCComplianceSettings,
    summary="Update compliance global settings",
)
async def update_compliance_suite_settings(
    payload: IaCComplianceSettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IaCComplianceSettings:
    service = IaCService(db)
    return await service.update_compliance_suite_settings(payload=payload)


# =============================================================================
# EXTENDED SUITE: REPOSITORIES, INVENTORY, PLANS, AI ASSISTANT & REPORTS
# =============================================================================

from pydantic import BaseModel, Field
from app.services.iac_plans_and_assistant_service import IaCPlansAndAssistantService


class AnalyzePlanRequest(BaseModel):
    plan_name: str = Field(..., description="Display title for plan evaluation")
    repository_name: str = Field("terraform-aws-production", description="Repository name")
    environment: str = Field("production", description="Target environment")
    plan_json_content: str = Field("{}", description="Raw Terraform plan JSON")
    pr_number: Optional[int] = Field(None, description="Associated Pull Request number")
    author: str = Field("DevOps Engineer", description="Author or PR submitter")


class OnboardRepoRequest(BaseModel):
    repository_id: str = Field(..., description="Repository ID or full name")
    auto_scan: bool = Field(True, description="Whether to trigger initial IaC verification scan")


class IaCAIChatRequest(BaseModel):
    prompt: str = Field(..., description="User query regarding IaC security, findings, or configs")
    repository_name: Optional[str] = Field(None, description="Active repository context")
    finding_id: Optional[str] = Field(None, description="Optional active finding ID for contextual drill-down")


@router.get(
    "/repositories-coverage",
    summary="Get connected repositories with detected IaC tech, file counts, and coverage (Screen 02)",
)
async def get_iac_repositories_coverage(
    search: Optional[str] = Query(None),
    framework: Optional[str] = Query(None),
    health: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.get_repositories_coverage(
        search=search,
        framework=framework,
        health_filter=health,
    )


@router.post(
    "/repositories/onboard",
    summary="Onboard repository into IaC security, discover tech, and apply default policies",
)
async def onboard_iac_repository(
    payload: OnboardRepoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.onboard_repository(
        repository_id=payload.repository_id,
        auto_scan=payload.auto_scan,
    )


@router.get(
    "/inventory-suite",
    summary="Comprehensive IaC Inventory across Terraform, Kubernetes, Helm, CloudFormation (Screen 03)",
)
async def get_iac_inventory_suite(
    repository: Optional[str] = Query(None),
    technology: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.get_iac_inventory(
        repository=repository,
        technology=technology,
        provider=provider,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/plans",
    summary="List Terraform plan and pre-deployment infrastructure change evaluations (Screen 09)",
)
async def list_iac_plans(
    repository_id: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.list_plan_analyses(
        repository_id=repository_id,
        environment=environment,
        status_filter=status,
    )


@router.post(
    "/plans/analyze",
    summary="Analyze Terraform plan JSON against security policy gates before deployment (Screen 09)",
)
async def analyze_iac_plan(
    payload: AnalyzePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.analyze_terraform_plan(
        plan_name=payload.plan_name,
        repository_name=payload.repository_name,
        environment=payload.environment,
        plan_json_content=payload.plan_json_content,
        pr_number=payload.pr_number,
        author=payload.author,
    )


@router.post(
    "/ai/chat",
    summary="Interactive repository-aware IaC AI security assistant (Screen 07)",
)
async def chat_iac_ai(
    payload: IaCAIChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.chat_with_assistant(
        prompt=payload.prompt,
        repository_name=payload.repository_name,
        finding_id=payload.finding_id,
        current_user=current_user,
    )


@router.get(
    "/reports-overview",
    summary="Get consolidated posture, scan, compliance, and remediation report summaries (Screen 14)",
)
async def get_iac_reports_overview(
    repository_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = IaCPlansAndAssistantService(db)
    return await service.get_evidence_and_reports_summary(
        repository_id=repository_id,
        project_id=project_id,
    )





