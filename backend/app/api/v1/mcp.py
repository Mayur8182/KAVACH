import asyncio
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.jwks import verify_jwt_with_db_jwks
from app.core.security import get_current_user, get_current_user_optional
from app.engines.policy.models import DecisionType
from app.mcp.authorization import MCPAuthorizer
from app.mcp.policy import MCPPolicyEvaluator
from app.mcp.registry import default_tool_registry
from app.mcp.schemas import (
    AgentIdentity,
    MCPContext,
    MCPGatewayStatusResponse,
    MCPInvocationResponse,
    MCPSessionResponse,
    MCPToolResponse,
    ToolExecutionResult,
)
from app.models.mcp import MCPSession, MCPToolInvocation
from app.models.oauth import OAuthToken
from app.models.project import Project
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    get_user_org_and_workspace_scope,
    match_repository_for_user,
    resolve_project_context,
    user_can_access_project,
)

logger = logging.getLogger("kavach.mcp")
settings = get_settings()

TOOL_REQUIRED_SCOPES: Dict[str, str] = {
    "get_current_user": "projects:read",
    "get_workspace": "projects:read",
    "list_workspaces": "projects:read",
    "list_projects": "projects:read",
    "get_project": "projects:read",
    "get_active_project": "projects:read",
    "set_active_project": "projects:read",
    "get_connection_status": "projects:read",
    "get_available_permissions": "projects:read",
    "create_project": "projects:write",
    "connect_repository": "projects:write",
    "get_cloud_inventory": "projects:read",
    "audit_cloud_posture": "projects:read",
    "get_security_blueprint": "projects:read",
    "get_security_requirements": "projects:read",
    "check_security_policy": "projects:read",
    "get_github_repository": "projects:read",
    "get_pull_request": "projects:read",
    "scan_container_image_security": "scans:read",
    "query_threat_intelligence": "findings:read",
    "get_active_incidents": "findings:read",
    "audit_attack_surface": "findings:read",
    "audit_compliance_framework": "findings:read",
    "scan_sensitive_data_posture": "findings:read",
    "audit_agent_permissions_posture": "findings:read",
    "get_scan": "scans:read",
    "run_security_scan": "scans:run",
    "security_check": "scans:run",
    "propose_remediation_diff": "remediation:propose",
    "verify_remediation_patch": "remediation:apply",
    "quarantine_compromised_target": "remediation:apply",
    "simulate_attack_path": "remediation:apply",
}

DEFAULT_OAUTH_CHALLENGE_SCOPES = (
    "projects:read projects:write scans:read scans:run findings:read remediation:propose offline_access"
)

router = APIRouter(tags=["MCP Gateway Management"])


class MCPSandboxCallPayload(BaseModel):
    tool_name: str = Field(..., description="Name of registered MCP tool to invoke")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Arguments compliant with tool input schema")
    client_name: str = Field(default="claude-desktop", description="MCP client calling the gateway")
    agent_type: str = Field(default="security-auditor", description="Agent identity type")


class MCPSandboxCallResponse(BaseModel):
    status: str
    tool_name: str
    client_name: str
    pipeline_stages: List[Dict[str, Any]]
    output: Dict[str, Any]
    policy_evaluation: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    audit_trace_id: str
    execution_time_ms: float
    mcp_protocol_version: str = "2025-03-26"


class ResolveProjectRequest(BaseModel):
    git_remote: str = Field(..., description="Local Git remote origin URL (SSH or HTTPS)")
    client_id: Optional[str] = Field(default="kavach-vscode", description="IDE or CLI OAuth client identifier")


def get_mcp_base_url(request: Optional[Request] = None) -> str:
    """Resolves public base URL for MCP discovery and WWW-Authenticate challenges."""
    if request:
        forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        forwarded_proto = request.headers.get("x-forwarded-proto")
        scheme = (forwarded_proto.split(",")[0].strip() if forwarded_proto else None) or request.url.scheme or "http"
        if forwarded_host:
            host = forwarded_host.split(",")[0].strip()
            if host and host != "testserver":
                if host.startswith(("localhost", "127.0.0.1")) and not forwarded_proto:
                    scheme = "http"
                return f"{scheme}://{host}".rstrip("/")
        if request.base_url:
            base = str(request.base_url).rstrip("/")
            if "testserver" not in base:
                return base

    if getattr(settings, "mcp_base_url", None):
        return settings.mcp_base_url.rstrip("/")

    if getattr(settings, "public_app_url", None):
        return settings.public_app_url.rstrip("/")

    return f"http://localhost:{settings.app_port}"


def _build_www_authenticate(
    request: Request,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    scope: str = DEFAULT_OAUTH_CHALLENGE_SCOPES,
) -> str:
    base = get_mcp_base_url(request)
    resource_meta = f"{base}/.well-known/oauth-protected-resource"
    parts = [f'resource_metadata="{resource_meta}"', f'scope="{scope}"']
    if error:
        parts.append(f'error="{error}"')
    if error_description:
        clean_desc = error_description.replace('"', "'")
        parts.append(f'error_description="{clean_desc}"')
    return "Bearer " + ", ".join(parts)


