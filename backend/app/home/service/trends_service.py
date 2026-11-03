import uuid
from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.home.schemas.health import HomeTrendsResponse, TrendPoint


class HomeTrendsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_trends(
        self,
        metric: str = "security_events",
        project_id: Optional[str] = None,
        days: int = 30,
    ) -> HomeTrendsResponse:
        proj_uuid = uuid.UUID(project_id) if project_id else None

        # Group audit events by date
        date_trunc = func.date(AuditEvent.timestamp)
        query = select(date_trunc, func.count(AuditEvent.id))
        if proj_uuid:
            query = query.where(AuditEvent.project_id == proj_uuid)
        query = query.group_by(date_trunc).order_by(date_trunc)

        records = (await self.db.execute(query)).all()

        points = [TrendPoint(timestamp=str(row[0]), value=row[1]) for row in records if row[0] is not None]

        # Section 29: Rule: Only return has_sufficient_data=True if >= 3 data points exist
        has_sufficient = len(points) >= 3

        return HomeTrendsResponse(
            metric=metric,
            window=f"{days}d",
            points=points if has_sufficient else [],
            has_sufficient_data=has_sufficient,
            explanation=None if has_sufficient else "Not enough historical observations to compute a reliable trend.",
        )
