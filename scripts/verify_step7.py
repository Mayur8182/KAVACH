"""
STEP 7 VERIFICATION SCRIPT
Demonstrates Policy / Allow-Warn-Block Decision Engine:
Strictly adheres to:
- No hardcoded decisions (all behavior derived from persisted policy DSL)
- No fake security (LLM has zero authority; decisions are deterministic)
- Fail-closed rule (production operations with missing evidence fail closed)
- Evidence traceability (every decision links directly to observed evidence)
- Separation of duties for gated approvals (requester != approver)
- Read-only simulation mode vs real immutable enforcement
"""
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.engines.policy.models import (
    ActorContext,
    DecisionContext,
    DecisionType,
    OperationContext,
)
from app.engines.policy.validator import validate_policy_definition
from app.engines.policy.engine import policy_engine


def test_policy_dsl_validation():
    print("[1/5] Testing Policy DSL schema validation & anti-injection safeguards...")
    valid_policy = {
        "name": "production-deployment-gate",
        "description": "Gate production deployments against high and critical vulnerabilities",
        "scope": {"environment": "production", "operation": "DEPLOY"},
        "fail_closed": "BLOCK",
        "priority": 100,
        "rules": [
            {
                "name": "block-critical-findings",
                "when": {
                    "finding": {
                        "severity": {"operator": "IN", "value": ["CRITICAL"]},
                        "status": "OPEN",
                    }
                },
                "decision": "BLOCK",
                "priority": 100,
                "message": "Production deployment blocked: critical finding detected.",
            },
            {
                "name": "approval-required-for-high",
                "when": {
                    "finding": {
                        "severity": {"operator": "EQUALS", "value": "HIGH"},
                        "status": "OPEN",
                    }
                },
                "decision": "REQUIRE_APPROVAL",
                "priority": 80,
                "message": "High severity finding requires security lead approval.",
            },
            {
                "name": "warn-medium-findings",
                "when": {
                    "finding": {
                        "severity": {"operator": "EQUALS", "value": "MEDIUM"},
                        "status": "OPEN",
                    }
                },
                "decision": "WARN",
                "priority": 50,
                "message": "Medium severity finding logged as warning.",
            },
        ],
    }

    is_valid, errors, parsed = validate_policy_definition(valid_policy)
    assert is_valid is True, f"Valid policy failed: {errors}"
    assert parsed.name == "production-deployment-gate"
    print("  Valid policy definition successfully validated.")

    # Malicious injection attempt
    injected_policy = {
        "name": "malicious-policy",
        "description": "attempts dynamic eval execution",
        "rules": [
            {
                "name": "evil-rule",
                "when": {"environment": "eval('import os; os.system()')"},
                "decision": "BLOCK",
            }
        ],
    }
    is_valid_inj, errors_inj, _ = validate_policy_definition(injected_policy)
    assert is_valid_inj is False
    assert any("Dangerous pattern" in err for err in errors_inj)
    print("  Malicious code injection attempt successfully blocked.")
    print("[PASS] Policy DSL validation verified.\n")


def test_conflict_resolution_and_precedence():
    print("[2/5] Testing deterministic conflict resolution & decision precedence...")
    policy_def = {
        "name": "conflict-test-policy",
        "description": "Tests resolution of conflicting rules",
        "rules": [
            {
                "name": "rule-allow-clean",
                "when": {"operation": "DEPLOY"},
                "decision": "ALLOW",
                "priority": 10,
            },
            {
                "name": "rule-warn-medium",
                "when": {"finding": {"severity": "MEDIUM"}},
                "decision": "WARN",
                "priority": 50,
            },
            {
                "name": "rule-block-critical",
                "when": {"finding": {"severity": "CRITICAL"}},
                "decision": "BLOCK",
                "priority": 100,
            },
        ],
    }

    context = DecisionContext(
        actor=ActorContext(type="USER", id="developer@secureai.local"),
        operation=OperationContext(type="DEPLOY", environment="staging"),
        project_id="proj-payments",
        environment="staging",
        findings=[
            {"id": "f-1", "severity": "MEDIUM", "title": "Info disclosure", "status": "OPEN"},
            {"id": "f-2", "severity": "CRITICAL", "title": "SQL Injection", "status": "OPEN"},
        ],
    )

    result = policy_engine.evaluate(context, [("conflict-test-policy", 1, policy_def, "v1")])
    print(f"  Final Decision: {result.decision.value}")
    print(f"  Reason: {result.reason}")
    print(f"  Conflicts detected and resolved: {result.conflicts}")

    assert result.decision == DecisionType.BLOCK
    assert len(result.conflicts) > 0
    assert any(ev.effect == "BLOCK" for ev in result.evidence)
    print("[PASS] Deterministic conflict resolution verified.\n")


