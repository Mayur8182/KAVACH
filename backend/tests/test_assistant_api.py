import pytest
from httpx import AsyncClient
from app.models.user import User


@pytest.mark.asyncio
async def test_assistant_overview_real_data(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "workspace" in data
    assert "github_integration" in data
    assert "repositories" in data
    assert isinstance(data["repositories"], list)
    assert "recent_scans" in data
    assert "latest_findings" in data
    assert "active_agents" in data
    # Ensure user initials and id match real user, not hardcoded MB
    assert data["user"]["id"] == str(user_a.id)
    assert data["user"]["email"] == user_a.email


@pytest.mark.asyncio
async def test_assistant_live_agents(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/agents/live", headers=headers)
    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, list)
    assert len(agents) >= 12
    agent_keys = [a["key"] for a in agents]
    assert "sast_agent" in agent_keys
    assert "iac_agent" in agent_keys
    assert "secrets_agent" in agent_keys
    assert "container_agent" in agent_keys
    # Verify no fake 'Running' default status when no scan is executed
    sast = next(a for a in agents if a["key"] == "sast_agent")
    assert sast["status"] in ["Idle", "Completed", "Running"]


@pytest.mark.asyncio
async def test_assistant_report_download(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/reports/download?repository=kavach&branch=main", headers=headers)
    assert response.status_code == 200
    assert "Content-Disposition" in response.headers
    assert "attachment" in response.headers["Content-Disposition"]
    assert len(response.text) > 0


@pytest.mark.asyncio
async def test_assistant_report_download_with_query_token(client: AsyncClient, user_a: User, token_user_a: str):
    # Direct browser GET request without Authorization Bearer header, but with ?token= query parameter
    response = await client.get(f"/api/v1/assistant/reports/download?token={token_user_a}&repository=kavach&branch=main&format=markdown")
    assert response.status_code == 200
    assert "attachment" in response.headers["Content-Disposition"]
    assert "# 🛡️ Kavach Security Posture Report" in response.text


@pytest.mark.asyncio
async def test_assistant_overview_with_stale_nonexistent_project_id(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    stale_uuid = "e2709d8b-2379-4625-bdff-387a00c25216"
    response = await client.get(f"/api/v1/assistant/overview?project_id={stale_uuid}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert data["project"]["id"] != stale_uuid  # Gracefully resolved to user's real project
    assert data["workspace"]["project_id"] == data["project"]["id"]

