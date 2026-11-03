import uuid
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.policy.engine import policy_engine
from app.engines.policy.models import (
    ActorContext,
    DecisionContext,
    DecisionResult,
    DecisionType,
    OperationContext,
)
from app.mcp.errors import MCPApprovalRequiredError, MCPPolicyBlockedError
from app.mcp.schemas import MCPContext, ToolDefinition
from app.repositories.policy_repository import PolicyRepository


class MCPPolicyEvaluator:
    """
    Evaluates every MCP tool call through the deterministic Step 7 Policy Engine.
    Ensures that LLMs and Agents cannot bypass security policies.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.policy_repo = PolicyRepository(db)

    async def evaluate(
        self,
        context: MCPContext,
        tool: ToolDefinition,
        arguments: Dict[str, Any],
    ) -> DecisionResult:
        """
        Gathers project policy context and evaluates the operation.
        Returns the deterministic DecisionResult (ALLOW, WARN, BLOCK, REQUIRE_APPROVAL).
        """
        # Map tool to operation name
        operation_name = f"MCP_TOOL_{tool.name.upper()}"

        # 1. Fetch active policies for project
        policies = await self.policy_repo.list_policies_for_project(
            project_id=context.identity.project_id,
            active_only=True,
        )

        policy_tuples = []
        for pol in policies:
            if pol.versions:
                latest_ver = pol.versions[0]
                policy_tuples.append((pol.name, latest_ver.version, latest_ver.definition))

        # 2. Build DecisionContext
        actor = ActorContext(
            type="AGENT",
            id=str(context.identity.agent_id),
            name=context.identity.agent_name,
            roles=[context.identity.agent_type, context.identity.trust_level],
        )

        operation = OperationContext(
            type=operation_name,
            environment=context.metadata.get("environment", "development"),
            resource_type=tool.category,
            metadata=arguments,
        )

        decision_context = DecisionContext(
            project_id=str(context.identity.project_id),
            actor=actor,
            operation=operation,
            findings=[],
            verifications=[],
        )

        # 3. Deterministic Evaluation through PolicyEngine
        decision_result = policy_engine.evaluate(
            context=decision_context,
            active_policies=policy_tuples,
        )

        return decision_result