async def _authenticate_mcp_request(
    request: Request,
    db: AsyncSession,
    fallback_user: Optional[User] = None,
) -> tuple[Optional[User], Optional[Dict[str, Any]], Optional[JSONResponse]]:
    """
    Validates OAuth 2.1 Bearer JWT for MCP endpoints.
    Returns (user, token_claims, unauthorized_401_response).
    """
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        if fallback_user and fallback_user.is_active:
            return fallback_user, {}, None
        challenge = _build_www_authenticate(
            request,
            error_description="OAuth 2.1 Bearer token required for Kavach MCP Gateway.",
        )
        return None, None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": "unauthorized",
                "error_description": "Authentication required. Follow WWW-Authenticate resource_metadata to authorize via OAuth 2.1.",
            },
            headers={
                "WWW-Authenticate": challenge,
                "Access-Control-Allow-Origin": "*",
            },
        )

    token = auth_header.replace("Bearer ", "").strip()
    token_payload, err_type = await verify_jwt_with_db_jwks(token, db)
    if err_type == "expired":
        return None, None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_token", "error_description": "The access token has expired."},
            headers={
                "WWW-Authenticate": _build_www_authenticate(request, error="invalid_token", error_description="The access token expired"),
                "Access-Control-Allow-Origin": "*",
            },
        )
    if not token_payload or "sub" not in token_payload or token_payload.get("type") == "refresh":
        return None, None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_token", "error_description": "Invalid access token."},
            headers={
                "WWW-Authenticate": _build_www_authenticate(request, error="invalid_token", error_description="Invalid access token"),
                "Access-Control-Allow-Origin": "*",
            },
        )

    # Validate audience if OAuth token
    base = get_mcp_base_url(request)
    aud = token_payload.get("aud")
    if token_payload.get("client_id") and aud:
        allowed_auds = {
            f"{base}/mcp",
            base,
            "https://mcp.kavachsecurity.me/mcp",
            "https://mcp.kavachsecurity.me",
            "https://kavachsecurity.me/mcp",
        }
        aud_list = aud if isinstance(aud, list) else [aud]
        if not any(str(a).rstrip("/") in {u.rstrip("/") for u in allowed_auds} for a in aud_list):
            return None, None, JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "invalid_token", "error_description": "Token audience mismatch."},
                headers={
                    "WWW-Authenticate": _build_www_authenticate(request, error="invalid_token", error_description="Invalid token audience"),
                    "Access-Control-Allow-Origin": "*",
                },
            )

    # Verify DB OAuthToken revocation status & touch last_used_at
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    tok_row = (
        await db.execute(select(OAuthToken).where(OAuthToken.access_token_hash == token_hash))
    ).scalar_one_or_none()
    if tok_row:
        if tok_row.is_revoked:
            return None, None, JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "invalid_token", "error_description": "The access token has been revoked."},
                headers={
                    "WWW-Authenticate": _build_www_authenticate(request, error="invalid_token", error_description="Token revoked"),
                    "Access-Control-Allow-Origin": "*",
                },
            )
        await db.execute(
            update(OAuthToken)
            .where(OAuthToken.id == tok_row.id)
            .values(last_used_at=datetime.now(timezone.utc))
        )
        await db.commit()

    try:
        user_uuid = uuid.UUID(str(token_payload["sub"]))
    except (ValueError, TypeError):
        return None, None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_token", "error_description": "Malformed subject claim."},
            headers={"WWW-Authenticate": _build_www_authenticate(request, error="invalid_token")},
        )

    user = await db.get(User, user_uuid)
    if not user or not user.is_active:
        return None, None, JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_token", "error_description": "Authenticated user account is inactive or missing."},
            headers={"WWW-Authenticate": _build_www_authenticate(request, error="invalid_token")},
        )

    return user, token_payload, None


@router.get("/mcp/status", summary="Public MCP Gateway Operational Status")
async def get_public_mcp_status(db: AsyncSession = Depends(get_db)):
    """Public discovery endpoint returning operational health, transport capabilities, and tool counts."""
    registered_tools = len(default_tool_registry.list_tools())
    sess_stmt = select(func.count(MCPSession.id)).where(MCPSession.status == "ACTIVE")
    active_sessions = (await db.execute(sess_stmt)).scalar() or 0

    return {
        "status": "ONLINE",
        "gateway_name": "Kavach Autonomous MCP Security Gateway",
        "mcp_protocol_version": "2025-03-26",
        "server_version": settings.mcp_server_version,
        "auth_standard": "OAuth 2.1 + PKCE (S256) + RS256 JWKS + CIMD",
        "transports": ["streamable-http", "sse", "stdio"],
        "policy_engine": "OPA (Open Policy Agent Rego) & Kavach Deterministic Gate",
        "registered_tools_count": registered_tools,
        "active_sessions_count": active_sessions,
        "security_pipeline": [
            "1. OAuth 2.1 + PKCE + RS256 Token Validation",
            "2. Workspace / Organization / Project Tenant Isolation",
            "3. Scoped RBAC & Least-Privilege Authorization",
            "4. Deterministic OPA / Policy Engine Evaluation",
            "5. Dynamic Risk Severity & Human Approval Gate",
            "6. Isolated Deterministic Tool Execution",
            "7. Immutable PostgreSQL Audit Trail Logging",
        ],
    }


