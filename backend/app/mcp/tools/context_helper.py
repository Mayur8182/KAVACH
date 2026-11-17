import uuid
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.mcp.schemas import MCPContext, ToolExecutionResult


async def resolve_authorized_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> Tuple[Optional[Project], Optional[ToolExecutionResult]]:
    """
    Enforces consistent project context resolution and strict tenant isolation across all MCP tools.
    
    1. If 'project_id' is supplied in arguments:
       - Validates UUID format.
       - Queries database.
       - Validates project ownership (Project.owner_id == user_id or is_superuser).
       - Denies access if cross-tenant.
    2. If 'project_id' is omitted:
       - Tries context.identity.project_id.
       - If not set or invalid, queries active projects owned by the user.
       - If exactly 1 project exists, automatically binds to it.
       - If multiple projects exist, asks user to specify 'project_id' using 'list_projects'.
       - If 0 projects exist, returns NOT_FOUND with actionable instructions.
    """
    user_id = context.identity.agent_id
    is_superuser = bool(context.metadata.get("is_superuser", False))

    raw_pid = arguments.get("project_id")
    target_uuid: Optional[uuid.UUID] = None

    if raw_pid:
        try:
            target_uuid = uuid.UUID(str(raw_pid).strip())
        except (ValueError, TypeError):
            return None, ToolExecutionResult(
                status="INVALID_INPUT",
                message=f"Invalid UUID string for 'project_id': '{raw_pid}'.",
                error_code="MCP_INVALID_INPUT",
            )
    elif context.identity.project_id and str(context.identity.project_id) != "00000000-0000-0000-0000-000000000000":
        target_uuid = context.identity.project_id

    if target_uuid:
        # Load project from DB
        stmt = select(Project).where(Project.id == target_uuid, Project.deleted_at.is_(None))
        project = (await db.execute(stmt)).scalar_one_or_none()
        if not project:
            return None, ToolExecutionResult(
                status="NOT_FOUND",
                message=f"Project '{target_uuid}' not found.",
                error_code="MCP_RESOURCE_NOT_FOUND",
            )

        # Enforce Tenant Isolation
        if project.owner_id != user_id and not is_superuser:
            return None, ToolExecutionResult(
                status="DENIED",
                message=f"Access denied: Project '{target_uuid}' belongs to another tenant. Cross-tenant access is blocked.",
                error_code="MCP_TENANT_ACCESS_DENIED",
            )
        return project, None

    # No project_id provided in arguments or context: Auto-discover for authenticated user
    user_projects_stmt = (
        select(Project)
        .where(Project.owner_id == user_id, Project.deleted_at.is_(None))
        .order_by(Project.created_at.desc())
    )
    user_projects = (await db.execute(user_projects_stmt)).scalars().all()

    if not user_projects:
        return None, ToolExecutionResult(
            status="NOT_FOUND",
            message="No projects found for authenticated user. Please create a project in Kavach first.",
            error_code="MCP_NO_PROJECTS",
        )

    if len(user_projects) == 1:
        # Auto-select the user's sole project
        return user_projects[0], None

    # Multiple projects exist
    project_names = [f"'{p.name}' ({p.id})" for p in user_projects[:5]]
    return None, ToolExecutionResult(
        status="INVALID_INPUT",
        message=f"Multiple projects found for user. Please specify 'project_id' in tool arguments. Use 'list_projects' to view all projects. Available: {', '.join(project_names)}",
        error_code="MCP_MULTIPLE_PROJECTS_SPECIFY_ID",
    )
