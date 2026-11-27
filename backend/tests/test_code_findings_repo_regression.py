"""
Regression tests for:
1. UUID vs string bind-parameter handling in SecurityFinding.repository_id queries
   (/api/v1/code/findings & /api/v1/findings) — prevents `AttributeError: 'str' object has no attribute 'hex'`.
2. Tenant-scoped single-repository resolution across project_id, workspace_id,
   GitHubInstallation ownership, and RealIntegrationRepository bridging for:
   - GET /api/v1/code/repositories/{repository_id}
   - GET /api/v1/code/repositories/{repository_id}/tree
   - POST /api/v1/code/repositories/{repository_id}/scans
"""

from __future__ import annotations

import shutil
import sys
import uuid
from pathlib import Path
from typing import Dict

import httpx
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import set_session_factory  # noqa: E402
from app.core.jwks import ensure_signing_keys_loaded  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.main import app  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.github import GitHubInstallation, GitHubRepository, GitHubSecurityJob  # noqa: E402
from app.models.integration_models import RealIntegration, RealIntegrationRepository  # noqa: E402
from app.models.invitation import OrganizationMember  # noqa: E402
from app.models.organization import Organization, Workspace  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.scan import ScannerExecution, SecurityFinding, SecurityScan  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.github_service import GitHubService  # noqa: E402


@pytest_asyncio.fixture(scope="module")
async def _regression_schema_template(tmp_path_factory):
    template_db = tmp_path_factory.mktemp("kavach_code_findings_reg") / "template.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{template_db.as_posix()}",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    async with factory() as db:
        await ensure_signing_keys_loaded(db)
    await engine.dispose()
    return template_db


@pytest_asyncio.fixture()
async def test_env(tmp_path: Path, _regression_schema_template: Path):
    db_file = tmp_path / "code_findings_reg.db"
    shutil.copyfile(_regression_schema_template, db_file)
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file.as_posix()}",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    set_session_factory(factory)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            yield client, factory
    finally:
        set_session_factory(None)
        await engine.dispose()


