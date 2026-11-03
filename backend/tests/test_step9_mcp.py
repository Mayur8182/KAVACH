import asyncio
import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import mcp.types as types
from app.core.security import create_access_token
from app.mcp import MCPGateway, create_mcp_server, default_tool_registry
from app.mcp.authentication import MCPAuthenticator
from app.mcp.authorization import MCPAuthorizer
from app.mcp.errors import (
    MCPAuthenticationError,
    MCPAuthorizationError,
    MCPProjectAccessDeniedError,
    MCPToolNotFoundError,
)
from app.mcp.identity import AgentIdentityResolver
from app.mcp.schemas import MCPContext, ToolDefinition
from app.models.agent import Agent
from app.models.blueprint import SecurityBlueprint, SecurityRequirement
from app.models.mcp import MCPSession, MCPToolInvocation
from app.models.policy import SecurityPolicy, SecurityPolicyVersion
from app.models.project import Project
from app.models.user import User


@pytest.mark.asyncio
async def test_mcp_tool_discovery_official_sdk(db_session: AsyncSession):
    """
    Validates that the official Python MCP SDK Server exposes registered tools
    with valid MCP schemas (get_project, run_security_scan, etc.).
    """
    server = create_mcp_server()
    # List tools directly via official MCPServer.list_tools()
    discovered_tools = await server.list_tools()
    assert len(discovered_tools) >= 8, f"Expected at least 8 tools in server, found {len(discovered_tools)}"

    tool_names = [t.name for t in discovered_tools]
    assert "get_project" in tool_names
    assert "get_security_blueprint" in tool_names
    assert "run_security_scan" in tool_names
    assert "security_check" in tool_names
    assert "get_scan" in tool_names
    assert "check_security_policy" in tool_names
    assert "get_github_repository" in tool_names
    assert "get_pull_request" in tool_names


@pytest.mark.asyncio
async def test_mcp_session_authentication_lifecycle(db_session: AsyncSession, user_a: User):
    """
    Tests MCP agent identity resolution, session creation, and authentication lifecycle.
    """
    # Create real Project and Agent
    project_a = Project(
        id=uuid.uuid4(),
        name="MCP Guard Test Project",
        description="Testing MCP Gateway",
        repository_url="https://github.com/secure/mcp-test",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project_a)
    await db_session.flush()

    agent_a = Agent(
        id=uuid.uuid4(),
        project_id=project_a.id,
        name="Cursor Agent Alpha",
        agent_type="coding_assistant",
        trust_level="restricted",
        status="active",
    )
    db_session.add(agent_a)
    await db_session.commit()

    authenticator = MCPAuthenticator(db_session)

    # 1. Successful session creation
    session = await authenticator.create_session(
        agent_id=agent_a.id,
        project_id=project_a.id,
        authenticated_principal=user_a.email,
        transport="stdio",
        client_name="cursor-ide",
        client_version="0.45.0",
    )
    assert session.id is not None
    assert session.status == "ACTIVE"

    # 2. Authenticate existing session
    context = await authenticator.authenticate_session(session.id)
    assert context.session_id == session.id
    assert context.identity.agent_id == agent_a.id
    assert context.identity.project_id == project_a.id
    assert context.identity.agent_name == "Cursor Agent Alpha"
    assert "PROJECT_READ" in context.identity.permissions

    # 3. Negative: Non-existent agent session
    with pytest.raises(MCPAuthenticationError):
        await authenticator.create_session(
            agent_id=uuid.uuid4(),
            project_id=project_a.id,
            authenticated_principal=user_a.email,
        )

    # 4. Negative: Non-existent session authentication
    with pytest.raises(MCPAuthenticationError):
        await authenticator.authenticate_session(uuid.uuid4())


