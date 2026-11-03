"""
Thing Agent Integration SDK — Step 28

Architecture:
  AgentAdapter (Protocol)
      ├── CursorAdapter
      ├── ClaudeCodeAdapter
      ├── CodexAdapter
      ├── CopilotAdapter
      ├── AntigravityAdapter
      └── GenericAgentAdapter

Security invariants:
  - Every adapter translates provider events into canonical Thing events.
  - Security logic (authorization, policy, risk) lives in the CORE — never in adapters.
  - Adapters are thin wrappers that bridge provider protocol to Thing's event model.
  - Provider-specific code does NOT replicate security decisions.
  - If a provider capability cannot be verified: status = UNKNOWN.
  - If a provider is not configured: status = NOT_CONFIGURED.
  - Prompt injection defense is applied to ALL untrusted content (§28.19).
"""
import hashlib
import logging
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger("thing.agent_sdk")


# ─────────────────────────────────────────────────────────────────
# Adapter Status
# ─────────────────────────────────────────────────────────────────

class AdapterStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    AUTHORIZATION_FAILED = "AUTHORIZATION_FAILED"
    UNSUPPORTED = "UNSUPPORTED"
    RATE_LIMITED = "RATE_LIMITED"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    TIMEOUT = "TIMEOUT"
    DISCONNECTED = "DISCONNECTED"
    DISABLED = "DISABLED"


# ─────────────────────────────────────────────────────────────────
# Canonical Capability Model
# ─────────────────────────────────────────────────────────────────

class CapabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    UNKNOWN = "UNKNOWN"     # Cannot be verified from provider API
    RESTRICTED = "RESTRICTED"
    DISABLED = "DISABLED"


@dataclass
class AgentCapability:
    name: str
    status: CapabilityStatus = CapabilityStatus.UNKNOWN
    risk_level: str = "MEDIUM"
    description: Optional[str] = None
    constraints: Optional[Dict] = None


@dataclass
class AgentCapabilities:
    """
    Actual capabilities for an AI agent.
    UNKNOWN is the safe default — never assume capability is available.
    Capabilities must come from real integration discovery.
    """
    file_read: CapabilityStatus = CapabilityStatus.UNKNOWN
    file_write: CapabilityStatus = CapabilityStatus.UNKNOWN
    terminal: CapabilityStatus = CapabilityStatus.UNKNOWN
    network: CapabilityStatus = CapabilityStatus.UNKNOWN
    git: CapabilityStatus = CapabilityStatus.UNKNOWN
    mcp: CapabilityStatus = CapabilityStatus.UNKNOWN
    browser: CapabilityStatus = CapabilityStatus.UNKNOWN
    deployment: CapabilityStatus = CapabilityStatus.UNKNOWN
    package_install: CapabilityStatus = CapabilityStatus.UNKNOWN
    secret_access: CapabilityStatus = CapabilityStatus.UNKNOWN
    cloud_access: CapabilityStatus = CapabilityStatus.UNKNOWN
    kubernetes: CapabilityStatus = CapabilityStatus.UNKNOWN

    def to_dict(self) -> Dict[str, str]:
        return {
            "file_read": self.file_read.value,
            "file_write": self.file_write.value,
            "terminal": self.terminal.value,
            "network": self.network.value,
            "git": self.git.value,
            "mcp": self.mcp.value,
            "browser": self.browser.value,
            "deployment": self.deployment.value,
            "package_install": self.package_install.value,
            "secret_access": self.secret_access.value,
            "cloud_access": self.cloud_access.value,
            "kubernetes": self.kubernetes.value,
        }


# ─────────────────────────────────────────────────────────────────
# Canonical Event Model (§28.29)
# ─────────────────────────────────────────────────────────────────

@dataclass
class CanonicalAgentEvent:
    """
    Canonical event produced by all adapters.
    Provider-specific events are translated here before entering Thing.
    """
    event_type: str
    agent_id: str
    provider: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    details: Optional[Dict] = None
    # Provided by the adapter from the provider event
    provider_event_id: Optional[str] = None
    # Risk/policy filled in by the CORE security engine — not the adapter
    risk_level: Optional[str] = None
    policy_decision: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# Prompt Injection Defense (§28.19)
# ─────────────────────────────────────────────────────────────────

