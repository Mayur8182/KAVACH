import uuid
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class Agent(Base, TimestampMixin):
    """Agent entity registered to operate within a specific project's boundaries."""
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    agent_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="coding_assistant",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
    )
    trust_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="restricted",
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="agents",
    )
    credentials = relationship(
        "AgentCredential",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
    agent_roles = relationship(
        "AgentRole",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
    permission_overrides = relationship(
        "AgentPermissionOverride",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
