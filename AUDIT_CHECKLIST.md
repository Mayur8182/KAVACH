# ANTIGRAVITY — FULL REPOSITORY AUDIT & DEFECT REMEDIATION CHECKLIST

> **Governing Directives**:
> 1. Strict `AGENTS.md` & `GEMINI.md` Production Engineering Rules: ZERO hardcoded business data, ZERO fake success, ZERO mock API endpoints in production, ZERO static dashboard numbers.
> 2. Real database persistence (PostgreSQL / SQLite).
> 3. Real security tools must actually run and report real scanner outputs.
> 4. Status Labels: `VERIFIED FIXED`, `IMPLEMENTED NOT VERIFIED`, `CONFIRMED EXISTING BEHAVIOR`, `BLOCKED`, `NOT YET INSPECTED`.

---

## BATCH 1: REPOSITORY INVENTORY & DEFECT CATALOG

### 1.1 Architectural Inventory

| Layer | Component Scope | Key Technologies / Frameworks | Inventory Count |
| :--- | :--- | :--- | :--- |
| **Backend Core** | `backend/app/core/` | FastAPI, Pydantic v2, SQLAlchemy 2.0 Async, Argon2id, PyJWT | 6 core modules (`security.py`, `config.py`, `database.py`, `middleware.py`, etc.) |
| **Database Models** | `backend/app/models/` | SQLAlchemy Declarative Base, PostgreSQL UUID, JSONB | 54 model files (`user.py`, `dependency_settings.py`, `iac_compliance.py`, etc.) |
| **API Routers** | `backend/app/api/v1/` | FastAPI APIRouter, OAuth2 Bearer, OpenAPI specs | 63 router modules (`dependency_settings.py`, `auth.py`, `iac.py`, etc.) |
| **Backend Services** | `backend/app/services/` | Async query execution, scanner wrappers, audit logging | 38 service modules (`iac_service.py`, `integrations_service.py`, etc.) |
| **Frontend Platform** | `frontend/app/(platform)/` | Next.js 15 (App Router), React 19, TypeScript, Vanilla CSS | 80+ route pages across Code, Cloud, Attack, Protect, Agent, QA, Settings |
| **Frontend Components**| `frontend/components/` | Custom UI components, Lucide icons, SVG charts, modals | 120+ TSX components across navigation, dependencies, iac, repositories |
| **Client API Layer** | `frontend/lib/api/` | `ThingApiClient` in `client.ts` (11,677 lines), cache layer | 1 unified API client covering 60+ feature domains |
| **Scanners & Engines**| CLI / Subprocess integrations | Trivy, Syft, Google OSV Scanner, Semgrep, Gitleaks, Checkov | Configured via env variables, binary paths |
| **Infrastructure** | Container & Orchestration | Docker (`Dockerfile`, `docker-compose.yml`), GitHub Actions (`.github/workflows/ci-cd.yml`) | 2 container definitions, 1 CI/CD pipeline |
| **Test Suites** | `backend/tests/` | Pytest, Asyncio Pytest, HTTPX AsyncClient | 57 test files covering auth, scanners, iac, secrets, mcp |

---

### 1.2 Systematic Defect Catalog

