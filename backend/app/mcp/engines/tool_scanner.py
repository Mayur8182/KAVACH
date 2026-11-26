"""
Priority 3: MCP Tool Security Scanner Engine.

Scans MCP server tools, descriptions, JSON input schemas, auth implementation,
and optional local server source / packages / container images (using real installed
scanners like Semgrep/Gitleaks/OSV/Trivy when available, never fabricating outputs).
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from app.mcp.engines.threat_detector import MCPThreatDetectionEngine


class MCPToolSecurityScanner:
    """Deterministic static & metadata security scanner for MCP servers and tools."""

    @classmethod
    def scan_tool_definition(
        cls,
        *,
        name: str,
        description: str,
        input_schema: Dict[str, Any],
        requires_approval: bool = False,
        risk_level: str = "LOW",
        auth_mode: str = "oauth2",
        baseline_desc_hash: Optional[str] = None,
        baseline_schema_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        findings: List[Dict[str, Any]] = []

        # 1. Poisoning / Rug-Pull scan via Threat Engine
        poison_res = MCPThreatDetectionEngine.detect_tool_poisoning(
            tool_name=name,
            description=description,
            input_schema=input_schema,
            baseline_desc_hash=baseline_desc_hash,
            baseline_schema_hash=baseline_schema_hash,
        )
        findings.extend(poison_res["findings"])

        # 2. Schema boundary & dangerous primitive analysis
        props = (input_schema or {}).get("properties") or {}
        dangerous_fields = {"command", "cmd", "shell", "eval", "exec", "sql", "raw_query", "file_path", "target_path"}
        for field_name, field_spec in props.items():
            lower_field = str(field_name).lower()
            spec_type = (field_spec or {}).get("type") if isinstance(field_spec, dict) else None
            if lower_field in dangerous_fields and not (isinstance(field_spec, dict) and field_spec.get("enum")):
                findings.append(
                    {
                        "engine": "TOOL_SCANNER",
                        "rule_id": "UNCONSTRAINED_SENSITIVE_ARGUMENT",
                        "category": "INPUT_SCHEMA",
                        "severity": "MEDIUM",
                        "weight": 15,
                        "field": field_name,
                        "detail": f"Argument '{field_name}' (type={spec_type or 'any'}) lacks strict enum/pattern bounds.",
                    }
                )
            if lower_field in {"url", "target_url", "webhook", "server_url"}:
                findings.append(
                    {
                        "engine": "TOOL_SCANNER",
                        "rule_id": "OUTBOUND_NETWORK_CAPABILITY",
                        "category": "SSRF_SURFACE",
                        "severity": "LOW",
                        "weight": 10,
                        "field": field_name,
                        "detail": f"Tool exposes network destination field '{field_name}'; enforce SSRF & egress allowlists.",
                    }
                )

        # 3. Authentication & approval posture check
        if auth_mode in {"none", "unauthenticated", ""}:
            findings.append(
                {
                    "engine": "TOOL_SCANNER",
                    "rule_id": "UNAUTHENTICATED_MCP_TRANSPORT",
                    "category": "AUTHENTICATION",
                    "severity": "CRITICAL",
                    "weight": 45,
                    "field": "auth_mode",
                    "detail": "Upstream MCP server lacks OAuth 2.1 or scoped credential enforcement.",
                }
            )
        if str(risk_level).upper() in {"HIGH", "CRITICAL"} and not requires_approval:
            findings.append(
                {
                    "engine": "TOOL_SCANNER",
                    "rule_id": "HIGH_RISK_WITHOUT_APPROVAL_GATE",
                    "category": "GOVERNANCE",
                    "severity": "HIGH",
                    "weight": 25,
                    "field": "requires_approval",
                    "detail": f"High-risk tool '{name}' does not enforce human-in-the-loop approval.",
                }
            )

        base_weight = {"LOW": 5, "MEDIUM": 20, "HIGH": 45, "CRITICAL": 65}.get(str(risk_level).upper(), 10)
        findings_weight = sum(f.get("weight", 10) for f in findings)
        score = min(100, base_weight + findings_weight)
        computed_level = (
            "CRITICAL" if score >= 75 else "HIGH" if score >= 50 else "MEDIUM" if score >= 25 else "LOW"
        )
        sec_status = (
            "BLOCKED"
            if poison_res["rug_pull_detected"] or any(f["severity"] == "CRITICAL" for f in findings)
            else "FLAGGED"
            if any(f["severity"] == "HIGH" for f in findings)
            else "VERIFIED"
        )

        return {
            "tool_name": name,
            "description_hash": poison_res["description_hash"],
            "input_schema_hash": poison_res["input_schema_hash"],
            "rug_pull_detected": poison_res["rug_pull_detected"],
            "risk_score": score,
            "risk_level": computed_level,
            "security_status": sec_status,
            "findings": findings,
        }

    @classmethod
    async def scan_local_source_directory(cls, source_path: str) -> Dict[str, Any]:
        """
        Optionally runs real installed CLI scanners (Semgrep, Gitleaks, OSV) against an MCP server repo.
        Reports honest NOT_CONFIGURED / UNAVAILABLE statuses if path or binaries are absent.
        """
        resolved = os.path.abspath(source_path)
        if ".." in source_path or not os.path.isdir(resolved):
            return {
                "status": "INVALID_INPUT",
                "message": f"Directory '{source_path}' does not exist.",
                "scanner_runs": [],
            }

        from app.engines.scanner.models import ScanTarget
        from app.engines.scanner.registry import default_scanner_registry

        scanner_runs: List[Dict[str, Any]] = []
        target = ScanTarget(target_type="LOCAL_DIRECTORY", path=resolved)
        for scanner_name in ("semgrep", "gitleaks", "osv"):
            adapter = default_scanner_registry.get(scanner_name)
            if not adapter:
                scanner_runs.append({"scanner": scanner_name, "status": "NOT_CONFIGURED", "findings_count": 0})
                continue
            try:
                avail = await adapter.check_availability()
                if not avail.available:
                    scanner_runs.append(
                        {
                            "scanner": scanner_name,
                            "status": "NOT_CONFIGURED",
                            "reason": avail.message or "Scanner binary not available",
                            "findings_count": 0,
                        }
                    )
                    continue
                res = await adapter.run(target)
                scanner_runs.append(
                    {
                        "scanner": scanner_name,
                        "status": str(res.status),
                        "findings_count": len(res.findings or []),
                        "findings": [f.model_dump() for f in (res.findings or [])[:25]],
                    }
                )
            except Exception as exc:
                scanner_runs.append(
                    {"scanner": scanner_name, "status": "SCAN FAILED", "error": str(exc), "findings_count": 0}
                )

        return {"status": "COMPLETED", "source_path": resolved, "scanner_runs": scanner_runs}

