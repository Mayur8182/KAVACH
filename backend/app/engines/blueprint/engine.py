from typing import Dict, List, Set
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintEvaluationResult,
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.registry import RuleRegistry, default_registry

SEVERITY_ORDER = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFORMATIONAL": 1,
}

PRIORITY_ORDER = {
    "REQUIRED": 3,
    "RECOMMENDED": 2,
    "OPTIONAL": 1,
}


class SecurityBlueprintEngine:
    """
    Core engine that derives deterministic, context-aware security requirements
    from normalized application intent.
    Follows: "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
    """

    def __init__(self, registry: RuleRegistry = default_registry) -> None:
        self.registry = registry

    def extract_contextual_risk_factors(self, intent: NormalizedIntent) -> List[str]:
        """
        Derives contextual architectural risk dimensions from verified intent characteristics.
        (These are concrete qualitative risk dimensions, NOT fake numeric scores).
        """
        risk_factors: List[str] = []

        # Internet Exposure
        if any(i.type in {"REST_API", "GRAPHQL", "WEBHOOK", "WEB_UI"} for i in intent.interfaces):
            risk_factors.append("INTERNET_EXPOSED")

        # Financial Data
        if intent.application_type == "PAYMENT_API" or any(
            dd.domain in {"PAYMENT_DATA", "FINANCIAL_DATA"} for dd in intent.data_domains
        ):
            risk_factors.append("FINANCIAL_DATA")

        # External Webhooks
        if any(i.type == "WEBHOOK" for i in intent.interfaces) or any(
            a.type == "WEBHOOK_PROVIDER" for a in intent.actors
        ):
            risk_factors.append("EXTERNAL_WEBHOOK")

        # State Mutations
        if intent.state_changes:
            risk_factors.append("STATE_CHANGING_OPERATION")

        # Admin & Privileged Operations
        if intent.application_type == "ADMIN_DASHBOARD" or any(
            a.type in {"ADMIN", "OPERATOR"} for a in intent.actors
        ):
            risk_factors.append("ADMIN_OPERATION")

        # AI Agent Autonomous Capabilities
        if intent.application_type in {"AI_AGENT", "AI_AGENT_PLATFORM"} or any(
            a.type == "AI_AGENT" for a in intent.actors
        ) or any(i.type == "MCP_TOOL" for i in intent.interfaces):
            risk_factors.append("AI_AGENT")
            risk_factors.append("EXTERNAL_TOOL")

        # External Trust Boundaries
        if intent.external_services:
            risk_factors.append("EXTERNAL_SERVICE_DEPENDENCY")

        # Sensitive Data Handling
        sensitive_domains = {"PAYMENT_DATA", "FINANCIAL_DATA", "HEALTH_DATA", "SECRETS", "CREDENTIALS", "ACCOUNT_DATA"}
        if any(dd.domain in sensitive_domains for dd in intent.data_domains):
            risk_factors.append("SENSITIVE_DATA")

        # Production Environment
        if intent.deployment_context.environment.upper() == "PRODUCTION":
            risk_factors.append("PRODUCTION_ENVIRONMENT")

        # Container / Kubernetes
        if any(t.name.upper() in {"DOCKER", "CONTAINER", "PODMAN"} or t.category == "CONTAINER" for t in intent.technologies):
            risk_factors.append("CONTAINERIZED_WORKLOAD")
        if any(t.name.upper() in {"KUBERNETES", "K8S", "HELM"} for t in intent.technologies):
            risk_factors.append("KUBERNETES_MANAGED")

        return sorted(list(set(risk_factors)))

    def generate_blueprint(self, intent: NormalizedIntent) -> BlueprintEvaluationResult:
        """
        Executes rule evaluation, deduplication, conflict resolution, and dependency resolution.
        """
        rules = self.registry.get_all_rules()
        evaluated_rule_ids: List[str] = []
        raw_candidates: List[BlueprintRequirementCandidate] = []

        # 1. Evaluate all rules
        for rule in rules:
            evaluated_rule_ids.append(rule.rule_id)
            candidates = rule.evaluate(intent)
            raw_candidates.extend(candidates)

        # 2. Extract Contextual Risk Factors
        risk_factors = self.extract_contextual_risk_factors(intent)

        # 3. Deduplication and Conflict Resolution
        deduped: Dict[str, BlueprintRequirementCandidate] = {}

        for cand in raw_candidates:
            key = cand.requirement_key
            if key not in deduped:
                deduped[key] = cand
            else:
                existing = deduped[key]

                # Severity Resolution: Highest severity wins
                curr_sev_val = SEVERITY_ORDER.get(cand.severity, 0)
                exist_sev_val = SEVERITY_ORDER.get(existing.severity, 0)
                if curr_sev_val > exist_sev_val:
                    existing.severity = cand.severity

                # Priority Resolution: Highest priority wins (REQUIRED > RECOMMENDED > OPTIONAL)
                curr_prio_val = PRIORITY_ORDER.get(cand.priority, 0)
                exist_prio_val = PRIORITY_ORDER.get(existing.priority, 0)
                if curr_prio_val > exist_prio_val:
                    existing.priority = cand.priority

                # Mandatory: If any rule says mandatory, it stays mandatory
                if cand.mandatory:
                    existing.mandatory = True

                # Combine rationales if distinct
                if cand.rationale not in existing.rationale:
                    existing.rationale = f"{existing.rationale} Additionally: {cand.rationale}"

                # Merge verification strategies without duplicates
                for strat in cand.verification_strategy:
                    if strat not in existing.verification_strategy:
                        existing.verification_strategy.append(strat)

                # Preserve invariant if existing was None
                if not existing.security_invariant and cand.security_invariant:
                    existing.security_invariant = cand.security_invariant

                # Merge evidence items
                seen_evidence = {
                    (e.source_type, e.source_field, e.evidence_text)
                    for e in existing.evidence
                }
                for ev in cand.evidence:
                    key_tuple = (ev.source_type, ev.source_field, ev.evidence_text)
                    if key_tuple not in seen_evidence:
                        existing.evidence.append(ev)
                        seen_evidence.add(key_tuple)

                # Merge dependencies
                seen_deps = {d.depends_on_key for d in existing.dependencies}
                for dep in cand.dependencies:
                    if dep.depends_on_key not in seen_deps:
                        existing.dependencies.append(dep)
                        seen_deps.add(dep.depends_on_key)

        final_requirements = sorted(
            list(deduped.values()),
            key=lambda r: (r.category, r.requirement_key)
        )

        return BlueprintEvaluationResult(
            requirements=final_requirements,
            risk_factors=risk_factors,
            evaluated_rules=evaluated_rule_ids,
            methodology_version=self.registry.METHODOLOGY_VERSION,
        )


# Global singleton instance
blueprint_engine = SecurityBlueprintEngine()
