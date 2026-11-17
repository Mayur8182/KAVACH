import os
import uuid
from typing import Any, Dict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.mcp.errors import MCPInvalidInputError, MCPExecutionFailedError
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.repositories.project_repository import ProjectRepository


async def execute_list_projects(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Phase 1: Retrieves projects belonging to the authenticated user with strict tenant isolation.
    Supports pagination (limit, offset).
    """
    limit = min(max(int(arguments.get("limit", 20)), 1), 100)
    offset = max(int(arguments.get("offset", 0)), 0)

    user_id = context.identity.agent_id
    is_superuser = bool(context.metadata.get("is_superuser", False))

    query = (
        select(Project)
        .where(Project.deleted_at.is_(None))
        .order_by(Project.created_at.desc())
    )

    # Tenant isolation: non-superusers can ONLY see their own projects
    if not is_superuser:
        query = query.where(Project.owner_id == user_id)
    else:
        filter_owner = arguments.get("owner_id")
        if filter_owner:
            try:
                query = query.where(Project.owner_id == uuid.UUID(str(filter_owner)))
            except (ValueError, TypeError):
                pass

    total_stmt = select(func.count()).select_from(query.order_by(None).subquery())
    total_count = (await db.execute(total_stmt)).scalar() or 0

    paged_query = query.limit(limit).offset(offset)
    result = await db.execute(paged_query)
    projects = result.scalars().all()

    project_list = [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "repository": p.repository_url,
            "status": p.environment,
            "environment": p.environment,
            "application_type": p.application_type,
            "default_branch": p.default_branch,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in projects
    ]

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "projects": project_list,
        },
        message=f"Retrieved {len(project_list)} project(s) for authenticated user.",
    )


async def execute_get_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves real project information from PostgreSQL with tenant authorization verification.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "repository": project.repository_url,
            "repository_url": project.repository_url,
            "status": project.environment,
            "environment": project.environment,
            "application_type": project.application_type,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        },
        message=f"Successfully retrieved project '{project.name}'.",
        result_reference=str(project.id),
    )
