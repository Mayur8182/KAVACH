# KAVACH — AI AGENT & AUTONOMOUS CAPABILITIES AUDIT

**Report ID:** KAV-AUDIT-04  
**Author:** Principal Product Architect & Staff AI/Security Engineer  
**Date:** November 2026  
**Status:** COMPLETE & EMPIRICALLY VERIFIED  
**Scope:** AI Assistant, Security Agents, Tool Registry, LLM Integrations, Remediation Orchestrator  

---

## 1. Executive Summary: AI Architecture Reality Check

Kavach features a sophisticated dual-layered AI architecture:
1. **The Grounded Conversational Copilot:** Driven by `CentralActionOrchestrator` (4,451 lines in `backend/app/intelligence/action_orchestrator.py`) which coordinates intent classification, RAG retrieval against real PostgreSQL finding records, and dynamically renders interactive UI schema cards with action buttons.
2. **The Autonomous Remediation Engine:** Driven by `AIRemediationOrchestrator` (`backend/app/services/ai_remediation_orchestrator.py`), which generates code patches, initiates VCS branches, and submits real GitHub Pull Requests.

However, deep code inspection revealed a **critical architectural fault line**: while the conversational assistant is grounded in real data and real tools, the **code patch generator relies on hardcoded string templates** and **stubbed verification passes**, creating an illusion of autonomous code synthesis where none exists.

---

## 2. Agent Framework, Models & Execution Providers

### 2.1 LLM Providers & Models
- **Google Gemini (Primary External LLM):**
  - Model: `gemini-2.5-flash-lite`.
  - Config: `gemini_api_key` loaded from `.env`.
  - Usage: Explaining vulnerabilities, synthesizing attack scenarios, generating contextual remediation guidance.
  - Call Location: `backend/app/intelligence/action_orchestrator.py:1968` via `httpx.AsyncClient`.
- **Ollama (Local LLM Fallback):**
  - Base URL: `http://localhost:11434` (default model `llama3.2`).
  - Configured in `backend/app/core/config.py:113`.
- **Antigravity Execution Provider:**
  - Registered as `AntigravityExecutionProvider` in `backend/app/services/ai_remediation_orchestrator.py:74`.
  - Provider Name: `antigravity`, model identifier `antigravity-code-repair-v2`.
  - Key finding: In the current code, this provider does not make an external API call; it invokes a local semantic diff synthesizer (`_generate_deterministic_patch`).

### 2.2 Central Action Orchestrator & Tool Registry
The agent framework does not use generic LangChain or CrewAI abstractions. Instead, it utilizes a custom, deterministic **Universal AI Action Engine**:
- **Tool Registry (`backend/app/intelligence/tool_registry.py`):** 12 explicitly typed tools with input schemas, output schemas, required RBAC roles, risk levels, and UI component bindings.
- **Risk Classifications (`ToolRiskLevel`):**
  - `READ_ONLY`: Zero side-effects (e.g. `scan.list`, `finding.list`).
  - `LOW_RISK`: Safe proposals and dry-run previews (e.g. `finding.remediate`, `scan.start`).
  - `SENSITIVE`: State mutations requiring explicit approval (e.g. `pull_request.create`, `workspace.members.invite`).
  - `HIGH_RISK`: Privileged operations (e.g. `policy.create`, deleting resources).
- **RAG Context Pipeline (`backend/app/intelligence/rag_pipeline.py`):** Ingests project intent, tech stack, active repositories, recent scan metadata, and open findings to ground agent prompts in real database state.

---

## 3. Capability Verification Matrix

We tested and verified every capability demanded of an enterprise security agent:

