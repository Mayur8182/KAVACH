"""
Delegation Revocation Response Executor.
Integrates with Step 11 DelegationService to revoke delegated authority and prune the authority graph.
"""

import uuid
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.delegation.service import DelegationService
from app.models.delegation import AgentDelegation
from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction


class DelegationRevocationExecutor(ResponseExecutor):
    action_type = ResponseActionType.REVOKE_DELEGATION
    target_type = ResponseTargetType.DELEGATION
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        delegation_service = DelegationService(db)

        try:
            delegation_uuid = uuid.UUID(action.target_id)
        except ValueError:
            return ResponseExecutionResult(
                status=ResponseStatus.FAILED,
                success=False,
                message=f"Target ID '{action.target_id}' is not a valid delegation UUID.",
                error="INVALID_TARGET_ID",
            )

        stmt = select(AgentDelegation).where(AgentDelegation.id == delegation_uuid)
        delegation = (await db.execute(stmt)).scalar_one_or_none()
        if not delegation:
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message=f"Delegation '{action.target_id}' not found.",
                error="DELEGATION_NOT_FOUND",
            )

        before_state = {
            "delegation_id": str(delegation.id),
            "status": delegation.status,
            "delegator_agent_id": str(delegation.delegator_agent_id),
            "delegate_agent_id": str(delegation.delegate_agent_id),
        }

        if delegation.status == "REVOKED":
            return ResponseExecutionResult(
                status=ResponseStatus.COMPLETED,
                success=True,
                message=f"Delegation '{action.target_id}' was already revoked.",
                target_state_before=before_state,
                target_state_after=before_state,
                details={"revoked": False, "reason": "Already revoked"},
            )

        # Execute revocation in Step 11 DelegationService
        revoked_ids = await delegation_service.revoke_delegation(
            delegation_id=delegation_uuid,
            actor_id=action.requested_by_id,
            reason=action.request.get("reason") or "Revoked by runtime security response action",
        )
        await db.refresh(delegation)

        after_state = {
            "delegation_id": str(delegation.id),
            "status": delegation.status,
            "revoked_at": delegation.revoked_at.isoformat() if delegation.revoked_at else None,
        }

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"Delegation '{action.target_id}' successfully revoked with cascading subtree revocation.",
            target_state_before=before_state,
            target_state_after=after_state,
            details={"revoked_id": str(delegation.id), "revoked_count": len(revoked_ids)},
            post_action_evidence_payload={
                "event_type": "DELEGATION_REVOCATION",
                "delegation_id": str(delegation.id),
                "delegator_agent_id": str(delegation.delegator_agent_id),
                "delegate_agent_id": str(delegation.delegate_agent_id),
                "status": "REVOKED",
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_revoke": True,
            "target_type": "DELEGATION",
            "target_id": action.target_id,
            "simulated_effect": "Would invoke DelegationService.revoke_delegation and cascade to downstream edges",
        }
