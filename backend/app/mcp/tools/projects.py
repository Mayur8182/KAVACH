import os
import uuid
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.mcp.errors import MCPInvalidInputError, MCPExecutionFailedError
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.repositories.project_repository import ProjectRepository


async def execute_get_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves real project information from PostgreSQL.
    Enforces that target project matches authenticated agent's project.
    """
    raw_pid = arguments.get("project_id")
    if not raw_pid:
        raise MCPInvalidInputError("Missing required parameter 'project_id'.")

    try:
        project_uuid = uuid.UUID(str(raw_pid))
    except (ValueError, TypeError):
        raise MCPInvalidInputError(f"Invalid UUID string for 'project_id': '{raw_pid}'.")

    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_uuid)
    if not project:
        return ToolExecutionResult(
            status="NOT_FOUND",
            message=f"Project '{project_uuid}' not found.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "repository_url": project.repository_url,
            "environment": project.environment,
            "application_type": project.application_type,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        },
        message=f"Successfully retrieved project '{project.name}'.",
        result_reference=str(project.id),
    )
