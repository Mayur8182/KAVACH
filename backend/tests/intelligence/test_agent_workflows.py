"""
Kavach Phase 4 — AI Agentic Security Workflows Test Suite
Validates:
1. Multi-Step Agent Execution Plan & DAG Lifecycle
2. Human-in-the-Loop Approval Cryptographic Guardrails
3. Scan Agent, Investigation Agent, Remediation Agent, Verification Agent, Pull Request Agent
4. Autonomous Workflow Orchestration & Chat Integration
"""

import os
import uuid
import pytest
import pytest_asyncio
import tempfile
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.schemas.finding import CreateRemediationPRResponse

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan, ScannerExecution
from app.models.github import GitHubRepository
from app.models.ai_assistant import AIActionExecution, AIConversation, AIMessage
from app.intelligence.execution.approval_guard import ApprovalGuard
from app.intelligence.execution.schemas import (
    AgentPlanSchema,
    StepStatus,
    PlanStatus,
)
from app.intelligence.execution.plan_executor import PlanExecutor
from app.intelligence.agents.scan_agent import ScanAgent
from app.intelligence.agents.investigation_agent import InvestigationAgent
from app.intelligence.agents.remediation_agent import RemediationAgent
from app.intelligence.agents.verification_agent import VerificationAgent
from app.intelligence.agents.pull_request_agent import PullRequestAgent
from app.intelligence.action_orchestrator import CentralActionOrchestrator


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="security.architect@kavach.me",
        password_hash="hash_pw",
        name="Security Architect",
        is_active=True,
        is_superuser=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. Human Approval Cryptographic Guardrail Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_approval_guard_tampering_and_expiration():
    plan_id = str(uuid.uuid4())
    step_id = "step-5-pull-request"
    target_res = "finding:123:patch:456"

    # 1. Valid token generation and verification
    token_info = ApprovalGuard.generate_approval_token(
        plan_id=plan_id,
        step_id=step_id,
        target_resource=target_res,
        action="pull_request.create",
        expires_in_seconds=3600,
    )
    token = token_info["token"]
    assert token is not None

    is_valid, err = ApprovalGuard.verify_approval_token(
        token=token,
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource=target_res,
        expected_action="pull_request.create",
    )
    assert is_valid is True
    assert err is None

    # 2. Tampered token payload
    tampered_token = token[:-6] + "abcdef"
    is_valid, err = ApprovalGuard.verify_approval_token(
        token=tampered_token,
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource=target_res,
        expected_action="pull_request.create",
    )
    assert is_valid is False
    assert "Invalid cryptographic token signature" in err

    # 3. Mismatched resource target (attempting to apply to a different finding/patch)
    is_valid, err = ApprovalGuard.verify_approval_token(
        token=token,
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource="finding:999:patch:999",
        expected_action="pull_request.create",
    )
    assert is_valid is False
    assert "Target resource mismatch" in err

    # 4. Expired token
    expired_token_info = ApprovalGuard.generate_approval_token(
        plan_id=plan_id,
        step_id=step_id,
        target_resource=target_res,
        expires_in_seconds=-10,
    )
    is_valid, err = ApprovalGuard.verify_approval_token(
        token=expired_token_info["token"],
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource=target_res,
    )
    assert is_valid is False
    assert "Approval token expired" in err


