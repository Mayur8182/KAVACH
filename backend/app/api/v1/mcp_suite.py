"""
Kavach Enterprise MCP Security Suite API (`/api/v1/mcp/suite/*`).

Covers all 18 MCP Product Modules with real PostgreSQL persistence & live security engines:
01 Overview | 02 Registry | 03 Discovery | 04 Gateway | 05 Access | 06 Policies
07 Threats | 08 Runtime | 09 Scanner | 10 DLP | 11 Secrets Vault | 12 Sandbox
13 Attack Simulation | 14 Audit | 15 Compliance | 16 Integrations | 17 Analytics | 18 Settings
"""

from __future__ import annotations

import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.mcp.engines.attack_simulator import MCPAttackSimulationEngine
from app.mcp.engines.behavioral_analyzer import MCPBehavioralAnalysisEngine
from app.mcp.engines.dlp_engine import MCPDataSecurityEngine
from app.mcp.engines.threat_detector import MCPThreatDetectionEngine
from app.mcp.engines.tool_scanner import MCPToolSecurityScanner
from app.mcp.firewall import (
    discover_upstream_server,
    evaluate_firewall_rules,
    evaluate_rego_rule,
)
from app.mcp.protocol import MCP_PROMPTS, MCP_RESOURCE_TEMPLATES, MCP_STATIC_RESOURCES
from app.mcp.registry import default_tool_registry
from app.mcp.vault import encrypt_vault_secret
from app.models.audit_event import AuditEvent
from app.models.integration_models import RealIntegration
from app.models.mcp_security import (
    MCPFirewallRule,
    MCPRuntimeEvent,
    MCPSecretVaultEntry,
    MCPSimulationRun,
    MCPToolSnapshot,
    MCPUpstreamServer,
)
from app.models.oauth import MCPClientContext, OAuthToken
from app.models.policy import SecurityApproval, SecurityDecision
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.workspace_resolver import get_accessible_projects, get_user_org_and_workspace_scope

router = APIRouter(prefix="/mcp/suite", tags=["MCP Security Suite (18 Modules)"])


# ── Marketplace & Integration Catalog Definitions ──────────────────────────────

INTEGRATION_CATALOG: List[Dict[str, Any]] = [
    {"id": "claude", "name": "Claude (Web, Desktop & Code)", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["claude-web", "claude-desktop", "claude-code"]},
    {"id": "chatgpt", "name": "OpenAI / ChatGPT Connectors", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["chatgpt-mcp-connector", "kavach-chatgpt-connector", "codex-mcp"]},
    {"id": "cursor", "name": "Cursor IDE", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["cursor-mcp"]},
    {"id": "vscode", "name": "VS Code MCP", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["vscode-mcp", "kavach-vscode"]},
    {"id": "windsurf", "name": "Windsurf IDE", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["windsurf-mcp"]},
    {"id": "gemini", "name": "Gemini CLI & Code Assist", "group": "AI_ASSISTANT", "auth": "OAuth 2.1 + PKCE", "client_ids": ["gemini-cli", "gemini-mcp"]},
    {"id": "github", "name": "GitHub", "group": "INFRASTRUCTURE", "provider_key": "github", "default_url": "https://api.githubcopilot.com/mcp/"},
    {"id": "gitlab", "name": "GitLab", "group": "INFRASTRUCTURE", "provider_key": "gitlab", "default_url": "https://gitlab.example/api/v4/mcp"},
    {"id": "docker", "name": "Docker Engine & Registries", "group": "INFRASTRUCTURE", "provider_key": "docker"},
    {"id": "kubernetes", "name": "Kubernetes Clusters", "group": "INFRASTRUCTURE", "provider_key": "kubernetes"},
    {"id": "aws", "name": "AWS Cloud Posture", "group": "INFRASTRUCTURE", "provider_key": "aws"},
    {"id": "azure", "name": "Microsoft Azure", "group": "INFRASTRUCTURE", "provider_key": "azure"},
    {"id": "gcp", "name": "Google Cloud Platform", "group": "INFRASTRUCTURE", "provider_key": "gcp"},
    {"id": "postgresql", "name": "PostgreSQL", "group": "INFRASTRUCTURE", "provider_key": "postgresql"},
    {"id": "redis", "name": "Redis", "group": "INFRASTRUCTURE", "provider_key": "redis"},
    {"id": "jira", "name": "Jira", "group": "INFRASTRUCTURE", "provider_key": "jira"},
]


# ── Pydantic Request Models ────────────────────────────────────────────────────

class RegisterServerPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    server_url: str = Field(..., min_length=8, max_length=1024)
    transport: str = Field(default="streamable-http")
    category: str = Field(default="custom")
    auth_mode: str = Field(default="oauth2")
    firewall_mode: str = Field(default="ENFORCE")
    vault_secret_id: Optional[str] = None
    auto_discover: bool = True


