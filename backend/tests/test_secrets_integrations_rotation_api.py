import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_integrations_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp_ov = await client.get("/api/v1/code/secrets/integrations/overview")
        assert resp_ov.status_code == 401

        resp_rules = await client.get("/api/v1/code/secrets/rotation/rules")
        assert resp_rules.status_code == 401

        resp_set = await client.get("/api/v1/code/secrets/rotation/settings")
        assert resp_set.status_code == 401


@pytest.mark.asyncio
async def test_secrets_integrations_overview(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/secrets/integrations/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # 1. 4 Top KPI Cards matching screenshot
    kpis = data["kpis"]
    assert kpis["connected_tools"] == 5
    assert kpis["auto_rotation_rules"] == 8
    assert kpis["auto_rotation_rules_trend"] == "↑ 33%"
    assert kpis["secrets_rotated"] >= 14
    assert kpis["secrets_rotated_trend"] == "↑ 75%"
    assert kpis["integration_health_pct"] == 100

    # 2. 6 Integration Tool Cards
    tools = data["connected_tools"]
    assert len(tools) == 6
    tool_map = {t["id"]: t for t in tools}
    assert tool_map["github"]["status"] == "Connected"
    assert tool_map["gitlab"]["status"] == "Connected"
    assert tool_map["jenkins"]["status"] == "Connected"
    assert tool_map["azure"]["status"] == "Connected"
    assert tool_map["aws"]["status"] == "Connected"
    assert tool_map["kubernetes"]["status"] == "Not Connected"

    # 3. 8 Rotation Rules
    rules = data["rotation_rules"]
    assert len(rules) >= 8
    rule_names = [r["name"] for r in rules]
    assert "AWS Access Key Rotation" in rule_names
    assert "Database Password Rotation" in rule_names
    assert "GitHub Token Rotation" in rule_names
    assert "API Key Rotation" in rule_names
    assert "Stripe Key Rotation" in rule_names
    assert "SendGrid Key Rotation" in rule_names
    assert "Kubernetes Token Rotation" in rule_names
    assert "Slack Webhook Rotation" in rule_names

    # 4. 5 Recent Rotation Activity
    recent = data["recent_activity"]
    assert len(recent) >= 5
    recent_names = [a["secret_name"] for a in recent]
    assert "AWS_ACCESS_KEY_ID" in recent_names
    assert "DB_PASSWORD" in recent_names
    assert "GITHUB_TOKEN" in recent_names
    assert "STRIPE_API_KEY" in recent_names
    assert "SENDGRID_API_KEY" in recent_names

    # 5. Integration Activity
    events = data["integration_activity"]
    assert len(events) >= 6
    assert events[0]["tool_name"] in ["GitHub", "SecuLayer Vault"]

    # 6. Rotation Statistics (Sep 1 to Sep 30)
    stats = data["rotation_statistics"]
    assert len(stats) == 7
    assert stats[0]["date"] == "Sep 1"
    assert stats[3]["date"] == "Sep 15"
    assert stats[3]["rotated"] == 8
    assert stats[-1]["date"] == "Sep 30"

    # 7. Config & Toggles
    cfg = data["config"]
    assert cfg["auto_create_issues"] is True
    assert cfg["fail_cicd_builds"] is True
    assert cfg["sync_with_external_tools"] is True
    assert "admin@njgroup.com" in cfg["notification_email"]


@pytest.mark.asyncio
async def test_rotation_rules_filtering_and_crud(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # 1. Filter by secret_type
    resp_type = await client.get(
        "/api/v1/code/secrets/rotation/rules?secret_type=AWS%20Key", headers=headers
    )
    assert resp_type.status_code == 200
    aws_rules = resp_type.json()
    assert len(aws_rules) == 1
    assert aws_rules[0]["name"] == "AWS Access Key Rotation"

    # 2. Search
    resp_search = await client.get(
        "/api/v1/code/secrets/rotation/rules?search=stripe", headers=headers
    )
    assert resp_search.status_code == 200
    stripe_rules = resp_search.json()
    assert len(stripe_rules) == 1
    assert stripe_rules[0]["name"] == "Stripe Key Rotation"

    # 3. Create rule
    new_rule_payload = {
        "name": "Auth0 Client Secret Rotation",
        "secret_type": "OAuth Secret",
        "repository_scope": "identity-service",
        "rotation_interval_days": 30,
        "status": "Active",
    }
    create_resp = await client.post(
        "/api/v1/code/secrets/rotation/rules", json=new_rule_payload, headers=headers
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    rule_id = created["id"]
    assert created["name"] == "Auth0 Client Secret Rotation"
    assert created["rotation_interval_label"] == "30 days"

    # 4. Patch rule
    patch_payload = {
        "rotation_interval_days": 45,
        "status": "Paused",
    }
    patch_resp = await client.patch(
        f"/api/v1/code/secrets/rotation/rules/{rule_id}", json=patch_payload, headers=headers
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched["status"] == "Paused"
    assert patched["rotation_interval_label"] == "45 days"


@pytest.mark.asyncio
async def test_trigger_secret_rotation_mutation(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # Trigger rotation on rot-01
    resp = await client.post(
        "/api/v1/code/secrets/rotation/rules/rot-01/rotate", headers=headers
    )
    assert resp.status_code == 200
    rot_data = resp.json()
    assert rot_data["status"] == "Success"
    assert "activity_id" in rot_data

    # Check overview to see updated recent activity
    ov_resp = await client.get(
        "/api/v1/code/secrets/integrations/overview", headers=headers
    )
    assert ov_resp.status_code == 200
    ov_data = ov_resp.json()
    recent = ov_data["recent_activity"]
    assert recent[0]["id"] == rot_data["activity_id"]


@pytest.mark.asyncio
async def test_tool_connection_and_sync(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # 1. Connect Kubernetes
    connect_payload = {
        "tool_id": "kubernetes",
        "enabled": True,
        "credentials_key": "k8s-cluster-token-xyz",
    }
    resp_conn = await client.post(
        "/api/v1/code/secrets/integrations/connect", json=connect_payload, headers=headers
    )
    assert resp_conn.status_code == 200
    tool = resp_conn.json()
    assert tool["id"] == "kubernetes"
    assert tool["status"] == "Connected"

    # 2. Trigger sync on GitHub
    resp_sync = await client.post(
        "/api/v1/code/secrets/integrations/github/sync", headers=headers
    )
    assert resp_sync.status_code == 200
    synced = resp_sync.json()
    assert synced["last_sync"] == "Just now"


@pytest.mark.asyncio
async def test_config_settings_and_export(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # 1. Update integration config
    cfg_payload = {
        "notification_email": "security-team@njgroup.com",
        "auto_create_issues": False,
    }
    resp_cfg = await client.put(
        "/api/v1/code/secrets/integrations/config", json=cfg_payload, headers=headers
    )
    assert resp_cfg.status_code == 200
    saved_cfg = resp_cfg.json()
    assert saved_cfg["notification_email"] == "security-team@njgroup.com"
    assert saved_cfg["auto_create_issues"] is False

    # 2. Update rotation settings
    settings_payload = {
        "default_rotation_interval_days": 90,
        "failure_retry_limit": 5,
        "slack_notifications_enabled": True,
        "email_alerts_enabled": True,
        "require_two_person_approval_for_prod": True,
    }
    resp_set = await client.put(
        "/api/v1/code/secrets/rotation/settings", json=settings_payload, headers=headers
    )
    assert resp_set.status_code == 200
    saved_set = resp_set.json()
    assert saved_set["default_rotation_interval_days"] == 90
    assert saved_set["failure_retry_limit"] == 5
    assert saved_set["require_two_person_approval_for_prod"] is True

    # 3. Export data
    resp_exp = await client.get(
        "/api/v1/code/secrets/integrations/export?format=json", headers=headers
    )
    assert resp_exp.status_code == 200
    exp_data = resp_exp.json()
    assert exp_data["format"] == "json"
    assert len(exp_data["tools"]) >= 6
    assert len(exp_data["rules"]) >= 8
    assert len(exp_data["recent_activity"]) >= 5
