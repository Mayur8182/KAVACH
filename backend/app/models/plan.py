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


class FeatureCatalog(Base, TimestampMixin):
    """
    Authoritative catalog of security and platform features supported by SecuLayer.
    Guarantees features are database-backed and validated.
    """
    __tablename__ = "feature_catalog"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )  # sast, secrets, sca, sbom, pr_security_gates, ai_autofix, saml_sso, dedicated_runners
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    tagline: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Code Security, Dependency Security, Compliance, CI/CD, AI Defense, Identity, Infrastructure
    module: Mapped[str] = mapped_column(
        String(100),
        default="Code Security",
        nullable=False,
    )  # SAST, Secrets, SCA, SBOM, PR Gating, AI Remediation, IAM, Cloud, Infrastructure
    status: Mapped[str] = mapped_column(
        String(50),
        default="ENABLED",
        nullable=False,
    )  # DRAFT, ENABLED, DISABLED, ARCHIVED
    scope: Mapped[str] = mapped_column(
        String(50),
        default="GLOBAL",
        nullable=False,
    )  # GLOBAL, PER_TENANT
    show_in_ui: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    requires_org_setup: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    menu_location: Mapped[str] = mapped_column(
        String(100),
        default="Security",
        nullable=False,
    )
    icon: Mapped[str] = mapped_column(
        String(100),
        default="Shield",
        nullable=False,
    )
    config_schema: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    default_config: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    dependencies: Mapped[Optional[list]] = mapped_column(
        JSON,
        default=list,
        nullable=True,
    )  # list of feature keys, e.g. ["sast", "secrets"]
    external_dependencies: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )  # {"git_provider": true, "cicd_provider": false, "cloud_provider": false, "saml_sso": false}
    plan_availability: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )  # {"starter": {"enabled": true, "tier": "standard"}, "pro": ...}
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "key": self.key,
            "name": self.name,
            "tagline": self.tagline,
            "description": self.description,
            "category": self.category,
            "module": self.module or self.category,
            "status": self.status or ("ENABLED" if self.is_active else "DISABLED"),
            "scope": self.scope or "GLOBAL",
            "show_in_ui": self.show_in_ui,
            "requires_org_setup": self.requires_org_setup,
            "menu_location": self.menu_location or "Security",
            "icon": self.icon or "Shield",
            "config_schema": self.config_schema or {},
            "default_config": self.default_config or {},
            "dependencies": self.dependencies or [],
            "external_dependencies": self.external_dependencies or {},
            "plan_availability": self.plan_availability or {},
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SubscriptionPlan(Base, TimestampMixin):
    """
    Persistent subscription plan entity (e.g. Starter, Pro, Enterprise).
    Controls tier metadata, active status, pricing, and assigned organizations.
    """
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Starter, Pro, Enterprise
    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )  # starter, pro, enterprise
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
        index=True,
    )  # DRAFT, ACTIVE, ARCHIVED
    plan_type: Mapped[str] = mapped_column(
        String(50),
        default="PAID",
        nullable=False,
    )  # PAID, TRIAL, CUSTOM
    pricing_model: Mapped[str] = mapped_column(
        String(50),
        default="FIXED",
        nullable=False,
    )  # FIXED, CUSTOM
    currency: Mapped[str] = mapped_column(
        String(10),
        default="USD",
        nullable=False,
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(50),
        default="monthly",
        nullable=False,
    )  # monthly, annual, custom
    monthly_price: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    annual_price: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    discount_percent: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    trial_days: Mapped[int] = mapped_column(
        Integer,
        default=14,
        nullable=False,
    )
    is_trial_allowed: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    auto_renew: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    payment_provider: Mapped[str] = mapped_column(
        String(50),
        default="stripe",
        nullable=False,
    )
    billing_provider_price_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    current_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    archived_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    archived_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    versions: Mapped[List["PlanVersion"]] = relationship(
        "PlanVersion",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="desc(PlanVersion.version_number)",
    )
    audit_events: Mapped[List["PlanAuditEvent"]] = relationship(
        "PlanAuditEvent",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="desc(PlanAuditEvent.created_at)",
    )
    tenant_subscriptions: Mapped[List["OrganizationSubscription"]] = relationship(
        "OrganizationSubscription",
        back_populates="subscription_plan",
    )


