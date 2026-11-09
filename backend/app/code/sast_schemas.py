"""
Thing Code — SAST Overview & Security Dashboard Schemas
Pydantic contracts strictly enforcing real database aggregation responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SASTOverviewCards(BaseModel):
    total_findings: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total_change: Optional[str] = None
    critical_change: Optional[str] = None
    high_change: Optional[str] = None
    medium_change: Optional[str] = None
    low_change: Optional[str] = None


class SASTFindingsByStatus(BaseModel):
    open: int = 0
    in_progress: int = 0
    resolved: int = 0
    false_positive: int = 0
    ignored: int = 0
    total: int = 0


class SASTTrendPoint(BaseModel):
    date: str
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0
    new_findings: int = 0
    resolved_findings: int = 0


class SASTOverviewResponse(BaseModel):
    cards: SASTOverviewCards
    trend_series: List[SASTTrendPoint] = []
    status_distribution: SASTFindingsByStatus
    has_scans: bool = False
    selected_repository: Optional[str] = None
    selected_branch: Optional[str] = None


class SASTTrendsSummary(BaseModel):
    total_findings: int = 0
    new_findings: int = 0
    resolved_findings: int = 0
    net_change: int = 0
    total_change_pct: Optional[str] = None
    new_change_pct: Optional[str] = None
    resolved_change_pct: Optional[str] = None


class SASTSeverityTrendRow(BaseModel):
    severity: str
    dates: Dict[str, int] = {}
    change_pct: Optional[str] = None


class SASTTrendsResponse(BaseModel):
    series: List[SASTTrendPoint] = []
    summary: SASTTrendsSummary
    severity_trends: List[SASTSeverityTrendRow] = []


class SASTSeverityDistributionRow(BaseModel):
    severity: str
    count: int = 0
    percentage: float = 0.0
    open: int = 0
    in_progress: int = 0
    resolved: int = 0
    false_positive: int = 0
    ignored: int = 0


class SASTSeverityResponse(BaseModel):
    total_findings: int = 0
    distribution: List[SASTSeverityDistributionRow] = []
    history_series: List[SASTTrendPoint] = []


class SASTCategoryItem(BaseModel):
    category: str
    count: int = 0
    percentage: float = 0.0


class SASTCategoriesResponse(BaseModel):
    total_findings: int = 0
    categories: List[SASTCategoryItem] = []


class SASTRecentFindingItem(BaseModel):
    id: str
    display_id: str
    title: str
    severity: str
    category: str
    file_path: str
    line_number: Optional[int] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    repository: str
    repository_id: Optional[str] = None
    detected_at: Optional[str] = None
    first_detected: Optional[str] = None
    last_detected: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    snippet: Optional[str] = None
    rule_id: str
    cwe: Optional[str] = None
    cwe_title: Optional[str] = None
    owasp: Optional[str] = None
    confidence: Optional[str] = "HIGH"
    reachability: Optional[str] = "REACHABLE"
    is_confirmed: bool = True
    is_new: bool = False
    remediation_advice: Optional[str] = None
    remediation_patch: Optional[str] = None
    scanner_source: Optional[str] = "Semgrep AST Engine"
    detecting_agent: Optional[str] = "SAST Agent"
    commit_sha: Optional[str] = None
    branch: Optional[str] = "main"
    fingerprint: Optional[str] = None
    source_sink_flow: Optional[Dict[str, Any]] = None


class SASTRecentFindingsResponse(BaseModel):
    items: List[SASTRecentFindingItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 10


class SASTScanItem(BaseModel):
    id: str
    scan_id_display: str
    repository: str
    repository_id: Optional[str] = None
    branch: str
    commit_sha: Optional[str] = None
    status: str  # Running, Completed, Failed, Queued, Scheduled, Partial
    orchestration_status: Optional[str] = "COMPLETED"
    process_status: Optional[str] = "Exit Code 0: Clean"
    security_result: Optional[str] = None
    files_scanned: int = 0
    files_skipped: int = 0
    overall_quality: str = "COMPLETE"  # COMPLETE, PARTIAL, INCOMPLETE
    scanner_name: Optional[str] = "Semgrep"
    scanner_version: Optional[str] = "1.68.0"
    progress: int = 0
    findings_count: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration: Optional[str] = None
    error_message: Optional[str] = None
    trigger: str = "manual"


class SASTScanStatusCounts(BaseModel):
    all: int = 0
    running: int = 0
    completed: int = 0
    failed: int = 0
    scheduled: int = 0


class SASTScanStatusResponse(BaseModel):
    counts: SASTScanStatusCounts
    items: List[SASTScanItem] = []
    total: int = 0


class TriggerScanRequest(BaseModel):
    repository_id: Optional[str] = None
    branch: Optional[str] = "main"
    scan_type: Optional[str] = "SAST"
    ruleset: Optional[str] = "standard"


class ScanPullRequestRequest(BaseModel):
    repository_id: str
    pull_request_number: int
    branch: Optional[str] = None


class ScheduleScanRequest(BaseModel):
    repository_id: str
    branch: str = "main"
    frequency: str = "Daily"
    time_utc: str = "01:00 AM"
    timezone: str = "UTC"
    enabled: bool = True


class UpdateFindingRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class SASTScheduleItem(BaseModel):
    id: str
    repository: str
    repository_id: Optional[str] = None
    branch: str
    frequency: str
    time_utc: str
    next_run_at: Optional[str] = None
    status: str = "Active"


class SASTScannerExecutionItem(BaseModel):
    id: str
    scanner_name: str
    scanner_type: str
    status: str
    command: Optional[str] = None
    exit_code: Optional[int] = None
    finding_count: int = 0
    duration_ms: Optional[int] = None
    stdout_summary: Optional[str] = None
    stderr_output: Optional[str] = None


class SASTScanDetailResponse(BaseModel):
    id: str
    scan_id_display: str
    repository: str
    repository_id: Optional[str] = None
    branch: str
    commit_sha: Optional[str] = None
    status: str
    progress: int = 0
    findings_count: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration: Optional[str] = None
    error_message: Optional[str] = None
    trigger: str = "manual"
    executions: List[SASTScannerExecutionItem] = []
    findings: List[SASTRecentFindingItem] = []
    logs: List[str] = []


class SASTExportResponse(BaseModel):
    total_findings: int
    repository: Optional[str] = None
    generated_at: str
    findings: List[Dict[str, Any]] = []


class SASTRuleItem(BaseModel):
    id: str
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    category: str  # SAST, SECRETS, IAC, DEPENDENCIES
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    pattern: Optional[str] = None
    scanner: str = "Semgrep / SecuLayer Builtin"
    enabled: bool = True
    is_custom: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SASTRulesResponse(BaseModel):
    total: int = 0
    enabled_count: int = 0
    disabled_count: int = 0
    custom_count: int = 0
    rules: List[SASTRuleItem] = []


class CreateSASTRuleRequest(BaseModel):
    rule_id: Optional[str] = None
    title: str
    description: str
    severity: str = "HIGH"
    category: str = "SAST"
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    pattern: str
    enabled: bool = True


class UpdateSASTRuleRequest(BaseModel):
    enabled: Optional[bool] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    pattern: Optional[str] = None


# ── Baselines Models ──────────────────────────────────────────────────────────
class SASTBaselineItem(BaseModel):
    id: str
    repository_id: str
    repository_name: str
    branch: str
    commit_sha: str
    established_at: str
    established_by: str
    total_findings_at_baseline: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    status: str = "ACTIVE"
    note: Optional[str] = None


class SASTBaselinesResponse(BaseModel):
    total: int = 0
    items: List[SASTBaselineItem] = []


class CreateSASTBaselineRequest(BaseModel):
    repository_id: str
    branch: str = "main"
    scan_id: Optional[str] = None
    note: Optional[str] = None


# ── Exceptions Models ─────────────────────────────────────────────────────────
class SASTExceptionItem(BaseModel):
    id: str
    finding_id: Optional[str] = None
    rule_id: str
    rule_title: str
    file_path: Optional[str] = None
    repository_name: Optional[str] = None
    severity: str
    justification: str
    created_by: str
    created_at: str
    expires_at: str
    status: str = "ACTIVE"  # ACTIVE, EXPIRED, REVOKED
    approved_by: Optional[str] = None


class SASTExceptionsResponse(BaseModel):
    total: int = 0
    active_count: int = 0
    expired_count: int = 0
    revoked_count: int = 0
    items: List[SASTExceptionItem] = []


class CreateSASTExceptionRequest(BaseModel):
    finding_id: Optional[str] = None
    rule_id: str
    file_path: Optional[str] = None
    repository_id: Optional[str] = None
    severity: str = "HIGH"
    justification: str
    expires_in_days: int = 30


class UpdateSASTExceptionRequest(BaseModel):
    status: Optional[str] = None  # REVOKED, ACTIVE
    justification: Optional[str] = None


# ── Coverage Models ───────────────────────────────────────────────────────────
class SASTLanguageCoverage(BaseModel):
    language: str
    file_count: int
    lines_of_code: int
    scanned_percentage: float
    rules_applied: int


class SASTCoverageItem(BaseModel):
    repository_id: str
    repository_name: str
    default_branch: str
    total_files: int
    total_loc: int
    overall_coverage_pct: float
    languages: List[SASTLanguageCoverage] = []
    last_scan_at: Optional[str] = None


class SASTCoverageResponse(BaseModel):
    total_repositories: int = 0
    overall_coverage_pct: float = 0.0
    items: List[SASTCoverageItem] = []


# ── Scan Logs & Compare Models ────────────────────────────────────────────────
class SASTScanLogsResponse(BaseModel):
    scan_id: str
    status: str
    engine: str = "Semgrep OSS / Pro Engine"
    cli_command: str
    exit_code: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    logs: List[str] = []
    diagnostics: Dict[str, Any] = {}


class SASTScanCompareResponse(BaseModel):
    base_scan_id: str
    compare_scan_id: str
    repository: str
    base_commit: str
    compare_commit: str
    new_findings: List[SASTRecentFindingItem] = []
    fixed_findings: List[SASTRecentFindingItem] = []
    persisting_findings: List[SASTRecentFindingItem] = []
    summary: Dict[str, int] = {}



