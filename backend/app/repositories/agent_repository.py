import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.project import Project


class AgentRepository:
    """Data access repository for Agent entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, agent: Agent) -> Agent:
        self.db.add(agent)
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    async def get_by_id(self, agent_id: uuid.UUID) -> Optional[Agent]:
        stmt = select(Agent).where(Agent.id == agent_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        project_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Agent]:
        stmt = (
            select(Agent)
            .where(Agent.project_id == project_id)
            .order_by(Agent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_owner(
        self,
        owner_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Agent]:
        stmt = (
            select(Agent)
            .join(Project, Agent.project_id == Project.id)
            .where(Project.owner_id == owner_id)
            .order_by(Agent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_all(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Agent]:
        stmt = (
            select(Agent)
            .order_by(Agent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
