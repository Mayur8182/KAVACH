import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
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
    __table_args__ = (
        Index("ix_security_scans_project_status", "project_id", "status"),
    )

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
    tasks: Mapped[List["ScanExecutionTask"]] = relationship(
        "ScanExecutionTask",
        back_populates="scan",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ScanExecutionTask.stage_order",
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
    __table_args__ = (
        Index("ix_security_findings_project_status", "project_id", "status"),
        Index("ix_security_findings_project_severity", "project_id", "severity"),
        Index("ix_security_findings_scan_severity", "scan_id", "severity"),
        Index("ix_security_findings_project_category", "project_id", "category"),
        Index("ix_security_findings_fingerprint_proj", "fingerprint", "project_id"),
        Index("idx_sec_findings_status_created_id", "status", "created_at", "id"),
        Index("idx_sec_findings_sev_status_created_id", "severity", "status", "created_at", "id"),
        Index("idx_sec_findings_repo_created_id", "repository", "created_at", "id"),
        Index("idx_sec_findings_proj_created_id", "project_id", "created_at", "id"),
        Index("idx_sec_findings_created_id", "created_at", "id"),
    )

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
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",
        index=True,
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    line_start: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    line_end: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    detected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    repository: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    branch: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    pull_request_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    author: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    cwe_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    owasp_category: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        index=True,
    )
    confidence: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="HIGH",
    )
    remediation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    first_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    resolved_by: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now(),
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


class ScanExecutionTask(Base, TimestampMixin):
    """
    Granular task within an execution pipeline (SAST, Secrets, SCA, IaC, Container, API, Policy, etc.).
    Maintains real-time status, execution progress, logs, and rationale.
    """
    __tablename__ = "scan_execution_tasks"
    __table_args__ = (
        Index("ix_scan_exec_tasks_exec_id", "execution_id"),
        Index("ix_scan_exec_tasks_scan_id", "scan_id"),
        Index("ix_scan_exec_tasks_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    execution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    repository: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    task_key: Mapped[str] = mapped_column(String(100), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    engine: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="GENERAL")
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",  # pending, queued, initializing, running, completed, failed, skipped, cancelled, retrying
    )
    selection_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_activity: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    progress_percentage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    files_inspected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    finding_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ruleset: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scanner_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    command: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stdout_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    task_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)

    scan: Mapped[Optional["SecurityScan"]] = relationship("SecurityScan", back_populates="tasks")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "execution_id": str(self.execution_id),
            "scan_id": str(self.scan_id) if self.scan_id else None,
            "project_id": str(self.project_id) if self.project_id else None,
            "repository": self.repository,
            "branch": self.branch,
            "task_key": self.task_key,
            "task_name": self.task_name,
            "engine": self.engine,
            "category": self.category,
            "stage_order": self.stage_order,
            "status": self.status,
            "selection_rationale": self.selection_rationale,
            "current_activity": self.current_activity,
            "progress_percentage": self.progress_percentage,
            "files_inspected": self.files_inspected,
            "finding_count": self.finding_count,
            "ruleset": self.ruleset,
            "scanner_version": self.scanner_version,
            "command": self.command,
            "exit_code": self.exit_code,
            "stdout_summary": self.stdout_summary,
            "stderr_output": self.stderr_output,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "metadata": self.task_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ExecutionEvent(Base):
    """
    Immutable chronological event emitted during pipeline lifecycle.
    Supports real-time streaming, websocket broadcasts, audit, and recovery.
    """
    __tablename__ = "execution_events"
    __table_args__ = (
        Index("ix_execution_events_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    execution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=False,
    )
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=True,
    )
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        index=True,
        nullable=True,
    )
    task_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    engine: Mapped[str] = mapped_column(String(100), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="TASK_PROGRESS",
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    progress_percentage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_activity: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "execution_id": str(self.execution_id),
            "scan_id": str(self.scan_id) if self.scan_id else None,
            "task_id": str(self.task_id) if self.task_id else None,
            "task_key": self.task_key,
            "engine": self.engine,
            "task_name": self.task_name,
            "event_type": self.event_type,
            "status": self.status,
            "progress_percentage": self.progress_percentage,
            "current_activity": self.current_activity,
            "description": self.description,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "metadata": self.event_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
