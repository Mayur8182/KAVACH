"""
Thing Control Plane — Background Task Queue Database Model
Adheres strictly to AGENTS.md Rule 12:
"Real asynchronous jobs must not fake completion.
Use real background workers and track states: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED."
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import BigInteger, Column, DateTime, Integer, JSON, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class BackgroundTask(Base):
    __tablename__ = "background_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    tenant_name = Column(String(255), nullable=True)
    provision_type = Column(String(100), nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    # Task categorization (e.g., CONTAINER_TRIVY_SCAN, SBOM_SYFT_GENERATE, REPOSITORY_SCAN, ATTACK_DAST_SIMULATION, TENANT_PROVISIONING)
    task_type = Column(String(80), nullable=False, index=True)
    
    # Strict AGENTS.md Rule 12 states: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    status = Column(String(30), nullable=False, default="QUEUED", index=True)
    
    # Execution priority (0 = Normal, 5 = High, 10 = Urgent)
    priority = Column(Integer, default=0, nullable=False, index=True)
    
    # Progress tracking (0 - 100%) and current step message
    progress_percent = Column(Integer, default=0, nullable=False)
    current_step = Column(String(255), nullable=True)
    
    # Input parameters and execution result payloads
    payload = Column(JSON, default=dict, nullable=False)
    result = Column(JSON, default=dict, nullable=False)
    
    # Failure diagnostics (Rule 11: Never hide errors)
    error_message = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    
    # Worker identifier and timestamps
    worker_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(BigInteger, nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "project_id": str(self.project_id) if self.project_id else None,
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "tenant_name": self.tenant_name,
            "provision_type": self.provision_type or self.task_type,
            "retry_count": self.retry_count or 0,
            "task_type": self.task_type,
            "status": self.status,
            "priority": self.priority,
            "progress_percent": self.progress_percent,
            "current_step": self.current_step,
            "payload": self.payload or {},
            "result": self.result or {},
            "error_message": self.error_message,
            "exit_code": self.exit_code,
            "worker_id": self.worker_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
        }
