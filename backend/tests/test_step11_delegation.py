import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.authorization.evaluator import DeterministicAuthorizationEvaluator
from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.scopes import ScopeContext
from app.authorization.service import AuthorizationService
from app.delegation.errors import (
    AuthorityEscalationForbiddenError,
    DelegationCycleDetectedError,
    DelegationDepthExceededError,
    EnvironmentEscalationForbiddenError,
    ExpirationEscalationForbiddenError,
    FurtherDelegationForbiddenError,
    ScopeEscalationForbiddenError,
    SecretDataFlowForbiddenError,
    SelfDelegationForbiddenError,
)
from app.delegation.schemas import (
    DataFlowCreateRequest,
    DelegationAuthority,
    DelegationCreateRequest,
)
from app.delegation.service import DelegationService
from app.mcp import MCPGateway
from app.models.agent import Agent
from app.models.authorization import (
    AgentCredential,
    AgentRole,
    Permission,
    Role,
    RolePermission,
)
from app.models.delegation import AgentAuthorityEdge, AgentDataFlow, AgentDelegation
from app.models.project import Project
from app.models.user import User


async def setup_test_project_and_agents(db_session: AsyncSession, user: User):
    """Helper to set up standard project, roles, and agents for Step 11 tests."""
    project = Project(
        id=uuid.uuid4(),
        name="Step 11 Security Test Project",
        description="Delegation and authority graph testing",
        repository_url="https://github.com/secure/step11-test",
        owner_id=user.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    perm_proj_read = Permission(
        id=uuid.uuid4(),
        name="perm_proj_read",
        description="Read project details",
        resource_type="PROJECT",
        action="PROJECT_READ",
        risk_level="LOW",
    )
    perm_scan_exec = Permission(
        id=uuid.uuid4(),
        name="perm_scan_exec",
        description="Execute scans",
        resource_type="PROJECT",
        action="SCAN_EXECUTE",
        risk_level="MEDIUM",
    )
    perm_finding_read = Permission(
        id=uuid.uuid4(),
        name="perm_finding_read",
        description="Read findings",
        resource_type="PROJECT",
        action="FINDING_READ",
        risk_level="LOW",
    )
    perm_deploy = Permission(
        id=uuid.uuid4(),
        name="perm_deploy",
        description="Deploy to production",
        resource_type="PROJECT",
        action="PRODUCTION_DEPLOY",
        risk_level="CRITICAL",
    )
    perm_secret = Permission(
        id=uuid.uuid4(),
        name="perm_secret",
        description="Read secrets",
        resource_type="SECRET",
        action="SECRET_READ",
        risk_level="CRITICAL",
    )
    db_session.add_all([perm_proj_read, perm_scan_exec, perm_finding_read, perm_deploy, perm_secret])
    await db_session.flush()

    # Roles
    scanner_role = Role(
        id=uuid.uuid4(),
        name="ScannerRole",
        description="Scanner role",
        is_system=False,
        status="ACTIVE",
    )
    deployer_role = Role(
        id=uuid.uuid4(),
        name="DeployerRole",
        description="Deployer role",
        is_system=False,
        status="ACTIVE",
    )
    db_session.add_all([scanner_role, deployer_role])
    await db_session.flush()

    db_session.add_all([
        RolePermission(role_id=scanner_role.id, permission_id=perm_proj_read.id),
        RolePermission(role_id=scanner_role.id, permission_id=perm_scan_exec.id),
        RolePermission(role_id=scanner_role.id, permission_id=perm_finding_read.id),
        RolePermission(role_id=deployer_role.id, permission_id=perm_deploy.id),
    ])
    await db_session.flush()


    # Agents
    agent_a = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Agent Alpha (Lead Scanner)",
        agent_type="SECURITY_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    agent_b = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Agent Beta (Worker)",
        agent_type="CODING_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    agent_c = Agent(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Agent Gamma (Sub-Worker)",
        agent_type="CODING_AGENT",
        trust_level="STANDARD",
        status="ACTIVE",
    )
    db_session.add_all([agent_a, agent_b, agent_c])
    await db_session.flush()

    # Assign scanner role to Agent A with DEVELOPMENT scope
    now = datetime.now(timezone.utc)
    agent_a_role = AgentRole(
        id=uuid.uuid4(),
        agent_id=agent_a.id,
        role_id=scanner_role.id,
        scope={"environment": "DEVELOPMENT", "project_id": str(project.id)},
        expires_at=now + timedelta(days=10),
    )
    db_session.add(agent_a_role)
    await db_session.commit()

    return {
        "project": project,
        "agent_a": agent_a,
        "agent_b": agent_b,
        "agent_c": agent_c,
        "perm_scan_exec": perm_scan_exec,
        "perm_finding_read": perm_finding_read,
        "perm_deploy": perm_deploy,
        "perm_secret": perm_secret,
        "scanner_role": scanner_role,
        "deployer_role": deployer_role,
    }


