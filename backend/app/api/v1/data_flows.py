import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.delegation.errors import DataFlowBlockedError, SecretDataFlowForbiddenError
from app.delegation.schemas import DataFlowCreateRequest, DataFlowResponse
from app.delegation.service import DelegationService
from app.models.delegation import AgentDataFlow
from app.models.user import User

router = APIRouter(tags=["Agent Data-Flow Control"])


@router.post(
    "/agents/{agent_id}/data-flows",
    response_model=DataFlowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request and evaluate an inter-agent data flow",
)
async def request_data_flow(
    agent_id: uuid.UUID,
    payload: DataFlowCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataFlowResponse:
    service = DelegationService(db)
    try:
        flow = await service.evaluate_data_flow(
            source_agent_id=agent_id,
            request=payload,
            actor_id=str(current_user.id),
        )
        return DataFlowResponse.model_validate(flow)
    except (DataFlowBlockedError, SecretDataFlowForbiddenError) as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"reason_code": getattr(e, "reason_code", "DATA_FLOW_FORBIDDEN"), "message": str(e)},
        )


@router.get(
    "/agents/{agent_id}/data-flows",
    response_model=List[DataFlowResponse],
    summary="List data flows associated with an agent (inbound or outbound)",
)
async def list_agent_data_flows(
    agent_id: uuid.UUID,
    direction: str = Query("ALL", pattern="^(INBOUND|OUTBOUND|ALL)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DataFlowResponse]:
    query = select(AgentDataFlow).options(
        selectinload(AgentDataFlow.source_agent),
        selectinload(AgentDataFlow.destination_agent),
    )
    if direction == "OUTBOUND":
        query = query.where(AgentDataFlow.source_agent_id == agent_id)
    elif direction == "INBOUND":
        query = query.where(AgentDataFlow.destination_agent_id == agent_id)
    else:
        query = query.where(
            or_(
                AgentDataFlow.source_agent_id == agent_id,
                AgentDataFlow.destination_agent_id == agent_id,
            )
        )

    flows = (await db.execute(query.order_by(AgentDataFlow.created_at.desc()))).scalars().all()
    return [DataFlowResponse.model_validate(f) for f in flows]


@router.get(
    "/data-flows/{flow_id}",
    response_model=DataFlowResponse,
    summary="Get single data flow record",
)
async def get_data_flow(
    flow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataFlowResponse:
    stmt = (
        select(AgentDataFlow)
        .options(
            selectinload(AgentDataFlow.source_agent),
            selectinload(AgentDataFlow.destination_agent),
        )
        .where(AgentDataFlow.id == flow_id)
    )
    flow = (await db.execute(stmt)).scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data flow record not found.")
    return DataFlowResponse.model_validate(flow)


@router.post(
    "/data-flows/{flow_id}/approve",
    response_model=DataFlowResponse,
    summary="Approve pending data flow",
)
async def approve_data_flow(
    flow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataFlowResponse:
    stmt = select(AgentDataFlow).where(AgentDataFlow.id == flow_id)
    flow = (await db.execute(stmt)).scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data flow not found.")
    
    flow.status = "ALLOWED"
    flow.decision = "ALLOW"
    flow.reason = f"Approved by governance user: {current_user.email}"
    await db.commit()
    await db.refresh(flow)
    return DataFlowResponse.model_validate(flow)


@router.post(
    "/data-flows/{flow_id}/deny",
    response_model=DataFlowResponse,
    summary="Deny pending data flow",
)
async def deny_data_flow(
    flow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataFlowResponse:
    stmt = select(AgentDataFlow).where(AgentDataFlow.id == flow_id)
    flow = (await db.execute(stmt)).scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data flow not found.")

    flow.status = "DENIED"
    flow.decision = "DENY"
    flow.reason = f"Denied by governance user: {current_user.email}"
    await db.commit()
    await db.refresh(flow)
    return DataFlowResponse.model_validate(flow)


@router.post(
    "/data-flows/{flow_id}/revoke",
    response_model=DataFlowResponse,
    summary="Revoke previously allowed data flow",
)
async def revoke_data_flow(
    flow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataFlowResponse:
    stmt = select(AgentDataFlow).where(AgentDataFlow.id == flow_id)
    flow = (await db.execute(stmt)).scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data flow not found.")

    flow.status = "REVOKED"
    flow.decision = "DENY"
    flow.reason = f"Revoked by governance user: {current_user.email}"
    await db.commit()
    await db.refresh(flow)
    return DataFlowResponse.model_validate(flow)
