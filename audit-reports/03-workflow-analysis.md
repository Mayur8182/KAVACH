# KAVACH — END-TO-END WORKFLOW DISCOVERY & GAP ANALYSIS

**Report ID:** KAV-AUDIT-03  
**Author:** Staff Full-Stack Engineer & Application Security Architect  
**Date:** November 2026  
**Status:** COMPLETE & EMPIRICALLY VERIFIED  
**Scope:** Workflows A through G (End-to-End Tracing)  

---

## 1. Workflow A: Developer Onboarding

### 1. Expected User Journey
Sign up → Verify email → Create workspace/organization → Connect GitHub account via OAuth / GitHub App → Select initial repositories → Configure scanner preferences → Trigger first scan → View findings feed.

### 2. Existing UI Entry Point
- URL: `frontend/app/(auth)/signup/page.tsx` transitioning to `frontend/app/onboarding/page.tsx`.
- Subsequent steps: `/onboarding/organization`, `/onboarding/workspace`, `/onboarding/connect-github`, `/onboarding/project`, `/onboarding/configuration`, `/onboarding/complete`.

### 3. Actual Frontend Implementation
- The onboarding wizard is implemented across 12 distinct pages in `frontend/app/onboarding/`.
- `frontend/app/onboarding/page.tsx` checks user state:
  ```typescript
  const res = await api.onboarding.getStatus();
  if (res.onboarding_completed) router.replace('/overview');
  ```
- Steps transition sequentially, saving step progress to `api.onboarding.updateState()`.

### 4. Backend Execution Path
- Signup: `POST /api/v1/auth/register` (`backend/app/api/v1/auth.py`) hashes password with Argon2id, generates random verification token, and creates `User` record.
- Organization creation: `POST /api/v1/organizations` (`backend/app/api/v1/onboarding.py:76`) persists `Organization` and logs `ORGANIZATION_CREATED` to `AuditEvent`.
- Workspace creation: `POST /api/v1/workspaces` links `Workspace` to the organization.
- GitHub connection: `GET /api/v1/auth/github` redirects to GitHub OAuth; callback `GET /api/v1/auth/github/callback` exchanges code for access token and upserts `GitHubRepository` records.

### 5. Data Persistence
- Tables: `users`, `organizations`, `workspaces`, `projects`, `github_installations`, `github_repositories`, `audit_events`.

### 6. External Integrations
- GitHub OAuth API (`https://github.com/login/oauth/authorize`).
- GitHub REST API (`https://api.github.com/user/installations`, `/user/repos`).

### 7. Error Handling
- Invalid GitHub credentials trigger `AUTHENTICATION FAILED`.
- Missing token triggers `401 Unauthorized`.
- Non-unique organization slugs are handled by appending random hex characters (`backend/app/api/v1/onboarding.py:100`).

### 8. Current Working Steps
- Step 1 (Signup & JWT issue): **WORKING**
- Step 2 (Create organization & workspace): **WORKING**
- Step 3 (GitHub OAuth connect): **WORKING**
- Step 4 (Repository listing & selection): **WORKING**
- Step 5 (First scan trigger): **PARTIAL** (Scan triggers, but onboarding wizard redirects user to `/overview` before scan finishes, leaving user with empty initial cards).

### 9. Disconnected or Missing Steps
- **Broken First Scan Transition:** The onboarding wizard creates a scan job, but does not provide a live scan progress screen before landing on the dashboard. Users see "0 findings" because the background worker is still running Semgrep/Gitleaks.
- **Overcomplicated Steps:** 12 separate pages for onboarding is excessive. Competitors (Aikido, Snyk) complete onboarding in a 3-step modal (Sign up with GitHub → Select Repos → Initial Scan Running).

### 10. Code Evidence
- `frontend/app/onboarding/connect-github/page.tsx`
- `backend/app/api/v1/onboarding.py:76-150`
- `backend/app/api/v1/github.py:90-140`

---

## 2. Workflow B: Vulnerability Detection & Scanning