@pytest.mark.asyncio
async def test_authority_subset_check_escalation_forbidden(db_session: AsyncSession, user_a: User):
    """
    Section 46 & 64: Agent A has SCAN_EXECUTE.
    Attempting to delegate PRODUCTION_DEPLOY (which A does not possess) is deterministically rejected.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # Agent A attempts to delegate PRODUCTION_DEPLOY to Agent B
    req = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_b"].id,
        authority=DelegationAuthority(
            actions=["PRODUCTION_DEPLOY"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=2),
        reason="Attempting unauthorized escalation",
    )

    with pytest.raises(AuthorityEscalationForbiddenError) as exc_info:
        await service.create_delegation(
            delegator_agent_id=ctx["agent_a"].id,
            request=req,
            actor_id=str(user_a.id),
        )

    assert "PRODUCTION_DEPLOY" in str(exc_info.value)
    assert exc_info.value.reason_code == "AUTHORITY_ESCALATION_FORBIDDEN"


@pytest.mark.asyncio
async def test_scope_and_environment_narrowing(db_session: AsyncSession, user_a: User):
    """
    Section 47, 48 & 65:
    1. Environment cannot exceed delegator clearance (A has DEVELOPMENT, cannot delegate PRODUCTION).
    2. Resource scope cannot exceed delegator scope (cannot delegate unrelated project).
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # 1. Environment Escalation: DEVELOPMENT -> PRODUCTION
    req_env = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_b"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="PRODUCTION",  # Escalation!
        ),
        expires_at=now + timedelta(days=2),
        reason="Attempting environment escalation",
    )

    with pytest.raises(EnvironmentEscalationForbiddenError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_a"].id,
            request=req_env,
            actor_id=str(user_a.id),
        )

    # 2. Scope Escalation: Delegating project B when A only has project A
    other_project_id = uuid.uuid4()
    req_scope = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_b"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(other_project_id)},  # Unrelated project
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=2),
        reason="Attempting scope escalation",
    )

    with pytest.raises(ScopeEscalationForbiddenError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_a"].id,
            request=req_scope,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_expiration_inheritance_enforced(db_session: AsyncSession, user_a: User):
    """
    Section 10, 49 & 66: Child delegation cannot outlive delegator authority.
    Agent A's role expires in 10 days. Attempting to delegate for 20 days is rejected.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    req_exp = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_b"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=25),  # Exceeds A's 10-day limit!
        reason="Attempting lifetime escalation",
    )

    with pytest.raises(ExpirationEscalationForbiddenError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_a"].id,
            request=req_exp,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_further_delegation_control(db_session: AsyncSession, user_a: User):
    """
    Section 20 & 69:
    If allow_further_delegation is False, delegate agent B cannot re-delegate that authority to Agent C.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # 1. A delegates to B with allow_further_delegation=False
    del_a_b = await service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(
                actions=["SCAN_EXECUTE"],
                resource_type="PROJECT",
                resource_scope={"project_id": str(ctx["project"].id)},
                environment="DEVELOPMENT",
                allow_further_delegation=False,
            ),
            expires_at=now + timedelta(days=3),
            allow_further_delegation=False,
            reason="A delegates to B without further delegation permission",
        ),
        actor_id=str(user_a.id),
    )
    assert del_a_b.status == "ACTIVE"
    assert del_a_b.allow_further_delegation is False

    # 2. B attempts to delegate SCAN_EXECUTE to C -> MUST FAIL
    req_b_c = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_c"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=1),
        parent_delegation_id=del_a_b.id,
        reason="B attempts to re-delegate to C",
    )

    with pytest.raises(FurtherDelegationForbiddenError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_b"].id,
            request=req_b_c,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_delegation_cycle_detection(db_session: AsyncSession, user_a: User):
    """
    Section 13 & 68: A -> B -> C -> A. Cycle must be detected and rejected before saving.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # 1. A -> B (allow further delegation)
    del_ab = await service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(
                actions=["SCAN_EXECUTE"],
                resource_type="PROJECT",
                resource_scope={"project_id": str(ctx["project"].id)},
                environment="DEVELOPMENT",
                allow_further_delegation=True,
            ),
            expires_at=now + timedelta(days=5),
            allow_further_delegation=True,
            reason="A to B hop 1",
        ),
        actor_id=str(user_a.id),
    )
    assert del_ab.status == "ACTIVE"

    # 2. B -> C
    del_bc = await service.create_delegation(
        delegator_agent_id=ctx["agent_b"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_c"].id,
            authority=DelegationAuthority(
                actions=["SCAN_EXECUTE"],
                resource_type="PROJECT",
                resource_scope={"project_id": str(ctx["project"].id)},
                environment="DEVELOPMENT",
                allow_further_delegation=True,
            ),
            expires_at=now + timedelta(days=3),
            parent_delegation_id=del_ab.id,
            allow_further_delegation=True,
            reason="B to C hop 2",
        ),
        actor_id=str(user_a.id),
    )
    assert del_bc.status == "ACTIVE"
    assert del_bc.delegation_depth == 2

    # 3. C -> A (CYCLE!) -> Must be rejected
    req_ca = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_a"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=1),
        parent_delegation_id=del_bc.id,
        reason="C attempts to delegate back to A forming a cycle",
    )

    with pytest.raises(DelegationCycleDetectedError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_c"].id,
            request=req_ca,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_self_delegation_forbidden(db_session: AsyncSession, user_a: User):
    """
    Section 71: Prevent self-delegation A -> A.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    req_self = DelegationCreateRequest(
        delegate_agent_id=ctx["agent_a"].id,
        authority=DelegationAuthority(
            actions=["SCAN_EXECUTE"],
            resource_type="PROJECT",
            resource_scope={"project_id": str(ctx["project"].id)},
            environment="DEVELOPMENT",
        ),
        expires_at=now + timedelta(days=2),
        reason="Self delegation attempt",
    )

    with pytest.raises(SelfDelegationForbiddenError):
        await service.create_delegation(
            delegator_agent_id=ctx["agent_a"].id,
            request=req_self,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_delegation_depth_limit_enforced(db_session: AsyncSession, user_a: User):
    """
    Section 12 & 22: Enforces MAX_DELEGATION_DEPTH=3.
    A (0) -> B (1) -> C (2) -> D (3) -> E (4) -> Fails with DelegationDepthExceededError.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # Create Agent D and Agent E
    agent_d = Agent(id=uuid.uuid4(), project_id=ctx["project"].id, name="Agent Delta", agent_type="CODING_AGENT", trust_level="STANDARD", status="ACTIVE")
    agent_e = Agent(id=uuid.uuid4(), project_id=ctx["project"].id, name="Agent Epsilon", agent_type="CODING_AGENT", trust_level="STANDARD", status="ACTIVE")
    db_session.add_all([agent_d, agent_e])
    await db_session.commit()

    # 1. Hop 1: A -> B (depth 1)
    d1 = await service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}, allow_further_delegation=True),
            expires_at=now + timedelta(days=5),
            allow_further_delegation=True,
            reason="Hop 1",
        ),
        actor_id=str(user_a.id),
    )
    assert d1.delegation_depth == 1

    # 2. Hop 2: B -> C (depth 2)
    d2 = await service.create_delegation(
        delegator_agent_id=ctx["agent_b"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_c"].id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}, allow_further_delegation=True),
            expires_at=now + timedelta(days=4),
            parent_delegation_id=d1.id,
            allow_further_delegation=True,
            reason="Hop 2",
        ),
        actor_id=str(user_a.id),
    )
    assert d2.delegation_depth == 2

    # 3. Hop 3: C -> D (depth 3)
    d3 = await service.create_delegation(
        delegator_agent_id=ctx["agent_c"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=agent_d.id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}, allow_further_delegation=True),
            expires_at=now + timedelta(days=3),
            parent_delegation_id=d2.id,
            allow_further_delegation=True,
            reason="Hop 3",
        ),
        actor_id=str(user_a.id),
    )
    assert d3.delegation_depth == 3

    # 4. Hop 4: D -> E (depth 4) -> MUST EXCEED LIMIT
    req_hop4 = DelegationCreateRequest(
        delegate_agent_id=agent_e.id,
        authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}),
        expires_at=now + timedelta(days=2),
        parent_delegation_id=d3.id,
        reason="Hop 4 exceeding limit",
    )

    with pytest.raises(DelegationDepthExceededError):
        await service.create_delegation(
            delegator_agent_id=agent_d.id,
            request=req_hop4,
            actor_id=str(user_a.id),
        )


@pytest.mark.asyncio
async def test_delegation_subtree_revocation_cascading(db_session: AsyncSession, user_a: User):
    """
    Section 11, 38 & 67:
    Chain: A -> B -> C.
    When delegation A -> B is revoked, child delegation B -> C is automatically revoked.
    Agent C loses effective delegated authority immediately.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # 1. A -> B
    d_ab = await service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}, allow_further_delegation=True),
            expires_at=now + timedelta(days=5),
            allow_further_delegation=True,
            reason="A to B for cascade test",
        ),
        actor_id=str(user_a.id),
    )

    # 2. B -> C
    d_bc = await service.create_delegation(
        delegator_agent_id=ctx["agent_b"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_c"].id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}),
            expires_at=now + timedelta(days=4),
            parent_delegation_id=d_ab.id,
            reason="B to C for cascade test",
        ),
        actor_id=str(user_a.id),
    )

    # Verify C has effective SCAN_EXECUTE capability
    eff_c_before = await service.get_effective_authority(ctx["agent_c"].id)
    c_actions_before = [item.action for item in eff_c_before.effective_permissions]
    assert "SCAN_EXECUTE" in c_actions_before

    # 3. Revoke root delegation A -> B
    revoked_ids = await service.revoke_delegation(
        delegation_id=d_ab.id,
        actor_id=str(user_a.id),
        reason="Security breach on worker agent B",
    )
    assert d_ab.id in revoked_ids
    assert d_bc.id in revoked_ids

    # 4. Verify C has now LOST effective authority
    eff_c_after = await service.get_effective_authority(ctx["agent_c"].id)
    c_actions_after = [item.action for item in eff_c_after.effective_permissions]
    assert "SCAN_EXECUTE" not in c_actions_after


