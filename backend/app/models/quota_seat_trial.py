import uuid
from datetime import datetime, timezone
from typing import Optional
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


class QuotaPolicy(Base, TimestampMixin):
    """
    Authoritative platform quota policies and configuration rules.
    Controls repository rules, scan limits, API throttling, and storage policies.
    """
    __tablename__ = "quota_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    category: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )  # repositories, scans, api_usage, storage
    rules_json: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    updated_by: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "category": self.category,
            "rules": self.rules_json,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class QuotaAlertRule(Base, TimestampMixin):
    """
    Configured quota alert notification rules for platform monitoring.
    """
    __tablename__ = "quota_alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    rule_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    quota_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Repositories, Scan Minutes, API Calls, Storage, Concurrent Scans
    threshold_percent: Mapped[int] = mapped_column(
        Integer,
        default=80,
        nullable=False,
    )
    channels: Mapped[str] = mapped_column(
        String(255),
        default="Email, Slack",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Active",
        nullable=False,
    )  # Active, Disabled

    def to_dict(self):
        return {
            "id": str(self.id),
            "rule_name": self.rule_name,
            "quota_type": self.quota_type,
            "threshold_percent": self.threshold_percent,
            "channels": self.channels,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QuotaAlertEvent(Base):
    """
    Immutable audit history of triggered quota alerts.
    """
    __tablename__ = "quota_alert_events"

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
    organization_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    quota_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Repositories, Scan Minutes, API Calls, Storage, Concurrent Scans
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # Usage reached 90%, Limit exceeded, Override updated
    details: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "organization_name": self.organization_name,
            "quota_type": self.quota_type,
            "event_type": self.event_type,
            "details": self.details,
            "created_at": self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None,
        }


class SeatPolicy(Base, TimestampMixin):
    """
    Authoritative developer seat limit policies and configuration.
    """
    __tablename__ = "seat_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    allow_invite_beyond_limit: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    auto_revoke_inactive_after_90_days: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    send_usage_alerts_at_80: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    default_role_mapping: Mapped[str] = mapped_column(
        String(100),
        default="Developer",
        nullable=False,
    )
    plan_defaults_json: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "allow_invite_beyond_limit": self.allow_invite_beyond_limit,
            "auto_revoke_inactive_after_90_days": self.auto_revoke_inactive_after_90_days,
            "send_usage_alerts_at_80": self.send_usage_alerts_at_80,
            "default_role_mapping": self.default_role_mapping,
            "plan_defaults": self.plan_defaults_json,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class SeatLimitOverride(Base, TimestampMixin):
    """
    Tenant-specific developer seat override by role.
    """
    __tablename__ = "seat_limit_overrides"

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
    organization_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    domain: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    role: Mapped[str] = mapped_column(
        String(100),
        default="Developers",
        nullable=False,
    )  # Developers, Security Engineers, Auditors, All Roles
    default_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    override_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    valid_till: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Active",
        nullable=False,
    )  # Active, Expired
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
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
            "organization_name": self.organization_name,
            "domain": self.domain,
            "role": self.role,
            "default_limit": self.default_limit,
            "override_limit": self.override_limit,
            "valid_till": self.valid_till.strftime("%d %b %Y"),
            "status": self.status,
            "reason": self.reason,
            "actor_name": self.actor_name,
        }


class OrganizationTrial(Base, TimestampMixin):
    """
    Authoritative subscription trial entity tracking trial lifecycle,
    expiry calculations, reminders, and paid plan conversions.
    """
    __tablename__ = "organization_trials"

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
    organization_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    domain: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    plan_key: Mapped[str] = mapped_column(
        String(100),
        default="pro",
        nullable=False,
    )  # starter, pro, enterprise
    duration_days: Mapped[int] = mapped_column(
        Integer,
        default=14,
        nullable=False,
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    auto_convert: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    send_reminders: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="ACTIVE",
        nullable=False,
        index=True,
    )  # ACTIVE, EXPIRING, EXPIRED, CONVERTED, CANCELLED
    converted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    target_plan_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    def days_left(self) -> int:
        now = datetime.now(timezone.utc)
        end = self.end_date
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        diff = (end - now).total_seconds()
        return max(0, int(diff // 86400))

    def to_dict(self):
        return {
            "id": str(self.id),
            "organization_id": str(self.organization_id),
            "organization_name": self.organization_name,
            "domain": self.domain,
            "plan": self.plan_key.capitalize(),
            "duration_days": self.duration_days,
            "start_date": self.start_date.strftime("%d %b %Y"),
            "end_date": self.end_date.strftime("%d %b %Y"),
            "days_left": self.days_left() if self.status in ["ACTIVE", "EXPIRING"] else "-",
            "status": self.status.capitalize() if self.status != "ACTIVE" else ("Expiring" if self.days_left() <= 3 else "Active"),
            "auto_convert": self.auto_convert,
            "send_reminders": self.send_reminders,
            "converted_at": self.converted_at.isoformat() if self.converted_at else None,
            "cancellation_reason": self.cancellation_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TrialEvent(Base):
    """
    Immutable audit history for trial lifecycle operations (creation, extension, cancellation, conversion).
    """
    __tablename__ = "trial_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    trial_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organization_trials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # CREATED, EXTENDED, CONVERTED, CANCELLED, REMINDER_SENT
    details: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    performed_by: Mapped[str] = mapped_column(
        String(255),
        default="Founder SuperAdmin",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "trial_id": str(self.trial_id),
            "event_type": self.event_type,
            "details": self.details,
            "performed_by": self.performed_by,
            "date": self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None,
        }
