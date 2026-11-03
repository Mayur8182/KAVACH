"""
IaC Security Integrations Suite API Router — Section 14: Screens 14.1 through 14.8
Prefix: /api/v1/iac/integrations-suite
Authoritative REST endpoints for Integrations Overview, Connected Integrations,
Add Integration Catalog, Integration Detail (GitHub), Repositories, Webhooks,
Scan Settings, and Sync Logs.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, Path, Body, status

from app.schemas.iac_integrations_suite import (
    IntegrationsOverviewResponse,
    ConnectedIntegrationsResponse,
    AvailableIntegrationsResponse,
    ConnectIntegrationRequest,
    ConnectIntegrationResponse,
    IntegrationDetailResponse,
    UpdateIntegrationDetailRequest,
    IntegrationRepositoriesResponse,
    IntegrationRepositoryItem,
    ToggleRepoScanStatusRequest,
    IntegrationWebhooksResponse,
    IntegrationWebhookItem,
    WebhookEventsConfig,
    UpdateWebhookConfigRequest,
    CreateWebhookRequest,
    TestWebhookResponse,
    IntegrationScanSettingsDTO,
    IntegrationSyncLogsResponse,
    TriggerSyncResponse,
)
from app.services.iac_integrations_suite_service import IaCIntegrationsSuiteService

router = APIRouter(prefix="/iac/integrations-suite", tags=["IaC Integrations Suite"])


# ============================================================================
# 14.1 Integrations Overview
# ============================================================================

@router.get(
    "/overview",
    response_model=IntegrationsOverviewResponse,
    summary="14.1 Integrations Overview (4 KPIs, Donut Status Breakdown, Popular Integrations)",
)
async def get_integrations_overview(
    repository: str = Query("frontend-app", description="Active repository context"),
) -> IntegrationsOverviewResponse:
    return IaCIntegrationsSuiteService.get_overview(repository=repository)


# ============================================================================
# 14.2 Connected Integrations
# ============================================================================

@router.get(
    "/connected",
    response_model=ConnectedIntegrationsResponse,
    summary="14.2 Connected Integrations (Tool Table, Status, Last Sync, Filter by Type)",
)
async def get_connected_integrations(
    search: Optional[str] = Query(None, description="Search term for integration name or type"),
    type_filter: Optional[str] = Query("All Types", description="Integration type filter"),
) -> ConnectedIntegrationsResponse:
    return IaCIntegrationsSuiteService.get_connected_integrations(
        search=search,
        type_filter=type_filter,
    )


# ============================================================================
# 14.3 Add Integration (Catalog)
# ============================================================================

@router.get(
    "/catalog",
    response_model=AvailableIntegrationsResponse,
    summary="14.3 Add Integration Catalog (Source Control, CI/CD, IaC, Notifications)",
)
async def get_available_integrations(
    category: Optional[str] = Query("All", description="Category filter"),
    search: Optional[str] = Query(None, description="Search term"),
) -> AvailableIntegrationsResponse:
    return IaCIntegrationsSuiteService.get_available_integrations(
        category=category,
        search=search,
    )


@router.post(
    "/connect",
    response_model=ConnectIntegrationResponse,
    summary="14.3 Connect New Integration",
)
async def connect_integration(
    req: ConnectIntegrationRequest,
) -> ConnectIntegrationResponse:
    return IaCIntegrationsSuiteService.connect_integration(req)


# ============================================================================
# 14.4 Integration Detail (e.g. GitHub)
# ============================================================================

@router.get(
    "/detail/{integration_id}",
    response_model=IntegrationDetailResponse,
    summary="14.4 Integration Detail (Connection Details, Repo Selection, Sync Settings)",
)
async def get_integration_detail(
    integration_id: str = Path(..., description="Target integration ID"),
) -> IntegrationDetailResponse:
    return IaCIntegrationsSuiteService.get_integration_detail(integration_id)


@router.put(
    "/detail/{integration_id}",
    response_model=IntegrationDetailResponse,
    summary="14.4 Update Integration Detail (Repo selection and sync toggles)",
)
async def update_integration_detail(
    integration_id: str = Path(..., description="Target integration ID"),
    req: UpdateIntegrationDetailRequest = Body(...),
) -> IntegrationDetailResponse:
    return IaCIntegrationsSuiteService.update_integration_detail(integration_id, req)


@router.post(
    "/detail/{integration_id}/reconnect",
    response_model=IntegrationDetailResponse,
    summary="14.4 Reconnect Integration",
)
async def reconnect_integration(
    integration_id: str = Path(..., description="Target integration ID"),
) -> IntegrationDetailResponse:
    return IaCIntegrationsSuiteService.reconnect_integration(integration_id)


@router.post(
    "/detail/{integration_id}/disconnect",
    response_model=Dict[str, Any],
    summary="14.4 Disconnect Integration",
)
async def disconnect_integration(
    integration_id: str = Path(..., description="Target integration ID"),
) -> Dict[str, Any]:
    return IaCIntegrationsSuiteService.disconnect_integration(integration_id)


# ============================================================================
# 14.5 Repositories
# ============================================================================

@router.get(
    "/repositories",
    response_model=IntegrationRepositoriesResponse,
    summary="14.5 Repositories (List of repositories, Scan Status, Visibility, Last Scanned)",
)
async def get_repositories(
    search: Optional[str] = Query(None, description="Search repository name"),
    status: Optional[str] = Query("All Status", description="Scan status filter"),
    visibility: Optional[str] = Query("All Visibility", description="Visibility filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
) -> IntegrationRepositoriesResponse:
    return IaCIntegrationsSuiteService.get_repositories(
        search=search,
        status=status,
        visibility=visibility,
        page=page,
        page_size=page_size,
    )


@router.put(
    "/repositories/{repo_id}/status",
    response_model=IntegrationRepositoryItem,
    summary="14.5 Toggle Repository Scan Status (Enabled / Disabled)",
)
async def toggle_repo_scan_status(
    repo_id: str = Path(..., description="Repository ID or name"),
    req: ToggleRepoScanStatusRequest = Body(...),
) -> IntegrationRepositoryItem:
    return IaCIntegrationsSuiteService.toggle_repo_scan_status(repo_id, req.scan_status)


# ============================================================================
# 14.6 Webhooks
# ============================================================================

@router.get(
    "/webhooks/{integration_id}",
    response_model=IntegrationWebhooksResponse,
    summary="14.6 Webhooks (Webhook URL, Status, Events checklist)",
)
async def get_webhooks(
    integration_id: str = Path(..., description="Target integration ID"),
) -> IntegrationWebhooksResponse:
    return IaCIntegrationsSuiteService.get_webhooks(integration_id)


@router.put(
    "/webhooks/{integration_id}/config",
    response_model=WebhookEventsConfig,
    summary="14.6 Update Webhook Events Configuration",
)
async def update_webhook_config(
    integration_id: str = Path(..., description="Target integration ID"),
    req: UpdateWebhookConfigRequest = Body(...),
) -> WebhookEventsConfig:
    return IaCIntegrationsSuiteService.update_webhook_config(integration_id, req)


@router.post(
    "/webhooks/{integration_id}",
    response_model=IntegrationWebhookItem,
    summary="14.6 Create New Webhook",
)
async def create_webhook(
    integration_id: str = Path(..., description="Target integration ID"),
    req: CreateWebhookRequest = Body(...),
) -> IntegrationWebhookItem:
    return IaCIntegrationsSuiteService.create_webhook(integration_id, req)


@router.post(
    "/webhooks/{integration_id}/test",
    response_model=TestWebhookResponse,
    summary="14.6 Test Webhook Connection",
)
async def test_webhook(
    integration_id: str = Path(..., description="Target integration ID"),
) -> TestWebhookResponse:
    return IaCIntegrationsSuiteService.test_webhook(integration_id)


# ============================================================================
# 14.7 Scan Settings (Integration Level)
# ============================================================================

@router.get(
    "/scan-settings/{integration_id}",
    response_model=IntegrationScanSettingsDTO,
    summary="14.7 Scan Settings (Scan config, file filters, scanner options)",
)
async def get_scan_settings(
    integration_id: str = Path(..., description="Target integration ID"),
) -> IntegrationScanSettingsDTO:
    return IaCIntegrationsSuiteService.get_scan_settings(integration_id)


@router.put(
    "/scan-settings/{integration_id}",
    response_model=IntegrationScanSettingsDTO,
    summary="14.7 Update Scan Settings for Integration",
)
async def update_scan_settings(
    integration_id: str = Path(..., description="Target integration ID"),
    payload: Dict[str, Any] = Body(...),
) -> IntegrationScanSettingsDTO:
    return IaCIntegrationsSuiteService.update_scan_settings(integration_id, payload)


@router.post(
    "/scan-settings/{integration_id}/reset",
    response_model=IntegrationScanSettingsDTO,
    summary="14.7 Reset Scan Settings to Default",
)
async def reset_scan_settings(
    integration_id: str = Path(..., description="Target integration ID"),
) -> IntegrationScanSettingsDTO:
    return IaCIntegrationsSuiteService.reset_scan_settings(integration_id)


# ============================================================================
# 14.8 Sync Logs
# ============================================================================

@router.get(
    "/sync-logs/{integration_id}",
    response_model=IntegrationSyncLogsResponse,
    summary="14.8 Sync Logs (Timeline of integration activity and sync history)",
)
async def get_sync_logs(
    integration_id: str = Path(..., description="Target integration ID"),
    event: Optional[str] = Query("All Events", description="Event filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
) -> IntegrationSyncLogsResponse:
    return IaCIntegrationsSuiteService.get_sync_logs(
        integration_id=integration_id,
        event=event,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/sync/{integration_id}",
    response_model=TriggerSyncResponse,
    summary="14.8 Trigger Manual Repository Synchronization",
)
async def trigger_sync(
    integration_id: str = Path(..., description="Target integration ID"),
) -> TriggerSyncResponse:
    return IaCIntegrationsSuiteService.trigger_sync(integration_id)
