import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, parse_qs, urlparse

from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_oauth_access_token,
    decode_token_safely,
    verify_password,
)
from app.models.oauth import OAuthAuthorizationCode, OAuthClient, OAuthToken
from app.models.user import User
from app.services.audit_service import AuditService

logger = logging.getLogger("kavach.oauth")
settings = get_settings()

router = APIRouter(tags=["OAuth 2.1 & Discovery"])

SUPPORTED_SCOPES = [
    "projects:read",
    "scans:read",
    "scans:run",
    "findings:read",
    "remediation:propose",
]

SCOPE_DESCRIPTIONS = {
    "projects:read": "View and list your verified security projects and architecture",
    "scans:read": "View vulnerability scan results, security reports, and history",
    "scans:run": "Trigger automated security scans (SAST, SCA, Secrets, IaC)",
    "findings:read": "Inspect security vulnerabilities, attack surface, and active incidents",
    "remediation:propose": "Generate automated security fixes and remediation patches",
}


def get_base_url(request: Request) -> str:
    """Deterministically extracts public base URL respecting reverse proxy headers."""
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def verify_pkce(code_verifier: str, code_challenge: str, method: str = "S256") -> bool:
    """Verifies PKCE code_verifier against code_challenge using SHA256 (RFC 7636)."""
    if method != "S256":
        return False
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    computed_challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    clean_target = code_challenge.rstrip("=")
    return hmac.compare_digest(computed_challenge, clean_target)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware in UTC, handling naive datetimes from SQLite."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# ── Metadata Discovery Endpoints (RFC 9207 & RFC 8414) ──

@router.get("/.well-known/oauth-protected-resource")
async def oauth_protected_resource_metadata(request: Request):
    """
    OAuth 2.0 Protected Resource Metadata (RFC 9207 / MCP Authorization Specification).
    Enables ChatGPT, Claude, and MCP clients to discover resource boundaries and authorization servers.
    """
    base = get_base_url(request)
    return {
        "resource": f"{base}/mcp",
        "authorization_servers": [base],
        "scopes_supported": SUPPORTED_SCOPES,
        "bearer_methods_supported": ["header"],
        "resource_documentation": f"{base}/docs",
    }


@router.get("/.well-known/oauth-authorization-server")
@router.get("/.well-known/openid-configuration")
async def oauth_authorization_server_metadata(request: Request):
    """
    OAuth 2.0 Authorization Server Metadata (RFC 8414).
    Advertises endpoints, grant types, PKCE requirements, and supported scopes.
    """
    base = get_base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/oauth/register",
        "revocation_endpoint": f"{base}/oauth/revoke",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none", "client_secret_post", "client_secret_basic"],
        "scopes_supported": SUPPORTED_SCOPES,
        "service_documentation": f"{base}/docs",
        "ui_locales_supported": ["en"],
    }


# ── Dynamic Client Registration (RFC 7591) ──

class ClientRegistrationRequest(BaseModel):
    client_name: Optional[str] = "MCP Client"
    redirect_uris: List[str]
    grant_types: Optional[List[str]] = Field(default_factory=lambda: ["authorization_code", "refresh_token"])
    response_types: Optional[List[str]] = Field(default_factory=lambda: ["code"])
    scope: Optional[str] = " ".join(SUPPORTED_SCOPES)
    token_endpoint_auth_method: Optional[str] = "none"
    client_uri: Optional[str] = None
    logo_uri: Optional[str] = None


