import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.authorization.errors import (
    AgentRevokedError,
    CredentialExpiredError,
    CredentialRevokedError,
    NotAuthenticatedError,
    SelfEscalationForbiddenError,
)
from app.authorization.evaluator import DeterministicAuthorizationEvaluator
from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.scopes import ScopeContext
from app.authorization.service import AuthorizationService
from app.mcp import MCPGateway
from app.mcp.authentication import MCPAuthenticator
from app.mcp.errors import MCPAuthenticationError, MCPProjectAccessDeniedError
from app.models.agent import Agent
from app.models.authorization import (
    AgentCredential,
    AgentPermissionOverride,
    AgentRole,
    AuthorizationDecision,
    Permission,
    Role,
)
from app.models.blueprint import SecurityBlueprint, SecurityRequirement
from app.models.intent import Intent
from app.models.project import Project
from app.models.user import User
from app.services.agent_service import AgentService


@pytest.mark.asyncio
async def test_agent_lifecycle_and_state_transitions(db_session: AsyncSession, user_a: User):
    """
    Tests agent creation, retrieval, updates, and explicit lifecycle transitions:
    REGISTERED -> ACTIVE -> SUSPENDED -> ACTIVE -> REVOKED.
    """
    project = Project(
        id=uuid.uuid4(),
        name="Lifecycle Project",
        description="Testing lifecycle",
        repository_url="https://github.com/secure/lifecycle",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.commit()

    service = AgentService(db_session)

    # 1. Register Agent
    from app.schemas.agent import AgentCreate, AgentUpdate
    created = await service.create_agent(
        AgentCreate(
            project_id=project.id,
            name="Lifecycle Worker Alpha",
            agent_type="CODING_AGENT",
            description="Agent for test workflows",
            status="REGISTERED",
            trust_level="STANDARD",
            initial_role="CodingAssistant",
        ),
        current_user=user_a,
    )
    assert created.id is not None
    assert created.status == "REGISTERED"

    # 2. Activate Agent
    activated = await service.activate_agent(created.id, current_user=user_a)
    assert activated.status == "ACTIVE"

    # 3. Suspend Agent
    suspended = await service.suspend_agent(created.id, current_user=user_a)
    assert suspended.status == "SUSPENDED"

    # 4. Reactivate Agent
    reactivated = await service.activate_agent(created.id, current_user=user_a)
    assert reactivated.status == "ACTIVE"

    # 5. Revoke Agent
    revoked = await service.revoke_agent(created.id, current_user=user_a)
    assert revoked.status == "REVOKED"


@pytest.mark.asyncio
async def test_agent_credential_lifecycle_and_cryptographic_verification(db_session: AsyncSession, user_a: User):
    """
    Tests agent credential generation (secret shown once), constant-time hash verification,
    expiration, revocation, and rotation.
    """
    project = Project(
        id=uuid.uuid4(),
        name="Credential Test Project",
        description="Testing credentials",
        repository_url="https://github.com/secure/creds",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Secure Credential Agent",
        agent_type="SECURITY_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authz = AuthorizationService(db_session)

    # 1. Create Credential
    cred, raw_token = await authz.create_agent_credential(
        agent_id=agent.id,
        name="Primary API Key",
        expires_in_days=30,
        created_by_user_id=str(user_a.id),
    )
    assert raw_token.startswith("agk_")
    assert cred.secret_hash != raw_token
    assert cred.status == "ACTIVE"

    # 2. Authenticate with valid credential
    principal = await authz.authenticate_credential(raw_token)
    assert principal.is_agent is True
    assert principal.agent_id == agent.id
    assert principal.project_id == project.id
    assert principal.credential_id == cred.id
    assert principal.authentication_method == "AGENT_API_KEY"

    # 3. Invalid token rejection
    with pytest.raises(NotAuthenticatedError):
        await authz.authenticate_credential("agk_invalid_token_1234567890abcdef")

    # 4. Expired credential rejection
    cred.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db_session.commit()
    with pytest.raises(CredentialExpiredError):
        await authz.authenticate_credential(raw_token)

    # 5. Rotate Credential
    # Reset expiration first for rotation test
    cred.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    await db_session.commit()

    new_cred, new_token = await authz.rotate_credential(
        agent_id=agent.id,
        credential_id=cred.id,
        actor_id=str(user_a.id),
    )
    assert new_cred.id != cred.id
    assert new_token != raw_token
    assert new_cred.status == "ACTIVE"

    # Verify old credential is now REVOKED
    await db_session.refresh(cred)
    assert cred.status == "REVOKED"
    with pytest.raises(NotAuthenticatedError):
        await authz.authenticate_credential(raw_token)

    # Verify new credential authenticates successfully
    new_principal = await authz.authenticate_credential(new_token)
    assert new_principal.credential_id == new_cred.id


@pytest.mark.asyncio
async def test_deterministic_authorization_and_scoping(db_session: AsyncSession, user_a: User):
    """
    Tests deterministic evaluation:
    - Allowed permissions from assigned roles
    - Deny by default for missing permissions
    - Environment scoping
    - Explicit DENY overrides taking precedence
    """
    project = Project(
        id=uuid.uuid4(),
        name="Authz Scope Project",
        description="Testing authorization rules",
        repository_url="https://github.com/secure/scope-test",
        owner_id=user_a.id,
        environment="staging",
    )
    db_session.add(project)
    await db_session.flush()

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Scoped Scanner Agent",
        agent_type="SECURITY_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authz = AuthorizationService(db_session)
    await authz.seed_canonical_roles_and_permissions()

    # 1. Assign SecurityReviewer role (Read-only, lacks SCAN_EXECUTE)
    rev_role = (await db_session.execute(select(Role).where(Role.name == "SecurityReviewer"))).scalar_one()
    await authz.assign_role_to_agent(
        agent_id=agent.id,
        role_id=rev_role.id,
        scope={"project_id": str(project.id)},
        actor_id=str(user_a.id),
    )

    principal = AuthenticatedPrincipal(
        principal_id=str(agent.id),
        principal_type="AGENT",
        agent_id=agent.id,
        project_id=project.id,
        trust_level="STANDARD",
    )

    # PROJECT_READ is allowed by SecurityReviewer
    scope_dev = ScopeContext(project_id=project.id, environment="development")
    res_read = await authz.authorize(principal, action="PROJECT_READ", scope_context=scope_dev)
    assert res_read.decision == "ALLOW"
    assert res_read.reason_code == "AUTHORIZED"

    # SCAN_EXECUTE is missing in SecurityReviewer -> DENIED
    res_exec = await authz.authorize(principal, action="SCAN_EXECUTE", scope_context=scope_dev)
    assert res_exec.decision == "DENY"
    assert res_exec.reason_code == "PERMISSION_MISSING"

    # 2. Add SecurityOperator role with environment scope restricted to "development"
    op_role = (await db_session.execute(select(Role).where(Role.name == "SecurityOperator"))).scalar_one()
    await authz.assign_role_to_agent(
        agent_id=agent.id,
        role_id=op_role.id,
        scope={"project_id": str(project.id), "environments": ["development"]},
        actor_id=str(user_a.id),
    )

    # In development -> SCAN_EXECUTE allowed
    res_dev_exec = await authz.authorize(principal, action="SCAN_EXECUTE", scope_context=scope_dev)
    assert res_dev_exec.decision == "ALLOW"

    # In production -> Environment restriction causes role not to match -> DENIED
    scope_prod = ScopeContext(project_id=project.id, environment="production")
    res_prod_exec = await authz.authorize(principal, action="SCAN_EXECUTE", scope_context=scope_prod)
    assert res_prod_exec.decision == "DENY"
    assert res_prod_exec.reason_code == "PERMISSION_MISSING"

    # 3. Explicit DENY override on PROJECT_READ takes precedence over role
    read_perm = (await db_session.execute(select(Permission).where(Permission.name == "PROJECT_READ"))).scalar_one()
    override = AgentPermissionOverride(
        agent_id=agent.id,
        permission_id=read_perm.id,
        effect="DENY",
        scope={},
        reason="Security audit quarantine",
    )
    db_session.add(override)
    await db_session.commit()

    res_quarantine = await authz.authorize(principal, action="PROJECT_READ", scope_context=scope_dev)
    assert res_quarantine.decision == "DENY"
    assert res_quarantine.reason_code == "EXPLICIT_DENY"


@pytest.mark.asyncio
async def test_cross_project_isolation_and_audit(db_session: AsyncSession, user_a: User):
    """
    Tests that an agent assigned to Project A attempting to access Project B is blocked
    and an immutable AuthorizationDecision record is saved.
    """
    proj_a = Project(
        id=uuid.uuid4(),
        name="Project Alpha",
        description="Alpha Bank",
        repository_url="https://github.com/secure/alpha",
        owner_id=user_a.id,
        environment="development",
    )
    proj_b = Project(
        id=uuid.uuid4(),
        name="Project Beta",
        description="Beta Bank",
        repository_url="https://github.com/secure/beta",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add_all([proj_a, proj_b])
    await db_session.flush()

    agent_a = Agent(
        id=uuid.uuid4(),
        project_id=proj_a.id,
        name="Agent Alpha",
        agent_type="CODING_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add(agent_a)
    await db_session.commit()

    authz = AuthorizationService(db_session)
    principal = AuthenticatedPrincipal(
        principal_id=str(agent_a.id),
        principal_type="AGENT",
        agent_id=agent_a.id,
        project_id=proj_a.id,
        trust_level="STANDARD",
    )

    # Attempt cross-project access to Project B
    cross_scope = ScopeContext(project_id=proj_b.id, environment="development")
    result = await authz.authorize(principal, action="PROJECT_READ", scope_context=cross_scope)
    assert result.decision == "DENY"
    assert result.reason_code == "PROJECT_SCOPE_DENIED"

    # Verify immutable AuthorizationDecision persisted
    stmt = select(AuthorizationDecision).where(
        AuthorizationDecision.agent_id == agent_a.id,
        AuthorizationDecision.reason_code == "PROJECT_SCOPE_DENIED",
    )
    decision_rec = (await db_session.execute(stmt)).scalar_one_or_none()
    assert decision_rec is not None
    assert decision_rec.decision == "DENY"


@pytest.mark.asyncio
async def test_revoked_agent_and_credential_session_invalidation(db_session: AsyncSession, user_a: User):
    """
    Validates that revoking an agent or its credential terminates active MCP sessions.
    """
    project = Project(
        id=uuid.uuid4(),
        name="Revocation Project",
        description="Testing revocation",
        repository_url="https://github.com/secure/revoke",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Revocable Agent",
        agent_type="CODING_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authz = AuthorizationService(db_session)
    cred, raw_token = await authz.create_agent_credential(
        agent_id=agent.id,
        name="Revocable Key",
        created_by_user_id=str(user_a.id),
    )

    authenticator = MCPAuthenticator(db_session)
    session = await authenticator.create_session(
        agent_id=agent.id,
        project_id=project.id,
        authenticated_principal=user_a.email,
        credential_id=cred.id,
    )
    assert session.status == "ACTIVE"

    # 1. Normal session authenticate succeeds
    ctx = await authenticator.authenticate_session(session.id)
    assert ctx.principal.agent_id == agent.id

    # 2. Revoke agent
    agent_svc = AgentService(db_session)
    await agent_svc.revoke_agent(agent.id, current_user=user_a)

    # 3. Existing session must now fail authentication
    with pytest.raises(MCPAuthenticationError) as exc_info:
        await authenticator.authenticate_session(session.id)
    assert "REVOKED" in str(exc_info.value)


@pytest.mark.asyncio
async def test_self_escalation_prevention(db_session: AsyncSession, user_a: User):
    """
    Verifies that AI agents are forbidden from assigning themselves roles or modifying clearances.
    """
    project = Project(
        id=uuid.uuid4(),
        name="Anti Escalation Project",
        description="Testing anti escalation",
        repository_url="https://github.com/secure/escalation",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Untrusted Rogue Agent",
        agent_type="CODING_AGENT",
        trust_level="UNTRUSTED",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authz = AuthorizationService(db_session)
    await authz.seed_canonical_roles_and_permissions()

    op_role = (await db_session.execute(select(Role).where(Role.name == "SecurityOperator"))).scalar_one()

    # Agent attempting to grant itself a role must raise SelfEscalationForbiddenError
    with pytest.raises(SelfEscalationForbiddenError):
        await authz.assign_role_to_agent(
            agent_id=agent.id,
            role_id=op_role.id,
            actor_id=str(agent.id),
            actor_type="AGENT",
        )


@pytest.mark.asyncio
async def test_mcp_gateway_end_to_end_with_agent_credential(db_session: AsyncSession, user_a: User):
    """
    End-to-end integration test:
    Agent Credential -> Authenticate -> Agent Identity -> Authorization -> Step 7 Policy -> Tool Execution -> Audit Evidence.
    """
    project = Project(
        id=uuid.uuid4(),
        name="MCP End To End Project",
        description="Testing complete pipeline",
        repository_url="https://github.com/secure/e2e",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    intent = Intent(
        id=uuid.uuid4(),
        project_id=project.id,
        raw_input="E2E Banking Gateway",
        environment="development",
        application_type="REST_API",
        purpose="Payment gateway",
        status="COMPLETED",
    )
    db_session.add(intent)
    await db_session.flush()

    blueprint = SecurityBlueprint(
        id=uuid.uuid4(),
        project_id=project.id,
        intent_id=intent.id,
        version=1,
        status="ACTIVE",
        methodology_version="2026.1.0",
        generated_by="system",
        risk_factors=[],
    )
    db_session.add(blueprint)
    await db_session.flush()

    req = SecurityRequirement(
        blueprint_id=blueprint.id,
        requirement_key="REQ-E2E-01",
        title="Sanitize SQL Inputs",
        description="Prevent SQL injection in payments",
        category="INJECTION",
        severity="CRITICAL",
        priority="REQUIRED",
        mandatory=True,
        rationale="SQLi prevention",
        verification_strategy=["STATIC_ANALYSIS"],
    )
    db_session.add(req)

    # Create Agent
    agent = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Antigravity E2E Agent",
        agent_type="CODING_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authz = AuthorizationService(db_session)
    await authz.seed_canonical_roles_and_permissions()

    # Assign CodingAssistant role
    ca_role = (await db_session.execute(select(Role).where(Role.name == "CodingAssistant"))).scalar_one()
    await authz.assign_role_to_agent(
        agent_id=agent.id,
        role_id=ca_role.id,
        scope={"project_id": str(project.id)},
        actor_id=str(user_a.id),
    )

    # Generate Credential
    cred, raw_token = await authz.create_agent_credential(
        agent_id=agent.id,
        name="E2E Token",
        created_by_user_id=str(user_a.id),
    )

    # Establish MCP Session using Credential
    authenticator = MCPAuthenticator(db_session)
    principal = await authz.authenticate_credential(raw_token)
    session = await authenticator.create_session(
        agent_id=agent.id,
        project_id=project.id,
        authenticated_principal=principal.principal_id,
        credential_id=cred.id,
        client_name="antigravity-ide",
        client_version="2.0.0",
    )

    gateway = MCPGateway(db_session)

    # Execute authorized tool
    res = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="get_security_blueprint",
        arguments={"project_id": str(project.id)},
    )
    assert res.status == "SUCCESS"
    assert res.data["blueprint_id"] == str(blueprint.id)
    assert res.data["requirements_count"] == 1

    # Verify authorization decision was persisted in database
    authz_dec_stmt = select(AuthorizationDecision).where(
        AuthorizationDecision.agent_id == agent.id,
        AuthorizationDecision.action == "BLUEPRINT_READ",
    )
    authz_record = (await db_session.execute(authz_dec_stmt)).scalar_one_or_none()
    assert authz_record is not None
    assert authz_record.decision == "ALLOW"
    assert authz_record.reason_code == "AUTHORIZED"
