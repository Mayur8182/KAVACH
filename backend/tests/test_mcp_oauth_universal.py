"""
Comprehensive End-to-End Test Suite for Kavach Universal MCP OAuth 2.1 + PKCE + Workspace/Project Authorization.

Covers:
1. OAuth 2.1 Discovery & RFC 9728 Protected Resource Metadata + RS256 JWKS
2. Dynamic Client Registration (RFC 7591), CIMD HTTPS URL Client IDs + SSRF Guard, Pre-registered AI/IDE Connectors
3. HTTP 401 WWW-Authenticate Challenges on /mcp & /sse and Legacy /cli/auth Auth Bypass Prevention
4. Full PKCE (S256) Authorization Code Flow, Zero-Project Inline Onboarding, RS256 Token Signing & OIDC ID Token
5. Code Replay Attack Detection + Token Revocation, Refresh Token Rotation + Reuse Family Revocation
6. Single Kavach Account Across Multiple AI Clients (ChatGPT, Claude, Cursor) with Per-Client Disconnect Isolation
7. All 11 Account/Workspace/Project/Repo MCP Tools + Per-Client Active Project Isolation + DELETE /mcp
8. Strict Multi-Tenant Org/Project Isolation, Insufficient Scope (403), Viewer RBAC Denial, Refresh-as-Access Rejection
9. IDE & CLI Git Remote Auto-Detection (`POST /api/v1/mcp/resolve-project` SSH + HTTPS normalization)
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import shutil
import sys
import uuid
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import parse_qs, urlparse

import httpx
import jwt
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from jwt.algorithms import RSAAlgorithm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import set_session_factory  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.main import app  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.invitation import OrganizationMember  # noqa: E402
from app.models.organization import Organization, Workspace  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.user import User  # noqa: E402


def _make_pkce_pair() -> Tuple[str, str]:
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii").rstrip("=")
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
        .decode("ascii")
        .rstrip("=")
    )
    return verifier, challenge


@pytest_asyncio.fixture(scope="module")
async def _schema_template(tmp_path_factory):
    """Creates SQLite schema + one RSA signing key once per test module for fast test isolation."""
    template_dir = tmp_path_factory.mktemp("kavach_schema")
    template_db = template_dir / "template.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{template_db.as_posix()}",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.core.jwks import ensure_signing_keys_loaded
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with session_factory() as db:
        await ensure_signing_keys_loaded(db)

    await engine.dispose()
    return template_db


@pytest_asyncio.fixture()
async def test_env(tmp_path: Path, _schema_template: Path):
    """Clones the schema template into an isolated async SQLite database per test without touching dev.db."""
    db_file = tmp_path / "kavach_test.db"
    shutil.copyfile(_schema_template, db_file)
    db_url = f"sqlite+aiosqlite:///{db_file.as_posix()}"
    engine = create_async_engine(db_url, echo=False, connect_args={"check_same_thread": False})

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    set_session_factory(session_factory)

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="https://mcp.kavachsecurity.me",
        ) as client:
            yield client, session_factory
    finally:
        set_session_factory(None)
        await engine.dispose()


async def _seed_user_org_ws(
    session_factory,
    *,
    email: str,
    name: str,
    org_name: str,
    org_slug: str,
    role: str = "admin",
    create_project: bool = False,
    project_name: str = "Kavach-Web",
    repo_url: Optional[str] = "https://github.com/acme/kavach-web",
) -> Dict[str, str]:
    async with session_factory() as db:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash="oauth_managed",
            name=name,
            is_active=True,
            is_superuser=False,
            is_verified=True,
            auth_provider="github",
            onboarding_completed=True,
        )
        db.add(user)
        await db.flush()

        org_owner_id = user.id
        if role.lower() in {"viewer", "auditor"}:
            owner_user = User(
                id=uuid.uuid4(),
                email=f"owner-{org_slug}@example.com",
                password_hash="oauth_managed",
                name=f"{org_name} Owner",
                is_active=True,
                is_superuser=False,
                is_verified=True,
                auth_provider="github",
                onboarding_completed=True,
            )
            db.add(owner_user)
            await db.flush()
            org_owner_id = owner_user.id

        org = Organization(
            id=uuid.uuid4(),
            name=org_name,
            slug=org_slug,
            owner_id=org_owner_id,
            owner_name=user.name if org_owner_id == user.id else f"{org_name} Owner",
            owner_email=user.email if org_owner_id == user.id else f"owner-{org_slug}@example.com",
            status="ACTIVE",
        )
        db.add(org)
        await db.flush()

        member = OrganizationMember(
            id=uuid.uuid4(),
            organization_id=org.id,
            user_id=user.id,
            role=role,
            is_active=True,
        )
        db.add(member)

        ws = Workspace(
            id=uuid.uuid4(),
            organization_id=org.id,
            owner_id=org_owner_id,
            workspace_type="ORGANIZATION",
            name=f"{org_name} Workspace",
            slug=f"{org_slug}-ws",
            status="ACTIVE",
        )
        db.add(ws)
        await db.flush()

        user.default_workspace_id = ws.id

        proj_id = ""
        if create_project:
            proj = Project(
                id=uuid.uuid4(),
                owner_id=org_owner_id,
                organization_id=org.id,
                workspace_id=ws.id,
                name=project_name,
                repository_url=repo_url,
                environment="production",
                application_type="web_service",
            )
            db.add(proj)
            await db.flush()
            user.default_project_id = proj.id
            proj_id = str(proj.id)

        db.add(user)
        await db.commit()

        session_jwt = create_access_token(subject=str(user.id))
        return {
            "user_id": str(user.id),
            "email": user.email,
            "org_id": str(org.id),
            "workspace_id": str(ws.id),
            "project_id": proj_id,
            "session_jwt": session_jwt,
        }


async def _authorize_and_exchange_pkce(
    client: httpx.AsyncClient,
    *,
    session_jwt: str,
    client_id: str,
    redirect_uri: str,
    scope: str = "openid profile email projects:read projects:write scans:read scans:run findings:read offline_access",
    project_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    nonce: Optional[str] = None,
) -> Dict[str, str]:
    verifier, challenge = _make_pkce_pair()
    state = secrets.token_urlsafe(12)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "scope": scope,
        "state": state,
        "resource": "https://mcp.kavachsecurity.me/mcp",
    }
    if nonce:
        params["nonce"] = nonce

    auth_resp = await client.get(
        "/oauth/authorize",
        params=params,
        headers={"Authorization": f"Bearer {session_jwt}"},
        follow_redirects=False,
    )
    assert auth_resp.status_code == 302
    loc = auth_resp.headers["location"]
    assert "/oauth/consent?tx=" in loc
    assert "auto_approve" not in loc
    tx = parse_qs(urlparse(loc).query)["tx"][0]

    approve_payload = {"tx": tx, "set_as_default": True}
    if workspace_id:
        approve_payload["workspace_id"] = workspace_id
    if project_id:
        approve_payload["project_id"] = project_id

    approve_resp = await client.post(
        "/oauth/consent/approve",
        json=approve_payload,
        headers={"Authorization": f"Bearer {session_jwt}"},
    )
    assert approve_resp.status_code == 200, approve_resp.text
    redirect_to = approve_resp.json()["redirect_to"]
    q = parse_qs(urlparse(redirect_to).query)
    assert q["state"][0] == state
    code = q["code"][0]

    tok_resp = await client.post(
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
    assert tok_resp.status_code == 200, tok_resp.text
    data = tok_resp.json()
    data["tx"] = tx
    data["code"] = code
    data["verifier"] = verifier
    return data


@pytest.mark.asyncio
async def test_discovery_metadata_jwks_and_401_challenges(test_env):
    client, _ = test_env

    # 1. RFC 9728 Protected Resource Metadata (root and /mcp suffix)
    for path in ("/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"):
        resp = await client.get(path)
        assert resp.status_code == 200
        body = resp.json()
        assert body["resource"].endswith("/mcp")
        assert body["authorization_servers"][0] == "https://mcp.kavachsecurity.me"
        assert "bearer_methods_supported" in body

    # 2. RFC 8414 & OIDC Discovery Metadata
    for path in ("/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"):
        resp = await client.get(path)
        assert resp.status_code == 200
        meta = resp.json()
        assert meta["issuer"] == "https://mcp.kavachsecurity.me"
        assert meta["authorization_endpoint"] == "https://mcp.kavachsecurity.me/oauth/authorize"
        assert meta["token_endpoint"] == "https://mcp.kavachsecurity.me/oauth/token"
        assert meta["registration_endpoint"] == "https://mcp.kavachsecurity.me/oauth/register"
        assert meta["jwks_uri"] == "https://mcp.kavachsecurity.me/.well-known/jwks.json"
        assert meta["code_challenge_methods_supported"] == ["S256"]
        assert meta["client_id_metadata_document_supported"] is True

    # 3. Asymmetric JWKS endpoint
    jwks_resp = await client.get("/.well-known/jwks.json")
    assert jwks_resp.status_code == 200
    keys = jwks_resp.json()["keys"]
    assert len(keys) >= 1
    assert keys[0]["kty"] == "RSA"
    assert keys[0]["alg"] == "RS256"
    assert keys[0]["use"] == "sig"
    assert "n" in keys[0] and "e" in keys[0]

    # 4. Unauthenticated MCP / SSE / CLI endpoints return proper 401 + WWW-Authenticate
    mcp_unauth = await client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    assert mcp_unauth.status_code == 401
    www_auth = mcp_unauth.headers.get("www-authenticate", "")
    assert "Bearer" in www_auth
    assert 'resource_metadata="https://mcp.kavachsecurity.me/.well-known/oauth-protected-resource"' in www_auth

    sse_unauth = await client.get("/sse")
    assert sse_unauth.status_code == 401
    assert "resource_metadata=" in sse_unauth.headers.get("www-authenticate", "")

    cli_unauth = await client.post(
        "/api/v1/cli/auth",
        json={"device_name": "dev-laptop", "os_type": "windows"},
    )
    assert cli_unauth.status_code == 401


@pytest.mark.asyncio
async def test_dcr_cimd_and_ssrf_guard(test_env, monkeypatch):
    client, _ = test_env

    # Valid RFC 7591 Dynamic Client Registration
    reg = await client.post(
        "/oauth/register",
        json={
            "client_name": "Custom Test AI Agent",
            "redirect_uris": ["https://agent.example.com/oauth/callback"],
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
        },
    )
    assert reg.status_code == 201
    reg_data = reg.json()
    assert reg_data["client_id"].startswith("kavach_")
    assert reg_data["token_endpoint_auth_method"] == "none"

    # Invalid redirect URI error follows RFC 7591 error shape
    bad_reg = await client.post(
        "/oauth/register",
        json={"client_name": "Bad", "redirect_uris": ["http://evil.example.com/cb"]},
    )
    assert bad_reg.status_code == 400
    assert bad_reg.json()["error"] == "invalid_redirect_uri"

    # CIMD SSRF guard rejects private loopback HTTPS URLs
    _, challenge = _make_pkce_pair()
    ssrf_resp = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "https://127.0.0.1/client-meta.json",
            "redirect_uri": "https://127.0.0.1/cb",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert ssrf_resp.status_code == 400

    # Valid external CIMD HTTPS URL document resolves client metadata cleanly
    cimd_url = "https://assistant.example.org/mcp/client.json"

    class _FakeResp:
        status_code = 200
        content = b"{}"

        def json(self):
            return {
                "client_id": cimd_url,
                "client_name": "Partner CIMD Assistant",
                "client_uri": "https://assistant.example.org",
                "redirect_uris": ["https://assistant.example.org/oauth/cb"],
                "token_endpoint_auth_method": "none",
            }

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, **kwargs):
            assert url == cimd_url
            return _FakeResp()

    monkeypatch.setattr("app.api.v1.oauth.httpx.AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr("app.api.v1.oauth._is_safe_cimd_url", lambda u: u == cimd_url)

    cimd_auth = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": cimd_url,
            "redirect_uri": "https://assistant.example.org/oauth/cb",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
        follow_redirects=False,
    )
    assert cimd_auth.status_code == 302
    assert "/oauth/consent?tx=" in cimd_auth.headers["location"]


@pytest.mark.asyncio
async def test_pkce_zero_project_onboarding_jwks_and_code_replay(test_env):
    client, session_factory = test_env
    user_ctx = await _seed_user_org_ws(
        session_factory,
        email="dev@acme.io",
        name="Aarav Sharma",
        org_name="Acme Corp",
        org_slug="acme-corp",
        create_project=False,
    )

    _, challenge = _make_pkce_pair()
    verifier, challenge = _make_pkce_pair()

    # Start OAuth flow BEFORE authentication -> consent context shows unauthenticated state
    auth_resp = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "claude-desktop",
            "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "openid profile email projects:read projects:write scans:read offline_access",
            "state": "st-onboard",
            "nonce": "nonce-123",
            "resource": "https://mcp.kavachsecurity.me/mcp",
        },
        follow_redirects=False,
    )
    assert auth_resp.status_code == 302
    tx = parse_qs(urlparse(auth_resp.headers["location"]).query)["tx"][0]

    unauth_ctx = await client.get(f"/oauth/consent/context?tx={tx}")
    assert unauth_ctx.status_code == 200
    assert unauth_ctx.json()["authenticated"] is False

    # User authenticates -> sees existing Acme workspace (no duplicate org created!) and 0 projects
    auth_ctx = await client.get(
        f"/oauth/consent/context?tx={tx}",
        headers={"Authorization": f"Bearer {user_ctx['session_jwt']}"},
    )
    assert auth_ctx.status_code == 200
    ctx_body = auth_ctx.json()
    assert ctx_body["authenticated"] is True
    assert len(ctx_body["organizations"]) == 1
    assert ctx_body["organizations"][0]["name"] == "Acme Corp"
    assert ctx_body["projects"] == []

    # Inline onboarding creates first project & sets it as default
    onb_resp = await client.post(
        "/oauth/consent/onboarding/project",
        json={
            "tx": tx,
            "name": "Kavach-Web",
            "workspace_id": user_ctx["workspace_id"],
            "repository_url": "https://github.com/acme/kavach-web",
            "environment": "production",
        },
        headers={"Authorization": f"Bearer {user_ctx['session_jwt']}"},
    )
    assert onb_resp.status_code == 200, onb_resp.text
    created_proj = onb_resp.json()
    assert created_proj["name"] == "Kavach-Web"
    assert created_proj["is_default"] is True

    # Approve consent -> exchange code for RS256 access_token + OIDC id_token
    approve = await client.post(
        "/oauth/consent/approve",
        json={"tx": tx, "project_id": created_proj["id"], "set_as_default": True},
        headers={"Authorization": f"Bearer {user_ctx['session_jwt']}"},
    )
    assert approve.status_code == 200
    code = parse_qs(urlparse(approve.json()["redirect_to"]).query)["code"][0]

    tok = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
            "client_id": "claude-desktop",
            "code_verifier": verifier,
        },
    )
    assert tok.status_code == 200
    tok_json = tok.json()
    assert tok_json["project_id"] == created_proj["id"]
    assert "id_token" in tok_json

    # Verify RS256 JWT & OIDC ID Token directly against JWKS endpoint
    jwks = (await client.get("/.well-known/jwks.json")).json()["keys"]
    header = jwt.get_unverified_header(tok_json["access_token"])
    assert header["alg"] == "RS256"
    jwk = next(k for k in jwks if k["kid"] == header["kid"])
    pub_key: RSAPublicKey = RSAAlgorithm.from_jwk(jwk)  # type: ignore[assignment]
    decoded_at = jwt.decode(
        tok_json["access_token"],
        pub_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
    assert decoded_at["client_id"] == "claude-desktop"
    assert decoded_at["project_id"] == created_proj["id"]

    decoded_id = jwt.decode(
        tok_json["id_token"],
        pub_key,
        algorithms=["RS256"],
        audience="claude-desktop",
    )
    assert decoded_id["email"] == "dev@acme.io"
    assert decoded_id["nonce"] == "nonce-123"

    # Verify /oauth/userinfo
    ui = await client.get("/oauth/userinfo", headers={"Authorization": f"Bearer {tok_json['access_token']}"})
    assert ui.status_code == 200
    assert ui.json()["email"] == "dev@acme.io"

    # Security: code replay must return invalid_grant AND revoke issued access token
    replay = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
            "client_id": "claude-desktop",
            "code_verifier": verifier,
        },
    )
    assert replay.status_code == 400
    assert replay.json()["error"] == "invalid_grant"

    revoked_use = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {tok_json['access_token']}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert revoked_use.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotation_reuse_family_revocation(test_env):
    client, session_factory = test_env
    u = await _seed_user_org_ws(
        session_factory,
        email="rot@acme.io",
        name="Rohan",
        org_name="RotOrg",
        org_slug="rot-org",
        create_project=True,
    )
    tok1 = await _authorize_and_exchange_pkce(
        client,
        session_jwt=u["session_jwt"],
        client_id="cursor-mcp",
        redirect_uri="http://127.0.0.1:44123/callback",
    )

    # Normal rotation produces fresh access & refresh tokens
    rot_resp = await client.post(
        "/oauth/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": tok1["refresh_token"],
            "client_id": "cursor-mcp",
        },
    )
    assert rot_resp.status_code == 200
    tok2 = rot_resp.json()
    assert tok2["access_token"] != tok1["access_token"]
    assert tok2["refresh_token"] != tok1["refresh_token"]

    # Attacker replays rotated refresh_token -> revokes entire token family
    reuse_resp = await client.post(
        "/oauth/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": tok1["refresh_token"],
            "client_id": "cursor-mcp",
        },
    )
    assert reuse_resp.status_code == 400
    assert reuse_resp.json()["error"] == "invalid_grant"

    # tok2 is now revoked immediately
    blocked = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {tok2['access_token']}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )
    assert blocked.status_code == 401


@pytest.mark.asyncio
async def test_multi_client_isolation_all_11_tools_and_delete_session(test_env):
    client, session_factory = test_env
    u = await _seed_user_org_ws(
        session_factory,
        email="multi@acme.io",
        name="Maya",
        org_name="MultiOrg",
        org_slug="multi-org",
        create_project=True,
        project_name="Kavach-Web",
        repo_url="https://github.com/acme/kavach-web",
    )

    chatgpt_tok = await _authorize_and_exchange_pkce(
        client,
        session_jwt=u["session_jwt"],
        client_id="chatgpt-mcp-connector",
        redirect_uri="https://chatgpt.com/connector_platform_oauth_redirect",
    )
    claude_tok = await _authorize_and_exchange_pkce(
        client,
        session_jwt=u["session_jwt"],
        client_id="claude-web",
        redirect_uri="https://claude.ai/api/mcp/auth_callback",
    )
    cursor_tok = await _authorize_and_exchange_pkce(
        client,
        session_jwt=u["session_jwt"],
        client_id="cursor-mcp",
        redirect_uri="cursor://anysphere.cursor-mcp/oauth/callback",
    )

    # Confirm NO duplicate org created
    async with session_factory() as db:
        orgs = (await db.execute(select(Organization))).scalars().all()
        assert len(orgs) == 1

    # Dashboard shows all 3 connected AI clients
    conns = await client.get(
        "/api/v1/oauth/connections",
        headers={"Authorization": f"Bearer {u['session_jwt']}"},
    )
    assert conns.status_code == 200
    c_data = conns.json()
    assert c_data["active_clients_count"] == 3
    client_ids = {c["client_id"] for c in c_data["connected_clients"]}
    assert client_ids == {"chatgpt-mcp-connector", "claude-web", "cursor-mcp"}

    # Initialize MCP session on Claude
    init_resp = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {claude_tok['access_token']}"},
        json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"clientInfo": {"name": "Claude"}}},
    )
    assert init_resp.status_code == 200
    session_id = init_resp.headers.get("Mcp-Session-Id") or init_resp.headers.get("mcp-session-id")

    async def call_tool(bearer: str, name: str, args: Optional[dict] = None) -> dict:
        r = await client.post(
            "/mcp",
            headers={"Authorization": f"Bearer {bearer}"},
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": name, "arguments": args or {}},
            },
        )
        assert r.status_code == 200, f"{name} HTTP {r.status_code}: {r.text}"
        body = r.json()
        assert "result" in body, f"{name} returned JSON-RPC error: {body}"
        assert body["result"].get("isError") is not True, f"{name} tool error: {body}"
        content_text_parsed = json.loads(body["result"]["content"][0]["text"])
        structured = body["result"]["structuredContent"]
        assert structured["status"] == content_text_parsed["status"]
        return structured["data"]

    # Exercise ALL 11 account / workspace / project / repo MCP tools
    me = await call_tool(claude_tok["access_token"], "get_current_user")
    assert me["email"] == "multi@acme.io"

    wss = await call_tool(claude_tok["access_token"], "list_workspaces")
    assert len(wss["workspaces"]) == 1
    ws = await call_tool(claude_tok["access_token"], "get_workspace")
    assert ws["id"] == u["workspace_id"]

    # Default project resolved automatically with NO project_id passed!
    active1 = await call_tool(claude_tok["access_token"], "get_active_project")
    assert active1["active_project"]["name"] == "Kavach-Web"

    created = await call_tool(
        claude_tok["access_token"],
        "create_project",
        {"name": "Backend-API", "environment": "staging"},
    )
    backend_id = created["project"]["id"]

    conn_repo = await call_tool(
        claude_tok["access_token"],
        "connect_repository",
        {"project_id": backend_id, "repository_url": "https://github.com/acme/backend-api"},
    )
    assert conn_repo["repository_url"] == "https://github.com/acme/backend-api"

    all_projs = await call_tool(claude_tok["access_token"], "list_projects")
    assert {p["name"] for p in all_projs["projects"]} == {"Kavach-Web", "Backend-API"}

    # Switch Claude active project to Backend-API, leaving Cursor on Kavach-Web!
    switched = await call_tool(
        claude_tok["access_token"],
        "set_active_project",
        {"project_id": backend_id},
    )
    assert switched["active_project"]["id"] == backend_id

    claude_active = await call_tool(claude_tok["access_token"], "get_active_project")
    cursor_active = await call_tool(cursor_tok["access_token"], "get_active_project")
    assert claude_active["active_project"]["id"] == backend_id
    assert cursor_active["active_project"]["id"] == u["project_id"]

    proj_detail = await call_tool(claude_tok["access_token"], "get_project", {"project_id": backend_id})
    assert proj_detail["name"] == "Backend-API"

    status_res = await call_tool(claude_tok["access_token"], "get_connection_status")
    assert status_res["authenticated"] is True

    perms_res = await call_tool(claude_tok["access_token"], "get_available_permissions")
    assert "granted_scopes" in perms_res

    # Disconnect ONLY ChatGPT via POST /api/v1/oauth/connections/disconnect
    disc = await client.post(
        "/api/v1/oauth/connections/disconnect",
        json={"client_id": "chatgpt-mcp-connector"},
        headers={"Authorization": f"Bearer {u['session_jwt']}"},
    )
    assert disc.status_code == 200
    assert disc.json()["revoked_tokens"] >= 1

    # ChatGPT token is rejected, while Claude and Cursor remain active!
    cg_after = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {chatgpt_tok['access_token']}"},
        json={"jsonrpc": "2.0", "id": 9, "method": "tools/list"},
    )
    assert cg_after.status_code == 401

    claude_after = await call_tool(claude_tok["access_token"], "get_active_project")
    assert claude_after["active_project"]["id"] == backend_id

    # DELETE /mcp closes MCP session cleanly
    del_resp = await client.delete(
        "/mcp",
        headers={
            "Authorization": f"Bearer {claude_tok['access_token']}",
            **({"Mcp-Session-Id": session_id} if session_id else {}),
        },
    )
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_tenant_isolation_scopes_rbac_and_git_remote_resolution(test_env):
    client, session_factory = test_env
    user_a = await _seed_user_org_ws(
        session_factory,
        email="alice@orga.io",
        name="Alice",
        org_name="OrgA",
        org_slug="org-a",
        role="admin",
        create_project=True,
        project_name="Backend-API",
        repo_url="https://github.com/acme/backend-api",
    )
    user_b = await _seed_user_org_ws(
        session_factory,
        email="bob@orgb.io",
        name="Bob",
        org_name="OrgB",
        org_slug="org-b",
        role="viewer",
        create_project=True,
        project_name="OrgB-Service",
        repo_url="https://github.com/orgb/service",
    )

    # 1. Read-only token cannot invoke projects:write tool -> HTTP 403 insufficient_scope
    bob_readonly_tok = await _authorize_and_exchange_pkce(
        client,
        session_jwt=user_b["session_jwt"],
        client_id="claude-web",
        redirect_uri="https://claude.ai/api/mcp/auth_callback",
        scope="openid profile email projects:read",
    )
    insufficient = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {bob_readonly_tok['access_token']}"},
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "create_project", "arguments": {"name": "Sneaky"}},
        },
    )
    assert insufficient.status_code == 403
    assert "insufficient_scope" in insufficient.headers.get("www-authenticate", "")

    # 2. Even if viewer requests write scope, Viewer RBAC blocks mutation tool
    bob_full_scope_tok = await _authorize_and_exchange_pkce(
        client,
        session_jwt=user_b["session_jwt"],
        client_id="cursor-mcp",
        redirect_uri="cursor://anysphere.cursor-mcp/oauth/callback",
        scope="openid projects:read projects:write scans:run",
    )
    viewer_denied = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {bob_full_scope_tok['access_token']}"},
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {"name": "create_project", "arguments": {"name": "ViewerWrite"}},
        },
    )
    assert viewer_denied.status_code == 200
    assert viewer_denied.json()["error"]["code"] == -32003

    # 3. Cross-tenant isolation: Bob cannot read or manage Alice's project
    cross_tenant_rest = await client.get(
        f"/api/v1/projects/{user_a['project_id']}/mcp/status",
        headers={"Authorization": f"Bearer {user_b['session_jwt']}"},
    )
    assert cross_tenant_rest.status_code == 403

    cross_tenant_mcp = await client.post(
        "/mcp",
        headers={"Authorization": f"Bearer {bob_readonly_tok['access_token']}"},
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "get_project", "arguments": {"project_id": user_a["project_id"]}},
        },
    )
    assert cross_tenant_mcp.status_code == 200
    assert cross_tenant_mcp.json()["result"]["isError"] is True

    # 4. Refresh token cannot be used as Bearer access token
    refresh_as_bearer = await client.get(
        "/api/v1/oauth/connections",
        headers={"Authorization": f"Bearer {bob_full_scope_tok['refresh_token']}"},
    )
    assert refresh_as_bearer.status_code == 401

    # 5. IDE & CLI Git Remote Auto-Resolution (SSH & HTTPS variants match Alice's repo, not Bob's)
    for remote in (
        "git@github.com:Acme/Backend-API.git",
        "https://github.com/acme/backend-api.git/",
    ):
        res_a = await client.post(
            "/api/v1/mcp/resolve-project",
            json={"git_remote": remote, "client_id": "kavach-vscode"},
            headers={"Authorization": f"Bearer {user_a['session_jwt']}"},
        )
        assert res_a.status_code == 200
        body_a = res_a.json()
        assert body_a["matched"] is True
        assert body_a["project"]["id"] == user_a["project_id"]

    # Bob querying Alice's git remote must NOT match across tenant boundary
    res_b = await client.post(
        "/api/v1/mcp/resolve-project",
        json={"git_remote": "git@github.com:acme/backend-api.git", "client_id": "kavach-vscode"},
        headers={"Authorization": f"Bearer {user_b['session_jwt']}"},
    )
    assert res_b.status_code == 200
    assert res_b.json()["matched"] is False

