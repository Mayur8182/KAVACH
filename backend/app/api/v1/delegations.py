import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.delegation.errors import DelegationError
from app.delegation.schemas import (
    AuthorityChainResponse,
    AuthorityGraphResponse,
    DelegationCreateRequest,
    DelegationResponse,
    EffectiveAuthorityResponse,
)
from app.delegation.service import DelegationService
from app.models.delegation import AgentDelegation
from app.models.user import User

router = APIRouter(tags=["Delegations & Authority Graph"])


@router.post(
    "/agents/{agent_id}/delegations",
    response_model=DelegationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create agent-to-agent delegation",
)
async def create_agent_delegation(
    agent_id: uuid.UUID,
    payload: DelegationCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DelegationResponse:
    service = DelegationService(db)
    try:
        delegation = await service.create_delegation(
            delegator_agent_id=agent_id,
            request=payload,
            actor_id=str(current_user.id),
            actor_type="USER",
        )
        return DelegationResponse.model_validate(delegation)
    except DelegationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"reason_code": e.reason_code, "message": str(e)},
        )


@router.get(
    "/agents/{agent_id}/delegations",
    response_model=List[DelegationResponse],
    summary="List active delegations for an agent",
)
async def list_agent_delegations(
    agent_id: uuid.UUID,
    direction: str = Query(default="all", description="outgoing | incoming | all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DelegationResponse]:
    query = select(AgentDelegation)
    if direction == "outgoing":
        query = query.where(AgentDelegation.delegator_agent_id == agent_id)
    elif direction == "incoming":
        query = query.where(AgentDelegation.delegate_agent_id == agent_id)
    else:
        query = query.where(
            (AgentDelegation.delegator_agent_id == agent_id)
            | (AgentDelegation.delegate_agent_id == agent_id)
        )

    query = query.order_by(AgentDelegation.created_at.desc())
    records = (await db.execute(query)).scalars().all()
    return [DelegationResponse.model_validate(r) for r in records]


@router.get(
    "/delegations/{delegation_id}",
    response_model=DelegationResponse,
    summary="Get delegation details by ID",
)
async def get_delegation(
    delegation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DelegationResponse:
    query = select(AgentDelegation).where(AgentDelegation.id == delegation_id)
    delegation = (await db.execute(query)).scalar_one_or_none()
    if not delegation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delegation not found")
    return DelegationResponse.model_validate(delegation)


@router.post(
    "/delegations/{delegation_id}/approve",
    response_model=DelegationResponse,
    summary="Approve pending delegation",
)
async def approve_delegation(
    delegation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DelegationResponse:
    query = select(AgentDelegation).where(AgentDelegation.id == delegation_id)
    delegation = (await db.execute(query)).scalar_one_or_none()
    if not delegation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delegation not found")

    delegation.status = "ACTIVE"
    await db.commit()
    await db.refresh(delegation)
    return DelegationResponse.model_validate(delegation)


@router.post(
    "/delegations/{delegation_id}/reject",
    response_model=DelegationResponse,
    summary="Reject pending delegation",
)
async def reject_delegation(
    delegation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DelegationResponse:
    query = select(AgentDelegation).where(AgentDelegation.id == delegation_id)
    delegation = (await db.execute(query)).scalar_one_or_none()
    if not delegation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delegation not found")

    delegation.status = "REJECTED"
    await db.commit()
    await db.refresh(delegation)
    return DelegationResponse.model_validate(delegation)


@router.post(
    "/delegations/{delegation_id}/revoke",
    response_model=Dict[str, Any],
    summary="Revoke delegation and cascade to dependents",
)
async def revoke_delegation(
    delegation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = DelegationService(db)
    try:
        revoked_ids = await service.revoke_delegation(
            delegation_id=delegation_id,
            actor_id=str(current_user.id),
            reason="User initiated revocation",
        )
        return {
            "message": f"Delegation '{delegation_id}' and {len(revoked_ids) - 1} dependent delegations revoked.",
            "revoked_delegation_ids": [str(d) for d in revoked_ids],
        }
    except DelegationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/projects/{project_id}/authority-graph",
    response_model=AuthorityGraphResponse,
    summary="Get project-scoped authority graph",
)
async def get_project_authority_graph(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthorityGraphResponse:
    service = DelegationService(db)
    return await service.get_project_authority_graph(project_id)


@router.get(
    "/agents/{agent_id}/authority-chain",
    response_model=AuthorityChainResponse,
    summary="Reconstruct upstream authority chain for an agent",
)
async def get_agent_authority_chain(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthorityChainResponse:
    service = DelegationService(db)
    try:
        return await service.reconstruct_authority_chain(agent_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/agents/{agent_id}/effective-authority",
    response_model=EffectiveAuthorityResponse,
    summary="Get complete effective authority profile with provenance",
)
async def get_agent_effective_authority(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EffectiveAuthorityResponse:
    service = DelegationService(db)
    try:
        return await service.get_effective_authority(agent_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/delegations/{delegation_id}/dependents",
    response_model=List[DelegationResponse],
    summary="List all dependent delegations in subtree",
)
async def get_delegation_dependents(
    delegation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DelegationResponse]:
    query = (
        select(AgentDelegation)
        .where(AgentDelegation.parent_delegation_id == delegation_id)
        .order_by(AgentDelegation.created_at.desc())
    )
    records = (await db.execute(query)).scalars().all()
    return [DelegationResponse.model_validate(r) for r in records]
