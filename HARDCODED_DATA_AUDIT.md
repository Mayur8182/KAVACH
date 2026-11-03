# HARDCODED DATA AUDIT -- FULL REPOSITORY SCAN

> **Objective:** Identify every static array, fake JSON, simulated timeout, hardcoded counter, and demo dataset across the repository.  
> **Directive:** Do NOT simply delete hardcoded data with empty screens. Every item must be traced to its authoritative backend endpoint and database table.

---

## Executive Summary

| Total Audit Scope | Total Files Inspected | Hardcoded In-App Datasets Found | Static Badges / Counters | Fake Async Timeout Simulations | Legacy Vite Prototypes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **All Frontend Code** | **341 files** | **4 core components** | **4 sidebar badges** | **1 scanning HUD** | **1 legacy file (src/App.tsx)** |

---

## Detailed Hardcoded Value Inventory

### 1. Sidebar Static Badge Counts
- **FILE:** [frontend/components/navigation/Sidebar.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/components/navigation/Sidebar.tsx#L171-L174)
- **LINE:** 171-174
- **CURRENT VALUE:**
  ```typescript
  { id: 'code-findings', label: 'Security Findings', href: '/code/findings', icon: ShieldAlert, badge: 24, badgeBg: '#EF4444' },
  { id: 'code-sast', label: 'SAST', href: '/code/sast', icon: Target, badge: 12, badgeBg: '#EF4444' },
  { id: 'code-secrets', label: 'Secrets', href: '/code/secrets', icon: Key, badge: 8, badgeBg: '#EF4444' },
  { id: 'code-deps', label: 'Dependencies', href: '/code/dependencies', icon: Box, badge: 16, badgeBg: '#EF4444' },
  ```
- **WHAT IT SHOULD COME FROM:** Real database count of open findings grouped by scanner module.
- **BACKEND ENDPOINT:** `GET /api/v1/findings/summary` or `GET /api/v1/code/overview`
- **DATABASE SOURCE:** `security_findings` table (`WHERE status = 'open' GROUP BY scanner_type`)
- **STATUS:** **RESOLVED & REAL** -- Bound dynamically to `api.findings.summary()`; badge count hidden when 0.

---

### 2. Live Scanning HUD Synthetic Progress Simulation
- **FILE:** [frontend/components/scanner/LiveScanningHUD.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/components/scanner/LiveScanningHUD.tsx#L102-L148)
- **LINE:** 102-148
- **WHAT IT SHOULD COME FROM:** Real asynchronous Celery / Task Worker job events.
- **BACKEND ENDPOINT:** `GET /api/v1/github/jobs/{job_id}` and `GET /api/v1/tasks/{task_id}`
- **DATABASE SOURCE:** `github_security_jobs` and `tasks` table (`status: QUEUED -> RUNNING -> COMPLETED`)
- **STATUS:** **RESOLVED & REAL** -- Bound to `api.sast.triggerScan`, real database findings query via `api.findings.list`, and `api.tasks.cancel` on abort.

---

### 3. Global Search Modal Mock Findings & Assets
- **FILE:** [frontend/components/common/SearchModal.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/components/common/SearchModal.tsx#L31-L118)
- **LINE:** 31-118
- **WHAT IT SHOULD COME FROM:** Live backend search API spanning repositories, findings, and cloud assets.
- **BACKEND ENDPOINT:** `GET /api/v1/findings?search={query}`, `GET /api/v1/code/repositories?q={query}`, `GET /api/v1/cloud/assets?search={query}`
- **DATABASE SOURCE:** `security_findings`, `repositories`, `cloud_assets` tables
- **STATUS:** **RESOLVED & REAL** -- Wired to debounced multi-resource backend queries (`api.findings.list`, `api.code.repositoryHealth`, `api.cloud.assets`).

---

### 4. QA Browser Matrix Static OS Rows
- **FILE:** [frontend/app/(platform)/qa/browsers/page.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/app/(platform)/qa/browsers/page.tsx#L67-L94)
- **LINE:** 67-94
- **WHAT IT SHOULD COME FROM:** Real worker node environment telemetry reported by the browser agent runner.
- **BACKEND ENDPOINT:** `GET /api/v1/qa/browsers`, `POST /api/v1/qa/browsers/launch`
- **DATABASE SOURCE:** `qa_browser_matrix` table
- **STATUS:** **RESOLVED & REAL** -- Hydrated directly from `api.qa.getBrowsers()`, honest untested status when unexecuted, and real runner dispatch via `api.qa.launchBrowser()`.

---

### 5. Enterprise Onboarding Static Checklist Definition
- **FILE:** [frontend/app/sales/enterprise-onboarding/page.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/app/sales/enterprise-onboarding/page.tsx#L112-L142)
- **LINE:** 112-142
- **WHAT IT SHOULD COME FROM:** Database table tracking enterprise customer onboarding milestone progress.
- **BACKEND ENDPOINT:** `GET /api/v1/sales/onboarding/{id}`, `POST /api/v1/sales/onboarding/{id}/step-update`
- **DATABASE SOURCE:** `sales_onboarding` table
- **STATUS:** **RESOLVED & REAL** -- Authenticated tenant identity from `api.auth.me()`, step state hydrated from backend `onboarding.steps`, and real persistence via `api.sales.updateOnboardingStep()`.

---

### 6. Legacy Vite App Demo Blueprint
- **FILE:** [frontend/src/App.tsx](file:///c:/Users/USER/Desktop/YC%20THING/frontend/src/App.tsx#L87-L140)
- **LINE:** 87-140
- **CURRENT VALUE:**
  ```typescript
  const demoBlueprint: SecurityBlueprint = {
    id: "bp-demo-01",
    projectName: "Payments Gateway",
    intentSummary: "High-throughput PCI-DSS Level 1 payment processing service with strict zero-trust tokenization",
    overallRiskTier: "HIGH",
    invariants: [...]
  };
  ```
- **WHAT IT SHOULD COME FROM:** Active security blueprint persisted in PostgreSQL.
- **BACKEND ENDPOINT:** `GET /api/v1/blueprints/{id}`
- **DATABASE SOURCE:** `security_blueprints` table
- **STATUS:** **OBSOLETE DEMO CODE** -- File belongs to decommissioned `src` Vite tree (excluded in `tsconfig.json`). Should be archived.

---

## Action Plan: Replacing Hardcoded Data with Live Persistence

```
Hardcoded Frontend Element
       |
       v
Check Existing Backend Router (backend/app/api/v1/*)
       |
       v
Verify PostgreSQL SQLAlchemy Model (backend/app/models/*)
       |
       v
Bind Client API Method (frontend/lib/api/client.ts)
       |
       v
Update Page/Component State & SWR Cache
       |
       v
Display Live Data with Truthful Loading & Empty States
```
