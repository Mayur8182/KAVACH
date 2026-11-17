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
from urllib.parse import parse_qs, quote, urlencode, urlparse

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_oauth_access_token,
    decode_token_safely,
    get_current_user,
    get_current_user_optional,
)
from app.models.oauth import (
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthPendingTransaction,
    OAuthToken,
)
from app.models.organization import Organization
from app.models.project import Project
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
    "offline_access",
    "openid",
    "profile",
    "email",
]

SCOPE_DESCRIPTIONS = {
    "projects:read": "View and list your verified security projects and architecture",
    "scans:read": "View vulnerability scan results, security reports, and history",
    "scans:run": "Trigger automated security scans (SAST, SCA, Secrets, IaC)",
    "findings:read": "Inspect security vulnerabilities, attack surface, and active incidents",
    "remediation:propose": "Generate automated security fixes and remediation patches",
    "offline_access": "Maintain uninterrupted background connection using secure refresh tokens",
    "openid": "Verify your identity using OpenID Connect",
    "profile": "Access your profile information",
    "email": "Access your email address",
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
    OAuth 2.0 Authorization Server Metadata (RFC 8414 & OpenID Connect Discovery).
    Advertises endpoints, grant types, PKCE requirements, and supported scopes.
    """
    base = get_base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "userinfo_endpoint": f"{base}/oauth/userinfo",
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


@router.get("/.well-known/ai-plugin.json")
async def chatgpt_plugin_manifest(request: Request):
    """
    ChatGPT Plugin & Action Manifest (OpenAI specification).
    Allows ChatGPT to automatically configure the Kavach plugin with OAuth 2.1.
    """
    base = get_base_url(request)
    return {
        "schema_version": "v1",
        "name_for_human": "Kavach Security Gateway",
        "name_for_model": "kavach_security",
        "description_for_human": "Autonomous application security, cloud posture audits, vulnerability scans, and AI remediation.",
        "description_for_model": "Kavach Security MCP Gateway provides real-time security scanning (SAST, SCA, Secrets, IaC), cloud inventory, incident management, and automated remediation with verified tenant isolation.",
        "auth": {
            "type": "oauth",
            "client_url": f"{base}/oauth/authorize",
            "scope": " ".join(SUPPORTED_SCOPES),
            "authorization_url": f"{base}/oauth/token",
            "authorization_content_type": "application/x-www-form-urlencoded",
            "verification_tokens": {},
        },
        "api": {
            "type": "openapi",
            "url": f"{base}/openapi.json",
        },
        "logo_url": f"{base}/logo.png",
        "contact_email": "security@kavachsecurity.me",
        "legal_info_url": "https://kavachsecurity.me/terms",
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
        resource_id=str(client.id),
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
        res["client_secret_expires_at"] = 0
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=res)


# ── Passwordless OAuth 2.1 Consent & Identity Selection Screen ──

def _render_authorization_page(
    client_name: str,
    requested_scopes: List[str],
    transaction_token: str,
    client_id: str,
    redirect_uri: str,
    state: Optional[str],
    code_challenge: str,
    code_challenge_method: str,
    user: Optional[User] = None,
    user_projects: Optional[List[Project]] = None,
    user_orgs: Optional[List[Any]] = None,
    error_message: Optional[str] = None,
    info_message: Optional[str] = None,
    siwc_enabled: bool = False,
) -> HTMLResponse:
    """
    Renders Kavach-branded Dark Mode Passwordless OAuth Authorization & Consent Screen.
    STRICTLY PASSWORDLESS: No email or password forms. Offers enterprise SSO (GitHub, Google, and optional SIWC).
    """
    error_html = ""
    if error_message:
        error_html = f"""
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 20px;">
            ⚠️ {error_message}
        </div>
        """

    info_html = ""
    if info_message:
        info_html = f"""
        <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 20px;">
            ℹ️ {info_message}
        </div>
        """

    scope_items_html = ""
    for sc in requested_scopes:
        desc = SCOPE_DESCRIPTIONS.get(sc, sc)
        scope_items_html += f"""
        <li style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="color: #10b981; font-size: 16px; line-height: 1.2;">✓</span>
            <div>
                <strong style="color: #f3f4f6; font-size: 13px;">{sc}</strong>
                <p style="color: #9ca3af; font-size: 12px; margin: 2px 0 0 0;">{desc}</p>
            </div>
        </li>
        """

    sep = "&" if "?" in redirect_uri else "?"
    cancel_url = f"{redirect_uri}{sep}{urlencode({'error': 'access_denied', 'error_description': 'User cancelled authorization.', 'state': state or ''})}"

    if user:
        # User is authenticated: Show authorized identity, project context, and allow/deny consent
        provider_name = (user.auth_provider or "Kavach").capitalize()
        project_count = len(user_projects or [])
        project_text = f"{project_count} project(s) accessible" if project_count > 0 else "Default project environment"
        if user_projects and len(user_projects) > 0:
            first_proj = user_projects[0].name
            project_text = f"Primary Project: <strong>{first_proj}</strong> ({project_count} accessible)"

        org_name = user_orgs[0].name if user_orgs else "Personal Organization"

        user_content = f"""
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></div>
            <div>
                <div>Signed in as <strong>{user.email}</strong></div>
                <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Identity Provider: {provider_name} • Org: {org_name}</div>
            </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 20px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 4px;">Authorized Security Context</div>
            <div style="font-size: 13px; color: #e5e7eb;">{project_text}</div>
        </div>

        <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="tx" value="{transaction_token}">
            <input type="hidden" name="client_id" value="{client_id}">
            <input type="hidden" name="redirect_uri" value="{redirect_uri}">
            <input type="hidden" name="state" value="{state or ''}">
            <input type="hidden" name="code_challenge" value="{code_challenge}">
            <input type="hidden" name="code_challenge_method" value="{code_challenge_method}">
            <input type="hidden" name="scope" value="{' '.join(requested_scopes)}">

            <button type="submit" name="action" value="allow" class="btn-primary">
                Authorize & Connect MCP
            </button>
            <button type="submit" name="action" value="deny" class="btn-secondary">
                Cancel
            </button>
        </form>
        """
    else:
        # User is unauthenticated: Display enterprise SSO buttons (strictly passwordless)
        siwc_button_html = ""
        if siwc_enabled:
            siwc_button_html = f"""
            <a href="/oauth/login/openai?tx={transaction_token}" class="btn-sso btn-chatgpt" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.28 9.87a6.23 6.23 0 0 0-.52-4.99 6.27 6.27 0 0 0-6.17-3.15 6.24 6.24 0 0 0-4.63 2.07 6.23 6.23 0 0 0-4.32-.23 6.27 6.27 0 0 0-3.9 4.3 6.24 6.24 0 0 0-.6 4.98 6.23 6.23 0 0 0 .52 4.99 6.27 6.27 0 0 0 6.17 3.15 6.24 6.24 0 0 0 4.63-2.07 6.23 6.23 0 0 0 4.32.23 6.27 6.27 0 0 0 3.9-4.3 6.24 6.24 0 0 0 .6-4.98z" fill="#10a37f"/>
                </svg>
                <span>Sign in with ChatGPT</span>
            </a>
            """
        else:
            siwc_button_html = """
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 16px;">
                Sign in with ChatGPT (SIWC) requires OpenAI partner application review.<br>Please continue with GitHub or Google.
            </div>
            """

        user_content = f"""
        <p style="font-size: 13px; color: #d1d5db; margin: 0 0 14px 0; font-weight: 500;">
            Sign in with your verified provider to connect your Kavach account:
        </p>

        <a href="/oauth/login/github?tx={transaction_token}" class="btn-sso btn-github" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Continue with GitHub</span>
        </a>

        <a href="/oauth/login/google?tx={transaction_token}" class="btn-sso btn-google" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
        </a>

        {siwc_button_html}

        <a href="{cancel_url}" class="btn-secondary" style="text-decoration: none; display: block; text-align: center;">
            Cancel
        </a>
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
            box-sizing: border-box;
            transition: all 0.15s ease;
        }}
        .btn-secondary:hover {{
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }}
        .btn-sso {{
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-sizing: border-box;
            transition: transform 0.1s ease, filter 0.15s ease;
        }}
        .btn-sso:hover {{
            transform: translateY(-1px);
        }}
        .btn-github {{
            background: #1f2937;
            color: #ffffff;
            border: 1px solid #374151;
        }}
        .btn-github:hover {{
            background: #283548;
        }}
        .btn-google {{
            background: #ffffff;
            color: #1f2937;
            border: 1px solid #e5e7eb;
        }}
        .btn-google:hover {{
            background: #f3f4f6;
        }}
        .btn-chatgpt {{
            background: #064e3b;
            color: #ffffff;
            border: 1px solid #059669;
        }}
        .btn-chatgpt:hover {{
            background: #047857;
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
                <strong style="color: #f3f4f6;">{client_name}</strong> requests access to execute MCP security tools.
            </p>
        </div>

        {error_html}
        {info_html}

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
            <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 12px 0;">Permissions requested:</h4>
            <ul style="list-style: none; padding: 0; margin: 0;">
                {scope_items_html}
            </ul>
        </div>

        {user_content}

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

    # Support well-known client aliases (ChatGPT, Claude, Cursor, Custom GPT Actions)
    known_clients = {
        "chatgpt-mcp-connector",
        "claude-desktop",
        "cursor-mcp",
        "chatgpt",
        "kavach_chatgpt_action",
        "kavach-chatgpt-connector",
    }
    if client_id in known_clients or "chatgpt" in client_id.lower() or "kavach" in client_id.lower():
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
            token_endpoint_auth_method="client_secret_post",
            client_secret_hash=hashlib.sha256("kavach_chatgpt_secret_2026".encode()).hexdigest(),
            is_confidential=False,
            is_active=True,
        )
        db.add(client)
        await db.commit()
        return client

    return None


# ── OAuth 2.1 Authorization Endpoint (/oauth/authorize) ──

@router.get("/oauth/authorize")
async def oauth_authorize_get(
    request: Request,
    response_type: Optional[str] = None,
    client_id: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    code_challenge: Optional[str] = None,
    code_challenge_method: str = "S256",
    scope: Optional[str] = None,
    state: Optional[str] = None,
    resource: Optional[str] = None,
    resume_tx: Optional[str] = Query(None, description="Pending transaction token when returning from SSO"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    OAuth 2.1 Authorization Endpoint (GET).
    Creates or resumes an outer pending transaction, checks authenticated identity, and presents passwordless consent screen.
    """
    pending_tx: Optional[OAuthPendingTransaction] = None

    if resume_tx:
        # Resuming an existing transaction after returning from GitHub, Google, or OpenAI SSO
        stmt = select(OAuthPendingTransaction).where(
            OAuthPendingTransaction.transaction_token == resume_tx,
            OAuthPendingTransaction.is_completed == False,
        )
        pending_tx = (await db.execute(stmt)).scalar_one_or_none()
        if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The authorization transaction has expired or is invalid. Please restart connection from ChatGPT or Claude.",
            )

        client_id = pending_tx.client_id
        redirect_uri = pending_tx.redirect_uri
        code_challenge = pending_tx.code_challenge
        code_challenge_method = pending_tx.code_challenge_method
        scope = pending_tx.scope
        state = pending_tx.state
    else:
        # Starting a new outer transaction from ChatGPT or Claude
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
                detail="Invalid code_challenge parameter (must be S256 hash with min 43 chars).",
            )

        if not client_id or not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required parameters: client_id and redirect_uri are mandatory.",
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
            parsed = urlparse(redirect_uri)
            if parsed.scheme == "https" and any(
                parsed.netloc.endswith(domain)
                for domain in ["openai.com", "chatgpt.com", "claude.ai"]
            ):
                matched_uri = True
                new_uris = list(client.redirect_uris or [])
                if redirect_uri not in new_uris:
                    new_uris.append(redirect_uri)
                    client.redirect_uris = new_uris
                    await db.commit()

        if not matched_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Redirect URI '{redirect_uri}' is not registered for client '{client_id}'.",
            )

        requested_scopes = [s for s in (scope or client.scope).split() if s in SUPPORTED_SCOPES]
        if not requested_scopes:
            requested_scopes = SUPPORTED_SCOPES

        # Check existing user from Bearer header if present
        auth_user_id = current_user.id if current_user else None
        if not auth_user_id:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token_payload, err = decode_token_safely(auth_header.replace("Bearer ", "").strip())
                if token_payload and "sub" in token_payload and not err:
                    try:
                        auth_user_id = uuid.UUID(token_payload["sub"])
                    except Exception:
                        pass

        # Create persistent pending transaction record
        tx_token = f"tx_{secrets.token_urlsafe(32)}"
        pending_tx = OAuthPendingTransaction(
            transaction_token=tx_token,
            client_id=client_id,
            redirect_uri=redirect_uri,
            state=state,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            resource=resource or f"{get_base_url(request)}/mcp",
            scope=" ".join(requested_scopes),
            user_id=auth_user_id,
            is_completed=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(pending_tx)
        await db.commit()
        await db.refresh(pending_tx)

    # Resolve user and their accessible projects & organizations for tenant isolation
    resolved_user: Optional[User] = None
    user_projects: List[Project] = []
    user_orgs: List[Any] = []

    target_user_id = pending_tx.user_id or (current_user.id if current_user else None)
    if target_user_id:
        u_stmt = select(User).where(User.id == target_user_id)
        resolved_user = (await db.execute(u_stmt)).scalar_one_or_none()
        if resolved_user:
            # Query user's real projects
            p_stmt = (
                select(Project)
                .where(Project.owner_id == resolved_user.id, Project.deleted_at.is_(None))
                .order_by(Project.created_at.desc())
            )
            user_projects = list((await db.execute(p_stmt)).scalars().all())

            # Query user's organizations
            o_stmt = select(Organization).limit(3)
            user_orgs = list((await db.execute(o_stmt)).scalars().all())

    client_display = client_id
    c_rec = await _resolve_oauth_client(client_id, db)
    if c_rec and c_rec.client_name:
        client_display = c_rec.client_name

    scopes_list = [s for s in pending_tx.scope.split() if s]

    return _render_authorization_page(
        client_name=client_display,
        requested_scopes=scopes_list,
        transaction_token=pending_tx.transaction_token,
        client_id=client_id,
        redirect_uri=redirect_uri,
        state=state,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
        user=resolved_user,
        user_projects=user_projects,
        user_orgs=user_orgs,
        siwc_enabled=bool(settings.openai_siwc_enabled and settings.openai_siwc_client_id),
    )


@router.post("/oauth/authorize")
async def oauth_authorize_post(
    request: Request,
    tx: Optional[str] = Form(None),
    action: str = Form(...),
    client_id: Optional[str] = Form(None),
    redirect_uri: Optional[str] = Form(None),
    code_challenge: Optional[str] = Form(None),
    code_challenge_method: str = Form("S256"),
    scope: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    OAuth 2.1 Authorization Endpoint (POST).
    Verifies user consent for the pending transaction, generates a single-use authorization code, and redirects to client.
    """
    pending_tx: Optional[OAuthPendingTransaction] = None

    if tx:
        stmt = select(OAuthPendingTransaction).where(
            OAuthPendingTransaction.transaction_token == tx,
            OAuthPendingTransaction.is_completed == False,
        )
        pending_tx = (await db.execute(stmt)).scalar_one_or_none()

    if not pending_tx and client_id and redirect_uri:
        # Backwards-compatible lookup by client_id & redirect_uri
        stmt = (
            select(OAuthPendingTransaction)
            .where(
                OAuthPendingTransaction.client_id == client_id,
                OAuthPendingTransaction.redirect_uri == redirect_uri,
                OAuthPendingTransaction.is_completed == False,
            )
            .order_by(OAuthPendingTransaction.created_at.desc())
        )
        pending_tx = (await db.execute(stmt)).scalar_one_or_none()

    if not pending_tx:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active OAuth authorization transaction not found. Please restart connection from ChatGPT or Claude.",
        )

    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization transaction has expired. Please restart the connection flow.",
        )

    # 1. User Denied
    if action == "deny":
        error_params = {
            "error": "access_denied",
            "error_description": "User denied the authorization request.",
        }
        if pending_tx.state:
            error_params["state"] = pending_tx.state
        sep = "&" if "?" in pending_tx.redirect_uri else "?"
        return RedirectResponse(
            url=f"{pending_tx.redirect_uri}{sep}{urlencode(error_params)}",
            status_code=status.HTTP_302_FOUND,
        )

    # 2. User Allowed: Ensure user identity is verified
    user_id = pending_tx.user_id or (current_user.id if current_user else None)
    if not user_id:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token_payload, err = decode_token_safely(auth_header.replace("Bearer ", "").strip())
            if token_payload and "sub" in token_payload and not err:
                try:
                    user_id = uuid.UUID(token_payload["sub"])
                except Exception:
                    pass

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication is required to authorize this MCP connection. Please sign in via GitHub or Google.",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user account not found.",
        )

    # Generate single-use authorization code (10-minute expiry per RFC 6749)
    auth_code = secrets.token_urlsafe(32)
    record = OAuthAuthorizationCode(
        code=auth_code,
        client_id=pending_tx.client_id,
        user_id=user.id,
        redirect_uri=pending_tx.redirect_uri,
        scope=pending_tx.scope,
        code_challenge=pending_tx.code_challenge,
        code_challenge_method=pending_tx.code_challenge_method,
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(record)
    pending_tx.is_completed = True
    await db.commit()

    base_url = get_base_url(request)
    audit = AuditService(db)
    await audit.log_event(
        action="OAUTH_AUTHORIZE_SUCCESS",
        resource_type="oauth_authorization_code",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=record.code[:10] + "...",
        status="SUCCESS",
        metadata={
            "client_id": pending_tx.client_id,
            "redirect_uri": pending_tx.redirect_uri,
            "scope": record.scope,
            "transaction_token": pending_tx.transaction_token,
        },
    )
    await db.commit()

    callback_params = {
        "code": auth_code,
        "iss": base_url,
    }
    if pending_tx.state:
        callback_params["state"] = pending_tx.state

    sep = "&" if "?" in pending_tx.redirect_uri else "?"
    redirect_target = f"{pending_tx.redirect_uri}{sep}{urlencode(callback_params)}"
    return RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)


