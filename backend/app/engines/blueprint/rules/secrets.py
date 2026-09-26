from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class SecretsProtectionRule(BaseBlueprintRule):
    rule_id = "RULE-SEC-001"
    name = "Secrets & Credentials Protection Rule"
    version = "1.0.0"
    description = "Mandates externalized secret management and static secret scanning prevention."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        if intent.external_services:
            for svc in intent.external_services:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="EXTERNAL_SERVICE",
                    source_field="external_services",
                    evidence_text=f"Integration with external provider '{svc.name}' requires API credentials",
                ))

        for tech in intent.technologies:
            if tech.category == "DATABASE":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="TECHNOLOGY",
                    source_field="technologies",
                    evidence_text=f"Database '{tech.name}' requires connection credentials",
                ))

        for dd in intent.data_domains:
            if dd.domain in {"SECRETS", "CREDENTIALS", "AUTHENTICATION_DATA"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="DATA_DOMAIN",
                    source_field="data_domains",
                    evidence_text=f"Explicit data domain '{dd.domain}' represents cryptographic secrets",
                ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="SECRETS_PROTECTION_REQUIRED",
                title="Externalized Secrets & Credential Protection",
                description="Secrets, API tokens, private keys, and connection strings must never be committed to source code or embedded in container layers. They must be injected dynamically via secure environment variables or a secrets manager.",
                category="SECRETS",
                severity="CRITICAL",
                priority="REQUIRED",
                mandatory=True,
                rationale="The application interacts with third-party APIs, databases, or sensitive authentication materials. Hardcoded secrets lead to catastrophic repository compromise.",
                verification_strategy=["SECRET_SCAN", "STATIC_ANALYSIS", "REPOSITORY_SCAN"],
                security_invariant="secrets.in_source_tree == False and secrets.injected_via_runtime_environment == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]
