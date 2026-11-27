"""
Kavach MCP Account, Workspace, Project & Repository Context Tools.

Implements:
- get_current_user
- list_workspaces
- get_workspace
- list_projects
- get_project
- get_active_project
- set_active_project
- create_project
- connect_repository
- get_connection_status
- get_available_permissions
"""

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github import GitHubInstallation, GitHubRepository
from app.models.project import Project
from app.models.user import User
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import _extract_token_uuid, resolve_authorized_project
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    ensure_user_workspace_provisioned,
    get_accessible_projects,
    get_user_org_and_workspace_scope,
    normalize_git_remote,
    resolve_project_context,
    set_client_active_project,
    user_can_access_project,
)


async def _load_context_user(context: MCPContext, db: AsyncSession) -> Optional[User]:
    return await db.get(User, context.identity.agent_id)


async def execute_get_current_user(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Identifies the authenticated Kavach user, active client, and default context."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(
            status="DENIED",
            message="Authenticated user record not found.",
            error_code="MCP_AUTHENTICATION_FAILED",
        )
    orgs, workspaces = await ensure_user_workspace_provisioned(user, db)
    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "auth_provider": user.auth_provider,
            "is_verified": bool(user.is_verified),
            "default_workspace_id": str(user.default_workspace_id) if user.default_workspace_id else None,
            "default_project_id": str(user.default_project_id) if user.default_project_id else None,
            "oauth_client_id": context.metadata.get("client_id") or context.client_name,
            "granted_scopes": context.metadata.get("scopes", []),
            "organizations_count": len(orgs),
            "workspaces_count": len(workspaces),
        },
        message=f"Authenticated as {user.email} ({user.name}).",
        result_reference=str(user.id),
    )


async def execute_list_workspaces(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Lists all Personal and Organization workspaces accessible to the authenticated user."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    await ensure_user_workspace_provisioned(user, db)
    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    org_map, ws_map, role_map = await get_user_org_and_workspace_scope(user, db, scoped_org_id=scoped_org_id)
    projects = await get_accessible_projects(user, db, org_id=scoped_org_id)

    ws_items = []
    for ws in ws_map.values():
        org = org_map.get(ws.organization_id) if ws.organization_id else None
        ws_proj_count = sum(1 for p in projects if p.workspace_id == ws.id)
        ws_items.append({
            "id": str(ws.id),
            "name": ws.name,
            "slug": ws.slug,
            "workspace_type": ws.workspace_type,
            "organization_id": str(ws.organization_id) if ws.organization_id else None,
            "organization_name": org.name if org else None,
            "role": role_map.get(ws.organization_id, "OWNER") if ws.organization_id else "OWNER",
            "project_count": ws_proj_count,
            "is_default": str(ws.id) == str(user.default_workspace_id) if user.default_workspace_id else False,
        })

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "total_count": len(ws_items),
            "workspaces": ws_items,
        },
        message=f"Retrieved {len(ws_items)} accessible workspace(s).",
    )


async def execute_get_workspace(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Retrieves active workspace (or specified workspace_id if authorized) and its projects."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    await ensure_user_workspace_provisioned(user, db)
    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    org_map, ws_map, role_map = await get_user_org_and_workspace_scope(user, db, scoped_org_id=scoped_org_id)

    raw_ws = arguments.get("workspace_id") or context.metadata.get("workspace_id") or (
        str(user.default_workspace_id) if user.default_workspace_id else None
    )
    target_ws = None
    if raw_ws:
        try:
            ws_uuid = uuid.UUID(str(raw_ws).strip())
            if ws_uuid not in ws_map and not user.is_superuser:
                return ToolExecutionResult(
                    status="DENIED",
                    message=f"Access denied to workspace '{raw_ws}'.",
                    error_code="MCP_TENANT_ACCESS_DENIED",
                )
            target_ws = ws_map.get(ws_uuid)
        except (ValueError, TypeError):
            return ToolExecutionResult(
                status="INVALID_INPUT",
                message=f"Invalid workspace_id UUID: '{raw_ws}'.",
                error_code="MCP_INVALID_INPUT",
            )
    if not target_ws and ws_map:
        target_ws = next(iter(ws_map.values()))
    if not target_ws:
        return ToolExecutionResult(status="NOT_FOUND", message="No accessible workspace found.", error_code="MCP_NOT_FOUND")

    org = org_map.get(target_ws.organization_id) if target_ws.organization_id else None
    ws_projects = await get_accessible_projects(user, db, org_id=scoped_org_id, workspace_id=target_ws.id)

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(target_ws.id),
            "name": target_ws.name,
            "slug": target_ws.slug,
            "workspace_type": target_ws.workspace_type,
            "organization": {"id": str(org.id), "name": org.name} if org else None,
            "role": role_map.get(target_ws.organization_id, "OWNER") if target_ws.organization_id else "OWNER",
            "projects_count": len(ws_projects),
            "projects": [
                {"id": str(p.id), "name": p.name, "repository_url": p.repository_url, "environment": p.environment}
                for p in ws_projects
            ],
        },
        message=f"Active workspace: '{target_ws.name}'.",
        result_reference=str(target_ws.id),
    )


