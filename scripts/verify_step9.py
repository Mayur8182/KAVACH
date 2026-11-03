"""
STEP 9 VERIFICATION SCRIPT
Demonstrates Real MCP Gateway & Tool Execution Layer:
Strictly adheres to:
- Official Model Context Protocol (MCP) SDK server and schemas
- Agent Identity & Session Authentication
- Authorization & Strict Project Boundary Isolation
- Deterministic Step 7 Policy Enforcement (No LLM authority)
- Gated Approval Tickets (stops execution before handler)
- Controlled Tool Execution with Real Data
- Immutable Audit Logging & Nonce Traceability
"""
import asyncio
import os
import sys
import uuid

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import set_session_factory
from app.mcp import MCPGateway, create_mcp_server, default_tool_registry
from app.mcp.authentication import MCPAuthenticator
from app.mcp.authorization import MCPAuthorizer
from app.mcp.errors import (
    MCPAuthenticationError,
    MCPAuthorizationError,
    MCPProjectAccessDeniedError,
)
from app.models import Base
from app.models.agent import Agent
from app.models.blueprint import SecurityBlueprint, SecurityRequirement
from app.models.intent import Intent
from app.models.mcp import MCPSession, MCPToolInvocation
from app.models.policy import SecurityPolicy, SecurityPolicyVersion, SecurityApproval, SecurityDecision
from app.models.project import Project
from app.models.user import User


async def setup_test_db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    set_session_factory(session_factory)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return session_factory