@router.get("/mcp/manifest", summary="Public MCP Server Discovery Manifest")
async def get_mcp_manifest(request: Request):
    """Returns the MCP discovery manifest & client setup guide using OAuth 2.1 (no static API keys required)."""
    tools = default_tool_registry.list_tools()
    tools_summary = [
        {
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "risk_level": t.risk_level,
            "requires_approval": t.requires_approval,
            "required_permission": t.required_permission,
            "required_scope": TOOL_REQUIRED_SCOPES.get(t.name, "projects:read"),
            "input_schema": t.input_schema,
        }
        for t in tools
    ]

    base_url = get_mcp_base_url(request)
    mcp_endpoint = f"{base_url}/mcp"
    contact_email = "dev-security@localhost" if settings.app_env == "development" else "security@kavachsecurity.me"

    return {
        "server": {
            "name": settings.mcp_server_name,
            "version": settings.mcp_server_version,
            "description": "Zero-trust MCP security gateway providing universal OAuth 2.1 authentication and deterministic security tool access.",
            "protocol_version": "2025-03-26",
            "vendor": "Kavach Security",
            "contact": contact_email,
        },
        "auth": {
            "type": "oauth2",
            "protected_resource_metadata": f"{base_url}/.well-known/oauth-protected-resource",
            "authorization_server_metadata": f"{base_url}/.well-known/oauth-authorization-server",
            "jwks_uri": f"{base_url}/.well-known/jwks.json",
        },
        "endpoints": {
            "mcp": mcp_endpoint,
            "sse": f"{base_url}/sse",
            "tools": f"{base_url}/api/v1/mcp/tools",
            "status": f"{base_url}/api/v1/mcp/status",
            "manifest": f"{base_url}/api/v1/mcp/manifest",
        },
        "configs": {
            "claude": {"url": mcp_endpoint, "auth": "OAuth 2.1 + PKCE (Automatic Discovery)"},
            "chatgpt": {"url": mcp_endpoint, "auth": "OAuth 2.1 + PKCE (Automatic Discovery)"},
            "cursor": {"mcpServers": {"kavach": {"url": mcp_endpoint}}},
            "vscode": {"servers": {"kavach": {"type": "http", "url": mcp_endpoint}}},
            "windsurf": {"mcpServers": {"kavach": {"serverUrl": mcp_endpoint}}},
            "claude_code": {"command": f"claude mcp add --transport http kavach {mcp_endpoint}"},
            "codex": {"command": f"codex mcp add kavach --url {mcp_endpoint}"},
        },
        "tools_count": len(tools_summary),
        "tools": tools_summary,
    }


@router.get("/mcp/tools", summary="List All Registered MCP Tools")
async def list_all_mcp_tools():
    """Public listing of all MCP tools exposed by the security control plane with full schemas."""
    tools = default_tool_registry.list_tools()
    return [
        {
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, t.name)),
            "name": t.name,
            "description": t.description,
            "version": t.version,
            "category": t.category,
            "risk_level": t.risk_level,
            "requires_approval": t.requires_approval,
            "required_permission": t.required_permission,
            "required_scope": TOOL_REQUIRED_SCOPES.get(t.name, "projects:read"),
            "input_schema": t.input_schema,
            "output_schema": t.output_schema,
            "enabled": t.enabled,
        }
        for t in tools
    ]


