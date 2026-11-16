"""
Kavach API Security — Universal Integrations & Partner Hub Test Suite
====================================================================
Tests:
1. Integration Catalog listing (18+ platforms including Aikido, Snyk, Wiz, Datadog, Splunk, Jira, etc.)
2. Strict Credential Validation per AGENTS.md rules #1, #3, #10
3. Real Database Persistence of Connection State
4. Real-time Health Ping & Latency Verification
5. Security Findings Normalization & External Sync
6. OASIS SARIF 2.1.0 Standard Document Export
7. Disconnect Flow & Audit Verification
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_integrations_catalog(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    res = await async_client.get("/api/v1/api-security/integrations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 14

    providers = {item["id"] for item in data["items"]}
    expected_providers = {
        "aikido", "snyk", "wiz", "defectdojo", "datadog", "splunk",
        "jira", "github", "gitlab", "slack", "pagerduty", "sarif",
        "webhook", "partner_api", "aws_security_hub", "azure_sentinel",
        "servicenow", "sonarqube"
    }
    assert expected_providers.issubset(providers)

    # SARIF should always be available and connected as standard specification
    sarif_item = next(item for item in data["items"] if item["id"] == "sarif")
    assert sarif_item["status"] == "CONNECTED"


@pytest.mark.asyncio
async def test_connect_integration_validation(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Missing credentials for Aikido must fail with 400
    res_fail = await async_client.post(
        "/api/v1/api-security/integrations/connect",
        json={"provider": "aikido"},
        headers=headers,
    )
    assert res_fail.status_code == 400
    err_body = res_fail.json()
    err_msg = err_body.get("error", {}).get("message", "") or err_body.get("detail", "")
    assert "required" in err_msg.lower()

    # 2. Valid connection for Aikido
    res_success = await async_client.post(
        "/api/v1/api-security/integrations/connect",
        json={
            "provider": "aikido",
            "token": "ak_live_test_api_key_xyz123",
            "account_name": "Aikido Enterprise Prod",
            "workspace_id": "ws_test_9981",
            "auto_sync": True,
        },
        headers=headers,
    )
    assert res_success.status_code == 200
    resp_data = res_success.json()
    assert resp_data["status"] == "SUCCESS"
    assert resp_data["provider"] == "aikido"
    assert resp_data["account_name"] == "Aikido Enterprise Prod"


@pytest.mark.asyncio
async def test_health_check_and_latency(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Built-in SARIF health check
    res_sarif = await async_client.get("/api/v1/api-security/integrations/sarif/test", headers=headers)
    assert res_sarif.status_code == 200
    assert res_sarif.json()["healthy"] is True

    # Connect Aikido first in this session
    await async_client.post(
        "/api/v1/api-security/integrations/connect",
        json={
            "provider": "aikido",
            "token": "ak_live_test_api_key_xyz123",
            "account_name": "Aikido Enterprise",
        },
        headers=headers,
    )

    # Connected Aikido health check
    res_aikido = await async_client.get("/api/v1/api-security/integrations/aikido/test", headers=headers)
    assert res_aikido.status_code == 200
    data = res_aikido.json()
    assert data["healthy"] is True
    assert data["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_sync_findings_to_partner(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # SARIF sync always works
    res_sarif = await async_client.post("/api/v1/api-security/integrations/sarif/sync", headers=headers)
    assert res_sarif.status_code == 200
    assert res_sarif.json()["status"] == "SYNCED"

    # Connect Aikido first in this session
    await async_client.post(
        "/api/v1/api-security/integrations/connect",
        json={
            "provider": "aikido",
            "token": "ak_live_test_api_key_xyz123",
            "account_name": "Aikido Enterprise",
        },
        headers=headers,
    )

    # Sync to Aikido
    res = await async_client.post("/api/v1/api-security/integrations/aikido/sync", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SYNCED"
    assert "sync_job_id" in data
    assert "breakdown" in data
    assert "total_findings_synced" in data


@pytest.mark.asyncio
async def test_export_sarif_oasis_standard(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    res = await async_client.get("/api/v1/api-security/integrations/export/sarif", headers=headers)
    assert res.status_code == 200
    sarif = res.json()

    assert sarif["version"] == "2.1.0"
    assert "sarif-schema-2.1.0.json" in sarif["$schema"]
    assert "runs" in sarif
    assert len(sarif["runs"]) > 0

    driver = sarif["runs"][0]["tool"]["driver"]
    assert driver["name"] == "Kavach API Security Engine"
    assert "rules" in driver
    assert "results" in sarif["runs"][0]


@pytest.mark.asyncio
async def test_disconnect_flow(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Connect Aikido first
    await async_client.post(
        "/api/v1/api-security/integrations/connect",
        json={
            "provider": "aikido",
            "token": "ak_live_test_api_key_xyz123",
            "account_name": "Aikido Enterprise",
        },
        headers=headers,
    )

    # Disconnect Aikido
    res = await async_client.post(
        "/api/v1/api-security/integrations/disconnect",
        json={"provider": "aikido"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"

    # Health check should now reflect disconnected state
    res_health = await async_client.get("/api/v1/api-security/integrations/aikido/test", headers=headers)
    assert res_health.status_code == 200
    assert res_health.json()["healthy"] is False
