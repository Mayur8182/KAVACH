import base64
import hashlib
import hmac
import secrets
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import get_settings


def get_fernet_cipher() -> Fernet:
    """
    Derives a valid 32-byte urlsafe base64-encoded key from configuration.
    Uses settings.jwt_secret or a fallback salt if dedicated encryption key is not set.
    """
    settings = get_settings()
    raw_secret = getattr(settings, "encryption_key", None) or settings.jwt_secret or "antigravity-seculayer-master-key-2026"
    # Derive a deterministic 32-byte key via SHA-256
    derived_32 = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(derived_32)
    return Fernet(fernet_key)


def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypts a sensitive plaintext secret (e.g. access token, refresh token, webhook secret).
    Returns base64-encoded Fernet ciphertext.
    Never exposes raw secrets in plaintext in storage.
    """
    if not plaintext:
        return None
    cipher = get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_secret(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypts a previously encrypted secret.
    Returns decrypted plaintext string or None if ciphertext is missing or invalid.
    """
    if not ciphertext:
        return None
    try:
        cipher = get_fernet_cipher()
        decrypted_bytes = cipher.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        # Graceful fallback in case legacy unencrypted text exists
        return ciphertext


def hash_api_key(raw_key: str) -> str:
    """
    Generates a secure SHA-256 hash of the API key for at-rest storage.
    Raw keys are never persisted in the database.
    """
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key(prefix: str = "sk_live_") -> tuple[str, str, str]:
    """
    Generates a cryptographically strong random API key.
    Returns:
      (raw_key, key_prefix, key_hash)
    Example raw key: sk_live_8f3b2a9c1d0e4f5a6b7c8d9e0f1a2b3c
    The raw_key is shown to the user ONCE and never saved.
    """
    random_part = secrets.token_hex(24)
    raw_key = f"{prefix}{random_part}"
    key_prefix = f"{raw_key[:12]}...{raw_key[-4:]}"
    key_hash = hash_api_key(raw_key)
    return raw_key, key_prefix, key_hash


def generate_webhook_signature(secret: str, payload_bytes: bytes) -> str:
    """
    Generates an HMAC-SHA256 signature for outgoing webhook payload.
    Header: X-THING-Signature: sha256=<hex_digest>
    """
    signature = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={signature}"


def verify_webhook_signature(secret: str, payload_bytes: bytes, header_signature: str) -> bool:
    """
    Validates incoming or outgoing webhook HMAC-SHA256 signature with constant-time comparison.
    """
    expected = generate_webhook_signature(secret, payload_bytes)
    return hmac.compare_digest(expected, header_signature)
