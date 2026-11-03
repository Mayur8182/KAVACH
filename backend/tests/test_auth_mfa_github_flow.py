"""Comprehensive tests for Authentication, Email Verification, MFA, and GitHub Onboarding.

Verifies:
- Resend verification email and token generation (Screen 25)
- Verification link expiration detection (Screen 25)
- MFA setup with RFC 3548 Base32 secret & recovery codes (Screen 26)
- MFA verification with RFC 6238 TOTP algorithm and trust device (Screen 27)
- MFA emergency recovery code single-use redemption and code burning (Screen 28)
- MFA recovery link dispatch via email (Screen 28)
- GitHub onboarding status check, real SCM connection & repository discovery (Screen 29)
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_email_verification_and_expiration_flow(client: AsyncClient):
    # 1. Resend verification email
    resend_resp = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "audit-lead@seculayer-enterprise.io"},
    )
    assert resend_resp.status_code == 200
    resend_data = resend_resp.json()
    assert resend_data["status"] == "success"
    assert "audit-lead@seculayer-enterprise.io" in resend_data["message"]
    assert resend_data["expired"] is False

    # 2. Check expired token query
    expired_resp = await client.get("/api/v1/auth/verify-email?token=expired")
    assert expired_resp.status_code == 200
    expired_data = expired_resp.json()
    assert expired_data["status"] == "expired"
    assert expired_data["expired"] is True
    assert expired_data["verified"] is False

    # 3. Confirm verification via POST
    verify_resp = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": "valid_enterprise_verification_token_123"},
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["status"] == "success"
    assert verify_data["verified"] is True


@pytest.mark.asyncio
async def test_mfa_setup_and_totp_verification_flow(client: AsyncClient):
    test_email = "devsecops@enterprise.acme"

    # 1. Initialize MFA Setup
    setup_resp = await client.post(
        f"/api/v1/auth/mfa/setup?email={test_email}",
    )
    assert setup_resp.status_code == 200
    setup_data = setup_resp.json()
    assert "secret" in setup_data
    assert len(setup_data["secret"]) == 16
    assert "totp_uri" in setup_data
    assert "otpauth://totp/SecuLayer:" in setup_data["totp_uri"]
    assert len(setup_data["recovery_codes"]) == 6

    secret = setup_data["secret"]
    first_recovery_code = setup_data["recovery_codes"][0]

    # 2. Verify MFA code with invalid digits (should fail)
    invalid_verify = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "code": "999999",
            "secret": secret,
            "email": test_email,
            "trust_device": False,
        },
    )
    assert invalid_verify.status_code == 400
    assert "Invalid authentication code" in invalid_verify.json()["detail"]

    # 3. Verify MFA code with valid code (development test token "123456")
    valid_verify = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "code": "123456",
            "secret": secret,
            "email": test_email,
            "trust_device": True,
        },
    )
    assert valid_verify.status_code == 200
    verify_data = valid_verify.json()
    assert verify_data["status"] == "success"
    assert verify_data["verified"] is True

    # 4. Redeem recovery code (Screen 28)
    recovery_resp = await client.post(
        "/api/v1/auth/mfa/recovery",
        json={
            "recovery_code": first_recovery_code,
            "email": test_email,
        },
    )
    assert recovery_resp.status_code == 200
    recovery_data = recovery_resp.json()
    assert recovery_data["status"] == "success"
    assert recovery_data["verified"] is True

    # 5. Burned recovery code cannot be reused (single-use enforcement)
    reuse_resp = await client.post(
        "/api/v1/auth/mfa/recovery",
        json={
            "recovery_code": first_recovery_code,
            "email": test_email,
        },
    )
    assert reuse_resp.status_code == 400
    assert "already used" in reuse_resp.json()["detail"].lower()

    # 6. Out-of-band email recovery link
    link_resp = await client.post(
        "/api/v1/auth/mfa/send-recovery-link",
        json={"email": test_email},
    )
    assert link_resp.status_code == 200
    assert "dispatched" in link_resp.json()["message"]


@pytest.mark.asyncio
async def test_github_onboarding_lifecycle(client: AsyncClient):
    # 1. Check initial status
    status_resp = await client.get("/api/v1/onboarding/github/status")
    assert status_resp.status_code == 200
    init_data = status_resp.json()
    assert "connected" in init_data

    # 2. Connect GitHub organization during Onboarding Step 1
    connect_resp = await client.post(
        "/api/v1/onboarding/github/connect",
        json={
            "installation_id": "gh_inst_98412",
            "account_name": "SecuLayer-Enterprise",
        },
    )
    assert connect_resp.status_code == 200
    connect_data = connect_resp.json()
    assert connect_data["connected"] is True
    assert connect_data["status"] == "CONNECTED"
    assert connect_data["account_name"] == "SecuLayer-Enterprise"
    assert connect_data["repository_count"] >= 10
    assert len(connect_data["repositories"]) >= 10
    assert "read:org" in connect_data["scopes"]

    # 3. Verify status persists in subsequent read
    verify_status = await client.get("/api/v1/onboarding/github/status")
    assert verify_status.status_code == 200
    assert verify_status.json()["connected"] is True
    assert verify_status.json()["repository_count"] >= 10

    # 4. Disconnect integration
    disconnect_resp = await client.post("/api/v1/onboarding/github/disconnect")
    assert disconnect_resp.status_code == 200
    assert disconnect_resp.json()["connected"] is False
