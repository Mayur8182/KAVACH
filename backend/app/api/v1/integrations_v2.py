import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.integrations_v2 import (
    ApiKeyResponseItem,
    CentralConnectPayload,
    CentralResourceCapabilityItem,
    CiCdConfigResponse,
    ConnectProviderRequest,
    CreateWebhookRequest,
    DisconnectResponse,
    GenerateApiKeyRequest,
    GenerateApiKeyResponse,
    IntegrationHealthResponse,
    IntegrationsOverviewSummary,
    JenkinsTestRequest,
    JenkinsTestResponse,
    ProviderCatalogItem,
    ProviderDetailResponse,
    SyncProviderResponse,
    TestWebhookDeliveryRequest,
    TestWebhookDeliveryResponse,
    UpdateCapabilitiesPayload,
    UpdateCiCdConfigRequest,
    UpdateSelectionRequest,
    WebhookResponseItem,
)
from app.services.integrations_service import (
    DEFAULT_ORGANIZATION_ID,
    IntegrationsService,
)

router = APIRouter(prefix="/integrations", tags=["Real Integrations"])


def resolve_org_id(x_organization_id: Optional[str]) -> uuid.UUID:
    if x_organization_id:
        try:
            return uuid.UUID(x_organization_id)
        except Exception:
            pass
    return DEFAULT_ORGANIZATION_ID