| Capability | Can Agent Actually Do It? | Verification Evidence | Underlying Mechanism |
|---|---|---|---|
| **1. List connected repositories** | **YES (VERIFIED)** | `action_orchestrator.py:374` | Executes `_handle_list_repositories()`, queries `github_repositories` table. |
| **2. Read authorized repo files** | **YES (VERIFIED)** | `action_orchestrator.py:2205` | Opens local checked-out files via `open(file_path, "r")` within checked-out workspace. |
| **3. Trigger security scans** | **YES (VERIFIED)** | `action_orchestrator.py:283` | Submits real scan job to `ScanService.trigger_scan()`, executing Semgrep/Gitleaks. |
| **4. Retrieve stored findings** | **YES (VERIFIED)** | `action_orchestrator.py:1985` | Executes SQL queries against `SecurityFinding` and `ApiFinding` tables. |
| **5. Investigate vulnerabilities** | **YES (VERIFIED)** | `action_orchestrator.py:2000` | Extracts code snippet, redacts secrets, calls Gemini API to explain attack scenario. |
| **6. Generate remediation patches**| **FAKE / HARDCODED** | `ai_remediation_orchestrator.py:468` | Uses 4 static string templates (SQL, Secret, XSS, Exec). Ignores real repo code! |
| **7. Execute permitted tests** | **STUBBED** | `autofix.py:572` | Returns static `"PASSED"` string without actually invoking test or scanner runner! |
| **8. Create GitHub pull requests** | **YES (VERIFIED)** | `remediation_pipeline.py:120` | Dispatches real GitHub API call to create branch and open Pull Request. |
| **9. Track execution status** | **YES (VERIFIED)** | `autofix.py:68` | Synchronizes live merge status directly from GitHub REST API (`/repos/{}/pulls/{}`). |
| **10. Verify remediation results** | **BROKEN** | `autofix.py:575` | Sets `status="PASSED"` in database without running a real re-scan on disk. |
| **11. Update dashboard data** | **YES (VERIFIED)** | `autofix.py:108` | Transitions `RemediationPlan` and `SecurityFinding` records in PostgreSQL. |

---

## 4. In-Depth Audit of Critical AI Deficiencies

### 4.1 The Hardcoded Patch Template Problem
In `backend/app/services/ai_remediation_orchestrator.py:468–518`, the method `_generate_deterministic_patch()` claims to synthesize fixes. In reality, it consists of:

```python
def _generate_deterministic_patch(finding: Dict[str, Any], source: str) -> Tuple[str, str]:
    rule = (finding.get("rule_id") or "").upper()
    title = (finding.get("title") or "").lower()

    if "SQL" in rule or "sql" in title:
        orig = (
            "def get_user(user_id):\n"
            "    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n"
            "    cursor = db.execute(query)\n"
            "    return cursor.fetchone()\n"
        )
        patched = (
            "def get_user(user_id):\n"
            "    # [THING AUTOFIX] Parameterized query to eradicate SQL injection\n"
            "    query = \"SELECT * FROM users WHERE id = %s\"\n"
            "    cursor = db.execute(query, (user_id,))\n"
            "    return cursor.fetchone()\n"
        )
    elif "SECRET" in rule or "secret" in title:
        orig = 'AWS_SECRET_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"\n'
        patched = 'AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")\n'
    ...
```

**Consequences:**
- When a user views an AutoFix proposal for an SQL injection in `src/controllers/auth.ts`, the proposal displays a Python Flask diff (`def get_user(user_id)`).
- When the user attempts to apply this fix via `FindingService.apply_fix()`, the service searches for `original_code` in the target file, fails to find it, and crashes with `ValueError: Original code snippet not found in target file.`
- This violates the Golden Rule: **"No fake success. Real fixes only."**

### 4.2 Fake Validation in Proposal Validation Endpoint
In `backend/app/api/v1/autofix.py:572–581`, the `validate_proposal` endpoint is invoked when a user clicks "Validate Fix":

```python
@router.post("/proposals/{proposal_id}/validate")
async def validate_proposal(...):
    # Record validation run
    validation = RemediationValidation(
        patch_id=patch.id,
        validation_type="SCANNER",
        status="PASSED",
        command_or_tool="semgrep scan --config auto",
        result_summary="Deterministic verification passed: 0 vulnerabilities found in patched region.",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(validation)
    plan.status = "READY_TO_MERGE"
    patch.status = "VALIDATED"
    await db.commit()
```
**Consequences:**
- The system declares that Semgrep ran and verified 0 findings, but `semgrep` was never executed!
- A patch that introduces syntax errors or fails to fix the vulnerability will be stamped as "PASSED" and presented as "Ready to Merge".

### 4.3 Fallback Finding Hijacking
In both `FindingService.get_finding_detail()` (`backend/app/services/finding_service.py:54`) and `AIRemediationOrchestrator.execute_closed_loop_autofix()` (`backend/app/services/ai_remediation_orchestrator.py:297`):
```python
if not finding:
    fallback_stmt = select(SecurityFinding).limit(1)
    finding = (await self.db.execute(fallback_stmt)).scalar_one_or_none()
```
If an invalid or deleted finding ID is requested, the system silently grabs an arbitrary finding from the database and acts as if it is the requested finding. This creates severe confusion for users and corrupts audit trails.

---

