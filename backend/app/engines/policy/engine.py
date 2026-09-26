from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.engines.policy.composer import PolicyComposer
from app.engines.policy.models import (
    DecisionContext,
    DecisionResult,
    DecisionType,
    SimulationResult,
)


class PolicyEngine:
    """
    Central deterministic policy evaluation engine.
    Consumes real project intent, blueprints, scan evidence, actor, operation, and active policies.
    Produces immutable ALLOW, WARN, BLOCK, REQUIRE_APPROVAL decisions with full evidence traceability.
    """

    def __init__(self, composer: Optional[PolicyComposer] = None) -> None:
        self.composer = composer or PolicyComposer()

    def evaluate(
        self,
        context: DecisionContext,
        active_policies: List[Tuple[str, int, Dict[str, Any]]],
    ) -> DecisionResult:
        """
        Executes policy evaluation against real context and returns deterministic DecisionResult.
        """
        return self.composer.compose(context=context, policies=active_policies)

    def simulate(
        self,
        context: DecisionContext,
        policies: List[Tuple[str, int, Dict[str, Any]]],
    ) -> SimulationResult:
        """
        Executes a dry-run policy evaluation without enforcing the decision or modifying state.
        Allows testing policy changes safely.
        """
        result = self.composer.compose(context=context, policies=policies)
        return SimulationResult(
            decision=result.decision,
            reason=result.reason,
            policy_version_ids=result.policy_version_ids,
            matched_rules=result.matched_rules,
            evidence=result.evidence,
            simulated_at=datetime.now(timezone.utc),
            would_block=result.decision == DecisionType.BLOCK,
            would_require_approval=result.decision == DecisionType.REQUIRE_APPROVAL,
            would_warn=result.decision == DecisionType.WARN,
            would_allow=result.decision == DecisionType.ALLOW,
        )


# Global singleton instance
policy_engine = PolicyEngine()
