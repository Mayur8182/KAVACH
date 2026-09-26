import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


class ProjectRepository:
    """Data access repository for Project entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def get_by_id(self, project_id: uuid.UUID, include_deleted: bool = False) -> Optional[Project]:
        stmt = select(Project).where(Project.id == project_id)
        if not include_deleted:
            stmt = stmt.where(Project.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_owner(
        self,
        owner_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
        include_deleted: bool = False,
    ) -> List[Project]:
        stmt = select(Project).where(Project.owner_id == owner_id)
        if not include_deleted:
            stmt = stmt.where(Project.deleted_at.is_(None))
        stmt = stmt.order_by(Project.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def soft_delete(self, project_id: uuid.UUID) -> Optional[Project]:
        project = await self.get_by_id(project_id)
        if not project:
            return None
        project.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(project)
        return project
