"""
Dependency CI/CD Checks Models
Stores pull request checks, pipeline runs, quality gates, and build scan telemetry for dependencies.
"""

from datetime import datetime
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Float,
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class DependencyPipelineRun(Base):
    __tablename__ = "dependency_pipeline_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), index=True, nullable=True)
    run_id = Column(String(64), nullable=False, index=True)  # e.g. "RUN-8421"
    workflow_name = Column(String(128), default="CI Security Gate")
    repository = Column(String(128), nullable=False, index=True)  # e.g. "web-api"
    branch = Column(String(128), default="main", index=True)
    commit_sha = Column(String(40), default="7f8a9b2")
    commit_message = Column(String(255), default="Update dependencies and fix security alerts")
    event_type = Column(String(64), default="PULL_REQUEST")  # PULL_REQUEST, PUSH, SCHEDULED, MANUAL
    pr_number = Column(Integer, nullable=True)  # e.g. 142
    pr_title = Column(String(255), nullable=True)
    triggered_by = Column(String(128), default="github-actions[bot]")
    status = Column(String(32), default="PASSED")  # PASSED, FAILED, BLOCKED, RUNNING, CANCELLED
    dependency_checks_total = Column(Integer, default=12)
    dependency_checks_passed = Column(Integer, default=12)
    critical_issues = Column(Integer, default=0)
    high_issues = Column(Integer, default=0)
    medium_issues = Column(Integer, default=0)
    low_issues = Column(Integer, default=0)
    quality_gate_status = Column(String(32), default="PASSED")  # PASSED, BLOCKED, WARNING, BYPASSED
    duration_seconds = Column(Integer, default=102)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    stages = relationship("DependencyPipelineStage", back_populates="pipeline_run", cascade="all, delete-orphan")


class DependencyPipelineStage(Base):
    __tablename__ = "dependency_pipeline_stages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pipeline_run_id = Column(String(36), ForeignKey("dependency_pipeline_runs.id"), nullable=False, index=True)
    stage_key = Column(String(32), nullable=False)  # source, build, scan, gates, deploy
    display_name = Column(String(64), nullable=False)  # Source, Build, Dependency Scan, Quality Gates, Deploy
    stage_order = Column(Integer, default=1)
    status = Column(String(32), default="SUCCESS")  # SUCCESS, FAILED, BLOCKED, RUNNING, SKIPPED
    duration_seconds = Column(Integer, default=15)
    details = Column(Text, default="Completed successfully without errors.")

    pipeline_run = relationship("DependencyPipelineRun", back_populates="stages")


class DependencyQualityGate(Base):
    __tablename__ = "dependency_quality_gates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), index=True, nullable=True)
    gate_name = Column(String(128), nullable=False)  # "Zero Critical CVEs Gate"
    gate_type = Column(String(64), default="VULNERABILITY")  # VULNERABILITY, LICENSE, PACKAGE_RULE, DRIFT
    condition_expression = Column(String(255), default="critical_cve_count == 0")
    enforcement_action = Column(String(64), default="BLOCK_MERGE")  # BLOCK_MERGE, BLOCK_BUILD, WARN_PR
    scope = Column(String(128), default="Production")  # Production, All Repositories, Staging
    active = Column(Boolean, default=True)
    evaluations_count = Column(Integer, default=0)
    failures_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