## 5. Security & Safety Evaluation

### 5.1 Tool Permissions & Human-in-the-Loop Approvals
- **Authorization Enforcement:** In `CentralToolRegistry.create_plan()` (`tool_registry.py:159`), user roles are checked against `tool.required_permissions`. Developers cannot execute `HIGH_RISK` actions.
- **Sensitive Operations Gate:** Sensitive actions (such as `pull_request.create` and `policy.create`) are assigned `requires_approval=True`.
- **Pending Action Table:** Stored in `ai_action_executions` table with states: `PENDING_APPROVAL`, `APPROVED`, `EXECUTING`, `COMPLETED`, `REJECTED`. Users must click "Approve" on `/agent/approvals` or via chat action button.

### 5.2 Tenant Isolation in AI Context
- In `action_orchestrator.py:134–154`, `resolve_target_project()` strictly prevents regular users from viewing findings or repositories of other tenants. Regular users can only access projects where `owner_id == current_user.id` or where they are an active `OrganizationMember`.
- All database queries filter by `project_id`.

### 5.3 Secret Redaction & Safe Prompting
- In `action_orchestrator.py:2217`, `redact_credentials()` masks private keys, AWS access keys, database passwords, and JWT tokens before sending context to Gemini or rendering in the chat UI.

---

## 6. Agent-to-Backend Workflow Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as Security Engineer
    participant UI as Chat / Findings UI
    participant Orch as CentralActionOrchestrator
    participant RAG as SecurityRAGPipeline
    participant DB as PostgreSQL (Findings / Scans)
    participant Gemini as Google Gemini API
    participant Remed as AIRemediationOrchestrator
    participant GitHub as GitHub VCS API

    User->>UI: "Investigate finding SEC-001 and propose fix"
    UI->>Orch: POST /api/v1/assistant/chat
    Orch->>Orch: Classify Intent: INVESTIGATE_FINDING
    Orch->>DB: Query SecurityFinding by rule_id / UUID
    DB-->>Orch: Finding Metadata & Snippet
    Orch->>RAG: Retrieve grounded project & tech stack context
    RAG-->>Orch: Scoped Context
    Orch->>Gemini: POST generateContent (Redacted prompt)
    Gemini-->>Orch: Attack Scenario & Technical Explanation
    Orch->>UI: Dynamic Card: Vulnerability Detail + Action Buttons ("Generate Patch")
    
    User->>UI: Clicks "Generate Patch"
    UI->>Remed: POST /api/v1/code/autofix/generate
    Remed->>Remed: Synthesize Patch (Current: Hardcoded Template; Target: Real AST LLM Diff)
    Remed->>DB: Persist RemediationPlan & RemediationPatch
    Remed-->>UI: Interactive Code Diff View

    User->>UI: Clicks "Create Pull Request"
    UI->>Orch: POST /api/v1/assistant/actions/approve
    Orch->>Orch: Verify User Role (Admin / Developer)
    Orch->>GitHub: POST /repos/{owner}/{repo}/git/refs (Branch)
    GitHub-->>Orch: Branch Created: kavach/autofix-sec-001
    Orch->>GitHub: POST /repos/{owner}/{repo}/pulls
    GitHub-->>Orch: PR Created (#42)
    Orch->>DB: Upsert GitHubPullRequest & Update RemediationPlan (PR_CREATED)
    Orch-->>UI: PR Card with live GitHub link
```

---

## 7. Required AI Engine Remediation

To make the AI agent truly enterprise-grade and compliant with AGENTS.md rules:

1. **Replace `_generate_deterministic_patch` with Real LLM AST Patch Synthesis:**
   - Extract the actual source file lines around `finding.line_start`.
   - Prompt Gemini with: the exact file content, language, rule ID, and line number.
   - Request a strict unified diff that applies cleanly to the actual file on disk.
2. **Execute Real Re-scan in `validate_proposal`:**
   - Write the patch to a temporary worktree (`git worktree add`).
   - Actually execute `semgrep scan --config auto <temp_dir>`.
   - Record the real scanner exit code and output findings in `RemediationValidation`.
3. **Eliminate Finding Theft Fallbacks:**
   - Remove `select(SecurityFinding).limit(1)`. If a finding is not found, raise `HTTP 404 Not Found`.
4. **Embed AI Copilot as a Universal Contextual Drawer:**
   - Instead of isolating the agent on a standalone `/assistant` screen, allow users to invoke the assistant as a slide-over panel on any finding, scan, or repository screen.

