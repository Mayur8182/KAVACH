import base64
import hashlib
import json
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db, set_session_factory
from app.core.security import hash_password
from app.main import create_application
from app.models import Base
from app.models.oauth import OAuthAuthorizationCode, OAuthClient, OAuthToken
from app.models.project import Project
from app.models.user import User


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    async_session = async_sessionmaker(
        bind=db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    set_session_factory(async_session)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def app_instance(db_session: AsyncSession):
    app = create_application()
    app.dependency_overrides[get_db] = lambda: db_session
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app_instance):
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="https://kavachsecurity.me") as ac:
        yield ac


@pytest_asyncio.fixture
async def user_alice(db_session: AsyncSession) -> User:
    u = User(
        id=uuid.uuid4(),
        email="alice@kavach.security",
        name="Alice Security Engineer",
        password_hash=hash_password("AliceSecurePass123!"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(u)
    await db_session.commit()
    return u


@pytest_asyncio.fixture
async def user_bob(db_session: AsyncSession) -> User:
    u = User(
        id=uuid.uuid4(),
        email="bob@external.io",
        name="Bob External Dev",
        password_hash=hash_password("BobSecurePass456!"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(u)
    await db_session.commit()
    return u


def generate_pkce_pair():
    """Generates RFC 7636 compliant code_verifier and S256 code_challenge."""
    import secrets
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


# ── Test Suite ──

@pytest.mark.asyncio
async def test_01_discovery_metadata(client: AsyncClient):
    """Test 1: Verify RFC 9207 & RFC 8414 OAuth discovery endpoints."""
    # 1a. Protected resource metadata
    res_pr = await client.get("/.well-known/oauth-protected-resource")
    assert res_pr.status_code == 200
    pr_data = res_pr.json()
    assert "resource" in pr_data
    assert "authorization_servers" in pr_data
    assert "scopes_supported" in pr_data
    assert "projects:read" in pr_data["scopes_supported"]
    assert "scans:run" in pr_data["scopes_supported"]

    # 1b. Authorization server metadata
    res_as = await client.get("/.well-known/oauth-authorization-server")
    assert res_as.status_code == 200
    as_data = res_as.json()
    assert as_data["issuer"] == "https://kavachsecurity.me"
    assert as_data["authorization_endpoint"] == "https://kavachsecurity.me/oauth/authorize"
    assert as_data["token_endpoint"] == "https://kavachsecurity.me/oauth/token"
    assert "S256" in as_data["code_challenge_methods_supported"]
    assert "authorization_code" in as_data["grant_types_supported"]
    assert "refresh_token" in as_data["grant_types_supported"]


@pytest.mark.asyncio
async def test_02_dynamic_client_registration(client: AsyncClient):
    """Test 2: Dynamic Client Registration (RFC 7591) for ChatGPT."""
    reg_payload = {
        "client_name": "ChatGPT Kavach Connector",
        "redirect_uris": ["https://chatgpt.com/api/mcp/callback"],
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "scope": "projects:read scans:read scans:run findings:read remediation:propose",
        "token_endpoint_auth_method": "none",
    }
    res = await client.post("/oauth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "client_id" in data
    assert data["client_id"].startswith("kavach_")
    assert data["client_name"] == "ChatGPT Kavach Connector"
    assert "https://chatgpt.com/api/mcp/callback" in data["redirect_uris"]


@pytest.mark.asyncio
async def test_03_authorization_endpoint_validation(client: AsyncClient):
    """Test 3: Reject malformed or insecure authorization requests."""
    verifier, challenge = generate_pkce_pair()

    # 3a. Unsupported response_type
    res_bad_type = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "token",  # Implicit grant forbidden in OAuth 2.1
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert res_bad_type.status_code == 400

    # 3b. Missing PKCE or non-S256
    res_bad_pkce = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "plain",  # Plain PKCE strictly forbidden
        },
    )
    assert res_bad_pkce.status_code == 400

    # 3c. Unregistered redirect URI
    res_bad_uri = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://attacker.evil.com/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert res_bad_uri.status_code == 400


@pytest.mark.asyncio
async def test_04_authorization_and_consent_flow(client: AsyncClient, user_alice: User):
    """Test 4: User authenticates and authorizes consent, receiving single-use code."""
    verifier, challenge = generate_pkce_pair()

    # 4a. GET consent screen
    res_get = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read scans:run findings:read",
            "state": "state-xyz-123",
        },
    )
    assert res_get.status_code == 200
    assert "Connect to Kavach Security" in res_get.text

    # 4b. POST consent with invalid password fails
    res_wrong_pw = await client.post(
        "/oauth/authorize",
        data={
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read",
            "state": "state-xyz-123",
            "action": "allow",
            "email": "alice@kavach.security",
            "password": "WrongPassword123",
        },
    )
    assert res_wrong_pw.status_code == 200
    assert "Invalid email or password" in res_wrong_pw.text

    # 4c. POST consent with valid credentials succeeds and issues code
    res_allow = await client.post(
        "/oauth/authorize",
        data={
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read scans:run findings:read",
            "state": "state-xyz-123",
            "action": "allow",
            "email": "alice@kavach.security",
            "password": "AliceSecurePass123!",
        },
        follow_redirects=False,
    )
    assert res_allow.status_code == 302
    location = res_allow.headers["location"]
    assert "https://chatgpt.com/api/mcp/callback" in location
    assert "code=" in location
    assert "state=state-xyz-123" in location


@pytest.mark.asyncio
async def test_05_token_exchange_pkce(client: AsyncClient, user_alice: User, db_session: AsyncSession):
    """Test 5: Exchange authorization code with PKCE verification for tokens."""
    verifier, challenge = generate_pkce_pair()

    # Create code
    import secrets
    auth_code = secrets.token_urlsafe(32)
    from datetime import datetime, timezone, timedelta
    code_record = OAuthAuthorizationCode(
        code=auth_code,
        client_id="chatgpt-mcp-connector",
        user_id=user_alice.id,
        redirect_uri="https://chatgpt.com/api/mcp/callback",
        scope="projects:read scans:read scans:run findings:read",
        code_challenge=challenge,
        code_challenge_method="S256",
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db_session.add(code_record)
    await db_session.commit()

    # 5a. Tampered code_verifier fails
    res_tampered = await client.post(
        "/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": "chatgpt-mcp-connector",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_verifier": "wrong-verifier-1234567890123456789012345678901234567890",
        },
    )
    assert res_tampered.status_code == 400
    assert "PKCE" in res_tampered.json().get("error_description", "")

    # 5b. Valid code_verifier succeeds
    res_token = await client.post(
        "/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": "chatgpt-mcp-connector",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_verifier": verifier,
        },
    )
    assert res_token.status_code == 200
    tok_data = res_token.json()
    assert "access_token" in tok_data
    assert "refresh_token" in tok_data
    assert tok_data["token_type"] == "Bearer"
    assert tok_data["expires_in"] == 3600

    # 5c. Replay attack: Reusing code fails
    res_replay = await client.post(
        "/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": "chatgpt-mcp-connector",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_verifier": verifier,
        },
    )
    assert res_replay.status_code == 400
    assert "already consumed" in res_replay.json().get("error_description", "")


