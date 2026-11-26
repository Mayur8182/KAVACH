"""
Centralized Workspace, Organization, Project, and Repository Resolver for Kavach & MCP.

Guarantees:
1. One Kavach identity across all AI clients (ChatGPT, Claude, Grok, Cursor, VS Code, Windsurf).
2. Deterministic personal/organization workspace provisioning without duplicate organizations.
3. Server-side tenant isolation: every project/workspace/repository lookup verifies ownership or
   active OrganizationMember access and respects token `org_id` boundaries.
4. Default project + per-client active project context (`MCPClientContext`) + Git remote matching.
"""

from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github import GitHubInstallation, GitHubRepository
from app.models.invitation import OrganizationMember
from app.models.oauth import MCPClientContext
from app.models.organization import (
    Organization,
    OrganizationSubscription,
    ProductEntitlement,
    Workspace,
)
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger("kavach.workspace_resolver")


def normalize_git_remote(remote_url: Optional[str]) -> Optional[str]:
    """
    Normalizes Git remote URLs (`https://github.com/org/repo.git`, `git@github.com:org/repo.git`,
    `ssh://git@github.com/org/repo`) into canonical lowercase `host/owner/repo`.
    """
    if not remote_url or not isinstance(remote_url, str):
        return None
    raw = remote_url.strip()
    if not raw:
        return None

    # Handle SCP-like SSH syntax: git@github.com:org/repo.git
    scp_match = re.match(r"^(?:[^@]+@)?([^:/\s]+):(.+)$", raw)
    if scp_match and "://" not in raw:
        host = scp_match.group(1).lower()
        path = scp_match.group(2).strip("/")
    else:
        parsed = urlparse(raw)
        if parsed.hostname and parsed.path:
            host = parsed.hostname.lower()
            path = parsed.path.strip("/")
        else:
            # Handle plain owner/repo shorthand
            cleaned = raw.strip("/")
            if cleaned.endswith(".git"):
                cleaned = cleaned[:-4]
            if "/" in cleaned and " " not in cleaned:
                return f"github.com/{cleaned.lower()}"
            return None

    if path.endswith(".git"):
        path = path[:-4]
    path = path.strip("/")
    if not host or not path:
        return None
    return f"{host}/{path.lower()}"


@dataclass
class ProjectResolutionResult:
    status: str  # RESOLVED | SELECTION_REQUIRED | NO_PROJECTS | DENIED | NOT_FOUND | INVALID_INPUT
    project: Optional[Project] = None
    workspace: Optional[Workspace] = None
    organization: Optional[Organization] = None
    accessible_projects: List[Project] = None  # type: ignore[assignment]
    resolution_source: str = "none"
    error_message: Optional[str] = None

    def __post_init__(self) -> None:
        if self.accessible_projects is None:
            self.accessible_projects = []


async def get_user_org_and_workspace_scope(
    user: User,
    db: AsyncSession,
    scoped_org_id: Optional[uuid.UUID] = None,
) -> Tuple[Dict[uuid.UUID, Organization], Dict[uuid.UUID, Workspace], Dict[uuid.UUID, str]]:
    """
    Loads all organizations and workspaces accessible to `user`, returning:
    (org_map, workspace_map, org_roles_map)
    Respects `scoped_org_id` if provided (e.g., from an org-scoped OAuth token).
    """
    owned_orgs = list(
        (await db.execute(select(Organization).where(Organization.owner_id == user.id))).scalars().all()
    )
    memberships = list(
        (
            await db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.is_active == True,
                )
            )
        )
        .scalars()
        .all()
    )
    mem_org_ids = [m.organization_id for m in memberships]
    mem_orgs: List[Organization] = []
    if mem_org_ids:
        mem_orgs = list(
            (await db.execute(select(Organization).where(Organization.id.in_(mem_org_ids))))
            .scalars()
            .all()
        )

    org_map: Dict[uuid.UUID, Organization] = {}
    role_map: Dict[uuid.UUID, str] = {}
    for org in owned_orgs:
        org_map[org.id] = org
        role_map[org.id] = "OWNER"
    for m in memberships:
        role_map.setdefault(m.organization_id, (m.role or "MEMBER").upper())
    for org in mem_orgs:
        org_map[org.id] = org

    if scoped_org_id and not getattr(user, "is_superuser", False):
        if scoped_org_id in org_map:
            org_map = {scoped_org_id: org_map[scoped_org_id]}
            role_map = {k: v for k, v in role_map.items() if k == scoped_org_id}
        else:
            org_map = {}
            role_map = {}

    org_ids = list(org_map.keys())
    ws_conditions = []
    if not scoped_org_id:
        ws_conditions.append(Workspace.owner_id == user.id)
    if org_ids:
        ws_conditions.append(Workspace.organization_id.in_(org_ids))

    ws_map: Dict[uuid.UUID, Workspace] = {}
    if ws_conditions:
        workspaces = list(
            (
                await db.execute(
                    select(Workspace)
                    .where(or_(*ws_conditions), Workspace.status == "ACTIVE")
                    .order_by(Workspace.created_at.asc())
                )
            )
            .scalars()
            .all()
        )
        for ws in workspaces:
            if scoped_org_id and ws.organization_id != scoped_org_id and not getattr(user, "is_superuser", False):
                continue
            ws_map[ws.id] = ws

    return org_map, ws_map, role_map


