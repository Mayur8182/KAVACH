import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SecurityContract(Base, TimestampMixin):
    """
    Persistent Security Contract root entity declaring a security invariant that must remain true.
    Maintains versions, active version pointer, and project binding.
    """
    __tablename__ = "security_contracts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    contract_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Unique semantic key per project e.g. tenant-isolation",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DRAFT",
        comment="DRAFT | VALID | ACTIVE | RETIRED",
    )
    current_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Pointer to current ACTIVE version",
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    retired_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    metadata_: Mapped[Dict[str, Any]] = mapped_column(
        "metadata",
        JSON,
        nullable=False,
        default=dict,
    )

    # Relationships
    versions: Mapped[List["SecurityContractVersion"]] = relationship(
        "SecurityContractVersion",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="SecurityContractVersion.version.desc()",
    )

    __table_args__ = (
        UniqueConstraint("project_id", "contract_key", name="uq_project_contract_key"),
        Index("ix_security_contracts_project_status", "project_id", "status"),
    )


class SecurityContractVersion(Base, TimestampMixin):
    """
    Immutable version of a security contract definition.
    Once activated, definition, normalized_definition, and definition_hash are immutable.
    """
    __tablename__ = "security_contract_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        comment="Original submitted structured contract definition",
    )
    normalized_definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        comment="Deterministic canonical representation of definition",
    )
    definition_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="SHA-256 hash of normalized definition for tamper detection and evidence binding",
    )
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DRAFT",
        comment="DRAFT | VALID | ACTIVE | RETIRED",
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    retired_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    methodology_version: Mapped[str] = mapped_column(String(50), nullable=False, default="2026.1.0")

    # Relationships
    contract: Mapped["SecurityContract"] = relationship(
        "SecurityContract",
        back_populates="versions",
    )
    scopes: Mapped[List["SecurityContractScope"]] = relationship(
        "SecurityContractScope",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )
    dependencies: Mapped[List["SecurityContractDependency"]] = relationship(
        "SecurityContractDependency",
        foreign_keys="SecurityContractDependency.contract_version_id",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )
    evidence_requirements: Mapped[List["SecurityContractEvidenceRequirement"]] = relationship(
        "SecurityContractEvidenceRequirement",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )
    verifications: Mapped[List["SecurityContractVerification"]] = relationship(
        "SecurityContractVerification",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )
    violations: Mapped[List["SecurityContractViolation"]] = relationship(
        "SecurityContractViolation",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )
    overrides: Mapped[List["SecurityContractOverride"]] = relationship(
        "SecurityContractOverride",
        back_populates="contract_version",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("contract_id", "version", name="uq_contract_version"),
        Index("ix_contract_versions_status", "status"),
        Index("ix_contract_versions_hash", "definition_hash"),
    )


class SecurityContractScope(Base):
    """
    Declared architectural and resource scope for a contract version.
    """
    __tablename__ = "security_contract_scopes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scope_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="PROJECT | REPOSITORY | BRANCH | PULL_REQUEST | SERVICE | API | AGENT | ENVIRONMENT | RESOURCE | GLOBAL",
    )
    scope_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resource_scope: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        back_populates="scopes",
    )


class SecurityContractDependency(Base):
    """
    Explicit dependency between contract versions (REQUIRES, CONFLICTS_WITH, COMPOSES_WITH).
    Acyclic graph required.
    """
    __tablename__ = "security_contract_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    depends_on_contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dependency_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="REQUIRES",
        comment="REQUIRES | CONFLICTS_WITH | COMPOSES_WITH",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        foreign_keys=[contract_version_id],
        back_populates="dependencies",
    )
    depends_on_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        foreign_keys=[depends_on_contract_version_id],
    )


class SecurityContractEvidenceRequirement(Base):
    """
    Declarative evidence requirements specified by a contract version.
    """
    __tablename__ = "security_contract_evidence_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="AUTHORIZATION_DECISION | AGENT_ACTION | DATA_FLOW | AUDIT_EVENT | STATIC_ANALYSIS | MCP_TOOL_EXECUTION etc.",
    )
    source: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    minimum_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    configuration: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        back_populates="evidence_requirements",
    )


class SecurityContractVerification(Base):
    """
    Immutable historical evaluation record of a contract version against concrete evidence.
    """
    __tablename__ = "security_contract_verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="VERIFIED | VIOLATED | UNKNOWN | NOT_VERIFIED | NOT_APPLICABLE | FAILED",
    )
    evaluation_result: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Structured evaluation trace with invariant results",
    )
    evidence_summary: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="References to concrete evidence IDs evaluated",
    )
    verifier_type: Mapped[str] = mapped_column(String(100), nullable=False, default="CONTRACT_EVALUATOR")
    verifier_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    evaluation_started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    evaluation_completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        back_populates="verifications",
    )


class SecurityContractViolation(Base):
    """
    Concrete detected violation of an active security contract.
    """
    __tablename__ = "security_contract_violations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    verification_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_verifications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="HIGH",
        comment="LOW | MEDIUM | HIGH | CRITICAL",
    )
    violation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resource: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    evidence: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="OPEN",
        comment="OPEN | ACKNOWLEDGED | RESOLVED | FALSE_POSITIVE | SUPPRESSED | REOPENED",
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        back_populates="violations",
    )


class SecurityContractOverride(Base):
    """
    Time-bounded, authorized, audited exception to an active security contract.
    """
    __tablename__ = "security_contract_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    contract_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_contract_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False, default="USER")
    actor_id: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
        comment="ACTIVE | EXPIRED | REVOKED",
    )

    contract_version: Mapped["SecurityContractVersion"] = relationship(
        "SecurityContractVersion",
        back_populates="overrides",
    )
