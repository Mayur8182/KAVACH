"""
MCP 2025-03-26 / 2025-06-18 Advanced Protocol Engine for Kavach Security Gateway.

Provides deterministic, database-backed implementations of:
- Tool Annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
- MCP Resources (`resources/list`, `resources/templates/list`, `resources/read`)
- MCP Prompts (`prompts/list`, `prompts/get`) enriched with live PostgreSQL posture/findings
- MCP Argument Autocompletion (`completion/complete`)
- Canonical Argument Hashing for Cryptographic Human-in-the-Loop Approvals
"""

from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.schemas import ToolDefinition
from app.models.audit_event import AuditEvent
from app.models.policy import SecurityApproval, SecurityDecision
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.services.workspace_resolver import (
    get_accessible_projects,
    get_user_org_and_workspace_scope,
    resolve_project_context,
    user_can_access_project,
)

# Tool behavior classification for MCP 2025-03-26 tool annotations
READ_ONLY_TOOLS: Set[str] = {
    "get_current_user",
    "get_workspace",
    "list_workspaces",
    "list_projects",
    "get_project",
    "get_active_project",
    "get_connection_status",
    "get_available_permissions",
    "get_security_blueprint",
    "get_security_requirements",
    "check_security_policy",
    "list_security_policies",
    "get_scan",
    "get_github_repository",
    "list_github_repositories",
    "get_pull_request",
    "list_pull_requests",
    "get_file_content",
    "get_finding_detail",
    "get_cloud_inventory",
    "audit_cloud_posture",
    "query_threat_intelligence",
    "get_active_incidents",
    "audit_attack_surface",
    "audit_compliance_framework",
    "scan_sensitive_data_posture",
    "audit_agent_permissions_posture",
    "list_project_findings",
    "get_project_posture",
    "list_pending_approvals",
    "get_mcp_audit_trail",
}

DESTRUCTIVE_TOOLS: Set[str] = {
    "verify_remediation_patch",
    "verify_patch",
    "create_branch",
    "apply_remediation_patch",
    "create_pull_request",
    "quarantine_compromised_target",
    "simulate_attack_path",
}

OPEN_WORLD_TOOLS: Set[str] = {
    "get_github_repository",
    "list_github_repositories",
    "get_pull_request",
    "list_pull_requests",
    "get_file_content",
    "create_branch",
    "apply_remediation_patch",
    "create_pull_request",
    "connect_repository",
    "audit_cloud_posture",
    "get_cloud_inventory",
    "query_threat_intelligence",
    "simulate_attack_path",
    "audit_attack_surface",
}


def _human_title(tool_name: str) -> str:
    return " ".join(part.capitalize() for part in tool_name.split("_"))


def build_tool_annotations(tool: ToolDefinition) -> Dict[str, Any]:
    """Computes deterministic MCP 2025 tool annotations for ChatGPT, Claude, and IDE clients."""
    is_read_only = tool.name in READ_ONLY_TOOLS
    is_destructive = tool.name in DESTRUCTIVE_TOOLS or tool.requires_approval
    return {
        "title": _human_title(tool.name),
        "readOnlyHint": is_read_only,
        "destructiveHint": False if is_read_only else is_destructive,
        "idempotentHint": is_read_only or tool.name in {"set_active_project", "check_security_policy"},
        "openWorldHint": tool.name in OPEN_WORLD_TOOLS,
    }


