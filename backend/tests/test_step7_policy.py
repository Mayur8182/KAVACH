import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from app.engines.policy.models import (
    ActorContext,
    DecisionContext,
    DecisionType,
    OperationContext,
    OperatorType,
)
from app.engines.policy.operators import evaluate_criterion
from app.engines.policy.validator import validate_policy_definition
from app.engines.policy.engine import policy_engine
from app.main import app


# 1. Operators Unit Tests
def test_operators_evaluation():
    # EQUALS
    assert evaluate_criterion("CRITICAL", "CRITICAL")[0] is True
    assert evaluate_criterion("critical", "CRITICAL")[0] is True
    assert evaluate_criterion("HIGH", "CRITICAL")[0] is False

    # NOT_EQUALS
    assert evaluate_criterion("HIGH", {"operator": "NOT_EQUALS", "value": "LOW"})[0] is True
    assert evaluate_criterion("LOW", {"operator": "NOT_EQUALS", "value": "LOW"})[0] is False

    # IN / NOT_IN
    assert evaluate_criterion("CRITICAL", {"operator": "IN", "value": ["CRITICAL", "HIGH"]})[0] is True
    assert evaluate_criterion("LOW", {"operator": "IN", "value": ["CRITICAL", "HIGH"]})[0] is False
    assert evaluate_criterion("LOW", {"operator": "NOT_IN", "value": ["CRITICAL", "HIGH"]})[0] is True

    # Numeric comparisons
    assert evaluate_criterion(10, {"operator": "GREATER_THAN", "value": 5})[0] is True
    assert evaluate_criterion(3, {"operator": "LESS_THAN", "value": 5})[0] is True
    assert evaluate_criterion(5, {"operator": "GREATER_THAN_OR_EQUAL", "value": 5})[0] is True

    # EXISTS / NOT_EXISTS
    assert evaluate_criterion("some_secret", {"operator": "EXISTS", "value": None})[0] is True
    assert evaluate_criterion(None, {"operator": "NOT_EXISTS", "value": None})[0] is True
    assert evaluate_criterion("", {"operator": "NOT_EXISTS", "value": None})[0] is True

    # MATCHES (glob & regex)
    assert evaluate_criterion("backend/app/config.py", {"operator": "MATCHES", "value": "*.py"})[0] is True
    assert evaluate_criterion("gitleaks:stripe-api-token", {"operator": "MATCHES", "value": "gitleaks:*"})[0] is True
    assert evaluate_criterion("semgrep:rule", {"operator": "MATCHES", "value": "gitleaks:*"})[0] is False


# 2. Validator Tests
def test_policy_validator():
    # Valid policy
    valid_def = {
        "name": "production-protection-policy",
        "description": "Blocks deployments with critical vulnerabilities",
        "scope": {"environment": "production", "operation": "DEPLOY"},
        "fail_closed": "BLOCK",
        "priority": 100,
        "rules": [
            {
                "name": "block-critical-findings",
                "when": {
                    "finding": {
                        "severity": {"operator": "IN", "value": ["CRITICAL", "HIGH"]},
                        "status": "OPEN",
                    }
                },
                "decision": "BLOCK",
                "priority": 100,
                "message": "Production deployment blocked due to critical/high findings.",
            }
        ],
    }
    is_valid, errors, parsed = validate_policy_definition(valid_def)
    assert is_valid is True
    assert len(errors) == 0
    assert parsed.name == "production-protection-policy"

    # Invalid: dangerous code injection attempt
    injected_def = {
        "name": "evil-policy",
        "description": "attempting code injection",
        "rules": [{"name": "evil", "when": {"environment": "eval('import os; os.system()')"}, "decision": "BLOCK"}],
    }
    is_valid, errors, _ = validate_policy_definition(injected_def)
    assert is_valid is False
    assert any("Dangerous pattern" in e for e in errors)

    # Invalid: unknown operator
    invalid_op_def = {
        "name": "bad-op",
        "description": "bad operator",
        "rules": [{"name": "bad", "when": {"environment": {"operator": "EXECUTE_PYTHON", "value": "x"}}, "decision": "BLOCK"}],
    }
    is_valid, errors, _ = validate_policy_definition(invalid_op_def)
    assert is_valid is False
    assert any("Invalid operator" in e for e in errors)


# 3. Policy Composition & Conflict Resolution Tests
def test_policy_composition_and_conflict_resolution():
    policy_def = {
        "name": "multi-rule-policy",
        "description": "Tests conflict resolution",
        "rules": [
            {
                "name": "warn-on-medium",
                "when": {"finding": {"severity": "MEDIUM"}},
                "decision": "WARN",
                "priority": 50,
            },
            {
                "name": "block-on-critical",
                "when": {"finding": {"severity": "CRITICAL"}},
                "decision": "BLOCK",
                "priority": 100,
            },
        ],
    }

    # Context with both MEDIUM and CRITICAL findings
    context = DecisionContext(
        actor=ActorContext(type="USER", id="dev@corp.local"),
        operation=OperationContext(type="DEPLOY", environment="staging"),
        project_id="test-proj",
        environment="staging",
        findings=[
            {"id": "f1", "severity": "MEDIUM", "title": "Medium issue", "status": "OPEN"},
            {"id": "f2", "severity": "CRITICAL", "title": "Critical RCE", "status": "OPEN"},
        ],
    )

    result = policy_engine.evaluate(context, [("multi-rule-policy", 1, policy_def, "v1")])
    assert result.decision == DecisionType.BLOCK
    assert len(result.conflicts) > 0  # Conflicting WARN vs BLOCK resolved by precedence
    assert any(ev.effect == "BLOCK" for ev in result.evidence)


