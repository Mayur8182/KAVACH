"""
Unit & Integration Tests for IaC Security Settings Suite API — Section 15 (Screens 15.1 through 15.7)
Endpoints under /api/v1/iac/settings-suite
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_all_settings():
    """Verify Master Aggregate Settings endpoint returns full data across 7 screens."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/settings-suite/all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository"] == "frontend-app"
        assert "general" in data
        assert "scan" in data
        assert "rules_policies" in data
        assert "exclusions" in data
        assert "notifications" in data
        assert "access" in data
        assert "advanced" in data


@pytest.mark.asyncio
async def test_general_settings():
    """Screen 15.1: General Settings GET, PUT, and Reset."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/general")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository"] == "frontend-app"
        assert data["default_branch"] == "main"
        assert data["iac_working_directory"] == "/"
        assert "Terraform" in data["supported_iac_types"]
        assert data["auto_scan_on_push"] is True
        assert data["scan_on_pr"] is True

        # PUT update
        update_resp = await client.put(
            "/api/v1/iac/settings-suite/general",
            json={"iac_working_directory": "/infra", "scan_on_schedule": True},
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["iac_working_directory"] == "/infra"
        assert updated["scan_on_schedule"] is True

        # POST reset
        reset_resp = await client.post("/api/v1/iac/settings-suite/general/reset")
        assert reset_resp.status_code == 200
        reset_data = reset_resp.json()
        assert reset_data["iac_working_directory"] == "/"
        assert reset_data["scan_on_schedule"] is False


@pytest.mark.asyncio
async def test_scan_settings():
    """Screen 15.2: Scan Settings GET, PUT, check updates, and Reset."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/scan")
        assert resp.status_code == 200
        data = resp.json()
        assert "Checkov" in data["iac_scanner"]
        assert data["scanner_version"] == "2.4.1"
        assert data["parallel_scans"] == 4
        assert data["max_file_size_mb"] == 5

        # Check Updates
        chk_resp = await client.post("/api/v1/iac/settings-suite/scan/check-updates")
        assert chk_resp.status_code == 200
        assert chk_resp.json()["is_latest"] is True

        # PUT update
        up_resp = await client.put(
            "/api/v1/iac/settings-suite/scan",
            json={"parallel_scans": 8, "max_file_size_mb": 10},
        )
        assert up_resp.status_code == 200
        assert up_resp.json()["parallel_scans"] == 8
        assert up_resp.json()["max_file_size_mb"] == 10

        # Reset
        reset_resp = await client.post("/api/v1/iac/settings-suite/scan/reset")
        assert reset_resp.status_code == 200
        assert reset_resp.json()["parallel_scans"] == 4


