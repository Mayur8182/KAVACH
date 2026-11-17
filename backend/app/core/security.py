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
) -> str:
    """Generates RFC-compliant OAuth 2.1 JWT access token with standard claims and project context."""
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
        expire = datetime.now(timezone.utc) + timedelta(hours=1)

    payload = {
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
    if project_id:
        payload["project_id"] = str(project_id)
        payload["projectId"] = str(project_id)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token_safely(token: str) -> tuple[Optional[dict], Optional[str]]:
    """
    Decodes JWT token and differentiates between expired vs invalid token.
    Returns (payload, error_type). error_type is 'expired', 'invalid', or None.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.PyJWTError:
        return None, "invalid"


def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates JWT access token signature and expiration."""
    payload, _ = decode_token_safely(token)
    return payload


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency resolving the currently authenticated user from Bearer JWT.
    Raises 401 Unauthorized if token is missing, invalid, revoked, or user does not exist.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload, err_type = decode_token_safely(auth_credentials.credentials)
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
        clean_target = str(user_uuid).replace("-", "").lower()
        stmt_all = select(User)
        res_all = await db.execute(stmt_all)
        for u in res_all.scalars().all():
            if str(u.id).replace("-", "").lower() == clean_target:
                user = u
                break

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

    # Session revocation check (Checkpoints 3 & 11)
    token_session_id = payload.get("session_id")
    if token_session_id and user.active_sessions is not None:
        # If user has an active_sessions list, session must be present and not marked revoked
        valid_session = any(
            isinstance(s, dict) and s.get("id") == token_session_id and not s.get("revoked", False)
            for s in user.active_sessions
        )
        if not valid_session:
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
    2. Cookies (seculayer_auth_token, kavach_token, access_token)
    3. Query parameter (token, access_token)
    Returns User if validly authenticated, or None if unauthenticated.
    Never silently impersonates or falls back to unintended accounts.
    """
    token_str: Optional[str] = None
    if auth_credentials and auth_credentials.credentials:
        token_str = auth_credentials.credentials
    elif request:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token_str = auth_header.replace("Bearer ", "").strip()
        elif request.cookies.get("seculayer_auth_token"):
            token_str = request.cookies.get("seculayer_auth_token")
        elif request.cookies.get("kavach_token"):
            token_str = request.cookies.get("kavach_token")
        elif request.cookies.get("access_token"):
            token_str = request.cookies.get("access_token")
        elif request.query_params.get("token"):
            token_str = request.query_params.get("token")
        elif request.query_params.get("access_token"):
            token_str = request.query_params.get("access_token")

    if token_str:
        payload, err = decode_token_safely(token_str)
        if payload and "sub" in payload and not err:
            try:
                user_id = uuid.UUID(payload["sub"])
                stmt = select(User).where(User.id == user_id, User.is_active == True)
                res = await db.execute(stmt)
                user = res.scalar_one_or_none()
                if user:
                    return user
            except Exception:
                pass
    return None


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
