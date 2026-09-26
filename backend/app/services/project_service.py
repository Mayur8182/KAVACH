import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.audit_service import AuditService


class ProjectService:
    """Service managing project lifecycle, access control, and audit trail."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProjectRepository(db)
        self.audit = AuditService(db)

    async def create_project(
        self,
        payload: ProjectCreate,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Project:
        project = Project(
            owner_id=current_user.id,
            name=payload.name.strip(),
            description=payload.description,
            repository_url=payload.repository_url,
            primary_language=payload.primary_language,
            framework=payload.framework,
            database_type=payload.database_type,
            cloud_provider=payload.cloud_provider,
            environment=payload.environment,
            application_type=payload.application_type,
        )
        created = await self.repo.create(project)

        # Record PROJECT_CREATED audit event
        await self.audit.log_event(
            action="PROJECT_CREATED",
            resource_type="project",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(created.id),
            project_id=created.id,
            status="SUCCESS",
            metadata={
                "name": created.name,
                "environment": created.environment,
                "application_type": created.application_type,
                "request_id": request_id,
            },
        )
        await self.db.commit()
        await self.db.refresh(created)
        return created

    async def get_project(self, project_id: uuid.UUID, current_user: User) -> Project:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )

        # Enforce strict ownership authorization
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to access this project",
            )

        return project

    async def list_projects(
        self,
        current_user: User,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Project]:
        return await self.repo.list_by_owner(
            owner_id=current_user.id,
            limit=limit,
            offset=offset,
        )

    async def update_project(
        self,
        project_id: uuid.UUID,
        payload: ProjectUpdate,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Project:
        project = await self.get_project(project_id, current_user)

        update_dict = payload.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(project, key, val)

        await self.audit.log_event(
            action="PROJECT_UPDATED",
            resource_type="project",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(project.id),
            project_id=project.id,
            status="SUCCESS",
            metadata={"updated_fields": list(update_dict.keys()), "request_id": request_id},
        )
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Project:
        project = await self.get_project(project_id, current_user)
        deleted = await self.repo.soft_delete(project_id)

        await self.audit.log_event(
            action="PROJECT_DELETED",
            resource_type="project",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(project_id),
            project_id=project_id,
            status="SUCCESS",
            metadata={"name": project.name, "request_id": request_id},
        )
        await self.db.commit()
        return deleted or project
