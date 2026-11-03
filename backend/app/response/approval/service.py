"""
Response Approval Service for Step 14.
Manages approval workflows for high-risk response actions.
Enforces SELF-APPROVAL PREVENTION: requested_by == approved_by is strictly REJECTED.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.policy import SecurityApproval, SecurityDecision
from app.response.models import SecurityResponseAction


class ResponseApprovalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_approval_request(
        self,
        action: SecurityResponseAction,
        ttl_minutes: int = 60,
    ) -> SecurityApproval:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=ttl_minutes)

        # Create underlying SecurityDecision for traceability
        decision_record = SecurityDecision(
            id=uuid.uuid4(),
            project_id=action.project_id,
            actor_type=action.requested_by_type or "USER",
            actor_id=action.requested_by_id or "system",
            operation_type="RESPONSE_ACTION",
            resource_type=action.target_type,
            resource_id=action.target_id,
            environment="production",
            decision="REQUIRE_APPROVAL",
            reason=f"Approval required for response action {action.action_type} on {action.target_id}",
            policy_version_ids=[],
            context_snapshot={
                "action_id": str(action.id),
                "action_type": action.action_type,
                "target_id": action.target_id,
                "target_type": action.target_type,
            },
            created_at=now,
        )
        self.db.add(decision_record)
        await self.db.flush()

        approval = SecurityApproval(
            id=uuid.uuid4(),
            decision_id=decision_record.id,
            status="PENDING",
            requested_by=action.requested_by_id,
            reason=f"Approval required for response action {action.action_type} on {action.target_id}",
            requested_at=now,
            expires_at=expires_at,
        )
        self.db.add(approval)
        await self.db.commit()
        await self.db.refresh(approval)

        action.approval_id = approval.id
        action.status = "PENDING_APPROVAL"
        await self.db.commit()
        await self.db.refresh(action)

        return approval

    async def process_approval(
        self,
        action: SecurityResponseAction,
        approver_id: str,
        decision: str,  # "APPROVED" | "REJECTED"
        reason: str,
    ) -> Dict[str, Any]:
        """
        Processes human approval or rejection with strict self-approval check.
        """
        # Self-approval check
        if action.requested_by_id == approver_id:
            return {
                "success": False,
                "error": "SELF_APPROVAL_FORBIDDEN",
                "message": "Self-approval is forbidden: requester cannot approve their own high-risk response action.",
            }

        now = datetime.now(timezone.utc)
        if action.approval_id:
            approval = await self.db.get(SecurityApproval, action.approval_id)
            if approval:
                if approval.status != "PENDING":
                    return {
                        "success": False,
                        "error": "APPROVAL_NOT_PENDING",
                        "message": f"Approval is already in status {approval.status}.",
                    }
                if approval.expires_at:
                    exp = approval.expires_at
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    if exp < now:
                        approval.status = "EXPIRED"
                        action.status = "EXPIRED"
                        await self.db.commit()
                        return {
                            "success": False,
                            "error": "APPROVAL_EXPIRED",
                            "message": "Approval request has expired.",
                        }

                approval.status = decision
                approval.approved_by = approver_id
                approval.approval_notes = reason
                approval.approved_at = now

        if decision == "APPROVED":
            action.status = "APPROVED"
            action.approved_at = now
        else:
            action.status = "REJECTED"
            action.failure_reason = f"Rejected by approver {approver_id}: {reason}"

        await self.db.commit()
        await self.db.refresh(action)

        return {
            "success": True,
            "decision": decision,
            "action_id": str(action.id),
            "status": action.status,
            "message": f"Response action {decision.lower()} by {approver_id}.",
        }
