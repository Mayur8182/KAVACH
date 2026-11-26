"""
Enterprise MCP Gateway Security Models.

Persists state for:
- MCP Registry & Multi-Server Gateway Routing (`MCPUpstreamServer`)
- MCP Version & Rug-Pull Integrity Snapshots (`MCPToolSnapshot`)
- MCP Firewall & OPA/Rego Policy Rules (`MCPFirewallRule`)
- MCP Runtime Protection, Threat, DLP & Observability Events (`MCPRuntimeEvent`)
- MCP Encrypted Secrets Vault (`MCPSecretVaultEntry`)
- MCP Red-Team Attack Simulation Runs (`MCPSimulationRun`)
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MCPUpstreamServer(Base, TimestampMixin):
    """Registered MCP server in the Kavach Registry & Gateway Router."""

    __tablename__ = "mcp_upstream_servers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    server_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    transport: Mapped[str] = mapped_column(String(32), nullable=False, default="streamable-http")
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="custom")
    auth_mode: Mapped[str] = mapped_column(String(64), nullable=False, default="oauth2")
    vault_secret_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="REGISTERED", index=True)
    firewall_mode: Mapped[str] = mapped_column(String(32), nullable=False, default="ENFORCE")  # ENFORCE | MONITOR | BLOCKED
    trust_tier: Mapped[str] = mapped_column(String(32), nullable=False, default="SANDBOXED")  # VERIFIED | STANDARD | SANDBOXED | BLOCKED
    version: Mapped[str] = mapped_column(String(64), nullable=False, default="1.0.0")
    tools_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict, nullable=False)


class MCPToolSnapshot(Base, TimestampMixin):
    """Per-tool integrity & static security scan snapshot for version & rug-pull detection."""

    __tablename__ = "mcp_tool_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcp_upstream_servers.id", ondelete="CASCADE"), nullable=True, index=True
    )
    server_slug: Mapped[str] = mapped_column(String(120), nullable=False, default="kavach-builtin", index=True)
    tool_name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(64), nullable=False, default="1.0.0")
    description_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    input_schema_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_description_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    previous_schema_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    rug_pull_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False, default="LOW")
    security_status: Mapped[str] = mapped_column(String(32), nullable=False, default="VERIFIED")  # VERIFIED | FLAGGED | BLOCKED
    findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    last_scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class MCPFirewallRule(Base, TimestampMixin):
    """Deterministic MCP Firewall allowlist/denylist & OPA/Rego rule evaluated before tool execution."""

    __tablename__ = "mcp_firewall_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rule_type: Mapped[str] = mapped_column(String(64), nullable=False, default="FIREWALL")  # ALLOWLIST | DENYLIST | OPA_REGO | DLP_POLICY
    tool_pattern: Mapped[str] = mapped_column(String(200), nullable=False, default="*")
    client_pattern: Mapped[str] = mapped_column(String(200), nullable=False, default="*")
    action: Mapped[str] = mapped_column(String(32), nullable=False, default="DENY")  # ALLOW | DENY | REQUIRE_APPROVAL | MONITOR
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    rego_policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    match_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class MCPRuntimeEvent(Base):
    """Real-time observability, threat detection, DLP, and behavioral telemetry event."""

    __tablename__ = "mcp_runtime_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    client_name: Mapped[str] = mapped_column(String(200), nullable=False, default="unknown", index=True)
    server_slug: Mapped[str] = mapped_column(String(120), nullable=False, default="kavach-builtin", index=True)
    tool_name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    stage: Mapped[str] = mapped_column(String(32), nullable=False, default="FULL_PIPELINE")  # REQUEST | RESPONSE | FULL_PIPELINE
    decision: Mapped[str] = mapped_column(String(32), nullable=False, default="ALLOW", index=True)  # ALLOW | BLOCK | REQUIRE_APPROVAL | REDACTED
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="SUCCESS")

    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tokens_estimated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    threat_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    threat_findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    dlp_findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    behavioral_flags: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    policy_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )


class MCPSecretVaultEntry(Base, TimestampMixin):
    """Fernet-encrypted Secrets Vault entry bound to downstream MCP servers / integrations."""

    __tablename__ = "mcp_secrets_vault"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False, default="custom")
    scope: Mapped[str] = mapped_column(String(200), nullable=False, default="mcp:upstream")
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
    masked_preview: Mapped[str] = mapped_column(String(64), nullable=False)
    key_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    rotation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_rotated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)


class MCPSimulationRun(Base):
    """Persisted MCP Red-Team Attack Simulation run results."""

    __tablename__ = "mcp_simulation_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    total_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blocked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bypassed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="COMPLETED")
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    results: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

