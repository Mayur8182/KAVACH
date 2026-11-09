# KAVACH — UI & UX QUALITY AUDIT

**Report ID:** KAV-AUDIT-06  
**Author:** Principal Product Architect & Senior UX Engineer  
**Date:** November 2026  
**Status:** COMPLETE & EMPIRICALLY VERIFIED  
**Scope:** Design System, User Journeys, Screens, Playwright Telemetry & Screenshots  

---

## 1. Executive Summary & Design System Identity

Kavach possesses an exceptionally refined visual design language. The design system adheres to modern enterprise B2B aesthetics (inspired by Linear, Vercel, and Stripe):
- **Typography:** Crisp sans-serif (`Inter`, `-apple-system`, `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`).
- **Color Palette:** Slate backgrounds (`#F8FAFC`, `#0F172A`), high-contrast ink text (`#09090B`, `#0F172A`), surgical borders (`#E2E8F0`, `#F1F5F9`), and precise semantic accents (Emerald `#10B981` for verified, Violet `#8B5CF6` for AI synthesis, Amber `#F59E0B` for medium risk, Rose `#EF4444` for critical vulnerabilities).
- **Component Geometry:** 6px / 8px border radii, subtle 1px border dividers, zero decorative gradients or visual clutter.

However, **visual polish cannot compensate for broken information architecture**. The platform suffers from severe structural usability issues: disorienting navigation mutations, disconnected workflows, repetitive KPI metrics cards, and finding silos.

---

## 2. The Five Most Critical Usability Killers

### UX Problem 1: The Morphing Sidebar Disorientation
- **Usability Flaw:** Navigation anchors change dynamically depending on the current route.
- **Evidence:** `frontend/components/navigation/Sidebar.tsx:151–234`. Clicking `/code/sast` strips away the user's links to "Repositories", "Runs", "Fixes", and "Settings", replacing them with a 9-item SAST-only menu.
- **User Impact:** Cognitive disorientation. The user feels trapped inside a sub-product. To return to the main dashboard, they must notice and click the tiny `← Back to Dashboard` text link at the very top.
- **Root Cause:** Treating scanning tools (SAST, SCA, IaC) as separate multi-page products rather than as automated background engines feeding a unified finding feed.

### UX Problem 2: "Dashboarditis" & KPI Card Proliferation
- **Usability Flaw:** The platform forces the user through generic overview dashboards before allowing them to take action.
- **Evidence:** 7 distinct overview dashboards exist across the app (`/overview`, `/home`, `/dashboard`, `/code`, `/code/sast`, `/code/dependencies`, `/code/iac`). Every overview page presents 4 to 8 KPI cards displaying identical or nearly identical numbers (Total Findings, Critical Count, Repos Scanned, Pass Rate).
- **User Impact:** Decision paralysis. A developer logging in to fix a security issue has to view numbers about numbers rather than being presented with the highest-priority vulnerability affecting their repository.
- **Root Cause:** Designing for "executive reporting" rather than "developer task completion".

### UX Problem 3: Vulnerability Fragmentation (The 9 Findings Tables)
- **Usability Flaw:** Vulnerabilities are partitioned into 9 separate, disconnected tables across the product.
- **Evidence:** 
  - SAST vulnerabilities live on `/code/sast/findings`.
  - Secret leaks live on `/code/secrets`.
  - Dependency CVEs live on `/code/dependencies/vulnerabilities`.
  - Terraform misconfigurations live on `/code/iac/findings`.
  - Docker CVEs live on `/container-security/findings`.
  - API vulnerabilities live on `/api-security/findings`.
- **User Impact:** A security engineer auditing `Mayur8182/KAVACH` cannot see all risks in one place. They must manually visit 6 different sections, remember the counts from each, and mentally prioritize between an SQL injection, a leaked AWS key, and an unpinned npm package.
- **Root Cause:** Mirroring backend tool categories in the frontend navigation rather than presenting a unified Asset → Finding model.

