import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intent import Intent


class IntentRepository:
    """Data access repository for Intent entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, intent: Intent) -> Intent:
        self.db.add(intent)
        await self.db.flush()
        await self.db.refresh(intent)
        return intent

    async def get_by_id(self, intent_id: uuid.UUID) -> Optional[Intent]:
        stmt = select(Intent).where(Intent.id == intent_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        project_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Intent]:
        stmt = (
            select(Intent)
            .where(Intent.project_id == project_id)
            .order_by(Intent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
