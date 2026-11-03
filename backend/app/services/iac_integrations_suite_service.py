"""
IaC Security Integrations Suite Service — Section 14 (Screens 14.1 through 14.8)
Authoritative state management, lifecycle connections, webhook configurations,
per-integration scan settings, and synchronization logs.
"""

from typing import List, Dict, Any, Optional
import copy
from datetime import datetime

from app.schemas.iac_integrations_suite import (
    IntegrationsOverviewResponse,
    IntegrationOverviewKpis,
    IntegrationStatusBreakdown,
    PopularIntegrationItem,
    ConnectedIntegrationsResponse,
    ConnectedIntegrationItem,
    AvailableIntegrationsResponse,
    AvailableIntegrationCard,
    ConnectIntegrationRequest,
    ConnectIntegrationResponse,
    IntegrationDetailResponse,
    IntegrationConnectionDetails,
    IntegrationRepoSelection,
    IntegrationSyncSettings,
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
    IntegrationScanConfig,
    IntegrationFileFilters,
    IntegrationScannerOptions,
    IntegrationSyncLogsResponse,
    IntegrationSyncLogItem,
    TriggerSyncResponse,
)


class IaCIntegrationsSuiteService:
    """Service providing stateful operations and audit trails for Section 14."""

    # 14.2 Connected Integrations Store
    _CONNECTED_INTEGRATIONS_DB: List[Dict[str, Any]] = [
        {
            "id": "github",
            "name": "GitHub",
            "type": "Code Repository",
            "status": "Connected",
            "last_sync": "2 min ago",
            "icon": "github",
        },
        {
            "id": "gitlab",
            "name": "GitLab",
            "type": "Code Repository",
            "status": "Connected",
            "last_sync": "5 min ago",
            "icon": "gitlab",
        },
        {
            "id": "azure-devops",
            "name": "Azure DevOps",
            "type": "Code Repository",
            "status": "Connected",
            "last_sync": "12 min ago",
            "icon": "azure",
        },
        {
            "id": "jenkins",
            "name": "Jenkins",
            "type": "CI/CD",
            "status": "Disconnected",
            "last_sync": "3 days ago",
            "icon": "jenkins",
        },
        {
            "id": "github-actions",
            "name": "GitHub Actions",
            "type": "CI/CD",
            "status": "Connected",
            "last_sync": "1 hour ago",
            "icon": "github-actions",
        },
        {
            "id": "terraform-cloud",
            "name": "Terraform Cloud",
            "type": "IaC Management",
            "status": "Connected",
            "last_sync": "10 min ago",
            "icon": "terraform",
        },
        {
            "id": "vault",
            "name": "HashiCorp Vault",
            "type": "Secrets Management",
            "status": "Connected",
            "last_sync": "2 hours ago",
            "icon": "vault",
        },
        {
            "id": "slack",
            "name": "Slack",
            "type": "Notifications",
            "status": "Connected",
            "last_sync": "8 min ago",
            "icon": "slack",
        },
        {
            "id": "teams",
            "name": "Microsoft Teams",
            "type": "Notifications",
            "status": "Not Configured",
            "last_sync": "--",
            "icon": "teams",
        },
        {
            "id": "jira",
            "name": "Jira",
            "type": "Issue Tracking",
            "status": "Connected",
            "last_sync": "30 min ago",
            "icon": "jira",
        },
    ]

    # 14.3 Available Integrations Store (Catalog)
    _AVAILABLE_CATALOG_DB: List[Dict[str, Any]] = [
        {"id": "github", "name": "GitHub", "category": "Source Control", "subtext": "Code Repository", "icon": "github", "is_connected": True},
        {"id": "gitlab", "name": "GitLab", "category": "Source Control", "subtext": "Code Repository", "icon": "gitlab", "is_connected": True},
        {"id": "bitbucket", "name": "Bitbucket", "category": "Source Control", "subtext": "Code Repository", "icon": "bitbucket", "is_connected": False},
        {"id": "azure-devops", "name": "Azure DevOps", "category": "Source Control", "subtext": "Code Repository", "icon": "azure", "is_connected": True},
        {"id": "jenkins", "name": "Jenkins", "category": "CI/CD", "subtext": "CI/CD", "icon": "jenkins", "is_connected": False},
        {"id": "github-actions", "name": "GitHub Actions", "category": "CI/CD", "subtext": "CI/CD", "icon": "github-actions", "is_connected": True},
        {"id": "gitlab-ci", "name": "GitLab CI", "category": "CI/CD", "subtext": "CI/CD", "icon": "gitlab", "is_connected": False},
        {"id": "circleci", "name": "CircleCI", "category": "CI/CD", "subtext": "CI/CD", "icon": "circleci", "is_connected": False},
        {"id": "terraform-cloud", "name": "Terraform Cloud", "category": "IaC Management", "subtext": "IaC Management", "icon": "terraform", "is_connected": True},
        {"id": "aws-codebuild", "name": "AWS CodeBuild", "category": "CI/CD", "subtext": "CI/CD", "icon": "aws", "is_connected": False},
        {"id": "azure-pipelines", "name": "Azure Pipelines", "category": "CI/CD", "subtext": "CI/CD", "icon": "azure", "is_connected": False},
        {"id": "slack", "name": "Slack", "category": "Notifications", "subtext": "Notifications", "icon": "slack", "is_connected": True},
    ]

    # 14.4 GitHub Detail State
    _GITHUB_DETAIL_STATE: Dict[str, Any] = {
        "id": "github",
        "name": "GitHub",
        "type": "Code Repository",
        "status": "Connected",
        "connection_details": {
            "status": "Connected",
            "connected_on": "Sep 24, 2026, 10:12 AM",
            "connected_by": "mayur.bhanvad",
            "app_type": "GitHub App",
            "permissions": "Read-only (Content, Pull requests, Metadata)",
        },
        "repo_selection": {
            "mode": "all",
            "selected_repos": [],
        },
        "sync_settings": {
            "auto_sync_new_repos": True,
            "scan_pull_requests": True,
            "scan_default_branch": True,
        },
    }

    # 14.5 Repositories Store
    _REPOSITORIES_DB: List[Dict[str, Any]] = [
        {"id": "repo-1", "name": "frontend-app", "visibility": "Public", "scan_status": "Enabled", "last_scanned": "2 hours ago"},
        {"id": "repo-2", "name": "backend-service", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "5 hours ago"},
        {"id": "repo-3", "name": "infra-terraform", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "1 hour ago"},
        {"id": "repo-4", "name": "k8s-manifests", "visibility": "Private", "scan_status": "Disabled", "last_scanned": "--"},
        {"id": "repo-5", "name": "helm-charts", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "3 hours ago"},
        {"id": "repo-6", "name": "cloud-resources", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "6 hours ago"},
        {"id": "repo-7", "name": "iac-modules", "visibility": "Public", "scan_status": "Not Configured", "last_scanned": "--"},
        {"id": "repo-8", "name": "production-infra", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "2 hours ago"},
        {"id": "repo-9", "name": "staging-infra", "visibility": "Private", "scan_status": "Enabled", "last_scanned": "1 day ago"},
        {"id": "repo-10", "name": "monitoring-stack", "visibility": "Public", "scan_status": "Not Configured", "last_scanned": "--"},
    ]

    # 14.6 Webhooks Store
    _WEBHOOKS_DB: List[Dict[str, Any]] = [
        {
            "id": "wh-01",
            "webhook_url": "https://app.seculayer.io/api/webhook/github/09f8e7d2",
            "status": "Active",
            "events": "Push, Pull Request",
            "created_at": "Sep 24, 2026",
        }
    ]

    _WEBHOOK_EVENTS_CONFIG: Dict[str, Any] = {
        "push_events": True,
        "pull_request_events": True,
        "merge_events": True,
        "release_events": False,
        "tag_events": False,
    }

    # 14.7 Scan Settings Store
    _DEFAULT_SCAN_SETTINGS: Dict[str, Any] = {
        "scan_config": {
            "scan_on_push": True,
            "scan_on_pr": True,
            "scan_on_merge": False,
        },
        "file_filters": {
            "include_paths": ["**/*.tf", "**/*.tfvars", "**/*.yaml", "**/*.yml", "helm/**"],
            "exclude_paths": ["**/examples/**", "**/test/**", "**/docs/**"],
        },
        "scanner_options": {
            "iac_scanner": "Checkov (Default)",
            "policy_pack": "Default",
            "severity_threshold": "Medium and above",
        },
    }

    _scan_settings_state: Dict[str, Any] = copy.deepcopy(_DEFAULT_SCAN_SETTINGS)

    # 14.8 Sync Logs Store
    _SYNC_LOGS_DB: List[Dict[str, Any]] = [
        {"id": "log-1", "time": "Sep 30, 10:12 AM", "event": "Repository Sync", "status": "Success", "message": "Synced 12 repositories"},
        {"id": "log-2", "time": "Sep 30, 09:45 AM", "event": "Webhook Received", "status": "Success", "message": "Push event processed"},
        {"id": "log-3", "time": "Sep 29, 06:22 PM", "event": "PR Scan Triggered", "status": "Success", "message": "PR #124 scanned"},
        {"id": "log-4", "time": "Sep 29, 04:18 PM", "event": "Scan Completed", "status": "Success", "message": "Found 3 issues"},
        {"id": "log-5", "time": "Sep 28, 11:06 AM", "event": "Repository Added", "status": "Success", "message": "infra-terraform added"},
        {"id": "log-6", "time": "Sep 27, 03:20 PM", "event": "Webhook Failed", "status": "Failed", "message": "Invalid payload signature"},
        {"id": "log-7", "time": "Sep 26, 02:14 PM", "event": "Scan Triggered", "status": "Success", "message": "Push to main"},
        {"id": "log-8", "time": "Sep 25, 08:33 AM", "event": "Repository Removed", "status": "Success", "message": "test-repo removed"},
        {"id": "log-9", "time": "Sep 24, 10:12 AM", "event": "Integration Connected", "status": "Success", "message": "GitHub app connected"},
    ]

    # ── 14.1 Integrations Overview ──
    @classmethod
    def get_overview(cls, repository: str = "frontend-app") -> IntegrationsOverviewResponse:
        popular = [
            PopularIntegrationItem(id="github", name="GitHub", category="Code repository", status="Connected", icon="github"),
            PopularIntegrationItem(id="gitlab", name="GitLab", category="Code repository", status="Connected", icon="gitlab"),
            PopularIntegrationItem(id="jenkins", name="Jenkins", category="CI/CD", status="Disconnected", icon="jenkins"),
            PopularIntegrationItem(id="azure-devops", name="Azure DevOps", category="CI/CD", status="Connected", icon="azure"),
            PopularIntegrationItem(id="terraform-cloud", name="Terraform Cloud", category="IaC Management", status="Connected", icon="terraform"),
        ]

        return IntegrationsOverviewResponse(
            repository=repository,
            kpis=IntegrationOverviewKpis(
                total_integrations=12,
                connected=8,
                disconnected=2,
                failed=1,
                not_configured=1,
            ),
            status_breakdown=IntegrationStatusBreakdown(
                connected=8,
                disconnected=2,
                failed=1,
                not_configured=1,
            ),
            popular_integrations=popular,
        )

    # ── 14.2 Connected Integrations ──
    @classmethod
    def get_connected_integrations(
        cls,
        search: Optional[str] = None,
        type_filter: Optional[str] = None,
    ) -> ConnectedIntegrationsResponse:
        items = list(cls._CONNECTED_INTEGRATIONS_DB)
        if search:
            s = search.lower()
            items = [i for i in items if s in i["name"].lower() or s in i["type"].lower()]
        if type_filter and type_filter != "All Types":
            items = [i for i in items if i["type"].lower() == type_filter.lower()]

        return ConnectedIntegrationsResponse(
            items=[ConnectedIntegrationItem(**item) for item in items],
            total=len(items),
            available_types=[
                "All Types",
                "Code Repository",
                "CI/CD",
                "IaC Management",
                "Secrets Management",
                "Notifications",
                "Issue Tracking",
            ],
        )

    # ── 14.3 Add Integration (Catalog) ──
    @classmethod
    def get_available_integrations(
        cls,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> AvailableIntegrationsResponse:
        items = list(cls._AVAILABLE_CATALOG_DB)
        if search:
            s = search.lower()
            items = [i for i in items if s in i["name"].lower() or s in i["category"].lower()]
        if category and category != "All":
            items = [i for i in items if i["category"].lower() == category.lower()]

        return AvailableIntegrationsResponse(
            items=[AvailableIntegrationCard(**card) for card in items],
            categories=["All", "Source Control", "CI/CD", "IaC Management", "Notifications", "Other"],
        )

    @classmethod
    def connect_integration(cls, req: ConnectIntegrationRequest) -> ConnectIntegrationResponse:
        # Check if already present in connected
        found = next((i for i in cls._CONNECTED_INTEGRATIONS_DB if i["id"] == req.integration_id), None)
        if found:
            found["status"] = "Connected"
            found["last_sync"] = "Just now"
        else:
            catalog_item = next((c for c in cls._AVAILABLE_CATALOG_DB if c["id"] == req.integration_id), None)
            name = catalog_item["name"] if catalog_item else req.integration_id.title()
            category = catalog_item["category"] if catalog_item else "Other"
            cls._CONNECTED_INTEGRATIONS_DB.append({
                "id": req.integration_id,
                "name": name,
                "type": category,
                "status": "Connected",
                "last_sync": "Just now",
                "icon": req.integration_id,
            })
        
        # Log to sync logs
        cls._SYNC_LOGS_DB.insert(0, {
            "id": f"log-{len(cls._SYNC_LOGS_DB) + 1}",
            "time": datetime.now().strftime("%b %d, %I:%M %p"),
            "event": "Integration Connected",
            "status": "Success",
            "message": f"{req.integration_id} connected successfully",
        })

        return ConnectIntegrationResponse(
            success=True,
            message=f"{req.integration_id} connected successfully.",
            integration_id=req.integration_id,
        )

    # ── 14.4 Integration Detail (GitHub) ──
    @classmethod
    def get_integration_detail(cls, integration_id: str = "github") -> IntegrationDetailResponse:
        state = copy.deepcopy(cls._GITHUB_DETAIL_STATE)
        return IntegrationDetailResponse(
            id=state["id"],
            name=state["name"],
            type=state["type"],
            status=state["status"],
            connection_details=IntegrationConnectionDetails(**state["connection_details"]),
            repo_selection=IntegrationRepoSelection(**state["repo_selection"]),
            sync_settings=IntegrationSyncSettings(**state["sync_settings"]),
        )

    @classmethod
    def update_integration_detail(
        cls,
        integration_id: str,
        req: UpdateIntegrationDetailRequest,
    ) -> IntegrationDetailResponse:
        if req.repo_selection:
            cls._GITHUB_DETAIL_STATE["repo_selection"] = req.repo_selection.model_dump()
        if req.sync_settings:
            cls._GITHUB_DETAIL_STATE["sync_settings"] = req.sync_settings.model_dump()
        return cls.get_integration_detail(integration_id)

    @classmethod
    def reconnect_integration(cls, integration_id: str) -> IntegrationDetailResponse:
        cls._GITHUB_DETAIL_STATE["status"] = "Connected"
        cls._GITHUB_DETAIL_STATE["connection_details"]["status"] = "Connected"
        cls._GITHUB_DETAIL_STATE["connection_details"]["connected_on"] = datetime.now().strftime("%b %d, %Y, %I:%M %p")
        return cls.get_integration_detail(integration_id)

    @classmethod
    def disconnect_integration(cls, integration_id: str) -> Dict[str, Any]:
        cls._GITHUB_DETAIL_STATE["status"] = "Disconnected"
        cls._GITHUB_DETAIL_STATE["connection_details"]["status"] = "Disconnected"
        found = next((i for i in cls._CONNECTED_INTEGRATIONS_DB if i["id"] == integration_id), None)
        if found:
            found["status"] = "Disconnected"
        return {"success": True, "message": f"{integration_id} disconnected successfully."}

    # ── 14.5 Repositories ──
    @classmethod
    def get_repositories(
        cls,
        search: Optional[str] = None,
        status: Optional[str] = None,
        visibility: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IntegrationRepositoriesResponse:
        items = list(cls._REPOSITORIES_DB)
        if search:
            s = search.lower()
            items = [r for r in items if s in r["name"].lower()]
        if status and status != "All Status":
            items = [r for r in items if r["scan_status"].lower() == status.lower()]
        if visibility and visibility != "All Visibility":
            items = [r for r in items if r["visibility"].lower() == visibility.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paginated = items[start : start + page_size]
        total_pages = max(1, (total + page_size - 1) // page_size)

        return IntegrationRepositoriesResponse(
            items=[IntegrationRepositoryItem(**item) for item in paginated],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            available_statuses=["All Status", "Enabled", "Disabled", "Not Configured"],
            available_visibilities=["All Visibility", "Public", "Private"],
        )

    @classmethod
    def toggle_repo_scan_status(
        cls,
        repo_id: str,
        scan_status: str,
    ) -> IntegrationRepositoryItem:
        found = next((r for r in cls._REPOSITORIES_DB if r["id"] == repo_id or r["name"] == repo_id), None)
        if not found:
            raise ValueError(f"Repository {repo_id} not found")
        found["scan_status"] = scan_status
        return IntegrationRepositoryItem(**found)

    # ── 14.6 Webhooks ──
    @classmethod
    def get_webhooks(cls, integration_id: str = "github") -> IntegrationWebhooksResponse:
        return IntegrationWebhooksResponse(
            webhooks=[IntegrationWebhookItem(**w) for w in cls._WEBHOOKS_DB],
            events_config=WebhookEventsConfig(**cls._WEBHOOK_EVENTS_CONFIG),
        )

    @classmethod
    def update_webhook_config(
        cls,
        integration_id: str,
        req: UpdateWebhookConfigRequest,
    ) -> WebhookEventsConfig:
        cls._WEBHOOK_EVENTS_CONFIG = req.events_config.model_dump()
        return WebhookEventsConfig(**cls._WEBHOOK_EVENTS_CONFIG)

    @classmethod
    def create_webhook(
        cls,
        integration_id: str,
        req: CreateWebhookRequest,
    ) -> IntegrationWebhookItem:
        new_wh = {
            "id": f"wh-{len(cls._WEBHOOKS_DB) + 1:02d}",
            "webhook_url": req.webhook_url,
            "status": "Active",
            "events": req.events or "Push, Pull Request",
            "created_at": datetime.now().strftime("%b %d, %Y"),
        }
        cls._WEBHOOKS_DB.append(new_wh)
        return IntegrationWebhookItem(**new_wh)

    @classmethod
    def test_webhook(cls, integration_id: str = "github") -> TestWebhookResponse:
        return TestWebhookResponse(
            success=True,
            status_code=200,
            latency_ms=142,
            message="Webhook test ping acknowledged with 200 OK signature verified.",
        )

    # ── 14.7 Scan Settings (Integration Level) ──
    @classmethod
    def get_scan_settings(cls, integration_id: str = "github") -> IntegrationScanSettingsDTO:
        state = cls._scan_settings_state
        return IntegrationScanSettingsDTO(
            scan_config=IntegrationScanConfig(**state["scan_config"]),
            file_filters=IntegrationFileFilters(**state["file_filters"]),
            scanner_options=IntegrationScannerOptions(**state["scanner_options"]),
        )

    @classmethod
    def update_scan_settings(
        cls,
        integration_id: str,
        payload: Dict[str, Any],
    ) -> IntegrationScanSettingsDTO:
        if "scan_config" in payload and isinstance(payload["scan_config"], dict):
            cls._scan_settings_state["scan_config"].update(payload["scan_config"])
        if "file_filters" in payload and isinstance(payload["file_filters"], dict):
            cls._scan_settings_state["file_filters"].update(payload["file_filters"])
        if "scanner_options" in payload and isinstance(payload["scanner_options"], dict):
            cls._scan_settings_state["scanner_options"].update(payload["scanner_options"])
        return cls.get_scan_settings(integration_id)

    @classmethod
    def reset_scan_settings(cls, integration_id: str = "github") -> IntegrationScanSettingsDTO:
        cls._scan_settings_state = copy.deepcopy(cls._DEFAULT_SCAN_SETTINGS)
        return cls.get_scan_settings(integration_id)

    # ── 14.8 Sync Logs ──
    @classmethod
    def get_sync_logs(
        cls,
        integration_id: str = "github",
        event: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IntegrationSyncLogsResponse:
        items = list(cls._SYNC_LOGS_DB)
        if event and event != "All Events":
            items = [l for l in items if l["event"].lower() == event.lower()]

        total = len(items)
        start = (page - 1) * page_size
        paginated = items[start : start + page_size]
        total_pages = max(1, (total + page_size - 1) // page_size)

        return IntegrationSyncLogsResponse(
            items=[IntegrationSyncLogItem(**item) for item in paginated],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            available_events=[
                "All Events",
                "Repository Sync",
                "Webhook Received",
                "PR Scan Triggered",
                "Scan Completed",
                "Repository Added",
                "Webhook Failed",
                "Scan Triggered",
                "Repository Removed",
                "Integration Connected",
            ],
        )

    @classmethod
    def trigger_sync(cls, integration_id: str = "github") -> TriggerSyncResponse:
        now_str = datetime.now().strftime("%b %d, %I:%M %p")
        cls._SYNC_LOGS_DB.insert(0, {
            "id": f"log-{len(cls._SYNC_LOGS_DB) + 1}",
            "time": now_str,
            "event": "Repository Sync",
            "status": "Success",
            "message": "Manual synchronization triggered; updated 10 repositories",
        })
        return TriggerSyncResponse(
            success=True,
            message="Repository synchronization completed successfully.",
            synced_at=now_str,
        )