class PlanVersion(Base, TimestampMixin):
    """
    Immutable snapshot of a plan configuration at a specific version.
    Stores features, limits, and quotas for historical and current assignments.
    """
    __tablename__ = "plan_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="PUBLISHED",
        nullable=False,
    )  # DRAFT, PUBLISHED, SUPERSEDED, ARCHIVED
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    changelog: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Enabled feature keys list
    features: Mapped[Optional[list]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # Usage & Quotas
    max_repositories: Mapped[int] = mapped_column(
        Integer,
        default=25,
        nullable=False,
    )  # 0 for unlimited
    monthly_scan_minutes: Mapped[int] = mapped_column(
        Integer,
        default=10000,
        nullable=False,
    )
    concurrent_scans: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    monthly_api_calls: Mapped[int] = mapped_column(
        Integer,
        default=500000,
        nullable=False,
    )
    api_rate_limit_per_minute: Mapped[int] = mapped_column(
        Integer,
        default=1000,
        nullable=False,
    )
    storage_limit_gb: Mapped[int] = mapped_column(
        Integer,
        default=50,
        nullable=False,
    )

    # Seat limits
    developer_seats: Mapped[int] = mapped_column(
        Integer,
        default=25,
        nullable=False,
    )
    admin_seats: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    security_seats: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    auditor_seats: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    seat_counting_rule: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE_ONLY",
        nullable=False,
    )  # ACTIVE_ONLY, ALL_INVITED
    over_limit_behavior: Mapped[str] = mapped_column(
        String(50),
        default="BLOCK",
        nullable=False,
    )  # BLOCK, ALLOW_WITH_WARNING

    # Pricing snapshot
    monthly_price: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    annual_price: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="USD",
        nullable=False,
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(50),
        default="monthly",
        nullable=False,
    )

    # Trial snapshot
    trial_days: Mapped[int] = mapped_column(
        Integer,
        default=14,
        nullable=False,
    )
    is_trial_allowed: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_by_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan",
        back_populates="versions",
    )


class PlanAuditEvent(Base):
    """
    Immutable audit trail recording every administrative lifecycle change to a plan.
    """
    __tablename__ = "plan_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    actor_id: Mapped[str] = mapped_column(
        String(255),
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
    )  # PLAN_CREATED, PLAN_PUBLISHED, PLAN_UPDATED, LIMITS_UPDATED, FEATURES_UPDATED, PRICING_UPDATED, PLAN_ARCHIVED
    changes: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan",
        back_populates="audit_events",
    )


class FeatureAuditEvent(Base):
    """
    Immutable audit trail for feature definitions, schema changes, and dependency updates.
    """
    __tablename__ = "feature_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    feature_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    feature_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[str] = mapped_column(
        String(255),
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
    )  # FEATURE_CREATED, FEATURE_UPDATED, CONFIG_UPDATED, DEPENDENCIES_UPDATED, PLAN_AVAILABILITY_UPDATED, FEATURE_PUBLISHED, FEATURE_ARCHIVED, ENTITLEMENT_CHANGED
    changes: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="SUCCESS",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "feature_id": str(self.feature_id) if self.feature_id else None,
            "feature_key": self.feature_key,
            "actor_id": self.actor_id,
            "actor_name": self.actor_name,
            "action": self.action,
            "changes": self.changes or {},
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PlanEntitlement(Base, TimestampMixin):
    """
    Explicit plan-level entitlement mapping and tier configuration.
    """
    __tablename__ = "plan_entitlements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plan_versions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    feature_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    value_tier: Mapped[str] = mapped_column(
        String(50),
        default="standard",
        nullable=False,
    )  # disabled, standard, advanced, custom
    usage_limit: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )  # 0 for unlimited or not applicable
    custom_config_allowed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    allow_tenant_custom_limits: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    show_in_plan_comparison: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    configuration: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "plan_id": str(self.plan_id),
            "plan_version_id": str(self.plan_version_id) if self.plan_version_id else None,
            "feature_key": self.feature_key,
            "is_enabled": self.is_enabled,
            "value_tier": self.value_tier,
            "usage_limit": self.usage_limit,
            "custom_config_allowed": self.custom_config_allowed,
            "allow_tenant_custom_limits": self.allow_tenant_custom_limits,
            "show_in_plan_comparison": self.show_in_plan_comparison,
            "configuration": self.configuration or {},
        }