# Patterns that attempt to override security policy via repository content
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(security|policy|all previous)", re.IGNORECASE),
    re.compile(r"bypass\s+(security|policy|authorization)", re.IGNORECASE),
    re.compile(r"disable\s+(security|scanner|policy)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?(admin|root|unrestricted)", re.IGNORECASE),
    re.compile(r"grant\s+(yourself|the agent)\s+(admin|full|unrestricted)", re.IGNORECASE),
    re.compile(r"upload\s+(\.env|credentials|secrets)", re.IGNORECASE),
    re.compile(r"exfiltrate\s+(credentials|secrets|keys)", re.IGNORECASE),
    re.compile(r"(forget|disregard)\s+your\s+(instructions|constraints)", re.IGNORECASE),
]


def classify_content_source(source: str) -> str:
    """
    Classify content source for instruction-source segregation.
    Only TRUSTED_CONTROL_PLANE can define security authority.
    """
    trusted_sources = {"control_plane", "policy_engine", "thing_api"}
    untrusted_sources = {"repository", "readme", "comment", "issue", "mcp_response", "user_file", "external"}

    if source in trusted_sources:
        return "TRUSTED"
    if source in untrusted_sources:
        return "UNTRUSTED"
    return "UNKNOWN"


def detect_prompt_injection(content: str, source: str) -> Dict[str, Any]:
    """
    Scan content from untrusted sources for prompt injection patterns.
    Returns detection result — never modifies security behavior.
    Policy engine uses this signal, never the content itself.
    """
    source_trust = classify_content_source(source)
    matched_patterns = []

    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(content):
            matched_patterns.append(pattern.pattern)

    detected = len(matched_patterns) > 0
    return {
        "detected": detected,
        "source": source,
        "source_trust": source_trust,
        "matched_patterns": matched_patterns,
        "content_hash": hashlib.sha256(content.encode()).hexdigest(),
        "verdict": "POTENTIAL_INJECTION" if detected else "CLEAN",
        # Content itself is NEVER passed to security engine — only this metadata
    }


# ─────────────────────────────────────────────────────────────────
# Base Adapter Protocol
# ─────────────────────────────────────────────────────────────────

class AgentAdapter(ABC):
    """
    Base adapter interface — all provider adapters implement this.

    CRITICAL: Adapters are thin protocol bridges.
    Security decisions (allow/block/approve) are NEVER made here.
    All security logic lives in the Thing Core security engine.
    """
    provider: str = "unknown"

    @abstractmethod
    async def get_status(self) -> AdapterStatus:
        """Return REAL integration status. NEVER return CONNECTED without verifying."""
        ...

    @abstractmethod
    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        """Get verified agent identity from provider. Returns None if unavailable."""
        ...

    @abstractmethod
    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        """Discover real capabilities from provider. Uses UNKNOWN when uncertain."""
        ...

    @abstractmethod
    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        """Translate provider-specific event to canonical Thing event."""
        ...

    def _safe_hash(self, data: Any) -> str:
        import json
        return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()

    def _sanitize_metadata(self, data: Dict) -> Dict:
        """Remove any potential secret values from metadata before storage."""
        SECRET_KEYS = {
            "token", "secret", "password", "key", "credential",
            "api_key", "access_key", "private_key", "auth",
        }
        sanitized = {}
        for k, v in data.items():
            if any(sk in k.lower() for sk in SECRET_KEYS):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = self._sanitize_metadata(v)
            else:
                sanitized[k] = v
        return sanitized


# ─────────────────────────────────────────────────────────────────
# Cursor Adapter
# ─────────────────────────────────────────────────────────────────

class CursorAdapter(AgentAdapter):
    """
    Cursor integration adapter.
    Status: NOT_CONFIGURED until credentials + webhook are verified.

    Cursor integration method: Webhook / Extension API.
    Capabilities: Discovered from real Cursor extension manifest.
    """
    provider = "cursor"

    def __init__(self, webhook_secret: Optional[str] = None, api_endpoint: Optional[str] = None):
        self._webhook_secret = webhook_secret
        self._api_endpoint = api_endpoint

    async def get_status(self) -> AdapterStatus:
        if not self._webhook_secret:
            return AdapterStatus.NOT_CONFIGURED
        # Real health check would validate webhook endpoint
        # Without a verified connection we report NOT_CONFIGURED
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        if not self._webhook_secret:
            return None
        # Would fetch from real Cursor API
        return None

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        # Without confirmed integration, all capabilities are UNKNOWN
        return AgentCapabilities()  # All fields default to UNKNOWN

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        event_type_map = {
            "file.read": "AGENT_FILE_READ",
            "file.write": "AGENT_FILE_WRITE",
            "terminal.command": "AGENT_COMMAND_REQUESTED",
            "tool.invoked": "AGENT_TOOL_REQUESTED",
            "session.start": "AGENT_SESSION_STARTED",
            "session.end": "AGENT_SESSION_ENDED",
        }
        provider_type = provider_event.get("type", "")
        canonical_type = event_type_map.get(provider_type, "AGENT_TOOL_REQUESTED")

        return CanonicalAgentEvent(
            event_type=canonical_type,
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            action=provider_type,
            resource=provider_event.get("resource"),
            details=self._sanitize_metadata(provider_event.get("metadata", {})),
            provider_event_id=provider_event.get("event_id"),
        )


