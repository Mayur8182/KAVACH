import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.invitation import OrganizationMember  # noqa: F401

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.project import Project


class Organization(Base, TimestampMixin):
    """Organization entity representing a customer or team tenant."""
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    domain: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    org_type: Mapped[str] = mapped_column(
        String(100),
        default="Enterprise",
        nullable=False,
    )
    industry: Mapped[str] = mapped_column(
        String(100),
        default="Technology",
        nullable=False,
    )
    team_size: Mapped[str] = mapped_column(
        String(100),
        default="11 - 50",
        nullable=False,
    )
    region: Mapped[str] = mapped_column(
        String(100),
        default="ap-south-1 (Mumbai)",
        nullable=False,
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    owner_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
    )
    is_maintenance: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    data_retention_days: Mapped[int] = mapped_column(
        Integer,
        default=90,
        nullable=False,
    )
    metadata_json: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=dict,
    )

    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    subscription: Mapped[Optional["OrganizationSubscription"]] = relationship(
        "OrganizationSubscription",
        back_populates="organization",
        uselist=False,
        cascade="all, delete-orphan",
    )
    product_entitlements: Mapped[List["ProductEntitlement"]] = relationship(
        "ProductEntitlement",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[List["TenantInvoice"]] = relationship(
        "TenantInvoice",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    environments: Mapped[List["TenantEnvironment"]] = relationship(
        "TenantEnvironment",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    resource_allocations: Mapped[List["TenantResourceAllocation"]] = relationship(
        "TenantResourceAllocation",
        back_populates="organization",
        cascade="all, delete-orphan",
    )


class Workspace(Base, TimestampMixin):
    """Workspace entity grouped under an organization or owned by an individual user."""
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    workspace_type: Mapped[str] = mapped_column(
        String(50),
        default="ORGANIZATION",  # PERSONAL | ORGANIZATION
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    visibility: Mapped[str] = mapped_column(
        String(50),
        default="Private",  # Private | Internal | Public
        nullable=False,
    )
    default_branch: Mapped[str] = mapped_column(
        String(100),
        default="main",
        nullable=False,
    )
    region: Mapped[str] = mapped_column(
        String(100),
        default="ap-south-1 (Mumbai)",
        nullable=False,
    )
    deployment_target: Mapped[str] = mapped_column(
        String(100),
        default="Kubernetes",
        nullable=False,
    )
    admins: Mapped[Optional[list]] = mapped_column(
        JSON,
        nullable=True,
        default=list,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
    )
    environments_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    organization: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        back_populates="workspaces",
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )


class OrganizationSubscription(Base, TimestampMixin):
    """Active billing subscription and tier for an organization."""
    __tablename__ = "organization_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    plan: Mapped[str] = mapped_column(
        String(50),
        default="FREE_TIER",  # FREE_TIER | PRO_TRIAL | TEAM | ENTERPRISE
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",     # ACTIVE | TRIALING | PAST_DUE | CANCELLED | EXPIRED
        nullable=False,
    )
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )
    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(20),
        default="monthly",    # monthly | annual
        nullable=False,
    )
    price_per_month: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    max_seats: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    used_seats: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    max_repositories: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    used_repositories: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_scan_minutes: Mapped[int] = mapped_column(
        Integer,
        default=1000,
        nullable=False,
    )
    used_scan_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_storage_gb: Mapped[int] = mapped_column(
        Integer,
        default=50,
        nullable=False,
    )
    used_storage_gb: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_api_calls: Mapped[int] = mapped_column(
        Integer,
        default=10000,
        nullable=False,
    )
    used_api_calls: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_runner_nodes: Mapped[int] = mapped_column(
        Integer,
        default=2,
        nullable=False,
    )
    used_runner_nodes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    dedicated_runners: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    ai_remediation: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    sso_saml: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    subscription_plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="subscription",
    )
    subscription_plan: Mapped[Optional["SubscriptionPlan"]] = relationship(
        "SubscriptionPlan",
        back_populates="tenant_subscriptions",
    )


class ProductEntitlement(Base, TimestampMixin):
    """Product-level entitlement and feature flags for an organization/workspace."""
    __tablename__ = "product_entitlements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_key: Mapped[str] = mapped_column(
        String(50),  # thing_code | thing_cloud | thing_attack | thing_protect
        index=True,
        nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="LOCKED",  # ENABLED | LOCKED | TRIAL | ADDON
        nullable=False,
    )
    features: Mapped[Optional[list]] = mapped_column(
        JSON,
        default=list,
        nullable=True,
    )
    granted_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )
    source: Mapped[str] = mapped_column(
        String(100),
        default="ONBOARDING_SELECTION",  # ONBOARDING_SELECTION | PLAN_INCLUDED | ADDON_PURCHASE | ADMIN_OVERRIDE
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="product_entitlements",
    )


class SubscriptionAuditEvent(Base, TimestampMixin):
    """Immutable audit trail for subscription changes and product entitlement grants."""
    __tablename__ = "subscription_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),  # ENTITLEMENT_GRANTED | ENTITLEMENT_REVOKED | PLAN_CHANGED | PRODUCT_PURCHASED
        nullable=False,
        index=True,
    )
    product_key: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    details: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )


class TenantInvoice(Base, TimestampMixin):
    """Persisted invoice record for tenant billing."""
    __tablename__ = "tenant_invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    invoice_number: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="USD",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="PAID",
        nullable=False,
    )  # PAID | PENDING | FAILED
    billing_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    invoice_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="invoices",
    )


class TenantEnvironment(Base, TimestampMixin):
    """Persisted environment configured for a tenant (Dev, Staging, Prod)."""
    __tablename__ = "tenant_environments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Development, Staging, Production
    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # dev-1, stg, prod-12
    scan_schedule: Mapped[str] = mapped_column(
        String(100),
        default="Continuous",
        nullable=False,
    )  # On Push, Daily, Continuous
    repositories_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="environments",
    )


class TenantResourceAllocation(Base, TimestampMixin):
    """Infrastructure resource and isolation allocation for a tenant."""
    __tablename__ = "tenant_resource_allocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resource_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # KUBERNETES_NAMESPACE, OBJECT_STORAGE, RUNNER_POOL, DATABASE, REGION, VPC
    resource_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    details: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="HEALTHY",
        nullable=False,
    )  # HEALTHY, DEGRADED, PROVISIONING, UNAVAILABLE
    is_isolated: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    namespace: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    network_policy: Mapped[str] = mapped_column(
        String(100),
        default="Dedicated Isolated",
        nullable=False,
    )
    encryption_at_rest: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="resource_allocations",
    )


# Re-export for backward compatibility with modules expecting OrganizationMember here
from app.models.invitation import OrganizationMember  # noqa: F401, E402


