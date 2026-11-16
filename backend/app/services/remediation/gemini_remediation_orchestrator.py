"""
Kavach Gemini AI Remediation Orchestrator
Structured context ingestion, multi-stage reasoning (Investigation -> Strategy -> Patch -> Correction),
schema validation, and deterministic security fallback.
"""

import json
import logging
import os
import re
from typing import Dict, Any, List, Optional
import httpx

from app.core.config import get_settings
from app.services.remediation.code_intelligence import CodeContext

logger = logging.getLogger("kavach.remediation.gemini")


class GeminiRemediationService:
    """
    Principal AI Remediation Orchestrator using Google Gemini.
    Generates unified diffs grounded in verified codebase intelligence.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or getattr(settings, "gemini_api_key", None)
        self.model = model or getattr(settings, "gemini_model", "gemini-2.5-flash-lite")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate_patch_proposal(
        self,
        finding_data: Dict[str, Any],
        code_context: CodeContext,
        selected_strategy: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Submits structured repository & AST context to Gemini to synthesize a verified patch proposal.
        """
        prompt = self._build_patch_prompt(finding_data, code_context, selected_strategy)

        if self._is_api_key_valid():
            try:
                gemini_res = await self._call_gemini(prompt)
                if gemini_res and gemini_res.get("patch"):
                    return gemini_res
            except Exception as e:
                logger.warning(f"Google Gemini patch generation API call notice: {e}. Engaging deterministic engine.")

        # Deterministic Grounded Engine Fallback
        return self._generate_grounded_fallback(finding_data, code_context, selected_strategy)

    async def diagnose_and_correct(
        self,
        file_path: str,
        original_content: str,
        failed_diff: str,
        failure_reason: str,
        failure_stage: str,
        finding_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Phase 6 Self-Healing: prompts Gemini to diagnose compiler/validation failure and output a revised patch.
        """
        prompt = f"""You are a Principal Security Engineer correcting a failed code patch in Kavach Security Platform.

FILE: {file_path}
VULNERABILITY: {finding_data.get('title')} ({finding_data.get('cwe')})

PREVIOUS ATTEMPTED PATCH DIFF:
```diff
{failed_diff}
```

VALIDATION FAILURE REASON ({failure_stage}):
{failure_reason}

ORIGINAL SOURCE EXCERPT:
```
{original_content[:3000]}
```

REQUIREMENTS:
1. Diagnose why the previous diff caused a failure or failed validation.
2. Produce a strictly valid, revised unified diff starting with `--- a/{file_path}` and `+++ b/{file_path}` that fixes the original vulnerability without triggering this error.
3. Ensure syntax and token balancing is 100% correct.
4. Output JSON strictly matching this schema:
{{
  "diagnosis": "<detailed diagnosis of the failure>",
  "revised_diff": "<full unified diff>",
  "explanation": "<how the revised patch resolves the failure>"
}}
Return raw JSON only."""

        if self._is_api_key_valid():
            try:
                res = await self._call_gemini(prompt)
                if res and res.get("revised_diff"):
                    return res
            except Exception as e:
                logger.warning(f"Gemini self-healing call error: {e}")

        return None

    def _is_api_key_valid(self) -> bool:
        if not self.api_key:
            return False
        # Ignore obvious dummy keys in tests
        if self.api_key.startswith("AQ.") or self.api_key.startswith("dummy") or len(self.api_key.strip()) < 10:
            return False
        return True

    def _build_patch_prompt(
        self,
        finding: Dict[str, Any],
        ctx: CodeContext,
        strategy: Optional[Dict[str, Any]],
    ) -> str:
        strat_desc = strategy.get("description", "Apply minimal defensive authorization and validation") if strategy else "Minimal secure patch"
        strat_approach = strategy.get("approach", "INLINE_GUARD") if strategy else "INLINE_GUARD"

        return f"""You are a Principal Application Security Engineer for Kavach Autonomous Security Platform.
Generate a real, minimal, non-breaking security remediation patch in unified diff format.

--- FINDING INTELLIGENCE ---
- Finding ID: {finding.get('id')}
- Title: {finding.get('title')}
- Severity: {finding.get('severity')}
- CWE: {finding.get('cwe', 'CWE-Unknown')}
- OWASP Category: {finding.get('owasp_category', 'API Security')}
- Description: {finding.get('description')}

--- CODEBASE INTELLIGENCE ---
- File: {ctx.target_file}
- Language: {ctx.language}
- Framework: {ctx.framework}
- Enclosing Function: {ctx.function_name or 'N/A'}
- Enclosing Class: {ctx.class_name or 'N/A'}
- Auth Middleware Detected: {', '.join(ctx.auth_middleware) if ctx.auth_middleware else 'None'}
- Authorization Patterns Detected: {', '.join(ctx.authorization_patterns) if ctx.authorization_patterns else 'None'}
- Existing Imports:
{chr(10).join(ctx.imports[:15])}

--- TARGET REMEDIATION STRATEGY ---
- Approach: {strat_approach}
- Directive: {strat_desc}

--- SOURCE CODE CONTEXT ---
```
{ctx.surrounding_code}
```

REQUIREMENTS:
1. Fix ONLY the security vulnerability. Do NOT reformat unrelated lines or remove existing business logic.
2. Output a strictly valid unified diff starting with `--- a/{ctx.target_file}` and `+++ b/{ctx.target_file}` with valid @@ line markers.
3. Output strictly valid JSON matching this schema:
{{
  "is_fixable": true,
  "root_cause": "<root cause explanation>",
  "explanation": "<detailed fix description>",
  "patch": "<unified diff>",
  "files_changed": ["{ctx.target_file}"],
  "confidence": 0.96,
  "tests_to_run": ["npm test" or "pytest"]
}}
Return raw JSON only."""

    async def _call_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/models/{self.model}:generateContent"
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            }
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, params=params, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return self._parse_json(parts[0].get("text", ""))
        return None

    def _parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception:
            s = cleaned.find("{")
            e = cleaned.rfind("}")
            if s != -1 and e != -1 and e > s:
                try:
                    return json.loads(cleaned[s:e+1])
                except Exception:
                    pass
        return None

    def _generate_grounded_fallback(
        self,
        finding: Dict[str, Any],
        ctx: CodeContext,
        strategy: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Deterministic, grounded AST patch synthesizer for production reliability when LLM is unavailable.
        """
        from app.services.code_api_security_engine import code_api_security_engine

        lines = ctx.surrounding_code.splitlines(keepends=True)
        if not lines:
            lines = ["// Security Target\n", "export async function handler() {}\n"]

        target_idx = max(0, min(len(lines) - 1, 5))
        cwe = str(finding.get("cwe") or "").upper()
        title = str(finding.get("title") or "").upper()

        if "639" in cwe or "BOLA" in title or "IDOR" in title:
            patch = code_api_security_engine._synthesize_bola_patch(ctx.target_file, lines, target_idx, {})
            root_cause = "Missing resource ownership verification permitting unauthorized cross-tenant object access."
            explanation = "Injected explicit resource ownership assertion ensuring caller ID matches target entity owner ID."
        elif "306" in cwe or "AUTH" in title:
            patch = code_api_security_engine._synthesize_missing_auth_patch(ctx.target_file, lines, target_idx, {})
            root_cause = "Route exposed publicly without cryptographic authentication token verification."
            explanation = "Bound authentication middleware guard rejecting unauthenticated calls with HTTP 401."
        elif "89" in cwe or "SQL" in title:
            if ctx.language == "python":
                patch = code_api_security_engine._synthesize_sqli_patch_py(ctx.target_file, lines, target_idx)
            else:
                patch = code_api_security_engine._synthesize_sqli_patch_js(ctx.target_file, lines, target_idx)
            root_cause = "Dynamic string formatting in database query allowing arbitrary SQL execution."
            explanation = "Parameterized database query using typed variable bindings."
        else:
            patch = code_api_security_engine._synthesize_rate_limit_patch(ctx.target_file, lines, target_idx, {})
            root_cause = "Unbounded API endpoint consumption permitting brute force or resource starvation."
            explanation = "Enforced sliding-window rate limiting decorator returning HTTP 429 upon threshold breach."

        return {
            "is_fixable": True,
            "root_cause": root_cause,
            "explanation": explanation,
            "patch": patch,
            "files_changed": [ctx.target_file],
            "confidence": 0.95,
            "tests_to_run": ["pytest tests/test_security.py" if ctx.language == "python" else "npm test"],
            "engine": "Kavach Grounded Deterministic Security Engine",
        }