@pytest.mark.asyncio
async def test_06_refresh_token_rotation(client: AsyncClient, user_alice: User, db_session: AsyncSession):
    """Test 6: Refresh token rotation issues new tokens and revokes previous refresh token."""
    verifier, challenge = generate_pkce_pair()
    import secrets
    auth_code = secrets.token_urlsafe(32)
    from datetime import datetime, timezone, timedelta
    code_record = OAuthAuthorizationCode(
        code=auth_code,
        client_id="chatgpt-mcp-connector",
        user_id=user_alice.id,
        redirect_uri="https://chatgpt.com/api/mcp/callback",
        scope="projects:read scans:read",
        code_challenge=challenge,
        code_challenge_method="S256",
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db_session.add(code_record)
    await db_session.commit()

    token_res = await client.post(
        "/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": "chatgpt-mcp-connector",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_verifier": verifier,
        },
    )
    tok1 = token_res.json()
    rt1 = tok1["refresh_token"]

    # Rotate refresh token
    ref_res = await client.post(
        "/oauth/token",
        json={
            "grant_type": "refresh_token",
            "client_id": "chatgpt-mcp-connector",
            "refresh_token": rt1,
        },
    )
    assert ref_res.status_code == 200
    tok2 = ref_res.json()
    rt2 = tok2["refresh_token"]
    assert rt2 != rt1  # Rotated!

    # Old refresh token is now revoked
    stale_res = await client.post(
        "/oauth/token",
        json={
            "grant_type": "refresh_token",
            "client_id": "chatgpt-mcp-connector",
            "refresh_token": rt1,
        },
    )
    assert stale_res.status_code == 400
    assert "revoked" in stale_res.json().get("error_description", "")


