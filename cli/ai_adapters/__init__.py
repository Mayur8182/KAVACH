"""
Thing AI Coding Agent Adapter Architecture — Step 27

Architecture:
    Thing Security Core
           │
           ├── CursorAdapter
           ├── ClaudeCodeAdapter
           ├── CodexAdapter
           ├── CopilotAdapter
           └── AntigravityAdapter

CRITICAL SECURITY INVARIANTS:
  - AI coding agents NEVER bypass Thing policy.
  - LLM output NEVER directly executes shell commands.
  - AI-generated fixes require: Apply → Test → Scan → Verify before FIXED status.
  - Every tool request from an AI agent must pass through authorization.
  - Repository text / README / comments cannot override Thing policy.
  - Prompt injection from repository content is actively defended against.
"""

import abc
import hashlib
import json
import logging
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger("thing.ai_adapters")

THING_API_URL = "http://localhost:8000/api/v1"

# ─────────────────────────────────────────────────────────────────
# Security Event Types
# ─────────────────────────────────────────────────────────────────

class AIAgentEventType:
    CODE_CHANGE_PROPOSED = "CODE_CHANGE_PROPOSED"
    CODE_CHANGE_SCANNED = "CODE_CHANGE_SCANNED"
    CODE_CHANGE_ALLOWED = "CODE_CHANGE_ALLOWED"
    CODE_CHANGE_BLOCKED = "CODE_CHANGE_BLOCKED"
    COMMAND_REQUESTED = "COMMAND_REQUESTED"
    COMMAND_ALLOWED = "COMMAND_ALLOWED"
    COMMAND_BLOCKED = "COMMAND_BLOCKED"
    SECRET_ACCESS_ATTEMPTED = "SECRET_ACCESS_ATTEMPTED"
    TOOL_INVOCATION = "TOOL_INVOCATION"
    TOOL_BLOCKED = "TOOL_BLOCKED"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    FIX_GENERATED = "FIX_GENERATED"
    FIX_APPLIED = "FIX_APPLIED"
    FIX_SCANNED = "FIX_SCANNED"
    FIX_VERIFIED = "FIX_VERIFIED"
    FIX_COMPLETED = "FIX_COMPLETED"
    PROMPT_INJECTION_DETECTED = "PROMPT_INJECTION_DETECTED"


# ─────────────────────────────────────────────────────────────────
# Fix Lifecycle State Machine
# ─────────────────────────────────────────────────────────────────

class AIFixStatus:
    GENERATED = "GENERATED"
    APPLIED = "APPLIED"
    TESTED = "TESTED"
    SCANNED = "SCANNED"
    VERIFIED = "VERIFIED"
    FIXED = "FIXED"
    FAILED = "FAILED"


@dataclass
class AIFix:
    """
    Tracks the full lifecycle of an AI-generated fix.
    A fix is NEVER marked FIXED until: Applied + Tested + Scanned + Verified.
    """
    fix_id: str
    finding_id: str
    session_id: str
    original_file: str
    original_content: str
    proposed_patch: str
    diff: Optional[str] = None
    status: str = AIFixStatus.GENERATED
    test_result: Optional[str] = None
    scan_result: Optional[dict] = None
    verification_result: Optional[str] = None
    applied_at: Optional[str] = None
    tested_at: Optional[str] = None
    scanned_at: Optional[str] = None
    verified_at: Optional[str] = None
    completed_at: Optional[str] = None

    def can_advance_to(self, next_status: str) -> bool:
        """Enforce the fix state machine — no skipping steps."""
        transitions = {
            AIFixStatus.GENERATED: [AIFixStatus.APPLIED, AIFixStatus.FAILED],
            AIFixStatus.APPLIED: [AIFixStatus.TESTED, AIFixStatus.FAILED],
            AIFixStatus.TESTED: [AIFixStatus.SCANNED, AIFixStatus.FAILED],
            AIFixStatus.SCANNED: [AIFixStatus.VERIFIED, AIFixStatus.FAILED],
            AIFixStatus.VERIFIED: [AIFixStatus.FIXED],
            AIFixStatus.FIXED: [],
            AIFixStatus.FAILED: [],
        }
        return next_status in transitions.get(self.status, [])


