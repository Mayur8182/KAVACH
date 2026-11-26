# KAVACH SECURITY — FOUNDER ADMIN CONTROL CENTER IMPLEMENTATION PLAN

> **Document Type:** Production Architecture & Implementation Blueprint  
> **Status:** Active Execution  
> **Author:** Principal Software Architect & Cybersecurity Platform Engineer  
> **Repository:** Kavach Security Enterprise (`YC THING`)  
> **Date:** November 18, 2026  

---

## 1. EXECUTIVE OVERVIEW

This document outlines the end-to-end plan to upgrade Kavach's SuperAdmin control plane from a fragmented, partially mocked administration interface into a unified, production-grade **Founder Command Center**. 

In strict adherence to `AGENTS.md` and `GEMINI.md`:
- **Zero hardcoded production metrics.**
- **Zero mock API responses or fake routes.**
- **Zero simulated success messages.**
- **Authoritative PostgreSQL persistence for all platform state.**
- **Deterministic, database-backed SuperAdmin authorization (eliminating in-code email allowlists).**
- **Unified enterprise cybersecurity design tokens extracted directly from Kavach API Security.**

---

## 2. EXISTING ARCHITECTURE & REPOSITORY INVENTORY

### 2.1 Backend Architecture
- **Framework:** FastAPI (`backend/app/main.py`)
- **API Versioning:** `/api/v1/`
- **Database Engine:** PostgreSQL (with SQLite hybrid support via SQLAlchemy async sessions in `app/core/database.py`)
- **Security & Scanners:**
  - Semgrep (SAST polyglot code scanning)
  - Trivy (SCA dependency and container scanning)
  - Gitleaks (Secret and token discovery)
  - Checkov (IaC misconfiguration auditing)
  - OPA / In-process Rego (Deterministic policy decisions)
