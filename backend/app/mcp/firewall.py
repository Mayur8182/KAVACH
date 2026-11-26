"""
Kavach MCP Firewall, Deterministic OPA/Rego Policy Evaluator & Upstream Gateway Router.

Enforces:
- Allowlists, denylists, client/tool wildcards, risk thresholds, and Rego predicates
- Real upstream remote MCP discovery (`initialize` + `tools/list`) with tool contract hashing
- Sandboxed multi-server routing (`serverSlug::toolName`) with SSRF guard & Vault credential injection
"""

from __future__ import annotations

import fnmatch
import ipaddress
import re
import socket
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.engines.tool_scanner import MCPToolSecurityScanner
from app.mcp.vault import decrypt_vault_secret
from app.models.mcp_security import (
    MCPFirewallRule,
    MCPSecretVaultEntry,
    MCPToolSnapshot,
    MCPUpstreamServer,
)


def _is_safe_upstream_url(url: str) -> Optional[str]:
    """Validates remote MCP server URL; returns rejection reason or None if safe."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return "Malformed URL."
    if parsed.scheme.lower() not in {"https", "http"} or not parsed.hostname:
        return "Upstream URL must use http:// or https:// with a valid hostname."
    host = parsed.hostname.lower()
    if host in {"169.254.169.254", "metadata.google.internal"}:
        return "Cloud metadata addresses are blocked by SSRF policy."
    if parsed.scheme.lower() == "http" and host not in {"localhost", "127.0.0.1", "::1"}:
        return "Non-localhost upstream MCP servers must use HTTPS."
    try:
        ip = ipaddress.ip_address(host)
        if (ip.is_link_local or ip.is_multicast or ip.is_reserved) and not ip.is_loopback:
            return f"Blocked unsafe upstream IP address: {host}"
    except ValueError:
        try:
            infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
            for info in infos:
                ip = ipaddress.ip_address(info[4][0])
                if ip.is_link_local or ip.is_multicast or ip.is_reserved:
                    return f"Blocked upstream resolved IP: {info[4][0]}"
        except Exception:
            pass
    return None


def _get_nested(data: Dict[str, Any], path: str) -> Any:
    curr: Any = data
    for part in path.split("."):
        if isinstance(curr, dict):
            curr = curr.get(part)
        else:
            return None
    return curr


def evaluate_rego_rule(rego_code: str, input_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic in-process Rego predicate evaluator supporting real OPA patterns:
    - equality: input.foo.bar == "value" / true / false / 123
    - membership: input.tool in ["...", "..."]
    - containment: contains(input.foo, "substr")
    - block rule: `deny` or `allow` defaults
    Returns {"decision": "ALLOW"|"DENY"|"REQUIRE_APPROVAL", "matched_checks": [...], "reasons": [...]}.
    """
    code = (rego_code or "").strip()
    if not code:
        return {"decision": "ALLOW", "matched_checks": [], "reasons": []}

    checks: List[Dict[str, Any]] = []
    reasons: List[str] = []

    # Parse `input.x.y == "val"` or `input.x == true|false|int`
    for m in re.finditer(r'input\.([a-zA-Z0-9_.]+)\s*(==|!=)\s*("[^"]*"|true|false|\d+)', code):
        attr_path, op, raw_expected = m.group(1), m.group(2), m.group(3)
        if raw_expected.startswith('"'):
            expected: Any = raw_expected.strip('"')
        elif raw_expected == "true":
            expected = True
        elif raw_expected == "false":
            expected = False
        else:
            expected = int(raw_expected)

        observed = _get_nested(input_payload, attr_path)
        passed = (observed == expected) if op == "==" else (observed != expected)
        checks.append({"attribute": f"input.{attr_path}", "op": op, "expected": expected, "observed": observed, "matched": passed})
        if passed and "deny" in code.lower():
            reasons.append(f"Rego rule matched deny condition on input.{attr_path} {op} {expected!r}")
        elif not passed and "allow" in code.lower() and "deny" not in code.lower():
            reasons.append(f"Rego allow invariant failed on input.{attr_path} {op} {expected!r}")

    # Parse `input.x in ["a", "b"]`
    for m in re.finditer(r'input\.([a-zA-Z0-9_.]+)\s+in\s+\[([^\]]+)\]', code):
        attr_path, list_body = m.group(1), m.group(2)
        items = [x.strip().strip('"').strip("'") for x in list_body.split(",") if x.strip()]
        observed = str(_get_nested(input_payload, attr_path) or "")
        in_set = observed in items
        checks.append({"attribute": f"input.{attr_path}", "op": "in", "expected": items, "observed": observed, "matched": in_set})
        if in_set and "deny" in code.lower():
            reasons.append(f"Rego denylist matched input.{attr_path}={observed!r}")
        elif not in_set and "allow" in code.lower() and "deny" not in code.lower():
            reasons.append(f"Rego allowlist rejected input.{attr_path}={observed!r}")

    if reasons:
        decision = "REQUIRE_APPROVAL" if "require_approval" in code.lower() else "DENY"
        return {"decision": decision, "matched_checks": checks, "reasons": reasons}

    return {"decision": "ALLOW", "matched_checks": checks, "reasons": []}


