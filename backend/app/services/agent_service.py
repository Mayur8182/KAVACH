import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.user import User
from app.repositories.agent_repository import AgentRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.agent import AgentCreate, AgentUpdate
from app.services.audit_service import AuditService


class AgentService:
    """Service governing AI coding agents registration and permissions."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AgentRepository(db)
        self.project_repo = ProjectRepository(db)
        self.audit = AuditService(db)

    async def create_agent(
        self,
        payload: AgentCreate,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Agent:
        # 1. Validate target project exists
        project = await self.project_repo.get_by_id(payload.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target project '{payload.project_id}' does not exist",
            )

        # 2. Verify project ownership/access
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to register agents to this project",
            )

        # 3. Create and persist agent
        agent = Agent(
            project_id=payload.project_id,
            name=payload.name.strip(),
            agent_type=payload.agent_type,
            description=payload.description,
            status=payload.status,
            trust_level=payload.trust_level,
        )
        created = await self.repo.create(agent)

        # 4. Record AGENT_CREATED audit event
        await self.audit.log_event(
            action="AGENT_CREATED",
            resource_type="agent",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(created.id),
            project_id=payload.project_id,
            status="SUCCESS",
            metadata={
                "agent_name": created.name,
                "agent_type": created.agent_type,
                "trust_level": created.trust_level,
                "request_id": request_id,
            },
        )
        await self.db.commit()
        await self.db.refresh(created)
        return created

    async def get_agent(self, agent_id: uuid.UUID, current_user: User) -> Agent:
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent '{agent_id}' not found",
            )

        # Verify access through project ownership
        project = await self.project_repo.get_by_id(agent.project_id)
        if not project or (project.owner_id != current_user.id and not current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to access this agent",
            )

        return agent

    async def list_agents(
        self,
        project_id: uuid.UUID,
        current_user: User,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Agent]:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view agents for this project",
            )

        return await self.repo.list_by_project(project_id=project_id, limit=limit, offset=offset)

    async def update_agent(
        self,
        agent_id: uuid.UUID,
        payload: AgentUpdate,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Agent:
        agent = await self.get_agent(agent_id, current_user)

        update_dict = payload.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(agent, key, val)

        await self.audit.log_event(
            action="AGENT_UPDATED",
            resource_type="agent",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(agent.id),
            project_id=agent.project_id,
            status="SUCCESS",
            metadata={"updated_fields": list(update_dict.keys()), "request_id": request_id},
        )
        await self.db.commit()
        await self.db.refresh(agent)
        return agent
