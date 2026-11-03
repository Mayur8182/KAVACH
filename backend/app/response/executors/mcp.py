"""
MCP Tool Blocking Response Executor.
Creates active runtime enforcement rules to deny unauthorized MCP tool invocations in real-time.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import RuntimeEnforcementRule, SecurityResponseAction


class MCPBlockExecutor(ResponseExecutor):
    action_type = ResponseActionType.DENY_TOOL_CALL
    target_type = ResponseTargetType.MCP_TOOL_CALL
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        now = datetime.now(timezone.utc)
        expires_at = action.expires_at or (now + timedelta(minutes=30))

        # 1. Inspect existing active rule for this target to prevent duplication
        stmt = select(RuntimeEnforcementRule).where(
            RuntimeEnforcementRule.project_id == action.project_id,
            RuntimeEnforcementRule.target_id == action.target_id,
            RuntimeEnforcementRule.status == "ACTIVE",
            RuntimeEnforcementRule.expires_at > now,
        )
        existing = (await db.execute(stmt)).scalars().first()

        before_state = {
            "is_blocked": existing is not None,
            "existing_rule_id": str(existing.id) if existing else None,
        }

        if existing:
            # Refresh expiration
            existing.expires_at = expires_at
            await db.commit()
            rule_id = existing.id
        else:
            new_rule = RuntimeEnforcementRule(
                id=uuid.uuid4(),
                project_id=action.project_id,
                rule_type="MCP_TOOL_BLOCK",
                target_type="MCP_TOOL_CALL",
                target_id=action.target_id,
                action="DENY",
                reason=action.request.get("reason") or "Denied by runtime security enforcement response",
                source_violation_id=action.violation_id,
                expires_at=expires_at,
                status="ACTIVE",
                created_at=now,
            )
            db.add(new_rule)
            await db.commit()
            rule_id = new_rule.id

        after_state = {
            "is_blocked": True,
            "rule_id": str(rule_id),
            "expires_at": expires_at.isoformat(),
        }

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"MCP tool '{action.target_id}' blocked in runtime gateway until {expires_at.isoformat()}.",
            target_state_before=before_state,
            target_state_after=after_state,
            details={"rule_id": str(rule_id), "expires_at": expires_at.isoformat()},
            post_action_evidence_payload={
                "event_type": "ENFORCEMENT_RULE_ACTIVATED",
                "target_type": "MCP_TOOL_CALL",
                "target_id": action.target_id,
                "action": "DENY",
                "expires_at": expires_at.isoformat(),
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_block": True,
            "target_type": "MCP_TOOL_CALL",
            "target_id": action.target_id,
            "simulated_effect": "Would register ACTIVE enforcement rule in MCP Gateway",
            "expires_at": (action.expires_at or (datetime.now(timezone.utc) + timedelta(minutes=30))).isoformat(),
        }
