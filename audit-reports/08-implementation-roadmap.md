# KAVACH — IMPLEMENTATION ROADMAP & ENGINEERING PRIORITIES

**Report ID:** KAV-AUDIT-08  
**Author:** Staff Full-Stack Engineer, Application Security Architect & Principal Product Architect  
**Date:** November 2026  
**Status:** COMPLETE & PROPOSED FOR EXECUTION  
**Scope:** Priority Tiers P0 through P3 (Engineering Work Packages)  

---

## 1. Roadmap Overview & Prioritization Strategy

This implementation roadmap decomposes the architectural transformation of Kavach into four sequenced engineering phases:
- **Tier P0 — Critical Workflow Integrity & Anti-Pattern Eradication:** Immediate fixes for hardcoded patch templates, fake validation stubs, and fabricated cloud data seeding.
- **Tier P1 — Navigation Consolidation & Information Architecture:** Permanent locking of `Sidebar.tsx`, elimination of route-morphing, consolidation of duplicate overviews, findings, and runs.
- **Tier P2 — Closed-Loop AI Remediation & Universal Copilot:** Contextual slide-over assistant and genuine LLM-driven AST patch synthesis against repository source code.
- **Tier P3 — Enterprise Scalability & Advanced Capabilities:** Unified asset inventory, automated PR inline annotations, and compliance reporting.

---

## 2. Priority Tier P0 — Critical Integrity Fixes (Immediate)

### Work Package P0.1: Replace Hardcoded Patch Templates with Real AST Diffs
- **Problem Being Solved:** `AIRemediationOrchestrator._generate_deterministic_patch()` and `FindingService.get_finding_detail()` use static string templates (hardcoded Flask code) that fail when applied to real user repositories.
- **Affected Files:**
  - `backend/app/services/ai_remediation_orchestrator.py` (lines 468–518)
  - `backend/app/services/finding_service.py` (lines 80–118, 283–306)
- **Proposed Change:** 
  1. Extract the actual source file lines from the checked-out repository around `finding.line_start`.
  2. Prompt Google Gemini (`gemini-2.5-flash-lite`) with the real file excerpt, rule identifier, and language.
  3. Generate a strict unified diff that applies directly to the target file.
- **Backend Dependencies:** Google Gemini API (`GEMINI_API_KEY`) with fallback to local AST parameterization parser.
- **Data Model Implications:** None (reuses `RemediationPatch.diff_content`).
- **User Impact:** Fix proposals actually match the code the developer wrote. 1-click apply no longer crashes with `ValueError: Original code snippet not found`.
- **Implementation Complexity:** Medium.
- **Risk:** Low (can maintain a safe AST syntax fallback if LLM is unreachable).
- **Acceptance Criteria:**
  - Patch generation for an SQL injection in a FastAPI route produces a diff referencing `FastAPI` / `SQLAlchemy`, not Flask.
  - Applying the patch modifies the real target file without error.

---

### Work Package P0.2: Implement Real Verification Re-scan in Autofix
- **Problem Being Solved:** The endpoint `/api/v1/code/autofix/proposals/{id}/validate` creates a `RemediationValidation` record with status `"PASSED"` and a hardcoded summary without executing any scanner.
- **Affected Files:**
  - `backend/app/api/v1/autofix.py` (lines 572–585)
  - `backend/app/services/validation_service.py`
- **Proposed Change:**
  1. Create an isolated temporary git worktree: `git worktree add <temp_dir> <branch>`.
  2. Apply the proposed unified diff to `<temp_dir>`.
  3. Execute `semgrep scan --config auto <temp_dir>` or `builtin.py`.
  4. Parse the actual scan exit code and stdout.
  5. Only set `status = "PASSED"` if the scanner confirms 0 residual findings.
- **Backend Dependencies:** `subprocess_runner.py`, `SecurityVerificationEngine`.
- **Data Model Implications:** `RemediationValidation.status` correctly reflects real scanner execution (`PASSED` or `FAILED`).
- **User Impact:** Guarantees that patches labeled "Validated & Passed" truly eradicate the vulnerability and introduce zero regressions.
- **Implementation Complexity:** Medium.
- **Risk:** Low.
- **Acceptance Criteria:**
  - A faulty patch is marked `FAILED` with real compiler or scanner error messages.
  - A valid patch records true scanner execution time and tool exit code.

---

