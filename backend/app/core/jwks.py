"""
OAuth 2.1 & OIDC Asymmetric RSA Signing Key & JWKS Manager.

Provides:
- Persistent RSA-2048 keypair management (from env or PostgreSQL/SQLite `oauth_signing_keys`)
- RFC 7517 public JWK Set (`/.well-known/jwks.json`)
- RS256 JWT signing for OAuth access tokens & OIDC id_tokens
- Safe verification for both RS256 OAuth tokens and HS256 platform session tokens
- External OIDC JWKS verification (e.g., Sign in with ChatGPT / OpenAI)
"""

from __future__ import annotations

import asyncio
import base64
import logging
import secrets
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings

logger = logging.getLogger("kavach.jwks")

_KEY_LOCK = asyncio.Lock()
_CACHED_KEYS: Dict[str, Dict[str, Any]] = {}  # kid -> {private_pem, public_pem, jwk}
_ACTIVE_KID: Optional[str] = None
_EXTERNAL_JWKS_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}


def _int_to_base64url(val: int) -> str:
    byte_len = max(1, (val.bit_length() + 7) // 8)
    raw = val.to_bytes(byte_len, byteorder="big")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _pem_to_jwk(public_pem: str, kid: str, alg: str = "RS256") -> Dict[str, Any]:
    pub = serialization.load_pem_public_key(public_pem.encode("utf-8"))
    numbers = pub.public_numbers()  # type: ignore[union-attr]
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": alg,
        "kid": kid,
        "n": _int_to_base64url(numbers.n),
        "e": _int_to_base64url(numbers.e),
    }


def _generate_rsa_keypair() -> Tuple[str, str, str]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    kid = f"kavach-rsa-{secrets.token_hex(8)}"
    return kid, private_pem, public_pem


def _load_env_keypair() -> Optional[Tuple[str, str, str]]:
    settings = get_settings()
    priv_raw = settings.oauth_rsa_private_key
    if not priv_raw:
        return None
    priv_pem = priv_raw.replace("\\n", "\n").strip()
    priv_obj = serialization.load_pem_private_key(priv_pem.encode("utf-8"), password=None)
    if settings.oauth_rsa_public_key:
        pub_pem = settings.oauth_rsa_public_key.replace("\\n", "\n").strip()
    else:
        pub_pem = priv_obj.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")
    kid = settings.oauth_rsa_key_id or "kavach-rsa-env-1"
    return kid, priv_pem, pub_pem


async def ensure_signing_keys_loaded(db: AsyncSession) -> Tuple[str, str, str]:
    """
    Ensures at least one active RSA signing keypair is loaded into memory and persisted.
    Returns (kid, private_pem, public_pem).
    """
    global _ACTIVE_KID

    env_kp = _load_env_keypair()
    if env_kp:
        kid, priv_pem, pub_pem = env_kp
        _CACHED_KEYS[kid] = {
            "kid": kid,
            "private_pem": priv_pem,
            "public_pem": pub_pem,
            "jwk": _pem_to_jwk(pub_pem, kid),
        }
        _ACTIVE_KID = kid
        return kid, priv_pem, pub_pem

    if _ACTIVE_KID and _ACTIVE_KID in _CACHED_KEYS:
        entry = _CACHED_KEYS[_ACTIVE_KID]
        return entry["kid"], entry["private_pem"], entry["public_pem"]

    async with _KEY_LOCK:
        if _ACTIVE_KID and _ACTIVE_KID in _CACHED_KEYS:
            entry = _CACHED_KEYS[_ACTIVE_KID]
            return entry["kid"], entry["private_pem"], entry["public_pem"]

        from app.models.oauth import OAuthSigningKey

        res = await db.execute(
            select(OAuthSigningKey).order_by(OAuthSigningKey.created_at.desc())
        )
        rows = list(res.scalars().all())
        for row in rows:
            try:
                jwk = _pem_to_jwk(row.public_key_pem, row.kid, row.algorithm)
                _CACHED_KEYS[row.kid] = {
                    "kid": row.kid,
                    "private_pem": row.private_key_pem,
                    "public_pem": row.public_key_pem,
                    "jwk": jwk,
                }
                if row.is_active and not _ACTIVE_KID:
                    _ACTIVE_KID = row.kid
            except Exception as exc:
                logger.warning(f"Skipping invalid stored OAuth signing key {row.kid}: {exc}")

        if _ACTIVE_KID and _ACTIVE_KID in _CACHED_KEYS:
            entry = _CACHED_KEYS[_ACTIVE_KID]
            return entry["kid"], entry["private_pem"], entry["public_pem"]

        kid, priv_pem, pub_pem = _generate_rsa_keypair()
        key_rec = OAuthSigningKey(
            kid=kid,
            algorithm="RS256",
            private_key_pem=priv_pem,
            public_key_pem=pub_pem,
            is_active=True,
        )
        db.add(key_rec)
        await db.commit()

        _CACHED_KEYS[kid] = {
            "kid": kid,
            "private_pem": priv_pem,
            "public_pem": pub_pem,
            "jwk": _pem_to_jwk(pub_pem, kid),
        }
        _ACTIVE_KID = kid
        return kid, priv_pem, pub_pem


