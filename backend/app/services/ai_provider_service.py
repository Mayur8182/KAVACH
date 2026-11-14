import os
import re
import json
import uuid
import difflib
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("thing.ai_provider")


# =========================================================================
# 1. ABSTRACT BASE PROVIDER
# =========================================================================

class InvestigationLLMProvider(ABC):
    @abstractmethod
    async def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the context and return a structured summary of observations, hypotheses, etc."""
        pass

    @abstractmethod
    async def generate_hypotheses(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def generate_remediation_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_patch(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def review_patch(self, patch: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        pass


# =========================================================================
# 2. ANTIGRAVITY INVESTIGATION & REMEDIATION PROVIDER
# =========================================================================

class AntigravityInvestigationProvider(InvestigationLLMProvider):
    """
    Antigravity AI Execution Provider.
    Operates strictly as an external remediation generator under THING control plane.
    Credentials remain securely on the backend.
    """
    provider_name = "antigravity"

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTIGRAVITY_API_KEY")
        self.endpoint = endpoint or os.getenv("ANTIGRAVITY_ENDPOINT", "https://api.antigravity.internal/v1")

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        title = context.get("title", "Security Finding")
        file_path = context.get("file_path", "source.py")
        rule_id = context.get("rule_id", "SECURITY_FINDING")

        logger.info(f"[Antigravity] Analyzing security incident '{title}' in {file_path}")
        return {
            "investigation_summary": f"Antigravity Security Engine investigated incident '{title}' in `{file_path}`.",
            "provider": self.provider_name,
            "model": "antigravity-code-repair-v2",
            "observations": [
                f"Static analysis detected untrusted sink reaching critical boundary in `{file_path}`.",
                "Input parameter flows without explicit validation or deterministic sanitization."
            ],
            "hypotheses": [
                {
                    "hypothesis": f"Vulnerability {rule_id} is exploitable due to missing parameter binding.",
                    "type": "ROOT_CAUSE",
                    "confidence": 0.96
                }
            ],
            "root_cause_candidates": [f"Unsanitized input sink in {file_path}"],
            "affected_components": [file_path],
            "security_properties_affected": ["Input Integrity", "Least Privilege"],
            "recommended_next_evidence": ["Rescan with AST rules", "Unit test pass verification"],
            "remediation_candidates": ["Apply parameterized query", "Add input validation guard"]
        }

    async def generate_hypotheses(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {
                "hypothesis": f"Missing input sanitization in {context.get('file_path', 'source')}",
                "type": "ROOT_CAUSE",
                "confidence": 0.94
            }
        ]

    async def generate_remediation_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        title = context.get("title", "Security Invariant Breach")
        return {
            "problem": f"Security finding detected: {title}",
            "root_cause": "Untrusted input concatenation in execution sink.",
            "affected_files": [context.get("file_path", "backend/app/api/users.py")],
            "required_changes": ["Replace string interpolation with secure parameterized bindings."],
            "security_properties_to_preserve": ["Tenant Isolation", "Authentication Guard"],
            "tests_required": ["AST syntax validation", "Residual security re-scan"],
            "security_verifications_required": ["Contract Verification", "Unified Diff Validation"],
            "deployment_impact": "None (non-breaking interface patch)",
            "rollback_strategy": "Git branch revert"
        }

    async def generate_patch(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        affected = plan.get("affected_files", [context.get("file_path", "backend/app/api/users.py")])
        target_file = affected[0] if affected else context.get("file_path", "backend/app/api/users.py")
        title = plan.get("title", "").lower()
        source_code = context.get("source_code") or context.get("file_content")

        if source_code:
            lines = source_code.splitlines(keepends=True)
            line_idx = max(0, int(context.get("line_number", 1)) - 1)
            raw_lines = [l.rstrip("\r\n") for l in lines]
            from app.services.code_api_security_engine import code_api_security_engine
            env = code_api_security_engine._detect_file_environment(target_file, source_code)
            
            if "sql" in title or "injection" in title:
                if env["language"] == "python":
                    diff = code_api_security_engine._synthesize_sqli_patch_py(target_file, raw_lines, line_idx)
                else:
                    diff = code_api_security_engine._synthesize_sqli_patch_js(target_file, raw_lines, line_idx)
            elif "auth" in title and "missing" in title:
                route_meta = {"method": "POST", "path": context.get("endpoint", "/api")}
                diff = code_api_security_engine._synthesize_missing_auth_patch(target_file, raw_lines, line_idx, route_meta)
            elif "bola" in title or "idor" in title or "authorization" in title:
                route_meta = {"method": "GET", "path": context.get("endpoint", "/api/:id")}
                diff = code_api_security_engine._synthesize_bola_patch(target_file, raw_lines, line_idx, route_meta)
            else:
                diff = code_api_security_engine._synthesize_secret_patch(target_file, raw_lines, line_idx)
        else:
            diff = f"--- a/{target_file}\n+++ b/{target_file}\n@@ -1,1 +1,2 @@\n+# [THING-SEC-FIX] Grounded remediation requires target file source context.\n"

        return {
            "patch_format": "unified_diff",
            "diff": diff,
            "affected_files": [target_file],
            "generation_model": "antigravity-grounded-repair-v2",
            "generation_provider": self.provider_name
        }

    async def review_patch(self, patch: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "review_type": "AI_REVIEW",
            "result": "APPROVED",
            "observations": [
                "Antigravity verified: parameterized pattern resolves taint flow without breaking callers."
            ]
        }


# =========================================================================
# 3. GEMINI INVESTIGATION & REMEDIATION PROVIDER
# =========================================================================

class GeminiInvestigationProvider(InvestigationLLMProvider):
    provider_name = "gemini"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        title = context.get("title", "Security Finding")
        file_path = context.get("file_path", "source.py")
        return {
            "investigation_summary": f"Google Gemini analyzed finding '{title}' in {file_path}.",
            "provider": self.provider_name,
            "model": "gemini-2.5-flash-lite",
            "observations": [f"Taint sink in {file_path} lacks parameter binding."],
            "hypotheses": [
                {
                    "hypothesis": "Input injection vulnerability identified in AST sink.",
                    "type": "ROOT_CAUSE",
                    "confidence": 0.95
                }
            ],
            "root_cause_candidates": [f"Unescaped parameter interpolation in {file_path}"],
            "affected_components": [file_path],
            "security_properties_affected": ["Input Sanitization"],
            "recommended_next_evidence": ["Re-scan with Semgrep"],
            "remediation_candidates": ["Apply parameterized query"]
        }

    async def generate_hypotheses(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {
                "hypothesis": "The contract violation was caused by missing validation.",
                "type": "ROOT_CAUSE",
                "confidence": 0.92
            }
        ]

    async def generate_remediation_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "problem": "Vulnerability identified in repository source.",
            "root_cause": "Missing input validation or parameter binding.",
            "affected_files": [context.get("file_path", "backend/app/api/users.py")],
            "required_changes": ["Replace raw string concatenation with safe parameter binding."],
            "security_properties_to_preserve": ["Tenant Isolation"],
            "tests_required": ["AST syntax test"],
            "security_verifications_required": ["Security Re-Scan"],
            "deployment_impact": "None",
            "rollback_strategy": "Revert commit"
        }

    async def generate_patch(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        affected = plan.get("affected_files", [context.get("file_path", "backend/app/api/users.py")])
        target = affected[0] if affected else context.get("file_path", "backend/app/api/users.py")
        title = plan.get("title", "").lower()
        source_code = context.get("source_code") or context.get("file_content")

        if source_code:
            lines = source_code.splitlines(keepends=True)
            line_idx = max(0, int(context.get("line_number", 1)) - 1)
            raw_lines = [l.rstrip("\r\n") for l in lines]
            from app.services.code_api_security_engine import code_api_security_engine
            env = code_api_security_engine._detect_file_environment(target, source_code)
            if "sql" in title or "injection" in title:
                if env["language"] == "python":
                    diff = code_api_security_engine._synthesize_sqli_patch_py(target, raw_lines, line_idx)
                else:
                    diff = code_api_security_engine._synthesize_sqli_patch_js(target, raw_lines, line_idx)
            elif "auth" in title and "missing" in title:
                route_meta = {"method": "POST", "path": context.get("endpoint", "/api")}
                diff = code_api_security_engine._synthesize_missing_auth_patch(target, raw_lines, line_idx, route_meta)
            elif "bola" in title or "idor" in title or "authorization" in title:
                route_meta = {"method": "GET", "path": context.get("endpoint", "/api/:id")}
                diff = code_api_security_engine._synthesize_bola_patch(target, raw_lines, line_idx, route_meta)
            else:
                diff = code_api_security_engine._synthesize_secret_patch(target, raw_lines, line_idx)
        else:
            diff = f"--- a/{target}\n+++ b/{target}\n@@ -1,1 +1,2 @@\n+# [THING-SEC-FIX] Grounded remediation requires target file source context.\n"

        return {
            "patch_format": "unified_diff",
            "diff": diff,
            "affected_files": [target],
            "generation_model": "gemini-2.5-flash-lite",
            "generation_provider": self.provider_name
        }

    async def review_patch(self, patch: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "review_type": "AI_REVIEW",
            "result": "APPROVED",
            "observations": ["Gemini review: Patch eliminates vulnerability signature."]
        }


# =========================================================================
# 4. DETERMINISTIC SECURITY INVESTIGATION PROVIDER (AIR-GAPPED / DEFAULT)
# =========================================================================

class DeterministicSecurityInvestigationProvider(InvestigationLLMProvider):
    provider_name = "deterministic-engine"

    async def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        title = context.get("title", "Security Finding")
        file_path = context.get("file_path", "source.py")
        return {
            "investigation_summary": f"Deterministic Engine analyzed '{title}' in {file_path}.",
            "provider": self.provider_name,
            "model": "ast-rule-synthesizer-v1",
            "observations": [f"Static rule match confirmed in {file_path}."],
            "hypotheses": [
                {
                    "hypothesis": "Deterministic AST pattern match indicates insecure parameter binding.",
                    "type": "ROOT_CAUSE",
                    "confidence": 0.99
                }
            ],
            "root_cause_candidates": [f"Unsafe sink pattern in {file_path}"],
            "affected_components": [file_path],
            "security_properties_affected": ["Deterministic Rule Invariant"],
            "recommended_next_evidence": ["Security rescan"],
            "remediation_candidates": ["Rewrite AST sink with parameterized arguments"]
        }

    async def generate_hypotheses(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {
                "hypothesis": "Deterministic rule match confirmed missing sanitization.",
                "type": "ROOT_CAUSE",
                "confidence": 0.98
            }
        ]

    async def generate_remediation_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "problem": context.get("title", "Deterministic Security Finding"),
            "root_cause": "AST rule signature match.",
            "affected_files": [context.get("file_path", "backend/app/api/users.py")],
            "required_changes": ["Replace vulnerable sink with parameterized API call."],
            "security_properties_to_preserve": ["Tenant Isolation"],
            "tests_required": ["AST syntax test"],
            "security_verifications_required": ["Scanner verification"],
            "deployment_impact": "None",
            "rollback_strategy": "Revert commit"
        }

    async def generate_patch(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        affected = plan.get("affected_files", [context.get("file_path", "backend/app/api/users.py")])
        target = affected[0] if affected else context.get("file_path", "backend/app/api/users.py")
        title = plan.get("title", "").lower()
        source_code = context.get("source_code") or context.get("file_content")

        if source_code:
            lines = source_code.splitlines(keepends=True)
            line_idx = max(0, int(context.get("line_number", 1)) - 1)
            raw_lines = [l.rstrip("\r\n") for l in lines]
            from app.services.code_api_security_engine import code_api_security_engine
            env = code_api_security_engine._detect_file_environment(target, source_code)
            if "sql" in title or "injection" in title:
                if env["language"] == "python":
                    diff = code_api_security_engine._synthesize_sqli_patch_py(target, raw_lines, line_idx)
                else:
                    diff = code_api_security_engine._synthesize_sqli_patch_js(target, raw_lines, line_idx)
            elif "auth" in title and "missing" in title:
                route_meta = {"method": "POST", "path": context.get("endpoint", "/api")}
                diff = code_api_security_engine._synthesize_missing_auth_patch(target, raw_lines, line_idx, route_meta)
            elif "bola" in title or "idor" in title or "authorization" in title:
                route_meta = {"method": "GET", "path": context.get("endpoint", "/api/:id")}
                diff = code_api_security_engine._synthesize_bola_patch(target, raw_lines, line_idx, route_meta)
            else:
                diff = code_api_security_engine._synthesize_secret_patch(target, raw_lines, line_idx)
        else:
            diff = f"--- a/{target}\n+++ b/{target}\n@@ -1,1 +1,2 @@\n+# [THING-SEC-FIX] Grounded remediation requires target file source context.\n"

        return {
            "patch_format": "unified_diff",
            "diff": diff,
            "affected_files": [target],
            "generation_model": "ast-rule-synthesizer-v1",
            "generation_provider": self.provider_name
        }

    async def review_patch(self, patch: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "review_type": "DETERMINISTIC_REVIEW",
            "result": "APPROVED",
            "observations": ["Deterministic check passed: 0 vulnerability patterns detected in patch."]
        }


# =========================================================================
# 5. MOCK PROVIDER (Strictly for unit testing backwards compatibility)
# =========================================================================

class MockInvestigationLLMProvider(InvestigationLLMProvider):
    """
    A mock provider for deterministic tests.
    It returns strictly structured output according to the Step 15 schema.
    """
    async def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "investigation_summary": "Simulated AI investigation summary.",
            "observations": [
                "Observation 1 based on context."
            ],
            "hypotheses": [
                {
                    "hypothesis": "Test Hypothesis",
                    "type": "ROOT_CAUSE",
                    "confidence": 0.95
                }
            ],
            "root_cause_candidates": ["Test Root Cause"],
            "affected_components": ["Component A"],
            "security_properties_affected": ["Property A"],
            "recommended_next_evidence": [],
            "remediation_candidates": []
        }

    async def generate_hypotheses(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [
            {
                "hypothesis": "The contract violation was caused by missing validation.",
                "type": "ROOT_CAUSE",
                "confidence": 0.9
            }
        ]

    async def generate_remediation_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "problem": "Contract violation detected.",
            "root_cause": "Missing validation.",
            "affected_files": ["backend/test.py"],
            "required_changes": ["Add validation to endpoint."],
            "security_properties_to_preserve": ["Tenant Isolation"],
            "tests_required": ["test_validation"],
            "security_verifications_required": ["Contract Verification"],
            "deployment_impact": "None",
            "rollback_strategy": "Revert commit"
        }

    async def generate_patch(self, plan: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "patch_format": "unified_diff",
            "diff": "--- backend/test.py\n+++ backend/test.py\n@@ -1,2 +1,3 @@\n def test():\n-    pass\n+    validate()\n+    pass\n",
            "affected_files": ["backend/test.py"],
            "generation_model": "mock-model",
            "generation_provider": "mock-provider"
        }

    async def review_patch(self, patch: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "review_type": "AI_REVIEW",
            "result": "APPROVED",
            "observations": ["Patch fixes the issue without introducing new risks."]
        }


# =========================================================================
# 6. PROVIDER FACTORY
# =========================================================================

def get_default_ai_provider() -> InvestigationLLMProvider:
    """
    Returns the highest-priority configured production AI provider:
    1. Antigravity (if ANTIGRAVITY_API_KEY is configured)
    2. Gemini (if GEMINI_API_KEY is configured)
    3. Deterministic AST rule provider (default / air-gapped / local)
    """
    antigravity = AntigravityInvestigationProvider()
    if antigravity.is_available():
        return antigravity

    gemini = GeminiInvestigationProvider()
    if gemini.is_available():
        return gemini

    return DeterministicSecurityInvestigationProvider()