# 4. Fail-Closed Rule Tests (Section 10)
def test_fail_closed_on_missing_evidence():
    policy_def = {
        "name": "prod-policy",
        "description": "Requires verified evidence for production",
        "fail_closed": "BLOCK",
        "rules": [
            {
                "name": "block-on-violated-req",
                "when": {"requirement": {"status": "VIOLATED"}},
                "decision": "BLOCK",
            }
        ],
    }

    # Production deploy with zero scan evidence / missing scan
    context = DecisionContext(
        actor=ActorContext(type="USER", id="dev@corp.local"),
        operation=OperationContext(type="DEPLOY", environment="production"),
        project_id="test-proj",
        environment="production",
        scan_id=None,
        findings=[],
        verifications=[],
    )

    result = policy_engine.evaluate(context, [("prod-policy", 1, policy_def, "v1")])
    assert result.decision == DecisionType.BLOCK
    assert "required security verification scan evidence is unavailable" in result.reason
    assert any(ev.attribute == "scan_evidence" for ev in result.evidence)


# 5. Clean Scan Permitted (Section 33)
def test_clean_evidence_permits_operation():
    policy_def = {
        "name": "standard-policy",
        "description": "Blocks if critical findings exist",
        "rules": [
            {
                "name": "block-critical",
                "when": {"finding": {"severity": "CRITICAL"}},
                "decision": "BLOCK",
            }
        ],
    }

    # Clean context: 0 findings, verified scan
    context = DecisionContext(
        actor=ActorContext(type="USER", id="dev@corp.local"),
        operation=OperationContext(type="DEPLOY", environment="development"),
        project_id="test-proj",
        environment="development",
        scan_id="scan-clean-123",
        findings=[],
        verifications=[{"requirement_key": "INPUT_VALIDATION_REQUIRED", "status": "SATISFIED"}],
    )

    result = policy_engine.evaluate(context, [("standard-policy", 1, policy_def, "v1")])
    assert result.decision == DecisionType.ALLOW
    assert len(result.matched_rules) == 0


# 6. Full REST API Lifecycle, Immutability & Separation of Duties
@pytest.mark.asyncio
async def test_policy_api_lifecycle_and_approvals(client, user_a, user_b, token_user_a, token_user_b):
    headers1 = {"Authorization": f"Bearer {token_user_a}"}
    headers2 = {"Authorization": f"Bearer {token_user_b}"}

    # Create project
    proj_res = await client.post("/api/v1/projects", json={"name": "Payment API", "description": "Core payments"}, headers=headers1)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 1. Create Policy requiring approval for HIGH severity findings
    policy_payload = {
        "name": "production-deployment-gate",
        "description": "Gate production deployments requiring approval for high risk",
        "scope": "PROJECT",
        "priority": 100,
        "policy_type": "DEPLOYMENT",
        "definition": {
            "name": "production-deployment-gate",
            "description": "Production policy",
            "rules": [
                {
                    "name": "approval-on-high",
                    "when": {"finding": {"severity": "HIGH"}},
                    "decision": "REQUIRE_APPROVAL",
                    "priority": 100,
                    "message": "High severity finding requires security review.",
                }
            ],
        },
    }
    pol_create_res = await client.post(f"/api/v1/projects/{project_id}/policies", json=policy_payload, headers=headers1)
    assert pol_create_res.status_code == 201
    policy_id = pol_create_res.json()["id"]

    # 2. Simulate Decision (dry run)
    sim_res = await client.post(
        f"/api/v1/projects/{project_id}/policies/simulate",
        json={
            "operation": {"type": "DEPLOY", "environment": "production"},
            "actor": {"type": "USER", "id": user_a.email},
        },
        headers=headers1,
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "decision" in sim_data
    assert "would_require_approval" in sim_data

    # 3. Create a real Scan to evaluate against
    scan_create_res = await client.post(
        f"/api/v1/projects/{project_id}/scans",
        json={"target_type": "LOCAL_DIRECTORY", "target_path": "."},
        headers=headers1,
    )
    assert scan_create_res.status_code == 201
    scan_id = scan_create_res.json()["id"]

    # 4. Evaluate real decision
    dec_res = await client.post(
        f"/api/v1/projects/{project_id}/decisions/evaluate",
        json={
            "operation": {"type": "DEPLOY", "environment": "production"},
            "actor": {"type": "USER", "id": user_a.email},
            "scan_id": scan_id,
        },
        headers=headers1,
    )
    assert dec_res.status_code == 200
    decision = dec_res.json()
    decision_id = decision["id"]
    assert decision["decision"] in ("REQUIRE_APPROVAL", "ALLOW", "BLOCK")
    assert len(decision["policy_version_ids"]) > 0

    # If approvals were triggered, verify separation of duties
    if decision["decision"] == "REQUIRE_APPROVAL":
        assert len(decision["approvals"]) > 0
        approval_id = decision["approvals"][0]["id"]

        # Requester attempts to approve their own request -> 403 Forbidden!
        self_approve_res = await client.post(
            f"/api/v1/approvals/{approval_id}/approve",
            json={"approval_notes": "I approve myself"},
            headers=headers1,
        )
        assert self_approve_res.status_code == 403
        assert "Separation of duties" in self_approve_res.json()["detail"]

        # Independent reviewer approves -> 200 OK!
        valid_approve_res = await client.post(
            f"/api/v1/approvals/{approval_id}/approve",
            json={"approval_notes": "Reviewed and risk accepted for release."},
            headers=headers2,
        )
        assert valid_approve_res.status_code == 200
        assert valid_approve_res.json()["status"] == "APPROVED"
        assert valid_approve_res.json()["approved_by"] == user_b.email
