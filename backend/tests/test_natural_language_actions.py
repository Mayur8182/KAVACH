import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.integration_models import RealIntegration
from app.models.integration import Integration
from app.models.policy import SecurityPolicy, SecurityPolicyVersion
from app.models.invitation import Invitation
from app.models.scan import SecurityFinding, SecurityScan, ScannerExecution


@pytest.mark.asyncio
async def test_natural_language_action_workflows(client: AsyncClient, db_session, user_a: User, token_user_a: str):
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Ensure project exists for user_a
    proj = Project(
        id=uuid.uuid4(),
        name="ADIT Projects",
        owner_id=user_a.id,
        description="Test Security Workspace",
    )
    db_session.add(proj)
    await db_session.commit()
    await db_session.refresh(proj)

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW A: Connect Slack via Natural Language & Execute
    # ─────────────────────────────────────────────────────────────────
    # Stage 01 -> 02: User command "Connect my Slack using my credentials"
    chat_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Connect my Slack using my credentials",
            "project_id": str(proj.id),
        },
    )
    assert chat_resp.status_code == 200, f"Chat failed: {chat_resp.text}"
    data = chat_resp.json()
    assert data["agent_type"] == "orchestrator"
    struct = data.get("structured_data", {})
    assert struct.get("stage") == "STAGE_02_INTENT_RECOGNITION"
    assert struct.get("provider") == "slack"
    assert "permissions_required" in struct
    assert "I'll help you connect your Slack workspace" in data.get("content", "")

    # Stage 03 -> 05: Execute real connection and persist in DB
    connect_resp = await client.post(
        "/api/v1/assistant/integrations/connect",
        headers=headers,
        json={
            "provider": "slack",
            "workspace_name": "ADIT Security",
            "project_id": str(proj.id),
        },
    )
    assert connect_resp.status_code == 200, f"Connect failed: {connect_resp.text}"
    conn_data = connect_resp.json()
    assert conn_data["status"] == "SUCCESS"
    assert conn_data["stage"] == "STAGE_05_INTEGRATION_SUCCESS"
    assert conn_data["provider"] == "slack"
    assert conn_data["workspace"] == "ADIT Security"
    assert conn_data["connected_by"] == user_a.email

    # Verify RealIntegration record in DB
    real_integ_stmt = select(RealIntegration).where(
        RealIntegration.provider == "slack",
        RealIntegration.workspace_id == proj.id,
    )
    r_integ = (await db_session.execute(real_integ_stmt)).scalars().first()
    assert r_integ is not None
    assert r_integ.status == "connected"
    assert r_integ.organization_name == "ADIT Security"

    # Verify legacy Integration record in DB
    legacy_integ_stmt = select(Integration).where(
        Integration.provider == "slack",
        Integration.project_id == proj.id,
    )
    l_integ = (await db_session.execute(legacy_integ_stmt)).scalars().first()
    assert l_integ is not None
    assert l_integ.is_connected is True

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW B: Create Policy via Natural Language & Enforce
    # ─────────────────────────────────────────────────────────────────
    # Stage 06: User command "Create a policy to block public S3 buckets and enforce it across all AWS accounts"
    policy_chat_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Create a policy to block public S3 buckets and enforce it across all AWS accounts",
            "project_id": str(proj.id),
        },
    )
    assert policy_chat_resp.status_code == 200
    p_data = policy_chat_resp.json()
    p_struct = p_data.get("structured_data", {})
    assert p_struct.get("stage") == "STAGE_06_POLICY_PROPOSED"
    assert p_struct.get("policy_title") == "Block Public S3 Buckets"
    assert len(p_struct.get("rules", [])) >= 3

    # Stage 07 -> 08: Execute policy creation and enforcement
    enforce_resp = await client.post(
        "/api/v1/assistant/policies/create-and-enforce",
        headers=headers,
        json={
            "policy_name": "Block Public S3 Buckets",
            "enforcement_scope": "GLOBAL",
            "project_id": str(proj.id),
        },
    )
    assert enforce_resp.status_code == 200
    enf_data = enforce_resp.json()
    assert enf_data["status"] == "SUCCESS"
    assert enf_data["stage"] == "STAGE_08_POLICY_ENFORCED"
    assert enf_data["policy_name"] == "Block Public S3 Buckets"
    assert enf_data["status_badge"] == "Active"

    # Verify SecurityPolicy in DB
    policy_stmt = select(SecurityPolicy).where(SecurityPolicy.name == "Block Public S3 Buckets")
    sec_policy = (await db_session.execute(policy_stmt)).scalars().first()
    assert sec_policy is not None
    assert sec_policy.status == "ACTIVE"

    # Verify SecurityPolicyVersion in DB
    ver_stmt = select(SecurityPolicyVersion).where(SecurityPolicyVersion.policy_id == sec_policy.id)
    sec_ver = (await db_session.execute(ver_stmt)).scalars().first()
    assert sec_ver is not None
    assert "aws_s3_bucket" in sec_ver.definition.get("rego", "")

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW C: Invite Member via Natural Language & Send Invite
    # ─────────────────────────────────────────────────────────────────
    # Stage 09: User command "Invite rakesh.patel@adit.edu.in to my workspace with Viewer role"
    invite_chat_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Invite rakesh.patel@adit.edu.in to my workspace with Viewer role",
            "project_id": str(proj.id),
        },
    )
    assert invite_chat_resp.status_code == 200
    inv_chat_data = invite_chat_resp.json()
    inv_struct = inv_chat_data.get("structured_data", {})
    assert inv_struct.get("stage") == "STAGE_09_INVITATION_PROPOSED"
    assert inv_struct.get("email") == "rakesh.patel@adit.edu.in"
    assert inv_struct.get("role") == "Viewer"

    # Execute real invitation in DB
    invite_exec_resp = await client.post(
        "/api/v1/assistant/members/invite",
        headers=headers,
        json={
            "email": "rakesh.patel@adit.edu.in",
            "role": "Viewer",
            "project_id": str(proj.id),
        },
    )
    assert invite_exec_resp.status_code == 200
    inv_exec_data = invite_exec_resp.json()
    assert inv_exec_data["status"] == "SUCCESS"
    assert inv_exec_data["stage"] == "STAGE_09_INVITATION_SENT"
    assert inv_exec_data["email"] == "rakesh.patel@adit.edu.in"
    assert inv_exec_data["role"] == "Viewer"

    # Verify Invitation in DB
    inv_db_stmt = select(Invitation).where(Invitation.email == "rakesh.patel@adit.edu.in")
    inv_record = (await db_session.execute(inv_db_stmt)).scalars().first()
    assert inv_record is not None
    assert inv_record.status == "PENDING"
    assert inv_record.role == "viewer"
    assert inv_record.token is not None

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW D: Phase 7 Team Invitation (mkbharvad8080@gmail.com)
    # ─────────────────────────────────────────────────────────────────
    invite_mk_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Send an invitation to mkbharvad8080@gmail.com",
            "project_id": str(proj.id),
        },
    )
    assert invite_mk_resp.status_code == 200
    mk_chat_data = invite_mk_resp.json()
    mk_struct = mk_chat_data.get("structured_data", {})
    assert mk_struct.get("stage") == "STAGE_09_INVITATION_PROPOSED"
    assert mk_struct.get("email") == "mkbharvad8080@gmail.com"
    assert mk_struct.get("role") in ["Viewer", "viewer"]

    # Execute real invitation in DB for mkbharvad8080@gmail.com
    mk_exec_resp = await client.post(
        "/api/v1/assistant/members/invite",
        headers=headers,
        json={
            "email": "mkbharvad8080@gmail.com",
            "role": "Viewer",
            "project_id": str(proj.id),
        },
    )
    assert mk_exec_resp.status_code == 200
    mk_exec_data = mk_exec_resp.json()
    assert mk_exec_data["status"] == "SUCCESS"
    assert mk_exec_data["stage"] == "STAGE_09_INVITATION_SENT"
    assert mk_exec_data["email"] == "mkbharvad8080@gmail.com"

    mk_db_stmt = select(Invitation).where(Invitation.email == "mkbharvad8080@gmail.com")
    mk_record = (await db_session.execute(mk_db_stmt)).scalars().first()
    assert mk_record is not None
    assert mk_record.status == "PENDING"

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW E: Phase 8 Finding Investigation & Credential Redaction
    # ─────────────────────────────────────────────────────────────────
    # 1. Seed scan, execution, and hardcoded credential finding in DB
    sec_scan = SecurityScan(
        id=uuid.uuid4(),
        project_id=proj.id,
        target_path=".",
        target_type="GIT_REPOSITORY",
        status="COMPLETED",
        requested_by=user_a.email,
    )
    db_session.add(sec_scan)
    await db_session.commit()

    sec_exec = ScannerExecution(
        id=uuid.uuid4(),
        scan_id=sec_scan.id,
        scanner_name="gitleaks",
        scanner_type="SECRETS",
        status="COMPLETED",
    )
    db_session.add(sec_exec)
    await db_session.commit()

    raw_secret = "ghp_1234567890abcdef1234567890abcdef1234"
    sec_finding = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=sec_scan.id,
        scanner_execution_id=sec_exec.id,
        project_id=proj.id,
        scanner_name="gitleaks",
        title="Hardcoded GitHub Personal Access Token",
        severity="CRITICAL",
        file_path="src/auth/github_client.py",
        line_start=42,
        line_end=42,
        snippet=f'GITHUB_TOKEN = "{raw_secret}"',
        rule_id="gitleaks-github-pat",
        description="A GitHub Personal Access Token was committed in plain text.",
        fingerprint="fp_gitleaks_ghp_1234",
        status="open",
        raw_metadata={},
    )
    db_session.add(sec_finding)
    await db_session.commit()

    # 2. Query assistant to investigate finding
    investigate_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Explain my Hardcoded GitHub Personal Access Token finding",
            "project_id": str(proj.id),
        },
    )
    assert investigate_resp.status_code == 200
    inv_data = investigate_resp.json()
    inv_struct = inv_data.get("structured_data", {})
    assert inv_struct.get("intent") == "INVESTIGATE_FINDING"
    assert inv_struct.get("ui_schema", {}).get("component") == "vulnerability_detail"
    assert str(inv_struct.get("severity", "")).upper() == "CRITICAL"
    assert inv_struct.get("file") == "src/auth/github_client.py"

    # CRITICAL: Verify Rule 35 - Credential Redaction
    # The raw secret must NEVER appear unmasked in the assistant content
    assert raw_secret not in inv_data.get("content", "")
    assert raw_secret not in str(inv_struct.get("code", ""))

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW F: Phase 9 Cloud Security Posture (Zero Mock / Honest State)
    # ─────────────────────────────────────────────────────────────────
    cloud_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "Show me the security risks in my cloud infrastructure",
            "project_id": str(proj.id),
        },
    )
    assert cloud_resp.status_code == 200
    cloud_data = cloud_resp.json()
    cloud_struct = cloud_data.get("structured_data", {})
    assert cloud_struct.get("intent") == "GET_CLOUD_SECURITY_POSTURE"
    # When no cloud account is connected, must return NOT_CONNECTED with connect prompt (Rule 10)
    assert cloud_struct.get("status") in ["NOT_CONNECTED", "COMPLETED"]
    assert cloud_struct.get("ui_schema", {}).get("component") in ["cloud_connect_prompt", "cloud_posture"]

    # ─────────────────────────────────────────────────────────────────
    # WORKFLOW G: Universal Capability Discovery
    # ─────────────────────────────────────────────────────────────────
    cap_resp = await client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={
            "message": "what can you do",
            "project_id": str(proj.id),
        },
    )
    assert cap_resp.status_code == 200
    cap_data = cap_resp.json()
    cap_struct = cap_data.get("structured_data", {})
    assert cap_struct.get("intent") == "LIST_CAPABILITIES"
    assert cap_struct.get("total_capabilities", 0) > 0
    assert "capabilities" in cap_struct
