# 03 — Backend Architecture: FastAPI Control Plane

## Architecture Overview

The backend of the SecuLayer Control Plane is an asynchronous Python service built on **FastAPI**, **Starlette**, **SQLAlchemy (asyncio)**, and **Pydantic**. It enforces the architectural golden rule: providing deterministic verification, policy enforcement, scanning orchestration, and persistent audit evidence for every developer and AI agent interaction.

---

## Gateway & Middleware Pipeline

Every HTTP request traverses an ordered middleware pipeline before reaching domain route handlers:

```
[ INCOMING HTTP REQUEST ]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 1. RequestAuditMiddleware                              │
│ - Extracts or generates X-Request-ID correlation UUID  │
│ - Injects request.state.request_id                     │
│ - Measures precise duration and logs structured audit   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. GZipMiddleware (minimum_size=1000)                  │
│ - Compresses large scan outputs and SBOM manifests     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. IdempotencyMiddleware & RateLimitingMiddleware      │
│ - Protects mutating endpoints against replay attacks   │
│ - Enforces per-client rate limits                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. CORSMiddleware & Exception Handlers                 │
│ - Validates origin domain and credentials              │
│ - Intercepts unhandled errors with uniform JSON schema  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. API ROUTER LAYER (app/api/router.py -> v1_router)   │
│ - 40+ Subrouters: Auth, Scans, IaC, Cloud, Protect, etc │
└────────────────────────────────────────────────────────┘
```

---

## Lifespan & Asynchronous Worker Engine

The application manages critical startup and shutdown routines via the `lifespan` context manager:

1. **Startup Migrations (`_run_startup_migrations`):**
   - Automatically patches missing columns across PostgreSQL tables at boot time to prevent schema desynchronization without destructive alterations.
2. **Task Reconciliation (`reconcile_interrupted_tasks`):**
   - Scans the `background_tasks` table for jobs marked `RUNNING` or `QUEUED` when the server was restarted, resetting them or marking them for retry.
3. **Background Task Worker (`start_task_worker`):**
   - Launches an asynchronous worker task polling `background_tasks` for long-running operations (repository cloning, Semgrep/Gitleaks execution, SBOM generation, and cloud discovery).
4. **Graceful Shutdown (`close_db_connection`, `stop_task_worker`):**
   - Flushes pending database transactions and cleanly drains workers.

---

## Health & Readiness Probes

- **Liveness (`GET /health`):** Lightweight probe confirming the process is alive.
- **Readiness (`GET /ready`):** Actively tests the PostgreSQL connection via `check_database_connection()`, measuring DB query latency and returning HTTP 503 if the database is unreachable.

---

## Interactive Diagram
Open [`backend-architecture.html`](./backend-architecture.html) in your browser for the full interactive diagram with inline SVG and editable Mermaid code.
