"""
Kavach Universal MCP OAuth 2.1 + PKCE + OIDC + CIMD Authorization Server.

Standards implemented:
- OAuth 2.1 Authorization Code + PKCE (S256 mandatory, single-use codes with replay revocation)
- RFC 9728 OAuth 2.0 Protected Resource Metadata (`/.well-known/oauth-protected-resource` & `/mcp`)
- RFC 8414 OAuth 2.0 Authorization Server Metadata (`/.well-known/oauth-authorization-server`)
- OpenID Connect Core 1.0 & Discovery (`/.well-known/openid-configuration`, `id_token` RS256, `/oauth/userinfo`)
- RFC 7517 JWK Set (`/.well-known/jwks.json`, `/oauth/jwks.json`)
- RFC 7591 Dynamic Client Registration (`/oauth/register`)
- MCP Client ID Metadata Documents (CIMD HTTPS URL `client_id` resolution with SSRF protection)
- RFC 8707 Resource Indicators & RFC 7009 Token Revocation (`/oauth/revoke`)
- Refresh Token Rotation with Reuse Family Revocation
- Workspace / Project / Repository-based Authorization & Per-Client Connections Dashboard APIs
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import ipaddress
import logging
import secrets
import socket
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, urlencode, urlparse

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.jwks import (
    ensure_signing_keys_loaded,
    get_public_jwks,
    verify_client_assertion_jwt,
    verify_external_oidc_id_token,
    verify_jwt_with_db_jwks,
)
from app.core.security import (
    create_access_token,
    create_oauth_access_token,
    create_oidc_id_token,
    get_current_user,
    get_current_user_optional,
    hash_password,
)
from app.models.audit_event import AuditEvent
from app.models.github import GitHubInstallation, GitHubRepository
from app.models.mcp import MCPSession, MCPToolInvocation
from app.models.oauth import (
    MCPClientContext,
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthPendingTransaction,
    OAuthToken,
)
from app.models.project import Project
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    ensure_user_workspace_provisioned,
    get_accessible_projects,
    get_user_org_and_workspace_scope,
    normalize_git_remote,
    resolve_project_context,
    set_client_active_project,
    user_can_access_project,
)

logger = logging.getLogger("kavach.oauth")
settings = get_settings()

router = APIRouter(tags=["OAuth 2.1 & Discovery"])

SUPPORTED_SCOPES = [
    "projects:read",
    "projects:write",
    "scans:read",
    "scans:run",
    "findings:read",
    "remediation:propose",
    "remediation:apply",
    "offline_access",
    "openid",
    "profile",
    "email",
]

SCOPE_METADATA: Dict[str, Dict[str, str]] = {
    "projects:read": {
        "category": "read",
        "label": "View projects and repositories",
        "description": "List authorized workspaces, projects, and connected GitHub repositories.",
    },
    "projects:write": {
        "category": "write",
        "label": "Create and link projects",
        "description": "Create new Kavach projects and bind repositories inside your workspace.",
    },
    "scans:read": {
        "category": "read",
        "label": "Access scan reports",
        "description": "View SAST, SCA, Secrets, IaC, and Cloud scan results and history.",
    },
    "scans:run": {
        "category": "action",
        "label": "Start authorized security scans",
        "description": "Trigger deterministic security scans against your authorized projects.",
    },
    "findings:read": {
        "category": "read",
        "label": "Read security findings",
        "description": "Inspect vulnerability details, attack surface posture, and active incidents.",
    },
    "remediation:propose": {
        "category": "action",
        "label": "Request remediation proposals",
        "description": "Generate verified security fix diffs and sandbox rescan validations.",
    },
    "remediation:apply": {
        "category": "write",
        "label": "Apply remediation & PR actions",
        "description": "Request remediation patch application or pull request workflows (subject to policy approval).",
    },
    "offline_access": {
        "category": "session",
        "label": "Maintain persistent connection",
        "description": "Issue rotatable refresh tokens so you do not need to sign in repeatedly.",
    },
    "openid": {
        "category": "identity",
        "label": "Verify Kavach identity",
        "description": "Authenticate your single Kavach account identity via OpenID Connect.",
    },
    "profile": {
        "category": "identity",
        "label": "Read basic profile",
        "description": "Access your Kavach display name and avatar.",
    },
    "email": {
        "category": "identity",
        "label": "Read email address",
        "description": "Access your verified email address.",
    },
}

# Pre-registered public AI assistants & IDE connectors (strict redirect allowlists; PKCE S256 required)
PRE_REGISTERED_CLIENTS: Dict[str, Dict[str, Any]] = {
    "chatgpt-mcp-connector": {
        "client_name": "ChatGPT",
        "client_uri": "https://chatgpt.com",
        "redirect_uris": [
            "https://chatgpt.com/connector_platform_oauth_redirect",
            "https://chatgpt.com/api/mcp/callback",
            "https://chat.openai.com/aip/plugin-oauth/callback",
            "https://platform.openai.com/oauth/callback",
        ],
    },
    "kavach-chatgpt-connector": {
        "client_name": "ChatGPT",
        "client_uri": "https://chatgpt.com",
        "redirect_uris": [
            "https://chatgpt.com/connector_platform_oauth_redirect",
            "https://chatgpt.com/api/mcp/callback",
            "https://chat.openai.com/aip/plugin-oauth/callback",
        ],
    },
    "claude-desktop": {
        "client_name": "Claude",
        "client_uri": "https://claude.ai",
        "redirect_uris": [
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.ai/api/mcp/callback",
            "https://claude.com/api/mcp/auth_callback",
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "claude-web": {
        "client_name": "Claude",
        "client_uri": "https://claude.ai",
        "redirect_uris": [
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.ai/api/mcp/callback",
            "https://claude.com/api/mcp/auth_callback",
        ],
    },
    "claude-code": {
        "client_name": "Claude Code",
        "client_uri": "https://claude.ai/code",
        "redirect_uris": [
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "cursor-mcp": {
        "client_name": "Cursor",
        "client_uri": "https://cursor.com",
        "redirect_uris": [
            "cursor://anysphere.cursor-mcp/oauth/callback",
            "cursor://kavach.kavach-security/callback",
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "vscode-mcp": {
        "client_name": "VS Code",
        "client_uri": "https://code.visualstudio.com",
        "redirect_uris": [
            "vscode://kavach.kavach-security/callback",
            "vscode://vscode.mcp/oauth/callback",
            "https://vscode.dev/redirect",
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "kavach-vscode": {
        "client_name": "Kavach for VS Code",
        "client_uri": "https://kavachsecurity.me",
        "redirect_uris": [
            "vscode://kavach.kavach-security/callback",
            "cursor://kavach.kavach-security/callback",
            "windsurf://kavach.kavach-security/callback",
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "windsurf-mcp": {
        "client_name": "Windsurf",
        "client_uri": "https://codeium.com/windsurf",
        "redirect_uris": [
            "windsurf://codeium.windsurf/oauth/callback",
            "windsurf://kavach.kavach-security/callback",
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "grok-mcp": {
        "client_name": "Grok",
        "client_uri": "https://grok.com",
        "redirect_uris": [
            "https://grok.com/api/mcp/callback",
            "https://x.ai/api/mcp/callback",
        ],
    },
    "codex-mcp": {
        "client_name": "Codex",
        "client_uri": "https://openai.com",
        "redirect_uris": [
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
    "kavach-cli": {
        "client_name": "Kavach CLI",
        "client_uri": "https://kavachsecurity.me",
        "redirect_uris": [
            "http://127.0.0.1/callback",
            "http://localhost/callback",
        ],
    },
}

ALLOWED_IDE_SCHEMES = {"vscode", "vscode-insiders", "cursor", "windsurf"}
ALLOWED_GRANT_TYPES = {"authorization_code", "refresh_token"}
ALLOWED_RESPONSE_TYPES = {"code"}
ALLOWED_AUTH_METHODS = {"none", "private_key_jwt", "client_secret_post", "client_secret_basic"}
CIMD_ALLOWED_AUTH_METHODS = {"none", "private_key_jwt"}


def get_base_url(request: Request) -> str:
    """Extracts public base URL respecting reverse proxy headers and local HTTP dev."""
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = (forwarded_proto.split(",")[0].strip() if forwarded_proto else None) or request.url.scheme or "http"
    if forwarded_host:
        host = forwarded_host.split(",")[0].strip()
        if host.startswith(("localhost", "127.0.0.1")) and not forwarded_proto:
            scheme = "http"
        return f"{scheme}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def get_frontend_url(request: Optional[Request] = None) -> str:
    """Resolves the frontend origin for browser-based OAuth consent and login handoff."""
    cfg = get_settings()
    if request:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
        if forwarded_host:
            host_only = forwarded_host.split(",")[0].strip().lower()
            if "kavachsecurity.me" in host_only or "localhost:300" in host_only or "127.0.0.1:300" in host_only:
                proto = forwarded_proto.split(",")[0].strip()
                if "localhost" in host_only or "127.0.0.1" in host_only:
                    proto = "http"
                return f"{proto}://{host_only}".rstrip("/")
        origin = request.headers.get("origin")
        if origin and ("kavachsecurity.me" in origin or "localhost:300" in origin):
            return origin.rstrip("/")
    if cfg.app_env == "production":
        return "https://kavachsecurity.me"
    return (cfg.frontend_url or "http://localhost:3002").rstrip("/")


def verify_pkce(code_verifier: str, code_challenge: str, method: str = "S256") -> bool:
    """Verifies PKCE code_verifier against code_challenge using SHA256 (RFC 7636)."""
    if method != "S256" or not code_verifier or not code_challenge:
        return False
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    computed_challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return hmac.compare_digest(computed_challenge, code_challenge.rstrip("="))


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _is_valid_redirect_uri_format(uri: str) -> bool:
    try:
        parsed = urlparse(uri)
    except Exception:
        return False
    if parsed.fragment:
        return False
    scheme = (parsed.scheme or "").lower()
    if scheme == "https":
        return bool(parsed.netloc)
    if scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        return True
    if scheme in ALLOWED_IDE_SCHEMES and (parsed.netloc or parsed.path):
        return True
    return False


def _is_redirect_uri_allowed(registered_uris: List[str], requested_uri: str) -> bool:
    """
    Matches `requested_uri` against registered URIs.
    Per RFC 8252 §7.3, loopback HTTP (`127.0.0.1`, `localhost`, `[::1]`) allows ephemeral port variance
    while matching scheme, host, and path. All other URIs require exact match (modulo trailing slash).
    """
    try:
        req_p = urlparse(requested_uri)
    except Exception:
        return False

    for reg in registered_uris:
        if reg.rstrip("/") == requested_uri.rstrip("/"):
            return True
        try:
            reg_p = urlparse(reg)
        except Exception:
            continue
        if (
            req_p.scheme.lower() == "http"
            and reg_p.scheme.lower() == "http"
            and req_p.hostname in {"127.0.0.1", "localhost", "::1"}
            and req_p.hostname == reg_p.hostname
            and (req_p.path.rstrip("/") == reg_p.path.rstrip("/") or reg_p.path in {"", "/"})
        ):
            return True
    return False


def _is_safe_cimd_url(url: str) -> bool:
    """SSRF guard for Client ID Metadata Document HTTPS URLs."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    if host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local") or host.endswith(".internal"):
        return False
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    except ValueError:
        try:
            infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            for info in infos:
                addr = info[4][0]
                ip = ipaddress.ip_address(addr)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                    return False
        except Exception:
            return False
    return True


def _oauth_error_redirect(
    redirect_uri: str,
    error: str,
    description: str,
    state: Optional[str] = None,
    iss: Optional[str] = None,
) -> RedirectResponse:
    params: Dict[str, str] = {"error": error, "error_description": description}
    if state:
        params["state"] = state
    if iss:
        params["iss"] = iss
    sep = "&" if "?" in redirect_uri else "?"
    return RedirectResponse(url=f"{redirect_uri}{sep}{urlencode(params)}", status_code=status.HTTP_302_FOUND)


