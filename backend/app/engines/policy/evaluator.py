from typing import Any, Dict, List, Optional, Tuple
from app.engines.policy.models import (
    DecisionContext,
    DecisionType,
    EvidenceItem,
    FindingCondition,
    MatchedRule,
    PolicyDefinition,
    RequirementCondition,
    RuleDefinition,
)
from app.engines.policy.operators import evaluate_criterion


def matches_scope(scope_def: Optional[Any], context: DecisionContext) -> bool:
    """Checks whether the policy's defined scope applies to this context."""
    if not scope_def:
        return True

    env_scope = getattr(scope_def, "environment", None) or (
        scope_def.get("environment") if isinstance(scope_def, dict) else None
    )
    if env_scope and env_scope != "*":
        if env_scope.lower() != context.environment.lower():
            return False

    op_scope = getattr(scope_def, "operation", None) or (
        scope_def.get("operation") if isinstance(scope_def, dict) else None
    )
    if op_scope and op_scope != "*":
        if op_scope.upper() != context.operation.type.upper():
            return False

    res_scope = getattr(scope_def, "resource_type", None) or (
        scope_def.get("resource_type") if isinstance(scope_def, dict) else None
    )
    if res_scope and res_scope != "*":
        if (context.operation.resource_type or "").upper() != res_scope.upper():
            return False

    return True


