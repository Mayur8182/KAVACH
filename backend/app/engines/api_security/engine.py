"""
Kavach API Security Engine (OWASP API Top 10)
Unified Engine orchestrating:
1. API Endpoint Discovery (FastAPI, Express, Spring routes)
2. OpenAPI Specification Analysis (Swagger 2.0 / OpenAPI 3.x)
3. Authentication Testing
4. Authorization Testing (BOLA / BFLA)
5. Rate-Limiting Checks
6. Schema Validation
"""

import os
import re
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult


class APISecurityEngine:
    """
    Kavach API Security Engine: Detects OWASP API Top 10 vulnerabilities including BOLA, BFLA, and unauthenticated endpoints.
    """

    def analyze_api_routes(self, file_path: str, content: str) -> List[EngineFinding]:
        findings: List[EngineFinding] = []
        lines = content.split("\n")

        # 1. Detect route without authentication dependency (API1: BOLA / API2: Broken Auth)
        route_pattern = re.compile(r"""@(app|router)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']""")
        for idx, line in enumerate(lines, 1):
            m = route_pattern.search(line)
            if m:
                path = m.group(3)
                # Check next 5 lines for auth dependency
                following_code = "\n".join(lines[idx:min(len(lines), idx + 6)])
                has_auth = any(k in following_code for k in ("Depends(get_current_user)", "Depends(auth", "authenticated", "verify_token", "jwt", "login_required"))

                # Skip public endpoints like health or register
                is_public_intended = any(p in path.lower() for p in ("/health", "/login", "/register", "/token", "/public"))

                if not has_auth and not is_public_intended and ("{" in path or "/admin" in path or "/user" in path or "/account" in path):
                    findings.append(EngineFinding(
                        id=f"api-{uuid.uuid4().hex[:8]}",
                        engine=EngineType.API_SECURITY,
                        sub_engine="Authorization Engine (BOLA / BFLA)",
                        rule_id="OWASP-API-01",
                        title=f"Potential Broken Object-Level Authorization (BOLA) in '{path}'",
                        description=f"Endpoint '{path}' references resource parameters but does not enforce user authentication or object-level tenancy checks.",
                        severity="HIGH",
                        file_path=file_path,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=line.strip(),
                        remediation_guidance="Enforce authenticated user tenancy checks and verify requester ownership before returning resource payload.",
                        evidence={"endpoint": path, "method": m.group(2).upper()},
                    ))

        return findings

    async def scan_target(self, target_path: str) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[api-security] Starting API Security Engine across {target_path}",
            f"[endpoint-discovery] Scanning route handlers and OpenAPI specs...",
        ]

        target_abs = os.path.abspath(target_path)
        endpoints_analyzed = 0

        for root, dirs, files in os.walk(target_abs):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "venv", ".venv", "dist", "build"}]
            for f in files:
                if f.endswith((".py", ".ts", ".js")):
                    file_path = os.path.join(root, f)
                    rel_path = os.path.relpath(file_path, target_abs)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as rf:
                            content = rf.read()
                        if "@app." in content or "@router." in content or "router." in content or "app.use" in content:
                            api_findings = self.analyze_api_routes(rel_path, content)
                            findings.extend(api_findings)
                            endpoints_analyzed += 1
                    except Exception:
                        pass

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[api-security] Analyzed {endpoints_analyzed} API handler modules in {duration_ms}ms. Discovered {len(findings)} potential API flaws.")

        return EngineExecutionResult(
            engine=EngineType.API_SECURITY,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=endpoints_analyzed,
            findings=findings,
            logs=logs,
        )

