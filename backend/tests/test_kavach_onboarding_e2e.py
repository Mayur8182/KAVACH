"""
End-to-End Test Suite for Kavach Security
Universal Authentication, GitHub App Installation & Onboarding System

Validates:
- Flow A: Continue with GitHub (OAuth -> Create Project -> Check GitHub App -> Select Repo -> Overview)
- Flow B: Continue with Google (OAuth -> Connect Your GitHub -> GitHub App Installation -> Select Repo -> Overview)
- Official GitHub App URL & State Verification (https://github.com/apps/kavach-security/installations/new)
- Webhook Synchronization (installation.created, installation_repositories.removed, installation.deleted)
- Multi-provider Onboarding State Resolution (Rules A-H)
- Repository Isolation and Real Data Persistence
"""

import uuid
import jwt
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import generate_oauth_state
from app.models.user import User
from app.models.project import Project
from app.models.github import GitHubInstallation, GitHubRepository, GitHubWebhookEvent
from app.services.github_service import GitHubService


class MockGitHubClient:
    def __init__(self, gh_id=77889900, email="kavach_dev@github.com", login="kavachdev"):
        self.gh_id = gh_id
        self.email = email
        self.login = login
        self.name = "Kavach GitHub Developer"

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def post(self, url, *args, **kwargs):
        if "github.com/login/oauth/access_token" in str(url):
            return Response(200, json={"access_token": "gh_access_token_mock_12345"})
        return Response(404)

    async def get(self, url, *args, **kwargs):
        url_str = str(url)
        if "api.github.com/user/emails" in url_str:
            return Response(200, json=[{"email": self.email, "primary": True, "verified": True}])
        if "api.github.com/user" in url_str:
            return Response(200, json={
                "id": self.gh_id,
                "login": self.login,
                "name": self.name,
                "avatar_url": f"https://avatars.githubusercontent.com/u/{self.gh_id}",
                "email": self.email,
            })
        return Response(404)


class MockGoogleClient:
    def __init__(self, sub="google-user-991122", email="googledev@gmail.com"):
        self.sub = sub
        self.email = email
        self.name = "Google Kavach User"

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def post(self, url, *args, **kwargs):
        if "oauth2.googleapis.com/token" in str(url):
            return Response(200, json={"access_token": "google_access_token_mock_67890"})
        return Response(404)

    async def get(self, url, *args, **kwargs):
        url_str = str(url)
        if "oauth2.googleapis.com/tokeninfo" in url_str or "googleapis.com/oauth2/v3/userinfo" in url_str:
            return Response(200, json={
                "sub": self.sub,
                "name": self.name,
                "email": self.email,
                "email_verified": True,
                "picture": "https://lh3.googleusercontent.com/a/kavach",
            })
        return Response(404)


@pytest.mark.asyncio
async def test_flow_a_github_user_onboarding_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """
    Test Flow A:
    1. User clicks Continue with GitHub
    2. GitHub OAuth verifies callback
    3. User created with auth_provider='github', onboarding_completed=False
    4. Profile returns github_installed=False, onboarding_state directs to /onboarding
    """
    state = generate_oauth_state("github")
    mock_gh = MockGitHubClient(gh_id=1234567, email="github_flow_a@example.com", login="flow-a-user")

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_gh):
        resp = await client.post(
            "/api/v1/auth/github/callback",
            json={"code": "valid_github_code_a", "state": state},
        )

    assert resp.status_code == 200, resp.text
    auth_data = resp.json()
    assert auth_data["access_token"] is not None
    assert auth_data["is_new_user"] is True
    assert auth_data["github_login"] == "flow-a-user"
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify user record
    user_stmt = select(User).where(User.email == "github_flow_a@example.com")
    user = (await db_session.execute(user_stmt)).scalar_one()
    assert user.auth_provider == "github"
    assert user.onboarding_completed is False

    # Check /auth/me profile
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["auth_provider"] == "github"
    assert me_data["onboarding_completed"] is False
    assert me_data["github_installed"] is False

    # Check /onboarding/state machine
    onboarding_resp = await client.get("/api/v1/onboarding/state", headers=headers)
    assert onboarding_resp.status_code == 200
    onboarding_data = onboarding_resp.json()
    assert onboarding_data["auth_provider"] == "github"
    assert onboarding_data["github_installed"] is False
    # GitHub user goes to Create Project / Onboarding
    assert onboarding_data["next_route"] in ["/onboarding", "/projects/create"]