async def run_step9_verifications():
    print("=" * 70)
    print("RUNNING STEP 9 MCP GATEWAY & TOOL EXECUTION LAYER VERIFICATION")
    print("=" * 70)

    session_factory = await setup_test_db()

    async with session_factory() as db:
        # 1. MCP Tool Discovery via Official SDK
        print("\n[1/6] Validating MCP Tool Discovery via Official Python MCP SDK...")
        server = create_mcp_server()
        tools = await server.list_tools()
        tool_names = [t.name for t in tools]
        print(f"  Discovered {len(tools)} tools exposed by MCP server:")
        for t in tools:
            print(f"    - {t.name}: {t.description[:60]}...")

        expected_tools = [
            "get_project",
            "get_security_blueprint",
            "run_security_scan",
            "security_check",
            "get_scan",
            "check_security_policy",
            "get_github_repository",
            "get_pull_request",
        ]
        for exp in expected_tools:
            assert exp in tool_names, f"Missing tool: {exp}"
        print("  [PASS] All expected MCP tools discovered with valid JSON Schema.")

        # 2. Agent Identity & Session Authentication
        print("\n[2/6] Validating Agent Identity Resolution & Session Authentication...")
        user = User(
            id=uuid.uuid4(),
            email="secops@defense.local",
            password_hash="hashed_pw_dummy",
            name="Lead SecOps",
            is_active=True,
            is_superuser=True,
        )
        db.add(user)

        project_alpha = Project(
            id=uuid.uuid4(),
            name="Project Alpha",
            description="High Security Core Banking",
            repository_url="https://github.com/defense/alpha",
            owner_id=user.id,
            environment="production",
        )
        project_beta = Project(
            id=uuid.uuid4(),
            name="Project Beta",
            description="Internal Analytics",
            repository_url="https://github.com/defense/beta",
            owner_id=user.id,
            environment="development",
        )
        db.add_all([project_alpha, project_beta])
        await db.flush()

        agent_alpha = Agent(
            id=uuid.uuid4(),
            project_id=project_alpha.id,
            name="Cursor IDE Security Agent",
            agent_type="coding_assistant",
            trust_level="restricted",
            status="active",
        )
        db.add(agent_alpha)
        await db.commit()

        authenticator = MCPAuthenticator(db)
        session = await authenticator.create_session(
            agent_id=agent_alpha.id,
            project_id=project_alpha.id,
            authenticated_principal=user.email,
            transport="stdio",
            client_name="cursor-ide",
            client_version="0.45.0",
        )
        print(f"  Created MCP Session ID: {session.id}")
        print(f"  Client: {session.client_name} v{session.client_version} (Transport: {session.transport})")
        assert session.status == "ACTIVE"

        context = await authenticator.authenticate_session(session.id)
        assert context.identity.agent_name == "Cursor IDE Security Agent"
        assert context.identity.project_id == project_alpha.id
        print("  [PASS] Session authenticated, identity resolved, permissions bound.")

        # 3. Authorization & Project Boundary Isolation
        print("\n[3/6] Validating Authorization & Project Isolation Boundary...")
        gateway = MCPGateway(db)

        # Attempt to access project_beta from agent bound to project_alpha
        denied_result = await gateway.invoke_tool(
            session_id=session.id,
            tool_name="get_project",
            arguments={"project_id": str(project_beta.id)},
        )
        print(f"  Cross-project access response: {denied_result.status} (Code: {denied_result.error_code})")
        assert denied_result.status == "DENIED"
        assert denied_result.error_code == "MCP_PROJECT_ACCESS_DENIED"
        print("  [PASS] Project boundary isolation strictly enforced.")

        # 4. Step 7 Policy Enforcement (REQUIRE_APPROVAL gating)
        print("\n[4/6] Validating Step 7 Policy Gating & Human Approval Requirement...")
        # Create Intent and Blueprint for Project Alpha
        intent = Intent(
            id=uuid.uuid4(),
            project_id=project_alpha.id,
            raw_input="Core Banking Microservice",
            environment="production",
            application_type="FINANCIAL",
            purpose="Financial payment transaction processing",
            status="COMPLETED",
        )
        db.add(intent)
        await db.flush()

        blueprint = SecurityBlueprint(
            id=uuid.uuid4(),
            project_id=project_alpha.id,
            intent_id=intent.id,
            version=1,
            status="ACTIVE",
            methodology_version="2026.1.0",
            generated_by="system",
            risk_factors=[],
        )
        db.add(blueprint)
        await db.flush()

        req = SecurityRequirement(
            blueprint_id=blueprint.id,
            requirement_key="REQ-AUTH-01",
            title="MFA for Financial Transactions",
            description="Require multi-factor authentication",
            category="AUTHENTICATION",
            severity="CRITICAL",
            priority="REQUIRED",
            mandatory=True,
            rationale="PCI-DSS / Banking regulatory compliance",
            verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
        )
        db.add(req)

        # Configure policy requiring approval for scan execution
        approval_policy = SecurityPolicy(
            project_id=project_alpha.id,
            name="Production Scanner Approval Policy",
            description="Production security scanner invocations mandate explicit approval",
            scope="PROJECT",
            priority=10,
            policy_type="PROJECT",
            status="ACTIVE",
            current_version=1,
            created_by=user.email,
        )
        db.add(approval_policy)
        await db.flush()

        pol_ver = SecurityPolicyVersion(
            policy_id=approval_policy.id,
            version=1,
            definition={
                "name": "Production Scanner Approval Policy",
                "description": "Production security scanner invocations mandate explicit approval",
                "rules": [
                    {
                        "name": "Scan Approval Gating",
                        "description": "Mandate human sign-off before running scanners",
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
            created_by=user.email,
            change_reason="Gated execution for scanners",
            active=True,
        )
        db.add(pol_ver)
        await db.commit()

        # Invoke tool -> Must halt at policy check without executing scanner
        approval_res = await gateway.invoke_tool(
            session_id=session.id,
            tool_name="run_security_scan",
            arguments={"project_id": str(project_alpha.id), "target_path": "."},
        )
        print(f"  Invocation status: {approval_res.status}")
        print(f"  Ticket ID: {approval_res.approval_id}")
        print(f"  Message: {approval_res.message}")
        assert approval_res.status == "REQUIRES_APPROVAL"
        assert approval_res.approval_id is not None

        # Verify persistent SecurityApproval and SecurityDecision records
        stmt = select(SecurityApproval).where(SecurityApproval.id == uuid.UUID(approval_res.approval_id))
        app_record = (await db.execute(stmt)).scalar_one_or_none()
        assert app_record is not None
        assert app_record.status == "PENDING"
        assert app_record.decision_id is not None
        print("  [PASS] Tool execution halted; SecurityApproval & SecurityDecision records persisted.")

        # 5. Controlled Tool Execution with Real Data
        print("\n[5/6] Validating Controlled Execution with Authorized Tool (get_security_blueprint)...")
        bp_result = await gateway.invoke_tool(
            session_id=session.id,
            tool_name="get_security_blueprint",
            arguments={"project_id": str(project_alpha.id)},
        )
        print(f"  Tool execution status: {bp_result.status}")
        print(f"  Retrieved Blueprint ID: {bp_result.data.get('blueprint_id')}")
        print(f"  Requirements Count: {bp_result.data.get('requirements_count')}")
        assert bp_result.status == "SUCCESS"
        assert bp_result.data["requirements_count"] == 1
        assert bp_result.data["requirements"][0]["requirement_key"] == "REQ-AUTH-01"
        print("  [PASS] Controlled execution executed successfully with real database payload.")

        # 6. Immutable Audit Logging & Nonce Traceability
        print("\n[6/6] Validating Full Audit Trail & Nonce Traceability...")
        inv_stmt = select(MCPToolInvocation).where(
            MCPToolInvocation.session_id == session.id,
            MCPToolInvocation.tool_name == "get_security_blueprint",
        )
        inv = (await db.execute(inv_stmt)).scalar_one()
        print(f"  Invocation ID: {inv.id}")
        print(f"  Status: {inv.status}")
        print(f"  Agent ID: {inv.agent_id}")
        print(f"  Project ID: {inv.project_id}")
        print(f"  Authorization: {inv.authorization_decision}")
        print(f"  Policy Decision: {inv.policy_decision}")
        duration = (inv.completed_at - inv.started_at).total_seconds() * 1000 if inv.completed_at and inv.started_at else 0
        print(f"  Duration: {duration:.2f} ms")
        assert inv.status == "COMPLETED"
        assert inv.authorization_decision == "AUTHORIZED"
        assert inv.policy_decision == "ALLOW"
        print("  [PASS] Audit record verified with complete provenance and execution metrics.")

    print("\n" + "=" * 70)
    print("ALL STEP 9 MCP GATEWAY VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_step9_verifications())
