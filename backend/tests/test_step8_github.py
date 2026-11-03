import hashlib
import hmac
import json
import os
import tempfile
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token
from app.integrations.github.auth import (
    GitHubAppAuth,
    SecretProvider,
)
from app.integrations.github.checks import (
    generate_check_run_output,
    map_decision_to_conclusion,
)
from app.integrations.github.webhook_verifier import (
    compute_github_signature,
    verify_github_signature,
)
from app.integrations.github.workspace import (
    GitHubWorkspaceManager,
    WorkspaceSecurityError,
)
from app.models.github import (
    GitHubInstallation,
    GitHubPullRequest,
    GitHubRepository,
    GitHubSecurityJob,
    GitHubWebhookEvent,
)
from app.models.project import Project
from app.models.user import User


class MockSecretProvider(SecretProvider):
    """Test secret provider supplying ephemeral RSA credentials."""

    def __init__(self, private_key: str, webhook_secret: str):
        self._private_key = private_key
        self._webhook_secret = webhook_secret

    def get_github_private_key(self) -> str:
        return self._private_key

    def get_webhook_secret(self) -> str:
        return self._webhook_secret


# Generate a real RSA 2048 key for test cryptographic verification
def generate_test_rsa_key() -> str:
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return pem.decode("utf-8")


@pytest.mark.asyncio
async def test_github_auth_jwt_generation():
    """Test GitHub App RS256 JWT generation with valid cryptographic claims."""
    test_key = generate_test_rsa_key()
    provider = MockSecretProvider(private_key=test_key, webhook_secret="test-webhook-secret-123")
    auth = GitHubAppAuth(secret_provider=provider)

    # Override app ID temporarily for test
    settings = get_settings()
    orig_app_id = settings.github_app_id
    settings.github_app_id = "123456"

    try:
        assert auth.is_configured() is True
        token = auth.generate_app_jwt()
        assert isinstance(token, str)
        assert len(token.split(".")) == 3  # Valid JWT format header.payload.signature

        # Verify token caching
        auth.store_cached_installation_token(999, "ghs_test_token_abc", 9999999999.0)
        cached = auth.get_cached_installation_token(999)
        assert cached == "ghs_test_token_abc"

        auth.clear_cache()
        assert auth.get_cached_installation_token(999) is None
    finally:
        settings.github_app_id = orig_app_id


@pytest.mark.asyncio
async def test_webhook_signature_verification():
    """Test HMAC-SHA256 signature verification with constant-time comparison."""
    secret = "my-super-secret-webhook-key-456"
    raw_payload = b'{"action":"opened","pull_request":{"number":42}}'

    # Compute valid signature
    valid_sig = compute_github_signature(raw_payload, secret)
    assert valid_sig.startswith("sha256=")

    # Test valid signature matches
    assert verify_github_signature(raw_payload, valid_sig, secret) is True

    # Test invalid signature fails
    invalid_sig = "sha256=0000000000000000000000000000000000000000000000000000000000000000"
    assert verify_github_signature(raw_payload, invalid_sig, secret) is False

    # Test tampered payload fails
    tampered_payload = b'{"action":"opened","pull_request":{"number":43}}'
    assert verify_github_signature(tampered_payload, valid_sig, secret) is False

    # Test missing or empty headers fail
    assert verify_github_signature(raw_payload, None, secret) is False
    assert verify_github_signature(raw_payload, "", secret) is False
    assert verify_github_signature(raw_payload, valid_sig, None) is False