### 2.1 Expected User Journey
Select repository → Choose branch → Trigger scan → Background worker queues job → Execute security scanners (Semgrep, Gitleaks, Checkov, Trivy, OSV) → Aggregate and normalize outputs into unified finding schema → Deduplicate by fingerprint → Persist findings in PostgreSQL → Update dashboard and findings feed with real-time progress.

### 2.2 Existing UI Entry Point
- Trigger: Button labeled "Run Security Verification" on `/repositories`, `/runs/new`, or `/overview`.
- View: `/runs/[runId]` and `/findings`.

### 2.3 Actual Frontend Implementation
- Trigger invokes `api.scans.trigger(projectId, { repository, branch, scanners })`.
- `/runs/[runId]` opens and polls `api.runs.get(runId)` every 2,000ms.
- Real-time step tracker displays: "Cloning repository", "Running Semgrep", "Running Gitleaks", "Evaluating OPA policies", "Storing findings".
- Findings list dynamically re-renders on `/findings` via `api.findings.list({ project_id })`.

### 2.4 Backend Execution Path
- Endpoint: `POST /api/v1/projects/{project_id}/scans` (`backend/app/api/v1/scans.py:73`).
- Service: `ScanService.trigger_scan()` (`backend/app/services/scan_service.py`).
- Worker: Submits `BackgroundTask` to `backend/app/core/task_worker.py`.
- Execution: `SecurityVerificationEngine.execute_scan()` (`backend/app/engines/scanner/engine.py:89`):
  - Checks out repo to isolated directory (`backend/scratch/github_workspaces/job_<uuid>`).
  - Executes `semgrep` CLI via subprocess runner.
  - Executes `gitleaks` CLI via subprocess runner.
  - If binaries are missing, executes `backend/app/engines/scanner/builtin.py` (AST/Regex).
- Normalization: Transforms raw JSON outputs into `NormalizedFindingCandidate` dataclasses.
- Deduplication: Computes SHA256 fingerprint: `hashlib.sha256(f"{rule_id}:{file_path}:{line}".encode()).hexdigest()`.
- Persistence: Ingests into `SecurityFinding` table, records `ScannerExecution` rows.

### 2.5 Data Persistence
- Tables: `security_scans`, `scanner_executions`, `security_findings`, `background_tasks`.
- Currently verified: **20,331 real findings** and **165 scans** persisted in database.

### 2.6 External Integrations
- Local binaries: `semgrep`, `gitleaks`, `checkov`, `trivy`, `osv-scanner`.
- Remote GitHub VCS clone via `git clone --depth 1`.

### 2.7 Error Handling
- If scanner binary exits non-zero and produces no JSON: marks scanner execution as `FAILED` with stderr logged in DB (`backend/app/engines/scanner/base.py:112`).
- Never fabricates zero findings on failure (complies with Rule 9).

### 2.8 Current Working Steps
- Full pipeline (Trigger → Task Queue → Subprocess Execution → Normalization → DB Save → UI Display): **WORKING END-TO-END**.

### 2.9 Disconnected or Missing Steps
- **Finding Silos:** Findings are saved into `security_findings`, but specialized modules (API Security, Cloud) write to separate tables (`api_findings`, `cloud_security_observations`). A user looking at `/findings` does not see API findings or Cloud findings!
- **Excessive Scan Pages:** As noted in Audit 02, scan results are displayed across 8 different pages (`/runs`, `/code/jobs`, `/code/sast/scans`, etc.).

### 2.10 Code Evidence
- `backend/app/engines/scanner/engine.py:89-180`
- `backend/app/engines/scanner/semgrep.py:20-100`
- `backend/app/engines/scanner/builtin.py:18-120`
- `backend/app/services/scan_service.py:140-250`

---

## 3. Workflow C: AI Vulnerability Investigation

### 3.1 Expected User Journey
Select finding from findings table → Click "Investigate with AI" or click Finding Drawer → Retrieve finding context and source file from repository → Extract AST taint source and sink → LLM explains vulnerability mechanism, attack scenario, and exploit impact → Recommend concrete remediation steps.

### 3.2 Existing UI Entry Point
- Finding Drawer on `/findings` or `/findings/[id]`.
- Or Chat UI on `/assistant` by clicking quick-action pill "Explain Finding" or asking natural-language question.

