from datetime import datetime, timezone
from fastapi import APIRouter, Response, status

from app.core.config import get_settings
from app.core.database import check_database_connection
from app.schemas.health import (
    DependencyHealth,
    HealthResponse,
    LivenessResponse,
    ReadinessResponse,
)

router = APIRouter(prefix="/health", tags=["Health & Readiness"])
settings = get_settings()


@router.get(
    "/live",
    response_model=LivenessResponse,
    summary="Process liveness probe",
    description="Returns HTTP 200 if the FastAPI application process is alive and responsive.",
)
async def check_liveness() -> LivenessResponse:
    """Checks whether the web process is running."""
    return LivenessResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc),
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Infrastructure readiness probe",
    description="Verifies connectivity to critical external dependencies (PostgreSQL). Returns 503 if dependencies fail.",
)
async def check_readiness(response: Response) -> ReadinessResponse:
    """
    Checks infrastructure dependencies.
    Executes an actual ping to PostgreSQL. If the database is unreachable,
    sets HTTP status to 503 and reports the exact diagnostic error.
    """
    db_result = await check_database_connection()
    is_db_healthy = db_result.get("healthy", False)

    db_dep = DependencyHealth(
        status="healthy" if is_db_healthy else "unhealthy",
        latency_ms=db_result.get("latency_ms"),
        details=db_result.get("details"),
    )

    all_ready = is_db_healthy
    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return ReadinessResponse(
        status="ready" if all_ready else "not_ready",
        timestamp=datetime.now(timezone.utc),
        dependencies={
            "postgresql": db_dep,
        },
    )


@router.get(
    "",
    response_model=HealthResponse,
    summary="General application health summary",
    description="Returns application environment, version, and dependency status.",
)
async def get_general_health(response: Response) -> HealthResponse:
    """Aggregates overall health status."""
    db_result = await check_database_connection()
    is_db_healthy = db_result.get("healthy", False)

    if not is_db_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        app_name=settings.app_name,
        environment=settings.app_env,
        version="1.0.0",
        status="operational" if is_db_healthy else "degraded",
        timestamp=datetime.now(timezone.utc),
        dependencies={
            "postgresql": DependencyHealth(
                status="healthy" if is_db_healthy else "unhealthy",
                latency_ms=db_result.get("latency_ms"),
                details=db_result.get("details"),
            )
        },
    )