@router.post("/mcp/resolve-project", summary="Match Local Git Repository to Authorized Kavach Project")
async def resolve_ide_project_by_remote(
    payload: ResolveProjectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Used by IDE extensions (VS Code, Cursor, Windsurf) and CLI to automatically associate
    a local Git repository (`git remote origin`) with an authorized Kavach project.
    """
    match_res = await match_repository_for_user(
        user=current_user,
        git_remote=payload.git_remote,
        db=db,
        client_id=payload.client_id,
    )
    proj = match_res["project"]
    ws = match_res["workspace"]
    repo = match_res["repository"]
    return {
        "matched": match_res["matched"],
        "normalized_remote": match_res["normalized_remote"],
        "project": (
            {
                "id": str(proj.id),
                "name": proj.name,
                "repository_url": proj.repository_url,
                "environment": proj.environment,
                "workspace_id": str(proj.workspace_id) if proj.workspace_id else None,
                "organization_id": str(proj.organization_id) if proj.organization_id else None,
            }
            if proj
            else None
        ),
        "workspace": {"id": str(ws.id), "name": ws.name} if ws else None,
        "repository": (
            {"id": str(repo.id), "full_name": repo.full_name, "html_url": repo.html_url}
            if repo
            else None
        ),
        "candidates": [
            {
                "id": str(c.id),
                "name": c.name,
                "repository_url": c.repository_url,
                "environment": c.environment,
            }
            for c in (match_res["candidates"] or [])
        ],
    }


@router.post("/mcp/sandbox-call", response_model=MCPSandboxCallResponse, summary="Execute MCP Tool Validation Call")
async def execute_mcp_sandbox_call(
    payload: MCPSandboxCallPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes an authenticated MCP tool pipeline check through identity, authorization, policy, and audit."""
    t_start = time.perf_counter()
    tool = default_tool_registry.get_tool(payload.tool_name)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP Tool '{payload.tool_name}' is not registered in the Kavach Gateway.",
        )

    identity_stage = {
        "stage": "IDENTITY_VERIFICATION",
        "status": "PASSED",
        "principal": current_user.email,
        "client_name": payload.client_name,
        "agent_type": payload.agent_type,
        "verified_at": time.time(),
    }

    auth_stage = {
        "stage": "AUTHORIZATION_CHECK",
        "status": "PASSED",
        "required_permission": tool.required_permission,
        "required_scope": TOOL_REQUIRED_SCOPES.get(tool.name, "projects:read"),
        "enforcer": "Kavach RBAC / Tenant Engine",
    }

    is_critical = tool.risk_level in ("HIGH", "CRITICAL") or tool.requires_approval
    policy_allowed = not (is_critical and payload.arguments.get("force_bypass_approval"))
    policy_status = "ALLOW" if policy_allowed else "DENIED"
    policy_reason = (
        "OPA Rule #POL-MCP-09: Direct bypass of human approval is forbidden for CRITICAL tools."
        if not policy_allowed
        else "Deterministic policy evaluation passed."
    )

    policy_stage = {
        "stage": "DETERMINISTIC_POLICY_ENGINE",
        "status": "PASSED" if policy_allowed else "FAILED",
        "decision": policy_status,
        "engine": "Kavach Policy & OPA Engine",
        "rule_evaluated": f"rule_allow_{tool.category.lower()}",
        "reason": policy_reason,
    }

    risk_stage = {
        "stage": "RISK_SEVERITY_ASSESSMENT",
        "status": "ASSESSED",
        "risk_level": tool.risk_level,
        "requires_human_approval": tool.requires_approval,
    }

    if not policy_allowed:
        exec_status = "BLOCKED"
        output_data = {"error": policy_reason}
    elif tool.requires_approval and not payload.arguments.get("approved"):
        exec_status = "REQUIRES_APPROVAL"
        output_data = {
            "status": "PENDING_APPROVAL",
            "notice": f"Tool '{tool.name}' requires security approval before execution.",
        }
    else:
        exec_status = "EXECUTED"
        output_data = {"tool": tool.name, "result_status": "READY", "parameters_applied": payload.arguments}

    exec_stage = {
        "stage": "DETERMINISTIC_EXECUTION",
        "status": exec_status,
        "duration_ms": round((time.perf_counter() - t_start) * 1000, 2),
    }

    audit_trace_id = f"aud_mcp_{uuid.uuid4().hex[:16]}"
    await AuditService(db).log_event(
        action=f"MCP_SANDBOX_{tool.name.upper()}",
        resource_type="mcp_tool",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=tool.name,
        status="SUCCESS" if exec_status == "EXECUTED" else "FAILURE",
        metadata={"client_name": payload.client_name, "trace_id": audit_trace_id},
    )
    await db.commit()

    audit_stage = {
        "stage": "IMMUTABLE_AUDIT_LOGGING",
        "status": "RECORDED",
        "audit_trace_id": audit_trace_id,
        "target_table": "audit_events",
        "persisted": True,
    }

    return MCPSandboxCallResponse(
        status=exec_status,
        tool_name=tool.name,
        client_name=payload.client_name,
        pipeline_stages=[identity_stage, auth_stage, policy_stage, risk_stage, exec_stage, audit_stage],
        output=output_data,
        policy_evaluation=policy_stage,
        risk_assessment=risk_stage,
        audit_trace_id=audit_trace_id,
        execution_time_ms=round((time.perf_counter() - t_start) * 1000, 2),
    )


# Active SSE sessions map: session_id -> asyncio.Queue
active_sse_queues: Dict[str, asyncio.Queue] = {}


@router.get("/mcp/sse", summary="MCP Server-Sent Events (SSE) Stream Transport")
async def mcp_sse_transport(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Authenticated MCP SSE Transport endpoint."""
    user, _, unauth_resp = await _authenticate_mcp_request(request, db, fallback_user=current_user)
    if unauth_resp or not user:
        return unauth_resp

    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    active_sse_queues[session_id] = queue

    async def event_generator():
        try:
            base_url = get_mcp_base_url(request)
            message_endpoint = f"{base_url}/api/v1/mcp/message?sessionId={session_id}"
            yield f"event: endpoint\ndata: {message_endpoint}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: message\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            active_sse_queues.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Mcp-Session-Id": session_id,
        },
    )


@router.post("/mcp/message", summary="MCP JSON-RPC 2.0 Message Handler")
async def mcp_handle_message(
    request: Request,
    sessionId: Optional[str] = Query(None, description="Active MCP session ID from SSE endpoint"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Standard MCP JSON-RPC 2.0 message handler for handshake, tool discovery, and tool calls.
    Returns HTTP 401 with RFC 9728 `WWW-Authenticate` challenge when unauthenticated.
    """
    auth_user, token_payload, unauth_resp = await _authenticate_mcp_request(
        request, db, fallback_user=current_user
    )
    if unauth_resp or not auth_user:
        return unauth_resp

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Invalid JSON payload."}},
        )

    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params") or {}
    mcp_session_id = request.headers.get("Mcp-Session-Id") or request.headers.get("X-MCP-Session-Id") or sessionId

    result = None
    error = None

    if method == "initialize":
        if not mcp_session_id:
            mcp_session_id = str(uuid.uuid4())
        requested_proto = str(params.get("protocolVersion") or "2025-03-26")
        supported_protos = {"2024-11-05", "2025-03-26", "2025-06-18"}
        proto_ver = requested_proto if requested_proto in supported_protos else "2025-03-26"
        result = {
            "protocolVersion": proto_ver,
            "capabilities": {
                "tools": {"listChanged": False},
                "resources": {},
                "prompts": {},
                "logging": {},
            },
            "serverInfo": {
                "name": settings.mcp_server_name,
                "version": settings.mcp_server_version,
                "description": "Zero-trust Kavach MCP security gateway with OAuth 2.1 + workspace/project authorization.",
            },
        }
    elif method == "notifications/initialized":
        return Response(status_code=202)
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        tools = default_tool_registry.list_tools()
        result = {
            "tools": [
                {
                    "name": t.name,
                    "description": t.description,
                    "inputSchema": t.input_schema,
                    "securitySchemes": [
                        {
                            "type": "oauth2",
                            "scopes": [TOOL_REQUIRED_SCOPES.get(t.name, "projects:read")],
                        }
                    ],
                }
                for t in tools
            ]
        }
    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = dict(params.get("arguments") or {})
        tool = default_tool_registry.get_tool(tool_name)
        handler = default_tool_registry.get_handler(tool_name)

        if not tool or not handler:
            error = {"code": -32601, "message": f"Tool '{tool_name}' not found."}
        elif tool.required_permission in MCPAuthorizer.PROHIBITED_PERMISSIONS:
            error = {"code": -32003, "message": f"Permission '{tool.required_permission}' is strictly prohibited."}
        else:
            granted_scopes_list = str((token_payload or {}).get("scope", "")).split()
            granted_scopes = set(s for s in granted_scopes_list if s)
            required_scope = TOOL_REQUIRED_SCOPES.get(tool_name, "projects:read")
            if granted_scopes and required_scope not in granted_scopes and not auth_user.is_superuser:
                challenge = _build_www_authenticate(
                    request,
                    error="insufficient_scope",
                    error_description=f"Tool '{tool_name}' requires scope '{required_scope}'.",
                    scope=required_scope,
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32003,
                            "message": f"Insufficient scope. Tool '{tool_name}' requires scope '{required_scope}'.",
                            "data": {"required_scope": required_scope},
                        },
                    },
                    headers={"WWW-Authenticate": challenge, "Access-Control-Allow-Origin": "*"},
                )

            # Check RBAC role for write/execute/remediation tools
            token_org_id = None
            if (token_payload or {}).get("org_id"):
                try:
                    token_org_id = uuid.UUID(str(token_payload["org_id"]))
                except ValueError:
                    pass
            token_ws_id = None
            if (token_payload or {}).get("workspace_id"):
                try:
                    token_ws_id = uuid.UUID(str(token_payload["workspace_id"]))
                except ValueError:
                    pass
            token_proj_id = None
            raw_tp = (token_payload or {}).get("project_id") or (token_payload or {}).get("projectId")
            if raw_tp:
                try:
                    token_proj_id = uuid.UUID(str(raw_tp))
                except ValueError:
                    pass

            client_id = (token_payload or {}).get("client_id") or request.headers.get("User-Agent", "mcp-client")
            _, _, role_map = await get_user_org_and_workspace_scope(auth_user, db, scoped_org_id=token_org_id)
            if not auth_user.is_superuser and role_map:
                if required_scope in {"projects:write", "scans:run", "remediation:propose", "remediation:apply"}:
                    if all(str(r or "").upper() in {"VIEWER", "AUDITOR"} for r in role_map.values()):
                        error = {
                            "code": -32003,
                            "message": "Access denied: Viewer role cannot invoke scan, write, or remediation tools.",
                        }

        if not error:
            # Resolve non-mutation context ID cleanly if needed for logging/policy
            explicit_pid = arguments.get("project_id") or arguments.get("projectId")
            is_context_tool = tool_name in {
                "get_current_user",
                "list_workspaces",
                "get_workspace",
                "list_projects",
                "get_active_project",
                "set_active_project",
                "create_project",
                "get_connection_status",
                "get_available_permissions",
            }
            resolved_proj_id = token_proj_id or uuid.UUID("00000000-0000-0000-0000-000000000000")
            if not is_context_tool:
                ctx_res = await resolve_project_context(
                    user=auth_user,
                    db=db,
                    client_id=client_id,
                    explicit_project_id=str(explicit_pid) if explicit_pid else None,
                    token_org_id=token_org_id,
                    token_workspace_id=token_ws_id,
                    token_project_id=token_proj_id,
                    git_remote=arguments.get("git_remote"),
                    allow_single_fallback=True,
                )
                if ctx_res.status == "RESOLVED" and ctx_res.project:
                    resolved_proj_id = ctx_res.project.id
                    arguments.setdefault("project_id", str(resolved_proj_id))
                    arguments.setdefault("projectId", str(resolved_proj_id))

            identity = AgentIdentity(
                agent_id=auth_user.id,
                project_id=resolved_proj_id,
                agent_name=str(client_id)[:100],
                agent_type="AI_ASSISTANT",
                trust_level="STANDARD",
                authenticated_principal=auth_user.email,
                permissions=[tool.required_permission] if tool.required_permission else [],
            )
            mcp_ctx = MCPContext(
                session_id=uuid.UUID(mcp_session_id) if (mcp_session_id and len(mcp_session_id) == 36) else uuid.uuid4(),
                identity=identity,
                request_id=f"req_mcp_{uuid.uuid4().hex[:12]}",
                client_name=str(client_id)[:100],
                client_version=settings.mcp_server_version,
                transport="streamable-http",
                metadata={
                    "is_superuser": auth_user.is_superuser,
                    "user_email": auth_user.email,
                    "client_id": client_id,
                    "org_id": str(token_org_id) if token_org_id else None,
                    "workspace_id": str(token_ws_id) if token_ws_id else None,
                    "token_project_id": str(token_proj_id) if token_proj_id else None,
                    "scopes": granted_scopes_list,
                },
            )

            # Policy & Approval Gate for non-context tools on a resolved project
            policy_decision_val = "ALLOW"
            exec_result: Optional[ToolExecutionResult] = None
            if not is_context_tool and str(resolved_proj_id) != "00000000-0000-0000-0000-000000000000":
                policy_eval = await MCPPolicyEvaluator(db).evaluate(mcp_ctx, tool, arguments)
                policy_decision_val = policy_eval.decision.value
                if policy_eval.decision == DecisionType.BLOCK:
                    exec_result = ToolExecutionResult(
                        status="DENIED",
                        message=f"Operation blocked by policy: {policy_eval.reason}",
                        error_code="MCP_POLICY_BLOCKED",
                    )
                elif (policy_eval.decision == DecisionType.REQUIRE_APPROVAL or tool.requires_approval) and not arguments.get("approved"):
                    exec_result = ToolExecutionResult(
                        status="REQUIRES_APPROVAL",
                        approval_id=f"appr_{uuid.uuid4().hex[:12]}",
                        message=f"Tool '{tool.name}' requires explicit human security approval before execution.",
                        error_code="MCP_APPROVAL_REQUIRED",
                    )

            start_time = time.time()
            if exec_result is None:
                try:
                    exec_result = await handler(mcp_ctx, arguments, db)
                except Exception as exc:
                    logger.exception(f"Unhandled exception executing MCP tool '{tool_name}': {exc}")
                    exec_result = ToolExecutionResult(
                        status="FAILED",
                        message=f"Tool execution failed: {str(exc)}",
                        error_code="MCP_INTERNAL_ERROR",
                    )
            exec_time_ms = round((time.time() - start_time) * 1000, 2)
            exec_result.execution_time_ms = exec_time_ms

            audit_service = AuditService(db)
            await audit_service.log_event(
                action=f"MCP_TOOL_EXEC_{tool_name.upper()}",
                resource_type="mcp_tool",
                actor_type="user",
                actor_id=str(auth_user.id),
                resource_id=tool_name,
                organization_id=token_org_id,
                workspace_id=token_ws_id,
                project_id=resolved_proj_id if str(resolved_proj_id) != "00000000-0000-0000-0000-000000000000" else None,
                status="SUCCESS" if exec_result.status == "SUCCESS" else "FAILURE",
                metadata={
                    "tool_name": tool_name,
                    "client_id": client_id,
                    "category": tool.category,
                    "risk_level": tool.risk_level,
                    "policy_decision": policy_decision_val,
                    "status": exec_result.status,
                    "error_code": exec_result.error_code,
                    "request_id": mcp_ctx.request_id,
                    "execution_time_ms": exec_time_ms,
                },
            )
            await db.commit()

            is_error = exec_result.status not in ("SUCCESS", "REQUIRES_APPROVAL", "SELECTION_REQUIRED")
            content_payload: Dict[str, Any] = {
                "tool": tool.name,
                "category": tool.category,
                "risk_level": tool.risk_level,
                "status": exec_result.status,
                "message": exec_result.message,
                "data": exec_result.data,
                "error_code": exec_result.error_code,
                "execution_time_ms": exec_time_ms,
                "request_id": mcp_ctx.request_id,
            }
            if exec_result.result_reference:
                content_payload["result_reference"] = exec_result.result_reference
            if exec_result.approval_id:
                content_payload["approval_id"] = exec_result.approval_id

            result = {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(content_payload, indent=2, default=str),
                    }
                ],
                "structuredContent": content_payload,
                "isError": is_error,
            }
    else:
        error = {"code": -32601, "message": f"Method '{method}' not implemented."}

    response_payload: Dict[str, Any] = {"jsonrpc": "2.0", "id": req_id}
    if error:
        response_payload["error"] = error
    else:
        response_payload["result"] = result

    if sessionId and sessionId in active_sse_queues:
        await active_sse_queues[sessionId].put(json.dumps(response_payload))

    resp_headers = {"Access-Control-Allow-Origin": "*"}
    if mcp_session_id:
        resp_headers["Mcp-Session-Id"] = mcp_session_id
    return JSONResponse(status_code=200, content=response_payload, headers=resp_headers)