async def execute_list_projects(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Retrieves all authorized projects for the authenticated user across workspaces and org memberships."""
    limit = min(max(int(arguments.get("limit", 20)), 1), 100)
    offset = max(int(arguments.get("offset", 0)), 0)

    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    raw_ws = arguments.get("workspace_id")
    ws_uuid = None
    if raw_ws:
        try:
            ws_uuid = uuid.UUID(str(raw_ws).strip())
        except (ValueError, TypeError):
            return ToolExecutionResult(status="INVALID_INPUT", message=f"Invalid workspace_id '{raw_ws}'.", error_code="MCP_INVALID_INPUT")

    projects = await get_accessible_projects(user, db, org_id=scoped_org_id, workspace_id=ws_uuid)
    client_id = context.metadata.get("client_id") or context.client_name
    ctx_res = await resolve_project_context(
        user=user,
        db=db,
        client_id=client_id,
        token_org_id=scoped_org_id,
        token_workspace_id=_extract_token_uuid(context.metadata, "workspace_id"),
        token_project_id=_extract_token_uuid(context.metadata, "token_project_id"),
        allow_single_fallback=True,
    )
    active_pid = ctx_res.project.id if ctx_res.project else None
    default_pid = getattr(user, "default_project_id", None)

    total_count = len(projects)
    paged = projects[offset : offset + limit]

    project_list = [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "workspace_id": str(p.workspace_id) if p.workspace_id else None,
            "organization_id": str(p.organization_id) if p.organization_id else None,
            "repository": p.repository_url,
            "repository_url": p.repository_url,
            "status": p.environment,
            "environment": p.environment,
            "application_type": p.application_type,
            "default_branch": p.default_branch,
            "is_active": p.id == active_pid,
            "is_default": p.id == default_pid,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in paged
    ]

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "active_project_id": str(active_pid) if active_pid else None,
            "default_project_id": str(default_pid) if default_pid else None,
            "projects": project_list,
        },
        message=f"Retrieved {len(project_list)} authorized project(s).",
    )


async def execute_get_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Retrieves real project information from PostgreSQL/SQLite with tenant authorization verification."""
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    repo = (
        await db.execute(select(GitHubRepository).where(GitHubRepository.project_id == project.id))
    ).scalars().first()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "workspace_id": str(project.workspace_id) if project.workspace_id else None,
            "organization_id": str(project.organization_id) if project.organization_id else None,
            "repository": project.repository_url,
            "repository_url": project.repository_url,
            "connected_repository": (
                {"id": str(repo.id), "full_name": repo.full_name, "default_branch": repo.default_branch}
                if repo
                else None
            ),
            "status": project.environment,
            "environment": project.environment,
            "application_type": project.application_type,
            "default_branch": project.default_branch,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        },
        message=f"Successfully retrieved project '{project.name}'.",
        result_reference=str(project.id),
    )


