import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.project import Project


class AgentCredential(Base, TimestampMixin):
    """
    Cryptographically hashed API credential for AI agent authentication.
    The raw secret is only displayed once upon generation and never stored in plaintext.
    """
    __tablename__ = "agent_credentials"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    credential_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="API_KEY",
        comment="API_KEY | MTLS | OIDC | WORKLOAD_IDENTITY",
    )
    credential_prefix: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Public key prefix for O(1) identification, e.g. agk_7f8a",
    )
    secret_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="PBKDF2/Argon2/SHA256 salted hash of secret token",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Default Credential",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
        index=True,
        comment="ACTIVE | REVOKED | EXPIRED",
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revocation_reason: Mapped[Optional[str]] = mapped_column(
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
    agent: Mapped["Agent"] = relationship(
        "Agent",
        back_populates="credentials",
    )


class Role(Base, TimestampMixin):
    """
    Persistent role catalog grouping permission bundles for AI agents.
    """
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Relationships
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles",
    )
    agent_roles: Mapped[List["AgentRole"]] = relationship(
        "AgentRole",
        back_populates="role",
        cascade="all, delete-orphan",
    )


class Permission(Base, TimestampMixin):
    """
    Granular permission specifying allowable actions on resource types.
    """
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="PROJECT | BLUEPRINT | SCAN | FINDING | POLICY | GITHUB | MCP_TOOL",
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="READ | EXECUTE | EVALUATE | DISCOVER | MANAGE",
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="LOW",
        comment="LOW | MEDIUM | HIGH | CRITICAL",
    )

    # Relationships
    roles: Mapped[List["Role"]] = relationship(
        "Role",
        secondary="role_permissions",
        back_populates="permissions",
    )


class RolePermission(Base):
    """
    Association table binding Permissions to Roles.
    """
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class AgentRole(Base, TimestampMixin):
    """
    Role assignment to an Agent with optional project or environment scope.
    """
    __tablename__ = "agent_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Optional scoping restrictions: environments, branches, repositories",
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    agent: Mapped["Agent"] = relationship(
        "Agent",
        back_populates="agent_roles",
    )
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="agent_roles",
    )


class AgentPermissionOverride(Base, TimestampMixin):
    """
    Explicit DENY or ALLOW override for a specific Agent and Permission.
    Enforces deterministic precedence: Explicit DENY > Restrictive condition > Role.
    """
    __tablename__ = "agent_permission_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    effect: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DENY",
        comment="ALLOW | DENY",
    )
    scope: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    # Relationships
    agent: Mapped["Agent"] = relationship(
        "Agent",
        back_populates="permission_overrides",
    )
    permission: Mapped["Permission"] = relationship(
        "Permission",
    )


class AuthorizationDecision(Base):
    """
    Immutable authorization record evaluated prior to operation execution.
    Answers: 'Is this principal permitted to request this operation?'
    """
    __tablename__ = "authorization_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    principal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="AGENT",
        comment="AGENT | USER | SYSTEM | SERVICE",
    )
    principal_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="development",
    )
    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="ALLOW | DENY | REQUIRE_APPROVAL | NOT_AUTHENTICATED | NOT_AUTHORIZED | NOT_APPLICABLE",
    )
    reason_code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    permission_snapshot: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    scope_snapshot: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )
