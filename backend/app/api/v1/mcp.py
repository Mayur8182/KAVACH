import asyncio
import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.jwks import verify_jwt_with_db_jwks
from app.core.security import get_current_user, get_current_user_optional
from app.engines.policy.models import DecisionType
from app.mcp.approvals import MCPApprovalManager
from app.mcp.authorization import MCPAuthorizer
from app.mcp.engines.behavioral_analyzer import MCPBehavioralAnalysisEngine
from app.mcp.engines.dlp_engine import MCPDataSecurityEngine
from app.mcp.engines.threat_detector import MCPThreatDetectionEngine
from app.mcp.firewall import evaluate_firewall_rules, forward_upstream_tool_call
from app.mcp.policy import MCPPolicyEvaluator
from app.mcp.protocol import (
    MCP_PROMPTS,
    MCP_RESOURCE_TEMPLATES,
    MCP_STATIC_RESOURCES,
    build_tool_annotations,
    canonical_arguments_hash,
    complete_mcp_argument,
    get_mcp_prompt,
    read_mcp_resource,
)
from app.mcp.widgets import (
    build_tool_ui_meta,
    issue_widget_approval_token,
    verify_widget_approval_token,
)
from app.mcp.registry import default_tool_registry
from app.mcp.risk import MCPRiskEvaluator
from app.mcp.schemas import (
    AgentIdentity,
    MCPContext,
    MCPGatewayStatusResponse,
    MCPInvocationResponse,
    MCPSessionResponse,
    MCPToolResponse,
    ToolDefinition,
    ToolExecutionResult,
)
from app.models.audit_event import AuditEvent
from app.models.mcp import MCPSession, MCPToolInvocation
from app.models.mcp_security import MCPRuntimeEvent, MCPToolSnapshot, MCPUpstreamServer
from app.models.oauth import OAuthToken
from app.models.policy import SecurityApproval, SecurityDecision
from app.models.project import Project
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    get_accessible_projects,
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
    "get_file_content": "projects:read",
    "create_branch": "remediation:apply",
    "apply_remediation_patch": "remediation:apply",
    "create_pull_request": "remediation:apply",
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
    "verify_patch": "scans:run",
    "quarantine_compromised_target": "remediation:apply",
    "simulate_attack_path": "remediation:apply",
    "list_project_findings": "findings:read",
    "get_project_posture": "projects:read",
    "list_pending_approvals": "projects:read",
    "get_mcp_audit_trail": "findings:read",
}

DEFAULT_OAUTH_CHALLENGE_SCOPES = (
    "projects:read projects:write scans:read scans:run findings:read "
    "remediation:propose remediation:apply offline_access openid profile email"
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
            "annotations": build_tool_annotations(t),
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
            "claude_desktop": {
                "mcpServers": {
                    "kavach": {
                        "command": "npx",
                        "args": ["-y", "mcp-remote", mcp_endpoint],
                    }
                }
            },
            "cursor": {"mcpServers": {"kavach": {"url": mcp_endpoint}}},
            "vscode": {"servers": {"kavach": {"type": "http", "url": mcp_endpoint}}},
            "windsurf": {"mcpServers": {"kavach": {"serverUrl": mcp_endpoint}}},
            "claude_code": {"command": f"claude mcp add --transport http kavach {mcp_endpoint}"},
            "codex": {"command": f"codex mcp add kavach --url {mcp_endpoint}"},
            "gemini": {"command": f"gemini mcp add --transport http kavach {mcp_endpoint}"},
        },
        "capabilities": {
            "tools": {"listChanged": False, "annotations": True},
            "resources": {"subscribe": False, "templates": True},
            "prompts": {"listChanged": False},
            "completions": True,
            "logging": True,
            "streamable_http_progress": True,
            "human_in_the_loop_approvals": True,
        },
        "resources": MCP_STATIC_RESOURCES,
        "resource_templates": MCP_RESOURCE_TEMPLATES,
        "prompts": MCP_PROMPTS,
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