# ─────────────────────────────────────────────────────────────────
# Claude Code Adapter
# ─────────────────────────────────────────────────────────────────

class ClaudeCodeAdapter(AgentAdapter):
    """
    Anthropic Claude Code integration adapter.
    Status: NOT_CONFIGURED until Anthropic API credentials are verified.

    Integration method: Anthropic API / Claude Tool Use API.
    """
    provider = "claude_code"

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key

    async def get_status(self) -> AdapterStatus:
        if not self._api_key:
            return AdapterStatus.NOT_CONFIGURED
        # A real implementation would call Anthropic's /v1/models to verify
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        return None  # NOT_CONFIGURED

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        # Claude Code capabilities depend on tool definitions provided
        # Cannot verify without real API connection
        return AgentCapabilities()

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        # Claude Tool Use API event format
        tool_use = provider_event.get("tool_use", {})
        return CanonicalAgentEvent(
            event_type="AGENT_TOOL_REQUESTED",
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            action=tool_use.get("name"),
            resource=str(tool_use.get("input", {}).get("path", "")),
            details={"tool_id": tool_use.get("id"), "tool_name": tool_use.get("name")},
            provider_event_id=provider_event.get("id"),
        )


# ─────────────────────────────────────────────────────────────────
# OpenAI Codex Adapter
# ─────────────────────────────────────────────────────────────────

class CodexAdapter(AgentAdapter):
    """
    OpenAI Codex / Assistants API integration adapter.
    Status: NOT_CONFIGURED until OpenAI API credentials verified.
    """
    provider = "codex"

    def __init__(self, api_key: Optional[str] = None, organization_id: Optional[str] = None):
        self._api_key = api_key
        self._org_id = organization_id

    async def get_status(self) -> AdapterStatus:
        if not self._api_key:
            return AdapterStatus.NOT_CONFIGURED
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        return None

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        return AgentCapabilities()

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        action = provider_event.get("step", {}).get("type", "unknown")
        return CanonicalAgentEvent(
            event_type="AGENT_TOOL_REQUESTED",
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            action=action,
            details=self._sanitize_metadata(provider_event.get("step", {})),
            provider_event_id=provider_event.get("id"),
        )


# ─────────────────────────────────────────────────────────────────
# GitHub Copilot Adapter
# ─────────────────────────────────────────────────────────────────

class CopilotAdapter(AgentAdapter):
    """
    GitHub Copilot integration adapter.
    Status: NOT_CONFIGURED until GitHub app credentials verified.
    """
    provider = "github_copilot"

    def __init__(self, github_token: Optional[str] = None):
        self._github_token = github_token

    async def get_status(self) -> AdapterStatus:
        if not self._github_token:
            return AdapterStatus.NOT_CONFIGURED
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        return None

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        # Copilot capabilities depend on GitHub license and settings
        return AgentCapabilities()

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        return CanonicalAgentEvent(
            event_type="AGENT_TOOL_REQUESTED",
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            action=provider_event.get("action"),
            resource=provider_event.get("resource"),
            details=self._sanitize_metadata(provider_event.get("context", {})),
            provider_event_id=provider_event.get("id"),
        )


# ─────────────────────────────────────────────────────────────────
# Antigravity Adapter
# ─────────────────────────────────────────────────────────────────