@pytest.mark.asyncio
async def test_revoked_source_authority_propagation(db_session: AsyncSession, user_a: User):
    """
    Section 11 & 72: A delegates to B. Then A is SUSPENDED or REVOKED.
    B's operation relying on A's authority is immediately DENIED.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    del_service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # A -> B
    del_record = await del_service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(actions=["SCAN_EXECUTE"], resource_scope={"project_id": str(ctx["project"].id)}),
            expires_at=now + timedelta(days=5),
            reason="Delegation for source revocation test",
        ),
        actor_id=str(user_a.id),
    )
    assert del_record.status == "ACTIVE"

    # Verify B can authorize SCAN_EXECUTE initially
    authz_service = AuthorizationService(db_session)
    principal_b = AuthenticatedPrincipal(
        principal_id=str(ctx["agent_b"].id),
        principal_type="AGENT",
        name=ctx["agent_b"].name,
        agent_id=ctx["agent_b"].id,
        project_id=ctx["project"].id,
        status="ACTIVE",
    )


    decision_before = await authz_service.authorize(
        principal=principal_b,
        action="SCAN_EXECUTE",
        scope_context=ScopeContext(project_id=ctx["project"].id, environment="DEVELOPMENT", resource_type="PROJECT", resource_id=str(ctx["project"].id)),
    )
    assert decision_before.decision == "ALLOW"
    assert decision_before.reason_code == "AUTHORIZED_VIA_DELEGATION"

    # Suspend Agent A
    ctx["agent_a"].status = "SUSPENDED"
    await db_session.commit()

    # B attempts operation again -> MUST BE DENIED because delegator A is no longer ACTIVE
    decision_after = await authz_service.authorize(
        principal=principal_b,
        action="SCAN_EXECUTE",
        scope_context=ScopeContext(project_id=ctx["project"].id, environment="DEVELOPMENT", resource_type="PROJECT", resource_id=str(ctx["project"].id)),
    )
    assert decision_after.decision == "DENY"



@pytest.mark.asyncio
async def test_data_flow_control_and_secret_block(db_session: AsyncSession, user_a: User):
    """
    Section 31 & 70:
    1. Operational data flow with INTERNAL classification is permitted.
    2. SECRET classification data flow is strictly denied unless both agents have explicit SECRET_READ clearance.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    del_service = DelegationService(db_session)

    # 1. Normal INTERNAL data flow (Security Findings)
    flow_req = DataFlowCreateRequest(
        destination_agent_id=ctx["agent_b"].id,
        data={"type": "SECURITY_FINDINGS", "classification": "INTERNAL"},
        source_resource={"type": "SCAN", "id": str(ctx["project"].id)},
        purpose="Analyze repository scan results",
    )
    flow_res = await del_service.evaluate_data_flow(
        source_agent_id=ctx["agent_a"].id,
        request=flow_req,
        actor_id=str(user_a.id),
    )
    assert flow_res.status == "ALLOWED"
    assert flow_res.decision == "ALLOW"

    # 2. SECRET data flow without SECRET_READ clearance on Agent B -> MUST BE FORBIDDEN
    secret_flow_req = DataFlowCreateRequest(
        destination_agent_id=ctx["agent_b"].id,
        data={"type": "DATABASE_CREDENTIALS", "classification": "SECRET"},
        source_resource={"type": "SECRET", "id": "prod_db_pw"},
        purpose="Database migration credentials transfer",
    )

    with pytest.raises(SecretDataFlowForbiddenError) as exc_info:
        await del_service.evaluate_data_flow(
            source_agent_id=ctx["agent_a"].id,
            request=secret_flow_req,
            actor_id=str(user_a.id),
        )

    assert "SECRET_READ" in str(exc_info.value)