def _normalize_resource_url(resource: Optional[str], base_url: str) -> str:
    canonical = f"{base_url.rstrip('/')}/mcp"
    if not resource:
        return canonical
    return resource.strip().rstrip("/")


def _is_resource_allowed(resource: Optional[str], base_url: str) -> bool:
    if not resource:
        return True
    req_norm = resource.strip().rstrip("/").lower()
    base_norm = base_url.rstrip("/").lower()
    allowed = {
        f"{base_norm}/mcp",
        base_norm,
        "https://mcp.kavachsecurity.me/mcp",
        "https://mcp.kavachsecurity.me",
        "https://kavachsecurity.me/mcp",
    }
    return req_norm in allowed


# ── Metadata Discovery & JWKS Endpoints (RFC 9728, RFC 8414, RFC 7517, OIDC) ──


@router.get("/.well-known/oauth-protected-resource")
@router.get("/.well-known/oauth-protected-resource/mcp")
@router.get("/.well-known/oauth-protected-resource/{resource_path:path}")
async def oauth_protected_resource_metadata(request: Request, resource_path: str = ""):
    """OAuth 2.0 Protected Resource Metadata (RFC 9728 / MCP Authorization Specification)."""
    base = get_base_url(request)
    resource_uri = f"{base}/mcp" if not resource_path else f"{base}/{resource_path.strip('/')}"
    return {
        "resource": resource_uri,
        "resource_name": "Kavach MCP Security Gateway",
        "authorization_servers": [base],
        "jwks_uri": f"{base}/.well-known/jwks.json",
        "scopes_supported": SUPPORTED_SCOPES,
        "bearer_methods_supported": ["header"],
        "resource_documentation": "https://docs.kavachsecurity.me/mcp",
    }


@router.get("/.well-known/oauth-authorization-server")
@router.get("/.well-known/openid-configuration")
async def oauth_authorization_server_metadata(request: Request):
    """OAuth 2.1 Authorization Server Metadata (RFC 8414) & OIDC Discovery."""
    base = get_base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "userinfo_endpoint": f"{base}/oauth/userinfo",
        "registration_endpoint": f"{base}/oauth/register",
        "revocation_endpoint": f"{base}/oauth/revoke",
        "jwks_uri": f"{base}/.well-known/jwks.json",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "pkce_code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": [
            "none",
            "private_key_jwt",
            "client_secret_post",
            "client_secret_basic",
        ],
        "token_endpoint_auth_signing_alg_values_supported": ["RS256", "ES256"],
        "scopes_supported": SUPPORTED_SCOPES,
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "claims_supported": [
            "sub",
            "name",
            "email",
            "email_verified",
            "picture",
            "org_id",
            "workspace_id",
            "project_id",
        ],
        "client_id_metadata_document_supported": True,
        "authorization_response_iss_parameter_supported": True,
        "service_documentation": f"{base}/docs",
        "ui_locales_supported": ["en"],
    }


@router.get("/.well-known/jwks.json")
@router.get("/oauth/jwks.json")
async def oauth_jwks_endpoint(db: AsyncSession = Depends(get_db)):
    """Public JSON Web Key Set (RFC 7517) for RS256 OAuth & OIDC token verification."""
    return await get_public_jwks(db)


@router.get("/.well-known/ai-plugin.json")
async def chatgpt_plugin_manifest(request: Request):
    """ChatGPT Connector / Action Manifest."""
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
        "logo_url": "https://kavachsecurity.me/kavach-logo.png",
        "contact_email": "security@kavachsecurity.me",
        "legal_info_url": "https://kavachsecurity.me/terms",
    }