### Work Package P0.3: Deactivate Fabricated Cloud Data Seeding
- **Problem Being Solved:** `CloudService.ensure_baseline_cloud_data_seeded()` automatically seeds fake AWS/GCP connections and fake S3 bucket observations into PostgreSQL, violating Rule 1 and Rule 10.
- **Affected Files:**
  - `backend/app/cloud/service.py` (lines 1120–1250)
- **Proposed Change:**
  1. Remove calls to `ensure_baseline_cloud_data_seeded()`.
  2. When no cloud integration exists, return empty lists and set `status = "NOT_CONFIGURED"`.
  3. Update `/cloud` UI to display the authentic "Connect Your Cloud Provider" state with instructions for AWS IAM Role delegation.
- **Backend Dependencies:** None.
- **Data Model Implications:** Deletes seeded fake records from `cloud_connections`, `cloud_resources`, and `cloud_security_observations`.
- **User Impact:** Protects enterprise credibility. Kavach never displays fake S3 buckets or invented cloud accounts.
- **Implementation Complexity:** Low.
- **Risk:** Low.
- **Acceptance Criteria:**
  - A clean project shows `0 Cloud Connections` and `NOT CONNECTED`.
  - No synthetic S3 bucket (`production-user-assets`) is inserted into the database.

---

### Work Package P0.4: Eliminate Fallback Finding Theft
- **Problem Being Solved:** When an invalid or deleted finding ID is requested, `FindingService.get_finding_detail()` and `AIRemediationOrchestrator` run `select(SecurityFinding).limit(1)` and return a random finding.
- **Affected Files:**
  - `backend/app/services/finding_service.py` (lines 54–58, 265–269)
  - `backend/app/services/ai_remediation_orchestrator.py` (lines 296–300)
- **Proposed Change:** Replace fallback query with an explicit `HTTPException(status_code=404, detail="Finding not found")`.
- **Backend Dependencies:** None.
- **Data Model Implications:** None.
- **User Impact:** Prevents engineers from acting on incorrect vulnerability data.
- **Implementation Complexity:** Very Low.
- **Risk:** Low.
- **Acceptance Criteria:**
  - Requesting an invalid UUID returns HTTP 404, not a random finding.

---

## 3. Priority Tier P1 — Navigation & Information Architecture

### Work Package P1.1: Lock `Sidebar.tsx` into a Permanent 7-Item Navigation
- **Problem Being Solved:** The sidebar switches between 10 different sub-menus depending on the URL path, disorienting users.
- **Affected Files:**
  - `frontend/components/navigation/Sidebar.tsx`
  - `frontend/components/layout/AppShell.tsx`
- **Proposed Change:**
  1. Remove all route-morphing condition blocks (`isSastWorkspace`, `isDependenciesWorkspace`, `isIacWorkspace`, `isContainerSecurityWorkspace`, `isSalesWorkspace`).
  2. Implement a single permanent 7-item navigation list:
     - Security HQ (`/overview`)
     - Assets (`/assets`)
     - Findings (`/findings`)
     - Fixes & PRs (`/fixes`)
     - Security Runs (`/runs`)
     - Policies & Governance (`/policies`)
     - Settings & Integrations (`/settings`)
  3. Move advanced runtime tools (Protect, Agent Guard, SOC) into an expandable "Specialized Defense" sub-group.
  4. Remove Sales and QA suites from the authenticated sidebar.
- **Backend Dependencies:** None.
- **Data Model Implications:** None.
- **User Impact:** Navigation remains stable, predictable, and permanent across every screen in the application.
- **Implementation Complexity:** Medium.
- **Risk:** Medium (requires ensuring all sub-pages have breadcrumbs or parent tabs).
- **Acceptance Criteria:**
  - Navigating to any route preserves the identical 7 sidebar navigation items.
  - Active route highlighting accurately indicates the current top-level section.

---

### Work Package P1.2: Consolidate Duplicate Overviews into Unified Security HQ
- **Problem Being Solved:** Seven different overview dashboards (`/overview`, `/home`, `/dashboard`, `/code`, `/code/sast`, `/code/dependencies`, `/code/iac`) confuse users.
- **Affected Files:**
  - `frontend/app/(platform)/overview/page.tsx`
  - `frontend/app/(platform)/home/page.tsx`
  - `frontend/app/(platform)/code/page.tsx`
