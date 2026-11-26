import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    ensure_user_workspace_provisioned,
    get_accessible_projects,
    user_can_access_project,
)


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
        orgs, workspaces = await ensure_user_workspace_provisioned(current_user, self.db)
        target_ws_id = payload.workspace_id or getattr(current_user, "default_workspace_id", None) or (workspaces[0].id if workspaces else None)
        target_org_id = payload.organization_id or (workspaces[0].organization_id if workspaces else None) or (orgs[0].id if orgs else None)

        if payload.workspace_id:
            matched_ws = next((w for w in workspaces if w.id == payload.workspace_id), None)
            if not matched_ws and not current_user.is_superuser:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access denied: You do not have access to the specified workspace.",
                )
            if matched_ws:
                target_org_id = matched_ws.organization_id or target_org_id

        project = Project(
            owner_id=current_user.id,
            workspace_id=target_ws_id,
            organization_id=target_org_id,
            name=payload.name.strip(),
            description=payload.description,
            repository_url=payload.repository_url,
            primary_language=payload.primary_language,
            framework=payload.framework,
            database_type=payload.database_type,
            cloud_provider=payload.cloud_provider,
            environment=payload.environment,
            application_type=payload.application_type,
            default_branch=payload.default_branch or "main",
        )
        created = await self.repo.create(project)

        # Ensure user's onboarding is marked complete and default_project_id is initialized
        current_user.onboarding_completed = True
        if not getattr(current_user, "default_project_id", None):
            current_user.default_project_id = created.id
        self.db.add(current_user)

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

        # Dispatch Project Created notification
        try:
            from app.services.notification_service import notification_service
            from app.core.config import get_settings
            settings = get_settings()
            app_url = settings.public_app_url.rstrip("/")
            await notification_service.dispatch(
                template_id="project_created",
                recipient_email=current_user.email,
                context={
                    "project_name": created.name,
                    "project_id": str(created.id),
                    "created_at": datetime.now(timezone.utc).strftime("%b %d, %Y, %I:%M %p (UTC)"),
                    "environment": created.environment or "production",
                    "application_type": created.application_type or "web_service",
                    "actor_email": current_user.email,
                    "workspace_name": "Personal Workspace",
                    "project_settings_url": f"{app_url}/projects/{created.id}/settings",
                },
                user_id=str(current_user.id),
                project_id=str(created.id),
                sync_delivery=False,
            )
        except Exception as proj_err:
            import logging
            logging.getLogger("secure-control-plane.email").warning(
                f"Failed to dispatch project created notification: {proj_err}"
            )

        return created

    async def get_project(self, project_id: uuid.UUID, current_user: User) -> Project:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )

        if not await user_can_access_project(current_user, project, self.db):
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
        projects = await get_accessible_projects(current_user, self.db)
        return projects[offset : offset + limit]

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
