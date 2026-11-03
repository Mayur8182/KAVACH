"""
Invitation and OrganizationMember models.

Rules:
- Real DB persistence for invitations (no localStorage)
- Token-based acceptance flow
- Invitations expire after 7 days unless accepted
"""

import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def invitation_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=7)


class Invitation(Base):
    """Pending team invitation for an organization or project."""
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Who invited
    inviter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Invited email address
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Org or project scope
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Role being granted
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="member"
    )  # admin, member, viewer, auditor
    # Secure token for acceptance link
    token: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True, default=lambda: secrets.token_urlsafe(48)
    )
    # Status lifecycle
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING", index=True
    )  # PENDING, ACCEPTED, CANCELLED, EXPIRED
    # Optional message from inviter
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=invitation_expiry, nullable=False
    )
    accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class OrganizationMember(Base):
    """Resolved organization-level member record after invitation acceptance."""
    __tablename__ = "organization_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    invited_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
