from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class AuthenticationRule(BaseBlueprintRule):
    rule_id = "RULE-AUTH-001"
    name = "Authentication Requirement Rule"
    version = "1.0.0"
    description = "Determines whether the application requires identity authentication based on actors, workflows, and handled data."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        # Check for non-public identified actors
        non_public_actors = [
            a for a in intent.actors 
            if a.type in {"USER", "CUSTOMER", "ADMIN", "OPERATOR", "DEVELOPER", "SERVICE", "AI_AGENT"}
        ]
        for actor in non_public_actors:
            evidence_items.append(RequirementEvidenceItem(
                source_type="ACTOR",
                source_field="actors",
                evidence_text=f"Actor '{actor.name}' with type '{actor.type}' requires verified identity",
            ))

        # Check for sensitive data domains requiring authenticated access
        sensitive_domains = {"USER_DATA", "ACCOUNT_DATA", "PAYMENT_DATA", "FINANCIAL_DATA", "HEALTH_DATA", "SECRETS"}
        for dd in intent.data_domains:
            if dd.domain in sensitive_domains:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="DATA_DOMAIN",
                    source_field="data_domains",
                    evidence_text=f"Sensitive data domain '{dd.domain}' requires authenticated access control",
                ))

        # Check application types that inherently require authentication
        inherent_auth_types = {"SAAS_PLATFORM", "E_COMMERCE", "ADMIN_DASHBOARD", "PAYMENT_API", "AUTHENTICATION_SERVICE"}
        if intent.application_type in inherent_auth_types:
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text=f"Application archetype '{intent.application_type}' requires identity authentication",
            ))

        if not evidence_items:
            return []

        # Determine severity based on data sensitivity
        has_critical_data = any(
            dd.domain in {"PAYMENT_DATA", "FINANCIAL_DATA", "HEALTH_DATA", "SECRETS"} 
            for dd in intent.data_domains
        ) or any(a.type == "ADMIN" for a in intent.actors)

        severity = "CRITICAL" if has_critical_data else "HIGH"

        return [
            BlueprintRequirementCandidate(
                requirement_key="AUTHENTICATION_REQUIRED",
                title="Identity Authentication Enforcement",
                description="The system must identify and authenticate all interacting entities prior to granting access to application resources or operations.",
                category="AUTHENTICATION",
                severity=severity,
                priority="REQUIRED",
                mandatory=True,
                rationale=f"Application processes requests from identified actors and sensitive data domains. Unauthenticated access violates core boundary integrity.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST", "RUNTIME_EVIDENCE"],
                security_invariant="request.caller.is_authenticated == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[],
            )
        ]


class AuthorizationRule(BaseBlueprintRule):
    rule_id = "RULE-AUTH-002"
    name = "Authorization & Access Control Rule"
    version = "1.0.0"
    description = "Enforces least-privilege authorization policies for state-changing workflows and distinct actor roles."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        # Check for multiple actor types (indicating role segregation)
        actor_types = {a.type for a in intent.actors}
        if len(actor_types) > 1 or any(a.type in {"ADMIN", "OPERATOR"} for a in intent.actors):
            evidence_items.append(RequirementEvidenceItem(
                source_type="ACTOR",
                source_field="actors",
                evidence_text=f"Multiple or privileged actor roles detected: {', '.join(sorted(actor_types))}",
            ))

        # Check for state mutating changes
        if intent.state_changes:
            for sc in intent.state_changes:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTENT",
                    source_field="state_changes",
                    evidence_text=f"State-changing operation '{sc.name}' modifying entity '{sc.target_entity}'",
                ))

        # Check for admin or financial application types
        if intent.application_type in {"ADMIN_DASHBOARD", "PAYMENT_API", "SAAS_PLATFORM", "E_COMMERCE"}:
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text=f"Application archetype '{intent.application_type}' requires granular access control",
            ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="AUTHORIZATION_REQUIRED",
                title="Role-Based & Resource-Level Authorization",
                description="The system must enforce authorization policies verifying that the authenticated caller has explicit permissions for the requested action on the target resource.",
                category="AUTHORIZATION",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="The application performs state mutations or manages distinct actor privilege tiers. Authorization ensures unauthorized actors cannot manipulate restricted resources.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
                security_invariant="caller.has_permission(requested_action, target_resource) == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="AUTHENTICATION_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Authorization decisions require a verified caller identity.",
                    )
                ],
            )
        ]


class SessionSecurityRule(BaseBlueprintRule):
    rule_id = "RULE-AUTH-003"
    name = "Session Security Rule"
    version = "1.0.0"
    description = "Enforces secure session management for web applications and dashboards."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        has_web_interface = any(i.type == "WEB_UI" for i in intent.interfaces)
        if has_web_interface:
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTERFACE",
                source_field="interfaces",
                evidence_text="Exposes WEB_UI interface requiring interactive session management",
            ))

        if intent.application_type in {"WEB_APPLICATION", "ADMIN_DASHBOARD", "SAAS_PLATFORM", "E_COMMERCE"}:
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text=f"Archetype '{intent.application_type}' maintains interactive user sessions",
            ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="SESSION_SECURITY_REQUIRED",
                title="Session Management & Cookie Hardening",
                description="Web sessions and authentication tokens must use secure storage attributes (HttpOnly, Secure, SameSite=Strict/Lax), strict timeouts, and cryptographic invalidation upon logout.",
                category="SESSION_SECURITY",
                severity="MEDIUM",
                priority="REQUIRED",
                mandatory=True,
                rationale="Interactive web interfaces are vulnerable to session hijacking and fixation unless strict cookie flags and token lifetimes are enforced.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
                security_invariant="session.is_active == True and session.is_expired == False",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="AUTHENTICATION_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Sessions are generated as a consequence of successful authentication.",
                    )
                ],
            )
        ]