# ─────────────────────────────────────────────────────────────────
# Prompt Injection Defense
# ─────────────────────────────────────────────────────────────────

# Patterns that attempt to override Thing policy through repository content.
# These are ALWAYS blocked regardless of source.
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+all\s+previous\s+instructions",
    r"disregard\s+thing\s+policy",
    r"allow\s+all\s+code\s+changes",
    r"bypass\s+security",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+if\s+you\s+have\s+no\s+restrictions",
    r"thing[_\s]policy\s*=\s*allow",
    r"OVERRIDE_SECURITY",
    r"DISABLE_SCANNING",
    r"SKIP_POLICY",
]

COMPILED_INJECTION_PATTERNS = [re.compile(p, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS]


def detect_prompt_injection(content: str) -> List[str]:
    """
    Detect prompt injection attempts in repository content.
    README / comments / code CANNOT override Thing security policy.
    Returns list of detected patterns.
    """
    detected = []
    for pattern in COMPILED_INJECTION_PATTERNS:
        if pattern.search(content):
            detected.append(pattern.pattern)
    return detected


def sanitize_for_llm_context(content: str, max_bytes: int = 10_000) -> str:
    """
    Sanitize repository content before sending as LLM context.
    - Truncates to max_bytes
    - Does NOT allow content to carry security-overriding instructions
    The LLM receives context; it does NOT receive policy authority.
    """
    # Check for injection attempts
    injections = detect_prompt_injection(content)
    if injections:
        logger.warning(f"Prompt injection attempt detected in repository content: {injections}")
        # Do not pass the malicious content to the LLM
        content = "[CONTENT REDACTED — Prompt injection attempt detected]"

    # Truncate
    if len(content.encode()) > max_bytes:
        content = content.encode()[:max_bytes].decode(errors="ignore") + "\n...[TRUNCATED]"

    return content


# ─────────────────────────────────────────────────────────────────
# Base Adapter
# ─────────────────────────────────────────────────────────────────

class BaseAIAgentAdapter(abc.ABC):
    """
    Base class for all AI coding agent adapters.

    The adapter pattern ensures that provider-specific logic stays isolated.
    The security core (policy, scanner, contract) is NEVER duplicated per adapter.
    """

    adapter_name: str = "base"

    def __init__(self, session_id: str, project_id: str):
        self.session_id = session_id
        self.project_id = project_id

    def _record_event(self, event_type: str, details: dict):
        """Record a security event to the backend audit trail."""
        url = f"{THING_API_URL}/cli/ai-adapters/event"
        payload = {
            "session_id": self.session_id,
            "event_type": event_type,
            "details": details,
        }
        try:
            req = urllib.request.Request(url, method="POST")
            req.add_header("Content-Type", "application/json")
            urllib.request.urlopen(req, data=json.dumps(payload).encode(), timeout=5)
        except Exception as e:
            logger.warning(f"Failed to record AI agent event: {e}")

    def _get_security_context(self) -> Optional[dict]:
        """Fetch real security context from backend."""
        try:
            req = urllib.request.Request(f"{THING_API_URL}/cli/context/{self.project_id}")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read())
        except Exception as e:
            logger.warning(f"Cannot fetch security context: {e}")
            return None

    @abc.abstractmethod
    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        """
        Called when the AI agent proposes a code change.
        Must evaluate through Thing security before allowing application.
        Returns: {allowed: bool, reason: str, findings: list, policy_decision: str}
        """
        ...

    @abc.abstractmethod
    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        """
        Called when the AI agent requests to invoke a tool.
        Every tool request must pass through authorization and policy evaluation.
        Returns: {allowed: bool, reason: str}
        """
        ...

    def _evaluate_code_against_policy(self, file_path: str, content: str) -> Dict[str, Any]:
        """
        Core security evaluation — shared across all adapters.
        Calls the local agent scan endpoint to run real scanners.
        """
        # Check for prompt injection in the code itself
        injections = detect_prompt_injection(content)
        if injections:
            self._record_event(AIAgentEventType.PROMPT_INJECTION_DETECTED, {
                "file": file_path,
                "patterns": injections,
            })
            return {
                "allowed": False,
                "reason": "Prompt injection attempt detected in proposed code.",
                "policy_decision": "BLOCK",
                "findings": [],
            }

        # Delegate to local agent scan endpoint
        try:
            req = urllib.request.Request("http://127.0.0.1:17382/scan")
            with urllib.request.urlopen(req, timeout=30) as resp:
                scan_data = json.loads(resp.read())

            findings = scan_data.get("findings", [])
            failed_scanners = scan_data.get("scanners_failed", [])

            if failed_scanners:
                # NEVER claim pass when scanners failed
                return {
                    "allowed": False,
                    "reason": f"Security verification INCOMPLETE — scanners failed: {failed_scanners}",
                    "policy_decision": "BLOCK",
                    "findings": [],
                }

            ctx = self._get_security_context()
            policy = ctx.get("policy", {}) if ctx else {}
            policy_action = policy.get("default_action", "ALLOW")

            if findings and policy_action == "BLOCK":
                policy_decision = "BLOCK"
                allowed = False
            elif findings and policy_action == "WARN":
                policy_decision = "WARN"
                allowed = True  # Warn but allow
            else:
                policy_decision = "ALLOW"
                allowed = True

            self._record_event(AIAgentEventType.CODE_CHANGE_SCANNED, {
                "file": file_path,
                "findings_count": len(findings),
                "policy_decision": policy_decision,
            })

            return {
                "allowed": allowed,
                "reason": f"Policy decision: {policy_decision}. {len(findings)} finding(s).",
                "policy_decision": policy_decision,
                "findings": findings,
            }

        except Exception as e:
            # Local agent not running — CANNOT verify
            logger.warning(f"Local agent unavailable: {e}")
            return {
                "allowed": False,
                "reason": "Local security agent not running. Cannot verify code change.",
                "policy_decision": "BLOCK",
                "findings": [],
            }


