"""
Thing Code — Dependency Remediation Models
Stores real remediation items, upgrade recommendations, manifest diffs, pull request links,
and verification scan outcomes in PostgreSQL.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class DependencyRemediationItem(Base):
    """
    Authoritative record for an open or in-progress dependency remediation queue item.
    """
    __tablename__ = "dependency_remediation_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)

    package_name = Column(String(255), nullable=False, index=True)
    current_version = Column(String(64), nullable=False)
    fixed_version = Column(String(64), nullable=False)
    ecosystem = Column(String(64), nullable=False, default="npm", index=True)  # npm, PyPI, Maven, Go, Cargo
    dependency_type = Column(String(32), nullable=False, default="DIRECT")  # DIRECT, TRANSITIVE
    severity = Column(String(32), nullable=False, default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(64), nullable=False, default="OPEN", index=True)  # OPEN, IN_PROGRESS, FIXED, PENDING_VERIFICATION, IGNORED

    repository_name = Column(String(255), nullable=False, default="web-api", index=True)
    branch = Column(String(128), nullable=False, default="main")
    cve_id = Column(String(64), nullable=True, index=True)  # e.g. CVE-2021-23337
    title = Column(String(512), nullable=False, default="Vulnerability Remediation")
    category = Column(String(128), nullable=False, default="Vulnerability")  # Prototype Pollution, RCE, DoS, Outdated, etc.

    manifest_path = Column(String(512), nullable=False, default="package.json")
    lockfile_path = Column(String(512), nullable=True, default="package-lock.json")

    # Real git diff of the remediation patch
    manifest_diff = Column(Text, nullable=True)
    lockfile_diff = Column(Text, nullable=True)

    # Pull Request integration metadata
    pr_number = Column(Integer, nullable=True)
    pr_url = Column(String(512), nullable=True)
    pr_branch = Column(String(255), nullable=True)

    # Verification status
    verification_scan_id = Column(UUID(as_uuid=True), nullable=True)
    verification_status = Column(String(64), nullable=False, default="NOT_STARTED")  # NOT_STARTED, QUEUED, IN_PROGRESS, PASSED, FAILED
    verified_at = Column(DateTime(timezone=True), nullable=True)

    breaking_change = Column(Boolean, default=False)
    breaking_change_notes = Column(Text, nullable=True)

    first_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class RemediationActivityLog(Base):
    """
    Immutable audit activity log for remediation lifecycle events.
    """
    __tablename__ = "remediation_activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    remediation_id = Column(UUID(as_uuid=True), ForeignKey("dependency_remediation_items.id", ondelete="CASCADE"), nullable=True)

    package_name = Column(String(255), nullable=False, index=True)
    action_type = Column(String(64), nullable=False, default="STATUS_CHANGED")  # PR_CREATED, STATUS_CHANGED, SCAN_VERIFIED, UPGRADE_APPLIED
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    dot_color = Column(String(32), nullable=False, default="#2563EB")  # #2563EB, #10B981, #F59E0B, #8B5CF6, #EF4444
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
