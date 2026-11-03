"""
CI/CD Pipeline Data Models.

CICDPipeline      — Registered CI/CD pipeline definitions
CICDPipelineRun   — Execution records of pipeline runs with status, stages, security metrics, and evidence
CICDEnvironment   — Deployment environments (Production, Staging, Development, Preview)
CICDIntegration   — Connected/disconnected CI/CD provider integrations
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index,
    Integer, JSON, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CICDPipeline(Base, TimestampMixin):
    """
    Registered CI/CD pipeline definition for a repository.
    """
    __tablename__ = "cicd_pipelines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    workflow_file: Mapped[str] = mapped_column(String(255), nullable=False, default=".github/workflows/ci.yml")
    default_branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    workflow_yaml: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pipeline_steps: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    pipeline_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    runs: Mapped[List["CICDPipelineRun"]] = relationship(
        "CICDPipelineRun", back_populates="pipeline", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_cicd_pipelines_repo_name", "repository_id", "name"),
    )


class CICDPipelineRun(Base, TimestampMixin):
    """
    Execution run of a pipeline.
    Tracks branch, trigger, status, duration, start/end timestamps,
    stage breakdown, security issues discovered, execution logs, and cryptographic evidence.
    """
    __tablename__ = "cicd_pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    pipeline_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cicd_pipelines.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    pipeline_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    branch: Mapped[str] = mapped_column(String(255), nullable=False, default="main", index=True)
    trigger: Mapped[str] = mapped_column(String(100), nullable=False, default="Push")  # Push, Pull Request, Schedule, Manual
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Success", index=True)  # Success, Failed, Running, Cancelled

    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    commit_sha: Mapped[str] = mapped_column(String(40), nullable=False, default="e4f7a12")
    commit_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    author: Mapped[str] = mapped_column(String(255), nullable=False, default="Mayur K.")

    # Security issues discovered during pipeline run
    security_issues_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical_issues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    high_issues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    medium_issues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_issues: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Detailed stage breakdown: [{"name": "Build", "status": "Success", "duration_seconds": 132}, ...]
    stages: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    # Output logs of the pipeline run
    logs: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    # Real audit and cryptographic evidence
    evidence: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Priority sorting order to preserve canonical page 1 presentation
    order_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    # Relationships
    pipeline: Mapped[Optional["CICDPipeline"]] = relationship("CICDPipeline", back_populates="runs")

    __table_args__ = (
        Index("ix_cicd_runs_repo_started", "repository_id", "started_at"),
        Index("ix_cicd_runs_status", "status"),
        Index("ix_cicd_runs_branch", "branch"),
    )


class CICDEnvironment(Base, TimestampMixin):
    """
    Target deployment environment posture.
    """
    __tablename__ = "cicd_environments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # Production, Staging, Development, Preview
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Healthy")  # Healthy, Degraded, Inactive
    icon_type: Mapped[str] = mapped_column(String(50), nullable=False, default="github")  # github, eye, box, layers, cube
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.2.3")
    branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    region: Mapped[str] = mapped_column(String(100), nullable=False, default="Mumbai (ap-south-1)")
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default="https://frontend.example.com")
    last_deployed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    uptime_str: Mapped[str] = mapped_column(String(100), nullable=False, default="15 days 6 hours")
    auto_deploy: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, default="a1b2c3d")
    
    # Live runtime metrics
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    cpu_usage_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=34)
    memory_usage_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=56)
    pods_ready: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    pods_total: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    # History, variables and secrets
    deployments_history: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    variables: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    secrets: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    order_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    __table_args__ = (
        Index("ix_cicd_env_repo_name", "repository_id", "name"),
    )


class CICDIntegration(Base, TimestampMixin):
    """
    CI/CD provider integration state.
    """
    __tablename__ = "cicd_integrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Connected")  # Connected, Failed, Not Connected
    icon_key: Mapped[str] = mapped_column(String(50), nullable=False)  # github, gitlab, jenkins, github-actions, sonarqube, snyk, docker, aws
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="CI/CD")  # Source Control, CI/CD, Security, Artifact Registry
    subtext: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # e.g. github.com/nj-group
    connection_endpoint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # e.g. nj-group/frontend-app
    account: Mapped[str] = mapped_column(String(100), nullable=False, default="nj-group")
    repository_name: Mapped[str] = mapped_column(String(100), nullable=False, default="frontend-app")
    branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    webhook_status: Mapped[str] = mapped_column(String(50), nullable=False, default="Active")
    events: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    webhook_events: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="Mayur K.")
    permissions: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    logs: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    order_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)


class CICDTemplate(Base, TimestampMixin):
    """
    CI/CD Pipeline Template definitions.
    """
    __tablename__ = "cicd_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Web Application")  # Web Application, Container, Cloud, Security
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="CI/CD Pipeline")  # CI/CD Pipeline, Deployment, Build
    framework: Mapped[str] = mapped_column(String(100), nullable=False, default="Next.js")  # Next.js, React, Node.js, Docker, Kubernetes, AWS, Azure, Static, Python
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_popular: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tags: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    maintained_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SecuLayer")
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating: Mapped[float] = mapped_column(String(10), nullable=False, default="4.8")
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=128)
    workflow_yaml: Mapped[str] = mapped_column(Text, nullable=False)
    included_steps: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    variables: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    icon_key: Mapped[str] = mapped_column(String(50), nullable=False, default="nextjs")
    order_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    __table_args__ = (
        Index("ix_cicd_templates_slug", "slug"),
        Index("ix_cicd_templates_cat", "category"),
    )


class CICDJob(Base, TimestampMixin):
    """
    CI/CD Individual Pipeline Job Execution Record.
    Tracks job name, pipeline, execution status, runner, duration, step, failure reasons, and logs.
    """
    __tablename__ = "cicd_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    pipeline_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cicd_pipeline_runs.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    job_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    job_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pipeline_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Build & Deploy")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Success", index=True)  # Success, Failed, Running, Pending, Blocked
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    runner: Mapped[str] = mapped_column(String(100), nullable=False, default="ubuntu-latest")
    commit_sha: Mapped[str] = mapped_column(String(40), nullable=False, default="a1b2c3d")
    commit_message: Mapped[str] = mapped_column(String(255), nullable=False, default="Update UI and fix bugs")
    workflow_file: Mapped[str] = mapped_column(String(255), nullable=False, default="ci-cd.yml")
    step: Mapped[str] = mapped_column(String(255), nullable=False, default="Run SAST scan")
    environment: Mapped[str] = mapped_column(String(100), nullable=False, default="Production")
    run_id_str: Mapped[str] = mapped_column(String(50), nullable=False, default="#1024")
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logs: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    artifacts: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    security_findings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    high_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    order_priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    __table_args__ = (
        Index("ix_cicd_jobs_repo_status", "repository_id", "status"),
        Index("ix_cicd_jobs_started", "started_at"),
    )


