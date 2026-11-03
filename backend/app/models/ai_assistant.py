import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIConversation(Base, TimestampMixin):
    """
    Persisted AI conversation session scoped to a user and project/workspace.
    Enforces strict tenant isolation.
    """
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="New Security Consultation",
    )
    context_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Relationships
    messages = relationship(
        "AIMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AIMessage.created_at",
    )
    actions = relationship(
        "AIActionExecution",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class AIMessage(Base):
    """
    Individual message inside an AI Security Assistant conversation.
    Supports structured findings, diffs, tool outputs, and action proposals.
    """
    __tablename__ = "ai_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # 'user', 'assistant', 'agent', 'system'
    )
    agent_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,  # e.g., 'sast_agent', 'iac_agent', 'orchestrator'
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    attachments: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    structured_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,  # findings, diff, execution_plan, scanner_status, etc.
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    conversation = relationship(
        "AIConversation",
        back_populates="messages",
    )


class AIActionExecution(Base, TimestampMixin):
    """
    Deterministic Action Execution plan governed by policy & human-in-the-loop approvals.
    Prevents unauthorized tool execution by AI.
    """
    __tablename__ = "ai_action_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,  # e.g., 'TRIGGER_SCAN', 'APPLY_PATCH', 'CREATE_POLICY', 'INVITE_USER'
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING_APPROVAL",  # PENDING_APPROVAL, APPROVED, EXECUTING, COMPLETED, FAILED, REJECTED
    )
    requires_approval: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="MEDIUM",  # LOW, MEDIUM, HIGH, CRITICAL
    )
    plan: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,  # steps, target_resources, safety_checks
    )
    result: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,  # scan_id, diff, execution_summary, error
    )
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    conversation = relationship(
        "AIConversation",
        back_populates="actions",
    )
