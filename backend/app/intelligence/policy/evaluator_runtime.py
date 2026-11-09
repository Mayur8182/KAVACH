"""
Kavach Phase 5: Deterministic Policy Evaluation Runtime
Evaluates policies against authoritative context snapshots and produces
structured 5-outcome decisions (ALLOW, DENY, WARN, NOT_APPLICABLE, INDETERMINATE)
with complete evidence traceability, precedence ordering, and fail-closed safety.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Set

from app.engines.policy.operators import evaluate_criterion
from app.engines.policy.validator import validate_policy_definition
from app.intelligence.policy.models import (
    DecisionOutcome,
    MatchedPolicyRule,
    PolicyContextSnapshot,
    PolicyDecisionRecord,
    PolicyEvidenceItem,
    PolicyScope,
)
from app.intelligence.policy.content_hasher import compute_policy_content_hash

logger = logging.getLogger("kavach.policy.evaluator")

# Decision precedence: DENY > REQUIRE_APPROVAL > WARN > ALLOW > NOT_APPLICABLE
DECISION_PRECEDENCE = {
    DecisionOutcome.DENY: 500,
    DecisionOutcome.WARN: 300,
    DecisionOutcome.ALLOW: 200,
    DecisionOutcome.NOT_APPLICABLE: 100,
    DecisionOutcome.INDETERMINATE: 600,  # Missing/stale facts demand operational review
}

# Scope precedence: GLOBAL (organization) > PROJECT > ENVIRONMENT > OPERATION
SCOPE_PRECEDENCE = {
    PolicyScope.GLOBAL.value: 400,
    PolicyScope.PROJECT.value: 300,
    PolicyScope.ENVIRONMENT.value: 200,
    PolicyScope.OPERATION.value: 100,
}


class DeterministicPolicyEvaluator:
    """
    Kavach Authoritative Policy Evaluator.
    Rule: 'LLM proposes. Deterministic security systems decide. Runtime evidence proves.'
    """

    @classmethod
    def evaluate_snapshot(
        cls,
        context: PolicyContextSnapshot,
        active_policies: List[Dict[str, Any]],
        fail_closed_domains: Optional[Set[str]] = None,
    ) -> PolicyDecisionRecord:
        """
        Deterministically evaluates active policies against an authoritative context snapshot.
        """
        decision_id = f"dec_{uuid.uuid4().hex[:16]}"
        active_version_ids: List[str] = []
        all_matched_rules: List[MatchedPolicyRule] = []
        all_unmatched_rule_keys: List[str] = []
        all_evidence: List[PolicyEvidenceItem] = []
        conflicts: List[str] = []
        exceptions_applied: List[Dict[str, Any]] = []

        # 1. Check for Missing or Stale Critical Context
        # Per Phase 5 Rule 10.2: If required facts are missing or stale, return INDETERMINATE
        if not context.is_fresh or (context.missing_facts and len(context.missing_facts) > 0):
            missing_desc = ", ".join(context.missing_facts) if context.missing_facts else "Stale context snapshot"
            indet_evidence = PolicyEvidenceItem(
                evidence_type="ENVIRONMENT",
                source_type="CONTEXT",
                attribute="context_freshness",
                observed_value=f"is_fresh={context.is_fresh}, missing=[{missing_desc}]",
                expected_condition="Authoritative, fresh context required for evaluation",
                effect="INDETERMINATE",
                rule_key="context-completeness-check",
            )
            return PolicyDecisionRecord(
                decision_id=decision_id,
                decision=DecisionOutcome.INDETERMINATE,
                reason=f"Evaluation indeterminate: required context is incomplete or stale ({missing_desc}).",
                reason_codes=["ERR_CONTEXT_INCOMPLETE"],
                policy_version_ids=[],
                matched_rules=[],
                unmatched_rule_keys=[],
                evidence=[indet_evidence],
                exceptions_applied=[],
                conflicts=[],
                context_snapshot_id=context.snapshot_id,
                is_enforceable=False,
            )

        if not active_policies:
            return PolicyDecisionRecord(
                decision_id=decision_id,
                decision=DecisionOutcome.NOT_APPLICABLE,
                reason="No active policies configured for current tenant/project scope.",
                reason_codes=["SCOPE_NOT_APPLICABLE"],
                policy_version_ids=[],
                matched_rules=[],
                unmatched_rule_keys=[],
                evidence=[],
                exceptions_applied=[],
                conflicts=[],
                context_snapshot_id=context.snapshot_id,
                is_enforceable=True,
            )

        # 2. Sort policies by scope precedence (GLOBAL first, then PROJECT, then ENVIRONMENT)
        sorted_policies = sorted(
            active_policies,
            key=lambda p: (
                SCOPE_PRECEDENCE.get(str(p.get("scope", "PROJECT")).upper(), 0),
                int(p.get("priority", 100)),
            ),
            reverse=True,
        )

        # 3. Evaluate each active policy
        for pol in sorted_policies:
            pol_id = str(pol.get("policy_id") or pol.get("id") or "")
            pol_name = str(pol.get("name") or "Unnamed Policy")
            pol_ver = int(pol.get("version") or 1)
            pol_ver_id = str(pol.get("version_id") or f"{pol_id}_v{pol_ver}")
            pol_hash = str(pol.get("content_hash") or compute_policy_content_hash(pol.get("definition", {})))
            definition = pol.get("definition", {})
            pol_scope = str(pol.get("scope", "PROJECT")).upper()

            active_version_ids.append(pol_ver_id)

            # Validate definition structure
            is_valid, errs, parsed_def = validate_policy_definition(definition)
            if not is_valid:
                # Malformed policy fails closed
                malformed_rule = MatchedPolicyRule(
                    rule_key="malformed_policy_fail_closed",
                    rule_name="Malformed Policy Definition",
                    policy_id=pol_id,
                    policy_name=pol_name,
                    policy_version=pol_ver,
                    policy_version_id=pol_ver_id,
                    policy_content_hash=pol_hash,
                    decision=DecisionOutcome.DENY,
                    reason_code="ERR_MALFORMED_POLICY",
                    rationale=f"Policy '{pol_name}' has malformed definition. Failing closed: {'; '.join(errs)}",
                    priority=999,
                    is_non_exemptible=True,
                )
                all_matched_rules.append(malformed_rule)
                continue

            rules_data = definition.get("rules", [])
            for r_dict in rules_data:
                rule_name = r_dict.get("name", "unnamed-rule")
                rule_key = r_dict.get("rule_key") or rule_name.lower().replace(" ", "_")
                rule_decision_str = str(r_dict.get("decision", "DENY")).upper()
                rule_decision = DecisionOutcome.DENY if rule_decision_str in ("BLOCK", "DENY") else (
                    DecisionOutcome.WARN if rule_decision_str == "WARN" else DecisionOutcome.ALLOW
                )
                rule_priority = int(r_dict.get("priority", 100))
                is_non_exemptible = bool(r_dict.get("is_non_exemptible", False))
                reason_code = r_dict.get("reason_code") or f"RULE_{rule_key.upper()}"
                when = r_dict.get("when", {})

                matched, rule_evidence, rationale = cls._evaluate_rule_when(
                    when=when,
                    context=context,
                    rule_key=rule_key,
                    rule_name=rule_name,
                    pol_ver_id=pol_ver_id,
                    decision_str=rule_decision.value,
                )

                if matched:
                    # Check if an active exception covers this rule
                    exception_matched = False
                    if not is_non_exemptible:
                        for exc in context.active_exceptions:
                            exc_rule_key = exc.get("rule_key")
                            exc_res_scope = exc.get("resource_scope", "*")
                            if (not exc_rule_key or exc_rule_key == rule_key) and cls._matches_resource_scope(exc_res_scope, context):
                                exception_matched = True
                                exceptions_applied.append(exc)
                                break

                    if exception_matched:
                        logger.info(f"Policy rule '{rule_key}' bypassed by valid active exception.")
                        all_unmatched_rule_keys.append(f"{rule_key} (waived_by_exception)")
                        continue

                    matched_rule_obj = MatchedPolicyRule(
                        rule_key=rule_key,
                        rule_name=rule_name,
                        policy_id=pol_id,
                        policy_name=pol_name,
                        policy_version=pol_ver,
                        policy_version_id=pol_ver_id,
                        policy_content_hash=pol_hash,
                        decision=rule_decision,
                        reason_code=reason_code,
                        rationale=rationale or f"Rule '{rule_name}' in policy '{pol_name}' triggered {rule_decision.value}.",
                        priority=rule_priority,
                        is_non_exemptible=is_non_exemptible,
                        evidence_items=rule_evidence,
                    )
                    all_matched_rules.append(matched_rule_obj)
                    all_evidence.extend(rule_evidence)
                else:
                    all_unmatched_rule_keys.append(rule_key)

        # 4. Fail-Closed Check for Critical Production Operations (Rule 10.2)
        if context.environment.lower() == "production" and context.operation.get("type", "").upper() == "DEPLOY":
            if not context.findings and not context.reachability_facts and not context.commit_sha:
                fail_evidence = PolicyEvidenceItem(
                    evidence_type="ENVIRONMENT",
                    source_type="CONTEXT",
                    attribute="production_verification_evidence",
                    observed_value="ABSENT",
                    expected_condition="Security findings and reachability verification required for production deployment",
                    effect="DENY",
                    rule_key="fail_closed_unverified_prod_deploy",
                )
                all_evidence.append(fail_evidence)
                all_matched_rules.append(
                    MatchedPolicyRule(
                        rule_key="fail_closed_unverified_prod_deploy",
                        rule_name="Fail Closed Unverified Production Deployment",
                        policy_id="system_safety",
                        policy_name="System Invariant Safety Policy",
                        policy_version=1,
                        policy_version_id="system_safety_v1",
                        policy_content_hash="0" * 64,
                        decision=DecisionOutcome.DENY,
                        reason_code="FAIL_CLOSED_NO_EVIDENCE",
                        rationale="Production deployment blocked: required security verification evidence is completely absent.",
                        priority=999,
                        is_non_exemptible=True,
                        evidence_items=[fail_evidence],
                    )
                )

        # 5. Conflict Resolution & Precedence
        if not all_matched_rules:
            allow_evidence = PolicyEvidenceItem(
                evidence_type="POLICY_RULE",
                source_type="CONTEXT",
                attribute="rules_evaluated_count",
                observed_value=len(all_unmatched_rule_keys),
                expected_condition="Zero blocking or warning policy rules matched",
                effect="ALLOW",
                rule_key="clean_evaluation_permit",
            )
            all_evidence.append(allow_evidence)
            return PolicyDecisionRecord(
                decision_id=decision_id,
                decision=DecisionOutcome.ALLOW,
                reason="All applicable security policies evaluated clean with zero violations.",
                reason_codes=["POLICY_EVALUATION_PASSED"],
                policy_version_ids=active_version_ids,
                matched_rules=[],
                unmatched_rule_keys=all_unmatched_rule_keys,
                evidence=all_evidence,
                exceptions_applied=exceptions_applied,
                conflicts=[],
                context_snapshot_id=context.snapshot_id,
                is_enforceable=True,
            )

        # Multiple rules matched: check for decision conflicts
        outcomes_present = {r.decision for r in all_matched_rules}
        if len(outcomes_present) > 1:
            conflicts.append(
                f"Conflicting decisions detected: {[o.value for o in outcomes_present]}. "
                f"Resolved by deterministic precedence (DENY > WARN > ALLOW > NOT_APPLICABLE)."
            )

        # Sort matched rules by decision precedence (highest first), then rule priority (highest first)
        sorted_matched = sorted(
            all_matched_rules,
            key=lambda r: (DECISION_PRECEDENCE.get(r.decision, 0), r.priority),
            reverse=True,
        )

        winning_rule = sorted_matched[0]
        final_decision = winning_rule.decision

        reasons = [r.rationale for r in sorted_matched if r.decision == final_decision]
        reason_codes = list(dict.fromkeys([r.reason_code for r in sorted_matched if r.decision == final_decision]))
        summary_reason = "; ".join(reasons)

        return PolicyDecisionRecord(
            decision_id=decision_id,
            decision=final_decision,
            reason=summary_reason,
            reason_codes=reason_codes,
            policy_version_ids=active_version_ids,
            matched_rules=all_matched_rules,
            unmatched_rule_keys=all_unmatched_rule_keys,
            evidence=all_evidence,
            exceptions_applied=exceptions_applied,
            conflicts=conflicts,
            context_snapshot_id=context.snapshot_id,
            is_enforceable=True,
        )

    @classmethod
    def _evaluate_rule_when(
        cls,
        when: Dict[str, Any],
        context: PolicyContextSnapshot,
        rule_key: str,
        rule_name: str,
        pol_ver_id: str,
        decision_str: str,
    ) -> Tuple[bool, List[PolicyEvidenceItem], str]:
        """
        Evaluates the 'when' block of a rule against context.
        Returns: (is_matched, evidence_items, rationale)
        """
        evidence_items: List[PolicyEvidenceItem] = []

        # 1. Environment check
        if "environment" in when:
            m, desc = evaluate_criterion(context.environment, when["environment"])
            if not m:
                return False, [], ""
            evidence_items.append(
                PolicyEvidenceItem(
                    evidence_type="ENVIRONMENT",
                    source_type="CONTEXT",
                    attribute="environment",
                    observed_value=context.environment,
                    expected_condition=desc,
                    effect=decision_str,
                    rule_key=rule_key,
                    policy_version_id=pol_ver_id,
                )
            )

        # 2. Operation check
        if "operation" in when:
            op_type = context.operation.get("type", "")
            m, desc = evaluate_criterion(op_type, when["operation"])
            if not m:
                return False, [], ""
            evidence_items.append(
                PolicyEvidenceItem(
                    evidence_type="OPERATION",
                    source_type="CONTEXT",
                    attribute="operation.type",
                    observed_value=op_type,
                    expected_condition=desc,
                    effect=decision_str,
                    rule_key=rule_key,
                    policy_version_id=pol_ver_id,
                )
            )

        # 3. Actor check
        if "actor_type" in when:
            act_type = context.actor.get("type", "")
            m, desc = evaluate_criterion(act_type, when["actor_type"])
            if not m:
                return False, [], ""
            evidence_items.append(
                PolicyEvidenceItem(
                    evidence_type="ACTOR",
                    source_type="CONTEXT",
                    attribute="actor.type",
                    observed_value=act_type,
                    expected_condition=desc,
                    effect=decision_str,
                    rule_key=rule_key,
                    policy_version_id=pol_ver_id,
                )
            )

        # 4. Finding condition check
        if "finding" in when:
            cond = when["finding"]
            matched_findings = []
            for f in context.findings:
                f_matched = True
                f_details = []

                if "severity" in cond:
                    f_sev = f.get("severity")
                    m, d = evaluate_criterion(f_sev, cond["severity"])
                    if not m:
                        f_matched = False
                    else:
                        f_details.append(("severity", f_sev, d))

                if f_matched and "rule_id" in cond:
                    r_id = f.get("rule_id")
                    m, d = evaluate_criterion(r_id, cond["rule_id"])
                    if not m:
                        f_matched = False
                    else:
                        f_details.append(("rule_id", r_id, d))

                if f_matched and "is_reachable" in cond:
                    # Check reachability fact
                    is_reach = f.get("is_reachable", False)
                    m, d = evaluate_criterion(is_reach, cond["is_reachable"])
                    if not m:
                        f_matched = False
                    else:
                        f_details.append(("is_reachable", is_reach, d))

                if f_matched:
                    matched_findings.append((f, f_details))

            if not matched_findings:
                return False, [], ""

            for f, details in matched_findings:
                for attr, obs, exp in details:
                    evidence_items.append(
                        PolicyEvidenceItem(
                            evidence_type="FINDING",
                            source_type="SECURITY_FINDING",
                            source_id=str(f.get("id") or f.get("fingerprint") or f.get("rule_id")),
                            attribute=attr,
                            observed_value=obs,
                            expected_condition=exp,
                            effect=decision_str,
                            rule_key=rule_key,
                            policy_version_id=pol_ver_id,
                        )
                    )

        # 5. Cloud Resource condition check
        if "cloud_resource" in when:
            cond = when["cloud_resource"]
            matched_cloud = []
            for cr in context.cloud_resources:
                cr_matched = True
                cr_details = []

                if "provider" in cond:
                    prov = cr.get("provider")
                    m, d = evaluate_criterion(prov, cond["provider"])
                    if not m:
                        cr_matched = False
                    else:
                        cr_details.append(("provider", prov, d))

                if cr_matched and "is_public" in cond:
                    pub = cr.get("is_public", False)
                    m, d = evaluate_criterion(pub, cond["is_public"])
                    if not m:
                        cr_matched = False
                    else:
                        cr_details.append(("is_public", pub, d))

                if cr_matched and "encrypted" in cond:
                    enc = cr.get("encrypted", True)
                    m, d = evaluate_criterion(enc, cond["encrypted"])
                    if not m:
                        cr_matched = False
                    else:
                        cr_details.append(("encrypted", enc, d))

                if cr_matched:
                    matched_cloud.append((cr, cr_details))

            if not matched_cloud:
                return False, [], ""

            for cr, details in matched_cloud:
                for attr, obs, exp in details:
                    evidence_items.append(
                        PolicyEvidenceItem(
                            evidence_type="CLOUD_CONFIG",
                            source_type="CLUSTER_OBSERVATION",
                            source_id=str(cr.get("id") or cr.get("name")),
                            attribute=attr,
                            observed_value=obs,
                            expected_condition=exp,
                            effect=decision_str,
                            rule_key=rule_key,
                            policy_version_id=pol_ver_id,
                        )
                    )

        # 6. AI Agent / Tool condition check
        if "agent_tool" in when:
            cond = when["agent_tool"]
            tool_name = context.operation.get("metadata", {}).get("tool_name") or context.operation.get("type", "")
            is_write = context.operation.get("metadata", {}).get("is_write", False)
            at_matched = True
            at_details = []

            if "is_write" in cond:
                m, d = evaluate_criterion(is_write, cond["is_write"])
                if not m:
                    at_matched = False
                else:
                    at_details.append(("is_write", is_write, d))

            if at_matched and "prohibit_self_modification" in cond:
                # Target is policy or governance
                target_resource = context.operation.get("resource_id", "")
                is_policy_target = "policy" in target_resource.lower() or "governance" in target_resource.lower()
                m, d = evaluate_criterion(is_policy_target, cond["prohibit_self_modification"])
                if not m:
                    at_matched = False
                else:
                    at_details.append(("prohibit_self_modification", is_policy_target, d))

            if not at_matched:
                return False, [], ""

            for attr, obs, exp in at_details:
                evidence_items.append(
                    PolicyEvidenceItem(
                        evidence_type="AI_AGENT",
                        source_type="MCP_GATEWAY",
                        source_id=tool_name,
                        attribute=attr,
                        observed_value=obs,
                        expected_condition=exp,
                        effect=decision_str,
                        rule_key=rule_key,
                        policy_version_id=pol_ver_id,
                    )
                )

        rationale = f"Rule '{rule_name}' conditions matched in context snapshot."
        return True, evidence_items, rationale

    @classmethod
    def _matches_resource_scope(cls, scope_pattern: str, context: PolicyContextSnapshot) -> bool:
        if not scope_pattern or scope_pattern == "*":
            return True
        import fnmatch
        repo = context.repository or ""
        proj = context.project_id or ""
        res_id = context.operation.get("resource_id") or ""
        return (
            fnmatch.fnmatch(repo.lower(), scope_pattern.lower())
            or fnmatch.fnmatch(proj.lower(), scope_pattern.lower())
            or fnmatch.fnmatch(res_id.lower(), scope_pattern.lower())
        )

