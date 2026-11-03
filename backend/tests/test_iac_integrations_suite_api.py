"""
Unit & Integration Tests for IaC Security Integrations Suite API — Section 14 (Screens 14.1 through 14.8)
Endpoints under /api/v1/iac/integrations-suite
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_14_1_integrations_overview():
    """Screen 14.1: Integrations Overview with 4 KPIs, donut breakdown, popular integrations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/integrations-suite/overview?repository=frontend-app")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository"] == "frontend-app"

        # Verify 4 KPIs
        kpis = data["kpis"]
        assert kpis["total_integrations"] == 12
        assert kpis["connected"] == 8
        assert kpis["disconnected"] == 2
        assert kpis["failed"] == 1
        assert kpis["not_configured"] == 1

        # Verify breakdown
        bd = data["status_breakdown"]
        assert bd["connected"] == 8
        assert bd["disconnected"] == 2

        # Popular Integrations list
        pop_names = [p["name"] for p in data["popular_integrations"]]
        assert "GitHub" in pop_names
        assert "GitLab" in pop_names
        assert "Jenkins" in pop_names
        assert "Azure DevOps" in pop_names
        assert "Terraform Cloud" in pop_names


@pytest.mark.asyncio
async def test_14_2_connected_integrations():
    """Screen 14.2: Connected Integrations list, search, and type filtering."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Default listing
        resp = await client.get("/api/v1/iac/integrations-suite/connected")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 10
        assert len(data["items"]) == 10
        assert "All Types" in data["available_types"]

        # Search by name
        search_resp = await client.get("/api/v1/iac/integrations-suite/connected?search=Vault")
        assert search_resp.status_code == 200
        s_data = search_resp.json()
        assert s_data["total"] == 1
        assert s_data["items"][0]["name"] == "HashiCorp Vault"

        # Filter by type
        type_resp = await client.get("/api/v1/iac/integrations-suite/connected?type_filter=CI/CD")
        assert type_resp.status_code == 200
        t_data = type_resp.json()
        assert t_data["total"] >= 2
        assert all(item["type"] == "CI/CD" for item in t_data["items"])


@pytest.mark.asyncio
async def test_14_3_add_integration_catalog_and_connect():
    """Screen 14.3: Add Integration catalog categories and connection mutation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Catalog list
        resp = await client.get("/api/v1/iac/integrations-suite/catalog")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) >= 12
        assert "Source Control" in data["categories"]
        assert "CI/CD" in data["categories"]

        # Connect an integration
        conn_resp = await client.post(
            "/api/v1/iac/integrations-suite/connect",
            json={"integration_id": "bitbucket", "auth_type": "oauth"},
        )
        assert conn_resp.status_code == 200
        conn_data = conn_resp.json()
        assert conn_data["success"] is True
        assert conn_data["integration_id"] == "bitbucket"


@pytest.mark.asyncio
async def test_14_4_integration_detail_lifecycle():
    """Screen 14.4: Integration Detail (GitHub) info, sync settings update, reconnect, disconnect."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET Detail
        resp = await client.get("/api/v1/iac/integrations-suite/detail/github")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "github"
        assert data["name"] == "GitHub"
        assert data["connection_details"]["status"] == "Connected"
        assert data["connection_details"]["connected_by"] == "mayur.bhanvad"
        assert data["sync_settings"]["scan_pull_requests"] is True

        # PUT update settings
        update_resp = await client.put(
            "/api/v1/iac/integrations-suite/detail/github",
            json={
                "repo_selection": {"mode": "select", "selected_repos": ["frontend-app", "infra-terraform"]},
                "sync_settings": {"auto_sync_new_repos": True, "scan_pull_requests": True, "scan_default_branch": False},
            },
        )
        assert update_resp.status_code == 200
        up_data = update_resp.json()
        assert up_data["repo_selection"]["mode"] == "select"
        assert up_data["sync_settings"]["scan_default_branch"] is False

        # POST reconnect
        rec_resp = await client.post("/api/v1/iac/integrations-suite/detail/github/reconnect")
        assert rec_resp.status_code == 200
        rec_data = rec_resp.json()
        assert rec_data["connection_details"]["status"] == "Connected"

        # POST disconnect
        disc_resp = await client.post("/api/v1/iac/integrations-suite/detail/github/disconnect")
        assert disc_resp.status_code == 200
        assert disc_resp.json()["success"] is True

        # Re-connect for subsequent tests
        await client.post("/api/v1/iac/integrations-suite/detail/github/reconnect")


@pytest.mark.asyncio
async def test_14_5_repositories_and_toggle():
    """Screen 14.5: Repositories table, search, and scan status toggle."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET Repositories
        resp = await client.get("/api/v1/iac/integrations-suite/repositories")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 10
        repo_names = [r["name"] for r in data["items"]]
        assert "frontend-app" in repo_names
        assert "k8s-manifests" in repo_names

        # Toggle scan status
        toggle_resp = await client.put(
            "/api/v1/iac/integrations-suite/repositories/frontend-app/status",
            json={"scan_status": "Disabled"},
        )
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["scan_status"] == "Disabled"

        # Re-enable
        re_resp = await client.put(
            "/api/v1/iac/integrations-suite/repositories/frontend-app/status",
            json={"scan_status": "Enabled"},
        )
        assert re_resp.status_code == 200
        assert re_resp.json()["scan_status"] == "Enabled"


