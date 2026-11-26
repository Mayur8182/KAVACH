"""
Integration Test Suite for Kavach Advanced MCP 2025 Gateway Features:
1. Initialize capabilities (`resources`, `prompts`, `completions`, `logging`) & `tools/list` annotations
2. MCP Resources (`resources/list`, `resources/templates/list`, `resources/read`) with tenant isolation & scope enforcement
3. MCP Prompts (`prompts/list`, `prompts/get`) enriched from real DB findings/projects + `completion/complete`
4. JSON-RPC 2.0 Batching & Streamable HTTP SSE Progress Streaming (`notifications/progress`)
5. Zero-Trust Risk + Cryptographic Human-in-the-Loop Approval Gate + Replay/Tamper Protection
6. Posture, Findings, Approvals & Immutable Audit Trail Tools + REST Management APIs (`/api/v1/mcp/approvals`, `/api/v1/mcp/activity`)
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import parse_qs, urlparse

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
from app.models.invitation import OrganizationMember  # noqa: E402
from app.models.organization import Organization, Workspace  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.scan import ScannerExecution, SecurityFinding, SecurityScan  # noqa: E402
from app.models.user import User  # noqa: E402


def _make_pkce_pair() -> Tuple[str, str]:
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii").rstrip("=")
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode("ascii").rstrip("=")
    return verifier, challenge


@pytest_asyncio.fixture(scope="module")
async def _adv_schema_template(tmp_path_factory):
    template_dir = tmp_path_factory.mktemp("kavach_adv_schema")
    template_db = template_dir / "template.db"
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
async def adv_env(tmp_path: Path, _adv_schema_template: Path):
    db_file = tmp_path / "kavach_adv_test.db"
    shutil.copyfile(_adv_schema_template, db_file)
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
            base_url="https://mcp.kavachsecurity.me",
        ) as client:
            yield client, factory
    finally:
        set_session_factory(None)
        await engine.dispose()


async def _seed_project_with_finding(
    session_factory,
    *,
    email: str,
    org_slug: str,
    project_name: str,
) -> Dict[str, str]:
    async with session_factory() as db:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash="oauth_managed",
            name="Security Engineer",
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
            name=f"{org_slug} Org",
            slug=org_slug,
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
            name=f"{org_slug} Workspace",
            slug=f"{org_slug}-ws",
            status="ACTIVE",
        )
        db.add(ws)
        await db.flush()

        proj = Project(
            id=uuid.uuid4(),
            owner_id=user.id,
            organization_id=org.id,
            workspace_id=ws.id,
            name=project_name,
            repository_url=f"https://github.com/acme/{org_slug}",
            environment="production",
            application_type="web_service",
        )
        db.add(proj)
        await db.flush()

        user.default_workspace_id = ws.id
        user.default_project_id = proj.id
        db.add(user)

        scan = SecurityScan(
            id=uuid.uuid4(),
            project_id=proj.id,
            target_type="GIT_REPOSITORY",
            target_path="/workspace/app",
            status="COMPLETED",
            requested_by=user.email,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            scanner_count=1,
            finding_count=1,
        )
        db.add(scan)
        await db.flush()

        exec_row = ScannerExecution(
            id=uuid.uuid4(),
            scan_id=scan.id,
            scanner_name="semgrep",
            scanner_type="SAST",
            status="COMPLETED",
            finding_count=1,
        )
        db.add(exec_row)
        await db.flush()

        finding = SecurityFinding(
            id=uuid.uuid4(),
            scan_id=scan.id,
            scanner_execution_id=exec_row.id,
            scanner_name="semgrep",
            rule_id="python.lang.security.audit.sql-injection",
            title="Unsanitized SQL query interpolation",
            description="User input passed directly into SQL execution.",
            severity="HIGH",
            file_path="app/api/orders.py",
            line_number=42,
            fingerprint=f"fp_{uuid.uuid4().hex[:12]}",
            status="open",
            category="SAST",
            project_id=proj.id,
            organization_id=org.id,
            cwe_id="CWE-89",
            raw_metadata={},
        )
        db.add(finding)
        await db.commit()

        user_jwt = create_access_token(subject=str(user.id))
        return {
            "user_id": str(user.id),
            "email": user.email,
            "org_id": str(org.id),
            "workspace_id": str(ws.id),
            "project_id": str(proj.id),
            "project_name": proj.name,
            "finding_id": str(finding.id),
            "user_jwt": user_jwt,
        }


async def _issue_oauth_token(
    client: httpx.AsyncClient,
    user_jwt: str,
    client_id: str = "chatgpt-mcp-connector",
    redirect_uri: str = "https://chatgpt.com/connector_platform_oauth_redirect",
    scope: str = "projects:read projects:write scans:read findings:read remediation:propose remediation:apply offline_access",
) -> str:
    verifier, challenge = _make_pkce_pair()
    state = secrets.token_urlsafe(12)
    auth_res = await client.get(
        "/oauth/authorize",
        params={
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": scope,
            "state": state,
            "resource": "https://mcp.kavachsecurity.me/mcp",
        },
        headers={"Authorization": f"Bearer {user_jwt}"},
        follow_redirects=False,
    )
    assert auth_res.status_code in (302, 307)
    tx_id = parse_qs(urlparse(auth_res.headers["location"]).query)["tx"][0]

    approve_res = await client.post(
        "/oauth/consent/approve",
        headers={"Authorization": f"Bearer {user_jwt}"},
        json={"tx": tx_id, "set_as_default": True},
    )
    assert approve_res.status_code == 200, approve_res.text
    code = parse_qs(urlparse(approve_res.json()["redirect_to"]).query)["code"][0]

    tok_res = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "code_verifier": verifier,
            "resource": "https://mcp.kavachsecurity.me/mcp",
        },
    )
    assert tok_res.status_code == 200, tok_res.text
    return tok_res.json()["access_token"]


@pytest.mark.asyncio
async def test_mcp_2025_capabilities_annotations_resources_prompts_and_completions(adv_env):
    client, factory = adv_env
    alice = await _seed_project_with_finding(
        factory, email="alice.adv@acme.io", org_slug="alice-adv", project_name="Core-API"
    )
    bob = await _seed_project_with_finding(
        factory, email="bob.adv@other.io", org_slug="bob-adv", project_name="Bob-Private"
    )

    alice_token = await _issue_oauth_token(client, alice["user_jwt"])
    headers = {"Authorization": f"Bearer {alice_token}"}

    # 1. initialize reports full MCP 2025 capabilities
    init_res = await client.post(
        "/mcp",
        headers=headers,
        json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-03-26"}},
    )
    assert init_res.status_code == 200
    caps = init_res.json()["result"]["capabilities"]
    assert "resources" in caps
    assert "prompts" in caps
    assert "completions" in caps
    assert "logging" in caps

    # 2. tools/list includes 26+ tools with readOnlyHint/destructiveHint annotations
    tools_res = await client.post("/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    tools = {t["name"]: t for t in tools_res.json()["result"]["tools"]}
    for required_tool in ("list_project_findings", "get_project_posture", "list_pending_approvals", "get_mcp_audit_trail"):
        assert required_tool in tools
        assert tools[required_tool]["annotations"]["readOnlyHint"] is True
        assert tools[required_tool]["annotations"]["destructiveHint"] is False
    assert tools["quarantine_compromised_target"]["annotations"]["destructiveHint"] is True
    assert tools["quarantine_compromised_target"]["annotations"]["readOnlyHint"] is False

    # 3. resources/list & resources/templates/list
    res_list = await client.post("/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 3, "method": "resources/list"})
    uris = {r["uri"] for r in res_list.json()["result"]["resources"]}
    assert {"kavach://workspace/active", "kavach://projects", "kavach://approvals/pending"}.issubset(uris)

    tpl_res = await client.post(
        "/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 4, "method": "resources/templates/list"}
    )
    assert len(tpl_res.json()["result"]["resourceTemplates"]) >= 4

    # 4. resources/read (authorized project posture & findings + cross-tenant block + scope check)
    posture_read = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 5,
            "method": "resources/read",
            "params": {"uri": f"kavach://project/{alice['project_id']}/findings"},
        },
    )
    assert posture_read.status_code == 200
    parsed_findings = json.loads(posture_read.json()["result"]["contents"][0]["text"])
    assert parsed_findings["count"] == 1
    assert parsed_findings["findings"][0]["rule_id"] == "python.lang.security.audit.sql-injection"

    cross_read = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 6,
            "method": "resources/read",
            "params": {"uri": f"kavach://project/{bob['project_id']}/findings"},
        },
    )
    assert cross_read.json()["error"]["code"] == -32003

    ro_token = await _issue_oauth_token(
        client, alice["user_jwt"], client_id="claude-web", redirect_uri="https://claude.ai/api/mcp/auth_callback", scope="projects:read"
    )
    scope_denied = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {ro_token}"},
        json={
            "jsonrpc": "2.0",
            "id": 7,
            "method": "resources/read",
            "params": {"uri": f"kavach://project/{alice['project_id']}/findings"},
        },
    )
    assert scope_denied.status_code == 403
    assert "insufficient_scope" in scope_denied.headers.get("WWW-Authenticate", "")

    # 5. prompts/list & prompts/get enriched with live DB finding
    prompts_list = await client.post("/mcp", headers=headers, json={"jsonrpc": "2.0", "id": 8, "method": "prompts/list"})
    prompt_names = {p["name"] for p in prompts_list.json()["result"]["prompts"]}
    assert {"security_audit_project", "triage_and_fix_finding", "pr_security_gate_review", "compliance_readiness_brief"}.issubset(prompt_names)

    prompt_get = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 9,
            "method": "prompts/get",
            "params": {"name": "triage_and_fix_finding", "arguments": {"finding_id": alice["finding_id"]}},
        },
    )
    prompt_text = prompt_get.json()["result"]["messages"][0]["content"]["text"]
    assert alice["finding_id"] in prompt_text
    assert "CWE-89" in prompt_text

    # 6. completion/complete returns real project UUIDs and compliance frameworks
    comp_res = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": 10,
            "method": "completion/complete",
            "params": {"ref": {"type": "ref/prompt", "name": "security_audit_project"}, "argument": {"name": "project_id", "value": ""}},
        },
    )
    assert alice["project_id"] in comp_res.json()["result"]["completion"]["values"]


@pytest.mark.asyncio
async def test_mcp_batch_sse_progress_and_cryptographic_approval_workflow(adv_env):
    client, factory = adv_env
    alice = await _seed_project_with_finding(
        factory, email="alice.hitl@acme.io", org_slug="alice-hitl", project_name="HITL-App"
    )
    alice_token = await _issue_oauth_token(client, alice["user_jwt"])
    headers = {"Authorization": f"Bearer {alice_token}"}

    # 1. JSON-RPC 2.0 Batching
    batch_res = await client.post(
        "/mcp",
        headers=headers,
        json=[
            {"jsonrpc": "2.0", "id": "b1", "method": "ping"},
            {"jsonrpc": "2.0", "id": "b2", "method": "logging/setLevel", "params": {"level": "info"}},
            {"jsonrpc": "2.0", "id": "b3", "method": "tools/call", "params": {"name": "get_project_posture", "arguments": {}}},
        ],
    )
    assert batch_res.status_code == 200
    batch_json = batch_res.json()
    assert len(batch_json) == 3
    posture_data = batch_json[2]["result"]["structuredContent"]["data"]
    assert posture_data["posture_rating"] == "HIGH_RISK"
    assert posture_data["open_findings_by_severity"]["HIGH"] == 1

    # 2. Streamable HTTP SSE Progress Streaming (`Accept: text/event-stream`)
    sse_res = await client.post(
        "/mcp",
        headers={**headers, "Accept": "text/event-stream"},
        json={
            "jsonrpc": "2.0",
            "id": "stream1",
            "method": "tools/call",
            "params": {
                "name": "list_project_findings",
                "arguments": {"severity": "HIGH"},
                "_meta": {"progressToken": "tok-1"},
            },
        },
    )
    assert sse_res.status_code == 200
    assert "text/event-stream" in sse_res.headers.get("content-type", "")
    assert '"method": "notifications/progress"' in sse_res.text
    assert '"progressToken": "tok-1"' in sse_res.text
    assert '"id": "stream1"' in sse_res.text

    # 3. Cryptographic HITL Approval Gate: self-approval bypass (`approved: true`) MUST NOT execute
    gated_call = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": "hitl1",
            "method": "tools/call",
            "params": {
                "name": "simulate_attack_path",
                "arguments": {"target_url": "https://api.acme.io/orders", "approved": True},
            },
        },
    )
    assert gated_call.status_code == 200
    gated_content = gated_call.json()["result"]["structuredContent"]
    assert gated_content["status"] == "REQUIRES_APPROVAL"
    approval_id = gated_content["approval_id"]
    assert approval_id and len(approval_id) == 36  # Real UUID from PostgreSQL SecurityApproval

    # 4. REST `/api/v1/mcp/approvals` shows the real pending approval
    ap_list_res = await client.get("/api/v1/mcp/approvals", headers={"Authorization": f"Bearer {alice['user_jwt']}"})
    assert ap_list_res.status_code == 200
    assert ap_list_res.json()["pending_count"] == 1
    assert ap_list_res.json()["items"][0]["id"] == approval_id

    # 5. Approve via `/api/v1/mcp/approvals/{id}/decide`
    decide_res = await client.post(
        f"/api/v1/mcp/approvals/{approval_id}/decide",
        headers={"Authorization": f"Bearer {alice['user_jwt']}"},
        json={"decision": "APPROVED", "notes": "Reviewed attack surface scope."},
    )
    assert decide_res.status_code == 200
    assert decide_res.json()["status"] == "APPROVED"

    # 6. Tampered arguments with valid approval_id MUST BE DENIED
    tamper_res = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": "hitl_tamper",
            "method": "tools/call",
            "params": {
                "name": "simulate_attack_path",
                "arguments": {"target_url": "https://evil.external.com/admin", "approval_id": approval_id},
            },
        },
    )
    assert tamper_res.json()["result"]["structuredContent"]["status"] == "DENIED"
    assert tamper_res.json()["result"]["structuredContent"]["error_code"] == "MCP_APPROVAL_INVALID"

    # 7. Exact approved arguments execute cleanly + audit trail logs everything
    exec_res = await client.post(
        "/mcp",
        headers=headers,
        json={
            "jsonrpc": "2.0",
            "id": "hitl_ok",
            "method": "tools/call",
            "params": {
                "name": "simulate_attack_path",
                "arguments": {"target_url": "https://api.acme.io/orders", "approval_id": approval_id},
            },
        },
    )
    assert exec_res.json()["result"]["structuredContent"]["error_code"] != "MCP_APPROVAL_REQUIRED"
    assert exec_res.json()["result"]["structuredContent"]["error_code"] != "MCP_APPROVAL_INVALID"

    # 8. Check `get_mcp_audit_trail` tool and REST `/api/v1/mcp/activity`
    audit_res = await client.post(
        "/mcp",
        headers=headers,
        json={"jsonrpc": "2.0", "id": "aud1", "method": "tools/call", "params": {"name": "get_mcp_audit_trail", "arguments": {}}},
    )
    assert audit_res.json()["result"]["structuredContent"]["data"]["events_count"] >= 3

    act_res = await client.get("/api/v1/mcp/activity", headers={"Authorization": f"Bearer {alice['user_jwt']}"})
    assert act_res.status_code == 200
    assert act_res.json()["total"] >= 3

