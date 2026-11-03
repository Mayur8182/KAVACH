import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TenantPlanAssignment(Base, TimestampMixin):
    """
    Authoritative record of a tenant's subscription plan assignment lifecycle.
    Tracks historical transitions (ASSIGNED, UPGRADED, DOWNGRADED, CONVERTED) and active state.
    """
    __tablename__ = "tenant_plan_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plan_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    plan_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )  # starter, pro, enterprise, custom
    action: Mapped[str] = mapped_column(
        String(50),
        default="ASSIGNED",
        nullable=False,
    )  # ASSIGNED, UPGRADED, DOWNGRADED, CONVERTED, RENEWED
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
        index=True,
    )  # ACTIVE, SUPERSEDED, CANCELLED
    effective_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(50),
        default="monthly",
        nullable=False,
    )  # monthly, annual
    price_per_month: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    changed_by_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    changed_by_name: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "plan_id": str(self.plan_id),
            "plan_version_id": str(self.plan_version_id) if self.plan_version_id else None,
            "plan_key": self.plan_key,
            "action": self.action,
            "status": self.status,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "billing_cycle": self.billing_cycle,
            "price_per_month": self.price_per_month,
            "changed_by_id": self.changed_by_id,
            "changed_by_name": self.changed_by_name,
            "reason": self.reason,
            "metadata_json": self.metadata_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TenantEntitlementOverride(Base, TimestampMixin):
    """
    Explicit feature-level or module-level override for a specific customer organization.
    Evaluated in priority above plan entitlements.
    """
    __tablename__ = "tenant_entitlement_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    feature_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )  # sast, secrets, sca, sbom, pr_security_gates, ai_autofix, saml_sso, dedicated_runners, etc.
    category: Mapped[str] = mapped_column(
        String(50),
        default="features",
        nullable=False,
    )  # features, modules, advanced
    inherit_from_plan: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    custom_override: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    effective_value: Mapped[str] = mapped_column(
        String(50),
        default="Enabled",
        nullable=False,
    )  # Enabled, Disabled, Limited, Advanced, Custom
    config_override: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    actor_name: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "feature_key": self.feature_key,
            "category": self.category,
            "inherit_from_plan": self.inherit_from_plan,
            "custom_override": self.custom_override,
            "effective_value": self.effective_value,
            "config_override": self.config_override or {},
            "reason": self.reason,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TenantLimitOverride(Base, TimestampMixin):
    """
    Explicit resource limit / quota override for a specific customer organization.
    Overrides plan-level limits (repositories, scan minutes, API calls, storage, etc.).
    """
    __tablename__ = "tenant_limit_overrides"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    limit_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )  # max_repositories, monthly_scan_minutes, concurrent_scans, monthly_api_calls, storage_limit_gb, custom_scan_retention_days, custom_report_retention_days
    limit_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )  # Repository Limit, Scan Minutes (Monthly), Concurrent Scans, API Calls (Monthly), Storage Limit (GB)
    inherit_from_plan: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    plan_default_value: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    custom_limit_value: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    effective_value: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(50),
        default="count",
        nullable=False,
    )  # count, minutes, calls, GB, days
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    actor_name: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "limit_key": self.limit_key,
            "limit_name": self.limit_name,
            "inherit_from_plan": self.inherit_from_plan,
            "plan_default_value": self.plan_default_value,
            "custom_limit_value": self.custom_limit_value,
            "effective_value": self.effective_value,
            "unit": self.unit,
            "reason": self.reason,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TenantUsageRecord(Base):
    """
    Authoritative metered telemetry record for a tenant.
    Captures usage counts and granular breakdowns for repositories, scans, API calls, and storage.
    """
    __tablename__ = "tenant_usage_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    metric_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # repositories, scans, api_calls, storage
    period: Mapped[str] = mapped_column(
        String(50),
        default="30_days",
        nullable=False,
    )  # 30_days, 2026-10, daily
    current_value: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    limit_value: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    breakdown_json: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "metric_type": self.metric_type,
            "period": self.period,
            "current_value": self.current_value,
            "limit_value": self.limit_value,
            "breakdown_json": self.breakdown_json or {},
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class TenantPlanAuditEvent(Base):
    """
    Immutable audit trail recording every privileged plan assignment, upgrade, downgrade, or override change.
    """
    __tablename__ = "tenant_plan_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    actor_id: Mapped[str] = mapped_column(
        String(255),
        default="system",
        nullable=False,
    )
    actor_name: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Plan Assigned, Plan Upgraded, Plan Downgraded, Trial Converted, Override Applied, Limits Reset
    details: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    changes: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Success",
        nullable=False,
    )  # Success, Failed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "plan_key": self.plan_key,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "action": self.action,
            "details": self.details,
            "changes": self.changes or {},
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