### UX Problem 4: Disconnected Remediation Loop
- **Usability Flaw:** Triage and remediation exist on separate pages, breaking the fix momentum.
- **Evidence:** When inspecting a finding on `/findings`, clicking "AutoFix" creates a proposal. However, reviewing the diff, testing the patch, and submitting the PR requires navigating to `/code/autofix` or `/fixes`. Furthermore, `/code/autofix` displays a list of proposals detached from the finding drawer where the engineer was working.
- **User Impact:** High interaction cost. In benchmark products like Aikido, clicking "Fix with AI" generates the diff directly inside the finding slide-over drawer, runs the verification check, and opens the GitHub PR in 1 click without leaving the page.
- **Root Cause:** Building `/code/autofix` as a monolithic 1,830-line separate destination instead of embedding remediation as a contextual action inside the finding drawer.

### UX Problem 5: The "Isolated Chat" Anti-Pattern
- **Usability Flaw:** The AI Assistant is trapped on a full-page chat screen (`/assistant`) detached from where work occurs.
- **Evidence:** `frontend/app/(platform)/assistant/page.tsx`. To ask a question about an active scan or a specific finding, the user must leave `/runs` or `/findings`, navigate to `/assistant`, type the finding name, wait for RAG retrieval, and view the response.
- **User Impact:** Context switching. AI is most useful when it appears contextually alongside code diffs, logs, or vulnerabilities, not as a standalone conversational chatbot.
- **Root Cause:** Treating the AI Copilot as an independent ChatGPT clone rather than an integrated workspace assistant.

---

## 3. Screen-by-Screen User Goal Evaluation

Below is the evaluation of the primary user goal for every major screen in Kavach, assessing whether the user can accomplish it without friction.

### Screen 1: Security HQ / Overview (`/overview` & `/home`)
- **Primary User Goal:** "What is the security status of my projects right now, and what critical issues need my immediate attention?"
- **Can User Accomplish It?:** **PARTIALLY**.
  - *Positive:* Displays critical attention items and recent repository health.
  - *Friction:* Split between `/home` (search launcher) and `/overview` (metrics dashboard). Users are confused about which page is their true home. Displays empty cards for new users without a guided "First Action" prompt.

### Screen 2: Repositories Hub (`/repositories`)
- **Primary User Goal:** "Connect a repository, view which branch is protected, and trigger a security verification."
- **Can User Accomplish It?:** **YES**.
  - *Positive:* Clean search bar, clear "Connect Repository" button, and 1-click "Run Scan" trigger.
  - *Friction:* Repositories are strictly GitHub repos; cloud accounts (AWS/GCP) and container registries (Docker Hub/ECR) cannot be managed here, forcing users into `/cloud` or `/container-security`.

### Screen 3: Security Runs & Pipelines (`/runs`)
- **Primary User Goal:** "See if my latest scan completed, check for failures, and inspect the raw logs if something went wrong."
- **Can User Accomplish It?:** **YES (ON `/runs`), BUT BROKEN BY DUPLICATES**.
  - *Positive:* `/runs/[runId]` provides an exceptional step-by-step terminal log streaming interface.
  - *Friction:* If the user clicks into `/code/jobs`, they see a 5,500-line competing table with different terminology ("Jobs" vs "Runs"). If they are in `/code/sast`, they see `/code/sast/scans`.

### Screen 4: Unified Findings Hub (`/findings`)
- **Primary User Goal:** "Find, filter, understand, and triage open vulnerabilities across all my code assets."
- **Can User Accomplish It?:** **YES**.
  - *Positive:* Rich filtering by severity, status, category, rule, and repository. Slide-over drawer allows quick inspection.
  - *Friction:* When clicking on certain findings, the breadcrumb or links route the user to `/code/sast/findings` or `/code/dependencies/vulnerabilities`, triggering the morphing sidebar anti-pattern.

### Screen 5: Finding Detail Studio (`/findings/[id]`)
- **Primary User Goal:** "Understand the exact line of vulnerable code, verify the attack path, and generate a validated patch."
- **Can User Accomplish It?:** **PARTIALLY**.
  - *Positive:* Code snippet renderer displays the AST sink and line numbers clearly.
  - *Friction:* "Apply Fix" attempts to match hardcoded Flask templates and fails. "Validate" returns a fake "PASSED" stub.

