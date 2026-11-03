import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_tours_status_and_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create a test token for an admin user
        token = create_access_token(
            data={"sub": "admin@kavachsecurity.me", "role": "admin"}
        )
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch tour status
        res = await ac.get("/api/v1/tours/status", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "completed_tours" in data
        assert "available_tours" in data
        assert any(t["id"] == "dashboard_overview" for t in data["available_tours"])

        # 2. Complete dashboard overview tour
        comp_res = await ac.post(
            "/api/v1/tours/complete",
            json={"tour_id": "dashboard_overview", "step_index": 4, "dismissed": False},
            headers=headers,
        )
        assert comp_res.status_code == 200, comp_res.text
        comp_data = comp_res.json()
        assert comp_data["status"] == "COMPLETED"
        assert "dashboard_overview" in comp_data["completed_tours"]

        # 3. Status now reflects completion
        res2 = await ac.get("/api/v1/tours/status", headers=headers)
        assert res2.status_code == 200
        assert "dashboard_overview" in res2.json()["completed_tours"]

        # 4. Reset tour
        reset_res = await ac.post(
            "/api/v1/tours/reset",
            json={"tour_id": "dashboard_overview"},
            headers=headers,
        )
        assert reset_res.status_code == 200, reset_res.text
        assert "dashboard_overview" not in reset_res.json()["completed_tours"]

        # 5. Onboarding state update and fetch
        put_state = await ac.put(
            "/api/v1/onboarding/state",
            json={"status": "IN_PROGRESS", "current_step": "organization", "steps_completed": ["welcome"]},
            headers=headers,
        )
        assert put_state.status_code == 200, put_state.text
        assert put_state.json()["current_step"] == "organization"

        get_state = await ac.get("/api/v1/onboarding/state", headers=headers)
        assert get_state.status_code == 200, get_state.text
        assert get_state.json()["current_step"] == "organization"