@router.post("/oauth/register", status_code=status.HTTP_201_CREATED)
async def oauth_register_client(
    payload: ClientRegistrationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamic Client Registration (RFC 7591).
    Allows ChatGPT, Claude, and tools to dynamically register OAuth clients with PKCE support.
    """
    if not payload.redirect_uris:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one redirect_uri is required.",
        )

    for uri in payload.redirect_uris:
        parsed = urlparse(uri)
        if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid redirect_uri '{uri}'. HTTPS is strictly required for production callbacks.",
            )

    client_id = f"kavach_{secrets.token_urlsafe(16)}"
    client_secret = None
    secret_hash = None

    is_confidential = payload.token_endpoint_auth_method in {"client_secret_post", "client_secret_basic"}
    if is_confidential:
        client_secret = secrets.token_urlsafe(32)
        secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()

    client = OAuthClient(
        client_id=client_id,
        client_secret_hash=secret_hash,
        client_name=payload.client_name or "MCP Client",
        client_uri=payload.client_uri,
        logo_uri=payload.logo_uri,
        redirect_uris=payload.redirect_uris,
        grant_types=payload.grant_types or ["authorization_code", "refresh_token"],
        response_types=payload.response_types or ["code"],
        scope=payload.scope or " ".join(SUPPORTED_SCOPES),
        token_endpoint_auth_method=payload.token_endpoint_auth_method or "none",
        is_confidential=is_confidential,
        is_active=True,
    )
    db.add(client)
    await db.commit()

    audit = AuditService(db)
    await audit.log_event(
        action="OAUTH_CLIENT_REGISTERED",
        resource_type="oauth_client",
        actor_type="system",
        actor_id=client_id,
        resource_id=client_id,
        status="SUCCESS",
        metadata={
            "client_name": client.client_name,
            "redirect_uris": client.redirect_uris,
            "token_endpoint_auth_method": client.token_endpoint_auth_method,
        },
    )
    await db.commit()

    res = {
        "client_id": client.client_id,
        "client_name": client.client_name,
        "client_id_issued_at": int(time.time()),
        "redirect_uris": client.redirect_uris,
        "grant_types": client.grant_types,
        "response_types": client.response_types,
        "scope": client.scope,
        "token_endpoint_auth_method": client.token_endpoint_auth_method,
    }
    if client_secret:
        res["client_secret"] = client_secret
        res["client_secret_expires_at"] = 0  # Does not expire
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=res)


# ── OAuth 2.1 Authorization Endpoint (/oauth/authorize) ──

def _render_authorization_page(
    client_name: str,
    requested_scopes: List[str],
    client_id: str,
    redirect_uri: str,
    state: Optional[str],
    code_challenge: str,
    code_challenge_method: str,
    error_message: Optional[str] = None,
    user_email: Optional[str] = None,
) -> HTMLResponse:
    """Renders production Kavach-branded Dark Mode OAuth Authorization & Consent Screen."""
    error_html = ""
    if error_message:
        error_html = f"""
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 20px;">
            ⚠️ {error_message}
        </div>
        """

    scope_items_html = ""
    for sc in requested_scopes:
        desc = SCOPE_DESCRIPTIONS.get(sc, sc)
        scope_items_html += f"""
        <li style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="color: #10b981; font-size: 16px;">✓</span>
            <div>
                <strong style="color: #f3f4f6; font-size: 14px;">{sc}</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 2px 0 0 0;">{desc}</p>
            </div>
        </li>
        """

    logged_in_banner = ""
    if user_email:
        logged_in_banner = f"""
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 18px;">
            Signed in as <strong>{user_email}</strong>
        </div>
        """

    login_fields_html = ""
    if not user_email:
        login_fields_html = """
        <div style="margin-bottom: 14px;">
            <label style="display: block; color: #d1d5db; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Email address</label>
            <input type="email" name="email" required placeholder="you@company.com" style="width: 100%; box-sizing: border-box; background: #111827; border: 1px solid #374151; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; color: #d1d5db; font-size: 13px; font-weight: 500; margin-bottom: 6px;">Password</label>
            <input type="password" name="password" required placeholder="••••••••••••" style="width: 100%; box-sizing: border-box; background: #111827; border: 1px solid #374151; color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 14px;">
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize Kavach Security MCP</title>
    <style>
        body {{
            background-color: #030712;
            color: #f9fafb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }}
        .card {{
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            width: 100%;
            max-width: 460px;
            padding: 32px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        }}
        .btn-primary {{
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 18px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.15s ease;
        }}
        .btn-primary:hover {{
            background: #1d4ed8;
        }}
        .btn-secondary {{
            background: transparent;
            color: #9ca3af;
            border: 1px solid #374151;
            padding: 10px 18px;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
        }}
        .btn-secondary:hover {{
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; background: rgba(37, 99, 235, 0.15); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 12px; margin-bottom: 12px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 6px 0; color: #fff;">Connect to Kavach Security</h2>
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                <strong style="color: #f3f4f6;">{client_name}</strong> requests access to your security workspace.
            </p>
        </div>

        {error_html}
        {logged_in_banner}

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 12px 0;">Permissions requested:</h4>
            <ul style="list-style: none; padding: 0; margin: 0;">
                {scope_items_html}
            </ul>
        </div>

        <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id" value="{client_id}">
            <input type="hidden" name="redirect_uri" value="{redirect_uri}">
            <input type="hidden" name="state" value="{state or ''}">
            <input type="hidden" name="code_challenge" value="{code_challenge}">
            <input type="hidden" name="code_challenge_method" value="{code_challenge_method}">
            <input type="hidden" name="scope" value="{' '.join(requested_scopes)}">

            {login_fields_html}

            <button type="submit" name="action" value="allow" class="btn-primary">
                Authorize & Connect MCP
            </button>
            <button type="submit" name="action" value="deny" class="btn-secondary">
                Cancel
            </button>
        </form>

        <p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 20px; line-height: 1.4;">
            By connecting, you authorize {client_name} to execute MCP tools against your authorized Kavach security projects. You can revoke this connection at any time.
        </p>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html)


async def _resolve_oauth_client(client_id: str, db: AsyncSession) -> Optional[OAuthClient]:
    """Resolves client by client_id, supporting standard registered clients or static connectors."""
    stmt = select(OAuthClient).where(OAuthClient.client_id == client_id, OAuthClient.is_active == True)
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()
    if client:
        return client

    # Support well-known client aliases (e.g. ChatGPT, Claude, Cursor)
    if client_id in {"chatgpt-mcp-connector", "claude-desktop", "cursor-mcp", "chatgpt"}:
        client = OAuthClient(
            client_id=client_id,
            client_name="ChatGPT / AI Assistant Connector",
            redirect_uris=[
                "https://chat.openai.com/aip/plugin-oauth/callback",
                "https://chatgpt.com/api/mcp/callback",
                "https://claude.ai/api/mcp/callback",
                "http://localhost:3000/callback",
            ],
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            scope=" ".join(SUPPORTED_SCOPES),
            token_endpoint_auth_method="none",
            is_confidential=False,
            is_active=True,
        )
        db.add(client)
        await db.commit()
        return client

    return None


@router.get("/oauth/authorize")
async def oauth_authorize_get(
    request: Request,
    response_type: str,
    client_id: str,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str = "S256",
    scope: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.1 Authorization Endpoint (GET).
    Validates client and PKCE, and displays the login / consent screen.
    """
    if response_type != "code":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported response_type. Only 'code' (Authorization Code Grant) is permitted in OAuth 2.1.",
        )

    if code_challenge_method != "S256":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth 2.1 strictly requires code_challenge_method='S256'.",
        )

    if not code_challenge or len(code_challenge) < 43:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code_challenge parameter.",
        )

    client = await _resolve_oauth_client(client_id, db)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown or inactive OAuth client_id: '{client_id}'.",
        )

    # Validate redirect_uri matches client's registered redirect_uris
    matched_uri = False
    for r in client.redirect_uris:
        if r.rstrip("/") == redirect_uri.rstrip("/"):
            matched_uri = True
            break
    if not matched_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Redirect URI '{redirect_uri}' is not registered for client '{client_id}'.",
        )

    requested_scopes = [s for s in (scope or client.scope).split() if s in SUPPORTED_SCOPES]
    if not requested_scopes:
        requested_scopes = SUPPORTED_SCOPES

    # Check if caller has existing user session via Bearer or Cookie
    auth_header = request.headers.get("Authorization")
    user_email = None
    if auth_header and auth_header.startswith("Bearer "):
        token_payload, err = decode_token_safely(auth_header.replace("Bearer ", "").strip())
        if token_payload and "sub" in token_payload and not err:
            try:
                u_stmt = select(User.email).where(User.id == uuid.UUID(token_payload["sub"]))
                user_email = (await db.execute(u_stmt)).scalar_one_or_none()
            except Exception:
                pass

    return _render_authorization_page(
        client_name=client.client_name,
        requested_scopes=requested_scopes,
        client_id=client_id,
        redirect_uri=redirect_uri,
        state=state,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        user_email=user_email,
    )


@router.post("/oauth/authorize")
async def oauth_authorize_post(
    request: Request,
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    code_challenge: str = Form(...),
    code_challenge_method: str = Form("S256"),
    scope: str = Form(""),
    state: Optional[str] = Form(None),
    action: str = Form(...),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.1 Authorization Endpoint (POST).
    Authenticates user, verifies consent, generates single-use authorization code, and redirects.
    """
    client = await _resolve_oauth_client(client_id, db)
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown OAuth client.")

    if action == "deny":
        error_params = {"error": "access_denied", "error_description": "User denied the authorization request."}
        if state:
            error_params["state"] = state
        sep = "&" if "?" in redirect_uri else "?"
        return RedirectResponse(url=f"{redirect_uri}{sep}{urlencode(error_params)}", status_code=status.HTTP_302_FOUND)

    # Resolve user
    user: Optional[User] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token_payload, err = decode_token_safely(auth_header.replace("Bearer ", "").strip())
        if token_payload and "sub" in token_payload and not err:
            try:
                user = await db.get(User, uuid.UUID(token_payload["sub"]))
            except Exception:
                pass

    # If not authenticated via header, authenticate with submitted email & password
    if not user:
        if not email or not password:
            requested_scopes = [s for s in scope.split() if s in SUPPORTED_SCOPES] or SUPPORTED_SCOPES
            return _render_authorization_page(
                client_name=client.client_name,
                requested_scopes=requested_scopes,
                client_id=client_id,
                redirect_uri=redirect_uri,
                state=state,
                code_challenge=code_challenge,
                code_challenge_method=code_challenge_method,
                error_message="Email and password are required to authorize.",
            )

        stmt = select(User).where(User.email == email.strip().lower())
        res = await db.execute(stmt)
        candidate = res.scalar_one_or_none()
        if not candidate or not verify_password(password, candidate.password_hash):
            requested_scopes = [s for s in scope.split() if s in SUPPORTED_SCOPES] or SUPPORTED_SCOPES
            return _render_authorization_page(
                client_name=client.client_name,
                requested_scopes=requested_scopes,
                client_id=client_id,
                redirect_uri=redirect_uri,
                state=state,
                code_challenge=code_challenge,
                code_challenge_method=code_challenge_method,
                error_message="Invalid email or password. Please try again.",
            )
        user = candidate

    # Generate single-use authorization code (10-minute expiry)
    auth_code = secrets.token_urlsafe(32)
    record = OAuthAuthorizationCode(
        code=auth_code,
        client_id=client_id,
        user_id=user.id,
        redirect_uri=redirect_uri,
        scope=scope or client.scope,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(record)
    await db.commit()

    audit = AuditService(db)
    await audit.log_event(
        action="OAUTH_AUTHORIZE_SUCCESS",
        resource_type="oauth_authorization_code",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=record.code[:10] + "...",
        status="SUCCESS",
        metadata={
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": record.scope,
        },
    )
    await db.commit()

    callback_params = {"code": auth_code}
    if state:
        callback_params["state"] = state
    sep = "&" if "?" in redirect_uri else "?"
    redirect_target = f"{redirect_uri}{sep}{urlencode(callback_params)}"
    return RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)


# ── OAuth 2.1 Token Endpoint (/oauth/token) ──

@router.post("/oauth/token")
async def oauth_token_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.1 Token Endpoint (RFC 6749 & RFC 7636 PKCE).
    Handles authorization_code grant and refresh_token grant.
    Accepts both JSON and application/x-www-form-urlencoded formats.
    """
    content_type = request.headers.get("content-type", "")
    params: Dict[str, Any] = {}
    if "application/json" in content_type:
        params = await request.json()
    else:
        form_data = await request.form()
        params = dict(form_data)

    grant_type = params.get("grant_type")
    client_id = params.get("client_id")
    code = params.get("code")
    redirect_uri = params.get("redirect_uri")
    code_verifier = params.get("code_verifier")
    refresh_token_param = params.get("refresh_token")

    base_url = get_base_url(request)

    # 1. Authorization Code Grant with PKCE
    if grant_type == "authorization_code":
        if not code or not code_verifier:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_request", "error_description": "Missing 'code' or 'code_verifier'."},
            )

        stmt = select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code == code)
        res = await db.execute(stmt)
        code_record = res.scalar_one_or_none()

        if not code_record or code_record.is_used:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Authorization code is invalid or already consumed."},
            )

        if code_record.expires_at and ensure_utc(code_record.expires_at) < datetime.now(timezone.utc):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Authorization code has expired."},
            )

        if redirect_uri and code_record.redirect_uri.rstrip("/") != redirect_uri.rstrip("/"):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Redirect URI mismatch."},
            )

        if client_id and code_record.client_id != client_id:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_client", "error_description": "Client ID mismatch."},
            )

        # PKCE S256 Challenge Verification
        if not verify_pkce(code_verifier, code_record.code_challenge, code_record.code_challenge_method):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "PKCE code_verifier challenge verification failed."},
            )

        # Mark code as consumed immediately (single-use)
        code_record.is_used = True
        await db.commit()

        # Issue access token (1 hour) & refresh token (30 days)
        access_token = create_oauth_access_token(
            user_id=code_record.user_id,
            client_id=code_record.client_id,
            scope=code_record.scope,
            issuer=base_url,
            audience=f"{base_url}/mcp",
            expires_delta=timedelta(hours=1),
        )
        new_refresh_token = secrets.token_urlsafe(48)

        access_hash = hashlib.sha256(access_token.encode()).hexdigest()
        refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()

        token_record = OAuthToken(
            access_token_hash=access_hash,
            refresh_token_hash=refresh_hash,
            client_id=code_record.client_id,
            user_id=code_record.user_id,
            scope=code_record.scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            refresh_token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(token_record)
        await db.commit()

        audit = AuditService(db)
        await audit.log_event(
            action="OAUTH_TOKEN_ISSUED",
            resource_type="oauth_token",
            actor_type="user",
            actor_id=str(code_record.user_id),
            resource_id=str(token_record.id),
            status="SUCCESS",
            metadata={"client_id": code_record.client_id, "scope": code_record.scope},
        )
        await db.commit()

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": new_refresh_token,
            "scope": code_record.scope,
        }

    # 2. Refresh Token Grant with Secure Rotation
    elif grant_type == "refresh_token":
        if not refresh_token_param:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_request", "error_description": "Missing 'refresh_token' parameter."},
            )

        rt_hash = hashlib.sha256(refresh_token_param.encode()).hexdigest()
        stmt = select(OAuthToken).where(
            OAuthToken.refresh_token_hash == rt_hash,
            OAuthToken.is_revoked == False,
        )
        res = await db.execute(stmt)
        old_token = res.scalar_one_or_none()

        if not old_token:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token is invalid or has been revoked."},
            )

        if old_token.refresh_token_expires_at and ensure_utc(old_token.refresh_token_expires_at) < datetime.now(timezone.utc):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token has expired. Please re-authenticate."},
            )

        # Invalidate old refresh token (Strict Token Rotation)
        old_token.is_revoked = True

        new_access_token = create_oauth_access_token(
            user_id=old_token.user_id,
            client_id=old_token.client_id,
            scope=old_token.scope,
            issuer=base_url,
            audience=f"{base_url}/mcp",
            expires_delta=timedelta(hours=1),
        )
        new_refresh_token = secrets.token_urlsafe(48)

        new_access_hash = hashlib.sha256(new_access_token.encode()).hexdigest()
        new_refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()

        new_token_record = OAuthToken(
            access_token_hash=new_access_hash,
            refresh_token_hash=new_refresh_hash,
            client_id=old_token.client_id,
            user_id=old_token.user_id,
            scope=old_token.scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            refresh_token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(new_token_record)
        await db.commit()

        audit = AuditService(db)
        await audit.log_event(
            action="OAUTH_TOKEN_ROTATED",
            resource_type="oauth_token",
            actor_type="user",
            actor_id=str(old_token.user_id),
            resource_id=str(new_token_record.id),
            status="SUCCESS",
            metadata={"client_id": old_token.client_id},
        )
        await db.commit()

        return {
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": new_refresh_token,
            "scope": new_token_record.scope,
        }

    else:
        return JSONResponse(
            status_code=400,
            content={
                "error": "unsupported_grant_type",
                "error_description": f"Grant type '{grant_type}' is not supported. Use 'authorization_code' or 'refresh_token'.",
            },
        )


# ── OAuth 2.1 Token Revocation (RFC 7009) ──

@router.post("/oauth/revoke")
async def oauth_revoke_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.0 Token Revocation (RFC 7009).
    Revokes issued access or refresh tokens. Returns HTTP 200 OK per spec.
    """
    content_type = request.headers.get("content-type", "")
    params: Dict[str, Any] = {}
    if "application/json" in content_type:
        params = await request.json()
    else:
        form_data = await request.form()
        params = dict(form_data)

    token = params.get("token")
    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        stmt = (
            update(OAuthToken)
            .where(
                (OAuthToken.access_token_hash == token_hash)
                | (OAuthToken.refresh_token_hash == token_hash)
            )
            .values(is_revoked=True)
        )
        await db.execute(stmt)
        await db.commit()

    return Response(status_code=200)
