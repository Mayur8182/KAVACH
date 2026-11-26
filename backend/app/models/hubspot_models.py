"""HubSpot CRM Integration database models.

Follows strict production engineering rules:
- Zero hardcoded data
- Real database persistence in PostgreSQL / SQLite
- Traceable audit evidence for all CRM synchronization operations
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class HubspotSyncLog(Base, TimestampMixin):
    """Authoritative audit log of all outbound HubSpot CRM synchronizations."""
    __tablename__ = "hubspot_sync_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,  # 'CONTACT', 'COMPANY', 'DEAL', 'TICKET'
    )
    internal_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hubspot_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    operation: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # 'CREATE', 'UPDATE', 'UPSERT', 'ASSOCIATE'
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,  # 'SUCCESS', 'FAILED', 'PENDING'
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)

