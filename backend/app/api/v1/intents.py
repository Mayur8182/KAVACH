import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.intent import IntentResponse, IntentSubmitRequest
from app.services.intent_service import IntentService

router = APIRouter(prefix="/intents", tags=["Intent Understanding Engine"])


@router.post(
    "",
    response_model=IntentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit developer intent for architectural analysis",
    description=(
        "Analyzes raw natural-language developer intent, normalizes application characteristics, "
        "detects ambiguities, preserves original input verbatim, and persists the analysis in PostgreSQL."
    ),
)
async def submit_intent(
    payload: IntentSubmitRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntentResponse:
    request_id = getattr(request.state, "request_id", None)
    service = IntentService(db)
    intent = await service.analyze_and_create(
        payload=payload,
        current_user=current_user,
        request_id=request_id,
    )
    return IntentResponse.model_validate(intent)


@router.get(
    "/{intent_id}",
    response_model=IntentResponse,
    summary="Retrieve intent analysis by ID",
    description="Fetches a persisted intent analysis record after enforcing project ownership validation.",
)
async def get_intent(
    intent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> IntentResponse:
    service = IntentService(db)
    intent = await service.get_intent(intent_id=intent_id, current_user=current_user)
    return IntentResponse.model_validate(intent)


@router.get(
    "/project/{project_id}",
    response_model=List[IntentResponse],
    summary="List intent analyses for a project",
    description="Retrieves historical intent analyses recorded for a specific project.",
)
async def list_project_intents(
    project_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[IntentResponse]:
    service = IntentService(db)
    intents = await service.list_intents_for_project(
        project_id=project_id,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )
    return [IntentResponse.model_validate(i) for i in intents]
