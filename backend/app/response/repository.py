"""
Repository layer for Step 14 Runtime Security Agent and Controlled Enforcement.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.response.models import (
    ResponseExecutionAttempt,
    RuntimeEnforcementRule,
    SecurityIncident,
    SecurityResponseAction,
    SecurityResponseDecision,
    SecurityResponsePlan,
    SecurityResponsePlanVersion,
)


class ResponseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_action_by_id(
        self,
        action_id: uuid.UUID,
        project_id: Optional[uuid.UUID] = None,
    ) -> Optional[SecurityResponseAction]:
        stmt = select(SecurityResponseAction).where(SecurityResponseAction.id == action_id)
        if project_id:
            stmt = stmt.where(SecurityResponseAction.project_id == project_id)
        stmt = stmt.options(selectinload(SecurityResponseAction.execution_attempts))
        return (await self.db.execute(stmt)).scalars().first()

    async def get_action_by_idempotency_key(
        self,
        key: str,
    ) -> Optional[SecurityResponseAction]:
        stmt = select(SecurityResponseAction).where(SecurityResponseAction.idempotency_key == key)
        return (await self.db.execute(stmt)).scalars().first()

    async def list_actions(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        target_type: Optional[str] = None,
        action_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[SecurityResponseAction]:
        stmt = select(SecurityResponseAction).where(SecurityResponseAction.project_id == project_id)
        if status:
            stmt = stmt.where(SecurityResponseAction.status == status)
        if target_type:
            stmt = stmt.where(SecurityResponseAction.target_type == target_type)
        if action_type:
            stmt = stmt.where(SecurityResponseAction.action_type == action_type)
        stmt = stmt.order_by(SecurityResponseAction.created_at.desc()).limit(limit).offset(offset)
        return list((await self.db.execute(stmt)).scalars().all())

    async def list_pending_approvals(
        self,
        project_id: uuid.UUID,
    ) -> List[SecurityResponseAction]:
        stmt = select(SecurityResponseAction).where(
            SecurityResponseAction.project_id == project_id,
            SecurityResponseAction.status == "PENDING_APPROVAL",
        ).order_by(SecurityResponseAction.created_at.desc())
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_plan_by_id(
        self,
        plan_id: uuid.UUID,
        project_id: Optional[uuid.UUID] = None,
    ) -> Optional[SecurityResponsePlan]:
        stmt = select(SecurityResponsePlan).where(SecurityResponsePlan.id == plan_id)
        if project_id:
            stmt = stmt.where(SecurityResponsePlan.project_id == project_id)
        stmt = stmt.options(selectinload(SecurityResponsePlan.versions))
        return (await self.db.execute(stmt)).scalars().first()

    async def list_plans(
        self,
        project_id: uuid.UUID,
    ) -> List[SecurityResponsePlan]:
        stmt = select(SecurityResponsePlan).where(
            SecurityResponsePlan.project_id == project_id
        ).order_by(SecurityResponsePlan.created_at.desc())
        return list((await self.db.execute(stmt)).scalars().all())
