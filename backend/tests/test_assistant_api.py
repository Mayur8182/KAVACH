import pytest
from httpx import AsyncClient
from app.models.user import User


@pytest.mark.asyncio
async def test_assistant_overview_real_data(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "workspace" in data
    assert "github_integration" in data
    assert "repositories" in data
    assert isinstance(data["repositories"], list)
    assert "recent_scans" in data
    assert "latest_findings" in data
    assert "active_agents" in data
    # Ensure user initials and id match real user, not hardcoded MB
    assert data["user"]["id"] == str(user_a.id)
    assert data["user"]["email"] == user_a.email


@pytest.mark.asyncio
async def test_assistant_live_agents(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/agents/live", headers=headers)
    assert response.status_code == 200
    agents = response.json()
    assert isinstance(agents, list)
    assert len(agents) >= 12
    agent_keys = [a["key"] for a in agents]
    assert "sast_agent" in agent_keys
    assert "iac_agent" in agent_keys
    assert "secrets_agent" in agent_keys
    assert "container_agent" in agent_keys
    # Verify no fake 'Running' default status when no scan is executed
    sast = next(a for a in agents if a["key"] == "sast_agent")
    assert sast["status"] in ["Idle", "Completed", "Running"]


@pytest.mark.asyncio
async def test_assistant_report_download(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.get("/api/v1/assistant/reports/download?repository=kavach&branch=main", headers=headers)
    assert response.status_code == 200
    assert "Content-Disposition" in response.headers
    assert "attachment" in response.headers["Content-Disposition"]
    assert len(response.text) > 0


@pytest.mark.asyncio
async def test_assistant_report_download_with_query_token(client: AsyncClient, user_a: User, token_user_a: str):
    # Direct browser GET request without Authorization Bearer header, but with ?token= query parameter
    response = await client.get(f"/api/v1/assistant/reports/download?token={token_user_a}&repository=kavach&branch=main&format=markdown")
    assert response.status_code == 200
    assert "attachment" in response.headers["Content-Disposition"]
    assert "# 🛡️ Kavach Security Posture Report" in response.text


@pytest.mark.asyncio
async def test_assistant_overview_with_stale_nonexistent_project_id(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    stale_uuid = "e2709d8b-2379-4625-bdff-387a00c25216"
    response = await client.get(f"/api/v1/assistant/overview?project_id={stale_uuid}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert data["project"]["id"] != stale_uuid  # Gracefully resolved to user's real project
    assert data["workspace"]["project_id"] == data["project"]["id"]


@pytest.mark.asyncio
async def test_phase3_workflow_plan_endpoint(client: AsyncClient, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    payload = {
        "goal": "Scan repository, investigate vulnerabilities, generate verified patch, and prepare PR",
        "repository": "kavach-backend",
        "branch": "main",
    }
    response = await client.post("/api/v1/assistant/workflow/plan", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "plan_id" in data
    assert "steps" in data
    assert len(data["steps"]) == 5
    assert data["status"] == "PLAN_CREATED"
    assert data["steps"][4]["step_id"] == "step-5-pull-request"
    assert data["steps"][4]["requires_approval"] is True


@pytest.mark.asyncio
async def test_phase3_specialist_agent_endpoints(client: AsyncClient, user_a: User, token_user_a: str, db_session):
    import uuid
    from app.models.project import Project
    from app.models.scan import SecurityScan, ScannerExecution, SecurityFinding

    headers = {"Authorization": f"Bearer {token_user_a}"}

    proj = Project(id=uuid.uuid4(), name="kavach-p3-test", owner_id=user_a.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-p3-test",
        title="SQL Injection Vulnerability",
        description="Unsanitized user input formatted directly into raw query",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db/query.py",
        line_number=12,
        snippet="res = db.execute(f'SELECT * FROM users WHERE id={uid}')",
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    # 1. Attack Path Agent Endpoint
    ap_payload = {
        "finding_id": str(finding.id),
        "project_id": str(proj.id),
        "repository": "kavach-p3-test",
    }
    ap_res = await client.post("/api/v1/assistant/agents/attack-path", json=ap_payload, headers=headers)
    assert ap_res.status_code == 200
    ap_data = ap_res.json()
    assert ap_data["status"] == "ANALYZED"
    assert ap_data["finding_id"] == str(finding.id)
    assert len(ap_data["hops"]) == 3
    assert ap_data["is_exploitable"] is True

    # 2. Remediation Planner Agent Endpoint
    plan_payload = {
        "finding_id": str(finding.id),
        "project_id": str(proj.id),
    }
    plan_res = await client.post("/api/v1/assistant/agents/remediation-plan", json=plan_payload, headers=headers)
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert plan_data["status"] == "PLAN_CREATED"
    assert plan_data["plan_id"] is not None
    assert len(plan_data["invariants"]) == 3