@pytest.mark.asyncio
async def test_rules_policies():
    """Screen 15.3: Rules & Policies GET, Toggle Policy Pack, and Severity Mapping."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/rules-policies")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["policy_packs"]) >= 8
        names = [p["name"] for p in data["policy_packs"]]
        assert "Checkov Default" in names
        assert "CIS AWS" in names
        assert "CIS Kubernetes" in names
        assert "NIST 800-53" in names

        # Severity mappings
        mappings = data["severity_mappings"]
        assert "Checkov" in mappings
        assert "tfsec" in mappings
        assert "kube-score" in mappings

        # Toggle Policy Pack (e.g. NIST 800-53 from Disabled to Enabled)
        toggle_resp = await client.patch("/api/v1/iac/settings-suite/rules-policies/packs/NIST 800-53/status?status=Enabled")
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["status"] == "Enabled"

        # Reset
        reset_resp = await client.post("/api/v1/iac/settings-suite/rules-policies/reset")
        assert reset_resp.status_code == 200
        nist = next(p for p in reset_resp.json()["policy_packs"] if p["name"] == "NIST 800-53")
        assert nist["status"] == "Disabled"


@pytest.mark.asyncio
async def test_exclusions_and_preview():
    """Screen 15.4: Exclusions GET, preview pattern tester, add, and delete."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/exclusions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["exclusions"]) >= 6

        # Preview: file that SHOULD be included
        prev_incl = await client.post(
            "/api/v1/iac/settings-suite/exclusions/preview",
            json={"file_path": "infra/terraform/main.tf"},
        )
        assert prev_incl.status_code == 200
        assert prev_incl.json()["is_excluded"] is False
        assert "included" in prev_incl.json()["message"]

        # Preview: file matching **/tests/** pattern
        prev_excl = await client.post(
            "/api/v1/iac/settings-suite/exclusions/preview",
            json={"file_path": "modules/network/tests/integration_test.tf"},
        )
        assert prev_excl.status_code == 200
        assert prev_excl.json()["is_excluded"] is True
        assert "excluded" in prev_excl.json()["message"]

        # Add new exclusion
        add_resp = await client.post(
            "/api/v1/iac/settings-suite/exclusions",
            json={
                "pattern": "**/temp/**",
                "type": "Directory",
                "description": "Temporary generated scripts",
            },
        )
        assert add_resp.status_code == 201
        created_id = add_resp.json()["id"]

        # Delete exclusion
        del_resp = await client.delete(f"/api/v1/iac/settings-suite/exclusions/{created_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["success"] is True


@pytest.mark.asyncio
async def test_notifications():
    """Screen 15.5: Notifications GET, PUT, add channel, and delete channel."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["enable_notifications"] is True
        assert len(data["channels"]) >= 4

        # Add channel
        add_chan = await client.post(
            "/api/v1/iac/settings-suite/notifications/channels",
            json={
                "channel": "security-pagerduty",
                "type": "Webhook",
                "configuration": "https://events.pagerduty.com/v2/enqueue",
                "status": "Active",
            },
        )
        assert add_chan.status_code == 201
        chan_id = add_chan.json()["id"]

        # Delete channel
        del_chan = await client.delete(f"/api/v1/iac/settings-suite/notifications/channels/{chan_id}")
        assert del_chan.status_code == 200
        assert del_chan.json()["success"] is True


@pytest.mark.asyncio
async def test_access_and_permissions():
    """Screen 15.6: Access & Permissions GET, add user, change role, and delete user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/access")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["users"]) >= 5
        assert len(data["roles"]) == 4

        # Add user
        add_usr = await client.post(
            "/api/v1/iac/settings-suite/access/users",
            json={"user": "alex.engineer", "role": "Editor", "status": "Active"},
        )
        assert add_usr.status_code == 201
        usr_id = add_usr.json()["id"]
        assert add_usr.json()["avatar_initials"] == "AE"

        # Update role to Admin
        role_resp = await client.put(f"/api/v1/iac/settings-suite/access/users/{usr_id}/role?new_role=Admin")
        assert role_resp.status_code == 200
        assert role_resp.json()["role"] == "Admin"
        assert role_resp.json()["permissions"] == "Full access"

        # Delete user
        del_usr = await client.delete(f"/api/v1/iac/settings-suite/access/users/{usr_id}")
        assert del_usr.status_code == 200
        assert del_usr.json()["success"] is True


@pytest.mark.asyncio
async def test_advanced_settings():
    """Screen 15.7: Advanced Settings GET, PUT, add env variable, and delete env variable."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        resp = await client.get("/api/v1/iac/settings-suite/advanced")
        assert resp.status_code == 200
        data = resp.json()
        assert data["scan_timeout_minutes"] == 10
        assert data["max_memory_usage_gb"] == 2
        assert len(data["environment_variables"]) >= 1

        # Add variable
        add_var = await client.post(
            "/api/v1/iac/settings-suite/advanced/env-vars",
            json={"name": "CHECKOV_ENABLE_SECRET_SCANNING", "value": "true"},
        )
        assert add_var.status_code == 200
        assert add_var.json()["name"] == "CHECKOV_ENABLE_SECRET_SCANNING"

        # Delete variable
        del_var = await client.delete("/api/v1/iac/settings-suite/advanced/env-vars/CHECKOV_ENABLE_SECRET_SCANNING")
        assert del_var.status_code == 200
        assert del_var.json()["success"] is True


@pytest.mark.asyncio
async def test_reset_all_settings():
    """Reset all 7 settings suites back to defaults."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/iac/settings-suite/reset-all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["general"]["iac_working_directory"] == "/"
        assert data["scan"]["parallel_scans"] == 4
