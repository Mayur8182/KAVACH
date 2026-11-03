"""
Pydantic Schemas for CI/CD Pipelines API.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CICDRunStageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Stage name (e.g. Build, Test, Security Scan, Deploy)")
    status: str = Field(..., description="Success, Failed, Running, Skipped")
    duration_seconds: int = Field(0, description="Stage duration in seconds")


class CICDPipelineRunItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pipeline_id: Optional[str] = None
    pipeline_name: str
    branch: str
    trigger: str
    status: str
    duration_seconds: int
    duration_formatted: str
    started_at: datetime
    started_at_relative: str
    completed_at: Optional[datetime] = None
    commit_sha: str
    author: str
    security_issues_count: int
    critical_issues: int = 0
    high_issues: int = 0
    medium_issues: int = 0
    low_issues: int = 0
    stages: Optional[List[Dict[str, Any]]] = None
    logs: Optional[List[str]] = None
    evidence: Optional[Dict[str, Any]] = None


class CICDPipelineListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: List[CICDPipelineRunItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_branches: List[str]
    available_statuses: List[str]


class CICDTrendBucket(BaseModel):
    date: str
    label: str  # e.g. "Aug 30", "Sep 3"
    successful: int
    failed: int
    running: int
    total: int


class CICDStatusBreakdown(BaseModel):
    label: str  # Successful, Failed, Running, Cancelled
    count: int
    percentage: float
    color: str


class CICDStageAverage(BaseModel):
    stage: str
    duration_seconds: int
    duration_formatted: str
    color: str


class CICDEnvironmentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str  # Healthy, Degraded, Inactive
    icon_type: str  # github, eye
    commit_sha: Optional[str] = None
    last_deployed_at: Optional[datetime] = None
    last_deployed_relative: str
    url: Optional[str] = None


class CICDFindingsSummary(BaseModel):
    critical: int
    high: int
    medium: int
    low: int
    total: int


class CICDIntegrationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    provider_key: str
    status: str  # Connected, Not Connected
    icon_key: str


class CICDSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_pipelines: int
    total_change_pct: float
    successful_runs: int
    success_rate: float
    success_change_pct: float
    failed_runs: int
    failure_rate: float
    failure_change_pct: float
    running_runs: int
    running_rate: float
    avg_build_time_seconds: int
    avg_build_time_formatted: str
    avg_build_time_change_pct: float
    security_issues_count: int
    security_change_pct: float
    security_critical_count: int
    security_high_count: int
    trend_series: List[CICDTrendBucket]
    status_breakdown: List[CICDStatusBreakdown]
    stage_averages: List[CICDStageAverage]
    environments: List[CICDEnvironmentItem]
    findings_summary: CICDFindingsSummary
    integrations: List[CICDIntegrationItem]


class TriggerPipelineRunRequest(BaseModel):
    repository_id: str
    pipeline_name: Optional[str] = "Build & Deploy"
    branch: Optional[str] = "main"
    workflow_file: Optional[str] = ".github/workflows/ci.yml"
    environment: Optional[str] = "Production"
    trigger_type: Optional[str] = "Manual"


class TriggerPipelineRunResponse(BaseModel):
    run_id: str
    pipeline_name: str
    branch: str
    status: str
    message: str


class WorkflowYAMLResponse(BaseModel):
    repository_id: str
    workflow_file: str
    branch: str
    content: str


# =============================================================================
# PIPELINES TAB SCHEMAS
# =============================================================================

class CICDPipelineCreateRequest(BaseModel):
    repository_id: str
    name: str = Field(..., min_length=2, max_length=255)
    workflow_file: str = Field(".github/workflows/ci.yml", max_length=255)
    default_branch: str = Field("main", max_length=100)
    description: Optional[str] = None


class CICDArtifactItem(BaseModel):
    name: str
    size_bytes: int
    size_formatted: str
    file_type: str
    created_at: datetime
    download_url: str


class CICDPipelineRunDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pipeline_name: str
    run_number: int = 1024
    branch: str
    trigger: str
    status: str
    duration_seconds: int
    duration_formatted: str
    started_at: datetime
    started_at_formatted: str
    completed_at: Optional[datetime] = None
    commit_sha: str
    commit_message: Optional[str] = None
    author: str
    workflow_file: str = "ci-cd.yml"
    runs_on: str = "ubuntu-latest"
    environment: str = "Production"
    stages: List[Dict[str, Any]]
    completed_stages_count: int
    total_stages_count: int
    logs: List[str]
    security_issues_count: int
    critical_issues: int = 0
    high_issues: int = 0
    medium_issues: int = 0
    low_issues: int = 0
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    artifacts: List[CICDArtifactItem] = Field(default_factory=list)
    evidence: Optional[Dict[str, Any]] = None


# =============================================================================
# ENVIRONMENTS TAB SCHEMAS
# =============================================================================

class CICDEnvironmentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str
    icon_type: str
    version: str
    branch: str
    region: str
    url: Optional[str] = None
    last_deployed_at: Optional[datetime] = None
    last_deployed_relative: str
    uptime_str: str
    auto_deploy: bool
    commit_sha: Optional[str] = None
    response_time_ms: int
    cpu_usage_percent: int
    memory_usage_percent: int
    pods_ready: int
    pods_total: int
    deployments_history: List[Dict[str, Any]] = Field(default_factory=list)
    variables: List[Dict[str, Any]] = Field(default_factory=list)
    secrets: List[Dict[str, Any]] = Field(default_factory=list)


class CICDEnvironmentCreateRequest(BaseModel):
    repository_id: str
    name: str = Field(..., min_length=2, max_length=100)
    branch: str = Field("main", max_length=100)
    region: str = Field("Mumbai (ap-south-1)", max_length=100)
    url: Optional[str] = None
    auto_deploy: bool = True


class CICDEnvironmentDeployRequest(BaseModel):
    environment_id: str
    version: Optional[str] = None
    branch: Optional[str] = None


class CICDEnvironmentTrendPoint(BaseModel):
    date: str
    label: str
    successful_deployments: int
    failed_deployments: int
    response_time_ms: int


class CICDEnvironmentsOverviewResponse(BaseModel):
    environments: List[CICDEnvironmentDetail]
    total_environments: int
    healthy_count: int
    degraded_count: int
    failed_count: int
    inactive_count: int
    trend_series: List[CICDEnvironmentTrendPoint]
    status_distribution: List[Dict[str, Any]]
    comparison_table: List[Dict[str, Any]]


# =============================================================================
# INTEGRATIONS TAB SCHEMAS
# =============================================================================

class CICDIntegrationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    provider_key: str
    status: str
    icon_key: str
    category: str
    subtext: Optional[str] = None
    connection_endpoint: Optional[str] = None
    account: str
    repository_name: str
    branch: str
    url: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    last_sync_relative: str
    webhook_status: str
    events: List[str] = Field(default_factory=list)
    webhook_events: List[Dict[str, Any]] = Field(default_factory=list)
    created_by: str
    created_at_formatted: str
    permissions: List[str] = Field(default_factory=list)
    logs: List[Dict[str, Any]] = Field(default_factory=list)


class CICDIntegrationCreateRequest(BaseModel):
    project_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    provider_key: str = Field(..., min_length=2, max_length=100)
    category: str = Field("CI/CD", max_length=50)
    subtext: Optional[str] = None
    connection_endpoint: Optional[str] = None
    url: Optional[str] = None
    account: Optional[str] = "nj-group"
    repository_name: Optional[str] = "frontend-app"


class CICDIntegrationTestResponse(BaseModel):
    integration_id: str
    status: str
    latency_ms: int
    message: str
    tested_at: datetime


class CICDIntegrationSyncResponse(BaseModel):
    integration_id: str
    status: str
    message: str
    last_sync_at: datetime
    last_sync_relative: str


class CICDIntegrationsOverviewResponse(BaseModel):
    integrations: List[CICDIntegrationDetail]
    total_connected: int
    connected_pct_change: float
    total_active: int
    active_rate_pct: float
    total_failed: int
    failed_change_pct: float
    failure_rate_pct: float
    last_sync_relative: str
    total_webhooks: int
    active_webhooks: int
    inactive_webhooks: int
    categories: List[Dict[str, Any]]


# =============================================================================
# TEMPLATES TAB SCHEMAS
# =============================================================================

class CICDTemplateDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    category: str
    type: str
    framework: str
    description: str
    is_official: bool
    is_custom: bool
    is_popular: bool
    tags: List[str]
    maintained_by: str
    last_updated: str
    usage_count: int
    usage_count_formatted: str
    rating: str
    rating_count: int
    workflow_yaml: str
    included_steps: List[Dict[str, Any]]
    variables: List[Dict[str, Any]] = Field(default_factory=list)
    icon_key: str


class CICDTemplateCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field("Web Application", max_length=100)
    type: str = Field("CI/CD Pipeline", max_length=100)
    framework: str = Field("Next.js", max_length=100)
    description: str
    tags: List[str] = Field(default_factory=list)
    workflow_yaml: str
    variables: Optional[List[Dict[str, Any]]] = None


class CICDUseTemplateRequest(BaseModel):
    template_id: str
    repository_id: str
    pipeline_name: Optional[str] = None
    branch: Optional[str] = "main"


class CICDUseTemplateResponse(BaseModel):
    pipeline_id: str
    pipeline_name: str
    workflow_file: str
    status: str
    message: str


class CICDTemplatesOverviewResponse(BaseModel):
    templates: List[CICDTemplateDetail]
    total_templates: int
    official_count: int
    custom_count: int
    recently_used_count: int
    popular_template_slug: str
    total_change_pct: float
    page: int
    page_size: int
    total_pages: int
    available_categories: List[str]
    available_types: List[str]
    available_frameworks: List[str]


# =============================================================================
# JOBS TAB SCHEMAS
# =============================================================================

class CICDJobItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_number: int
    job_name: str
    pipeline_name: str
    status: str  # Success, Failed, Running, Pending, Blocked
    duration_seconds: int
    duration_formatted: str
    started_at: datetime
    started_at_relative: str
    runner: str
    commit_sha: str
    commit_message: str
    workflow_file: str
    step: str
    environment: str
    run_id_str: str
    failure_reason: Optional[str] = None
    security_findings_count: int = 0


class CICDJobDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_number: int
    job_name: str
    pipeline_name: str
    status: str
    duration_seconds: int
    duration_formatted: str
    started_at: datetime
    started_at_formatted: str
    started_at_relative: str
    completed_at: Optional[datetime] = None
    runner: str
    commit_sha: str
    commit_message: str
    workflow_file: str
    step: str
    environment: str
    run_id_str: str
    failure_reason: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    security_findings_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    related_links: Dict[str, Any] = Field(default_factory=dict)


class CICDJobsOverviewResponse(BaseModel):
    items: List[CICDJobItem]
    selected_job: Optional[CICDJobDetailResponse] = None
    total_jobs: int
    total_change_pct: float
    successful_jobs: int
    success_rate_pct: float
    success_change_pct: float
    failed_jobs: int
    failure_rate_pct: float
    failure_change_pct: float
    running_jobs: int
    running_rate_pct: float
    avg_duration_seconds: int
    avg_duration_formatted: str
    avg_duration_change_pct: float
    blocked_jobs: int
    blocked_rate_pct: float
    blocked_change_pct: float
    page: int
    page_size: int
    total_pages: int
    available_pipelines: List[str]
    available_statuses: List[str]


class CICDJobRerunResponse(BaseModel):
    job_id: str
    status: str
    message: str
    started_at: datetime


# =============================================================================
# PIPELINE RUNS TAB SCHEMAS
# =============================================================================

class CICDPipelineRunsOverviewResponse(BaseModel):
    runs: List[CICDPipelineRunItem]
    active_run: Optional[CICDPipelineRunDetailResponse] = None
    total_runs: int
    total_change_pct: float
    successful_runs: int
    success_rate_pct: float
    success_change_pct: float
    failed_runs: int
    failure_rate_pct: float
    failure_change_pct: float
    running_runs: int
    running_rate_pct: float
    avg_build_time_seconds: int
    avg_build_time_formatted: str
    avg_build_time_change_pct: float
    security_issues_count: int
    security_change_pct: float
    critical_issues_count: int
    high_issues_count: int
    page: int
    page_size: int
    total_pages: int
    available_statuses: List[str]


# =============================================================================
# WORKFLOW EDITOR TAB SCHEMAS
# =============================================================================

class CICDWorkflowStepItem(BaseModel):
    id: str
    name: str
    action_or_command: str
    icon: str
    status: str = "Success"
    order: int


class CICDWorkflowConfigResponse(BaseModel):
    repository_id: str
    workflow_file: str
    name: str
    description: str
    provider: str = "GitHub Actions"
    trigger_events: Dict[str, bool]
    node_version: str
    build_command: str
    test_command: str
    deployment_target: str
    deploy_to_production: bool
    workflow_yaml: str
    steps: List[CICDWorkflowStepItem]
    variables: List[Dict[str, Any]] = Field(default_factory=list)


class CICDWorkflowSaveRequest(BaseModel):
    repository_id: str
    workflow_file: Optional[str] = ".github/workflows/ci-cd.yml"
    name: str
    description: Optional[str] = None
    trigger_events: Optional[Dict[str, bool]] = None
    node_version: Optional[str] = "20"
    build_command: Optional[str] = "npm run build"
    test_command: Optional[str] = "npm test -- --coverage"
    deployment_target: Optional[str] = "Vercel"
    deploy_to_production: Optional[bool] = True
    workflow_yaml: str
    steps: Optional[List[Dict[str, Any]]] = None


class CICDWorkflowSaveResponse(BaseModel):
    status: str
    message: str
    workflow_file: str
    saved_at: datetime