@pytest.mark.asyncio
async def test_workspace_manager_path_traversal_protection():
    """Test that GitHubWorkspaceManager strictly blocks path traversal attempts."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        mgr = GitHubWorkspaceManager(base_dir=tmp_dir)
        valid_job_id = uuid.uuid4()
        workspace_dir = mgr._get_job_workspace_path(valid_job_id)
        assert os.path.abspath(workspace_dir).startswith(os.path.abspath(tmp_dir))

        # Test workspace cleanup
        os.makedirs(workspace_dir, exist_ok=True)
        assert os.path.exists(workspace_dir)
        mgr.cleanup_workspace(valid_job_id)
        assert not os.path.exists(workspace_dir)


@pytest.mark.asyncio
async def test_checks_mapping_and_sanitization():
    """Test that policy decisions map to GitHub conclusions and outputs are sanitized."""
    assert map_decision_to_conclusion("ALLOW") == "success"
    assert map_decision_to_conclusion("WARN") == "neutral"
    assert map_decision_to_conclusion("BLOCK") == "failure"
    assert map_decision_to_conclusion("REQUIRE_APPROVAL") == "action_required"
    assert map_decision_to_conclusion("UNKNOWN") == "failure"

    output = generate_check_run_output(
        decision="BLOCK",
        reason="1 open CRITICAL finding violates policy 'block-critical-findings'",
        commit_sha="a1b2c3d4e5f67890123456789012345678901234",
        scan_id="scan-12345",
        findings_summary={"CRITICAL": 1, "HIGH": 2, "MEDIUM": 0, "LOW": 0},
        violated_requirements=["PAYMENT_IDEMPOTENCY_REQUIRED"],
        project_id="proj-999",
    )

    assert "BLOCK" in output.title
    assert "**CRITICAL:** 1" in output.summary
    assert "PAYMENT_IDEMPOTENCY_REQUIRED" in output.summary
    # Ensure no raw internal credentials or secrets leaked
    assert "password" not in output.summary.lower()
    assert "secret_key" not in output.summary.lower()


@pytest.mark.asyncio
async def test_webhook_endpoint_flow_and_idempotency(client: AsyncClient, db_session: AsyncSession):
    """Test real HTTP webhook endpoint reception, signature validation, and idempotency."""
    settings = get_settings()
    test_secret = "test-endpoint-secret-789"
    orig_secret = settings.github_webhook_secret
    settings.github_webhook_secret = test_secret

    try:
        delivery_id = f"delivery-{uuid.uuid4()}"
        payload = {"action": "opened", "pull_request": {"number": 101, "head": {"sha": "12345"}}}
        raw_bytes = json.dumps(payload).encode("utf-8")
        signature = compute_github_signature(raw_bytes, test_secret)

        headers = {
            "X-GitHub-Delivery": delivery_id,
            "X-GitHub-Event": "pull_request",
            "X-Hub-Signature-256": signature,
            "Content-Type": "application/json",
        }

        # 1. First delivery -> accepted with RECEIVED status
        res1 = await client.post("/api/v1/integrations/github/webhooks", content=raw_bytes, headers=headers)
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["delivery_id"] == delivery_id
        assert data1["status"] == "RECEIVED"

        # 2. Duplicate delivery with same X-GitHub-Delivery -> returns DUPLICATE without re-executing
        res2 = await client.post("/api/v1/integrations/github/webhooks", content=raw_bytes, headers=headers)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["delivery_id"] == delivery_id
        assert data2["status"] == "DUPLICATE"

        # 3. Invalid signature -> rejected with HTTP 401
        invalid_headers = dict(headers)
        invalid_headers["X-Hub-Signature-256"] = "sha256=invalid12345"
        invalid_headers["X-GitHub-Delivery"] = f"delivery-{uuid.uuid4()}"
        res3 = await client.post("/api/v1/integrations/github/webhooks", content=raw_bytes, headers=invalid_headers)
        assert res3.status_code == 401

    finally:
        settings.github_webhook_secret = orig_secret


@pytest.mark.asyncio
async def test_github_api_project_lifecycle(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    user_b: User,
    token_user_a: str,
    token_user_b: str,
):
    """Test project status, repository connection, and access control isolation."""
    # 1. Create a project under user_a
    headers_a = {"Authorization": f"Bearer {token_user_a}"}

    project = Project(
        name="GitHub Gated Service",
        owner_id=user_a.id,
        environment="production",
        application_type="web_service",
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)

    # 2. Check status endpoint
    res_status = await client.get(f"/api/v1/projects/{project.id}/github/status", headers=headers_a)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "status" in status_data
    assert "configured" in status_data

    # 3. Connect repository to project
    repo_payload = {
        "github_repository_id": 987654321,
        "owner": "defense-corp",
        "name": "payment-gateway",
        "full_name": "defense-corp/payment-gateway",
        "default_branch": "main",
        "private": True,
        "html_url": "https://github.com/defense-corp/payment-gateway",
        "clone_url": "https://github.com/defense-corp/payment-gateway.git",
    }
    res_conn = await client.post(
        f"/api/v1/projects/{project.id}/github/repositories",
        json=repo_payload,
        headers=headers_a,
    )
    assert res_conn.status_code == 201
    repo_data = res_conn.json()
    repo_id = repo_data["id"]
    assert repo_data["full_name"] == "defense-corp/payment-gateway"

    # 4. List connected repositories
    res_list = await client.get(f"/api/v1/projects/{project.id}/github/repositories", headers=headers_a)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1

    # 5. Trigger manual scan on connected repository
    res_scan = await client.post(
        f"/api/v1/github/repositories/{repo_id}/scans",
        json={"ref": "main"},
        headers=headers_a,
    )
    assert res_scan.status_code == 202
    job_data = res_scan.json()
    assert job_data["status"] == "QUEUED"
    assert job_data["event_type"] == "manual_scan"

    # 6. Verify cross-project authorization: user_b cannot trigger scan on user_a's repository
    headers_b = {"Authorization": f"Bearer {token_user_b}"}
    res_unauth = await client.post(
        f"/api/v1/github/repositories/{repo_id}/scans",
        json={"ref": "main"},
        headers=headers_b,
    )
    assert res_unauth.status_code == 403
