import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_code_overview_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_code_endpoints_authorized(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }
    # 1. Overview
    resp = await client.get("/api/v1/code/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "repositories_total" in data
    assert "findings" in data
    assert "scans_total" in data

    # 2. Coverage
    resp_cov = await client.get("/api/v1/code/coverage", headers=headers)
    assert resp_cov.status_code == 200
    cov_data = resp_cov.json()
    assert "sast" in cov_data
    assert "secrets" in cov_data
    assert "dependencies" in cov_data
    assert "sbom" in cov_data

    # 3. Attention
    resp_att = await client.get("/api/v1/code/attention?limit=10", headers=headers)
    assert resp_att.status_code == 200
    att_data = resp_att.json()
    assert "items" in att_data
    assert "total" in att_data

    # 4. Recent Scans
    resp_scans = await client.get("/api/v1/code/recent-scans?limit=10", headers=headers)
    assert resp_scans.status_code == 200
    scans_data = resp_scans.json()
    assert "items" in scans_data
    assert "total" in scans_data

    # 5. Repository Health
    resp_health = await client.get("/api/v1/code/repository-health", headers=headers)
    assert resp_health.status_code == 200
    health_data = resp_health.json()
    assert "items" in health_data

    # 6. Findings (filterable)
    resp_findings = await client.get("/api/v1/code/findings?limit=10", headers=headers)
    assert resp_findings.status_code == 200
    findings_data = resp_findings.json()
    assert "items" in findings_data
    assert "total" in findings_data

    # 7. Evidence
    resp_evidence = await client.get("/api/v1/code/evidence?limit=10", headers=headers)
    assert resp_evidence.status_code == 200
    evidence_data = resp_evidence.json()
    assert "items" in evidence_data
    assert "total" in evidence_data

    # 8. Finding Detail (404 on non-existent)
    fake_finding_id = str(uuid.uuid4())
    resp_fdetail = await client.get(f"/api/v1/code/findings/{fake_finding_id}", headers=headers)
    assert resp_fdetail.status_code == 404

    # 9. Repository Detail (404 on non-existent)
    fake_repo_id = str(uuid.uuid4())
    resp_rdetail = await client.get(f"/api/v1/code/repositories/{fake_repo_id}", headers=headers)
    assert resp_rdetail.status_code == 404

    # 10. Repository Tree (404 on non-existent)
    resp_tree = await client.get(f"/api/v1/code/repositories/{fake_repo_id}/tree", headers=headers)
    assert resp_tree.status_code == 404

    # 11. Repository File (404 on non-existent)
    resp_file = await client.get(f"/api/v1/code/repositories/{fake_repo_id}/file?path=src/controllers/user.controller.ts", headers=headers)
    assert resp_file.status_code == 404

