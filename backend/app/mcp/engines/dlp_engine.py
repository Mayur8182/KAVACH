"""
Priority 2: MCP Data Security & DLP Engine.

Detects and prevents/redacts across both MCP requests and tool outputs:
- API key & cloud/SCM token leakage (GitHub, OpenAI, AWS, Slack, Google, Stripe, JWT, Private Keys)
- Credential & DB connection string leakage
- PII exposure (SSN, Credit Card Luhn-verified numbers)
- Unauthorized sensitive filesystem path access (/etc/passwd, ~/.ssh, .env)
- Suspicious outbound data exfiltration URLs carrying high-entropy parameters
"""

from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Tuple


def _luhn_valid(digits: str) -> bool:
    if not digits.isdigit() or not (13 <= len(digits) <= 19):
        return False
    total = 0
    rev = digits[::-1]
    for idx, ch in enumerate(rev):
        n = int(ch)
        if idx % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


SECRET_DLP_RULES: List[Tuple[str, str, str, str, bool]] = [
    ("DLP_PRIVATE_KEY", "PRIVATE_KEY", r"-----BEGIN\s+(?:RSA|EC|OPENSSH|PGP|DSA)?\s*PRIVATE KEY-----", "CRITICAL", True),
    ("DLP_AWS_ACCESS_KEY", "API_KEY", r"\bAKIA[0-9A-Z]{16}\b", "CRITICAL", True),
    ("DLP_GITHUB_TOKEN", "API_KEY", r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b", "CRITICAL", True),
    ("DLP_OPENAI_KEY", "API_KEY", r"\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b", "CRITICAL", True),
    ("DLP_GOOGLE_API_KEY", "API_KEY", r"\bAIza[0-9A-Za-z\-_]{35}\b", "HIGH", False),
    ("DLP_SLACK_TOKEN", "API_KEY", r"\bxox[baprs]-[0-9A-Za-z-]{10,}\b", "CRITICAL", True),
    ("DLP_STRIPE_LIVE_KEY", "API_KEY", r"\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b", "CRITICAL", True),
    ("DLP_DB_DSN_CREDENTIAL", "DATABASE_CREDENTIAL", r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^:\s/]+:[^@\s]{4,}@[^\s]+", "CRITICAL", True),
    ("DLP_INLINE_PASSWORD", "CREDENTIAL", r"(?i)(?:password|passwd|client_secret|api_secret|secret_key)\s*[:=]\s*['\"]?[A-Za-z0-9!@#$%^&*_\-]{8,}['\"]?", "HIGH", False),
    ("DLP_US_SSN", "PII_SSN", r"\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b", "HIGH", False),
]

RESTRICTED_FILE_PATHS: List[Tuple[str, str, str]] = [
    ("DLP_PATH_PASSWD_SHADOW", r"(?i)/etc/(passwd|shadow|sudoers)\b", "CRITICAL"),
    ("DLP_PATH_SSH_KEY", r"(?i)(~|/home/[^/]+|/root)?/\.ssh/(id_rsa|id_ed25519|authorized_keys)\b", "CRITICAL"),
    ("DLP_PATH_ENV_FILE", r"(?i)(^|[/\\])\.env(\.local|\.production|\.prod)?\b", "HIGH"),
    ("DLP_PATH_TRAVERSAL", r"(\.\./\.\./|\.\.\\\.\.\\)", "HIGH"),
    ("DLP_WINDOWS_SAM", r"(?i)c:\\windows\\system32\\config\\(sam|system|security)\b", "CRITICAL"),
]

# Never redact our own safe token-prefix or placeholder docs unless full length
EXFIL_URL_PATTERN = re.compile(
    r"(?i)https?://(?!localhost\b|127\.0\.0\.1\b|github\.com\b|api\.github\.com\b|kavachsecurity\.me\b)[^\s/]+/[^\s]*\?(?:[^ \n]*(?:token|secret|key|password|dump|exfil)=[^&\s]{10,})"
)


class MCPDataSecurityEngine:
    """Deterministic DLP inspection and automatic redaction for MCP requests and responses."""

    @classmethod
    def _scan_and_redact_text(
        cls,
        text: str,
        *,
        field_path: str,
        stage: str,
        redact: bool,
    ) -> Tuple[str, List[Dict[str, Any]], bool]:
        findings: List[Dict[str, Any]] = []
        updated = text
        hard_block = False

        for rule_id, category, pattern, severity, block_on_request in SECRET_DLP_RULES:
            for match in re.finditer(pattern, updated):
                raw_val = match.group(0)
                findings.append(
                    {
                        "engine": "DLP",
                        "rule_id": rule_id,
                        "category": category,
                        "severity": severity,
                        "stage": stage,
                        "field": field_path,
                        "preview": f"{raw_val[:4]}...{raw_val[-2:]}" if len(raw_val) > 8 else "[REDACTED]",
                    }
                )
                if block_on_request and stage == "REQUEST":
                    hard_block = True
            if redact and re.search(pattern, updated):
                updated = re.sub(pattern, "[REDACTED_BY_KAVACH_DLP]", updated)

        # Credit card PAN scan (Luhn validated to avoid false positives on UUIDs/timestamps)
        for cc_match in re.finditer(r"\b(?:\d[ -]*?){13,16}\b", updated):
            digits = re.sub(r"[ -]", "", cc_match.group(0))
            if _luhn_valid(digits):
                findings.append(
                    {
                        "engine": "DLP",
                        "rule_id": "DLP_CREDIT_CARD_PAN",
                        "category": "PII_PAYMENT",
                        "severity": "HIGH",
                        "stage": stage,
                        "field": field_path,
                        "preview": f"****-****-****-{digits[-4:]}",
                    }
                )
                if redact:
                    updated = updated.replace(cc_match.group(0), f"[REDACTED_PAN_{digits[-4:]}]")

        # Restricted file system path checks (block unauthorized sensitive file reads on request)
        if stage == "REQUEST" or "path" in field_path.lower() or "file" in field_path.lower():
            for rule_id, pattern, severity in RESTRICTED_FILE_PATHS:
                m = re.search(pattern, updated)
                if m:
                    findings.append(
                        {
                            "engine": "DLP",
                            "rule_id": rule_id,
                            "category": "UNAUTHORIZED_FILE_ACCESS",
                            "severity": severity,
                            "stage": stage,
                            "field": field_path,
                            "preview": m.group(0)[:80],
                        }
                    )
                    if severity == "CRITICAL" or stage == "REQUEST":
                        hard_block = True

        # Outbound exfil query check
        ex_m = EXFIL_URL_PATTERN.search(updated)
        if ex_m:
            findings.append(
                {
                    "engine": "DLP",
                    "rule_id": "DLP_SENSITIVE_URL_EXFILTRATION",
                    "category": "DATA_EXFILTRATION",
                    "severity": "CRITICAL",
                    "stage": stage,
                    "field": field_path,
                    "preview": ex_m.group(0)[:60] + "...",
                }
            )
            hard_block = True
            if redact:
                updated = EXFIL_URL_PATTERN.sub("[BLOCKED_EXFIL_URL]", updated)

        return updated, findings, hard_block

    @classmethod
    def _walk(
        cls,
        node: Any,
        *,
        path: str,
        stage: str,
        redact: bool,
        findings: List[Dict[str, Any]],
        hard_block_flag: List[bool],
    ) -> Any:
        # Skip scanning JWT/approval identifiers themselves if purely metadata IDs
        if isinstance(node, str):
            sanitized, f_list, blocked = cls._scan_and_redact_text(
                node, field_path=path or "value", stage=stage, redact=redact
            )
            findings.extend(f_list)
            if blocked:
                hard_block_flag[0] = True
            return sanitized
        if isinstance(node, dict):
            out: Dict[str, Any] = {}
            for k, v in node.items():
                if k in {"approval_id", "project_id", "projectId", "scan_id", "request_id", "id"} and isinstance(v, str):
                    out[k] = v
                else:
                    child_path = f"{path}.{k}" if path else str(k)
                    out[k] = cls._walk(
                        v, path=child_path, stage=stage, redact=redact, findings=findings, hard_block_flag=hard_block_flag
                    )
            return out
        if isinstance(node, list):
            return [
                cls._walk(
                    item,
                    path=f"{path}[{idx}]",
                    stage=stage,
                    redact=redact,
                    findings=findings,
                    hard_block_flag=hard_block_flag,
                )
                for idx, item in enumerate(node)
            ]
        return node

    @classmethod
    def inspect_payload(
        cls,
        payload: Any,
        *,
        stage: str = "REQUEST",
        redact: bool = True,
    ) -> Dict[str, Any]:
        findings: List[Dict[str, Any]] = []
        hard_block_flag = [False]
        cloned = copy.deepcopy(payload)
        sanitized = cls._walk(
            cloned,
            path="",
            stage=stage.upper(),
            redact=redact,
            findings=findings,
            hard_block_flag=hard_block_flag,
        )
        verdict = "BLOCK" if hard_block_flag[0] else ("REDACTED" if findings else "CLEAN")
        return {
            "stage": stage.upper(),
            "verdict": verdict,
            "findings_count": len(findings),
            "findings": findings,
            "sanitized_payload": sanitized,
        }

