"""
Kavach Platform Support & Announcement Models
Authoritative PostgreSQL persistence for platform announcements, recipient targeting, and delivery records.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class PlatformAnnouncement(Base, TimestampMixin):
    """
    Authoritative broadcast announcements published by Founder / SuperAdmin.
    Pushed to tenant workspaces and transactional email channels.
    """
    __tablename__ = "platform_announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False, default="INFO")  # INFO, WARNING, CRITICAL
    target_audience = Column(String(50), nullable=False, default="ALL_TENANTS")  # ALL_TENANTS, PRO_USERS, ENTERPRISE
    status = Column(String(50), nullable=False, default="PUBLISHED")  # DRAFT, PUBLISHED, ARCHIVED
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_email = Column(String(255), nullable=True)
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_dismissible = Column(Boolean, default=True)
    metadata_json = Column(JSON, default=dict)

    # Relationships
    delivery_logs = relationship("AnnouncementDeliveryLog", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementDeliveryLog(Base, TimestampMixin):
    """Delivery confirmation record per recipient or tenant organization."""
    __tablename__ = "announcement_delivery_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    announcement_id = Column(UUID(as_uuid=True), ForeignKey("platform_announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_email = Column(String(255), nullable=True)
    delivery_channel = Column(String(50), default="IN_APP")  # IN_APP, EMAIL, WEBHOOK
    status = Column(String(50), default="DELIVERED")  # QUEUED, DELIVERED, FAILED
    delivered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    error_message = Column(Text, nullable=True)

    announcement = relationship("PlatformAnnouncement", back_populates="delivery_logs")
