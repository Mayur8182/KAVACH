import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.intent import Intent


class SecurityBlueprint(Base, TimestampMixin):
    """
    Versioned security blueprint generated dynamically from application intent.
    Defines the complete baseline of security requirements and properties for a project.
    """
    __tablename__ = "security_blueprints"

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
    intent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("intents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="GENERATED",  # DRAFT, GENERATING, GENERATED, FAILED, SUPERSEDED
        index=True,
    )
    methodology_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="2026.1.0",
    )
    generated_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="system",
    )
    # Contextual risk factors derived from intent characteristics (NOT fake scores)
    risk_factors: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="blueprints",
    )
    intent: Mapped["Intent"] = relationship(
        "Intent",
    )
    requirements: Mapped[List["SecurityRequirement"]] = relationship(
        "SecurityRequirement",
        back_populates="blueprint",
        cascade="all, delete-orphan",
        order_by="SecurityRequirement.category, SecurityRequirement.requirement_key",
        lazy="selectin",
    )


class SecurityRequirement(Base):
    """
    A concrete security property that must be satisfied for the application.
    Directly tied to intent evidence and defines verification strategies.
    """
    __tablename__ = "security_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    blueprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_blueprints.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    requirement_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    )
    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # REQUIRED, RECOMMENDED, OPTIONAL
    )
    mandatory: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    rationale: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    verification_strategy: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,  # STATIC_ANALYSIS, DYNAMIC_TEST, SECRET_SCAN, RUNTIME_EVIDENCE
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",  # ACTIVE, WAIVED, SATISFIED, VIOLATED, UNKNOWN
    )
    security_invariant: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    blueprint: Mapped["SecurityBlueprint"] = relationship(
        "SecurityBlueprint",
        back_populates="requirements",
    )
    evidence_items: Mapped[List["SecurityRequirementEvidence"]] = relationship(
        "SecurityRequirementEvidence",
        back_populates="requirement",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    dependencies: Mapped[List["SecurityRequirementDependency"]] = relationship(
        "SecurityRequirementDependency",
        back_populates="requirement",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SecurityRequirementEvidence(Base):
    """
    Evidence item explaining why a requirement was generated based on intent facts.
    """
    __tablename__ = "security_requirement_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_requirements.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # INTENT, ARCHITECTURE, TECHNOLOGY, DATA_DOMAIN, INTERFACE, WORKFLOW
    )
    source_field: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    evidence_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    requirement: Mapped["SecurityRequirement"] = relationship(
        "SecurityRequirement",
        back_populates="evidence_items",
    )


class SecurityRequirementDependency(Base):
    """
    Structured prerequisite dependency between security requirements.
    """
    __tablename__ = "security_requirement_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_requirements.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    depends_on_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    dependency_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PREREQUISITE",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    requirement: Mapped["SecurityRequirement"] = relationship(
        "SecurityRequirement",
        back_populates="dependencies",
    )