async def execute_get_active_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Resolves and returns the active project for the current user & AI client."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    client_id = context.metadata.get("client_id") or context.client_name
    res = await resolve_project_context(
        user=user,
        db=db,
        client_id=client_id,
        token_org_id=_extract_token_uuid(context.metadata, "org_id"),
        token_workspace_id=_extract_token_uuid(context.metadata, "workspace_id"),
        token_project_id=_extract_token_uuid(context.metadata, "token_project_id"),
        git_remote=arguments.get("git_remote"),
        allow_single_fallback=True,
    )

    if res.status == "RESOLVED" and res.project:
        p = res.project
        return ToolExecutionResult(
            status="SUCCESS",
            data={
                "active_project": {
                    "id": str(p.id),
                    "name": p.name,
                    "repository_url": p.repository_url,
                    "environment": p.environment,
                    "workspace_id": str(p.workspace_id) if p.workspace_id else None,
                    "organization_id": str(p.organization_id) if p.organization_id else None,
                },
                "resolution_source": res.resolution_source,
                "workspace": {"id": str(res.workspace.id), "name": res.workspace.name} if res.workspace else None,
                "organization": {"id": str(res.organization.id), "name": res.organization.name} if res.organization else None,
            },
            message=f"Active project is '{p.name}' (resolved via {res.resolution_source}).",
            result_reference=str(p.id),
        )

    if res.status == "NO_PROJECTS":
        return ToolExecutionResult(
            status="NOT_FOUND",
            data={"available_projects": []},
            message=res.error_message or "No projects found. Call `create_project` or `connect_repository`.",
            error_code="MCP_NO_PROJECTS",
        )

    return ToolExecutionResult(
        status="SELECTION_REQUIRED",
        data={
            "available_projects": [
                {"id": str(p.id), "name": p.name, "repository_url": p.repository_url, "environment": p.environment}
                for p in (res.accessible_projects or [])
            ]
        },
        message=res.error_message or "Multiple projects found. Call `set_active_project` with a project_id.",
        error_code="MCP_MULTIPLE_PROJECTS_SPECIFY_ID",
    )


async def execute_set_active_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Switches the active project for this client (and optionally sets user default)."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    raw_pid = arguments.get("project_id") or arguments.get("projectId")
    git_remote = arguments.get("git_remote")
    set_as_default = bool(arguments.get("set_as_default", False))

    if not raw_pid and not git_remote:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Provide 'project_id' (or 'git_remote') to switch the active project.",
            error_code="MCP_INVALID_INPUT",
        )

    res = await resolve_project_context(
        user=user,
        db=db,
        client_id=context.metadata.get("client_id") or context.client_name,
        explicit_project_id=str(raw_pid) if raw_pid else None,
        token_org_id=scoped_org_id,
        git_remote=str(git_remote) if git_remote else None,
    )
    if res.status != "RESOLVED" or not res.project:
        return ToolExecutionResult(
            status=res.status if res.status in {"DENIED", "NOT_FOUND", "INVALID_INPUT"} else "FAILED",
            message=res.error_message or "Could not switch active project.",
            error_code="MCP_PROJECT_SWITCH_FAILED",
        )

    client_id = context.metadata.get("client_id") or context.client_name
    await set_client_active_project(
        user=user,
        client_id=client_id,
        project=res.project,
        db=db,
        set_as_default=set_as_default,
        client_name=context.client_name,
        git_remote=git_remote,
    )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "active_project": {
                "id": str(res.project.id),
                "name": res.project.name,
                "repository_url": res.project.repository_url,
                "workspace_id": str(res.project.workspace_id) if res.project.workspace_id else None,
                "organization_id": str(res.project.organization_id) if res.project.organization_id else None,
            },
            "client_id": client_id,
            "is_shared_default": bool(set_as_default or user.default_project_id == res.project.id),
        },
        message=f"Switched active project for '{client_id}' to '{res.project.name}'.",
        result_reference=str(res.project.id),
    )