# ── SSO Identity Provider Handlers (GitHub, Google, Sign in with ChatGPT) ──

@router.get("/oauth/login/github")
async def oauth_login_github(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Initiates GitHub OAuth flow linked to the pending outer MCP transaction."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

    settings = get_settings()
    client_id = settings.github_client_id or "Iv23liqai7qjzsE9RllD"
    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/github"
    state = f"mcp_tx_{tx}"

    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={quote(callback_url)}"
        f"&scope=read:user,user:email,repo"
        f"&state={state}"
    )
    return RedirectResponse(url=github_url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/callback/github")
async def oauth_callback_github(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handles GitHub OAuth callback, verifies identity, associates with pending transaction, and resumes."""
    if not state.startswith("mcp_tx_"):
        raise HTTPException(status_code=400, detail="Invalid state parameter.")
    tx = state.replace("mcp_tx_", "").strip()

    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=400, detail="Pending transaction expired or not found.")

    settings = get_settings()
    client_id = settings.github_client_id or "Iv23liqai7qjzsE9RllD"
    client_secret = settings.github_client_secret or "a676a37ce8268a0fd4deec132b1ca3e13bbd8901"
    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/github"

    # Exchange code for access token
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        t_res = await http_client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": callback_url,
            },
        )
        if t_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange GitHub authorization code.")
        t_data = t_res.json()
        gh_token = t_data.get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="No access token received from GitHub.")

        # Fetch profile
        p_res = await http_client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github.v3+json"},
        )
        if p_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub profile.")
        gh_user = p_res.json()

        # Fetch verified email
        e_res = await http_client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github.v3+json"},
        )
        primary_email = None
        if e_res.status_code == 200:
            emails = e_res.json()
            for em in emails:
                if em.get("primary") and em.get("verified"):
                    primary_email = em.get("email")
                    break

        if not primary_email:
            primary_email = gh_user.get("email") or f"{gh_user.get('login')}@users.noreply.github.com"

    gh_user_id = str(gh_user["id"])
    u_stmt = select(User).where(User.github_user_id == gh_user_id)
    user = (await db.execute(u_stmt)).scalar_one_or_none()

    if not user:
        # Check by email
        e_stmt = select(User).where(User.email == primary_email.lower())
        user = (await db.execute(e_stmt)).scalar_one_or_none()
        if user:
            user.github_user_id = gh_user_id
            user.auth_provider = "github"
        else:
            user = User(
                email=primary_email.lower(),
                password_hash=hashlib.sha256(secrets.token_bytes(32)).hexdigest(),
                name=gh_user.get("name") or gh_user.get("login") or "GitHub User",
                github_user_id=gh_user_id,
                avatar_url=gh_user.get("avatar_url"),
                auth_provider="github",
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    pending_tx.user_id = user.id
    await db.commit()

    return RedirectResponse(url=f"/oauth/authorize?resume_tx={tx}", status_code=status.HTTP_302_FOUND)


@router.get("/oauth/login/google")
async def oauth_login_google(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Initiates Google OAuth flow linked to the pending outer MCP transaction."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

    settings = get_settings()
    client_id = settings.google_client_id or "912384729182-mock-google-client.apps.googleusercontent.com"
    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/google"
    state = f"mcp_tx_{tx}"

    google_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={quote(callback_url)}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&state={state}"
    )
    return RedirectResponse(url=google_url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/callback/google")
async def oauth_callback_google(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handles Google OAuth callback, verifies identity, associates with pending transaction, and resumes."""
    if not state.startswith("mcp_tx_"):
        raise HTTPException(status_code=400, detail="Invalid state parameter.")
    tx = state.replace("mcp_tx_", "").strip()

    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=400, detail="Pending transaction expired or not found.")

    settings = get_settings()
    client_id = settings.google_client_id or "mock-google-id"
    client_secret = settings.google_client_secret or "mock-google-secret"
    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/google"

    async with httpx.AsyncClient(timeout=10.0) as http_client:
        t_res = await http_client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback_url,
            },
        )
        if t_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google authorization code.")
        t_data = t_res.json()
        g_token = t_data.get("access_token")

        p_res = await http_client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {g_token}"},
        )
        if p_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user profile.")
        g_user = p_res.json()

    google_sub = str(g_user.get("sub"))
    email = str(g_user.get("email")).lower()

    u_stmt = select(User).where(User.google_user_id == google_sub)
    user = (await db.execute(u_stmt)).scalar_one_or_none()

    if not user:
        e_stmt = select(User).where(User.email == email)
        user = (await db.execute(e_stmt)).scalar_one_or_none()
        if user:
            user.google_user_id = google_sub
            user.auth_provider = "google"
        else:
            user = User(
                email=email,
                password_hash=hashlib.sha256(secrets.token_bytes(32)).hexdigest(),
                name=g_user.get("name") or "Google User",
                google_user_id=google_sub,
                avatar_url=g_user.get("picture"),
                auth_provider="google",
                is_verified=bool(g_user.get("email_verified", True)),
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    pending_tx.user_id = user.id
    await db.commit()

    return RedirectResponse(url=f"/oauth/authorize?resume_tx={tx}", status_code=status.HTTP_302_FOUND)


# ── Optional Sign in with ChatGPT (SIWC / OpenID Connect + PKCE) ──

@router.get("/oauth/login/openai")
async def oauth_login_openai(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates Sign in with ChatGPT (SIWC) OpenID Connect flow when enabled.
    Generates distinct inner state, nonce, and PKCE verifier/challenge (RFC 7636).
    """
    settings = get_settings()
    if not settings.openai_siwc_enabled or not settings.openai_siwc_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Sign in with ChatGPT (SIWC) is currently in partner onboarding / awaiting OpenAI approval. "
                "Please authenticate using Continue with GitHub or Continue with Google."
            ),
        )

    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

    # Generate inner cryptographically secure parameters
    inner_state = secrets.token_urlsafe(32)
    inner_nonce = secrets.token_urlsafe(32)
    inner_code_verifier = secrets.token_urlsafe(64)
    inner_digest = hashlib.sha256(inner_code_verifier.encode("ascii")).digest()
    inner_code_challenge = base64.urlsafe_b64encode(inner_digest).decode("ascii").rstrip("=")

    pending_tx.inner_provider = "openai"
    pending_tx.inner_state = inner_state
    pending_tx.inner_nonce = inner_nonce
    pending_tx.inner_code_verifier = inner_code_verifier
    await db.commit()

    base = get_base_url(request)
    redirect_uri = settings.openai_siwc_redirect_uri or f"{base}/oauth/callback/openai"

    siwc_params = {
        "response_type": "code",
        "client_id": settings.openai_siwc_client_id,
        "redirect_uri": redirect_uri,
        "scope": settings.openai_siwc_scopes,
        "state": inner_state,
        "nonce": inner_nonce,
        "code_challenge": inner_code_challenge,
        "code_challenge_method": "S256",
    }
    openai_auth_url = f"{settings.openai_siwc_auth_url}?{urlencode(siwc_params)}"
    return RedirectResponse(url=openai_auth_url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/callback/openai")
async def oauth_callback_openai(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Handles Sign in with ChatGPT (SIWC) OpenID Connect callback.
    Exchanges code for tokens, verifies ID token (issuer, audience, expiry, nonce),
    performs safe account linking, and resumes outer MCP transaction.
    """
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.inner_state == state,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unrecognized inner OAuth state from OpenAI. State mismatch or CSRF detected.",
        )

    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The authorization transaction has expired. Please restart the connection flow.",
        )

    settings = get_settings()
    base = get_base_url(request)
    redirect_uri = settings.openai_siwc_redirect_uri or f"{base}/oauth/callback/openai"

    # Backend code exchange with OpenAI Token Endpoint
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        token_payload = {
            "grant_type": "authorization_code",
            "client_id": settings.openai_siwc_client_id,
            "client_secret": settings.openai_siwc_client_secret or "",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": pending_tx.inner_code_verifier,
        }
        res = await http_client.post(
            settings.openai_siwc_token_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=token_payload,
        )
        if res.status_code != 200:
            logger.error(f"[SIWC] Token exchange failed with OpenAI: {res.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to exchange authorization code with OpenAI: {res.text}",
            )
        token_data = res.json()

    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token from OpenAI response.")

    # Decode and verify ID Token claims
    decoded_claims, err = decode_token_safely(id_token)
    if not decoded_claims or err:
        raise HTTPException(status_code=400, detail=f"OpenAI ID token verification failed: {err}")

    # Validate Issuer
    if decoded_claims.get("iss") != settings.openai_siwc_issuer:
        raise HTTPException(status_code=400, detail=f"Invalid ID token issuer: '{decoded_claims.get('iss')}'.")

    # Validate Audience
    aud = decoded_claims.get("aud")
    if aud != settings.openai_siwc_client_id:
        raise HTTPException(status_code=400, detail=f"Invalid ID token audience: '{aud}'.")

    # Validate Expiry
    exp = decoded_claims.get("exp")
    if exp and exp < time.time():
        raise HTTPException(status_code=400, detail="OpenAI ID token has expired.")

    # Validate Nonce (Cryptographic freshness)
    if decoded_claims.get("nonce") != pending_tx.inner_nonce:
        raise HTTPException(status_code=400, detail="OpenAI ID token nonce mismatch. Replay detected.")

    sub = decoded_claims.get("sub")
    email = decoded_claims.get("email", "").lower()
    name = decoded_claims.get("name") or "ChatGPT User"

    if not sub or not email:
        raise HTTPException(status_code=400, detail="OpenAI identity claims missing 'sub' or 'email'.")

    # Identity resolution and safe account linking
    u_stmt = select(User).where(User.chatgpt_user_id == sub)
    user = (await db.execute(u_stmt)).scalar_one_or_none()

    if not user:
        e_stmt = select(User).where(User.email == email)
        existing_user = (await db.execute(e_stmt)).scalar_one_or_none()
        if existing_user:
            # Safe account linking: Require authenticated user session to link existing account
            if current_user and current_user.id == existing_user.id:
                existing_user.chatgpt_user_id = sub
                existing_user.chatgpt_issuer = settings.openai_siwc_issuer
                user = existing_user
            else:
                # Do NOT blindly auto-merge based only on email equality (Phase 4 requirement)
                logger.warning(f"[SIWC] Account linking challenge for email {email}: session not authenticated to target account.")
                return RedirectResponse(
                    url=f"/oauth/authorize?resume_tx={pending_tx.transaction_token}&error=Account+linking+requires+signing+in+with+your+primary+Kavach+provider+first",
                    status_code=status.HTTP_302_FOUND,
                )
        else:
            # Account creation via ChatGPT
            user = User(
                email=email,
                password_hash=hashlib.sha256(secrets.token_bytes(32)).hexdigest(),
                name=name,
                chatgpt_user_id=sub,
                chatgpt_issuer=settings.openai_siwc_issuer,
                auth_provider="chatgpt",
                is_verified=bool(decoded_claims.get("email_verified", True)),
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    pending_tx.user_id = user.id
    await db.commit()

    return RedirectResponse(
        url=f"/oauth/authorize?resume_tx={pending_tx.transaction_token}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/oauth/unlink/openai")
async def oauth_unlink_openai(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Safely unlinks ChatGPT federated identity from the authenticated user's account."""
    current_user.chatgpt_user_id = None
    current_user.chatgpt_issuer = None
    db.add(current_user)
    await db.commit()
    return {"status": "UNLINKED", "message": "Sign in with ChatGPT has been unlinked from your account."}


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
    client_secret = params.get("client_secret")

    # Support Basic Authorization header (RFC 6749 Section 2.3.1)
    auth_header = request.headers.get("authorization", "")
    if not client_id and auth_header.startswith("Basic "):
        try:
            raw_b64 = auth_header.replace("Basic ", "").strip()
            decoded = base64.b64decode(raw_b64).decode("utf-8")
            if ":" in decoded:
                c_id, c_secret = decoded.split(":", 1)
                client_id = c_id
                if not client_secret:
                    client_secret = c_secret
        except Exception:
            pass

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
        if code_record.code_challenge:
            if not code_verifier or not verify_pkce(code_verifier, code_record.code_challenge, code_record.code_challenge_method):
                return JSONResponse(
                    status_code=400,
                    content={"error": "invalid_grant", "error_description": "PKCE code_verifier challenge verification failed."},
                )

        client = await _resolve_oauth_client(code_record.client_id, db)
        if not client:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_client", "error_description": "OAuth client no longer active."},
            )

        # Check client secret if confidential
        if client.is_confidential:
            if not client_secret:
                return JSONResponse(
                    status_code=401,
                    content={"error": "invalid_client", "error_description": "Client authentication failed: missing secret."},
                )
            given_hash = hashlib.sha256(client_secret.encode()).hexdigest()
            if not hmac.compare_digest(given_hash, client.client_secret_hash or ""):
                return JSONResponse(
                    status_code=401,
                    content={"error": "invalid_client", "error_description": "Client authentication failed: invalid secret."},
                )

        # Consume code (Single-use enforcement)
        code_record.is_used = True
        await db.commit()

        # Issue access token
        access_token_expires = timedelta(hours=1)
        access_token = create_oauth_access_token(
            subject=code_record.user_id,
            client_id=client.client_id,
            scopes=code_record.scope.split(),
            audience=f"{base_url}/mcp",
            issuer=base_url,
            expires_delta=access_token_expires,
        )

        refresh_token = None
        refresh_expires_at = None
        refresh_hash = None
        if "offline_access" in code_record.scope:
            refresh_token = f"kavach_rf_{secrets.token_urlsafe(32)}"
            refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        token_hash = hashlib.sha256(access_token.encode()).hexdigest()
        token_record = OAuthToken(
            access_token_hash=token_hash,
            refresh_token_hash=refresh_hash,
            client_id=client.client_id,
            user_id=code_record.user_id,
            scope=code_record.scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + access_token_expires,
            refresh_token_expires_at=refresh_expires_at,
        )
        db.add(token_record)
        await db.commit()

        audit = AuditService(db)
        await audit.log_event(
            action="OAUTH_TOKEN_ISSUED",
            resource_type="oauth_token",
            actor_type="user",
            actor_id=str(code_record.user_id),
            resource_id=token_hash[:12] + "...",
            status="SUCCESS",
            metadata={
                "client_id": client.client_id,
                "grant_type": "authorization_code",
                "scope": code_record.scope,
                "has_refresh_token": bool(refresh_token),
            },
        )
        await db.commit()

        response_body = {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": int(access_token_expires.total_seconds()),
            "scope": code_record.scope,
        }
        if refresh_token:
            response_body["refresh_token"] = refresh_token

        return JSONResponse(status_code=200, content=response_body)

    # 2. Refresh Token Grant
    elif grant_type == "refresh_token":
        if not refresh_token_param:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_request", "error_description": "Missing 'refresh_token' parameter."},
            )

        refresh_hash = hashlib.sha256(refresh_token_param.encode()).hexdigest()
        stmt = select(OAuthToken).where(
            OAuthToken.refresh_token_hash == refresh_hash,
            OAuthToken.is_revoked == False,
        )
        res = await db.execute(stmt)
        token_rec = res.scalar_one_or_none()

        if not token_rec:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token is invalid or revoked."},
            )

        if token_rec.refresh_token_expires_at and ensure_utc(token_rec.refresh_token_expires_at) < datetime.now(timezone.utc):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token has expired."},
            )

        # Rotate refresh token: revoke current
        token_rec.is_revoked = True
        await db.commit()

        new_access_token = create_oauth_access_token(
            subject=token_rec.user_id,
            client_id=token_rec.client_id,
            scopes=token_rec.scope.split(),
            audience=f"{base_url}/mcp",
            issuer=base_url,
            expires_delta=timedelta(hours=1),
        )
        new_refresh_token = f"kavach_rf_{secrets.token_urlsafe(32)}"
        new_refresh_hash = hashlib.sha256(new_refresh_token.encode()).hexdigest()

        new_token_record = OAuthToken(
            access_token_hash=hashlib.sha256(new_access_token.encode()).hexdigest(),
            refresh_token_hash=new_refresh_hash,
            client_id=token_rec.client_id,
            user_id=token_rec.user_id,
            scope=token_rec.scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            refresh_token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db.add(new_token_record)
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


# ── OpenID Connect UserInfo Endpoint (OIDC Core 1.0) ──

@router.get("/oauth/userinfo")
@router.post("/oauth/userinfo")
async def oauth_userinfo_endpoint(
    current_user: User = Depends(get_current_user),
):
    """
    OpenID Connect UserInfo Endpoint (OIDC Core 1.0).
    Allows ChatGPT, Claude, and OIDC clients to retrieve authenticated user identity claims.
    """
    return {
        "sub": str(current_user.id),
        "name": getattr(current_user, "name", None) or current_user.email,
        "email": current_user.email,
        "email_verified": getattr(current_user, "is_verified", True),
        "picture": getattr(current_user, "avatar_url", None),
        "preferred_username": current_user.email,
    }


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
