# SecuLayer / Thing — Master Architecture Documentation System

Welcome to the comprehensive, grounded architectural documentation for **SecuLayer / Thing Security SaaS**.

This documentation system was generated using the **Diagram Design skill** (`https://diagramdesign.dev/#install`), adhering to enterprise editorial standards: crisp white canvases, high-contrast slate typography (`Geist`, `Geist Mono`, and `Instrument Serif`), restrained `#ea580c` burnt orange accents, strictly orthogonal connectors, and embedded, editable Mermaid source definitions.

Every single diagram and specification in this repository is grounded in the actual codebase—strictly obeying the **Antigravity Production Engineering Directives** (no hardcoded metrics, no mock API responses, real PostgreSQL schemas, real deterministic CLI scanner execution, and zero fake success).

---

## Architectural Golden Rule

> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**
>
> 1. The Large Language Model is **never** the security authority for decisions (allow, block, grant permission, access secrets, deploy).
> 2. The **Policy Engine (OPA / deterministic rules)** + **Security Scanners** make authoritative decisions.
> 3. The **MCP Gateway** wraps AI agent tools with strict identity validation, risk-level quotas, and human approval gates.

---

## Documentation Directory Index

| Section | Title | Primary Documentation | Interactive Diagram (HTML / SVG) | Key Codebase Grounding |
| :--- | :--- | :--- | :--- | :--- |
| **00** | **Project Overview** | [00-project-overview/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/00-project-overview/README.md) | [project-overview.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/00-project-overview/project-overview.html) | Closed-Loop Guard, 10 Security Engines |
| **01** | **System Architecture** | [01-system-architecture/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/01-system-architecture/README.md) | [system-architecture.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/01-system-architecture/system-architecture.html) | End-to-End System Topology & Request Life |
| **02** | **Frontend Architecture** | [02-frontend-architecture/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/02-frontend-architecture/README.md) | [frontend-architecture.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/02-frontend-architecture/frontend-architecture.html) | Next.js 15 App Router, React 19, apiClient |
| **03** | **Backend Architecture** | [03-backend-architecture/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/03-backend-architecture/README.md) | [backend-architecture.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/03-backend-architecture/backend-architecture.html) | FastAPI Gateway, Middlewares, TaskWorker |
| **04** | **Database ERD** | [04-database-erd/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/04-database-erd/README.md) | [database-erd.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/04-database-erd/database-erd.html) | PostgreSQL 16 Schema (56 Tables & FKs) |
| **05** | **API & Service Flows** | [05-api-and-service-flows/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/05-api-and-service-flows/README.md) | [api-and-service-flows.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/05-api-and-service-flows/api-and-service-flows.html) | Scan, Hotspot Review, AI Patch Rescan Flows |
| **06** | **Auth & Authorization** | [06-authentication-and-authorization/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/06-authentication-and-authorization/README.md) | [authentication-and-authorization.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/06-authentication-and-authorization/authentication-and-authorization.html) | JWT, TOTP MFA, Multi-Tenancy Scoping |
| **07** | **Scanning Pipelines** | [07-security-scanning-pipelines/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/07-security-scanning-pipelines/README.md) | [security-scanning-pipelines.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/07-security-scanning-pipelines/security-scanning-pipelines.html) | Semgrep, Gitleaks, Trivy, Checkov, OPA |
| **08** | **Product Modules** | [08-product-module-diagrams/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/README.md) | <ul><li>[code-security.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/code-security.html)</li><li>[cloud-security.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/cloud-security.html)</li><li>[attack-surface.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/attack-surface.html)</li><li>[protect-runtime.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/protect-runtime.html)</li><li>[compliance-and-governance.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/compliance-and-governance.html)</li><li>[shared-control-plane.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/08-product-module-diagrams/shared-control-plane.html)</li></ul> | Dedicated Architecture for all 6 Modules |
| **09** | **Integrations Map** | [09-integrations-and-dependencies/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/09-integrations-and-dependencies/README.md) | [integrations-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/09-integrations-and-dependencies/integrations-map.html) | VCS, Cloud Providers, Scanners, AI Gateways |
| **10** | **Routes & Navigation** | [10-routes-and-navigation/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/10-routes-and-navigation/README.md) | [routes-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/10-routes-and-navigation/routes-map.html) | Next.js 15 App Router Tree (271 Audited Routes) |
| **11** | **Deployment & Infra** | [11-deployment-and-infrastructure/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/11-deployment-and-infrastructure/README.md) | [deployment-topology.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/11-deployment-and-infrastructure/deployment-topology.html) | Docker Compose, Local Runner, K8s Target |
| **12** | **Security Trust Boundaries** | [12-security-trust-boundaries/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/12-security-trust-boundaries/README.md) | [trust-boundaries.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/12-security-trust-boundaries/trust-boundaries.html) | Zero-Trust Planes, Sandbox Limits, Redaction |
| **13** | **Gaps & Reality Audit** | [13-gaps-and-unverified-components/README.md](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/13-gaps-and-unverified-components/README.md) | [gaps-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/13-gaps-and-unverified-components/gaps-map.html) | Verified vs Partial vs UI-Only Status |