async def _seed_tenant_repo_and_findings(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    slug: str,
    email: str,
    repo_full_name: str,
    assign_project_on_github_repo: bool,
    installation_num: int,
) -> Dict[str, str]:
    async with session_factory() as db:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash="oauth_managed",
            name=f"{slug} Owner",
            is_active=True,
            is_superuser=False,
            is_verified=True,
            auth_provider="github",
            onboarding_completed=True,
        )
        db.add(user)
        await db.flush()

        org = Organization(
            id=uuid.uuid4(),
            name=f"{slug} Security Org",
            slug=slug,
            owner_id=user.id,
            owner_name=user.name,
            owner_email=user.email,
            status="ACTIVE",
        )
        db.add(org)
        await db.flush()

        db.add(
            OrganizationMember(
                id=uuid.uuid4(),
                organization_id=org.id,
                user_id=user.id,
                role="admin",
                is_active=True,
            )
        )

        ws = Workspace(
            id=uuid.uuid4(),
            organization_id=org.id,
            owner_id=user.id,
            workspace_type="ORGANIZATION",
            name=f"{slug} Workspace",
            slug=f"{slug}-ws",
            status="ACTIVE",
        )
        db.add(ws)
        await db.flush()

        proj = Project(
            id=uuid.uuid4(),
            owner_id=user.id,
            organization_id=org.id,
            workspace_id=ws.id,
            name=f"{slug}-app",
            repository_url=f"https://github.com/{repo_full_name}",
            environment="production",
            application_type="web_service",
        )
        db.add(proj)
        await db.flush()

        user.default_workspace_id = ws.id
        user.default_project_id = proj.id
        db.add(user)

        inst = GitHubInstallation(
            id=uuid.uuid4(),
            workspace_id=ws.id,
            connected_by_user_id=user.id,
            project_id=proj.id if assign_project_on_github_repo else None,
            github_installation_id=installation_num,
            github_account_id=installation_num * 10,
            github_account_login=repo_full_name.split("/")[0],
            account_type="User",
            status="ACTIVE",
            repository_selection="selected",
        )
        db.add(inst)
        await db.flush()

        owner, name = repo_full_name.split("/", 1)
        gh_repo = GitHubRepository(
            id=uuid.uuid4(),
            installation_id=inst.id,
            project_id=proj.id if assign_project_on_github_repo else None,
            workspace_id=ws.id if assign_project_on_github_repo else None,
            github_repository_id=installation_num * 100 + 1,
            owner=owner,
            name=name,
            full_name=repo_full_name,
            default_branch="main",
            private=False,
            html_url=f"https://github.com/{repo_full_name}",
            visibility="public",
            archived=False,
        )
        db.add(gh_repo)
        await db.flush()

        integration = RealIntegration(
            id=uuid.uuid4(),
            organization_id=org.id,
            workspace_id=ws.id,
            provider="github",
            name="GitHub Cloud",
            status="connected",
        )
        db.add(integration)
        await db.flush()

        int_repo = RealIntegrationRepository(
            id=uuid.uuid4(),
            integration_id=integration.id,
            repository_id=gh_repo.id,
            external_repository_id=str(installation_num * 100 + 2),
            name=name,
            full_name=repo_full_name,
            url=f"https://github.com/{repo_full_name}",
            default_branch="main",
            private=False,
        )
        db.add(int_repo)
        await db.flush()

        scan = SecurityScan(
            id=uuid.uuid4(),
            project_id=proj.id,
            target_type="repository",
            target_path=f"https://github.com/{repo_full_name}",
            target_reference="main",
            status="COMPLETED",
            requested_by=str(user.id),
            scanner_count=1,
            finding_count=1,
        )
        db.add(scan)
        await db.flush()

        execution = ScannerExecution(
            id=uuid.uuid4(),
            scan_id=scan.id,
            scanner_name="semgrep",
            scanner_type="SAST",
            status="COMPLETED",
            finding_count=1,
        )
        db.add(execution)
        await db.flush()

        job = GitHubSecurityJob(
            id=uuid.uuid4(),
            project_id=proj.id,
            repository_id=gh_repo.id,
            scan_id=scan.id,
            event_type="manual",
            commit_sha="a" * 40,
            branch="main",
            status="COMPLETED",
        )
        db.add(job)

        finding = SecurityFinding(
            id=uuid.uuid4(),
            scan_id=scan.id,
            scanner_execution_id=execution.id,
            scanner_name="semgrep",
            rule_id="python.lang.security.audit.exec-detected",
            title=f"Dangerous exec call in {repo_full_name}",
            description="Dynamic exec execution detected",
            severity="HIGH",
            category="sast",
            file_path="app/runner.py",
            line_start=42,
            line_end=42,
            fingerprint=f"fp-{slug}-{uuid.uuid4().hex[:8]}",
            raw_metadata={"scanner": "semgrep"},
            status="OPEN",
            project_id=proj.id,
            organization_id=org.id,
            repository_id=gh_repo.id,
            repository=repo_full_name,
            branch="main",
        )
        db.add(finding)
        await db.commit()

        return {
            "user_id": str(user.id),
            "project_id": str(proj.id),
            "gh_repo_id": str(gh_repo.id),
            "int_repo_id": str(int_repo.id),
            "finding_id": str(finding.id),
            "jwt": create_access_token(subject=str(user.id)),
        }


