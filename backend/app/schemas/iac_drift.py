"""
Pydantic Schemas for Infrastructure as Code (IaC) Drift Detection.
Strict deterministic types for all Drift detection endpoints.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IaCDriftEventItem(BaseModel):
    id: str
    resource_id: str
    timestamp: str
    event_type: str  # Configuration, Rule Change, Deleted, In Sync, Tags Updated
    title: str
    description: str
    status: str      # Drifted, In Sync, Ignored
    severity: str    # error, warning, info, success
    diff_payload: Optional[Dict[str, Any]] = None


class IaCDriftOverviewResponse(BaseModel):
    monitored_count: int = Field(..., description="Total tracked infrastructure resources")
    drifted_count: int = Field(..., description="Resources with active drift detected")
    in_sync_count: int = Field(..., description="Resources matching desired state")
    ignored_count: int = Field(..., description="Resources explicitly excluded from drift")
    in_sync_percent: float = Field(..., description="Percentage in sync")
    drifted_percent: float = Field(..., description="Percentage drifted")
    ignored_percent: float = Field(..., description="Percentage ignored")
    time_filter: str = Field("Last 30 days")
    recent_events: List[IaCDriftEventItem] = Field(default_factory=list)


class IaCDriftResourceItem(BaseModel):
    id: str
    name: str
    resource_id: str
    provider: str
    resource_type: str
    drift_status: str
    region: str
    workspace: str
    last_detected: str
    last_detected_relative: str
    desired_hcl: str
    actual_hcl: str
    diff_summary: Optional[str] = None
    remediation_plan: Optional[str] = None
    is_ignored: bool = False
    ignore_reason: Optional[str] = None


class IaCDriftResourcesPage(BaseModel):
    items: List[IaCDriftResourceItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class IaCDriftConfigDTO(BaseModel):
    resource_id: str
    enable_drift_detection: bool = True
    compare_terraform_state: bool = True
    include_tags: bool = True
    ignore_metadata_changes: bool = True
    auto_resolve_known: bool = False
    scan_frequency: str = "Every 6 hours"
    scope_configuration: bool = True
    scope_tags: bool = True
    scope_permissions: bool = True
    scope_network: bool = False
    scope_encryption: bool = True
    scope_lifecycle: bool = False
    notify_on_detection: bool = True
    notify_on_resolution: bool = True
    severity_threshold: str = "Medium and above"
    notification_channels: List[str] = Field(default_factory=lambda: ["frontend-team", "security-team"])


class IaCBaselineStateDTO(BaseModel):
    workspace: str = "production"
    comparison_source: str = "terraform_state"
    state_file: str = "s3://tf-state/prod/terraform.tfstate"
    last_updated_at: str
    resources_tracked: int = 12
    normalize_values: bool = True
    ignore_computed_fields: bool = True
    custom_ignore_rules: str = 'tags["last_updated"], metadata.*'
    available_state_files: List[str] = Field(default_factory=list)


class IaCBaselineCompareRequest(BaseModel):
    state_file: str
    workspace: Optional[str] = "production"
    normalize_values: Optional[bool] = True
    ignore_computed_fields: Optional[bool] = True
    custom_ignore_rules: Optional[str] = None


class IaCBaselineCompareResult(BaseModel):
    compared_at: str
    state_file: str
    total_resources: int
    drift_count: int
    in_sync_count: int
    summary_message: str
    diff_details: List[Dict[str, Any]] = Field(default_factory=list)


class IaCRemediationPlanResponse(BaseModel):
    resource_id: str
    resource_name: str
    provider: str
    plan_hcl: str
    target_action: str
    generated_at: str


class IaCApplyRemediationRequest(BaseModel):
    auto_approve: Optional[bool] = True
    comment: Optional[str] = None


class IaCApplyRemediationResponse(BaseModel):
    success: bool
    resource_id: str
    status: str
    message: str
    applied_at: str
    updated_resource: IaCDriftResourceItem


class IaCIgnoreResourceRequest(BaseModel):
    reason: str = "Accepted difference by security team"


class IaCIgnoredResourceItem(BaseModel):
    id: str
    resource_pattern: str
    reason: str
    added_by: str
    created_at: str


class IaCCreateIgnoredPatternRequest(BaseModel):
    resource_pattern: str
    reason: str
    added_by: Optional[str] = "@platform-team"


class IaCDriftGlobalSettingsDTO(BaseModel):
    enable_drift_globally: bool = True
    default_scan_frequency: str = "Every 6 hours"
    parallel_scanning: bool = True
    retry_on_failure: bool = True
    max_retries: int = 3
    timeout_minutes: int = 10
    notify_on_new_drift: bool = True
    notify_on_drift_resolution: bool = True
    daily_summary_report: bool = False
    weekly_compliance_report: bool = True
    ignored_resources: List[IaCIgnoredResourceItem] = Field(default_factory=list)


# =========================================================================
# SECTION 10: DRIFT DETECTION SUITE (SCREENS 10.1 THROUGH 10.8)
# =========================================================================

class IaCDriftSuiteKpis(BaseModel):
    total_resources: int = 24
    drifted: int = 8
    in_sync: int = 12
    not_tracked: int = 4


class IaCDriftTrendPoint(BaseModel):
    date: str
    drifted: int
    in_sync: int
    not_tracked: int


class IaCDriftRecentEvent(BaseModel):
    time: str
    resource: str
    environment: str
    change_type: str  # Modified, Deleted, Added
    status: str       # Drifted, In Sync


class IaCDriftSuiteOverviewResponse(BaseModel):
    kpis: IaCDriftSuiteKpis
    trend: List[IaCDriftTrendPoint] = Field(default_factory=list)
    recent_events: List[IaCDriftRecentEvent] = Field(default_factory=list)
    available_environments: List[str] = Field(
        default_factory=lambda: ["All Environments", "production", "staging", "dev", "qa", "sandbox"]
    )


class IaCDriftEnvironmentItem(BaseModel):
    name: str
    provider: str  # AWS, Azure, GCP
    region: str
    status: str    # Drifted, In Sync, Not Tracked
    last_scan: str


class IaCDriftEnvironmentsResponse(BaseModel):
    items: List[IaCDriftEnvironmentItem] = Field(default_factory=list)
    total: int = 0


class CreateDriftEnvironmentRequest(BaseModel):
    name: str
    provider: str = "AWS"
    region: str = "us-east-1"


class IaCDriftChangeItem(BaseModel):
    id: str
    resource: str
    resource_type: str
    environment: str
    change_type: str  # Modified, Deleted, Added
    status: str       # Drifted, In Sync
    detected: str


class IaCDriftChangesResponse(BaseModel):
    items: List[IaCDriftChangeItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_environments: List[str] = Field(
        default_factory=lambda: ["All Environments", "production", "staging", "dev", "qa", "sandbox"]
    )
    available_change_types: List[str] = Field(
        default_factory=lambda: ["All Change Types", "Modified", "Deleted", "Added"]
    )
    available_statuses: List[str] = Field(
        default_factory=lambda: ["All Statuses", "Drifted", "In Sync"]
    )


class IaCDriftResourceDetailResponse(BaseModel):
    name: str
    resource_type: str
    environment: str
    region: str
    created: str
    last_modified: str
    status: str
    drift_detected: str
    change_type: str
    changed_fields_count: int
    severity: str
    last_scan: str
    deployed_terraform: str
    deployed_json: str
    deployed_yaml: str


class IaCDriftRemediationItem(BaseModel):
    id: str
    resource: str
    issue: str
    severity: str  # High, Medium, Low
    recommendation: str
    status: str    # Open, In Progress, Resolved


class IaCDriftRemediationResponse(BaseModel):
    items: List[IaCDriftRemediationItem] = Field(default_factory=list)
    total: int = 0
    available_environments: List[str] = Field(
        default_factory=lambda: ["All Environments", "production", "staging", "dev", "qa", "sandbox"]
    )
    available_severities: List[str] = Field(
        default_factory=lambda: ["All Severities", "High", "Medium", "Low"]
    )
    available_statuses: List[str] = Field(
        default_factory=lambda: ["All Statuses", "Open", "In Progress", "Resolved"]
    )


class ApplyDriftRemediationResponse(BaseModel):
    id: str
    resource: str
    status: str
    message: str


class IaCDriftHistoryItem(BaseModel):
    id: str
    time: str
    resource: str
    change_type: str
    changed_by: str  # Terraform, Manual, CloudFormation
    status: str


class IaCDriftHistoryResponse(BaseModel):
    items: List[IaCDriftHistoryItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    available_resources: List[str] = Field(default_factory=list)


class IaCDriftSettingsDTO(BaseModel):
    enable_drift_detection: bool = True
    auto_scan_on_schedule: bool = True
    notify_on_drift: bool = True
    include_tags: bool = True
    ignore_computed: bool = False
    scan_frequency: str = "Daily"
    scan_time: str = "02:00"
    environments: List[str] = Field(default_factory=lambda: ["production", "staging"])
    email_notifications: bool = True
    slack_notifications: bool = True


class IaCDriftCompareResponse(BaseModel):
    resource: str
    git_terraform: str
    git_json: str
    git_yaml: str
    deployed_terraform: str
    deployed_json: str
    deployed_yaml: str
    differences_count: int
    diff_summary: List[str] = Field(default_factory=list)