# ─────────────────────────────────────────────────────────────────────────────
# 2. Multi-Step Execution Plan Generation Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_multi_step_workflow_plan_generation():
    proj_id = uuid.uuid4()
    user_id = uuid.uuid4()
    goal = "Scan my connected repository, investigate critical vulnerabilities, generate fixes, validate them and prepare pull requests"

    plan = PlanExecutor.create_autonomous_workflow_plan(
        project_id=proj_id,
        user_id=user_id,
        goal=goal,
        repository="adit/kavach-backend",
        branch="main",
    )

    assert plan.plan_id is not None
    assert plan.status == PlanStatus.PLAN_CREATED
    assert len(plan.steps) == 5

    step_ids = [s.step_id for s in plan.steps]
    assert step_ids == [
        "step-1-scan",
        "step-2-investigate",
        "step-3-remediate",
        "step-4-validate",
        "step-5-pull-request",
    ]

    # Verify dependencies
    step_map = {s.step_id: s for s in plan.steps}
    assert step_map["step-1-scan"].depends_on == []
    assert step_map["step-2-investigate"].depends_on == ["step-1-scan"]
    assert step_map["step-3-remediate"].depends_on == ["step-2-investigate"]
    assert step_map["step-4-validate"].depends_on == ["step-3-remediate"]
    assert step_map["step-5-pull-request"].depends_on == ["step-4-validate"]

    # Verify sensitive step requires human approval
    assert step_map["step-5-pull-request"].risk_level == "SENSITIVE"
    assert step_map["step-5-pull-request"].requires_approval is True
    assert step_map["step-1-scan"].requires_approval is False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Autonomous Execution & Approval Gating Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_autonomous_workflow_pauses_at_approval_gate(async_db, mock_user):
    async_db.add(mock_user)
    await async_db.commit()

    proj = Project(
        id=uuid.uuid4(),
        name="kavach-core",
        owner_id=mock_user.id,
        description="Autonomous Security Workspace",
    )
    async_db.add(proj)
    await async_db.commit()

    # 1. Prepare authentic repository entity and finding
    repo = GitHubRepository(
        id=uuid.uuid4(),
        project_id=proj.id,
        github_repository_id=123456,
        owner="org",
        name="kavach-core",
        full_name="org/kavach-core",
        default_branch="main",
        html_url="https://github.com/org/kavach-core",
    )
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        project_id=proj.id,
        repository="kavach-core",
        title="SQL Injection in authenticate_user",
        description="Unescaped f-string in SQL query",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint="fp_sql_auth",
        file_path="scratch/test_agent_auth.py",
        line_number=2,
        snippet="query = f\"SELECT * FROM users WHERE username = '{username}'\"",
        raw_metadata={"cwe": "CWE-89"},
    )
    async_db.add_all([repo, scan, exec_run, finding])
    await async_db.commit()

    # 2. Create plan
    goal = "Scan my connected repository, investigate critical vulnerabilities, generate fixes, validate them and prepare pull requests"
    plan = PlanExecutor.create_autonomous_workflow_plan(
        project_id=proj.id,
        user_id=mock_user.id,
        goal=goal,
        repository="kavach-core",
        branch="main",
        finding_id=str(finding.id),
    )

    # 3. Execute plan up to approval gate
    executed_plan = await PlanExecutor.execute_plan(plan, async_db, mock_user)

    # 4. Assert execution reached WAITING_APPROVAL
    assert executed_plan.status == PlanStatus.WAITING_APPROVAL
    step_map = {s.step_id: s for s in executed_plan.steps}
    assert step_map["step-1-scan"].status == StepStatus.COMPLETED
    assert step_map["step-2-investigate"].status == StepStatus.COMPLETED
    assert step_map["step-3-remediate"].status == StepStatus.COMPLETED
    assert step_map["step-4-validate"].status == StepStatus.COMPLETED
    assert step_map["step-5-pull-request"].status == StepStatus.WAITING_APPROVAL

    # Verify patch was generated and validated clean
    patch_id = step_map["step-3-remediate"].output_data.get("patch_id")
    assert patch_id is not None
    diff_text = step_map["step-3-remediate"].output_data.get("diff")
    assert diff_text and "---" in diff_text

    # Verify validation evidence
    assert step_map["step-4-validate"].output_data.get("passed") is True

    # Verify approval token was generated
    assert executed_plan.approval_token is not None

    # Verify AIActionExecution record in DB
    action_stmt = select(AIActionExecution).where(AIActionExecution.id == uuid.UUID(executed_plan.plan_id))
    action_res = await async_db.execute(action_stmt)
    action_exec = action_res.scalars().first()
    assert action_exec is not None
    assert action_exec.status == "WAITING_APPROVAL"

    # 5. Attempting to execute Step 5 with tampered token is blocked
    with pytest.raises(PermissionError) as exc_info:
        await PlanExecutor.approve_and_execute_step(
            plan_id=executed_plan.plan_id,
            step_id="step-5-pull-request",
            approval_token="fake_token.123",
            db=async_db,
            current_user=mock_user,
        )
    assert "Human approval verification failed" in str(exc_info.value)

    # 6. Executing Step 5 with legitimate approval token completes
    mock_pr_response = CreateRemediationPRResponse(
        success=True,
        pr_number=101,
        pr_url="https://github.com/org/kavach-core/pull/101",
        message="Pull Request #101 created successfully",
    )
    with patch("app.services.finding_service.FindingService.create_pr", new_callable=AsyncMock) as mock_create_pr:
        mock_create_pr.return_value = mock_pr_response
        resumed_plan = await PlanExecutor.approve_and_execute_step(
            plan_id=executed_plan.plan_id,
            step_id="step-5-pull-request",
            approval_token=executed_plan.approval_token,
            db=async_db,
            current_user=mock_user,
        )

    assert resumed_plan.status == PlanStatus.COMPLETED
    final_step5 = {s.step_id: s for s in resumed_plan.steps}["step-5-pull-request"]
    assert final_step5.status == StepStatus.COMPLETED
    assert final_step5.output_data.get("pr_number") is not None
    assert final_step5.output_data.get("pr_url") is not None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Orchestrator Natural Language Integration Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_query_triggers_autonomous_workflow(async_db, mock_user):
    async_db.add(mock_user)
    await async_db.commit()

    proj = Project(
        id=uuid.uuid4(),
        name="kavach-web",
        owner_id=mock_user.id,
        description="Test Project",
    )
    async_db.add(proj)

    repo = GitHubRepository(
        id=uuid.uuid4(),
        project_id=proj.id,
        github_repository_id=654321,
        owner="org",
        name="kavach-web",
        full_name="org/kavach-web",
        default_branch="main",
        html_url="https://github.com/org/kavach-web",
    )
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        project_id=proj.id,
        repository="kavach-web",
        title="Command Injection Flaw",
        description="os.system call with dynamic input",
        severity="CRITICAL",
        rule_id="CWE-78",
        fingerprint="fp_cmd_utils",
        file_path="scratch/test_agent_utils.py",
        line_number=4,
        snippet="os.system(cmd)",
        raw_metadata={"cwe": "CWE-78"},
    )
    async_db.add_all([repo, scan, exec_run, finding])
    await async_db.commit()

    orchestrator = CentralActionOrchestrator(async_db)

    # User gives end-to-end security directive
    query = "Scan my connected repository, investigate critical vulnerabilities, generate fixes, validate them and prepare pull requests"
    res = await orchestrator.process_user_query(
        query=query,
        current_user=mock_user,
        project_id=proj.id,
    )

    assert "Autonomous Security Workflow Initialized" in res.get("message", "")
    struct = res.get("structured_data", {})
    assert "agent_workflow" in struct
    workflow = struct["agent_workflow"]
    assert workflow["status"] == "WAITING_APPROVAL"
    assert struct["requires_approval"] is True
    assert struct["approval_token"] is not None

    # Approve action via orchestrator.approve_action
    action_id = uuid.UUID(struct["action_id"])
    mock_pr_response = CreateRemediationPRResponse(
        success=True,
        pr_number=102,
        pr_url="https://github.com/org/kavach-web/pull/102",
        message="Pull Request #102 created successfully",
    )
    with patch("app.services.finding_service.FindingService.create_pr", new_callable=AsyncMock) as mock_create_pr:
        mock_create_pr.return_value = mock_pr_response
        approve_res = await orchestrator.approve_action(action_id, mock_user)

    assert approve_res["status"] == "SUCCESS"
    assert approve_res["execution_status"] == "COMPLETED"
    assert approve_res["pr_number"] is not None
    assert approve_res["pr_url"] is not None
    assert "Pull Request Created Successfully" in approve_res["message"]