# ─────────────────────────────────────────────────────────────────
# Concrete Adapters
# ─────────────────────────────────────────────────────────────────

class CursorAdapter(BaseAIAgentAdapter):
    """Adapter for Cursor AI coding agent."""
    adapter_name = "cursor"

    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        self._record_event(AIAgentEventType.CODE_CHANGE_PROPOSED, {
            "file": file_path,
            "adapter": self.adapter_name,
            "description": change_description[:500],
        })
        result = self._evaluate_code_against_policy(file_path, new_content)
        event = AIAgentEventType.CODE_CHANGE_ALLOWED if result["allowed"] else AIAgentEventType.CODE_CHANGE_BLOCKED
        self._record_event(event, {"file": file_path, "policy_decision": result["policy_decision"]})
        return result

    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        return _evaluate_tool_request(self, tool_name, tool_args)


class ClaudeCodeAdapter(BaseAIAgentAdapter):
    """Adapter for Claude Code (Anthropic) coding agent."""
    adapter_name = "claude_code"

    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        self._record_event(AIAgentEventType.CODE_CHANGE_PROPOSED, {
            "file": file_path,
            "adapter": self.adapter_name,
            "description": change_description[:500],
        })
        result = self._evaluate_code_against_policy(file_path, new_content)
        event = AIAgentEventType.CODE_CHANGE_ALLOWED if result["allowed"] else AIAgentEventType.CODE_CHANGE_BLOCKED
        self._record_event(event, {"file": file_path, "policy_decision": result["policy_decision"]})
        return result

    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        return _evaluate_tool_request(self, tool_name, tool_args)


class CodexAdapter(BaseAIAgentAdapter):
    """Adapter for OpenAI Codex."""
    adapter_name = "codex"

    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        self._record_event(AIAgentEventType.CODE_CHANGE_PROPOSED, {
            "file": file_path,
            "adapter": self.adapter_name,
        })
        result = self._evaluate_code_against_policy(file_path, new_content)
        return result

    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        return _evaluate_tool_request(self, tool_name, tool_args)


