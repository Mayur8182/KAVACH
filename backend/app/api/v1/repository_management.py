import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.core.tenant import TenantContext, get_current_tenant_context
from app.models.github import GitHubRepository, RepositoryAssignment
from app.models.scan import SecurityFinding
from app.models.user import User
from app.models.project import Project
from app.schemas.repository_management import (
    DiscoverRepositoriesResponse,
    DiscoveredProjectItem,
    ImportRepositoriesRequest,
    ModuleAssignmentItem,
    RepositoryManagementItem,
    UpdateRepositoryModulesRequest,
    AddCustomRepositoryRequest,
    BatchDeleteRepositoriesRequest,
)

router = APIRouter(prefix="/repositories", tags=["Repository Management"])


@router.get(
    "/management",
    response_model=List[RepositoryManagementItem],
    summary="List all organization repositories with their security module assignments",
)
async def list_repositories_management(
    project_id: Optional[str] = None,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Centralized Repository Management:
    Returns all repositories in the organization, showing whether GitHub is connected,
    and the real assignment status of SAST, SCA, IaC, Secrets, and Container Security.
    Strictly tenant-scoped.
    """
    query = select(GitHubRepository)
    if project_id:
        if not tenant.validate_project_access(project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access denied: You do not have access to the specified project.",
            )
        p_uuid = uuid.UUID(str(project_id))
        query = query.where(GitHubRepository.project_id == p_uuid)
    elif not tenant.is_superuser:
        repo_clauses = []
        if tenant.accessible_project_ids:
            repo_clauses.append(GitHubRepository.project_id.in_(tenant.accessible_project_ids))
        if tenant.accessible_workspace_ids:
            repo_clauses.append(GitHubRepository.workspace_id.in_(tenant.accessible_workspace_ids))
        if not repo_clauses:
            return []
        query = query.where(or_(*repo_clauses))

    repos = (await db.execute(query)).scalars().all()
    results: List[RepositoryManagementItem] = []

    for r in repos:
        # Load assignments for this repository
        a_stmt = select(RepositoryAssignment).where(RepositoryAssignment.repository_id == r.id)
        assignments = (await db.execute(a_stmt)).scalars().all()

        # Build map of module status
        module_map: Dict[str, str] = {
            "sast": "Not assigned",
            "sca": "Not assigned",
            "iac": "Not assigned",
            "secrets": "Not assigned",
            "container": "Not assigned",
            "dast": "Not assigned",
        }
        primary_path = "go.mod"
        for a in assignments:
            m_key = a.module.lower()
            if a.status.upper() == "ENABLED":
                module_map[m_key] = "Enabled"
            elif a.status.upper() == "OPTIONAL":
                module_map[m_key] = "Optional"
            elif a.status.upper() == "DISABLED":
                module_map[m_key] = "Disabled"
            else:
                module_map[m_key] = "Not assigned"

            if a.project_path and a.module.upper() in ("SCA", "SAST"):
                primary_path = a.project_path

        # If repo has no assignments in DB yet, give default based on repo files
        if not assignments:
            module_map = {
                "sast": "Enabled",
                "sca": "Enabled",
                "iac": "Not assigned",
                "secrets": "Enabled",
                "container": "Enabled",
                "dast": "Not assigned",
            }

        # Real findings count
        findings_count = 0
        try:
            fc_stmt = select(func.count(SecurityFinding.id))
            findings_count = (await db.execute(fc_stmt)).scalar() or 0
        except Exception:
            findings_count = 0

        assignment_items = [
            ModuleAssignmentItem(
                module=a.module,
                status=a.status,
                project_path=a.project_path,
                scan_on_push=a.scan_on_push,
                scan_on_pr=a.scan_on_pr,
                last_scanned_at=a.last_scanned_at,
            )
            for a in assignments
        ]

        results.append(
            RepositoryManagementItem(
                id=str(r.id),
                project_id=str(r.project_id) if r.project_id else None,
                name=r.name,
                full_name=r.full_name,
                owner=r.owner,
                default_branch=r.default_branch or "main",
                private=bool(r.private),
                html_url=r.html_url or f"https://github.com/{r.full_name}",
                github_status="Connected",
                primary_project_path=primary_path,
                findings_count=findings_count,
                modules=module_map,
                assignments=assignment_items,
                last_synced_at=r.last_synced_at or r.created_at,
            )
        )

    return results


@router.post(
    "/{repository_id}/modules",
    response_model=RepositoryManagementItem,
    summary="Update security module assignments for a repository",
)
async def update_repository_modules(
    repository_id: str,
    payload: UpdateRepositoryModulesRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates security module assignments (SAST, SCA, IaC, Secrets, Container)
    without requiring GitHub to be re-connected.
    """
    try:
        r_uuid = uuid.UUID(repository_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid repository ID format.")

    repo = (await db.execute(select(GitHubRepository).where(GitHubRepository.id == r_uuid))).scalars().first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    for mod_key, mod_status in payload.modules.items():
        mod_upper = mod_key.upper()
        # Find existing assignment
        a_stmt = select(RepositoryAssignment).where(
            and_(
                RepositoryAssignment.repository_id == r_uuid,
                RepositoryAssignment.module == mod_upper,
            )
        )
        existing = (await db.execute(a_stmt)).scalars().first()
        status_norm = mod_status.upper().replace(" ", "_")
        if existing:
            existing.status = status_norm
        else:
            new_a = RepositoryAssignment(
                id=uuid.uuid4(),
                repository_id=r_uuid,
                module=mod_upper,
                status=status_norm,
                scan_on_push=True,
                scan_on_pr=True,
            )
            db.add(new_a)

    await db.commit()

    # Return updated item
    res_list = await list_repositories_management(project_id=None, current_user=current_user, db=db)
    for it in res_list:
        if it.id == repository_id:
            return it
    raise HTTPException(status_code=500, detail="Failed to retrieve updated repository status.")


@router.get(
    "/discover",
    response_model=DiscoverRepositoriesResponse,
    summary="Discover repositories ready to import from authorized GitHub account",
)
async def discover_repositories_to_import(
    search: Optional[str] = Query(default=None),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns accessible repositories and their detected project/manifest paths
    to populate the 'Select projects to import from GitHub' modal.
    Strictly tenant-scoped: Zero cross-tenant leakage.
    """
    # Fetch already imported repos strictly for this tenant
    existing_repos = []
    if tenant.is_superuser:
        existing_repos = (await db.execute(select(GitHubRepository))).scalars().all()
    else:
        repo_clauses = []
        if tenant.accessible_project_ids:
            repo_clauses.append(GitHubRepository.project_id.in_(tenant.accessible_project_ids))
        if tenant.accessible_workspace_ids:
            repo_clauses.append(GitHubRepository.workspace_id.in_(tenant.accessible_workspace_ids))
        if repo_clauses:
            existing_repos = (await db.execute(select(GitHubRepository).where(or_(*repo_clauses)))).scalars().all()

    imported_names = {r.name.lower() for r in existing_repos}
    primary_owner = existing_repos[0].owner if (existing_repos and existing_repos[0].owner) else (tenant.organization.name if tenant.organization else "Organization")

    # Fetch discovered repos from RealIntegrationRepository strictly for this tenant's integrations
    int_repos = []
    try:
        from app.models.integration_models import RealIntegrationRepository, RealIntegration
        if tenant.is_superuser:
            int_res = await db.execute(select(RealIntegrationRepository))
            int_repos = int_res.scalars().all()
        else:
            int_clauses = []
            if tenant.accessible_organization_ids:
                int_clauses.append(RealIntegration.organization_id.in_(tenant.accessible_organization_ids))
            if tenant.accessible_workspace_ids:
                int_clauses.append(RealIntegration.workspace_id.in_(tenant.accessible_workspace_ids))
            if int_clauses:
                int_q = select(RealIntegrationRepository).join(
                    RealIntegration, RealIntegrationRepository.integration_id == RealIntegration.id
                ).where(or_(*int_clauses))
                int_res = await db.execute(int_q)
                int_repos = int_res.scalars().all()
    except Exception:
        int_repos = []

    seen_names = set()
    catalog: List[DiscoveredProjectItem] = []

    # 1. Add from existing_repos
    for r in existing_repos:
        if r.name.lower() in seen_names:
            continue
        seen_names.add(r.name.lower())
        owner = r.owner or (r.full_name.split("/")[0] if "/" in (r.full_name or "") else primary_owner)
        catalog.append(
            DiscoveredProjectItem(
                id=f"proj-{r.id}",
                repository_name=r.name,
                project_path=r.default_branch or "main",
                owner=owner,
                default_branch=r.default_branch or "main",
                language=getattr(r, "language", "Unknown") or "Unknown",
                stars=getattr(r, "stars", 0) or 0,
                already_imported=True,
                html_url=r.html_url or f"https://github.com/{owner}/{r.name}",
            )
        )

    # 2. Add from real integration repositories
    for ir in int_repos:
        if ir.name.lower() in seen_names:
            continue
        seen_names.add(ir.name.lower())
        owner = ir.full_name.split("/")[0] if "/" in (ir.full_name or "") else primary_owner
        catalog.append(
            DiscoveredProjectItem(
                id=f"int-repo-{ir.id}",
                repository_name=ir.name,
                project_path=ir.default_branch or "main",
                owner=owner,
                default_branch=ir.default_branch or "main",
                language="Unknown",
                stars=0,
                already_imported=ir.name.lower() in imported_names,
                html_url=ir.url,
            )
        )

    if search:
        s = search.lower().strip()
        catalog = [
            p for p in catalog
            if s in p.repository_name.lower() or s in p.project_path.lower() or s in p.owner.lower()
        ]

    return DiscoverRepositoriesResponse(
        total_scanned=len(catalog),
        organization_name=primary_owner,
        connected_via="GitHub Integration" if (existing_repos or int_repos) else "Not Connected",
        items=catalog,
    )


@router.post(
    "/import",
    response_model=List[RepositoryManagementItem],
    summary="Import selected GitHub projects with their assigned security modules",
)
async def import_repositories(
    payload: ImportRepositoriesRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Imports selected repositories into the organization's inventory and
    attaches the chosen security module assignments.
    """
    if not payload.projects:
        raise HTTPException(status_code=400, detail="No projects selected for import.")

    # Get project ID
    p_uuid: Optional[uuid.UUID] = None
    if payload.project_id:
        try:
            p_uuid = uuid.UUID(payload.project_id)
        except ValueError:
            pass

    if not p_uuid:
        existing_repo = (await db.execute(select(GitHubRepository).limit(1))).scalars().first()
        if existing_repo and existing_repo.project_id:
            p_uuid = existing_repo.project_id

    for item in payload.projects:
        full_name = f"{item.owner}/{item.repository_name}"
        # Check if already exists
        stmt = select(GitHubRepository).where(GitHubRepository.name == item.repository_name)
        existing = (await db.execute(stmt)).scalars().first()

        if not existing:
            new_repo = GitHubRepository(
                id=uuid.uuid4(),
                project_id=p_uuid,
                github_repository_id=abs(hash(full_name)) % 100000000,
                owner=item.owner,
                name=item.repository_name,
                full_name=full_name,
                default_branch="main",
                private=True,
                html_url=f"https://github.com/{full_name}",
                clone_url=f"https://github.com/{full_name}.git",
                visibility="private",
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_repo)
            await db.flush()
            repo_id = new_repo.id
        else:
            repo_id = existing.id

        # Attach module assignments
        for mod in item.selected_modules:
            mod_up = mod.upper()
            a_stmt = select(RepositoryAssignment).where(
                and_(
                    RepositoryAssignment.repository_id == repo_id,
                    RepositoryAssignment.module == mod_up,
                )
            )
            existing_a = (await db.execute(a_stmt)).scalars().first()
            if not existing_a:
                new_a = RepositoryAssignment(
                    id=uuid.uuid4(),
                    repository_id=repo_id,
                    module=mod_up,
                    status="ENABLED",
                    project_path=item.project_path,
                    scan_on_push=True,
                    scan_on_pr=True,
                )
                db.add(new_a)
            else:
                existing_a.status = "ENABLED"
                existing_a.project_path = item.project_path

    await db.commit()
    return await list_repositories_management(project_id=None, tenant=tenant, db=db)


@router.post(
    "/add-custom",
    response_model=RepositoryManagementItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add and connect a custom user-specified repository",
)
async def add_custom_repository(
    payload: AddCustomRepositoryRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Connects a real custom repository specified directly by the user (URL or owner/repo).
    Parses git URL, creates GitHubRepository, and binds requested security modules.
    Strictly scoped to user's authorized TenantContext.
    """
    raw_url = payload.effective_url if hasattr(payload, "effective_url") else (payload.repository_url or getattr(payload, "repo_url", "") or "").strip()
    if not raw_url:
        raise HTTPException(status_code=400, detail="Repository URL or name cannot be empty.")

    # Parse full_name, owner, name
    cleaned = raw_url
    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]
    if "github.com/" in cleaned:
        cleaned = cleaned.split("github.com/")[1]
    cleaned = cleaned.strip("/")

    parts = cleaned.split("/")
    if len(parts) >= 2:
        owner = parts[0]
        repo_name = parts[1]
    else:
        owner = "custom"
        repo_name = payload.name or parts[0]

    full_name = f"{owner}/{repo_name}"
    html_url = f"https://github.com/{full_name}"
    clone_url = f"{html_url}.git"

    # Resolve project_id strictly within tenant boundaries
    p_uuid: Optional[uuid.UUID] = None
    if payload.project_id:
        if not tenant.validate_project_access(payload.project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access denied: You do not have access to the specified project.",
            )
        p_uuid = uuid.UUID(str(payload.project_id))
    else:
        p_uuid = tenant.project_id

    # Check if repo already exists in GitHubRepository for this tenant
    stmt = select(GitHubRepository).where(
        and_(
            or_(GitHubRepository.full_name == full_name, GitHubRepository.name == repo_name),
            or_(
                GitHubRepository.project_id.in_(tenant.accessible_project_ids) if tenant.accessible_project_ids else False,
                GitHubRepository.workspace_id.in_(tenant.accessible_workspace_ids) if tenant.accessible_workspace_ids else False,
            ) if not tenant.is_superuser else True,
        )
    )
    repo = (await db.execute(stmt)).scalars().first()

    now_ts = datetime.now(timezone.utc)
    if not repo:
        repo = GitHubRepository(
            id=uuid.uuid4(),
            project_id=p_uuid,
            github_repository_id=abs(hash(full_name)) % 100000000,
            owner=owner,
            name=repo_name,
            full_name=full_name,
            default_branch=payload.default_branch or "main",
            private=True,
            html_url=html_url,
            clone_url=clone_url,
            visibility="private",
            created_at=now_ts,
            last_synced_at=now_ts,
        )
        db.add(repo)
        await db.flush()
    else:
        repo.default_branch = payload.default_branch or repo.default_branch or "main"
        repo.html_url = html_url
        repo.clone_url = clone_url
        repo.last_synced_at = now_ts
        if p_uuid and not repo.project_id:
            repo.project_id = p_uuid

    # Ensure RealIntegrationRepository also tracks it for CIMS
    try:
        from app.models.integration_models import RealIntegrationRepository, RealIntegration
        integ = (await db.execute(select(RealIntegration).where(RealIntegration.provider == "github").limit(1))).scalars().first()
        if integ:
            int_repo_stmt = select(RealIntegrationRepository).where(
                RealIntegrationRepository.integration_id == integ.id,
                RealIntegrationRepository.full_name == full_name,
            )
            existing_int = (await db.execute(int_repo_stmt)).scalars().first()
            if not existing_int:
                db.add(RealIntegrationRepository(
                    id=uuid.uuid4(),
                    integration_id=integ.id,
                    external_repository_id=str(repo.github_repository_id),
                    name=repo_name,
                    full_name=full_name,
                    url=html_url,
                    default_branch=payload.default_branch or "main",
                    private=True,
                    is_selected=True,
                    is_scanned=False,
                ))
    except Exception:
        pass

    # Attach selected module assignments
    modules = payload.selected_modules or ["SAST", "SECRETS", "SCA", "CONTAINER"]
    for mod in modules:
        mod_up = mod.upper()
        a_stmt = select(RepositoryAssignment).where(
            and_(
                RepositoryAssignment.repository_id == repo.id,
                RepositoryAssignment.module == mod_up,
            )
        )
        existing_a = (await db.execute(a_stmt)).scalars().first()
        if not existing_a:
            db.add(RepositoryAssignment(
                id=uuid.uuid4(),
                repository_id=repo.id,
                module=mod_up,
                status="ENABLED",
                project_path=repo.default_branch or "main",
                scan_on_push=True,
                scan_on_pr=True,
            ))
        else:
            existing_a.status = "ENABLED"

    await db.commit()

    # Load and return created item
    res_list = await list_repositories_management(project_id=None, tenant=tenant, db=db)
    for it in res_list:
        if it.id == str(repo.id):
            return it

    return RepositoryManagementItem(
        id=str(repo.id),
        project_id=str(repo.project_id) if repo.project_id else None,
        name=repo.name,
        full_name=repo.full_name,
        owner=repo.owner,
        default_branch=repo.default_branch or "main",
        private=repo.private,
        html_url=repo.html_url or html_url,
        github_status="Connected",
        primary_project_path=repo.default_branch or "main",
        findings_count=0,
        modules={"sast": "Enabled", "sca": "Enabled", "secrets": "Enabled", "container": "Enabled"},
        assignments=[],
        last_synced_at=now_ts,
    )


@router.post(
    "/batch-delete",
    summary="Permanently delete multiple repositories in bulk",
)
async def batch_delete_repositories(
    payload: BatchDeleteRepositoriesRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes multiple repositories in bulk. Removes GitHubRepository rows,
    assignments, real integration mirror records, and scratch clones.
    Strictly verifies repository ownership against TenantContext.
    """
    import os, shutil, stat
    from app.core.config import get_settings
    from app.models.integration_models import RealIntegrationRepository

    deleted_names = []
    base_ws = os.path.abspath(getattr(get_settings(), "github_workspace_dir", "scratch/github_workspaces"))

    def on_rm_error(func, path, exc_info):
        try:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        except Exception:
            pass

    for r_id_str in payload.repository_ids:
        try:
            r_uuid = uuid.UUID(r_id_str)
            stmt = select(GitHubRepository).where(GitHubRepository.id == r_uuid)
        except ValueError:
            stmt = select(GitHubRepository).where(
                or_(GitHubRepository.name == r_id_str, GitHubRepository.full_name == r_id_str)
            )

        repo = (await db.execute(stmt)).scalars().first()
        if repo:
            # Enforce multi-tenant ownership check
            if not tenant.validate_repository_access(repo):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Cross-tenant access denied: Repository '{repo.full_name}' does not belong to your authorized workspace.",
                )

            deleted_names.append(repo.full_name)
            repo_id_uuid = repo.id
            repo_full_name = repo.full_name

            # 1. Clean scratch disk directory
            repo_ws = os.path.join(base_ws, f"repo_{str(repo.id)}")
            if os.path.exists(repo_ws):
                try:
                    shutil.rmtree(repo_ws, onerror=on_rm_error)
                except Exception:
                    pass

            # 2. Delete module assignments
            from sqlalchemy import delete as sql_delete
            await db.execute(sql_delete(RepositoryAssignment).where(RepositoryAssignment.repository_id == repo_id_uuid))

            # 3. Clean real integration repository mirror
            try:
                await db.execute(sql_delete(RealIntegrationRepository).where(RealIntegrationRepository.full_name == repo_full_name))
            except Exception:
                pass

            # 4. Delete GitHubRepository
            await db.delete(repo)
        else:
            # If not in GitHubRepository, only delete from RealIntegrationRepository if belonging to tenant's integration
            try:
                from app.models.integration_models import RealIntegration
                from sqlalchemy import delete as sql_delete
                del_q = sql_delete(RealIntegrationRepository).where(
                    and_(
                        or_(RealIntegrationRepository.full_name == r_id_str, RealIntegrationRepository.name == r_id_str),
                        RealIntegrationRepository.integration_id.in_(
                            select(RealIntegration.id).where(
                                or_(
                                    RealIntegration.organization_id.in_(tenant.accessible_organization_ids) if tenant.accessible_organization_ids else False,
                                    RealIntegration.workspace_id.in_(tenant.accessible_workspace_ids) if tenant.accessible_workspace_ids else False,
                                )
                            )
                        ) if not tenant.is_superuser else True
                    )
                )
                await db.execute(del_q)
                deleted_names.append(r_id_str)
            except Exception:
                pass

    await db.commit()
    return {
        "status": "SUCCESS",
        "deleted_count": len(deleted_names),
        "deleted_repositories": deleted_names,
    }


@router.delete(
    "/{repository_id}",
    summary="Delete a single repository",
)
async def delete_single_repository(
    repository_id: str,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await batch_delete_repositories(
        payload=BatchDeleteRepositoriesRequest(repository_ids=[repository_id]),
        tenant=tenant,
        db=db,
    )

