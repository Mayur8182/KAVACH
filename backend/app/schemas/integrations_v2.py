import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IntegrationListItem(BaseModel):
    id: str
    provider: str
    name: str
    type: str  # 'Source Code', 'CI/CD', 'Webhooks', 'API'
    status: str  # 'connected', 'not_connected', 'error', 'disconnected'
    connected_at: Optional[str] = None
    last_sync: Optional[str] = None
    external_account_name: Optional[str] = None
    organization_name: Optional[str] = None


class IntegrationsOverviewSummary(BaseModel):
    connected_integrations: int
    cicd_pipelines: int
    repositories_synced: int
    active_webhooks: int
    items: List[IntegrationListItem]


class RepositoryItem(BaseModel):
    id: str
    external_id: str
    name: str
    full_name: str
    url: str
    private: bool
    default_branch: str
    is_selected: bool
    last_scan: str
    status: str  # 'Scanned', 'Not Scanned', 'Scanning'
    permissions: Dict[str, Any] = Field(default_factory=dict)


class ProjectItem(BaseModel):
    id: str
    external_id: str
    name: str
    url: str
    project_type: str  # 'Group', 'Project'
    visibility: str  # 'Public', 'Private', 'Internal'
    is_selected: bool
    last_scan: str
    status: str  # 'Scanned', 'Not Scanned', 'Scanning'


class ProviderDetailResponse(BaseModel):
    id: Optional[str] = None
    provider: str
    status: str
    connected: bool
    account_name: Optional[str] = None
    organization_name: Optional[str] = None
    instance_url: Optional[str] = None
    connected_at: Optional[str] = None
    last_sync_at: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)
    repositories: List[RepositoryItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)


class ConnectProviderRequest(BaseModel):
    token: Optional[str] = None
    account_name: Optional[str] = None
    organization_name: Optional[str] = None
    instance_url: Optional[str] = None
    scopes: Optional[List[str]] = None


class DisconnectResponse(BaseModel):
    success: bool
    provider: str
    message: str


class SyncProviderResponse(BaseModel):
    job_id: str
    status: str
    items_found: int
    items_created: int
    items_updated: int
    message: str


class UpdateSelectionRequest(BaseModel):
    selected_ids: Optional[List[str]] = Field(default=None, description="List of repository or project IDs to select")
    selected_repo_ids: Optional[List[str]] = None
    selected_project_ids: Optional[List[str]] = None


class CiCdConfigResponse(BaseModel):
    jenkins_url: Optional[str] = None
    jenkins_username: Optional[str] = None
    jenkins_token_configured: bool = False
    scan_on_push: bool = True
    scan_on_pr: bool = True
    fail_on_critical: bool = True
    fail_on_high: bool = False
    generate_report: bool = True
    comment_on_pr: bool = True
    scan_changed_only: bool = False
    quality_gate_name: str = "Default Gate"
    severity_threshold: str = "High and above"
    quality_score_threshold: int = 80
    is_enabled: bool = True


class UpdateCiCdConfigRequest(BaseModel):
    jenkins_url: Optional[str] = None
    jenkins_username: Optional[str] = None
    jenkins_token: Optional[str] = None
    scan_on_push: Optional[bool] = None
    scan_on_pr: Optional[bool] = None
    fail_on_critical: Optional[bool] = None
    fail_on_high: Optional[bool] = None
    generate_report: Optional[bool] = None
    comment_on_pr: Optional[bool] = None
    scan_changed_only: Optional[bool] = None
    quality_gate_name: Optional[str] = None
    severity_threshold: Optional[str] = None
    quality_score_threshold: Optional[int] = None
    is_enabled: Optional[bool] = None


class JenkinsTestRequest(BaseModel):
    jenkins_url: str
    jenkins_username: Optional[str] = None
    jenkins_token: Optional[str] = None


class JenkinsTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: int
    jenkins_version: Optional[str] = None