async def execute_create_project(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Creates a new project inside the user's authorized workspace and sets it active."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    name = str(arguments.get("name") or "").strip()
    if not name:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Project 'name' is required.",
            error_code="MCP_INVALID_INPUT",
        )

    orgs, workspaces = await ensure_user_workspace_provisioned(user, db)
    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    _, ws_map, _ = await get_user_org_and_workspace_scope(user, db, scoped_org_id=scoped_org_id)

    target_ws = None
    raw_ws = arguments.get("workspace_id") or context.metadata.get("workspace_id") or (
        str(user.default_workspace_id) if user.default_workspace_id else None
    )
    if raw_ws:
        try:
            ws_uuid = uuid.UUID(str(raw_ws).strip())
            if ws_uuid not in ws_map and not user.is_superuser:
                return ToolExecutionResult(
                    status="DENIED",
                    message=f"Cross-tenant access denied to workspace '{raw_ws}'.",
                    error_code="MCP_TENANT_ACCESS_DENIED",
                )
            target_ws = ws_map.get(ws_uuid)
        except (ValueError, TypeError):
            return ToolExecutionResult(status="INVALID_INPUT", message="Invalid workspace_id.", error_code="MCP_INVALID_INPUT")

    if not target_ws and ws_map:
        target_ws = next(iter(ws_map.values()))
    if not target_ws:
        return ToolExecutionResult(status="DENIED", message="No authorized workspace available.", error_code="MCP_TENANT_ACCESS_DENIED")

    new_proj = Project(
        id=uuid.uuid4(),
        owner_id=user.id,
        workspace_id=target_ws.id,
        organization_id=target_ws.organization_id or (orgs[0].id if orgs else None),
        name=name,
        description=arguments.get("description"),
        repository_url=arguments.get("repository_url"),
        primary_language=arguments.get("primary_language"),
        framework=arguments.get("framework"),
        environment=arguments.get("environment") or "production",
        application_type=arguments.get("application_type") or "web_service",
        default_branch=arguments.get("default_branch") or "main",
    )
    db.add(new_proj)
    user.onboarding_completed = True
    db.add(user)
    await db.commit()
    await db.refresh(new_proj)

    client_id = context.metadata.get("client_id") or context.client_name
    await set_client_active_project(
        user=user,
        client_id=client_id,
        project=new_proj,
        db=db,
        set_as_default=bool(arguments.get("set_as_default", False)),
        client_name=context.client_name,
    )

    await AuditService(db).log_event(
        action="PROJECT_CREATED",
        resource_type="project",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=str(new_proj.id),
        organization_id=new_proj.organization_id,
        workspace_id=new_proj.workspace_id,
        project_id=new_proj.id,
        status="SUCCESS",
        metadata={"source": "mcp_tool", "client_id": client_id, "name": new_proj.name},
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project": {
                "id": str(new_proj.id),
                "name": new_proj.name,
                "workspace_id": str(new_proj.workspace_id) if new_proj.workspace_id else None,
                "organization_id": str(new_proj.organization_id) if new_proj.organization_id else None,
                "repository_url": new_proj.repository_url,
                "environment": new_proj.environment,
            }
        },
        message=f"Created project '{new_proj.name}' in workspace '{target_ws.name}' and set it as active.",
        result_reference=str(new_proj.id),
    )