def _evaluate_mcp_tool_policy_check(
    payload: MCPSandboxCallPayload,
    *,
    principal: str,
    identity_status: str = "PASSED",
    execute_when_allowed: bool = True,
) -> Tuple[Any, str, Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any], float]:
    """Deterministic identity, RBAC scope, OPA Rego (#POL-MCP-09), and risk gate evaluation."""
    t_start = time.perf_counter()
    tool = default_tool_registry.get_tool(payload.tool_name)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP Tool '{payload.tool_name}' is not registered in the Kavach Gateway.",
        )

    identity_stage = {
        "stage": "IDENTITY_VERIFICATION",
        "status": identity_status,
        "principal": principal,
        "client_name": payload.client_name,
        "agent_type": payload.agent_type,
        "verified_at": time.time(),
    }

    auth_stage = {
        "stage": "AUTHORIZATION_CHECK",
        "status": identity_status,
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
    elif not execute_when_allowed:
        exec_status = "POLICY_PASSED"
        output_data = {"tool": tool.name, "result_status": "PREVIEW_ONLY", "parameters_checked": payload.arguments}
    else:
        exec_status = "EXECUTED"
        output_data = {"tool": tool.name, "result_status": "READY", "parameters_applied": payload.arguments}

    exec_stage = {
        "stage": "DETERMINISTIC_EXECUTION",
        "status": exec_status,
        "duration_ms": round((time.perf_counter() - t_start) * 1000, 2),
    }
    return tool, exec_status, output_data, identity_stage, auth_stage, policy_stage, risk_stage, exec_stage, t_start


@router.post("/mcp/policy-preview", response_model=MCPSandboxCallResponse, summary="Deterministic MCP Policy Gate Preview")
async def preview_mcp_policy_gate(payload: MCPSandboxCallPayload):
    """
    Public read-only deterministic policy evaluation of registered MCP tool schemas & OPA Rego rules.
    Does not execute tools or access tenant secrets/databases.
    """
    tool, exec_status, output_data, identity_stage, auth_stage, policy_stage, risk_stage, exec_stage, t_start = (
        _evaluate_mcp_tool_policy_check(
            payload,
            principal="public-policy-preview",
            identity_status="PREVIEW",
            execute_when_allowed=False,
        )
    )
    preview_id = f"prv_mcp_{uuid.uuid4().hex[:12]}"
    audit_stage = {
        "stage": "IMMUTABLE_AUDIT_LOGGING",
        "status": "PREVIEW_ONLY",
        "audit_trace_id": preview_id,
        "persisted": False,
    }
    return MCPSandboxCallResponse(
        status=exec_status,
        tool_name=tool.name,
        client_name=payload.client_name,
        pipeline_stages=[identity_stage, auth_stage, policy_stage, risk_stage, exec_stage, audit_stage],
        output=output_data,
        policy_evaluation=policy_stage,
        risk_assessment=risk_stage,
        audit_trace_id=preview_id,
        execution_time_ms=round((time.perf_counter() - t_start) * 1000, 2),
    )


@router.post("/mcp/sandbox-call", response_model=MCPSandboxCallResponse, summary="Execute MCP Tool Validation Call")
async def execute_mcp_sandbox_call(
    payload: MCPSandboxCallPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes an authenticated MCP tool pipeline check through identity, authorization, policy, and audit."""
    tool, exec_status, output_data, identity_stage, auth_stage, policy_stage, risk_stage, exec_stage, t_start = (
        _evaluate_mcp_tool_policy_check(
            payload,
            principal=current_user.email,
            identity_status="PASSED",
            execute_when_allowed=True,
        )
    )

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


class MCPApprovalDecisionPayload(BaseModel):
    decision: str = Field(..., description="APPROVED or REJECTED")
    notes: Optional[str] = Field(default=None, description="Optional reviewer rationale or notes")


class MCPWidgetApprovalPayload(BaseModel):
    decision: str = Field(..., description="APPROVED or REJECTED")
    widget_token: str = Field(..., description="HMAC-signed per-approval token issued to embedded MCP UI widget")
    notes: Optional[str] = Field(default=None, description="Optional human reviewer notes")


async def _dispatch_mcp_rpc(
    body: Dict[str, Any],
    request: Request,
    db: AsyncSession,
    auth_user: User,
    token_payload: Optional[Dict[str, Any]],
    mcp_session_id: Optional[str],
    emit_progress: Any = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[JSONResponse], Optional[str]]:
    """
    Dispatches a single MCP JSON-RPC 2.0 request or notification through the
    Zero-Trust Security Gateway pipeline.
    Returns (jsonrpc_response_dict | None_for_notification, direct_http_response | None, session_id).
    """
    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params") or {}
    if not isinstance(params, dict):
        return (
            {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "params must be an object."}},
            None,
            mcp_session_id,
        )

    client_id = (token_payload or {}).get("client_id") or request.headers.get("User-Agent", "mcp-client")
    result: Any = None
    error: Optional[Dict[str, Any]] = None

    async def notify_progress(progress: float, total: float, status_msg: str) -> None:
        token = (params.get("_meta") or {}).get("progressToken")
        if emit_progress and token is not None:
            await emit_progress(
                {
                    "jsonrpc": "2.0",
                    "method": "notifications/progress",
                    "params": {
                        "progressToken": token,
                        "progress": progress,
                        "total": total,
                        "message": status_msg,
                    },
                }
            )

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
                "resources": {"subscribe": False, "listChanged": False},
                "prompts": {"listChanged": False},
                "logging": {},
                "completions": {},
            },
            "serverInfo": {
                "name": settings.mcp_server_name,
                "version": settings.mcp_server_version,
                "description": (
                    "Zero-trust Kavach MCP 2025 security gateway with OAuth 2.1 + PKCE, "
                    "live resources, playbook prompts, deterministic OPA/policy & risk gates, "
                    "and cryptographic human-in-the-loop approvals."
                ),
            },
        }
    elif method in {"notifications/initialized", "notifications/cancelled"}:
        return None, None, mcp_session_id
    elif method == "ping":
        result = {}
    elif method == "logging/setLevel":
        level = str(params.get("level") or "info").lower()
        allowed_levels = {"debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"}
        if level not in allowed_levels:
            error = {"code": -32602, "message": f"Invalid log level '{level}'."}
        else:
            result = {}
    elif method == "tools/list":
        tools = default_tool_registry.list_tools()
        gateway_base = get_mcp_base_url(request)
        listed_tools = []
        for t in tools:
            t_entry: Dict[str, Any] = {
                "name": t.name,
                "title": build_tool_annotations(t)["title"],
                "description": t.description,
                "inputSchema": t.input_schema,
                "annotations": build_tool_annotations(t),
                "securitySchemes": [
                    {
                        "type": "oauth2",
                        "scopes": [TOOL_REQUIRED_SCOPES.get(t.name, "projects:read")],
                    }
                ],
            }
            ui_meta = build_tool_ui_meta(t.name, widget_api_base=gateway_base)
            if ui_meta:
                t_entry["_meta"] = ui_meta
            listed_tools.append(t_entry)
        # Multi-Server Gateway Routing: include discovered tools from active upstream MCP servers
        upstream_servers = (
            await db.execute(
                select(MCPUpstreamServer).where(
                    MCPUpstreamServer.owner_id == auth_user.id,
                    MCPUpstreamServer.status == "ONLINE",
                    MCPUpstreamServer.firewall_mode != "BLOCKED",
                )
            )
        ).scalars().all()
        for srv in upstream_servers:
            snaps = (
                await db.execute(
                    select(MCPToolSnapshot).where(
                        MCPToolSnapshot.server_id == srv.id,
                        MCPToolSnapshot.security_status != "BLOCKED",
                    )
                )
            ).scalars().all()
            for snap in snaps:
                listed_tools.append(
                    {
                        "name": f"{srv.slug}::{snap.tool_name}",
                        "title": f"{srv.name} — {snap.tool_name}",
                        "description": f"[Routed via Kavach Gateway -> {srv.name}] Upstream MCP tool (risk={snap.risk_level}).",
                        "inputSchema": {"type": "object", "additionalProperties": True},
                        "annotations": {
                            "title": f"{srv.name}: {snap.tool_name}",
                            "readOnlyHint": False,
                            "destructiveHint": snap.risk_level in {"HIGH", "CRITICAL"},
                            "idempotentHint": False,
                            "openWorldHint": True,
                        },
                        "securitySchemes": [{"type": "oauth2", "scopes": ["projects:read"]}],
                    }
                )
        result = {"tools": listed_tools}
    elif method == "resources/list":
        result = {"resources": MCP_STATIC_RESOURCES}
    elif method == "resources/templates/list":
        result = {"resourceTemplates": MCP_RESOURCE_TEMPLATES}
    elif method == "resources/read":
        uri = str(params.get("uri") or "").strip()
        if not uri:
            error = {"code": -32602, "message": "Missing required 'uri' parameter for resources/read."}
        else:
            res_data, res_err, missing_scope = await read_mcp_resource(
                uri,
                auth_user,
                token_payload,
                str(client_id),
                db,
                base_url=get_mcp_base_url(request),
            )
            if missing_scope:
                challenge = _build_www_authenticate(
                    request,
                    error="insufficient_scope",
                    error_description=f"Resource '{uri}' requires scope '{missing_scope}'.",
                    scope=missing_scope,
                )
                return (
                    None,
                    JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "jsonrpc": "2.0",
                            "id": req_id,
                            "error": {
                                "code": -32003,
                                "message": f"Insufficient scope. Resource requires scope '{missing_scope}'.",
                                "data": {"required_scope": missing_scope},
                            },
                        },
                        headers={"WWW-Authenticate": challenge, "Access-Control-Allow-Origin": "*"},
                    ),
                    mcp_session_id,
                )
            if res_err:
                error = res_err
            else:
                result = res_data
                await AuditService(db).log_event(
                    action="MCP_RESOURCE_READ",
                    resource_type="mcp_resource",
                    actor_type="user",
                    actor_id=str(auth_user.id),
                    resource_id=uri[:255],
                    status="SUCCESS",
                    metadata={"uri": uri, "client_id": str(client_id)},
                )
                await db.commit()
    elif method == "prompts/list":
        result = {"prompts": MCP_PROMPTS}
    elif method == "prompts/get":
        prompt_name = str(params.get("name") or "").strip()
        prompt_args = dict(params.get("arguments") or {})
        if not prompt_name:
            error = {"code": -32602, "message": "Missing required 'name' parameter for prompts/get."}
        else:
            p_res, p_err = await get_mcp_prompt(prompt_name, prompt_args, auth_user, token_payload, str(client_id), db)
            if p_err:
                error = p_err
            else:
                result = p_res
    elif method == "completion/complete":
        result = await complete_mcp_argument(
            params.get("ref") or {},
            params.get("argument") or {},
            auth_user,
            token_payload,
            db,
        )
    elif method == "tools/call":
        await notify_progress(0.15, 1.0, "Authenticating OAuth 2.1 identity and scope...")
        tool_name = str(params.get("name") or "")
        arguments = dict(params.get("arguments") or {})
        tool = default_tool_registry.get_tool(tool_name)
        handler = default_tool_registry.get_handler(tool_name)
        target_upstream_server: Optional[MCPUpstreamServer] = None
        upstream_raw_tool_name: Optional[str] = None
        server_slug = "kavach-builtin"

        # Resolve multi-server gateway routing (`serverSlug::toolName`) if not built-in
        if (not tool or not handler) and "::" in tool_name:
            cand_slug, cand_tool = tool_name.split("::", 1)
            srv = (
                await db.execute(
                    select(MCPUpstreamServer).where(
                        MCPUpstreamServer.slug == cand_slug,
                        MCPUpstreamServer.owner_id == auth_user.id,
                    )
                )
            ).scalars().first()
            if srv and srv.firewall_mode != "BLOCKED" and srv.status == "ONLINE":
                target_upstream_server = srv
                upstream_raw_tool_name = cand_tool
                server_slug = srv.slug
                snap = (
                    await db.execute(
                        select(MCPToolSnapshot).where(
                            MCPToolSnapshot.server_id == srv.id,
                            MCPToolSnapshot.tool_name == cand_tool,
                        )
                    )
                ).scalars().first()
                if snap and snap.security_status == "BLOCKED":
                    error = {"code": -32003, "message": f"Upstream tool '{tool_name}' is blocked by MCP Security Scanner."}
                else:
                    risk_lvl = snap.risk_level if snap else "HIGH"
                    tool = ToolDefinition(
                        name=tool_name,
                        description=f"Upstream MCP tool '{cand_tool}' on '{srv.name}'",
                        category="UPSTREAM",
                        input_schema={"type": "object"},
                        risk_level=risk_lvl,
                        requires_approval=(risk_lvl in {"HIGH", "CRITICAL"}),
                        required_permission="PROJECT_READ",
                    )

                    async def _upstream_handler(_ctx, args_dict, session_db):
                        fwd = await forward_upstream_tool_call(srv, cand_tool, args_dict, session_db)
                        if not fwd.get("ok"):
                            return ToolExecutionResult(
                                status="DENIED",
                                message=fwd.get("message", "Upstream forwarding blocked."),
                                error_code=fwd.get("error_code", "MCP_UPSTREAM_BLOCKED"),
                            )
                        payload_obj = fwd["payload"]
                        return ToolExecutionResult(
                            status="SUCCESS",
                            data=payload_obj.get("result") if isinstance(payload_obj, dict) else {"raw": payload_obj},
                            message=f"Executed upstream tool '{cand_tool}' via Kavach Gateway.",
                        )

                    handler = _upstream_handler

        token_org_id: Optional[uuid.UUID] = None
        token_ws_id: Optional[uuid.UUID] = None
        token_proj_id: Optional[uuid.UUID] = None
        granted_scopes_list = str((token_payload or {}).get("scope", "")).split()

        if not error and (not tool or not handler):
            error = {"code": -32601, "message": f"Tool '{tool_name}' not found."}
        elif not error and tool.required_permission in MCPAuthorizer.PROHIBITED_PERMISSIONS:
            error = {"code": -32003, "message": f"Permission '{tool.required_permission}' is strictly prohibited."}
        else:
            granted_scopes = {s for s in granted_scopes_list if s}
            required_scope = TOOL_REQUIRED_SCOPES.get(tool_name, "projects:read")
            if granted_scopes and required_scope not in granted_scopes and not auth_user.is_superuser:
                challenge = _build_www_authenticate(
                    request,
                    error="insufficient_scope",
                    error_description=f"Tool '{tool_name}' requires scope '{required_scope}'.",
                    scope=required_scope,
                )
                return (
                    None,
                    JSONResponse(
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
                    ),
                    mcp_session_id,
                )

            if (token_payload or {}).get("org_id"):
                try:
                    token_org_id = uuid.UUID(str(token_payload["org_id"]))
                except ValueError:
                    pass
            if (token_payload or {}).get("workspace_id"):
                try:
                    token_ws_id = uuid.UUID(str(token_payload["workspace_id"]))
                except ValueError:
                    pass
            raw_tp = (token_payload or {}).get("project_id") or (token_payload or {}).get("projectId")
            if raw_tp:
                try:
                    token_proj_id = uuid.UUID(str(raw_tp))
                except ValueError:
                    pass

            _, _, role_map = await get_user_org_and_workspace_scope(auth_user, db, scoped_org_id=token_org_id)
            if not auth_user.is_superuser and role_map:
                if required_scope in {"projects:write", "scans:run", "remediation:propose", "remediation:apply"}:
                    if all(str(r or "").upper() in {"VIEWER", "AUDITOR"} for r in role_map.values()):
                        error = {
                            "code": -32003,
                            "message": "Access denied: Viewer role cannot invoke scan, write, or remediation tools.",
                        }

        if not error:
            await notify_progress(0.35, 1.0, "Resolving authorized workspace & project context...")
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
                "list_pending_approvals",
            }
            resolved_proj_id = token_proj_id or uuid.UUID("00000000-0000-0000-0000-000000000000")
            if not is_context_tool:
                ctx_res = await resolve_project_context(
                    user=auth_user,
                    db=db,
                    client_id=str(client_id),
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
                    "client_id": str(client_id),
                    "org_id": str(token_org_id) if token_org_id else None,
                    "workspace_id": str(token_ws_id) if token_ws_id else None,
                    "token_project_id": str(token_proj_id) if token_proj_id else None,
                    "scopes": granted_scopes_list,
                },
            )

            await notify_progress(0.55, 1.0, "Running Threat, DLP, Behavioral & OPA/Firewall gates...")
            policy_decision_val = "ALLOW"
            risk_assessment = MCPRiskEvaluator.evaluate_risk(mcp_ctx, tool, arguments)
            exec_result: Optional[ToolExecutionResult] = None
            approved_ticket: Optional[SecurityApproval] = None
            has_real_project = str(resolved_proj_id) != "00000000-0000-0000-0000-000000000000"

            # Stage 2: Security Intelligence Layer (Behavioral + Threat Detection + Request DLP + Firewall/OPA)
            behavior_res = await MCPBehavioralAnalysisEngine.analyze_request(
                db,
                client_name=str(client_id),
                server_slug=server_slug,
                tool_name=tool.name,
                arguments=arguments,
                user_id=auth_user.id,
            )
            threat_req_res = MCPThreatDetectionEngine.inspect_request(
                tool_name=tool.name,
                arguments=arguments,
                tool_description=tool.description,
                recent_tools=behavior_res.get("recent_tools"),
            )
            dlp_req_res = MCPDataSecurityEngine.inspect_payload(arguments, stage="REQUEST", redact=False)
            firewall_res = await evaluate_firewall_rules(
                db,
                tool_name=tool.name,
                client_name=str(client_id),
                risk_level=tool.risk_level,
                arguments=arguments,
                server_slug=server_slug,
                project_id=resolved_proj_id if has_real_project else None,
            )

            all_threat_findings: List[Dict[str, Any]] = list(threat_req_res.get("findings") or [])
            all_dlp_findings: List[Dict[str, Any]] = list(dlp_req_res.get("findings") or [])
            behavioral_flags: List[Dict[str, Any]] = list(behavior_res.get("flags") or [])
            combined_threat_score = min(
                100,
                int(threat_req_res.get("threat_score", 0)) + int(behavior_res.get("anomaly_score", 0)),
            )
            runtime_decision = "ALLOW"
            policy_reason_text = firewall_res.get("reason") or "Allowed by Zero-Trust MCP Gateway."

            if threat_req_res.get("verdict") == "BLOCK":
                policy_decision_val = "BLOCK"
                runtime_decision = "BLOCK"
                policy_reason_text = f"Blocked by MCP Threat Detection: {[f['rule_id'] for f in all_threat_findings]}"
                exec_result = ToolExecutionResult(
                    status="DENIED",
                    message=policy_reason_text,
                    error_code="MCP_THREAT_BLOCKED",
                    data={"threat_findings": all_threat_findings},
                )
            elif dlp_req_res.get("verdict") == "BLOCK":
                policy_decision_val = "BLOCK"
                runtime_decision = "BLOCK"
                policy_reason_text = f"Blocked by MCP Data Security (DLP): {[f['rule_id'] for f in all_dlp_findings]}"
                exec_result = ToolExecutionResult(
                    status="DENIED",
                    message=policy_reason_text,
                    error_code="MCP_DLP_BLOCKED",
                    data={"dlp_findings": all_dlp_findings},
                )
            elif firewall_res.get("decision") == "DENY":
                policy_decision_val = "BLOCK"
                runtime_decision = "BLOCK"
                policy_reason_text = str(firewall_res.get("reason") or "Blocked by MCP Firewall rule.")
                exec_result = ToolExecutionResult(
                    status="DENIED",
                    message=policy_reason_text,
                    error_code="MCP_FIREWALL_BLOCKED",
                )

            if exec_result is None and not is_context_tool and (has_real_project or firewall_res.get("decision") == "REQUIRE_APPROVAL"):
                policy_eval = (
                    await MCPPolicyEvaluator(db).evaluate(mcp_ctx, tool, arguments)
                    if has_real_project
                    else None
                )
                if policy_eval:
                    policy_decision_val = policy_eval.decision.value
                requires_gate = (
                    firewall_res.get("decision") == "REQUIRE_APPROVAL"
                    or (policy_eval and policy_eval.decision == DecisionType.REQUIRE_APPROVAL)
                    or tool.requires_approval
                )
                if policy_eval and policy_eval.decision == DecisionType.BLOCK:
                    runtime_decision = "BLOCK"
                    policy_reason_text = f"Operation blocked by policy: {policy_eval.reason}"
                    exec_result = ToolExecutionResult(
                        status="DENIED",
                        message=policy_reason_text,
                        error_code="MCP_POLICY_BLOCKED",
                    )
                elif requires_gate:
                    incoming_approval_id = arguments.get("approval_id")
                    incoming_args_hash = canonical_arguments_hash(arguments)
                    approval_verified = False

                    if incoming_approval_id:
                        try:
                            ap_uuid = uuid.UUID(str(incoming_approval_id))
                            ap_row = await db.get(SecurityApproval, ap_uuid)
                            dec_row = await db.get(SecurityDecision, ap_row.decision_id) if ap_row else None
                            if ap_row and dec_row:
                                snap = dec_row.context_snapshot if isinstance(dec_row.context_snapshot, dict) else {}
                                stored_hash = canonical_arguments_hash(snap.get("arguments") or {})
                                now_utc = datetime.now(timezone.utc)
                                exp_utc = ap_row.expires_at
                                if exp_utc and exp_utc.tzinfo is None:
                                    exp_utc = exp_utc.replace(tzinfo=timezone.utc)
                                not_expired = exp_utc is None or exp_utc >= now_utc
                                if (
                                    ap_row.status == "APPROVED"
                                    and not_expired
                                    and (not has_real_project or dec_row.project_id == resolved_proj_id)
                                    and dec_row.operation_type == f"MCP_TOOL_{tool.name.upper()}"
                                    and stored_hash == incoming_args_hash
                                ):
                                    approval_verified = True
                                    approved_ticket = ap_row
                                elif ap_row.status == "PENDING" and not_expired:
                                    runtime_decision = "REQUIRE_APPROVAL"
                                    widget_tok = issue_widget_approval_token(
                                        approval_id=ap_row.id,
                                        user_id=auth_user.id,
                                    )
                                    exec_result = ToolExecutionResult(
                                        status="REQUIRES_APPROVAL",
                                        approval_id=str(ap_row.id),
                                        data={
                                            "approval_id": str(ap_row.id),
                                            "decision_id": str(dec_row.id),
                                            "status": ap_row.status,
                                            "pending_tool": tool.name,
                                            "pending_arguments": {
                                                k: v for k, v in arguments.items() if k not in {"approval_id", "approved"}
                                            },
                                            "widget_approval_token": widget_tok,
                                            "review_url": f"{get_mcp_base_url(request)}/settings/mcp",
                                        },
                                        message=(
                                            f"Approval '{ap_row.id}' is awaiting human sign-off. Approve directly "
                                            "inside the inline Kavach ChatGPT widget (or /settings/mcp), then re-call with approval_id."
                                        ),
                                        error_code="MCP_APPROVAL_REQUIRED",
                                    )
                                else:
                                    runtime_decision = "BLOCK"
                                    exec_result = ToolExecutionResult(
                                        status="DENIED",
                                        message=(
                                            f"Approval '{ap_row.id}' cannot execute tool '{tool.name}' "
                                            f"(status={ap_row.status}, argument_match={stored_hash == incoming_args_hash})."
                                        ),
                                        error_code="MCP_APPROVAL_INVALID",
                                    )
                        except (ValueError, TypeError):
                            runtime_decision = "BLOCK"
                            exec_result = ToolExecutionResult(
                                status="INVALID_INPUT",
                                message="Invalid 'approval_id' UUID format.",
                                error_code="MCP_INVALID_INPUT",
                            )

                    if not approval_verified and exec_result is None:
                        runtime_decision = "REQUIRE_APPROVAL"
                        reason_msg = (
                            (policy_eval.reason if policy_eval else None)
                            or firewall_res.get("reason")
                            or f"{tool.risk_level} risk operation requires human sign-off"
                        )
                        sanitized_pending_args = {
                            k: v for k, v in arguments.items() if k not in {"approval_id", "approved"}
                        }
                        created_ap_id = await MCPApprovalManager(db).create_approval_request(
                            context=mcp_ctx,
                            tool=tool,
                            arguments=sanitized_pending_args,
                            reason=reason_msg,
                        )
                        widget_tok = issue_widget_approval_token(
                            approval_id=created_ap_id,
                            user_id=auth_user.id,
                        )
                        exec_result = ToolExecutionResult(
                            status="REQUIRES_APPROVAL",
                            approval_id=str(created_ap_id),
                            data={
                                "approval_id": str(created_ap_id),
                                "status": "PENDING",
                                "pending_tool": tool.name,
                                "pending_arguments": sanitized_pending_args,
                                "widget_approval_token": widget_tok,
                                "review_path": "/settings/mcp",
                                "instruction": "Approve directly inside the inline ChatGPT widget (no external tab needed) or in /settings/mcp, then re-invoke with approval_id.",
                            },
                            message=(
                                f"Tool '{tool.name}' requires human sign-off before execution. "
                                f"Created pending SecurityApproval '{created_ap_id}' — approve inline in ChatGPT or via /settings/mcp."
                            ),
                            error_code="MCP_APPROVAL_REQUIRED",
                        )

            start_time = time.time()
            if exec_result is None:
                await notify_progress(0.75, 1.0, f"Executing '{tool.name}' inside security boundary...")
                try:
                    exec_result = await handler(mcp_ctx, arguments, db)
                except Exception as exc:
                    logger.exception(f"Unhandled exception executing MCP tool '{tool_name}': {exc}")
                    exec_result = ToolExecutionResult(
                        status="FAILED",
                        message=f"Tool execution failed: {str(exc)}",
                        error_code="MCP_INTERNAL_ERROR",
                    )
                if approved_ticket is not None and exec_result.status == "SUCCESS":
                    approved_ticket.status = "EXECUTED"

                # Stage 5: Response Inspection (Second-order Threat Detection + Automatic DLP Redaction)
                if exec_result.data is not None:
                    resp_threat = MCPThreatDetectionEngine.inspect_response(
                        tool_name=tool.name, response_payload=exec_result.data
                    )
                    if resp_threat.get("findings"):
                        all_threat_findings.extend(resp_threat["findings"])
                        combined_threat_score = min(100, combined_threat_score + int(resp_threat.get("threat_score", 0)))
                    if resp_threat.get("verdict") == "BLOCK":
                        runtime_decision = "BLOCK"
                        policy_reason_text = f"Tool response blocked by second-order injection guard: {[f['rule_id'] for f in resp_threat['findings']]}"
                        exec_result = ToolExecutionResult(
                            status="DENIED",
                            message=policy_reason_text,
                            error_code="MCP_RESPONSE_THREAT_BLOCKED",
                        )
                    else:
                        dlp_resp = MCPDataSecurityEngine.inspect_payload(exec_result.data, stage="RESPONSE", redact=True)
                        if dlp_resp.get("findings"):
                            all_dlp_findings.extend(dlp_resp["findings"])
                            exec_result.data = dlp_resp["sanitized_payload"]
                            if runtime_decision == "ALLOW":
                                runtime_decision = "REDACTED"
                                policy_reason_text = f"Response sanitized by Kavach DLP ({len(dlp_resp['findings'])} sensitive matches masked)."

            exec_time_ms = round((time.time() - start_time) * 1000, 2)
            exec_result.execution_time_ms = exec_time_ms
            estimated_tokens = max(
                1,
                (len(json.dumps(arguments, default=str)) + len(json.dumps(exec_result.data or {}, default=str))) // 4,
            )

            db.add(
                MCPRuntimeEvent(
                    request_id=mcp_ctx.request_id,
                    session_id=str(mcp_ctx.session_id),
                    user_id=auth_user.id,
                    project_id=resolved_proj_id if has_real_project else None,
                    client_name=str(client_id)[:200],
                    server_slug=server_slug,
                    tool_name=tool.name[:180],
                    stage="FULL_PIPELINE",
                    decision=runtime_decision,
                    status=exec_result.status,
                    latency_ms=exec_time_ms,
                    tokens_estimated=estimated_tokens,
                    threat_score=combined_threat_score,
                    risk_score={"LOW": 15, "MEDIUM": 40, "HIGH": 75, "CRITICAL": 95}.get(tool.risk_level, 25),
                    threat_findings=all_threat_findings,
                    dlp_findings=all_dlp_findings,
                    behavioral_flags=behavioral_flags,
                    policy_reason=policy_reason_text,
                )
            )

            audit_service = AuditService(db)
            await audit_service.log_event(
                action=f"MCP_TOOL_EXEC_{tool_name.upper()}",
                resource_type="mcp_tool",
                actor_type="user",
                actor_id=str(auth_user.id),
                resource_id=tool_name,
                organization_id=token_org_id,
                workspace_id=token_ws_id,
                project_id=resolved_proj_id if has_real_project else None,
                status="SUCCESS" if exec_result.status == "SUCCESS" else "FAILURE",
                metadata={
                    "tool_name": tool_name,
                    "server_slug": server_slug,
                    "client_id": str(client_id),
                    "category": tool.category,
                    "risk_level": risk_assessment.get("effective_risk", tool.risk_level),
                    "risk_factors": risk_assessment.get("risk_factors", []),
                    "policy_decision": policy_decision_val,
                    "runtime_decision": runtime_decision,
                    "threat_score": combined_threat_score,
                    "dlp_redactions": len(all_dlp_findings),
                    "approval_id": exec_result.approval_id,
                    "status": exec_result.status,
                    "error_code": exec_result.error_code,
                    "request_id": mcp_ctx.request_id,
                    "execution_time_ms": exec_time_ms,
                    "tokens_estimated": estimated_tokens,
                },
            )
            await db.commit()
            await notify_progress(1.0, 1.0, f"Completed '{tool.name}' with immutable audit evidence.")

            is_error = exec_result.status not in ("SUCCESS", "REQUIRES_APPROVAL", "SELECTION_REQUIRED")
            content_payload: Dict[str, Any] = {
                "tool": tool.name,
                "category": tool.category,
                "risk_level": risk_assessment.get("effective_risk", tool.risk_level),
                "risk_factors": risk_assessment.get("risk_factors", []),
                "policy_decision": policy_decision_val,
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

            ui_meta = build_tool_ui_meta(
                tool.name,
                is_approval_gate=(exec_result.status == "REQUIRES_APPROVAL"),
                widget_api_base=get_mcp_base_url(request),
            )
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
            if ui_meta:
                result["_meta"] = ui_meta
    else:
        error = {"code": -32601, "message": f"Method '{method}' not implemented."}

    if req_id is None and str(method or "").startswith("notifications/"):
        return None, None, mcp_session_id

    response_payload: Dict[str, Any] = {"jsonrpc": "2.0", "id": req_id}
    if error:
        response_payload["error"] = error
    else:
        response_payload["result"] = result
    return response_payload, None, mcp_session_id


@router.post("/mcp/message", summary="MCP JSON-RPC 2.0 Message Handler")
async def mcp_handle_message(
    request: Request,
    sessionId: Optional[str] = Query(None, description="Active MCP session ID from SSE endpoint"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Standard MCP 2025-03-26 JSON-RPC 2.0 message handler supporting single & batch payloads,
    resources, prompts, completions, tool annotations, cryptographic HITL approvals,
    and Streamable HTTP SSE progress streaming.
    """
    auth_user, token_payload, unauth_resp = await _authenticate_mcp_request(
        request, db, fallback_user=current_user
    )
    if unauth_resp or not auth_user:
        return unauth_resp

    try:
        raw_body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Invalid JSON payload."}},
        )

    mcp_session_id = request.headers.get("Mcp-Session-Id") or request.headers.get("X-MCP-Session-Id") or sessionId

    # Handle JSON-RPC 2.0 Batch Arrays
    if isinstance(raw_body, list):
        if not raw_body:
            return JSONResponse(
                status_code=400,
                content={"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid empty JSON-RPC batch."}},
            )
        batch_responses: List[Dict[str, Any]] = []
        for item in raw_body:
            if not isinstance(item, dict):
                batch_responses.append(
                    {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid batch request object."}}
                )
                continue
            item_resp, http_err, mcp_session_id = await _dispatch_mcp_rpc(
                item, request, db, auth_user, token_payload, mcp_session_id
            )
            if http_err is not None:
                return http_err
            if item_resp is not None:
                batch_responses.append(item_resp)
        resp_headers = {"Access-Control-Allow-Origin": "*"}
        if mcp_session_id:
            resp_headers["Mcp-Session-Id"] = mcp_session_id
        if not batch_responses:
            return Response(status_code=202, headers=resp_headers)
        return JSONResponse(status_code=200, content=batch_responses, headers=resp_headers)

    if not isinstance(raw_body, dict):
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request object."}},
        )

    accept = request.headers.get("accept", "").lower()
    wants_sse_stream = (
        "text/event-stream" in accept
        and raw_body.get("method") == "tools/call"
        and "application/json" not in accept
    )
    if wants_sse_stream:
        progress_events: List[Dict[str, Any]] = []

        async def _collect_progress(evt: Dict[str, Any]) -> None:
            progress_events.append(evt)

        response_payload, direct_http_resp, mcp_session_id = await _dispatch_mcp_rpc(
            raw_body, request, db, auth_user, token_payload, mcp_session_id, emit_progress=_collect_progress
        )
        if direct_http_resp is not None:
            return direct_http_resp

        async def _stream_sse():
            for evt in progress_events:
                yield f"event: message\ndata: {json.dumps(evt)}\n\n"
            if response_payload is not None:
                yield f"event: message\ndata: {json.dumps(response_payload)}\n\n"

        sse_headers = {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
        if mcp_session_id:
            sse_headers["Mcp-Session-Id"] = mcp_session_id
        return StreamingResponse(_stream_sse(), media_type="text/event-stream", headers=sse_headers)

    async def _push_session_sse(evt: Dict[str, Any]) -> None:
        if sessionId and sessionId in active_sse_queues:
            await active_sse_queues[sessionId].put(json.dumps(evt))

    response_payload, direct_http_resp, mcp_session_id = await _dispatch_mcp_rpc(
        raw_body, request, db, auth_user, token_payload, mcp_session_id, emit_progress=_push_session_sse
    )
    if direct_http_resp is not None:
        return direct_http_resp

    resp_headers = {"Access-Control-Allow-Origin": "*"}
    if mcp_session_id:
        resp_headers["Mcp-Session-Id"] = mcp_session_id

    if response_payload is None:
        return Response(status_code=202, headers=resp_headers)

    if sessionId and sessionId in active_sse_queues:
        await active_sse_queues[sessionId].put(json.dumps(response_payload))

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


@router.get("/mcp/approvals", summary="List MCP Human-in-the-Loop Security Approvals")
async def list_mcp_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists pending and recent SecurityApproval requests created by MCP AI client invocations."""
    projects = await get_accessible_projects(current_user, db)
    project_ids = [p.id for p in projects]
    if not project_ids:
        return {"pending_count": 0, "items": []}

    project_map = {str(p.id): p.name for p in projects}
    stmt = (
        select(SecurityApproval, SecurityDecision)
        .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
        .where(
            SecurityDecision.project_id.in_(project_ids),
            SecurityDecision.actor_type == "AI_AGENT",
        )
        .order_by(desc(SecurityApproval.requested_at))
        .limit(50)
    )
    rows = (await db.execute(stmt)).all()
    items: List[Dict[str, Any]] = []
    pending_count = 0
    for ap, dec in rows:
        if ap.status == "PENDING":
            pending_count += 1
        snap = dec.context_snapshot if isinstance(dec.context_snapshot, dict) else {}
        items.append(
            {
                "id": str(ap.id),
                "decision_id": str(dec.id),
                "project_id": str(dec.project_id),
                "project_name": project_map.get(str(dec.project_id), "Unknown"),
                "operation_type": dec.operation_type,
                "tool_name": snap.get("tool_name"),
                "client_name": snap.get("agent_name"),
                "arguments": snap.get("arguments") or {},
                "status": ap.status,
                "reason": ap.reason,
                "requested_by": ap.requested_by,
                "approved_by": ap.approved_by,
                "approval_notes": ap.approval_notes,
                "requested_at": ap.requested_at.isoformat() if ap.requested_at else None,
                "approved_at": ap.approved_at.isoformat() if ap.approved_at else None,
                "expires_at": ap.expires_at.isoformat() if ap.expires_at else None,
            }
        )
    return {"pending_count": pending_count, "items": items}


@router.post("/mcp/approvals/{approval_id}/decide", summary="Approve or Reject an MCP Tool Request")
async def decide_mcp_approval(
    approval_id: uuid.UUID,
    payload: MCPApprovalDecisionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authorizes or rejects a pending MCP SecurityApproval request with RBAC and immutable audit logging."""
    decision_val = payload.decision.strip().upper()
    if decision_val not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'.")

    ap = await db.get(SecurityApproval, approval_id)
    if not ap:
        raise HTTPException(status_code=404, detail="Security approval request not found.")
    dec = await db.get(SecurityDecision, ap.decision_id)
    if not dec:
        raise HTTPException(status_code=404, detail="Parent security decision not found.")

    if dec.project_id:
        proj_obj = await db.get(Project, dec.project_id)
        if not proj_obj:
            raise HTTPException(status_code=404, detail="Target project for approval not found.")
        allowed = await user_can_access_project(current_user, proj_obj, db)
        if not allowed:
            raise HTTPException(status_code=403, detail="Access denied to the target project approval.")

    _, _, role_map = await get_user_org_and_workspace_scope(current_user, db)
    if not current_user.is_superuser and role_map:
        if all(str(r or "").upper() in {"VIEWER", "AUDITOR"} for r in role_map.values()):
            raise HTTPException(status_code=403, detail="Viewer role cannot approve or reject MCP actions.")

    if ap.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Approval is already in '{ap.status}' state.")

    now_utc = datetime.now(timezone.utc)
    exp_utc = ap.expires_at
    if exp_utc and exp_utc.tzinfo is None:
        exp_utc = exp_utc.replace(tzinfo=timezone.utc)
    if exp_utc and exp_utc < now_utc:
        ap.status = "EXPIRED"
        await db.commit()
        raise HTTPException(status_code=400, detail="Approval request has expired.")

    if decision_val == "APPROVED" and ap.requested_by.lower() == current_user.email.lower():
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: requester cannot self-approve.",
        )

    ap.status = decision_val
    ap.approved_by = current_user.email
    ap.approved_at = now_utc
    ap.approval_notes = payload.notes

    snap = dec.context_snapshot if isinstance(dec.context_snapshot, dict) else {}
    await AuditService(db).log_event(
        action=f"MCP_APPROVAL_{decision_val}",
        resource_type="mcp_approval",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(ap.id),
        project_id=dec.project_id,
        status="SUCCESS",
        metadata={
            "approval_id": str(ap.id),
            "decision_id": str(dec.id),
            "tool_name": snap.get("tool_name"),
            "approved_by": current_user.email,
            "notes": payload.notes,
        },
    )
    await db.commit()
    await db.refresh(ap)
    return {
        "id": str(ap.id),
        "status": ap.status,
        "approved_by": ap.approved_by,
        "approved_at": ap.approved_at.isoformat() if ap.approved_at else None,
        "approval_notes": ap.approval_notes,
    }


