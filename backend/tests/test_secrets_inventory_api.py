import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_inventory_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/inventory/metrics")
        assert resp.status_code == 401

        resp_table = await client.get("/api/v1/code/secrets/inventory/table")
        assert resp_table.status_code == 401


@pytest.mark.asyncio
async def test_secrets_inventory_metrics(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/secrets/inventory/metrics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_secrets"] == 18
    assert data["total_trend"] == "↑ 12%"
    assert data["critical"] == 3
    assert data["critical_trend"] == "↑ 50%"
    assert data["high"] == 7
    assert data["high_trend"] == "↑ 17%"
    assert data["medium"] == 6
    assert data["medium_trend"] == "↓ 14%"
    assert data["low"] == 2
    assert data["low_trend"] == "↓ 33%"


@pytest.mark.asyncio
async def test_secrets_inventory_table_pagination(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Page 1 (10 items)
    resp_p1 = await client.get("/api/v1/code/secrets/inventory/table?page=1&page_size=10", headers=headers)
    assert resp_p1.status_code == 200
    data_p1 = resp_p1.json()
    assert data_p1["total"] == 18
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 10
    assert data_p1["total_pages"] == 2
    assert len(data_p1["items"]) == 10

    # Verify first item matches AWS Access Key
    item0 = data_p1["items"][0]
    assert item0["secret_title"] == "AWS Access Key"
    assert item0["repository"] == "frontend-app"
    assert item0["file_path"] == "/src/config/aws.js"
    assert item0["severity"] == "Critical"
    assert item0["status"] == "Open"

    # Page 2 (8 items)
    resp_p2 = await client.get("/api/v1/code/secrets/inventory/table?page=2&page_size=10", headers=headers)
    assert resp_p2.status_code == 200
    data_p2 = resp_p2.json()
    assert len(data_p2["items"]) == 8


@pytest.mark.asyncio
async def test_secrets_inventory_filters(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Severity filter = Critical
    resp_crit = await client.get("/api/v1/code/secrets/inventory/table?severity=Critical", headers=headers)
    assert resp_crit.status_code == 200
    items_crit = resp_crit.json()["items"]
    assert len(items_crit) == 3
    assert all(i["severity"] == "Critical" for i in items_crit)

    # 2. Status filter = Resolved
    resp_res = await client.get("/api/v1/code/secrets/inventory/table?status=Resolved", headers=headers)
    assert resp_res.status_code == 200
    items_res = resp_res.json()["items"]
    assert len(items_res) > 0
    assert all(i["status"] == "Resolved" for i in items_res)

    # 3. Search = slack
    resp_search = await client.get("/api/v1/code/secrets/inventory/table?search=slack", headers=headers)
    assert resp_search.status_code == 200
    items_search = resp_search.json()["items"]
    assert len(items_search) >= 1
    assert any("slack" in i["secret_title"].lower() or "slack" in i["file_path"].lower() for i in items_search)


@pytest.mark.asyncio
async def test_secrets_inventory_detail_and_status(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Detail
    resp_det = await client.get("/api/v1/code/secrets/inventory/detail/inv-01", headers=headers)
    assert resp_det.status_code == 200
    item = resp_det.json()
    assert item["id"] == "inv-01"
    assert item["secret_title"] == "AWS Access Key"
    assert item["detected_value"] == "AKIAIOSFODNN7EXAMPLE"

    # Status update to "Resolved"
    payload = {"status": "Resolved", "reason": "Revoked via AWS IAM"}
    resp_stat = await client.post("/api/v1/code/secrets/inventory/inv-01/status", json=payload, headers=headers)
    assert resp_stat.status_code == 200
    assert resp_stat.json()["status"] == "Resolved"

    # Revert back to "Open"
    payload_rev = {"status": "Open", "reason": "Test revert"}
    resp_rev = await client.post("/api/v1/code/secrets/inventory/inv-01/status", json=payload_rev, headers=headers)
    assert resp_rev.status_code == 200
    assert resp_rev.json()["status"] == "Open"


@pytest.mark.asyncio
async def test_secrets_inventory_add_policy_and_export(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Add Policy
    policy_payload = {
        "name": "Block AWS Credentials in CI",
        "secret_type": "AWS Access Key",
        "severity": "Critical",
        "action": "Block PR & Alert",
        "description": "Never allow unencrypted IAM keys"
    }
    resp_pol = await client.post("/api/v1/code/secrets/inventory/policies", json=policy_payload, headers=headers)
    assert resp_pol.status_code == 201
    pol = resp_pol.json()
    assert pol["name"] == "Block AWS Credentials in CI"
    assert pol["enabled"] is True

    # Export
    resp_exp = await client.get("/api/v1/code/secrets/inventory/export?format=json", headers=headers)
    assert resp_exp.status_code == 200
    exp = resp_exp.json()
    assert exp["format"] == "json"
    assert exp["total_items"] == 18
    assert len(exp["data"]) == 18