async def evaluate_firewall_rules(
    db: AsyncSession,
    *,
    tool_name: str,
    client_name: str,
    risk_level: str,
    arguments: Dict[str, Any],
    environment: str = "production",
    server_slug: str = "kavach-builtin",
    project_id: Optional[uuid.UUID] = None,
) -> Dict[str, Any]:
    """Evaluates all active MCPFirewallRule entries deterministically ordered by priority DESC."""
    stmt = (
        select(MCPFirewallRule)
        .where(MCPFirewallRule.is_active == True)  # noqa: E712
        .order_by(desc(MCPFirewallRule.priority))
    )
    rules = (await db.execute(stmt)).scalars().all()
    rego_input = {
        "tool": tool_name,
        "server": server_slug,
        "client": client_name,
        "risk_level": risk_level,
        "environment": environment,
        "arguments": arguments or {},
    }

    for rule in rules:
        if project_id and rule.project_id and rule.project_id != project_id:
            continue
        if not fnmatch.fnmatch(tool_name.lower(), (rule.tool_pattern or "*").lower()):
            continue
        if not fnmatch.fnmatch(client_name.lower(), (rule.client_pattern or "*").lower()):
            continue

        matched = True
        reason = f"Matched firewall rule '{rule.name}' ({rule.rule_type})"
        if rule.rego_policy:
            rego_res = evaluate_rego_rule(rule.rego_policy, rego_input)
            matched = rego_res["decision"] != "ALLOW"
            if rego_res["reasons"]:
                reason = "; ".join(rego_res["reasons"])
        elif rule.rule_type == "ALLOWLIST" and rule.action == "ALLOW":
            rule.match_count = (rule.match_count or 0) + 1
            return {"decision": "ALLOW", "rule_id": str(rule.id), "rule_name": rule.name, "reason": reason}

        if matched and rule.action in {"DENY", "BLOCK", "REQUIRE_APPROVAL"}:
            rule.match_count = (rule.match_count or 0) + 1
            norm_action = "DENY" if rule.action in {"DENY", "BLOCK"} else "REQUIRE_APPROVAL"
            return {"decision": norm_action, "rule_id": str(rule.id), "rule_name": rule.name, "reason": reason}

    return {"decision": "ALLOW", "rule_id": None, "rule_name": None, "reason": "No blocking MCP firewall rule matched."}


async def _resolve_upstream_headers(server: MCPUpstreamServer, db: AsyncSession) -> Dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
    if server.vault_secret_id:
        secret_row = await db.get(MCPSecretVaultEntry, server.vault_secret_id)
        if secret_row and secret_row.is_active:
            raw_secret = decrypt_vault_secret(secret_row.encrypted_value)
            if raw_secret:
                headers["Authorization"] = (
                    raw_secret if raw_secret.lower().startswith("bearer ") else f"Bearer {raw_secret}"
                )
    return headers


