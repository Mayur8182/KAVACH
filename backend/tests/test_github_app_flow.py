import time
import uuid
import pytest
from app.integrations.github.state_manager import GitHubStateManager
from app.integrations.github.webhook_verifier import compute_github_signature, verify_github_signature
from app.core.config import get_settings


def test_github_state_manager_generation_and_consumption():
    """Verify cryptographically secure state generation and single-use consumption."""
    manager = GitHubStateManager(ttl_seconds=300)
    user_id = uuid.uuid4()
    workspace_id = uuid.uuid4()
    project_id = uuid.uuid4()

    # 1. Generate state
    state = manager.create_installation_state(
        user_id=user_id,
        workspace_id=workspace_id,
        project_id=project_id,
        redirect_url="http://localhost:3002/onboarding?step=github",
    )
    assert isinstance(state, str)
    assert len(state) >= 32

    # 2. Consume state (first attempt: valid)
    data = manager.verify_and_consume_state(state)
    assert data is not None
    assert data["user_id"] == str(user_id)
    assert data["workspace_id"] == str(workspace_id)
    assert data["project_id"] == str(project_id)
    assert data["redirect_url"] == "http://localhost:3002/onboarding?step=github"

    # 3. Single-use check: second attempt with identical state must be rejected (CSRF replay protection)
    data_replayed = manager.verify_and_consume_state(state)
    assert data_replayed is None


def test_github_state_manager_expiration():
    """Verify states expire after TTL."""
    manager = GitHubStateManager(ttl_seconds=1)
    state = manager.create_installation_state(user_id=uuid.uuid4())

    time.sleep(1.2)
    consumed = manager.verify_and_consume_state(state)
    assert consumed is None


def test_github_state_manager_invalid_and_empty():
    """Verify rejection of empty, forged, or missing states."""
    manager = GitHubStateManager(ttl_seconds=300)
    assert manager.verify_and_consume_state("") is None
    assert manager.verify_and_consume_state("forged_random_token_1234567890") is None
    assert manager.verify_and_consume_state(None) is None


def test_webhook_hmac_sha256():
    """Verify HMAC SHA-256 signature generation and constant-time verification."""
    secret = "kavach_wh_secret_xyz_890"
    payload = b'{"action":"created","installation":{"id":12345}}'

    sig = compute_github_signature(payload, secret)
    assert sig.startswith("sha256=")

    assert verify_github_signature(payload, sig, secret) is True
    assert verify_github_signature(payload, "sha256=invalidhexcode123", secret) is False
    assert verify_github_signature(b'tampered', sig, secret) is False


def test_github_app_settings_configured():
    """Verify GitHub App settings are loaded properly."""
    settings = get_settings()
    assert settings.github_app_id == "5771182"
    assert settings.github_client_id == "Iv23liqai7qjzsE9RllD"
    assert settings.github_app_slug == "kavach-security"
    assert settings.github_callback_url == "http://localhost:8000/integrations/github/callback"
    assert settings.github_webhook_url == "http://localhost:8000/webhooks/github"
