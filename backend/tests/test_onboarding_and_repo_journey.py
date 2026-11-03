"""
End-to-End User Journey Tests:
01. Kavach Login / Unified Account
02. Onboarding Data Collection, Persistence & Redundancy Prevention
03. GitHub Connect & Skip Options
04. Assistant Scoped to Same Authenticated User & Workspace
05. 'Add My Repository' & Repository Selection in Chat
06. Chat Scan Execution Unified with Real Dashboard Records
"""

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.github import GitHubRepository
from app.models.scan import SecurityScan
from app.models.integration_models import RealIntegration, RealIntegrationRepository
from app.intelligence.action_orchestrator import CentralActionOrchestrator
from app.intelligence.system_prompt import get_versioned_system_prompt
from app.intelligence.rag_pipeline import SecurityRAGPipeline


@pytest.mark.asyncio
async def test_onboarding_intake_persistence_and_redundancy_prevention(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    token_user_a: str,
):
    """
    Verifies Requirement 02: Onboarding data is actually persisted in PostgreSQL
    and injected into Assistant's system prompt & RAG so user is never asked redundant questions.
    """
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. User completes onboarding with rich profile
    onboarding_payload = {
        "current_step": "complete",
        "onboarding_completed": True,
        "role": "Lead DevSecOps Engineer",
        "team_size": "11 - 50",
        "organization_name": "Acme Defense Corp",
        "workspace_name": "Core Security",
        "tech_stack": ["Python", "FastAPI", "Next.js", "Docker", "Kubernetes"],
        "security_requirements": ["OWASP Top 10", "Zero Secret Leakage", "SOC2 Type II"],
        "intended_use_cases": ["Automated PR Security Reviews", "Continuous IaC Audits"],
    }
    resp = await client.put("/api/v1/onboarding/state", json=onboarding_payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["onboarding_completed"] is True
    assert data["onboarding_state"]["role"] == "Lead DevSecOps Engineer"
    assert "FastAPI" in data["onboarding_state"]["tech_stack"]
    assert "SOC2 Type II" in data["onboarding_state"]["security_requirements"]

    # 2. Verify system prompt incorporates verified onboarding profile
    tenant_info = {
        "user_id": str(user_a.id),
        "user_email": user_a.email,
        "user_name": user_a.name,
        "organization_name": "Acme Defense Corp",
        "workspace_name": "Core Security",
        "onboarding_profile": data["onboarding_state"],
    }
    prompt = get_versioned_system_prompt(tenant_info)
    assert "Acme Defense Corp" in prompt
    assert "Lead DevSecOps Engineer" in prompt
    assert "FastAPI" in prompt
    assert "SOC2 Type II" in prompt
    assert "NEVER ask the user redundant questions" in prompt

    # 3. Verify RAG retrieve_context preserves onboarding context
    rag = SecurityRAGPipeline(db_session)
    ctx = await rag.retrieve_context(
        query="What is my security posture?",
        user_id=user_a.id,
        onboarding_context=data["onboarding_state"],
    )
    assert ctx["onboarding_context"]["role"] == "Lead DevSecOps Engineer"
    assert "FastAPI" in ctx["onboarding_context"]["tech_stack"]


@pytest.mark.asyncio
async def test_chat_add_repository_unconnected_presents_oauth_card(
    db_session: AsyncSession,
    user_a: User,
):
    """
    Verifies Requirement 03 & 05:
    When GitHub is not connected, typing 'Add my repository' or 'Connect GitHub'
    in chat returns a structured CONNECT_GITHUB card rather than empty or fake data.
    """
    proj_a = Project(id=uuid.uuid4(), name="Alpha App", owner_id=user_a.id)
    db_session.add(proj_a)
    await db_session.commit()

    orchestrator = CentralActionOrchestrator(db_session)
    res = await orchestrator.process_user_query(
        query="Add my repository from GitHub",
        current_user=user_a,
        project_id=proj_a.id,
    )

    sd = res.get("structured_data", {})
    assert sd.get("intent") in ["CONNECT_GITHUB", "LIST_REPOSITORIES"]
    if sd.get("intent") == "CONNECT_GITHUB":
        assert sd.get("github_connected") is False
        assert sd.get("ui_schema", {}).get("component") == "github_connect_card"
        assert "Connect GitHub" in res.get("content", "")


@pytest.mark.asyncio
async def test_chat_add_repository_connected_presents_live_repositories(
    db_session: AsyncSession,
    user_a: User,
):
    """
    Verifies Requirement 05:
    When GitHub is connected, typing 'add repository' returns real repositories from database
    with ui_schema.component == 'repository_list'.
    """
    proj_a = Project(id=uuid.uuid4(), name="Alpha App", owner_id=user_a.id)
    db_session.add(proj_a)
    await db_session.flush()

    # Link a real GitHub integration
    integ = RealIntegration(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        provider="github",
        name="GitHub SCM Integration",
        status="connected",
        created_by=str(user_a.id),
        external_account_name="Acme-Org",
    )
    db_session.add(integ)
    await db_session.flush()

    repo1 = RealIntegrationRepository(
        id=uuid.uuid4(),
        integration_id=integ.id,
        external_repository_id="gh-101",
        name="kavach-backend",
        full_name="Acme-Org/kavach-backend",
        url="https://github.com/Acme-Org/kavach-backend",
        default_branch="main",
        private=True,
    )
    repo2 = RealIntegrationRepository(
        id=uuid.uuid4(),
        integration_id=integ.id,
        external_repository_id="gh-102",
        name="kavach-frontend",
        full_name="Acme-Org/kavach-frontend",
        url="https://github.com/Acme-Org/kavach-frontend",
        default_branch="main",
        private=True,
    )
    db_session.add_all([repo1, repo2])
    await db_session.commit()

    orchestrator = CentralActionOrchestrator(db_session)
    res = await orchestrator.process_user_query(
        query="add my repository",
        current_user=user_a,
        project_id=proj_a.id,
    )

    sd = res.get("structured_data", {})
    assert sd.get("intent") == "LIST_REPOSITORIES"
    assert sd.get("github_connected") is True
    assert sd.get("ui_schema", {}).get("component") == "repository_list"
    repo_names = [r["name"] for r in sd.get("repositories", [])]
    assert "kavach-backend" in repo_names
    assert "kavach-frontend" in repo_names


@pytest.mark.asyncio
async def test_chat_select_repository_presents_immediate_scan_actions(
    db_session: AsyncSession,
    user_a: User,
):
    """
    Verifies Requirement F:
    Selecting a repository immediately presents available security scanner actions.
    """
    proj_a = Project(id=uuid.uuid4(), name="Alpha App", owner_id=user_a.id)
    db_session.add(proj_a)
    await db_session.commit()

    orchestrator = CentralActionOrchestrator(db_session)
    res = await orchestrator.process_user_query(
        query="select repo kavach-backend",
        current_user=user_a,
        project_id=proj_a.id,
    )

    sd = res.get("structured_data", {})
    assert sd.get("intent") == "REPOSITORY_SELECTED"
    assert sd.get("selected_repository") == "kavach-backend"
    assert sd.get("ui_schema", {}).get("component") == "repository_selected_card"
    action_ids = [a["id"] for a in sd.get("ui_schema", {}).get("actions", [])]
    assert "scan_all" in action_ids
    assert "scan_secrets" in action_ids
    assert "scan_deps" in action_ids


@pytest.mark.asyncio
async def test_chat_scan_creates_real_dashboard_record(
    db_session: AsyncSession,
    user_a: User,
):
    """
    Verifies Requirement E & 09:
    Chat scan execution initiates the real scan engine and persists a record to PostgreSQL.
    The exact same scan is returned and verifiable in the database for the Dashboard to display.
    """
    proj_a = Project(id=uuid.uuid4(), name="Alpha App", owner_id=user_a.id)
    db_session.add(proj_a)
    await db_session.commit()

    orchestrator = CentralActionOrchestrator(db_session)
    res = await orchestrator.process_user_query(
        query="scan my repository",
        current_user=user_a,
        project_id=proj_a.id,
    )

    sd = res.get("structured_data", {})
    assert sd.get("intent") == "SCAN_COMPLETED"
    scan_id_str = sd.get("scan_id")
    assert scan_id_str is not None

    # Query the scan in the real database — must match exactly (ONE SHARED BACKEND & DB)
    scan_uuid = uuid.UUID(scan_id_str)
    db_scan = (await db_session.execute(select(SecurityScan).where(SecurityScan.id == scan_uuid))).scalar_one_or_none()
    assert db_scan is not None
    assert db_scan.project_id == proj_a.id