@pytest.mark.asyncio
async def test_effective_authority_provenance_preservation(db_session: AsyncSession, user_a: User):
    """
    Section 18 & 19: Provenance must distinguish DIRECT_ROLE from DELEGATION,
    preserving delegator ID, delegation ID, and depth.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    del_service = DelegationService(db_session)
    now = datetime.now(timezone.utc)

    # A delegates FINDING_READ to B
    await del_service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(actions=["FINDING_READ"], resource_scope={"project_id": str(ctx["project"].id)}),
            expires_at=now + timedelta(days=3),
            reason="Provenance test delegation",
        ),
        actor_id=str(user_a.id),
    )

    eff_b = await del_service.get_effective_authority(ctx["agent_b"].id)
    items = eff_b.effective_permissions
    assert len(items) == 1
    delegated_item = items[0]
    assert delegated_item.action == "FINDING_READ"
    assert delegated_item.source_type == "DELEGATION"
    assert delegated_item.source_agent_id == ctx["agent_a"].id
    assert delegated_item.depth == 1
    assert delegated_item.delegation_id is not None


@pytest.mark.asyncio
async def test_delegated_mcp_tool_execution_with_audit_trail(db_session: AsyncSession, user_a: User):
    """
    Section 52, 53 & 73:
    Integration test: Human -> Agent A -> Delegation -> Agent B -> MCP Tool Execution.
    Verifies that Agent B invokes execute_security_scan under delegated authority,
    recording acting_agent, delegating_agent, and delegation_id in audit metadata.
    """
    ctx = await setup_test_project_and_agents(db_session, user_a)
    del_service = DelegationService(db_session)
    authz_service = AuthorizationService(db_session)
    now = datetime.now(timezone.utc)

    # 1. A delegates SCAN_EXECUTE to B
    delegation = await del_service.create_delegation(
        delegator_agent_id=ctx["agent_a"].id,
        request=DelegationCreateRequest(
            delegate_agent_id=ctx["agent_b"].id,
            authority=DelegationAuthority(
                actions=["PROJECT_READ"],
                resource_type="PROJECT",
                resource_scope={"project_id": str(ctx["project"].id)},
                environment="DEVELOPMENT",
            ),
            expires_at=now + timedelta(days=2),
            reason="Enable worker agent B to inspect project via MCP",
        ),
        actor_id=str(user_a.id),
    )
    assert delegation.status == "ACTIVE"

    # 2. Issue MCP API credential to Agent B
    cred, raw_secret = await authz_service.create_agent_credential(
        agent_id=ctx["agent_b"].id,
        name="Agent B MCP Key",
        expires_in_days=7,
        created_by_user_id=str(user_a.id),
    )

    # 3. Agent B initializes MCP session and executes tool
    from app.mcp.authentication import MCPAuthenticator
    authenticator = MCPAuthenticator(db_session)
    session = await authenticator.create_session(
        agent_id=ctx["agent_b"].id,
        project_id=ctx["project"].id,
        authenticated_principal="test-agent-b",
    )

    # 4. Invoke MCP tool 'get_project'
    gateway = MCPGateway(db_session)
    result = await gateway.invoke_tool(
        session_id=session.id,
        tool_name="get_project",
        arguments={
            "project_id": str(ctx["project"].id),
        },
    )
    assert result.status == "SUCCESS"
    assert result.data is not None
    assert result.data["id"] == str(ctx["project"].id)

    # 5. Verify delegation provenance in MCP tool invocation audit record
    from app.models.mcp import MCPToolInvocation
    stmt = (
        select(MCPToolInvocation)
        .where(MCPToolInvocation.session_id == session.id)
        .order_by(MCPToolInvocation.created_at.desc())
    )
    invocation = (await db_session.execute(stmt)).scalars().first()
    assert invocation is not None
    assert invocation.tool_name == "get_project"
    assert invocation.authorization_decision == "AUTHORIZED"

    # Check provenance in metadata (Section 53)
    meta = invocation.metadata_ or {}
    assert meta.get("acting_agent") == str(ctx["agent_b"].id)
    assert meta.get("delegating_agent") == str(ctx["agent_a"].id)
    assert meta.get("delegation_id") == str(delegation.id)



