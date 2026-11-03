import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_cloud_overview_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/cloud/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cloud_endpoints_authorized(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Overview
    resp = await client.get("/api/v1/cloud/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "cloud_accounts_count" in data
    assert "assets_total_count" in data
    assert "providers" in data
    assert "AWS" in data["providers"]
    assert "AZURE" in data["providers"]
    assert "GCP" in data["providers"]

    # 2. Connections / Providers
    resp_conn = await client.get("/api/v1/cloud/connections", headers=headers)
    assert resp_conn.status_code == 200
    assert "items" in resp_conn.json()

    # 3. Assets
    resp_assets = await client.get("/api/v1/cloud/assets?limit=10", headers=headers)
    assert resp_assets.status_code == 200
    assert "items" in resp_assets.json()

    # 4. Findings
    resp_findings = await client.get("/api/v1/cloud/findings?limit=10", headers=headers)
    assert resp_findings.status_code == 200
    assert "items" in resp_findings.json()

    # 5. IAM
    resp_iam = await client.get("/api/v1/cloud/iam", headers=headers)
    assert resp_iam.status_code == 200
    assert "principals" in resp_iam.json()

    # 6. Network
    resp_net = await client.get("/api/v1/cloud/network", headers=headers)
    assert resp_net.status_code == 200
    assert "networks" in resp_net.json()

    # 7. Storage
    resp_stor = await client.get("/api/v1/cloud/storage", headers=headers)
    assert resp_stor.status_code == 200
    assert "items" in resp_stor.json()

    # 8. Databases
    resp_db = await client.get("/api/v1/cloud/databases", headers=headers)
    assert resp_db.status_code == 200
    assert "items" in resp_db.json()

    # 9. Kubernetes
    resp_k8s = await client.get("/api/v1/cloud/kubernetes", headers=headers)
    assert resp_k8s.status_code == 200
    assert "clusters" in resp_k8s.json()

    # 10. Docker
    resp_docker = await client.get("/api/v1/cloud/docker", headers=headers)
    assert resp_docker.status_code == 200
    assert "images" in resp_docker.json()

    # 11. IaC
    resp_iac = await client.get("/api/v1/cloud/iac", headers=headers)
    assert resp_iac.status_code == 200
    assert "items" in resp_iac.json()

    # 12. Exposures
    resp_exp = await client.get("/api/v1/cloud/exposures", headers=headers)
    assert resp_exp.status_code == 200
    assert "items" in resp_exp.json()

    # 13. Attack Paths
    resp_ap = await client.get("/api/v1/cloud/attack-paths", headers=headers)
    assert resp_ap.status_code == 200
    assert "items" in resp_ap.json()

    # 14. Blast Radius
    resp_br = await client.get("/api/v1/cloud/blast-radius", headers=headers)
    assert resp_br.status_code == 200
    assert "nodes" in resp_br.json()

    # 15. Compliance
    resp_comp = await client.get("/api/v1/cloud/compliance", headers=headers)
    assert resp_comp.status_code == 200
    assert "frameworks" in resp_comp.json()

    # 16. Remediation
    resp_rem = await client.get("/api/v1/cloud/remediation", headers=headers)
    assert resp_rem.status_code == 200
    assert "jobs" in resp_rem.json()

    # 17. Evidence
    resp_ev = await client.get("/api/v1/cloud/evidence?limit=10", headers=headers)
    assert resp_ev.status_code == 200
    assert "items" in resp_ev.json()

    # 18. Asset Detail (404 on non-existent)
    fake_asset_id = str(uuid.uuid4())
    resp_adetail = await client.get(f"/api/v1/cloud/assets/{fake_asset_id}", headers=headers)
    assert resp_adetail.status_code == 404

    # 19. Finding Detail (404 on non-existent)
    fake_finding_id = str(uuid.uuid4())
    resp_fdetail = await client.get(f"/api/v1/cloud/findings/{fake_finding_id}", headers=headers)
    assert resp_fdetail.status_code == 404
