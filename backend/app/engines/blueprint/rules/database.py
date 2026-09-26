from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class SecureDatabaseAccessRule(BaseBlueprintRule):
    rule_id = "RULE-DB-001"
    name = "Secure Database Access & Injection Prevention"
    version = "1.0.0"
    description = "Enforces parameterized queries, ORM safety, and least-privilege database connections."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        for tech in intent.technologies:
            if tech.category == "DATABASE" or tech.name.upper() in {"POSTGRESQL", "MYSQL", "SQLITE", "MONGODB", "REDIS"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="TECHNOLOGY",
                    source_field="technologies",
                    evidence_text=f"Database engine '{tech.name}' ({tech.category}) utilized for persistent storage",
                ))

        if intent.state_changes:
            for sc in intent.state_changes:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTENT",
                    source_field="state_changes",
                    evidence_text=f"State-changing mutation '{sc.name}' on entity '{sc.target_entity}' persists to datastore",
                ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="SECURE_DATABASE_ACCESS_REQUIRED",
                title="Secure Parameterized Database Access",
                description="Database queries must strictly utilize parameterized prepared statements or safe ORM abstractions. Dynamic SQL string interpolation is prohibited.",
                category="DATABASE",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Applications interacting with relational or document databases must prevent SQL/NoSQL injection vulnerabilities through enforced parameterization.",
                verification_strategy=["STATIC_ANALYSIS", "DEPENDENCY_ANALYSIS"],
                security_invariant="query.is_parameterized == True and query.interpolates_raw_user_input == False",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]


class TenantIsolationRule(BaseBlueprintRule):
    rule_id = "RULE-DB-002"
    name = "Multi-Tenant Data Isolation Rule"
    version = "1.0.0"
    description = "Enforces tenant boundary isolation for SaaS and multi-tenant architectures."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        if intent.application_type == "SAAS_PLATFORM":
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text="SAAS_PLATFORM archetype inherently services multiple distinct tenant organizations",
            ))

        if "tenant" in intent.purpose.lower() or "multi-tenant" in intent.purpose.lower() or "organization" in intent.purpose.lower():
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="purpose",
                evidence_text=f"Intent purpose specifies tenant segmentation: '{intent.purpose}'",
            ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="TENANT_DATA_ISOLATION_REQUIRED",
                title="Strict Multi-Tenant Logical & Data Isolation",
                description="All database queries and data mutations must enforce explicit tenant scoping, preventing cross-tenant data leakage or unauthorized access.",
                category="DATA_SECURITY",
                severity="CRITICAL",
                priority="REQUIRED",
                mandatory=True,
                rationale="Multi-tenant architectures require cryptographic or structural tenant boundaries to prevent cross-account data spills.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
                security_invariant="user.tenant_id == resource.tenant_id",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="AUTHORIZATION_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Tenant scoping is enforced as part of authorization checks.",
                    )
                ],
            )
        ]
