"""
Priority 1: MCP Threat Detection Engine.

Detects deterministically across both incoming MCP requests and outgoing responses:
- Prompt injection & system-prompt hijack attempts
- Tool poisoning (hidden imperative instructions inside schemas/descriptions/outputs)
- Rug-pull mutations (unexpected description/schema hash changes vs baseline)
- Malicious shell/command/SSTI payloads
- Unauthorized dangerous tool chaining across recent session events
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Tuple


PROMPT_INJECTION_PATTERNS: List[Tuple[str, str, str, int]] = [
    (
        "PI_OVERRIDE_INSTRUCTIONS",
        r"(?i)(ignore\s+(all\s+)?previous\s+instructions|disregard\s+system\s+prompt|forget\s+your\s+rules|override\s+security\s+policy)",
        "CRITICAL",
        45,
    ),
    (
        "PI_HIDDEN_TOOL_DIRECTIVE",
        r"(?is)<\s*(important|system|instruction|secret)\b[^>]*>.*?</\s*(important|system|instruction|secret)\s*>",
        "CRITICAL",
        45,
    ),
    (
        "PI_STEALTH_EXFIL_INSTRUCTION",
        r"(?i)(do\s+not\s+tell\s+the\s+user|hide\s+this\s+from\s+the\s+user|silently\s+(send|post|exfiltrate)|without\s+informing\s+the\s+user)",
        "CRITICAL",
        50,
    ),
    (
        "PI_ROLE_HIJACK",
        r"(?i)(you\s+are\s+now\s+(dan|root|unrestricted|admin)|developer\s+mode\s+enabled|act\s+as\s+system\s+administrator)",
        "HIGH",
        30,
    ),
]

COMMAND_INJECTION_PATTERNS: List[Tuple[str, str, str, int]] = [
    (
        "CMD_DESTRUCTIVE_SHELL",
        r"(?i)(\brm\s+-rf\s+/|\bmkfs\.|\bdd\s+if=/dev/|:\(\)\s*\{\s*:\|:&\s*\};:)",
        "CRITICAL",
        55,
    ),
    (
        "CMD_PIPE_TO_SHELL",
        r"(?i)(curl|wget)\s+https?://[^\s]+\s*\|\s*(bash|sh|zsh|python|powershell)",
        "CRITICAL",
        50,
    ),
    (
        "CMD_POWERSHELL_ENCODED",
        r"(?i)(powershell(\.exe)?\s+.*-(e|enc|encodedcommand)\s+[A-Za-z0-9+/=]{16,})",
        "HIGH",
        40,
    ),
    (
        "CMD_REVERSE_SHELL",
        r"(?i)(\bnc\s+-e\s+|\bbash\s+-i\s+>&\s*/dev/tcp/|socat\s+.*exec:)",
        "CRITICAL",
        55,
    ),
]


def _flatten_strings(obj: Any, prefix: str = "") -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    if isinstance(obj, str):
        out.append((prefix or "value", obj))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            key_path = f"{prefix}.{k}" if prefix else str(k)
            out.extend(_flatten_strings(v, key_path))
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            out.extend(_flatten_strings(item, f"{prefix}[{idx}]"))
    return out


class MCPThreatDetectionEngine:
    """Deterministic multi-stage threat inspection engine for MCP payloads and tool metadata."""

    @staticmethod
    def hash_tool_contract(description: str, input_schema: Dict[str, Any]) -> Tuple[str, str]:
        desc_hash = hashlib.sha256((description or "").strip().encode("utf-8")).hexdigest()
        schema_json = json.dumps(input_schema or {}, sort_keys=True, separators=(",", ":"))
        schema_hash = hashlib.sha256(schema_json.encode("utf-8")).hexdigest()
        return desc_hash, schema_hash

    @classmethod
    def inspect_text_patterns(cls, payload: Any, *, source: str) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        for field_path, text_val in _flatten_strings(payload):
            if not text_val or len(text_val) < 4:
                continue
            for rule_id, pattern, severity, weight in PROMPT_INJECTION_PATTERNS + COMMAND_INJECTION_PATTERNS:
                m = re.search(pattern, text_val)
                if m:
                    findings.append(
                        {
                            "engine": "THREAT_DETECTION",
                            "rule_id": rule_id,
                            "category": "PROMPT_INJECTION" if rule_id.startswith("PI_") else "MALICIOUS_PAYLOAD",
                            "severity": severity,
                            "weight": weight,
                            "source": source,
                            "field": field_path,
                            "matched_excerpt": m.group(0)[:120],
                        }
                    )
        return findings

    @classmethod
    def detect_tool_poisoning(
        cls,
        *,
        tool_name: str,
        description: str,
        input_schema: Dict[str, Any],
        baseline_desc_hash: Optional[str] = None,
        baseline_schema_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        findings = cls.inspect_text_patterns(
            {"description": description, "input_schema": input_schema},
            source="TOOL_DEFINITION",
        )
        desc_hash, schema_hash = cls.hash_tool_contract(description, input_schema)
        rug_pull = False
        if baseline_desc_hash and baseline_desc_hash != desc_hash:
            rug_pull = True
            findings.append(
                {
                    "engine": "THREAT_DETECTION",
                    "rule_id": "RUG_PULL_DESCRIPTION_MUTATED",
                    "category": "RUG_PULL",
                    "severity": "CRITICAL",
                    "weight": 55,
                    "source": "TOOL_METADATA",
                    "field": "description_hash",
                    "matched_excerpt": f"{baseline_desc_hash[:12]} -> {desc_hash[:12]}",
                }
            )
        if baseline_schema_hash and baseline_schema_hash != schema_hash:
            rug_pull = True
            findings.append(
                {
                    "engine": "THREAT_DETECTION",
                    "rule_id": "RUG_PULL_SCHEMA_MUTATED",
                    "category": "RUG_PULL",
                    "severity": "HIGH",
                    "weight": 40,
                    "source": "TOOL_METADATA",
                    "field": "input_schema_hash",
                    "matched_excerpt": f"{baseline_schema_hash[:12]} -> {schema_hash[:12]}",
                }
            )
        score = min(100, sum(f["weight"] for f in findings))
        return {
            "tool_name": tool_name,
            "description_hash": desc_hash,
            "input_schema_hash": schema_hash,
            "rug_pull_detected": rug_pull,
            "threat_score": score,
            "findings": findings,
        }

    @classmethod
    def inspect_request(
        cls,
        *,
        tool_name: str,
        arguments: Dict[str, Any],
        tool_description: str = "",
        recent_tools: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        findings = cls.inspect_text_patterns(arguments, source="REQUEST_ARGUMENTS")
        if tool_description:
            for item in cls.inspect_text_patterns(tool_description, source="TOOL_DESCRIPTION"):
                item["category"] = "TOOL_POISONING"
                findings.append(item)

        # Detect suspicious exfil chaining (sensitive read immediately preceding outbound/destructive tool)
        if recent_tools:
            sensitive_reads = {
                "list_project_findings",
                "scan_sensitive_data_posture",
                "get_mcp_audit_trail",
                "get_security_blueprint",
            }
            high_impact_next = {"quarantine_compromised_target", "simulate_attack_path", "connect_repository"}
            if tool_name in high_impact_next and any(t in sensitive_reads for t in recent_tools[-4:]):
                findings.append(
                    {
                        "engine": "THREAT_DETECTION",
                        "rule_id": "SUSPICIOUS_TOOL_CHAINING",
                        "category": "UNAUTHORIZED_CHAINING",
                        "severity": "MEDIUM",
                        "weight": 20,
                        "source": "SESSION_SEQUENCE",
                        "field": "recent_tools",
                        "matched_excerpt": f"{recent_tools[-3:]} -> {tool_name}",
                    }
                )

        score = min(100, sum(f["weight"] for f in findings))
        verdict = "BLOCK" if any(f["severity"] == "CRITICAL" for f in findings) or score >= 45 else (
            "WARN" if findings else "CLEAN"
        )
        return {"threat_score": score, "verdict": verdict, "findings": findings}

    @classmethod
    def inspect_response(cls, *, tool_name: str, response_payload: Any) -> Dict[str, Any]:
        findings = cls.inspect_text_patterns(response_payload, source="TOOL_RESPONSE")
        for f in findings:
            f["category"] = "SECOND_ORDER_INJECTION" if f["rule_id"].startswith("PI_") else f["category"]
        score = min(100, sum(f["weight"] for f in findings))
        verdict = "BLOCK" if any(f["severity"] == "CRITICAL" for f in findings) or score >= 45 else (
            "WARN" if findings else "CLEAN"
        )
        return {"tool_name": tool_name, "threat_score": score, "verdict": verdict, "findings": findings}