### 3.3 Actual Frontend Implementation
- In `/findings`, clicking a finding opens the slide-over drawer with `FindingDetailModal.tsx` calling `api.findings.getDetail(findingId)`.
- In `/assistant`, typing "Explain finding SEC-001" dispatches `POST /api/v1/assistant/chat`. The response includes markdown explanation and a dynamic UI card schema (`UISchemaBuilder.vulnerability_detail`).

### 3.4 Backend Execution Path
- Router: `POST /api/v1/assistant/chat` (`backend/app/api/v1/assistant.py:480`).
- Orchestrator: `CentralActionOrchestrator.process_user_query()` (`backend/app/intelligence/action_orchestrator.py:185`).
- Intent Classifier: Identifies `INVESTIGATE_FINDING`.
- Context Retrieval: `_handle_investigate_finding()` (`action_orchestrator.py:2000`):
  - Fetches `SecurityFinding` record from DB.
  - Reads surrounding lines from file on disk if available (`action_orchestrator.py:2205`):
    ```python
    with open(finding.file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        code_snip = "".join(lines[start:end])
    ```
  - Redacts potential secrets using `redact_credentials()`.
  - Dispatches prompt to Google Gemini (`gemini-2.5-flash-lite`) if `GEMINI_API_KEY` is configured (`action_orchestrator.py:1968`).
  - Builds dynamic UI schema with structured action buttons ("Generate Patch", "Create PR").

### 3.5 Data Persistence
- Tables: `ai_conversations`, `ai_messages`, `security_findings`.

### 3.6 External Integrations
- Google Gemini API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`).
- Fallback: Local deterministic AST explanations.

### 3.7 Error Handling
- If finding ID is not found, returns clear "Finding Not Found" dynamic UI card (`action_orchestrator.py:2174`).
- If Gemini API call times out or fails (e.g. rate limit), falls back gracefully to deterministic rule explanations without breaking the chat session.

### 3.8 Current Working Steps
- Finding selection, local file reading, redaction, intent classification, Gemini LLM generation, dynamic UI schema generation: **WORKING**.

### 3.9 Disconnected or Missing Steps
- **Finding ID Fallback Bug:** In `backend/app/services/finding_service.py:54-58`, if the requested `finding_id` is missing, the code runs `select(SecurityFinding).limit(1)` and returns an arbitrary finding! This gives the user false information about a completely different vulnerability.

### 3.10 Code Evidence
- `backend/app/intelligence/action_orchestrator.py:1940-2300`
- `backend/app/services/finding_service.py:54-120`

---

## 4. Workflow D: AI Autofix & Remediation

### 4.1 Expected User Journey
Select finding → Click "Generate Fix" → AI inspects actual vulnerable file → Synthesizes minimal non-breaking patch → Clones workspace into isolated branch (`kavach/autofix-<id>`) → Applies unified diff → Runs test suite & rescan with Semgrep → Verifies 0 residual findings → Creates GitHub Pull Request → Polls PR merge status → Marks finding as RESOLVED once merged.

### 4.2 Existing UI Entry Point
- Trigger: Button "Fix with AI" in `/findings/[id]`, or "Generate All Fixes" on `/code/autofix` or `/fixes`.
- Tracking: `/code/autofix` and `/code/pull-requests`.

### 4.3 Actual Frontend Implementation
- Invokes `POST /api/v1/code/autofix/generate` (`api.code.generateFixes()`).
- Renders unified interactive diff with syntax highlighting (`CodeDiffViewer`).
- User reviews diff and clicks "Validate & Rescan" (`api.code.validateProposal()`).
- User clicks "Create Pull Request" (`api.code.createProposalPr()`).

### 4.4 Backend Execution Path
- Router: `backend/app/api/v1/autofix.py`.
- Service: `AIRemediationOrchestrator` (`backend/app/services/ai_remediation_orchestrator.py`).
- Pipeline: `RemediationPipeline` (`backend/app/code/remediation_pipeline.py`).

### 4.5 Data Persistence
- Tables: `remediation_plans`, `remediation_patches`, `remediation_validations`, `github_pull_requests`, `security_findings`.

### 4.6 External Integrations
- GitHub Pull Request API (`POST https://api.github.com/repos/{owner}/{repo}/pulls`).
- GitHub Git Data API (creates branch refs, commits tree blob).