- **Proposed Change:**
  1. Merge the quick search command hero from `/home` into the top of `/overview`.
  2. Consolidate repository health and attention feeds from `/code` into `/overview`.
  3. Place 301 redirects on `/home`, `/code`, and `/dashboard` pointing to `/overview`.
- **Backend Dependencies:** `GET /api/v1/home/overview`.
- **Data Model Implications:** None.
- **User Impact:** Single, unified landing command center for the entire platform.
- **Implementation Complexity:** Medium.
- **Risk:** Low.
- **Acceptance Criteria:**
  - Visiting `/`, `/home`, `/code`, or `/dashboard` lands seamlessly on unified Security HQ.

---

### Work Package P1.3: Consolidate 9 Finding Tables into Unified Findings Hub
- **Problem Being Solved:** Vulnerabilities are fragmented across 9 separate pages, making global risk triage impossible.
- **Affected Files:**
  - `frontend/app/(platform)/findings/page.tsx`
  - Specialized finding pages (`code/sast/findings`, `code/secrets`, `code/dependencies/vulnerabilities`, `code/iac/findings`, `container-security/findings`, `api-security/findings`)
- **Proposed Change:**
  1. Standardize `/findings` as the authoritative destination.
  2. Add prominent category filter chips at the top: `[All]`, `[Code / SAST]`, `[Secrets]`, `[Dependencies / SCA]`, `[IaC]`, `[Containers]`, `[APIs]`.
  3. Deprecate individual finding pages and redirect their routes to `/findings?category=<CAT>`.
- **Backend Dependencies:** `GET /api/v1/findings` (already supports `category` query parameter).
- **Data Model Implications:** None.
- **User Impact:** Security engineers can view, search, and batch-remediate all vulnerabilities in one table.
- **Implementation Complexity:** Medium.
- **Risk:** Low.
- **Acceptance Criteria:**
  - Filtering by "Secrets" displays Gitleaks findings.
  - Filtering by "Dependencies" displays OSV CVEs.
  - Filtering by "All" displays unified sorted vulnerabilities.

---

### Work Package P1.4: Consolidate 8 Scan Pages into Unified Security Runs Hub
- **Problem Being Solved:** Scan telemetry and execution logs are split across 8 duplicate pages, including a 5,500-line monolithic `code/jobs/page.tsx`.
- **Affected Files:**
  - `frontend/app/(platform)/runs/page.tsx`
  - `frontend/app/(platform)/code/jobs/page.tsx` (5,500 lines)
  - Specialized scan pages (`code/sast/scans`, `code/dependencies/scans`, etc.)
- **Proposed Change:**
  1. Elevate `/runs` as the single authoritative scan pipeline center.
  2. Add sub-tabs: `[Execution Runs]`, `[Scheduled Scans]`, `[CI/CD Gates]`.
  3. Migrate schedule creation from `code/jobs` into `/runs`.
  4. Deprecate and delete `code/jobs` (saving 5,500 lines of dead code).
- **Backend Dependencies:** `GET /api/v1/runs`, `GET /api/v1/projects/{id}/github/security-jobs`.
- **Data Model Implications:** None.
- **User Impact:** Single, unified location to check scan progress, inspect terminal logs, and configure scan schedules.
- **Implementation Complexity:** Medium.
- **Risk:** Medium.
- **Acceptance Criteria:**
  - All scanner types (Semgrep, Gitleaks, Checkov, Trivy, OSV) stream logs on `/runs/[runId]`.

---

## 4. Priority Tier P2 — AI Remediation & Contextual Copilot

### Work Package P2.1: Contextual In-Place Drawer Remediation
- **Problem Being Solved:** Triage on `/findings` and remediation on `/code/autofix` are disconnected.
- **Affected Files:**
  - `frontend/app/(platform)/findings/page.tsx` (slide-over drawer component)
  - `frontend/app/(platform)/findings/[id]/page.tsx`
- **Proposed Change:**
  1. Add a dedicated "AI Remediation" tab inside the finding slide-over drawer.
  2. Clicking "Generate Fix" renders the interactive code diff directly inside the drawer.
  3. Clicking "Create Pull Request" dispatches PR creation and displays the GitHub PR link inline.
- **Backend Dependencies:** `POST /api/v1/findings/{id}/pr`, `POST /api/v1/code/autofix/generate`.
- **Data Model Implications:** None.
- **User Impact:** Complete end-to-end remediation in 2 clicks without leaving the findings feed.
- **Implementation Complexity:** High.
- **Risk:** Low.
- **Acceptance Criteria:**
  - Engineer clicks finding → clicks "Generate Fix" → views diff → clicks "Create PR" → PR created on GitHub — all inside the same drawer.