### Screen 6: Fixes & Pull Requests (`/fixes` & `/code/autofix`)
- **Primary User Goal:** "Review AI-generated code diffs, confirm they pass security tests, and submit a PR to GitHub."
- **Can User Accomplish It?:** **PARTIALLY**.
  - *Positive:* Real GitHub PR creation works if GitHub token is present. Real PR merge status synchronizes from GitHub.
  - *Friction:* Code diffs are hardcoded templates (`_generate_deterministic_patch`), so the diff shown does not match the actual repository code.

### Screen 7: Policies & Quality Gates (`/policies`)
- **Primary User Goal:** "Configure blocking rules: e.g. 'Fail pull requests if Critical SAST findings or secret leaks are detected'."
- **Can User Accomplish It?:** **YES**.
  - *Positive:* Real OPA Rego editor, active policy toggle switch, and multi-tenant isolation.
  - *Friction:* Duplicate page exists at `/code/policies`.

### Screen 8: Integrations Hub (`/integrations`)
- **Primary User Goal:** "Connect GitHub, Slack, Jira, or AWS in one click."
- **Can User Accomplish It?:** **YES**.
  - *Positive:* Clear provider cards with status pills (`CONNECTED`, `NOT CONNECTED`).
  - *Friction:* Duplicate page exists at `/settings/integrations`.

---

## 4. Evaluation of State Handling (Loading, Empty, Error, Feedback)

### 4.1 Loading States
- **Status:** **GOOD (7/10)**.
- Primary tables (`/findings`, `/runs`, `/repositories`) utilize clean Lucide `Loader2` spinners with opacity transitions. Skeleton loaders are implemented in `frontend/components/common/SkeletonLoader.tsx`.
- *Issue:* In several sub-pages (`/cloud/assets`, `/qa/test-cases`), the screen flashes blank before displaying data rather than maintaining layout stability.

### 4.2 Empty States
- **Status:** **FAIR (6/10)**.
- When a repository has 0 findings, `/findings` renders a clean `CheckCircle2` icon with "No open vulnerabilities detected".
- *Issue:* When a new workspace has 0 connected repositories, `/overview` renders empty KPI cards with `0`, `0%`, and blank charts, providing no actionable "Get Started" guidance.

### 4.3 Error States
- **Status:** **POOR (4/10)**.
- Backend errors frequently leak raw Python exception tracebacks into the UI.
- In `CentralActionOrchestrator` (`action_orchestrator.py:556`):
  `Technical Reason: {type(exc).__name__}: {str(exc)}` is rendered directly in chat messages.
- If a scanner fails due to missing binaries, several pages render unhandled `TypeError: Cannot read properties of undefined (reading 'map')`.

### 4.4 Contextual Feedback & Toasts
- **Status:** **GOOD (8/10)**.
- The platform uses `goey-toast` (`frontend/package.json:24`). Action triggers ("Scan started", "PR created", "Policy updated") trigger high-contrast, dismissible notification toasts with actionable links.

---

## 5. Summary of UX Audit Ratings

| UX Dimension | Score (1-10) | Evaluation | Primary Action Item |
|---|---|---|---|
| **Visual Design System** | **9 / 10** | Enterprise-grade, clean, professional, excellent typography | Preserve exact design tokens and component styling |
| **Information Architecture** | **3 / 10** | Severely fragmented; 539 pages, 15 sub-suites, route morphing | Lock sidebar permanently; consolidate into 7 destinations |
| **Workflow Continuity** | **4 / 10** | Triage, remediation, and PR tracking are split across separate pages | Embed remediation diffs and PR actions directly into finding drawer |
| **Data Provenance Reality** | **5 / 10** | Real DB and scanners, but ruined by hardcoded diffs and fake cloud seeding | Eliminate hardcoded diffs; remove fake cloud seeding |
| **Error Handling & Resilience**| **5 / 10** | Leaks technical exception names; fallback finding theft | Replace technical exceptions with actionable user guidance |

