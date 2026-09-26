import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.repositories.audit_repository import AuditRepository


class AuditService:
    """Service orchestrating immutable audit logging for security governance."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AuditRepository(db)

    async def log_event(
        self,
        action: str,
        resource_type: str,
        actor_type: str = "user",
        actor_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        project_id: Optional[uuid.UUID] = None,
        status: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuditEvent:
        event = AuditEvent(
            action=action,
            resource_type=resource_type,
            actor_type=actor_type,
            actor_id=str(actor_id) if actor_id else None,
            resource_id=str(resource_id) if resource_id else None,
            project_id=project_id,
            status=status,
            event_metadata=metadata or {},
            error_message=error_message,
        )
        return await self.repo.create(event)

    async def list_events(
        self,
        project_id: Optional[uuid.UUID] = None,
        actor_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditEvent]:
        return await self.repo.list_events(
            project_id=project_id,
            actor_id=actor_id,
            limit=limit,
            offset=offset,
        )