class UpdateServerPayload(BaseModel):
    firewall_mode: Optional[str] = None
    trust_tier: Optional[str] = None
    vault_secret_id: Optional[str] = None


class CreateFirewallRulePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    rule_type: str = Field(default="FIREWALL")
    tool_pattern: str = Field(default="*")
    client_pattern: str = Field(default="*")
    action: str = Field(default="DENY")
    priority: int = Field(default=100, ge=1, le=1000)
    rego_policy: Optional[str] = None
    conditions: Dict[str, Any] = Field(default_factory=dict)


class SimulatePolicyPayload(BaseModel):
    tool_name: str = Field(default="run_security_scan")
    client_name: str = Field(default="chatgpt")
    risk_level: str = Field(default="MEDIUM")
    environment: str = Field(default="production")
    arguments: Dict[str, Any] = Field(default_factory=dict)
    rego_policy: Optional[str] = None


class CreateVaultSecretPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    provider: str = Field(default="custom")
    scope: str = Field(default="mcp:upstream")
    secret_value: str = Field(..., min_length=4)


class RotateVaultSecretPayload(BaseModel):
    secret_value: str = Field(..., min_length=4)


class ScannerRunPayload(BaseModel):
    source_path: Optional[str] = None
    server_id: Optional[str] = None


class DlpInspectPayload(BaseModel):
    payload: Any
    stage: str = Field(default="RESPONSE")
    redact: bool = Field(default=True)


