import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.project import Project
    from app.models.policy import SecurityApproval


class AgentDelegation(Base, TimestampMixin):
    """
    Persistent delegation record establishing authority granted from a Delegator Agent
    to a Delegate Agent, bounded by strict subset checks, resource/environment scoping,
    depth caps, and automatic expiration/revocation propagation.
    """
    __tablename__ = "delegations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    delegator_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Agent delegating authority",
    )
    delegate_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Agent receiving delegated authority",
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Project boundary of delegation",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
        comment="PENDING | ACTIVE | EXPIRED | REVOKED | REJECTED | CANCELLED",
    )
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    allow_further_delegation: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="If False, recipient cannot further delegate this authority",
    )
    authority_snapshot: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Immutable snapshot of delegated actions, permissions, and constraints",
    )
    scope: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Resource and environment scoping (project, env, repo, branch)",
    )
    conditions: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Deterministic condition DSL constraints",
    )
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Actor ID (human user or agent) requesting delegation",
    )
    created_by_type: Mapped[str] = mapped_column(
        String(50),
        default="USER",
        nullable=False,
        comment="USER | AGENT",
    )
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_by: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    revocation_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    parent_delegation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Parent delegation in chain (e.g. A->B->C)",
    )
    delegation_depth: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="Hop depth in delegation tree (1 for direct, 2 for A->B->C, etc.)",
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        nullable=False,
    )

    # Relationships
    delegator: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[delegator_agent_id],
        backref="outgoing_delegations",
    )
    delegate: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[delegate_agent_id],
        backref="incoming_delegations",
    )
    project: Mapped["Project"] = relationship(
        "Project",
    )
    edges: Mapped[List["AgentAuthorityEdge"]] = relationship(
        "AgentAuthorityEdge",
        back_populates="delegation",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_delegations_delegator_status", "delegator_agent_id", "status"),
        Index("ix_delegations_delegate_status", "delegate_agent_id", "status"),
        Index("ix_delegations_project_status", "project_id", "status"),
    )


class AgentAuthorityEdge(Base):
    """
    Directed edge in the Agent Authority Graph representing delegated capability.
    Enables efficient graph queries, depth traversal, and cycle detection.
    """
    __tablename__ = "agent_authority_edges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    delegation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    authority: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Delegated action and permission catalog",
    )
    scope: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        comment="Scoped constraints (environment, branch, resource)",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
        index=True,
        comment="ACTIVE | EXPIRED | REVOKED",
    )
    depth: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
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
    delegation: Mapped["AgentDelegation"] = relationship(
        "AgentDelegation",
        back_populates="edges",
    )
    source_agent: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[source_agent_id],
    )
    target_agent: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[target_agent_id],
    )

    __table_args__ = (
        Index("ix_authority_edges_source_target", "source_agent_id", "target_agent_id", "status"),
    )


class AgentDataFlow(Base, TimestampMixin):
    """
    Audit and control plane entity for data movement between agents.
    Enforces security classification boundaries and ensures confidential/secret
    data does not automatically flow without explicit authorization and policy.
    """
    __tablename__ = "agent_data_flows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    source_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    data_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="SECURITY_FINDINGS | REPOSITORY_SOURCE | SCAN_METADATA | AUDIT_LOGS | BLUEPRINT_SPEC | SECRET",
    )
    classification: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="INTERNAL",
        index=True,
        comment="PUBLIC | INTERNAL | CONFIDENTIAL | SENSITIVE | SECRET | RESTRICTED",
    )
    source_resource_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="SCAN | PROJECT | BLUEPRINT | REPOSITORY | FILE",
    )
    source_resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    purpose: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
        comment="PENDING | ALLOWED | DENIED | REQUIRE_APPROVAL | REVOKED",
    )
    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        comment="ALLOW | DENY | REQUIRE_APPROVAL | NOT_VERIFIED",
    )
    reason_code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="PENDING_EVALUATION",
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Awaiting policy and data-flow evaluation",
    )
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
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
    source_agent: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[source_agent_id],
    )
    destination_agent: Mapped["Agent"] = relationship(
        "Agent",
        foreign_keys=[destination_agent_id],
    )
    project: Mapped["Project"] = relationship(
        "Project",
    )
    approval: Mapped[Optional["SecurityApproval"]] = relationship(
        "SecurityApproval",
    )

    __table_args__ = (
        Index("ix_data_flows_agents", "source_agent_id", "destination_agent_id", "status"),
    )
