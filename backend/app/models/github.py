import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.scan import SecurityScan
    from app.models.policy import SecurityDecision


class GitHubInstallation(Base, TimestampMixin):
    """
    Persisted record of an authorized GitHub App installation.
    Connects a GitHub account (User or Organization) with zero or more projects.
    """
    __tablename__ = "github_installations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    github_installation_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False,
        index=True,
    )
    github_account_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    github_account_login: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    account_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="User",  # User or Organization
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",  # ACTIVE, SUSPENDED, REMOVED, ERROR
    )
    permissions: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    repository_selection: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="all",  # all or selected
    )
    installed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship("Project")
    repositories: Mapped[List["GitHubRepository"]] = relationship(
        "GitHubRepository",
        back_populates="installation",
        cascade="all, delete-orphan",
    )


class GitHubRepository(Base, TimestampMixin):
    """
    Persisted GitHub repository connected to a project for continuous security governance.
    """
    __tablename__ = "github_repositories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    installation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_installations.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    github_repository_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False,
        index=True,
    )
    owner: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
    )
    default_branch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="main",
    )
    private: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    html_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    clone_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        default="",
    )
    ssh_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
    )
    visibility: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="private",  # public, private, internal
    )
    archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    permissions: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship("Project")
    installation: Mapped[Optional["GitHubInstallation"]] = relationship(
        "GitHubInstallation",
        back_populates="repositories",
    )
    pull_requests: Mapped[List["GitHubPullRequest"]] = relationship(
        "GitHubPullRequest",
        back_populates="repository",
        cascade="all, delete-orphan",
    )
    commits: Mapped[List["GitHubCommit"]] = relationship(
        "GitHubCommit",
        back_populates="repository",
        cascade="all, delete-orphan",
    )
    security_jobs: Mapped[List["GitHubSecurityJob"]] = relationship(
        "GitHubSecurityJob",
        back_populates="repository",
    )
    assignments: Mapped[List["RepositoryAssignment"]] = relationship(
        "RepositoryAssignment",
        back_populates="repository",
        cascade="all, delete-orphan",
    )


class RepositoryAssignment(Base, TimestampMixin):
    """
    Centralized assignment of security modules (SAST, SCA, IaC, Secrets, Container, DAST)
    to an authorized GitHub repository.
    """
    __tablename__ = "repository_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    module: Mapped[str] = mapped_column(
        String(50),  # SAST, SCA, IAC, SECRETS, CONTAINER, DAST
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),  # ENABLED, OPTIONAL, NOT_ASSIGNED, DISABLED
        nullable=False,
        default="ENABLED",
    )
    scan_on_push: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scan_on_pr: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    project_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    last_scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    repository: Mapped["GitHubRepository"] = relationship("GitHubRepository", back_populates="assignments")


class GitHubWebhookEvent(Base, TimestampMixin):
    """
    Immutable audit record of incoming GitHub webhook events with HMAC verification status.
    """
    __tablename__ = "github_webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    github_delivery_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    action: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    installation_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
    )
    repository_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    signature_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    processing_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="RECEIVED",  # RECEIVED, PROCESSING, PROCESSED, FAILED, IGNORED
    )
    payload_reference: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    security_jobs: Mapped[List["GitHubSecurityJob"]] = relationship(
        "GitHubSecurityJob",
        back_populates="webhook_event",
    )