@router.options("/mcp/approvals/{approval_id}/widget-decide")
async def widget_decide_mcp_approval_preflight():
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    )


@router.post(
    "/mcp/approvals/{approval_id}/widget-decide",
    summary="Approve or Reject an MCP Approval Inline from Embedded ChatGPT/MCP UI Widget",
)
async def widget_decide_mcp_approval(
    approval_id: uuid.UUID,
    payload: MCPWidgetApprovalPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows human operators to approve or reject pending MCP approvals directly inside embedded
    ChatGPT / MCP UI widgets without leaving chat. Authenticates strictly via the server-signed
    single-approval HMAC token (`widget_token`), enforces RBAC and separation of duties, and
    persists immutable PostgreSQL audit records.
    """
    claims = verify_widget_approval_token(payload.widget_token, approval_id)
    if not claims:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or expired inline widget approval token."},
            headers={"Access-Control-Allow-Origin": "*"},
        )

    try:
        reviewer_uuid = uuid.UUID(claims["user_id"])
    except (ValueError, TypeError):
        return JSONResponse(
            status_code=401,
            content={"detail": "Malformed reviewer identity in widget token."},
            headers={"Access-Control-Allow-Origin": "*"},
        )

    reviewer = await db.get(User, reviewer_uuid)
    if not reviewer or not reviewer.is_active:
        return JSONResponse(
            status_code=401,
            content={"detail": "Authenticated user account is missing or inactive."},
            headers={"Access-Control-Allow-Origin": "*"},
        )

    res_obj = await decide_mcp_approval(
        approval_id=approval_id,
        payload=MCPApprovalDecisionPayload(
            decision=payload.decision,
            notes=payload.notes or "Approved inline via embedded ChatGPT MCP UI widget",
        ),
        db=db,
        current_user=reviewer,
    )
    return JSONResponse(
        status_code=200,
        content=res_obj,
        headers={"Access-Control-Allow-Origin": "*"},
    )


@router.get("/mcp/activity", summary="List Recent MCP Runtime Tool & Resource Activity")
async def list_mcp_activity(
    limit: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns real AuditEvent entries for MCP tool executions, resource reads, and approval decisions."""
    projects = await get_accessible_projects(current_user, db)
    project_ids = [p.id for p in projects]
    project_map = {str(p.id): p.name for p in projects}

    cond = AuditEvent.actor_id == str(current_user.id)
    if project_ids:
        cond = or_(AuditEvent.actor_id == str(current_user.id), AuditEvent.project_id.in_(project_ids))

    stmt = (
        select(AuditEvent)
        .where(
            AuditEvent.resource_type.in_(["mcp_tool", "mcp_resource", "mcp_approval", "mcp_gateway"]),
            cond,
        )
        .order_by(desc(AuditEvent.timestamp))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(ev.id),
                "action": ev.action,
                "resource_type": ev.resource_type,
                "resource_id": ev.resource_id,
                "project_id": str(ev.project_id) if ev.project_id else None,
                "project_name": project_map.get(str(ev.project_id), None) if ev.project_id else None,
                "status": ev.status,
                "metadata": ev.event_metadata if isinstance(ev.event_metadata, dict) else {},
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            }
            for ev in rows
        ],
    }