# ── Dynamic Client Registration (RFC 7591) & Client ID Metadata Documents ──


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
    db: AsyncSession = Depends(get_db),
):
    """Dynamic Client Registration (RFC 7591) with strict RFC error format."""
    if not payload.redirect_uris:
        return JSONResponse(
            status_code=400,
            content={"error": "invalid_redirect_uri", "error_description": "At least one redirect_uri is required."},
        )

    for uri in payload.redirect_uris:
        if not _is_valid_redirect_uri_format(uri):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_redirect_uri",
                    "error_description": f"Invalid redirect_uri '{uri}'. Must use HTTPS, loopback HTTP, or approved IDE URI scheme.",
                },
            )

    auth_method = payload.token_endpoint_auth_method or "none"
    if auth_method not in ALLOWED_AUTH_METHODS:
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_client_metadata",
                "error_description": f"Unsupported token_endpoint_auth_method '{auth_method}'.",
            },
        )

    grant_types = payload.grant_types or ["authorization_code", "refresh_token"]
    if not set(grant_types).issubset(ALLOWED_GRANT_TYPES) or "authorization_code" not in grant_types:
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_client_metadata",
                "error_description": "grant_types must be a subset of ['authorization_code', 'refresh_token'] and include 'authorization_code'.",
            },
        )

    response_types = payload.response_types or ["code"]
    if not set(response_types).issubset(ALLOWED_RESPONSE_TYPES):
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_client_metadata",
                "error_description": "Only response_type 'code' is supported (OAuth 2.1).",
            },
        )

    client_id = f"kavach_{secrets.token_urlsafe(16)}"
    client_secret = None
    secret_hash = None
    is_confidential = auth_method in {"client_secret_post", "client_secret_basic"}
    if is_confidential:
        client_secret = secrets.token_urlsafe(32)
        secret_hash = hashlib.sha256(client_secret.encode()).hexdigest()

    client = OAuthClient(
        client_id=client_id,
        client_secret_hash=secret_hash,
        client_name=(payload.client_name or "MCP Client")[:255],
        client_type="dynamic",
        client_uri=payload.client_uri,
        logo_uri=payload.logo_uri,
        redirect_uris=payload.redirect_uris,
        grant_types=grant_types,
        response_types=response_types,
        scope=payload.scope or " ".join(SUPPORTED_SCOPES),
        token_endpoint_auth_method=auth_method,
        is_confidential=is_confidential,
        is_verified=False,
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

    res: Dict[str, Any] = {
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


async def _fetch_cimd_client(client_id_url: str, db: AsyncSession) -> Optional[OAuthClient]:
    """
    Fetches and validates an MCP Client ID Metadata Document (HTTPS URL `client_id`).
    Supports both public (`none`) and asymmetric (`private_key_jwt` with `jwks_uri`/`jwks`) clients,
    including dual-mode metadata such as ChatGPT (`["none", "private_key_jwt"]`).
    Symmetric shared-secret methods (`client_secret_*`) remain disallowed in public metadata docs.
    """
    if not _is_safe_cimd_url(client_id_url):
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as http_client:
            resp = await http_client.get(
                client_id_url,
                headers={"Accept": "application/json", "User-Agent": "Kavach-MCP-OAuth/1.0"},
            )
            if resp.status_code != 200 or len(resp.content) > 65536:
                return None
            doc = resp.json()
    except Exception as exc:
        logger.warning(f"[CIMD] Failed to fetch metadata document {client_id_url}: {exc}")
        return None

    if not isinstance(doc, dict) or doc.get("client_id") != client_id_url:
        return None
    redirect_uris = doc.get("redirect_uris")
    if not isinstance(redirect_uris, list) or not redirect_uris:
        return None
    if not all(isinstance(u, str) and _is_valid_redirect_uri_format(u) for u in redirect_uris):
        return None

    raw_primary_method = str(doc.get("token_endpoint_auth_method") or "none").strip()
    raw_supported = doc.get("token_endpoint_auth_methods_supported")
    supported_methods: List[str] = []
    if isinstance(raw_supported, list):
        for m in raw_supported:
            if isinstance(m, str) and m.strip() in CIMD_ALLOWED_AUTH_METHODS and m.strip() not in supported_methods:
                supported_methods.append(m.strip())
    if raw_primary_method in CIMD_ALLOWED_AUTH_METHODS and raw_primary_method not in supported_methods:
        supported_methods.insert(0, raw_primary_method)

    if not supported_methods:
        logger.warning(f"[CIMD] Rejected unsupported auth methods for {client_id_url}: {raw_primary_method}")
        return None

    effective_primary_method = (
        raw_primary_method if raw_primary_method in CIMD_ALLOWED_AUTH_METHODS else supported_methods[0]
    )

    jwks_uri = doc.get("jwks_uri")
    if jwks_uri is not None:
        if not isinstance(jwks_uri, str) or not _is_safe_cimd_url(jwks_uri):
            logger.warning(f"[CIMD] Rejected unsafe jwks_uri in metadata {client_id_url}: {jwks_uri}")
            jwks_uri = None

    inline_jwks = doc.get("jwks")
    if not (isinstance(inline_jwks, dict) and isinstance(inline_jwks.get("keys"), list)):
        inline_jwks = None

    if "none" not in supported_methods and "private_key_jwt" in supported_methods:
        if not jwks_uri and not inline_jwks:
            logger.warning(f"[CIMD] Rejected private_key_jwt client missing jwks_uri/jwks: {client_id_url}")
            return None

    is_confidential = "none" not in supported_methods

    existing = (
        await db.execute(select(OAuthClient).where(OAuthClient.client_id == client_id_url))
    ).scalar_one_or_none()
    if existing:
        existing.client_name = str(doc.get("client_name") or existing.client_name)[:255]
        existing.redirect_uris = redirect_uris
        existing.client_uri = doc.get("client_uri")
        existing.logo_uri = doc.get("logo_uri")
        existing.token_endpoint_auth_method = effective_primary_method
        existing.supported_auth_methods = supported_methods
        existing.jwks_uri = jwks_uri
        existing.jwks = inline_jwks
        existing.is_confidential = is_confidential
        existing.is_active = True
        existing.is_verified = True
        db.add(existing)
        await db.commit()
        return existing

    client = OAuthClient(
        client_id=client_id_url,
        client_name=str(doc.get("client_name") or urlparse(client_id_url).hostname or "Verified MCP Client")[:255],
        client_type="cimd",
        metadata_url=client_id_url,
        client_uri=doc.get("client_uri"),
        logo_uri=doc.get("logo_uri"),
        redirect_uris=redirect_uris,
        grant_types=["authorization_code", "refresh_token"],
        response_types=["code"],
        scope=str(doc.get("scope") or " ".join(SUPPORTED_SCOPES))[:1000],
        token_endpoint_auth_method=effective_primary_method,
        supported_auth_methods=supported_methods,
        jwks_uri=jwks_uri,
        jwks=inline_jwks,
        is_confidential=is_confidential,
        is_verified=True,
        is_active=True,
    )
    db.add(client)
    await db.commit()
    return client


async def _resolve_oauth_client(client_id: str, db: AsyncSession) -> Optional[OAuthClient]:
    """Resolves OAuth client from DB, pre-registered connector registry, or CIMD URL."""
    stmt = select(OAuthClient).where(OAuthClient.client_id == client_id, OAuthClient.is_active == True)
    client = (await db.execute(stmt)).scalar_one_or_none()
    if client:
        if (
            client.client_type == "cimd"
            and (
                not client.supported_auth_methods
                or (client.token_endpoint_auth_method == "private_key_jwt" and not client.jwks_uri and not client.jwks)
            )
        ):
            refreshed = await _fetch_cimd_client(client_id, db)
            if refreshed:
                return refreshed
        return client

    # Check exact pre-registered public AI/IDE client identifiers (never substring wildcards)
    if client_id in PRE_REGISTERED_CLIENTS:
        meta = PRE_REGISTERED_CLIENTS[client_id]
        client = OAuthClient(
            client_id=client_id,
            client_name=meta["client_name"],
            client_type="pre_registered",
            client_uri=meta.get("client_uri"),
            redirect_uris=meta["redirect_uris"],
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            scope=" ".join(SUPPORTED_SCOPES),
            token_endpoint_auth_method="none",
            is_confidential=False,
            is_verified=True,
            is_active=True,
        )
        db.add(client)
        await db.commit()
        return client

    # Check Client ID Metadata Document (HTTPS URL client_id)
    if client_id.startswith("https://"):
        return await _fetch_cimd_client(client_id, db)

    return None


# ── Light-Theme Server Fallback HTML Consent Page (XSS-Safe, Zero Bypass, Zero Password) ──


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
    user_workspaces: Optional[List[Any]] = None,
    user_orgs: Optional[List[Any]] = None,
    error_message: Optional[str] = None,
    info_message: Optional[str] = None,
    siwc_enabled: bool = False,
    request: Optional[Request] = None,
) -> HTMLResponse:
    """
    Server-rendered fallback OAuth 2.1 Consent Screen using Kavach light enterprise theme.
    Strictly passwordless and XSS-escaped.
    """
    esc = html.escape
    safe_client = esc(client_name)
    safe_tx = esc(transaction_token)
    safe_client_id = esc(client_id)
    safe_redirect_uri = esc(redirect_uri)
    safe_state = esc(state or "")
    safe_challenge = esc(code_challenge)
    safe_method = esc(code_challenge_method)

    frontend_url = get_frontend_url(request)
    resume_path = f"/oauth/consent?tx={quote(transaction_token)}"
    github_login_url = f"/oauth/login/github?tx={quote(transaction_token)}"
    google_login_url = f"/oauth/login/google?tx={quote(transaction_token)}"
    kavach_login_url = f"{frontend_url}/login?redirect={quote(resume_path)}"

    error_html = ""
    if error_message:
        error_html = (
            '<div style="background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;'
            'padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;">'
            f"{esc(error_message)}</div>"
        )

    info_html = ""
    if info_message:
        info_html = (
            '<div style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;'
            'padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;">'
            f"{esc(info_message)}</div>"
        )

    scope_items_html = ""
    for sc in requested_scopes:
        meta = SCOPE_METADATA.get(sc, {"label": sc, "description": sc, "category": "read"})
        cat_badge = "WRITE" if meta["category"] in {"write", "action"} else "READ"
        badge_bg = "#FEF3C7" if cat_badge == "WRITE" else "#ECFDF5"
        badge_fg = "#92400E" if cat_badge == "WRITE" else "#065F46"
        scope_items_html += (
            '<li style="margin-bottom:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
            f'<div><div style="font-size:13px;font-weight:600;color:#0F172A;">{esc(meta["label"])}</div>'
            f'<div style="font-size:12px;color:#64748B;margin-top:2px;">{esc(meta["description"])}</div></div>'
            f'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:{badge_bg};color:{badge_fg};">{cat_badge}</span>'
            "</li>"
        )

    sep = "&" if "?" in redirect_uri else "?"
    cancel_url = f"{redirect_uri}{sep}{urlencode({'error': 'access_denied', 'error_description': 'User cancelled authorization.', 'state': state or ''})}"

    if user:
        provider_name = esc((user.auth_provider or "Kavach").capitalize())
        org_name = esc(user_orgs[0].name if user_orgs else "Personal Organization")
        ws_name = esc(user_workspaces[0].name if user_workspaces else "Personal Workspace")

        default_pid = getattr(user, "default_project_id", None)
        project_options = ""
        for idx, p in enumerate(user_projects or []):
            selected = "selected" if (default_pid and p.id == default_pid) or (not default_pid and idx == 0) else ""
            repo_label = f" ({esc(p.repository_url)})" if p.repository_url else ""
            project_options += f'<option value="{esc(str(p.id))}" {selected}>{esc(p.name)}{repo_label}</option>'

        project_block = (
            '<div style="margin-bottom:16px;">'
            '<label for="project_id" style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">Project Access</label>'
            f'<select id="project_id" name="project_id" style="width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;color:#0F172A;background:#FFFFFF;">{project_options}</select>'
            "</div>"
            if project_options
            else '<div style="margin-bottom:16px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;color:#475569;">No projects yet. Approving will initialize a starter project in your workspace, or you can connect a repository in the Kavach dashboard.</div>'
        )

        user_content = f"""
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;border-radius:8px;margin-bottom:16px;">
            <div style="font-size:12px;color:#64748B;">Account</div>
            <div style="font-size:14px;font-weight:600;color:#0F172A;margin-top:2px;">{esc(user.email)}</div>
            <div style="font-size:12px;color:#64748B;margin-top:4px;">{provider_name} · {org_name} · {ws_name}</div>
        </div>
        <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="tx" value="{safe_tx}">
            <input type="hidden" name="client_id" value="{safe_client_id}">
            <input type="hidden" name="redirect_uri" value="{safe_redirect_uri}">
            <input type="hidden" name="state" value="{safe_state}">
            <input type="hidden" name="code_challenge" value="{safe_challenge}">
            <input type="hidden" name="code_challenge_method" value="{safe_method}">
            <input type="hidden" name="scope" value="{esc(' '.join(requested_scopes))}">
            {project_block}
            <button type="submit" name="action" value="allow" class="btn-primary">Approve access</button>
            <button type="submit" name="action" value="deny" class="btn-secondary">Cancel</button>
        </form>
        """
    else:
        siwc_html = (
            f'<a href="/oauth/login/openai?tx={quote(transaction_token)}" class="btn-sso">Continue with ChatGPT</a>'
            if siwc_enabled
            else ""
        )
        user_content = f"""
        <a href="{esc(github_login_url)}" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px;">Continue with GitHub</a>
        <a href="{esc(google_login_url)}" class="btn-sso" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px;">Continue with Google</a>
        {siwc_html}
        <a href="{esc(kavach_login_url)}" class="btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px;">Sign in via Kavach Portal</a>
        <a href="{esc(cancel_url)}" class="btn-secondary" style="display:block;text-align:center;text-decoration:none;">Cancel</a>
        """

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connect to Kavach</title>
    <style>
        body {{ background:#F8FAFC; color:#0F172A; font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; box-sizing:border-box; }}
        .card {{ background:#FFFFFF; border:1px solid #EAECF0; border-radius:12px; width:100%; max-width:460px; padding:32px; box-shadow:0 1px 2px rgba(0,0,0,0.04); }}
        .btn-primary {{ background:#0F172A; color:#FFFFFF; border:none; padding:12px 16px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; width:100%; box-sizing:border-box; }}
        .btn-primary:hover {{ background:#1E293B; }}
        .btn-sso {{ background:#FFFFFF; color:#0F172A; border:1px solid #E2E8F0; padding:11px 16px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; width:100%; box-sizing:border-box; }}
        .btn-secondary {{ background:#FFFFFF; color:#475569; border:1px solid #E2E8F0; padding:10px 16px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; width:100%; margin-top:8px; box-sizing:border-box; }}
    </style>
</head>
<body>
    <div class="card">
        <div style="margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2563EB;">Kavach Secure Authorization</div>
            <h1 style="font-size:20px;font-weight:700;margin:6px 0 4px 0;color:#0F172A;">Connect to Kavach</h1>
            <p style="font-size:13px;color:#64748B;margin:0;">Authorize <strong style="color:#0F172A;">{safe_client}</strong> to access your Kavach workspace.</p>
        </div>
        {error_html}{info_html}
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin-bottom:10px;">Requested Permissions</div>
            <ul style="list-style:none;padding:0;margin:0;">{scope_items_html}</ul>
        </div>
        {user_content}
        <p style="font-size:11px;color:#64748B;margin:16px 0 0 0;text-align:center;">Your credentials are never shared with {safe_client}. You can disconnect anytime in Kavach.</p>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_doc)


async def _issue_authorization_code_for_tx(
    pending_tx: OAuthPendingTransaction,
    user: User,
    base_url: str,
    db: AsyncSession,
    selected_workspace_id: Optional[uuid.UUID] = None,
    selected_project_id: Optional[uuid.UUID] = None,
    approved_scopes: Optional[List[str]] = None,
    set_as_default: bool = False,
) -> str:
    """Shared deterministic helper that validates tenant access, binds client context, and mints a single-use code."""
    orgs, workspaces = await ensure_user_workspace_provisioned(user, db)
    org_map, ws_map, _ = await get_user_org_and_workspace_scope(user, db)

    # Validate workspace selection
    target_ws_id = selected_workspace_id or pending_tx.selected_workspace_id or getattr(user, "default_workspace_id", None)
    target_org_id = pending_tx.selected_org_id
    if target_ws_id and target_ws_id in ws_map:
        target_org_id = ws_map[target_ws_id].organization_id
    elif workspaces:
        target_ws_id = workspaces[0].id
        target_org_id = workspaces[0].organization_id
    elif orgs:
        target_org_id = orgs[0].id

    # Validate project selection
    target_project: Optional[Project] = None
    candidate_pid = selected_project_id or pending_tx.selected_project_id or getattr(user, "default_project_id", None)
    if candidate_pid:
        proj = await db.get(Project, candidate_pid)
        if proj and await user_can_access_project(user, proj, db):
            target_project = proj
            if proj.workspace_id:
                target_ws_id = proj.workspace_id
            if proj.organization_id:
                target_org_id = proj.organization_id
        elif selected_project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access denied: You do not have permission to access the selected project.",
            )

    if not target_project:
        accessible_projects = await get_accessible_projects(user, db)
        if accessible_projects:
            ws_matches = [p for p in accessible_projects if p.workspace_id == target_ws_id]
            target_project = ws_matches[0] if ws_matches else accessible_projects[0]
            if target_project.workspace_id:
                target_ws_id = target_project.workspace_id
            if target_project.organization_id:
                target_org_id = target_project.organization_id

    if target_project:
        c_rec = await _resolve_oauth_client(pending_tx.client_id, db)
        await set_client_active_project(
            user=user,
            client_id=pending_tx.client_id,
            project=target_project,
            db=db,
            set_as_default=set_as_default,
            client_name=c_rec.client_name if c_rec else pending_tx.client_id,
        )

    tx_scopes = [s for s in pending_tx.scope.split() if s in SUPPORTED_SCOPES]
    if approved_scopes:
        allowed_set = set(tx_scopes)
        final_scopes = [s for s in approved_scopes if s in allowed_set]
        if not final_scopes:
            final_scopes = [s for s in tx_scopes if s in {"projects:read", "openid", "profile", "email"}] or tx_scopes
    else:
        final_scopes = tx_scopes
    scope_str = " ".join(final_scopes)

    auth_code = secrets.token_urlsafe(32)
    code_record = OAuthAuthorizationCode(
        code=auth_code,
        client_id=pending_tx.client_id,
        user_id=user.id,
        redirect_uri=pending_tx.redirect_uri,
        resource=pending_tx.resource or f"{base_url}/mcp",
        scope=scope_str,
        code_challenge=pending_tx.code_challenge,
        code_challenge_method=pending_tx.code_challenge_method,
        nonce=pending_tx.nonce,
        organization_id=target_org_id,
        workspace_id=target_ws_id,
        project_id=target_project.id if target_project else None,
        is_used=False,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(code_record)
    pending_tx.selected_org_id = target_org_id
    pending_tx.selected_workspace_id = target_ws_id
    pending_tx.selected_project_id = target_project.id if target_project else None
    pending_tx.is_completed = True
    await db.commit()

    audit = AuditService(db)
    await audit.log_event(
        action="OAUTH_AUTHORIZE_SUCCESS",
        resource_type="oauth_authorization_code",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=code_record.code[:10] + "...",
        organization_id=target_org_id,
        workspace_id=target_ws_id,
        project_id=target_project.id if target_project else None,
        status="SUCCESS",
        metadata={
            "client_id": pending_tx.client_id,
            "redirect_uri": pending_tx.redirect_uri,
            "scope": scope_str,
            "transaction_token": pending_tx.transaction_token,
            "project_id": str(target_project.id) if target_project else None,
        },
    )
    await db.commit()

    callback_params: Dict[str, str] = {
        "code": auth_code,
        "iss": base_url,
    }
    if pending_tx.state:
        callback_params["state"] = pending_tx.state

    sep = "&" if "?" in pending_tx.redirect_uri else "?"
    return f"{pending_tx.redirect_uri}{sep}{urlencode(callback_params)}"


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
    nonce: Optional[str] = None,
    prompt: Optional[str] = None,
    ui: Optional[str] = Query(None, description="Use 'html' for server fallback UI"),
    resume_tx: Optional[str] = Query(None, description="Pending transaction token when returning from SSO"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    OAuth 2.1 Authorization Endpoint (GET).
    Validates client, redirect_uri, PKCE S256, and resource indicator.
    Always requires explicit user consent (no silent auto-approve bypass).
    """
    base_url = get_base_url(request)
    pending_tx: Optional[OAuthPendingTransaction] = None

    if resume_tx:
        stmt = select(OAuthPendingTransaction).where(
            OAuthPendingTransaction.transaction_token == resume_tx,
            OAuthPendingTransaction.is_completed == False,
        )
        pending_tx = (await db.execute(stmt)).scalar_one_or_none()
        if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The authorization transaction has expired or is invalid. Please restart connection from your AI client.",
            )
        client_id = pending_tx.client_id
        redirect_uri = pending_tx.redirect_uri
        code_challenge = pending_tx.code_challenge
        code_challenge_method = pending_tx.code_challenge_method
        scope = pending_tx.scope
        state = pending_tx.state
        resource = pending_tx.resource
        client = await _resolve_oauth_client(client_id, db)
        if not client:
            raise HTTPException(status_code=400, detail="OAuth client is no longer active.")
    else:
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

        if not _is_redirect_uri_allowed(list(client.redirect_uris or []), redirect_uri):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Redirect URI '{redirect_uri}' is not registered for client '{client_id}'.",
            )

        # From this point redirect_uri is trusted; return OAuth 2.1 error redirects on invalid params
        if response_type != "code":
            return _oauth_error_redirect(
                redirect_uri,
                "unsupported_response_type",
                "Only response_type='code' is supported in OAuth 2.1.",
                state=state,
                iss=base_url,
            )
        if code_challenge_method != "S256" or not code_challenge or len(code_challenge) < 43:
            return _oauth_error_redirect(
                redirect_uri,
                "invalid_request",
                "OAuth 2.1 strictly requires PKCE with code_challenge_method='S256' and valid code_challenge.",
                state=state,
                iss=base_url,
            )
        if resource and not _is_resource_allowed(resource, base_url):
            return _oauth_error_redirect(
                redirect_uri,
                "invalid_target",
                f"Target resource '{resource}' is not valid for this MCP server.",
                state=state,
                iss=base_url,
            )

        requested_scopes = [s for s in (scope or client.scope).split() if s in SUPPORTED_SCOPES]
        if not requested_scopes:
            requested_scopes = ["projects:read", "scans:read", "scans:run", "findings:read", "offline_access"]

        tx_token = f"tx_{secrets.token_urlsafe(32)}"
        pending_tx = OAuthPendingTransaction(
            transaction_token=tx_token,
            client_id=client_id,
            redirect_uri=redirect_uri,
            state=state,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            resource=_normalize_resource_url(resource, base_url),
            scope=" ".join(requested_scopes),
            nonce=nonce,
            prompt=prompt,
            user_id=current_user.id if current_user else None,
            is_completed=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(pending_tx)
        await db.commit()
        await db.refresh(pending_tx)

    # Resolve user if already authenticated
    resolved_user: Optional[User] = None
    target_uid = pending_tx.user_id or (current_user.id if current_user else None)
    if target_uid:
        resolved_user = await db.get(User, target_uid)
        if resolved_user and resolved_user.is_active:
            pending_tx.user_id = resolved_user.id
            await db.commit()
        else:
            resolved_user = None

    # Default browser flow: route through Kavach's unified /login when unauthenticated,
    # or directly to the single /oauth/consent Authorize page when already signed in.
    if ui != "html":
        frontend_url = get_frontend_url(request)
        consent_path = f"/oauth/consent?tx={pending_tx.transaction_token}"
        if resolved_user:
            return RedirectResponse(
                url=f"{frontend_url}{consent_path}",
                status_code=status.HTTP_302_FOUND,
            )
        client_label = client.client_name if client else pending_tx.client_id
        login_url = (
            f"{frontend_url}/login"
            f"?redirect={quote(consent_path, safe='')}"
            f"&client_name={quote(str(client_label or 'MCP Client'), safe='')}"
        )
        return RedirectResponse(
            url=login_url,
            status_code=status.HTTP_302_FOUND,
        )

    # Server HTML fallback mode (?ui=html)
    user_orgs: List[Any] = []
    user_workspaces: List[Any] = []
    user_projects: List[Project] = []
    if resolved_user:
        user_orgs, user_workspaces = await ensure_user_workspace_provisioned(resolved_user, db)
        user_projects = await get_accessible_projects(resolved_user, db)

    scopes_list = [s for s in pending_tx.scope.split() if s]
    return _render_authorization_page(
        client_name=client.client_name if client else client_id,
        requested_scopes=scopes_list,
        transaction_token=pending_tx.transaction_token,
        client_id=pending_tx.client_id,
        redirect_uri=pending_tx.redirect_uri,
        state=pending_tx.state,
        code_challenge=pending_tx.code_challenge,
        code_challenge_method=pending_tx.code_challenge_method,
        user=resolved_user,
        user_projects=user_projects,
        user_workspaces=user_workspaces,
        user_orgs=user_orgs,
        error_message=pending_tx.error_message,
        siwc_enabled=bool(settings.openai_siwc_enabled and settings.openai_siwc_client_id),
        request=request,
    )


@router.post("/oauth/authorize")
async def oauth_authorize_post(
    request: Request,
    tx: str = Form(...),
    action: str = Form(...),
    project_id: Optional[str] = Form(None),
    workspace_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    OAuth 2.1 Authorization Endpoint (POST — Form consent fallback).
    Strictly requires authenticated user session (no password form, no unauthenticated fallback).
    """
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=400, detail="Active OAuth transaction not found.")
    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Authorization transaction has expired.")

    base_url = get_base_url(request)
    if action == "deny":
        pending_tx.is_completed = True
        await db.commit()
        return _oauth_error_redirect(
            pending_tx.redirect_uri,
            "access_denied",
            "User denied the authorization request.",
            state=pending_tx.state,
            iss=base_url,
        )

    user_id = pending_tx.user_id or (current_user.id if current_user else None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to authorize this MCP connection.",
        )
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user not found or inactive.")

    sel_proj_uuid = None
    if project_id:
        try:
            sel_proj_uuid = uuid.UUID(project_id.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project_id format.")
    sel_ws_uuid = None
    if workspace_id:
        try:
            sel_ws_uuid = uuid.UUID(workspace_id.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workspace_id format.")

    redirect_target = await _issue_authorization_code_for_tx(
        pending_tx=pending_tx,
        user=user,
        base_url=base_url,
        db=db,
        selected_workspace_id=sel_ws_uuid,
        selected_project_id=sel_proj_uuid,
    )
    return RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)


# ── JSON Consent & Inline Onboarding APIs (for Branded Next.js `/oauth/consent`) ──


@router.get("/oauth/consent/context")
async def oauth_consent_context(
    tx: str = Query(..., description="Pending transaction token"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Returns transaction details, client info, and (when authenticated) authorized workspaces/projects."""
    stmt = select(OAuthPendingTransaction).where(OAuthPendingTransaction.transaction_token == tx)
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=404, detail="Authorization request not found.")
    if pending_tx.is_completed:
        raise HTTPException(status_code=400, detail="This authorization request has already been completed.")
    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This authorization request has expired.")

    client = await _resolve_oauth_client(pending_tx.client_id, db)
    scopes_list = [s for s in pending_tx.scope.split() if s]
    scopes_detail = [
        {
            "scope": sc,
            **SCOPE_METADATA.get(sc, {"category": "read", "label": sc, "description": sc}),
        }
        for sc in scopes_list
    ]

    user: Optional[User] = None
    if current_user and current_user.is_active:
        user = current_user
        if pending_tx.user_id != user.id:
            pending_tx.user_id = user.id
            await db.commit()
    elif pending_tx.user_id:
        candidate = await db.get(User, pending_tx.user_id)
        if candidate and candidate.is_active:
            user = candidate

    client_payload = {
        "client_id": pending_tx.client_id,
        "client_name": client.client_name if client else pending_tx.client_id,
        "client_type": client.client_type if client else "dynamic",
        "client_uri": client.client_uri if client else None,
        "is_verified": bool(client.is_verified) if client else False,
        "redirect_uri": pending_tx.redirect_uri,
    }

    if not user:
        return {
            "authenticated": False,
            "transaction_token": pending_tx.transaction_token,
            "client": client_payload,
            "requested_scopes": scopes_detail,
            "error_message": pending_tx.error_message,
            "login_providers": {
                "github": True,
                "google": bool(settings.google_client_id),
                "openai_siwc": bool(settings.openai_siwc_enabled and settings.openai_siwc_client_id),
            },
        }

    orgs, workspaces = await ensure_user_workspace_provisioned(user, db)
    projects = await get_accessible_projects(user, db)

    ws_ids = [w.id for w in workspaces]
    proj_ids = [p.id for p in projects]
    repos: List[GitHubRepository] = []
    if ws_ids or proj_ids:
        repo_conds = []
        if ws_ids:
            repo_conds.append(GitHubRepository.workspace_id.in_(ws_ids))
        if proj_ids:
            repo_conds.append(GitHubRepository.project_id.in_(proj_ids))
        repos = list((await db.execute(select(GitHubRepository).where(or_(*repo_conds)))).scalars().all())

    # Also include installations connected by this user
    inst_rows = list(
        (
            await db.execute(
                select(GitHubInstallation).where(
                    GitHubInstallation.connected_by_user_id == user.id,
                    GitHubInstallation.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )

    default_pid = str(user.default_project_id) if getattr(user, "default_project_id", None) else (
        str(projects[0].id) if projects else None
    )
    default_ws_id = str(user.default_workspace_id) if getattr(user, "default_workspace_id", None) else (
        str(workspaces[0].id) if workspaces else None
    )

    return {
        "authenticated": True,
        "transaction_token": pending_tx.transaction_token,
        "client": client_payload,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "auth_provider": user.auth_provider,
            "default_workspace_id": default_ws_id,
            "default_project_id": default_pid,
        },
        "organizations": [
            {"id": str(o.id), "name": o.name, "slug": o.slug, "org_type": o.org_type} for o in orgs
        ],
        "workspaces": [
            {
                "id": str(w.id),
                "name": w.name,
                "slug": w.slug,
                "workspace_type": w.workspace_type,
                "organization_id": str(w.organization_id) if w.organization_id else None,
            }
            for w in workspaces
        ],
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "workspace_id": str(p.workspace_id) if p.workspace_id else None,
                "organization_id": str(p.organization_id) if p.organization_id else None,
                "repository_url": p.repository_url,
                "environment": p.environment,
                "is_default": str(p.id) == default_pid,
            }
            for p in projects
        ],
        "github_installations_count": len(inst_rows),
        "github_repositories": [
            {
                "id": str(r.id),
                "full_name": r.full_name,
                "html_url": r.html_url,
                "project_id": str(r.project_id) if r.project_id else None,
                "workspace_id": str(r.workspace_id) if r.workspace_id else None,
            }
            for r in repos
        ],
        "requested_scopes": scopes_detail,
        "error_message": pending_tx.error_message,
    }


class ConsentCreateProjectPayload(BaseModel):
    tx: str
    name: str = Field(min_length=1, max_length=255)
    workspace_id: Optional[str] = None
    repository_url: Optional[str] = None
    github_repository_id: Optional[str] = None
    environment: str = "production"


@router.post("/oauth/consent/onboarding/project")
async def oauth_consent_create_project(
    payload: ConsentCreateProjectPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creates a project (and optionally links a GitHub repository) inline during OAuth onboarding."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == payload.tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=404, detail="Pending authorization transaction not found.")

    orgs, workspaces = await ensure_user_workspace_provisioned(current_user, db)
    _, ws_map, _ = await get_user_org_and_workspace_scope(current_user, db)

    target_ws_id = workspaces[0].id if workspaces else None
    target_org_id = workspaces[0].organization_id if workspaces else (orgs[0].id if orgs else None)
    if payload.workspace_id:
        try:
            ws_uuid = uuid.UUID(payload.workspace_id)
            if ws_uuid not in ws_map and not current_user.is_superuser:
                raise HTTPException(status_code=403, detail="Access denied to selected workspace.")
            if ws_uuid in ws_map:
                target_ws_id = ws_uuid
                target_org_id = ws_map[ws_uuid].organization_id
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workspace_id.")

    repo_url = payload.repository_url.strip() if payload.repository_url else None
    gh_repo: Optional[GitHubRepository] = None
    if payload.github_repository_id:
        try:
            gh_uuid = uuid.UUID(payload.github_repository_id)
            gh_repo = await db.get(GitHubRepository, gh_uuid)
            if gh_repo:
                if not repo_url:
                    repo_url = gh_repo.html_url
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid github_repository_id.")

    new_proj = Project(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        workspace_id=target_ws_id,
        organization_id=target_org_id,
        name=payload.name.strip(),
        repository_url=repo_url,
        environment=payload.environment or "production",
        application_type="web_service",
        default_branch="main",
    )
    db.add(new_proj)
    await db.flush()

    if gh_repo:
        gh_repo.project_id = new_proj.id
        if target_ws_id:
            gh_repo.workspace_id = target_ws_id
        db.add(gh_repo)
    elif repo_url:
        import random
        from app.mcp.tools.github import _extract_owner_repo
        parsed_repo = _extract_owner_repo(repo_url)
        if parsed_repo:
            r_owner, r_name, r_full = parsed_repo
            gh_num_id = random.randint(100000000, 999999999)
            db.add(
                GitHubRepository(
                    id=uuid.uuid4(),
                    github_repository_id=gh_num_id,
                    project_id=new_proj.id,
                    workspace_id=target_ws_id,
                    owner=r_owner,
                    name=r_name,
                    full_name=r_full,
                    default_branch="main",
                    private=False,
                    html_url=f"https://github.com/{r_full}",
                    clone_url=f"https://github.com/{r_full}.git",
                    visibility="public",
                    archived=False,
                )
            )

    current_user.default_project_id = new_proj.id
    if target_ws_id:
        current_user.default_workspace_id = target_ws_id
    current_user.onboarding_completed = True
    db.add(current_user)

    pending_tx.selected_project_id = new_proj.id
    pending_tx.selected_workspace_id = target_ws_id
    pending_tx.selected_org_id = target_org_id
    await db.commit()
    await db.refresh(new_proj)

    return {
        "id": str(new_proj.id),
        "name": new_proj.name,
        "workspace_id": str(new_proj.workspace_id) if new_proj.workspace_id else None,
        "organization_id": str(new_proj.organization_id) if new_proj.organization_id else None,
        "repository_url": new_proj.repository_url,
        "environment": new_proj.environment,
        "is_default": True,
    }


class ConsentApprovePayload(BaseModel):
    tx: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    approved_scopes: Optional[List[str]] = None
    set_as_default: bool = True


@router.post("/oauth/consent/approve")
async def oauth_consent_approve(
    payload: ConsentApprovePayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approves an OAuth 2.1 transaction from the branded consent UI and returns the client redirect URL."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == payload.tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=404, detail="Pending authorization transaction not found or already used.")
    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Authorization transaction has expired.")

    if pending_tx.user_id and pending_tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Authorization transaction belongs to a different signed-in user.")

    sel_ws = uuid.UUID(payload.workspace_id) if payload.workspace_id else None
    sel_proj = uuid.UUID(payload.project_id) if payload.project_id else None

    redirect_to = await _issue_authorization_code_for_tx(
        pending_tx=pending_tx,
        user=current_user,
        base_url=get_base_url(request),
        db=db,
        selected_workspace_id=sel_ws,
        selected_project_id=sel_proj,
        approved_scopes=payload.approved_scopes,
        set_as_default=payload.set_as_default,
    )
    return {"redirect_to": redirect_to}


class ConsentDenyPayload(BaseModel):
    tx: str


@router.post("/oauth/consent/deny")
async def oauth_consent_deny(
    payload: ConsentDenyPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == payload.tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=404, detail="Pending authorization transaction not found.")
    pending_tx.is_completed = True
    await db.commit()
    base_url = get_base_url(request)
    params = {"error": "access_denied", "error_description": "User cancelled authorization.", "iss": base_url}
    if pending_tx.state:
        params["state"] = pending_tx.state
    sep = "&" if "?" in pending_tx.redirect_uri else "?"
    return {"redirect_to": f"{pending_tx.redirect_uri}{sep}{urlencode(params)}"}


# ── Inner SSO Identity Provider Handlers (GitHub, Google, Optional SIWC) ──


def _attach_session_cookie(response: RedirectResponse, token: str, request: Request) -> None:
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").lower()
    is_https = (request.headers.get("x-forwarded-proto") or request.url.scheme) == "https"
    cookie_kwargs: Dict[str, Any] = {
        "key": "seculayer_auth_token",
        "value": quote(token),
        "max_age": 604800,
        "path": "/",
        "samesite": "lax",
        "secure": is_https,
        "httponly": False,  # Read by Next.js SPA client for Authorization Bearer header
    }
    if "kavachsecurity.me" in host:
        cookie_kwargs["domain"] = ".kavachsecurity.me"
    response.set_cookie(**cookie_kwargs)


@router.get("/oauth/login/github")
async def oauth_login_github(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Initiates GitHub OAuth flow bound to an independent CSRF inner_state on the pending MCP transaction."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

    cfg = get_settings()
    if not cfg.github_client_id or not cfg.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is NOT CONFIGURED (missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).",
        )

    inner_state = secrets.token_urlsafe(32)
    pending_tx.inner_provider = "github"
    pending_tx.inner_state = inner_state
    await db.commit()

    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/github"
    github_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={quote(cfg.github_client_id)}"
        f"&redirect_uri={quote(callback_url)}"
        f"&scope={quote('read:user,user:email,repo')}"
        f"&state={quote(inner_state)}"
    )
    return RedirectResponse(url=github_url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/callback/github")
async def oauth_callback_github(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handles GitHub OAuth callback, verifies email, ensures workspace provisioning, and returns to consent."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.inner_state == state,
        OAuthPendingTransaction.inner_provider == "github",
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    cfg = get_settings()
    if not cfg.github_client_id or not cfg.github_client_secret:
        raise HTTPException(status_code=503, detail="GitHub OAuth is NOT CONFIGURED.")

    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/github"

    async with httpx.AsyncClient(timeout=12.0) as http_client:
        t_res = await http_client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": cfg.github_client_id,
                "client_secret": cfg.github_client_secret,
                "code": code,
                "redirect_uri": callback_url,
            },
        )
        if t_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange GitHub authorization code.")
        gh_token = t_res.json().get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="No access token received from GitHub.")

        gh_headers = {"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github.v3+json"}
        p_res = await http_client.get("https://api.github.com/user", headers=gh_headers)
        if p_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub profile.")
        gh_user = p_res.json()

        e_res = await http_client.get("https://api.github.com/user/emails", headers=gh_headers)
        primary_email = None
        email_verified = False
        if e_res.status_code == 200:
            emails = e_res.json()
            for em in emails:
                if em.get("primary") and em.get("verified"):
                    primary_email = em.get("email")
                    email_verified = True
                    break
            if not primary_email:
                for em in emails:
                    if em.get("verified"):
                        primary_email = em.get("email")
                        email_verified = True
                        break

        if not primary_email and gh_user.get("email"):
            primary_email = gh_user.get("email")
            email_verified = False

    if not primary_email:
        raise HTTPException(status_code=400, detail="GitHub account has no accessible email address.")

    gh_user_id = str(gh_user["id"])
    user = (await db.execute(select(User).where(User.github_user_id == gh_user_id))).scalar_one_or_none()
    if not user:
        existing_by_email = (
            await db.execute(select(User).where(User.email == primary_email.lower().strip()))
        ).scalar_one_or_none()
        if existing_by_email:
            if not email_verified:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot link GitHub account: primary email is not verified by GitHub.",
                )
            existing_by_email.github_user_id = gh_user_id
            if gh_user.get("avatar_url") and not existing_by_email.avatar_url:
                existing_by_email.avatar_url = gh_user.get("avatar_url")
            user = existing_by_email
        else:
            user = User(
                email=primary_email.lower().strip(),
                password_hash=hash_password(secrets.token_urlsafe(32)),
                name=gh_user.get("name") or gh_user.get("login") or "GitHub User",
                github_user_id=gh_user_id,
                avatar_url=gh_user.get("avatar_url"),
                auth_provider="github",
                is_verified=email_verified,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    await ensure_user_workspace_provisioned(user, db)
    pending_tx.user_id = user.id
    pending_tx.inner_state = None
    await db.commit()

    session_jwt = create_access_token(subject=str(user.id))
    frontend_url = get_frontend_url(request)
    resp = RedirectResponse(
        url=f"{frontend_url}/oauth/consent?tx={quote(pending_tx.transaction_token)}",
        status_code=status.HTTP_302_FOUND,
    )
    _attach_session_cookie(resp, session_jwt, request)
    return resp


@router.get("/oauth/login/google")
async def oauth_login_google(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Initiates Google OAuth flow bound to an independent CSRF inner_state on the pending MCP transaction."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

    cfg = get_settings()
    if not cfg.google_client_id or not cfg.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is NOT CONFIGURED (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
        )

    inner_state = secrets.token_urlsafe(32)
    pending_tx.inner_provider = "google"
    pending_tx.inner_state = inner_state
    await db.commit()

    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/google"
    google_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={quote(cfg.google_client_id)}"
        f"&redirect_uri={quote(callback_url)}"
        f"&response_type=code"
        f"&scope={quote('openid email profile')}"
        f"&access_type=offline"
        f"&state={quote(inner_state)}"
    )
    return RedirectResponse(url=google_url, status_code=status.HTTP_302_FOUND)


@router.get("/oauth/callback/google")
async def oauth_callback_google(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handles Google OAuth callback, verifies email_verified, ensures workspace provisioning, and resumes consent."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.inner_state == state,
        OAuthPendingTransaction.inner_provider == "google",
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    cfg = get_settings()
    if not cfg.google_client_id or not cfg.google_client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth is NOT CONFIGURED.")

    base = get_base_url(request)
    callback_url = f"{base}/oauth/callback/google"

    async with httpx.AsyncClient(timeout=12.0) as http_client:
        t_res = await http_client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback_url,
            },
        )
        if t_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google authorization code.")
        g_token = t_res.json().get("access_token")
        if not g_token:
            raise HTTPException(status_code=400, detail="No access token received from Google.")

        p_res = await http_client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {g_token}"},
        )
        if p_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user profile.")
        g_user = p_res.json()

    google_sub = str(g_user.get("sub") or "").strip()
    raw_email = g_user.get("email")
    email_verified = bool(g_user.get("email_verified", False))
    if not google_sub or not raw_email:
        raise HTTPException(status_code=400, detail="Google profile missing required subject or email claim.")
    email = str(raw_email).lower().strip()

    user = (await db.execute(select(User).where(User.google_user_id == google_sub))).scalar_one_or_none()
    if not user:
        existing_by_email = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing_by_email:
            if not email_verified:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot link Google account: email address is not verified by Google.",
                )
            existing_by_email.google_user_id = google_sub
            if g_user.get("picture") and not existing_by_email.avatar_url:
                existing_by_email.avatar_url = g_user.get("picture")
            user = existing_by_email
        else:
            user = User(
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                name=g_user.get("name") or "Google User",
                google_user_id=google_sub,
                avatar_url=g_user.get("picture"),
                auth_provider="google",
                is_verified=email_verified,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    await ensure_user_workspace_provisioned(user, db)
    pending_tx.user_id = user.id
    pending_tx.inner_state = None
    await db.commit()

    session_jwt = create_access_token(subject=str(user.id))
    frontend_url = get_frontend_url(request)
    resp = RedirectResponse(
        url=f"{frontend_url}/oauth/consent?tx={quote(pending_tx.transaction_token)}",
        status_code=status.HTTP_302_FOUND,
    )
    _attach_session_cookie(resp, session_jwt, request)
    return resp


@router.get("/oauth/login/openai")
async def oauth_login_openai(
    tx: str = Query(..., description="Pending transaction token"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Initiates Sign in with ChatGPT (SIWC) OIDC + PKCE flow when configured."""
    cfg = get_settings()
    if not cfg.openai_siwc_enabled or not cfg.openai_siwc_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign in with ChatGPT (SIWC) is NOT CONFIGURED. Authenticate with GitHub or Google.",
        )

    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.transaction_token == tx,
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx or (pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc)):
        raise HTTPException(status_code=400, detail="Invalid or expired transaction token.")

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
    redirect_uri = cfg.openai_siwc_redirect_uri or f"{base}/oauth/callback/openai"
    siwc_params = {
        "response_type": "code",
        "client_id": cfg.openai_siwc_client_id,
        "redirect_uri": redirect_uri,
        "scope": cfg.openai_siwc_scopes,
        "state": inner_state,
        "nonce": inner_nonce,
        "code_challenge": inner_code_challenge,
        "code_challenge_method": "S256",
    }
    return RedirectResponse(url=f"{cfg.openai_siwc_auth_url}?{urlencode(siwc_params)}", status_code=302)


@router.get("/oauth/callback/openai")
async def oauth_callback_openai(
    code: str = Query(...),
    state: str = Query(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Handles SIWC callback with cryptographic JWKS RS256 ID Token verification."""
    stmt = select(OAuthPendingTransaction).where(
        OAuthPendingTransaction.inner_state == state,
        OAuthPendingTransaction.inner_provider == "openai",
        OAuthPendingTransaction.is_completed == False,
    )
    pending_tx = (await db.execute(stmt)).scalar_one_or_none()
    if not pending_tx:
        raise HTTPException(status_code=400, detail="Invalid or unrecognized inner OAuth state.")
    if pending_tx.expires_at and ensure_utc(pending_tx.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="The authorization transaction has expired.")

    cfg = get_settings()
    base = get_base_url(request)
    redirect_uri = cfg.openai_siwc_redirect_uri or f"{base}/oauth/callback/openai"

    async with httpx.AsyncClient(timeout=10.0) as http_client:
        res = await http_client.post(
            cfg.openai_siwc_token_url,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "authorization_code",
                "client_id": cfg.openai_siwc_client_id,
                "client_secret": cfg.openai_siwc_client_secret or "",
                "code": code,
                "redirect_uri": redirect_uri,
                "code_verifier": pending_tx.inner_code_verifier,
            },
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code with OpenAI.")
        id_token = res.json().get("id_token")

    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token from OpenAI response.")

    decoded_claims, err = await verify_external_oidc_id_token(
        id_token=id_token,
        jwks_uri=cfg.openai_siwc_jwks_uri,
        expected_issuer=cfg.openai_siwc_issuer,
        expected_audience=cfg.openai_siwc_client_id or "",
        expected_nonce=pending_tx.inner_nonce,
    )
    if not decoded_claims or err:
        raise HTTPException(status_code=400, detail=f"OpenAI ID token verification failed: {err}")

    sub = decoded_claims.get("sub")
    email = (decoded_claims.get("email") or "").lower().strip()
    email_verified = bool(decoded_claims.get("email_verified", False))
    name = decoded_claims.get("name") or "ChatGPT User"
    if not sub or not email:
        raise HTTPException(status_code=400, detail="OpenAI identity claims missing 'sub' or 'email'.")

    user = (await db.execute(select(User).where(User.chatgpt_user_id == sub))).scalar_one_or_none()
    if not user:
        existing_user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing_user:
            if current_user and current_user.id == existing_user.id:
                existing_user.chatgpt_user_id = sub
                existing_user.chatgpt_issuer = cfg.openai_siwc_issuer
                user = existing_user
            else:
                pending_tx.error_message = (
                    "Account linking requires signing in with your primary Kavach provider (GitHub/Google) first."
                )
                await db.commit()
                frontend_url = get_frontend_url(request)
                return RedirectResponse(
                    url=f"{frontend_url}/oauth/consent?tx={quote(pending_tx.transaction_token)}",
                    status_code=status.HTTP_302_FOUND,
                )
        else:
            user = User(
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                name=name,
                chatgpt_user_id=sub,
                chatgpt_issuer=cfg.openai_siwc_issuer,
                auth_provider="chatgpt",
                is_verified=email_verified,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    await ensure_user_workspace_provisioned(user, db)
    pending_tx.user_id = user.id
    pending_tx.inner_state = None
    await db.commit()

    session_jwt = create_access_token(subject=str(user.id))
    frontend_url = get_frontend_url(request)
    resp = RedirectResponse(
        url=f"{frontend_url}/oauth/consent?tx={quote(pending_tx.transaction_token)}",
        status_code=status.HTTP_302_FOUND,
    )
    _attach_session_cookie(resp, session_jwt, request)
    return resp


@router.post("/oauth/unlink/openai")
async def oauth_unlink_openai(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.chatgpt_user_id = None
    current_user.chatgpt_issuer = None
    db.add(current_user)
    await db.commit()
    return {"status": "UNLINKED", "message": "Sign in with ChatGPT has been unlinked from your account."}


# ── OAuth 2.1 Token Endpoint (/oauth/token) ──


CLIENT_ASSERTION_JWT_BEARER = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"


def _extract_unverified_assertion_client_id(params: Dict[str, Any]) -> Optional[str]:
    """Extracts `sub`/`iss` lookup hint from client_assertion when `client_id` form param is omitted (RFC 7523)."""
    if params.get("client_assertion_type") != CLIENT_ASSERTION_JWT_BEARER:
        return None
    assertion = params.get("client_assertion")
    if not isinstance(assertion, str) or not assertion.strip():
        return None
    try:
        import jwt as pyjwt
        unverified = pyjwt.decode(assertion, options={"verify_signature": False})
        cand = unverified.get("sub") or unverified.get("iss")
        return str(cand).strip() if cand else None
    except Exception:
        return None


async def _authenticate_client(
    client: OAuthClient,
    client_secret: Optional[str],
    auth_header: str,
    params: Optional[Dict[str, Any]] = None,
    valid_audiences: Optional[List[str]] = None,
) -> Optional[JSONResponse]:
    """
    Authenticates an OAuth client at /oauth/token across:
    - `private_key_jwt` (RFC 7523 asymmetric JWT signed by CIMD `jwks_uri` or inline `jwks`)
    - `none` (public / dual-mode PKCE clients)
    - `client_secret_post` / `client_secret_basic` (constant-time SHA-256 secret verification)
    """
    params = params or {}
    allowed_methods = set(client.supported_auth_methods or []) or {client.token_endpoint_auth_method or "none"}

    assertion_type = params.get("client_assertion_type")
    client_assertion = params.get("client_assertion")
    if assertion_type == CLIENT_ASSERTION_JWT_BEARER or client_assertion:
        if assertion_type != CLIENT_ASSERTION_JWT_BEARER or not isinstance(client_assertion, str):
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_client", "error_description": "Invalid client_assertion_type or missing client_assertion."},
            )
        if "private_key_jwt" not in allowed_methods and not client.jwks_uri and not client.jwks:
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_client", "error_description": "Client is not authorized for private_key_jwt authentication."},
            )
        if client.jwks_uri and not _is_safe_cimd_url(client.jwks_uri):
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_client", "error_description": "Client jwks_uri failed SSRF security policy."},
            )
        _, err = await verify_client_assertion_jwt(
            client_assertion,
            client_id=client.client_id,
            valid_audiences=valid_audiences or [],
            jwks_uri=client.jwks_uri,
            inline_jwks=client.jwks,
        )
        if err:
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_client", "error_description": err},
            )
        return None

    if "none" in allowed_methods and not client.is_confidential:
        return None

    if "private_key_jwt" in allowed_methods and not ({"client_secret_post", "client_secret_basic"} & allowed_methods):
        return JSONResponse(
            status_code=401,
            content={"error": "invalid_client", "error_description": "Client authentication via private_key_jwt (client_assertion) is required."},
        )

    provided_secret = client_secret
    if not provided_secret and auth_header.startswith("Basic "):
        try:
            decoded = base64.b64decode(auth_header.replace("Basic ", "").strip()).decode("utf-8")
            if ":" in decoded:
                _, provided_secret = decoded.split(":", 1)
        except Exception:
            pass
    if not provided_secret:
        return JSONResponse(
            status_code=401,
            content={"error": "invalid_client", "error_description": "Missing client credentials."},
        )
    given_hash = hashlib.sha256(provided_secret.encode()).hexdigest()
    if not hmac.compare_digest(given_hash, client.client_secret_hash or ""):
        return JSONResponse(
            status_code=401,
            content={"error": "invalid_client", "error_description": "Invalid client credentials."},
        )
    return None


@router.post("/oauth/token")
async def oauth_token_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.1 Token Endpoint (RFC 6749, RFC 7636 PKCE, RFC 8707 Resource Indicators, RFC 7523 private_key_jwt).
    Supports `authorization_code` and `refresh_token` grants with:
    - RS256 JWKS-signed access_token + optional OIDC id_token
    - Atomic single-use authorization code consumption + replay family revocation
    - Refresh token rotation + reuse detection family revocation
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        params = await request.json()
    else:
        form_data = await request.form()
        params = dict(form_data)

    grant_type = params.get("grant_type")
    client_id = params.get("client_id") or _extract_unverified_assertion_client_id(params)
    code = params.get("code")
    redirect_uri = params.get("redirect_uri")
    code_verifier = params.get("code_verifier")
    refresh_token_param = params.get("refresh_token")
    client_secret = params.get("client_secret")
    resource_param = params.get("resource")

    auth_header = request.headers.get("authorization", "")
    if not params.get("client_id") and auth_header.startswith("Basic "):
        try:
            decoded = base64.b64decode(auth_header.replace("Basic ", "").strip()).decode("utf-8")
            if ":" in decoded:
                c_id, c_sec = decoded.split(":", 1)
                client_id = c_id
                if not client_secret:
                    client_secret = c_sec
        except Exception:
            pass

    base_url = get_base_url(request)
    valid_token_audiences = [
        base_url,
        f"{base_url}/oauth/token",
        "https://mcp.kavachsecurity.me",
        "https://mcp.kavachsecurity.me/oauth/token",
        "https://kavachsecurity.me",
        "https://kavachsecurity.me/oauth/token",
    ]
    kid, priv_pem, _ = await ensure_signing_keys_loaded(db)
    client_ip = request.client.host if request.client else None
    user_agent = (request.headers.get("user-agent") or "")[:500] or None

    # 1. Authorization Code Grant with PKCE S256
    if grant_type == "authorization_code":
        if not code or not code_verifier or not client_id or not redirect_uri:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_request",
                    "error_description": "Parameters 'code', 'code_verifier', 'client_id', and 'redirect_uri' are required.",
                },
            )

        code_record = (
            await db.execute(select(OAuthAuthorizationCode).where(OAuthAuthorizationCode.code == code))
        ).scalar_one_or_none()
        if not code_record:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Invalid authorization code."},
            )

        # Replay detection: revoke all tokens previously minted from this code
        if code_record.is_used:
            await db.execute(
                update(OAuthToken)
                .where(OAuthToken.authorization_code_id == code_record.id)
                .values(is_revoked=True)
            )
            await AuditService(db).log_event(
                action="OAUTH_CODE_REPLAY_DETECTED",
                resource_type="oauth_authorization_code",
                actor_type="system",
                actor_id=client_id,
                resource_id=str(code_record.id),
                status="FAILURE",
                metadata={"client_id": client_id, "user_id": str(code_record.user_id)},
            )
            await db.commit()
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_grant",
                    "error_description": "Authorization code already consumed; issued tokens have been revoked.",
                },
            )

        if code_record.expires_at and ensure_utc(code_record.expires_at) < datetime.now(timezone.utc):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Authorization code has expired."},
            )

        if code_record.client_id != client_id:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Client ID mismatch."},
            )

        if code_record.redirect_uri.rstrip("/") != redirect_uri.rstrip("/"):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Redirect URI mismatch."},
            )

        if resource_param and code_record.resource:
            if resource_param.strip().rstrip("/").lower() != code_record.resource.strip().rstrip("/").lower():
                return JSONResponse(
                    status_code=400,
                    content={"error": "invalid_target", "error_description": "Resource parameter mismatch."},
                )

        if not verify_pkce(code_verifier, code_record.code_challenge, code_record.code_challenge_method):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "PKCE code_verifier verification failed."},
            )

        client = await _resolve_oauth_client(code_record.client_id, db)
        if not client:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_client", "error_description": "OAuth client is inactive or unknown."},
            )

        auth_err = await _authenticate_client(
            client,
            client_secret,
            auth_header,
            params=params,
            valid_audiences=valid_token_audiences,
        )
        if auth_err:
            return auth_err

        # Atomic single-use update
        consume_res = await db.execute(
            update(OAuthAuthorizationCode)
            .where(OAuthAuthorizationCode.id == code_record.id, OAuthAuthorizationCode.is_used == False)
            .values(is_used=True)
        )
        if consume_res.rowcount != 1:
            await db.execute(
                update(OAuthToken)
                .where(OAuthToken.authorization_code_id == code_record.id)
                .values(is_revoked=True)
            )
            await db.commit()
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Authorization code already consumed."},
            )
        await db.commit()

        user = await db.get(User, code_record.user_id)
        if not user or not user.is_active:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "User account is unavailable."},
            )

        res_ctx = await resolve_project_context(
            user=user,
            db=db,
            client_id=client.client_id,
            token_org_id=code_record.organization_id,
            token_workspace_id=code_record.workspace_id,
            token_project_id=code_record.project_id,
        )
        target_project = res_ctx.project
        target_project_id = target_project.id if target_project else code_record.project_id
        target_org_id = code_record.organization_id or (target_project.organization_id if target_project else None)
        target_ws_id = code_record.workspace_id or (target_project.workspace_id if target_project else None)
        audience = code_record.resource or f"{base_url}/mcp"

        access_ttl = timedelta(seconds=settings.oauth_access_token_ttl_seconds)
        access_token = create_oauth_access_token(
            user_id=user.id,
            client_id=client.client_id,
            scope=code_record.scope,
            audience=audience,
            issuer=base_url,
            expires_delta=access_ttl,
            project_id=target_project_id,
            org_id=target_org_id,
            workspace_id=target_ws_id,
            private_key_pem=priv_pem,
            kid=kid,
        )

        refresh_token = f"kavach_rf_{secrets.token_urlsafe(32)}"
        refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.oauth_refresh_token_ttl_days)
        token_hash = hashlib.sha256(access_token.encode()).hexdigest()

        token_record = OAuthToken(
            access_token_hash=token_hash,
            refresh_token_hash=refresh_hash,
            authorization_code_id=code_record.id,
            token_family_id=uuid.uuid4(),
            client_id=client.client_id,
            client_name=client.client_name,
            user_id=user.id,
            organization_id=target_org_id,
            workspace_id=target_ws_id,
            project_id=target_project_id,
            resource=audience,
            scope=code_record.scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + access_ttl,
            refresh_token_expires_at=refresh_expires_at,
            last_used_at=datetime.now(timezone.utc),
            user_agent=user_agent,
            ip_address=client_ip,
        )
        db.add(token_record)
        await db.commit()

        await AuditService(db).log_event(
            action="OAUTH_TOKEN_ISSUED",
            resource_type="oauth_token",
            actor_type="user",
            actor_id=str(user.id),
            resource_id=token_hash[:12],
            organization_id=target_org_id,
            workspace_id=target_ws_id,
            project_id=target_project_id,
            status="SUCCESS",
            metadata={
                "client_id": client.client_id,
                "client_name": client.client_name,
                "grant_type": "authorization_code",
                "scope": code_record.scope,
                "project_id": str(target_project_id) if target_project_id else None,
            },
        )
        await db.commit()

        response_body: Dict[str, Any] = {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": int(access_ttl.total_seconds()),
            "refresh_token": refresh_token,
            "scope": code_record.scope,
        }
        if "openid" in set(code_record.scope.split()):
            response_body["id_token"] = create_oidc_id_token(
                user=user,
                client_id=client.client_id,
                issuer=base_url,
                nonce=code_record.nonce,
                scope=code_record.scope,
                org_id=target_org_id,
                workspace_id=target_ws_id,
                project_id=target_project_id,
                private_key_pem=priv_pem,
                kid=kid,
            )
        if target_project:
            response_body["project_id"] = str(target_project.id)
            response_body["project_name"] = target_project.name
        return JSONResponse(status_code=200, content=response_body)

    # 2. Refresh Token Grant with Rotation & Reuse Family Revocation
    elif grant_type == "refresh_token":
        if not refresh_token_param:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_request", "error_description": "Missing 'refresh_token' parameter."},
            )

        refresh_hash = hashlib.sha256(refresh_token_param.encode()).hexdigest()
        token_rec = (
            await db.execute(select(OAuthToken).where(OAuthToken.refresh_token_hash == refresh_hash))
        ).scalar_one_or_none()
        if not token_rec:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Invalid refresh token."},
            )

        # Reuse detection: if a rotated/revoked refresh token is replayed, revoke entire token family
        if token_rec.is_revoked:
            await db.execute(
                update(OAuthToken)
                .where(OAuthToken.token_family_id == token_rec.token_family_id)
                .values(is_revoked=True)
            )
            await AuditService(db).log_event(
                action="OAUTH_REFRESH_REUSE_DETECTED",
                resource_type="oauth_token",
                actor_type="user",
                actor_id=str(token_rec.user_id),
                resource_id=str(token_rec.token_family_id),
                status="FAILURE",
                metadata={"client_id": token_rec.client_id},
            )
            await db.commit()
            return JSONResponse(
                status_code=400,
                content={
                    "error": "invalid_grant",
                    "error_description": "Refresh token reuse detected; token family revoked.",
                },
            )

        if token_rec.refresh_token_expires_at and ensure_utc(token_rec.refresh_token_expires_at) < datetime.now(timezone.utc):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token has expired."},
            )

        if client_id and token_rec.client_id != client_id:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Client ID mismatch."},
            )

        client = await _resolve_oauth_client(token_rec.client_id, db)
        if not client:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_client", "error_description": "OAuth client is inactive."},
            )
        auth_err = await _authenticate_client(
            client,
            client_secret,
            auth_header,
            params=params,
            valid_audiences=valid_token_audiences,
        )
        if auth_err:
            return auth_err

        # Atomic revocation of consumed refresh token
        revoke_res = await db.execute(
            update(OAuthToken)
            .where(OAuthToken.id == token_rec.id, OAuthToken.is_revoked == False)
            .values(is_revoked=True)
        )
        if revoke_res.rowcount != 1:
            await db.execute(
                update(OAuthToken)
                .where(OAuthToken.token_family_id == token_rec.token_family_id)
                .values(is_revoked=True)
            )
            await db.commit()
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "Refresh token already rotated."},
            )
        await db.commit()

        user = await db.get(User, token_rec.user_id)
        if not user or not user.is_active:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_grant", "error_description": "User account is unavailable."},
            )

        res_ctx = await resolve_project_context(
            user=user,
            db=db,
            client_id=token_rec.client_id,
            token_org_id=token_rec.organization_id,
            token_workspace_id=token_rec.workspace_id,
            token_project_id=token_rec.project_id,
        )
        target_project = res_ctx.project
        target_project_id = target_project.id if target_project else token_rec.project_id
        target_org_id = token_rec.organization_id or (target_project.organization_id if target_project else None)
        target_ws_id = token_rec.workspace_id or (target_project.workspace_id if target_project else None)
        audience = token_rec.resource or f"{base_url}/mcp"

        # Support scope down-scoping on refresh per RFC 6749 §6
        requested_refresh_scope = params.get("scope")
        effective_scope = token_rec.scope
        if requested_refresh_scope:
            orig_set = set(token_rec.scope.split())
            req_list = [s for s in str(requested_refresh_scope).split() if s in orig_set]
            if not req_list:
                return JSONResponse(
                    status_code=400,
                    content={"error": "invalid_scope", "error_description": "Requested scope exceeds original grant."},
                )
            effective_scope = " ".join(req_list)

        access_ttl = timedelta(seconds=settings.oauth_access_token_ttl_seconds)
        new_access_token = create_oauth_access_token(
            user_id=user.id,
            client_id=token_rec.client_id,
            scope=effective_scope,
            audience=audience,
            issuer=base_url,
            expires_delta=access_ttl,
            project_id=target_project_id,
            org_id=target_org_id,
            workspace_id=target_ws_id,
            private_key_pem=priv_pem,
            kid=kid,
        )
        new_refresh_token = f"kavach_rf_{secrets.token_urlsafe(32)}"
        new_token_record = OAuthToken(
            access_token_hash=hashlib.sha256(new_access_token.encode()).hexdigest(),
            refresh_token_hash=hashlib.sha256(new_refresh_token.encode()).hexdigest(),
            authorization_code_id=token_rec.authorization_code_id,
            token_family_id=token_rec.token_family_id,
            parent_token_id=token_rec.id,
            client_id=token_rec.client_id,
            client_name=client.client_name,
            user_id=token_rec.user_id,
            organization_id=target_org_id,
            workspace_id=target_ws_id,
            project_id=target_project_id,
            resource=audience,
            scope=effective_scope,
            token_type="Bearer",
            is_revoked=False,
            access_token_expires_at=datetime.now(timezone.utc) + access_ttl,
            refresh_token_expires_at=datetime.now(timezone.utc) + timedelta(days=settings.oauth_refresh_token_ttl_days),
            last_used_at=datetime.now(timezone.utc),
            user_agent=user_agent,
            ip_address=client_ip,
        )
        db.add(new_token_record)
        await db.commit()

        refresh_res: Dict[str, Any] = {
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": int(access_ttl.total_seconds()),
            "refresh_token": new_refresh_token,
            "scope": effective_scope,
        }
        if target_project:
            refresh_res["project_id"] = str(target_project.id)
            refresh_res["project_name"] = target_project.name
        return JSONResponse(status_code=200, content=refresh_res)

    return JSONResponse(
        status_code=400,
        content={
            "error": "unsupported_grant_type",
            "error_description": f"Grant type '{grant_type}' is not supported. Use 'authorization_code' or 'refresh_token'.",
        },
    )


# ── OpenID Connect UserInfo & RFC 7009 Revocation ──


@router.get("/oauth/userinfo")
@router.post("/oauth/userinfo")
async def oauth_userinfo_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """OIDC Core 1.0 UserInfo endpoint respecting token scopes and org/project isolation."""
    auth_header = request.headers.get("authorization", "")
    token_claims: Dict[str, Any] = {}
    if auth_header.startswith("Bearer "):
        claims, _ = await verify_jwt_with_db_jwks(auth_header.replace("Bearer ", "").strip(), db)
        if claims:
            token_claims = claims

    scopes = set(str(token_claims.get("scope", "openid profile email projects:read")).split())
    scoped_org_id = None
    if token_claims.get("org_id"):
        try:
            scoped_org_id = uuid.UUID(str(token_claims["org_id"]))
        except ValueError:
            pass

    res: Dict[str, Any] = {"sub": str(current_user.id)}
    if "profile" in scopes or "openid" in scopes:
        res["name"] = current_user.name or current_user.email
        res["picture"] = current_user.avatar_url
        res["preferred_username"] = current_user.email
    if "email" in scopes:
        res["email"] = current_user.email
        res["email_verified"] = bool(current_user.is_verified)

    if "projects:read" in scopes:
        projects = await get_accessible_projects(current_user, db, org_id=scoped_org_id)
        ctx_res = await resolve_project_context(
            user=current_user,
            db=db,
            client_id=token_claims.get("client_id"),
            token_org_id=scoped_org_id,
        )
        if ctx_res.project:
            res["project_id"] = str(ctx_res.project.id)
            res["project_name"] = ctx_res.project.name
        if scoped_org_id:
            res["org_id"] = str(scoped_org_id)
        res["projects"] = [
            {
                "id": str(p.id),
                "name": p.name,
                "environment": p.environment,
                "repository_url": p.repository_url,
            }
            for p in projects
        ]
    return res


@router.post("/oauth/revoke")
async def oauth_revoke_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """OAuth 2.0 Token Revocation (RFC 7009). Revokes matching token and family if refresh token."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        params = await request.json()
    else:
        form_data = await request.form()
        params = dict(form_data)

    token = params.get("token")
    if token:
        token_hash = hashlib.sha256(str(token).encode()).hexdigest()
        rec = (
            await db.execute(
                select(OAuthToken).where(
                    (OAuthToken.access_token_hash == token_hash)
                    | (OAuthToken.refresh_token_hash == token_hash)
                )
            )
        ).scalar_one_or_none()
        if rec:
            if rec.refresh_token_hash == token_hash:
                await db.execute(
                    update(OAuthToken)
                    .where(OAuthToken.token_family_id == rec.token_family_id)
                    .values(is_revoked=True)
                )
            else:
                rec.is_revoked = True
                db.add(rec)
            await db.commit()

    return Response(status_code=200)


# ── Authenticated MCP Connections & Workspace/Project Preferences Dashboard APIs ──


@router.get("/oauth/connections")
async def list_oauth_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns real connected MCP clients, tokens, workspaces, projects, default project,
    security controls status, and recent MCP tool audit events for the signed-in user.
    """
    orgs, workspaces = await ensure_user_workspace_provisioned(current_user, db)
    projects = await get_accessible_projects(current_user, db)
    proj_map = {p.id: p for p in projects}
    ws_map = {w.id: w for w in workspaces}

    tokens = list(
        (
            await db.execute(
                select(OAuthToken)
                .where(OAuthToken.user_id == current_user.id)
                .order_by(desc(OAuthToken.created_at))
            )
        )
        .scalars()
        .all()
    )
    contexts = list(
        (await db.execute(select(MCPClientContext).where(MCPClientContext.user_id == current_user.id)))
        .scalars()
        .all()
    )
    ctx_by_client = {c.client_id: c for c in contexts}

    client_ids = list({t.client_id for t in tokens} | set(ctx_by_client.keys()))
    client_rows: Dict[str, OAuthClient] = {}
    if client_ids:
        c_res = (await db.execute(select(OAuthClient).where(OAuthClient.client_id.in_(client_ids)))).scalars().all()
        client_rows = {c.client_id: c for c in c_res}

    now = datetime.now(timezone.utc)
    grouped: Dict[str, Dict[str, Any]] = {}
    for cid in client_ids:
        c_tokens = [t for t in tokens if t.client_id == cid]
        active_tokens = [
            t
            for t in c_tokens
            if not t.is_revoked
            and (
                (t.refresh_token_expires_at and ensure_utc(t.refresh_token_expires_at) > now)
                or ensure_utc(t.access_token_expires_at) > now
            )
        ]
        if not active_tokens and not c_tokens:
            continue

        latest = active_tokens[0] if active_tokens else c_tokens[0]
        c_meta = client_rows.get(cid)
        c_ctx = ctx_by_client.get(cid)
        active_pid = (c_ctx.active_project_id if c_ctx else None) or latest.project_id or getattr(current_user, "default_project_id", None)
        active_proj = proj_map.get(active_pid) if active_pid else None
        active_ws = ws_map.get(active_proj.workspace_id) if (active_proj and active_proj.workspace_id) else None

        grouped[cid] = {
            "client_id": cid,
            "client_name": (c_meta.client_name if c_meta else None) or latest.client_name or cid,
            "client_type": c_meta.client_type if c_meta else "dynamic",
            "client_uri": c_meta.client_uri if c_meta else None,
            "is_verified": bool(c_meta.is_verified) if c_meta else False,
            "status": "ACTIVE" if active_tokens else "REVOKED",
            "active_tokens_count": len(active_tokens),
            "scopes": [s for s in latest.scope.split() if s],
            "active_project": (
                {"id": str(active_proj.id), "name": active_proj.name, "repository_url": active_proj.repository_url}
                if active_proj
                else None
            ),
            "workspace": {"id": str(active_ws.id), "name": active_ws.name} if active_ws else None,
            "matched_git_remote": c_ctx.matched_git_remote if c_ctx else None,
            "connected_at": c_tokens[-1].created_at.isoformat() if c_tokens and c_tokens[-1].created_at else None,
            "last_used_at": (
                max((t.last_used_at or t.created_at for t in c_tokens), default=None).isoformat()
                if c_tokens
                else None
            ),
            "expires_at": (
                ensure_utc(latest.refresh_token_expires_at or latest.access_token_expires_at).isoformat()
                if (latest.refresh_token_expires_at or latest.access_token_expires_at)
                else None
            ),
        }

    # Fetch recent real MCP audit events for this user
    audit_stmt = (
        select(AuditEvent)
        .where(
            AuditEvent.actor_id == str(current_user.id),
            or_(
                AuditEvent.action.like("MCP_%"),
                AuditEvent.action.like("OAUTH_%"),
            ),
        )
        .order_by(desc(AuditEvent.timestamp))
        .limit(25)
    )
    audit_rows = list((await db.execute(audit_stmt)).scalars().all())

    default_pid = str(current_user.default_project_id) if getattr(current_user, "default_project_id", None) else (
        str(projects[0].id) if projects else None
    )
    default_ws_id = str(current_user.default_workspace_id) if getattr(current_user, "default_workspace_id", None) else (
        str(workspaces[0].id) if workspaces else None
    )

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "auth_provider": current_user.auth_provider,
            "default_workspace_id": default_ws_id,
            "default_project_id": default_pid,
        },
        "connected_clients": list(grouped.values()),
        "active_clients_count": sum(1 for c in grouped.values() if c["status"] == "ACTIVE"),
        "organizations": [{"id": str(o.id), "name": o.name, "slug": o.slug} for o in orgs],
        "workspaces": [
            {
                "id": str(w.id),
                "name": w.name,
                "workspace_type": w.workspace_type,
                "organization_id": str(w.organization_id) if w.organization_id else None,
            }
            for w in workspaces
        ],
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "workspace_id": str(p.workspace_id) if p.workspace_id else None,
                "organization_id": str(p.organization_id) if p.organization_id else None,
                "repository_url": p.repository_url,
                "environment": p.environment,
                "is_default": str(p.id) == default_pid,
            }
            for p in projects
        ],
        "security_controls": {
            "oauth_authentication": {"enabled": True, "standard": "OAuth 2.1 + PKCE (S256) + RS256 JWKS"},
            "project_isolation": {"enabled": True, "mode": "Tenant & Organization Scoped"},
            "opa_policy_enforcement": {"enabled": True, "engine": "Kavach Policy & OPA Guardrails"},
            "audit_logging": {"enabled": True, "backend": "PostgreSQL/SQLite Immutable Audit Trail"},
        },
        "recent_activity": [
            {
                "id": str(ev.id),
                "action": ev.action,
                "resource_type": ev.resource_type,
                "resource_id": ev.resource_id,
                "status": ev.status,
                "metadata": ev.event_metadata or {},
                "created_at": ev.timestamp.isoformat() if ev.timestamp else None,
            }
            for ev in audit_rows
        ],
    }


class DisconnectOAuthClientPayload(BaseModel):
    client_id: str


async def _revoke_client_tokens(
    client_id: str,
    current_user: User,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Revokes all active tokens for a single MCP client without affecting other clients."""
    clean_client_id = client_id.strip()
    if not clean_client_id:
        raise HTTPException(status_code=400, detail="client_id is required")

    res = await db.execute(
        update(OAuthToken)
        .where(
            OAuthToken.user_id == current_user.id,
            OAuthToken.client_id == clean_client_id,
            OAuthToken.is_revoked == False,
        )
        .values(is_revoked=True)
    )
    revoked_count = res.rowcount or 0
    await AuditService(db).log_event(
        action="OAUTH_CLIENT_DISCONNECTED",
        resource_type="oauth_client",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=clean_client_id,
        status="SUCCESS",
        metadata={"client_id": clean_client_id, "revoked_tokens": revoked_count},
    )
    await db.commit()
    return {
        "status": "DISCONNECTED",
        "client_id": clean_client_id,
        "revoked_tokens": revoked_count,
    }


@router.post("/oauth/connections/disconnect")
async def disconnect_oauth_client_post(
    payload: DisconnectOAuthClientPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revokes all tokens for a single MCP client via JSON body (safe for HTTPS URL CIMD client IDs)."""
    return await _revoke_client_tokens(payload.client_id, current_user, db)


@router.delete("/oauth/connections/{client_id:path}")
async def disconnect_oauth_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revokes all tokens for a single MCP client without affecting other connected AI clients."""
    return await _revoke_client_tokens(client_id, current_user, db)


class UpdateMCPPreferencesPayload(BaseModel):
    default_workspace_id: Optional[str] = None
    default_project_id: Optional[str] = None
    client_id: Optional[str] = None
    client_project_id: Optional[str] = None


@router.patch("/oauth/preferences")
async def update_mcp_preferences(
    payload: UpdateMCPPreferencesPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates user's default workspace/project or a specific client's active project."""
    _, ws_map, _ = await get_user_org_and_workspace_scope(current_user, db)

    if payload.default_workspace_id:
        try:
            ws_uuid = uuid.UUID(payload.default_workspace_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid default_workspace_id")
        if ws_uuid not in ws_map and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        current_user.default_workspace_id = ws_uuid

    if payload.default_project_id:
        try:
            proj_uuid = uuid.UUID(payload.default_project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid default_project_id")
        proj = await db.get(Project, proj_uuid)
        if not proj or not await user_can_access_project(current_user, proj, db):
            raise HTTPException(status_code=403, detail="Access denied to project")
        current_user.default_project_id = proj.id
        if proj.workspace_id:
            current_user.default_workspace_id = proj.workspace_id

    if payload.client_id and payload.client_project_id:
        try:
            cp_uuid = uuid.UUID(payload.client_project_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid client_project_id")
        proj = await db.get(Project, cp_uuid)
        if not proj or not await user_can_access_project(current_user, proj, db):
            raise HTTPException(status_code=403, detail="Access denied to project")
        await set_client_active_project(user=current_user, client_id=payload.client_id, project=proj, db=db)

    db.add(current_user)
    await db.commit()
    return {
        "status": "UPDATED",
        "default_workspace_id": str(current_user.default_workspace_id) if current_user.default_workspace_id else None,
        "default_project_id": str(current_user.default_project_id) if current_user.default_project_id else None,
    }
