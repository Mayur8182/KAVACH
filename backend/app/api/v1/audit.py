import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit-events", tags=["Audit Trail"])


@router.get(
    "",
    response_model=List[AuditEventResponse],
    summary="Query audit events",
    description="Retrieves persisted security and administrative audit events from PostgreSQL.",
)
async def list_audit_events(
    project_id: Optional[uuid.UUID] = Query(default=None, description="Filter by project ID"),
    actor_id: Optional[str] = Query(default=None, description="Filter by actor ID"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AuditEventResponse]:
    service = AuditService(db)
    # If not superuser, restrict to events related to user or projects
    target_actor = actor_id if current_user.is_superuser else str(current_user.id)
    events = await service.list_events(
        project_id=project_id,
        actor_id=target_actor,
        limit=limit,
        offset=offset,
    )
    return [AuditEventResponse.model_validate(e) for e in events]
