"""
Step 28 — AI Coding Agent Governance Models

Every table enforces:
  - Tenant isolation via project_id / tenant reference
  - Immutable audit columns (created_at never updated)
  - Sensitive data redaction (no plaintext secrets)
  - Deterministic policy lineage via version columns
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import (
    Boolean, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.project import Project
    from app.models.user import User


# ─────────────────────────────────────────────────────────────────
# Agent Adapter Provider Registry
# ─────────────────────────────────────────────────────────────────

class AgentProviderAdapter(Base, TimestampMixin):
    """
    Registry of supported AI coding agent provider adapters.

    Status reflects REAL integration state — never CONNECTED unless
    a health-check actually succeeded.
    """
    __tablename__ = "agent_provider_adapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    adapter_version: Mapped[str] = mapped_column(String(50), nullable=False, default="0.1.0")
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # NOT_CONFIGURED | CONNECTING | CONNECTED | DEGRADED | AUTHENTICATION_FAILED |
    # AUTHORIZATION_FAILED | UNSUPPORTED | RATE_LIMITED | PROVIDER_ERROR |
    # TIMEOUT | DISCONNECTED | DISABLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="NOT_CONFIGURED")
    supported_capabilities: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    integration_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    configuration: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    last_health_check: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    health_check_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ─────────────────────────────────────────────────────────────────
# Agent Governance Identity Extension
# (extends existing Agent model with Step 28 fields)
# ─────────────────────────────────────────────────────────────────

class AgentGovernanceProfile(Base, TimestampMixin):
    """
    Extended governance profile for an agent.
    Agent identity ≠ Model identity.
    """
    __tablename__ = "agent_governance_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    # Provider: cursor | claude_code | codex | github_copilot | antigravity | generic
    agent_provider: Mapped[str] = mapped_column(String(100), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Model identity (separate from agent identity per §28.5)
    model_provider: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="development")
    owner_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # REGISTERED | ACTIVE | SUSPENDED | REVOKED | DELETED
    lifecycle_status: Mapped[str] = mapped_column(String(50), nullable=False, default="REGISTERED")
    policy_scope: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    capability_scope: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    # When REVOKED/SUSPENDED — reason + who + when
    revoked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_agp_agent_id", "agent_id"),
        Index("ix_agp_provider", "agent_provider"),
        Index("ix_agp_lifecycle", "lifecycle_status"),
    )


# ─────────────────────────────────────────────────────────────────
# Agent Capabilities
# ─────────────────────────────────────────────────────────────────

class AgentCapabilityRecord(Base, TimestampMixin):
    """
    Actual capabilities for a specific agent+provider, discovered from
    the real integration. Never hardcoded as 'provider X supports Y'.
    UNKNOWN is used when discovery fails.
    """
    __tablename__ = "agent_capability_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # Capability name: file_read | file_write | terminal | network | git |
    # mcp | browser | deployment | package_install | secret_access
    capability: Mapped[str] = mapped_column(String(100), nullable=False)
    # AVAILABLE | UNKNOWN | UNAVAILABLE | RESTRICTED | DISABLED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNKNOWN")
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    discovered_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    discovery_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    capability_metadata: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("agent_id", "capability", name="uq_agent_capability"),
    )


# ─────────────────────────────────────────────────────────────────
# Agent Sessions (§28.7)
# ─────────────────────────────────────────────────────────────────

class AgentGovernanceSession(Base, TimestampMixin):
    """
    Every agent interaction belongs to a governed session.
    The session anchors: Human + Agent + Project + Repository + Authority.
    Raw session credentials are NEVER stored — only hash.
    """
    __tablename__ = "agent_governance_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    repository_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="development")
    # Hash of session token — never store raw
    session_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    # STARTING | ACTIVE | IDLE | SUSPENDED | REVOKED | EXPIRED | COMPLETED | FAILED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="STARTING")
    # Client context — sanitized (no secrets)
    client_metadata: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Policy context versions — for reproducible audit
    policy_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blueprint_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    contract_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    risk_context: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    events: Mapped[List["AgentSecurityEvent"]] = relationship(
        "AgentSecurityEvent", back_populates="session", cascade="all, delete-orphan"
    )
    tool_invocations: Mapped[List["AgentToolInvocation"]] = relationship(
        "AgentToolInvocation", back_populates="session", cascade="all, delete-orphan"
    )
    command_executions: Mapped[List["AgentCommandExecution"]] = relationship(
        "AgentCommandExecution", back_populates="session", cascade="all, delete-orphan"
    )
    file_accesses: Mapped[List["AgentFileAccess"]] = relationship(
        "AgentFileAccess", back_populates="session", cascade="all, delete-orphan"
    )
    network_events: Mapped[List["AgentNetworkEvent"]] = relationship(
        "AgentNetworkEvent", back_populates="session", cascade="all, delete-orphan"
    )
    code_changes: Mapped[List["AgentCodeChange"]] = relationship(
        "AgentCodeChange", back_populates="session", cascade="all, delete-orphan"
    )
    git_operations: Mapped[List["AgentGitOperation"]] = relationship(
        "AgentGitOperation", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ags_agent_id", "agent_id"),
        Index("ix_ags_project_id", "project_id"),
        Index("ix_ags_status", "status"),
        Index("ix_ags_started_at", "started_at"),
    )


# ─────────────────────────────────────────────────────────────────
# Canonical Agent Security Events (§28.29)
# ─────────────────────────────────────────────────────────────────

class AgentSecurityEvent(Base, TimestampMixin):
    """
    Canonical agent security event.
    Every event is real — fabricated events are NEVER written.
    Immutable after creation (audit requirement).
    """
    __tablename__ = "agent_security_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # AGENT_REGISTERED | AGENT_SESSION_STARTED | AGENT_SESSION_ENDED |
    # AGENT_TOOL_REQUESTED | AGENT_TOOL_ALLOWED | AGENT_TOOL_BLOCKED |
    # AGENT_COMMAND_REQUESTED | AGENT_COMMAND_BLOCKED | AGENT_FILE_READ |
    # AGENT_FILE_WRITE | AGENT_NETWORK_REQUEST | AGENT_MCP_REQUEST |
    # AGENT_GIT_OPERATION | AGENT_CODE_CHANGE | AGENT_POLICY_DECISION |
    # AGENT_APPROVAL_REQUESTED | AGENT_APPROVED | AGENT_DENIED |
    # AGENT_REVOKED | AGENT_ANOMALY | AGENT_KILL_SWITCH |
    # AGENT_SECRET_ACCESS_ATTEMPT | AGENT_PROMPT_INJECTION_DETECTED
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    repository_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # What action / tool / resource was involved
    action: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resource: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    details: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    # Provider-supplied deduplication key
    provider_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    session: Mapped[Optional["AgentGovernanceSession"]] = relationship(
        "AgentGovernanceSession", back_populates="events"
    )

    __table_args__ = (
        # Idempotency: same provider event never written twice (§28.52)
        UniqueConstraint("provider", "provider_event_id", "project_id", name="uq_agent_event_provider_idempotency"),
        Index("ix_ase_event_type", "event_type"),
        Index("ix_ase_agent_id", "agent_id"),
        Index("ix_ase_occurred_at", "occurred_at"),
        Index("ix_ase_risk_level", "risk_level"),
    )


# ─────────────────────────────────────────────────────────────────
# Tool Invocations (§28.12)
# ─────────────────────────────────────────────────────────────────

class AgentToolInvocation(Base, TimestampMixin):
    """
    Every tool invocation from an AI agent is recorded.
    Sensitive arguments are REDACTED — never stored as plaintext.
    """
    __tablename__ = "agent_tool_invocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    tool_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # filesystem | terminal | network | git | mcp | package | iam | cloud | database
    tool_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    # SHA-256 of arguments — arguments themselves may be sensitive
    arguments_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # Safe argument metadata only — NO secrets, passwords, tokens
    argument_metadata: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    result_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    executed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    policy_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="tool_invocations"
    )

    __table_args__ = (
        Index("ix_ati_session_id", "session_id"),
        Index("ix_ati_tool_name", "tool_name"),
        Index("ix_ati_risk_level", "risk_level"),
        Index("ix_ati_policy_decision", "policy_decision"),
    )


# ─────────────────────────────────────────────────────────────────
# Command Executions (§28.13)
# ─────────────────────────────────────────────────────────────────

class AgentCommandExecution(Base, TimestampMixin):
    """
    AI agent terminal command executions.
    Commands are parsed deterministically — not evaluated by LLM.
    Dangerous commands are blocked at the policy layer.
    """
    __tablename__ = "agent_command_executions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # Raw command string (may be truncated for privacy)
    raw_command: Mapped[str] = mapped_column(Text, nullable=False)
    # Structured parse result
    executable: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    arguments: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    working_directory: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    environment_keys: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    block_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    matched_policy_rule: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    executed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="command_executions"
    )

    __table_args__ = (
        Index("ix_ace_session_id", "session_id"),
        Index("ix_ace_executable", "executable"),
        Index("ix_ace_risk_level", "risk_level"),
        Index("ix_ace_policy_decision", "policy_decision"),
    )


# ─────────────────────────────────────────────────────────────────
# File Access (§28.14 / §28.15)
# ─────────────────────────────────────────────────────────────────

class AgentFileAccess(Base, TimestampMixin):
    """
    Agent file read/write access records.
    Sensitive path detection happens here — .env, SSH keys, credentials.
    Path traversal attempts are flagged.
    """
    __tablename__ = "agent_file_accesses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # READ | WRITE | DELETE | LIST
    operation: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    is_sensitive_path: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sensitivity_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    # ALLOW | WARN | REDACT | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    block_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_path_traversal_attempt: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    accessed_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="file_accesses"
    )

    __table_args__ = (
        Index("ix_afa_session_id", "session_id"),
        Index("ix_afa_sensitive", "is_sensitive_path"),
        Index("ix_afa_policy_decision", "policy_decision"),
        Index("ix_afa_accessed_at", "accessed_at"),
    )


# ─────────────────────────────────────────────────────────────────
# Network Events (§28.16)
# ─────────────────────────────────────────────────────────────────

class AgentNetworkEvent(Base, TimestampMixin):
    """
    Network egress events from AI agent sessions.
    Correlatable with Step 24 Threat Intelligence and Step 25 DNS Security.
    """
    __tablename__ = "agent_network_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    destination_host: Mapped[str] = mapped_column(String(2000), nullable=False)
    destination_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    protocol: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # npm | pypi | github | aws | azure | gcp | unknown | mcp
    destination_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    # ALLOW | WARN | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    threat_intel_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    threat_intel_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dns_security_decision: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="network_events"
    )

    __table_args__ = (
        Index("ix_ane_session_id", "session_id"),
        Index("ix_ane_destination_host", "destination_host"),
        Index("ix_ane_threat_intel_match", "threat_intel_match"),
        Index("ix_ane_occurred_at", "occurred_at"),
    )


# ─────────────────────────────────────────────────────────────────
# Code Changes (§28.21)
# ─────────────────────────────────────────────────────────────────

class AgentCodeChange(Base, TimestampMixin):
    """
    Code changes proposed or applied by an AI coding agent.
    Never automatically trusted — must pass through security pipeline.
    A change is VERIFIED only when real scanner + policy confirms it.
    """
    __tablename__ = "agent_code_changes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    change_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Hash of the diff — not the content (content can be large / sensitive)
    diff_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    lines_added: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    lines_removed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # PROPOSED | SCANNING | SCAN_FAILED | POLICY_BLOCKED | APPROVED | APPLIED | VERIFIED | REVERTED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PROPOSED")
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    findings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    contract_impact: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    blueprint_impact: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    proposed_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    applied_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    policy_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="code_changes"
    )

    __table_args__ = (
        Index("ix_acc_session_id", "session_id"),
        Index("ix_acc_status", "status"),
        Index("ix_acc_policy_decision", "policy_decision"),
    )


# ─────────────────────────────────────────────────────────────────
# Git Operations (§28.23)
# ─────────────────────────────────────────────────────────────────

class AgentGitOperation(Base, TimestampMixin):
    """
    Agent Git operations — observable and policy-governed.
    High-risk operations (push, force-push, merge) require policy evaluation.
    """
    __tablename__ = "agent_git_operations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # status | diff | checkout | branch | commit | push | merge | rebase | tag | force_push
    operation: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    repository: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    block_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)

    session: Mapped["AgentGovernanceSession"] = relationship(
        "AgentGovernanceSession", back_populates="git_operations"
    )

    __table_args__ = (
        Index("ix_ago_session_id", "session_id"),
        Index("ix_ago_operation", "operation"),
        Index("ix_ago_risk_level", "risk_level"),
    )


# ─────────────────────────────────────────────────────────────────
# Policy Decisions (§28.11)
# ─────────────────────────────────────────────────────────────────

class AgentPolicyDecision(Base, TimestampMixin):
    """
    Records every policy evaluation for a specific agent action.
    Deterministic policy engine makes the decision — not LLM.
    """
    __tablename__ = "agent_policy_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    # What was evaluated
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="LOW")
    matched_rules: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    required_permissions: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    required_approvals: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    contract_impact: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    evidence_requirements: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    policy_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    blueprint_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    contract_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    # Simulation mode — never executed (§28.40)
    is_simulation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_apd_agent_id", "agent_id"),
        Index("ix_apd_decision", "decision"),
        Index("ix_apd_evaluated_at", "evaluated_at"),
    )


# ─────────────────────────────────────────────────────────────────
# Approvals (§28.39)
# ─────────────────────────────────────────────────────────────────

class AgentActionApproval(Base, TimestampMixin):
    """
    Approval requests for high-risk agent actions.
    Approvals are: User-bound + Scope-bound + Action-bound + Time-bound.
    No reusable unlimited approval.
    """
    __tablename__ = "agent_action_approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    requested_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="HIGH")
    context: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    # PENDING | APPROVED | DENIED | EXPIRED | REVOKED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True)
    reviewed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    # Single-use — approval cannot be reused
    used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_aaa_agent_id", "agent_id"),
        Index("ix_aaa_status", "status"),
        Index("ix_aaa_project_id", "project_id"),
    )


# ─────────────────────────────────────────────────────────────────
# Agent Delegation (§28.18)
# ─────────────────────────────────────────────────────────────────

class AgentGovernanceDelegation(Base, TimestampMixin):
    """
    Agent-to-agent delegation record.
    Delegated authority ⊆ Delegator authority (never exceeds).
    Delegation is revocable. Max depth enforced.
    """
    __tablename__ = "agent_governance_delegations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delegator_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    delegate_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    original_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    scope: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    resources: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    actions: Mapped[Optional[List]] = mapped_column(JSON, nullable=True)
    conditions: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    max_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    current_depth: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    further_delegation_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # ACTIVE | EXPIRED | REVOKED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE", index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    __table_args__ = (
        Index("ix_agd_delegator", "delegator_agent_id"),
        Index("ix_agd_delegate", "delegate_agent_id"),
        Index("ix_agd_status", "status"),
    )


# ─────────────────────────────────────────────────────────────────
# Agent Anomalies (§28.26)
# ─────────────────────────────────────────────────────────────────

class AgentBehaviorAnomaly(Base, TimestampMixin):
    """
    Anomalies detected against behavioral baselines.
    Anomaly ≠ Attack. Anomaly triggers VERIFY/INVESTIGATE, not automatic incident.
    """
    __tablename__ = "agent_behavior_anomalies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    # UNUSUAL_FILE_ACCESS | UNUSUAL_TOOL | UNUSUAL_NETWORK | UNUSUAL_COMMAND |
    # UNUSUAL_ENVIRONMENT | UNUSUAL_FREQUENCY | SECRET_ACCESS | PRODUCTION_ACCESS |
    # POLICY_BYPASS_ATTEMPT | PROMPT_INJECTION_DETECTED
    anomaly_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    # OPEN | INVESTIGATING | RESOLVED | FALSE_POSITIVE
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="OPEN", index=True)
    baseline_deviation_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    # ID of incident if escalated
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_aba_agent_id", "agent_id"),
        Index("ix_aba_severity", "severity"),
        Index("ix_aba_anomaly_type", "anomaly_type"),
    )


# ─────────────────────────────────────────────────────────────────
# Revocations / Kill Switch (§28.27 / §28.28)
# ─────────────────────────────────────────────────────────────────

class AgentRevocationRecord(Base, TimestampMixin):
    """
    Records agent or session revocations including emergency kill switches.
    All revocations are: Authenticated + Authorized + Audited.
    """
    __tablename__ = "agent_revocation_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # AGENT | SESSION | DELEGATION | TOOL | NETWORK | REPOSITORY
    revocation_target: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    revoked_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    # MANUAL | POLICY | ANOMALY | KILL_SWITCH | EMERGENCY
    trigger: Mapped[str] = mapped_column(String(50), nullable=False, default="MANUAL")
    evidence: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revoked_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_arr_agent_id", "agent_id"),
        Index("ix_arr_trigger", "trigger"),
        Index("ix_arr_revoked_at", "revoked_at"),
    )


# ─────────────────────────────────────────────────────────────────
# Agent Security Contracts (§28.25)
# ─────────────────────────────────────────────────────────────────

class AgentSecurityContractBinding(Base, TimestampMixin):
    """
    Binds an agent-specific security contract to an agent identity.
    Contracts are machine-readable and versioned.
    """
    __tablename__ = "agent_security_contract_bindings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    contract_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contract_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Machine-readable constraint definition
    constraint: Mapped[Dict] = mapped_column(JSON, nullable=False)
    # ACTIVE | VIOLATED | SUSPENDED | REVOKED
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    last_violation_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    violation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("agent_id", "contract_name", name="uq_agent_contract"),
        Index("ix_ascb_agent_id", "agent_id"),
        Index("ix_ascb_status", "status"),
    )


# ─────────────────────────────────────────────────────────────────
# MCP Events (§28.17)
# ─────────────────────────────────────────────────────────────────

class AgentMCPEvent(Base, TimestampMixin):
    """
    MCP tool invocations from AI agents.
    Every MCP call preserves: original_actor + delegating_agent + acting_agent
    + session + delegation_id + tool + resource + policy_decision + evidence.
    No credential sharing. No identity impersonation.
    """
    __tablename__ = "agent_mcp_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    original_actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    delegating_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True,
    )
    delegation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    mcp_server: Mapped[str] = mapped_column(String(255), nullable=False)
    tool_name: Mapped[str] = mapped_column(String(255), nullable=False)
    resource: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    # Hash of args — never raw args (may contain secrets)
    arguments_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # LOW | MEDIUM | HIGH | CRITICAL
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    # ALLOW | WARN | REQUIRE_APPROVAL | BLOCK
    policy_decision: Mapped[str] = mapped_column(String(50), nullable=False, default="ALLOW")
    execution_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    result_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_ame_agent_id", "agent_id"),
        Index("ix_ame_session_id", "session_id"),
        Index("ix_ame_tool_name", "tool_name"),
        Index("ix_ame_occurred_at", "occurred_at"),
    )