async def ensure_user_workspace_provisioned(
    user: User,
    db: AsyncSession,
) -> Tuple[List[Organization], List[Workspace]]:
    """
    Idempotently ensures `user` has an accessible Organization and Workspace.
    - If user already owns or is a member of an Organization, loads existing memberships and NEVER
      creates a duplicate Organization.
    - If user has zero organizations, creates one Personal Organization + OrganizationMember(OWNER) +
      Personal Workspace + Free Tier subscription & baseline entitlements.
    - Backfills any orphan projects/repositories owned by `user` with `workspace_id=None`.
    """
    org_map, ws_map, _ = await get_user_org_and_workspace_scope(user, db)

    if not org_map:
        from app.services.entitlement_service import PRODUCT_CATALOG_DEFINITIONS

        display_name = (user.name or user.email.split("@")[0] or "User").strip()
        org_id = uuid.uuid4()
        org = Organization(
            id=org_id,
            name=f"{display_name}'s Organization",
            slug=f"org-{user.id.hex[:8]}-{uuid.uuid4().hex[:4]}",
            owner_id=user.id,
            owner_name=display_name,
            owner_email=user.email,
            org_type="Personal",
            industry="Technology",
            status="ACTIVE",
        )
        db.add(org)
        await db.flush()

        member = OrganizationMember(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=user.id,
            role="OWNER",
            is_active=True,
        )
        db.add(member)

        sub = OrganizationSubscription(
            id=uuid.uuid4(),
            organization_id=org_id,
            plan="FREE_TIER",
            status="ACTIVE",
            billing_cycle="monthly",
            max_seats=5,
            used_seats=1,
        )
        db.add(sub)

        for prod_key, prod_meta in PRODUCT_CATALOG_DEFINITIONS.items():
            is_enabled = prod_key == "thing_code"
            db.add(
                ProductEntitlement(
                    id=uuid.uuid4(),
                    organization_id=org_id,
                    product_key=prod_key,
                    is_enabled=is_enabled,
                    status="ENABLED" if is_enabled else "LOCKED",
                    features=[f["name"] for f in prod_meta.get("features", [])],
                    source="DEFAULT_INITIALIZATION",
                )
            )
        org_map[org_id] = org

    primary_org = next(iter(org_map.values()))

    if not ws_map:
        display_name = (user.name or user.email.split("@")[0] or "Personal").strip()
        ws = Workspace(
            id=uuid.uuid4(),
            owner_id=user.id,
            organization_id=primary_org.id,
            workspace_type="PERSONAL" if primary_org.owner_id == user.id else "ORGANIZATION",
            name="Personal Workspace" if primary_org.owner_id == user.id else f"{primary_org.name} Workspace",
            slug=f"personal-{user.id.hex[:8]}-{uuid.uuid4().hex[:4]}",
            description="Primary Kavach security workspace",
            visibility="Private",
            default_branch="main",
            region=primary_org.region or "ap-south-1 (Mumbai)",
            deployment_target="Kubernetes",
            admins=[display_name],
            status="ACTIVE",
            environments_count=1,
        )
        db.add(ws)
        await db.flush()
        ws_map[ws.id] = ws

    primary_ws = next(iter(ws_map.values()))

    # Backfill orphan projects owned by user without workspace_id/organization_id
    await db.execute(
        update(Project)
        .where(Project.owner_id == user.id, Project.workspace_id.is_(None))
        .values(workspace_id=primary_ws.id, organization_id=primary_ws.organization_id or primary_org.id)
    )
    await db.execute(
        update(Project)
        .where(Project.owner_id == user.id, Project.organization_id.is_(None))
        .values(organization_id=primary_ws.organization_id or primary_org.id)
    )

    if not getattr(user, "default_workspace_id", None):
        user.default_workspace_id = primary_ws.id
        db.add(user)

    await db.commit()
    return list(org_map.values()), list(ws_map.values())


