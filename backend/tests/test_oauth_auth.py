import uuid
import pytest
from unittest.mock import patch
from httpx import AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import generate_oauth_state, verify_oauth_state
from app.models.user import User
from app.models.project import Project
from app.core.security import hash_password
from app.core.config import get_settings


class MockGitHubOutboundClient:
    def __init__(self, *args, **kwargs):
        self.gh_id = 99887766
        self.email = "newdev@githubuser.io"
        self.verified = True
        self.login = "newdev-gh"
        self.name = "New Developer"

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def post(self, url, *args, **kwargs):
        if "github.com/login/oauth/access_token" in str(url):
            return Response(200, json={"access_token": "gh_test_token_12345"})
        return Response(404)

    async def get(self, url, *args, **kwargs):
        url_str = str(url)
        if "api.github.com/user/emails" in url_str:
            return Response(200, json=[{"email": self.email, "primary": True, "verified": self.verified}])
        if "api.github.com/user" in url_str:
            return Response(200, json={
                "id": self.gh_id,
                "login": self.login,
                "name": self.name,
                "avatar_url": f"https://avatars.githubusercontent.com/u/{self.gh_id}",
                "email": self.email,
            })
        return Response(404)


class MockGoogleOutboundClient:
    def __init__(self, *args, **kwargs):
        self.sub = "google-sub-1029384756"
        self.email = "newuser@gmail.com"
        self.verified = True
        self.name = "Google User Jane"

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com/token" in str(url):
            return Response(200, json={"access_token": "google_test_token_xyz"})
        return Response(404)

    async def get(self, url, *args, **kwargs):
        url_str = str(url)
        if "oauth2.googleapis.com/tokeninfo" in url_str:
            if not self.email:
                return Response(400, json={"error_description": "Invalid Value"})
            return Response(200, json={
                "sub": self.sub,
                "name": self.name,
                "email": self.email,
                "email_verified": "true" if self.verified else "false",
                "picture": "https://lh3.googleusercontent.com/a/jane",
                "iss": "https://accounts.google.com",
                "aud": get_settings().google_client_id or "918237465-seculayer-dev.apps.googleusercontent.com",
            })
        if "googleapis.com/oauth2/v3/userinfo" in url_str:
            return Response(200, json={
                "sub": self.sub,
                "name": self.name,
                "email": self.email,
                "email_verified": self.verified,
                "picture": "https://lh3.googleusercontent.com/a/jane",
            })
        return Response(404)


@pytest.mark.asyncio
async def test_oauth_state_cryptographic_validation():
    """Verify signed JWT CSRF state generation and validation."""
    state_gh = generate_oauth_state("github")
    assert state_gh is not None
    assert verify_oauth_state(state_gh, "github") is True
    # Rejects mismatched provider
    assert verify_oauth_state(state_gh, "google") is False
    # Rejects invalid or forged tokens
    assert verify_oauth_state("tampered.state.jwt", "github") is False
    assert verify_oauth_state("", "github") is False
    assert verify_oauth_state(None, "github") is False


@pytest.mark.asyncio
async def test_get_github_auth_url(client: AsyncClient):
    """Verify GitHub authorization URL endpoint returns valid consent URL."""
    resp = await client.get("/api/v1/auth/github/url")
    assert resp.status_code == 200
    data = resp.json()
    assert "github.com/login/oauth/authorize" in data["url"]
    assert "client_id=" in data["url"]
    assert "state=" in data["url"]
    assert data["state"] is not None


@pytest.mark.asyncio
async def test_get_google_auth_url(client: AsyncClient):
    """Verify Google authorization URL endpoint returns valid consent URL."""
    resp = await client.get("/api/v1/auth/google/url")
    assert resp.status_code == 200
    data = resp.json()
    assert "accounts.google.com/o/oauth2/v2/auth" in data["url"]
    assert "client_id=" in data["url"]
    assert "state=" in data["url"]
    assert data["state"] is not None


