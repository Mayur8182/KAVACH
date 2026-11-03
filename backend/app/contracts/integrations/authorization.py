"""
Contract Engine integration with Step 10 Agent Identity and Authorization System.
Maps authenticated agent identity, assigned roles, and permission decisions into EvidenceContext.
"""

from typing import Any, Dict, List, Optional
from app.contracts.evaluator.context import EvidenceContext


class AuthorizationEvidenceAdapter:
    """
    Extracts Step 10 Authorization decisions and Agent credentials into
    an EvidenceContext for contract evaluation.
    """

    @staticmethod
    def build_authorization_context(
        agent_id: str,
        project_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        allowed: bool,
        trust_level: str = "MEDIUM",
        environment: str = "PRODUCTION",
        decision_id: Optional[str] = None,
        roles: Optional[List[str]] = None,
        permissions: Optional[List[str]] = None,
    ) -> EvidenceContext:
        ctx = EvidenceContext()
        ctx.set("subject.id", agent_id)
        ctx.set("subject.agent_id", agent_id)
        ctx.set("subject.type", "AGENT")
        ctx.set("subject.trust_level", trust_level)
        ctx.set("subject.environment", environment)
        ctx.set("subject.roles", roles or [])
        ctx.set("subject.permissions", permissions or [])

        ctx.set("action.type", action)

        ctx.set("resource.type", resource_type)
        ctx.set("resource.id", resource_id)
        ctx.set("resource.environment", environment)

        ctx.set("context.project_id", project_id)
        ctx.set("context.environment", environment)

        ctx.set("authorization.allowed", allowed)
        ctx.set("authorization.decision_id", decision_id or "")

        return ctx