# =============================================================================
# 0. Centralized Integration Management System (CIMS) Endpoints
# =============================================================================
@router.get(
    "/providers",
    response_model=List[ProviderCatalogItem],
    summary="List Central Provider Catalog with Real Connection Status",
    description="Returns all available providers across SCM, Cloud, CI/CD, Registries, and Alerts with real connection state.",
)
async def list_providers(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[ProviderCatalogItem]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.list_provider_catalog(organization_id=org_id)


@router.post(
    "/central/connect",
    response_model=ProviderCatalogItem,
    summary="Single Authoritative Provider Connection",
    description="Connects any provider (SCM, Cloud, CI/CD, Alerts) once and propagates to all platform modules.",
)
async def connect_provider_central(
    payload: CentralConnectPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> ProviderCatalogItem:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.connect_provider_central(
        payload=payload,
        organization_id=org_id,
        user=current_user,
    )


@router.post(
    "/central/disconnect",
    response_model=DisconnectResponse,
    summary="Centrally Disconnect Provider and Update Subsystems",
    description="Disconnects provider, revokes active sessions/tokens, and updates dependent security modules.",
)
async def disconnect_provider_central(
    provider: str = Query(..., description="Provider name or connection ID"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> DisconnectResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.disconnect_connection_central(
        connection_id_or_provider=provider,
        organization_id=org_id,
        user=current_user,
    )


@router.get(
    "/central/resources",
    response_model=List[CentralResourceCapabilityItem],
    summary="List Resources and Capability Matrices for a Connection",
    description="Inspects all discovered repositories or cloud accounts with their enabled security capabilities.",
)
async def get_central_resources(
    connection_id: Optional[str] = Query(None, description="Connection UUID or provider key (e.g. github)"),
    provider: Optional[str] = Query("github", description="Fallback provider key if connection_id not passed"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[CentralResourceCapabilityItem]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    target = connection_id or provider or "github"
    return await service.get_connection_resources(
        connection_id_or_provider=target,
        organization_id=org_id,
    )


@router.post(
    "/central/capabilities",
    response_model=CentralResourceCapabilityItem,
    summary="Update Fine-Grained Capability Status for a Resource",
    description="Enables or disables security modules (SAST, SCA, IaC, Secrets, Container) per resource.",
)
async def update_central_capabilities(
    payload: UpdateCapabilitiesPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> CentralResourceCapabilityItem:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.update_resource_capabilities(
        payload=payload,
        organization_id=org_id,
        user=current_user,
    )


@router.get(
    "/central/health",
    response_model=IntegrationHealthResponse,
    summary="Check Live Connection Telemetry and Scopes",
    description="Validates real token/IAM connectivity and returns latency and status.",
)
async def check_central_health(
    connection_id: str = Query(..., description="Connection ID or provider name"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> IntegrationHealthResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.check_connection_health(
        connection_id_or_provider=connection_id,
        organization_id=org_id,
    )


# =============================================================================
# 1. Integrations Overview
# =============================================================================
@router.get(
    "/overview",
    response_model=IntegrationsOverviewSummary,
    summary="Get Integrations Overview Summary & List",
    description="Returns real counts for Connected Tools, CI/CD Pipelines, Synced Repositories, and Webhooks, with filtered integrations table.",
)
async def get_integrations_overview(
    type: Optional[str] = Query(None, description="Filter by type: All, Source Code, CI/CD, Webhooks, API"),
    status: Optional[str] = Query(None, description="Filter by status: All, Connected, Disconnected, Error"),
    search: Optional[str] = Query(None, description="Search term for integration name or type"),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> IntegrationsOverviewSummary:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.get_overview_summary(
        organization_id=org_id,
        filter_type=type,
        filter_status=status,
        search=search,
    )


# Compatibility alias for summary
@router.get("/summary", response_model=IntegrationsOverviewSummary)
async def get_integrations_summary_alias(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> IntegrationsOverviewSummary:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.get_overview_summary(
        organization_id=org_id,
        filter_type=type,
        filter_status=status,
        search=search,
    )


# =============================================================================
# 2. Provider Detail & Status (GitHub / GitLab / Bitbucket)
# =============================================================================
@router.get(
    "/{provider}/status",
    response_model=ProviderDetailResponse,
    summary="Get SCM Provider Connection Status & Discovered Repositories",
)
async def get_provider_status(
    provider: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> ProviderDetailResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.get_provider_detail(provider=provider.lower(), organization_id=org_id)


@router.post(
    "/{provider}/connect",
    response_model=ProviderDetailResponse,
    summary="Connect SCM Provider with Token or Credentials",
)
async def connect_provider(
    provider: str,
    payload: ConnectProviderRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> ProviderDetailResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.connect_provider(
        provider=provider.lower(),
        organization_id=org_id,
        user=current_user,
        token=payload.token,
        account_name=payload.account_name,
        organization_name=payload.organization_name,
        instance_url=payload.instance_url,
        scopes=payload.scopes,
    )


@router.post(
    "/{provider}/disconnect",
    response_model=DisconnectResponse,
    summary="Disconnect SCM or CI/CD Provider",
)
async def disconnect_provider(
    provider: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> DisconnectResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    success = await service.disconnect_provider(
        provider=provider.lower(),
        organization_id=org_id,
        user=current_user,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    return DisconnectResponse(
        success=True,
        provider=provider,
        message=f"{provider.capitalize()} integration has been disconnected.",
    )


@router.post(
    "/{provider}/sync",
    response_model=SyncProviderResponse,
    summary="Trigger Provider Synchronization",
)
async def sync_provider(
    provider: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> SyncProviderResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.sync_provider(
        provider=provider.lower(),
        organization_id=org_id,
        user=current_user,
    )


@router.post(
    "/{provider}/repositories/select",
    summary="Update Selected Repositories/Projects to Scan",
)
@router.post(
    "/{provider}/select-repos",
    summary="Alias: Update Selected Repositories",
)
@router.post(
    "/{provider}/select-projects",
    summary="Alias: Update Selected Projects",
)
async def update_selected_repositories(
    provider: str,
    payload: UpdateSelectionRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    ids = payload.selected_ids or payload.selected_repo_ids or payload.selected_project_ids or []
    updated_count = await service.update_repository_selection(
        provider=provider.lower(),
        selected_ids=ids,
        organization_id=org_id,
    )
    return {
        "success": True,
        "provider": provider,
        "selected_count": updated_count,
        "message": f"Successfully updated {updated_count} selected repositories/projects.",
    }


# =============================================================================
# 3. CI/CD & Jenkins Integration
# =============================================================================
@router.post(
    "/jenkins/test",
    response_model=JenkinsTestResponse,
    summary="Test Live Jenkins Connection",
)
async def test_jenkins(
    payload: JenkinsTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> JenkinsTestResponse:
    service = IntegrationsService(db)
    return await service.test_jenkins_connection(
        jenkins_url=payload.jenkins_url,
        username=payload.jenkins_username,
        token=payload.jenkins_token,
    )


@router.get(
    "/ci-cd/config",
    response_model=CiCdConfigResponse,
    summary="Get CI/CD Pipeline Scan Configuration",
)
async def get_cicd_config(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> CiCdConfigResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.get_cicd_config(organization_id=org_id)


@router.post(
    "/ci-cd/config",
    response_model=CiCdConfigResponse,
    summary="Save CI/CD Pipeline Scan Configuration",
)
async def save_cicd_config(
    payload: UpdateCiCdConfigRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> CiCdConfigResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.update_cicd_config(payload=payload, organization_id=org_id)


# =============================================================================
# 4. Webhooks Integration
# =============================================================================
@router.get(
    "/webhooks",
    response_model=List[WebhookResponseItem],
    summary="List Real Webhook Endpoints",
)
async def list_webhooks(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[WebhookResponseItem]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.list_webhooks(organization_id=org_id)


@router.post(
    "/webhooks",
    response_model=WebhookResponseItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Webhook Endpoint",
)
async def create_webhook(
    payload: CreateWebhookRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> WebhookResponseItem:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.create_webhook(payload=payload, organization_id=org_id)


@router.delete(
    "/webhooks/{webhook_id}",
    summary="Delete Webhook Endpoint",
)
async def delete_webhook(
    webhook_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    org_id = resolve_org_id(x_organization_id)
    try:
        wh_uuid = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Webhook UUID")

    service = IntegrationsService(db)
    success = await service.delete_webhook(webhook_id=wh_uuid, organization_id=org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"success": True, "message": "Webhook deleted successfully."}


@router.post(
    "/webhooks/test",
    response_model=TestWebhookDeliveryResponse,
    summary="Test Outbound Webhook Delivery",
)
async def test_webhook_delivery(
    payload: TestWebhookDeliveryRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> TestWebhookDeliveryResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.test_webhook_delivery(
        webhook_id=None,
        url=payload.url,
        secret=payload.secret,
        organization_id=org_id,
    )


@router.post(
    "/webhooks/{webhook_id}/test",
    response_model=TestWebhookDeliveryResponse,
    summary="Test Delivery for Existing Webhook",
)
async def test_existing_webhook_delivery(
    webhook_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> TestWebhookDeliveryResponse:
    org_id = resolve_org_id(x_organization_id)
    try:
        wh_uuid = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Webhook UUID")

    service = IntegrationsService(db)
    return await service.test_webhook_delivery(
        webhook_id=wh_uuid,
        url=None,
        secret=None,
        organization_id=org_id,
    )


# =============================================================================
# 5. Public REST API Keys
# =============================================================================
@router.get(
    "/api-keys",
    response_model=List[ApiKeyResponseItem],
    summary="List API Keys",
)
async def list_api_keys(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[ApiKeyResponseItem]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.list_api_keys(organization_id=org_id)


@router.post(
    "/api-keys",
    response_model=GenerateApiKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Cryptographically Secure API Key",
)
async def generate_api_key(
    payload: GenerateApiKeyRequest,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> GenerateApiKeyResponse:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.generate_api_key_entry(
        name=payload.name,
        scopes=payload.scopes,
        organization_id=org_id,
        user=current_user,
        expires_in_days=payload.expires_in_days,
    )


@router.delete(
    "/api-keys/{key_id}",
    summary="Revoke API Key",
)
async def revoke_api_key(
    key_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    org_id = resolve_org_id(x_organization_id)
    try:
        k_uuid = uuid.UUID(key_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid API Key UUID")

    service = IntegrationsService(db)
    success = await service.revoke_api_key(
        key_id=k_uuid,
        organization_id=org_id,
        user=current_user,
    )
    if not success:
        raise HTTPException(status_code=404, detail="API Key not found")
    return {"success": True, "message": "API key has been revoked and can no longer authenticate."}


# =============================================================================
# 7. Provider Details (7 Tabs Integration Workspace)
# =============================================================================
@router.get(
    "/providers/{provider}/details",
    summary="Get 7-Tab Integration Workspace State",
    description="Returns consolidated state across Overview, Resources, Events, Notifications, Delivery Logs, Permissions, and Settings.",
)
async def get_provider_details(
    provider: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    try:
        return await service.get_provider_details(provider=provider, organization_id=org_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Details error: {str(e)}")


# =========================================================================
# 8. Notification Test Endpoints
# =========================================================================
class SlackTestPayload(BaseModel):
    webhook_url: Optional[str] = None
    channel: Optional[str] = None


@router.post(
    "/slack/test",
    summary="Send Authentic Test Notification to Slack",
)
async def test_slack_notification(
    payload: SlackTestPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.trigger_slack_test(
        organization_id=org_id,
        webhook_url=payload.webhook_url,
        channel=payload.channel,
    )


class TeamsTestPayload(BaseModel):
    webhook_url: str


@router.post(
    "/teams/test",
    summary="Send Test Notification to Microsoft Teams",
)
async def test_teams_notification(
    payload: TeamsTestPayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.trigger_teams_test(
        organization_id=org_id,
        webhook_url=payload.webhook_url,
    )


# =========================================================================
# 9. Automation Rules (WHEN-THEN) Engine Endpoints
# =========================================================================
class CreateAutomationRulePayload(BaseModel):
    name: str
    description: Optional[str] = None
    event_trigger: str
    conditions: Dict[str, Any] = Field(default_factory=dict)
    actions: List[Dict[str, Any]] = Field(default_factory=list)


class ToggleRulePayload(BaseModel):
    is_enabled: bool


@router.get(
    "/rules",
    summary="List Organization Automation Rules",
)
async def list_automation_rules(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[Dict[str, Any]]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.list_automation_rules(organization_id=org_id)


@router.post(
    "/rules",
    summary="Create WHEN-THEN Automation Rule",
    status_code=status.HTTP_201_CREATED,
)
async def create_automation_rule(
    payload: CreateAutomationRulePayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.create_automation_rule(
        organization_id=org_id,
        name=payload.name,
        event_trigger=payload.event_trigger,
        conditions=payload.conditions,
        actions=payload.actions,
        description=payload.description,
        user=current_user,
    )


@router.patch(
    "/rules/{rule_id}/toggle",
    summary="Toggle Automation Rule State",
)
async def toggle_automation_rule(
    rule_id: str,
    payload: ToggleRulePayload,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    try:
        r_uuid = uuid.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Rule UUID")

    service = IntegrationsService(db)
    success = await service.toggle_automation_rule(
        rule_id=r_uuid,
        organization_id=org_id,
        is_enabled=payload.is_enabled,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True, "is_enabled": payload.is_enabled}


@router.delete(
    "/rules/{rule_id}",
    summary="Delete Automation Rule",
)
async def delete_automation_rule(
    rule_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    org_id = resolve_org_id(x_organization_id)
    try:
        r_uuid = uuid.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Rule UUID")

    service = IntegrationsService(db)
    success = await service.delete_automation_rule(rule_id=r_uuid, organization_id=org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True, "message": "Automation rule deleted"}


@router.get(
    "/rules/{rule_id}/executions",
    summary="Get Rule Execution History Audit Trail",
)
async def get_rule_executions(
    rule_id: str,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[Dict[str, Any]]:
    org_id = resolve_org_id(x_organization_id)
    try:
        r_uuid = uuid.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Rule UUID")

    service = IntegrationsService(db)
    return await service.get_rule_executions(rule_id=r_uuid, organization_id=org_id)


# =========================================================================
# 10. Universal Webhook Ingress (HMAC Verification & DLQ)
# =========================================================================
@router.post(
    "/webhooks/ingress/{provider}",
    summary="Universal Webhook Ingress with HMAC Verification",
)
async def handle_webhook_ingress(
    provider: str,
    request: Request,
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    raw_body = await request.body()
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.handle_webhook_ingress(
        provider=provider,
        headers=dict(request.headers),
        raw_body=raw_body,
        organization_id=org_id,
    )


@router.get(
    "/webhooks/dead-letter",
    summary="List Webhook Dead-Letter Queue Items",
)
async def list_webhook_dead_letters(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
) -> List[Dict[str, Any]]:
    org_id = resolve_org_id(x_organization_id)
    service = IntegrationsService(db)
    return await service.list_dead_letters(organization_id=org_id)

