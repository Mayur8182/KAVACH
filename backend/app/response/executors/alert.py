"""
Alert & Notification Response Executor.
Creates real security alerts and records audit events without fake external webhooks.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction
from app.services.audit_service import AuditService


class AlertExecutor(ResponseExecutor):
    action_type = ResponseActionType.ALERT
    target_type = ResponseTargetType.SERVICE
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        audit = AuditService(db)
        alert_details = {
            "action_id": str(action.id),
            "target_id": action.target_id,
            "target_type": action.target_type,
            "severity": action.severity,
            "violation_id": str(action.violation_id) if action.violation_id else None,
            "notification_status": "ALERT_RECORDED",
            "external_channel": "NOTIFICATION_NOT_CONFIGURED",
        }

        await audit.log_event(
            action="SECURITY_ALERT_EMITTED",
            resource_type=action.target_type,
            actor_type="SYSTEM",
            project_id=action.project_id,
            metadata=alert_details,
        )

        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message="Security alert recorded in audit trail. External notification is NOT_CONFIGURED.",
            target_state_before={"alert_active": False},
            target_state_after={"alert_active": True, "alert_id": str(action.id)},
            details=alert_details,
            post_action_evidence_payload={
                "event_type": "SECURITY_ALERT",
                "alert_id": str(action.id),
                "severity": action.severity,
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_alert": True,
            "target_type": action.target_type,
            "target_id": action.target_id,
            "notification_channel": "NOTIFICATION_NOT_CONFIGURED",
            "simulated_effect": "Would record audit alert event",
        }
