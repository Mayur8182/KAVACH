from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.engines.policy.evaluator import evaluate_single_rule, matches_scope
from app.engines.policy.models import (
    DecisionContext,
    DecisionResult,
    DecisionType,
    EvidenceItem,
    MatchedRule,
    PolicyDefinition,
)

# Decision precedence: BLOCK > REQUIRE_APPROVAL > WARN > ALLOW > NOT_EVALUATED
DECISION_PRECEDENCE = {
    DecisionType.BLOCK: 500,
    DecisionType.REQUIRE_APPROVAL: 400,
    DecisionType.WARN: 300,
    DecisionType.ALLOW: 200,
    DecisionType.NOT_EVALUATED: 100,
}


class PolicyComposer:
    """
    Composes evaluations from multiple active policies and resolves conflicts
    using deterministic precedence, priority, scope specificity, and fail-closed rules.
    """

    def compose(
        self,
        context: DecisionContext,
        policies: List[Tuple[str, int, Dict[str, Any]]],  # (policy_name, policy_version, definition_dict)
    ) -> DecisionResult:
        if not policies:
            return DecisionResult(
                decision=DecisionType.NOT_EVALUATED,
                reason="No active policies configured for project/operation.",
                policy_version_ids=[],
                matched_rules=[],
                unmatched_rules=[],
                evidence=[],
                conflicts=[],
            )

        all_matched_rules: List[MatchedRule] = []
        all_unmatched_rules: List[str] = []
        all_evidence: List[EvidenceItem] = []
        conflicts: List[str] = []
        active_version_ids: List[str] = []
        policies_fail_closed_decisions: List[DecisionType] = []

        # 1. Evaluate each policy
        for pol_item in policies:
            # Handle tuple of (name, version, definition, version_id) or similar
            if len(pol_item) >= 4:
                pol_name, pol_version, pol_def_dict, pol_version_id = pol_item[0], pol_item[1], pol_item[2], str(pol_item[3])
            else:
                pol_name, pol_version, pol_def_dict = pol_item[0], pol_item[1], pol_item[2]
                pol_version_id = f"{pol_name}-v{pol_version}"

            active_version_ids.append(pol_version_id)

            try:
                pol_def = PolicyDefinition.model_validate(pol_def_dict)
            except Exception:
                # If parsing fails, fail closed for security
                all_matched_rules.append(
                    MatchedRule(
                        rule_name="malformed-policy-fail-closed",
                        policy_name=pol_name,
                        policy_version_id=pol_version_id,
                        decision=DecisionType.BLOCK,
                        rationale=f"Policy '{pol_name}' has malformed definition. Failing closed.",
                        priority=999,
                        evidence_items=[],
                    )
                )
                continue

            policies_fail_closed_decisions.append(pol_def.fail_closed)

            # Check scope applicability
            if not matches_scope(pol_def.scope, context):
                for r in pol_def.rules:
                    all_unmatched_rules.append(f"{pol_name}:{r.name} (out of scope)")
                continue

            # Evaluate each rule in policy
            for rule in pol_def.rules:
                matched_rule = evaluate_single_rule(
                    rule=rule,
                    context=context,
                    policy_name=pol_name,
                    policy_version_id=pol_version_id,
                )
                if matched_rule:
                    all_matched_rules.append(matched_rule)
                    all_evidence.extend(matched_rule.evidence_items)
                else:
                    all_unmatched_rules.append(f"{pol_name}:{rule.name}")

        # 2. Fail-Closed Check for Critical Operations (Section 10)
        # If deploying to production and no scan was performed or scans are missing:
        if context.environment.lower() == "production" and context.operation.type.upper() == "DEPLOY":
            if not context.scan_id and not context.verifications and not context.findings:
                # Evidence is unavailable!
                fail_decision = policies_fail_closed_decisions[0] if policies_fail_closed_decisions else DecisionType.BLOCK
                fail_evidence = EvidenceItem(
                    evidence_type="ENVIRONMENT",
                    source_type="CONTEXT",
                    attribute="scan_evidence",
                    observed_value="UNAVAILABLE",
                    expected_condition="Verified security evidence required for production deployment",
                    effect=fail_decision.value,
                    rule_name="production-fail-closed-unverified",
                    policy_version_id=active_version_ids[0] if active_version_ids else "system",
                )
                all_evidence.append(fail_evidence)
                all_matched_rules.append(
                    MatchedRule(
                        rule_name="production-fail-closed-unverified",
                        policy_name="SystemFailClosed",
                        policy_version_id="system",
                        decision=fail_decision,
                        rationale="Production deployment cannot proceed: required security verification scan evidence is unavailable.",
                        priority=999,
                        evidence_items=[fail_evidence],
                    )
                )

        # 3. Conflict Resolution & Precedence (Section 9, 30)
        if not all_matched_rules:
            # No rules triggered violations/warnings/approvals/allows
            # Default to ALLOW with evidence that all checks passed
            allow_evidence = EvidenceItem(
                evidence_type="POLICY_RULE",
                source_type="CONTEXT",
                attribute="rules_evaluated",
                observed_value=len(all_unmatched_rules),
                expected_condition="Zero blocking or warning policy rules matched",
                effect="ALLOW",
                rule_name="default-permit-clean-evidence",
                policy_version_id=active_version_ids[0] if active_version_ids else None,
            )
            all_evidence.append(allow_evidence)
            return DecisionResult(
                decision=DecisionType.ALLOW,
                reason="All applicable policy rules evaluated clean without violations.",
                policy_version_ids=active_version_ids,
                matched_rules=[],
                unmatched_rules=all_unmatched_rules,
                evidence=all_evidence,
                conflicts=[],
            )

        # Multiple rules matched: check for conflicts
        decisions_present = {r.decision for r in all_matched_rules}
        if len(decisions_present) > 1:
            conflicts.append(
                f"Conflicting decisions detected: {[d.value for d in decisions_present]}. "
                f"Resolving by deterministic precedence (BLOCK > REQUIRE_APPROVAL > WARN > ALLOW)."
            )

        # Sort matched rules by decision precedence (highest first), then rule priority (highest first)
        sorted_rules = sorted(
            all_matched_rules,
            key=lambda r: (DECISION_PRECEDENCE.get(r.decision, 0), r.priority),
            reverse=True,
        )

        winning_rule = sorted_rules[0]
        final_decision = winning_rule.decision

        # Compile comprehensive explanation derived directly from evaluation data
        reasons = [r.rationale for r in sorted_rules if r.decision == final_decision]
        summary_reason = "; ".join(reasons)

        return DecisionResult(
            decision=final_decision,
            reason=summary_reason,
            policy_version_ids=active_version_ids,
            matched_rules=all_matched_rules,
            unmatched_rules=all_unmatched_rules,
            evidence=all_evidence,
            conflicts=conflicts,
        )
