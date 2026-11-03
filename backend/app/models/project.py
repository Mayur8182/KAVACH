import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.agent import Agent
    from app.models.audit_event import AuditEvent
    from app.models.intent import Intent
    from app.models.blueprint import SecurityBlueprint
    from app.models.organization import Workspace, Organization


class Project(Base, TimestampMixin):
    """Project entity representing an engineering repository/application under protection."""
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    repository_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    primary_language: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    framework: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    database_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    cloud_provider: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="development",
    )
    application_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="web_service",
    )
    default_branch: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="main",
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="projects",
    )
    workspace: Mapped[Optional["Workspace"]] = relationship(
        "Workspace",
        back_populates="projects",
    )
    agents: Mapped[List["Agent"]] = relationship(
        "Agent",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    audit_events: Mapped[List["AuditEvent"]] = relationship(
        "AuditEvent",
        back_populates="project",
    )
    intents: Mapped[List["Intent"]] = relationship(
        "Intent",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    blueprints: Mapped[List["SecurityBlueprint"]] = relationship(
        "SecurityBlueprint",
        back_populates="project",
        cascade="all, delete-orphan",
    )
