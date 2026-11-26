import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String,
    Integer,
    Float,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CodeAuditRun(Base, TimestampMixin):
    """
    Represents an execution of the Code Audit Engine for a repository.
    Completely isolated from security scan workflows.
    """
    __tablename__ = "code_audit_runs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    branch: Mapped[str] = mapped_column(String(255), default="main", nullable=False)
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    scope: Mapped[str] = mapped_column(
        String(50), default="FULL", nullable=False
    )  # FULL, QUALITY, ARCHITECTURE, PERFORMANCE, TESTING, MAINTAINABILITY, RELIABILITY, DOCUMENTATION
    status: Mapped[str] = mapped_column(
        String(30), default="QUEUED", nullable=False, index=True
    )  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    overall_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    health_grade: Mapped[str] = mapped_column(String(5), default="A+", nullable=False)
    total_findings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    critical_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    high_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    medium_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    info_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_debt_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[str] = mapped_column(
        String(50), default="MANUAL", nullable=False
    )  # MANUAL, GITHUB_APP, PR, SCHEDULED
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    findings: Mapped[List["CodeAuditFinding"]] = relationship(
        "CodeAuditFinding",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="CodeAuditFinding.severity",
    )
    scorecard: Mapped[Optional["CodeAuditScoreCard"]] = relationship(
        "CodeAuditScoreCard",
        back_populates="run",
        uselist=False,
        cascade="all, delete-orphan",
    )
    technical_debt: Mapped[Optional["CodeAuditTechnicalDebtReport"]] = relationship(
        "CodeAuditTechnicalDebtReport",
        back_populates="run",
        uselist=False,
        cascade="all, delete-orphan",
    )
    autofixes: Mapped[List["CodeAuditAutofixProposal"]] = relationship(
        "CodeAuditAutofixProposal",
        back_populates="run",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_code_audit_repo_status", "repository_id", "status"),
        Index("ix_code_audit_repo_created", "repository_id", "created_at"),
    )


class CodeAuditFinding(Base, TimestampMixin):
    """
    A single code audit finding (smell, architectural flaw, performance bottleneck, etc.).
    """
    __tablename__ = "code_audit_findings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # QUALITY, ARCHITECTURE, PERFORMANCE, TESTING, MAINTAINABILITY, RELIABILITY, DOCUMENTATION
    rule_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(20), default="MEDIUM", nullable=False, index=True
    )  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    priority: Mapped[str] = mapped_column(
        String(10), default="P2", nullable=False, index=True
    )  # P0, P1, P2, P3
    confidence: Mapped[str] = mapped_column(
        String(20), default="HIGH", nullable=False
    )  # CONFIRMED, HIGH, MEDIUM, POTENTIAL
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    code_evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    technical_impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_solution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_remediation_minutes: Mapped[int] = mapped_column(
        Integer, default=15, nullable=False
    )
    related_files: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    related_symbols: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    detection_method: Mapped[str] = mapped_column(
        String(50), default="AST_ANALYSIS", nullable=False
    )  # AST_ANALYSIS, DEPENDENCY_GRAPH, HEURISTIC, AI_INVESTIGATION
    status: Mapped[str] = mapped_column(
        String(30), default="OPEN", nullable=False, index=True
    )  # OPEN, IN_REVIEW, RESOLVED, ACCEPTED_RISK, FALSE_POSITIVE
    status_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    run: Mapped["CodeAuditRun"] = relationship("CodeAuditRun", back_populates="findings")
    autofixes: Mapped[List["CodeAuditAutofixProposal"]] = relationship(
        "CodeAuditAutofixProposal",
        back_populates="finding",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_code_audit_find_cat_sev", "category", "severity"),
        Index("ix_code_audit_find_run_cat", "run_id", "category"),
    )


class CodeAuditScoreCard(Base, TimestampMixin):
    """
    Stores calculated scorecard metrics and breakdown for an audit run.
    """
    __tablename__ = "code_audit_scorecards"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    quality_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    architecture_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    performance_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    testing_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    maintainability_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    reliability_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    documentation_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    health_grade: Mapped[str] = mapped_column(String(5), default="A+", nullable=False)
    formula_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationship
    run: Mapped["CodeAuditRun"] = relationship("CodeAuditRun", back_populates="scorecard")


class CodeAuditTechnicalDebtReport(Base, TimestampMixin):
    """
    Stores technical debt estimation, maintenance hotspots, and distribution.
    """
    __tablename__ = "code_audit_technical_debt"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    total_debt_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    high_priority_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    debt_by_module: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict, nullable=False)
    debt_by_category: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict, nullable=False)
    top_complex_files: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    maintenance_hotspots: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # Relationship
    run: Mapped["CodeAuditRun"] = relationship("CodeAuditRun", back_populates="technical_debt")


class CodeAuditAutofixProposal(Base, TimestampMixin):
    """
    Stores verified/proposable code patches for code audit findings.
    """
    __tablename__ = "code_audit_autofixes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    finding_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_audit_findings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    diff_patch: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    validation_command: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    validation_status: Mapped[str] = mapped_column(
        String(30), default="PENDING", nullable=False
    )  # PENDING, PASSED, FAILED
    pull_request_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    finding: Mapped["CodeAuditFinding"] = relationship("CodeAuditFinding", back_populates="autofixes")
    run: Mapped["CodeAuditRun"] = relationship("CodeAuditRun", back_populates="autofixes")

