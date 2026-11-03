"""
Package Health and Maintenance Models.

Tables:
- package_health_records: Evaluates open-source dependencies on release velocity, maintenance hygiene, maintainer activity, abandonment signals, and trust scores.
- package_maintenance_events: Historical maintenance feed (commits, major releases, deprecation warnings, maintainer updates).
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index,
    Integer, Float, JSON, String, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class PackageHealthRecord(Base, TimestampMixin):
    """
    Evaluates individual third-party packages for software engineering hygiene,
    supply chain health, release cadence, and abandonment risk.
    """
    __tablename__ = "package_health_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    repository_name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="web-api", index=True
    )

    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(100), nullable=False)
    ecosystem: Mapped[str] = mapped_column(String(50), nullable=False, default="npm", index=True)

    # Health & Trust Ratings
    health_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Healthy", index=True
    )  # Healthy, Moderate, Poor, Critical
    health_score: Mapped[int] = mapped_column(Integer, nullable=False, default=85)  # 0 - 100
    maintenance_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Active", index=True
    )  # Active, Low Activity, Stale, Abandoned
    trust_score: Mapped[int] = mapped_column(Integer, nullable=False, default=90)  # 0 - 100

    # Activity Timestamps & Durations
    last_release_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_commit_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    days_since_last_release: Mapped[int] = mapped_column(Integer, nullable=False, default=14)
    days_since_last_commit: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    # Telemetry and Community Signals
    github_activity: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    open_issues_count: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    closed_issues_count: Mapped[int] = mapped_column(Integer, nullable=False, default=340)
    stars_count: Mapped[int] = mapped_column(Integer, nullable=False, default=12500)
    forks_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2100)
    commit_frequency_monthly: Mapped[float] = mapped_column(Float, nullable=False, default=14.5)
    maintainers_count: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    # Deprecation & Abandonment
    is_deprecated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    deprecation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    replacement_package: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Release History & Version Metadata
    release_history: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    security_advisories_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Indexing
    __table_args__ = (
        Index("idx_pkg_health_proj_repo", "project_id", "repository_name"),
        Index("idx_pkg_health_status", "health_status", "maintenance_status"),
    )


class PackageMaintenanceEvent(Base, TimestampMixin):
    """
    Maintains a deterministic audit log of open-source repository events:
    version releases, major commit milestones, deprecation notices, and maintainer changes.
    """
    __tablename__ = "package_maintenance_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="RELEASE", index=True
    )  # RELEASE, COMMIT, SECURITY_PATCH, DEPRECATION, MAINTAINER_CHANGE
    dot_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#10B981")
    event_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
