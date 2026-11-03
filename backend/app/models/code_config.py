import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

def now_utc():
    return datetime.now(timezone.utc)

class CodeSecurityConfig(Base):
    __tablename__ = "code_security_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # iac, sast, secrets, sca, sbom, security_gates, general
    provider: Mapped[str] = mapped_column(String(50), default="AWS")  # AWS, Azure, GCP, MULTI_CLOUD
    frameworks: Mapped[List[str]] = mapped_column(JSON, default=list)  # ["terraform", "kubernetes", "cloudformation", "helm"]
    triggers: Mapped[List[str]] = mapped_column(JSON, default=list)  # ["push", "pull_request", "scheduled"]
    severity_threshold: Mapped[str] = mapped_column(String(50), default="CRITICAL")  # CRITICAL, HIGH, MEDIUM, LOW
    fail_ci_threshold: Mapped[str] = mapped_column(String(50), default="CRITICAL_AND_HIGH")  # CRITICAL_AND_HIGH, CRITICAL_ONLY, ANY
    exclusions: Mapped[List[str]] = mapped_column(JSON, default=list)  # ["tests/**", ".github/**"]
    status: Mapped[str] = mapped_column(String(50), default="CONFIGURED")  # CONFIGURED, NOT_CONFIGURED, TESTING, FAILED
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_scan_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    test_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    settings_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