@pytest.mark.asyncio
async def test_code_and_platform_findings_uuid_repository_filter_no_hex_error(test_env):
    client, factory = test_env
    tenant_a = await _seed_tenant_repo_and_findings(
        factory,
        slug="mayur-demo-org",
        email="mayur@kavachsecurity.me",
        repo_full_name="Mayur8182/demo",
        assign_project_on_github_repo=False,
        installation_num=88101,
    )
    tenant_b = await _seed_tenant_repo_and_findings(
        factory,
        slug="other-tenant-org",
        email="other@example.com",
        repo_full_name="OtherOrg/private-app",
        assign_project_on_github_repo=True,
        installation_num=88202,
    )
    headers_a = {"Authorization": f"Bearer {tenant_a['jwt']}"}

    # Exact URL patterns reported failing with `AttributeError: 'str' object has no attribute 'hex'`
    for base_path in ("/api/v1/code/findings", "/api/v1/findings"):
        res = await client.get(
            base_path,
            params={
                "repository_id": tenant_a["gh_repo_id"],
                "repository": "Mayur8182/demo",
                "page": 1,
                "pageSize": 100,
                "limit": 100,
            },
            headers=headers_a,
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["total"] == 1
        assert len(body["items"]) == 1
        assert body["items"][0]["id"] == tenant_a["finding_id"]

    # RealIntegrationRepository ID bridge should also resolve findings safely without 500
    res_int = await client.get(
        "/api/v1/code/findings",
        params={
            "repository_id": tenant_a["int_repo_id"],
            "repository": "Mayur8182/demo",
            "page": 1,
            "pageSize": 100,
            "limit": 100,
        },
        headers=headers_a,
    )
    assert res_int.status_code == 200, res_int.text
    assert res_int.json()["items"][0]["id"] == tenant_a["finding_id"]

    # Non-UUID string filter must safely fall back without triggering UUID bind processor crash
    res_str = await client.get(
        "/api/v1/code/findings",
        params={"repository_id": "Mayur8182/demo", "repository": "Mayur8182/demo"},
        headers=headers_a,
    )
    assert res_str.status_code == 200, res_str.text
    assert res_str.json()["total"] == 1

    # Cross-tenant finding must remain isolated
    headers_b = {"Authorization": f"Bearer {tenant_b['jwt']}"}
    res_cross = await client.get(
        "/api/v1/code/findings",
        params={"repository_id": tenant_a["gh_repo_id"], "repository": "Mayur8182/demo"},
        headers=headers_b,
    )
    assert res_cross.status_code == 200, res_cross.text
    assert res_cross.json()["total"] == 0


@pytest.mark.asyncio
async def test_installation_repo_detail_tree_and_manual_scan_resolve_without_false_404(
    test_env, monkeypatch
):
    client, factory = test_env
    tenant_a = await _seed_tenant_repo_and_findings(
        factory,
        slug="install-owned-org",
        email="owner@kavachsecurity.me",
        repo_full_name="Mayur8182/demo",
        assign_project_on_github_repo=False,  # Simulates synced installation repo with project_id=None
        installation_num=99101,
    )
    tenant_b = await _seed_tenant_repo_and_findings(
        factory,
        slug="outsider-org",
        email="outsider@example.com",
        repo_full_name="Outsider/repo",
        assign_project_on_github_repo=True,
        installation_num=99202,
    )

    # Prevent background scan dispatch from executing against disposed test DB after request returns
    dispatched_jobs = []

    async def _noop_dispatch(cls, job_id):
        dispatched_jobs.append(str(job_id))

    monkeypatch.setattr(GitHubService, "dispatch_job_background", classmethod(_noop_dispatch))

    headers_a = {"Authorization": f"Bearer {tenant_a['jwt']}"}
    headers_b = {"Authorization": f"Bearer {tenant_b['jwt']}"}

    # 1. Repository detail by GitHubRepository.id and by bridged RealIntegrationRepository.id
    for repo_id in (tenant_a["gh_repo_id"], tenant_a["int_repo_id"]):
        detail_res = await client.get(f"/api/v1/code/repositories/{repo_id}", headers=headers_a)
        assert detail_res.status_code == 200, detail_res.text
        detail_json = detail_res.json()
        assert detail_json["full_name"] == "Mayur8182/demo"

    # 2. Cross-tenant user must still receive 404
    cross_detail = await client.get(
        f"/api/v1/code/repositories/{tenant_a['gh_repo_id']}", headers=headers_b
    )
    assert cross_detail.status_code == 404

    # 3. Tree endpoint must resolve the repo (not fail with 404 "Repository not found")
    tree_res_a = await client.get(
        f"/api/v1/code/repositories/{tenant_a['gh_repo_id']}/tree?branch=main",
        headers=headers_a,
    )
    assert not (
        tree_res_a.status_code == 404 and "Repository not found" in tree_res_a.text
    ), f"Unexpected false 404 for installation-owned repo tree: {tree_res_a.text}"

    tree_res_b = await client.get(
        f"/api/v1/code/repositories/{tenant_a['gh_repo_id']}/tree?branch=main",
        headers=headers_b,
    )
    assert tree_res_b.status_code == 404

    # 4. Manual scan trigger for installation-owned repo (project_id=None) creates a real QUEUED job
    scan_res = await client.post(
        f"/api/v1/code/repositories/{tenant_a['gh_repo_id']}/scans",
        json={"branch": "main"},
        headers=headers_a,
    )
    assert scan_res.status_code in (200, 201, 202), scan_res.text
    scan_json = scan_res.json()
    assert scan_json["status"] == "QUEUED"
    assert len(dispatched_jobs) == 1

    # Cross-tenant scan trigger must be blocked
    cross_scan = await client.post(
        f"/api/v1/code/repositories/{tenant_a['gh_repo_id']}/scans",
        json={"branch": "main"},
        headers=headers_b,
    )
    assert cross_scan.status_code in (403, 404)