async def get_accessible_projects(
    user: User,
    db: AsyncSession,
    org_id: Optional[uuid.UUID] = None,
    workspace_id: Optional[uuid.UUID] = None,
) -> List[Project]:
    """
    Returns all non-deleted projects accessible to `user` via direct ownership,
    workspace ownership/membership, or active organization membership.
    If `org_id` is supplied, strictly scopes to that organization.
    """
    is_super = getattr(user, "is_superuser", False)
    if is_super and not org_id and not workspace_id:
        res = await db.execute(
            select(Project)
            .where(Project.deleted_at.is_(None))
            .order_by(Project.created_at.desc())
        )
        return list(res.scalars().all())

    org_map, ws_map, _ = await get_user_org_and_workspace_scope(user, db, scoped_org_id=org_id)
    accessible_org_ids = set(org_map.keys())
    accessible_ws_ids = set(ws_map.keys())

    if workspace_id:
        if not is_super and workspace_id not in accessible_ws_ids:
            return []
        stmt = (
            select(Project)
            .where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None))
            .order_by(Project.created_at.desc())
        )
        return list((await db.execute(stmt)).scalars().all())

    conditions = []
    if not org_id:
        conditions.append(Project.owner_id == user.id)
    if accessible_ws_ids:
        conditions.append(Project.workspace_id.in_(accessible_ws_ids))
    if accessible_org_ids:
        conditions.append(Project.organization_id.in_(accessible_org_ids))

    if not conditions:
        return []

    stmt = (
        select(Project)
        .where(and_(or_(*conditions), Project.deleted_at.is_(None)))
        .order_by(Project.created_at.desc())
    )
    projects = list((await db.execute(stmt)).scalars().all())
    if org_id and not is_super:
        projects = [
            p
            for p in projects
            if p.organization_id == org_id
            or (p.workspace_id in accessible_ws_ids and ws_map[p.workspace_id].organization_id == org_id)
        ]
    return projects


async def user_can_access_project(
    user: User,
    project: Project,
    db: AsyncSession,
    scoped_org_id: Optional[uuid.UUID] = None,
) -> bool:
    """Verifies whether `user` has authorized access to `project` within optional `scoped_org_id`."""
    if project.deleted_at is not None:
        return False
    if getattr(user, "is_superuser", False):
        if scoped_org_id and project.organization_id and project.organization_id != scoped_org_id:
            return False
        return True

    if scoped_org_id:
        if project.organization_id and project.organization_id != scoped_org_id:
            return False

    if project.owner_id == user.id and not scoped_org_id:
        return True

    org_map, ws_map, _ = await get_user_org_and_workspace_scope(user, db, scoped_org_id=scoped_org_id)
    if project.organization_id and project.organization_id in org_map:
        return True
    if project.workspace_id and project.workspace_id in ws_map:
        return True
    if project.owner_id == user.id and (
        not scoped_org_id or project.organization_id == scoped_org_id or project.organization_id is None
    ):
        return True
    return False


async def set_client_active_project(
    user: User,
    client_id: str,
    project: Project,
    db: AsyncSession,
    set_as_default: bool = False,
    client_name: Optional[str] = None,
    git_remote: Optional[str] = None,
) -> MCPClientContext:
    """Persists active workspace/project context for `(user.id, client_id)` and optionally updates user default."""
    now = datetime.now(timezone.utc)
    stmt = select(MCPClientContext).where(
        MCPClientContext.user_id == user.id,
        MCPClientContext.client_id == client_id,
    )
    ctx = (await db.execute(stmt)).scalar_one_or_none()
    norm_remote = normalize_git_remote(git_remote) or normalize_git_remote(project.repository_url)

    if ctx:
        ctx.active_project_id = project.id
        ctx.workspace_id = project.workspace_id
        ctx.organization_id = project.organization_id
        if client_name:
            ctx.client_name = client_name
        if norm_remote:
            ctx.matched_git_remote = norm_remote
        ctx.last_seen_at = now
        db.add(ctx)
    else:
        ctx = MCPClientContext(
            user_id=user.id,
            client_id=client_id,
            client_name=client_name or client_id,
            organization_id=project.organization_id,
            workspace_id=project.workspace_id,
            active_project_id=project.id,
            matched_git_remote=norm_remote,
            last_seen_at=now,
        )
        db.add(ctx)

    if set_as_default or not getattr(user, "default_project_id", None):
        user.default_project_id = project.id
        if project.workspace_id:
            user.default_workspace_id = project.workspace_id
        db.add(user)

    await db.commit()
    await db.refresh(ctx)
    return ctx


