import hashlib
import hmac
from typing import Optional


def verify_github_signature(
    payload_bytes: bytes,
    signature_header: Optional[str],
    secret: Optional[str],
) -> bool:
    """
    Verifies that the webhook payload was sent by GitHub by validating
    the HMAC hex digest in the X-Hub-Signature-256 header against the raw payload bytes.

    Uses constant-time comparison (hmac.compare_digest) to prevent timing attacks.
    """
    if not secret:
        # If no secret is configured, cannot verify signature
        return False

    if not signature_header:
        return False

    # GitHub sends header in format: sha256=<hex_digest>
    if not signature_header.startswith("sha256="):
        return False

    expected_digest = signature_header[7:].strip()
    if not expected_digest:
        return False

    mac = hmac.new(
        key=secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    )
    computed_digest = mac.hexdigest()

    return hmac.compare_digest(computed_digest, expected_digest)


def compute_github_signature(payload_bytes: bytes, secret: str) -> str:
    """
    Utility to compute X-Hub-Signature-256 header value for tests and webhook verification.
    Format: 'sha256=<hex_digest>'
    """
    mac = hmac.new(
        key=secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    )
    return f"sha256={mac.hexdigest()}"