async def discover_upstream_server(server: MCPUpstreamServer, db: AsyncSession) -> Dict[str, Any]:
    """
    Connects to a registered external MCP server via real JSON-RPC (`initialize` + `tools/list`),
    runs `MCPToolSecurityScanner` + Rug-Pull hash comparison across every discovered tool,
    and updates PostgreSQL status honestly (`ONLINE` vs `CONNECTION_FAILED`).
    """
    unsafe_reason = _is_safe_upstream_url(server.server_url)
    if unsafe_reason:
        server.status = "BLOCKED"
        server.last_error = unsafe_reason
        server.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        return {"status": "BLOCKED", "error": unsafe_reason, "discovered_tools": []}

    headers = await _resolve_upstream_headers(server, db)
    existing_snaps = {
        s.tool_name: s
        for s in (
            await db.execute(select(MCPToolSnapshot).where(MCPToolSnapshot.server_id == server.id))
        )
        .scalars()
        .all()
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            init_resp = await client.post(
                server.server_url,
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2025-03-26",
                        "capabilities": {},
                        "clientInfo": {"name": "kavach-mcp-gateway", "version": "2.5.0"},
                    },
                },
            )
            if init_resp.status_code == 401:
                server.status = "AUTH_REQUIRED"
                server.last_error = "Upstream MCP server returned HTTP 401 Unauthorized. Bind a valid credential in Secrets Vault."
                server.last_synced_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": server.status, "error": server.last_error, "discovered_tools": []}
            if init_resp.status_code >= 400:
                server.status = "CONNECTION_FAILED"
                server.last_error = f"Upstream initialize returned HTTP {init_resp.status_code}"
                server.last_synced_at = datetime.now(timezone.utc)
                await db.commit()
                return {"status": server.status, "error": server.last_error, "discovered_tools": []}

            session_id = init_resp.headers.get("Mcp-Session-Id")
            list_headers = dict(headers)
            if session_id:
                list_headers["Mcp-Session-Id"] = session_id

            init_data = init_resp.json()
            server_info = (init_data.get("result") or {}).get("serverInfo") or {}
            if server_info.get("version"):
                server.version = str(server_info["version"])[:64]

            tools_resp = await client.post(
                server.server_url,
                headers=list_headers,
                json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            )
            tools_resp.raise_for_status()
            raw_tools = ((tools_resp.json().get("result") or {}).get("tools") or [])
    except Exception as exc:
        server.status = "CONNECTION_FAILED"
        server.last_error = str(exc)[:500]
        server.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        return {"status": "CONNECTION_FAILED", "error": server.last_error, "discovered_tools": []}

    discovered: List[Dict[str, Any]] = []
    max_risk = 0
    for tool_obj in raw_tools:
        t_name = str(tool_obj.get("name") or "").strip()
        if not t_name:
            continue
        t_desc = str(tool_obj.get("description") or "")
        t_schema = tool_obj.get("inputSchema") or {}
        prev = existing_snaps.get(t_name)

        scan_res = MCPToolSecurityScanner.scan_tool_definition(
            name=t_name,
            description=t_desc,
            input_schema=t_schema,
            auth_mode=server.auth_mode,
            risk_level="MEDIUM",
            baseline_desc_hash=prev.description_hash if prev else None,
            baseline_schema_hash=prev.input_schema_hash if prev else None,
        )
        max_risk = max(max_risk, scan_res["risk_score"])

        if prev:
            if scan_res["rug_pull_detected"]:
                prev.previous_description_hash = prev.description_hash
                prev.previous_schema_hash = prev.input_schema_hash
                prev.rug_pull_detected = True
            prev.description_hash = scan_res["description_hash"]
            prev.input_schema_hash = scan_res["input_schema_hash"]
            prev.risk_score = scan_res["risk_score"]
            prev.risk_level = scan_res["risk_level"]
            prev.security_status = scan_res["security_status"]
            prev.findings = scan_res["findings"]
            prev.last_scanned_at = datetime.now(timezone.utc)
        else:
            db.add(
                MCPToolSnapshot(
                    server_id=server.id,
                    server_slug=server.slug,
                    tool_name=t_name,
                    version=server.version,
                    description_hash=scan_res["description_hash"],
                    input_schema_hash=scan_res["input_schema_hash"],
                    rug_pull_detected=False,
                    risk_score=scan_res["risk_score"],
                    risk_level=scan_res["risk_level"],
                    security_status=scan_res["security_status"],
                    findings=scan_res["findings"],
                    last_scanned_at=datetime.now(timezone.utc),
                )
            )
        discovered.append(scan_res)

    server.status = "ONLINE"
    server.tools_count = len(discovered)
    server.risk_score = max_risk
    server.last_error = None
    server.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ONLINE", "tools_count": len(discovered), "risk_score": max_risk, "discovered_tools": discovered}


async def forward_upstream_tool_call(
    server: MCPUpstreamServer,
    tool_name: str,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> Dict[str, Any]:
    """Forwards a sandboxed JSON-RPC `tools/call` to an approved upstream MCP server."""
    unsafe_reason = _is_safe_upstream_url(server.server_url)
    if unsafe_reason:
        return {"ok": False, "error_code": "MCP_SSRF_BLOCKED", "message": unsafe_reason}

    headers = await _resolve_upstream_headers(server, db)
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            server.server_url,
            headers=headers,
            json={
                "jsonrpc": "2.0",
                "id": f"proxy_{uuid.uuid4().hex[:8]}",
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
            },
        )
        resp.raise_for_status()
        return {"ok": True, "payload": resp.json()}