async def match_repository_for_user(
    user: User,
    git_remote: str,
    db: AsyncSession,
    client_id: Optional[str] = None,
    scoped_org_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """
    Matches a local Git remote URL (`origin`) against authorized Kavach projects & GitHub repositories.
    If matched, persists per-client project context and returns resolved metadata.
    """
    norm_target = normalize_git_remote(git_remote)
    accessible_projects = await get_accessible_projects(user, db, org_id=scoped_org_id)
    if not norm_target:
        return {
            "matched": False,
            "normalized_remote": None,
            "project": None,
            "repository": None,
            "candidates": accessible_projects,
        }

    matched_project: Optional[Project] = None
    matched_repo: Optional[GitHubRepository] = None

    # 1. Check connected GitHubRepository rows linked to accessible projects
    proj_ids = [p.id for p in accessible_projects]
    if proj_ids:
        repo_stmt = select(GitHubRepository).where(GitHubRepository.project_id.in_(proj_ids))
        repos = list((await db.execute(repo_stmt)).scalars().all())
        for r in repos:
            candidates_urls = [
                r.html_url,
                r.clone_url,
                r.ssh_url,
                f"github.com/{r.full_name}" if r.full_name else None,
            ]
            if any(normalize_git_remote(u) == norm_target for u in candidates_urls if u):
                matched_repo = r
                matched_project = next((p for p in accessible_projects if p.id == r.project_id), None)
                break

    # 2. Fallback: match directly against Project.repository_url
    if not matched_project:
        for p in accessible_projects:
            if normalize_git_remote(p.repository_url) == norm_target:
                matched_project = p
                break

    # 3. Also check GitHubRepositories in user's accessible workspaces (even if not yet linked to a project)
    if not matched_repo:
        _, ws_map, _ = await get_user_org_and_workspace_scope(user, db, scoped_org_id=scoped_org_id)
        if ws_map:
            ws_repos = list(
                (
                    await db.execute(
                        select(GitHubRepository).where(GitHubRepository.workspace_id.in_(list(ws_map.keys())))
                    )
                )
                .scalars()
                .all()
            )
            for r in ws_repos:
                candidates_urls = [
                    r.html_url,
                    r.clone_url,
                    r.ssh_url,
                    f"github.com/{r.full_name}" if r.full_name else None,
                ]
                if any(normalize_git_remote(u) == norm_target for u in candidates_urls if u):
                    matched_repo = r
                    if r.project_id:
                        matched_project = next((p for p in accessible_projects if p.id == r.project_id), None)
                    break

    if matched_project and client_id:
        await set_client_active_project(
            user=user,
            client_id=client_id,
            project=matched_project,
            db=db,
            git_remote=git_remote,
        )

    workspace: Optional[Workspace] = None
    if matched_project and matched_project.workspace_id:
        workspace = await db.get(Workspace, matched_project.workspace_id)

    return {
        "matched": matched_project is not None,
        "normalized_remote": norm_target,
        "project": matched_project,
        "workspace": workspace,
        "repository": matched_repo,
        "candidates": accessible_projects,
    }


async def resolve_project_context(
    user: User,
    db: AsyncSession,
    client_id: Optional[str] = None,
    explicit_project_id: Optional[str] = None,
    token_org_id: Optional[uuid.UUID] = None,
    token_workspace_id: Optional[uuid.UUID] = None,
    token_project_id: Optional[uuid.UUID] = None,
    git_remote: Optional[str] = None,
    allow_single_fallback: bool = True,
) -> ProjectResolutionResult:
    """
    Authoritative server-side project context resolver for MCP & OAuth.
    Never blindly trusts a model-supplied project_id; verifies user & org authorization.
    Resolution order:
      1. Explicit `project_id` argument (verified against DB & `token_org_id`)
      2. Explicit `git_remote` match (verified against accessible repos/projects)
      3. Per-client `MCPClientContext` (`user_id`, `client_id`)
      4. OAuth token bound `project_id` (`token_project_id`)
      5. User shared `default_project_id`
      6. Single accessible project auto-selection (if `len == 1`)
    """
    accessible_projects = await get_accessible_projects(user, db, org_id=token_org_id)

    async def _hydrate(proj: Project, source: str) -> ProjectResolutionResult:
        ws = await db.get(Workspace, proj.workspace_id) if proj.workspace_id else None
        org = await db.get(Organization, proj.organization_id) if proj.organization_id else None
        return ProjectResolutionResult(
            status="RESOLVED",
            project=proj,
            workspace=ws,
            organization=org,
            accessible_projects=accessible_projects,
            resolution_source=source,
        )

    # 1. Explicit project_id
    if explicit_project_id:
        try:
            target_uuid = uuid.UUID(str(explicit_project_id).strip())
        except (ValueError, TypeError):
            return ProjectResolutionResult(
                status="INVALID_INPUT",
                accessible_projects=accessible_projects,
                error_message=f"Invalid UUID format for 'project_id': '{explicit_project_id}'.",
            )
        proj = await db.get(Project, target_uuid)
        if not proj or proj.deleted_at is not None:
            return ProjectResolutionResult(
                status="NOT_FOUND",
                accessible_projects=accessible_projects,
                error_message=f"Project '{target_uuid}' not found.",
            )
        if not await user_can_access_project(user, proj, db, scoped_org_id=token_org_id):
            return ProjectResolutionResult(
                status="DENIED",
                accessible_projects=accessible_projects,
                error_message=(
                    f"Access denied: Project '{target_uuid}' belongs to another tenant or organization."
                ),
            )
        return await _hydrate(proj, "explicit")

    # 2. Git remote match
    if git_remote:
        match_res = await match_repository_for_user(
            user=user,
            git_remote=git_remote,
            db=db,
            client_id=client_id,
            scoped_org_id=token_org_id,
        )
        if match_res["matched"] and match_res["project"]:
            return await _hydrate(match_res["project"], "git_remote")

    # 3. Per-client active project context
    if client_id:
        ctx_stmt = select(MCPClientContext).where(
            MCPClientContext.user_id == user.id,
            MCPClientContext.client_id == client_id,
        )
        ctx = (await db.execute(ctx_stmt)).scalar_one_or_none()
        if ctx and ctx.active_project_id:
            proj = await db.get(Project, ctx.active_project_id)
            if proj and await user_can_access_project(user, proj, db, scoped_org_id=token_org_id):
                return await _hydrate(proj, "client_context")

    # 4. Token-bound project_id
    if token_project_id:
        proj = await db.get(Project, token_project_id)
        if proj and await user_can_access_project(user, proj, db, scoped_org_id=token_org_id):
            return await _hydrate(proj, "token")

    # 5. User shared default_project_id
    default_pid = getattr(user, "default_project_id", None)
    if default_pid:
        proj = await db.get(Project, default_pid)
        if proj and await user_can_access_project(user, proj, db, scoped_org_id=token_org_id):
            return await _hydrate(proj, "default_project")

    # 6. Auto-select if exactly 1 project exists (or 1 in workspace)
    if not accessible_projects:
        return ProjectResolutionResult(
            status="NO_PROJECTS",
            accessible_projects=[],
            error_message=(
                "No projects found in your authorized Kavach workspace. "
                "Use `create_project` or `connect_repository` to create one."
            ),
        )

    if allow_single_fallback and len(accessible_projects) == 1:
        sole = accessible_projects[0]
        if client_id:
            await set_client_active_project(user=user, client_id=client_id, project=sole, db=db)
        return await _hydrate(sole, "single_project")

    if token_workspace_id:
        ws_projs = [p for p in accessible_projects if p.workspace_id == token_workspace_id]
        if allow_single_fallback and len(ws_projs) == 1:
            return await _hydrate(ws_projs[0], "single_project")

    return ProjectResolutionResult(
        status="SELECTION_REQUIRED",
        accessible_projects=accessible_projects,
        error_message=(
            f"Multiple projects ({len(accessible_projects)}) are available in your workspace and no default is set. "
            "Call `list_projects` and then `set_active_project` once to choose your active project."
        ),
    )

