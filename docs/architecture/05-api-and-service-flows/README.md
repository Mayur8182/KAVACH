# 05 — API & Service Execution Flows

## Overview

This section traces the end-to-end execution paths of primary workflows through the SecuLayer codebase, showing the exact handoffs between the Frontend UI, the FastAPI Gateway, Service layer, Asynchronous Task Queue, external scanners, and the PostgreSQL database.

---

## 1. Primary Execution Flows

### A. Security Scan Orchestration Flow
1. **Trigger:** User or webhook issues `POST /api/v1/scans` or `/api/hotspots/scan`.
2. **Ingestion:** `ScanOrchestratorService` validates project access, creates a `github_security_jobs` record in `QUEUED` status, and enqueues the job into `background_tasks`.
3. **Execution:** The async `TaskWorker` picks up the job, marks status `RUNNING`, and invokes the scanner sub-process (e.g., Semgrep CLI or Gitleaks CLI).
4. **Deduplication:** Parsed raw results are checked against existing `security_findings` matching `(repository_id, rule_id, file_path, line_start)`. Existing findings update their `detected_at` timestamp; new findings are inserted.
5. **Persistence & Notification:** Summary counts (`findings_by_category`, `severity_breakdown`) are updated on the job record, status is set to `COMPLETED`, and an audit event is emitted.

### B. Security Hotspot Review & Human-in-the-Loop Triage
1. **Selection:** Security reviewer views open hotspots at `/sast/hotspots` or `/code/sast`.
2. **Triage Action:** Reviewer changes status to `SAFE` or `ACKNOWLEDGED` via `PATCH /api/hotspots/{id}/status`.
3. **Execution:** `HotspotService.update_status()`:
   - Validates transition guards.
   - Updates `hotspots.status`, `hotspots.reviewed_at`, and `hotspots.reviewed_by`.
   - Inserts a structured record into `hotspot_history` detailing the action, user, and justification comment.
   - Emits an `audit_event` for regulatory traceability.

### C. AI-Assisted Remediation & Rescan Verification Loop
1. **Trigger:** User clicks "Fix with AI" on a finding or hotspot.
2. **Analysis:** `PatchService` retrieves the file content and findings context, prompts the LLM reasoning engine to synthesize a minimal surgical unified diff.
3. **Deterministic Rescan Gate:**
   - The unified diff is staged in an isolated scratch workspace.
   - Semgrep is re-executed exclusively against the patched workspace.
   - **If the rule still triggers:** The patch is rejected with `REMEDIATION_FAILED` and explanation logs.
   - **If clean:** The patch is marked `VERIFIED_SAFE`, and the reviewer is presented with a diff for 1-click GitHub Pull Request creation.

---

## Interactive Diagram
Open [`api-and-service-flows.html`](./api-and-service-flows.html) in your browser for the full interactive sequence and data flow diagram.
