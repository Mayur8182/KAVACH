import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent


class AuditRepository:
    """Data access repository for AuditEvent entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, event: AuditEvent) -> AuditEvent:
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def list_events(
        self,
        project_id: Optional[uuid.UUID] = None,
        actor_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditEvent]:
        stmt = select(AuditEvent)
        if project_id:
            stmt = stmt.where(AuditEvent.project_id == project_id)
        if actor_id:
            stmt = stmt.where(AuditEvent.actor_id == actor_id)
        stmt = stmt.order_by(AuditEvent.timestamp.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
