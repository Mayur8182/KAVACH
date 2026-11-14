import sys
import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import main_router
from app.core.config import get_settings
from app.core.database import close_db_connection, engine, check_database_connection
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.task_worker import start_task_worker, stop_task_worker, reconcile_interrupted_tasks
from app.core.rate_limit import RateLimitingMiddleware
from app.core.idempotency import IdempotencyMiddleware

settings = get_settings()
logger = setup_logging(
    service_name="secure-control-plane-backend",
    environment=settings.app_env,
    log_level=settings.log_level,
)


async def _run_startup_migrations() -> None:
    """
    Safely applies any pending schema changes to the SQLite database at startup.
    This avoids breaking the server when model columns are added without a full migration.
    Only adds columns that don't exist yet — never destructive.
    """
    from sqlalchemy import text
    
    # List of (table, column, type) tuples that must exist
    required_columns = [
        ("github_security_jobs", "job_number", "VARCHAR(50)"),
        ("github_security_jobs", "job_name", "VARCHAR(100)"),
        ("github_security_jobs", "job_type", "VARCHAR(50)"),
        ("github_security_jobs", "duration_str", "VARCHAR(50)"),
        ("github_security_jobs", "triggered_by", "VARCHAR(50)"),
        ("github_security_jobs", "findings_count", "INTEGER"),
        ("github_security_jobs", "scan_summary", "JSON"),
        ("github_security_jobs", "findings_by_category", "JSON"),
        ("github_security_jobs", "recent_logs", "JSON"),
        ("security_findings", "status", "VARCHAR(50) DEFAULT 'open'"),
        ("security_findings", "category", "VARCHAR(100)"),
        ("security_findings", "line_start", "INTEGER"),
        ("security_findings", "line_end", "INTEGER"),
        ("security_findings", "detected_at", "TIMESTAMP"),
        ("security_findings", "resolved_at", "TIMESTAMP"),
        ("security_findings", "assigned_to", "VARCHAR(255)"),
        ("security_findings", "updated_at", "TIMESTAMP"),
        ("security_findings", "project_id", "VARCHAR(36)"),
        ("security_findings", "organization_id", "VARCHAR(36)"),
        ("security_findings", "repository_id", "VARCHAR(36)"),
        ("security_findings", "repository", "VARCHAR(255)"),
        ("security_findings", "branch", "VARCHAR(255)"),
        ("security_findings", "pull_request_id", "VARCHAR(255)"),
        ("security_findings", "commit_sha", "VARCHAR(100)"),
        ("security_findings", "author", "VARCHAR(255)"),
        ("security_findings", "cwe_id", "VARCHAR(100)"),
        ("security_findings", "owasp_category", "VARCHAR(150)"),
        ("security_findings", "confidence", "VARCHAR(50) DEFAULT 'HIGH'"),
        ("security_findings", "remediation", "TEXT"),
        ("security_findings", "first_seen_at", "TIMESTAMP"),
        ("security_findings", "resolved_by", "VARCHAR(255)"),
        ("security_policies", "organization_id", "VARCHAR(36)"),
        ("security_policies", "domain", "VARCHAR(50) DEFAULT 'APPLICATION'"),
        ("security_policies", "review_date", "TIMESTAMP"),
        ("security_policies", "tags", "JSON"),
        ("security_policy_versions", "status", "VARCHAR(50) DEFAULT 'ACTIVE'"),
        ("security_policy_versions", "policy_content_hash", "VARCHAR(64)"),
        ("security_policy_versions", "policy_language", "VARCHAR(50) DEFAULT 'KAVACH_DSL'"),
        ("security_policy_versions", "reviewer_id", "VARCHAR(36)"),
        ("security_policy_versions", "approver_id", "VARCHAR(36)"),
        ("security_policy_versions", "approved_at", "TIMESTAMP"),
        ("security_policy_versions", "effective_from", "TIMESTAMP"),
        ("security_policy_versions", "effective_until", "TIMESTAMP"),
        ("users", "is_verified", "BOOLEAN DEFAULT 0"),
        ("users", "verification_token", "VARCHAR(255)"),
        ("users", "verification_sent_at", "TIMESTAMP"),
        ("users", "mfa_enabled", "BOOLEAN DEFAULT 0"),
        ("users", "mfa_secret", "VARCHAR(255)"),
        ("users", "mfa_recovery_codes", "JSON"),
        ("users", "mfa_trusted_devices", "JSON"),
        ("users", "is_locked", "BOOLEAN DEFAULT 0"),
        ("users", "locked_until", "TIMESTAMP"),
        ("users", "failed_login_attempts", "INTEGER DEFAULT 0"),
        ("users", "password_reset_token", "VARCHAR(255)"),
        ("users", "password_reset_sent_at", "TIMESTAMP"),
        ("users", "active_sessions", "JSON"),
        ("users", "login_history", "JSON"),
        ("users", "onboarding_completed", "BOOLEAN DEFAULT 0"),
        ("users", "onboarding_state", "JSON"),
        ("users", "completed_tours", "JSON"),
        ("organizations", "domain", "VARCHAR(255)"),
        ("organizations", "description", "TEXT"),
        ("organizations", "logo_url", "VARCHAR(500)"),
        ("organizations", "is_maintenance", "BOOLEAN DEFAULT 0"),
        ("organizations", "data_retention_days", "INTEGER DEFAULT 90"),
        ("organization_subscriptions", "price_per_month", "FLOAT DEFAULT 0.0"),
        ("organization_subscriptions", "max_repositories", "INTEGER DEFAULT 5"),
        ("organization_subscriptions", "used_repositories", "INTEGER DEFAULT 0"),
        ("organization_subscriptions", "max_scan_minutes", "INTEGER DEFAULT 1000"),
        ("organization_subscriptions", "used_scan_minutes", "INTEGER DEFAULT 0"),
        ("organization_subscriptions", "max_storage_gb", "INTEGER DEFAULT 50"),
        ("organization_subscriptions", "used_storage_gb", "INTEGER DEFAULT 0"),
        ("organization_subscriptions", "max_api_calls", "INTEGER DEFAULT 10000"),
        ("organization_subscriptions", "used_api_calls", "INTEGER DEFAULT 0"),
        ("organization_subscriptions", "max_runner_nodes", "INTEGER DEFAULT 2"),
        ("organization_subscriptions", "used_runner_nodes", "INTEGER DEFAULT 0"),
        ("organization_subscriptions", "dedicated_runners", "BOOLEAN DEFAULT 0"),
        ("organization_subscriptions", "ai_remediation", "BOOLEAN DEFAULT 0"),
        ("organization_subscriptions", "sso_saml", "BOOLEAN DEFAULT 0"),
        ("organization_subscriptions", "subscription_plan_id", "VARCHAR(36)"),
        ("background_tasks", "organization_id", "VARCHAR(36)"),
        ("background_tasks", "tenant_name", "VARCHAR(255)"),
        ("background_tasks", "provision_type", "VARCHAR(100)"),
        ("background_tasks", "retry_count", "INTEGER DEFAULT 0"),
        ("audit_events", "organization_id", "VARCHAR(36)"),
        ("feature_catalog", "module", "VARCHAR(100) DEFAULT 'Code Security'"),
        ("feature_catalog", "status", "VARCHAR(50) DEFAULT 'ENABLED'"),
        ("feature_catalog", "scope", "VARCHAR(50) DEFAULT 'GLOBAL'"),
        ("feature_catalog", "show_in_ui", "BOOLEAN DEFAULT 1"),
        ("feature_catalog", "requires_org_setup", "BOOLEAN DEFAULT 0"),
        ("feature_catalog", "menu_location", "VARCHAR(100) DEFAULT 'Security'"),
        ("feature_catalog", "icon", "VARCHAR(100) DEFAULT 'Shield'"),
        ("feature_catalog", "config_schema", "JSON"),
        ("feature_catalog", "default_config", "JSON"),
        ("feature_catalog", "external_dependencies", "JSON"),
        ("feature_catalog", "plan_availability", "JSON"),
        ("projects", "environment", "VARCHAR(50) DEFAULT 'production'"),
        ("projects", "application_type", "VARCHAR(100) DEFAULT 'web_service'"),
        ("projects", "default_branch", "VARCHAR(100) DEFAULT 'main'"),
        ("projects", "deleted_at", "TIMESTAMP"),
        ("workspaces", "owner_id", "VARCHAR(36)"),
        ("workspaces", "workspace_type", "VARCHAR(50) DEFAULT 'ORGANIZATION'"),
        ("workspaces", "default_branch", "VARCHAR(100) DEFAULT 'main'"),
        ("projects", "workspace_id", "VARCHAR(36)"),
        ("projects", "organization_id", "VARCHAR(36)"),
        ("github_repositories", "workspace_id", "VARCHAR(36)"),
        ("audit_events", "workspace_id", "VARCHAR(36)"),
        ("container_registries", "registry_type", "VARCHAR(50) DEFAULT 'Cloud'"),
        ("container_registries", "images_count", "INTEGER DEFAULT 0"),
        ("container_registries", "repositories_count", "INTEGER DEFAULT 0"),
        ("container_registries", "last_synced_at", "TIMESTAMP"),
        ("container_registries", "sync_status", "VARCHAR(50) DEFAULT 'SUCCESSFUL'"),
        ("kubernetes_clusters", "nodes_count", "INTEGER DEFAULT 0"),
        ("kubernetes_clusters", "namespaces_count", "INTEGER DEFAULT 0"),
        ("kubernetes_clusters", "last_synced_at", "TIMESTAMP"),
        ("kubernetes_clusters", "health_status", "VARCHAR(50) DEFAULT 'Healthy'"),
        ("kubernetes_workloads", "risk_level", "VARCHAR(50) DEFAULT 'Low'"),
        ("kubernetes_workloads", "findings_count", "INTEGER DEFAULT 0"),
        ("kubernetes_workloads", "cluster_name", "VARCHAR(255)"),
        ("kubernetes_workloads", "pods_formatted", "VARCHAR(50) DEFAULT '1/1'"),
        ("kubernetes_security_observations", "category", "VARCHAR(100) DEFAULT 'Misconfigurations'"),
        ("kubernetes_security_observations", "remediation", "TEXT"),
        ("github_repositories", "project_id", "VARCHAR(36)"),
        ("github_repositories", "installation_id", "VARCHAR(36)"),
        ("github_repositories", "github_repository_id", "BIGINT"),
        ("github_repositories", "owner", "VARCHAR(255)"),
        ("github_repositories", "name", "VARCHAR(255)"),
        ("github_repositories", "full_name", "VARCHAR(512)"),
        ("github_repositories", "default_branch", "VARCHAR(100) DEFAULT 'main'"),
        ("github_repositories", "private", "BOOLEAN DEFAULT 0"),
        ("github_repositories", "html_url", "VARCHAR(1000)"),
        ("github_repositories", "clone_url", "VARCHAR(1000)"),
        ("github_repositories", "ssh_url", "VARCHAR(1000)"),
        ("github_repositories", "visibility", "VARCHAR(50) DEFAULT 'public'"),
        ("github_repositories", "archived", "BOOLEAN DEFAULT 0"),
        ("github_repositories", "permissions", "JSON"),
        ("github_repositories", "last_synced_at", "TIMESTAMP"),
        ("github_repositories", "created_at", "TIMESTAMP"),
        ("github_repositories", "updated_at", "TIMESTAMP"),
        ("github_security_jobs", "project_id", "VARCHAR(36)"),
        ("github_security_jobs", "repository_id", "VARCHAR(36)"),
        ("github_security_jobs", "webhook_event_id", "VARCHAR(36)"),
        ("github_security_jobs", "event_type", "VARCHAR(100)"),
        ("github_security_jobs", "commit_sha", "VARCHAR(100)"),
        ("github_security_jobs", "branch", "VARCHAR(255)"),
        ("github_security_jobs", "pull_request_number", "INTEGER"),
        ("github_security_jobs", "status", "VARCHAR(50) DEFAULT 'QUEUED'"),
        ("github_security_jobs", "scan_id", "VARCHAR(36)"),
        ("github_security_jobs", "decision_id", "VARCHAR(36)"),
        ("github_security_jobs", "check_run_id", "BIGINT"),
        ("github_security_jobs", "error_message", "TEXT"),
        ("github_security_jobs", "started_at", "TIMESTAMP"),
        ("github_security_jobs", "completed_at", "TIMESTAMP"),
        ("github_security_jobs", "job_number", "VARCHAR(50)"),
        ("github_security_jobs", "job_name", "VARCHAR(100)"),
        ("github_security_jobs", "job_type", "VARCHAR(50)"),
        ("github_security_jobs", "duration_str", "VARCHAR(50)"),
        ("github_security_jobs", "triggered_by", "VARCHAR(50)"),
        ("github_security_jobs", "findings_count", "INTEGER"),
        ("github_security_jobs", "scan_summary", "JSON"),
        ("github_security_jobs", "findings_by_category", "JSON"),
        ("github_security_jobs", "recent_logs", "JSON"),
        ("github_security_jobs", "current_stage", "VARCHAR(255)"),
        ("github_security_jobs", "current_stage_index", "INTEGER"),
        ("github_security_jobs", "total_stages", "INTEGER"),
        ("github_security_jobs", "stage_progress", "INTEGER"),
        ("github_security_jobs", "files_scanned", "INTEGER"),
        ("github_security_jobs", "rules_evaluated", "INTEGER"),
        ("github_security_jobs", "created_at", "TIMESTAMP"),
        ("github_security_jobs", "updated_at", "TIMESTAMP"),
        ("api_security_scans", "scan_config", "JSON"),
        ("api_security_scans", "tests_skipped", "INTEGER"),
        ("api_security_scans", "tests_errored", "INTEGER"),
    ]
    
    try:
        from app.models.base import Base
        import app.models  # ensure all models including QA are registered
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
            # Cache table columns to avoid repetitive queries (dialect-aware for SQLite and PostgreSQL)
            table_columns_cache: dict = {}
            is_sqlite = conn.dialect.name == "sqlite"
            is_postgres = conn.dialect.name == "postgresql"
            for table, col, col_type in required_columns:
                if table not in table_columns_cache:
                    if is_sqlite:
                        result = await conn.execute(text(f"PRAGMA table_info({table})"))
                        table_columns_cache[table] = [row[1] for row in result.fetchall()]
                    elif is_postgres:
                        result = await conn.execute(
                            text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
                            {"t": table},
                        )
                        table_columns_cache[table] = [row[0] for row in result.fetchall()]
                    else:
                        table_columns_cache[table] = []
                if col not in table_columns_cache[table]:
                    try:
                        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                        table_columns_cache[table].append(col)
                        logger.info(f"[startup-migration] Added column {col} to {table}")
                    except Exception as col_err:
                        logger.debug(f"[startup-migration] Column {col} on {table}: {col_err}")
    except Exception as exc:
        # Log but don't crash — table may not exist yet (first run before alembic)
        logger.warning(f"[startup-migration] Could not apply schema patch: {exc}")



