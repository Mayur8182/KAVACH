# 01 — System Architecture: SecuLayer Control Plane

## End-to-End System Architecture

This document details the multi-tiered architecture of the SecuLayer (Thing) Control Plane, tracing the interaction between the user interface, API gateway, deterministic security engines, background workers, scanning tools, database persistence, and external infrastructure integrations.

---

## High-Level Topology Summary

```
[ BROWSER / CLIENT ]
       │ HTTPS / WSS :3002
       ▼
┌────────────────────────────────────────────────────────┐
│ NEXT.JS 15 FRONTEND (Turbopack + React 19)             │
│ - Pages: /code, /cloud, /attack, /protect, /agent, etc │
│ - API Client: lib/api/client.ts (Direct REST calls)   │
│ - Auth Context: Session Token + Organization Header    │
└──────────────────────────┬─────────────────────────────┘
                           │ REST API :8000 (/api/v1/...)
                           ▼
┌────────────────────────────────────────────────────────┐
│ FASTAPI APPLICATION CONTROL PLANE                      │
│ - RequestAuditMiddleware (Correlation ID X-Request-ID) │
│ - GZipMiddleware (Payload compression)                 │
│ - RateLimiting & Idempotency Middlewares               │
│ - Versioned Routers (v1_router: 40+ domain subrouters) │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│ BACKGROUND WORKER     │        │ POSTGRESQL DATABASE   │
│ - Async Task Worker   │        │ - 56 SQLAlchemy Models│
│ - Interrupted Recovery│        │ - JSON & GUID Types   │
│ - Job State Tracking  │        │ - Multi-Tenant Scoping│
└───────────┬───────────┘        └───────────────────────┘
            │
            ├──────────────────────┬──────────────────────┐
            ▼                      ▼                      ▼
┌───────────────────────┐┌───────────────────────┐┌───────────────────────┐
│ DETERMINISTIC SCANNERS││ OPA POLICY ENGINE     ││ CLOUD & SCM CONNECTORS│
│ - Semgrep (SAST)      ││ - Open Policy Agent   ││ - GitHub REST & App   │
│ - Gitleaks (Secrets)  ││ - Rego Zero-Trust Rule││ - AWS, Azure, GCP APIs│
│ - Trivy (Containers)  ││ - Authorization Gates ││ - Kubernetes Clust.API│
│ - Checkov (IaC)       ││                       ││ - Jenkins CI/CD       │
└───────────────────────┘└───────────────────────┘└───────────────────────┘
```

---

## System Component Inventory

| Layer | Component | Implementation Status | Grounded File / Reference |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js 15 App Router | **VERIFIED** | `frontend/app/layout.tsx`, `frontend/package.json` |
| **API Client** | Unified API Client (`apiClient`) | **VERIFIED** | `frontend/lib/api/client.ts` |
| **Gateway** | FastAPI Application | **VERIFIED** | `backend/app/main.py` |
| **Middleware** | Audit, GZip, Idempotency, Rate Limit | **VERIFIED** | `backend/app/main.py`, `backend/app/core/` |
| **Data Store** | PostgreSQL (with SQLite compatibility) | **VERIFIED** | `backend/app/core/database.py`, `backend/app/models/` |
| **Worker Queue** | Async Task Worker & Reconciler | **VERIFIED** | `backend/app/core/task_worker.py`, `task_queue.py` |
| **Policy Engine** | Open Policy Agent (OPA) | **VERIFIED** | `backend/app/api/v1/policies.py`, `backend/app/models/policy.py` |
| **SAST Scanner** | Semgrep Integration | **VERIFIED** | `backend/app/services/scan_orchestrator_service.py` |
| **Secret Detection** | Gitleaks Integration | **VERIFIED** | `backend/app/api/v1/secrets.py`, `scanners/` |
| **Container Scanner**| Trivy & K8s Runtime Inspection | **VERIFIED** | `backend/app/models/container_scan_models.py` |
| **IaC Scanner** | Checkov & Drift Detector | **VERIFIED** | `backend/app/models/iac_drift_models.py`, `backend/app/api/v1/iac.py` |
| **AI Remediation** | Patch Service & Rescanning Engine | **VERIFIED** | `backend/app/services/patch_service.py`, `remediation_service.py` |
| **MCP Gateway** | MCP Tool Proxy & Risk Evaluator | **VERIFIED** | `backend/app/mcp/`, `backend/app/models/mcp.py` |
| **Knowledge Graph** | Security Knowledge Graph Service | **VERIFIED** | `backend/app/security_graph/graph_service.py` |
| **OpenTelemetry** | Runtime Evidence & Telemetry Sensor | **PLANNED / PARTIAL** | `docs/step14_runtime_security_agent.md` |

---

## Interactive Diagram
Open [`system-architecture.html`](./system-architecture.html) in your browser for the full interactive diagram with inline SVG and editable Mermaid code.
