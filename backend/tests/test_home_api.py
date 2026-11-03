import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import User
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_home_overview_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/home/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_home_endpoints_authorized(db_session, test_user):
    token = create_access_token(test_user.id)
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Overview
        resp = await client.get("/api/v1/home/overview", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "attention" in data
        assert "incidents" in data
        assert "coverage" in data
        assert data["coverage"]["code"]["unit"] == "repositories"

        # 2. Security State
        resp_state = await client.get("/api/v1/home/security-state", headers=headers)
        assert resp_state.status_code == 200
        state_data = resp_state.json()
        assert state_data["state"] in ["HEALTHY", "ATTENTION", "CRITICAL", "UNKNOWN"]
        assert "methodology" in state_data
        assert state_data["methodology"]["version"] == "security-state-v1"
        assert "factors" in state_data
        assert "evidence_count" in state_data

        # 3. Attention
        resp_att = await client.get("/api/v1/home/attention?limit=5", headers=headers)
        assert resp_att.status_code == 200
        att_data = resp_att.json()
        assert "items" in att_data
        assert "total" in att_data

        # 4. Coverage
        resp_cov = await client.get("/api/v1/home/coverage", headers=headers)
        assert resp_cov.status_code == 200
        cov_data = resp_cov.json()
        assert "code" in cov_data
        assert "cloud" in cov_data
        assert "protect" in cov_data
        assert "agent" in cov_data
        assert "data" in cov_data

        # 5. Product Health
        resp_health = await client.get("/api/v1/home/product-health", headers=headers)
        assert resp_health.status_code == 200
        health_data = resp_health.json()
        assert "items" in health_data
        assert any(item["product"] == "code" for item in health_data["items"])
        assert any(item["product"] == "soc" for item in health_data["items"])

        # 6. Activity
        resp_act = await client.get("/api/v1/home/activity?limit=10", headers=headers)
        assert resp_act.status_code == 200
        act_data = resp_act.json()
        assert "items" in act_data

        # 7. Incidents
        resp_inc = await client.get("/api/v1/home/incidents", headers=headers)
        assert resp_inc.status_code == 200
        inc_data = resp_inc.json()
        assert "open" in inc_data
        assert "investigating" in inc_data

        # 8. Trends
        resp_trends = await client.get("/api/v1/home/trends", headers=headers)
        assert resp_trends.status_code == 200
        trends_data = resp_trends.json()
        assert "has_sufficient_data" in trends_data
        assert "explanation" in trends_data