| ID | Category | File Path & Lines | Evidence / Description | Classification | Severity | Proposed Fix | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Secret Leak in Defaults | `backend/app/core/config.py` (L42, L46, L56, L57) | Plaintext database connection string with credentials (`mongodb+srv://mkbharvad8080:Mkb%40...`) and email SMTP app password (`zuck erhg lkjf tdwt`) hardcoded in `Field(default=...)`. | Potential security issue requiring investigation | **CRITICAL** | Remove raw plaintext credentials from code defaults. Set `default=None` and load exclusively from environment variables / secret manager. | **NOT YET INSPECTED** |
| **SEC-002** | Missing Auth & Wildcard Deletion | `backend/app/api/v1/dependency_settings.py` (L440-L950) | Missing `current_user` dependency on sensitive endpoints: `delete_registry_integration`, `toggle_registry_integration`, `test_registry_integration`, `test_scanner_engine`, `delete_access_rule`, `delete_notification_channel`, `get_dependency_audit_logs`. | Confirmed defect | **HIGH** | Enforce `Depends(get_current_user)` or `Depends(get_current_admin_user)` on all mutation and audit endpoints. | **NOT YET INSPECTED** |
| **DATA-001**| Hardcoded Personal Names as Fallback | `backend/app/api/v1/dependency_settings.py` (L405, L496, L648, L852) | `actor_name = current_user.email if current_user and current_user.email else "Mayur K. (admin)"` | Confirmed defect | **MEDIUM** | Remove hardcoded user name. Derive actor strictly from authenticated `current_user.email` or `"system-service-account"` / request metadata. | **NOT YET INSPECTED** |
| **DATA-002**| Hardcoded IP Addresses in Audit Trail | `backend/app/api/v1/dependency_settings.py` (L413, L503, L655, L769, L859) | `ip_address="127.0.0.1"` hardcoded into database audit logs instead of inspecting `request.client.host`. | Confirmed defect | **LOW** | Extract real client IP via `request.client.host if request and request.client else "unknown"`. | **NOT YET INSPECTED** |
| **SCAN-001**| Simulated Scanner Health Test | `backend/app/api/v1/dependency_settings.py` (L677-L705) | `test_scanner_engine` returns static `duration_ms=124`, `success=True`, without checking if binary exists on disk or executing `--version`. | Confirmed defect | **HIGH** | Run real executable check via `shutil.which` or configured binary paths in settings (`TRIVY_BIN`, `SYFT_BIN`, `OSV_BIN`, `SEMGREP_BIN`), execute `--version`, measure actual elapsed milliseconds, and report real status. | **NOT YET INSPECTED** |
| **INTEG-001**| Simulated Registry Ping & Latency | `backend/app/api/v1/dependency_settings.py` (L524-L553) | `test_registry_integration` returns static `latency_ms=48` and `success=True` without making real HTTP connection to `reg.url`. | Confirmed defect | **MEDIUM** | Execute real asynchronous HTTP `HEAD` / `GET` check with `httpx.AsyncClient` against `reg.url`, record actual round-trip latency in ms, and catch network/SSL exceptions. | **NOT YET INSPECTED** |
| **INTEG-002**| Simulated Notification Delivery | `backend/app/api/v1/dependency_settings.py` (L876-L899) | `test_notification_channel` returns hardcoded `success=True` without attempting HTTP POST delivery to webhook destination. | Confirmed defect | **MEDIUM** | Dispatch real HTTP POST payload using `httpx.AsyncClient` to webhook URL, handle responses, and report honest success/failure based on status code. | **NOT YET INSPECTED** |
| **DATA-003**| Static Mock History in Plans | `backend/app/services/superadmin_tenant_plan_service.py` (L540-L570, L1140-L1185) | Returns fake historical events with hardcoded names ("Mayur Sharval") when database history is empty. | Confirmed defect | **HIGH** | Return truthful empty list `[]` when no history exists in database, allowing UI to render empty state. | **NOT YET INSPECTED** |
| **DATA-004**| In-Memory Static Arrays in IaC Service | `backend/app/services/iac_service.py` (L6740-L6845, L6850-L6875) | `_COMPLIANCE_SUITE_FRAMEWORKS`, `_COMPLIANCE_SUITE_AUDIT_LOGS`, `_COMPLIANCE_SUITE_REPORTS`, and static KPI numbers (`compliant_controls=96`, etc.) in memory. | Confirmed defect | **HIGH** | Query real database tables (`iac_compliance_checks`) and aggregate real control states. | **NOT YET INSPECTED** |
| **DATA-005**| In-Memory Static Lists in IaC Remediation | `backend/app/services/iac_remediation_suite_service.py` (L53-L240) | `_prs`, `_suppressions`, `_bulk_fixes` static lists with hardcoded authors ("mayur.bhanvad"). | Confirmed defect | **HIGH** | Back remediation items and suppressions by database persistence (`SecurityFinding` or remediation tables). | **NOT YET INSPECTED** |
| **DATA-006**| Static Mock Users in IaC Settings | `backend/app/services/iac_settings_suite_service.py` (L125-L131) | `_DEFAULT_SETTINGS["access"]["users"]` hardcodes "mayur.bhanvad", "dev.lead", "john.doe". | Confirmed defect | **MEDIUM** | Query real active users from `users` table (`select(User)`). | **NOT YET INSPECTED** |
| **DATA-007**| Hardcoded Account & Org Fallbacks | `backend/app/services/integrations_service.py` (L339-L340, L878) | Fallback strings `account_name or "mayur.bharvad"` and `organization_name or "CVMU"`. | Confirmed defect | **LOW** | Use authenticated user's organization and account name; require explicit parameter or return error if missing. | **NOT YET INSPECTED** |
| **DATA-008**| Hardcoded Commit SHA & Author in Hotspots | `backend/app/services/hotspot_service.py` (L219, L224) | Hardcoded `commit_sha="a7b89c3f4e2d"` and `author="mayur.bharvad"`. | Confirmed defect | **LOW** | Resolve commit sha and author from repository git log or triggering actor. | **NOT YET INSPECTED** |
| **CICD-001**| Broken Root Scripts in CI Workflow | `.github/workflows/ci-cd.yml` (L27, L34) | CI executes `npm test -- --coverage` and `npm run sast` at root, but root `package.json` lacks these scripts. | Confirmed defect | **MEDIUM** | Add workspace delegation scripts (`npm run test:backend`, `npm run test:frontend`, `npm run lint`) to root `package.json` or target `frontend` directory properly. | **NOT YET INSPECTED** |
| **ERR-001** | Swallowed Exception in Manifest Search | `backend/app/api/v1/dependency_scans.py` (L304-L306) | Bare `except Exception: pass` silently hides filesystem or manifest scanning errors. | Confirmed defect | **LOW** | Log warning with logger and capture error context. | **NOT YET INSPECTED** |

---

## BATCH EXECUTION TRACKER

- [ ] **Batch 1**: Repository inventory and audit report (COMPLETED IN CHECKLIST)
- [ ] **Batch 2**: Authentication, authorization, secrets, and tenant isolation (IN PROGRESS)
- [ ] **Batch 3**: Backend APIs, database, and integrations
- [ ] **Batch 4**: Frontend pages, forms, buttons, and API connections
- [ ] **Batch 5**: Scanner, container, IaC, and CI/CD workflows
- [ ] **Batch 6**: Regression tests and final verification
