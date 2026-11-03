"""
Thing Code — Pydantic Response Schemas
Strictly typed contracts for the Code product API.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.pagination import PaginationMeta


# ─────────────────────────────────────────────
# Shared primitives
# ─────────────────────────────────────────────

class CodeCoverageMetric(BaseModel):
    covered: int
    total: int
    unit: str


class FindingSeverityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0

    @property
    def total(self) -> int:
        return self.critical + self.high + self.medium + self.low + self.informational


# ─────────────────────────────────────────────
# GET /code/overview
# ─────────────────────────────────────────────

class CodeOverviewResponse(BaseModel):
    generated_at: datetime
    project_id: Optional[str]

    # Repository inventory
    repositories_total: int
    repositories_with_scans: int

    # Finding summary
    findings: FindingSeverityBreakdown

    # Scan summary
    scans_total: int
    scans_completed: int
    scans_failed: int
    scans_running: int

    # Scanner coverage counts
    sast_scanned: int
    secrets_scanned: int
    sca_scanned: int

    # Convenience aliases for frontend consumption
    total_repositories: Optional[int] = None
    scanned_repositories: Optional[int] = None
    total_findings: Optional[int] = None
    critical_findings: Optional[int] = None
    high_findings: Optional[int] = None


# ─────────────────────────────────────────────
# GET /code/coverage
# ─────────────────────────────────────────────

class CodeCoverageResponse(BaseModel):
    generated_at: datetime
    project_id: Optional[str]
    sast: CodeCoverageMetric
    secrets: CodeCoverageMetric
    dependencies: CodeCoverageMetric
    sbom: CodeCoverageMetric


# ─────────────────────────────────────────────
# GET /code/attention
# ─────────────────────────────────────────────

class CodeAttentionItem(BaseModel):
    id: str
    severity: str
    title: str
    scanner: str
    rule_id: str
    file_path: Optional[str]
    line_number: Optional[int]
    repository_id: Optional[str]
    repository_name: Optional[str]
    scan_id: str
    fingerprint: str
    first_seen: datetime


class CodeAttentionResponse(BaseModel):
    items: List[CodeAttentionItem]
    total: int
    has_more: bool


# ─────────────────────────────────────────────
# GET /code/recent-scans
# ─────────────────────────────────────────────

class ScannerExecutionSummary(BaseModel):
    scanner_name: str
    scanner_type: str
    status: str
    finding_count: int
    duration_ms: Optional[int]
    exit_code: Optional[int]


class RecentScanItem(BaseModel):
    id: str
    project_id: str
    target_type: str
    target_path: str
    target_reference: Optional[str]
    status: str
    finding_count: int
    scanner_count: int
    requested_by: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    error_message: Optional[str]
    executions: List[ScannerExecutionSummary]


class RecentScansResponse(BaseModel):
    items: List[RecentScanItem]
    total: int


# ─────────────────────────────────────────────
# GET /code/repository-health
# ─────────────────────────────────────────────

class RepositoryHealthItem(BaseModel):
    repository_id: str
    repository_name: str
    id: Optional[str] = None
    name: Optional[str] = None
    full_name: str
    provider: str = "github"
    default_branch: str
    visibility: str
    scan_status: str          # HEALTHY | FINDINGS | SCAN_FAILED | NEVER_SCANNED | SCANNING | UNKNOWN
    finding_critical: int
    finding_high: int
    finding_medium: int
    finding_low: int
    last_scan_id: Optional[str]
    last_scan_status: Optional[str]
    last_scan_at: Optional[datetime]
    last_synced_at: Optional[datetime]
    project_id: Optional[str]
    environment: Optional[str] = "production"
    risk: Optional[str] = "Low"


class RepositoryHealthResponse(BaseModel):
    items: List[RepositoryHealthItem]
    total: int
    scanned_count: int = 0
    open_findings_count: int = 0
    last_scan_at: Optional[datetime] = None
    pagination: Optional[PaginationMeta] = None


# ─────────────────────────────────────────────
# GET /code/findings  (paginated)
# ─────────────────────────────────────────────

class CodeFindingItem(BaseModel):
    id: str
    severity: str
    title: str
    scanner_name: str
    rule_id: str
    file_path: Optional[str]
    line_number: Optional[int]
    fingerprint: str
    scan_id: str
    scanner_execution_id: str
    repository_id: Optional[str]
    repository_name: Optional[str]
    project_id: Optional[str]
    snippet: Optional[str]
    description: str
    raw_metadata: Dict[str, Any]
    first_seen: datetime


from app.schemas.pagination import PaginationMeta


class CodeFindingsResponse(BaseModel):
    items: List[CodeFindingItem]
    total: int
    limit: int
    offset: int
    has_more: bool
    pagination: Optional[PaginationMeta] = None


# ─────────────────────────────────────────────
# GET /code/findings/{id}
# ─────────────────────────────────────────────

class RelatedFindingItem(BaseModel):
    id: str
    severity: str
    title: str
    file_path: Optional[str]
    relationship: str  # e.g. "Same credentials", "Same account", "Same scanner"


class DataFlowNode(BaseModel):
    label: str
    type: str        # "source" | "transform" | "sink"
    detail: str      # e.g. "src/config.js:5" or "awsConfig" or "AWS.S3()"


class CodeFindingDetailResponse(BaseModel):
    id: str
    severity: str
    title: str
    scanner_name: str
    scanner_type: Optional[str] = None    # SAST | Secrets | SCA | IaC
    rule_id: str
    file_path: Optional[str]
    line_number: Optional[int]
    line_end: Optional[int] = None
    column_number: Optional[int]
    fingerprint: str
    scan_id: str
    scanner_execution_id: str
    repository_id: Optional[str]
    repository_name: Optional[str]
    project_id: Optional[str]
    snippet: Optional[str]
    description: str
    status: str = "OPEN"
    raw_metadata: Dict[str, Any]
    first_seen: datetime
    last_seen: Optional[datetime] = None
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    author: Optional[str] = None          # Git commit author
    environment: Optional[str] = None     # e.g. "Production"
    # CWE / CVSS data derived from scanner metadata
    cwe: Optional[str] = None             # e.g. "CWE-798"
    cvss_score: Optional[float] = None    # e.g. 9.8
    cvss_severity: Optional[str] = None  # e.g. "Critical"
    category: Optional[str] = None        # e.g. "Secrets"
    finding_type: Optional[str] = None    # e.g. "AWS Credentials"
    # Scanner execution evidence
    scanner_status: Optional[str] = None
    scanner_exit_code: Optional[int] = None
    scanner_duration_ms: Optional[int] = None
    scanner_raw_output: Optional[str] = None
    scanner_command: Optional[str] = None
    scanner_version: Optional[str] = None
    remediation_guidance: Optional[str] = None
    # Data flow (static analysis)
    data_flow: List[DataFlowNode] = []
    # Related findings from same scan with same file/credentials
    related_findings: List[RelatedFindingItem] = []


class RepositoryEnvironmentPosture(BaseModel):
    name: str
    branch: str
    status: str
    last_scanned_at: Optional[datetime] = None
    finding_count: int = 0


class RepositoryTrendPoint(BaseModel):
    date: str
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class RepositoryCoverageSummary(BaseModel):
    overall_percentage: float = 0.0
    sast_percentage: float = 0.0
    sca_percentage: float = 0.0
    secrets_percentage: float = 0.0
    iac_percentage: float = 0.0
    container_percentage: float = 0.0


class TreeNode(BaseModel):
    name: str
    path: str
    type: str  # "file" | "directory"
    size: Optional[int] = None
    children: Optional[List["TreeNode"]] = None


class RepositoryTreeResponse(BaseModel):
    repository_id: str
    branch: str
    tree: List[TreeNode]


class RepositoryFileResponse(BaseModel):
    repository_id: str
    branch: str
    path: str
    filename: str
    size_bytes: int
    lines_count: int
    language: str
    content: str
    last_commit_sha: Optional[str] = None
    last_updated: Optional[str] = None
    author: Optional[str] = None
    findings: List[CodeFindingItem] = []
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0


# ─────────────────────────────────────────────
# GET /code/repositories/{id}
# ─────────────────────────────────────────────

class CodeRepositoryDetailResponse(BaseModel):
    id: str
    name: str
    full_name: str
    provider: str = "github"
    default_branch: str
    visibility: str
    clone_url: Optional[str] = None
    html_url: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    project_id: Optional[str] = None
    scan_status: str
    findings: FindingSeverityBreakdown
    last_scan_id: Optional[str] = None
    last_scan_status: Optional[str] = None
    last_scan_at: Optional[datetime] = None
    last_scan_duration_seconds: Optional[int] = None
    last_scan_trigger: Optional[str] = None
    last_commit_sha: Optional[str] = None
    language: Optional[str] = "TypeScript"
    stars_count: int = 0
    forks_count: int = 0
    watchers_count: int = 0
    open_prs_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    sast_covered: bool = False
    secrets_covered: bool = False
    sca_covered: bool = False
    sbom_covered: bool = False
    contract_status: str = "COMPLIANT"
    coverage: Optional[RepositoryCoverageSummary] = None
    findings_trend: List[RepositoryTrendPoint] = []
    environments: List[RepositoryEnvironmentPosture] = []
    recent_scans: List[RecentScanItem] = []
    recent_findings: List[CodeFindingItem] = []


# ─────────────────────────────────────────────
# GET /code/evidence
# ─────────────────────────────────────────────

class CodeEvidenceItem(BaseModel):
    id: str
    evidence_type: str
    source: str
    target_type: str
    target_ref: str
    commit_sha: Optional[str] = None
    timestamp: datetime
    status: str
    findings_count: int = 0
    raw_artifact: Optional[str] = None
    metadata: Dict[str, Any] = {}


class CodeEvidenceResponse(BaseModel):
    items: List[CodeEvidenceItem]
    total: int
    limit: int
    offset: int


# ─────────────────────────────────────────────
# POST /code/repositories/{id}/scans
# ─────────────────────────────────────────────

class ScanTriggerRequest(BaseModel):
    branch: Optional[str] = "main"


class ScanTriggerResponse(BaseModel):
    job_id: str
    scan_id: str
    status: str
    message: str


# ─────────────────────────────────────────────
# Secrets Product Schemas (/code/secrets)
# ─────────────────────────────────────────────

class SecretKpis(BaseModel):
    exposed_secrets: int = 0
    exposed_trend: str = "0%"
    exposed_trend_positive: bool = True
    high_severity: int = 0
    high_severity_trend: str = "0%"
    high_severity_positive: bool = True
    repositories: int = 0
    repositories_trend: str = "0%"
    repositories_positive: bool = True
    secrets_remediated: int = 0
    remediated_trend: str = "0%"
    remediated_positive: bool = True


class SecretSeverityDistribution(BaseModel):
    critical: int = 0
    critical_pct: float = 0.0
    high: int = 0
    high_pct: float = 0.0
    medium: int = 0
    medium_pct: float = 0.0
    low: int = 0
    low_pct: float = 0.0
    total: int = 0


class SecretTrendPoint(BaseModel):
    date: str
    found: int
    remediated: int


class SecretTypeMetric(BaseModel):
    type_name: str
    count: int
    percentage: float
    color: str


class RecentSecretFindingItem(BaseModel):
    id: str
    secret_type: str
    brand: str
    repository: str
    repository_id: Optional[str] = None
    file_path: str
    line_number: Optional[int] = None
    severity: str
    detected_at: datetime
    snippet: Optional[str] = None
    status: str = "OPEN"
    rule_id: Optional[str] = None
    raw_metadata: Dict[str, Any] = {}


class TopRepositorySecretItem(BaseModel):
    repository_id: str
    name: str
    full_name: str
    provider: str = "github"
    secret_count: int
    percentage: float
    color: str


class RemediationProgressMetric(BaseModel):
    remediated: int = 0
    total: int = 0
    percentage: float = 100.0


class SecretsOverviewResponse(BaseModel):
    generated_at: datetime
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    date_range: Optional[str] = None
    kpis: SecretKpis
    severity_distribution: SecretSeverityDistribution
    trend: List[SecretTrendPoint]
    top_secret_types: List[SecretTypeMetric]
    recent_findings: List[RecentSecretFindingItem]
    top_repositories: List[TopRepositorySecretItem]
    remediation_progress: RemediationProgressMetric


class SecretInventoryItem(BaseModel):
    id: str
    category: str
    secret_type: str
    occurrences: int
    repositories_affected: int
    severity: str
    sample_file: str
    last_detected: datetime
    status: str = "ACTIVE"


class SecretPolicyItem(BaseModel):
    id: str
    name: str
    description: str
    scanner: str = "gitleaks"
    severity: str = "CRITICAL"
    action: str = "BLOCK"
    enabled: bool = True
    rules_count: int = 1
    created_at: datetime


class CreateSecretPolicyRequest(BaseModel):
    name: str
    description: str
    scanner: Optional[str] = "gitleaks"
    severity: Optional[str] = "CRITICAL"
    action: Optional[str] = "BLOCK"
    enabled: Optional[bool] = True


class TriggerSecretScanRequest(BaseModel):
    repository_id: Optional[str] = None
    branch: Optional[str] = "main"


# ─────────────────────────────────────────────
# Secret Scans Product Schemas (/code/secrets/scans)
# ─────────────────────────────────────────────

class SecretScanKpis(BaseModel):
    total_scans: int = 0
    total_scans_trend: str = "0%"
    total_scans_positive: bool = True
    scans_with_findings: int = 0
    scans_with_findings_trend: str = "0%"
    scans_with_findings_positive: bool = True
    clean_scans: int = 0
    clean_scans_trend: str = "0%"
    clean_scans_positive: bool = True
    avg_scan_time: str = "0s"
    avg_scan_time_trend: str = "0%"
    avg_scan_time_positive: bool = True


class SecretScanTrendPoint(BaseModel):
    date: str
    findings: int
    clean: int


class SecretScanSeverityDonut(BaseModel):
    total: int = 0
    critical: int = 0
    critical_pct: float = 0.0
    high: int = 0
    high_pct: float = 0.0
    medium: int = 0
    medium_pct: float = 0.0
    low: int = 0
    low_pct: float = 0.0


class SecretScanCoverage(BaseModel):
    repositories_scanned: int = 0
    repositories_total: int = 0
    repositories_pct: float = 100.0
    branches_scanned: int = 0
    branches_total: int = 0
    branches_pct: float = 100.0
    commits_scanned: int = 0
    commits_total: int = 0
    commits_pct: float = 100.0
    files_scanned: int = 0


class SecretScanMetricsResponse(BaseModel):
    kpis: SecretScanKpis
    trends: List[SecretScanTrendPoint]
    severity: SecretScanSeverityDonut
    coverage: SecretScanCoverage


class SecretScanFindingsCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0


class SecretScanTableItem(BaseModel):
    id: str
    repository: str
    repository_provider: str = "github"
    branch: str
    scan_type: str
    status: str
    findings: SecretScanFindingsCount
    duration: str
    started_at: datetime
    commit_sha: Optional[str] = None
    triggered_by: Optional[str] = "Push"
    raw_status: Optional[str] = None


class SecretScansTableResponse(BaseModel):
    items: List[SecretScanTableItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class SecretScanConfig(BaseModel):
    scan_type: str = "Full Scan"
    scope: str = "Entire Repository"
    include_paths: str = "All Files"
    exclude_paths: str = "node_modules, .git, dist"
    detection_rules: str = "Default + Custom"
    scan_on_push: bool = True
    scan_on_pr: bool = True
    schedule: str = "Daily at 02:00 AM"


class SecretScanIntegrationItem(BaseModel):
    id: str
    name: str
    enabled: bool
    icon: str


class SecretScanActivityItem(BaseModel):
    id: str
    message: str
    status_color: str
    time_ago: str
    timestamp: datetime


class TriggerNewSecretScanRequest(BaseModel):
    repository: str = "frontend-app"
    branch: Optional[str] = "main"
    scan_type: Optional[str] = "Full Scan"
    scope: Optional[str] = "Entire Repository"


class ScheduleSecretScanRequest(BaseModel):
    repository: str = "frontend-app"
    branch: Optional[str] = "main"
    frequency: str = "Daily"
    time: str = "02:00 AM"


# ─────────────────────────────────────────────
# Secret Scan Detail (/code/secrets/scans/{id})
# ─────────────────────────────────────────────

class RiskAnalysisInfo(BaseModel):
    risk_level: str = "High Risk"
    description: str
    potential_impact: List[str]


class CodeSnippetLine(BaseModel):
    line_number: int
    content: str
    is_highlighted: bool = False


class CodeContextInfo(BaseModel):
    file_path: str
    start_line: int
    highlight_line: int
    lines: List[CodeSnippetLine]


class FileMetadataInfo(BaseModel):
    file_path: str
    file_size: str
    language: str
    last_modified: str
    author: str
    lines_of_code: int
    sha: str


class RemediationStepItem(BaseModel):
    step_number: int
    title: str
    description: str
    action_label: str
    action_type: str  # revoke_key | view_guide | rotate_key | create_pr
    is_danger: bool = False


class ScanTimelineStepItem(BaseModel):
    step_id: str
    title: str
    time_or_detail: str
    status: str  # completed | running | findings | pending
    color: str   # green | blue | red


class RelatedFindingScanItem(BaseModel):
    id: str
    brand: str  # aws | database | github | openai | stripe
    title: str
    file_path: str
    severity: str
    date: str


class ScanMetadataBlock(BaseModel):
    scanner_version: str = "v2.1"
    rules_version: str = "Default + Custom"
    files_scanned: str = "86,432"
    run_type: str = "Full Scan"
    configuration: str = "Full Scan (All Files)"
    triggered_by: str = "Manual Scan (mayur-bharvad)"


class SecretScanFindingDetailItem(BaseModel):
    index: int
    id: str
    secret_type: str
    brand_icon: str
    file_path: str
    line_number: int
    severity: str  # Critical | High | Medium | Low
    status: str    # Open | Resolved
    title: str
    description: str
    pattern: str
    detected_value: str
    repository: str
    branch: str
    commit: str
    first_detected: str
    last_seen: str
    occurrences: int = 1
    risk_analysis: RiskAnalysisInfo
    code_context: CodeContextInfo
    file_info: FileMetadataInfo
    remediation_suggestions: List[RemediationStepItem]


class SecretScanFilesLocationItem(BaseModel):
    file_path: str
    language: str
    findings_count: int
    critical_count: int
    high_count: int
    file_size: str


class SecretScanTypeBreakdownItem(BaseModel):
    secret_type: str
    brand: str
    count: int
    percentage: float
    severity: str


class SecretScanComparisonItem(BaseModel):
    metric: str
    previous_scan: str
    current_scan: str
    delta: str
    status: str  # improved | degraded | neutral


class SecretScanLogItem(BaseModel):
    timestamp: str
    level: str  # INFO | WARN | ERROR | DEBUG
    message: str


class SecretScanDetailKpis(BaseModel):
    critical_count: int = 3
    critical_trend: str = "↑ 200%"
    critical_subtitle: str = "API Keys, Private Keys"
    high_count: int = 2
    high_trend: str = "↑ 100%"
    high_subtitle: str = "Tokens, Credentials"
    medium_count: int = 1
    medium_trend: str = "-"
    medium_subtitle: str = "Database URL"
    low_count: int = 0
    low_trend: str = "-"
    low_subtitle: str = ""
    resolved_count: int = 5
    resolved_trend: str = "↑ 150%"
    resolved_subtitle: str = "From previous scan"


class SecretScanDetailResponse(BaseModel):
    scan_id: str
    repository: str
    repository_type: str = "private"
    repository_provider: str = "github"
    branch: str
    commit: str
    scan_type: str
    started_at: str
    duration: str
    status: str
    kpis: SecretScanDetailKpis
    findings: List[SecretScanFindingDetailItem]
    files_and_locations: List[SecretScanFilesLocationItem]
    secrets_by_type: List[SecretScanTypeBreakdownItem]
    comparison: List[SecretScanComparisonItem]
    scan_logs: List[SecretScanLogItem]
    timeline: List[ScanTimelineStepItem]
    related_findings: List[RelatedFindingScanItem]
    scan_metadata: ScanMetadataBlock


class ResolveFindingRequest(BaseModel):
    resolved: bool = True


class CreateRemediationPRRequest(BaseModel):
    branch_name: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None


class RemediationPRResponse(BaseModel):
    pr_number: int
    pr_url: str
    branch_name: str
    title: str
    status: str = "created"
    created_at: datetime


# ─────────────────────────────────────────────
# Secret Remediation (/code/secrets/remediation)
# ─────────────────────────────────────────────

class SecretRemediationMetrics(BaseModel):
    open_findings: int = 18
    open_trend: str = "↓ 25%"
    remediated: int = 12
    remediated_trend: str = "↑ 40%"
    in_progress: int = 6
    in_progress_trend: str = "↓ 14%"
    prs_created: int = 2
    prs_trend: str = "↑ 100%"


class DiffSnippetLine(BaseModel):
    line_number: int
    content: str
    type: str = "context"  # context | removed | added


class SecretRemediationCodeDiff(BaseModel):
    file_path: str
    language: str = "JavaScript"
    before_lines: List[DiffSnippetLine]
    after_lines: List[DiffSnippetLine]


class SecretRemediationActionPlan(BaseModel):
    step_1_title: str = "Revoke Exposed Key"
    step_1_desc: str = "Immediately revoke the exposed AWS access key."
    step_1_action_url: Optional[str] = "https://console.aws.amazon.com/iam"
    step_1_action_label: str = "Open in AWS Console"
    step_2_title: str = "Update Code"
    step_2_desc: str = "Replace hardcoded key with environment variables."
    step_2_snippet: str
    step_3_title: str = "Create Pull Request"
    step_3_desc: str = "Automatically create a PR with the fix."
    step_4_title: str = "Rotate Credentials"
    step_4_desc: str = "Generate a new AWS access key with least privileges."
    step_4_action_url: Optional[str] = "https://console.aws.amazon.com/iam"
    step_4_action_label: str = "Rotate Key in AWS"
    step_5_title: str = "Verify Fix"
    step_5_desc: str = "Run a new scan to ensure the secret is removed."
    step_5_action_label: str = "Run Verification Scan"


class SecretRemediationItem(BaseModel):
    id: str
    title: str
    masked_value: str
    secret_type: str
    brand_icon: str
    type_label: str
    repository: str
    repository_provider: str = "github"
    severity: str  # Critical | High | Medium | Low
    status: str    # Open | In Progress | Remediated | Ignored
    detected_at: str
    recommended_action: str
    action_type: str  # create_pr | view_diff | view_details | unignore
    file_path: str
    line_number: int
    pattern: str
    detected_value: str
    branch: str = "main"
    commit: str = "9f8e7d6"
    last_seen: str
    occurrences: int = 1
    diff: SecretRemediationCodeDiff
    actions: SecretRemediationActionPlan


class SecretRemediationListResponse(BaseModel):
    items: List[SecretRemediationItem]
    total: int
    open_count: int = 18
    in_progress_count: int = 6
    remediated_count: int = 12
    ignored_count: int = 3


class UpdateRemediationStatusRequest(BaseModel):
    status: str  # Open | In Progress | Remediated | Ignored
    reason: Optional[str] = None


class BulkRemediateRequest(BaseModel):
    finding_ids: List[str]
    strategy: str = "create_pr"


class BulkRemediateResponse(BaseModel):
    success: bool = True
    processed_count: int
    prs_created: List[str]
    message: str


class RemediationSettings(BaseModel):
    auto_pr_enabled: bool = True
    require_approval: bool = True
    branch_prefix: str = "security/fix-"
    default_reviewers: List[str] = ["security-team", "mayur-bharvad"]
    secret_manager: str = "AWS Secrets Manager"
    auto_rescan_on_pr: bool = True


# ─────────────────────────────────────────────
# Secret Inventory Schemas (/code/secrets/inventory)
# ─────────────────────────────────────────────

class SecretInventoryMetrics(BaseModel):
    total_secrets: int = 18
    total_trend: str = "↑ 12%"
    critical: int = 3
    critical_trend: str = "↑ 50%"
    high: int = 7
    high_trend: str = "↑ 17%"
    medium: int = 6
    medium_trend: str = "↓ 14%"
    low: int = 2
    low_trend: str = "↓ 33%"


class SecretInventoryRow(BaseModel):
    id: str
    secret_title: str
    masked_value: str
    brand_icon: str
    type_label: str
    repository: str
    file_path: str
    severity: str  # Critical | High | Medium | Low
    status: str    # Open | In Progress | Resolved
    first_detected: str
    last_seen: str
    commit: str = "9f8e7d6"
    branch: str = "main"
    line_number: int = 16
    pattern: str = ""
    detected_value: str = ""


class SecretInventoryTableResponse(BaseModel):
    items: List[SecretInventoryRow]
    total: int = 18
    page: int = 1
    page_size: int = 10
    total_pages: int = 2


class UpdateInventoryStatusRequest(BaseModel):
    status: str  # Open | In Progress | Resolved
    reason: Optional[str] = None


class AddInventoryPolicyRequest(BaseModel):
    name: str
    secret_type: str
    severity: str = "Critical"
    action: str = "Block PR & Alert"
    description: Optional[str] = None
    enabled: bool = True


class AddInventoryPolicyResponse(BaseModel):
    id: str
    name: str
    secret_type: str
    severity: str
    action: str
    enabled: bool
    created_at: str
    message: str


# ─────────────────────────────────────────────
# Secret Detections Schemas (/code/secrets/detections)
# ─────────────────────────────────────────────

class SecretDetectionsKpis(BaseModel):
    total_findings: int = 18
    total_trend: str = "↑ 12%"
    critical_count: int = 3
    high_count: int = 7
    medium_count: int = 6
    low_count: int = 2
    resolved_count: int = 12
    resolved_trend: str = "↑ 20%"
    resolved_rate: str = "66% resolution rate"
    open_count: int = 6
    open_trend: str = "↓ 25%"
    open_subtitle: str = "requiring attention"
    repos_affected: int = 5
    repos_total: int = 8
    repos_trend: str = "↑ 17%"


class SecretDetectionsTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    total: int


class SecretDetectionsTypeBreakdown(BaseModel):
    label: str
    count: int
    percentage: int
    color: str


class SecretDetectionsSeverityBar(BaseModel):
    severity: str
    count: int
    color: str


class SecretDetectionsAnalytics(BaseModel):
    trends: List[SecretDetectionsTrendPoint]
    by_type: List[SecretDetectionsTypeBreakdown]
    by_severity: List[SecretDetectionsSeverityBar]


class SecretDetectionsOverviewResponse(BaseModel):
    kpis: SecretDetectionsKpis
    analytics: SecretDetectionsAnalytics


class SecretDetectionsItem(BaseModel):
    id: str
    secret_title: str
    masked_value: str
    brand_icon: str
    type_label: str
    repository: str
    file_path: str
    severity: str  # Critical | High | Medium | Low
    status: str    # Open | In Progress | Resolved
    first_detected: str
    last_seen: str
    commit: str = "9f8e7d6"
    branch: str = "main"
    line_number: int = 16
    pattern: str = ""
    detected_value: str = ""


class SecretDetectionsTableResponse(BaseModel):
    items: List[SecretDetectionsItem]
    total: int = 18
    page: int = 1
    page_size: int = 8
    total_pages: int = 3


class UpdateDetectionStatusRequest(BaseModel):
    status: str  # Open | In Progress | Resolved
    reason: Optional[str] = None


# ─────────────────────────────────────────────
# Secret Repositories & Mapping Schemas (/code/secrets/repositories)
# ─────────────────────────────────────────────

class SecretRepoKpis(BaseModel):
    total_repositories: int = 12
    repositories_with_secrets: int = 8
    repositories_with_secrets_trend: str = "↑ 33%"
    total_secrets_found: int = 18
    total_secrets_trend: str = "↑ 12%"
    high_risk_repositories: int = 3
    high_risk_trend: str = "↑ 50%"
    clean_repositories: int = 4
    clean_trend: str = "↓ 20%"


class SecretRepoBarItem(BaseModel):
    repository: str
    count: int
    color: str


class SecretRepoTypeBreakdown(BaseModel):
    label: str
    count: int
    percentage: int
    color: str


class SecretRepoRiskRank(BaseModel):
    rank: int
    repository: str
    risk_level: str  # Critical | High | Medium | Low | Clean
    secrets_count: int


class SecretRepoAnalytics(BaseModel):
    by_secret_count: List[SecretRepoBarItem]
    by_secret_type: List[SecretRepoTypeBreakdown]
    top_risk_repositories: List[SecretRepoRiskRank]


class SecretRepositoriesOverviewResponse(BaseModel):
    kpis: SecretRepoKpis
    analytics: SecretRepoAnalytics


class SecretRepositoryRow(BaseModel):
    id: str
    name: str
    organization: str = "NJ Group"
    visibility: str  # Private | Public
    secret_count: int
    critical: int
    high: int
    medium: int
    low: int
    last_scan: str
    status: str  # Issues Found | Clean
    default_branch: str = "main"
    open_findings: int = 0
    risk_level: str = "Low"  # Critical | High | Medium | Low | Clean
    top_secret_types: List[str] = []


class SecretRepositoriesTableResponse(BaseModel):
    items: List[SecretRepositoryRow]
    total: int = 12
    page: int = 1
    page_size: int = 10
    total_pages: int = 2


class TriggerRepoScanRequest(BaseModel):
    repository: Optional[str] = None
    repository_id: Optional[str] = None
    branch: Optional[str] = "main"


class TriggerRepoScanResponse(BaseModel):
    scan_id: str
    job_id: Optional[str] = None
    repository: str
    repository_id: Optional[str] = None
    branch: Optional[str] = None
    status: str = "QUEUED"
    message: str


# ─────────────────────────────────────────────
# Policies & Compliance Schemas (/code/settings/policies & /code/policies)
# ─────────────────────────────────────────────

class PolicyComplianceKpis(BaseModel):
    enforced_policies: int = 5
    enforced_policies_trend: str = "↑ 25%"
    compliance_frameworks: int = 3
    policy_violations: int = 12
    policy_violations_trend: str = "↓ 33%"
    compliance_score: int = 94
    compliance_score_trend: str = "↑ 6%"


class PolicyViolationsTrendPoint(BaseModel):
    date: str
    violations: int
    resolved: int


class PolicyTypeBreakdown(BaseModel):
    label: str
    count: int
    percentage: int
    color: str


class ComplianceFrameworkItem(BaseModel):
    id: str
    name: str
    enabled: bool
    controls_passed: int
    controls_total: int
    score_pct: Optional[int] = None
    badge_color: str = "#2563EB"


class PolicyEnforcementSettings(BaseModel):
    block_merge_on_violation: bool = True
    auto_remediate_safe_issues: bool = True
    notify_on_new_violations: bool = True
    enable_policy_exceptions: bool = True


class RecentPolicyViolationItem(BaseModel):
    id: str
    title: str
    severity: str  # Critical | High | Medium | Low
    time_ago: str
    repository: str
    file_path: str


class PolicyComplianceAnalytics(BaseModel):
    trends: List[PolicyViolationsTrendPoint]
    by_type: List[PolicyTypeBreakdown]
    frameworks: List[ComplianceFrameworkItem]
    enforcement_settings: PolicyEnforcementSettings
    recent_violations: List[RecentPolicyViolationItem]


class PolicyComplianceOverviewResponse(BaseModel):
    kpis: PolicyComplianceKpis
    analytics: PolicyComplianceAnalytics


class SecurityPolicyRow(BaseModel):
    id: str
    name: str
    type: str  # Secret | Dependency | Code | Container | IaC | Repository | PR
    scope: str  # All Repositories | docker/ | terraform/ | etc.
    status: str  # Enforced | Warning | Disabled
    violations: int
    last_updated: str
    icon_type: str
    description: Optional[str] = None
    compliance_frameworks: List[str] = []


class SecurityPoliciesTableResponse(BaseModel):
    items: List[SecurityPolicyRow]
    total: int = 8
    page: int = 1
    page_size: int = 10
    total_pages: int = 1


class CreateSecurityPolicyRequest(BaseModel):
    name: str
    type: str
    scope: str = "All Repositories"
    status: str = "Enforced"
    description: Optional[str] = None
    compliance_frameworks: List[str] = []


class UpdateSecurityPolicyRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    scope: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class EnforceAllPoliciesResponse(BaseModel):
    updated_count: int
    message: str


class PolicyTemplateItem(BaseModel):
    id: str
    name: str
    category: str
    framework: str
    description: str
    recommended_action: str


# ─────────────────────────────────────────────
# Secrets Integrations & Rotation (/code/secrets/integrations)
# ─────────────────────────────────────────────

class SecretIntegrationsKpis(BaseModel):
    connected_tools: int = 5
    connected_tools_subtitle: str = "CI/CD, Cloud, Issue Trackers"
    auto_rotation_rules: int = 8
    auto_rotation_rules_trend: str = "↑ 33%"
    auto_rotation_rules_subtitle: str = "Actively rotating secrets"
    secrets_rotated: int = 14
    secrets_rotated_trend: str = "↑ 75%"
    secrets_rotated_subtitle: str = "Last 30 days"
    integration_health_pct: int = 100
    integration_health_subtitle: str = "All systems operational"


class ConnectedToolCard(BaseModel):
    id: str
    name: str  # GitHub | GitLab | Jenkins | Azure DevOps | AWS | Kubernetes
    category: str  # scm | cicd | cloud | orchestrator
    status: str  # Connected | Not Connected
    description: str
    last_sync: str
    sync_minutes_ago: int
    icon_type: str
    config_url: Optional[str] = None


class SecretRotationRuleItem(BaseModel):
    id: str
    name: str
    secret_type: str
    repository_scope: str
    rotation_interval_days: int
    rotation_interval_label: str  # "90 days", "60 days", etc.
    next_rotation_date: str  # "Dec 29, 2026"
    status: str  # Active | Paused | Disabled
    icon_type: str


class RecentRotationActivityItem(BaseModel):
    id: str
    secret_name: str
    secret_type: str
    repository: str
    old_value_masked: str
    new_value_masked: str
    rotated_at: str
    status: str = "Success"
    icon_type: str


class IntegrationActivityEvent(BaseModel):
    id: str
    tool_name: str
    icon_type: str
    event_description: str
    repository: str
    time_ago: str
    status: str  # Success | Failed | Blocked


class RotationStatsTrendPoint(BaseModel):
    date: str  # "Sep 1", "Sep 5", ...
    rotated: int
    successful: int
    failed: int


class SecretsIntegrationConfig(BaseModel):
    webhook_url: str = "https://seculayer.com/webhook/wbh_live_9a8fbc72"
    api_token_masked: str = "sk_live_9f81a7b2c3d4e5f6a1b2c3d4e5f6a1b2"
    notification_email: str = "admin@njgroup.com"
    auto_create_issues: bool = True
    fail_cicd_builds: bool = True
    sync_with_external_tools: bool = True


class SecretIntegrationsOverviewResponse(BaseModel):
    kpis: SecretIntegrationsKpis
    connected_tools: List[ConnectedToolCard]
    rotation_rules: List[SecretRotationRuleItem]
    recent_activity: List[RecentRotationActivityItem]
    integration_activity: List[IntegrationActivityEvent]
    rotation_statistics: List[RotationStatsTrendPoint]
    config: SecretsIntegrationConfig


class CreateRotationRuleRequest(BaseModel):
    name: str
    secret_type: str
    repository_scope: str = "All Repositories"
    rotation_interval_days: int = 90
    status: str = "Active"


class UpdateRotationRuleRequest(BaseModel):
    name: Optional[str] = None
    secret_type: Optional[str] = None
    repository_scope: Optional[str] = None
    rotation_interval_days: Optional[int] = None
    status: Optional[str] = None


class TriggerRuleRotationResponse(BaseModel):
    rule_id: str
    activity_id: str
    status: str = "Success"
    rotated_at: str
    message: str


class ConnectIntegrationRequest(BaseModel):
    tool_id: str  # github | gitlab | jenkins | azure | aws | kubernetes
    credentials_key: Optional[str] = None
    endpoint_url: Optional[str] = None
    enabled: bool = True


class UpdateIntegrationConfigRequest(BaseModel):
    webhook_url: Optional[str] = None
    notification_email: Optional[str] = None
    auto_create_issues: Optional[bool] = None
    fail_cicd_builds: Optional[bool] = None
    sync_with_external_tools: Optional[bool] = None


class RotationGlobalSettings(BaseModel):
    default_rotation_interval_days: int = 60
    failure_retry_limit: int = 3
    slack_notifications_enabled: bool = True
    email_alerts_enabled: bool = True
    require_two_person_approval_for_prod: bool = False


# ─────────────────────────────────────────────
# Secret Inventory Detail (/code/secrets/inventory/[id]) Schemas
# ─────────────────────────────────────────────

class SecretRiskAssessment(BaseModel):
    risk_level: str = "Critical"
    risk_summary: str = "This secret provides programmatic access to AWS resources."
    risk_description: str = "This key can be used to access and modify AWS resources, leading to data breach, resource deletion, or unauthorized access."
    potential_impact: List[str] = [
        "Full access to AWS services (based on IAM permissions)",
        "Data exfiltration (S3, RDS, DynamoDB, etc.)",
        "Unauthorized resource creation/deletion",
        "Potential financial impact",
    ]


class SecretMetadataInfo(BaseModel):
    confidence: str = "98%"
    validation_status: str = "Valid (Active)"
    account_id: str = "123456789012"
    region: str = "ap-south-1"
    iam_user_role: str = "mayur-dev"
    permissions: str = "High Privileges"
    last_used: str = "Sep 28, 2026 14:22"
    source: str = "Source Code"
    age: str = "20 days"
    tags: List[str] = ["aws", "production", "high-risk"]


class SecretCodeSnippetLine(BaseModel):
    line_number: int
    content: str
    is_highlighted: bool = False


class SecretCodeContext(BaseModel):
    file_path: str
    repository: str
    branch: str
    commit: str
    start_line: int
    highlight_lines: List[int]
    lines: List[SecretCodeSnippetLine]


class SecretRepoHistoryCommit(BaseModel):
    commit_sha: str
    title: str
    author: str
    author_initials: str
    date: str
    is_culprit: bool = False


class SecretRecommendedActionItem(BaseModel):
    id: str  # revoke | rotate | remediate_pr
    title: str
    description: str
    action_type: str  # revoke | rotate | pr
    theme_color: str  # red | blue | purple


class SecretRelatedFindingItem(BaseModel):
    id: str
    title: str
    file_path: str
    severity: str
    date: str
    brand_icon: str


class SecretActivityLogEntry(BaseModel):
    id: str
    timestamp: str
    actor: str
    action: str
    details: str
    status: str


class SecretImpactService(BaseModel):
    service_name: str
    access_level: str
    resources_count: int
    risk: str


class SecretImpactAnalysis(BaseModel):
    blast_radius_score: int = 92
    affected_services: List[SecretImpactService]
    financial_liability_estimate: str = "$15,000 / month"
    network_exposure: str = "Public Internet via Cloudflare Gateway"


class SecretRemediationGuide(BaseModel):
    steps: List[str]
    git_purge_command: str
    aws_cli_revoke_command: str
    env_example: str


class SecretDetailResponse(BaseModel):
    id: str
    secret_title: str
    secret_type: str
    type_label: str
    brand_icon: str
    severity: str
    status: str
    description: str
    repository: str
    repository_visibility: str = "private repository"
    first_detected_date: str
    first_detected_time: str
    last_seen_date: str
    last_seen_time: str
    pattern: str
    masked_value: str
    detected_value: str
    file_path: str
    branch: str
    commit: str
    commit_sha: str
    author: str
    detection_method: str

    risk_assessment: SecretRiskAssessment
    metadata: SecretMetadataInfo
    code_context: SecretCodeContext
    repo_history: List[SecretRepoHistoryCommit]
    recommended_actions: List[SecretRecommendedActionItem]
    related_findings: List[SecretRelatedFindingItem]

    impact_analysis: SecretImpactAnalysis
    remediation_guide: SecretRemediationGuide
    activity_log: List[SecretActivityLogEntry]


class CreateSecretRemediationPRRequest(BaseModel):
    branch_name: str = "fix/rotate-aws-access-key"
    reviewers: List[str] = ["mayur-dev", "sec-team"]
    commit_message: str = "security(secrets): replace hardcoded AWS access key with env vars"
    replacement_env_var: str = "AWS_ACCESS_KEY_ID"


class CreateSecretRemediationPRResponse(BaseModel):
    pr_number: int
    pr_url: str
    branch_name: str
    title: str
    status: str = "Open"
    created_at: str
    message: str


class RevokeSecretKeyResponse(BaseModel):
    secret_id: str
    status: str = "Revoked"
    validation_status: str = "Revoked (Inactive)"
    revoked_at: str
    message: str


class RotateSecretKeyResponse(BaseModel):
    secret_id: str
    old_key_masked: str
    new_key_masked: str
    rotated_at: str
    message: str


# ─────────────────────────────────────────────
# Secret Detection Detail (/code/secrets/detections/[id]) Schemas
# ─────────────────────────────────────────────

class DetectionAiAnalysis(BaseModel):
    summary: str = (
        "This appears to be a valid AWS Access Key with high privileges. "
        "The key was found in a configuration file and is likely used for programmatic access to AWS services. "
        "It has been active recently, indicating it may still be in use."
    )
    potential_impact: List[str] = [
        "Full access to AWS services (based on IAM permissions)",
        "Data exfiltration (S3, RDS, DynamoDB, etc.)",
        "Unauthorized resource creation/deletion",
        "Potential financial impact",
        "Lateral movement to other cloud accounts",
    ]


class DetectionRemediationStep(BaseModel):
    step_number: int
    title: str
    description: str


class DetectionMetadata(BaseModel):
    account_id: str = "123456789012"
    region: str = "ap-south-1"
    environment: str = "production"
    permissions: str = "High Privileges"
    last_used: str = "Sep 28, 2026 14:22"
    source: str = "Source Code"
    tags: List[str] = ["aws", "production", "high-risk"]
    status: str = "Open"
    age: str = "20 days"
    rotation_required: str = "Yes"


class DetectionTimelineEvent(BaseModel):
    id: str
    timestamp: str
    message: str
    is_latest: bool = False
    badge_label: Optional[str] = None


class DetectionRelatedFinding(BaseModel):
    id: str
    title: str
    file_path: str
    severity: str
    date: str
    brand_icon: str


class SecretDetectionDetailResponse(BaseModel):
    id: str
    secret_title: str
    secret_type: str
    type_label: str
    brand_icon: str
    severity: str
    severity_subtitle: str = "High risk of unauthorized access"
    status: str
    status_subtitle: str = "Requires immediate action"
    description: str
    repository: str
    repository_visibility: str = "private repository"
    first_detected_date: str
    first_detected_time: str
    last_seen_date: str
    last_seen_time: str
    pattern: str
    detected_value: str
    masked_value: str
    file_path: str
    branch: str
    commit: str
    commit_sha: str
    author: str
    detection_method: str
    confidence_score: int = 98
    occurrences_label: str = "3 instances"

    code_context: SecretCodeContext
    ai_analysis: DetectionAiAnalysis
    remediation_steps: List[DetectionRemediationStep]
    metadata: DetectionMetadata
    related_findings: List[DetectionRelatedFinding]
    timeline: List[DetectionTimelineEvent]

class ConnectRepositoryRequest(BaseModel):
    repo_url: str
    default_branch: Optional[str] = "main"
    private: Optional[bool] = False
    trigger_scan: Optional[bool] = True
    project_id: Optional[str] = None


class ConnectRepositoryResponse(BaseModel):
    status: str
    id: str
    name: str
    full_name: str
    default_branch: str
    clone_url: Optional[str] = None
    html_url: Optional[str] = None
    project_id: Optional[str] = None
    scan_job_id: Optional[str] = None
    message: str
    repository_id: Optional[str] = None
    repository_name: Optional[str] = None