# ─────────────────────────────────────────────────────────────────────────────
# 5. Nonce & Replay Protection Tests (Phase 3 Directive)
# ─────────────────────────────────────────────────────────────────────────────

def test_approval_guard_nonce_replay_protection():
    plan_id = str(uuid.uuid4())
    step_id = "step-5-pull-request"
    target_res = "finding:auth_sql:patch:patch_1"

    token_info = ApprovalGuard.generate_approval_token(
        plan_id=plan_id,
        step_id=step_id,
        target_resource=target_res,
        action="pull_request.create",
    )
    token = token_info["token"]
    assert token is not None

    # First verification must pass
    is_valid, err = ApprovalGuard.verify_approval_token(
        token=token,
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource=target_res,
    )
    assert is_valid is True
    assert err is None

    # Redeem token (single-use execution)
    ApprovalGuard.redeem_token(token)
    assert ApprovalGuard.is_token_redeemed(token) is True

    # Re-submitting the same token must be rejected as a replay attack
    is_valid_again, replay_err = ApprovalGuard.verify_approval_token(
        token=token,
        expected_plan_id=plan_id,
        expected_step_id=step_id,
        expected_target_resource=target_res,
    )
    assert is_valid_again is False
    assert "replay attack prevented" in replay_err


# ─────────────────────────────────────────────────────────────────────────────
# 6. DAG Cycle Detection Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_dag_cycle_detection():
    from app.intelligence.execution.plan_executor import validate_dag_acyclic
    from app.intelligence.execution.schemas import AgentStepSchema

    # Valid linear DAG: step 1 -> step 2 -> step 3
    valid_steps = [
        AgentStepSchema(
            step_id="step-1",
            agent_type="scan_agent",
            tool_id="scan.start",
            title="Step 1",
            description="First",
            depends_on=[],
        ),
        AgentStepSchema(
            step_id="step-2",
            agent_type="investigation_agent",
            tool_id="finding.get_details",
            title="Step 2",
            description="Second",
            depends_on=["step-1"],
        ),
        AgentStepSchema(
            step_id="step-3",
            agent_type="verification_agent",
            tool_id="verification.validate",
            title="Step 3",
            description="Third",
            depends_on=["step-2"],
        ),
    ]
    # Should not raise
    validate_dag_acyclic(valid_steps)

    # Cyclic DAG: step 1 -> step 2 -> step 1
    cyclic_steps = [
        AgentStepSchema(
            step_id="step-1",
            agent_type="scan_agent",
            tool_id="scan.start",
            title="Step 1",
            description="First",
            depends_on=["step-2"],
        ),
        AgentStepSchema(
            step_id="step-2",
            agent_type="investigation_agent",
            tool_id="finding.get_details",
            title="Step 2",
            description="Second",
            depends_on=["step-1"],
        ),
    ]
    with pytest.raises(ValueError) as exc_info:
        validate_dag_acyclic(cyclic_steps)
    assert "Cyclic dependency detected" in str(exc_info.value)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Attack-Path Specialist Agent Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_attack_path_agent_execution(async_db, mock_user):
    from app.intelligence.agents.attack_path_agent import AttackPathAgent

    async_db.add(mock_user)
    await async_db.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-sec", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-sec",
        title="Remote Code Execution",
        description="Unsanitized command execution via os.system",
        severity="CRITICAL",
        rule_id="CWE-78",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/exec.py",
        line_number=45,
    )
    async_db.add_all([proj, scan, exec_run, finding])
    await async_db.commit()

    out = await AttackPathAgent.run(
        db=async_db,
        current_user=mock_user,
        project_id=proj.id,
        finding_id=str(finding.id),
    )

    assert out["status"] == "ANALYZED"
    assert out["finding_id"] == str(finding.id)
    assert len(out["hops"]) == 3
    assert len(out["preconditions"]) > 0
    assert "CRITICAL" in out["blast_radius"] or "Potential arbitrary command execution" in out["blast_radius"]
    assert out["is_exploitable"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 8. Split Remediation Planner and Executor Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_remediation_planner_and_executor(async_db, mock_user):
    from app.intelligence.agents.remediation_planner_agent import RemediationPlannerAgent
    from app.intelligence.agents.remediation_executor_agent import RemediationExecutorAgent

    async_db.add(mock_user)
    await async_db.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-fix", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-fix",
        title="Path Traversal",
        description="Unsanitized relative path parameter in open() call",
        severity="HIGH",
        rule_id="CWE-22",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="scratch/test_agent_utils.py",
        line_number=2,
        snippet="f = open(user_path, 'r')",
    )
    async_db.add_all([proj, scan, exec_run, finding])
    await async_db.commit()

    # 1. Run RemediationPlannerAgent
    plan_out = await RemediationPlannerAgent.run(
        db=async_db,
        current_user=mock_user,
        project_id=proj.id,
        finding_id=str(finding.id),
    )

    assert plan_out["status"] == "PLAN_CREATED"
    assert plan_out["plan_id"] is not None
    assert len(plan_out["invariants"]) == 3
    assert len(plan_out["rollback_criteria"]) == 2

    # 2. Run RemediationExecutorAgent using the planned ID
    exec_out = await RemediationExecutorAgent.run(
        db=async_db,
        current_user=mock_user,
        project_id=proj.id,
        plan_id=plan_out["plan_id"],
        finding_id=str(finding.id),
    )

    assert exec_out["status"] == "PATCH_GENERATED"
    assert exec_out["patch_id"] is not None
    assert exec_out["diff"] is not None
    assert len(exec_out["file_diffs"]) == 1