def evaluate_single_rule(
    rule: RuleDefinition,
    context: DecisionContext,
    policy_name: str,
    policy_version_id: str,
) -> Optional[MatchedRule]:
    """
    Deterministically evaluates one rule against context.
    Returns MatchedRule with evidence if matched, or None.
    """
    when = rule.when
    evidence_items: List[EvidenceItem] = []

    # 1. Environment check
    if when.environment is not None:
        matched, desc = evaluate_criterion(context.environment, when.environment)
        if not matched:
            return None
        evidence_items.append(
            EvidenceItem(
                evidence_type="ENVIRONMENT",
                source_type="CONTEXT",
                attribute="environment",
                observed_value=context.environment,
                expected_condition=desc,
                effect=rule.decision.value,
                rule_name=rule.name,
                policy_version_id=policy_version_id,
            )
        )

    # 2. Operation check
    if when.operation is not None:
        matched, desc = evaluate_criterion(context.operation.type, when.operation)
        if not matched:
            return None
        evidence_items.append(
            EvidenceItem(
                evidence_type="OPERATION",
                source_type="CONTEXT",
                attribute="operation.type",
                observed_value=context.operation.type,
                expected_condition=desc,
                effect=rule.decision.value,
                rule_name=rule.name,
                policy_version_id=policy_version_id,
            )
        )

    # 3. Actor type check
    if when.actor_type is not None:
        matched, desc = evaluate_criterion(context.actor.type, when.actor_type)
        if not matched:
            return None
        evidence_items.append(
            EvidenceItem(
                evidence_type="ACTOR",
                source_type="CONTEXT",
                attribute="actor.type",
                observed_value=context.actor.type,
                expected_condition=desc,
                effect=rule.decision.value,
                rule_name=rule.name,
                policy_version_id=policy_version_id,
            )
        )

    # 4. Finding condition check
    if when.finding is not None:
        matching_findings = []
        cond: FindingCondition = when.finding

        for finding in context.findings:
            f_matched = True
            finding_evidence_details = []

            # Severity
            if cond.severity is not None:
                f_sev = finding.get("severity")
                m, d = evaluate_criterion(f_sev, cond.severity)
                if not m:
                    f_matched = False
                else:
                    finding_evidence_details.append(("severity", f_sev, d))

            # Status
            if f_matched and cond.status is not None:
                f_status = finding.get("status", "OPEN")
                m, d = evaluate_criterion(f_status, cond.status)
                if not m:
                    f_matched = False
                else:
                    finding_evidence_details.append(("status", f_status, d))

            # Scanner Type
            if f_matched and cond.scanner_type is not None:
                scanner_name = finding.get("scanner_name") or finding.get("raw_metadata", {}).get("engine")
                m, d = evaluate_criterion(scanner_name, cond.scanner_type)
                if not m:
                    f_matched = False
                else:
                    finding_evidence_details.append(("scanner_type", scanner_name, d))

            # Rule ID
            if f_matched and cond.rule_id is not None:
                r_id = finding.get("rule_id")
                m, d = evaluate_criterion(r_id, cond.rule_id)
                if not m:
                    f_matched = False
                else:
                    finding_evidence_details.append(("rule_id", r_id, d))

            if f_matched:
                matching_findings.append((finding, finding_evidence_details))

        if not matching_findings:
            return None

        # Record evidence for matched findings
        for f, details in matching_findings:
            for attr, obs, exp in details:
                evidence_items.append(
                    EvidenceItem(
                        evidence_type="FINDING",
                        source_type="SECURITY_FINDING",
                        source_id=str(f.get("id") or f.get("fingerprint") or ""),
                        attribute=attr,
                        observed_value=obs,
                        expected_condition=exp,
                        effect=rule.decision.value,
                        rule_name=rule.name,
                        policy_version_id=policy_version_id,
                    )
                )

    # 5. Requirement condition check
    if when.requirement is not None:
        matching_reqs = []
        cond_req: RequirementCondition = when.requirement

        # Combine verifications and requirements
        verif_map = {str(v.get("requirement_id") or v.get("requirement_key")): v for v in context.verifications}
        eval_items = context.verifications if context.verifications else context.requirements

        for item in eval_items:
            req_matched = True
            req_evidence_details = []

            # Status (e.g. VIOLATED, UNKNOWN, SATISFIED)
            if cond_req.status is not None:
                v_status = item.get("status")
                m, d = evaluate_criterion(v_status, cond_req.status)
                if not m:
                    req_matched = False
                else:
                    req_evidence_details.append(("status", v_status, d))

            # Priority (e.g. REQUIRED, CRITICAL, RECOMMENDED)
            if req_matched and cond_req.priority is not None:
                priority = item.get("priority")
                m, d = evaluate_criterion(priority, cond_req.priority)
                if not m:
                    req_matched = False
                else:
                    req_evidence_details.append(("priority", priority, d))

            # Requirement key
            if req_matched and cond_req.requirement_key is not None:
                key = item.get("requirement_key")
                m, d = evaluate_criterion(key, cond_req.requirement_key)
                if not m:
                    req_matched = False
                else:
                    req_evidence_details.append(("requirement_key", key, d))

            # Category
            if req_matched and cond_req.category is not None:
                cat = item.get("category")
                m, d = evaluate_criterion(cat, cond_req.category)
                if not m:
                    req_matched = False
                else:
                    req_evidence_details.append(("category", cat, d))

            if req_matched:
                matching_reqs.append((item, req_evidence_details))

        if not matching_reqs:
            return None

        # Record evidence for matched requirements
        for item, details in matching_reqs:
            for attr, obs, exp in details:
                evidence_items.append(
                    EvidenceItem(
                        evidence_type="REQUIREMENT",
                        source_type="REQUIREMENT_VERIFICATION",
                        source_id=str(item.get("id") or item.get("requirement_key") or ""),
                        attribute=attr,
                        observed_value=obs,
                        expected_condition=exp,
                        effect=rule.decision.value,
                        rule_name=rule.name,
                        policy_version_id=policy_version_id,
                    )
                )

    # All criteria matched!
    rationale = rule.message or f"Policy '{policy_name}' rule '{rule.name}' matched with decision {rule.decision.value}."
    return MatchedRule(
        rule_name=rule.name,
        policy_name=policy_name,
        policy_version_id=policy_version_id,
        decision=rule.decision,
        rationale=rationale,
        priority=rule.priority,
        evidence_items=evidence_items,
    )
