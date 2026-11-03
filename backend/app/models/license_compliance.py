"""
License Compliance and Open-Source Software (OSS) Governance Models.

Tables:
- license_compliance_records: Normalized repository packages, their licenses, types, compliance statuses, and file locations.
- license_policies: Organization / project rules governing allowable, restricted, and prohibited licenses.
- license_scan_jobs: Real license audit executions.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index,
    Integer, JSON, String, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LicenseComplianceRecord(Base, TimestampMixin):
    """
    Tracks an individual software package license detected in a repository.
    Enables server-side filtering by license name, package, compliance status, and risk level.
    """
    __tablename__ = "license_compliance_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    repository_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="frontend-app", index=True
    )

    # License details
    license_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    package_version: Mapped[str] = mapped_column(String(100), nullable=False)
    license_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Permissive", index=True
    )  # Permissive, Copyleft, Unknown
    compliance_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Compliant", index=True
    )  # Compliant, Restricted, Prohibited, Unknown
    risk_level: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Low", index=True
    )  # Low, Medium, High

    # Usage details
    used_in_files_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    used_in_paths: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    package_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    license_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Policy correlation
    policy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    first_detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    last_scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    __table_args__ = (
        Index("ix_lic_comp_repo_lic", "repository_name", "license_name"),
        Index("ix_lic_comp_status", "compliance_status"),
        Index("ix_lic_comp_pkg", "package_name"),
    )


class LicensePolicy(Base, TimestampMixin):
    """
    Configured policy rule for open-source licenses.
    e.g. GPL-3.0 -> PROHIBIT, MIT -> ALLOW.
    """
    __tablename__ = "license_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    license_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    license_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Permissive")
    action: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ALLOW"
    )  # ALLOW, RESTRICT, PROHIBIT
    default_compliance_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Compliant"
    )  # Compliant, Restricted, Prohibited
    default_risk_level: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Low"
    )  # Low, Medium, High
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class LicenseScanJob(Base, TimestampMixin):
    """
    Execution audit record for License Compliance scans.
    """
    __tablename__ = "license_scan_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    repository_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="frontend-app", index=True
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="COMPLETED"
    )  # QUEUED, RUNNING, COMPLETED, FAILED
    scanner_engine: Mapped[str] = mapped_column(
        String(100), nullable=False, default="license-policy-engine"
    )
    total_packages_scanned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    compliant_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    restricted_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prohibited_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unknown_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class LicenseException(Base, TimestampMixin):
    """
    Tracks formal compliance waivers, approvals, and legal reviews for open-source licenses.
    """
    __tablename__ = "license_exceptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    package_version: Mapped[str] = mapped_column(String(100), nullable=False)
    license_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="APPROVED", index=True
    )  # APPROVED, PENDING_REVIEW, REJECTED, EXPIRED
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str] = mapped_column(String(255), nullable=False, default="Security Engineer")
    approved_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

