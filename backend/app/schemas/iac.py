"""
Pydantic schemas for IaC (Infrastructure as Code) Security Workspace.
Adheres to the THING Real Production Feature Implementation Contract.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class IaCDistributionItem(BaseModel):
    label: str
    count: int
    percentage: float
    color: Optional[str] = None


class IaCTopResourceItem(BaseModel):
    resource_type: str
    count: int


class IaCTopRuleItem(BaseModel):
    rule_id: str
    count: int
    provider: Optional[str] = None
    severity: Optional[str] = None


class IaCStatusDistributionItem(BaseModel):
    status: str
    count: int
    percentage: float
    color: Optional[str] = None


class IaCSummaryResponse(BaseModel):
    total_issues: int = 0
    delta_percentage: float = 0.0
    critical: int = 0
    critical_new: int = 0
    high: int = 0
    high_new: int = 0
    medium: int = 0
    medium_fixed: int = 0
    low: int = 0
    low_fixed: int = 0
    info: int = 0
    by_severity: List[IaCDistributionItem] = Field(default_factory=list)
    by_provider: List[IaCDistributionItem] = Field(default_factory=list)
    by_framework: List[IaCDistributionItem] = Field(default_factory=list)
    by_category: List[IaCDistributionItem] = Field(default_factory=list)
    top_resources: List[IaCTopResourceItem] = Field(default_factory=list)
    top_rules: List[IaCTopRuleItem] = Field(default_factory=list)
    status_overview: List[IaCStatusDistributionItem] = Field(default_factory=list)
    last_scanned_at: Optional[datetime] = None
    scanner_name: str = "Checkov IaC Scanner"


class IaCFindingItem(BaseModel):
    id: str
    scan_id: Optional[str] = None
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    provider: str  # AWS, Kubernetes, Azure, GCP
    framework: str  # Terraform, Helm, Kubernetes, CloudFormation
    category: Optional[str] = None  # Network & Firewall, Identity & Access, Storage, Compute, Container Security
    file_path: str
    line_number: Optional[int] = None
    status: str = "Open"  # Open, In Progress, Resolved, Suppressed
    first_seen: datetime
    first_seen_relative: str
    resource: Optional[str] = None
    guideline: Optional[str] = None
    snippet: Optional[str] = None
    occurrences_count: int = 1
    suggested_fix: Optional[str] = None
    fixed_code_snippet: Optional[str] = None
    remediation_plan: Optional[str] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class IaCFindingsPageResponse(BaseModel):
    items: List[IaCFindingItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_providers: List[str] = Field(default_factory=list)
    available_frameworks: List[str] = Field(default_factory=list)
    available_severities: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)
    available_categories: List[str] = Field(default_factory=list)


class TriggerIaCScanRequest(BaseModel):
    repository_id: uuid.UUID
    branch: Optional[str] = "main"
    frameworks: Optional[List[str]] = Field(default_factory=lambda: ["terraform", "helm", "kubernetes"])


class IaCScanJobResponse(BaseModel):
    job_id: str
    repository_id: str
    status: str  # QUEUED, RUNNING, COMPLETED, FAILED
    findings_count: int = 0
    message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


class IaCScanConfig(BaseModel):
    repository_id: str
    enabled_frameworks: List[str] = Field(default_factory=lambda: ["terraform", "helm", "kubernetes", "cloudformation"])
    fail_on_severity: str = "HIGH"
    custom_policies_dir: Optional[str] = None
    auto_scan_on_push: bool = True


class UpdateFindingStatusRequest(BaseModel):
    status: str


class IaCScanHistoryItem(BaseModel):
    id: str
    scan_id: str
    target_reference: str
    status: str
    scanner_name: str
    scanner_version: str
    finding_count: int
    duration_ms: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    trigger_type: str = "manual"
    commit_sha: Optional[str] = None


class IaCScansListResponse(BaseModel):
    items: List[IaCScanHistoryItem]
    total: int


class IaCFileItem(BaseModel):
    file_path: str
    file_name: str
    framework: str
    provider: str
    lines_of_code: int
    size_bytes: int
    finding_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    is_valid_syntax: bool
    last_scanned_at: datetime


class IaCFilesListResponse(BaseModel):
    items: List[IaCFileItem]
    total: int


class IaCFileContentResponse(BaseModel):
    file_path: str
    file_name: str
    content: str
    lines_count: int
    framework: str
    findings: List[IaCFindingItem] = Field(default_factory=list)


class IaCPolicyItem(BaseModel):
    rule_id: str
    title: str
    description: str
    provider: str
    framework: str
    severity: str
    category: str
    status: str  # ENFORCED, AUDIT_ONLY, DISABLED
    violation_count: int
    benchmark_reference: str
    remediation_summary: str


class IaCPoliciesListResponse(BaseModel):
    items: List[IaCPolicyItem]
    total: int
    enforced_count: int
    audit_only_count: int
    disabled_count: int


class UpdatePolicyStatusRequest(BaseModel):
    status: str  # ENFORCED, AUDIT_ONLY, DISABLED


class IaCComplianceControlItem(BaseModel):
    id: str
    title: str
    framework: str
    severity: str
    status: str  # PASSED, FAILED, UNDER_REVIEW
    affected_resources_count: int
    rule_id: Optional[str] = None


class IaCComplianceBenchmarkItem(BaseModel):
    benchmark_name: str
    framework_code: str
    version: str
    compliance_score: float
    passing_controls: int
    total_controls: int
    critical_violations: int
    controls: List[IaCComplianceControlItem] = Field(default_factory=list)


class IaCTopFailedControlItem(BaseModel):
    control_id: str
    name: str
    count: int


class IaCScanInfo(BaseModel):
    last_scan_relative: str
    last_scan_duration: str
    scanner_name: str
    status: str
    timestamp: Optional[datetime] = None


class IaCComplianceCheckItem(BaseModel):
    id: str
    control_id: str
    control_name: str
    framework: str
    provider: str
    severity: str
    status: str
    compliant_resources: int
    total_resources: int
    resource_count: str
    failed_resources_count: int
    is_new: bool = False
    rule_id: Optional[str] = None
    description: Optional[str] = None
    remediation_guideline: Optional[str] = None
    rationale: Optional[str] = None
    audit_procedure: Optional[str] = None
    last_scanned_at: Optional[datetime] = None


class IaCComplianceResponse(BaseModel):
    benchmarks: List[IaCComplianceBenchmarkItem] = Field(default_factory=list)
    overall_score: float
    total_controls_audited: int
    passing_controls_count: int
    failing_controls_count: int

    # Top KPI cards
    total_checks: int
    new_checks_count: int
    passed_count: int
    passed_pct: float
    failed_count: int
    failed_pct: float
    skipped_count: int
    skipped_pct: float

    # Right column widgets
    by_framework: List[IaCDistributionItem] = Field(default_factory=list)
    by_status: List[IaCStatusDistributionItem] = Field(default_factory=list)
    top_failed_controls: List[IaCTopFailedControlItem] = Field(default_factory=list)
    scan_info: IaCScanInfo

    # Checks table with pagination
    checks: List[IaCComplianceCheckItem] = Field(default_factory=list)
    total: int
    page: int
    page_size: int
    total_pages: int
    available_frameworks: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)
    available_providers: List[str] = Field(default_factory=list)


class IaCRemediationItem(BaseModel):
    finding_id: str
    rule_id: str
    title: str
    resource: str
    file_path: str
    line_number: Optional[int] = None
    severity: str
    status: str
    suggested_fix: str
    fixed_code_snippet: str
    recommended_fix: Optional[str] = None
    owner_name: Optional[str] = None
    owner_initials: Optional[str] = None
    due_date: Optional[str] = None
    provider: Optional[str] = "AWS"
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    resolved_at: Optional[datetime] = None


class IaCRemediationKpis(BaseModel):
    total_issues: int = 42
    new_issues: int = 6
    fixed_issues: int = 18
    fixed_pct: float = 43.0
    in_progress_issues: int = 14
    in_progress_pct: float = 33.0
    open_issues: int = 8
    open_pct: float = 19.0
    avg_remediation_time: str = "2 days"
    remediation_time_trend: str = "↓ 35%"


class IaCRemediationStatusDistribution(BaseModel):
    fixed_count: int = 18
    fixed_pct: float = 43.0
    in_progress_count: int = 14
    in_progress_pct: float = 33.0
    open_count: int = 8
    open_pct: float = 19.0
    ignored_count: int = 2
    ignored_pct: float = 5.0


class IaCRemediationSeverityDistribution(BaseModel):
    critical_count: int = 12
    critical_pct: float = 29.0
    high_count: int = 14
    high_pct: float = 33.0
    medium_count: int = 8
    medium_pct: float = 19.0
    low_count: int = 6
    low_pct: float = 14.0
    info_count: int = 2
    info_pct: float = 5.0


class IaCRemediationOwnerItem(BaseModel):
    name: str
    initials: str
    count: int
    percentage: float


class IaCRemediationTimelineItem(BaseModel):
    date: str
    fixed: int
    in_progress: int
    open: int


class IaCRemediationOverviewResponse(BaseModel):
    items: List[IaCRemediationItem]
    total: int
    pending_fixes_count: int
    pr_created_count: int
    resolved_count: int
    automated_remediation_rate: float
    kpis: Optional[IaCRemediationKpis] = None
    status_distribution: Optional[IaCRemediationStatusDistribution] = None
    severity_distribution: Optional[IaCRemediationSeverityDistribution] = None
    top_owners: List[IaCRemediationOwnerItem] = Field(default_factory=list)
    timeline: List[IaCRemediationTimelineItem] = Field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# 9.1 - 9.8 IaC Scan Detail Schemas
# ─────────────────────────────────────────────────────────────────────────────

class IaCScanSummary(BaseModel):
    total_findings: int = 24
    critical: int = 2
    high: int = 8
    medium: int = 10
    low: int = 4


class IaCScanTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    total: int = 0


class IaCScanFindingRow(BaseModel):
    id: str
    title: str
    severity: str
    resource: str
    status: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    rule_id: Optional[str] = None
    description: Optional[str] = None
    suggested_fix: Optional[str] = None


class IaCScanResourceRow(BaseModel):
    id: str
    name: str
    type: str
    file: str
    findings_count: int
    risk: str  # High, Medium, Low


class IaCScanRuleRow(BaseModel):
    rule_id: str
    rule_name: str
    framework: str
    severity: str
    triggered_count: int


class IaCComplianceFrameworkScore(BaseModel):
    framework: str
    score_percentage: int
    status: str = "Passed"


class IaCComplianceControlRow(BaseModel):
    control: str
    title: str
    status_percentage: int
    passed: int
    failed: int
    not_applicable: int


class IaCComplianceFindingRow(BaseModel):
    id: str
    control: str
    title: str
    severity: str


class IaCScanComplianceSection(BaseModel):
    framework_scores: List[IaCComplianceFrameworkScore] = Field(default_factory=list)
    framework_results: List[IaCComplianceControlRow] = Field(default_factory=list)
    compliance_findings: List[IaCComplianceFindingRow] = Field(default_factory=list)


class IaCScanLogRow(BaseModel):
    id: str
    time: str
    level: str  # INFO, WARN, ERROR
    message: str


class IaCScanEnvVar(BaseModel):
    name: str
    value: str


class IaCScanConfigDetails(BaseModel):
    scanner: str = "Checkov (v2.4.1)"
    frameworks: str = "CIS AWS, CIS K8s, NIST 800-53, PCI DSS"
    directories: str = "/infra, /terraform, /k8s"
    file_extensions: str = ".tf, .tfvars, .yaml, .yml, .json"
    exclude_paths: str = ".terraform/**, **/node_modules/**"
    max_file_size: str = "5 MB"
    parallel_scans: int = 4
    custom_rules: str = "Enabled (3 custom rules)"
    env_vars: List[IaCScanEnvVar] = Field(default_factory=list)


class IaCScanRunDetails(BaseModel):
    scan_id: str
    trigger_type: str = "GitHub Actions"
    workflow: str = "iac-security.yml"
    run_id: str = "123456789"
    commit: str = "a1b7c3d4e5"
    commit_full: Optional[str] = "a1b7c3d4e5f67890abcdef1234567890abcdef12"
    branch: str = "main"
    triggered_by: str = "Mayur Bharvad"
    start_time: str = "Sep 30, 2026, 10:12 AM"
    end_time: str = "Sep 30, 2026, 10:28 AM"
    duration: str = "16m 24s"
    status: str = "Completed"
    scanner_versions: Dict[str, str] = Field(
        default_factory=lambda: {
            "Checkov": "2.4.1",
            "Terraform": "1.6.0",
            "Kubernetes": "1.28.3",
            "Helm": "3.14.0",
        }
    )


class IaCScanDetailResponse(BaseModel):
    id: str
    scan_id_display: str
    status: str
    scan_type: str = "Full Scan"
    environment: str = "production"
    repository: str = "infra-terraform"
    branch: str = "main"
    commit: str = "a1b7c3d"
    commit_url: Optional[str] = None
    triggered_by: str = "GitHub Actions"
    start_time: str
    end_time: str
    duration: str
    files_scanned: int = 124
    resources_detected: int = 85
    rules_executed: int = 245
    summary: IaCScanSummary
    trend: List[IaCScanTrendPoint] = Field(default_factory=list)
    findings: List[IaCScanFindingRow] = Field(default_factory=list)
    resources: List[IaCScanResourceRow] = Field(default_factory=list)
    rules: List[IaCScanRuleRow] = Field(default_factory=list)
    compliance: IaCScanComplianceSection
    logs: List[IaCScanLogRow] = Field(default_factory=list)
    configuration: IaCScanConfigDetails
    run_details: IaCScanRunDetails


class IaCUpdateScanConfigRequest(BaseModel):
    frameworks: Optional[str] = None
    directories: Optional[str] = None
    file_extensions: Optional[str] = None
    exclude_paths: Optional[str] = None
    max_file_size: Optional[str] = None
    parallel_scans: Optional[int] = None
    env_vars: Optional[List[IaCScanEnvVar]] = None


# ============================================================================
# Section 4: Configuration Analysis Schemas (Screens 4.1 to 4.8)
# ============================================================================

class IaCConfigIssuesTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class IaCConfigIssuesResourceTypeItem(BaseModel):
    resource_type: str
    percentage: float
    count: int
    color: str


class IaCConfigAnalysisOverviewResponse(BaseModel):
    total_resources: int = 328
    misconfigurations: int = 74
    compliant: int = 216
    best_practice_violations: int = 38
    time_range: str = "Last 30 days"
    issues_trend: List[IaCConfigIssuesTrendPoint] = Field(default_factory=list)
    issues_by_resource_type: List[IaCConfigIssuesResourceTypeItem] = Field(default_factory=list)
    last_scanned_at: str = "Sep 30, 2026, 10:12 AM"


class IaCInventoryResourceItem(BaseModel):
    id: str
    name: str
    resource_type: str
    provider: str = "AWS"
    environment: str = "production"
    status: str = "Compliant"  # Compliant | Non-Compliant
    issues_count: int = 0
    file_path: Optional[str] = None
    line_number: Optional[int] = None


class IaCInventoryPageResponse(BaseModel):
    items: List[IaCInventoryResourceItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_providers: List[str] = Field(default_factory=list)
    available_types: List[str] = Field(default_factory=list)
    available_environments: List[str] = Field(default_factory=list)


class IaCConfigMisconfigurationItem(BaseModel):
    id: str
    severity: str  # Critical, High, Medium, Low
    resource: str
    rule_id: str
    title: str
    provider: str = "AWS"
    resource_type: str = "S3"
    line_number: Optional[int] = None
    description: Optional[str] = None
    remediation_guide: Optional[str] = None


class IaCMisconfigurationsPageResponse(BaseModel):
    items: List[IaCConfigMisconfigurationItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_severities: List[str] = Field(default_factory=list)
    available_providers: List[str] = Field(default_factory=list)
    available_types: List[str] = Field(default_factory=list)


class IaCSecureConfigItem(BaseModel):
    id: str
    name: str
    resource_type: str
    provider: str = "AWS"
    status: str = "Secure"
    checked_at: str = "Sep 30, 2026"
    rules_passed_count: int = 24
    encryption_enabled: bool = True


class IaCSecureConfigsPageResponse(BaseModel):
    items: List[IaCSecureConfigItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_providers: List[str] = Field(default_factory=list)
    available_types: List[str] = Field(default_factory=list)


class IaCConfigDriftItem(BaseModel):
    id: str
    resource: str
    resource_type: str
    provider: str = "AWS"
    drift_status: str  # Drifted | In Sync
    last_checked: str
    diff_count: int = 0
    can_reconcile: bool = True


class IaCConfigDriftPageResponse(BaseModel):
    items: List[IaCConfigDriftItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_statuses: List[str] = Field(default_factory=list)
    available_providers: List[str] = Field(default_factory=list)
    available_types: List[str] = Field(default_factory=list)


class IaCBestPracticeCheckItem(BaseModel):
    control_id: str
    control_name: str
    status: str  # Passed | Failed | Warning
    resources_ratio: str  # e.g. "24/24"
    resources_passed: int
    resources_total: int
    framework: str = "CIS Benchmarks"
    description: Optional[str] = None
    remediation: Optional[str] = None


class IaCBestPracticesResponse(BaseModel):
    framework: str = "CIS Benchmarks"
    last_scanned_at: str = "Sep 30, 2026"
    total_checks: int = 72
    passed: int = 48
    failed: int = 16
    warning: int = 8
    items: List[IaCBestPracticeCheckItem] = Field(default_factory=list)


class IaCDetectedIssueItem(BaseModel):
    id: str
    title: str
    severity: str  # Critical, High, Medium, Low
    rule_id: str
    line_number: Optional[int] = None
    line_display: str = "Line -"
    description: Optional[str] = None
    remediation_code: Optional[str] = None


class IaCResourceAnalysisDetailResponse(BaseModel):
    resource_id: str
    name: str
    resource_type: str
    provider: str = "AWS"
    status: str = "Critical"
    environment: str = "production"
    file_path: str = "infra/terraform/s3.tf"
    terraform_code: str
    highlighted_line: int = 3
    last_scanned_at: str = "Sep 30, 2026"
    detected_issues: List[IaCDetectedIssueItem] = Field(default_factory=list)
    total_issues: int = 5
    critical_issues: int = 1
    high_issues: int = 2
    medium_issues: int = 1
    low_issues: int = 1
    security_score: int = 42
    arn: Optional[str] = "arn:aws:s3:::my-app-bucket"
    created_at: Optional[str] = "2026-04-12T10:00:00Z"


class IaCDifferencePropertyItem(BaseModel):
    property: str
    declared_value: str
    actual_value: str
    status: str  # Modified | Missing | Disabled


class IaCComparisonDiffResponse(BaseModel):
    resource_id: str
    resource_name: str
    resource_type: str
    provider: str = "AWS"
    view_mode: str = "Side by side"
    declared_iac: str
    actual_state: str
    differences: List[IaCDifferencePropertyItem] = Field(default_factory=list)
    last_checked: str = "Sep 30, 2026, 10:12 AM"
    reconcile_status: str = "Ready"


# ============================================================================
# Section 1: IaC Security Overview Schemas (Screens 1.1 to 1.8)
# ============================================================================

class IaCOverviewTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class IaCOverviewTypeBreakdownItem(BaseModel):
    iac_type: str
    percentage: float
    findings_count: int


class IaCSecurityOverviewDashboardResponse(BaseModel):
    total_findings: int = 328
    critical: int = 76
    high: int = 124
    medium: int = 86
    low: int = 42
    time_range: str = "Last 30 days"
    findings_trend: List[IaCOverviewTrendPoint] = Field(default_factory=list)
    findings_by_severity: Dict[str, float] = Field(
        default_factory=lambda: {
            "Critical": 23.0,
            "High": 38.0,
            "Medium": 26.0,
            "Low": 13.0,
        }
    )
    findings_by_type: List[IaCOverviewTypeBreakdownItem] = Field(default_factory=list)


class IaCEnvironmentOverviewItem(BaseModel):
    environment: str
    total_findings: int
    critical: int
    high: int
    medium: int
    low: int
    compliance_score: float  # e.g. 68.0


class IaCEnvironmentTrendPoint(BaseModel):
    date: str
    production: int
    staging: int
    development: int
    qa: int


class IaCEnvironmentOverviewResponse(BaseModel):
    environments: List[IaCEnvironmentOverviewItem] = Field(default_factory=list)
    trend: List[IaCEnvironmentTrendPoint] = Field(default_factory=list)


class IaCProviderOverviewItem(BaseModel):
    provider: str
    total_findings: int
    critical: int
    high: int
    medium: int
    low: int
    resources_count: int
    resource_percentage: float  # e.g. 68.0


class IaCProviderOverviewResponse(BaseModel):
    providers: List[IaCProviderOverviewItem] = Field(default_factory=list)


class IaCOverviewResourceItem(BaseModel):
    id: str
    name: str
    resource_type: str
    provider: str
    environment: str
    status: str = "Scanned"
    findings_count: int


class IaCOverviewResourcesResponse(BaseModel):
    items: List[IaCOverviewResourceItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_providers: List[str] = Field(default_factory=list)
    available_environments: List[str] = Field(default_factory=list)
    available_types: List[str] = Field(default_factory=list)


class IaCCoverageRepoItem(BaseModel):
    id: str
    repository_name: str
    iac_files_count: int
    coverage_percentage: float
    last_scanned: str


class IaCCoverageFileTypeItem(BaseModel):
    extension: str
    percentage: float
    file_count: int


class IaCCoverageResponse(BaseModel):
    total_repositories: int = 48
    total_iac_files: int = 312
    coverage_percentage: float = 86.0
    not_scanned_count: int = 14
    scanned_count: int = 268
    repositories: List[IaCCoverageRepoItem] = Field(default_factory=list)
    file_types: List[IaCCoverageFileTypeItem] = Field(default_factory=list)


class IaCOverviewComplianceStandardItem(BaseModel):
    standard: str
    compliance_percentage: float
    status: str = "Compliant"


class IaCOverviewComplianceTrendPoint(BaseModel):
    date: str
    cis: float
    nist: float
    pci_dss: float
    iso_27001: float


class IaCOverviewComplianceFailureItem(BaseModel):
    control: str
    title: str
    standard: str
    findings_count: int
    severity: str


class IaCOverviewComplianceResponse(BaseModel):
    standards: List[IaCOverviewComplianceStandardItem] = Field(default_factory=list)
    trend: List[IaCOverviewComplianceTrendPoint] = Field(default_factory=list)
    top_failures: List[IaCOverviewComplianceFailureItem] = Field(default_factory=list)


class IaCRiskBreakdownItem(BaseModel):
    category: str
    percentage: float
    color: str


class IaCRiskTrendPoint(BaseModel):
    date: str
    score: int


class IaCRiskSummaryResponse(BaseModel):
    risk_score: int = 72
    risk_level: str = "High"
    risk_description: str = "Your infrastructure has high risk issues that need immediate attention."
    breakdown: List[IaCRiskBreakdownItem] = Field(default_factory=list)
    trend: List[IaCRiskTrendPoint] = Field(default_factory=list)


class IaCRecentActivityItem(BaseModel):
    id: str
    title: str
    description: str
    time_relative: str
    activity_type: str  # scan_completed, finding_detected, policy_violation, drift_detected, repo_scanned, compliance_report, resource_detected, rule_updated
    severity: Optional[str] = None
    user_name: Optional[str] = "Dev Security Admin"


class IaCRecentActivityResponse(BaseModel):
    activities: List[IaCRecentActivityItem] = Field(default_factory=list)
    available_activity_types: List[str] = Field(default_factory=list)
    available_users: List[str] = Field(default_factory=list)


# =============================================================================
# SECTION 13: POLICIES & QUALITY GATES SCHEMAS (13.1 - 13.8)
# =============================================================================

class IaCPoliciesOverviewViolationsTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class IaCTopPolicyViolationItem(BaseModel):
    id: str
    policy_name: str
    severity: str
    violations: int
    repositories: int


class IaCPoliciesQualityGatesOverviewResponse(BaseModel):
    total_policies: int = 24
    enforced: int = 18
    draft: int = 4
    disabled: int = 2
    # Policy Compliance Donut
    policy_compliance_total: int = 24
    policy_compliance_compliant: int = 16
    policy_compliance_non_compliant: int = 6
    policy_compliance_not_evaluated: int = 2
    # Quality Gate Status Donut
    quality_gate_total: int = 48
    quality_gate_passed: int = 36
    quality_gate_failed: int = 8
    quality_gate_skipped: int = 4
    # Trend and top violations
    violations_trend: List[IaCPoliciesOverviewViolationsTrendPoint] = Field(default_factory=list)
    top_violations: List[IaCTopPolicyViolationItem] = Field(default_factory=list)


class IaCPolicyCatalogItem(BaseModel):
    id: str
    name: str
    type: str  # Resource, Security, Compliance, Identity, Dependency, Network
    severity: str  # Critical, High, Medium, Low
    status: str  # Enforced, Draft, Disabled
    framework: str  # CIS AWS, Custom, NIST, PCI DSS, CIS K8s, AWS Well-Architected
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class IaCPoliciesCatalogResponse(BaseModel):
    items: List[IaCPolicyCatalogItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_types: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)
    available_frameworks: List[str] = Field(default_factory=list)


class IaCPolicyDetailRuleItem(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    provider: str


class IaCPolicyDetailExceptionItem(BaseModel):
    id: str
    title: str
    repository: str
    valid_until: str
    status: str


class IaCPolicyDetailRepoItem(BaseModel):
    repository_name: str
    violations_count: int
    last_scanned: str


class IaCPolicyDetailAuditItem(BaseModel):
    id: str
    action: str
    performed_by: str
    timestamp: str
    details: str


class IaCPolicyDetailResponse(BaseModel):
    id: str
    name: str
    subtitle: str
    status: str
    severity: str
    type: str
    framework: str
    description: str
    scope_frameworks: List[str] = Field(default_factory=list)
    scope_resources: List[str] = Field(default_factory=list)
    evaluation_logic: str
    remediation_text: str
    remediation_guide_url: Optional[str] = None
    rules: List[IaCPolicyDetailRuleItem] = Field(default_factory=list)
    exceptions: List[IaCPolicyDetailExceptionItem] = Field(default_factory=list)
    affected_repos: List[IaCPolicyDetailRepoItem] = Field(default_factory=list)
    audit_logs: List[IaCPolicyDetailAuditItem] = Field(default_factory=list)


class CreatePolicyRequest(BaseModel):
    name: str
    type: str
    severity: str
    status: str = "Draft"
    framework: str
    description: str
    scope_frameworks: List[str] = Field(default_factory=list)
    scope_resources: List[str] = Field(default_factory=list)
    evaluation_logic: str
    remediation_text: str


class IaCQualityGateItem(BaseModel):
    id: str
    name: str
    description: str
    status: str  # Enforced, Draft, Disabled
    fail_condition: str  # Any Critical, Critical or High, Critical only, Compliance fail, Custom rules
    affected_repos: int


class IaCQualityGatesListResponse(BaseModel):
    items: List[IaCQualityGateItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_statuses: List[str] = Field(default_factory=list)
    available_repositories: List[str] = Field(default_factory=list)


class IaCQualityGateRuleItem(BaseModel):
    rule_id: str
    rule_name: str
    severity: str


class IaCQualityGateRepoItem(BaseModel):
    name: str
    status: str
    last_checked: str


class IaCQualityGatePipelineItem(BaseModel):
    provider: str  # GitHub Actions, GitLab CI, Jenkins, Azure DevOps
    snippet: str
    status: str


class IaCQualityGateDetailResponse(BaseModel):
    id: str
    name: str
    subtitle: str
    status: str
    fail_condition: str
    applied_to_count: int
    created_by: str
    last_updated: str
    rules: List[IaCQualityGateRuleItem] = Field(default_factory=list)
    repositories: List[IaCQualityGateRepoItem] = Field(default_factory=list)
    pipelines: List[IaCQualityGatePipelineItem] = Field(default_factory=list)
    notifications: List[str] = Field(default_factory=list)
    audit_logs: List[IaCPolicyDetailAuditItem] = Field(default_factory=list)


class CreateQualityGateRequest(BaseModel):
    name: str
    description: str
    status: str = "Draft"
    fail_condition: str
    rules: List[str] = Field(default_factory=list)
    repositories: List[str] = Field(default_factory=list)


class AddQualityGateRuleRequest(BaseModel):
    rule_id: str
    rule_name: str
    severity: str


class IaCPolicyViolationItem(BaseModel):
    id: str
    title: str
    severity: str  # Critical, High, Medium, Low
    status: str    # Open, In Progress, Resolved
    repository: str
    detected: str
    rule_id: Optional[str] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None


class IaCPolicyViolationsResponse(BaseModel):
    items: List[IaCPolicyViolationItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_severities: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)
    available_repositories: List[str] = Field(default_factory=list)
    available_ranges: List[str] = Field(default_factory=list)


class IaCPolicyExceptionItem(BaseModel):
    id: str
    title: str
    policy_rule: str
    repository: str
    valid_until: str
    status: str  # Active, Expired, Pending
    reason: Optional[str] = None
    created_by: Optional[str] = "mayur.bhanvad"


class IaCPolicyExceptionsResponse(BaseModel):
    items: List[IaCPolicyExceptionItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_statuses: List[str] = Field(default_factory=list)


class CreatePolicyExceptionRequest(BaseModel):
    title: str
    policy_rule: str
    repository: str
    valid_until: str
    reason: Optional[str] = None


class IaCPoliciesSettings(BaseModel):
    enable_policy_enforcement: bool = True
    block_merge_on_gate_failure: bool = True
    evaluate_on_pull_request: bool = True
    evaluate_on_branch_push: bool = True
    include_deleted_resources: bool = False
    show_policy_hints: bool = True
    default_quality_gate: str = "Default IaC Gate"
    available_gates: List[str] = Field(default_factory=list)
    last_saved: Optional[str] = None


# ============================================================================
# Section 6: Rules Schemas (Screens 6.1 to 6.8)
# ============================================================================

class IaCRulesSeverityDistribution(BaseModel):
    critical: int = 68
    high: int = 124
    medium: int = 198
    low: int = 122


class IaCRulesFrameworkDistributionItem(BaseModel):
    framework: str
    percentage: int
    count: int
    color: str


class IaCRulesOverviewResponse(BaseModel):
    total_rules: int = 512
    enabled_rules: int = 368
    disabled_rules: int = 124
    custom_rules: int = 20
    severity_distribution: IaCRulesSeverityDistribution = Field(default_factory=IaCRulesSeverityDistribution)
    framework_distribution: List[IaCRulesFrameworkDistributionItem] = Field(default_factory=list)


class IaCRuleItem(BaseModel):
    id: str
    name: str
    provider: str
    severity: str
    status: str  # Enabled, Disabled
    framework: str
    version: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    rule_type: Optional[str] = "Misconfiguration"
    is_custom: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class IaCRulesListResponse(BaseModel):
    items: List[IaCRuleItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_frameworks: List[str] = Field(default_factory=list)
    available_providers: List[str] = Field(default_factory=list)
    available_severities: List[str] = Field(default_factory=list)
    available_statuses: List[str] = Field(default_factory=list)


class IaCRuleDetailResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    provider: str
    severity: str
    rule_type: str
    frameworks: List[str] = Field(default_factory=list)
    status: str
    rego_code: str
    remediation_text: str
    mappings: List[str] = Field(default_factory=list)
    exceptions: List[str] = Field(default_factory=list)
    version: str = "v1.0"
    is_custom: bool = False


class CreateRuleRequest(BaseModel):
    name: str
    description: str
    category: str = "Storage"
    provider: str = "AWS"
    severity: str = "High"
    rule_type: str = "Misconfiguration"
    frameworks: List[str] = Field(default_factory=list)
    status: str = "Enabled"
    rego_code: Optional[str] = None
    remediation_text: Optional[str] = None
    is_custom: bool = True


class UpdateRuleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    provider: Optional[str] = None
    severity: Optional[str] = None
    rule_type: Optional[str] = None
    frameworks: Optional[List[str]] = None
    status: Optional[str] = None
    rego_code: Optional[str] = None
    remediation_text: Optional[str] = None


class ValidateRegoRequest(BaseModel):
    rego_code: str


class ValidateRegoResponse(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    package_name: Optional[str] = None
    rules_defined: List[str] = Field(default_factory=list)


class IaCRulePackItem(BaseModel):
    name: str
    framework: str
    rules_count: int
    version: str
    description: str
    status: str  # Enabled, Disabled
    is_custom: bool = False


class IaCRulePacksListResponse(BaseModel):
    items: List[IaCRulePackItem] = Field(default_factory=list)
    total: int = 0
    builtin_count: int = 0
    custom_count: int = 0


# =========================================================================
# SECTION 8: SCANS SUITE (SCREENS 8.1 THROUGH 8.8)
# =========================================================================

# 8.1 Scans Overview


class IaCTopRepoFindingsItem(BaseModel):
    repository: str
    scans: int
    critical: int
    high: int
    medium: int
    low: int


class IaCScansOverviewResponse(BaseModel):
    total_scans: int = 36
    succeeded_scans: int = 28
    failed_scans: int = 5
    in_progress_scans: int = 3
    results_trend: List[IaCScanTrendPoint] = Field(default_factory=list)
    top_repositories: List[IaCTopRepoFindingsItem] = Field(default_factory=list)
    time_range: str = "Last 30 days"


# 8.2 Scan History
class IaCScanHistoryRow(BaseModel):
    scan_id: str
    repository: str
    environment: str
    triggered_by: str
    status: str  # Succeeded, Failed, In Progress
    findings_count: int
    started_at: str
    duration: Optional[str] = None


class IaCScanHistoryResponse(BaseModel):
    items: List[IaCScanHistoryRow] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_repositories: List[str] = Field(default_factory=list)
    available_environments: List[str] = Field(default_factory=list)


# 8.3 Scheduled Scans
class IaCScheduledScanItem(BaseModel):
    id: str
    name: str
    repository: str
    frequency: str  # Daily, Weekly, On Push
    next_run: str
    status: str  # Active, Inactive
    branch: str = "main"
    environment: str = "production"


class IaCScheduledScansResponse(BaseModel):
    items: List[IaCScheduledScanItem] = Field(default_factory=list)
    total: int = 0


class CreateScheduledScanRequest(BaseModel):
    name: str
    repository: str
    frequency: str = "Daily"
    next_run: Optional[str] = "Tomorrow, 09:00 AM"
    status: str = "Active"
    branch: str = "main"
    environment: str = "production"


# 8.4 On-Demand Scan
class TriggerOnDemandScanRequest(BaseModel):
    repository: str
    branch: str = "main"
    environment: str = "production"
    scan_type: str = "Full Scan"  # Full Scan, Changed Files Only, Custom Paths
    custom_paths: Optional[str] = None
    include_terraform: bool = True
    include_cloudformation: bool = True
    include_kubernetes: bool = True
    include_custom_templates: bool = False


class TriggerOnDemandScanResponse(BaseModel):
    scan_id: str
    repository: str
    branch: str
    environment: str
    status: str = "In Progress"
    queued_at: str
    message: str


# 8.5 Scan Configurations
class IaCScanConfigurationsDTO(BaseModel):
    name: str = "Default IaC Scan"
    description: str = "Default configuration for IaC security scanning"
    scanners: List[str] = Field(default_factory=lambda: ["Terraform", "CloudFormation", "Kubernetes", "Helm Charts"])
    scan_depth: str = "Standard"
    max_file_size: str = "5 MB"
    parallel_scans: int = 4
    custom_rules_enabled: bool = False


# 8.6 Results Comparison
class IaCComparisonSeverityDiff(BaseModel):
    severity: str
    current_count: int
    previous_count: int
    delta: int
    direction: str  # up, down, same


class IaCChangedResourceItem(BaseModel):
    resource: str
    change_type: str  # New, Improved, Worsened, Resolved, Unchanged
    previous_severity: str
    current_severity: str


class IaCResultsComparisonResponse(BaseModel):
    scan_1_id: str
    scan_1_label: str
    scan_2_id: str
    scan_2_label: str
    available_scans: List[dict] = Field(default_factory=list)
    critical: IaCComparisonSeverityDiff
    high: IaCComparisonSeverityDiff
    medium: IaCComparisonSeverityDiff
    low: IaCComparisonSeverityDiff
    top_changed_resources: List[IaCChangedResourceItem] = Field(default_factory=list)
    chart_data: List[dict] = Field(default_factory=list)


# 8.7 Scan Queue
class IaCQueueScanItem(BaseModel):
    scan_id: str
    repository: str
    environment: str
    progress: int
    status: str  # Running, Queued, Cancelled
    started_at: str
    eta: Optional[str] = None


class IaCScanQueueResponse(BaseModel):
    running: List[IaCQueueScanItem] = Field(default_factory=list)
    queued: List[IaCQueueScanItem] = Field(default_factory=list)
    running_count: int = 0
    queued_count: int = 0


# 8.8 Scan Settings
class IaCScanGlobalSettings(BaseModel):
    configuration_preset: str = "Default IaC Scan"
    notify_on_completion: bool = True
    notify_on_failure: bool = True
    notify_on_critical: bool = True
    notification_channels: List[str] = Field(default_factory=lambda: ["Email", "Slack"])
    scan_retention_days: int = 90
    concurrent_scans: int = 4
    scan_timeout_minutes: int = 30
    upload_to_dashboard: bool = True
    store_scan_logs: bool = True
    enable_incremental_scanning: bool = False


# =========================================================================
# SECTION 11: COMPLIANCE & BENCHMARKS (SCREENS 11.1 THROUGH 11.8)
# =========================================================================

# 11.1 Compliance Overview
class IaCComplianceOverviewKpis(BaseModel):
    frameworks: int = 6
    total_controls: int = 132
    compliant_controls: int = 96
    non_compliant_controls: int = 26
    not_evaluated_controls: int = 10
    compliance_percentage: int = 73


class IaCFrameworkCoverageItem(BaseModel):
    name: str  # CIS AWS, CIS Kubernetes, NIST 800-53, PCI DSS, SOC 2, ISO 27001
    version: str  # v1.5, v1.6, v5, v4.0, 2022
    passing_controls: int
    total_controls: int
    passing_percentage: int
    status: str = "Passing"


class IaCComplianceTrendPoint(BaseModel):
    date: str  # Sep 01, Sep 05, Sep 10, Sep 15, Sep 20, Sep 25, Sep 30
    compliant: int
    non_compliant: int
    not_evaluated: int


class IaCComplianceOverviewResponse(BaseModel):
    kpis: IaCComplianceOverviewKpis
    framework_coverages: List[IaCFrameworkCoverageItem] = Field(default_factory=list)
    trend: List[IaCComplianceTrendPoint] = Field(default_factory=list)
    repository: str = "All Repositories"
    available_repositories: List[str] = Field(
        default_factory=lambda: ["All Repositories", "frontend-app", "infrastructure", "k8s-manifests", "cloudformation", "terraform-modules"]
    )


# 11.2 Frameworks
class IaCComplianceFrameworkItem(BaseModel):
    id: str
    name: str
    version: str
    description: str
    controls_count: int
    compliance_percentage: int
    last_scanned: str
    status: str = "Active"
    is_custom: bool = False


class IaCComplianceFrameworksResponse(BaseModel):
    items: List[IaCComplianceFrameworkItem] = Field(default_factory=list)
    total: int = 0


class CreateFrameworkRequest(BaseModel):
    name: str
    version: str = "v1.0"
    description: str
    controls_count: int = 25


# 11.3 Controls Mapping
class IaCComplianceControlMappingItem(BaseModel):
    control_id: str  # CIS-1.1, CIS-1.2, etc.
    control_name: str
    framework: str  # CIS AWS, CIS K8s, NIST, PCI DSS, SOC 2
    status: str  # Compliant, Non-Compliant
    findings_count: int = 0
    severity: str = "High"


class IaCComplianceControlsResponse(BaseModel):
    items: List[IaCComplianceControlMappingItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_frameworks: List[str] = Field(
        default_factory=lambda: ["All Frameworks", "CIS AWS", "CIS K8s", "NIST", "PCI DSS", "SOC 2"]
    )
    available_statuses: List[str] = Field(default_factory=lambda: ["All Statuses", "Compliant", "Non-Compliant"])
    available_severities: List[str] = Field(default_factory=lambda: ["All Severities", "Critical", "High", "Medium", "Low"])


# 11.4 Control Detail
class IaCControlFindingItem(BaseModel):
    finding_id: str
    title: str
    resource: str
    severity: str
    file_path: str
    status: str = "Open"


class IaCControlDetailResponse(BaseModel):
    control_id: str
    control_name: str
    framework: str
    version: str
    category: str
    severity: str
    status: str  # Compliant, Non-Compliant
    last_evaluated: str
    summary: str
    description: str
    documentation_url: str
    remediation_guide: str
    findings: List[IaCControlFindingItem] = Field(default_factory=list)
    findings_by_severity: Dict[str, int] = Field(default_factory=dict)
    evidence_count: int = 1


# 11.5 Compliance Report
class GenerateComplianceReportRequest(BaseModel):
    frameworks: List[str] = Field(default_factory=lambda: ["CIS-AWS", "CIS-Kubernetes", "NIST 800-53"])
    repository: str = "All Repositories"
    date_range: str = "Sep 01, 2026 - Sep 30, 2026"
    format: str = "PDF"  # PDF, CSV, JSON
    include_executive_summary: bool = True
    include_control_status: bool = True
    include_findings_details: bool = True
    include_remediation: bool = True
    include_evidence: bool = True
    include_appendices: bool = True


class ComplianceReportGeneratedResponse(BaseModel):
    report_id: str
    report_name: str
    generated_at: str
    download_url: str
    summary_findings_count: int = 24
    frameworks: List[str] = Field(default_factory=list)
    format: str = "PDF"
    file_size: str = "1.8 MB"


class ComplianceReportHistoryResponse(BaseModel):
    items: List[ComplianceReportGeneratedResponse] = Field(default_factory=list)
    total: int = 0


# 11.6 Evidence
class IaCComplianceEvidenceItem(BaseModel):
    evidence_id: str  # EV-001, EV-002, etc.
    control_id: str  # CIS-1.1, CIS-1.2, etc.
    description: str
    type: str  # Config file, Screenshot, Log file, Document
    status: str  # Valid, Pending, Expired
    updated: str
    file_url: Optional[str] = None


class IaCComplianceEvidenceResponse(BaseModel):
    items: List[IaCComplianceEvidenceItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_frameworks: List[str] = Field(
        default_factory=lambda: ["All Frameworks", "CIS AWS", "CIS K8s", "NIST", "PCI DSS", "SOC 2"]
    )
    available_controls: List[str] = Field(
        default_factory=lambda: ["All Controls", "CIS-1.1", "CIS-1.2", "K8S-5.1", "NIST-AU-2", "PCI-2.2", "SOC2-CC6.1"]
    )
    available_statuses: List[str] = Field(default_factory=lambda: ["All Statuses", "Valid", "Pending", "Expired"])


class CreateEvidenceRequest(BaseModel):
    control_id: str
    description: str
    type: str = "Config file"
    status: str = "Valid"


# 11.7 Exceptions
class IaCComplianceExceptionItem(BaseModel):
    exception_id: str  # EX-001, EX-002, etc.
    control_id: str  # CIS-1.2, K8S-5.2, etc.
    reason: str
    status: str  # Approved, Pending, Rejected
    valid_until: str
    created_by: str = "security-team"


class IaCComplianceExceptionsResponse(BaseModel):
    items: List[IaCComplianceExceptionItem] = Field(default_factory=list)
    total: int = 0


class CreateComplianceExceptionRequest(BaseModel):
    control_id: str
    reason: str
    valid_until: str = "Dec 31, 2026"
    status: str = "Approved"


# 11.8 Audit Logs
class IaCComplianceAuditLogItem(BaseModel):
    id: str
    time: str
    event: str
    user: str
    details: str


class IaCComplianceAuditLogsResponse(BaseModel):
    items: List[IaCComplianceAuditLogItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_events: List[str] = Field(
        default_factory=lambda: [
            "All Events",
            "Exception Approved",
            "Evidence Added",
            "Control Status Changed",
            "Report Generated",
            "Policy Exception Created",
            "Evidence Updated",
            "Framework Added",
            "Quality Gate Updated",
        ]
    )
    available_users: List[str] = Field(
        default_factory=lambda: ["All Users", "mayur.bharvad", "dev.lead", "security-team", "infra-team", "john.doe", "admin"]
    )


# Compliance Settings
class IaCComplianceSettings(BaseModel):
    auto_evaluate_on_scan: bool = True
    enforce_strict_benchmarks: bool = True
    notify_on_non_compliance: bool = True
    notification_channels: List[str] = Field(default_factory=lambda: ["Email", "Slack"])
    default_framework: str = "CIS AWS Foundations"
    evidence_retention_days: int = 365







