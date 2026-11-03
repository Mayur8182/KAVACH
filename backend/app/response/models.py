"""
SQLAlchemy models for Step 14 Runtime Security Agent and Controlled Enforcement.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SecurityResponsePlan(Base, TimestampMixin):
    """
    Defines declared response strategies and triggers for a project.
    """
    __tablename__ = "security_response_plans"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DRAFT",
        comment="DRAFT | VALID | ACTIVE | RETIRED",
    )
    active_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    versions: Mapped[List["SecurityResponsePlanVersion"]] = relationship(
        "SecurityResponsePlanVersion",
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class SecurityResponsePlanVersion(Base):
    """
    Immutable versioned snapshot of a Security Response Plan definition.
    """
    __tablename__ = "security_response_plan_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_response_plans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        comment="Structured YAML/JSON response plan definition",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DRAFT",
        comment="DRAFT | VALID | ACTIVE | RETIRED",
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    plan: Mapped["SecurityResponsePlan"] = relationship(
        "SecurityResponsePlan",
        back_populates="versions",
    )


class SecurityResponseDecision(Base):
    """
    Authoritative, immutable policy decision governing what response action is allowed or required.
    """
    __tablename__ = "security_response_decisions"

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
    verification_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_verifications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    violation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_violations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    policy_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_policy_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    decision: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="NO_ACTION | ALERT | REQUIRE_APPROVAL | BLOCK | DENY | ISOLATE | REVOKE | PAUSE",
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SecurityResponseAction(Base):
    """
    Concrete lifecycle record of an authorized security response action.
    """
    __tablename__ = "security_response_actions"

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
    violation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_violations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    verification_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_verifications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contract_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="ResponseActionType enum",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="REQUESTED",
        index=True,
        comment="ResponseStatus enum",
    )
    mode: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="OBSERVE",
        comment="ResponseMode enum",
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="HIGH",
        comment="ResponseSeverity enum",
    )
    target_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="ResponseTargetType enum",
    )
    target_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    requested_by_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="USER",
        comment="USER | AGENT | POLICY",
    )
    requested_by_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    policy_decision_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_response_decisions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    approval_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    authorization_context: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    request: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    result: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    # Relationships
    execution_attempts: Mapped[List["ResponseExecutionAttempt"]] = relationship(
        "ResponseExecutionAttempt",
        back_populates="response_action",
        cascade="all, delete-orphan",
    )


class ResponseExecutionAttempt(Base):
    """
    Forensic record of each physical attempt to execute a response action.
    """
    __tablename__ = "response_execution_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    response_action_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_response_actions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    executor_type: Mapped[str] = mapped_column(String(100), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="STARTED",
        comment="ExecutionAttemptStatus enum",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    request: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    result: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default=dict,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_state_before: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    target_state_after: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    response_action: Mapped["SecurityResponseAction"] = relationship(
        "SecurityResponseAction",
        back_populates="execution_attempts",
    )


class RuntimeEnforcementRule(Base):
    """
    Active, short-lived enforcement rule enforced in real-time by Platform Gateways (MCP, API, etc.).
    """
    __tablename__ = "runtime_enforcement_rules"

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
    rule_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, default="BLOCK")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source_violation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_violations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
        index=True,
        comment="ACTIVE | EXPIRED | REVOKED",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# Re-export Step 21 enhanced models for backward compatibility
from app.models.incident_models import SecurityIncident, SecurityIncidentEvent

Incident = SecurityIncident
ResponseAction = SecurityResponseAction