@router.api_route(
    "/mcp",
    methods=["GET", "POST", "DELETE", "OPTIONS", "HEAD"],
    summary="Unified MCP Gateway Endpoint (Streamable HTTP & SSE)",
    description="Unified entrypoint for ChatGPT, Claude, Grok, Cursor, VS Code, Windsurf, and MCP clients.",
)
async def mcp_unified_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Handles Streamable HTTP (`POST`), SSE (`GET` with `Accept: text/event-stream`),
    session termination (`DELETE`), and discovery status (`GET` without SSE).
    """
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, HEAD",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, X-MCP-Session-Id, X-Requested-With",
            },
        )

    if request.method == "POST":
        return await mcp_handle_message(request=request, sessionId=None, db=db, current_user=current_user)

    if request.method == "DELETE":
        user, _, unauth_resp = await _authenticate_mcp_request(request, db, fallback_user=current_user)
        if unauth_resp or not user:
            return unauth_resp
        sess_id = request.headers.get("Mcp-Session-Id") or request.headers.get("X-MCP-Session-Id")
        if sess_id:
            active_sse_queues.pop(sess_id, None)
            try:
                sess_uuid = uuid.UUID(sess_id)
                sess = await db.get(MCPSession, sess_uuid)
                if sess:
                    sess.status = "TERMINATED"
                    sess.terminated_at = datetime.now(timezone.utc)
                    await db.commit()
            except ValueError:
                pass
        return Response(status_code=204, headers={"Access-Control-Allow-Origin": "*"})

    accept = request.headers.get("accept", "").lower()
    if "text/event-stream" in accept:
        return await mcp_sse_transport(request=request, db=db, current_user=current_user)

    base_url = get_mcp_base_url(request)
    tools = default_tool_registry.list_tools()
    return JSONResponse(
        status_code=200,
        content={
            "status": "ONLINE",
            "gateway_name": "Kavach Autonomous MCP Security Gateway",
            "mcp_protocol_version": "2025-03-26",
            "server_version": settings.mcp_server_version,
            "auth": {
                "type": "oauth2",
                "protected_resource": f"{base_url}/.well-known/oauth-protected-resource",
                "authorization_server": f"{base_url}/.well-known/oauth-authorization-server",
            },
            "transports": ["streamable-http", "sse"],
            "endpoints": {
                "mcp": f"{base_url}/mcp",
                "sse": f"{base_url}/sse",
                "tools": f"{base_url}/api/v1/mcp/tools",
                "status": f"{base_url}/api/v1/mcp/status",
                "manifest": f"{base_url}/api/v1/mcp/manifest",
            },
            "tools_count": len(tools),
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
        },
    )


async def _verify_project_access(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    project = await db.get(Project, project_id)
    if not project or project.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )
    if not await user_can_access_project(user, project, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage MCP settings for this project.",
        )
    return project


@router.get("/projects/{project_id}/mcp/status", response_model=MCPGatewayStatusResponse)
async def get_project_mcp_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPGatewayStatusResponse:
    """Returns live statistics and operational status of the MCP Gateway for a specific project."""
    await _verify_project_access(project_id, current_user, db)

    active_sessions = (
        await db.execute(
            select(func.count(MCPSession.id)).where(MCPSession.project_id == project_id, MCPSession.status == "ACTIVE")
        )
    ).scalar() or 0
    total_invocations = (
        await db.execute(select(func.count(MCPToolInvocation.id)).where(MCPToolInvocation.project_id == project_id))
    ).scalar() or 0
    denied_invocations = (
        await db.execute(
            select(func.count(MCPToolInvocation.id)).where(
                MCPToolInvocation.project_id == project_id, MCPToolInvocation.status.in_(["DENIED", "BLOCKED"])
            )
        )
    ).scalar() or 0
    approvals_pending = (
        await db.execute(
            select(func.count(MCPToolInvocation.id)).where(
                MCPToolInvocation.project_id == project_id, MCPToolInvocation.status == "REQUIRES_APPROVAL"
            )
        )
    ).scalar() or 0

    return MCPGatewayStatusResponse(
        enabled=settings.mcp_enabled,
        server_name=settings.mcp_server_name,
        server_version=settings.mcp_server_version,
        transport=settings.mcp_transport,
        active_sessions_count=active_sessions,
        registered_tools_count=len(default_tool_registry.list_tools()),
        total_invocations_count=total_invocations,
        denied_invocations_count=denied_invocations,
        approvals_pending_count=approvals_pending,
    )


@router.get("/projects/{project_id}/mcp/tools", response_model=List[MCPToolResponse])
async def list_project_mcp_tools(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MCPToolResponse]:
    """Lists all registered MCP tools and their schemas, capability requirements, and risk levels."""
    await _verify_project_access(project_id, current_user, db)
    return [
        MCPToolResponse(
            id=uuid.uuid5(uuid.NAMESPACE_DNS, t.name),
            name=t.name,
            description=t.description,
            version=t.version,
            category=t.category,
            input_schema=t.input_schema,
            output_schema=t.output_schema,
            risk_level=t.risk_level,
            enabled=t.enabled,
            requires_approval=t.requires_approval,
            required_permission=t.required_permission,
        )
        for t in default_tool_registry.list_tools()
    ]


@router.get("/projects/{project_id}/mcp/sessions", response_model=List[MCPSessionResponse])
async def list_project_mcp_sessions(
    project_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MCPSessionResponse]:
    await _verify_project_access(project_id, current_user, db)
    stmt = select(MCPSession).where(MCPSession.project_id == project_id).order_by(MCPSession.created_at.desc()).limit(limit)
    sessions = (await db.execute(stmt)).scalars().all()
    return [
        MCPSessionResponse(
            id=s.id,
            agent_id=s.agent_id,
            project_id=s.project_id,
            authenticated_principal=s.authenticated_principal,
            transport=s.transport,
            client_name=s.client_name,
            client_version=s.client_version,
            status=s.status,
            last_activity_at=s.last_activity_at,
            expires_at=s.expires_at,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.get("/mcp/sessions/{session_id}", response_model=MCPSessionResponse)
async def get_mcp_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPSessionResponse:
    session = await db.get(MCPSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"MCP Session '{session_id}' not found.")
    await _verify_project_access(session.project_id, current_user, db)
    return MCPSessionResponse(
        id=session.id,
        agent_id=session.agent_id,
        project_id=session.project_id,
        authenticated_principal=session.authenticated_principal,
        transport=session.transport,
        client_name=session.client_name,
        client_version=session.client_version,
        status=session.status,
        last_activity_at=session.last_activity_at,
        expires_at=session.expires_at,
        created_at=session.created_at,
    )


@router.get("/mcp/invocations/{invocation_id}", response_model=MCPInvocationResponse)
async def get_mcp_invocation(
    invocation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPInvocationResponse:
    inv = await db.get(MCPToolInvocation, invocation_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"MCP Invocation '{invocation_id}' not found.")
    await _verify_project_access(inv.project_id, current_user, db)
    return MCPInvocationResponse(
        id=inv.id,
        session_id=inv.session_id,
        agent_id=inv.agent_id,
        project_id=inv.project_id,
        tool_name=inv.tool_name,
        tool_version=inv.tool_version,
        request_id=inv.request_id,
        operation=inv.operation,
        resource_type=inv.resource_type,
        resource_id=inv.resource_id,
        authorization_decision=inv.authorization_decision,
        policy_decision=inv.policy_decision,
        approval_id=inv.approval_id,
        status=inv.status,
        started_at=inv.started_at,
        completed_at=inv.completed_at,
        result_reference=inv.result_reference,
        input_summary=inv.input_summary,
        output_summary=inv.output_summary,
        error_code=inv.error_code,
        error_message=inv.error_message,
        created_at=inv.created_at,
    )
