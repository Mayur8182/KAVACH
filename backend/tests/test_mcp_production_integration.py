import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.core.security import create_access_token, create_refresh_token
from app.models.project import Project
from app.models.user import User


@pytest.mark.asyncio
async def test_01_mcp_initialize(client: AsyncClient):
    """Test 1: MCP initialize protocol handshake."""
    payload = {
        "jsonrpc": "2.0",
        "id": "init-1",
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "claude-desktop", "version": "1.0.0"},
        },
    }
    response = await client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert data["id"] == "init-1"
    assert "result" in data
    result = data["result"]
    assert result["protocolVersion"] == "2024-11-05"
    assert "tools" in result["capabilities"]
    assert result["serverInfo"]["name"] == "kavach-security-gateway"


@pytest.mark.asyncio
async def test_02_tool_discovery(client: AsyncClient):
    """Test 2: Tool discovery lists all 23 registered security tools."""
    payload = {
        "jsonrpc": "2.0",
        "id": "tools-1",
        "method": "tools/list",
        "params": {},
    }
    response = await client.post("/api/v1/mcp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    tools = data["result"]["tools"]
    tool_names = [t["name"] for t in tools]

    assert len(tools) == 23
    assert "list_projects" in tool_names
    assert "get_project" in tool_names
    assert "run_security_scan" in tool_names
    assert "get_scan" in tool_names
    assert "get_cloud_inventory" in tool_names
    assert "get_active_incidents" in tool_names
    assert "audit_attack_surface" in tool_names
    assert "audit_cloud_posture" in tool_names
    assert "security_check" in tool_names
    assert "get_security_blueprint" in tool_names


@pytest.mark.asyncio
async def test_03_project_listing(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 3: list_projects retrieves user's projects with tenant isolation and pagination."""
    # Create 2 projects for User A
    proj1 = Project(
        id=uuid.uuid4(),
        name="Security Core Alpha",
        repository_url="owner/core-alpha",
        owner_id=user_a.id,
    )
    proj2 = Project(
        id=uuid.uuid4(),
        name="Security Core Beta",
        repository_url="owner/core-beta",
        owner_id=user_a.id,
    )
    db_session.add_all([proj1, proj2])
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-list-1",
        "method": "tools/call",
        "params": {
            "name": "list_projects",
            "arguments": {"limit": 10, "offset": 0},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    assert data["result"]["isError"] is False
    content_raw = data["result"]["content"][0]["text"]
    parsed = json.loads(content_raw)
    assert parsed["status"] == "SUCCESS"
    proj_data = parsed["data"]
    assert proj_data["total_count"] == 2
    assert len(proj_data["projects"]) == 2
    p_names = [p["name"] for p in proj_data["projects"]]
    assert "Security Core Alpha" in p_names
    assert "Security Core Beta" in p_names


@pytest.mark.asyncio
async def test_04_project_details(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 4: get_project returns verified details for authorized project."""
    proj = Project(
        id=uuid.uuid4(),
        name="Prod Web Service",
        repository_url="kavach/prod-web",
        owner_id=user_a.id,
    )
    db_session.add(proj)
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-proj-1",
        "method": "tools/call",
        "params": {
            "name": "get_project",
            "arguments": {"project_id": str(proj.id)},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["result"]["isError"] is False
    parsed = json.loads(data["result"]["content"][0]["text"])
    assert parsed["status"] == "SUCCESS"
    assert parsed["data"]["name"] == "Prod Web Service"
    assert parsed["data"]["repository"] == "kavach/prod-web"


@pytest.mark.asyncio
async def test_05_cloud_inventory(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 5: get_cloud_inventory executes against user's authorized project."""
    proj = Project(
        id=uuid.uuid4(),
        name="Cloud Cluster",
        repository_url="kavach/cloud-cluster",
        owner_id=user_a.id,
    )
    db_session.add(proj)
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-cloud-1",
        "method": "tools/call",
        "params": {
            "name": "get_cloud_inventory",
            "arguments": {"project_id": str(proj.id)},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    parsed = json.loads(response.json()["result"]["content"][0]["text"])
    assert parsed["status"] == "SUCCESS"
    assert "total_resources" in parsed["data"]
    assert "resources" in parsed["data"]


@pytest.mark.asyncio
async def test_06_active_incidents(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 6: get_active_incidents retrieves real security incidents for authorized project."""
    proj = Project(
        id=uuid.uuid4(),
        name="Incident Monitored Service",
        repository_url="kavach/service",
        owner_id=user_a.id,
    )
    db_session.add(proj)
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-inc-1",
        "method": "tools/call",
        "params": {
            "name": "get_active_incidents",
            "arguments": {"project_id": str(proj.id)},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    parsed = json.loads(response.json()["result"]["content"][0]["text"])
    assert parsed["status"] == "SUCCESS"
    assert "active_incidents" in parsed["data"]
    assert "total_count" in parsed["data"]


@pytest.mark.asyncio
async def test_07_attack_surface_audit(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 7: audit_attack_surface audits assets and endpoints for authorized project."""
    proj = Project(
        id=uuid.uuid4(),
        name="Edge Gateway Service",
        repository_url="kavach/edge",
        owner_id=user_a.id,
    )
    db_session.add(proj)
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-att-1",
        "method": "tools/call",
        "params": {
            "name": "audit_attack_surface",
            "arguments": {"project_id": str(proj.id)},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    parsed = json.loads(response.json()["result"]["content"][0]["text"])
    assert parsed["status"] == "SUCCESS"
    assert "total_assets" in parsed["data"]
    assert "exposed_ports" in parsed["data"]


@pytest.mark.asyncio
async def test_08_security_scan_execution(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """Test 8: run_security_scan runs scanners and records real scan results in database."""
    proj = Project(
        id=uuid.uuid4(),
        name="Code Repo For Scanning",
        repository_url="kavach/app-repo",
        owner_id=user_a.id,
    )
    db_session.add(proj)
    await db_session.commit()

    payload = {
        "jsonrpc": "2.0",
        "id": "call-scan-1",
        "method": "tools/call",
        "params": {
            "name": "run_security_scan",
            "arguments": {
                "project_id": str(proj.id),
                "target_path": "backend/app/main.py",
                "scanners": ["seculayer-builtin"],
            },
        },
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    parsed = json.loads(response.json()["result"]["content"][0]["text"])
    assert parsed["status"] == "SUCCESS"
    assert "scan_id" in parsed["data"]
    assert "total_findings" in parsed["data"]
    assert "scanners_executed" in parsed["data"]


@pytest.mark.asyncio
async def test_09_authorization_failures_and_expired_tokens(
    client: AsyncClient,
    user_a: User,
):
    """Test 9: Verify unauthenticated requests and expired tokens fail securely."""
    # 9a. Unauthenticated tool call without Bearer token
    payload = {
        "jsonrpc": "2.0",
        "id": "call-unauth-1",
        "method": "tools/call",
        "params": {
            "name": "list_projects",
            "arguments": {},
        },
    }
    res_unauth = await client.post("/api/v1/mcp", json=payload)
    assert res_unauth.status_code == 200
    data_unauth = res_unauth.json()
    assert "error" in data_unauth
    assert data_unauth["error"]["code"] == -32002
    assert "Authentication required" in data_unauth["error"]["message"]

    # 9b. Expired token returns 401 with standard WWW-Authenticate header
    expired_token = create_access_token(
        subject=str(user_a.id),
        expires_delta=timedelta(seconds=-10),
    )
    res_expired = await client.post(
        "/api/v1/mcp",
        json=payload,
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_expired.status_code == 401
    auth_header = res_expired.headers.get("www-authenticate", "")
    assert "invalid_token" in auth_header
    assert "expired" in auth_header.lower()


@pytest.mark.asyncio
async def test_10_cross_tenant_access_prevention(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    user_b: User,
    token_user_b: str,
):
    """Test 10: User B cannot access User A's project (Tenant Isolation)."""
    # Create project owned by User A
    proj_a = Project(
        id=uuid.uuid4(),
        name="Secret Enterprise System A",
        repository_url="enterprise/secret-a",
        owner_id=user_a.id,
    )
    db_session.add(proj_a)
    await db_session.commit()

    # User B attempts to access User A's project
    payload = {
        "jsonrpc": "2.0",
        "id": "cross-tenant-1",
        "method": "tools/call",
        "params": {
            "name": "get_project",
            "arguments": {"project_id": str(proj_a.id)},
        },
    }
    headers = {"Authorization": f"Bearer {token_user_b}"}
    response = await client.post("/api/v1/mcp", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["result"]["isError"] is True
    parsed = json.loads(data["result"]["content"][0]["text"])
    assert parsed["status"] == "DENIED"
    assert parsed["error_code"] == "MCP_TENANT_ACCESS_DENIED"
    assert "Cross-tenant access is blocked" in parsed["message"]


@pytest.mark.asyncio
async def test_11_refresh_token_lifecycle(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
):
    """Test 11: Refresh token lifecycle rotates tokens and validates expiration."""
    refresh_token = create_refresh_token(subject=str(user_a.id))
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["token_type"] == "bearer"
    assert new_tokens["expires_in"] > 0

    # Test expired refresh token fails
    expired_refresh = create_refresh_token(
        subject=str(user_a.id),
        expires_delta=timedelta(seconds=-10),
    )
    failed_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": expired_refresh},
    )
    assert failed_res.status_code == 401
    err_body = failed_res.json()
    err_msg = err_body.get("detail") or err_body.get("error", {}).get("message", "")
    assert "expired" in err_msg.lower()
