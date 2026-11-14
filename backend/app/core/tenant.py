"""
Kavach Centralized Tenant Context & Multi-Tenant Authorization Engine.

Enforces strict tenant hierarchy:
User -> Organization -> Workspace -> Project -> Repository -> Branch -> Scan -> Finding

Rules:
1. Deterministic server-side resolution: Never trust client-supplied tenant/workspace/project IDs
   without verifying database-backed authorization.
2. Deny-by-default: If a user is not an explicit owner or member of the target resource,
   raise 403 Forbidden.
3. Zero cross-tenant data leakage across repositories, scans, findings, RAG, and MCP tools.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional, Set, Union

from fastapi import Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.invitation import OrganizationMember
from app.models.organization import Organization, Workspace
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger("kavach.tenant")


class TenantContext:
    """
    Authoritative security context derived server-side for the current request.
    Validates resource access and supplies tenant-scoped query boundaries.
    """

    def __init__(
        self,
        user: User,
        organization: Optional[Organization],
        workspace: Optional[Workspace],
        project: Optional[Project],
        accessible_project_ids: Set[uuid.UUID],
        accessible_workspace_ids: Set[uuid.UUID],
        accessible_organization_ids: Set[uuid.UUID],
        user_role: str = "VIEWER",
        is_superuser: bool = False,
    ):
        self.user = user
        self.organization = organization
        self.workspace = workspace
        self.project = project
        self.accessible_project_ids = accessible_project_ids
        self.accessible_workspace_ids = accessible_workspace_ids
        self.accessible_organization_ids = accessible_organization_ids
        self.user_role = user_role.upper()
        self.is_superuser = is_superuser

    @property
    def user_id(self) -> uuid.UUID:
        return self.user.id

    @property
    def organization_id(self) -> Optional[uuid.UUID]:
        return self.organization.id if self.organization else None

    @property
    def workspace_id(self) -> Optional[uuid.UUID]:
        return self.workspace.id if self.workspace else None

    @property
    def project_id(self) -> Optional[uuid.UUID]:
        return self.project.id if self.project else None

    def validate_project_access(self, target_project_id: Optional[Union[str, uuid.UUID]]) -> bool:
        """Verifies if the tenant context allows access to the target project ID."""
        if self.is_superuser:
            return True
        if not target_project_id:
            return False
        try:
            p_uuid = target_project_id if isinstance(target_project_id, uuid.UUID) else uuid.UUID(str(target_project_id))
        except (ValueError, TypeError):
            return False
        return p_uuid in self.accessible_project_ids

    def validate_workspace_access(self, target_workspace_id: Optional[Union[str, uuid.UUID]]) -> bool:
        """Verifies if the tenant context allows access to the target workspace ID."""
        if self.is_superuser:
            return True
        if not target_workspace_id:
            return False
        try:
            ws_uuid = target_workspace_id if isinstance(target_workspace_id, uuid.UUID) else uuid.UUID(str(target_workspace_id))
        except (ValueError, TypeError):
            return False
        return ws_uuid in self.accessible_workspace_ids

    def validate_repository_access(self, repo: Any) -> bool:
        """Verifies that a GitHubRepository belongs to an authorized project or workspace."""
        if self.is_superuser:
            return True
        if not repo:
            return False
        if getattr(repo, "project_id", None) and repo.project_id in self.accessible_project_ids:
            return True
        if getattr(repo, "workspace_id", None) and repo.workspace_id in self.accessible_workspace_ids:
            return True
        return False

    def has_permission(self, action: str, resource_type: str) -> bool:
        """Role-Based & Action-Based authorization check."""
        if self.is_superuser:
            return True
        # Owner & Admin have full access
        if self.user_role in ("OWNER", "ADMIN", "SECURITY_ADMIN"):
            return True
        # Developer can read, execute scans, create fixes, and PRs
        if self.user_role == "DEVELOPER":
            if action in ("READ", "SCAN", "REMEDIATE", "PULL_REQUEST", "DISCOVER"):
                return True
            if action in ("MANAGE_WORKSPACE", "DELETE", "MANAGE_INTEGRATION", "ENFORCE_POLICY"):
                return False
        # Analyst can read findings, scans, reports, and generate proposals
        if self.user_role in ("ANALYST", "AUDITOR"):
            return action in ("READ", "REPORT", "DISCOVER", "EVALUATE")
        # Viewer is read-only
        return action in ("READ", "DISCOVER")


async def get_current_tenant_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    header_org_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    header_ws_id: Optional[str] = Header(None, alias="X-Workspace-ID"),
    header_proj_id: Optional[str] = Header(None, alias="X-Project-ID"),
    query_ws_id: Optional[str] = Query(None, alias="workspace_id"),
    query_proj_id: Optional[str] = Query(None, alias="project_id"),
) -> TenantContext:
    """
    FastAPI dependency that securely resolves the authoritative TenantContext.
    Verifies that any requested organization, workspace, or project is legitimately
    accessible by current_user.
    """
    is_super = getattr(current_user, "is_superuser", False)

    # 1. Resolve User Organizations (Owned + Member)
    owned_org_stmt = select(Organization).where(Organization.owner_id == current_user.id)
    owned_orgs = (await db.execute(owned_org_stmt)).scalars().all()

    member_org_stmt = select(OrganizationMember).where(
        and_(OrganizationMember.user_id == current_user.id, OrganizationMember.is_active == True)
    )
    memberships = (await db.execute(member_org_stmt)).scalars().all()
    member_org_ids = [m.organization_id for m in memberships]

    member_orgs: List[Organization] = []
    if member_org_ids:
        member_orgs = (
            await db.execute(select(Organization).where(Organization.id.in_(member_org_ids)))
        ).scalars().all()

    all_orgs = {org.id: org for org in list(owned_orgs) + list(member_orgs)}
    accessible_org_ids = set(all_orgs.keys())

    # Determine user role within primary organization
    user_role = "OWNER" if owned_orgs else ("MEMBER" if memberships else "DEVELOPER")
    if memberships and not owned_orgs:
        user_role = memberships[0].role.upper()

    # 2. Resolve User Workspaces
    ws_conditions = [Workspace.owner_id == current_user.id]
    if accessible_org_ids:
        ws_conditions.append(Workspace.organization_id.in_(accessible_org_ids))

    all_workspaces = (
        await db.execute(select(Workspace).where(or_(*ws_conditions)))
    ).scalars().all()
    workspace_map = {ws.id: ws for ws in all_workspaces}
    accessible_workspace_ids = set(workspace_map.keys())

    # 3. Resolve User Projects
    proj_conditions = [Project.owner_id == current_user.id]
    if accessible_workspace_ids:
        proj_conditions.append(Project.workspace_id.in_(accessible_workspace_ids))
    if accessible_org_ids:
        proj_conditions.append(Project.organization_id.in_(accessible_org_ids))

    all_projects = (
        await db.execute(
            select(Project).where(
                and_(or_(*proj_conditions), Project.deleted_at.is_(None))
            )
        )
    ).scalars().all()
    project_map = {p.id: p for p in all_projects}
    accessible_project_ids = set(project_map.keys())

    # 4. Resolve Active Organization
    target_org_id_str = header_org_id
    active_org: Optional[Organization] = None
    if target_org_id_str:
        try:
            target_org_uuid = uuid.UUID(target_org_id_str)
            if target_org_uuid in accessible_org_ids:
                active_org = all_orgs[target_org_uuid]
            elif not is_super:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access denied: You do not have access to the requested organization.",
                )
        except ValueError:
            pass

    if not active_org and all_orgs:
        active_org = next(iter(all_orgs.values()))

    # 5. Resolve Active Workspace
    target_ws_id_str = query_ws_id or header_ws_id
    active_workspace: Optional[Workspace] = None
    if target_ws_id_str:
        try:
            target_ws_uuid = uuid.UUID(str(target_ws_id_str))
            if target_ws_uuid in accessible_workspace_ids:
                active_workspace = workspace_map[target_ws_uuid]
            elif not is_super:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access denied: You do not have access to the requested workspace.",
                )
        except ValueError:
            pass

    if not active_workspace and all_workspaces:
        active_workspace = all_workspaces[0]

    # 6. Resolve Active Project
    target_proj_id_str = query_proj_id or header_proj_id
    active_project: Optional[Project] = None
    if target_proj_id_str:
        try:
            target_proj_uuid = uuid.UUID(str(target_proj_id_str))
            if target_proj_uuid in accessible_project_ids:
                active_project = project_map[target_proj_uuid]
            elif not is_super:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access denied: You do not have access to the requested project.",
                )
        except ValueError:
            pass

    if not active_project and all_projects:
        # Prioritize project in active workspace
        if active_workspace:
            ws_projs = [p for p in all_projects if p.workspace_id == active_workspace.id]
            if ws_projs:
                active_project = ws_projs[0]
        if not active_project:
            active_project = all_projects[0]

    # Auto-provision baseline personal workspace if user has absolutely none
    if not active_workspace and not all_workspaces:
        owner_name = current_user.name or (current_user.email.split("@")[0] if current_user.email else "Workspace")
        new_ws = Workspace(
            name=f"{owner_name.capitalize()}'s Workspace",
            slug=f"ws-{current_user.id.hex[:8]}",
            owner_id=current_user.id,
            workspace_type="PERSONAL",
            visibility="Private",
        )
        db.add(new_ws)
        await db.flush()
        active_workspace = new_ws
        accessible_workspace_ids.add(new_ws.id)

    return TenantContext(
        user=current_user,
        organization=active_org,
        workspace=active_workspace,
        project=active_project,
        accessible_project_ids=accessible_project_ids,
        accessible_workspace_ids=accessible_workspace_ids,
        accessible_organization_ids=accessible_org_ids,
        user_role=user_role,
        is_superuser=is_super,
    )


def require_permission(action: str, resource_type: str):
    """
    FastAPI dependency factory enforcing RBAC/ABAC on route endpoints.
    """
    async def permission_checker(
        tenant: TenantContext = Depends(get_current_tenant_context),
    ) -> TenantContext:
        if not tenant.has_permission(action, resource_type):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Action '{action}' on '{resource_type}' requires higher privileges.",
            )
        return tenant

    return permission_checker
