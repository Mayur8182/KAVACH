"""
Cryptographic Secrets Vault Helper for Kavach MCP Gateway.
Encrypts API keys, PATs, and downstream MCP credentials at rest via Fernet (AES-128-CBC + HMAC-SHA256).
"""

from __future__ import annotations

import base64
import hashlib
from typing import Tuple

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _get_fernet() -> Fernet:
    secret = (get_settings().jwt_secret or "kavach-dev-vault-key").encode("utf-8")
    digest = hashlib.sha256(b"kavach-mcp-vault-v1:" + secret).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_vault_secret(plaintext: str) -> Tuple[str, str, str]:
    """
    Encrypts a secret string for database persistence.
    Returns (encrypted_ciphertext, masked_preview, sha256_fingerprint).
    """
    raw = (plaintext or "").strip()
    token = _get_fernet().encrypt(raw.encode("utf-8")).decode("utf-8")
    fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    if len(raw) >= 10:
        masked = f"{raw[:4]}...{raw[-4:]}"
    elif len(raw) >= 4:
        masked = f"{raw[:2]}***"
    else:
        masked = "***"
    return token, masked, fingerprint


def decrypt_vault_secret(ciphertext: str) -> str:
    """Decrypts an encrypted secret for authorized upstream server dispatch only."""
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Vault secret integrity verification failed.") from exc

