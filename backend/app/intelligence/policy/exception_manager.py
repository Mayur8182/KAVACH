"""
Kavach Phase 5: Universal Policy Exception & Waiver Manager
Governs time-bound, resource-scoped exceptions with risk owners, compensating controls,
expiry enforcement, renewal workflows, and strict prevention of non-exemptible waivers.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.policy import SecurityPolicy, PolicyRule, PolicyException
from app.models.user import User
from app.services.audit_service import AuditService

logger = logging.getLogger("kavach.policy.exceptions")

MAX_EXCEPTION_DURATION_DAYS = 90


class PolicyExceptionManager:
    """
    Authoritative manager for security waivers and temporary policy exceptions.
    Rule: Exceptions must never permanently suppress or override non-exemptible controls.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def request_exception(
        self,
        policy_id: uuid.UUID,
        rule_id: Optional[uuid.UUID],
        resource_scope: str,
        justification: str,
        risk_owner: str,
        requested_by: User,
        duration_days: int = 30,
        compensating_controls: Optional[str] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> PolicyException:
        """
        Creates a pending policy exception request.
        Validates that target rule is not designated non-exemptible.
        """
        if not justification or len(justification.strip()) < 10:
            raise ValueError("A detailed business/technical justification (at least 10 chars) is required.")

        if not risk_owner:
            raise ValueError("A designated risk owner email/name is required.")

        if duration_days <= 0 or duration_days > MAX_EXCEPTION_DURATION_DAYS:
            raise ValueError(f"Exception duration must be between 1 and {MAX_EXCEPTION_DURATION_DAYS} days.")

        # Check non-exemptible rule constraint
        if rule_id:
            rule = await self.db.get(PolicyRule, rule_id)
            if rule and rule.is_non_exemptible:
                raise PermissionError(f"Rule '{rule.name}' is marked NON-EXEMPTIBLE. Policy waivers are strictly prohibited.")

        expires_at = datetime.now(timezone.utc) + timedelta(days=duration_days)

        exception = PolicyException(
            policy_id=policy_id,
            policy_rule_id=rule_id,
            project_id=project_id,
            resource_scope=resource_scope or "*",
            justification=justification.strip(),
            risk_owner=risk_owner.strip(),
            requested_by=requested_by.email,
            approved_by=None,
            compensating_controls=compensating_controls,
            status="PENDING",
            expires_at=expires_at,
            review_date=expires_at - timedelta(days=7),
        )
        self.db.add(exception)
        await self.db.flush()

        await self.audit.log_event(
            action="POLICY_EXCEPTION_REQUESTED",
            resource_type="POLICY_EXCEPTION",
            actor_type="USER",
            actor_id=str(requested_by.id),
            resource_id=str(exception.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "policy_id": str(policy_id),
                "resource_scope": resource_scope,
                "duration_days": duration_days,
                "risk_owner": risk_owner,
            },
        )
        await self.db.commit()
        return exception

    async def approve_exception(
        self,
        exception_id: uuid.UUID,
        approver: User,
    ) -> PolicyException:
        """
        Approves an exception request.
        Enforces separation of duties: Approver cannot be the requester.
        """
        exc = await self.db.get(PolicyException, exception_id)
        if not exc:
            raise ValueError(f"Policy exception '{exception_id}' not found.")

        if exc.requested_by.lower() == approver.email.lower() and not approver.is_superuser:
            raise PermissionError("Separation of duties violation: Requester cannot approve their own policy exception.")

        if exc.status != "PENDING":
            raise ValueError(f"Cannot approve exception in status '{exc.status}'.")

        exc.approved_by = approver.email
        exc.status = "ACTIVE"

        await self.audit.log_event(
            action="POLICY_EXCEPTION_APPROVED",
            resource_type="POLICY_EXCEPTION",
            actor_type="USER",
            actor_id=str(approver.id),
            resource_id=str(exc.id),
            project_id=exc.project_id,
            status="SUCCESS",
            metadata={
                "approved_by": approver.email,
                "expires_at": exc.expires_at.isoformat(),
            },
        )
        await self.db.commit()
        return exc

    async def revoke_exception(
        self,
        exception_id: uuid.UUID,
        revoker: User,
        revocation_reason: str = "Administrative revocation",
    ) -> PolicyException:
        """
        Revokes an active or pending exception immediately.
        """
        exc = await self.db.get(PolicyException, exception_id)
        if not exc:
            raise ValueError(f"Policy exception '{exception_id}' not found.")

        exc.status = "REVOKED"

        await self.audit.log_event(
            action="POLICY_EXCEPTION_REVOKED",
            resource_type="POLICY_EXCEPTION",
            actor_type="USER",
            actor_id=str(revoker.id),
            resource_id=str(exc.id),
            project_id=exc.project_id,
            status="SUCCESS",
            metadata={"revoked_by": revoker.email, "reason": revocation_reason},
        )
        await self.db.commit()
        return exc

