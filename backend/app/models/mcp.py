import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.project import Project


class MCPSession(Base, TimestampMixin):
    """
    Represents an authenticated MCP connection session established by an AI agent or MCP client.
    Tracks authentication, activity timestamp, TTL expiration, and lifecycle.
    """
    __tablename__ = "mcp_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    authenticated_principal: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Identifier of authenticated user or service principal backing the agent",
    )
    credential_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agent_credentials.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    principal_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    transport: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="stdio",
        comment="Transport protocol: stdio, sse, stream",
    )
    client_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="unknown-mcp-client",
    )
    client_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="1.0.0",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
        index=True,
        comment="ACTIVE | EXPIRED | TERMINATED | REVOKED | FAILED",
    )
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    terminated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )

    # Relationships
    agent: Mapped["Agent"] = relationship("Agent", foreign_keys=[agent_id])
    project: Mapped["Project"] = relationship("Project", foreign_keys=[project_id])
    invocations: Mapped[List["MCPToolInvocation"]] = relationship(
        "MCPToolInvocation",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class MCPTool(Base, TimestampMixin):
    """
    Catalog of controlled tools registered on the MCP Gateway.
    Defines schemas, risk level, required capabilities, and approval prerequisites.
    """
    __tablename__ = "mcp_tools"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1.0.0",
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="SECURITY | PROJECT | SCAN | BLUEPRINT | POLICY | GITHUB",
    )
    input_schema: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    output_schema: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="LOW",
        comment="LOW | MEDIUM | HIGH | CRITICAL",
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )
    requires_approval: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    required_permission: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="PROJECT_READ",
        comment="Permission required to invoke this tool",
    )
    required_permissions: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    allowed_resource_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    minimum_trust_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="LOW",
    )
    approval_mode: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="STANDARD",
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )


class MCPToolInvocation(Base, TimestampMixin):
    """
    Immutable audit record for every tool invocation request processed by the MCP Gateway.
    Contains full authorization, policy decision, approval reference, execution status, and evidence.
    """
    __tablename__ = "mcp_tool_invocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mcp_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    tool_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    tool_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1.0.0",
    )
    request_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    operation: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    resource_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    authorization_decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        comment="AUTHORIZED | DENIED",
    )
    policy_decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NOT_EVALUATED",
        comment="ALLOW | WARN | BLOCK | REQUIRE_APPROVAL | NOT_EVALUATED",
    )
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
        comment="PENDING | RUNNING | COMPLETED | FAILED | DENIED | BLOCKED | REQUIRES_APPROVAL | TIMEOUT",
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    result_reference: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Identifier or summary reference to persisted execution result or scan",
    )
    input_summary: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Sanitized and redacted copy of inputs provided to the tool",
    )
    output_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="Sanitized copy of result returned to the client",
    )
    error_code: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )

    # Relationships
    session: Mapped["MCPSession"] = relationship("MCPSession", back_populates="invocations")


class MCPResource(Base, TimestampMixin):
    """
    Exposed read-only MCP resources protected by project authorization.
    """
    __tablename__ = "mcp_resources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    uri: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="application/json",
    )
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="PROJECT | BLUEPRINT | SCAN | GITHUB_REPO | GITHUB_PR",
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )
