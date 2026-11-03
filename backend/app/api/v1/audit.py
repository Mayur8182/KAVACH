import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import AuditService

router = APIRouter(tags=["Audit Trail"])


@router.get(
    "/audit-events",
    response_model=List[AuditEventResponse],
    summary="Query audit events",
    description="Retrieves persisted security and administrative audit events from PostgreSQL.",
)
@router.get(
    "/audit",
    response_model=List[AuditEventResponse],
    summary="Query audit events alias",
    description="Retrieves persisted security and administrative audit events from PostgreSQL.",
)
async def list_audit_events(
    project_id: Optional[uuid.UUID] = Query(default=None, description="Filter by project ID"),
    actor_id: Optional[str] = Query(default=None, description="Filter by actor ID"),
    action: Optional[str] = Query(default=None, description="Filter by action"),
    action_type: Optional[str] = Query(default=None, description="Filter by action type"),
    resource_type: Optional[str] = Query(default=None, description="Filter by resource type"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AuditEventResponse]:
    service = AuditService(db)
    resolved_action = action or action_type
    events = await service.list_events(
        project_id=project_id,
        actor_id=actor_id,
        action=resolved_action,
        resource_type=resource_type,
        limit=limit,
        offset=offset,
    )
    return [AuditEventResponse.model_validate(e) for e in events]