class WebhookResponseItem(BaseModel):
    id: str
    name: str
    url: str
    events: List[str]
    status: str  # 'active', 'inactive'
    created_at: str
    last_triggered: str


class CreateWebhookRequest(BaseModel):
    name: str
    url: str
    events: List[str] = Field(default_factory=lambda: ["scan_completed", "scan_failed"])
    secret: Optional[str] = None


class TestWebhookDeliveryRequest(BaseModel):
    url: Optional[str] = None
    secret: Optional[str] = None


class TestWebhookDeliveryResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    latency_ms: int
    timestamp: str
    request_payload: Dict[str, Any]
    response_preview: str
    error: Optional[str] = None


class ApiKeyResponseItem(BaseModel):
    id: str
    name: str
    key_preview: str
    scopes: List[str]
    created_at: str
    last_used: str
    status: str  # 'active', 'revoked'


class GenerateApiKeyRequest(BaseModel):
    name: str
    scopes: List[str] = Field(default_factory=lambda: ["read", "write"])
    expires_in_days: Optional[int] = None


class GenerateApiKeyResponse(BaseModel):
    id: str
    name: str
    raw_key: str
    key_preview: str
    scopes: List[str]
    created_at: str
    status: str


# =============================================================================
# Centralized Integration Management System (CIMS) Schemas
# =============================================================================

class ProviderCatalogItem(BaseModel):
    provider: str
    name: str
    category: str  # 'scm', 'cloud', 'cicd', 'registry', 'alerts'
    category_label: str  # 'Source Code', 'Cloud Provider', etc.
    description: str
    connected: bool
    status: str  # 'CONNECTED', 'NOT CONFIGURED', 'ERROR', 'SYNCING'
    health: str  # 'HEALTHY', 'DEGRADED', 'NOT_CONFIGURED', 'SYNCING'
    connection_id: Optional[str] = None
    account_name: Optional[str] = None
    organization_name: Optional[str] = None
    last_synced_at: Optional[str] = None
    resources_count: int = 0
    supported_capabilities: List[str] = Field(default_factory=list)
    config_fields: List[Dict[str, Any]] = Field(default_factory=list)


class CentralResourceCapabilityItem(BaseModel):
    id: str
    connection_id: str
    resource_type: str  # 'repository', 'cloud_account', 'pipeline', 'cluster'
    name: str
    external_id: str
    full_name: str
    url: Optional[str] = None
    default_branch: Optional[str] = "main"
    private: bool = True
    capabilities: Dict[str, str] = Field(default_factory=dict)  # {'sast': 'ENABLED', 'sca': 'ENABLED', ...}
    scan_on_push: bool = True
    scan_on_pr: bool = True
    last_scan_status: Optional[str] = "Not Scanned"
    last_scan_at: Optional[str] = None


class UpdateCapabilitiesPayload(BaseModel):
    resource_id: str
    capabilities: Dict[str, str] = Field(description="Map of capability to status: {'sast': 'ENABLED', 'sca': 'DISABLED'}")
    scan_on_push: Optional[bool] = None
    scan_on_pr: Optional[bool] = None


class CentralConnectPayload(BaseModel):
    provider: str
    account_name: Optional[str] = None
    organization_name: Optional[str] = None
    token: Optional[str] = None
    role_arn: Optional[str] = None
    external_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    instance_url: Optional[str] = None
    webhook_url: Optional[str] = None
    channel: Optional[str] = None
    jira_domain: Optional[str] = None
    user_email: Optional[str] = None
    scopes: Optional[List[str]] = None
    credentials: Optional[Dict[str, Any]] = None


class IntegrationHealthResponse(BaseModel):
    connection_id: str
    provider: str
    status: str
    healthy: bool
    latency_ms: int
    last_checked_at: str
    message: str
    permissions: List[str] = Field(default_factory=list)
    resource_count: int = 0

