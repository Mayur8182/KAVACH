"""
FastAPI REST routes for Step 14 Runtime Security Agent and Controlled Enforcement.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.response.schemas import (
    ResponseDryRunResponse,
    ResponseOverviewResponse,
    ResponseReverificationResponse,
    RuntimeEnforcementRuleResponse,
    SecurityIncidentDetailResponse,
    SecurityIncidentResponse,
    SecurityResponseActionApproveRequest,
    SecurityResponseActionCancelRequest,
    SecurityResponseActionCreate,
    SecurityResponseActionRejectRequest,
    SecurityResponseActionResponse,
    SecurityResponsePlanCreate,
    SecurityResponsePlanResponse,
)
from app.response.service import RuntimeResponseService
from app.core.security import get_current_user

router = APIRouter(tags=["Runtime Security Response"])


# =========================================================================
# 1. Response Plans
# =========================================================================

@router.post(
    "/projects/{project_id}/response-plans",
    response_model=SecurityResponsePlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_response_plan(
    project_id: uuid.UUID,
    payload: SecurityResponsePlanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    plan = await service.create_response_plan(
        project_id=project_id,
        request=payload,
        created_by=str(current_user.id),
    )
    return plan


@router.get(
    "/projects/{project_id}/response-plans",
    response_model=List[SecurityResponsePlanResponse],
)
async def list_response_plans(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    return await service.repo.list_plans(project_id)


# =========================================================================
# 2. Response Actions Lifecycle
# =========================================================================

@router.post(
    "/projects/{project_id}/responses",
    response_model=SecurityResponseActionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_response_action(
    project_id: uuid.UUID,
    payload: SecurityResponseActionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    try:
        action = await service.create_response(
            project_id=project_id,
            request=payload,
            requested_by_id=str(current_user.id),
            requested_by_type="USER",
        )
        return action
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/projects/{project_id}/responses",
    response_model=List[SecurityResponseActionResponse],
)
async def list_response_actions(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    target_type: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    return await service.repo.list_actions(
        project_id=project_id,
        status=status_filter,
        target_type=target_type,
        action_type=action_type,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/responses/{response_id}",
    response_model=SecurityResponseActionResponse,
)
async def get_response_action(
    response_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    action = await service.repo.get_action_by_id(response_id)
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Response action not found.")
    return action


@router.post(
    "/responses/{response_id}/execute",
    response_model=SecurityResponseActionResponse,
)
async def execute_response_action(
    response_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    try:
        return await service.execute_response(
            action_id=response_id,
            actor_id=str(current_user.id),
            actor_type="USER",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/responses/{response_id}/approve",
)
async def approve_response_action(
    response_id: uuid.UUID,
    payload: SecurityResponseActionApproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    res = await service.approve_response(
        action_id=response_id,
        approver_id=str(current_user.id),
        reason=payload.reason,
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message"))
    return res


@router.post(
    "/responses/{response_id}/reject",
)
async def reject_response_action(
    response_id: uuid.UUID,
    payload: SecurityResponseActionRejectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    res = await service.reject_response(
        action_id=response_id,
        approver_id=str(current_user.id),
        reason=payload.reason,
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message"))
    return res


@router.post(
    "/responses/{response_id}/cancel",
    response_model=SecurityResponseActionResponse,
)
async def cancel_response_action(
    response_id: uuid.UUID,
    payload: SecurityResponseActionCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    try:
        return await service.cancel_response(
            action_id=response_id,
            canceller_id=str(current_user.id),
            reason=payload.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/responses/{response_id}/simulate",
    response_model=ResponseDryRunResponse,
)
async def simulate_response_action(
    response_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    try:
        return await service.dry_run_response(response_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/responses/{response_id}/reverify",
    response_model=ResponseReverificationResponse,
)
async def reverify_response_action(
    response_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    try:
        return await service.reverify_response(response_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# =========================================================================
# 3. Active Enforcement Rules
# =========================================================================

@router.get(
    "/projects/{project_id}/enforcement",
    response_model=List[RuntimeEnforcementRuleResponse],
)
async def list_enforcement_rules(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    return await service.enforcement_manager.list_active_rules(project_id)


@router.post(
    "/enforcement/{enforcement_id}/revoke",
    response_model=RuntimeEnforcementRuleResponse,
)
async def revoke_enforcement_rule(
    enforcement_id: uuid.UUID,
    reason: str = Query("Revoked by operator", min_length=3),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    rule = await service.enforcement_manager.revoke_rule(enforcement_id, reason)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enforcement rule not found.")
    return rule


# =========================================================================
# 4. Security Incidents & Overview
# =========================================================================

@router.get(
    "/projects/{project_id}/responses/overview",
    response_model=ResponseOverviewResponse,
)
async def get_response_overview(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    return await service.get_overview(project_id)


@router.get(
    "/projects/{project_id}/incidents",
    response_model=List[SecurityIncidentResponse],
)
async def list_incidents(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    return await service.incident_service.list_incidents(project_id, status=status_filter)


@router.get(
    "/incidents/{incident_id}",
    response_model=SecurityIncidentDetailResponse,
)
async def get_incident(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RuntimeResponseService(db)
    incident = await service.incident_service.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    events_data = [{"id": str(e.id), "event_type": e.event_type, "event_id": e.event_id, "created_at": e.created_at.isoformat()} for e in incident.events]

    return SecurityIncidentDetailResponse(
        id=incident.id,
        project_id=incident.project_id,
        title=incident.title,
        status=incident.status,
        severity=incident.severity,
        first_detected_at=incident.first_detected_at,
        last_detected_at=incident.last_detected_at,
        primary_violation_id=incident.primary_violation_id,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        events=events_data,
        violations=[],
        actions=[],
    )
