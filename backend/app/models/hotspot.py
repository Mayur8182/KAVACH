import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class GUID(TypeDecorator):
    """Platform-independent GUID type compatible with PostgreSQL and SQLite."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        try:
            return str(uuid.UUID(str(value)))
        except Exception:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except Exception:
            return value


class Hotspot(Base, TimestampMixin):
    """
    Security Hotspot model representing a security-sensitive code location requiring manual review.
    Security Hotspots are NOT confirmed vulnerabilities — they require human security assessment.
    """
    __tablename__ = "hotspots"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    repository_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    repository_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default="frontend-app",
        index=True,
    )
    scan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    finding_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )

    rule_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # CRITICAL, HIGH, MEDIUM, LOW
        index=True,
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # Critical, High, Medium, Low
        default="High",
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,  # Command Injection, Cryptography, Authentication, Input Validation, etc.
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
    )
    branch: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="main",
        index=True,
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    start_line: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    end_line: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    code_snippet: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="TO_REVIEW",  # TO_REVIEW, ACKNOWLEDGED, SAFE, FALSE_POSITIVE, FIXED
        index=True,
    )

    assignee_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    assignee_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    author: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default="mayur.bharvad",
    )

    review_comment: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    tags: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    cwe: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    owasp: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    cvss_score: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    confidence: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="High",
    )
    exploit_maturity: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="High",
    )
    references: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    comments: Mapped[List["HotspotComment"]] = relationship(
        "HotspotComment",
        back_populates="hotspot",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="HotspotComment.created_at.desc()",
    )
    history: Mapped[List["HotspotHistory"]] = relationship(
        "HotspotHistory",
        back_populates="hotspot",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="HotspotHistory.created_at.desc()",
    )


class HotspotComment(Base):
    """Comment posted during a security hotspot manual code review."""
    __tablename__ = "hotspot_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    hotspot_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("hotspots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    user_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Security Reviewer",
    )
    comment: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        server_default=func.now(),
        nullable=False,
    )

    hotspot: Mapped["Hotspot"] = relationship("Hotspot", back_populates="comments")


class HotspotHistory(Base):
    """Complete audit timeline event for a Security Hotspot review action."""
    __tablename__ = "hotspot_history"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    hotspot_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("hotspots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # CREATED, ASSIGNED, ACKNOWLEDGED, MARK_SAFE, FALSE_POSITIVE, COMMENTED, STATUS_CHANGED, FIXED
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    user_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default="system",
    )
    status_at_event: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        server_default=func.now(),
        nullable=False,
    )

    hotspot: Mapped["Hotspot"] = relationship("Hotspot", back_populates="history")


class HotspotRule(Base):
    """Security Hotspot detection rule definition stored in the database."""
    __tablename__ = "hotspot_rules"

    id: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    patterns: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    risk_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    remediation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    cwe: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    owasp: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    cvss_score: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    references: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        server_default=func.now(),
        nullable=False,
    )
