"""
SQLAlchemy models for Step 13 — Runtime Evidence & Continuous Verification Engine.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class RuntimeEvidence(Base):
    """
    Normalized, tamper-evident record of an actual runtime event
    originating from real application, agent, MCP, or infrastructure sources.
    """
    __tablename__ = "runtime_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Idempotent event ID",
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="MCP | APPLICATION | OPEN_TELEMETRY | AUDIT_LOG | CONTAINER | KUBERNETES | GITHUB etc.",
    )
    source_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Identifier of the emitting component or agent",
    )
    source_event_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Original upstream event ID if provided",
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="AUTHENTICATION | AUTHORIZATION | AGENT_ACTION | MCP_TOOL_CALL | API_REQUEST etc.",
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Exact timestamp when the event actually occurred at runtime",
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
        comment="Timestamp when the control plane ingested the event",
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    subject_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    action_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    trace_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    span_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="production")
    classification: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="INTERNAL")
    trust_level: Mapped[str] = mapped_column(String(50), nullable=False, default="VALIDATED")
    timestamp_quality: Mapped[str] = mapped_column(String(50), nullable=False, default="SOURCE_REPORTED")

    normalized_payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Canonical normalized representation of the runtime event",
    )
    raw_payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Original unmodified ingested payload (redacted of plaintext secrets)",
    )
    payload_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="SHA-256 hash of canonical normalized payload for tamper evidence",
    )
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    collector_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="RECEIVED",
        comment="RECEIVED | VALIDATED | NORMALIZED | PROCESSED | REJECTED | QUARANTINED | EXPIRED",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    correlations: Mapped[List["EvidenceCorrelation"]] = relationship(
        "EvidenceCorrelation",
        back_populates="evidence",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_runtime_evidence_project_occurred", "project_id", "occurred_at"),
        Index("ix_runtime_evidence_dedup", "project_id", "source_id", "source_event_id"),
        Index("ix_runtime_evidence_type_time", "event_type", "occurred_at"),
    )


class RuntimeEvidenceSource(Base, TimestampMixin):
    """
    Configured source of runtime telemetry / evidence.
    Tracks live collection health, status, and processing lag.
    """
    __tablename__ = "runtime_evidence_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="MCP | OPEN_TELEMETRY | APPLICATION | GITHUB | CONTAINER | KUBERNETES",
    )
    configuration: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Configuration references (NO plaintext secrets)",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NOT_CONFIGURED",
        comment="ACTIVE | PAUSED | ERROR | NOT_CONFIGURED | DISCONNECTED",
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_event_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    checkpoints: Mapped[List["EvidenceCheckpoint"]] = relationship(
        "EvidenceCheckpoint",
        back_populates="source",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_evidence_sources_project_status", "project_id", "status"),
    )


class EvidenceCheckpoint(Base):
    """
    Persisted ingestion cursor and checkpoint per evidence source.
    Enables crash recovery, replay prevention, and resumption.
    """
    __tablename__ = "evidence_checkpoints"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runtime_evidence_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cursor: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    last_event_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    checkpoint_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    source: Mapped["RuntimeEvidenceSource"] = relationship(
        "RuntimeEvidenceSource",
        back_populates="checkpoints",
    )


class EvidenceCorrelation(Base):
    """
    Deterministic correlation between evidence records and workflows/sessions/traces
    (Trace ID, Span ID, Request ID, Agent Action, Delegation ID, Commit SHA, Tool Execution).
    """
    __tablename__ = "evidence_correlations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("runtime_evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    correlation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="REQUEST | SESSION | TRACE | SPAN | AGENT_ACTION | DELEGATION | MCP_EXECUTION",
    )
    correlation_key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="The exact correlation identifier e.g. trace_id, request_id, delegation_id",
    )
    related_resource_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    related_resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    evidence: Mapped["RuntimeEvidence"] = relationship(
        "RuntimeEvidence",
        back_populates="correlations",
    )

    __table_args__ = (
        Index("ix_evidence_corr_key_proj", "project_id", "correlation_key"),
    )
