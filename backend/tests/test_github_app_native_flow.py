"""
Tests for Native GitHub App Installation, Authorization, Webhook Verification,
and Repository Synchronization Lifecycle in Kavach Security Control Plane.
"""

import json
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.integrations.github.state_manager import github_state_manager
from app.integrations.github.webhook_verifier import compute_github_signature
from app.models.github import GitHubInstallation
from app.models.integration_models import RealIntegration
from app.models.user import User


@pytest.mark.asyncio
async def test_native_github_app_install_url_endpoint(client: AsyncClient, user_a: User, token_user_a: str):
    """
    Test generating the official GitHub App installation URL with cryptographically
    secure state bound to the user.
    """
    headers = {"Authorization": f"Bearer {token_user_a}"}
    res = await client.post(
        "/api/v1/integrations/github/install-url",
        json={"redirect_url": "http://localhost:3002/projects"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "install_url" in data
    assert "https://github.com/apps/kavach-security/installations/new?state=" in data["install_url"]
    assert "state" in data
    assert len(data["state"]) >= 32
    assert data["app_slug"] == "kavach-security"


@pytest.mark.asyncio
async def test_github_state_manager_single_use_security():
    """
    Enforce CSRF single-use consumption and replay attack prevention.
    """
    user_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    state = github_state_manager.create_installation_state(
        user_id=user_id,
        workspace_id=workspace_id,
        redirect_url="http://localhost:3002/onboarding",
    )
    assert state is not None

    # First consumption: valid
    data = github_state_manager.verify_and_consume_state(state)
    assert data is not None
    assert data["user_id"] == str(user_id)
    assert data["workspace_id"] == str(workspace_id)

    # Replay attack: must be rejected
    data_replayed = github_state_manager.verify_and_consume_state(state)
    assert data_replayed is None


@pytest.mark.asyncio
async def test_github_installation_callback_lifecycle(client: AsyncClient, user_a: User, db_session: AsyncSession):
    """
    Test full callback processing: valid state verification, database persistence of
    GitHubInstallation and RealIntegration, and 302 frontend redirect.
    """
    workspace_id = uuid.uuid4()
    project_id = uuid.uuid4()
    state = github_state_manager.create_installation_state(
        user_id=user_a.id,
        workspace_id=workspace_id,
        project_id=project_id,
        redirect_url="http://localhost:3002/projects?github_connected=true",
    )

    test_installation_id = 998877

    # Execute callback request
    res = await client.get(
        "/integrations/github/callback",
        params={
            "installation_id": test_installation_id,
            "setup_action": "install",
            "state": state,
        },
        follow_redirects=False,
    )

    # Must return 302 redirect back to frontend
    assert res.status_code == 302, res.text
    redirect_location = res.headers.get("location", "")
    assert "installation_id=998877" in redirect_location

    # Verify database persistence of GitHubInstallation
    inst_stmt = select(GitHubInstallation).where(GitHubInstallation.github_installation_id == test_installation_id)
    inst_res = await db_session.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    assert inst is not None
    assert inst.status == "ACTIVE"
    assert inst.github_installation_id == test_installation_id

    # Verify database persistence of RealIntegration
    real_stmt = select(RealIntegration).where(
        RealIntegration.provider == "github",
        RealIntegration.external_account_id == str(test_installation_id),
    )
    real_res = await db_session.execute(real_stmt)
    real = real_res.scalar_one_or_none()
    assert real is not None
    assert real.status == "connected"


@pytest.mark.asyncio
async def test_github_integration_status_endpoint(client: AsyncClient, user_a: User, token_user_a: str):
    """
    Test checking integration status, connected installations, and app metadata.
    """
    headers = {"Authorization": f"Bearer {token_user_a}"}
    res = await client.get("/api/v1/integrations/github/status", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "configured" in data
    assert "app_id" in data
    assert "app_slug" in data
    assert data["app_slug"] == "kavach-security"


@pytest.mark.asyncio
async def test_webhook_installation_repositories_event(client: AsyncClient, db_session: AsyncSession):
    """
    Test processing GitHub Webhook installation_repositories event with HMAC signature verification.
    """
    settings = get_settings()
    secret = settings.github_webhook_secret or "kavach_wh_secret_xyz"

    delivery_id = str(uuid.uuid4())
    payload_dict = {
        "action": "added",
        "installation": {
            "id": 998877,
            "account": {"id": 12345, "login": "test-org", "type": "Organization"},
            "repository_selection": "selected",
        },
        "repositories_added": [
            {
                "id": 554433,
                "name": "payment-gateway",
                "full_name": "test-org/payment-gateway",
                "private": True,
                "default_branch": "main",
                "html_url": "https://github.com/test-org/payment-gateway",
                "clone_url": "https://github.com/test-org/payment-gateway.git",
            }
        ],
        "repository_selection": "selected",
    }
    raw_payload = json.dumps(payload_dict).encode("utf-8")
    signature = compute_github_signature(raw_payload, secret)

    headers = {
        "X-GitHub-Delivery": delivery_id,
        "X-GitHub-Event": "installation_repositories",
        "X-Hub-Signature-256": signature,
        "Content-Type": "application/json",
    }

    res = await client.post("/webhooks/github", content=raw_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] in ("RECEIVED", "DUPLICATE")

    # Verify duplicate event idempotency check
    res_dup = await client.post("/webhooks/github", content=raw_payload, headers=headers)
    assert res_dup.status_code == 200
    assert res_dup.json()["status"] == "DUPLICATE"
