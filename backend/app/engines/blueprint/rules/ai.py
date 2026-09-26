from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import (
    BlueprintRequirementCandidate,
    RequirementEvidenceItem,
    RequirementDependencyItem,
)
from app.engines.blueprint.rules.base import BaseBlueprintRule


class AiAgentSecurityRule(BaseBlueprintRule):
    rule_id = "RULE-AI-001"
    name = "AI Agent Identity & Boundary Enforcement"
    version = "1.0.0"
    description = "Enforces cryptographic agent identity and deterministic tool authorization gates."

    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        evidence_items: List[RequirementEvidenceItem] = []

        if intent.application_type in {"AI_AGENT", "AI_AGENT_PLATFORM"}:
            evidence_items.append(RequirementEvidenceItem(
                source_type="INTENT",
                source_field="application_type",
                evidence_text=f"Application archetype is '{intent.application_type}'",
            ))

        for actor in intent.actors:
            if actor.type == "AI_AGENT":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="ACTOR",
                    source_field="actors",
                    evidence_text=f"AI Agent actor '{actor.name}' participates in execution flow",
                ))

        for iface in intent.interfaces:
            if iface.type == "MCP_TOOL":
                evidence_items.append(RequirementEvidenceItem(
                    source_type="INTERFACE",
                    source_field="interfaces",
                    evidence_text="Exposes MCP_TOOL interface for automated agent execution",
                ))

        if not evidence_items:
            # Strictly negative: if not an AI agent system, DO NOT generate
            return []

        return [
            BlueprintRequirementCandidate(
                requirement_key="AI_AGENT_IDENTITY_REQUIRED",
                title="Cryptographic AI Agent Identity & Provenance",
                description="Every AI agent acting within the system must possess a distinct, non-forgeable identity credential to ensure all actions and tool calls are attributed accurately.",
                category="AI_SECURITY",
                severity="HIGH",
                priority="REQUIRED",
                mandatory=True,
                rationale="Autonomous agents act on behalf of users or systems. Without distinct agent identity, accountability and blast-radius containment are impossible.",
                verification_strategy=["STATIC_ANALYSIS", "RUNTIME_EVIDENCE"],
                security_invariant="agent.identity.is_cryptographically_signed == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
            ),
            BlueprintRequirementCandidate(
                requirement_key="AI_TOOL_AUTHORIZATION_REQUIRED",
                title="Deterministic AI Tool Call Authorization Gate",
                description="Every tool call proposed by an AI model must pass through a deterministic policy gateway verifying caller identity, permissions, parameters, and risk level prior to execution.",
                category="AGENT_SECURITY",
                severity="CRITICAL",
                priority="REQUIRED",
                mandatory=True,
                rationale="Autonomous tool invocation without deterministic policy gates exposes systems to prompt injection, model confusion, and unauthorized state changes.",
                verification_strategy=["STATIC_ANALYSIS", "DYNAMIC_TEST", "RUNTIME_EVIDENCE"],
                security_invariant="policy_engine.allows_tool_execution(agent.id, tool.name, tool.arguments) == True",
                source_rule_id=self.rule_id,
                source_rule_version=self.version,
                evidence=evidence_items,
                dependencies=[
                    RequirementDependencyItem(
                        depends_on_key="AI_AGENT_IDENTITY_REQUIRED",
                        dependency_type="PREREQUISITE",
                        description="Tool authorization requires a verified agent identity.",
                    )
                ],
            ),
        ]
