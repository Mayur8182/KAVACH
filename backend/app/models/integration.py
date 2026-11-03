import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

def now_utc():
    return datetime.now(timezone.utc)

class Integration(Base):
    __tablename__ = "integrations"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)  # "github", "aws", "gcp", "azure"
    
    # Credentials (should be encrypted in a real production system, storing as plain text / json for now)
    credentials_json: Mapped[str] = mapped_column(Text, default="{}")
    
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)
