import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GitHubStatusResponse(BaseModel):
    """GitHub integration configuration and connectivity status for a project."""
    configured: bool
    status: str = Field(description="CONFIGURED | NOT_CONFIGURED | AUTHENTICATION_FAILED | ERROR")
    app_id: Optional[str] = None
    app_name: Optional[str] = None
    client_id: Optional[str] = None
    public_url: Optional[str] = None
    message: Optional[str] = None
    installations_count: int = 0
    connected_repos_count: int = 0


class GitHubRepositoryResponse(BaseModel):
    """Connected GitHub repository details."""
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    installation_id: Optional[uuid.UUID] = None
    github_repository_id: int
    owner: str
    name: str
    full_name: str
    default_branch: str
    private: bool
    html_url: str
    clone_url: str
    visibility: str
    archived: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectRepositoryRequest(BaseModel):
    """Payload to connect a discovered GitHub repository to a project."""
    github_repository_id: int
    owner: str
    name: str
    full_name: str
    default_branch: str = "main"
    private: bool = True
    html_url: str
    clone_url: str
    installation_id: Optional[int] = None


class TriggerRepositoryScanRequest(BaseModel):
    """Manual scan trigger for a connected GitHub repository."""
    ref: Optional[str] = Field(default=None, description="Branch or tag name (e.g. 'main')")
    branch: Optional[str] = Field(default=None, description="Branch name alias matching frontend payloads")
    commit_sha: Optional[str] = Field(default=None, description="Exact 40-character commit SHA")
    event_type: Optional[str] = Field(default="manual_scan", description="Scan event trigger type")


class GitHubSecurityJobResponse(BaseModel):
    """Status and result of a GitHub-triggered security pipeline job."""
    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    repository_id: Optional[uuid.UUID] = None
    event_type: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    pull_request_number: Optional[int] = None
    status: str
    scan_id: Optional[uuid.UUID] = None
    decision_id: Optional[uuid.UUID] = None
    check_run_id: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    # UI Rich Fields
    job_number: Optional[str] = None
    job_name: Optional[str] = None
    job_type: Optional[str] = None  # SAST, Container, Dependency, IaC, Secrets, License
    duration_str: Optional[str] = None
    triggered_by: Optional[str] = None
    findings_count: Optional[int] = None
    scan_summary: Optional[Dict[str, int]] = None
    findings_by_category: Optional[List[Dict[str, Any]]] = None
    recent_logs: Optional[List[str]] = None

    # Real-time scan pipeline stage tracking
    current_stage: Optional[str] = None
    current_stage_index: Optional[int] = None
    total_stages: Optional[int] = None
    stage_progress: Optional[int] = None
    files_scanned: Optional[int] = None
    rules_evaluated: Optional[int] = None
    elapsed_seconds: Optional[int] = None

    class Config:
        from_attributes = True


class RunSecurityJobRequest(BaseModel):
    """Payload to trigger execution of a new security job."""
    job_name: Optional[str] = Field(default=None, description="Custom name for the security job")
    job_type: str = Field(default="SAST", description="SAST | Dependency | Container | IaC | Secrets | License")
    branch: Optional[str] = Field(default="main", description="Target branch")
    triggered_by: Optional[str] = Field(default="Manual", description="Manual | Push | Scheduled | Pull Request")
    repository_id: Optional[uuid.UUID] = None


class SecurityJobStatusDistribution(BaseModel):
    label: str
    count: int
    percentage: int
    color: str


class SecurityJobTrendItem(BaseModel):
    date: str
    successful: int
    failed: int
    in_progress: int


class SecurityJobTypeCount(BaseModel):
    type: str
    count: int
    color: str


class SecurityJobsOverviewResponse(BaseModel):
    total_jobs: int
    successful_jobs: int
    failed_jobs: int
    in_progress_jobs: int
    scheduled_jobs: int
    cancelled_jobs: int = 0
    queued_jobs: int = 0
    total_trend: str
    success_rate: int
    failed_rate: int
    in_progress_rate: int
    status_distribution: List[SecurityJobStatusDistribution]
    trend_data: List[SecurityJobTrendItem]
    top_job_types: List[SecurityJobTypeCount]
    jobs: List[GitHubSecurityJobResponse]
    total: int
    page: int
    page_size: int


class SecurityJobIntegrationItem(BaseModel):
    id: uuid.UUID
    name: str
    provider_key: str
    description: str
    status: str
    is_available: bool = False
    icon_key: str
    category: str
    last_sync_at: Optional[datetime] = None
    repository_name: str = "frontend-app"
    branch_filter: str = "main, develop, feature/*"
    events: Optional[List[str]] = None
    webhook_events: Optional[List[Dict[str, Any]]] = None
    logs: Optional[List[str]] = None
    config: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class SecurityJobIntegrationsOverviewResponse(BaseModel):
    connected_count: int
    connected_trend: str
    disconnected_count: int
    disconnected_rate: int
    available_count: int
    success_rate: int
    success_rate_trend: str
    configured_integrations: List[SecurityJobIntegrationItem]
    available_integrations: List[SecurityJobIntegrationItem]


