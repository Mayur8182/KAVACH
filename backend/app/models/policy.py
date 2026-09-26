import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.blueprint import SecurityBlueprint
    from app.models.scan import SecurityScan


class SecurityPolicy(Base, TimestampMixin):
    """
    A persistent security policy configuration for a project, environment, or operation.
    Policies govern Allow, Warn, Block, and Require Approval decisions.
    """
    __tablename__ = "security_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PROJECT",  # PROJECT, ENVIRONMENT, OPERATION, GLOBAL
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",  # ACTIVE, DISABLED, DRAFT
    )
    priority: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,  # Higher number = higher precedence
    )
    policy_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="SECURITY",  # SECURITY, DEPLOYMENT, ACCESS_CONTROL, DATA_PROTECTION
    )
    current_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    effective_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    versions: Mapped[List["SecurityPolicyVersion"]] = relationship(
        "SecurityPolicyVersion",
        back_populates="policy",
        cascade="all, delete-orphan",
        order_by="desc(SecurityPolicyVersion.version)",
    )


class SecurityPolicyVersion(Base):
    """
    An immutable version of a security policy.
    Every decision references the exact policy version ID used.
    """
    __tablename__ = "security_policy_versions"
    __table_args__ = (
        UniqueConstraint("policy_id", "version", name="uq_policy_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    policy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_policies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    change_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Relationships
    policy: Mapped["SecurityPolicy"] = relationship(
        "SecurityPolicy",
        back_populates="versions",
    )


class SecurityDecision(Base):
    """
    An immutable security decision record evaluated against real evidence and active policies.
    History is never mutated; new evaluations create new decisions.
    """
    __tablename__ = "security_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="USER",  # USER, AI_AGENT, SYSTEM, SERVICE
    )
    actor_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    operation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # DEPLOY, MERGE, PUSH, EXECUTE_TOOL, ACCESS_SECRET, MODIFY_INFRASTRUCTURE, SCAN
    )
    operation_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    resource_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,  # APPLICATION, DATABASE, CONTAINER, INFRASTRUCTURE, SECRET
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="development",  # development, staging, production
    )
    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # ALLOW, WARN, BLOCK, REQUIRE_APPROVAL, NOT_EVALUATED
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    policy_version_ids: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    blueprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_blueprints.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    context_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    evidence: Mapped[List["DecisionEvidence"]] = relationship(
        "DecisionEvidence",
        back_populates="decision",
        cascade="all, delete-orphan",
    )
    approvals: Mapped[List["SecurityApproval"]] = relationship(
        "SecurityApproval",
        back_populates="decision",
        cascade="all, delete-orphan",
    )


class DecisionEvidence(Base):
    """
    Deterministic evidence item linking an observed attribute to a matched policy rule effect.
    """
    __tablename__ = "decision_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_decisions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    evidence_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # FINDING, REQUIREMENT, ENVIRONMENT, ACTOR, RESOURCE, POLICY_RULE
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # SECURITY_FINDING, REQUIREMENT_VERIFICATION, BLUEPRINT_REQUIREMENT, SCAN_TARGET, CONTEXT
    )
    source_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    attribute: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    observed_value: Mapped[Any] = mapped_column(
        JSON,
        nullable=False,
    )
    expected_condition: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    effect: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # BLOCK, WARN, REQUIRE_APPROVAL, ALLOW, MATCH
    )
    rule_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    policy_version_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    decision: Mapped["SecurityDecision"] = relationship(
        "SecurityDecision",
        back_populates="evidence",
    )


class SecurityApproval(Base):
    """
    Approval workflow record for decisions in REQUIRE_APPROVAL state.
    Enforces separation of duties (requester != approver), transitions, and expiration.
    """
    __tablename__ = "security_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    decision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_decisions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",  # PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED
        index=True,
    )
    requested_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    approval_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    decision: Mapped["SecurityDecision"] = relationship(
        "SecurityDecision",
        back_populates="approvals",
    )