### 4.7 CRITICAL DEFICIENCIES & NON-WORKING STEPS
During deep inspection, **four critical integrity violations** were discovered in Workflow D:

1. **Hardcoded Patch Diffs (`_generate_deterministic_patch`):**
   In `backend/app/services/ai_remediation_orchestrator.py:468–518`, patch generation **completely ignores the user's actual source file content**! It uses four hardcoded string templates:
   - SQL: `def get_user(user_id): query = f"SELECT * FROM users WHERE id = {user_id}"`
   - Secrets: `AWS_SECRET_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"`
   - XSS: `element.innerHTML = userInput;`
   - Command Injection: `def execute_task(param): os.system(f'run-task {param}')`
   If the user has an injection in a FastAPI route (`app/api/users.py`), the generated diff replaces non-existent Flask code!
2. **Hardcoded Patch Diffs in FindingService:**
   In `backend/app/services/finding_service.py:80–118`, the service hardcodes a Flask `@app.route('/user')` snippet. When `apply_fix` executes (`line 328`), it checks `if original_code not in content:` and throws:
   `ValueError: Original code snippet not found in target file. Cannot apply patch deterministically.`
3. **Fake Validation Stamp in `autofix.py`:**
   In `backend/app/api/v1/autofix.py:572–581`, the `/validate` endpoint marks the patch as `PASSED` without actually running Semgrep:
   ```python
   validation = RemediationValidation(
       status="PASSED",
       command_or_tool="semgrep scan --config auto",
       result_summary="Deterministic verification passed: 0 vulnerabilities found in patched region.",
   )
   ```
   This is a direct violation of Rule 2 ("NO FAKE SUCCESS") and Rule 8 ("REAL SECURITY TOOLS MUST ACTUALLY RUN").
4. **Arbitrary Finding Theft on Fallback:**
   In `backend/app/services/ai_remediation_orchestrator.py:297`, if the requested `finding_id` is missing, it runs `select(SecurityFinding).limit(1)` and generates a fix for whatever random finding is in the database!

### 4.8 Current Working vs Broken Steps
- Plan & patch database tracking: **WORKING**
- Real GitHub Pull Request submission (via Git API token): **WORKING** (Creates real branch and PR on GitHub)
- Real-time PR merge status sync (`_sync_github_prs`): **WORKING**
- Patch generation against actual file lines: **BROKEN** (Hardcoded template diffs)
- Deterministic verification re-scan: **BROKEN** (Hardcoded "PASSED" stub)

### 4.9 Code Evidence
- `backend/app/services/ai_remediation_orchestrator.py:468-518`
- `backend/app/services/finding_service.py:80-118, 328-335`
- `backend/app/api/v1/autofix.py:572-581`

---

## 5. Workflow E: Continuous Security & PR Checks

### 5.1 Expected User Journey
Developer creates PR or pushes commit to GitHub → GitHub dispatches webhook to Kavach → Verify HMAC-SHA256 signature → Ingest event and enforce idempotency → Determine changed files → Run targeted scanners (e.g. SAST if code changed, Checkov if `.tf` changed) → Evaluate OPA policies against new findings → Post commit status check (Pass/Fail) or PR comment to GitHub.

### 5.2 Existing UI Entry Point
- External: GitHub Pull Request checks UI.
- Internal: `/code/pull-requests` and `/ci-cd`.

### 5.3 Actual Frontend Implementation
- `/code/pull-requests` queries `api.pullRequests.list()`.
- Table displays: PR title, Branch, Author, Security Status (`PASSING`, `BLOCKING`), Open findings count, and direct link to GitHub.