class GitHubSecurityJob(Base, TimestampMixin):
    """
    Tracks execution lifecycle of a security pipeline triggered by GitHub workflow events.
    """
    __tablename__ = "github_security_jobs"

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
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    webhook_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_webhook_events.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,  # push, pull_request, manual_scan
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    branch: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    pull_request_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="QUEUED",  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    )
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_scans.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_decisions.id", ondelete="SET NULL"),
        nullable=True,
    )
    check_run_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
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
    
    # UI Rich Fields added for Security Jobs dashboard
    job_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    job_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    job_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    duration_str: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    triggered_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    findings_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    scan_summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    findings_by_category: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    recent_logs: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    # Real-time scan pipeline stage tracking
    current_stage: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_stage_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_stages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stage_progress: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    files_scanned: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rules_evaluated: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    project: Mapped[Optional["Project"]] = relationship("Project")
    repository: Mapped[Optional["GitHubRepository"]] = relationship(
        "GitHubRepository",
        back_populates="security_jobs",
    )
    webhook_event: Mapped[Optional["GitHubWebhookEvent"]] = relationship(
        "GitHubWebhookEvent",
        back_populates="security_jobs",
    )
    scan: Mapped[Optional["SecurityScan"]] = relationship("SecurityScan")
    decision: Mapped[Optional["SecurityDecision"]] = relationship("SecurityDecision")


class GitHubPullRequest(Base, TimestampMixin):
    """
    Persisted pull request state tracked for CI/CD checks and policy gating.
    """
    __tablename__ = "github_pull_requests"
    __table_args__ = (
        UniqueConstraint("repository_id", "number", name="uq_github_pr_repo_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    github_pr_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="open",  # open, closed, merged
    )
    head_sha: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    base_sha: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    head_ref: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    base_ref: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    author_login: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    draft: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    merged: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    html_url: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    # Relationships
    repository: Mapped["GitHubRepository"] = relationship(
        "GitHubRepository",
        back_populates="pull_requests",
    )


class GitHubCommit(Base, TimestampMixin):
    """
    Persisted commit record associated with security scans and check runs.
    """
    __tablename__ = "github_commits"
    __table_args__ = (
        UniqueConstraint("repository_id", "sha", name="uq_github_commit_repo_sha"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sha: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    branch: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    author_login: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    committed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    repository: Mapped["GitHubRepository"] = relationship(
        "GitHubRepository",
        back_populates="commits",
    )


class SecurityJobIntegration(Base, TimestampMixin):
    """
    Persisted integrations for Security Jobs and automation (GitHub, GitLab, Jenkins, Slack, Teams, Jira, etc.)
    Tracks connection status, trigger events, branch filters, sync times, and logs.
    """
    __tablename__ = "security_job_integrations"

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
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Connected")
    is_available: Mapped[bool] = mapped_column(Boolean, default=False)
    icon_key: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="Source Control")
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    repository_name: Mapped[str] = mapped_column(String(100), nullable=False, default="frontend-app")
    branch_filter: Mapped[str] = mapped_column(String(255), nullable=False, default="main, develop, feature/*")
    events: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    webhook_events: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    logs: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)


class SecurityJobSchedule(Base, TimestampMixin):
    """
    Persisted recurring security pipeline schedules.
    Automates periodic scanning (SAST, Dependency, Container, IaC, Secret, License, All Scans)
    with frequency, branch targeting, time of execution, and condition gating.
    """
    __tablename__ = "security_job_schedules"

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
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    scan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target: Mapped[str] = mapped_column(String(100), nullable=False, default="repository")
    branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Daily")
    time_utc: Mapped[str] = mapped_column(String(20), nullable=False, default="01:00 AM")
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Active")  # Active, Paused, Failed
    
    # Advanced Options
    run_only_on_changes: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_completion: Mapped[bool] = mapped_column(Boolean, default=True)
    fail_on_high_severity: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Audit & Execution history tracking
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    last_run_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class SecurityJobReport(Base, TimestampMixin):
    """
    Persisted security job reports for repository code security, compliance, and vulnerability audits.
    """
    __tablename__ = "security_job_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        nullable=True,
    )
    report_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    scan_type: Mapped[str] = mapped_column(String(50), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Completed")  # Completed, In Progress, Failed
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    # Severity findings count
    critical_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    high_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    medium_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    format: Mapped[str] = mapped_column(String(20), nullable=False, default="PDF")
    file_size_kb: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

