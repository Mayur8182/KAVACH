"""
Kavach SAST Sub-Engine — Rule Engine
Executes Semgrep and native deterministic security rules across target source files.
"""

import os
import re
import uuid
import shutil
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineFinding, EngineType


BUILTIN_SAST_RULES = [
    {
        "id": "KV-SAST-001",
        "title": "SQL Injection via String Formatting",
        "severity": "CRITICAL",
        "cwe": "CWE-89",
        "pattern": re.compile(r"(?:execute|cursor\.execute|raw_sql|query)\s*\(\s*(?:f['\"].*?\{.*?\}|['\"].*?%\s*\(|.*?\+\s*[a-zA-Z0-9_]+)"),
        "description": "Untrusted input directly formatted into raw SQL query without parameterized statements.",
        "remediation": "Use parameterized queries or ORM query abstractions: cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))",
    },
    {
        "id": "KV-SAST-002",
        "title": "Command Injection via Subprocess / System Shell",
        "severity": "CRITICAL",
        "cwe": "CWE-78",
        "pattern": re.compile(r"(?:os\.system|subprocess\.call|subprocess\.Popen|exec\.Command|child_process\.exec)\s*\(\s*(?:f['\"].*?\{.*?\}|.*?\+\s*[a-zA-Z0-9_]+|.*?\bshell\s*=\s*True\b)"),
        "description": "User-controllable input supplied to shell execution command with shell=True or string concatenation.",
        "remediation": "Pass arguments as a safe array/list without shell=True: subprocess.run(['cmd', arg], shell=False)",
    },
    {
        "id": "KV-SAST-003",
        "title": "Cross-Site Scripting (Reflected / Stored XSS)",
        "severity": "HIGH",
        "cwe": "CWE-79",
        "pattern": re.compile(r"(?:dangerouslySetInnerHTML|innerHTML\s*=|document\.write\s*\(|render_template_string\s*\()"),
        "description": "Unescaped HTML or user input injected directly into the DOM or template rendering context.",
        "remediation": "Sanitize inputs with DOMPurify, use textContent, or utilize context-aware template engines.",
    },
    {
        "id": "KV-SAST-004",
        "title": "Path Traversal via Arbitrary File Access",
        "severity": "HIGH",
        "cwe": "CWE-22",
        "pattern": re.compile(r"(?:open|readFile|createReadStream|send_file)\s*\(\s*(?:f['\"].*?\{.*?\}|.*?\+\s*[a-zA-Z0-9_]+|os\.path\.join\([^)]*request\.)"),
        "description": "File path constructed from unvalidated request parameter allowing directory traversal (../).",
        "remediation": "Resolve path with os.path.realpath and verify it stays inside base directory with os.path.commonpath.",
    },
    {
        "id": "KV-SAST-005",
        "title": "Insecure Deserialization (pickle / yaml.load)",
        "severity": "CRITICAL",
        "cwe": "CWE-502",
        "pattern": re.compile(r"(?:pickle\.loads|yaml\.load\s*\([^)]*Loader\s*=\s*(?:yaml\.)?Loader|yaml\.unsafe_load)"),
        "description": "Deserializing untrusted data with unsafe loader can lead to arbitrary remote code execution.",
        "remediation": "Use yaml.safe_load() or JSON for safe structured data serialization.",
    },
]


class SASTRuleEngine:
    """
    Executes rule-based static analysis using Semgrep CLI (if available) with fallback to native rules.
    """

    def __init__(self):
        self.semgrep_available = shutil.which("semgrep") is not None

    async def run_semgrep_if_available(self, target_path: str) -> List[EngineFinding]:
        if not self.semgrep_available:
            return []

        findings: List[EngineFinding] = []
        try:
            cmd = ["semgrep", "scan", "--json", "--quiet", "--metrics=off", "--disable-version-check", "--config", "p/owasp-top-10", target_path]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=8)
            import json
            data = json.loads(stdout.decode("utf-8", errors="ignore"))
            results = data.get("results", [])

            for item in results:
                check_id = item.get("check_id", "semgrep-rule")
                extra = item.get("extra", {})
                message = extra.get("message", "Semgrep security finding")
                sev = extra.get("severity", "MEDIUM").upper()
                start = item.get("start", {})
                end = item.get("end", {})

                findings.append(EngineFinding(
                    id=f"semgrep-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.SAST,
                    sub_engine="Rule Engine (Semgrep)",
                    rule_id=check_id,
                    title=f"SAST: {check_id.split('.')[-1].replace('-', ' ').title()}",
                    description=message,
                    severity=sev if sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW") else "MEDIUM",
                    file_path=item.get("path", target_path),
                    line_start=start.get("line", 1),
                    line_end=end.get("line", 1),
                    code_snippet=extra.get("lines", ""),
                    remediation_guidance=extra.get("fix", "Review Semgrep rule guidance and refactor unsafe code path."),
                    evidence={"scanner": "semgrep", "raw": item},
                ))
        except Exception:
            pass

        return findings

    def run_native_rules(self, file_path: str, content: str) -> List[EngineFinding]:
        findings: List[EngineFinding] = []
        lines = content.split("\n")

        for rule in BUILTIN_SAST_RULES:
            pattern = rule["pattern"]
            for idx, line in enumerate(lines, 1):
                if pattern.search(line):
                    # Check for suppression comment
                    if "nosec" in line or "kavach-ignore" in line or "eslint-disable" in line:
                        continue

                    snippet = line.strip()
                    findings.append(EngineFinding(
                        id=f"sast-{uuid.uuid4().hex[:8]}",
                        engine=EngineType.SAST,
                        sub_engine="Rule Engine (Native)",
                        rule_id=rule["id"],
                        title=rule["title"],
                        description=rule["description"],
                        severity=rule["severity"],
                        file_path=file_path,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=snippet,
                        remediation_guidance=rule["remediation"],
                        evidence={"matched_pattern": rule["id"], "line": idx, "cwe": rule["cwe"]},
                    ))

        return findings

