from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class InputValidationRule(BaseBlueprintRule):
    rule_id = "RULE-API-001"
    name = "Strict Input Validation Rule"
    version = "1.0.0"
    description = "Enforces strict boundary input validation and schema enforcement for all ingress interfaces."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        api_interfaces = {"REST_API", "GRAPHQL", "WEBHOOK", "WEB_UI", "CLI", "MCP_TOOL", "GRPC"}
        for iface in intent.interfaces:
            if iface.type in api_interfaces:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTERFACE",
                    source_field="interfaces",
                    evidence_text=f"Ingress boundary interface '{iface.type}' accepts external parameters and payloads",
                ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="INPUT_VALIDATION_REQUIRED",
                title="Strict Ingress Schema & Input Validation",
                description="All external input, request bodies, query parameters, and headers must be validated against deterministic schemas and strongly typed models before business processing.",
                category="INPUT_SECURITY",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Ingress parameters are untrusted. Lack of strict validation permits injection, type confusion, payload manipulation, and parser vulnerabilities.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST"],
                security_invariant="all(param.conforms_to_schema for param in request.parameters)",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]


class RateLimitingRule(BaseBlueprintRule):
    rule_id = "RULE-API-002"
    name = "Rate Limiting & Abuse Prevention Rule"
    version = "1.0.0"
    description = "Enforces traffic throttling and denial-of-service protections on network-exposed APIs."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        exposed_interfaces = {"REST_API", "GRAPHQL", "WEBHOOK", "WEB_UI"}
        for iface in intent.interfaces:
            if iface.type in exposed_interfaces:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTERFACE",
                    source_field="interfaces",
                    evidence_text=f"Publicly reachable interface '{iface.type}' is subject to request floods and brute force",
                ))

        if not evidence_items:
            return []

        has_sensitive_work = intent.application_type in {"PAYMENT_API", "AUTHENTICATION_SERVICE"} or any(
            dd.domain in {"PAYMENT_DATA", "SECRETS", "AUTHENTICATION_DATA"} for dd in intent.data_domains
        )
        severity = "HIGH" if has_sensitive_work else "MEDIUM"

        return [
            BlueprintRequirementCandidate(
                requirement_key="RATE_LIMITING_REQUIRED",
                title="API Rate Limiting & Abuse Protection",
                description="Endpoints must be shielded with rate limiting policies keyed by client identity, API token, or IP address to mitigate brute force, credential stuffing, and denial of service.",
                category="API_SECURITY",
                severity=severity,
                priority="REQUIRED",
                mandatory=True,
                rationale="Unbounded ingress endpoints allow resource exhaustion and automated attacks.",
                verification_strategy=["DYNAMIC_TEST", "RUNTIME_EVIDENCE"],
                security_invariant="caller.request_rate <= policy.rate_limit_per_minute",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]


class TransportSecurityRule(BaseBlueprintRule):
    rule_id = "RULE-API-003"
    name = "Transport Layer Security Rule"
    version = "1.0.0"
    description = "Enforces cryptographic transport security (TLS/HTTPS) for network communications."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        network_interfaces = {"REST_API", "GRAPHQL", "WEBHOOK", "WEB_UI", "GRPC"}
        for iface in intent.interfaces:
            if iface.type in network_interfaces:
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTERFACE",
                    source_field="interfaces",
                    evidence_text=f"Network interface '{iface.type}' transmits application data over network channels",
                ))

        if intent.deployment_context.environment.upper() in {"PRODUCTION", "STAGING"}:
            evidence_items.append(RequirementEvidenceItem(
                source_type="ENVIRONMENT",
                source_field="deployment_context.environment",
                evidence_text=f"Deployment environment '{intent.deployment_context.environment}' mandates TLS encryption",
            ))

        if not evidence_items:
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="TRANSPORT_SECURITY_REQUIRED",
                title="Strict Transport Layer Security (TLS)",
                description="All client-to-server and inter-service communications must be encrypted using modern TLS (TLS 1.2+ with forward secrecy) with HSTS headers enabled.",
                category="NETWORK",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Cleartext network transmissions expose tokens, credentials, and sensitive data to interception and tampering.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST", "RUNTIME_EVIDENCE"],
                security_invariant="connection.is_tls == True and connection.tls_version >= 1.2",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            )
        ]
