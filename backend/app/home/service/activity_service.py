import uuid
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.home.schemas.health import ActivityItem, HomeActivityResponse


class HomeActivityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recent_activity(
        self,
        project_id: Optional[str] = None,
        limit: int = 15,
    ) -> HomeActivityResponse:
        proj_uuid = uuid.UUID(project_id) if project_id else None

        query = select(AuditEvent)
        if proj_uuid:
            query = query.where(AuditEvent.project_id == proj_uuid)
        query = query.order_by(desc(AuditEvent.timestamp)).limit(limit)

        events = (await self.db.execute(query)).scalars().all()

        items: List[ActivityItem] = []
        for e in events:
            # Determine human-friendly title
            action_label = e.action.replace(".", " ").title()
            title = f"{action_label} on {e.resource_type}"
            if e.error_message:
                title += f" (Failed)"

            items.append(
                ActivityItem(
                    id=str(e.id),
                    timestamp=e.timestamp,
                    title=title,
                    description=e.error_message or f"Operation performed on {e.resource_id or e.resource_type}",
                    actor=e.actor_id or e.actor_type,
                    action=e.action,
                    resource_type=e.resource_type,
                    resource_id=e.resource_id,
                    status=e.status,
                    severity="HIGH" if e.status != "SUCCESS" or "block" in e.action.lower() else "INFO",
                    metadata=e.event_metadata or {},
                )
            )

        return HomeActivityResponse(
            items=items,
            total=len(items),
        )
