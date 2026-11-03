import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_remediation_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/remediation/metrics")
        assert resp.status_code == 401

        resp_list = await client.get("/api/v1/code/secrets/remediation/findings")
        assert resp_list.status_code == 401


@pytest.mark.asyncio
async def test_secrets_remediation_metrics(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. GET /api/v1/code/secrets/remediation/metrics
    resp = await client.get("/api/v1/code/secrets/remediation/metrics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["open_findings"] == 18
    assert data["open_trend"] == "↓ 25%"
    assert data["remediated"] == 12
    assert data["remediated_trend"] == "↑ 40%"
    assert data["in_progress"] == 6
    assert data["in_progress_trend"] == "↓ 14%"
    assert data["prs_created"] == 2
    assert data["prs_trend"] == "↑ 100%"


@pytest.mark.asyncio
async def test_secrets_remediation_findings_tabs(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Tab 1: open
    resp_open = await client.get("/api/v1/code/secrets/remediation/findings?tab=open", headers=headers)
    assert resp_open.status_code == 200
    data_open = resp_open.json()
    assert data_open["open_count"] == 18
    assert len(data_open["items"]) == 18
    for item in data_open["items"]:
        assert item["status"] == "Open"

    # Tab 2: in_progress
    resp_inp = await client.get("/api/v1/code/secrets/remediation/findings?tab=in_progress", headers=headers)
    assert resp_inp.status_code == 200
    data_inp = resp_inp.json()
    assert data_inp["in_progress_count"] == 6
    assert len(data_inp["items"]) == 6
    for item in data_inp["items"]:
        assert item["status"] == "In Progress"

    # Tab 3: remediated
    resp_rem = await client.get("/api/v1/code/secrets/remediation/findings?tab=remediated", headers=headers)
    assert resp_rem.status_code == 200
    data_rem = resp_rem.json()
    assert data_rem["remediated_count"] == 12
    assert len(data_rem["items"]) == 12
    for item in data_rem["items"]:
        assert item["status"] == "Remediated"

    # Tab 4: ignored
    resp_ign = await client.get("/api/v1/code/secrets/remediation/findings?tab=ignored", headers=headers)
    assert resp_ign.status_code == 200
    data_ign = resp_ign.json()
    assert data_ign["ignored_count"] == 3
    assert len(data_ign["items"]) == 3
    for item in data_ign["items"]:
        assert item["status"] == "Ignored"


@pytest.mark.asyncio
async def test_secrets_remediation_filters_and_search(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Filter by severity = Critical
    resp = await client.get("/api/v1/code/secrets/remediation/findings?severity=Critical", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) > 0
    assert all(it["severity"] == "Critical" for it in items)

    # Search for "AWS"
    resp_search = await client.get("/api/v1/code/secrets/remediation/findings?search=AWS", headers=headers)
    assert resp_search.status_code == 200
    items_search = resp_search.json()["items"]
    assert any("AWS" in it["title"] or "aws" in it["file_path"].lower() for it in items_search)


@pytest.mark.asyncio
async def test_secrets_remediation_detail_and_diff(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/secrets/remediation/findings/rem_sec_01", headers=headers)
    assert resp.status_code == 200
    item = resp.json()

    assert item["id"] == "rem_sec_01"
    assert item["title"] == "AWS Access Key"
    assert item["severity"] == "Critical"
    assert item["file_path"] == "src/config/aws.js"
    assert item["line_number"] == 16
    assert item["detected_value"] == "AKIAIOSFODNN7EXAMPLE"

    # Verify code diff
    diff = item["diff"]
    assert diff["file_path"] == "src/config/aws.js"
    assert len(diff["before_lines"]) > 0
    assert len(diff["after_lines"]) > 0

    # Verify 5-step action plan
    actions = item["actions"]
    assert "Revoke Exposed Key" in actions["step_1_title"]
    assert "Update Code" in actions["step_2_title"]
    assert "Create Pull Request" in actions["step_3_title"]
    assert "Rotate Credentials" in actions["step_4_title"]
    assert "Verify Fix" in actions["step_5_title"]


@pytest.mark.asyncio
async def test_secrets_remediation_status_update(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Update status to "In Progress"
    payload = {"status": "In Progress", "reason": "Engineer investigating rotation"}
    resp = await client.post("/api/v1/code/secrets/remediation/findings/rem_sec_01/status", json=payload, headers=headers)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["status"] == "In Progress"

    # Reset back to "Open"
    payload_reset = {"status": "Open", "reason": "Testing reset"}
    resp_reset = await client.post("/api/v1/code/secrets/remediation/findings/rem_sec_01/status", json=payload_reset, headers=headers)
    assert resp_reset.status_code == 200
    assert resp_reset.json()["status"] == "Open"


@pytest.mark.asyncio
async def test_secrets_remediation_create_pr(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.post("/api/v1/code/secrets/remediation/findings/rem_sec_01/create-pr", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["pr_number"] > 0
    assert "github.com" in data["pr_url"]
    assert "security/fix" in data["branch_name"]
    assert "fix(security)" in data["title"]
    assert data["status"] == "open"


@pytest.mark.asyncio
async def test_secrets_remediation_bulk_remediate(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    payload = {
        "finding_ids": ["rem_sec_01", "rem_sec_03", "rem_sec_04"],
        "strategy": "create_pr"
    }
    resp = await client.post("/api/v1/code/secrets/remediation/bulk-remediate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["success"] is True
    assert data["processed_count"] == 3
    assert len(data["prs_created"]) == 3


@pytest.mark.asyncio
async def test_secrets_remediation_settings(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # GET settings
    resp = await client.get("/api/v1/code/secrets/remediation/settings", headers=headers)
    assert resp.status_code == 200
    settings = resp.json()
    assert "auto_pr_enabled" in settings
    assert "secret_manager" in settings

    # PUT settings
    new_settings = {
        "auto_pr_enabled": True,
        "require_approval": True,
        "branch_prefix": "sec-patch/",
        "default_reviewers": ["security-lead", "dev-oncall"],
        "secret_manager": "HashiCorp Vault",
        "auto_rescan_on_pr": True
    }
    resp_put = await client.put("/api/v1/code/secrets/remediation/settings", json=new_settings, headers=headers)
    assert resp_put.status_code == 200
    updated_settings = resp_put.json()
    assert updated_settings["branch_prefix"] == "sec-patch/"
    assert updated_settings["secret_manager"] == "HashiCorp Vault"
