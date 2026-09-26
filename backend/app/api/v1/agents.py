import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentResponse, AgentUpdate
from app.services.agent_service import AgentService

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post(
    "",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register an agent to a project",
    description="Registers an AI agent to a project after verifying user ownership, and records an AGENT_CREATED audit event.",
)
async def create_agent(
    payload: AgentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    request_id = getattr(request.state, "request_id", None)
    service = AgentService(db)
    agent = await service.create_agent(payload, current_user=current_user, request_id=request_id)
    return AgentResponse.model_validate(agent)


@router.get(
    "",
    response_model=List[AgentResponse],
    summary="List agents for a project",
    description="Lists all agents assigned to a specific project if the user has ownership permission.",
)
async def list_agents(
    project_id: uuid.UUID = Query(description="Project ID to query agents for"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AgentResponse]:
    service = AgentService(db)
    agents = await service.list_agents(
        project_id=project_id, current_user=current_user, limit=limit, offset=offset
    )
    return [AgentResponse.model_validate(a) for a in agents]


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Retrieve agent details",
    description="Retrieves agent details if the authenticated user owns the parent project.",
)
async def get_agent(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    service = AgentService(db)
    agent = await service.get_agent(agent_id, current_user=current_user)
    return AgentResponse.model_validate(agent)


@router.patch(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Update agent properties",
    description="Updates agent properties and records an AGENT_UPDATED audit event.",
)
async def update_agent(
    agent_id: uuid.UUID,
    payload: AgentUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    request_id = getattr(request.state, "request_id", None)
    service = AgentService(db)
    agent = await service.update_agent(
        agent_id, payload, current_user=current_user, request_id=request_id
    )
    return AgentResponse.model_validate(agent)
