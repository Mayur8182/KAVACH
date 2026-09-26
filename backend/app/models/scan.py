import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.blueprint import SecurityBlueprint, SecurityRequirement
    from app.models.intent import Intent


class SecurityScan(Base, TimestampMixin):
    """
    A concrete verification scan execution across project source code and artifacts.
    Coordinates multiple real security scanner CLI executions.
    """
    __tablename__ = "security_scans"

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
    blueprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_blueprints.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    intent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("intents.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    target_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="LOCAL_DIRECTORY",  # LOCAL_DIRECTORY, GIT_REPOSITORY, WORKSPACE, DOCKERFILE, CONTAINER_IMAGE
    )
    target_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    target_reference: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="QUEUED",  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
        index=True,
    )
    requested_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="system",
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    scanner_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    finding_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    blueprint: Mapped[Optional["SecurityBlueprint"]] = relationship("SecurityBlueprint")
    intent: Mapped[Optional["Intent"]] = relationship("Intent")

    executions: Mapped[List["ScannerExecution"]] = relationship(
        "ScannerExecution",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ScannerExecution.scanner_name",
    )
    findings: Mapped[List["SecurityFinding"]] = relationship(
        "SecurityFinding",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="SecurityFinding.severity, SecurityFinding.rule_id",
    )
    verifications: Mapped[List["RequirementVerificationResult"]] = relationship(
        "RequirementVerificationResult",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="RequirementVerificationResult.requirement_key",
    )


class ScannerExecution(Base):
    """
    Execution record for an individual scanner tool (e.g. Semgrep, Gitleaks, Trivy).
    Captures exact process command, exit codes, output, and duration.
    """
    __tablename__ = "scanner_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scanner_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    scanner_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # SAST, SECRETS, SCA, CONTAINER, IAC
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="QUEUED",  # QUEUED, RUNNING, COMPLETED, FAILED, NOT_CONFIGURED, NOT_AVAILABLE
        index=True,
    )
    scanner_version: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    command: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    exit_code: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    stdout_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    stderr_output: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    finding_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    scan: Mapped["SecurityScan"] = relationship("SecurityScan", back_populates="executions")
    findings: Mapped[List["SecurityFinding"]] = relationship(
        "SecurityFinding",
        back_populates="execution",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SecurityFinding(Base):
    """
    Normalized, deduplicated vulnerability or weakness finding emitted by a real scanner.
    """
    __tablename__ = "security_findings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scanner_execution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scanner_executions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scanner_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    rule_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
        index=True,
    )
    file_path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    line_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    column_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    snippet: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,  # Masked or sanitized code snippet
    )
    fingerprint: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    raw_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    scan: Mapped["SecurityScan"] = relationship("SecurityScan", back_populates="findings")
    execution: Mapped["ScannerExecution"] = relationship("ScannerExecution", back_populates="findings")


class RequirementVerificationResult(Base):
    """
    Verification evaluation state proving whether a Step 5 Security Requirement
    is SATISFIED, VIOLATED, or UNKNOWN based on real scanner evidence.
    """
    __tablename__ = "requirement_verification_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_requirements.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    requirement_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # SATISFIED, VIOLATED, UNKNOWN, NOT_EVALUATED
        index=True,
    )
    rationale: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    evidence_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    contributing_findings_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    scan: Mapped["SecurityScan"] = relationship("SecurityScan", back_populates="verifications")
    requirement: Mapped["SecurityRequirement"] = relationship("SecurityRequirement")
