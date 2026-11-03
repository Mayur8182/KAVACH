# 11. Deployment and Infrastructure Topology

This section documents the deployment environments, container topologies, orchestration models, and runtime infrastructure for SecuLayer / Thing.

## Deployment Topologies

### 1. Local Development (Native / Process-Isolated)
- **Frontend Server:** Next.js 15.5.26 running on Node.js (`npm run dev`, default port `3002` or `3000`).
- **Backend API:** FastAPI running on Uvicorn ASGI (`python -m uvicorn app.main:app --port 8000 --reload`).
- **Datastore:** Local PostgreSQL 16 on port `5432` with connection URL `postgresql+asyncpg://...` (or fallback to async SQLite for test isolation).
- **Scanner Execution:** Host-installed CLI binaries (Semgrep, Gitleaks, Trivy, Checkov) invoked via asynchronous subprocesses with isolated working directories.

### 2. Containerized Stack (`docker-compose.yml`)
- **`secure_control_plane_backend`:** Multi-stage Python 3.12/3.13 image containing FastAPI, SQLAlchemy, and scanner CLI toolchain. Exposes `8000:8000` with automated healthchecks via `/api/v1/health/live`.
- **`secure_control_plane_postgres`:** `postgres:16-alpine` persistent container on port `5432:5432` with automated `pg_isready` healthcheck probes.
- **Task Worker:** Embedded in-process async background worker (`backend/app/core/task_worker.py`) running concurrently with FastAPI event loop.

### 3. Production Cloud Native (Kubernetes / ECS Target)
- **Ingress / Edge:** TLS termination via Cloudflare or AWS ALB, routing `/api/v1/*` to the FastAPI backend service and all other traffic to the Next.js App Router service.
- **Stateless Application Pods:** Autoscaled backend and frontend containers.
- **Stateful Persistence:** Managed PostgreSQL (e.g. AWS RDS Aurora PostgreSQL 16) with automated backups, connection pooling (PgBouncer), and encryption at rest.
- **Asynchronous Workloads:** Heavy repository clones, Trivy image scans, and Checkov runs delegated to ephemeral Kubernetes Jobs with memory and CPU cgroup limits.

## Standalone Visual Diagram

Open [deployment-topology.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/11-deployment-and-infrastructure/deployment-topology.html) in any browser to view the interactive SVG diagram.