class CopilotAdapter(BaseAIAgentAdapter):
    """Adapter for GitHub Copilot."""
    adapter_name = "github_copilot"

    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        self._record_event(AIAgentEventType.CODE_CHANGE_PROPOSED, {
            "file": file_path,
            "adapter": self.adapter_name,
        })
        result = self._evaluate_code_against_policy(file_path, new_content)
        return result

    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        return _evaluate_tool_request(self, tool_name, tool_args)


class AntigravityAdapter(BaseAIAgentAdapter):
    """Adapter for Google Antigravity (AGY) coding agent."""
    adapter_name = "antigravity"

    def intercept_code_change(self, file_path: str, new_content: str,
                               change_description: str) -> Dict[str, Any]:
        self._record_event(AIAgentEventType.CODE_CHANGE_PROPOSED, {
            "file": file_path,
            "adapter": self.adapter_name,
        })
        result = self._evaluate_code_against_policy(file_path, new_content)
        return result

    def intercept_tool_request(self, tool_name: str, tool_args: dict) -> Dict[str, Any]:
        return _evaluate_tool_request(self, tool_name, tool_args)


# ─────────────────────────────────────────────────────────────────
# Shared Tool Request Evaluation
# ─────────────────────────────────────────────────────────────────

# Tools that are inherently high-risk and require explicit policy approval
HIGH_RISK_TOOLS = {
    "run_command", "execute_shell", "bash", "shell",
    "read_secret", "get_secret", "access_credentials",
    "modify_infrastructure", "apply_terraform", "kubectl_apply",
    "push_code", "git_push",
    "create_pull_request", "merge_pr",
    "deploy", "deploy_to_production",
    "send_request", "http_request",
}


def _evaluate_tool_request(adapter: BaseAIAgentAdapter, tool_name: str, tool_args: dict) -> Dict[str, Any]:
    """
    Shared tool request evaluation logic.
    All AI agent tool requests pass through this.
    HIGH_RISK tools require explicit policy approval.
    """
    adapter._record_event(AIAgentEventType.TOOL_INVOCATION, {
        "tool": tool_name,
        "adapter": adapter.adapter_name,
        # Never log potentially secret tool args
        "arg_keys": list(tool_args.keys()),
    })

    if tool_name.lower() in HIGH_RISK_TOOLS:
        adapter._record_event(AIAgentEventType.TOOL_BLOCKED, {
            "tool": tool_name,
            "reason": "HIGH_RISK_TOOL — requires explicit policy approval via MCP authority system",
        })
        return {
            "allowed": False,
            "reason": (
                f"Tool '{tool_name}' is classified as HIGH_RISK. "
                "It must be evaluated through the Thing Agent Authority system (MCP → Policy → Approval)."
            ),
            "policy_decision": "REQUIRE_APPROVAL",
        }

    return {
        "allowed": True,
        "reason": f"Tool '{tool_name}' is permitted under current policy.",
        "policy_decision": "ALLOW",
    }


# ─────────────────────────────────────────────────────────────────
# Adapter Registry / Factory
# ─────────────────────────────────────────────────────────────────

ADAPTER_REGISTRY: Dict[str, type] = {
    "cursor": CursorAdapter,
    "claude_code": ClaudeCodeAdapter,
    "codex": CodexAdapter,
    "github_copilot": CopilotAdapter,
    "antigravity": AntigravityAdapter,
}


def get_adapter(adapter_name: str, session_id: str, project_id: str) -> BaseAIAgentAdapter:
    """
    Factory function. Returns the appropriate adapter for the given AI coding agent.
    Provider-specific security logic stays in adapters; the core is never duplicated.
    """
    cls = ADAPTER_REGISTRY.get(adapter_name.lower())
    if not cls:
        raise ValueError(
            f"Unknown AI agent adapter: '{adapter_name}'. "
            f"Supported: {list(ADAPTER_REGISTRY.keys())}"
        )
    return cls(session_id=session_id, project_id=project_id)