def test_fail_closed_production_rule():
    print("[3/5] Testing fail-closed rule (production operation with missing evidence)...")
    policy_def = {
        "name": "prod-gate",
        "description": "Requires verified evidence for production release",
        "fail_closed": "BLOCK",
        "rules": [
            {
                "name": "block-violations",
                "when": {"requirement": {"status": "VIOLATED"}},
                "decision": "BLOCK",
            }
        ],
    }

    # Context without any scan evidence
    unverified_context = DecisionContext(
        actor=ActorContext(type="USER", id="developer@secureai.local"),
        operation=OperationContext(type="DEPLOY", environment="production"),
        project_id="proj-payments",
        environment="production",
        scan_id=None,
        findings=[],
        verifications=[],
    )

    result = policy_engine.evaluate(unverified_context, [("prod-gate", 1, policy_def, "v1")])
    print(f"  Decision for unverified production deployment: {result.decision.value}")
    print(f"  Reason: {result.reason}")

    assert result.decision == DecisionType.BLOCK
    assert "required security verification scan evidence is unavailable" in result.reason
    assert any(ev.attribute == "scan_evidence" for ev in result.evidence)
    print("[PASS] Fail-closed rule verified.\n")


def test_clean_evidence_permits_operation():
    print("[4/5] Testing clean evidence evaluation (clean scan allows operation)...")
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

    # Verified clean scan with 0 critical findings
    clean_context = DecisionContext(
        actor=ActorContext(type="USER", id="developer@secureai.local"),
        operation=OperationContext(type="DEPLOY", environment="development"),
        project_id="proj-payments",
        environment="development",
        scan_id="scan-clean-uuid",
        findings=[],
        verifications=[{"requirement_key": "INPUT_VALIDATION_REQUIRED", "status": "SATISFIED"}],
    )

    result = policy_engine.evaluate(clean_context, [("standard-policy", 1, policy_def, "v1")])
    print(f"  Decision for clean scan: {result.decision.value}")
    print(f"  Reason: {result.reason}")

    assert result.decision == DecisionType.ALLOW
    print("[PASS] Clean evidence evaluation verified.\n")


def test_simulation_dry_run():
    print("[5/5] Testing policy simulation dry-run mode...")
    policy_def = {
        "name": "sim-policy",
        "description": "Simulation test",
        "rules": [
            {
                "name": "require-approval-on-high",
                "when": {"finding": {"severity": "HIGH"}},
                "decision": "REQUIRE_APPROVAL",
            }
        ],
    }

    context = DecisionContext(
        actor=ActorContext(type="USER", id="developer@secureai.local"),
        operation=OperationContext(type="DEPLOY", environment="staging"),
        project_id="proj-payments",
        environment="staging",
        findings=[{"id": "f-1", "severity": "HIGH", "status": "OPEN"}],
    )

    sim_res = policy_engine.simulate(context, [("sim-policy", 1, policy_def, "v1")])
    print(f"  Simulated Decision: {sim_res.decision.value}")
    print(f"  Would Require Approval: {sim_res.would_require_approval}")
    print(f"  Would Block: {sim_res.would_block}")

    assert sim_res.decision == DecisionType.REQUIRE_APPROVAL
    assert sim_res.would_require_approval is True
    assert sim_res.would_block is False
    assert len(sim_res.evidence) > 0
    print("[PASS] Policy simulation dry-run verified.\n")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING STEP 7 POLICY & DECISION ENGINE VERIFICATION")
    print("=" * 60)
    test_policy_dsl_validation()
    test_conflict_resolution_and_precedence()
    test_fail_closed_production_rule()
    test_clean_evidence_permits_operation()
    test_simulation_dry_run()
    print("=" * 60)
    print("ALL STEP 7 VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)
