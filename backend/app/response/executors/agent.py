"""
Agent Suspension Response Executor.
Updates Agent.status to SUSPENDED so Step 10 AuthorizationService blocks all future requests.
"""

import uuid
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction


class AgentSuspensionExecutor(ResponseExecutor):
    action_type = ResponseActionType.SUSPEND_AGENT
    target_type = ResponseTargetType.AGENT
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        try:
            agent_uuid = uuid.UUID(action.target_id)
        except ValueError:
            return ResponseExecutionResult(
                status=ResponseStatus.FAILED,
                success=False,
                message=f"Target ID '{action.target_id}' is not a valid Agent UUID.",
                error="INVALID_TARGET_ID",
            )

        agent = await db.get(Agent, agent_uuid)
        if not agent:
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message=f"Agent '{action.target_id}' not found.",
                error="AGENT_NOT_FOUND",
            )

        before_state = {
            "agent_id": str(agent.id),
            "name": agent.name,
            "status": agent.status,
        }

        if agent.status == "SUSPENDED":
            return ResponseExecutionResult(
                status=ResponseStatus.COMPLETED,
                success=True,
                message=f"Agent '{agent.name}' is already suspended.",
                target_state_before=before_state,
                target_state_after=before_state,
                details={"suspended": False, "reason": "Already suspended"},
            )

        agent.status = "SUSPENDED"
        await db.commit()

        after_state = {
            "agent_id": str(agent.id),
            "name": agent.name,
            "status": "SUSPENDED",
        }

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"Agent '{agent.name}' ({agent.id}) successfully suspended.",
            target_state_before=before_state,
            target_state_after=after_state,
            details={"agent_id": str(agent.id), "status": "SUSPENDED"},
            post_action_evidence_payload={
                "event_type": "AGENT_SUSPENDED",
                "agent_id": str(agent.id),
                "name": agent.name,
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_suspend": True,
            "target_type": "AGENT",
            "target_id": action.target_id,
            "simulated_effect": "Would set Agent.status = 'SUSPENDED' in PostgreSQL",
        }
