import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import main_router
from app.core.config import get_settings
from app.core.database import close_db_connection
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging

settings = get_settings()
logger = setup_logging(
    service_name="secure-control-plane-backend",
    environment=settings.app_env,
    log_level=settings.log_level,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and graceful shutdown lifecycles."""
    logger.info(
        f"Starting {settings.app_name} in {settings.app_env} mode",
        extra={"event": "startup", "version": "1.0.0"},
    )
    yield
    logger.info("Initiating application shutdown", extra={"event": "shutdown"})
    await close_db_connection()
    logger.info("Application shutdown complete", extra={"event": "shutdown_complete"})


class RequestAuditMiddleware(BaseHTTPMiddleware):
    """Assigns unique request correlation ID, attaches it to response headers, and logs duration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        response.headers["X-Request-ID"] = request_id

        # Log request metrics
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            extra={
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


def create_application() -> FastAPI:
    """Factory creating and configuring the primary FastAPI control-plane application."""
    app = FastAPI(
        title="SecureAI Control Plane API",
        description=(
            "Deterministic Security Guard and Runtime Control Plane for AI Coding Agents and Engineering Workflows.\n\n"
            "Architecture principle: LLM proposes. Deterministic security systems decide. Runtime evidence proves."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Register audit middleware
    app.add_middleware(RequestAuditMiddleware)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register centralized exception handlers
    register_exception_handlers(app)

    # Include versioned API routers (/api/v1/...)
    app.include_router(main_router, prefix="/api")

    return app


app = create_application()
