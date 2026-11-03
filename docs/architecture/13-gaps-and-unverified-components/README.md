# 13. Gaps and Unverified Components

In strict compliance with the **Antigravity Production Engineering Directives** (Rules 1, 2, 3, 5, 9, 10), this section documents all discovered architectural gaps, partial implementations, unverified features, and UI-only routes across SecuLayer / Thing.

## Audit Summary: Real vs UI-Only Breakdown

```
+----------------------------------------------------------------------------------------------------+
|                                    GROUNDED IMPLEMENTATION STATUS                                  |
+------------------------------------------------+-----------------+---------------------------------+
| CATEGORY                                       | QUANTITY        | SYSTEM STATUS                   |
+------------------------------------------------+-----------------+---------------------------------+
| Total Audited Frontend Routes                  | 271 routes      | Evaluated across whole app      |
| Fully Grounded & Backend-Connected             | 206 routes      | 76.0% Verified Production Ready |
| UI-Only / Static Mock Templates                | 65 routes       | 24.0% Explicitly Tagged in UI   |
| Database Models (PostgreSQL)                   | 56 tables       | 100% Persisted & Schema-Bound   |
| Real CLI Security Scanners                     | 4 scanners      | Semgrep, Gitleaks, Trivy, Check |
| Deterministic Policy Authority                 | 1 engine        | OPA Rego Engine (Non-LLM)       |
+------------------------------------------------+-----------------+---------------------------------+
```

## Detailed Gap Inventory & Remediation Path

### 1. In-Process Background Task Worker vs Distributed Queue
- **Current State:** `backend/app/core/task_worker.py` runs an asynchronous polling loop against the `background_tasks` PostgreSQL table using `asyncio.sleep` within the main FastAPI process.
- **Architectural Risk:** A crashing API server or CPU-intensive scan (e.g., Checkov or Trivy) can starve the FastAPI event loop of compute cycles.
- **Recommended Remediation:** Migrate task processing to a dedicated distributed worker process (Celery + Redis, or Temporal / ARQ) with strict CPU/memory limits per job.

### 2. Secondary VCS Providers (GitLab & Bitbucket)
- **Current State:** The UI navigation and integration settings list GitLab, Bitbucket, and Azure Repositories. However, only the GitHub App (`github.py`, `github_service.py`) and GitHub OAuth have complete webhook decoders, clone pipelines, and pull request commit status posting.
- **Remediation:** Implement OAuth2 and webhook handlers for GitLab and Bitbucket, or clearly disable their connection cards with a `NOT CONNECTED` badge until built.

### 3. Active Cloud Remediation Action Runners
- **Current State:** The database models for `CloudAction` and `CloudActionEvidence` (`cloud_models.py`) define idempotent state transitions and diff schemas (`before_state`, `after_state`). However, write-access actions (such as `RESTRICT_PUBLIC_ACCESS` or `REMOVE_SECURITY_GROUP_RULE`) are currently gated in `READ_ONLY` mode by default.
- **Remediation:** Introduce a dry-run execution runner that captures Terraform/AWS CLI plan output before executing real cloud mutations, verified by user approval.

### 4. DAST Dynamic Fuzzing Sandbox
- **Current State:** Dynamic attack surface models (`AttackTarget`, `AttackCampaign`, `AttackTest`, `AttackResult`) are fully persisted. Basic HTTP probe verification is implemented. Full multi-hop exploit path generation (`security_attack_paths`) is partially rule-based.
- **Remediation:** Connect dedicated DAST scanners (such as OWASP ZAP or Nuclei CLI) to the `AttackTest` runner with containerized target isolation.

## Standalone Visual Diagram

Open [gaps-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/13-gaps-and-unverified-components/gaps-map.html) in any browser to view the interactive SVG diagram.
