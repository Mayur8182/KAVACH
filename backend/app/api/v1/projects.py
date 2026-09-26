import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and persist a new project",
    description="Registers an engineering application project in PostgreSQL with PROJECT_CREATED audit logging.",
)
async def create_project(
    payload: ProjectCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    request_id = getattr(request.state, "request_id", None)
    service = ProjectService(db)
    project = await service.create_project(payload, current_user=current_user, request_id=request_id)
    return ProjectResponse.model_validate(project)


@router.get(
    "",
    response_model=List[ProjectResponse],
    summary="List projects owned by current user",
    description="Retrieves persisted projects belonging to the authenticated user from PostgreSQL.",
)
async def list_projects(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ProjectResponse]:
    service = ProjectService(db)
    projects = await service.list_projects(current_user=current_user, limit=limit, offset=offset)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Retrieve project details",
    description="Retrieves a project by ID with strict ownership validation (returns 403 if unauthorized).",
)
async def get_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.get_project(project_id, current_user=current_user)
    return ProjectResponse.model_validate(project)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project metadata",
    description="Updates project properties and records a PROJECT_UPDATED audit event.",
)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    request_id = getattr(request.state, "request_id", None)
    service = ProjectService(db)
    project = await service.update_project(
        project_id, payload, current_user=current_user, request_id=request_id
    )
    return ProjectResponse.model_validate(project)


@router.delete(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Delete project",
    description="Applies soft-deletion to the project and records a PROJECT_DELETED audit event.",
)
async def delete_project(
    project_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    request_id = getattr(request.state, "request_id", None)
    service = ProjectService(db)
    deleted = await service.delete_project(
        project_id, current_user=current_user, request_id=request_id
    )
    return ProjectResponse.model_validate(deleted)
