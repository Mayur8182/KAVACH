"""
Comprehensive Pytest Test Suite for Step 14 — Runtime Security Agent & Controlled Enforcement.
Tests all lifecycle states, executors, self-approval prevention, MCP enforcement,
delegation revocation, session revocation, unconfigured source handling, LLM non-authority,
and REST endpoints.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.enums import ContractStatus
from app.contracts.models import SecurityContract, SecurityContractVersion, SecurityContractViolation
from app.core.security import create_access_token
from app.delegation.schemas import DelegationCreateRequest
from app.delegation.service import DelegationService
from app.mcp.authentication import MCPAuthenticator
from app.mcp.gateway import MCPGateway
from app.models.agent import Agent
from app.models.delegation import AgentDelegation
from app.models.mcp import MCPSession
from app.models.project import Project
from app.models.user import User
from app.response.enums import (
    ResponseActionType,
    ResponseDecision,
    ResponseMode,
    ResponseSeverity,
    ResponseStatus,
    ResponseTargetType,
)
from app.response.executors.container import ContainerIsolationExecutor
from app.response.executors.kubernetes import KubernetesIsolationExecutor
from app.response.executors.jenkins import JenkinsPipelineExecutor
from app.response.models import (
    RuntimeEnforcementRule,
    SecurityIncident,
    SecurityResponseAction,
    SecurityResponsePlan,
)
from app.response.schemas import SecurityResponseActionCreate
from app.response.service import RuntimeResponseService


# =========================================================================
# Fixtures
# =========================================================================

@pytest_asyncio.fixture
async def project_resp(db_session: AsyncSession, user_a: User) -> Project:
    project = Project(
        id=uuid.uuid4(),
        name="Response Control Project",
        description="Testing runtime security enforcement",
        repository_url="https://github.com/corp/response-control",
        owner_id=user_a.id,
        environment="production",
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest_asyncio.fixture
async def sample_violation(db_session: AsyncSession, project_resp: Project) -> SecurityContractViolation:
    contract = SecurityContract(
        id=uuid.uuid4(),
        project_id=project_resp.id,
        name="Tool Authority Contract",
        description="Restricts agent tool calls",
        contract_key="tool-authority",
        status=ContractStatus.ACTIVE.value,
        created_by="system",
    )
    db_session.add(contract)
    await db_session.flush()

    c_version = SecurityContractVersion(
        id=uuid.uuid4(),
        contract_id=contract.id,
        version=1,
        definition={"key": "tool-authority"},
        normalized_definition={"key": "tool-authority"},
        definition_hash="hash_v1",
        status="ACTIVE",
        created_by="system",
    )
    db_session.add(c_version)
    contract.current_version_id = c_version.id
    await db_session.flush()

    violation = SecurityContractViolation(
        id=uuid.uuid4(),
        project_id=project_resp.id,
        contract_version_id=c_version.id,
        violation_type="UNAUTHORIZED_TOOL_INVOCATION",
        severity="CRITICAL",
        description="Agent attempted unauthorized tool execution",
        subject="agent-test-1",
        resource="aws_admin_delete",
        action="EXECUTE",
        status="OPEN",
        detected_at=datetime.now(timezone.utc),
    )
    db_session.add(violation)
    await db_session.commit()
    await db_session.refresh(violation)
    return violation


# =========================================================================
# 1. RESPONSE LIFECYCLE & STATE MACHINE (SECTION 48, 80)
# =========================================================================

@pytest.mark.asyncio
async def test_response_action_lifecycle_and_idempotency(
    db_session: AsyncSession,
    project_resp: Project,
    sample_violation: SecurityContractViolation,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    # 1. Create response action
    req = SecurityResponseActionCreate(
        violation_id=sample_violation.id,
        action_type=ResponseActionType.DENY_TOOL_CALL,
        target_type=ResponseTargetType.MCP_TOOL_CALL,
        target_id="aws_admin_delete",
        reason="Detected critical invariant violation",
        mode=ResponseMode.AUTOMATIC,
        severity=ResponseSeverity.CRITICAL,
    )

    action1 = await service.create_response(
        project_id=project_resp.id,
        request=req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )
    assert action1.status in ("REQUESTED", "PENDING_APPROVAL")
    assert action1.target_id == "aws_admin_delete"

    # 2. Idempotency: duplicate request returns existing record
    action2 = await service.create_response(
        project_id=project_resp.id,
        request=req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )
    assert action2.id == action1.id

    # 3. Dry-run simulation (does not execute)
    dry_run = await service.dry_run_response(action1.id)
    assert dry_run.mode == "DRY_RUN"
    assert dry_run.action == "DENY_TOOL_CALL"


# =========================================================================
# 2. APPROVAL WORKFLOW & SELF-APPROVAL PREVENTION (SECTION 19, 80)
# =========================================================================

@pytest.mark.asyncio
async def test_self_approval_prevention(
    db_session: AsyncSession,
    project_resp: Project,
    sample_violation: SecurityContractViolation,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    # Create response requiring approval
    req = SecurityResponseActionCreate(
        violation_id=sample_violation.id,
        action_type=ResponseActionType.ISOLATE_WORKLOAD,
        target_type=ResponseTargetType.CONTAINER,
        target_id="billing-worker-01",
        mode=ResponseMode.REQUIRE_APPROVAL,
        severity=ResponseSeverity.CRITICAL,
    )
    action = await service.create_response(
        project_id=project_resp.id,
        request=req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )
    assert action.status == "PENDING_APPROVAL"

    # Self-approval attempt: Requester tries to approve own action
    self_approve_res = await service.approve_response(
        action_id=action.id,
        approver_id=str(user_a.id),  # Same as requested_by_id
        reason="I am approving my own action",
    )
    assert self_approve_res["success"] is False
    assert self_approve_res["error"] == "SELF_APPROVAL_FORBIDDEN"

    # Legitimate independent approval
    independent_approver_id = str(uuid.uuid4())
    legit_approve_res = await service.approve_response(
        action_id=action.id,
        approver_id=independent_approver_id,
        reason="Authorized by secondary security officer",
    )
    assert legit_approve_res["success"] is True
    assert legit_approve_res["status"] == "APPROVED"


# =========================================================================
# 3. MCP BLOCKING & ENFORCEMENT LOOP (SECTION 23, 81, 101)
# =========================================================================

@pytest.mark.asyncio
async def test_mcp_real_enforcement_and_blocking(
    db_session: AsyncSession,
    project_resp: Project,
    sample_violation: SecurityContractViolation,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    # 1. Create and execute MCP Block action
    req = SecurityResponseActionCreate(
        violation_id=sample_violation.id,
        action_type=ResponseActionType.DENY_TOOL_CALL,
        target_type=ResponseTargetType.MCP_TOOL_CALL,
        target_id="run_security_scan",
        mode=ResponseMode.AUTOMATIC,
        severity=ResponseSeverity.CRITICAL,
    )
    action = await service.create_response(
        project_id=project_resp.id,
        request=req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )

    executed_action = await service.execute_response(
        action_id=action.id,
        actor_id=str(user_a.id),
        actor_type="USER",
    )
    assert executed_action.status == "COMPLETED"

    # Verify active enforcement rule is stored in DB
    active_rule = await service.enforcement_manager.get_active_rule(
        project_id=project_resp.id,
        target_type="MCP_TOOL_CALL",
        target_id="run_security_scan",
    )
    assert active_rule is not None
    assert active_rule.status == "ACTIVE"

    # 2. Test MCP Gateway rejection
    # When agent tries to invoke "run_security_scan", gateway must reject with RUNTIME_ENFORCEMENT_BLOCKED
    agent = Agent(
        id=uuid.uuid4(),
        project_id=project_resp.id,
        name="MCP Block Test Agent",
        status="ACTIVE",
    )
    db_session.add(agent)
    await db_session.commit()

    authenticator = MCPAuthenticator(db_session)
    mcp_session = await authenticator.create_session(
        agent_id=agent.id,
        project_id=project_resp.id,
        authenticated_principal=user_a.email,
        transport="stdio",
    )

    gateway = MCPGateway(db=db_session)
    res = await gateway.invoke_tool(
        session_id=mcp_session.id,
        tool_name="run_security_scan",
        arguments={"project_id": str(project_resp.id), "target_path": "."},
    )
    assert res.status == "DENIED", f"MCP failed: status={res.status}, error_code={res.error_code}, message={res.message}"
    assert res.error_code == "RUNTIME_ENFORCEMENT_BLOCKED"


# =========================================================================
# 4. DELEGATION REVOCATION LOOP (SECTION 27, 82, 102)
# =========================================================================

@pytest.mark.asyncio
async def test_delegation_revocation_enforcement(
    db_session: AsyncSession,
    project_resp: Project,
    user_a: User,
):
    service = RuntimeResponseService(db_session)
    del_service = DelegationService(db_session)

    agent_a = Agent(id=uuid.uuid4(), project_id=project_resp.id, name="Agent Delegator", status="ACTIVE")
    agent_b = Agent(id=uuid.uuid4(), project_id=project_resp.id, name="Agent Delegatee", status="ACTIVE")
    db_session.add_all([agent_a, agent_b])
    await db_session.commit()

    # Create real delegation
    now = datetime.now(timezone.utc)
    delegation = AgentDelegation(
        id=uuid.uuid4(),
        delegator_agent_id=agent_a.id,
        delegate_agent_id=agent_b.id,
        project_id=project_resp.id,
        status="ACTIVE",
        starts_at=now,
        expires_at=now + timedelta(hours=2),
        reason="Test delegation for Step 14",
        authority_snapshot={"actions": ["READ", "SEARCH"]},
        scope={"resource_types": ["INVOICE"]},
        conditions={},
        delegation_depth=1,
        created_by=str(user_a.id),
        created_by_type="USER",
    )
    db_session.add(delegation)
    await db_session.commit()
    await db_session.refresh(delegation)
    assert delegation.status == "ACTIVE"

    # Execute Step 14 REVOKE_DELEGATION
    resp_req = SecurityResponseActionCreate(
        action_type=ResponseActionType.REVOKE_DELEGATION,
        target_type=ResponseTargetType.DELEGATION,
        target_id=str(delegation.id),
        mode=ResponseMode.AUTOMATIC,
        severity=ResponseSeverity.HIGH,
    )
    action = await service.create_response(
        project_id=project_resp.id,
        request=resp_req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )
    executed = await service.execute_response(
        action_id=action.id,
        actor_id=str(user_a.id),
        actor_type="USER",
    )
    assert executed.status == "COMPLETED", f"Delegation execution failed: {executed.failure_reason}"

    # Verify delegation in Step 11 is now REVOKED
    await db_session.refresh(delegation)
    assert delegation.status == "REVOKED"


# =========================================================================
# 5. SESSION REVOCATION LOOP (SECTION 26, 83, 103)
# =========================================================================

@pytest.mark.asyncio
async def test_session_revocation_enforcement(
    db_session: AsyncSession,
    project_resp: Project,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    agent = Agent(id=uuid.uuid4(), project_id=project_resp.id, name="Session Agent", status="ACTIVE")
    db_session.add(agent)
    await db_session.commit()

    # Create real active MCPSession
    now = datetime.now(timezone.utc)
    session = MCPSession(
        id=uuid.uuid4(),
        agent_id=agent.id,
        project_id=project_resp.id,
        authenticated_principal="agent-jwt-principal",
        transport="stdio",
        status="ACTIVE",
        expires_at=now + timedelta(hours=4),
    )
    db_session.add(session)
    await db_session.commit()

    # Execute Step 14 REVOKE_SESSION
    resp_req = SecurityResponseActionCreate(
        action_type=ResponseActionType.REVOKE_SESSION,
        target_type=ResponseTargetType.SESSION,
        target_id=str(session.id),
        mode=ResponseMode.AUTOMATIC,
        severity=ResponseSeverity.CRITICAL,
    )
    action = await service.create_response(
        project_id=project_resp.id,
        request=resp_req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )
    executed = await service.execute_response(
        action_id=action.id,
        actor_id=str(user_a.id),
        actor_type="USER",
    )
    assert executed.status == "COMPLETED"

    # Verify session is now REVOKED in PostgreSQL
    await db_session.refresh(session)
    assert session.status == "REVOKED"
    assert session.terminated_at is not None


# =========================================================================
# 6. UNCONFIGURED SOURCE FAILURE (SECTION 84, 85, 104)
# =========================================================================

@pytest.mark.asyncio
async def test_failure_demonstration_unconfigured_executors(
    db_session: AsyncSession,
    project_resp: Project,
    user_a: User,
):
    # Test Container executor without Docker daemon
    cont_exec = ContainerIsolationExecutor()
    action_cont = SecurityResponseAction(
        id=uuid.uuid4(),
        project_id=project_resp.id,
        action_type="ISOLATE_WORKLOAD",
        target_type="CONTAINER",
        target_id="test-container-99",
        status="APPROVED",
    )
    if not cont_exec.is_docker_available():
        res = await cont_exec.execute(action_cont, db_session)
        assert res.status == ResponseStatus.NOT_EXECUTED
        assert res.error == "EXECUTOR_NOT_CONFIGURED"

    # Test Kubernetes executor without kubeconfig
    k8s_exec = KubernetesIsolationExecutor()
    action_k8s = SecurityResponseAction(
        id=uuid.uuid4(),
        project_id=project_resp.id,
        action_type="ISOLATE_WORKLOAD",
        target_type="KUBERNETES_POD",
        target_id="test-pod-42",
        status="APPROVED",
    )
    if not k8s_exec.is_k8s_available():
        res_k8s = await k8s_exec.execute(action_k8s, db_session)
        assert res_k8s.status == ResponseStatus.NOT_EXECUTED
        assert res_k8s.error == "EXECUTOR_NOT_CONFIGURED"

    # Test Jenkins executor without Jenkins credentials
    jenkins_exec = JenkinsPipelineExecutor()
    if not jenkins_exec.is_jenkins_configured():
        res_j = await jenkins_exec.execute(action_cont, db_session)
        assert res_j.status == ResponseStatus.NOT_EXECUTED
        assert res_j.error == "EXECUTOR_NOT_CONFIGURED"


# =========================================================================
# 7. CRITICAL SECURITY TESTS: LLM NON-AUTHORITY & DESTRUCTIVE COMMAND BLOCK
# =========================================================================

@pytest.mark.asyncio
async def test_critical_security_authority_and_llm_non_authority(
    db_session: AsyncSession,
    project_resp: Project,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    # 1. LLM / Prompt recommends "DELETE_DATABASE" -> strictly forbidden by schema & type system
    with pytest.raises(Exception) as excinfo:
        SecurityResponseActionCreate(
            action_type="DELETE_DATABASE",  # Forbidden destructive action
            target_type=ResponseTargetType.SERVICE,
            target_id="production-postgres",
        )
    assert "DELETE_DATABASE" in str(excinfo.value) or "enum" in str(excinfo.value)

    # 2. Agent tries to execute high-impact action outside its authority
    agent = Agent(id=uuid.uuid4(), project_id=project_resp.id, name="Restricted Agent", status="ACTIVE")
    db_session.add(agent)
    await db_session.commit()

    req_agent_escalation = SecurityResponseActionCreate(
        action_type=ResponseActionType.BLOCK_DEPLOYMENT,  # Agent not authorized for deployment block
        target_type=ResponseTargetType.DEPLOYMENT,
        target_id="deploy-prod-001",
    )
    with pytest.raises(ValueError) as exc_agent:
        await service.create_response(
            project_id=project_resp.id,
            request=req_agent_escalation,
            requested_by_id=str(agent.id),
            requested_by_type="AGENT",
        )
    assert "not authorized" in str(exc_agent.value)


# =========================================================================
# 8. INCIDENT CORRELATION (SECTION 94, 95)
# =========================================================================

@pytest.mark.asyncio
async def test_security_incident_correlation(
    db_session: AsyncSession,
    project_resp: Project,
    sample_violation: SecurityContractViolation,
    user_a: User,
):
    service = RuntimeResponseService(db_session)

    # Creating response linked to violation automatically correlates into a SecurityIncident
    req = SecurityResponseActionCreate(
        violation_id=sample_violation.id,
        action_type=ResponseActionType.ALERT,
        target_type=ResponseTargetType.SERVICE,
        target_id="billing-service",
    )
    action = await service.create_response(
        project_id=project_resp.id,
        request=req,
        requested_by_id=str(user_a.id),
        requested_by_type="USER",
    )

    incidents = await service.incident_service.list_incidents(project_resp.id)
    assert len(incidents) >= 1
    inc = incidents[0]
    assert inc.primary_violation_id == sample_violation.id
    assert inc.status in ("OPEN", "CONTAINED")

    # Detailed incident query
    detail = await service.incident_service.get_incident(inc.id)
    assert detail is not None
    assert len(detail.events) >= 2  # Violation event + response event


# =========================================================================
# 9. REST API ENDPOINTS
# =========================================================================

@pytest.mark.asyncio
async def test_response_rest_api_endpoints(
    client: AsyncClient,
    project_resp: Project,
    user_a: User,
):
    token = create_access_token(subject=str(user_a.id))
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create response action via REST
    resp_create = await client.post(
        f"/api/v1/projects/{project_resp.id}/responses",
        json={
            "action_type": "ALERT",
            "target_type": "SERVICE",
            "target_id": "auth-service",
            "reason": "Suspicious login pattern detected",
            "mode": "OBSERVE",
            "severity": "MEDIUM",
        },
        headers=headers,
    )
    assert resp_create.status_code == 201
    action_data = resp_create.json()
    action_id = action_data["id"]

    # 2. Get response action
    resp_get = await client.get(f"/api/v1/responses/{action_id}", headers=headers)
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == action_id

    # 3. Simulate (dry-run)
    resp_sim = await client.post(f"/api/v1/responses/{action_id}/simulate", headers=headers)
    assert resp_sim.status_code == 200
    assert resp_sim.json()["mode"] == "DRY_RUN"

    # 4. Execute
    resp_exec = await client.post(f"/api/v1/responses/{action_id}/execute", headers=headers)
    assert resp_exec.status_code == 200
    assert resp_exec.json()["status"] == "COMPLETED"

    # 5. Overview dashboard
    resp_overview = await client.get(
        f"/api/v1/projects/{project_resp.id}/responses/overview",
        headers=headers,
    )
    assert resp_overview.status_code == 200
    overview_data = resp_overview.json()
    assert overview_data["completed_actions_count"] >= 1