async def get_public_jwks(db: AsyncSession) -> Dict[str, Any]:
    """Returns the RFC 7517 JWK Set containing all active/valid public verification keys."""
    await ensure_signing_keys_loaded(db)
    return {
        "keys": [entry["jwk"] for entry in _CACHED_KEYS.values()],
    }


def get_cached_public_pem(kid: Optional[str] = None) -> Optional[str]:
    """Synchronously fetches a cached public PEM by kid (or active key)."""
    if kid and kid in _CACHED_KEYS:
        return _CACHED_KEYS[kid]["public_pem"]
    if _ACTIVE_KID and _ACTIVE_KID in _CACHED_KEYS:
        return _CACHED_KEYS[_ACTIVE_KID]["public_pem"]
    return None


async def verify_jwt_with_db_jwks(token: str, db: AsyncSession) -> Tuple[Optional[dict], Optional[str]]:
    """
    Decodes an RS256 or HS256 token, ensuring RS256 keys are loaded from DB if not yet cached.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        return None, "invalid"

    alg = header.get("alg", "")
    if alg == "RS256":
        await ensure_signing_keys_loaded(db)
        kid = header.get("kid")
        pub_pem = get_cached_public_pem(kid)
        if not pub_pem:
            return None, "invalid"
        try:
            payload = jwt.decode(
                token,
                pub_pem,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload, None
        except jwt.ExpiredSignatureError:
            return None, "expired"
        except jwt.PyJWTError:
            return None, "invalid"
    elif alg == "HS256":
        settings = get_settings()
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return payload, None
        except jwt.ExpiredSignatureError:
            return None, "expired"
        except jwt.PyJWTError:
            return None, "invalid"
    return None, "invalid"


async def _select_remote_jwk(
    jwks_uri: str,
    kid: Optional[str],
    inline_jwks: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Resolves matching JWK from inline JWKS or cached remote JWKS (refreshes once on kid miss)."""
    if inline_jwks and isinstance(inline_jwks.get("keys"), list):
        inline_keys = inline_jwks["keys"]
        for k in inline_keys:
            if (kid and k.get("kid") == kid) or (not kid):
                return k, None

    if not jwks_uri:
        return None, "Client does not declare a valid jwks_uri or inline jwks"

    now = time.time()
    cached = _EXTERNAL_JWKS_CACHE.get(jwks_uri)
    keys: List[Dict[str, Any]] = []
    if cached and now - cached[0] < 300:
        keys = cached[1]
    else:
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
                resp = await client.get(
                    jwks_uri,
                    headers={"Accept": "application/json", "User-Agent": "Kavach-MCP-OAuth/1.0"},
                )
                if resp.status_code != 200:
                    return None, f"Failed to fetch external JWKS (HTTP {resp.status_code})"
                jwks_body = resp.json()
                keys = jwks_body.get("keys", [])
                if keys:
                    _EXTERNAL_JWKS_CACHE[jwks_uri] = (now, keys)
        except Exception as exc:
            return None, f"Failed to fetch external JWKS: {exc}"

    matching_jwk = None
    for k in keys:
        if kid and k.get("kid") == kid:
            matching_jwk = k
            break
    if not matching_jwk and keys and not kid:
        matching_jwk = keys[0]

    if not matching_jwk:
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
                resp = await client.get(
                    jwks_uri,
                    headers={"Accept": "application/json", "User-Agent": "Kavach-MCP-OAuth/1.0"},
                )
                if resp.status_code == 200:
                    keys = resp.json().get("keys", [])
                    _EXTERNAL_JWKS_CACHE[jwks_uri] = (now, keys)
                    for k in keys:
                        if kid and k.get("kid") == kid:
                            matching_jwk = k
                            break
        except Exception:
            pass

    if not matching_jwk:
        return None, f"No matching signing key (kid={kid}) found in JWKS"
    return matching_jwk, None


