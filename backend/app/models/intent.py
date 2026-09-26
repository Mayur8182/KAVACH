import uuid
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import Float, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class Intent(Base, TimestampMixin):
    """
    Persisted developer intent record capturing both the raw developer prompt
    and the normalized architectural characteristics.
    """
    __tablename__ = "intents"

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
    # The raw original developer instruction must be preserved verbatim for traceability
    raw_input: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="development",
    )
    application_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="UNKNOWN",
        index=True,
    )
    purpose: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    # Complete normalized structured intent representation
    normalized_intent: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ANALYZED",
    )
    provider: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="deterministic",
    )
    model_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    overall_confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="intents",
    )