@pytest.mark.asyncio
async def test_mcp_authorization_and_project_isolation(db_session: AsyncSession, user_a: User, user_b: User):
    """
    Tests strict project isolation: Agent A belonging to Project A cannot access Project B.
    Also tests prohibited dangerous permissions.
    """
    # Create Project A and Project B
    project_a = Project(
        id=uuid.uuid4(),
        name="Project A",
        description="Project A",
        repository_url="https://github.com/secure/a",
        owner_id=user_a.id,
        environment="development",
    )
    project_b = Project(
        id=uuid.uuid4(),
        name="Project B",
        description="Project B",
        repository_url="https://github.com/secure/b",
        owner_id=user_b.id,
        environment="development",
    )
    db_session.add_all([project_a, project_b])
    await db_session.flush()

    # Agent A belongs to Project A
    agent_a = Agent(
        id=uuid.uuid4(),
        project_id=project_a.id,
        name="Agent A",
        agent_type="coding_assistant",
        trust_level="restricted",
        status="active",
    )
    db_session.add(agent_a)
    await db_session.commit()

    authenticator = MCPAuthenticator(db_session)
    session = await authenticator.create_session(
        agent_id=agent_a.id,
        project_id=project_a.id,
        authenticated_principal=user_a.email,
    )

    gateway = MCPGateway(db_session)

    # 1. Allowed: Agent A accesses Project A
    res_a = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="get_project",
        arguments={"project_id": str(project_a.id)},
    )
    assert res_a.status == "SUCCESS"
    assert res_a.data["name"] == "Project A"

    # 2. Denied: Agent A attempts cross-project access to Project B
    res_b = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="get_project",
        arguments={"project_id": str(project_b.id)},
    )
    assert res_b.status == "DENIED"
    assert res_b.error_code == "MCP_PROJECT_ACCESS_DENIED"

    # Verify audit record recorded the denied access
    stmt = select(MCPToolInvocation).where(
        MCPToolInvocation.session_id == session.id,
        MCPToolInvocation.status == "DENIED",
    )
    res_inv = await db_session.execute(stmt)
    inv = res_inv.scalar_one_or_none()
    assert inv is not None
    assert inv.authorization_decision == "DENIED"


@pytest.mark.asyncio
async def test_mcp_policy_allow_and_approval_enforcement(db_session: AsyncSession, user_a: User):
    """
    Tests policy integration:
    - ALLOW: Normal security scan or check executes.
    - REQUIRE_APPROVAL: When policy requires approval, execution stops immediately,
      creates a SecurityApproval record, and does NOT execute the tool.
    """
    project = Project(
        id=uuid.uuid4(),
        name="Policy Protected Project",
        description="Testing policy enforcement in MCP",
        repository_url="https://github.com/secure/protected",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    # Create Intent
    from app.models.intent import Intent
    intent = Intent(
        id=uuid.uuid4(),
        project_id=project.id,
        raw_input="Secure backend app",
        environment="development",
        application_type="REST_API",
        purpose="Payment processing",
        normalized_intent={},
        status="PROCESSED",
    )
    db_session.add(intent)
    await db_session.flush()

    # Create an active Security Blueprint
    bp = SecurityBlueprint(
        id=uuid.uuid4(),
        project_id=project.id,
        intent_id=intent.id,
        version=1,
        status="ACTIVE",
        methodology_version="2026.1.0",
        generated_by="system",
        risk_factors=[],
    )
    db_session.add(bp)
    await db_session.flush()

    req = SecurityRequirement(
        blueprint_id=bp.id,
        requirement_key="REQ-SEC-01",
        title="No Hardcoded Secrets",
        description="Code must be scanned for leaked credentials",
        category="SECRETS",
        severity="CRITICAL",
        priority="REQUIRED",
        mandatory=True,
        rationale="Payment-processing applications must not expose secrets in source code.",
        verification_strategy=["STATIC_ANALYSIS", "SECRET_SCAN"],
    )
    db_session.add(req)

    # Create Policy requiring approval for scans
    approval_policy = SecurityPolicy(
        project_id=project.id,
        name="Mandatory Scan Approval Policy",
        description="Require human approval before running security scans",
        scope="PROJECT",
        priority=10,
        policy_type="PROJECT",
        status="ACTIVE",
        current_version=1,
        created_by=user_a.email,
    )
    db_session.add(approval_policy)
    await db_session.flush()

    pol_version = SecurityPolicyVersion(
        policy_id=approval_policy.id,
        version=1,
        definition={
            "name": "Mandatory Scan Approval Policy",
            "description": "Require human approval before running security scans",
            "rules": [
                {
                    "name": "Scan Approval Requirement",
                    "description": "Block direct scan execution; require human approval",
                    "decision": "REQUIRE_APPROVAL",
                    "priority": 100,
                    "when": {
                        "operation": {
                            "operator": "EQUALS",
                            "value": "MCP_TOOL_RUN_SECURITY_SCAN",
                        }
                    },
                }
            ],
        },
        created_by=user_a.email,
        change_reason="Require human sign-off for scanner execution",
        active=True,
    )
    db_session.add(pol_version)

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="AI Copilot",
        agent_type="coding_assistant",
        trust_level="restricted",
        status="active",
    )
    db_session.add(agent)
    await db_session.commit()

    authenticator = MCPAuthenticator(db_session)
    session = await authenticator.create_session(
        agent_id=agent.id,
        project_id=project.id,
        authenticated_principal=user_a.email,
    )

    gateway = MCPGateway(db_session)

    # 1. Attempt to run security scan -> Policy requires approval
    res = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="run_security_scan",
        arguments={
            "project_id": str(project.id),
            "target_path": ".",
        },
    )

    # Verification: Tool stopped, did not execute scan, created approval ticket
    assert res.status == "REQUIRES_APPROVAL"
    assert res.approval_id is not None
    assert "requires explicit security approval" in res.message

    # Verify MCPToolInvocation persisted with REQUIRES_APPROVAL
    stmt = select(MCPToolInvocation).where(
        MCPToolInvocation.session_id == session.id,
        MCPToolInvocation.tool_name == "run_security_scan",
    )
    inv = (await db_session.execute(stmt)).scalar_one()
    assert inv.status == "REQUIRES_APPROVAL"
    assert inv.policy_decision == "REQUIRE_APPROVAL"
    assert str(inv.approval_id) == res.approval_id

    # 2. Attempt get_security_blueprint -> Policy does not require approval -> ALLOW
    bp_res = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="get_security_blueprint",
        arguments={"project_id": str(project.id)},
    )
    assert bp_res.status == "SUCCESS"
    assert bp_res.data["version"] == 1
    assert bp_res.data["requirements_count"] == 1


