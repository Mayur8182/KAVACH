from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

from app.home.schemas.overview import HomeOverviewResponse, SecurityStateResponse
from app.home.schemas.attention import AttentionListResponse
from app.home.schemas.coverage import HomeCoverageResponse
from app.home.schemas.health import (
    HomeProductHealthResponse,
    HomeActivityResponse,
    HomeIncidentsResponse,
    HomeTrendsResponse,
)

from app.home.service.overview_service import HomeOverviewService
from app.home.service.attention_service import HomeAttentionService
from app.home.service.coverage_service import HomeCoverageService
from app.home.service.health_service import HomeHealthService
from app.home.service.activity_service import HomeActivityService
from app.home.service.trends_service import HomeTrendsService

router = APIRouter(prefix="/home", tags=["Thing Home & Security HQ"])


@router.get(
    "/overview",
    response_model=HomeOverviewResponse,
    summary="Get aggregated security overview summary",
)
async def get_home_overview(
    project_id: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    x_environment_id: Optional[str] = Header(None, alias="X-Environment-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeOverviewResponse:
    effective_project_id = project_id or x_project_id
    service = HomeOverviewService(db)
    return await service.get_overview(
        project_id=effective_project_id,
        organization_id=x_organization_id,
        environment_id=x_environment_id,
    )


@router.get(
    "/security-state",
    response_model=SecurityStateResponse,
    summary="Get deterministic overall security state",
)
async def get_security_state(
    project_id: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    x_environment_id: Optional[str] = Header(None, alias="X-Environment-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityStateResponse:
    effective_project_id = project_id or x_project_id
    service = HomeOverviewService(db)
    return await service.get_security_state(
        project_id=effective_project_id,
        organization_id=x_organization_id,
        environment_id=x_environment_id,
    )


@router.get(
    "/attention",
    response_model=AttentionListResponse,
    summary="Get critical items requiring attention",
)
async def get_critical_attention(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttentionListResponse:
    effective_project_id = project_id or x_project_id
    service = HomeAttentionService(db)
    return await service.list_attention_items(
        project_id=effective_project_id,
        severity=severity,
        limit=limit,
    )


@router.get(
    "/coverage",
    response_model=HomeCoverageResponse,
    summary="Get security coverage across products",
)
async def get_coverage(
    project_id: Optional[str] = Query(None),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    x_environment_id: Optional[str] = Header(None, alias="X-Environment-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeCoverageResponse:
    effective_project_id = project_id or x_project_id
    service = HomeCoverageService(db)
    return await service.get_coverage(
        project_id=effective_project_id,
        organization_id=x_organization_id,
        environment_id=x_environment_id,
    )


@router.get(
    "/product-health",
    response_model=HomeProductHealthResponse,
    summary="Get product telemetry and integration health",
)
async def get_product_health(
    project_id: Optional[str] = Query(None),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeProductHealthResponse:
    effective_project_id = project_id or x_project_id
    service = HomeHealthService(db)
    return await service.get_product_health(project_id=effective_project_id)


@router.get(
    "/activity",
    response_model=HomeActivityResponse,
    summary="Get recent security activities and audit events",
)
async def get_recent_activity(
    project_id: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=100),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeActivityResponse:
    effective_project_id = project_id or x_project_id
    service = HomeActivityService(db)
    return await service.get_recent_activity(
        project_id=effective_project_id,
        limit=limit,
    )


@router.get(
    "/incidents",
    response_model=HomeIncidentsResponse,
    summary="Get active incidents snapshot",
)
async def get_incident_snapshot(
    project_id: Optional[str] = Query(None),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeIncidentsResponse:
    effective_project_id = project_id or x_project_id
    service = HomeOverviewService(db)
    overview = await service.get_overview(project_id=effective_project_id)
    return HomeIncidentsResponse(
        open=overview.incidents.open,
        investigating=overview.incidents.investigating,
        contained=overview.incidents.contained,
        latest=None,
    )


@router.get(
    "/trends",
    response_model=HomeTrendsResponse,
    summary="Get security activity time-series trends",
)
async def get_trends(
    metric: str = Query("security_events"),
    days: int = Query(30, ge=7, le=90),
    project_id: Optional[str] = Query(None),
    x_project_id: Optional[str] = Header(None, alias="X-Project-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HomeTrendsResponse:
    effective_project_id = project_id or x_project_id
    service = HomeTrendsService(db)
    return await service.get_trends(
        metric=metric,
        project_id=effective_project_id,
        days=days,
    )
