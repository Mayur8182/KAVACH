import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_overview_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_secrets_endpoints_authorized(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. GET /api/v1/code/secrets/overview
    resp_overview = await client.get("/api/v1/code/secrets/overview", headers=headers)
    assert resp_overview.status_code == 200
    ov_data = resp_overview.json()
    assert "kpis" in ov_data
    assert "severity_distribution" in ov_data
    assert "trend" in ov_data
    assert "top_secret_types" in ov_data
    assert "recent_findings" in ov_data
    assert "top_repositories" in ov_data
    assert "remediation_progress" in ov_data

    # Verify KPI counts match contract
    assert ov_data["kpis"]["exposed_secrets"] >= 0
    assert ov_data["kpis"]["high_severity"] >= 0
    assert ov_data["remediation_progress"]["percentage"] >= 0

    # 2. GET /api/v1/code/secrets/inventory
    resp_inv = await client.get("/api/v1/code/secrets/inventory", headers=headers)
    assert resp_inv.status_code == 200
    inv_data = resp_inv.json()
    assert isinstance(inv_data, list)
    assert len(inv_data) > 0
    assert "secret_type" in inv_data[0]
    assert "category" in inv_data[0]

    # 3. GET /api/v1/code/secrets/policies
    resp_pol = await client.get("/api/v1/code/secrets/policies", headers=headers)
    assert resp_pol.status_code == 200
    pol_data = resp_pol.json()
    assert isinstance(pol_data, list)
    assert len(pol_data) > 0
    assert "name" in pol_data[0]

    # 4. POST /api/v1/code/secrets/policies
    new_pol = {
        "name": "Zero Leaked AWS Credentials Test",
        "description": "Block PRs with exposed AWS Access Keys",
        "scanner": "gitleaks",
        "severity": "CRITICAL",
        "action": "BLOCK",
        "enabled": True,
    }
    resp_create_pol = await client.post("/api/v1/code/secrets/policies", headers=headers, json=new_pol)
    assert resp_create_pol.status_code == 201
    created_data = resp_create_pol.json()
    assert created_data["name"] == new_pol["name"]
    assert created_data["action"] == "BLOCK"

    # 5. POST /api/v1/code/secrets/scan
    resp_scan = await client.post("/api/v1/code/secrets/scan", headers=headers, json={"branch": "main"})
    assert resp_scan.status_code == 202
    scan_res = resp_scan.json()
    assert scan_res["status"] == "QUEUED"
    assert "job_id" in scan_res