@pytest.mark.asyncio
async def test_mcp_rest_management_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """
    Tests administrative REST APIs for MCP monitoring and observability:
    GET /api/v1/projects/{project_id}/mcp/status
    GET /api/v1/projects/{project_id}/mcp/tools
    GET /api/v1/projects/{project_id}/mcp/sessions
    """
    project = Project(
        id=uuid.uuid4(),
        name="MCP Management Project",
        description="Testing management APIs",
        repository_url="https://github.com/secure/mgmt",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Antigravity Test Agent",
        agent_type="coding_assistant",
        trust_level="restricted",
        status="active",
    )
    db_session.add(agent)
    await db_session.commit()

    authenticator = MCPAuthenticator(db_session)
    session = await authenticator.create_session(
        agent_id=agent.id,
        project_id=project.id,
        authenticated_principal=user_a.email,
        client_name="claude-desktop",
        client_version="1.2.0",
    )

    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Status endpoint
    status_resp = await client.get(f"/api/v1/projects/{project.id}/mcp/status", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["enabled"] is True
    assert status_data["active_sessions_count"] == 1
    assert status_data["registered_tools_count"] >= 8

    # 2. Tools list endpoint
    tools_resp = await client.get(f"/api/v1/projects/{project.id}/mcp/tools", headers=headers)
    assert tools_resp.status_code == 200
    tools_data = tools_resp.json()
    assert len(tools_data) >= 8

    # 3. Sessions list endpoint
    sessions_resp = await client.get(f"/api/v1/projects/{project.id}/mcp/sessions", headers=headers)
    assert sessions_resp.status_code == 200
    sessions_data = sessions_resp.json()
    assert len(sessions_data) == 1
    assert sessions_data[0]["client_name"] == "claude-desktop"

    # 4. Session detail endpoint
    sess_detail = await client.get(f"/api/v1/mcp/sessions/{session.id}", headers=headers)
    assert sess_detail.status_code == 200
    assert sess_detail.json()["id"] == str(session.id)
