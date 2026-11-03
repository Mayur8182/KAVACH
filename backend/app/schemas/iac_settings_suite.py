"""
Pydantic Schemas for IaC Security Settings Suite — Section 15 (Screens 15.1 through 15.7)
Authoritative schemas for General Settings, Scan Settings, Rules & Policies,
Exclusions, Notifications, Access & Permissions, and Advanced Settings.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# 15.1 General Settings Schemas
# ============================================================================

class GeneralSettingsDTO(BaseModel):
    repository: str = Field("frontend-app", description="Target repository name")
    default_branch: str = Field("main", description="Default branch to monitor and scan")
    iac_working_directory: str = Field("/", description="Path to scan for IaC files")
    supported_iac_types: List[str] = Field(
        default_factory=lambda: ["Terraform", "CloudFormation", "Kubernetes Manifests", "Helm Charts"],
        description="Enabled IaC frameworks to discover and analyze",
    )
    auto_scan_on_push: bool = Field(True, description="Trigger IaC scan on code push events")
    scan_on_pr: bool = Field(True, description="Scan IaC changes in pull requests")
    scan_on_schedule: bool = Field(False, description="Run scheduled background scans")


class UpdateGeneralSettingsRequest(BaseModel):
    repository: Optional[str] = None
    default_branch: Optional[str] = None
    iac_working_directory: Optional[str] = None
    supported_iac_types: Optional[List[str]] = None
    auto_scan_on_push: Optional[bool] = None
    scan_on_pr: Optional[bool] = None
    scan_on_schedule: Optional[bool] = None


# ============================================================================
# 15.2 Scan Settings Schemas
# ============================================================================

class AdditionalToolsConfig(BaseModel):
    tfsec: bool = Field(False, description="Lightweight Terraform security scanner")
    kube_score: bool = Field(False, description="Kubernetes object analysis")
    kube_linter: bool = Field(False, description="Kubernetes manifest linter")
    custom_scanner: bool = Field(False, description="Enable custom scanner execution")
    custom_scanner_command: str = Field("", description="Custom CLI execution command")


class ScanSettingsDTO(BaseModel):
    iac_scanner: str = Field("Checkov (Default)", description="Primary IaC security scanner engine")
    scanner_version: str = Field("2.4.1", description="Current installed scanner version")
    scanner_version_latest: bool = Field(True, description="Whether currently on latest release")
    additional_tools: AdditionalToolsConfig = Field(default_factory=AdditionalToolsConfig)
    file_extensions: str = Field(
        ".tf, .tfvars, .yaml, .yml, .json",
        description="Comma separated file extensions included in scans",
    )
    max_file_size_mb: int = Field(5, description="Maximum file size limit in MB")
    parallel_scans: int = Field(4, description="Number of concurrent worker scan jobs")


class UpdateScanSettingsRequest(BaseModel):
    iac_scanner: Optional[str] = None
    scanner_version: Optional[str] = None
    additional_tools: Optional[AdditionalToolsConfig] = None
    file_extensions: Optional[str] = None
    max_file_size_mb: Optional[int] = None
    parallel_scans: Optional[int] = None


# ============================================================================
# 15.3 Rules & Policies Schemas
# ============================================================================

class PolicyPackItem(BaseModel):
    name: str = Field(..., description="Policy pack name, e.g. Checkov Default, CIS AWS")
    type: str = Field("Compliance", description="Category: Best Practices, Compliance, Security")
    version: str = Field("1.0.0", description="Policy pack semantic version")
    status: str = Field("Enabled", description="Enabled or Disabled")


class ToolSeverityMapping(BaseModel):
    critical: str = Field("High", description="Mapped severity for tool Critical")
    high: str = Field("High", description="Mapped severity for tool High")
    medium: str = Field("Medium", description="Mapped severity for tool Medium")
    low: str = Field("Low", description="Mapped severity for tool Low")


class RulesPoliciesSettingsDTO(BaseModel):
    policy_packs: List[PolicyPackItem] = Field(default_factory=list)
    severity_mappings: Dict[str, ToolSeverityMapping] = Field(default_factory=dict)


class UpdateRulesPoliciesRequest(BaseModel):
    policy_packs: Optional[List[PolicyPackItem]] = None
    severity_mappings: Optional[Dict[str, ToolSeverityMapping]] = None


# ============================================================================
# 15.4 Exclusions Schemas
# ============================================================================

class ExclusionItem(BaseModel):
    id: str = Field(..., description="Unique exclusion ID")
    pattern: str = Field(..., description="Glob or regex pattern to exclude, e.g. **/tests/**")
    type: str = Field("Directory", description="Target type: Directory, File, Resource, Rule")
    description: str = Field(..., description="Purpose or description of the exclusion")


class ExclusionsSettingsDTO(BaseModel):
    active_tab: str = Field("File / Path Exclusions", description="Current exclusions sub-tab")
    exclusions: List[ExclusionItem] = Field(default_factory=list)


class AddExclusionRequest(BaseModel):
    pattern: str = Field(..., min_length=2, description="Exclusion glob pattern")
    type: str = Field("Directory", description="Target type: Directory, File, Resource, Rule")
    description: str = Field(..., min_length=3, description="Exclusion justification description")


class PreviewExclusionRequest(BaseModel):
    file_path: str = Field(..., description="Path to test against active exclusion patterns")


class PreviewExclusionResponse(BaseModel):
    file_path: str
    is_excluded: bool
    matched_pattern: Optional[str] = None
    message: str


# ============================================================================
# 15.5 Notifications Schemas
# ============================================================================

class NotificationChannelItem(BaseModel):
    id: str = Field(..., description="Unique channel ID")
    channel: str = Field(..., description="Channel name, e.g. dev-sec-team")
    type: str = Field(..., description="Channel type: Slack, Email, Webhook, Jira")
    configuration: str = Field(..., description="Channel target address or configuration string")
    status: str = Field("Active", description="Active or Inactive")


class NotificationEventsConfig(BaseModel):
    scan_completed: bool = Field(True)
    critical_findings_detected: bool = Field(True)
    policy_violations: bool = Field(True)
    new_rules_available: bool = Field(False)
    scan_failed: bool = Field(True)
    high_severity_findings: bool = Field(True)
    drift_detected: bool = Field(False)
    compliance_status_changed: bool = Field(False)


class NotificationsSettingsDTO(BaseModel):
    enable_notifications: bool = Field(True)
    notify_on_scan_completion: bool = Field(True)
    notify_on_critical_findings: bool = Field(True)
    notify_on_policy_violations: bool = Field(True)
    channels: List[NotificationChannelItem] = Field(default_factory=list)
    events: NotificationEventsConfig = Field(default_factory=NotificationEventsConfig)


class UpdateNotificationsRequest(BaseModel):
    enable_notifications: Optional[bool] = None
    notify_on_scan_completion: Optional[bool] = None
    notify_on_critical_findings: Optional[bool] = None
    notify_on_policy_violations: Optional[bool] = None
    events: Optional[NotificationEventsConfig] = None


class AddNotificationChannelRequest(BaseModel):
    channel: str = Field(..., min_length=2)
    type: str = Field(..., min_length=2)
    configuration: str = Field(..., min_length=3)
    status: str = Field("Active")


# ============================================================================
# 15.6 Access & Permissions Schemas
# ============================================================================

class UserAccessItem(BaseModel):
    id: str = Field(..., description="Unique user or team ID")
    user: str = Field(..., description="Username or team name, e.g. mayur.bhanvad")
    avatar_initials: str = Field("MB", description="Avatar text initials")
    role: str = Field("Admin", description="Role: Admin, Editor, Viewer, Custom")
    permissions: str = Field("Full access", description="Short permission scope summary")
    status: str = Field("Active", description="Active or Inactive")


class RoleDefinitionItem(BaseModel):
    role: str
    description: str


class AccessSettingsDTO(BaseModel):
    active_tab: str = Field("User Access")
    users: List[UserAccessItem] = Field(default_factory=list)
    roles: List[RoleDefinitionItem] = Field(default_factory=list)


class AddUserAccessRequest(BaseModel):
    user: str = Field(..., min_length=2)
    role: str = Field("Viewer")
    permissions: Optional[str] = None
    status: str = Field("Active")


# ============================================================================
# 15.7 Advanced Settings Schemas
# ============================================================================

class EnvVariableItem(BaseModel):
    name: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)


class AdvancedSettingsDTO(BaseModel):
    scan_timeout_minutes: int = Field(10, description="Max allowed duration for single scan")
    max_memory_usage_gb: int = Field(2, description="Memory limit for scanner container")
    cache_results: bool = Field(True, description="Enable result caching")
    cache_ttl_days: int = Field(7, description="Cache retention period in days")
    checkov_arguments: str = Field(
        "--framework terraform,kubernetes,cloudformation --quiet",
        description="CLI flags passed to Checkov",
    )
    tfsec_arguments: str = Field(
        "--format json --soft-fail",
        description="CLI flags passed to tfsec",
    )
    environment_variables: List[EnvVariableItem] = Field(default_factory=list)


class UpdateAdvancedSettingsRequest(BaseModel):
    scan_timeout_minutes: Optional[int] = None
    max_memory_usage_gb: Optional[int] = None
    cache_results: Optional[bool] = None
    cache_ttl_days: Optional[int] = None
    checkov_arguments: Optional[str] = None
    tfsec_arguments: Optional[str] = None
    environment_variables: Optional[List[EnvVariableItem]] = None


# ============================================================================
# Master Suite Aggregate DTO
# ============================================================================

class IaCSettingsSuiteMasterDTO(BaseModel):
    repository: str
    general: GeneralSettingsDTO
    scan: ScanSettingsDTO
    rules_policies: RulesPoliciesSettingsDTO
    exclusions: ExclusionsSettingsDTO
    notifications: NotificationsSettingsDTO
    access: AccessSettingsDTO
    advanced: AdvancedSettingsDTO
