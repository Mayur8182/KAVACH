"""
Data-Flow Restriction Response Executor.
Enforces restrictions on inter-agent and egress data flows.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import RuntimeEnforcementRule, SecurityResponseAction


class DataFlowRestrictionExecutor(ResponseExecutor):
    action_type = ResponseActionType.RESTRICT_DATA_FLOW
    target_type = ResponseTargetType.DATA_FLOW
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        now = datetime.now(timezone.utc)
        expires_at = action.expires_at or (now + timedelta(hours=1))

        new_rule = RuntimeEnforcementRule(
            id=uuid.uuid4(),
            project_id=action.project_id,
            rule_type="DATA_FLOW_RESTRICTION",
            target_type="DATA_FLOW",
            target_id=action.target_id,
            action="BLOCK",
            reason=action.request.get("reason") or "Restricted by security response policy",
            source_violation_id=action.violation_id,
            expires_at=expires_at,
            status="ACTIVE",
            created_at=now,
        )
        db.add(new_rule)
        await db.commit()

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"Data flow '{action.target_id}' restricted until {expires_at.isoformat()}.",
            target_state_before={"restricted": False},
            target_state_after={"restricted": True, "rule_id": str(new_rule.id)},
            details={"rule_id": str(new_rule.id), "expires_at": expires_at.isoformat()},
            post_action_evidence_payload={
                "event_type": "DATA_FLOW_RESTRICTED",
                "target_id": action.target_id,
                "rule_id": str(new_rule.id),
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_restrict": True,
            "target_type": "DATA_FLOW",
            "target_id": action.target_id,
            "simulated_effect": "Would register data-flow restriction in active enforcement rules",
        }