@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and graceful shutdown lifecycles."""
    logger.info(
        f"Starting {settings.app_name} in {settings.app_env} mode",
        extra={"event": "startup", "version": "1.0.0"},
    )
    try:
        await asyncio.wait_for(_run_startup_migrations(), timeout=25.0)
    except Exception as exc:
        logger.warning(f"[startup] Startup migrations timed out or non-fatal error: {exc}")
    try:
        await asyncio.wait_for(reconcile_interrupted_tasks(), timeout=15.0)
    except Exception as exc:
        logger.warning(f"[startup] Task reconciliation timed out or non-fatal error: {exc}")
    try:
        start_task_worker()
    except Exception as exc:
        logger.warning(f"[startup] Could not start task worker: {exc}")
    yield
    logger.info("Initiating application shutdown", extra={"event": "shutdown"})
    await stop_task_worker()
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

    # Register audit middleware (outermost)
    app.add_middleware(RequestAuditMiddleware)

    # Register payload compression (Point 8: Large payloads bina compression)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Register rate limiting & idempotency middleware (Mistakes #83, #84)
    app.add_middleware(IdempotencyMiddleware)
    app.add_middleware(RateLimitingMiddleware)

    # Configure CORS (permits localhost, Render preview/production subdomains, and custom domains)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"^https?://([a-zA-Z0-9-]+\.)*(localhost|127\.0\.0\.1|onrender\.com|kavachsecurity\.me)(:[0-9]+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register centralized exception handlers
    register_exception_handlers(app)

    # Root entrypoint redirect to API documentation
    @app.get("/", include_in_schema=False)
    def root_entry():
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/docs")

    # Centralized liveness & readiness probes (Mistake #94)
    @app.get("/health", tags=["Health & Readiness"], summary="Root liveness check")
    @app.get("/healthz", tags=["Health & Readiness"], summary="Kubernetes/Render liveness check")
    @app.get("/api/health", tags=["Health & Readiness"], summary="API liveness check")
    @app.get("/api/healthz", tags=["Health & Readiness"], summary="API healthz check")
    def root_health():
        return {"status": "healthy", "service": "secure-control-plane-backend", "version": "1.0.0"}

    @app.get("/ready", tags=["Health & Readiness"], summary="Root readiness check")
    async def root_ready(response: Response):
        """Verifies database connectivity before declaring service ready to accept traffic."""
        db_res = await check_database_connection()
        is_healthy = db_res.get("healthy", False)
        if not is_healthy:
            response.status_code = 503
            return {
                "status": "not_ready",
                "service": "secure-control-plane-backend",
                "version": "1.0.0",
                "dependencies": {
                    "database": {
                        "status": "unhealthy",
                        "latency_ms": db_res.get("latency_ms"),
                        "details": db_res.get("details"),
                    }
                },
            }
        return {
            "status": "ready",
            "service": "secure-control-plane-backend",
            "version": "1.0.0",
            "dependencies": {
                "database": {
                    "status": "healthy",
                    "latency_ms": db_res.get("latency_ms"),
                }
            },
        }

# Include versioned API routers (/api/v1/...)
    app.include_router(main_router, prefix="/api")

    return app


# Trigger route reload: 2026-10-19 01:28:30 Auto-Migration & Schema-Safe Connect
app = create_application()
