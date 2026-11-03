"""
Contract Engine integration with Step 11 Delegation and Data-Flow Control.
Extracts authoritative delegation and data-flow evidence for contract invariant evaluation.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from app.contracts.evaluator.context import EvidenceContext


class DelegationEvidenceAdapter:
    """
    Extracts Step 11 AgentDelegation and AgentDataFlow state into
    an EvidenceContext for contract evaluation.
    """

    @staticmethod
    def build_delegation_context(
        delegator_id: str,
        delegate_id: str,
        delegator_authority: List[str],
        delegate_authority: List[str],
        delegation_id: Optional[str] = None,
        depth: int = 1,
        expires_at: Optional[datetime] = None,
        allow_further_delegation: bool = False,
        status: str = "ACTIVE",
    ) -> EvidenceContext:
        ctx = EvidenceContext()
        ctx.set("delegation.id", delegation_id or "del-test-1")
        ctx.set("delegation.status", status)
        ctx.set("delegation.depth", depth)
        ctx.set("delegation.expires_at", (expires_at or datetime.now(timezone.utc)).isoformat())
        ctx.set("delegation.allow_further_delegation", allow_further_delegation)
        ctx.set("delegation.parent_agent_id", delegator_id)
        ctx.set("delegation.delegate_agent_id", delegate_id)
        ctx.set("delegation.delegator_authority", delegator_authority)
        ctx.set("delegation.delegate_authority", delegate_authority)

        # Map to subject / resource namespaces for generic contract DSL compatibility
        ctx.set("subject.agent_id", delegate_id)
        ctx.set("subject.type", "AGENT")
        ctx.set("subject.delegation_depth", depth)
        ctx.set("resource.delegator_agent_id", delegator_id)
        ctx.set("agent.authority", delegate_authority)
        ctx.set("delegated_authority", delegator_authority)

        return ctx

    @staticmethod
    def build_data_flow_context(
        source_agent_id: str,
        destination_agent_id: str,
        data_classification: str,
        purpose: str,
        allowed: bool,
        destination_allowed_classification: Optional[str] = None,
    ) -> EvidenceContext:
        ctx = EvidenceContext()
        ctx.set("data_flow.source", source_agent_id)
        ctx.set("data_flow.destination", destination_agent_id)
        ctx.set("data_flow.classification", data_classification)
        ctx.set("data_flow.purpose", purpose)
        ctx.set("data_flow.allowed", allowed)

        ctx.set("subject.agent_id", source_agent_id)
        ctx.set("subject.type", "AGENT")
        ctx.set("action.type", "SEND")
        ctx.set("resource.type", "DATA")

        if destination_allowed_classification:
            ctx.set("destination.allowed_classification", destination_allowed_classification)

        return ctx
