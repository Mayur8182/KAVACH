"""Database models for centralized email delivery logging, notification queue, and preferences."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin

# Use JSON compatible with both SQLite and Postgres
JSONType = JSON().with_variant(JSONB, "postgresql")


class EmailDeliveryLog(Base, TimestampMixin):
    """Authoritative ledger of all transactional and operational emails dispatched by Kavach."""

    __tablename__ = "email_delivery_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    template_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="QUEUED", index=True
    )  # QUEUED, SENT, DELIVERED, FAILED, BOUNCED, SKIPPED_PREFERENCE
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(50), default="smtp_gmail")
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Traceability links
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(150), unique=True, nullable=True, index=True)
    event_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    workspace_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    
    # Metadata & Payload context (safe context, secrets/tokens redacted)
    context_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONType, nullable=True, default=dict)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class WorkspaceNotificationSettings(Base, TimestampMixin):
    """Workspace-level security notification controls and routing."""

    __tablename__ = "workspace_notification_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    
    # Channel controls
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    security_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    scan_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    vulnerability_reports_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_security_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cloud_security_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    billing_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Routing overrides
    security_team_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    critical_only_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

