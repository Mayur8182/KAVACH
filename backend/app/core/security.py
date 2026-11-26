import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Union

import argon2
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.jwks import get_cached_public_pem, verify_jwt_with_db_jwks
from app.models.oauth import OAuthToken
from app.models.user import User

settings = get_settings()

# Initialize Argon2id password hasher
ph = argon2.PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
    hash_len=32,
    type=argon2.Type.ID,
)

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes plaintext password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plaintext password against Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:
        return False


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    session_id: Optional[str] = None,
) -> str:
    """Generates signed JWT access token with optional active session binding."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    if session_id:
        payload["session_id"] = str(session_id)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    session_id: Optional[str] = None,
) -> str:
    """Generates signed JWT refresh token with extended validity (30 days default)."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=30)

    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    if session_id:
        payload["session_id"] = str(session_id)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_oauth_access_token(
    user_id: Optional[Any] = None,
    client_id: str = "kavach_mcp_client",
    scope: Optional[str] = None,
    issuer: str = "https://kavachsecurity.me",
    audience: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    subject: Optional[Any] = None,
    scopes: Optional[Union[List[str], str]] = None,
    project_id: Optional[Union[str, uuid.UUID]] = None,
    org_id: Optional[Union[str, uuid.UUID]] = None,
    workspace_id: Optional[Union[str, uuid.UUID]] = None,
    private_key_pem: Optional[str] = None,
    kid: Optional[str] = None,
) -> str:
    """
    Generates RFC-compliant OAuth 2.1 JWT access token with standard claims,
    organization/workspace/project isolation context, and RS256 signing when keypair is supplied.
    """
    sub = str(user_id if user_id is not None else subject)
    final_scope = scope
    if final_scope is None:
        if isinstance(scopes, list):
            final_scope = " ".join(scopes)
        elif isinstance(scopes, str):
            final_scope = scopes
        else:
            final_scope = ""

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(seconds=settings.oauth_access_token_ttl_seconds)

    payload: dict[str, Any] = {
        "iss": issuer,
        "sub": sub,
        "aud": audience or f"{issuer}/mcp",
        "client_id": client_id,
        "scope": final_scope,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "token_type": "Bearer",
        "type": "access",
    }
    if org_id:
        payload["org_id"] = str(org_id)
    if workspace_id:
        payload["workspace_id"] = str(workspace_id)
    if project_id:
        payload["project_id"] = str(project_id)
        payload["projectId"] = str(project_id)

    if private_key_pem and kid:
        return jwt.encode(
            payload,
            private_key_pem,
            algorithm="RS256",
            headers={"kid": kid, "typ": "at+jwt"},
        )
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_oidc_id_token(
    user: User,
    client_id: str,
    issuer: str,
    nonce: Optional[str] = None,
    scope: str = "openid profile email",
    org_id: Optional[Union[str, uuid.UUID]] = None,
    workspace_id: Optional[Union[str, uuid.UUID]] = None,
    project_id: Optional[Union[str, uuid.UUID]] = None,
    private_key_pem: Optional[str] = None,
    kid: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates an OIDC Core 1.0 ID Token signed with RS256 (or HS256 fallback)."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(hours=1))
    scopes_set = set(scope.split())

    payload: dict[str, Any] = {
        "iss": issuer,
        "sub": str(user.id),
        "aud": client_id,
        "iat": now,
        "exp": expire,
        "auth_time": int(now.timestamp()),
    }
    if nonce:
        payload["nonce"] = nonce
    if "profile" in scopes_set or "openid" in scopes_set:
        payload["name"] = user.name
        if user.avatar_url:
            payload["picture"] = user.avatar_url
    if "email" in scopes_set:
        payload["email"] = user.email
        payload["email_verified"] = bool(user.is_verified)
    if org_id:
        payload["org_id"] = str(org_id)
    if workspace_id:
        payload["workspace_id"] = str(workspace_id)
    if project_id:
        payload["project_id"] = str(project_id)

    if private_key_pem and kid:
        return jwt.encode(
            payload,
            private_key_pem,
            algorithm="RS256",
            headers={"kid": kid, "typ": "JWT"},
        )
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token_safely(token: str) -> tuple[Optional[dict], Optional[str]]:
    """
    Decodes JWT token (supporting cached RS256 JWKS keys and HS256 platform tokens)
    and differentiates between expired vs invalid token.
    Returns (payload, error_type). error_type is 'expired', 'invalid', or None.
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", settings.jwt_algorithm)
        if alg == "RS256":
            pub_pem = get_cached_public_pem(header.get("kid"))
            if not pub_pem:
                return None, "invalid"
            payload = jwt.decode(
                token,
                pub_pem,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return payload, None
        elif alg == settings.jwt_algorithm or alg == "HS256":
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                options={"verify_aud": False},
            )
            return payload, None
        return None, "invalid"
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.PyJWTError:
        return None, "invalid"


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates JWT access token signature and expiration."""
    payload, _ = decode_token_safely(token)
    if payload and payload.get("type") == "refresh":
        return None
    return payload


async def _is_oauth_token_revoked(token_str: str, db: AsyncSession) -> bool:
    """Checks DB OAuthToken revocation state for OAuth-issued tokens."""
    token_hash = hashlib.sha256(token_str.encode()).hexdigest()
    rev_stmt = select(OAuthToken.is_revoked).where(OAuthToken.access_token_hash == token_hash)
    rev_res = (await db.execute(rev_stmt)).scalar_one_or_none()
    return rev_res is True


def _is_user_session_revoked(user: User, payload: dict) -> bool:
    token_session_id = payload.get("session_id")
    if token_session_id and user.active_sessions is not None:
        valid_session = any(
            isinstance(s, dict) and s.get("id") == token_session_id and not s.get("revoked", False)
            for s in user.active_sessions
        )
        return not valid_session
    return False


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency resolving the currently authenticated user from Bearer JWT.
    Enforces access-token type, active account status, session revocation, and OAuthToken revocation.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_str = auth_credentials.credentials
    payload, err_type = await verify_jwt_with_db_jwks(token_str, db)
    if err_type == "expired":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The access token has expired. Please refresh your token.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The access token expired"'},
        )
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The access token is invalid"'},
        )

    if payload.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh tokens cannot be used as Bearer access tokens.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="Refresh token not allowed"'},
        )

    if await _is_oauth_token_revoked(token_str, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The access token has been revoked.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token", error_description="The access token has been revoked"'},
        )

    user_id_str = payload["sub"]
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token user identity",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    if _is_user_session_revoked(user, payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or terminated. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    request: Request = None,
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    FastAPI dependency that attempts to resolve the authenticated user from:
    1. Bearer JWT in Authorization header
    2. Session cookies (seculayer_auth_token, kavach_token, access_token)
    Validates token type, OAuthToken revocation, and session revocation.
    """
    token_str: Optional[str] = None
    if auth_credentials and auth_credentials.credentials:
        token_str = auth_credentials.credentials
    elif request:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token_str = auth_header.replace("Bearer ", "").strip()
        elif request.cookies.get("seculayer_auth_token"):
            from urllib.parse import unquote
            token_str = unquote(request.cookies.get("seculayer_auth_token", ""))
        elif request.cookies.get("kavach_token"):
            from urllib.parse import unquote
            token_str = unquote(request.cookies.get("kavach_token", ""))
        elif request.cookies.get("access_token"):
            from urllib.parse import unquote
            token_str = unquote(request.cookies.get("access_token", ""))

    if token_str:
        payload, err = await verify_jwt_with_db_jwks(token_str, db)
        if payload and "sub" in payload and not err and payload.get("type") != "refresh":
            if await _is_oauth_token_revoked(token_str, db):
                return None
            try:
                user_id = uuid.UUID(payload["sub"])
                stmt = select(User).where(User.id == user_id, User.is_active == True)
                res = await db.execute(stmt)
                user = res.scalar_one_or_none()
                if user and not _is_user_session_revoked(user, payload):
                    return user
            except Exception:
                pass
    return None


async def require_superadmin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Authoritative FastAPI dependency enforcing database-backed SuperAdmin privileges."""
    if not getattr(current_user, "is_superuser", False):
        import logging
        logger = logging.getLogger("security.superadmin")
        logger.warning(
            f"SuperAdmin Access Denied: User '{current_user.email}' (ID {current_user.id}) lacks is_superuser authority."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "FOUNDER_SUPERADMIN_REQUIRED",
                "message": "Access restricted to Platform Founder SuperAdmin.",
                "user_id": str(current_user.id),
            },
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI dependency requiring server-side administrator / superuser privileges."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to perform this action.",
        )
    return current_user


async def require_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI dependency requiring verified email address."""
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified before accessing this resource.",
        )
    return current_user