@pytest.mark.asyncio
async def test_14_6_webhooks_and_events():
    """Screen 14.6: Webhook configuration, test webhook ping, events config update."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET Webhooks
        resp = await client.get("/api/v1/iac/integrations-suite/webhooks/github")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["webhooks"]) >= 1
        assert "seculayer.io" in data["webhooks"][0]["webhook_url"]
        assert data["events_config"]["push_events"] is True

        # Update events configuration
        up_resp = await client.put(
            "/api/v1/iac/integrations-suite/webhooks/github/config",
            json={
                "events_config": {
                    "push_events": True,
                    "pull_request_events": True,
                    "merge_events": True,
                    "release_events": True,
                    "tag_events": False,
                }
            },
        )
        assert up_resp.status_code == 200
        assert up_resp.json()["release_events"] is True

        # Test webhook ping
        test_resp = await client.post("/api/v1/iac/integrations-suite/webhooks/github/test")
        assert test_resp.status_code == 200
        t_data = test_resp.json()
        assert t_data["success"] is True
        assert t_data["status_code"] == 200
        assert t_data["latency_ms"] > 0


@pytest.mark.asyncio
async def test_14_7_scan_settings():
    """Screen 14.7: Integration level Scan Settings GET, PUT, and Reset."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET Scan Settings
        resp = await client.get("/api/v1/iac/integrations-suite/scan-settings/github")
        assert resp.status_code == 200
        data = resp.json()
        assert data["scan_config"]["scan_on_push"] is True
        assert "**/*.tf" in data["file_filters"]["include_paths"]
        assert data["scanner_options"]["iac_scanner"] == "Checkov (Default)"

        # PUT update settings
        up_resp = await client.put(
            "/api/v1/iac/integrations-suite/scan-settings/github",
            json={
                "scan_config": {"scan_on_merge": True},
                "scanner_options": {"severity_threshold": "High and above"},
            },
        )
        assert up_resp.status_code == 200
        up_data = up_resp.json()
        assert up_data["scan_config"]["scan_on_merge"] is True
        assert up_data["scanner_options"]["severity_threshold"] == "High and above"

        # POST reset
        reset_resp = await client.post("/api/v1/iac/integrations-suite/scan-settings/github/reset")
        assert reset_resp.status_code == 200
        r_data = reset_resp.json()
        assert r_data["scan_config"]["scan_on_merge"] is False
        assert r_data["scanner_options"]["severity_threshold"] == "Medium and above"


@pytest.mark.asyncio
async def test_14_8_sync_logs_and_trigger():
    """Screen 14.8: Sync Logs timeline, event filter, manual trigger sync."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET Sync Logs
        resp = await client.get("/api/v1/iac/integrations-suite/sync-logs/github")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 9
        assert "Repository Sync" in data["available_events"]

        # Filter by event
        filter_resp = await client.get("/api/v1/iac/integrations-suite/sync-logs/github?event=Repository+Sync")
        assert filter_resp.status_code == 200
        f_data = filter_resp.json()
        assert f_data["total"] >= 1
        assert all(item["event"] == "Repository Sync" for item in f_data["items"])

        # POST trigger manual sync
        trig_resp = await client.post("/api/v1/iac/integrations-suite/sync/github")
        assert trig_resp.status_code == 200
        trig_data = trig_resp.json()
        assert trig_data["success"] is True
        assert "completed successfully" in trig_data["message"]