@pytest.mark.asyncio
async def test_07_token_revocation_rfc7009(client: AsyncClient, user_alice: User, db_session: AsyncSession):
    """Test 7: Token revocation endpoint (RFC 7009) invalidates access token."""
    from app.core.security import create_oauth_access_token
    from datetime import datetime, timezone, timedelta
    access_token = create_oauth_access_token(
        user_id=user_alice.id,
        client_id="chatgpt-mcp-connector",
        scope="projects:read scans:read",
        issuer="https://kavachsecurity.me",
    )
    access_hash = hashlib.sha256(access_token.encode()).hexdigest()
    token_record = OAuthToken(
        access_token_hash=access_hash,
        client_id="chatgpt-mcp-connector",
        user_id=user_alice.id,
        scope="projects:read",
        token_type="Bearer",
        is_revoked=False,
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db_session.add(token_record)
    await db_session.commit()

    # Active token succeeds on MCP
    mcp_payload = {
        "jsonrpc": "2.0",
        "id": "list-1",
        "method": "tools/call",
        "params": {"name": "list_projects", "arguments": {}},
    }
    res_before = await client.post("/mcp", json=mcp_payload, headers={"Authorization": f"Bearer {access_token}"})
    assert res_before.status_code == 200
    assert "result" in res_before.json()

    # Revoke token
    rev_res = await client.post("/oauth/revoke", json={"token": access_token})
    assert rev_res.status_code == 200

    # Token is now rejected
    res_after = await client.post("/mcp", json=mcp_payload, headers={"Authorization": f"Bearer {access_token}"})
    assert res_after.status_code == 401
    assert "invalid_token" in res_after.headers.get("www-authenticate", "")


@pytest.mark.asyncio
async def test_08_scope_enforcement_on_mcp_tools(client: AsyncClient, user_alice: User, db_session: AsyncSession):
    """Test 8: Ensure tool calls respect granted OAuth scopes."""
    from app.core.security import create_oauth_access_token
    # Token granted ONLY 'projects:read', but NOT 'scans:run'
    limited_token = create_oauth_access_token(
        user_id=user_alice.id,
        client_id="chatgpt-mcp-connector",
        scope="projects:read",  # Missing 'scans:run'
        issuer="https://kavachsecurity.me",
    )
    tok_hash = hashlib.sha256(limited_token.encode()).hexdigest()
    from datetime import datetime, timezone, timedelta
    token_record = OAuthToken(
        access_token_hash=tok_hash,
        client_id="chatgpt-mcp-connector",
        user_id=user_alice.id,
        scope="projects:read",
        token_type="Bearer",
        is_revoked=False,
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db_session.add(token_record)
    await db_session.commit()

    # Authorized tool (list_projects requires projects:read) -> succeeds
    payload_allowed = {
        "jsonrpc": "2.0",
        "id": "call-1",
        "method": "tools/call",
        "params": {"name": "list_projects", "arguments": {}},
    }
    res_ok = await client.post("/mcp", json=payload_allowed, headers={"Authorization": f"Bearer {limited_token}"})
    assert res_ok.status_code == 200
    assert "result" in res_ok.json()

    # Unauthorized tool (run_security_scan requires scans:run) -> blocked with insufficient scope
    payload_denied = {
        "jsonrpc": "2.0",
        "id": "call-2",
        "method": "tools/call",
        "params": {"name": "run_security_scan", "arguments": {"target_path": "backend/app/main.py"}},
    }
    res_blocked = await client.post("/mcp", json=payload_denied, headers={"Authorization": f"Bearer {limited_token}"})
    assert res_blocked.status_code == 200
    denied_json = res_blocked.json()
    assert "error" in denied_json
    assert denied_json["error"]["code"] == -32003
    assert "Insufficient scope" in denied_json["error"]["message"]


@pytest.mark.asyncio
async def test_09_end_to_end_user_project_isolation(
    client: AsyncClient,
    user_alice: User,
    user_bob: User,
    db_session: AsyncSession,
):
    """Test 9: Verified user identity automatically scopes projects with zero manual UUID needed."""
    proj_alice = Project(
        id=uuid.uuid4(),
        name="Alice Banking Core",
        repository_url="kavach/banking",
        owner_id=user_alice.id,
    )
    proj_bob = Project(
        id=uuid.uuid4(),
        name="Bob Secret Microservice",
        repository_url="kavach/secret-service",
        owner_id=user_bob.id,
    )
    db_session.add_all([proj_alice, proj_bob])
    await db_session.commit()

    # Generate token for Alice
    from app.core.security import create_oauth_access_token
    token_alice = create_oauth_access_token(
        user_id=user_alice.id,
        client_id="chatgpt-mcp-connector",
        scope="projects:read",
        issuer="https://kavachsecurity.me",
    )

    # Alice calls list_projects without specifying UUID
    mcp_call = {
        "jsonrpc": "2.0",
        "id": "alice-proj-list",
        "method": "tools/call",
        "params": {"name": "list_projects", "arguments": {}},
    }
    res = await client.post("/mcp", json=mcp_call, headers={"Authorization": f"Bearer {token_alice}"})
    assert res.status_code == 200
    content = json.loads(res.json()["result"]["content"][0]["text"])
    projects = content["data"]["projects"]

    # Verify only Alice's projects returned; Bob's projects never leak
    alice_p_names = [p["name"] for p in projects]
    assert "Alice Banking Core" in alice_p_names
    assert "Bob Secret Microservice" not in alice_p_names
