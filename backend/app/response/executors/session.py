"""
Session Revocation Response Executor.
Revokes active MCP sessions in the database so subsequent tool calls or authentication checks fail.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp import MCPSession
from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction


class SessionRevocationExecutor(ResponseExecutor):
    action_type = ResponseActionType.REVOKE_SESSION
    target_type = ResponseTargetType.SESSION
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        now = datetime.now(timezone.utc)
        target_id = action.target_id

        # Try interpreting target_id as UUID (session_id) or agent_id string
        target_uuid = None
        try:
            target_uuid = uuid.UUID(target_id)
        except ValueError:
            pass

        sessions = []
        if target_uuid:
            stmt = select(MCPSession).where(
                (MCPSession.id == target_uuid) | (MCPSession.agent_id == target_uuid)
            )
            sessions = (await db.execute(stmt)).scalars().all()
        else:
            # Match by principal
            stmt = select(MCPSession).where(MCPSession.authenticated_principal == target_id)
            sessions = (await db.execute(stmt)).scalars().all()

        if not sessions:
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message=f"No matching session found for target '{target_id}'.",
                details={"target_id": target_id},
                error="SESSION_NOT_FOUND",
            )

        before_state = {
            "session_count": len(sessions),
            "sessions": [{"id": str(s.id), "status": s.status} for s in sessions],
        }

        revoked_count = 0
        for s in sessions:
            if s.status != "REVOKED":
                s.status = "REVOKED"
                s.terminated_at = now
                revoked_count += 1

        await db.commit()

        after_state = {
            "revoked_count": revoked_count,
            "sessions": [{"id": str(s.id), "status": s.status} for s in sessions],
        }

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"Successfully revoked {revoked_count} active session(s) for target '{target_id}'.",
            target_state_before=before_state,
            target_state_after=after_state,
            details={"revoked_count": revoked_count},
            post_action_evidence_payload={
                "event_type": "SESSION_REVOCATION",
                "target_id": target_id,
                "revoked_sessions": [str(s.id) for s in sessions],
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_revoke": True,
            "target_type": "SESSION",
            "target_id": action.target_id,
            "simulated_effect": "Would update MCPSession.status = 'REVOKED' in PostgreSQL",
        }
