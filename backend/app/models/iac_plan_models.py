"""
IaC Plan & Change Analysis Database Models.
Authoritative database persistence for Terraform plan JSON security evaluation,
before-and-after posture comparison, and pre-deployment policy gates.
Adheres strictly to ANTIGRAVITY Production Engineering Rules.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class IaCPlanAnalysis(Base, TimestampMixin):
    """
    Authoritative record of a Terraform Plan or infrastructure change analysis
    evaluated prior to deployment.
    """
    __tablename__ = "iac_plan_analyses"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: f"plan-{uuid.uuid4().hex[:12]}",
    )
    plan_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="infrastructure-core",
        index=True,
    )
    repository_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    project_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    environment: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="production",
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PASSED",  # PASSED, POLICY_VIOLATION, FAILED, QUEUED, ANALYZING
        index=True,
    )
    author: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Cloud Architect",
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    pr_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    pr_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    planned_additions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    planned_changes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    planned_deletions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    policy_violations_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    security_impact_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    resource_changes: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    policy_violations: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    before_after_posture: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    raw_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
