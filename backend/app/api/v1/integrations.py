import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.integration import IntegrationCreate, IntegrationResponse, IntegrationUpdate
from app.services.integration_service import IntegrationService

router = APIRouter(prefix="/integrations", tags=["Integrations"])

@router.post(
    "",
    response_model=IntegrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new integration",
    description="Registers a new integration with a provider like GitHub, AWS, etc."
)
async def create_integration(
    payload: IntegrationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntegrationResponse:
    request_id = getattr(request.state, "request_id", None)
    service = IntegrationService(db)
    integration = await service.create_integration(payload, current_user=current_user, request_id=request_id)
    return IntegrationResponse.model_validate(integration)

@router.get(
    "",
    response_model=List[IntegrationResponse],
    summary="List integrations for a project",
    description="Retrieves persisted integrations for a specific project."
)
async def list_integrations(
    project_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[IntegrationResponse]:
    service = IntegrationService(db)
    integrations = await service.list_integrations(project_id=project_id, limit=limit, offset=offset)
    return [IntegrationResponse.model_validate(i) for i in integrations]

@router.get(
    "/{integration_id}",
    response_model=IntegrationResponse,
    summary="Retrieve integration details",
)
async def get_integration(
    integration_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntegrationResponse:
    service = IntegrationService(db)
    integration = await service.get_integration(integration_id)
    return IntegrationResponse.model_validate(integration)

@router.patch(
    "/{integration_id}",
    response_model=IntegrationResponse,
    summary="Update integration metadata/credentials",
)
async def update_integration(
    integration_id: uuid.UUID,
    payload: IntegrationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntegrationResponse:
    request_id = getattr(request.state, "request_id", None)
    service = IntegrationService(db)
    integration = await service.update_integration(
        integration_id, payload, current_user=current_user, request_id=request_id
    )
    return IntegrationResponse.model_validate(integration)

@router.delete(
    "/{integration_id}",
    response_model=IntegrationResponse,
    summary="Delete an integration",
)
async def delete_integration(
    integration_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntegrationResponse:
    request_id = getattr(request.state, "request_id", None)
    service = IntegrationService(db)
    deleted = await service.delete_integration(
        integration_id, current_user=current_user, request_id=request_id
    )
    return IntegrationResponse.model_validate(deleted)


@router.get(
    "/github/status",
    summary="Get GitHub integration connection status",
    description="Checks whether the authenticated user or their project has an active GitHub OAuth connection.",
)
async def get_github_integration_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json
    from sqlalchemy import select
    from app.models.project import Project
    from app.models.integration import Integration
    from app.core.config import get_settings

    settings = get_settings()

    # Look for user's projects
    proj_stmt = select(Project).where(Project.owner_id == current_user.id)
    proj_res = await db.execute(proj_stmt)
    projects = proj_res.scalars().all()
    project_ids = [p.id for p in projects]

    integ = None
    if project_ids:
        integ_stmt = (
            select(Integration)
            .where(Integration.project_id.in_(project_ids), Integration.provider == "github", Integration.is_connected == True)
            .order_by(Integration.updated_at.desc())
        )
        integ_res = await db.execute(integ_stmt)
        integ = integ_res.scalars().first()

    if integ and integ.credentials_json:
        try:
            creds = json.loads(integ.credentials_json)
            return {
                "connected": True,
                "login": creds.get("login") or creds.get("username"),
                "name": creds.get("name"),
                "avatar_url": creds.get("avatar_url"),
                "scopes": creds.get("scopes", ["repo", "read:user", "user:email"]),
                "source": "oauth",
            }
        except Exception:
            pass

    # Check user-owned RealIntegration as well
    from app.models.integration_models import RealIntegration
    from app.core.encryption import decrypt_secret
    from sqlalchemy import or_

    real_conditions = [
        RealIntegration.created_by == str(current_user.id),
        RealIntegration.created_by == current_user.email,
        RealIntegration.external_account_name == current_user.email,
    ]
    if project_ids:
        real_conditions.append(RealIntegration.workspace_id.in_(project_ids))

    real_stmt = (
        select(RealIntegration)
        .where(
            RealIntegration.provider == "github",
            RealIntegration.status == "connected",
            or_(*real_conditions),
        )
        .order_by(RealIntegration.updated_at.desc())
    )
    real_integ = (await db.execute(real_stmt)).scalars().first()
    if real_integ:
        return {
            "connected": True,
            "login": real_integ.external_account_name or (current_user.name or current_user.email.split('@')[0]),
            "name": real_integ.organization_name or current_user.name,
            "avatar_url": None,
            "scopes": real_integ.scopes or ["repo", "read:user"],
            "source": "oauth",
        }

    return {
        "connected": False,
        "login": None,
        "name": None,
        "avatar_url": None,
        "scopes": [],
        "source": None,
    }


@router.get(
    "/github/repos",
    summary="List real repositories for the connected GitHub account",
    description="Fetches the authenticated user's repositories from GitHub REST API.",
)
async def list_github_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json
    import httpx
    from sqlalchemy import select, or_
    from app.models.project import Project
    from app.models.integration import Integration
    from app.models.integration_models import RealIntegration, RealIntegrationRepository
    from app.models.github import GitHubRepository
    from app.core.config import get_settings
    from app.core.encryption import decrypt_secret

    # 1. Retrieve access token from user-specific integration only
    proj_stmt = select(Project).where(Project.owner_id == current_user.id)
    proj_res = await db.execute(proj_stmt)
    projects = proj_res.scalars().all()
    project_ids = [p.id for p in projects]

    access_token = None
    login_name = None

    if project_ids:
        integ_stmt = (
            select(Integration)
            .where(Integration.project_id.in_(project_ids), Integration.provider == "github", Integration.is_connected == True)
            .order_by(Integration.updated_at.desc())
        )
        integ_res = await db.execute(integ_stmt)
        integ = integ_res.scalars().first()
        if integ and integ.credentials_json:
            try:
                creds = json.loads(integ.credentials_json)
                access_token = creds.get("access_token")
                login_name = creds.get("login")
            except Exception:
                pass

    real_conditions = [
        RealIntegration.created_by == str(current_user.id),
        RealIntegration.created_by == current_user.email,
        RealIntegration.external_account_name == current_user.email,
    ]
    if project_ids:
        real_conditions.append(RealIntegration.workspace_id.in_(project_ids))

    real_stmt = (
        select(RealIntegration)
        .where(
            RealIntegration.provider == "github",
            RealIntegration.status == "connected",
            or_(*real_conditions),
        )
        .order_by(RealIntegration.updated_at.desc())
    )
    real_integ = (await db.execute(real_stmt)).scalars().first()
    if not access_token and real_integ:
        if real_integ.access_token_encrypted:
            try:
                access_token = decrypt_secret(real_integ.access_token_encrypted)
            except Exception:
                access_token = real_integ.access_token_encrypted
        login_name = real_integ.external_account_name or (current_user.name or current_user.email.split('@')[0])

    # If no external token available, return persisted database repositories for connected user
    if not access_token:
        repo_clauses = []
        if project_ids:
            repo_clauses.append(GitHubRepository.project_id.in_(project_ids))
        db_repos = []
        if repo_clauses:
            gh_db_stmt = select(GitHubRepository).where(or_(*repo_clauses)).order_by(GitHubRepository.updated_at.desc())
            db_repos = (await db.execute(gh_db_stmt)).scalars().all()
        if not db_repos and real_integ:
            rir_stmt = select(RealIntegrationRepository).where(RealIntegrationRepository.integration_id == real_integ.id)
            db_repos = (await db.execute(rir_stmt)).scalars().all()

        if db_repos:
            repos = [{
                "id": str(r.id),
                "name": r.name,
                "full_name": getattr(r, "full_name", r.name),
                "private": getattr(r, "is_private", getattr(r, "private", False)),
                "html_url": getattr(r, "html_url", getattr(r, "url", f"https://github.com/{login_name or 'user'}/{r.name}")),
                "clone_url": getattr(r, "clone_url", ""),
                "default_branch": getattr(r, "default_branch", "main"),
                "description": getattr(r, "description", "") or "",
                "language": getattr(r, "language", "Python"),
                "stars": getattr(r, "stargazers_count", 0),
                "updated_at": getattr(r, "updated_at", None),
            } for r in db_repos]
            return {
                "connected": True,
                "login": login_name or current_user.name or current_user.email.split('@')[0],
                "repositories": repos,
                "total": len(repos),
            }

        if real_integ:
            return {
                "connected": True,
                "login": login_name or current_user.name or current_user.email.split('@')[0],
                "repositories": [],
                "total": 0,
                "message": "GitHub connected. No repositories synced yet.",
            }

        return {
            "connected": False,
            "repositories": [],
            "message": "GitHub account is not connected. Please authenticate via GitHub OAuth.",
        }

    # 2. Call GitHub REST API
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SecuLayer-Security-Control-Plane",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
                headers=headers,
            )
            if resp.status_code != 200:
                # Token might be invalid or expired
                return {
                    "connected": False,
                    "repositories": [],
                    "message": f"GitHub API responded with status {resp.status_code}: {resp.text[:120]}",
                }

            raw_repos = resp.json()
            repos = []
            import uuid
            import random

            # Ensure we have an active project ID to link repositories
            target_project_id = project_ids[0] if project_ids else None
            if not target_project_id:
                any_p = (await db.execute(select(Project).order_by(Project.created_at.desc()).limit(1))).scalar_one_or_none()
                if any_p:
                    target_project_id = any_p.id

            for r in raw_repos:
                r_id = r.get("id")
                r_name = r.get("name")
                r_full_name = r.get("full_name") or f"{login_name or 'user'}/{r_name}"
                repos.append({
                    "id": str(r_id),
                    "name": r_name,
                    "full_name": r_full_name,
                    "private": bool(r.get("private")),
                    "html_url": r.get("html_url"),
                    "clone_url": r.get("clone_url"),
                    "default_branch": r.get("default_branch") or "main",
                    "description": r.get("description") or "",
                    "language": r.get("language") or "Other",
                    "stars": r.get("stargazers_count", 0),
                    "updated_at": r.get("updated_at"),
                })

                if target_project_id and r_name:
                    existing_gh = await db.execute(
                        select(GitHubRepository).where(
                            GitHubRepository.project_id == target_project_id,
                            or_(
                                GitHubRepository.name == r_name,
                                GitHubRepository.full_name == r_full_name,
                                GitHubRepository.github_repository_id == r_id,
                            )
                        ).limit(1)
                    )
                    if not existing_gh.scalar_one_or_none():
                        gh_rec = GitHubRepository(
                            id=uuid.uuid4(),
                            project_id=target_project_id,
                            github_repository_id=r_id if isinstance(r_id, int) else random.randint(10000000, 99999999),
                            name=r_name,
                            full_name=r_full_name,
                            owner=r_full_name.split("/")[0] if "/" in r_full_name else (login_name or "user"),
                            default_branch=r.get("default_branch") or "main",
                            private=bool(r.get("private")),
                            html_url=r.get("html_url") or f"https://github.com/{r_full_name}",
                            clone_url=r.get("clone_url") or f"https://github.com/{r_full_name}.git",
                        )
                        db.add(gh_rec)

            if target_project_id:
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()

            return {
                "connected": True,
                "login": login_name,
                "repositories": repos,
                "total": len(repos),
            }
    except Exception as exc:
        return {
            "connected": False,
            "repositories": [],
            "message": f"Failed to connect to GitHub: {str(exc)}",
        }

