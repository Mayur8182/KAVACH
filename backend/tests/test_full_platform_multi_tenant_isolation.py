"""
End-to-End Multi-Tenant Isolation & Zero Data Leakage Integration Test Suite

Verifies complete multi-tenant boundaries across:
1. Registration & deterministic tenant (Org + Workspace) provisioning
2. Workspace listing and direct ID access control (403 Forbidden)
3. Project & repository scoping (User B sees 0 of User A's data)
4. Dashboard and Code Overview metrics (User B starts with 0 counts)
5. Autonomous Runs execution engine (/runs, /runs/{id}, /runs/repositories)
6. Security findings & remediation pipelines (/findings, /findings/{id})
7. GitHub security jobs overview, history, and project endpoints
8. Bidirectional isolation when both User A and User B have active data
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.github import GitHubRepository, GitHubSecurityJob
from app.models.scan import SecurityScan, SecurityFinding, ScannerExecution
from app.models.workspace import Workspace
from app.models.organization import Organization
from app.services.user_service import UserService
from app.schemas.user import UserCreate
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_full_platform_multi_tenant_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
):
    # ── 1. Register User A via real UserService ──────────────────────────────
    user_service = UserService(db_session)
    user_a = await user_service.register(
        UserCreate(
            email="tenant_a_admin@kavach.security",
            name="Alice Tenant A",
            password="StrongPassword123!",
        )
    )
    token_a = create_access_token(subject=str(user_a.id))
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Fetch User A's auto-provisioned personal workspace and organization
    ws_a_res = await db_session.execute(
        select(Workspace).where(Workspace.owner_id == user_a.id)
    )
    ws_a = ws_a_res.scalars().first()
    assert ws_a is not None, "User A must have an auto-provisioned workspace"

    # ── 2. Create User A's Project, Repository, Scan, Finding, and Security Job
    proj_a = Project(
        id=uuid.uuid4(),
        name="Project Alpha Corp",
        description="Core banking backend",
        owner_id=user_a.id,
        workspace_id=ws_a.id,
        organization_id=ws_a.organization_id,
        environment="production",
    )
    db_session.add(proj_a)
    await db_session.flush()

    repo_a = GitHubRepository(
        id=uuid.uuid4(),
        project_id=proj_a.id,
        workspace_id=ws_a.id,
        github_repository_id=98765431,
        owner="alpha-corp",
        name="banking-api",
        full_name="alpha-corp/banking-api",
        default_branch="main",
        html_url="https://github.com/alpha-corp/banking-api",
        clone_url="https://github.com/alpha-corp/banking-api.git",
        private=True,
    )
    db_session.add(repo_a)

    scan_a = SecurityScan(
        id=uuid.uuid4(),
        project_id=proj_a.id,
        target_path="alpha-corp/banking-api",
        target_reference="main@a1b2c3d4",
        status="COMPLETED",
        finding_count=1,
    )
    db_session.add(scan_a)
    await db_session.flush()

    exec_a = ScannerExecution(
        id=uuid.uuid4(),
        scan_id=scan_a.id,
        scanner_name="semgrep",
        scanner_type="SAST",
        status="COMPLETED",
    )
    db_session.add(exec_a)
    await db_session.flush()

    finding_a = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=scan_a.id,
        scanner_execution_id=exec_a.id,
        scanner_name="semgrep",
        project_id=proj_a.id,
        rule_id="SEC-SQLI-001",
        title="SQL Injection in Alpha Transfer API",
        description="Raw SQL query parameter without input sanitization",
        severity="CRITICAL",
        file_path="src/transfers/process.py",
        fingerprint="fp_alpha_sqli_001",
        status="OPEN",
        raw_metadata={"scan_output": "Vulnerable parameter"},
    )
    db_session.add(finding_a)

    job_a = GitHubSecurityJob(
        id=uuid.uuid4(),
        repository_id=repo_a.id,
        project_id=proj_a.id,
        scan_id=scan_a.id,
        job_number="JOB-ALPHA-01",
        job_name="SAST Security Scan",
        job_type="SAST",
        event_type="push",
        commit_sha="a1b2c3d4e5f6",
        status="COMPLETED",
        branch="main",
        findings_count=1,
    )
    db_session.add(job_a)
    await db_session.commit()

    # ── 3. Register User B via real UserService ──────────────────────────────
    user_b = await user_service.register(
        UserCreate(
            email="tenant_b_admin@kavach.security",
            name="Bob Tenant B",
            password="StrongPassword456!",
        )
    )
    token_b = create_access_token(subject=str(user_b.id))
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Fetch User B's auto-provisioned workspace
    ws_b_res = await db_session.execute(
        select(Workspace).where(Workspace.owner_id == user_b.id)
    )
    ws_b = ws_b_res.scalars().first()
    assert ws_b is not None, "User B must have their own auto-provisioned workspace"
    assert ws_b.id != ws_a.id, "User A and User B must have distinct workspaces"
    assert ws_b.organization_id != ws_a.organization_id, "User A and User B must have distinct organizations"

    # ── 4. Verify User B Workspace Isolation ─────────────────────────────────
    res_ws_b = await client.get("/api/v1/workspaces", headers=headers_b)
    assert res_ws_b.status_code == 200
    ws_b_data = res_ws_b.json()
    all_b_ws_ids = [w["id"] for w in ws_b_data.get("items", [])]
    assert str(ws_a.id) not in all_b_ws_ids, "User B must NOT see User A's workspace in list"
    assert str(ws_b.id) in all_b_ws_ids, "User B must see their own workspace"

    # Direct ID access to User A's workspace must be blocked (403 Forbidden)
    res_direct_ws = await client.get(f"/api/v1/workspaces/{ws_a.id}", headers=headers_b)
    assert res_direct_ws.status_code == 403, "Direct access to User A workspace by User B must be 403 Forbidden"

    res_direct_ws_projs = await client.get(f"/api/v1/workspaces/{ws_a.id}/projects", headers=headers_b)
    assert res_direct_ws_projs.status_code == 403, "Access to User A workspace projects by User B must be 403 Forbidden"

    res_direct_ws_repos = await client.get(f"/api/v1/workspaces/{ws_a.id}/repositories", headers=headers_b)
    assert res_direct_ws_repos.status_code == 403, "Access to User A workspace repos by User B must be 403 Forbidden"

    # ── 5. Verify User B Code Overview & Repositories (Must be Zero/Empty) ────
    res_overview_b = await client.get("/api/v1/code/overview", headers=headers_b)
    assert res_overview_b.status_code == 200
    overview_b = res_overview_b.json()
    assert overview_b["repositories_total"] == 0, "User B must see 0 repositories on empty workspace"
    assert overview_b["scans_total"] == 0, "User B must see 0 scans"
    assert overview_b["findings"]["critical"] == 0, "User B must see 0 findings"

    # Attempting to query overview for User A's project directly
    res_overview_breach = await client.get(f"/api/v1/code/overview?project_id={proj_a.id}", headers=headers_b)
    assert res_overview_breach.status_code == 200
    overview_breach = res_overview_breach.json()
    assert overview_breach["repositories_total"] == 0, "Querying unauthorized project must return zero metrics"
    assert overview_breach["findings"]["critical"] == 0

    # ── 6. Verify User B Runs API Isolation ──────────────────────────────────
    res_runs_b = await client.get("/api/v1/runs", headers=headers_b)
    assert res_runs_b.status_code == 200
    assert len(res_runs_b.json()) == 0, "User B must see 0 runs"

    res_run_repos_b = await client.get("/api/v1/runs/repositories", headers=headers_b)
    assert res_run_repos_b.status_code == 200
    assert len(res_run_repos_b.json()) == 0, "User B must see 0 run repositories"

    # User B attempting to view User A's run details by direct ID
    res_run_detail_breach = await client.get(f"/api/v1/runs/{scan_a.id}", headers=headers_b)
    assert res_run_detail_breach.status_code in (403, 404), "User B cannot view User A run details"

    res_run_events_breach = await client.get(f"/api/v1/runs/{scan_a.id}/events", headers=headers_b)
    assert res_run_events_breach.status_code in (403, 404), "User B cannot view User A run events"

    # ── 7. Verify User B Findings Module Isolation ───────────────────────────
    res_findings_b = await client.get("/api/v1/findings", headers=headers_b)
    assert res_findings_b.status_code == 200
    f_b_data = res_findings_b.json()
    items_b = f_b_data.get("items", []) if isinstance(f_b_data, dict) else f_b_data
    assert len(items_b) == 0, "User B must see 0 findings"

    res_finding_detail_breach = await client.get(f"/api/v1/findings/{finding_a.id}", headers=headers_b)
    assert res_finding_detail_breach.status_code in (403, 404), "User B cannot access User A finding details"

    # ── 8. Verify User B GitHub Security Jobs Isolation ──────────────────────
    res_jobs_overview_b = await client.get("/api/v1/github/security-jobs/overview", headers=headers_b)
    assert res_jobs_overview_b.status_code == 200
    jobs_ov_b = res_jobs_overview_b.json()
    assert jobs_ov_b["total_jobs"] == 0, "User B must see 0 total security jobs"
    assert jobs_ov_b["successful_jobs"] == 0
    assert len(jobs_ov_b.get("jobs", [])) == 0

    res_jobs_history_b = await client.get("/api/v1/github/security-jobs/history", headers=headers_b)
    assert res_jobs_history_b.status_code == 200
    jobs_hist_b = res_jobs_history_b.json()
    assert jobs_hist_b.get("total_runs", jobs_hist_b.get("total", 0)) == 0, "User B must see 0 historical security jobs"
    assert len(jobs_hist_b.get("runs", [])) == 0, "User B must see 0 job runs"

    res_proj_jobs_breach = await client.get(f"/api/v1/projects/{proj_a.id}/github/security-jobs", headers=headers_b)
    assert res_proj_jobs_breach.status_code == 403, "User B cannot list security jobs for User A project"

    # ── 9. User B Creates Resources — Verify User A Cannot Access Them ───────
    proj_b = Project(
        id=uuid.uuid4(),
        name="Project Beta Services",
        description="Beta customer portal",
        owner_id=user_b.id,
        workspace_id=ws_b.id,
        organization_id=ws_b.organization_id,
        environment="production",
    )
    db_session.add(proj_b)
    await db_session.flush()

    repo_b = GitHubRepository(
        id=uuid.uuid4(),
        project_id=proj_b.id,
        workspace_id=ws_b.id,
        github_repository_id=88776655,
        owner="beta-corp",
        name="portal-ui",
        full_name="beta-corp/portal-ui",
        default_branch="main",
        html_url="https://github.com/beta-corp/portal-ui",
        clone_url="https://github.com/beta-corp/portal-ui.git",
        private=True,
    )
    db_session.add(repo_b)
    await db_session.commit()

    # User B now sees exactly 1 repository
    res_overview_b_after = await client.get("/api/v1/code/overview", headers=headers_b)
    assert res_overview_b_after.status_code == 200
    assert res_overview_b_after.json()["repositories_total"] == 1

    # User A verifies their data is intact and cannot see User B's repository
    res_overview_a = await client.get("/api/v1/code/overview", headers=headers_a)
    assert res_overview_a.status_code == 200
    assert res_overview_a.json()["repositories_total"] == 1

    # User A direct access to User B workspace is blocked (403)
    res_a_into_b_ws = await client.get(f"/api/v1/workspaces/{ws_b.id}", headers=headers_a)
    assert res_a_into_b_ws.status_code == 403, "User A direct access to User B workspace must be 403"

    # User A direct access to User B project is blocked (403)
    res_a_into_b_proj_jobs = await client.get(f"/api/v1/projects/{proj_b.id}/github/security-jobs", headers=headers_a)
    assert res_a_into_b_proj_jobs.status_code == 403, "User A direct access to User B project security jobs must be 403"
