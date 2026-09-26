import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.blueprint import (
    BlueprintComparisonResponse,
    BlueprintCreateRequest,
    SecurityBlueprintResponse,
    SecurityRequirementResponse,
)
from app.services.blueprint_service import BlueprintService

router = APIRouter(tags=["Security Blueprints"])


def _to_blueprint_response(blueprint) -> SecurityBlueprintResponse:
    requirements_data = [
        SecurityRequirementResponse.model_validate(r)
        for r in getattr(blueprint, "requirements", [])
    ]
    return SecurityBlueprintResponse(
        id=blueprint.id,
        project_id=blueprint.project_id,
        intent_id=blueprint.intent_id,
        version=blueprint.version,
        status=blueprint.status,
        methodology_version=blueprint.methodology_version,
        generated_by=blueprint.generated_by,
        risk_factors=blueprint.risk_factors,
        created_at=blueprint.created_at,
        updated_at=blueprint.updated_at,
        requirement_count=len(requirements_data),
        requirements=requirements_data,
    )


@router.post(
    "/projects/{project_id}/blueprints",
    response_model=SecurityBlueprintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Dynamic Security Blueprint",
    description="Derives context-aware security requirements from analyzed application intent.",
)
async def generate_blueprint(
    project_id: uuid.UUID,
    payload: Optional[BlueprintCreateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_request_id: Optional[str] = Header(None),
) -> SecurityBlueprintResponse:
    service = BlueprintService(db)
    intent_id = payload.intent_id if payload else None
    blueprint = await service.generate_blueprint(
        project_id=project_id,
        current_user=current_user,
        intent_id=intent_id,
        request_id=x_request_id,
    )
    return _to_blueprint_response(blueprint)


@router.get(
    "/projects/{project_id}/blueprints",
    response_model=List[SecurityBlueprintResponse],
    summary="List Security Blueprints for Project",
    description="Retrieves all versioned security blueprints generated for the specified project.",
)
async def list_project_blueprints(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecurityBlueprintResponse]:
    service = BlueprintService(db)
    blueprints = await service.list_blueprints_for_project(project_id, current_user)
    return [_to_blueprint_response(b) for b in blueprints]


@router.get(
    "/blueprints/compare",
    response_model=BlueprintComparisonResponse,
    summary="Compare Two Blueprint Versions",
    description="Calculates detailed diff between two security blueprint versions.",
)
async def compare_blueprints(
    v1: uuid.UUID = Query(..., description="First blueprint UUID"),
    v2: uuid.UUID = Query(..., description="Second blueprint UUID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlueprintComparisonResponse:
    service = BlueprintService(db)
    return await service.compare_blueprints(v1, v2, current_user)


@router.get(
    "/blueprints/{blueprint_id}",
    response_model=SecurityBlueprintResponse,
    summary="Get Security Blueprint Details",
    description="Retrieves a complete security blueprint including all derived requirements, evidence, and dependencies.",
)
async def get_blueprint(
    blueprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityBlueprintResponse:
    service = BlueprintService(db)
    blueprint = await service.get_blueprint(blueprint_id, current_user)
    return _to_blueprint_response(blueprint)


@router.get(
    "/blueprints/{blueprint_id}/requirements",
    response_model=List[SecurityRequirementResponse],
    summary="Get Blueprint Security Requirements",
    description="Lists all security requirements for a given blueprint with trace evidence.",
)
async def get_blueprint_requirements(
    blueprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecurityRequirementResponse]:
    service = BlueprintService(db)
    reqs = await service.get_requirements(blueprint_id, current_user)
    return [SecurityRequirementResponse.model_validate(r) for r in reqs]


@router.post(
    "/blueprints/{blueprint_id}/regenerate",
    response_model=SecurityBlueprintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Regenerate Security Blueprint",
    description="Creates a new blueprint version from current or specified intent, marking the prior version superseded.",
)
async def regenerate_blueprint(
    blueprint_id: uuid.UUID,
    payload: Optional[BlueprintCreateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_request_id: Optional[str] = Header(None),
) -> SecurityBlueprintResponse:
    service = BlueprintService(db)
    intent_id = payload.intent_id if payload else None
    new_blueprint = await service.regenerate_blueprint(
        blueprint_id=blueprint_id,
        current_user=current_user,
        intent_id=intent_id,
        request_id=x_request_id,
    )
    return _to_blueprint_response(new_blueprint)
