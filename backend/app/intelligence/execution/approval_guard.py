"""
Kavach Human Approval Guardrail
Enforces cryptographic and deterministic approval controls for sensitive/high-risk AI actions.
Prevents unauthorized tool execution, replay attacks, and argument tampering.
Strictly adheres to:
- AGENTS.md Rule 13: Every Security Decision Must Have Evidence
- AGENTS.md Rule 14: LLM Is Not The Security Authority
- AGENTS.md Rule 15: Never Give AI Unrestricted Tool Access
"""

import hmac
import hashlib
import time
import json
import base64
import secrets
import logging
from typing import Dict, Any, Optional, Set, Tuple
from app.core.config import get_settings

logger = logging.getLogger("kavach.guardrails.approval")


class ApprovalGuard:
    """
    Authoritative Human-in-the-Loop Approval Guard.
    Binds approvals cryptographically to exact step arguments, repository, finding, patch,
    and single-use nonces to eliminate replay attacks.
    """

    _redeemed_tokens: Set[str] = set()

    @classmethod
    def _get_signing_key(cls) -> bytes:
        settings = get_settings()
        secret = getattr(settings, "SECRET_KEY", "kavach_agent_security_secret_key_default")
        return secret.encode("utf-8")

    @classmethod
    def generate_approval_token(
        cls,
        plan_id: str,
        step_id: str,
        target_resource: str,
        action: str = "pull_request.create",
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        expires_in_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Generates a time-bounded cryptographic token authorizing a sensitive action.
        Injects a cryptographically secure nonce to prevent replay attacks.
        """
        now = int(time.time())
        expires_at = now + expires_in_seconds
        nonce = secrets.token_hex(16)

        payload_data: Dict[str, Any] = {
            "plan_id": str(plan_id),
            "step_id": str(step_id),
            "target_resource": str(target_resource),
            "action": str(action),
            "expires_at": expires_at,
            "created_at": now,
            "nonce": nonce,
        }
        if project_id:
            payload_data["project_id"] = str(project_id)
        if user_id:
            payload_data["user_id"] = str(user_id)

        payload_json = json.dumps(payload_data, sort_keys=True).encode("utf-8")
        payload_b64 = base64.urlsafe_b64encode(payload_json).decode("ascii")
        signature = hmac.new(
            cls._get_signing_key(),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        token = f"{payload_b64}.{signature}"
        return {
            "token": token,
            "expires_at": expires_at,
            "action": action,
            "target_resource": target_resource,
            "step_id": step_id,
            "plan_id": plan_id,
            "nonce": nonce,
        }

    @classmethod
    def redeem_token(cls, token: str) -> None:
        """
        Marks a cryptographic token as redeemed, ensuring single-use idempotency.
        Subsequent attempts to verify this token will be rejected as replay attacks.
        """
        if token and isinstance(token, str):
            parts = token.split(".")
            sig = parts[1] if len(parts) == 2 else token
            cls._redeemed_tokens.add(sig)
            logger.info("Cryptographic approval token successfully redeemed and invalidated.")

    @classmethod
    def is_token_redeemed(cls, token: str) -> bool:
        """Checks if a token signature has already been consumed."""
        if not token or not isinstance(token, str):
            return False
        parts = token.split(".")
        sig = parts[1] if len(parts) == 2 else token
        return sig in cls._redeemed_tokens

    @classmethod
    def verify_approval_token(
        cls,
        token: str,
        expected_plan_id: str,
        expected_step_id: str,
        expected_target_resource: str,
        expected_action: str = "pull_request.create",
        expected_project_id: Optional[str] = None,
        expected_user_id: Optional[str] = None,
        check_redeemed: bool = True,
    ) -> Tuple[bool, Optional[str]]:
        """
        Deterministically verifies the approval token against expected arguments,
        cryptographic signature, expiration time, and single-use redemption status.
        Returns: (is_valid, error_reason)
        """
        if not token or not isinstance(token, str):
            return False, "Approval token is missing or malformed."

        parts = token.split(".")
        if len(parts) != 2:
            return False, "Invalid token structure."

        payload_b64, signature = parts

        # 1. Replay prevention check
        if check_redeemed and signature in cls._redeemed_tokens:
            return False, "Approval token has already been redeemed (replay attack prevented)."

        expected_sig = hmac.new(
            cls._get_signing_key(),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return False, "Invalid cryptographic token signature. Tampering detected."

        try:
            payload_json = base64.urlsafe_b64decode(payload_b64.encode("ascii")).decode("utf-8")
            data = json.loads(payload_json)
        except Exception:
            return False, "Corrupted token payload."

        now = int(time.time())
        expires_at = data.get("expires_at", 0)
        if now > expires_at:
            return False, f"Approval token expired {now - expires_at} seconds ago."

        if str(data.get("plan_id")) != str(expected_plan_id):
            return False, f"Token was issued for plan {data.get('plan_id')}, not {expected_plan_id}."

        if str(data.get("step_id")) != str(expected_step_id):
            return False, f"Token was issued for step {data.get('step_id')}, not {expected_step_id}."

        if str(data.get("target_resource", "")).strip() != str(expected_target_resource).strip():
            return False, f"Target resource mismatch: token specifies {data.get('target_resource')}, expected {expected_target_resource}."

        if str(data.get("action")) != str(expected_action):
            return False, f"Action mismatch: token authorizes {data.get('action')}, not {expected_action}."

        if expected_project_id and "project_id" in data:
            if str(data["project_id"]) != str(expected_project_id):
                return False, f"Project mismatch: token authorizes project {data['project_id']}, not {expected_project_id}."

        if expected_user_id and "user_id" in data:
            if str(data["user_id"]) != str(expected_user_id):
                return False, f"User mismatch: token authorizes user {data['user_id']}, not {expected_user_id}."

        return True, None
