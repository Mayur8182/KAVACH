"""
Kavach Phase 5: AI Security Policy Engine & Governance Control Plane Test Suite
Comprehensive verification across all Phase 5 milestones (M0 - M9):
1. Deterministic Content Hashing & Immutability (M1)
2. 10-Stage Lifecycle State Machine & Separation of Duties (M2)
3. Deterministic 5-Outcome Evaluator & Scope Precedence (M3)
4. Unit Test Fixtures & Positive/Negative Runner (M4)
5. Impact Simulation Engine (M5)
6. Scoped Time-Bound Exceptions & Non-Exemptible Controls (M6)
7. Enforcement Adapters (MCP & GitHub PR Gates) (M7)
8. Natural-Language Assisted Policy Authoring (M8)
9. End-to-End REST API Integration Surface (M9)
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.policy import (
    SecurityPolicy,
    SecurityPolicyVersion,
    PolicyRule,
    PolicyTestCase,
    PolicyException,
    PolicyEnforcementEvent,
)
from app.intelligence.policy.models import (
    DecisionOutcome,
    PolicyScope,
    PolicyStatus,
    PolicyContextSnapshot,
    EnforcementPoint,
)
from app.intelligence.policy.content_hasher import (
    compute_policy_content_hash,
    verify_policy_integrity,
)
from app.intelligence.policy.evaluator_runtime import DeterministicPolicyEvaluator
from app.intelligence.policy.lifecycle_manager import PolicyLifecycleManager
from app.intelligence.policy.context_providers import PolicyContextResolver
from app.intelligence.policy.test_runner import PolicyTestRunner
from app.intelligence.policy.simulation_engine import PolicySimulationEngine
from app.intelligence.policy.exception_manager import PolicyExceptionManager
from app.intelligence.policy.nl_authoring_assistant import NaturalLanguagePolicyAssistant
from app.intelligence.policy.enforcement_adapters import (
    MCPPolicyEnforcementAdapter,
    GitHubCheckEnforcementAdapter,
)
from app.intelligence.policy.coordinator import PolicyControlPlaneCoordinator
from app.core.security import create_access_token


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def author_user():
    return User(
        id=uuid.uuid4(),
        email="author_dev@kavach.local",
        name="Author Developer",
        password_hash="test_password_hash_1",
        is_active=True,
        is_superuser=False,
    )


@pytest.fixture
def peer_reviewer_user():
    return User(
        id=uuid.uuid4(),
        email="secops_lead@kavach.local",
        name="SecOps Reviewer",
        password_hash="test_password_hash_2",
        is_active=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_policy_definition():
    return {
        "name": "Production Zero-Critical Gate",
        "description": "Strictly block deployment if reachable critical vulnerabilities exist",
        "scope": {"environment": "production"},
        "rules": [
            {
                "rule_key": "block_critical_reachable_findings",
                "name": "Block Reachable Critical Findings",
                "description": "Deny deployment if critical vulnerability has proven network reachability",
                "severity": "CRITICAL",
                "decision": "DENY",
                "reason_code": "CRITICAL_REACHABLE_VULNERABILITY",
                "when": {
                    "findings": {
                        "severity": "CRITICAL",
                        "is_reachable": True,
                    }
                },
                "is_non_exemptible": True,
                "remediation_guidance": "Remediate SQL injection before promoting to production.",
            },
            {
                "rule_key": "warn_high_findings",
                "name": "Warn on High Findings",
                "description": "Warn developers when high-severity findings are present",
                "severity": "HIGH",
                "decision": "WARN",
                "reason_code": "HIGH_SEVERITY_VULNERABILITY",
                "when": {
                    "findings": {
                        "severity": "HIGH",
                    }
                },
                "is_non_exemptible": False,
            }
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. Content Hashing & Immutability Tests (M1)
# ─────────────────────────────────────────────────────────────────────────────

def test_policy_content_hashing_determinism(sample_policy_definition):
    # Same content with different key orders must produce identical 64-char SHA256 hashes
    def1 = sample_policy_definition
    def2 = {
        "description": sample_policy_definition["description"],
        "scope": sample_policy_definition["scope"],
        "name": sample_policy_definition["name"],
        "rules": sample_policy_definition["rules"],
    }

    hash1 = compute_policy_content_hash(def1)
    hash2 = compute_policy_content_hash(def2)

    assert len(hash1) == 64
    assert hash1 == hash2, "Content hashing must be deterministic and invariant to dictionary ordering"
    assert verify_policy_integrity(def1, hash1) is True

    # Tampered content must fail integrity verification
    tampered = dict(def1)
    tampered["name"] = "Modified Name"
    assert verify_policy_integrity(tampered, hash1) is False


# ─────────────────────────────────────────────────────────────────────────────
# 2. 10-Stage Lifecycle State Machine & Separation of Duties (M2)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_lifecycle_state_machine(
    db_session: AsyncSession,
    author_user: User,
    peer_reviewer_user: User,
    sample_policy_definition: dict,
):
    db_session.add(author_user)
    db_session.add(peer_reviewer_user)
    await db_session.commit()

    lifecycle = PolicyLifecycleManager(db_session)

    # 1. Create Policy
    policy = SecurityPolicy(
        name="Prod Gate",
        description="Gate for production",
        scope="GLOBAL",
        status="DRAFT",
        priority=100,
        created_by=author_user.email,
    )
    db_session.add(policy)
    await db_session.commit()

    # 2. Create Draft Version 1
    v1 = await lifecycle.create_draft_version(
        policy=policy,
        definition=sample_policy_definition,
        author=author_user,
    )
    assert v1.version == 1
    assert v1.status == PolicyStatus.DRAFT.value
    assert v1.active is False
    assert len(v1.policy_content_hash) == 64

    # 3. Submit for review
    await lifecycle.submit_for_review(v1.id, author_user)
    assert v1.status == PolicyStatus.UNDER_REVIEW.value

    # 4. Separation of Duties: Author attempting to approve their own policy must fail!
    with pytest.raises(PermissionError, match="Separation of duties violation"):
        await lifecycle.approve_version(v1.id, approver=author_user)

    # 5. Peer reviewer approves: produces single-use approval token
    approval_res = await lifecycle.approve_version(
        v1.id,
        approver=peer_reviewer_user,
        approval_notes="Approved for production readiness.",
    )
    assert approval_res["status"] == "APPROVED"
    assert "approval_token" in approval_res
    token = approval_res["approval_token"]

    # 6. Activate version with single-use cryptographic token
    activated_v1 = await lifecycle.activate_version(
        version_id=v1.id,
        approval_token=token,
        current_user=author_user,
    )
    assert activated_v1.active is True
    assert activated_v1.status == PolicyStatus.ACTIVE.value
    assert policy.current_version == 1

    # 7. Replay Protection: Re-using the same token must fail!
    with pytest.raises(Exception):
        await lifecycle.activate_version(
            version_id=v1.id,
            approval_token=token,
            current_user=author_user,
        )

    # 8. Create and activate Version 2, then Rollback to Version 1
    v2_def = dict(sample_policy_definition)
    v2_def["name"] = "Prod Gate v2"
    v2 = await lifecycle.create_draft_version(policy=policy, definition=v2_def, author=author_user)
    assert v2.version == 2

    approval_res_v2 = await lifecycle.approve_version(v2.id, approver=peer_reviewer_user)
    await lifecycle.activate_version(v2.id, approval_token=approval_res_v2["approval_token"], current_user=author_user)
    assert policy.current_version == 2

    # Execute Rollback to v1
    rolled_back = await lifecycle.rollback_to_version(
        policy_id=policy.id,
        target_version_num=1,
        current_user=peer_reviewer_user,
        rollback_reason="Rollback to stable v1",
    )
    assert rolled_back.version == 1
    assert rolled_back.active is True
    assert policy.current_version == 1


# ─────────────────────────────────────────────────────────────────────────────
# 3. Deterministic 5-Outcome Evaluator & Scope Precedence (M3)
# ─────────────────────────────────────────────────────────────────────────────

def test_deterministic_evaluator_outcomes():
    # Context with a reachable critical vulnerability
    ctx_critical = PolicyContextSnapshot(
        snapshot_id="snap-001",
        environment="production",
        findings=[
            {"id": "F-1", "severity": "CRITICAL", "is_reachable": True, "title": "SQL Injection"}
        ],
        is_fresh=True,
    )

    policy_active = [{
        "id": "pol-1",
        "version": 1,
        "version_id": "ver-1",
        "content_hash": "a" * 64,
        "scope": "GLOBAL",
        "priority": 100,
        "definition": {
            "name": "Production Zero-Critical Policy",
            "scope": {"environment": "production"},
            "rules": [
                {
                    "rule_key": "block_critical",
                    "name": "Block Critical",
                    "severity": "CRITICAL",
                    "decision": "DENY",
                    "reason_code": "CRIT_DENY",
                    "when": {"findings": {"severity": "CRITICAL", "is_reachable": True}},
                },
                {
                    "rule_key": "warn_high",
                    "name": "Warn High",
                    "severity": "HIGH",
                    "decision": "WARN",
                    "reason_code": "HIGH_WARN",
                    "when": {"findings": {"severity": "HIGH"}},
                }
            ]
        }
    }]

    # 1. DENY outcome
    dec_deny = DeterministicPolicyEvaluator.evaluate_snapshot(ctx_critical, policy_active)
    assert dec_deny.decision == DecisionOutcome.DENY
    assert len(dec_deny.matched_rules) == 1
    assert dec_deny.matched_rules[0].rule_key == "block_critical"

    # 2. WARN outcome
    ctx_high = PolicyContextSnapshot(
        snapshot_id="snap-002",
        environment="production",
        findings=[{"id": "F-2", "severity": "HIGH", "is_reachable": False, "title": "XSS"}],
        is_fresh=True,
    )
    dec_warn = DeterministicPolicyEvaluator.evaluate_snapshot(ctx_high, policy_active)
    assert dec_warn.decision == DecisionOutcome.WARN

    # 3. ALLOW outcome
    ctx_clean = PolicyContextSnapshot(
        snapshot_id="snap-003",
        environment="production",
        findings=[],
        is_fresh=True,
    )
    dec_allow = DeterministicPolicyEvaluator.evaluate_snapshot(ctx_clean, policy_active)
    assert dec_allow.decision == DecisionOutcome.ALLOW

    # 4. NOT_APPLICABLE outcome (environment does not match rule scope)
    ctx_dev = PolicyContextSnapshot(
        snapshot_id="snap-004",
        environment="development",
        findings=[{"id": "F-1", "severity": "CRITICAL", "is_reachable": True}],
        is_fresh=True,
    )
    dec_na = DeterministicPolicyEvaluator.evaluate_snapshot(ctx_dev, policy_active)
    assert dec_na.decision == DecisionOutcome.NOT_APPLICABLE

    # 5. INDETERMINATE outcome (missing required facts or stale scans)
    ctx_stale = PolicyContextSnapshot(
        snapshot_id="snap-005",
        environment="production",
        is_fresh=False,
        missing_facts=["sast_scan_age_exceeded_7_days"],
    )
    dec_ind = DeterministicPolicyEvaluator.evaluate_snapshot(ctx_stale, policy_active)
    assert dec_ind.decision == DecisionOutcome.INDETERMINATE


# ─────────────────────────────────────────────────────────────────────────────
# 4. Unit Test Fixtures & Positive/Negative Runner (M4)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_test_runner(db_session: AsyncSession, author_user: User, sample_policy_definition: dict):
    db_session.add(author_user)
    await db_session.commit()

    lifecycle = PolicyLifecycleManager(db_session)
    policy = SecurityPolicy(name="Test Policy", description="Test Policy Description", scope="GLOBAL", created_by=author_user.email)
    db_session.add(policy)
    await db_session.commit()

    version = await lifecycle.create_draft_version(policy=policy, definition=sample_policy_definition, author=author_user)

    # Add Positive Test Case (should pass expected ALLOW)
    tc_pos = PolicyTestCase(
        policy_version_id=version.id,
        name="Clean repository should allow",
        input_fixture={"environment": "production", "findings": []},
        expected_decision="ALLOW",
        status="PENDING",
    )
    # Add Negative Test Case (should pass expected DENY)
    tc_neg = PolicyTestCase(
        policy_version_id=version.id,
        name="Reachable critical must deny",
        input_fixture={"environment": "production", "findings": [{"severity": "CRITICAL", "is_reachable": True}]},
        expected_decision="DENY",
        status="PENDING",
    )
    db_session.add(tc_pos)
    db_session.add(tc_neg)
    await db_session.commit()

    runner = PolicyTestRunner(db_session)
    report = await runner.run_version_tests(version.id)

    assert report["all_passed"] is True
    assert report["total_tests"] == 2
    assert report["passed"] == 2
    assert report["failed"] == 0


# ─────────────────────────────────────────────────────────────────────────────
# 5. Impact Simulation Engine (M5)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_simulation_engine(db_session: AsyncSession, author_user: User, sample_policy_definition: dict):
    db_session.add(author_user)
    await db_session.commit()

    lifecycle = PolicyLifecycleManager(db_session)
    policy = SecurityPolicy(name="Simulation Candidate", description="Simulation Candidate Description", scope="GLOBAL", created_by=author_user.email)
    db_session.add(policy)
    await db_session.commit()

    version = await lifecycle.create_draft_version(policy=policy, definition=sample_policy_definition, author=author_user)

    simulation = PolicySimulationEngine(db_session)
    report = await simulation.simulate_version_impact(version_id=version.id)

    assert report.policy_version == 1
    assert isinstance(report.snapshots_evaluated_count, int)
    assert isinstance(report.new_blockers_detected, int)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Scoped Time-Bound Exceptions & Non-Exemptible Controls (M6)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_exceptions_and_non_exemptible_controls(
    db_session: AsyncSession,
    author_user: User,
    peer_reviewer_user: User,
    sample_policy_definition: dict,
):
    db_session.add(author_user)
    db_session.add(peer_reviewer_user)
    await db_session.commit()

    lifecycle = PolicyLifecycleManager(db_session)
    policy = SecurityPolicy(name="Gated Policy", description="Gated Policy Description", scope="GLOBAL", created_by=author_user.email)
    db_session.add(policy)
    await db_session.commit()

    version = await lifecycle.create_draft_version(policy=policy, definition=sample_policy_definition, author=author_user)

    # Find the non-exemptible rule
    stmt = select(PolicyRule).where(PolicyRule.policy_version_id == version.id, PolicyRule.is_non_exemptible == True)
    non_exempt_rule = (await db_session.execute(stmt)).scalars().first()
    assert non_exempt_rule is not None

    exception_mgr = PolicyExceptionManager(db_session)

    # 1. Attempting to waive a NON-EXEMPTIBLE control must be strictly rejected!
    with pytest.raises(PermissionError, match="NON-EXEMPTIBLE"):
        await exception_mgr.request_exception(
            policy_id=policy.id,
            rule_id=non_exempt_rule.id,
            resource_scope="repo-backend",
            justification="We need to bypass this for release deadline",
            risk_owner="VP Engineering",
            requested_by=author_user,
        )

    # 2. Waiving an exemptible rule (e.g. general rule without non-exemptible constraint)
    stmt_ex = select(PolicyRule).where(PolicyRule.policy_version_id == version.id, PolicyRule.is_non_exemptible == False)
    exempt_rule = (await db_session.execute(stmt_ex)).scalars().first()

    exc = await exception_mgr.request_exception(
        policy_id=policy.id,
        rule_id=exempt_rule.id if exempt_rule else None,
        resource_scope="legacy-service",
        justification="Migrating legacy service by Q4, compensating WAF rules applied.",
        risk_owner="lead_secops@kavach.local",
        requested_by=author_user,
        duration_days=45,
    )
    assert exc.status == "PENDING"
    assert exc.expires_at is not None

    # 3. Separation of duties: Requester cannot approve their own exception!
    with pytest.raises(PermissionError, match="Separation of duties violation"):
        await exception_mgr.approve_exception(exc.id, approver=author_user)

    # 4. Peer approval activates the exception
    approved_exc = await exception_mgr.approve_exception(exc.id, approver=peer_reviewer_user)
    assert approved_exc.status == "ACTIVE"
    assert approved_exc.approved_by == peer_reviewer_user.email

    # 5. Revocation
    revoked_exc = await exception_mgr.revoke_exception(exc.id, revoker=peer_reviewer_user)
    assert revoked_exc.status == "REVOKED"


# ─────────────────────────────────────────────────────────────────────────────
# 7. Enforcement Adapters (MCP & GitHub PR Gates) (M7)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mcp_enforcement_adapter(db_session: AsyncSession, author_user: User):
    mcp_adapter = MCPPolicyEnforcementAdapter(db_session)

    # 1. Agent self-modification tool call must be strictly BLOCKED
    res_self_mod = await mcp_adapter.authorize_tool_call(
        agent_id="agent-007",
        tool_name="update_agent_policy",
        tool_arguments={"policy": "allow_all"},
        current_user=author_user,
    )
    assert res_self_mod.allowed is False
    assert "Agent self-modification" in res_self_mod.reason

    # 2. Read-only tool calls without active blocking policies must be ALLOWED
    res_read = await mcp_adapter.authorize_tool_call(
        agent_id="agent-007",
        tool_name="read_scan_findings",
        tool_arguments={"limit": 10},
        current_user=author_user,
    )
    assert res_read.allowed is True


@pytest.mark.asyncio
async def test_github_check_enforcement_adapter(db_session: AsyncSession):
    gh_adapter = GitHubCheckEnforcementAdapter(db_session)

    from app.intelligence.policy.models import PolicyDecisionRecord, MatchedPolicyRule

    # 1. Test DENY decision mapping: check run conclusion must be FAILURE and merge blocked
    dec_deny = PolicyDecisionRecord(
        decision_id=str(uuid.uuid4()),
        decision=DecisionOutcome.DENY,
        reason="Blocked by production policy",
        context_snapshot_id="snap-123",
        matched_rules=[
            MatchedPolicyRule(
                rule_key="block_critical",
                rule_name="Block Critical",
                policy_id="pol-1",
                policy_name="Prod Policy",
                policy_version=1,
                policy_version_id="ver-1",
                policy_content_hash="h" * 64,
                decision=DecisionOutcome.DENY,
                reason_code="DENY_CRIT",
                rationale="Critical vulnerability present",
            )
        ]
    )

    check_run_deny = gh_adapter.map_decision_to_check_run(dec_deny)
    assert check_run_deny["conclusion"] == "failure"
    assert gh_adapter.should_block_merge(dec_deny) is True

    # 2. Test ALLOW decision mapping: check run conclusion must be SUCCESS and merge permitted
    dec_allow = PolicyDecisionRecord(
        decision_id=str(uuid.uuid4()),
        decision=DecisionOutcome.ALLOW,
        reason="All policies satisfied",
        context_snapshot_id="snap-124",
    )
    check_run_allow = gh_adapter.map_decision_to_check_run(dec_allow)
    assert check_run_allow["conclusion"] == "success"
    assert gh_adapter.should_block_merge(dec_allow) is False


# ─────────────────────────────────────────────────────────────────────────────
# 8. Natural-Language Assisted Policy Authoring (M8)
# ─────────────────────────────────────────────────────────────────────────────

def test_nl_authoring_assistant_drafting():
    prompt = "Create a policy to block public S3 buckets and restrict all IAM access to secure buckets"
    draft = NaturalLanguagePolicyAssistant.draft_policy_from_natural_language(prompt, scope="GLOBAL")

    assert "definition" in draft
    assert "explanation" in draft
    assert "test_cases" in draft
    assert len(draft["test_cases"]) >= 2
    assert draft["is_enforceable"] is False, "AI-generated policy must strictly be non-enforceable draft"


# ─────────────────────────────────────────────────────────────────────────────
# 9. End-to-End REST API Integration Surface (M9)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_policy_rest_api_surface(
    client: AsyncClient,
    db_session: AsyncSession,
    author_user: User,
    peer_reviewer_user: User,
):
    db_session.add(author_user)
    db_session.add(peer_reviewer_user)
    await db_session.commit()

    token = create_access_token(subject=str(author_user.id))
    headers = {"Authorization": f"Bearer {token}"}

    # 1. POST /api/v1/policies/draft (NL Authoring)
    draft_resp = await client.post(
        "/api/v1/policies/draft",
        json={"prompt": "Block critical vulnerabilities in production release", "scope": "PROJECT"},
        headers=headers,
    )
    assert draft_resp.status_code == 201
    draft_data = draft_resp.json()
    assert draft_data["status"] == "DRAFT"
    assert draft_data["is_enforceable"] is False
    policy_id = draft_data["policy_id"]
    version_id = draft_data["version_id"]

    # 2. GET /api/v1/policies
    list_resp = await client.get("/api/v1/policies", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 3. POST /api/v1/policy-versions/{id}/test
    test_resp = await client.post(f"/api/v1/policy-versions/{version_id}/test", headers=headers)
    assert test_resp.status_code == 200
    assert "passed" in test_resp.json()

    # 4. POST /api/v1/policy-versions/{id}/simulate
    sim_resp = await client.post(f"/api/v1/policy-versions/{version_id}/simulate", json={"lookback_days": 30}, headers=headers)
    assert sim_resp.status_code == 200
    assert "blocker_delta" in sim_resp.json()

    # 5. POST /api/v1/policy-versions/{id}/submit-review
    submit_resp = await client.post(f"/api/v1/policy-versions/{version_id}/submit-review", headers=headers)
    assert submit_resp.status_code == 200

    # 6. POST /api/v1/policy-versions/{id}/approve (Must use peer reviewer!)
    peer_token = create_access_token(subject=str(peer_reviewer_user.id))
    peer_headers = {"Authorization": f"Bearer {peer_token}"}

    approve_resp = await client.post(
        f"/api/v1/policy-versions/{version_id}/approve",
        json={"approval_notes": "Dual approval verified."},
        headers=peer_headers,
    )
    assert approve_resp.status_code == 200
    approval_token = approve_resp.json()["approval_token"]

    # 7. POST /api/v1/policy-versions/{id}/activate (With approval token)
    activate_resp = await client.post(
        f"/api/v1/policy-versions/{version_id}/activate",
        json={"approval_token": approval_token},
        headers=headers,
    )
    assert activate_resp.status_code == 200
    assert activate_resp.json()["active"] is True

    # 8. POST /api/v1/policy-evaluations
    eval_resp = await client.post(
        "/api/v1/policy-evaluations",
        json={
            "operation": {"type": "DEPLOY", "environment": "production"},
            "environment": "production",
        },
        headers=headers,
    )
    assert eval_resp.status_code == 200
    assert "outcome" in eval_resp.json()

    # 9. POST /api/v1/policy-exceptions & approve & revoke
    exc_resp = await client.post(
        "/api/v1/policy-exceptions",
        json={
            "policy_id": policy_id,
            "target": "repo-kavach",
            "justification": "Grace period for legacy code rewrite approved by CISO",
            "risk_owner": "CISO",
            "duration_days": 30,
        },
        headers=headers,
    )
    assert exc_resp.status_code == 201
    exc_id = exc_resp.json()["id"]

    # Approve exception via peer
    app_exc_resp = await client.post(f"/api/v1/policy-exceptions/{exc_id}/approve", headers=peer_headers)
    assert app_exc_resp.status_code == 200
    assert app_exc_resp.json()["status"] == "ACTIVE"

    # Revoke exception
    rev_exc_resp = await client.post(f"/api/v1/policy-exceptions/{exc_id}/revoke", headers=headers)
    assert rev_exc_resp.status_code == 200
    assert rev_exc_resp.json()["status"] == "REVOKED"

    # 10. GET /api/v1/policy-enforcement-events
    events_resp = await client.get("/api/v1/policy-enforcement-events", headers=headers)
    assert events_resp.status_code == 200
    assert isinstance(events_resp.json(), list)

