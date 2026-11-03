"""
IaC Compliance Benchmark & Control Evaluation Models.
Authoritative database persistence for Infrastructure as Code compliance checks.
Adheres strictly to ANTIGRAVITY Production Engineering Rules.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class IaCComplianceCheck(Base, TimestampMixin):
    """
    Persistent compliance check record evaluated against infrastructure manifests
    (Terraform, Kubernetes, Helm, CloudFormation).
    Stores deterministic evaluation results, resource counts, and audit rationale.
    """
    __tablename__ = "iac_compliance_checks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="frontend-app",
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

    # Control Identification
    control_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # e.g., "CIS-1.1.0", "KBS-1.1.0", "TF-1.1.0"
    control_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )  # e.g., "Ensure S3 buckets are private"

    # Taxonomy & Scope
    framework: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # CIS, Kubernetes, Terraform, Others
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # AWS, Kubernetes, Terraform, Azure, GCP
    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="MEDIUM",
        index=True,
    )  # CRITICAL, HIGH, MEDIUM, LOW

    # Assessment Result
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PASSED",
        index=True,
    )  # PASSED, FAILED, SKIPPED

    # Resource counts
    compliant_resources: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_resources: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    failed_resources_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Metadata & Tracking
    is_new: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    rule_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    remediation_guideline: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    rationale: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    audit_procedure: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    affected_resources_list: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSON,
        nullable=True,
    )
    last_scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_iac_comp_repo_ctrl", "repository_name", "control_id"),
        Index("ix_iac_comp_frm_status", "framework", "status"),
        Index("ix_iac_comp_prov", "provider"),
    )