def canonical_arguments_hash(arguments: Dict[str, Any]) -> str:
    """
    Computes a stable SHA-256 digest over tool arguments (excluding approval metadata)
    so SecurityApproval tickets are cryptographically bound to exact parameters.
    """
    cleaned = {
        k: v
        for k, v in (arguments or {}).items()
        if k not in {"approval_id", "approved", "projectId"}
    }
    encoded = json.dumps(cleaned, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


# ── MCP Resources Catalog ─────────────────────────────────────────────────────

MCP_STATIC_RESOURCES: List[Dict[str, Any]] = [
    {
        "uri": "kavach://workspace/active",
        "name": "Active Kavach Workspace & Project Context",
        "description": "Resolved user identity, authorized organization/workspace, and active default project for this OAuth session.",
        "mimeType": "application/json",
    },
    {
        "uri": "kavach://projects",
        "name": "Authorized Kavach Projects",
        "description": "All verified projects and connected repositories accessible under the current OAuth token.",
        "mimeType": "application/json",
    },
    {
        "uri": "kavach://approvals/pending",
        "name": "Pending Human-in-the-Loop Security Approvals",
        "description": "Real PostgreSQL SecurityApproval tickets awaiting human sign-off for gated MCP tool executions.",
        "mimeType": "application/json",
    },
    {
        "uri": "ui://kavach/workspace-panel",
        "name": "Kavach Interactive Workspace & Repository Switcher",
        "description": "Embedded ChatGPT / MCP Apps UI for switching projects, linking repositories, and launching scans without leaving chat.",
        "mimeType": "text/html+skybridge",
    },
    {
        "uri": "ui://kavach/remediation-panel",
        "name": "Kavach Interactive Remediation, Diff & Inline Approval Panel",
        "description": "Embedded ChatGPT / MCP Apps UI for inspecting diffs, verifying patches, signing off HITL approvals, and opening PRs inside chat.",
        "mimeType": "text/html+skybridge",
    },
]

MCP_RESOURCE_TEMPLATES: List[Dict[str, Any]] = [
    {
        "uriTemplate": "kavach://project/{project_id}/posture",
        "name": "Project Security Posture",
        "description": "Live vulnerability severity breakdown, latest scan statuses, blueprint summary, and pending approvals.",
        "mimeType": "application/json",
    },
    {
        "uriTemplate": "kavach://project/{project_id}/findings",
        "name": "Project Open Findings",
        "description": "Verified security findings discovered by Semgrep, Gitleaks, Trivy, OSV, and Checkov.",
        "mimeType": "application/json",
    },
    {
        "uriTemplate": "kavach://project/{project_id}/blueprint",
        "name": "Project Dynamic Security Blueprint",
        "description": "Dynamic architecture-derived security requirements generated for the target project.",
        "mimeType": "application/json",
    },
    {
        "uriTemplate": "kavach://project/{project_id}/audit-logs",
        "name": "Project Immutable MCP Audit Ledger",
        "description": "Recent MCP tool invocations, policy verdicts, and security decisions recorded in PostgreSQL.",
        "mimeType": "application/json",
    },
]


def _extract_uuid(raw: Optional[str]) -> Optional[uuid.UUID]:
    if not raw:
        return None
    try:
        return uuid.UUID(str(raw).strip())
    except (ValueError, TypeError):
        return None


async def read_mcp_resource(
    uri: str,
    user: User,
    token_payload: Optional[Dict[str, Any]],
    client_id: str,
    db: AsyncSession,
    *,
    base_url: Optional[str] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[str]]:
    """
    Reads a real `kavach://...` or interactive `ui://kavach/...` MCP resource with tenant isolation.
    Returns (resource_result, jsonrpc_error, required_scope_if_missing).
    """
    parsed = urlparse(uri.strip())
    if parsed.scheme == "ui":
        from app.core.config import get_settings
        from app.mcp.widgets import render_remediation_panel_html, render_workspace_panel_html

        cfg = get_settings()
        api_base = (
            base_url
            or getattr(cfg, "mcp_base_url", None)
            or ("https://mcp.kavachsecurity.me" if cfg.app_env == "production" else getattr(cfg, "public_app_url", "http://localhost:8000"))
        )
        host = (parsed.netloc or "").lower()
        path = (parsed.path or "").strip("/").lower()
        if host == "kavach" and path == "workspace-panel":
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "text/html+skybridge",
                        "text": render_workspace_panel_html(api_base),
                        "_meta": {
                            "openai/widgetPrefersBorder": True,
                            "openai/widgetCSP": {"connect_domains": [api_base], "resource_domains": []},
                        },
                    }
                ]
            }, None, None
        if host == "kavach" and path == "remediation-panel":
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": "text/html+skybridge",
                        "text": render_remediation_panel_html(api_base),
                        "_meta": {
                            "openai/widgetPrefersBorder": True,
                            "openai/widgetCSP": {"connect_domains": [api_base], "resource_domains": []},
                        },
                    }
                ]
            }, None, None
        return None, {"code": -32002, "message": f"UI widget resource '{uri}' not found."}, None

    if parsed.scheme != "kavach":
        return None, {"code": -32602, "message": f"Unsupported resource URI scheme in '{uri}'."}, None

    host = (parsed.netloc or "").lower()
    segments = [seg for seg in (parsed.path or "").split("/") if seg]
    token_org_id = _extract_uuid((token_payload or {}).get("org_id"))
    token_ws_id = _extract_uuid((token_payload or {}).get("workspace_id"))
    token_proj_id = _extract_uuid((token_payload or {}).get("project_id") or (token_payload or {}).get("projectId"))

    granted_scopes = {s for s in str((token_payload or {}).get("scope", "")).split() if s}

    if host == "workspace" and segments == ["active"]:
        if granted_scopes and "projects:read" not in granted_scopes and not user.is_superuser:
            return None, None, "projects:read"
        orgs, workspaces, role_map = await get_user_org_and_workspace_scope(user, db, scoped_org_id=token_org_id)
        ctx = await resolve_project_context(
            user=user,
            db=db,
            client_id=client_id,
            token_org_id=token_org_id,
            token_workspace_id=token_ws_id,
            token_project_id=token_proj_id,
            allow_single_fallback=True,
        )
        payload = {
            "user": {"id": str(user.id), "email": user.email, "name": user.name},
            "client_id": client_id,
            "organizations": [{"id": str(o.id), "name": o.name} for o in orgs],
            "workspaces": [{"id": str(w.id), "name": w.name, "role": role_map.get(str(w.id))} for w in workspaces],
            "resolution_status": ctx.status,
            "active_project": (
                {
                    "id": str(ctx.project.id),
                    "name": ctx.project.name,
                    "repository_url": ctx.project.repository_url,
                }
                if ctx.project
                else None
            ),
        }
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

    if host == "projects" and not segments:
        if granted_scopes and "projects:read" not in granted_scopes and not user.is_superuser:
            return None, None, "projects:read"
        projects = await get_accessible_projects(user, db, org_id=token_org_id)
        payload = {
            "total": len(projects),
            "projects": [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "repository_url": p.repository_url,
                    "default_branch": p.default_branch,
                    "workspace_id": str(p.workspace_id) if getattr(p, "workspace_id", None) else None,
                }
                for p in projects
            ],
        }
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

    if host == "approvals" and segments == ["pending"]:
        if granted_scopes and "projects:read" not in granted_scopes and not user.is_superuser:
            return None, None, "projects:read"
        projects = await get_accessible_projects(user, db, org_id=token_org_id)
        project_ids = [p.id for p in projects]
        items: List[Dict[str, Any]] = []
        if project_ids:
            stmt = (
                select(SecurityApproval, SecurityDecision)
                .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
                .where(SecurityDecision.project_id.in_(project_ids), SecurityApproval.status == "PENDING")
                .order_by(desc(SecurityApproval.requested_at))
                .limit(50)
            )
            for ap, dec in (await db.execute(stmt)).all():
                snap = dec.context_snapshot if isinstance(dec.context_snapshot, dict) else {}
                items.append(
                    {
                        "approval_id": str(ap.id),
                        "decision_id": str(dec.id),
                        "project_id": str(dec.project_id),
                        "tool_name": snap.get("tool_name"),
                        "operation_type": dec.operation_type,
                        "reason": ap.reason,
                        "requested_by": ap.requested_by,
                        "requested_at": ap.requested_at.isoformat() if ap.requested_at else None,
                        "expires_at": ap.expires_at.isoformat() if ap.expires_at else None,
                    }
                )
        payload = {"total_pending": len(items), "approvals": items}
        return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

    if host == "project" and len(segments) == 2:
        proj_uuid = _extract_uuid(segments[0])
        subresource = segments[1].lower()
        if not proj_uuid:
            return None, {"code": -32602, "message": f"Invalid project UUID in resource URI '{uri}'."}, None

        need_scope = "findings:read" if subresource in {"findings", "audit-logs"} else "projects:read"
        if granted_scopes and need_scope not in granted_scopes and not user.is_superuser:
            return None, None, need_scope

        project = await db.get(Project, proj_uuid)
        if not project:
            return None, {"code": -32002, "message": f"Project '{proj_uuid}' not found."}, None

        has_access = await user_can_access_project(user, project, db, scoped_org_id=token_org_id)
        if not has_access:
            return None, {"code": -32003, "message": f"Access denied to project '{proj_uuid}'."}, None

        if subresource == "findings":
            rows = (
                await db.execute(
                    select(SecurityFinding)
                    .where(SecurityFinding.project_id == proj_uuid)
                    .order_by(desc(SecurityFinding.created_at))
                    .limit(50)
                )
            ).scalars().all()
            payload = {
                "project_id": str(proj_uuid),
                "project_name": project.name,
                "count": len(rows),
                "findings": [
                    {
                        "id": str(f.id),
                        "rule_id": f.rule_id,
                        "title": f.title,
                        "severity": f.severity,
                        "status": f.status,
                        "scanner": f.scanner_name,
                        "file_path": f.file_path,
                        "line_number": f.line_number or f.line_start,
                        "cwe_id": f.cwe_id,
                    }
                    for f in rows
                ],
            }
            return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

        if subresource == "blueprint":
            bp_repo = BlueprintRepository(db)
            bp = await bp_repo.get_latest_for_project(proj_uuid)
            if not bp:
                payload = {"project_id": str(proj_uuid), "blueprint": None, "requirements": []}
            else:
                bp_obj = await bp_repo.get_by_id(bp.id)
                reqs = list(getattr(bp_obj, "requirements", []) or []) if bp_obj else []
                payload = {
                    "project_id": str(proj_uuid),
                    "blueprint": {"id": str(bp.id), "version": bp.version, "status": bp.status},
                    "requirements": [
                        {
                            "id": str(r.id),
                            "requirement_key": r.requirement_key,
                            "title": r.title,
                            "category": r.category,
                            "severity": r.severity,
                        }
                        for r in reqs
                    ],
                }
            return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

        if subresource == "posture":
            sev_rows = (
                await db.execute(
                    select(func.upper(SecurityFinding.severity), func.count(SecurityFinding.id))
                    .where(SecurityFinding.project_id == proj_uuid, func.lower(SecurityFinding.status) == "open")
                    .group_by(func.upper(SecurityFinding.severity))
                )
            ).all()
            scans = (
                await db.execute(
                    select(SecurityScan)
                    .where(SecurityScan.project_id == proj_uuid)
                    .order_by(desc(SecurityScan.created_at))
                    .limit(5)
                )
            ).scalars().all()
            payload = {
                "project_id": str(proj_uuid),
                "project_name": project.name,
                "open_findings_by_severity": {str(k or "UNKNOWN"): int(v or 0) for k, v in sev_rows},
                "recent_scans": [
                    {"id": str(s.id), "status": s.status, "created_at": s.created_at.isoformat() if s.created_at else None}
                    for s in scans
                ],
            }
            return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

        if subresource == "audit-logs":
            events = (
                await db.execute(
                    select(AuditEvent)
                    .where(
                        AuditEvent.project_id == proj_uuid,
                        AuditEvent.resource_type.in_(["mcp_tool", "mcp_resource", "mcp_approval", "mcp_gateway"]),
                    )
                    .order_by(desc(AuditEvent.timestamp))
                    .limit(40)
                )
            ).scalars().all()
            payload = {
                "project_id": str(proj_uuid),
                "events": [
                    {
                        "id": str(e.id),
                        "action": e.action,
                        "resource_type": e.resource_type,
                        "resource_id": e.resource_id,
                        "status": e.status,
                        "created_at": e.timestamp.isoformat() if e.timestamp else None,
                    }
                    for e in events
                ],
            }
            return {"contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(payload, indent=2, default=str)}]}, None, None

    return None, {"code": -32002, "message": f"Resource '{uri}' not found."}, None


# ── MCP Security Playbook Prompts ─────────────────────────────────────────────

MCP_PROMPTS: List[Dict[str, Any]] = [
    {
        "name": "security_audit_project",
        "description": "Launch an end-to-end deterministic security audit using live Kavach posture, blueprint, findings, and scanner tools.",
        "arguments": [
            {"name": "project_id", "description": "Optional target project UUID (defaults to active project)", "required": False},
            {"name": "focus", "description": "Optional focus area: SAST, SECRETS, SCA, IAC, CLOUD, or ALL", "required": False},
        ],
    },
    {
        "name": "triage_and_fix_finding",
        "description": "Investigate a verified security finding, propose a patch diff, verify remediation, and re-scan before completion.",
        "arguments": [
            {"name": "finding_id", "description": "UUID of the verified SecurityFinding to remediate", "required": True},
        ],
    },
    {
        "name": "pr_security_gate_review",
        "description": "Evaluate pull request changes against deterministic OPA policies, leaked secrets, SAST findings, and dependency CVEs.",
        "arguments": [
            {"name": "project_id", "description": "Optional project UUID", "required": False},
            {"name": "pull_request_id", "description": "Pull request number or identifier", "required": False},
        ],
    },
    {
        "name": "compliance_readiness_brief",
        "description": "Produce an evidence-backed compliance brief mapped to real policy verdicts, blueprints, and scan findings.",
        "arguments": [
            {"name": "project_id", "description": "Optional project UUID", "required": False},
            {"name": "framework", "description": "Compliance framework (SOC2, ISO27001, SLSA_L3, OWASP_ASVS)", "required": False},
        ],
    },
]

SUPPORTED_FRAMEWORKS = ["SOC2", "ISO27001", "SLSA_L3", "OWASP_ASVS", "NIST_800_53"]


async def get_mcp_prompt(
    name: str,
    arguments: Dict[str, Any],
    user: User,
    token_payload: Optional[Dict[str, Any]],
    client_id: str,
    db: AsyncSession,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    prompt_spec = next((p for p in MCP_PROMPTS if p["name"] == name), None)
    if not prompt_spec:
        return None, {"code": -32602, "message": f"Prompt '{name}' not found."}

    token_org_id = _extract_uuid((token_payload or {}).get("org_id"))
    token_ws_id = _extract_uuid((token_payload or {}).get("workspace_id"))
    token_proj_id = _extract_uuid((token_payload or {}).get("project_id") or (token_payload or {}).get("projectId"))

    if name == "triage_and_fix_finding":
        fid_raw = arguments.get("finding_id")
        fid = _extract_uuid(fid_raw)
        if not fid:
            return None, {"code": -32602, "message": "Prompt 'triage_and_fix_finding' requires a valid 'finding_id' UUID."}
        finding = await db.get(SecurityFinding, fid)
        if not finding:
            return None, {"code": -32002, "message": f"Finding '{fid}' not found."}
        if finding.project_id:
            finding_project = await db.get(Project, finding.project_id)
            if not finding_project:
                return None, {"code": -32002, "message": "Finding project not found."}
            allowed = await user_can_access_project(user, finding_project, db, scoped_org_id=token_org_id)
            if not allowed:
                return None, {"code": -32003, "message": "Access denied to finding project."}
        body = (
            f"You are triaging verified Kavach finding `{finding.id}` (`{finding.rule_id}`) in project `{finding.project_id}`.\n"
            f"- Title: {finding.title}\n"
            f"- Severity: {finding.severity} | Status: {finding.status} | Scanner: {finding.scanner_name}\n"
            f"- Location: {finding.file_path or 'N/A'}:{finding.line_number or finding.line_start or '?'}\n"
            f"- CWE: {finding.cwe_id or 'N/A'}\n\n"
            "Execute this deterministic workflow:\n"
            "1. Call `get_security_blueprint` and `check_security_policy` for the project.\n"
            "2. Call `propose_remediation_diff` with `finding_id` to inspect/generate a deterministic patch.\n"
            "3. Never claim the issue is resolved until `verify_remediation_patch` passes human approval (if required) and re-scan confirms 0 matching findings."
        )
        return {
            "description": prompt_spec["description"],
            "messages": [{"role": "user", "content": {"type": "text", "text": body}}],
        }, None

    ctx = await resolve_project_context(
        user=user,
        db=db,
        client_id=client_id,
        explicit_project_id=str(arguments["project_id"]) if arguments.get("project_id") else None,
        token_org_id=token_org_id,
        token_workspace_id=token_ws_id,
        token_project_id=token_proj_id,
        allow_single_fallback=True,
    )
    proj_line = (
        f"Resolved project: `{ctx.project.name}` (`{ctx.project.id}`)"
        if ctx.project
        else "No active project bound yet — first call `list_projects` and `set_active_project`."
    )

    if name == "security_audit_project":
        focus = str(arguments.get("focus") or "ALL").upper()
        body = (
            f"Run a real, evidence-backed Kavach security audit (Focus: `{focus}`).\n"
            f"{proj_line}\n\n"
            "Steps:\n"
            "1. Call `get_project_posture` and `list_project_findings` to read current PostgreSQL evidence.\n"
            "2. Call `get_security_blueprint` and `check_security_policy` to verify deterministic policy rules.\n"
            "3. Trigger live scanner verification with `run_security_scan` when code changes need fresh verification.\n"
            "4. Summarize only real tool outputs, severity counts, and rule IDs; clearly report any pending approvals."
        )
    elif name == "pr_security_gate_review":
        pr_id = arguments.get("pull_request_id") or "latest"
        body = (
            f"Perform a deterministic Pull Request security gate review for PR `{pr_id}`.\n"
            f"{proj_line}\n\n"
            "Steps:\n"
            "1. Inspect the PR context with `get_pull_request` (if PR number provided) and `get_github_repository`.\n"
            "2. Check `list_project_findings` and `check_security_policy` (`operation: DEPLOY_OR_MERGE`).\n"
            "3. Verify whether blockers require human sign-off via `list_pending_approvals` and report exact evidence."
        )
    else:
        framework = str(arguments.get("framework") or "SOC2").upper()
        body = (
            f"Prepare a verifiable compliance readiness brief for `{framework}`.\n"
            f"{proj_line}\n\n"
            "Steps:\n"
            "1. Call `audit_compliance_framework` with `framework: \"" + framework + "\"`.\n"
            "2. Cross-reference `get_project_posture` and `get_mcp_audit_trail` for runtime & scan proof.\n"
            "3. Report strictly observed controls, failing rules, and exact missing evidence without fabricating scores."
        )

    return {
        "description": prompt_spec["description"],
        "messages": [{"role": "user", "content": {"type": "text", "text": body}}],
    }, None


async def complete_mcp_argument(
    ref: Dict[str, Any],
    argument: Dict[str, Any],
    user: User,
    token_payload: Optional[Dict[str, Any]],
    db: AsyncSession,
) -> Dict[str, Any]:
    """Handles MCP `completion/complete` requests backed by real PostgreSQL rows."""
    arg_name = str((argument or {}).get("name") or "")
    prefix = str((argument or {}).get("value") or "").strip().lower()
    token_org_id = _extract_uuid((token_payload or {}).get("org_id"))

    values: List[str] = []
    if arg_name in {"project_id", "projectId"}:
        projects = await get_accessible_projects(user, db, org_id=token_org_id)
        for p in projects:
            pid = str(p.id)
            if not prefix or pid.lower().startswith(prefix) or p.name.lower().startswith(prefix):
                values.append(pid)
    elif arg_name == "framework":
        values = [f for f in SUPPORTED_FRAMEWORKS if not prefix or f.lower().startswith(prefix)]
    elif arg_name == "focus":
        values = [f for f in ["ALL", "SAST", "SECRETS", "SCA", "IAC", "CLOUD"] if not prefix or f.lower().startswith(prefix)]
    elif arg_name == "finding_id":
        projects = await get_accessible_projects(user, db, org_id=token_org_id)
        pids = [p.id for p in projects]
        if pids:
            frows = (
                await db.execute(
                    select(SecurityFinding.id)
                    .where(SecurityFinding.project_id.in_(pids))
                    .order_by(desc(SecurityFinding.created_at))
                    .limit(20)
                )
            ).scalars().all()
            values = [str(fid) for fid in frows if not prefix or str(fid).lower().startswith(prefix)]

    return {
        "completion": {
            "values": values[:20],
            "total": len(values),
            "hasMore": len(values) > 20,
        }
    }
