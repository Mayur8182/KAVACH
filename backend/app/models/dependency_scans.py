import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DependencyScanJob(Base, TimestampMixin):
    """
    Concrete execution record of a dependency (SCA) scan job.
    Tracks vulnerabilities, licenses, policies, duration, logs, and scanner engine outputs.
    """
    __tablename__ = "dependency_scan_jobs"
    __table_args__ = (
        Index("ix_dep_scans_repo_status", "repository_name", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    branch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="main",
        index=True,
    )
    scan_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="FULL_SCA",  # VULNERABILITY, LICENSE, POLICY, SBOM, FULL_SCA
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="COMPLETED",  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
        index=True,
    )
    triggered_by: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="SecuLayer Autonomous Scanner",
    )
    engine: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Trivy SCA + OSV Engine v0.58.0",
    )
    vulnerabilities_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    critical_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    high_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    medium_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    license_issues_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    policy_violations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    packages_scanned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    
    command: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    stdout_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logs: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    findings_summary: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyScanSchedule(Base, TimestampMixin):
    """
    Automated recurring schedule for dependency scans (Nightly, Weekly, etc.).
    """
    __tablename__ = "dependency_scan_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    branch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="main",
    )
    schedule_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    frequency: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="DAILY",  # DAILY, WEEKLY, EVERY_6_HOURS, ON_PUSH_PR, CUSTOM_CRON
    )
    cron_expression: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="0 2 * * *",
    )
    scan_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="FULL_SCA",
    )
    engine: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Trivy SCA + OSV Engine",
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_on_failure: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_status: Mapped[str] = mapped_column(String(32), default="SUCCESS", nullable=False)
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