async def verify_external_oidc_id_token(
    id_token: str,
    jwks_uri: str,
    expected_issuer: str,
    expected_audience: str,
    expected_nonce: Optional[str] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Cryptographically verifies an external OIDC ID Token (e.g. OpenAI SIWC) against its remote JWKS.
    Validates RS256/ES256 signature, issuer, audience, expiration, and nonce.
    """
    try:
        header = jwt.get_unverified_header(id_token)
    except jwt.PyJWTError as exc:
        return None, f"Malformed ID token header: {exc}"

    alg = header.get("alg")
    kid = header.get("kid")
    if alg not in {"RS256", "RS384", "RS512", "ES256"}:
        return None, f"Unsupported ID token signing algorithm: {alg}"

    matching_jwk, err = await _select_remote_jwk(jwks_uri, kid)
    if not matching_jwk:
        return None, err

    try:
        signing_key = jwt.PyJWK.from_dict(matching_jwk).key
        claims = jwt.decode(
            id_token,
            signing_key,
            algorithms=[alg],
            audience=expected_audience,
            issuer=expected_issuer,
            options={"require": ["exp", "iss", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        return None, "External ID token has expired"
    except jwt.PyJWTError as exc:
        return None, f"External ID token verification failed: {exc}"

    if expected_nonce is not None and claims.get("nonce") != expected_nonce:
        return None, "External ID token nonce mismatch"

    return claims, None


async def verify_client_assertion_jwt(
    assertion: str,
    *,
    client_id: str,
    valid_audiences: List[str],
    jwks_uri: Optional[str] = None,
    inline_jwks: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Verifies an RFC 7523 `private_key_jwt` client_assertion against the client's JWKS.
    Checks signature, iss == client_id, sub == client_id, exp, and audience match.
    """
    try:
        header = jwt.get_unverified_header(assertion)
    except jwt.PyJWTError as exc:
        return None, f"Malformed client_assertion header: {exc}"

    alg = header.get("alg")
    kid = header.get("kid")
    if alg not in {"RS256", "RS384", "RS512", "ES256"}:
        return None, f"Unsupported client_assertion signing algorithm: {alg}"

    matching_jwk, err = await _select_remote_jwk(jwks_uri or "", kid, inline_jwks=inline_jwks)
    if not matching_jwk:
        return None, err

    try:
        signing_key = jwt.PyJWK.from_dict(matching_jwk).key
        claims = jwt.decode(
            assertion,
            signing_key,
            algorithms=[alg],
            options={"verify_aud": False, "require": ["exp", "iss", "sub"]},
            leeway=60,
        )
    except jwt.ExpiredSignatureError:
        return None, "Client assertion JWT has expired"
    except jwt.PyJWTError as exc:
        return None, f"Client assertion signature verification failed: {exc}"

    if claims.get("iss") != client_id or claims.get("sub") != client_id:
        return None, "Client assertion 'iss' and 'sub' must match client_id"

    raw_aud = claims.get("aud")
    aud_values = [raw_aud] if isinstance(raw_aud, str) else ([str(a) for a in raw_aud] if isinstance(raw_aud, list) else [])
    normalized_valid = {a.rstrip("/").lower() for a in valid_audiences if a}
    if not any(a.rstrip("/").lower() in normalized_valid for a in aud_values):
        return None, "Client assertion 'aud' does not match this authorization server or token endpoint"

    return claims, None

