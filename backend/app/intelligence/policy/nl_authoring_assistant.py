"""
Kavach Phase 5: Natural Language Policy Authoring Assistant
Transforms natural-language security requirements into:
1. Structured Policy Intent (Intermediate Representation)
2. Validated Candidate Policy DSL
3. Plain-language explanation
4. Positive and negative unit test fixtures
Strictly enforces Rule 9.1: Draft-only generation, ZERO automatic activation.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.engines.policy.validator import validate_policy_definition
from app.intelligence.policy.models import (
    DecisionOutcome,
    EnforcementPoint,
    PolicyDomain,
    PolicyIntent,
    PolicyScope,
)
from app.intelligence.policy.content_hasher import compute_policy_content_hash

logger = logging.getLogger("kavach.policy.nl_assistant")


class NaturalLanguagePolicyAssistant:
    """
    Assists security engineers in authoring deterministic policies from requirements.
    Rule: A model-generated interpretation must NEVER silently become an enforceable rule.
    """

    @classmethod
    def draft_policy_from_natural_language(
        cls,
        prompt: str,
        domain: Optional[str] = None,
        scope: Optional[str] = "PROJECT",
        enforcement_point: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Translates a natural language requirement into a structured draft with tests.
        """
        p_clean = prompt.strip().lower()

        # 1. Infer Domain & Enforcement Point
        inferred_domain = PolicyDomain.APPLICATION
        if domain:
            try:
                inferred_domain = PolicyDomain(domain.upper())
            except ValueError:
                pass
        else:
            if any(k in p_clean for k in ["s3", "bucket", "cloud", "aws", "azure", "gcp", "iam", "ingress"]):
                inferred_domain = PolicyDomain.INFRASTRUCTURE
            elif any(k in p_clean for k in ["agent", "tool", "mcp", "bot", "ai"]):
                inferred_domain = PolicyDomain.AI_AGENT
            elif any(k in p_clean for k in ["cve", "package", "dependency", "npm", "pypi", "sbom", "license"]):
                inferred_domain = PolicyDomain.DEPENDENCY
            elif any(k in p_clean for k in ["docker", "container", "image", "k8s", "kubernetes", "root"]):
                inferred_domain = PolicyDomain.CONTAINER
            elif any(k in p_clean for k in ["mfa", "role", "privilege", "identity", "credential"]):
                inferred_domain = PolicyDomain.IDENTITY

        # 2. Build Structured Policy Intent (IR)
        intent = cls._synthesize_policy_intent(prompt=prompt, domain=inferred_domain, scope=scope)

        # 3. Generate Canonical Policy Definition
        definition = cls._generate_policy_definition(intent=intent)

        # 4. Static Validation Check
        is_valid, errors, parsed = validate_policy_definition(definition)
        if not is_valid:
            logger.error(f"Generated policy failed static validation: {errors}")
            raise ValueError(f"Draft policy validation error: {'; '.join(errors)}")

        content_hash = compute_policy_content_hash(definition)

        # 5. Synthesize Positive and Negative Test Case Fixtures
        test_cases = cls._synthesize_test_cases(intent=intent)

        # 6. Plain-Language Explanation
        explanation = cls._generate_plain_language_explanation(intent=intent, definition=definition)

        return {
            "intent": intent.model_dump(),
            "definition": definition,
            "policy_content_hash": content_hash,
            "domain": inferred_domain.value,
            "scope": scope,
            "explanation": explanation,
            "test_cases": test_cases,
            "is_enforceable": False,  # Mandatory: drafts cannot enforce!
            "status": "DRAFT",
            "message": "Policy draft created successfully with test fixtures. Human review and approval required before activation.",
        }

    @classmethod
    def _synthesize_policy_intent(cls, prompt: str, domain: PolicyDomain, scope: Optional[str]) -> PolicyIntent:
        p_clean = prompt.lower()

        # Detect non-exemptible
        is_non_exemptible = any(k in p_clean for k in ["no exception", "never allow", "non-exemptible", "mandatory baseline", "zero waiver"])

        # Determine subject, resource, action based on domain
        if domain == PolicyDomain.INFRASTRUCTURE:
            return PolicyIntent(
                subject="cloud_storage",
                resource="storage_bucket",
                action="MODIFY_INFRASTRUCTURE",
                domain=domain,
                scope=PolicyScope.GLOBAL if "all" in p_clean or "global" in p_clean else PolicyScope.PROJECT,
                conditions=[{"attribute": "is_public", "operator": "EQUALS", "value": True}],
                decision=DecisionOutcome.DENY,
                is_non_exemptible=is_non_exemptible,
                evidence_requirements=["cloud_inventory", "iac_scanner"],
                remediation_guidance="Disable public read/write access policies and enforce bucket encryption.",
                enforcement_point=EnforcementPoint.CI_CD,
            )
        elif domain == PolicyDomain.AI_AGENT:
            return PolicyIntent(
                subject="ai_agent",
                resource="policy_and_governance",
                action="EXECUTE_TOOL",
                domain=domain,
                scope=PolicyScope.GLOBAL,
                conditions=[{"attribute": "prohibit_self_modification", "operator": "EQUALS", "value": True}],
                decision=DecisionOutcome.DENY,
                is_non_exemptible=True,  # Agent self-authorization is always non-exemptible
                evidence_requirements=["mcp_gateway_identity"],
                remediation_guidance="AI agents cannot modify or approve security governance policies authorizing their own tasks.",
                enforcement_point=EnforcementPoint.MCP_GATEWAY,
            )
        elif domain == PolicyDomain.DEPENDENCY:
            return PolicyIntent(
                subject="software_dependency",
                resource="application_packages",
                action="MERGE",
                domain=domain,
                scope=PolicyScope.PROJECT,
                conditions=[
                    {"attribute": "severity", "operator": "EQUALS", "value": "CRITICAL"},
                    {"attribute": "cisa_kev", "operator": "EQUALS", "value": True},
                ],
                decision=DecisionOutcome.DENY,
                is_non_exemptible=is_non_exemptible,
                evidence_requirements=["osv_scanner", "cisa_kev_catalog"],
                remediation_guidance="Upgrade affected package to patched version or replace with approved alternative.",
                enforcement_point=EnforcementPoint.GITHUB_PR,
            )
        else:
            # Default Application / Deployment security
            return PolicyIntent(
                subject="deployment_artifact",
                resource="production_environment",
                action="DEPLOY",
                domain=PolicyDomain.APPLICATION,
                scope=PolicyScope.PROJECT,
                conditions=[
                    {"attribute": "severity", "operator": "IN", "value": ["CRITICAL", "HIGH"]},
                    {"attribute": "is_reachable", "operator": "EQUALS", "value": True},
                ],
                decision=DecisionOutcome.DENY,
                is_non_exemptible=is_non_exemptible,
                evidence_requirements=["sast_scanner", "reachability_analyzer"],
                remediation_guidance="Resolve reachable critical vulnerability before deploying to production.",
                enforcement_point=EnforcementPoint.DEPLOYMENT_GATE,
            )

    @classmethod
    def _generate_policy_definition(cls, intent: PolicyIntent) -> Dict[str, Any]:
        """
        Assembles a valid PolicyDefinition dictionary adhering to Policy DSL schema.
        """
        when_block: Dict[str, Any] = {}

        if intent.domain == PolicyDomain.INFRASTRUCTURE:
            when_block["cloud_resource"] = {"is_public": True}
            rule_name = "block-public-cloud-storage"
            msg = "Publicly exposed cloud storage resources are strictly prohibited."
        elif intent.domain == PolicyDomain.AI_AGENT:
            when_block["agent_tool"] = {"prohibit_self_modification": True}
            rule_name = "prohibit-agent-governance-tampering"
            msg = "AI agents cannot modify or approve security policies authorizing their current task."
        elif intent.domain == PolicyDomain.DEPENDENCY:
            when_block["finding"] = {"severity": "CRITICAL", "is_reachable": True}
            rule_name = "block-critical-reachable-vulnerabilities"
            msg = "Dependencies with critical reachable vulnerabilities are blocked."
        else:
            when_block["environment"] = "production"
            when_block["operation"] = "DEPLOY"
            when_block["finding"] = {"severity": ["CRITICAL", "HIGH"], "is_reachable": True}
            rule_name = "block-production-critical-reachable-issues"
            msg = "Production deployment blocked: critical reachable security vulnerabilities detected."

        return {
            "name": f"policy-{intent.domain.value.lower()}-{rule_name}",
            "description": f"Automated governance rule for {intent.domain.value}: {rule_name}",
            "scope": {
                "environment": "production" if intent.domain == PolicyDomain.APPLICATION else "*",
                "operation": intent.action,
                "resource_type": intent.resource,
            },
            "fail_closed": "BLOCK",
            "priority": 100,
            "rules": [
                {
                    "name": rule_name,
                    "rule_key": rule_name.replace("-", "_"),
                    "description": msg,
                    "when": when_block,
                    "decision": "BLOCK" if intent.decision == DecisionOutcome.DENY else "WARN",
                    "priority": 100,
                    "message": msg,
                    "is_non_exemptible": intent.is_non_exemptible,
                    "reason_code": f"RULE_{rule_name.upper().replace('-', '_')}",
                }
            ],
        }

    @classmethod
    def _synthesize_test_cases(cls, intent: PolicyIntent) -> List[Dict[str, Any]]:
        """
        Produces positive (should allow) and negative (should deny) test fixtures.
        """
        if intent.domain == PolicyDomain.INFRASTRUCTURE:
            return [
                {
                    "name": "Negative Test: Public bucket is denied",
                    "description": "Ensures an S3 bucket configured as public triggers DENY.",
                    "input_fixture": {
                        "environment": "production",
                        "operation": {"type": "MODIFY_INFRASTRUCTURE", "resource_id": "s3_prod_data"},
                        "cloud_resources": [{"provider": "AWS", "name": "s3_prod_data", "is_public": True, "encrypted": True}],
                    },
                    "expected_decision": "deny",
                },
                {
                    "name": "Positive Test: Private encrypted bucket is allowed",
                    "description": "Ensures an internal private bucket passes cleanly.",
                    "input_fixture": {
                        "environment": "production",
                        "operation": {"type": "MODIFY_INFRASTRUCTURE", "resource_id": "s3_internal"},
                        "cloud_resources": [{"provider": "AWS", "name": "s3_internal", "is_public": False, "encrypted": True}],
                    },
                    "expected_decision": "allow",
                },
            ]
        elif intent.domain == PolicyDomain.AI_AGENT:
            return [
                {
                    "name": "Negative Test: Agent modifying security policy is denied",
                    "description": "Ensures agents attempting self-approval or policy alteration are blocked.",
                    "input_fixture": {
                        "actor": {"type": "AI_AGENT", "id": "remediation_agent"},
                        "operation": {"type": "EXECUTE_TOOL", "resource_id": "policy_governance_engine", "metadata": {"is_write": True}},
                    },
                    "expected_decision": "deny",
                },
                {
                    "name": "Positive Test: Agent reading safe tool is allowed",
                    "description": "Ensures normal tool reads by agents proceed.",
                    "input_fixture": {
                        "actor": {"type": "AI_AGENT", "id": "remediation_agent"},
                        "operation": {"type": "EXECUTE_TOOL", "resource_id": "code_search_tool", "metadata": {"is_write": False}},
                    },
                    "expected_decision": "allow",
                },
            ]
        else:
            return [
                {
                    "name": "Negative Test: Reachable critical finding blocks production deploy",
                    "description": "Ensures a critical vulnerability with reachability triggers DENY.",
                    "input_fixture": {
                        "environment": "production",
                        "operation": {"type": "DEPLOY", "environment": "production"},
                        "findings": [{"id": "f_crit_1", "severity": "CRITICAL", "is_reachable": True, "rule_id": "CWE-89"}],
                    },
                    "expected_decision": "deny",
                },
                {
                    "name": "Positive Test: Clean repository without critical findings deploys successfully",
                    "description": "Ensures clean scans result in ALLOW.",
                    "input_fixture": {
                        "environment": "production",
                        "operation": {"type": "DEPLOY", "environment": "production"},
                        "findings": [],
                    },
                    "expected_decision": "allow",
                },
            ]

    @classmethod
    def _generate_plain_language_explanation(cls, intent: PolicyIntent, definition: Dict[str, Any]) -> str:
        exempt_str = "Strictly non-exemptible (no waivers allowed)." if intent.is_non_exemptible else "Exceptions and waivers may be requested with risk owner justification."
        return (
            f"### Policy Governance Rule Explanation\n\n"
            f"- **Domain**: `{intent.domain.value}`\n"
            f"- **Target Operation**: `{intent.action}` on `{intent.resource}`\n"
            f"- **Enforcement Action**: **{intent.decision.value.upper()}**\n"
            f"- **Waiver Policy**: {exempt_str}\n"
            f"- **Authoritative Evidence Needed**: {', '.join(intent.evidence_requirements)}\n\n"
            f"**Rule Logic**:\n"
            f"When an operation of type `{intent.action}` occurs, Kavach inspects authoritative context facts. "
            f"If conditions match, the action is evaluated as **`{intent.decision.value.upper()}`** and blocked at the `{intent.enforcement_point.value}` control point."
        )

