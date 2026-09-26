from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class PaymentIdempotencyRule(BaseBlueprintRule):
    rule_id = "RULE-PAY-001"
    name = "Payment Operation Idempotency Rule"
    version = "1.0.0"
    description = "Enforces cryptographic idempotency keys and state locking for financial transactions."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        if intent.application_type == "PAYMENT_API":
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text="Application archetype is PAYMENT_API",
            ))

        for dd in intent.data_domains:
            if dd.domain in {"PAYMENT_DATA", "FINANCIAL_DATA"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="DATA_DOMAIN",
                    source_field="data_domains",
                    evidence_text=f"Handles sensitive domain '{dd.domain}'",
                ))

        for sc in intent.state_changes:
            if any(term in sc.name.upper() for term in ["PAYMENT", "CHARGE", "REFUND", "TRANSFER", "TRANSACTION", "INVOICE"]):
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTENT",
                    source_field="state_changes",
                    evidence_text=f"Financial state-changing operation '{sc.name}'",
                ))

        for wf in intent.workflows:
            if any(term in wf.name.upper() for term in ["PAYMENT", "CHARGE", "REFUND", "TRANSFER"]):
                evidence_items.append(RequirementEvidenceItem(
                    source_type="WORKFLOW",
                    source_field="workflows",
                    evidence_text=f"Financial workflow '{wf.name}'",
                ))

        for svc in intent.external_services:
            if svc.name.upper() in {"STRIPE", "PAYPAL", "BRAINTREE", "PLAID", "SQUARE"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="EXTERNAL_SERVICE",
                    source_field="external_services",
                    evidence_text=f"Integrated payment gateway '{svc.name}'",
                ))

        if not evidence_items:
            # Strictly negative: if no payment workflow/data, DO NOT generate
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED",
                title="Strict Payment Operation Idempotency",
                description="All financial mutation endpoints (charges, refunds, transfers) must enforce unique client-supplied idempotency keys to prevent duplicate execution during network retries.",
                category="PAYMENTS",
                severity="CRITICAL",
                priority="REQUIRED",
                mandatory=True,
                rationale="Financial operations without strict idempotency risk catastrophic double-debits, race conditions, and ledger divergence under client retries or network faults.",
                verification_strategy=["INTEGRATION_TEST", "DYNAMIC_TEST", "STATIC_ANALYSIS"],
                security_invariant="payment.idempotency_key IS UNIQUE AND atomic_execution(payment.idempotency_key)",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            ),
            BlueprintRequirementCandidate(
                requirement_key="PAYMENT_AUDIT_TRAIL_REQUIRED",
                title="Immutable Financial Audit Logging",
                description="Every payment attempt, transition, success, and failure must produce an immutable audit log record with actor identity, timestamp, amount, and gateway transaction identifiers.",
                category="AUDIT",
                severity="CRITICAL",
                priority="REQUIRED",
                mandatory=True,
                rationale="Financial transactions require an unbroken, non-repudiable audit ledger for regulatory compliance, fraud investigation, and reconciliation.",
                verification_strategy=["INTEGRATION_TEST", "STATIC_ANALYSIS"],
                security_invariant="audit_log.has_record_for_transaction(payment.id) == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED",
                        dependency_type="MUTUAL",
                        description="Audit entries must correlate with the idempotency key.",
                    )
                ],
            ),
        ]