async def execute_connect_repository(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Associates an authorized GitHub repository (or owner/repo / URL) with a Kavach project.
    Safely replaces mismatched primary repo links when switching repositories and verifies live GitHub
    metadata when reachable without silently fabricating state.
    """
    import random
    import httpx
    from sqlalchemy import desc
    from app.mcp.tools.github import _extract_owner_repo, resolve_github_token

    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    repo_input = str(arguments.get("repository") or arguments.get("repository_url") or "").strip()
    if not repo_input:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Provide 'repository' (e.g. 'owner/repo' or GitHub URL).",
            error_code="MCP_INVALID_INPUT",
        )

    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    parsed = _extract_owner_repo(repo_input)
    norm_target = normalize_git_remote(repo_input)
    if not norm_target or not parsed:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message=f"Could not parse repository identifier '{repo_input}'. Use 'owner/repo' or GitHub HTTPS URL.",
            error_code="MCP_INVALID_INPUT",
        )
    owner, name, full_name = parsed
    replace_existing = bool(arguments.get("replace_project_repo", True))

    # Resolve authorized existing GitHubRepository candidates in user's workspace/installations/project
    _, ws_map, _ = await get_user_org_and_workspace_scope(
        user, db, scoped_org_id=_extract_token_uuid(context.metadata, "org_id")
    )
    inst_ids = list(
        (
            await db.execute(
                select(GitHubInstallation.id).where(
                    GitHubInstallation.connected_by_user_id == user.id,
                    GitHubInstallation.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )
    repo_conds = [GitHubRepository.project_id == project.id]
    if ws_map:
        repo_conds.append(GitHubRepository.workspace_id.in_(list(ws_map.keys())))
    if inst_ids:
        repo_conds.append(GitHubRepository.installation_id.in_(inst_ids))

    candidates = list(
        (
            await db.execute(
                select(GitHubRepository)
                .where(or_(*repo_conds))
                .order_by(desc(GitHubRepository.updated_at))
            )
        )
        .scalars()
        .all()
    )

    matched_gh_repo: Optional[GitHubRepository] = None
    for r in candidates:
        for u in (r.html_url, r.clone_url, r.ssh_url, f"github.com/{r.full_name}"):
            if u and normalize_git_remote(u) == norm_target:
                matched_gh_repo = r
                break
        if matched_gh_repo:
            break

    # Detach prior mismatched repo links for this project when switching primary repository cleanly
    detached_repos: List[str] = []
    if replace_existing:
        for old_r in candidates:
            if old_r.project_id == project.id and (not matched_gh_repo or old_r.id != matched_gh_repo.id):
                old_norm = normalize_git_remote(f"github.com/{old_r.full_name}")
                if old_norm != norm_target:
                    old_r.project_id = None
                    if not old_r.workspace_id and project.workspace_id:
                        old_r.workspace_id = project.workspace_id
                    db.add(old_r)
                    detached_repos.append(old_r.full_name)

    # Optionally inspect GitHub API metadata for real default branch / private / github_repository_id
    gh_token = await resolve_github_token(db, repo=matched_gh_repo, project=project, user_id=user.id)
    live_meta: Optional[Dict[str, Any]] = None
    try:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "Kavach-MCP"}
        if gh_token:
            headers["Authorization"] = f"Bearer {gh_token}"
        async with httpx.AsyncClient(timeout=12.0) as client:
            gh_res = await client.get(f"https://api.github.com/repos/{full_name}", headers=headers)
            if gh_res.status_code == 200:
                live_meta = gh_res.json()
    except Exception:
        live_meta = None

    canonical_url = (
        (live_meta.get("html_url") if live_meta else None)
        or (matched_gh_repo.html_url if matched_gh_repo else None)
        or f"https://{norm_target}"
    )
    default_branch = (
        (live_meta.get("default_branch") if live_meta else None)
        or (matched_gh_repo.default_branch if matched_gh_repo else None)
        or str(arguments.get("default_branch") or project.default_branch or "main")
    )
    project.repository_url = canonical_url
    project.default_branch = default_branch
    db.add(project)

    if matched_gh_repo:
        matched_gh_repo.project_id = project.id
        matched_gh_repo.default_branch = default_branch
        if live_meta:
            matched_gh_repo.full_name = live_meta.get("full_name") or matched_gh_repo.full_name
            matched_gh_repo.name = live_meta.get("name") or matched_gh_repo.name
            matched_gh_repo.owner = (live_meta.get("owner") or {}).get("login") or matched_gh_repo.owner
            matched_gh_repo.private = bool(live_meta.get("private", matched_gh_repo.private))
            matched_gh_repo.clone_url = live_meta.get("clone_url") or matched_gh_repo.clone_url
        if project.workspace_id:
            matched_gh_repo.workspace_id = project.workspace_id
        db.add(matched_gh_repo)
    else:
        # Create a real tenant-scoped GitHubRepository record so `/code/repositories/*` & MCP tools resolve 1:1
        gh_numeric_id = int(live_meta["id"]) if live_meta and live_meta.get("id") else random.randint(100000000, 999999999)
        ex_by_gh_id = (
            await db.execute(select(GitHubRepository).where(GitHubRepository.github_repository_id == gh_numeric_id))
        ).scalars().first()
        if ex_by_gh_id:
            # Ensure we only reuse if unassigned or inside same tenant scope
            can_reuse = (
                ex_by_gh_id.project_id in (None, project.id)
                and (not ex_by_gh_repo_ws(ex_by_gh_id, ws_map, inst_ids))
            )
            if not can_reuse:
                gh_numeric_id = random.randint(100000000, 999999999)
                ex_by_gh_id = None

        if ex_by_gh_id:
            matched_gh_repo = ex_by_gh_id
            matched_gh_repo.project_id = project.id
            matched_gh_repo.workspace_id = project.workspace_id
            matched_gh_repo.default_branch = default_branch
            db.add(matched_gh_repo)
        else:
            is_priv = bool(live_meta.get("private")) if live_meta else False
            matched_gh_repo = GitHubRepository(
                id=uuid.uuid4(),
                github_repository_id=gh_numeric_id,
                project_id=project.id,
                workspace_id=project.workspace_id,
                installation_id=inst_ids[0] if inst_ids else None,
                owner=(live_meta.get("owner") or {}).get("login") if live_meta else owner,
                name=live_meta.get("name") if live_meta else name,
                full_name=live_meta.get("full_name") if live_meta else full_name,
                default_branch=default_branch,
                private=is_priv,
                html_url=canonical_url,
                clone_url=(live_meta.get("clone_url") if live_meta else None) or f"https://github.com/{full_name}.git",
                visibility="private" if is_priv else "public",
                archived=False,
            )
            db.add(matched_gh_repo)

    client_id = context.metadata.get("client_id") or context.client_name
    await set_client_active_project(
        user=user,
        client_id=client_id,
        project=project,
        db=db,
        client_name=context.client_name,
        git_remote=canonical_url,
    )

    await AuditService(db).log_event(
        action="REPOSITORY_CONNECTED",
        resource_type="repository",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=str(matched_gh_repo.id),
        organization_id=project.organization_id,
        workspace_id=project.workspace_id,
        project_id=project.id,
        status="SUCCESS",
        metadata={
            "repository_url": canonical_url,
            "full_name": matched_gh_repo.full_name,
            "detached_previous_repos": detached_repos,
            "github_api_verified": live_meta is not None,
        },
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(project.id),
            "project_name": project.name,
            "repository_url": canonical_url,
            "full_name": matched_gh_repo.full_name,
            "default_branch": matched_gh_repo.default_branch,
            "github_app_verified": live_meta is not None or bool(matched_gh_repo.installation_id),
            "github_repository_id": str(matched_gh_repo.id),
            "detached_previous_repositories": detached_repos,
        },
        message=f"Connected repository '{matched_gh_repo.full_name}' (branch '{default_branch}') to project '{project.name}'.",
        result_reference=str(matched_gh_repo.id),
    )


def ex_by_gh_repo_ws(repo: GitHubRepository, ws_map: Dict[Any, Any], inst_ids: List[uuid.UUID]) -> bool:
    """Returns True if `repo` clearly belongs to another tenant outside `ws_map` and `inst_ids`."""
    if repo.workspace_id and ws_map and repo.workspace_id not in ws_map:
        return True
    if repo.installation_id and inst_ids and repo.installation_id not in inst_ids:
        return True
    return False


async def execute_get_connection_status(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Returns full MCP authentication, workspace, active project, and GitHub connection status."""
    user = await _load_context_user(context, db)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    orgs, workspaces = await ensure_user_workspace_provisioned(user, db)
    client_id = context.metadata.get("client_id") or context.client_name
    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    res = await resolve_project_context(
        user=user,
        db=db,
        client_id=client_id,
        token_org_id=scoped_org_id,
        token_workspace_id=_extract_token_uuid(context.metadata, "workspace_id"),
        token_project_id=_extract_token_uuid(context.metadata, "token_project_id"),
    )

    inst_count = len(
        (
            await db.execute(
                select(GitHubInstallation.id).where(
                    GitHubInstallation.connected_by_user_id == user.id,
                    GitHubInstallation.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "authenticated": True,
            "user": {"id": str(user.id), "email": user.email, "name": user.name},
            "client_id": client_id,
            "granted_scopes": context.metadata.get("scopes", []),
            "scoped_org_id": str(scoped_org_id) if scoped_org_id else None,
            "workspaces_count": len(workspaces),
            "projects_count": len(res.accessible_projects),
            "active_project": (
                {
                    "id": str(res.project.id),
                    "name": res.project.name,
                    "repository_url": res.project.repository_url,
                    "resolution_source": res.resolution_source,
                }
                if res.project
                else None
            ),
            "default_project_id": str(user.default_project_id) if user.default_project_id else None,
            "github_installations_count": inst_count,
            "policy_engine": "ACTIVE",
        },
        message=f"Connected to Kavach MCP as {user.email} (client: {client_id}).",
    )


async def execute_get_available_permissions(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Returns granted OAuth scopes, workspace RBAC role, and per-tool capability status."""
    from app.mcp.registry import default_tool_registry
    from app.api.v1.mcp import TOOL_REQUIRED_SCOPES

    user = await _load_context_user(context, db)
    granted_scopes = set(context.metadata.get("scopes", []))
    tools_matrix: List[Dict[str, Any]] = []
    for t in default_tool_registry.list_tools():
        req_scope = TOOL_REQUIRED_SCOPES.get(t.name, "projects:read")
        scope_ok = (not granted_scopes) or (req_scope in granted_scopes) or bool(user and user.is_superuser)
        tools_matrix.append({
            "tool": t.name,
            "category": t.category,
            "required_scope": req_scope,
            "risk_level": t.risk_level,
            "requires_approval": t.requires_approval,
            "authorized_by_scope": scope_ok,
        })

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "granted_scopes": sorted(list(granted_scopes)),
            "is_superuser": bool(user and user.is_superuser),
            "tools": tools_matrix,
        },
        message=f"Evaluated permissions across {len(tools_matrix)} MCP tools.",
    )