### 5.4 Backend Execution Path
- Webhook Ingestion: `POST /api/v1/integrations/github/webhooks` (`backend/app/api/v1/github.py:57`).
- HMAC Verification: `verify_github_signature()` verifies payload against configured secret.
- Idempotency Gate: Queries `GitHubWebhookEvent` by `delivery_id` to discard duplicates.
- Background Dispatcher: `GitHubService.dispatch_webhook_event_background()` (`backend/app/services/github_service.py:348`).
- Smart Scanner Resolution: `ScanOrchestrator.determine_required_scanners()` (`backend/app/services/scan_orchestrator.py:82`) inspects commit diff:
  - If `.tf`, adds `IAC`.
  - If `package.json`, adds `SCA`.
  - If `.py`/`.ts`, adds `SAST`.
- Policy Evaluation: `PolicyEngine.evaluate_pr_policy()` (`backend/app/engines/policy/engine.py`).
- GitHub Commit Status: `GitHubService.post_commit_status()` sets context `kavach/security-gate` to `success` or `failure`.

### 5.5 Data Persistence
- Tables: `github_webhook_events`, `github_pull_requests`, `github_security_jobs`, `security_scans`, `security_findings`, `audit_events`.

### 5.6 External Integrations
- GitHub Webhooks (`push`, `pull_request`, `installation`).
- GitHub Status API (`POST https://api.github.com/repos/{owner}/{repo}/statuses/{sha}`).
- GitHub Check Runs API (`POST https://api.github.com/repos/{owner}/{repo}/check-runs`).

### 5.7 Error Handling
- Invalid HMAC signature returns `401 Unauthorized` and logs audit alert.
- Malformed JSON returns `400 Bad Request`.
- Missing repository mapping returns `200 OK` with status `IGNORED` (standard webhook practice).

### 5.8 Current Working Steps
- Webhook signature verification, idempotency, event ingestion, smart scanner selection, background job creation, PR database tracking: **WORKING END-TO-END**.

### 5.9 Disconnected or Missing Steps
- **PR Commenting:** The backend posts commit statuses (`success`/`failure`), but the inline PR diff comment generator (`backend/app/code/pr_review_bot.py`) is partially configured and does not post inline finding annotations to GitHub lines.

### 5.10 Code Evidence
- `backend/app/api/v1/github.py:57-84`
- `backend/app/services/github_service.py:268-450`
- `backend/app/services/scan_orchestrator.py:82-140`

---

## 6. Workflow F: Cloud & Infrastructure Posture

### 6.1 Expected User Journey
Connect AWS/Azure/GCP account via IAM Role or Workload Identity → Discover cloud assets (S3, RDS, IAM, K8s, ALB) → Run Checkov/Prowler configuration scans → Detect misconfigurations → Associate findings with cloud assets → Suggest remediation → Verify fix.

### 6.2 Existing UI Entry Point
- URL: `/cloud` (and 21 sub-pages: `/cloud/assets`, `/cloud/findings`, `/cloud/iam`, `/cloud/network`, etc.).

### 6.3 Actual Frontend Implementation
- Complex suite with 22 pages, asset search, network topology diagrams, and blast-radius graph canvas.

### 6.4 Backend Execution Path
- Router: `backend/app/cloud/router.py`.
- Service: `backend/app/cloud/service.py` (`CloudService`).

### 6.5 Data Persistence
- Tables: `cloud_connections`, `cloud_resources`, `cloud_security_observations`, `cloud_iam_roles`, `cloud_networks`.

### 6.6 CRITICAL DEFICIENCY: FABRICATED DATA SEEDING
During code inspection of `backend/app/cloud/service.py:1120–1250`, it was discovered that **the backend automatically seeds fake cloud data**:
```python
async def ensure_baseline_cloud_data_seeded(self, project_id: Optional[uuid.UUID] = None) -> uuid.UUID:
    """Seeds realistic initial cloud infrastructure state if none exists in DB."""
    # 1. Seeds fake AWS connection ("123456789012")
    # 2. Seeds fake GCP connection ("seculayer-prod-102")
    # 3. Seeds fake S3 bucket ("production-user-assets") with is_public=True
    # 4. Seeds fake RDS cluster ("prod-aurora-postgres")
    # 5. Seeds fake ALB ("prod-ingress-alb")
    # 6. Seeds fake Critical observations ("CIS_AWS_2.1.5_S3_PUBLIC_READ")
```
This is a direct violation of AGENTS.md Rule 1 ("NO HARDCODED DATA") and Rule 10 ("REAL INTEGRATIONS ONLY: If credentials are missing: NOT CONNECTED").

