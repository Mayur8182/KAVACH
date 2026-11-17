import hashlib
import json
import secrets
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_oauth_access_token
from app.models.oauth import OAuthAuthorizationCode, OAuthClient, OAuthPendingTransaction
from app.models.project import Project
from app.models.user import User


@pytest.mark.asyncio
async def test_01_discovery_endpoints(client: AsyncClient):
    """Test RFC 8414 and RFC 9207 discovery endpoints."""
    # OAuth Protected Resource Metadata
    resp = await client.get("/.well-known/oauth-protected-resource")
    assert resp.status_code == 200
    data = resp.json()
    assert "/mcp" in data["resource"]
    assert "projects:read" in data["scopes_supported"]

    # OAuth Authorization Server / OIDC Configuration
    resp = await client.get("/.well-known/openid-configuration")
    assert resp.status_code == 200
    data = resp.json()
    assert "/oauth/authorize" in data["authorization_endpoint"]
    assert "/oauth/token" in data["token_endpoint"]
    assert "/oauth/userinfo" in data["userinfo_endpoint"]
    assert "S256" in data["code_challenge_methods_supported"]


@pytest.mark.asyncio
async def test_02_passwordless_ui_rendered(client: AsyncClient):
    """Verify authorization page is strictly passwordless (zero password fields)."""
    verifier = secrets.token_urlsafe(32)
    challenge = hashlib.sha256(verifier.encode()).digest()
    import base64
    b64_challenge = base64.urlsafe_b64encode(challenge).decode().rstrip("=")

    resp = await client.get(
        "/oauth/authorize",
        params={
            "response_type": "code",
            "client_id": "kavach_chatgpt_action",
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "code_challenge": b64_challenge,
            "code_challenge_method": "S256",
            "state": "chatgpt_state_123",
            "scope": "projects:read scans:read",
        },
    )
    assert resp.status_code == 200
    html = resp.text
    # Strictly passwordless assertions
    assert 'type="password"' not in html
    assert 'name="password"' not in html
    assert "Continue with GitHub" in html
    assert "Continue with Google" in html


@pytest.mark.asyncio
async def test_03_pkce_verification_and_token_exchange(client: AsyncClient, db_session: AsyncSession):
    """Verify PKCE S256 validation and authorization code exchange."""
    import base64
    verifier = "test_pkce_verifier_string_at_least_43_characters_long_12345"
    challenge = hashlib.sha256(verifier.encode("ascii")).digest()
    b64_challenge = base64.urlsafe_b64encode(challenge).decode("ascii").rstrip("=")

    # Create test user
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="test_pkce@kavachsecurity.me",
        name="PKCE Test User",
        password_hash="oauth_sso_token_hash",
        auth_provider="github",
        github_user_id="99999",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Create authorization code directly in DB
    code_val = f"kavach_code_{secrets.token_urlsafe(24)}"
    auth_code = OAuthAuthorizationCode(
        code=code_val,
        client_id="kavach_chatgpt_action",
        user_id=user_id,
        redirect_uri="https://chatgpt.com/api/mcp/callback",
        scope="projects:read scans:read offline_access",
        code_challenge=b64_challenge,
        code_challenge_method="S256",
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db_session.add(auth_code)
    await db_session.commit()

    # Wrong verifier must fail
    resp = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code_val,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "client_id": "kavach_chatgpt_action",
            "code_verifier": "wrong_verifier",
        },
    )
    assert resp.status_code == 400
    assert "verification failed" in resp.json()["error_description"]

    # Correct verifier must succeed and return access token
    resp = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code_val,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "client_id": "kavach_chatgpt_action",
            "code_verifier": verifier,
        },
    )
    assert resp.status_code == 200
    token_data = resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "Bearer"
    assert "refresh_token" in token_data

    # Code cannot be re-used (single-use constraint)
    resp_reuse = await client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code_val,
            "redirect_uri": "https://chatgpt.com/api/mcp/callback",
            "client_id": "kavach_chatgpt_action",
            "code_verifier": verifier,
        },
    )
    assert resp_reuse.status_code == 400
    assert "consumed" in resp_reuse.json()["error_description"]


@pytest.mark.asyncio
async def test_04_userinfo_endpoint(client: AsyncClient, db_session: AsyncSession):
    """Verify OIDC UserInfo endpoint returns verified user claims."""
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="oidc_user@kavachsecurity.me",
        name="OIDC User",
        password_hash="oauth_sso_token_hash",
        auth_provider="google",
        google_user_id="google_sub_123",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    token = create_oauth_access_token(
        user_id=user_id,
        client_id="kavach_chatgpt_action",
        scope="openid email profile",
        issuer="http://testserver",
    )

    resp = await client.get("/oauth/userinfo", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    info = resp.json()
    assert info["sub"] == str(user_id)
    assert info["email"] == "oidc_user@kavachsecurity.me"
    assert info["email_verified"] is True
    assert info["name"] == "OIDC User"