@pytest.mark.asyncio
async def test_github_oauth_new_user_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test new user authentication via GitHub OAuth:
    - User account created automatically
    - Onboarding completed is False (routes to onboarding)
    - Default workspace project created
    - JWT bearer token issued
    - is_new_user is True
    """
    state = generate_oauth_state("github")
    mock_client = MockGitHubOutboundClient()
    mock_client.gh_id = 99887766
    mock_client.email = "newdev@githubuser.io"
    mock_client.login = "newdev-gh"
    mock_client.name = "New Developer"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/github/callback",
            json={"code": "gh_valid_auth_code", "state": state},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["token_type"] == "bearer"
    assert data["is_new_user"] is True
    assert data["user"]["email"] == "newdev@githubuser.io"
    assert data["github_login"] == "newdev-gh"

    # Verify database persistence
    user_stmt = select(User).where(User.email == "newdev@githubuser.io")
    user_res = await db_session.execute(user_stmt)
    created_user = user_res.scalar_one_or_none()
    assert created_user is not None
    assert created_user.github_user_id == "99887766"
    assert created_user.is_verified is True
    assert created_user.onboarding_completed is False

    # Verify workspace project created
    proj_stmt = select(Project).where(Project.owner_id == created_user.id)
    proj_res = await db_session.execute(proj_stmt)
    user_proj = proj_res.scalar_one_or_none()
    assert user_proj is not None


@pytest.mark.asyncio
async def test_github_oauth_existing_user_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test returning existing GitHub user:
    - User already exists with matching github_user_id
    - Account is logged in directly
    - User ID and projects are preserved
    - is_new_user is False
    """
    existing_user_id = uuid.uuid4()
    existing_gh_id = "55443322"
    existing_email = "existingdev@github.com"

    user = User(
        id=existing_user_id,
        email=existing_email,
        name="Existing Dev",
        github_user_id=existing_gh_id,
        auth_provider="github",
        password_hash=hash_password("DummyHash123!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.commit()

    state = generate_oauth_state("github")
    mock_client = MockGitHubOutboundClient()
    mock_client.gh_id = int(existing_gh_id)
    mock_client.email = existing_email
    mock_client.login = "existingdev"
    mock_client.name = "Existing Dev"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/github/callback",
            json={"code": "gh_existing_code", "state": state},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["is_new_user"] is False
    assert data["user"]["id"] == str(existing_user_id)


@pytest.mark.asyncio
async def test_google_oauth_new_user_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test new user authentication via Google OAuth:
    - User account created automatically
    - is_new_user is True
    - Default workspace project created
    """
    state = generate_oauth_state("google")
    google_sub = "google-sub-1029384756"
    google_email = "newuser@gmail.com"

    mock_client = MockGoogleOutboundClient()
    mock_client.sub = google_sub
    mock_client.email = google_email
    mock_client.name = "Google User Jane"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/callback",
            json={"code": "google_test_code_1", "state": state},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["is_new_user"] is True
    assert data["email"] == google_email

    # Verify database persistence
    user_stmt = select(User).where(User.email == google_email)
    user_res = await db_session.execute(user_stmt)
    created_user = user_res.scalar_one_or_none()
    assert created_user is not None
    assert created_user.google_user_id == google_sub
    assert created_user.is_verified is True


@pytest.mark.asyncio
async def test_google_oauth_existing_user_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test returning existing Google user:
    - Authenticates directly using linked google_user_id
    - is_new_user is False
    - User ID is preserved
    """
    existing_user_id = uuid.uuid4()
    google_sub = "google-sub-55667788"
    google_email = "existing.jane@gmail.com"

    user = User(
        id=existing_user_id,
        email=google_email,
        name="Existing Jane",
        google_user_id=google_sub,
        auth_provider="google",
        password_hash=hash_password("DummyHash456!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.commit()

    state = generate_oauth_state("google")
    mock_client = MockGoogleOutboundClient()
    mock_client.sub = google_sub
    mock_client.email = google_email
    mock_client.name = "Existing Jane"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/callback",
            json={"code": "google_returning_code", "state": state},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["is_new_user"] is False
    assert data["user"]["id"] == str(existing_user_id)


@pytest.mark.asyncio
async def test_safe_account_linking_verified_email(client: AsyncClient, db_session: AsyncSession):
    """
    Test safe account linking:
    - User previously created account with verified email
    - User now signs in with Google having the SAME verified email
    - Accounts are linked safely without creating a duplicate account
    """
    user_id = uuid.uuid4()
    common_email = "engineer@corporate.com"

    user = User(
        id=user_id,
        email=common_email,
        name="Corporate Engineer",
        github_user_id="11223344",
        auth_provider="github",
        password_hash=hash_password("Pass123456!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.commit()

    state = generate_oauth_state("google")
    new_google_sub = "google-sub-corp-999"

    mock_client = MockGoogleOutboundClient()
    mock_client.sub = new_google_sub
    mock_client.email = common_email
    mock_client.verified = True
    mock_client.name = "Corporate Engineer"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/callback",
            json={"code": "google_link_code", "state": state},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["user"]["id"] == str(user_id)
    assert data["is_new_user"] is False

    # Verify both provider IDs are now attached to the same user
    updated_user = (await db_session.execute(select(User).where(User.id == user_id))).scalar_one()
    assert updated_user.github_user_id == "11223344"
    assert updated_user.google_user_id == new_google_sub


@pytest.mark.asyncio
async def test_account_linking_unverified_email_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    SECURITY TEST:
    Reject automatic account merge when provider email is unverified.
    Prevents account takeover via unverified email claims.
    """
    victim_user_id = uuid.uuid4()
    victim_email = "target.executive@enterprise.com"

    victim = User(
        id=victim_user_id,
        email=victim_email,
        name="Target Executive",
        password_hash=hash_password("SuperSecretExecutivePassword1!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(victim)
    await db_session.commit()

    state = generate_oauth_state("github")
    mock_client = MockGitHubOutboundClient()
    mock_client.gh_id = 666777888
    mock_client.email = victim_email
    mock_client.verified = False  # UNVERIFIED email claim from provider
    mock_client.login = "unverified-claimer"

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/github/callback",
            json={"code": "gh_unverified_code", "state": state},
        )

    # Must be strictly rejected with HTTP 400
    assert resp.status_code == 400
    data = resp.json()
    err_msg = data.get("error", {}).get("message") or data.get("detail", "")
    assert "not been verified" in err_msg.lower()


@pytest.mark.asyncio
async def test_oauth_csrf_state_rejection(client: AsyncClient):
    """Verify forged, missing, or mismatched CSRF state is rejected."""
    # Invalid state on GitHub callback
    resp_gh = await client.post(
        "/api/v1/auth/github/callback",
        json={"code": "some_code", "state": "forged_state_token"},
    )
    assert resp_gh.status_code == 400
    err_gh = resp_gh.json().get("error", {}).get("message") or resp_gh.json().get("detail", "")
    assert "state verification failed" in err_gh.lower()

    # Invalid state on Google callback
    resp_google = await client.post(
        "/api/v1/auth/google/callback",
        json={"code": "some_code", "state": "forged_state_token"},
    )
    assert resp_google.status_code == 400
    err_google = resp_google.json().get("error", {}).get("message") or resp_google.json().get("detail", "")
    assert "state verification failed" in err_google.lower()


# =============================================================================
# Google One Tap Authentication Tests
# =============================================================================

@pytest.mark.asyncio
async def test_google_config_endpoint(client: AsyncClient):
    """Verify /google/config returns public client_id and one_tap_enabled."""
    resp = await client.get("/api/v1/auth/google/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "client_id" in data
    assert data["client_id"] is not None
    assert data["one_tap_enabled"] is True


@pytest.mark.asyncio
async def test_google_one_tap_new_user(client: AsyncClient, db_session: AsyncSession):
    """
    Test automatic Google One Tap authentication for first-time visitor:
    - User account created automatically
    - Access token issued
    - is_new_user is True
    - Default workspace project created
    - Session and audit events recorded with google_one_tap
    """
    mock_client = MockGoogleOutboundClient()
    mock_client.sub = "onetap-sub-112233"
    mock_client.email = "onetap.newuser@gmail.com"
    mock_client.name = "One Tap Newbie"
    mock_client.verified = True

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/one-tap",
            json={"credential": "valid_google_id_token_jwt_newuser"},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["is_new_user"] is True
    assert data["email"] == "onetap.newuser@gmail.com"

    # Verify user saved in DB
    user_stmt = select(User).where(User.email == "onetap.newuser@gmail.com")
    user = (await db_session.execute(user_stmt)).scalar_one_or_none()
    assert user is not None
    assert user.google_user_id == "onetap-sub-112233"
    assert user.is_verified is True
    assert user.auth_provider == "google"

    # Verify default project created
    proj_stmt = select(Project).where(Project.owner_id == user.id)
    proj = (await db_session.execute(proj_stmt)).scalar_one_or_none()
    assert proj is not None

    # Verify session recorded
    assert user.active_sessions is not None
    assert any(s.get("client_name") == "Google One Tap Session" for s in user.active_sessions)


@pytest.mark.asyncio
async def test_google_one_tap_existing_user(client: AsyncClient, db_session: AsyncSession):
    """
    Test returning user login via Google One Tap:
    - Matches existing google_user_id
    - Direct login, user ID preserved
    - is_new_user is False
    """
    existing_id = uuid.uuid4()
    user = User(
        id=existing_id,
        email="onetap.returning@gmail.com",
        name="Returning Google User",
        google_user_id="onetap-sub-returning-999",
        auth_provider="google",
        password_hash=hash_password("PassSecu123!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.commit()

    mock_client = MockGoogleOutboundClient()
    mock_client.sub = "onetap-sub-returning-999"
    mock_client.email = "onetap.returning@gmail.com"
    mock_client.name = "Returning Google User"
    mock_client.verified = True

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/one-tap",
            json={"credential": "valid_google_id_token_jwt_returning"},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["access_token"] is not None
    assert data["is_new_user"] is False
    assert data["user"]["id"] == str(existing_id)


@pytest.mark.asyncio
async def test_google_one_tap_account_linking(client: AsyncClient, db_session: AsyncSession):
    """
    Test safe account linking via Google One Tap:
    - User already registered via email
    - Taps Google account with identical verified email
    - google_user_id is linked without duplicate account creation
    """
    existing_id = uuid.uuid4()
    user = User(
        id=existing_id,
        email="developer@company.org",
        name="Company Developer",
        password_hash=hash_password("CorporatePass123!"),
        is_active=True,
        is_verified=True,
        onboarding_completed=True,
    )
    db_session.add(user)
    await db_session.commit()

    mock_client = MockGoogleOutboundClient()
    mock_client.sub = "onetap-sub-link-777"
    mock_client.email = "developer@company.org"
    mock_client.verified = True

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/one-tap",
            json={"credential": "valid_google_id_token_jwt_link"},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["user"]["id"] == str(existing_id)
    assert data["is_new_user"] is False

    # Check google_user_id linked
    updated_user = (await db_session.execute(select(User).where(User.id == existing_id))).scalar_one()
    assert updated_user.google_user_id == "onetap-sub-link-777"


@pytest.mark.asyncio
async def test_google_one_tap_unverified_email_rejected(client: AsyncClient, db_session: AsyncSession):
    """
    Security check:
    Reject Google One Tap authentication if Google reports email_verified=False.
    """
    mock_client = MockGoogleOutboundClient()
    mock_client.sub = "unverified-sub-404"
    mock_client.email = "unverified.user@gmail.com"
    mock_client.verified = False

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_client):
        resp = await client.post(
            "/api/v1/auth/google/one-tap",
            json={"credential": "unverified_google_id_token"},
        )

    assert resp.status_code == 400
    data = resp.json()
    msg = data.get("error", {}).get("message") or data.get("detail", "")
    assert "not been verified" in msg.lower()


@pytest.mark.asyncio
async def test_google_one_tap_empty_credential_rejected(client: AsyncClient):
    """Reject empty credential payload."""
    resp = await client.post(
        "/api/v1/auth/google/one-tap",
        json={"credential": ""},
    )
    assert resp.status_code == 400