### 6.7 Current Working vs Broken Steps
- Frontend interface & DB models: **WORKING**
- Live AWS / GCP / Azure Discovery: **NOT IMPLEMENTED** (relies on auto-seeded baseline data).

### 6.8 Suggested Remedy
Deactivate `ensure_baseline_cloud_data_seeded()`. When no cloud connection exists, `/cloud` must display the authentic `NOT CONNECTED` state with instructions to connect an AWS IAM Role. Hide the 22 cloud sub-pages until real cloud workers are deployed.

---

## 7. Workflow G: Security Operations & Incident Triage (SOC)

### 7.1 Expected User Journey
Telemetry event ingested (CloudTrail, Kubernetes Audit, MCP Gateway) → Correlation engine matches detection rules → Generate high-confidence alert → Analyst acknowledges alert → Create incident investigation case → Attach findings & evidence → Execute authorized response action (e.g. block IP, revoke token, isolate pod) → Audit event preserved.

### 7.2 Existing UI Entry Point
- URL: `/soc` and `/protect`.

### 7.3 Actual Frontend Implementation
- Real-time alert triage feed, MTTA/MTTD KPI cards, investigation case workspace, evidence drawer.

### 7.4 Backend Execution Path
- Router: `backend/app/api/v1/soc.py` (894 lines).
- Service: `backend/app/soc/service.py` (`SocService`, 932 lines).
- Models: `SecurityEvent`, `DetectionRule`, `InvestigationCase`, `EventSource`.

### 7.5 Data Persistence
- Tables: `soc_events`, `soc_alerts`, `soc_cases`, `detection_rules`, `audit_events`.

### 7.6 Current Working Steps
- Detection rule seeding (`seed_default_rules()`): **WORKING**
- Case creation and alert acknowledgment: **WORKING**
- Real-time ingestion endpoint (`POST /api/v1/soc/events`): **WORKING**
- Note: In `backend/app/soc/service.py:159`, someone inserted a `return` statement right before legacy fake event seeding, correctly preventing fake alerts from being injected!

### 7.7 Architectural Assessment
While functional, SOC is a **completely different product category** (SecOps / Incident Response) from Kavach's core identity as a **Developer-First DevSecOps & AI Remediation Platform** (like Aikido or Snyk). Keeping it prominent in the primary sidebar confuses developers and security engineers. It should be moved into an expandable "Specialized Defense" drawer or separated cleanly.

---

## 8. Summary of Workflow Status

| Workflow | End-to-End Status | Primary Working Component | Primary Broken / Missing Component |
|---|---|---|---|
| **Workflow A: Onboarding** | **PARTIAL** | Auth, Org creation, GitHub OAuth, Repo sync | Wizard drops user on dashboard before initial scan completes; 12 pages is too long |
| **Workflow B: Vulnerability Detection** | **WORKING** | Full CLI runner (Semgrep, Gitleaks, Checkov) + Builtin AST engine + DB persistence | Output fragmented across 9 separate finding tables and 8 scan pages |
| **Workflow C: AI Investigation** | **WORKING** | RAG retrieval, Gemini generation, dynamic UI schema | Fallback finding theft bug in `FindingService.get_finding_detail` |
| **Workflow D: AI Autofix** | **PARTIAL** | PR creation on GitHub, VCS status sync | Hardcoded patch templates; fake validation stamp in `/validate` |
| **Workflow E: Continuous Security** | **WORKING** | Webhook HMAC verification, smart scanner selection, commit status checks | Inline PR diff commenting not posting to GitHub |
| **Workflow F: Cloud Security** | **MOCK / UNVERIFIED** | UI components & DB schemas | Auto-seeds fake AWS/GCP resources via `ensure_baseline_cloud_data_seeded` |
| **Workflow G: Security Operations** | **WORKING** | Detection engine, Case workspace, Event ingestion | Disconnected from core DevSecOps developer workflows |

