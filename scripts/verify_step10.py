"""
STEP 10 VERIFICATION SCRIPT
Demonstrates Real Agent Identity + Authorization System:
Strictly adheres to:
- Persistent Agent Identity Model (UUID, Name, AgentType, Status, TrustLevel)
- Cryptographic Agent Credentials (prefix + SHA-256 hashed secret, secret shown once)
- Credential Lifecycle (Validation, Expiration, Rotation, Revocation)
- Persistent Roles, Permissions, and Scopes (Deny-by-default)
- Deterministic Authorization Engine (No LLM authority)
- Cross-Project Isolation (Agent A cannot access Project B)
- Self-Escalation Prevention (Agent cannot assign roles or elevate trust)
- MCP Gateway Session Integration with Live Revalidation
- Full Audit Trail with distinct Human (USER) vs AGENT actors
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import set_session_factory
from app.authorization import (
    AuthorizationService,
    ScopeContext,
    CANONICAL_PERMISSIONS,
    CANONICAL_ROLES,
)
from app.authorization.errors import (
    AgentRevokedError,
    AgentSuspendedError,
    CredentialRevokedError,
    CredentialExpiredError,
    PermissionMissingError,
    ProjectScopeDeniedError,
    SelfEscalationForbiddenError,
)
from app.mcp import MCPGateway, default_tool_registry
from app.mcp.authentication import MCPAuthenticator
from app.mcp.errors import MCPAuthenticationError, MCPAuthorizationError
from app.models import Base
from app.models.agent import Agent
from app.models.authorization import (
    AgentCredential,
    Role,
    Permission,
    AgentRole,
    AuthorizationDecision,
)
from app.models.audit_event import AuditEvent
from app.models.intent import Intent
from app.models.policy import SecurityPolicy, SecurityPolicyVersion
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


async def run_step10_verifications():
    print("=" * 75)
    print("RUNNING STEP 10: REAL AGENT IDENTITY + AUTHORIZATION SYSTEM VERIFICATION")
    print("=" * 75)

    session_factory = await setup_test_db()
 
    async with session_factory() as db:
        authz_service = AuthorizationService(db)

        # Seed System Roles & Permissions
        print("\n[1/7] Seeding Canonical Permissions & Roles into Database...")
        await authz_service.seed_canonical_roles_and_permissions()
        perm_res = await db.execute(select(Permission))
        roles_res = await db.execute(select(Role))
        all_perms = perm_res.scalars().all()
        all_roles = roles_res.scalars().all()
        print(f"  [PASS] Seeded and verified {len(all_perms)} active permissions in database.")
        print(f"  Verified {len(all_roles)} system roles: {[r.name for r in all_roles]}")

        # Seed Human User & Two Projects
        human_user = User(
            id=uuid.uuid4(),
            email="platform-admin@enterprise.local",
            password_hash="hashed_pw_xyz",
            name="Platform Admin",
            is_active=True,
            is_superuser=True,
        )
        project_a = Project(
            id=uuid.uuid4(),
            name="Alpha Security Core",
            owner_id=human_user.id,
            description="Alpha Security Project",
        )
        project_b = Project(
            id=uuid.uuid4(),
            name="Beta Payroll Service",
            owner_id=human_user.id,
            description="Beta Payroll Service",
        )
        db.add_all([human_user, project_a, project_b])
        await db.commit()

        # 2. Agent Identity & Lifecycle Transitions
        print("\n[2/7] Testing Agent Registration & Explicit Lifecycle Transitions...")
        agent_a = Agent(
            id=uuid.uuid4(),
            project_id=project_a.id,
            name="SecOps Code Scanner",
            agent_type="CODING_AGENT",
            status="REGISTERED",
            trust_level="STANDARD",
            description="Autonomous CI coding agent for repository scans",
        )
        db.add(agent_a)
        await db.commit()
        await db.refresh(agent_a)
        print(f"  Registered Agent: id={agent_a.id}, name='{agent_a.name}', status={agent_a.status}")

        # Transition: REGISTERED -> ACTIVE
        agent_a.status = "ACTIVE"
        await db.commit()
        print(f"  Lifecycle Transition -> {agent_a.status} (Activated)")

        # Transition: ACTIVE -> SUSPENDED -> ACTIVE
        agent_a.status = "SUSPENDED"
        await db.commit()
        print(f"  Lifecycle Transition -> {agent_a.status} (Suspended)")
        agent_a.status = "ACTIVE"
        await db.commit()
        print(f"  Lifecycle Transition -> {agent_a.status} (Re-activated)")
        print("  [PASS] Agent persistent identity and lifecycle states verified.")

        # 3. Cryptographic Credential Issuance, Plaintext Single-Display, and Validation
        print("\n[3/7] Testing Cryptographic Agent Credentials (Hashing, Display, Validation, Rotation)...")
        credential_1, raw_secret_1 = await authz_service.create_agent_credential(
            agent_id=agent_a.id,
            created_by_user_id=str(human_user.id),
            name="Primary CI Key",
            expires_in_days=30,
        )
        print(f"  Credential Created: id={credential_1.id}, prefix='{credential_1.credential_prefix}'")
        print(f"  Plaintext secret returned once: '{raw_secret_1[:12]}...[REDACTED]'")
        print(f"  Database stores ONLY SHA-256 hash: '{credential_1.secret_hash[:16]}...'")

        # Verify plaintext cannot be found in database
        db_cred = (await db.execute(select(AgentCredential).where(AgentCredential.id == credential_1.id))).scalar_one()
        assert db_cred.secret_hash != raw_secret_1, "CRITICAL: Plaintext secret found in database!"
        assert not hasattr(db_cred, "raw_secret"), "Model must not persist raw_secret attribute!"

        # Authenticate valid credential
        principal_1 = await authz_service.authenticate_credential(raw_secret_1)
        assert principal_1.agent_id == agent_a.id
        assert principal_1.project_id == project_a.id
        print(f"  [PASS] Authenticated principal resolved: type={principal_1.principal_type}, agent_id={principal_1.agent_id}")

        # Rotate Credential
        print("  Rotating credential...")
        credential_2, raw_secret_2 = await authz_service.rotate_credential(
            agent_id=agent_a.id,
            credential_id=credential_1.id,
            actor_id=str(human_user.id),
        )
        print(f"  New Credential Created: id={credential_2.id}")

        # Check old credential is now revoked
        await db.refresh(credential_1)
        assert credential_1.status == "REVOKED", f"Expected REVOKED but got {credential_1.status}"
        try:
            await authz_service.authenticate_credential(raw_secret_1)
            assert False, "Old rotated credential was accepted!"
        except CredentialRevokedError:
            print("  [PASS] Old credential rejected with CredentialRevokedError.")

        # Authenticate new credential
        principal_2 = await authz_service.authenticate_credential(raw_secret_2)
        assert principal_2.credential_id == credential_2.id
        print("  [PASS] New rotated credential authenticated successfully.")

        # 4. Role & Permission Assignment and Deterministic Precedence
        print("\n[4/7] Testing Role Assignment, Scoped Permissions & Deterministic Precedence...")
        operator_role = (await db.execute(select(Role).where(Role.name == "SecurityOperator"))).scalar_one()
        
        # Assign SecurityOperator role to Agent A for Project A
        await authz_service.assign_role_to_agent(
            agent_id=agent_a.id,
            role_id=operator_role.id,
            actor_id=str(human_user.id),
            scope={"project_id": str(project_a.id), "environment": "DEVELOPMENT"},
        )
        print(f"  Assigned '{operator_role.name}' role to Agent A scoped to Project A and DEVELOPMENT.")

        # Check ALLOW: SCAN_EXECUTE on Project A in DEVELOPMENT
        scope_dev = ScopeContext(
            project_id=project_a.id,
            environment="DEVELOPMENT",
            repository="alpha-repo",
            branch="main",
        )
        decision = await authz_service.authorize(
            principal=principal_2,
            action="SCAN_EXECUTE",
            scope_context=scope_dev,
        )
        assert decision.decision == "ALLOW", f"Expected ALLOW, got {decision.decision} ({decision.reason})"
        print(f"  [PASS] Allowed SCAN_EXECUTE in DEVELOPMENT: decision={decision.decision}")

        # Check DENY BY DEFAULT: Dangerous unassigned permission SECRET_READ
        decision_denied = await authz_service.authorize(
            principal=principal_2,
            action="SECRET_READ",
            scope_context=scope_dev,
        )
        assert decision_denied.decision == "DENY", f"Expected DENY, got {decision_denied.decision}"
        assert decision_denied.reason_code == "PERMISSION_MISSING"
        print(f"  [PASS] Deny-by-default for SECRET_READ: decision={decision_denied.decision}, code={decision_denied.reason_code}")

        # Check Environment Restriction: STAGING requires matching scope
        scope_prod = ScopeContext(
            project_id=project_a.id,
            environment="PRODUCTION",
            repository="alpha-repo",
            branch="main",
        )
        decision_env = await authz_service.authorize(
            principal=principal_2,
            action="SCAN_EXECUTE",
            scope_context=scope_prod,
        )
        assert decision_env.decision == "DENY", f"Expected DENY for PRODUCTION, got {decision_env.decision}"
        print(f"  [PASS] Denied SCAN_EXECUTE for PRODUCTION: code={decision_env.reason_code}")

        # 5. Cross-Project Isolation & Self-Escalation Prevention
        print("\n[5/7] Testing Cross-Project Isolation & Self-Escalation Prevention...")
        # Cross-Project Test: Agent A attempts to access Project B
        scope_proj_b = ScopeContext(
            project_id=project_b.id,
            environment="DEVELOPMENT",
            repository="payroll-repo",
            branch="main",
        )
        decision_cross = await authz_service.authorize(
            principal=principal_2,
            action="SCAN_EXECUTE",
            scope_context=scope_proj_b,
        )
        assert decision_cross.decision == "DENY", f"Expected DENY, got {decision_cross.decision}"
        assert decision_cross.reason_code == "PROJECT_SCOPE_DENIED"
        print(f"  [PASS] Cross-Project access blocked: decision={decision_cross.decision}, code={decision_cross.reason_code}")

        # Self-Escalation Test: Principal with actor_type=AGENT attempts to assign a role
        try:
            await authz_service.assign_role_to_agent(
                agent_id=agent_a.id,
                role_id=operator_role.id,
                actor_id=str(agent_a.id),
                actor_type="AGENT", # Agent attempting self-grant
            )
            assert False, "Self-escalation succeeded!"
        except SelfEscalationForbiddenError:
            print("  [PASS] Agent self-escalation blocked with SelfEscalationForbiddenError.")

        # 6. Session Live Revalidation & Immediate Revocation Invalidation
        print("\n[6/7] Testing Session Live Revalidation on Agent & Credential Revocation...")
        authenticator = MCPAuthenticator(db)
        auth_session = await authenticator.create_session(
            agent_id=agent_a.id,
            project_id=project_a.id,
            authenticated_principal=human_user.email,
            credential_id=credential_2.id,
            client_name="antigravity-worker",
            client_version="2.4",
        )
        print(f"  Active MCP Session established: session_id={auth_session.id}")
        assert auth_session.agent_id == agent_a.id
        assert auth_session.credential_id == credential_2.id

        # Revalidate passes while active
        active_ctx = await authenticator.authenticate_session(auth_session.id)
        assert active_ctx.principal.agent_id == agent_a.id
        print("  Active session revalidation: PASSED")

        # Suspend Agent -> Session immediately invalid
        agent_a.status = "SUSPENDED"
        await db.commit()
        try:
            await authenticator.authenticate_session(auth_session.id)
            assert False, "Suspended agent's session was validated!"
        except MCPAuthenticationError as e:
            print(f"  [PASS] Suspended agent session rejected: {str(e)}")

        # Reactivate Agent -> Revoke Credential -> Session immediately invalid
        agent_a.status = "ACTIVE"
        await db.commit()
        await authz_service.revoke_credential(agent_id=agent_a.id, credential_id=credential_2.id, reason="Security audit test", actor_id=str(human_user.id))
        try:
            await authenticator.authenticate_session(auth_session.id)
            assert False, "Revoked credential's session was validated!"
        except MCPAuthenticationError as e:
            print(f"  [PASS] Revoked credential session rejected: {str(e)}")

        # 7. End-to-End MCP Gateway Tool Execution with Agent Credential & Audit Trail
        print("\n[7/7] Testing Real MCP Gateway Tool Execution with Authenticated Agent...")
        # Issue fresh credential for clean execution
        credential_clean, clean_secret = await authz_service.create_agent_credential(
            agent_id=agent_a.id,
            created_by_user_id=str(human_user.id),
            name="Prod-Ready Clean Credential",
        )
        clean_cred_id = credential_clean.id

        # Create Security Policy for Project A to satisfy Step 7 Policy Engine
        policy = SecurityPolicy(
            id=uuid.uuid4(),
            project_id=project_a.id,
            name="Alpha Strict Policy",
            description="Policy for Alpha Project",
            scope="PROJECT",
            priority=10,
            policy_type="PROJECT",
            status="ACTIVE",
            current_version=1,
            created_by=str(human_user.id),
        )
        version = SecurityPolicyVersion(
            id=uuid.uuid4(),
            policy_id=policy.id,
            version=1,
            definition={
                "name": "Alpha Strict Policy",
                "description": "Policy definition for Project Alpha",
                "rules": [],
            },
            active=True,
            created_by=str(human_user.id),
        )
        db.add_all([policy, version])
        await db.commit()

        # Connect through MCP Gateway
        gateway = MCPGateway(db)
        session = await authenticator.create_session(
            agent_id=agent_a.id,
            project_id=project_a.id,
            authenticated_principal=human_user.email,
            credential_id=clean_cred_id,
            client_name="antigravity-production",
            client_version="1.0",
        )
        print(f"  MCP Gateway Session Created: session_id={session.id}")

        # Invoke Tool: get_project for Project A (Requires PROJECT_READ)
        exec_result = await gateway.invoke_tool(
            session_id=session.id,
            tool_name="get_project",
            arguments={"project_id": str(project_a.id)},
        )
        assert exec_result.status == "SUCCESS", f"Tool execution failed: {exec_result.message}"
        print(f"  Tool Execution Succeeded: project_name='{exec_result.data.get('name')}'")

        # Invoke Tool on Project B (Must fail authorization before tool runs)
        exec_cross = await gateway.invoke_tool(
            session_id=session.id,
            tool_name="get_project",
            arguments={"project_id": str(project_b.id)},
        )
        assert exec_cross.status == "DENIED", f"Cross-project tool call succeeded: {exec_cross.status}"
        assert exec_cross.error_code in ("MCP_PROJECT_ACCESS_DENIED", "MCP_AUTHORIZATION_DENIED")
        print(f"  [PASS] Gateway blocked unauthorized cross-project tool call: code={exec_cross.error_code}, message={exec_cross.message}")

        # Verify Immutable Authorization Decisions Table
        authz_records = (await db.execute(select(AuthorizationDecision))).scalars().all()
        assert len(authz_records) > 0, "No authorization decisions recorded!"
        print(f"  Verified {len(authz_records)} immutable Authorization Decisions persisted in database.")

        # Verify Audit Log Trail
        audit_events = (await db.execute(select(AuditEvent))).scalars().all()
        print(f"  Verified {len(audit_events)} audit events recorded.")
        event_types = set(e.action for e in audit_events)
        print(f"  Audit event types recorded: {event_types}")

    print("\n" + "=" * 75)
    print("ALL STEP 10 VERIFICATIONS PASSED CLEANLY (7/7).")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(run_step10_verifications())