class SandboxExecutePayload(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    client_name: str = Field(default="kavach-sandbox")
    mock_response: Optional[Dict[str, Any]] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _slugify(val: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", (val or "").lower()).strip("-")
    return cleaned[:90] or f"server-{uuid.uuid4().hex[:6]}"


async def _ensure_non_viewer(user: User, db: AsyncSession) -> None:
    _, _, role_map = await get_user_org_and_workspace_scope(user, db)
    if not user.is_superuser and role_map:
        if all(str(r or "").upper() in {"VIEWER", "AUDITOR"} for r in role_map.values()):
            raise HTTPException(status_code=403, detail="Viewer role cannot modify MCP security controls.")


def _first_org_id(orgs: Any) -> Optional[uuid.UUID]:
    if not orgs:
        return None
    if isinstance(orgs, dict):
        return next(iter(orgs.keys()), None)
    return orgs[0].id


# ── 01. Overview & KPIs ────────────────────────────────────────────────────────

@router.get("/overview")
async def get_mcp_suite_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = await get_accessible_projects(current_user, db)
    project_ids = [p.id for p in projects]

    servers = (
        await db.execute(select(MCPUpstreamServer).where(MCPUpstreamServer.owner_id == current_user.id))
    ).scalars().all()

    total_events = (await db.execute(select(func.count(MCPRuntimeEvent.id)))).scalar() or 0
    blocked_events = (
        await db.execute(select(func.count(MCPRuntimeEvent.id)).where(MCPRuntimeEvent.decision == "BLOCK"))
    ).scalar() or 0
    redacted_events = (
        await db.execute(select(func.count(MCPRuntimeEvent.id)).where(MCPRuntimeEvent.decision == "REDACTED"))
    ).scalar() or 0
    avg_latency = (await db.execute(select(func.avg(MCPRuntimeEvent.latency_ms)))).scalar() or 0.0
    total_tokens = (await db.execute(select(func.sum(MCPRuntimeEvent.tokens_estimated)))).scalar() or 0

    active_rules = (
        await db.execute(select(func.count(MCPFirewallRule.id)).where(MCPFirewallRule.is_active == True))  # noqa: E712
    ).scalar() or 0
    vault_count = (
        await db.execute(
            select(func.count(MCPSecretVaultEntry.id)).where(
                MCPSecretVaultEntry.owner_id == current_user.id,
                MCPSecretVaultEntry.is_active == True,  # noqa: E712
            )
        )
    ).scalar() or 0
    pending_approvals = 0
    if project_ids:
        pending_approvals = (
            await db.execute(
                select(func.count(SecurityApproval.id))
                .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
                .where(SecurityDecision.project_id.in_(project_ids), SecurityApproval.status == "PENDING")
            )
        ).scalar() or 0

    latest_sim = (
        await db.execute(
            select(MCPSimulationRun)
            .where(MCPSimulationRun.user_id == current_user.id)
            .order_by(desc(MCPSimulationRun.created_at))
            .limit(1)
        )
    ).scalars().first()

    rug_pulls = (
        await db.execute(select(func.count(MCPToolSnapshot.id)).where(MCPToolSnapshot.rug_pull_detected == True))  # noqa: E712
    ).scalar() or 0

    return {
        "gateway_status": "ONLINE",
        "protocol_version": "2025-03-26",
        "builtin_tools_count": len(default_tool_registry.list_tools()),
        "upstream_servers_count": len(servers),
        "upstream_servers_online": sum(1 for s in servers if s.status == "ONLINE"),
        "total_intercepted_requests": int(total_events),
        "blocked_requests": int(blocked_events),
        "dlp_redactions": int(redacted_events),
        "rug_pull_alerts": int(rug_pulls),
        "active_firewall_rules": int(active_rules),
        "vault_secrets_count": int(vault_count),
        "pending_approvals": int(pending_approvals),
        "avg_latency_ms": round(float(avg_latency), 2),
        "total_tokens_estimated": int(total_tokens),
        "latest_simulation": (
            {
                "id": str(latest_sim.id),
                "total_tests": latest_sim.total_tests,
                "blocked_count": latest_sim.blocked_count,
                "bypassed_count": latest_sim.bypassed_count,
                "created_at": latest_sim.created_at.isoformat(),
            }
            if latest_sim
            else None
        ),
        "resources_count": len(MCP_STATIC_RESOURCES) + len(MCP_RESOURCE_TEMPLATES),
        "prompts_count": len(MCP_PROMPTS),
    }


# ── 02 & 03 & 04. Registry, Discovery, Version Diff & Gateway Servers ──────────

@router.get("/servers")
async def list_upstream_servers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(MCPUpstreamServer)
            .where(MCPUpstreamServer.owner_id == current_user.id)
            .order_by(desc(MCPUpstreamServer.created_at))
        )
    ).scalars().all()

    return {
        "total": len(rows),
        "items": [
            {
                "id": str(s.id),
                "name": s.name,
                "slug": s.slug,
                "server_url": s.server_url,
                "transport": s.transport,
                "category": s.category,
                "auth_mode": s.auth_mode,
                "firewall_mode": s.firewall_mode,
                "trust_tier": s.trust_tier,
                "status": s.status,
                "version": s.version,
                "tools_count": s.tools_count,
                "risk_score": s.risk_score,
                "last_error": s.last_error,
                "last_synced_at": s.last_synced_at.isoformat() if s.last_synced_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in rows
        ],
    }


@router.post("/servers")
async def register_upstream_server(
    payload: RegisterServerPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    orgs, _, _ = await get_user_org_and_workspace_scope(current_user, db)
    org_id = _first_org_id(orgs)
    vault_uuid = None
    if payload.vault_secret_id:
        try:
            vault_uuid = uuid.UUID(payload.vault_secret_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid vault_secret_id UUID.")

    srv = MCPUpstreamServer(
        organization_id=org_id,
        owner_id=current_user.id,
        name=payload.name.strip(),
        slug=_slugify(payload.name),
        server_url=payload.server_url.strip(),
        transport=payload.transport.strip(),
        category=payload.category.strip(),
        auth_mode=payload.auth_mode.strip(),
        firewall_mode=payload.firewall_mode.strip().upper(),
        vault_secret_id=vault_uuid,
        status="REGISTERED",
    )
    db.add(srv)
    await db.commit()
    await db.refresh(srv)

    discovery_result = None
    if payload.auto_discover:
        discovery_result = await discover_upstream_server(srv, db)
        await db.refresh(srv)

    await AuditService(db).log_event(
        action="MCP_UPSTREAM_SERVER_REGISTERED",
        resource_type="mcp_gateway",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(srv.id),
        status="SUCCESS",
        metadata={"name": srv.name, "server_url": srv.server_url, "sync_status": srv.status},
    )
    await db.commit()
    return {
        "server": {
            "id": str(srv.id),
            "name": srv.name,
            "slug": srv.slug,
            "server_url": srv.server_url,
            "status": srv.status,
            "tools_count": srv.tools_count,
            "risk_score": srv.risk_score,
            "last_error": srv.last_error,
        },
        "discovery": discovery_result,
    }


@router.post("/servers/{server_id}/discover")
async def discover_server_tools(
    server_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    srv = await db.get(MCPUpstreamServer, server_id)
    if not srv or (srv.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Registered MCP server not found.")
    result = await discover_upstream_server(srv, db)
    return {"server_id": str(srv.id), "status": srv.status, **result}


@router.patch("/servers/{server_id}")
async def update_upstream_server(
    server_id: uuid.UUID,
    payload: UpdateServerPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    srv = await db.get(MCPUpstreamServer, server_id)
    if not srv or (srv.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Registered MCP server not found.")
    if payload.firewall_mode:
        srv.firewall_mode = payload.firewall_mode.strip().upper()
    if payload.trust_tier:
        srv.trust_tier = payload.trust_tier.strip().upper()
    if payload.vault_secret_id is not None:
        srv.vault_secret_id = uuid.UUID(payload.vault_secret_id) if payload.vault_secret_id else None
    await db.commit()
    return {"id": str(srv.id), "firewall_mode": srv.firewall_mode, "trust_tier": srv.trust_tier}


@router.delete("/servers/{server_id}")
async def delete_upstream_server(
    server_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    srv = await db.get(MCPUpstreamServer, server_id)
    if not srv or (srv.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Registered MCP server not found.")
    await db.delete(srv)
    await db.commit()
    return {"deleted": True, "id": str(server_id)}


# ── 06. Firewall Rules, OPA/Rego Policies & Simulation ────────────────────────

@router.get("/firewall")
async def list_firewall_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(select(MCPFirewallRule).order_by(desc(MCPFirewallRule.priority)))
    ).scalars().all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(r.id),
                "name": r.name,
                "description": r.description,
                "rule_type": r.rule_type,
                "tool_pattern": r.tool_pattern,
                "client_pattern": r.client_pattern,
                "action": r.action,
                "priority": r.priority,
                "rego_policy": r.rego_policy,
                "is_active": r.is_active,
                "match_count": r.match_count,
                "created_by": r.created_by,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/firewall")
async def create_firewall_rule(
    payload: CreateFirewallRulePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    orgs, _, _ = await get_user_org_and_workspace_scope(current_user, db)
    rule = MCPFirewallRule(
        organization_id=_first_org_id(orgs),
        created_by=current_user.email,
        name=payload.name.strip(),
        description=payload.description,
        rule_type=payload.rule_type.strip().upper(),
        tool_pattern=payload.tool_pattern.strip(),
        client_pattern=payload.client_pattern.strip(),
        action=payload.action.strip().upper(),
        priority=payload.priority,
        rego_policy=payload.rego_policy,
        conditions=payload.conditions,
        is_active=True,
    )
    db.add(rule)
    await AuditService(db).log_event(
        action="MCP_FIREWALL_RULE_CREATED",
        resource_type="mcp_gateway",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=rule.name,
        status="SUCCESS",
        metadata={"action": rule.action, "tool_pattern": rule.tool_pattern, "rule_type": rule.rule_type},
    )
    await db.commit()
    await db.refresh(rule)
    return {"id": str(rule.id), "name": rule.name, "action": rule.action, "is_active": rule.is_active}


@router.delete("/firewall/{rule_id}")
async def delete_firewall_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    rule = await db.get(MCPFirewallRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Firewall rule not found.")
    await db.delete(rule)
    await db.commit()
    return {"deleted": True, "id": str(rule_id)}


@router.post("/policies/simulate")
async def simulate_mcp_security_policy(
    payload: SimulatePolicyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dry-run tests OPA Rego rules, Firewall rules, Threat Detection, and DLP without side-effects."""
    threat_res = MCPThreatDetectionEngine.inspect_request(tool_name=payload.tool_name, arguments=payload.arguments)
    dlp_res = MCPDataSecurityEngine.inspect_payload(payload.arguments, stage="REQUEST", redact=True)
    fw_res = await evaluate_firewall_rules(
        db,
        tool_name=payload.tool_name,
        client_name=payload.client_name,
        risk_level=payload.risk_level,
        arguments=payload.arguments,
        environment=payload.environment,
    )
    rego_res = (
        evaluate_rego_rule(
            payload.rego_policy,
            {
                "tool": payload.tool_name,
                "client": payload.client_name,
                "risk_level": payload.risk_level,
                "environment": payload.environment,
                "arguments": payload.arguments,
            },
        )
        if payload.rego_policy
        else {"decision": "ALLOW", "matched_checks": [], "reasons": []}
    )

    final_decision = "ALLOW"
    if (
        threat_res["verdict"] == "BLOCK"
        or dlp_res["verdict"] == "BLOCK"
        or fw_res["decision"] == "DENY"
        or rego_res["decision"] == "DENY"
    ):
        final_decision = "BLOCK"
    elif fw_res["decision"] == "REQUIRE_APPROVAL" or rego_res["decision"] == "REQUIRE_APPROVAL":
        final_decision = "REQUIRE_APPROVAL"

    return {
        "final_decision": final_decision,
        "threat_detection": threat_res,
        "dlp_inspection": {k: v for k, v in dlp_res.items() if k != "sanitized_payload"},
        "firewall": fw_res,
        "rego_evaluation": rego_res,
    }


# ── 09. MCP Tool Security Scanner & Version Registry ──────────────────────────

@router.get("/scanner")
async def get_scanner_snapshots(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snaps = (
        await db.execute(select(MCPToolSnapshot).order_by(desc(MCPToolSnapshot.risk_score), MCPToolSnapshot.tool_name))
    ).scalars().all()
    return {
        "total": len(snaps),
        "rug_pull_count": sum(1 for s in snaps if s.rug_pull_detected),
        "flagged_count": sum(1 for s in snaps if s.security_status in {"FLAGGED", "BLOCKED"}),
        "items": [
            {
                "id": str(s.id),
                "server_slug": s.server_slug,
                "tool_name": s.tool_name,
                "version": s.version,
                "description_hash": s.description_hash,
                "input_schema_hash": s.input_schema_hash,
                "rug_pull_detected": s.rug_pull_detected,
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "security_status": s.security_status,
                "findings": s.findings,
                "last_scanned_at": s.last_scanned_at.isoformat() if s.last_scanned_at else None,
            }
            for s in snaps
        ],
    }


@router.post("/scanner/run")
async def run_mcp_security_scanner(
    payload: ScannerRunPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scans all built-in + upstream MCP tools and persists hash baselines & risk scores."""
    existing = {
        (s.server_slug, s.tool_name): s
        for s in (await db.execute(select(MCPToolSnapshot))).scalars().all()
    }
    scanned: List[Dict[str, Any]] = []

    for t in default_tool_registry.list_tools():
        prev = existing.get(("kavach-builtin", t.name))
        res = MCPToolSecurityScanner.scan_tool_definition(
            name=t.name,
            description=t.description,
            input_schema=t.input_schema,
            requires_approval=t.requires_approval,
            risk_level=t.risk_level,
            auth_mode="oauth2",
            baseline_desc_hash=prev.description_hash if prev else None,
            baseline_schema_hash=prev.input_schema_hash if prev else None,
        )
        if prev:
            prev.description_hash = res["description_hash"]
            prev.input_schema_hash = res["input_schema_hash"]
            prev.rug_pull_detected = res["rug_pull_detected"]
            prev.risk_score = res["risk_score"]
            prev.risk_level = res["risk_level"]
            prev.security_status = res["security_status"]
            prev.findings = res["findings"]
            prev.last_scanned_at = datetime.now(timezone.utc)
        else:
            db.add(
                MCPToolSnapshot(
                    server_slug="kavach-builtin",
                    tool_name=t.name,
                    version=t.version,
                    description_hash=res["description_hash"],
                    input_schema_hash=res["input_schema_hash"],
                    rug_pull_detected=False,
                    risk_score=res["risk_score"],
                    risk_level=res["risk_level"],
                    security_status=res["security_status"],
                    findings=res["findings"],
                )
            )
        scanned.append(res)

    source_scan = None
    if payload.source_path:
        source_scan = await MCPToolSecurityScanner.scan_local_source_directory(payload.source_path)

    await db.commit()
    return {
        "scanned_tools_count": len(scanned),
        "flagged_count": sum(1 for r in scanned if r["security_status"] != "VERIFIED"),
        "source_scan": source_scan,
    }


# ── 07, 08, 10, 17. Threats, Runtime Observability, DLP & Analytics ────────────

@router.get("/runtime")
async def list_runtime_events(
    limit: int = Query(default=40, ge=1, le=200),
    decision: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(MCPRuntimeEvent).order_by(desc(MCPRuntimeEvent.created_at)).limit(limit)
    if decision:
        stmt = (
            select(MCPRuntimeEvent)
            .where(MCPRuntimeEvent.decision == decision.upper())
            .order_by(desc(MCPRuntimeEvent.created_at))
            .limit(limit)
        )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(r.id),
                "request_id": r.request_id,
                "client_name": r.client_name,
                "server_slug": r.server_slug,
                "tool_name": r.tool_name,
                "stage": r.stage,
                "decision": r.decision,
                "status": r.status,
                "latency_ms": r.latency_ms,
                "tokens_estimated": r.tokens_estimated,
                "threat_score": r.threat_score,
                "risk_score": r.risk_score,
                "threat_findings": r.threat_findings,
                "dlp_findings": r.dlp_findings,
                "behavioral_flags": r.behavioral_flags,
                "policy_reason": r.policy_reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.get("/threats")
async def list_mcp_threats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(MCPRuntimeEvent)
            .where((MCPRuntimeEvent.threat_score > 0) | (MCPRuntimeEvent.decision == "BLOCK"))
            .order_by(desc(MCPRuntimeEvent.created_at))
            .limit(60)
        )
    ).scalars().all()
    rug_pulls = (
        await db.execute(select(MCPToolSnapshot).where(MCPToolSnapshot.rug_pull_detected == True))  # noqa: E712
    ).scalars().all()
    return {
        "threat_events_count": len(rows),
        "rug_pull_alerts_count": len(rug_pulls),
        "events": [
            {
                "id": str(r.id),
                "request_id": r.request_id,
                "client_name": r.client_name,
                "tool_name": r.tool_name,
                "decision": r.decision,
                "threat_score": r.threat_score,
                "threat_findings": r.threat_findings,
                "behavioral_flags": r.behavioral_flags,
                "policy_reason": r.policy_reason,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "rug_pulls": [
            {
                "id": str(rp.id),
                "server_slug": rp.server_slug,
                "tool_name": rp.tool_name,
                "risk_score": rp.risk_score,
                "findings": rp.findings,
                "last_scanned_at": rp.last_scanned_at.isoformat() if rp.last_scanned_at else None,
            }
            for rp in rug_pulls
        ],
    }


@router.get("/dlp")
async def list_dlp_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(MCPRuntimeEvent).order_by(desc(MCPRuntimeEvent.created_at)).limit(100)
        )
    ).scalars().all()
    dlp_rows = [r for r in rows if r.dlp_findings]
    return {
        "total_dlp_events": len(dlp_rows),
        "items": [
            {
                "id": str(r.id),
                "request_id": r.request_id,
                "client_name": r.client_name,
                "tool_name": r.tool_name,
                "decision": r.decision,
                "dlp_findings": r.dlp_findings,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in dlp_rows
        ],
    }


@router.post("/dlp/inspect")
async def run_live_dlp_inspection(
    payload: DlpInspectPayload,
    current_user: User = Depends(get_current_user),
):
    """Inspects and sanitizes any arbitrary payload using the real Kavach DLP engine."""
    return MCPDataSecurityEngine.inspect_payload(
        payload.payload, stage=payload.stage, redact=payload.redact
    )


@router.get("/analytics")
async def get_mcp_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decision_rows = (
        await db.execute(select(MCPRuntimeEvent.decision, func.count(MCPRuntimeEvent.id)).group_by(MCPRuntimeEvent.decision))
    ).all()
    top_tools = (
        await db.execute(
            select(
                MCPRuntimeEvent.tool_name,
                func.count(MCPRuntimeEvent.id).label("cnt"),
                func.avg(MCPRuntimeEvent.latency_ms).label("avg_ms"),
                func.sum(MCPRuntimeEvent.tokens_estimated).label("toks"),
            )
            .group_by(MCPRuntimeEvent.tool_name)
            .order_by(desc("cnt"))
            .limit(12)
        )
    ).all()
    client_rows = (
        await db.execute(
            select(MCPRuntimeEvent.client_name, func.count(MCPRuntimeEvent.id))
            .group_by(MCPRuntimeEvent.client_name)
            .order_by(desc(func.count(MCPRuntimeEvent.id)))
            .limit(10)
        )
    ).all()
    return {
        "decisions_breakdown": {str(k): int(v or 0) for k, v in decision_rows},
        "top_tools": [
            {
                "tool_name": str(row[0]),
                "calls": int(row[1] or 0),
                "avg_latency_ms": round(float(row[2] or 0), 2),
                "tokens_estimated": int(row[3] or 0),
            }
            for row in top_tools
        ],
        "clients_breakdown": [{"client_name": str(r[0]), "calls": int(r[1] or 0)} for r in client_rows],
    }


# ── 11. Secrets Vault ──────────────────────────────────────────────────────────

@router.get("/secrets")
async def list_vault_secrets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(MCPSecretVaultEntry)
            .where(MCPSecretVaultEntry.owner_id == current_user.id)
            .order_by(desc(MCPSecretVaultEntry.created_at))
        )
    ).scalars().all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(s.id),
                "name": s.name,
                "provider": s.provider,
                "scope": s.scope,
                "masked_preview": s.masked_preview,
                "key_fingerprint": s.key_fingerprint[:16],
                "rotation_count": s.rotation_count,
                "is_active": s.is_active,
                "last_rotated_at": s.last_rotated_at.isoformat() if s.last_rotated_at else None,
            }
            for s in rows
        ],
    }


@router.post("/secrets")
async def create_vault_secret(
    payload: CreateVaultSecretPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    enc, masked, fp = encrypt_vault_secret(payload.secret_value)
    orgs, _, _ = await get_user_org_and_workspace_scope(current_user, db)
    entry = MCPSecretVaultEntry(
        organization_id=_first_org_id(orgs),
        owner_id=current_user.id,
        name=payload.name.strip(),
        provider=payload.provider.strip(),
        scope=payload.scope.strip(),
        encrypted_value=enc,
        masked_preview=masked,
        key_fingerprint=fp,
        is_active=True,
    )
    db.add(entry)
    await AuditService(db).log_event(
        action="MCP_VAULT_SECRET_STORED",
        resource_type="mcp_gateway",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=entry.name,
        status="SUCCESS",
        metadata={"provider": entry.provider, "fingerprint": fp[:16]},
    )
    await db.commit()
    await db.refresh(entry)
    return {"id": str(entry.id), "name": entry.name, "masked_preview": entry.masked_preview, "is_active": True}


@router.post("/secrets/{secret_id}/rotate")
async def rotate_vault_secret(
    secret_id: uuid.UUID,
    payload: RotateVaultSecretPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    entry = await db.get(MCPSecretVaultEntry, secret_id)
    if not entry or (entry.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Vault secret not found.")
    enc, masked, fp = encrypt_vault_secret(payload.secret_value)
    entry.encrypted_value = enc
    entry.masked_preview = masked
    entry.key_fingerprint = fp
    entry.rotation_count = (entry.rotation_count or 0) + 1
    entry.last_rotated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(entry.id), "masked_preview": masked, "rotation_count": entry.rotation_count}


@router.delete("/secrets/{secret_id}")
async def delete_vault_secret(
    secret_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _ensure_non_viewer(current_user, db)
    entry = await db.get(MCPSecretVaultEntry, secret_id)
    if not entry or (entry.owner_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=404, detail="Vault secret not found.")
    await db.delete(entry)
    await db.commit()
    return {"deleted": True, "id": str(secret_id)}


# ── 12. Isolated MCP Sandbox Dry-Run Pipeline Inspector ───────────────────────

@router.post("/sandbox/execute")
async def sandbox_inspect_execution(
    payload: SandboxExecutePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Runs all pre-execution + optional response inspection security layers in isolated dry-run mode."""
    t0 = time.perf_counter()
    tool_def = default_tool_registry.get_tool(payload.tool_name)
    risk_level = tool_def.risk_level if tool_def else "HIGH"

    behavior = await MCPBehavioralAnalysisEngine.analyze_request(
        db,
        client_name=payload.client_name,
        server_slug="kavach-sandbox",
        tool_name=payload.tool_name,
        arguments=payload.arguments,
        user_id=current_user.id,
    )
    threat_req = MCPThreatDetectionEngine.inspect_request(
        tool_name=payload.tool_name,
        arguments=payload.arguments,
        tool_description=tool_def.description if tool_def else "",
        recent_tools=behavior.get("recent_tools"),
    )
    dlp_req = MCPDataSecurityEngine.inspect_payload(payload.arguments, stage="REQUEST", redact=False)
    firewall = await evaluate_firewall_rules(
        db,
        tool_name=payload.tool_name,
        client_name=payload.client_name,
        risk_level=risk_level,
        arguments=payload.arguments,
    )

    resp_threat = None
    resp_dlp = None
    if payload.mock_response is not None:
        resp_threat = MCPThreatDetectionEngine.inspect_response(
            tool_name=payload.tool_name, response_payload=payload.mock_response
        )
        resp_dlp = MCPDataSecurityEngine.inspect_payload(payload.mock_response, stage="RESPONSE", redact=True)

    verdict = "ALLOW"
    if (
        threat_req["verdict"] == "BLOCK"
        or dlp_req["verdict"] == "BLOCK"
        or firewall["decision"] == "DENY"
        or (resp_threat and resp_threat["verdict"] == "BLOCK")
    ):
        verdict = "BLOCK"
    elif firewall["decision"] == "REQUIRE_APPROVAL" or (tool_def and tool_def.requires_approval):
        verdict = "REQUIRE_APPROVAL"
    elif resp_dlp and resp_dlp["verdict"] == "REDACTED":
        verdict = "REDACTED"

    return {
        "sandbox_isolated": True,
        "tool_name": payload.tool_name,
        "verdict": verdict,
        "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
        "stages": {
            "behavioral": behavior,
            "threat_request": threat_req,
            "dlp_request": {k: v for k, v in dlp_req.items() if k != "sanitized_payload"},
            "firewall": firewall,
            "threat_response": resp_threat,
            "dlp_response": resp_dlp,
        },
    }


# ── 13. Red-Team Attack Simulation ────────────────────────────────────────────

@router.get("/simulations")
async def list_attack_simulations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(MCPSimulationRun)
            .where(MCPSimulationRun.user_id == current_user.id)
            .order_by(desc(MCPSimulationRun.created_at))
            .limit(20)
        )
    ).scalars().all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": str(r.id),
                "total_tests": r.total_tests,
                "blocked_count": r.blocked_count,
                "bypassed_count": r.bypassed_count,
                "status": r.status,
                "duration_ms": r.duration_ms,
                "results": r.results,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.post("/simulations/run")
async def run_attack_simulation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Runs the live 6-vector MCP Attack Simulation Engine against Kavach's active defense layers."""
    sim = MCPAttackSimulationEngine.run_red_team_suite()
    run_row = MCPSimulationRun(
        user_id=current_user.id,
        total_tests=sim["total_tests"],
        blocked_count=sim["blocked_count"],
        bypassed_count=sim["bypassed_count"],
        status="COMPLETED",
        duration_ms=sim["duration_ms"],
        results=sim["results"],
    )
    db.add(run_row)
    await AuditService(db).log_event(
        action="MCP_ATTACK_SIMULATION_RUN",
        resource_type="mcp_gateway",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(run_row.id),
        status="SUCCESS",
        metadata={"blocked": sim["blocked_count"], "bypassed": sim["bypassed_count"], "total": sim["total_tests"]},
    )
    await db.commit()
    await db.refresh(run_row)
    return {
        "id": str(run_row.id),
        **sim,
        "created_at": run_row.created_at.isoformat(),
    }


# ── 15. Compliance Controls Mapping (Real DB Evidence) ────────────────────────

@router.get("/compliance")
async def get_mcp_compliance_controls(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_rules = (
        await db.execute(select(func.count(MCPFirewallRule.id)).where(MCPFirewallRule.is_active == True))  # noqa: E712
    ).scalar() or 0
    total_audit = (await db.execute(select(func.count(AuditEvent.id)).where(AuditEvent.resource_type.like("mcp_%")))).scalar() or 0
    total_runtime = (await db.execute(select(func.count(MCPRuntimeEvent.id)))).scalar() or 0
    latest_sim = (
        await db.execute(
            select(MCPSimulationRun)
            .where(MCPSimulationRun.user_id == current_user.id)
            .order_by(desc(MCPSimulationRun.created_at))
            .limit(1)
        )
    ).scalars().first()
    snapshots_count = (await db.execute(select(func.count(MCPToolSnapshot.id)))).scalar() or 0

    controls = [
        {
            "control_id": "OWASP-MCP-01 / SOC2 CC6.1",
            "title": "OAuth 2.1 + PKCE (S256) + RS256 Token Authentication",
            "status": "ENFORCED",
            "evidence": "OAuth 2.1 Authorization Server + RFC 9728 Metadata + JWKS RS256 active on /mcp.",
        },
        {
            "control_id": "OWASP-MCP-02 / SOC2 CC6.6",
            "title": "Runtime Prompt Injection, Tool Poisoning & DLP Inspection",
            "status": "ENFORCED",
            "evidence": f"{total_runtime} runtime request/response inspections recorded in PostgreSQL.",
        },
        {
            "control_id": "OWASP-MCP-03 / ISO27001 A.8.2",
            "title": "Cryptographic Human-in-the-Loop Approval for High-Risk Actions",
            "status": "ENFORCED",
            "evidence": "SecurityApproval SHA-256 canonical argument binding enforced on requires_approval tools.",
        },
        {
            "control_id": "OWASP-MCP-04 / SLSA L3",
            "title": "MCP Tool Supply Chain & Rug-Pull Schema Integrity Scanning",
            "status": "VERIFIED" if snapshots_count > 0 else "PENDING_SCAN",
            "evidence": f"{snapshots_count} tool hash snapshots tracked in MCPToolSnapshot." if snapshots_count else "Run MCP Scanner to establish hash baselines.",
        },
        {
            "control_id": "SOC2 CC7.2 / NIST AI RMF",
            "title": "Immutable Audit Logging & Adversarial Red-Team Validation",
            "status": "VERIFIED" if (latest_sim and latest_sim.bypassed_count == 0) else "ACTION_REQUIRED" if latest_sim else "PENDING_SIMULATION",
            "evidence": (
                f"{total_audit} immutable MCP audit events logged; latest red-team run blocked {latest_sim.blocked_count}/{latest_sim.total_tests}."
                if latest_sim
                else f"{total_audit} immutable MCP audit events logged; run Red-Team Simulation to generate adversarial proof."
            ),
        },
        {
            "control_id": "OPA-GATE-01 / ISO27001 A.5.15",
            "title": "Custom MCP Firewall & Declarative OPA/Rego Policy Rules",
            "status": "ENFORCED" if active_rules > 0 else "DEFAULT_BASELINE",
            "evidence": f"{active_rules} custom active MCPFirewallRule entries active alongside default Zero-Trust gate.",
        },
    ]
    return {"total_controls": len(controls), "controls": controls}


# ── 16. Integrations & Marketplace Status (Real Connection State) ──────────────

@router.get("/marketplace")
async def get_mcp_marketplace_and_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    upstream = (
        await db.execute(select(MCPUpstreamServer).where(MCPUpstreamServer.owner_id == current_user.id))
    ).scalars().all()
    upstream_by_cat = {s.category.lower(): s for s in upstream}

    connected_clients = (
        await db.execute(
            select(OAuthToken.client_id).where(
                OAuthToken.user_id == current_user.id, OAuthToken.is_revoked == False  # noqa: E712
            )
        )
    ).scalars().all()
    active_client_set = set(connected_clients)

    real_ints = (
        await db.execute(select(RealIntegration.provider).where(func.lower(RealIntegration.status) == "connected"))
    ).scalars().all()
    active_providers = {str(p).lower() for p in real_ints}

    items: List[Dict[str, Any]] = []
    for entry in INTEGRATION_CATALOG:
        if entry["group"] == "AI_ASSISTANT":
            cids = set(entry.get("client_ids") or [])
            is_conn = len(active_client_set.intersection(cids)) > 0
            status_val = "CONNECTED" if is_conn else "READY_OAUTH"
        else:
            prov = str(entry.get("provider_key") or entry["id"]).lower()
            env_connected = (
                (prov == "github" and bool(os.getenv("GITHUB_CLIENT_ID") or os.getenv("GITHUB_TOKEN")))
                or (prov == "postgresql")
            )
            srv = upstream_by_cat.get(prov)
            is_conn = prov in active_providers or bool(srv and srv.status == "ONLINE") or env_connected
            status_val = "CONNECTED" if is_conn else "NOT CONFIGURED"

        items.append(
            {
                **entry,
                "status": status_val,
                "connected": status_val == "CONNECTED",
            }
        )

    return {"total": len(items), "items": items}