- **Task Worker:** `app/core/task_worker.py` handling asynchronous `BackgroundTask` entries (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
- **AI Agents & MCP:** `app/models/agent.py`, `app/models/agent_governance.py`, and `app/api/v1/mcp.py`.
- **Existing SuperAdmin Routers:**
  - `superadmin_tenants.py`
  - `superadmin_plans.py`
  - `superadmin_entitlements.py`
  - `superadmin_tenant_plans.py`
  - `superadmin_quotas_seats_trials.py`
  - `superadmin_platform_operations.py`

### 2.2 Critical Vulnerabilities & Code Issues Identified
1. **Insecure In-Code Email Allowlist (`FOUNDER_SUPERADMIN_EMAILS`):**
   - Present in `superadmin_tenants.py` and `superadmin_platform_operations.py`.
   - Bypasses database RBAC checks.
   - **Remediation:** Remove email allowlists in API endpoints. Require `current_user.is_superuser == True` verified against the PostgreSQL `users` table, backed by an initial database seeder/migration that guarantees the founding account is an authoritative superuser.
2. **Hardcoded Initial Metrics in UI:**
   - In `frontend/app/(platform)/superadmin/tenants/page.tsx`, `useState({ total: 24, active: 21, pending: 2... })` showed fake tenant numbers when backend requests were pending or failed.
   - **Remediation:** Replace with proper null/zero initial states and animated skeleton loaders.
3. **Simulated Support Announcements:**
   - In `frontend/app/(platform)/superadmin/support/page.tsx`, announcement creation used `setTimeout(..., 4000)` without backend storage.
   - **Remediation:** Create `PlatformAnnouncement` model and database persistence with broadcast distribution endpoints.
4. **Missing AI Agent & Scan Queue Governance:**
   - No frontend screens existed to inspect live AI agent sessions, trace MCP tool calls, kill runaway agent tasks, or monitor global scanner queue depths.
   - **Remediation:** Implement Module 09 (`/superadmin/ai-agents`) and Module 11 (`/superadmin/scans`).
5. **Branding Inconsistency in Admin Shell:**
   - `SuperAdminShell.tsx` rendered "THiNG" and blue styling.
   - **Remediation:** Redesign with official Kavach logo/mark and API Security warm ivory/black enterprise tokens.

---

## 3. DATABASE SCHEMAS & ENTITY EXTENSIONS

### Existing Entities Reused
- `users`: ID, email, name, `is_superuser`, `is_active`, `mfa_enabled`.
- `organizations`: Tenant metadata, status, retention, owner.
- `workspaces`: Projects, repos, branches.
- `subscription_plans`: Free, Pro, Business, Enterprise pricing and limits.
- `feature_catalog`: Dynamic feature flags and entitlements.
- `security_scans`: Real SAST/DAST/SCA/Secret scan records.
- `scan_findings`: Discovered CVEs and vulnerabilities.
- `agents`, `agent_executions`, `agent_tool_calls`: MCP and agent telemetry.
- `api_targets`, `api_endpoints`, `api_findings`: API Security discovery.
- `audit_events`: Tamper-evident operational audit vault.
- `background_tasks`: Asynchronous worker queues.
- `email_delivery_logs`: Transactional dispatch records.

### New Entities Created
- `PlatformAnnouncement` (`app/models/support_models.py`):
  - `id`: UUID
  - `title`: String(255)
  - `message`: Text
  - `priority`: String(50) (INFO, WARNING, CRITICAL)
  - `target_audience`: String(50) (ALL_TENANTS, PRO_USERS, ENTERPRISE)
  - `status`: String(50) (DRAFT, PUBLISHED, ARCHIVED)
  - `author_id`: UUID
  - `author_email`: String(255)
  - `published_at`: DateTime(timezone=True)
  - `created_at`, `updated_at`: DateTime(timezone=True)

---

## 4. API IMPLEMENTATION PLAN

All routes reside under `/api/v1/superadmin/`:

| Route | Method | Description |
|---|---|---|
| `/overview/stats` | `GET` | Aggregates live counts of orgs, users, scans, CVEs, agents, and MRR |
| `/overview/activity` | `GET` | Recent system-wide audit events and scan executions |
| `/customers` | `GET` | Paginated directory of customers and accounts |
| `/customers/{id}` | `GET` | Deep inspection of customer workspaces, repos, and invoices |
| `/security-ops/incidents` | `GET` | Real incidents from `security_incidents` |
| `/security-ops/alerts` | `GET` | Platform-wide security alerts |
| `/ai-agents/overview` | `GET` | Active agent count, executions, and token metrics |
| `/ai-agents/executions` | `GET` | Filterable list of agent execution runs |
| `/ai-agents/executions/{id}/trace` | `GET` | Detailed step-by-step tool calls and MCP requests |
| `/ai-agents/executions/{id}/kill` | `POST` | Deterministic process termination and status update |
| `/ai-agents/governance` | `GET/PUT` | Circuit breaker rules and model permissions |
| `/api-security/summary` | `GET` | Aggregated endpoint counts and BOLA/BFLA findings |
| `/api-security/targets` | `GET` | Global list of registered API targets across tenants |
| `/scans/queue` | `GET` | Live background task queue for SAST, DAST, SCA, Trivy, Gitleaks |
| `/scans/{id}/cancel` | `POST` | Abort running scanner execution |
| `/scans/{id}/retry` | `POST` | Re-queue scan idempotently |
| `/vulnerabilities/aggregate` | `GET` | Aggregated CVEs across all repos with severity counts |
| `/support/announcements` | `GET/POST` | Real PostgreSQL-backed broadcast announcement system |
| `/support/diagnostics` | `GET` | Tenant health, database latency, and storage consumption |
| `/notifications/email-logs` | `GET` | Transactional email delivery logs with retry counts |
| `/analytics/usage-summary` | `GET` | Platform growth, scan minutes, and token usage |

---

## 5. FRONTEND IMPLEMENTATION PLAN

### Design Tokens (`KavachAdminTokens`)
```typescript
export const KavachAdminTokens = {
  pageBg:       '#FAF9F6', // Warm ivory foundation
  surface:      '#FFFFFF', // Crisp white content surface
  surfaceHover: '#F8FAFC', // Slate hover
  surfaceWarm:  '#FDFCFA', // Elevated card surface
  border:       '#E8E6E1', // Warm subtle gray border
  borderLight:  '#F3F4F6', // Light divider
  text:         '#0F172A', // Deep slate primary text
  textSub:      '#475569', // Secondary subtext
  textMuted:    '#94A3B8', // Placeholder muted
  btnPrimary:   '#0B0F17', // Pitch black action button
  btnPrimaryHover: '#1E293B',
  critical:     { text: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' },
  high:         { text: '#C2410C', bg: '#FFEDD5', border: '#FED7AA' },
  medium:       { text: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  low:          { text: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  healthy:      { text: '#15803D', bg: '#DCFCE7', border: '#BBF7D0' },
};
```

### Navigation Structure in `SuperAdminShell.tsx`
- **Header:** Kavach Mark + "Kavach" text + Founder badge + Live status indicator.
- **5 Sections:**
  1. **PLATFORM:** Overview, Customers, Organizations, Users & Access
  2. **BUSINESS:** Subscriptions, Billing & Revenue, Products & Plans, Analytics
  3. **SECURITY OPERATIONS:** Security Operations, AI Agents & MCP, API Security, Scan Management, Vulnerabilities
  4. **OPERATIONS:** Integrations, Support Center, Notifications, System Health
  5. **GOVERNANCE:** Audit Logs, Platform Settings

---

## 6. TESTING & VERIFICATION STRATEGY

1. **Deterministic SuperAdmin RBAC Test:**
   - Unauthenticated / Standard user request returns `403 FORBIDDEN` (`FOUNDER_SUPERADMIN_REQUIRED`).
   - Superuser request (`is_superuser=True`) returns `200 OK`.
2. **Platform Overview Live Aggregation Test:**
   - Tests `GET /api/v1/superadmin/overview/stats` and verifies non-mock response mapped to real DB rows.
3. **AI Agent Governance & Kill Execution Test:**
   - Tests `POST /api/v1/superadmin/ai-agents/executions/{id}/kill` and confirms task state transitions to `CANCELLED`.
4. **Scan Management Queue Test:**
   - Tests `GET /api/v1/superadmin/scans/queue` and `POST /api/v1/superadmin/scans/{id}/cancel`.
5. **Real Database-Backed Announcements Test:**
   - Tests `POST /api/v1/superadmin/support/announcements` creates a persistent row in PostgreSQL.
6. **Frontend TypeScript & Build Verification:**
   - Runs `npx tsc --noEmit` to guarantee 100% type safety and zero missing properties.

---

## 7. EXECUTION SIGN-OFF
With the implementation plan established, execution begins immediately on backend RBAC hardening, API expansion, frontend shell redesign, and module delivery.
