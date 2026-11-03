"""
Pydantic Schemas for IaC Security Integrations Suite — Section 14 (Screens 14.1 through 14.8)
Authoritative schemas for Integrations Overview, Connected Integrations, Add Integration,
Integration Detail (GitHub), Repositories, Webhooks, Scan Settings, and Sync Logs.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# 14.1 Integrations Overview Schemas
# ============================================================================

class IntegrationOverviewKpis(BaseModel):
    total_integrations: int = Field(12, description="Total supported & configured integrations")
    connected: int = Field(8, description="Integrations actively connected and healthy")
    disconnected: int = Field(2, description="Integrations currently disconnected")
    failed: int = Field(1, description="Integrations in error or failing sync state")
    not_configured: int = Field(1, description="Integrations awaiting configuration")


class IntegrationStatusBreakdown(BaseModel):
    connected: int = Field(8)
    disconnected: int = Field(2)
    failed: int = Field(1)
    not_configured: int = Field(1)


class PopularIntegrationItem(BaseModel):
    id: str
    name: str
    category: str = Field(..., description="Code repository, CI/CD, IaC Management, etc.")
    status: str = Field("Connected", description="Connected, Disconnected, Failed, Not Configured")
    icon: str


class IntegrationsOverviewResponse(BaseModel):
    repository: str
    kpis: IntegrationOverviewKpis
    status_breakdown: IntegrationStatusBreakdown
    popular_integrations: List[PopularIntegrationItem]


# ============================================================================
# 14.2 Connected Integrations Schemas
# ============================================================================

class ConnectedIntegrationItem(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="Code Repository, CI/CD, IaC Management, Secrets Management, Notifications, Issue Tracking")
    status: str = Field(..., description="Connected, Disconnected, Not Configured")
    last_sync: str = Field(..., description="Human readable relative time, e.g. 2 min ago")
    icon: str
    details: Optional[Dict[str, Any]] = None


class ConnectedIntegrationsResponse(BaseModel):
    items: List[ConnectedIntegrationItem]
    total: int
    available_types: List[str]


# ============================================================================
# 14.3 Add Integration Schemas
# ============================================================================

class AvailableIntegrationCard(BaseModel):
    id: str
    name: str
    category: str = Field(..., description="Source Control, CI/CD, IaC Management, Notifications, Other")
    subtext: str = Field("Code Repository", description="Card subtitle")
    icon: str
    is_connected: bool = False


class AvailableIntegrationsResponse(BaseModel):
    items: List[AvailableIntegrationCard]
    categories: List[str]


class ConnectIntegrationRequest(BaseModel):
    integration_id: str
    auth_type: str = Field("app", description="app, token, oauth, webhook")
    credentials: Optional[Dict[str, str]] = None


class ConnectIntegrationResponse(BaseModel):
    success: bool
    message: str
    integration_id: str


# ============================================================================
# 14.4 Integration Detail (GitHub) Schemas
# ============================================================================

class IntegrationConnectionDetails(BaseModel):
    status: str = Field("Connected")
    connected_on: str = Field("Sep 24, 2026, 10:12 AM")
    connected_by: str = Field("mayur.bhanvad")
    app_type: str = Field("GitHub App")
    permissions: str = Field("Read-only (Content, Pull requests, Metadata)")


class IntegrationRepoSelection(BaseModel):
    mode: str = Field("all", description="all, select, org")
    selected_repos: List[str] = Field(default_factory=list)


class IntegrationSyncSettings(BaseModel):
    auto_sync_new_repos: bool = Field(True)
    scan_pull_requests: bool = Field(True)
    scan_default_branch: bool = Field(True)


class IntegrationDetailResponse(BaseModel):
    id: str = Field("github")
    name: str = Field("GitHub")
    type: str = Field("Code Repository")
    status: str = Field("Connected")
    connection_details: IntegrationConnectionDetails
    repo_selection: IntegrationRepoSelection
    sync_settings: IntegrationSyncSettings


class UpdateIntegrationDetailRequest(BaseModel):
    repo_selection: Optional[IntegrationRepoSelection] = None
    sync_settings: Optional[IntegrationSyncSettings] = None


# ============================================================================
# 14.5 Repositories Schemas
# ============================================================================

class IntegrationRepositoryItem(BaseModel):
    id: str
    name: str
    visibility: str = Field(..., description="Public, Private")
    scan_status: str = Field(..., description="Enabled, Disabled, Not Configured")
    last_scanned: str = Field(..., description="e.g. 2 hours ago or --")


class IntegrationRepositoriesResponse(BaseModel):
    items: List[IntegrationRepositoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_statuses: List[str]
    available_visibilities: List[str]


class ToggleRepoScanStatusRequest(BaseModel):
    scan_status: str = Field(..., description="Enabled, Disabled")


# ============================================================================
# 14.6 Webhooks Schemas
# ============================================================================

class IntegrationWebhookItem(BaseModel):
    id: str
    webhook_url: str
    status: str = Field("Active", description="Active, Inactive, Failed")
    events: str = Field("Push, Pull Request")
    created_at: str = Field("Sep 24, 2026")


class WebhookEventsConfig(BaseModel):
    push_events: bool = Field(True)
    pull_request_events: bool = Field(True)
    merge_events: bool = Field(True)
    release_events: bool = Field(False)
    tag_events: bool = Field(False)


class IntegrationWebhooksResponse(BaseModel):
    webhooks: List[IntegrationWebhookItem]
    events_config: WebhookEventsConfig


class UpdateWebhookConfigRequest(BaseModel):
    events_config: WebhookEventsConfig


class CreateWebhookRequest(BaseModel):
    webhook_url: str
    events: Optional[str] = "Push, Pull Request"


class TestWebhookResponse(BaseModel):
    success: bool
    status_code: int
    latency_ms: int
    message: str


# ============================================================================
# 14.7 Scan Settings (Integration Level) Schemas
# ============================================================================

class IntegrationScanConfig(BaseModel):
    scan_on_push: bool = Field(True)
    scan_on_pr: bool = Field(True)
    scan_on_merge: bool = Field(False)


class IntegrationFileFilters(BaseModel):
    include_paths: List[str] = Field(
        default_factory=lambda: ["**/*.tf", "**/*.tfvars", "**/*.yaml", "**/*.yml", "helm/**"]
    )
    exclude_paths: List[str] = Field(
        default_factory=lambda: ["**/examples/**", "**/test/**", "**/docs/**"]
    )


class IntegrationScannerOptions(BaseModel):
    iac_scanner: str = Field("Checkov (Default)")
    policy_pack: str = Field("Default")
    severity_threshold: str = Field("Medium and above")


class IntegrationScanSettingsDTO(BaseModel):
    scan_config: IntegrationScanConfig = Field(default_factory=IntegrationScanConfig)
    file_filters: IntegrationFileFilters = Field(default_factory=IntegrationFileFilters)
    scanner_options: IntegrationScannerOptions = Field(default_factory=IntegrationScannerOptions)


# ============================================================================
# 14.8 Sync Logs Schemas
# ============================================================================

class IntegrationSyncLogItem(BaseModel):
    id: str
    time: str
    event: str
    status: str = Field(..., description="Success, Failed")
    message: str


class IntegrationSyncLogsResponse(BaseModel):
    items: List[IntegrationSyncLogItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_events: List[str]


class TriggerSyncResponse(BaseModel):
    success: bool
    message: str
    synced_at: str
