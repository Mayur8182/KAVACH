from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class AdminDashboardRule(BaseBlueprintRule):
    rule_id = "RULE-ADM-001"
    name = "Administrative Control & Audit Rule"
    version = "1.0.0"
    description = "Enforces elevated authorization, step-up authentication, and immutable audit logging for administrative operations."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        if intent.application_type == "ADMIN_DASHBOARD":
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text="Application archetype is ADMIN_DASHBOARD",
            ))

        for actor in intent.actors:
            if actor.type in {"ADMIN", "OPERATOR"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="ACTOR",
                    source_field="actors",
                    evidence_text=f"Privileged administrative actor '{actor.name}' ({actor.type}) identified",
                ))

        for sc in intent.state_changes:
            if any(term in sc.name.upper() for term in ["ADMIN", "CONFIG", "ROLE", "BAN", "SUSPEND", "OVERRIDE", "DELETE_USER"]):
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTENT",
                    source_field="state_changes",
                    evidence_text=f"Administrative state-changing operation '{sc.name}'",
                ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="ADMIN_ACTION_AUTHORIZATION_REQUIRED",
                title="Strict Administrative Privilege & MFA Verification",
                description="Administrative endpoints and operations must require verified administrator credentials, step-up multi-factor authentication (MFA), and session timeout restrictions.",
                category="AUTHORIZATION",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Administrative dashboards possess high-impact system control. Compromise of administrative credentials grants unrestricted application compromise.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
                security_invariant="caller.role == 'ADMIN' and caller.mfa_verified == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="AUTHORIZATION_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Administrative authorization builds upon general authorization.",
                    )
                ],
            ),
            BlueprintRequirementCandidate(
                requirement_key="AUDIT_LOGGING_REQUIRED",
                title="Comprehensive Administrative Audit Logging",
                description="All administrative actions, configuration mutations, permission grants, and entity deletions must emit structured, immutable audit log events.",
                category="AUDIT",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Administrative actions must maintain complete accountability for forensic tracing and regulatory compliance.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST", "RUNTIME_EVIDENCE"],
                security_invariant="audit_event.recorded == True for all administrative actions",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            ),
        ]
