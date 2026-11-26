import uuid
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.user import User
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.services.workspace_resolver import resolve_project_context


def _extract_token_uuid(metadata: Dict[str, Any], key: str) -> Optional[uuid.UUID]:
    raw = metadata.get(key)
    if not raw:
        return None
    try:
        uid = uuid.UUID(str(raw).strip())
        if str(uid) == "00000000-0000-0000-0000-000000000000":
            return None
        return uid
    except (ValueError, TypeError):
        return None


async def resolve_authorized_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> Tuple[Optional[Project], Optional[ToolExecutionResult]]:
    """
    Enforces deterministic project context resolution and strict tenant/organization isolation
    across all MCP tools via the centralized `workspace_resolver`:

    1. Loads authenticated user from DB.
    2. Never trusts an unverified project_id supplied by an AI model.
    3. Respects OAuth token `org_id` boundary, per-client `MCPClientContext`, `default_project_id`,
       and optional `git_remote`.
    4. Auto-selects when unambiguous, or returns structured guidance (`list_projects` / `set_active_project`).
    """
    user_id = context.identity.agent_id
    user = await db.get(User, user_id)
    if not user:
        user = User(
            id=user_id,
            email=context.identity.authenticated_principal or "mcp-agent@kavach.local",
            name=context.identity.agent_name,
            password_hash="",
            is_superuser=bool(context.metadata.get("is_superuser", False)),
            is_active=True,
        )

    explicit_pid = arguments.get("project_id") or arguments.get("projectId")
    git_remote = arguments.get("git_remote") or arguments.get("repository_url")
    client_id = context.metadata.get("client_id") or context.client_name
    token_org_id = _extract_token_uuid(context.metadata, "org_id")
    token_ws_id = _extract_token_uuid(context.metadata, "workspace_id")
    token_proj_id = _extract_token_uuid(context.metadata, "token_project_id")
    if not token_proj_id and context.identity.project_id:
        if str(context.identity.project_id) != "00000000-0000-0000-0000-000000000000":
            token_proj_id = context.identity.project_id

    res = await resolve_project_context(
        user=user,
        db=db,
        client_id=client_id,
        explicit_project_id=str(explicit_pid) if explicit_pid else None,
        token_org_id=token_org_id,
        token_workspace_id=token_ws_id,
        token_project_id=token_proj_id,
        git_remote=str(git_remote) if git_remote else None,
        allow_single_fallback=True,
    )

    if res.status == "RESOLVED" and res.project:
        return res.project, None

    if res.status == "INVALID_INPUT":
        return None, ToolExecutionResult(
            status="INVALID_INPUT",
            message=res.error_message or "Invalid project identifier.",
            error_code="MCP_INVALID_INPUT",
        )
    if res.status == "NOT_FOUND":
        return None, ToolExecutionResult(
            status="NOT_FOUND",
            message=res.error_message or "Project not found.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )
    if res.status == "DENIED":
        return None, ToolExecutionResult(
            status="DENIED",
            message=res.error_message or "Cross-tenant access denied.",
            error_code="MCP_TENANT_ACCESS_DENIED",
        )
    if res.status == "NO_PROJECTS":
        return None, ToolExecutionResult(
            status="NOT_FOUND",
            message=res.error_message or "No projects found in your authorized workspace.",
            error_code="MCP_NO_PROJECTS",
        )

    available = [
        {"id": str(p.id), "name": p.name, "repository_url": p.repository_url}
        for p in (res.accessible_projects or [])[:10]
    ]
    return None, ToolExecutionResult(
        status="INVALID_INPUT",
        data={"available_projects": available},
        message=res.error_message or "Multiple projects found. Call `set_active_project` or pass `project_id`.",
        error_code="MCP_MULTIPLE_PROJECTS_SPECIFY_ID",
    )