---

## Complete Diagram Inventory (18 Standalone HTML Visualizations)

All diagrams are standalone HTML files containing zero external runtime dependencies (except Google Web Fonts), responsive SVG layouts with orthogonal connectors, rounded elbow joints, paper masks, and embedded editable Mermaid source definitions:

1. `docs/architecture/00-project-overview/project-overview.html`
2. `docs/architecture/01-system-architecture/system-architecture.html`
3. `docs/architecture/02-frontend-architecture/frontend-architecture.html`
4. `docs/architecture/03-backend-architecture/backend-architecture.html`
5. `docs/architecture/04-database-erd/database-erd.html`
6. `docs/architecture/05-api-and-service-flows/api-and-service-flows.html`
7. `docs/architecture/06-authentication-and-authorization/authentication-and-authorization.html`
8. `docs/architecture/07-security-scanning-pipelines/security-scanning-pipelines.html`
9. `docs/architecture/08-product-module-diagrams/code-security.html`
10. `docs/architecture/08-product-module-diagrams/cloud-security.html`
11. `docs/architecture/08-product-module-diagrams/attack-surface.html`
12. `docs/architecture/08-product-module-diagrams/protect-runtime.html`
13. `docs/architecture/08-product-module-diagrams/compliance-and-governance.html`
14. `docs/architecture/08-product-module-diagrams/shared-control-plane.html`
15. `docs/architecture/09-integrations-and-dependencies/integrations-map.html`
16. `docs/architecture/10-routes-and-navigation/routes-map.html`
17. `docs/architecture/11-deployment-and-infrastructure/deployment-topology.html`
18. `docs/architecture/12-security-trust-boundaries/trust-boundaries.html`
19. `docs/architecture/13-gaps-and-unverified-components/gaps-map.html`

---

## Verified vs Unverified Feature Matrix

| Module | Sub-Capability | Grounded Status | Codebase Implementation Reference |
| :--- | :--- | :--- | :--- |
| **Thing Code** | SAST Scanning | **VERIFIED** | `backend/app/engines/scanner/semgrep.py` |
| **Thing Code** | Secret Detection | **VERIFIED** | `backend/app/engines/scanner/gitleaks.py` |
| **Thing Code** | Hotspot Review | **VERIFIED** | `backend/app/services/hotspot_service.py` |
| **Thing Code** | AI Patch Rescan | **VERIFIED** | `backend/app/services/remediation_service.py` |
| **Thing Cloud** | Cloud Connection | **VERIFIED** | `backend/app/models/cloud_models.py` |
| **Thing Cloud** | IaC Posture Scan | **VERIFIED** | `backend/app/engines/scanner/checkov.py` |
| **Thing Cloud** | Drift Detection | **VERIFIED** | `cloud_resource_drift` table & blueprints |
| **Thing Cloud** | Active Mutation | **PARTIAL** | Gated in `READ_ONLY` safety mode |
| **Thing Attack** | Target Modeling | **VERIFIED** | `backend/app/models/attack.py` |
| **Thing Attack** | DAST Campaign | **VERIFIED** | `security_attack_campaigns` table |
| **Thing Attack** | Attack Path Graph | **PARTIAL** | Rule-based exploit chain synthesis |
| **Thing Protect** | Image CVE Scan | **VERIFIED** | `backend/app/engines/scanner/trivy.py` |
| **Thing Protect** | Runtime Alerts | **VERIFIED** | `backend/app/models/container_runtime_models.py` |
| **Thing Protect** | MCP Tool Gateway | **VERIFIED** | `backend/app/models/mcp.py` |
| **Thing Compliance**| Frameworks | **VERIFIED** | `iac_compliance.py`, `license_compliance.py` |
| **Thing Compliance**| OPA Policy | **VERIFIED** | `backend/app/engines/policy/opa.py` |
| **Shared Control** | Multi-Tenancy | **VERIFIED** | `organizations`, `workspaces`, `projects` |
| **Shared Control** | Quota & Seats | **VERIFIED** | `backend/app/models/quota_seat_trial.py` |
| **Shared Control** | Secondary VCS | **PLANNED** | GitLab & Bitbucket UI-only settings |