---

### Work Package P2.2: Universal Contextual Copilot Slide-Over
- **Problem Being Solved:** The AI Assistant is isolated on a full-page chat screen (`/assistant`).
- **Affected Files:**
  - `frontend/components/assistant/AssistantDrawer.tsx` (new component)
  - `frontend/components/layout/AppShell.tsx`
- **Proposed Change:**
  1. Create a global slide-over copilot drawer accessible from any page via `⌘K` or a bottom-right floating badge.
  2. Pass active screen context (current repository, active finding, or active run) to the copilot prompt automatically.
- **Backend Dependencies:** `POST /api/v1/assistant/chat`.
- **Data Model Implications:** None.
- **User Impact:** AI assistance is available instantly at the point of work.
- **Implementation Complexity:** Medium.
- **Risk:** Low.
- **Acceptance Criteria:**
  - Pressing `⌘K` on `/findings` opens the copilot with context pre-set to the active repository.

---

## 5. Priority Tier P3 — Advanced Capabilities & Product Polish

### Work Package P3.1: Consolidated Assets Hub (`/assets`)
- **Problem Being Solved:** Repositories, cloud accounts, container registries, and APIs are managed in disconnected locations.
- **Affected Files:**
  - `frontend/app/(platform)/assets/page.tsx` (new route)
- **Proposed Change:**
  1. Create `/assets` housing tabs for: Repositories, Cloud Accounts, Container Registries, APIs, and Packages.
  2. Provide a unified security posture score for each asset.
- **Backend Dependencies:** Unified asset aggregation service.
- **Data Model Implications:** Unify asset relationships.
- **User Impact:** Clean asset-first view matching Aikido and Wiz architectures.
- **Implementation Complexity:** High.
- **Risk:** Medium.

---

### Work Package P3.2: Automated PR Inline Diff Comments
- **Problem Being Solved:** Webhooks update commit statuses, but do not annotate vulnerable lines directly on GitHub Pull Requests.
- **Affected Files:**
  - `backend/app/code/pr_review_bot.py`
  - `backend/app/services/github_service.py`
- **Proposed Change:** Connect GitHub Review Comments API to post inline findings on PR diffs.
- **Backend Dependencies:** GitHub Pull Request Reviews API.
- **Data Model Implications:** None.
- **User Impact:** Developers see security findings directly in their GitHub PR code review flow.
- **Implementation Complexity:** Medium.
- **Risk:** Low.

---

## 6. Implementation Summary Matrix

| Work Package | Tier | Primary Impact | Complexity | Dependencies |
|---|---|---|---|---|
| **P0.1 Real AST Diffs** | P0 | Eliminates hardcoded Flask code diffs | Medium | Gemini API |
| **P0.2 Real Validation Re-scan** | P0 | Replaces fake "PASSED" stub with real Semgrep | Medium | `subprocess_runner` |
| **P0.3 Stop Fake Cloud Seeding** | P0 | Removes fabricated S3 bucket data | Low | Database cleanup |
| **P0.4 Fix Finding Theft Fallback** | P0 | Returns 404 instead of random finding | Very Low | None |
| **P1.1 Permanent 7-Item Sidebar** | P1 | Eliminates disorienting route-morphing | Medium | `Sidebar.tsx` |
| **P1.2 Unified Security HQ** | P1 | Merges `/home` and `/overview` | Medium | Frontend routes |
| **P1.3 Single Findings Hub** | P1 | Unifies 9 finding tables into one feed | Medium | Filter chips |
| **P1.4 Single Security Runs Hub** | P1 | Unifies 8 scan pages; deletes 5,500L `code/jobs`| Medium | Telemetry view |
| **P2.1 In-Place Drawer Autofix** | P2 | 1-click remediation inside finding drawer | High | Finding drawer |
| **P2.2 Universal Copilot Drawer** | P2 | Slide-over AI copilot on every screen | Medium | `AppShell.tsx` |
| **P3.1 Consolidated Assets Hub** | P3 | Unifies Repos, Cloud, Containers, APIs | High | Asset service |
| **P3.2 GitHub PR Inline Annotations**| P3 | Posts finding comments directly to GitHub PRs | Medium | GitHub API |