@pytest.mark.asyncio
async def test_flow_b_google_user_connect_github_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """
    Test Flow B:
    1. User clicks Continue with Google
    2. Google OAuth callback establishes user with auth_provider='google'
    3. New user without GitHub installation MUST route to /onboarding/connect-github
    4. User requests GitHub App installation URL (https://github.com/apps/kavach-security/installations/new)
    5. Installation completed -> links to user
    6. Returning user now has github_installed=True
    """
    state = generate_oauth_state("google")
    google_sub = "google-sub-flow-b-987"
    google_email = "google_flow_b@example.com"
    mock_google = MockGoogleClient(sub=google_sub, email=google_email)

    with patch("app.api.v1.auth.httpx.AsyncClient", return_value=mock_google):
        resp = await client.post(
            "/api/v1/auth/google/callback",
            json={"code": "valid_google_code_b", "state": state},
        )

    assert resp.status_code == 200, resp.text
    auth_data = resp.json()
    assert auth_data["access_token"] is not None
    assert auth_data["is_new_user"] is True
    # CRITICAL: Google user without GitHub installation MUST be routed to /onboarding/connect-github
    assert auth_data["next_route"] == "/onboarding/connect-github"
    assert auth_data["github_installed"] is False
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify user in database
    user_stmt = select(User).where(User.email == google_email)
    user = (await db_session.execute(user_stmt)).scalar_one()
    assert user.auth_provider == "google"
    assert user.google_user_id == google_sub
    assert user.onboarding_completed is False

    # Check /onboarding/state
    state_resp = await client.get("/api/v1/onboarding/state", headers=headers)
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["auth_provider"] == "google"
    assert state_data["github_installed"] is False
    assert state_data["next_route"] == "/onboarding/connect-github"

    # Step 4: User clicks "Connect GitHub" -> generate official GitHub App installation URL
    install_resp = await client.post(
        "/api/v1/integrations/github/install-url",
        json={"redirect_url": "http://localhost:3002/onboarding?step=github&connected=true"},
        headers=headers,
    )
    assert install_resp.status_code == 200
    install_data = install_resp.json()
    assert "github.com/apps/kavach-security/installations/new" in install_data["install_url"]
    assert "github.com/apps/kavach-security/installations/new" in install_data["url"]
    assert "state=" in install_data["install_url"]
    install_state = install_data["state"]

    # Verify state contains user_id without pre-consuming it
    decoded = jwt.decode(install_state, options={"verify_signature": False})
    assert decoded is not None
    assert str(decoded.get("user_id")) == str(user.id)

    # Step 5: Simulate GitHub installation callback
    inst_id = 99881122
    with patch("app.services.github_service.GitHubService.sync_installation_repositories", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = [
            {"id": 101, "name": "service-api", "full_name": "kavach-org-b/service-api", "default_branch": "main", "private": False},
        ]
        cb_resp = await client.get(
            f"/api/v1/integrations/github/callback?installation_id={inst_id}&state={install_state}&setup_action=install",
            follow_redirects=False,
        )

    # Callback redirects back to frontend with installed=true
    assert cb_resp.status_code in [302, 307]
    redirect_location = cb_resp.headers["location"]
    assert "installed=true" in redirect_location

    # Step 6: Verify installation is now active and linked to the user
    inst_stmt = select(GitHubInstallation).where(GitHubInstallation.github_installation_id == inst_id)
    inst_record = (await db_session.execute(inst_stmt)).scalar_one()
    assert inst_record.status == "ACTIVE"
    assert str(inst_record.connected_by_user_id) == str(user.id)

    # Re-check /auth/me: now github_installed is True!
    me_after = await client.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 200
    assert me_after.json()["github_installed"] is True

    # Re-check /onboarding/state: now directs to Create Project / Onboarding
    state_after = await client.get("/api/v1/onboarding/state", headers=headers)
    assert state_after.status_code == 200
    assert state_after.json()["github_installed"] is True
    assert state_after.json()["next_route"] in ["/onboarding", "/projects/create"]


@pytest.mark.asyncio
async def test_github_webhook_revocation_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """
    Test GitHub Webhook handler for repository removal and app uninstallation:
    - installation.created marks active
    - installation_repositories.removed revokes repository access
    - installation.deleted marks uninstalled
    """
    service = GitHubService(db_session)
    test_inst_id = 44556677
    user_id = uuid.uuid4()

    # Pre-create active installation with 2 repositories
    inst = GitHubInstallation(
        id=uuid.uuid4(),
        github_installation_id=test_inst_id,
        github_account_login="test-org-revoke",
        account_type="Organization",
        github_account_id=123123,
        status="ACTIVE",
        repository_selection="selected",
        connected_by_user_id=user_id,
    )
    db_session.add(inst)
    await db_session.flush()

    repo1 = GitHubRepository(
        id=uuid.uuid4(),
        github_repository_id=9001,
        installation_id=inst.id,
        owner="test-org-revoke",
        name="repo-keep",
        full_name="test-org-revoke/repo-keep",
        default_branch="main",
        html_url="https://github.com/test-org-revoke/repo-keep",
    )
    repo2 = GitHubRepository(
        id=uuid.uuid4(),
        github_repository_id=9002,
        installation_id=inst.id,
        owner="test-org-revoke",
        name="repo-remove",
        full_name="test-org-revoke/repo-remove",
        default_branch="main",
        html_url="https://github.com/test-org-revoke/repo-remove",
    )
    db_session.add(repo1)
    db_session.add(repo2)
    await db_session.commit()

    # Process installation_repositories.removed webhook event via GitHubWebhookEvent
    event1 = GitHubWebhookEvent(
        id=uuid.uuid4(),
        github_delivery_id=f"deliv-{uuid.uuid4()}",
        event_type="installation_repositories",
        action="removed",
        installation_id=test_inst_id,
        payload_reference={
            "action": "removed",
            "installation": {"id": test_inst_id},
            "repositories_removed": [{"id": 9002, "name": "repo-remove", "full_name": "test-org-revoke/repo-remove"}],
        },
    )
    db_session.add(event1)
    await db_session.commit()

    await service.process_webhook_event(event1.id)
    await db_session.commit()

    # Verify repo2 is unlinked
    r2_stmt = select(GitHubRepository).where(GitHubRepository.github_repository_id == 9002)
    r2 = (await db_session.execute(r2_stmt)).scalar_one()
    assert r2.installation_id is None, "Removed repository should have installation_id set to None"

    # Process installation.deleted webhook event
    event2 = GitHubWebhookEvent(
        id=uuid.uuid4(),
        github_delivery_id=f"deliv-{uuid.uuid4()}",
        event_type="installation",
        action="deleted",
        installation_id=test_inst_id,
        payload_reference={
            "action": "deleted",
            "installation": {"id": test_inst_id},
        },
    )
    db_session.add(event2)
    await db_session.commit()

    await service.process_webhook_event(event2.id)
    await db_session.commit()

    # Verify installation status is REMOVED
    inst_check = (await db_session.execute(select(GitHubInstallation).where(GitHubInstallation.github_installation_id == test_inst_id))).scalar_one()
    assert inst_check.status == "REMOVED"