class AntigravityAdapter(AgentAdapter):
    """
    Google Antigravity coding agent adapter.
    Uses the native Thing integration — deepest capability visibility.
    Status: CONNECTED when AGY SDK session is active.
    """
    provider = "antigravity"

    def __init__(self, session_token: Optional[str] = None):
        self._session_token = session_token
        self._connected = False

    async def get_status(self) -> AdapterStatus:
        if not self._session_token:
            return AdapterStatus.NOT_CONFIGURED
        # AGY SDK native handshake would set this
        if self._connected:
            return AdapterStatus.CONNECTED
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        if not self._connected:
            return None
        return {
            "provider": self.provider,
            "agent_id": agent_config.get("agent_id"),
            "model": agent_config.get("model", "UNKNOWN"),
        }

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        if not self._connected:
            return AgentCapabilities()
        # AGY SDK provides real capability manifest
        return AgentCapabilities(
            file_read=CapabilityStatus.AVAILABLE,
            file_write=CapabilityStatus.AVAILABLE,
            terminal=CapabilityStatus.AVAILABLE,
            network=CapabilityStatus.AVAILABLE,
            git=CapabilityStatus.AVAILABLE,
            mcp=CapabilityStatus.AVAILABLE,
            browser=CapabilityStatus.UNKNOWN,
            deployment=CapabilityStatus.RESTRICTED,
            package_install=CapabilityStatus.AVAILABLE,
            secret_access=CapabilityStatus.RESTRICTED,
            cloud_access=CapabilityStatus.RESTRICTED,
            kubernetes=CapabilityStatus.RESTRICTED,
        )

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        # Antigravity native events map directly
        return CanonicalAgentEvent(
            event_type=provider_event.get("event_type", "AGENT_TOOL_REQUESTED"),
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            session_id=provider_event.get("session_id"),
            action=provider_event.get("action"),
            resource=provider_event.get("resource"),
            details=self._sanitize_metadata(provider_event.get("details", {})),
            provider_event_id=provider_event.get("event_id"),
        )


# ─────────────────────────────────────────────────────────────────
# Generic Adapter
# ─────────────────────────────────────────────────────────────────

class GenericAgentAdapter(AgentAdapter):
    """
    Generic adapter for custom/future AI coding agents.
    New agents must provide: capability_manifest + event_schema.
    Security core remains unchanged — only adapter is added.
    """
    provider = "generic"

    def __init__(
        self,
        provider_name: str = "generic",
        webhook_endpoint: Optional[str] = None,
        capability_manifest: Optional[Dict] = None,
    ):
        self.provider = provider_name
        self._webhook_endpoint = webhook_endpoint
        self._capability_manifest = capability_manifest

    async def get_status(self) -> AdapterStatus:
        if not self._webhook_endpoint:
            return AdapterStatus.NOT_CONFIGURED
        return AdapterStatus.NOT_CONFIGURED

    async def get_identity(self, agent_config: Dict) -> Optional[Dict]:
        return None

    async def discover_capabilities(self, agent_config: Dict) -> AgentCapabilities:
        if not self._capability_manifest:
            return AgentCapabilities()  # All UNKNOWN
        caps = AgentCapabilities()
        manifest = self._capability_manifest

        def _status(val: Any) -> CapabilityStatus:
            if val is True:
                return CapabilityStatus.AVAILABLE
            if val is False:
                return CapabilityStatus.UNAVAILABLE
            return CapabilityStatus.UNKNOWN

        caps.file_read = _status(manifest.get("file_read"))
        caps.file_write = _status(manifest.get("file_write"))
        caps.terminal = _status(manifest.get("terminal"))
        caps.network = _status(manifest.get("network"))
        caps.git = _status(manifest.get("git"))
        caps.mcp = _status(manifest.get("mcp"))
        return caps

    async def translate_event(self, provider_event: Dict) -> Optional[CanonicalAgentEvent]:
        return CanonicalAgentEvent(
            event_type=provider_event.get("event_type", "AGENT_TOOL_REQUESTED"),
            agent_id=provider_event.get("agent_id", ""),
            provider=self.provider,
            action=provider_event.get("action"),
            resource=provider_event.get("resource"),
            details=self._sanitize_metadata(provider_event.get("metadata", {})),
            provider_event_id=provider_event.get("event_id"),
        )


# ─────────────────────────────────────────────────────────────────
# Adapter Registry
# ─────────────────────────────────────────────────────────────────

ADAPTER_REGISTRY: Dict[str, type] = {
    "cursor": CursorAdapter,
    "claude_code": ClaudeCodeAdapter,
    "codex": CodexAdapter,
    "github_copilot": CopilotAdapter,
    "antigravity": AntigravityAdapter,
    "generic": GenericAgentAdapter,
}


def get_adapter(provider: str, config: Optional[Dict] = None) -> AgentAdapter:
    """
    Instantiate the correct adapter for a provider.
    Unknown providers get GenericAgentAdapter — never silently fail.
    """
    config = config or {}
    adapter_class = ADAPTER_REGISTRY.get(provider, GenericAgentAdapter)
    if adapter_class == GenericAgentAdapter:
        return GenericAgentAdapter(provider_name=provider)
    try:
        return adapter_class(**{k: v for k, v in config.items()
                                if k in adapter_class.__init__.__code__.co_varnames})
    except Exception as e:
        logger.error(f"Failed to instantiate adapter for {provider}: {e}")
        return GenericAgentAdapter(provider_name=provider)
