"""
Authoritative SQLAlchemy Database Models for Infrastructure as Code (IaC) Drift Detection.
Adheres strictly to ANTIGRAVITY Production Engineering Rules:
- Real database persistence in PostgreSQL/SQLite
- Deterministic data models with audit trails
- Zero hardcoded or mock data
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

# SQLite compatibility fallback for JSON types
try:
    from sqlalchemy import JSON
except ImportError:
    JSON = Text


class IaCDriftResource(Base, TimestampMixin):
    """
    Monitored infrastructure resource evaluated for drift between IaC definitions (Terraform)
    and live cloud provider runtime state.
    """
    __tablename__ = "iac_drift_resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="AWS", index=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False, default="S3 Bucket")
    drift_status: Mapped[str] = mapped_column(String(32), nullable=False, default="In Sync", index=True)  # "Drifted", "In Sync", "Ignored"
    region: Mapped[str] = mapped_column(String(64), nullable=False, default="us-east-1")
    workspace: Mapped[str] = mapped_column(String(64), nullable=False, default="production")
    
    # State storage (HCL manifests and actual values)
    desired_hcl: Mapped[str] = mapped_column(Text, nullable=False)
    actual_hcl: Mapped[str] = mapped_column(Text, nullable=False)
    diff_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Ignore configuration
    is_ignored: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ignore_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Timestamps & Tracking
    last_detected: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    repository_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)

    # Relationships
    events = relationship("IaCDriftEvent", back_populates="resource", cascade="all, delete-orphan", lazy="selectin")
    config = relationship("IaCDriftConfig", back_populates="resource", uselist=False, cascade="all, delete-orphan", lazy="selectin")


class IaCDriftEvent(Base, TimestampMixin):
    """
    Historical audit record of an infrastructure drift change, resolution, or detection event.
    """
    __tablename__ = "iac_drift_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id: Mapped[str] = mapped_column(String(255), ForeignKey("iac_drift_resources.resource_id", ondelete="CASCADE"), nullable=False, index=True)
    
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, default="Configuration")  # Configuration, Rule Change, Deleted, In Sync, Tags Updated
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="Drifted")  # Drifted, In Sync, Ignored
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="warning")  # error, warning, info, success
    
    diff_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationships
    resource = relationship("IaCDriftResource", back_populates="events")


class IaCDriftConfig(Base, TimestampMixin):
    """
    Resource-specific drift detection configuration.
    """
    __tablename__ = "iac_drift_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id: Mapped[str] = mapped_column(String(255), ForeignKey("iac_drift_resources.resource_id", ondelete="CASCADE"), nullable=False, unique=True)

    # Detection settings
    enable_drift_detection: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    compare_terraform_state: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_tags: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ignore_metadata_changes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_resolve_known: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scan_frequency: Mapped[str] = mapped_column(String(64), default="Every 6 hours", nullable=False)

    # Scope
    scope_configuration: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scope_tags: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scope_permissions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scope_network: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scope_encryption: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scope_lifecycle: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Drift Notification
    notify_on_detection: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_on_resolution: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    severity_threshold: Mapped[str] = mapped_column(String(64), default="Medium and above", nullable=False)
    notification_channels: Mapped[Optional[List[str]]] = mapped_column(JSON, default=lambda: ["frontend-team", "security-team"], nullable=True)

    # Relationships
    resource = relationship("IaCDriftResource", back_populates="config")


class IaCBaselineState(Base, TimestampMixin):
    """
    Baseline and state comparison configuration for an infrastructure workspace.
    """
    __tablename__ = "iac_baseline_states"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace: Mapped[str] = mapped_column(String(64), nullable=False, default="production", index=True)
    comparison_source: Mapped[str] = mapped_column(String(64), nullable=False, default="terraform_state")  # terraform_state, custom_baseline, live_config
    state_file: Mapped[str] = mapped_column(String(255), nullable=False, default="s3://tf-state/prod/terraform.tfstate")
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    resources_tracked: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    
    # Advanced options
    normalize_values: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ignore_computed_fields: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    custom_ignore_rules: Mapped[str] = mapped_column(String(255), default='tags["last_updated"], metadata.*', nullable=False)


class IaCDriftGlobalSettings(Base, TimestampMixin):
    """
    Global drift detection engine configuration across all projects and repositories.
    """
    __tablename__ = "iac_drift_global_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default-settings")
    enable_drift_globally: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_scan_frequency: Mapped[str] = mapped_column(String(64), default="Every 6 hours", nullable=False)
    parallel_scanning: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    retry_on_failure: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    timeout_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)

    # Notification settings
    notify_on_new_drift: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_on_drift_resolution: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_summary_report: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    weekly_compliance_report: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class IaCIgnoredResource(Base, TimestampMixin):
    """
    Resource patterns explicitly excluded from drift detection alerts.
    """
    __tablename__ = "iac_ignored_resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_pattern: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    added_by: Mapped[str] = mapped_column(String(128), nullable=False, default="@platform-team")