class UpdateIntegrationConfigRequest(BaseModel):
    repository_name: Optional[str] = None
    branch_filter: Optional[str] = None
    events: Optional[List[str]] = None
    config: Optional[Dict[str, Any]] = None


class TestIntegrationResponse(BaseModel):
    integration_id: str
    status: str
    message: str
    latency_ms: int
    tested_at: str


class JobHistoryTrendItem(BaseModel):
    date: str
    successful: int
    failed: int
    cancelled: int
    skipped: int


class ScanTypeDistributionItem(BaseModel):
    type: str
    count: int
    percentage: int
    color: str


class AverageDurationInfo(BaseModel):
    formatted: str
    seconds: int
    trend: str
    sparkline: List[int]
    earliest_run: str
    earliest_run_time: str
    latest_run: str
    latest_run_time: str


class SecurityJobHistoryResponse(BaseModel):
    total_runs: int
    total_trend: str
    successful_runs: int
    successful_rate: int
    failed_runs: int
    failed_rate: int
    cancelled_runs: int
    cancelled_rate: int
    skipped_runs: int
    skipped_rate: int
    trend_data: List[JobHistoryTrendItem]
    scan_type_distribution: List[ScanTypeDistributionItem]
    duration_info: AverageDurationInfo
    runs: List[GitHubSecurityJobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SecurityJobScheduleItem(BaseModel):
    id: uuid.UUID
    repository_id: Optional[uuid.UUID] = None
    name: str
    scan_type: str
    target: str
    branch: str
    frequency: str
    frequency_type: str
    time_utc: str
    next_run_at: Optional[datetime] = None
    status: str
    run_only_on_changes: bool = True
    notify_on_completion: bool = True
    fail_on_high_severity: bool = False
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateSecurityJobScheduleRequest(BaseModel):
    name: str
    scan_type: str
    target: str = "repository"
    branch: str = "main"
    frequency: str = "Daily"
    time_utc: str = "01:00 AM"
    run_only_on_changes: bool = True
    notify_on_completion: bool = True
    fail_on_high_severity: bool = False


class UpdateSecurityJobScheduleRequest(BaseModel):
    name: Optional[str] = None
    scan_type: Optional[str] = None
    target: Optional[str] = None
    branch: Optional[str] = None
    frequency: Optional[str] = None
    time_utc: Optional[str] = None
    status: Optional[str] = None
    run_only_on_changes: Optional[bool] = None
    notify_on_completion: Optional[bool] = None
    fail_on_high_severity: Optional[bool] = None


class SecurityJobSchedulesOverviewResponse(BaseModel):
    total_schedules: int
    total_trend: str
    active_count: int
    active_rate: int
    paused_count: int
    paused_rate: int
    failed_count: int
    failed_rate: int
    schedules: List[SecurityJobScheduleItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class SecurityJobReportItem(BaseModel):
    id: uuid.UUID
    repository_id: Optional[uuid.UUID] = None
    report_number: str
    name: str
    scan_type: str
    branch: str
    status: str
    risk_score: float
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    format: str
    file_size_kb: int
    summary: Optional[str] = None
    generated_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateSecurityJobReportRequest(BaseModel):
    name: str
    scan_type: str = "SAST"
    branch: str = "main"
    format: str = "PDF"
    include_summary: bool = True
    include_vulnerabilities: bool = True
    include_remediation: bool = True


class FindingsTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class SeverityDistribution(BaseModel):
    total_findings: int
    critical_count: int
    critical_percentage: int
    high_count: int
    high_percentage: int
    medium_count: int
    medium_percentage: int
    low_count: int
    low_percentage: int


class ScanTypeReportCount(BaseModel):
    scan_type: str
    count: int
    color: str


class SecurityJobReportsOverviewResponse(BaseModel):
    total_reports: int
    new_trend: str
    passed_reports: int
    passed_rate: int
    reports_with_findings: int
    findings_rate: int
    in_progress_reports: int
    in_progress_rate: int
    failed_reports: int
    failed_rate: int
    findings_trend: List[FindingsTrendPoint]
    severity_distribution: SeverityDistribution
    scan_type_distribution: List[ScanTypeReportCount]
    reports: List[SecurityJobReportItem]
    total: int
    page: int
    page_size: int
    total_pages: int





class GitHubPullRequestResponse(BaseModel):
    """Persisted GitHub pull request metadata."""
    id: uuid.UUID
    repository_id: uuid.UUID
    github_pr_id: int
    number: int
    title: str
    state: str
    head_sha: str
    base_sha: str
    head_ref: str
    base_ref: str
    author_login: Optional[str] = None
    draft: bool = False
    merged: bool = False
    html_url: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True


class GitHubCommitResponse(BaseModel):
    """Persisted commit record for a connected repository."""
    id: uuid.UUID
    repository_id: uuid.UUID
    sha: str
    branch: Optional[str] = None
    author_login: Optional[str] = None
    message: Optional[str] = None
    committed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebhookResponse(BaseModel):
    """Immediate acknowledgement returned to GitHub upon receipt of webhook delivery."""
    delivery_id: str
    status: str = Field(description="RECEIVED | DUPLICATE | IGNORED")
    message: str
