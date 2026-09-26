from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class WebhookAuthenticityRule(BaseBlueprintRule):
    rule_id = "RULE-HOOK-001"
    name = "Webhook Signature & Authenticity Rule"
    version = "1.0.0"
    description = "Enforces cryptographic signature verification (HMAC) on incoming webhook payloads."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        for iface in intent.interfaces:
            if iface.type == "WEBHOOK":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTERFACE",
                    source_field="interfaces",
                    evidence_text=f"Exposes incoming WEBHOOK receiver: '{iface.description}'",
                ))

        for actor in intent.actors:
            if actor.type == "WEBHOOK_PROVIDER":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="ACTOR",
                    source_field="actors",
                    evidence_text=f"Integrates with external webhook provider actor '{actor.name}'",
                ))

        for svc in intent.external_services:
            if "webhook" in svc.purpose.lower() or svc.direction in {"INBOUND", "BIDIRECTIONAL"}:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="EXTERNAL_SERVICE",
                    source_field="external_services",
                    evidence_text=f"External service '{svc.name}' communicates via inbound webhooks",
                ))

        if not evidence_items:
            # Strictly negative: if no webhook interface/provider, DO NOT generate
            return []

        is_critical = any(dd.domain in {"PAYMENT_DATA", "FINANCIAL_DATA"} for dd in intent.data_domains) or intent.application_type == "PAYMENT_API"
        severity = "CRITICAL" if is_critical else "HIGH"

        return [
            BlueprintRequirementCandidate(
                requirement_key="WEBHOOK_AUTHENTICITY_REQUIRED",
                title="Cryptographic Webhook Signature Verification",
                description="The application must verify the cryptographic signature (e.g. HMAC-SHA256) of every incoming webhook using constant-time comparison before deserializing or processing the event payload.",
                category="WEBHOOKS",
                severity=severity,
                priority="REQUIRED",
                mandatory=True,
                rationale="The application accepts external webhook requests from third-party providers. The application must distinguish legitimate provider events from forged requests before processing state changes.",
                verification_strategy=["STATIC_ANALYSIS", "INTEGRATION_TEST", "DYNAMIC_TEST"],
                security_invariant="constant_time_compare(provider_signature, computed_hmac(raw_payload, webhook_secret)) == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            ),
            BlueprintRequirementCandidate(
                requirement_key="WEBHOOK_REPLAY_PROTECTION_REQUIRED",
                title="Webhook Replay Attack Protection",
                description="Webhook receivers must validate the timestamp in header signatures against a strict tolerance window (e.g., 300s) and track event IDs to reject replayed requests.",
                category="WEBHOOKS",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Valid signatures can be captured and replayed by network adversaries unless timestamp freshness and event deduplication are strictly enforced.",
                verification_strategy=["INTEGRATION_TEST", "DYNAMIC_TEST"],
                security_invariant="abs(current_time - webhook.timestamp) <= 300 and not event_seen(webhook.event_id)",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="WEBHOOK_AUTHENTICITY_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Replay validation is performed during signature check.",
                    )
                ],
            ),
        ]
