"""
End-to-End Integration & Regression Tests for Kavach MCP Gateway v2.5+:
1. `/api/v1/mcp/manifest` CLI & JSON configs (fixes stuck "Loading CLI command..." widget)
2. GitHub metadata lookup (`get_github_repository`, `get_pull_request`) + switching repos (`connect_repository`) + connecting 2nd repo cleanly without name collision
3. Project scan scoping (`run_security_scan` clones/scans real repo target, never `os.getcwd()`; `security_check` reuses fresh scan cleanly without duplicating findings)
4. Source-grounded AI remediation & full GitHub remediation workflow via `/mcp` + OAuth 2.1:
   - `get_file_content` -> `propose_remediation_diff` (`is_fixable=True` real diff) -> `create_branch` -> `apply_remediation_patch` -> `verify_patch` -> `create_pull_request`
5. ChatGPT / MCP Apps embedded UI (`ui://kavach/workspace-panel`, `ui://kavach/remediation-panel`) and inline HMAC-signed HITL approval (`POST /api/v1/mcp/approvals/{id}/widget-decide`)
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import shutil
import sys
import uuid
from pathlib import Path
from typing import Dict
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import set_session_factory  # noqa: E402
from app.core.jwks import ensure_signing_keys_loaded  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.main import app  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.github import GitHubInstallation, GitHubPullRequest, GitHubRepository  # noqa: E402
from app.models.invitation import OrganizationMember  # noqa: E402
from app.models.organization import Organization, Workspace  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.gemini_service import GeminiRemediationService  # noqa: E402


def _pkce_pair():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii").rstrip("=")
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode("ascii").rstrip("=")
    return verifier, challenge


@pytest_asyncio.fixture(scope="module")
async def _workflow_schema_template(tmp_path_factory):
    template_db = tmp_path_factory.mktemp("kavach_mcp_wf_schema") / "template.db"
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
async def wf_env(tmp_path: Path, _workflow_schema_template: Path):
    db_file = tmp_path / "mcp_wf_test.db"
    shutil.copyfile(_workflow_schema_template, db_file)
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
            yield client, factory, tmp_path
    finally:
        set_session_factory(None)
        await engine.dispose()


async def _seed_user_and_project(session_factory, *, slug: str, email: str, repo_full: str) -> Dict[str, str]:
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
            name=f"{slug} Org",
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
            name="kavach",
            repository_url=f"https://github.com/{repo_full}",
            environment="production",
            application_type="web_service",
            default_branch="main",
        )
        db.add(proj)
        await db.flush()

        owner, name = repo_full.split("/", 1)
        gh_repo = GitHubRepository(
            id=uuid.uuid4(),
            project_id=proj.id,
            workspace_id=ws.id,
            github_repository_id=987001 if "Fraud" in repo_full else 987002,
            owner=owner,
            name=name,
            full_name=repo_full,
            default_branch="main",
            private=False,
            html_url=f"https://github.com/{repo_full}",
            clone_url=f"https://github.com/{repo_full}.git",
            visibility="public",
            archived=False,
        )
        db.add(gh_repo)
        user.default_workspace_id = ws.id
        user.default_project_id = proj.id
        db.add(user)
        await db.commit()

        return {
            "user_id": str(user.id),
            "project_id": str(proj.id),
            "workspace_id": str(ws.id),
            "repo_id": str(gh_repo.id),
            "user_jwt": create_access_token(subject=str(user.id)),
        }


async def _issue_chatgpt_mcp_token(client: httpx.AsyncClient, user_jwt: str) -> str:
    verifier, challenge = _pkce_pair()
    redirect_uri = "https://chatgpt.com/connector_platform_oauth_redirect"
    auth_res = await client.get(
        "/oauth/authorize",
        params={
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": (
                "projects:read projects:write scans:read scans:run findings:read "
                "remediation:propose remediation:apply offline_access openid"
            ),
            "state": "wf_state",
            "resource": "https://mcp.kavachsecurity.me/mcp",
        },
        headers={"Authorization": f"Bearer {user_jwt}"},
        follow_redirects=False,
    )
    tx_token = parse_qs(urlparse(auth_res.headers["location"]).query)["tx"][0]
    approve_res = await client.post(
        "/oauth/consent/approve",
        json={"tx": tx_token},
        headers={"Authorization": f"Bearer {user_jwt}"},
    )
    assert approve_res.status_code == 200, approve_res.text
    code = parse_qs(urlparse(approve_res.json()["redirect_to"]).query)["code"][0]
    tok_res = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": "chatgpt-mcp-connector",
            "code_verifier": verifier,
            "resource": "https://mcp.kavachsecurity.me/mcp",
        },
    )
    assert tok_res.status_code == 200, tok_res.text
    return tok_res.json()["access_token"]


async def _rpc(client: httpx.AsyncClient, token: str, method: str, params: dict, req_id: int = 1):
    res = await client.post(
        "/mcp",
        json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.asyncio
async def test_manifest_cli_configs_and_tools_list_with_embedded_ui_meta(wf_env):
    client, factory, _ = wf_env
    seeded = await _seed_user_and_project(
        factory, slug="manifest-org", email="manifest@kavachsecurity.me", repo_full="Mayur8182/KAVACH"
    )
    mcp_token = await _issue_chatgpt_mcp_token(client, seeded["user_jwt"])

    mf_res = await client.get("/api/v1/mcp/manifest")
    assert mf_res.status_code == 200, mf_res.text
    mf = mf_res.json()
    assert mf["endpoints"]["mcp"].endswith("/mcp")
    assert mf["configs"]["claude_code"]["command"].startswith("claude mcp add")
    assert mf["configs"]["codex"]["command"].startswith("codex mcp add")
    assert mf["configs"]["gemini"]["command"].startswith("gemini mcp add")
    assert mf["configs"]["claude_desktop"]["mcpServers"]["kavach"]["command"] == "npx"

    tools_rpc = await _rpc(client, mcp_token, "tools/list", {})
    tools = {t["name"]: t for t in tools_rpc["result"]["tools"]}
    for expected in (
        "get_file_content",
        "create_branch",
        "apply_remediation_patch",
        "verify_patch",
        "create_pull_request",
    ):
        assert expected in tools, f"Missing new MCP tool '{expected}'"

    assert tools["propose_remediation_diff"]["_meta"]["openai/outputTemplate"] == "ui://kavach/remediation-panel"
    assert tools["connect_repository"]["_meta"]["openai/outputTemplate"] == "ui://kavach/workspace-panel"

    res_list = await _rpc(client, mcp_token, "resources/list", {}, req_id=2)
    uris = {r["uri"] for r in res_list["result"]["resources"]}
    assert "ui://kavach/workspace-panel" in uris
    assert "ui://kavach/remediation-panel" in uris

    widget_res = await _rpc(client, mcp_token, "resources/read", {"uri": "ui://kavach/remediation-panel"}, req_id=3)
    contents = widget_res["result"]["contents"]
    assert contents[0]["mimeType"] == "text/html+skybridge"
    assert "window.openai" in contents[0]["text"]
    assert "widget-decide" in contents[0]["text"]


@pytest.mark.asyncio
async def test_repo_switch_github_metadata_scan_isolation_and_full_remediation_pr_workflow(
    wf_env, monkeypatch
):
    client, factory, tmp_path = wf_env
    seeded = await _seed_user_and_project(
        factory,
        slug="mayur-kavach",
        email="mayur@kavachsecurity.me",
        repo_full="Maulik557-png/Fraud-Detection-db-setup",
    )
    outsider = await _seed_user_and_project(
        factory,
        slug="outsider-sec",
        email="outsider@example.com",
        repo_full="Outsider/other-repo",
    )
    mcp_token = await _issue_chatgpt_mcp_token(client, seeded["user_jwt"])
    outsider_token = await _issue_chatgpt_mcp_token(client, outsider["user_jwt"])

    # Create a real isolated sample repository checkout for Mayur8182/KAVACH on disk
    sample_repo_dir = tmp_path / "kavach_repo_checkout"
    sample_repo_dir.mkdir(parents=True, exist_ok=True)
    target_rel = "app/runner.py"
    (sample_repo_dir / "app").mkdir(parents=True, exist_ok=True)
    vulnerable_source = (
        "import subprocess\n\n"
        "def run_check(target: str):\n"
        "    return subprocess.run(f'echo {target}', shell=True, check=False)\n"
    )
    (sample_repo_dir / target_rel).write_text(vulnerable_source, encoding="utf-8")

    # Mock remote GitHub REST endpoints + git clone while running FULL local DB/policy/scanner/patch code
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_test_local_token_1234567890123456")
    repo_files: Dict[str, Dict[str, str]] = {"main": vulnerable_source}
    created_prs: Dict[str, dict] = {}

    class _FakeResp:
        def __init__(self, status_code: int, json_data=None, text: str = ""):
            self.status_code = status_code
            self._json = json_data
            self.text = text or (json.dumps(json_data) if json_data is not None else "")

        def json(self):
            return self._json

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url: str, headers=None, params=None):
            if url == "https://api.github.com/repos/Mayur8182/KAVACH":
                return _FakeResp(
                    200,
                    {
                        "id": 999111,
                        "name": "KAVACH",
                        "full_name": "Mayur8182/KAVACH",
                        "default_branch": "main",
                        "private": False,
                        "html_url": "https://github.com/Mayur8182/KAVACH",
                        "clone_url": "https://github.com/Mayur8182/KAVACH.git",
                        "owner": {"login": "Mayur8182"},
                    },
                )
            if "/git/ref/heads/" in url:
                b_name = url.split("/git/ref/heads/", 1)[1]
                if b_name in repo_files:
                    return _FakeResp(200, {"object": {"sha": f"sha_{b_name}_1234567890"}})
                return _FakeResp(404, {"message": "Not Found"})
            if "/contents/" in url:
                ref = (params or {}).get("ref", "main")
                if ref not in repo_files:
                    return _FakeResp(404, {"message": "Branch not found"})
                text = repo_files[ref]
                return _FakeResp(
                    200,
                    {
                        "encoding": "base64",
                        "sha": f"blob_{ref}_abc",
                        "content": base64.b64encode(text.encode("utf-8")).decode("ascii"),
                    },
                )
            return _FakeResp(404, {"message": "Not mocked"})

        async def post(self, url: str, headers=None, json=None):
            if url.endswith("/git/refs"):
                ref_name = (json or {}).get("ref", "").replace("refs/heads/", "")
                repo_files[ref_name] = repo_files["main"]
                return _FakeResp(201, {"ref": f"refs/heads/{ref_name}", "object": {"sha": f"sha_{ref_name}_999"}})
            if url.endswith("/pulls"):
                pr_data = {
                    "id": 55001,
                    "number": 7,
                    "title": json["title"],
                    "state": "open",
                    "html_url": "https://github.com/Mayur8182/KAVACH/pull/7",
                    "head": {"ref": json["head"], "sha": "commit_sha_patched_777"},
                    "base": {"ref": json["base"], "sha": "sha_main_1234567890"},
                    "user": {"login": "Mayur8182"},
                    "draft": False,
                    "merged": False,
                }
                created_prs["7"] = pr_data
                return _FakeResp(201, pr_data)
            return _FakeResp(404, {"message": "Not mocked"})

        async def put(self, url: str, headers=None, json=None):
            if "/contents/" in url:
                branch = json["branch"]
                decoded = base64.b64decode(json["content"]).decode("utf-8")
                repo_files[branch] = decoded
                return _FakeResp(
                    200,
                    {
                        "commit": {"sha": "commit_sha_patched_777"},
                        "content": {"html_url": f"https://github.com/Mayur8182/KAVACH/blob/{branch}/app/runner.py"},
                    },
                )
            return _FakeResp(404, {"message": "Not mocked"})

    import app.mcp.tools.github as mcp_gh
    import app.mcp.tools.scans as mcp_scans

    monkeypatch.setattr(mcp_gh.httpx, "AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr(httpx, "AsyncClient", _FakeAsyncClient)

    async def _fake_clone(repo, project, full_name, branch, token):
        return str(sample_repo_dir), None

    monkeypatch.setattr(mcp_scans, "ensure_repo_workspace_cloned", _fake_clone)

    # 1. Previously crashed `get_github_repository` now works without AttributeError
    old_repo_res = await _rpc(client, mcp_token, "tools/call", {"name": "get_github_repository", "arguments": {}}, req_id=10)
    assert not old_repo_res["result"]["isError"], old_repo_res
    assert old_repo_res["result"]["structuredContent"]["data"]["full_name"] == "Maulik557-png/Fraud-Detection-db-setup"

    # 2. Switch project repository to `Mayur8182/KAVACH` via `connect_repository` cleanly detaching old link
    conn_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {"name": "connect_repository", "arguments": {"repository": "Mayur8182/KAVACH"}},
        req_id=11,
    )
    assert not conn_res["result"]["isError"], conn_res
    conn_data = conn_res["result"]["structuredContent"]["data"]
    assert conn_data["full_name"] == "Mayur8182/KAVACH"
    assert "Maulik557-png/Fraud-Detection-db-setup" in conn_data["detached_previous_repositories"]

    new_repo_meta = await _rpc(client, mcp_token, "tools/call", {"name": "get_github_repository", "arguments": {}}, req_id=12)
    assert new_repo_meta["result"]["structuredContent"]["data"]["full_name"] == "Mayur8182/KAVACH"

    # Also verify connecting a 2nd repo with identical short name under another user does NOT collide
    res_other_conn = await _rpc(
        client,
        outsider_token,
        "tools/call",
        {"name": "connect_repository", "arguments": {"repository": "Outsider/KAVACH"}},
        req_id=120,
    )
    assert not res_other_conn["result"]["isError"]

    # 3. Run scan against Mayur8182/KAVACH checkout (never scanning backend's os.getcwd!)
    scan_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {"name": "run_security_scan", "arguments": {"scanners": ["seculayer-builtin"]}},
        req_id=13,
    )
    assert not scan_res["result"]["isError"], scan_res
    scan_sc = scan_res["result"]["structuredContent"]
    assert scan_sc["data"]["repository"] == "Mayur8182/KAVACH"

    # Subsequent `security_check` reuses fresh scan instead of doubling findings
    chk_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {"name": "security_check", "arguments": {}},
        req_id=14,
    )
    assert chk_res["result"]["structuredContent"]["data"]["reused_recent_scan"] is True

    # 4. get_file_content retrieves exact source from GitHub
    file_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {"name": "get_file_content", "arguments": {"file_path": "app/runner.py", "ref": "main"}},
        req_id=15,
    )
    assert not file_res["result"]["isError"], file_res
    assert "shell=True" in file_res["result"]["structuredContent"]["data"]["content"]

    # 5. propose_remediation_diff produces real source-grounded fix (`is_fixable=True`)
    monkeypatch.setenv("TESTING", "1")
    prop_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {
            "name": "propose_remediation_diff",
            "arguments": {
                "file_path": "app/runner.py",
                "rule_id": "SAST-CMD-INJECTION",
                "title": "Command Injection via subprocess shell=True",
                "line_number": 4,
                "snippet": "return subprocess.run(f'echo {target}', shell=True, check=False)",
            },
        },
        req_id=16,
    )
    assert not prop_res["result"]["isError"], prop_res
    prop_data = prop_res["result"]["structuredContent"]["data"]
    assert prop_data["is_fixable"] is True
    assert "shell=False" in prop_data["patch"]

    async def _approve_inline(tool_name: str, args_dict: dict, rpc_id: int):
        gate = await _rpc(client, mcp_token, "tools/call", {"name": tool_name, "arguments": args_dict}, req_id=rpc_id)
        sc = gate["result"]["structuredContent"]
        assert sc["status"] == "REQUIRES_APPROVAL", sc
        ap_id = sc["approval_id"]
        wtok = sc["data"]["widget_approval_token"]
        assert gate["result"]["_meta"]["openai/outputTemplate"] == "ui://kavach/remediation-panel"

        # Tampered token must fail
        bad = await client.post(
            f"/api/v1/mcp/approvals/{ap_id}/widget-decide",
            json={"decision": "APPROVED", "widget_token": "tampered.sig"},
        )
        assert bad.status_code == 401

        # Valid human click inline approves in PostgreSQL
        ok = await client.post(
            f"/api/v1/mcp/approvals/{ap_id}/widget-decide",
            json={"decision": "APPROVED", "widget_token": wtok},
        )
        assert ok.status_code == 200, ok.text
        assert ok.json()["status"] == "APPROVED"

        done = await _rpc(
            client,
            mcp_token,
            "tools/call",
            {"name": tool_name, "arguments": {**args_dict, "approval_id": ap_id}},
            req_id=rpc_id + 100,
        )
        assert not done["result"]["isError"], done
        assert done["result"]["structuredContent"]["status"] == "SUCCESS"
        return done["result"]["structuredContent"]["data"]

    # 6. Inline approve + execute `create_branch`, `apply_remediation_patch`, `verify_patch`, `create_pull_request`
    br_data = await _approve_inline(
        "create_branch",
        {"branch_name": "security/ai-remediation", "base_branch": "main"},
        rpc_id=20,
    )
    assert br_data["branch"] == "security/ai-remediation"

    patch_data = await _approve_inline(
        "apply_remediation_patch",
        {
            "file_path": "app/runner.py",
            "branch": "security/ai-remediation",
            "patch": prop_data["patch"],
        },
        rpc_id=21,
    )
    assert patch_data["commit_sha"] == "commit_sha_patched_777"
    assert "shell=False" in repo_files["security/ai-remediation"]

    ver_res = await _rpc(
        client,
        mcp_token,
        "tools/call",
        {
            "name": "verify_patch",
            "arguments": {
                "file_path": "app/runner.py",
                "branch": "security/ai-remediation",
                "rule_id": "SAST-CMD-INJECTION",
                "scanner_type": "seculayer-builtin",
            },
        },
        req_id=22,
    )
    assert not ver_res["result"]["isError"], ver_res
    assert ver_res["result"]["structuredContent"]["data"]["verified"] is True

    pr_data = await _approve_inline(
        "create_pull_request",
        {
            "head_branch": "security/ai-remediation",
            "base_branch": "main",
            "title": "Security: AI remediation for critical vulnerabilities",
        },
        rpc_id=23,
    )
    assert pr_data["pr_number"] == 7
    assert pr_data["html_url"] == "https://github.com/Mayur8182/KAVACH/pull/7"

    async with factory() as db:
        saved_pr = (await db.execute(select(GitHubPullRequest).where(GitHubPullRequest.number == 7))).scalars().first()
        assert saved_pr is not None
        assert saved_pr.head_ref == "security/ai-remediation"

