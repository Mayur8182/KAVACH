import base64
import hashlib
import json
import secrets
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db, set_session_factory
from app.core.security import create_access_token, decode_token_safely, hash_password
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


def generate_pkce():
    verifier = secrets.token_urlsafe(40)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


@pytest.mark.asyncio
async def test_unauthenticated_oauth_authorize_redirects_to_login(client: AsyncClient):
    """
    Scenario: MCP client initiates OAuth connection.
    Unauthenticated user gets directed to Kavach sign-in page (/login?redirect=...).
    """
    verifier, challenge = generate_pkce()

    # 1. Standard GET /oauth/authorize -> renders page with meta-refresh & JS redirect to /login
    resp = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "cursor-mcp",
            "redirect_uri": "https://claude.ai/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read",
            "state": "cursor_state_abc",
        },
    )
    assert resp.status_code == 200
    html = resp.text
    assert "/login?redirect=" in html
    assert "Continue with GitHub" in html
    assert "Continue with Google" in html

    # 2. GET /oauth/authorize with redirect_to_login=1 -> HTTP 302 directly to /login
    resp_direct = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "cursor-mcp",
            "redirect_uri": "https://claude.ai/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read",
            "state": "cursor_state_abc",
            "redirect_to_login": "1",
        },
        follow_redirects=False,
    )
    assert resp_direct.status_code == 302
    location = resp_direct.headers["location"]
    assert "/login?redirect=" in location


@pytest.mark.asyncio
async def test_login_flow_redirect_with_project_id(client: AsyncClient, db_session: AsyncSession):
    """
    Scenario: User logs in on Kavach login page, gets redirected back to /oauth/authorize?auto_approve=1&token=...,
    which auto-provisions project if needed, approves, and redirects back to MCP client with code AND project_id.
    """
    verifier, challenge = generate_pkce()

    # Create real authenticated user
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="developer@kavachsecurity.me",
        name="Kavach Dev User",
        password_hash=hash_password("DevPassword123!"),
        auth_provider="github",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Generate user JWT session token from login
    user_jwt = create_access_token(subject=str(user_id))

    # User returns from /login to /oauth/authorize with auto_approve=1 and token
    resp = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "chatgpt-mcp-connector",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
            "scope": "projects:read scans:read",
            "state": "state_return_from_login_999",
            "auto_approve": "1",
            "token": user_jwt,
        },
        follow_redirects=False,
    )
    assert resp.status_code == 302
    redirect_target = resp.headers["location"]
    assert "https://chatgpt.com/api/mcp/callback" in redirect_target
    assert "code=" in redirect_target
    assert "project_id=" in redirect_target
    assert "projectId=" in redirect_target
    assert "project_name=" in redirect_target
    assert "state=state_return_from_login_999" in redirect_target

    # Extract code and project_id from redirect URL
    from urllib.parse import urlparse, parse_qs
    parsed_qs = parse_qs(urlparse(redirect_target).query)
    auth_code = parsed_qs["code"][0]
    redirect_project_id = parsed_qs["project_id"][0]
    assert len(redirect_project_id) == 36  # Valid UUID format

    # 3. Exchange code for access token via POST /oauth/token
    token_resp = await client.post(
        "/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": "chatgpt-mcp-connector",
            "code": auth_code,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_verifier": verifier,
        },
    )
    assert token_resp.status_code == 200
    token_body = token_resp.json()

    assert "access_token" in token_body
    assert "refresh_token" in token_body
    assert token_body["project_id"] == redirect_project_id
    assert token_body["projectId"] == redirect_project_id
    assert "project_name" in token_body
    assert "projects" in token_body
    assert len(token_body["projects"]) >= 1

    # Verify access token JWT claims contain project_id and projectId
    claims, err = decode_token_safely(token_body["access_token"])
    assert err is None
    assert claims["project_id"] == redirect_project_id
    assert claims["projectId"] == redirect_project_id
    assert claims["sub"] == str(user_id)

    # 4. UserInfo endpoint returns project_id
    userinfo_resp = await client.get(
        "/oauth/userinfo",
        headers={"Authorization": f"Bearer {token_body['access_token']}"},
    )
    assert userinfo_resp.status_code == 200
    userinfo = userinfo_resp.json()
    assert userinfo["project_id"] == redirect_project_id
    assert userinfo["projectId"] == redirect_project_id
    assert userinfo["email"] == "developer@kavachsecurity.me"

