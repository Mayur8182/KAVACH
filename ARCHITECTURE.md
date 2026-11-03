# SecureAI Control Plane — Architectural Blueprint & Roadmap

## 1. System Vision
> **Product Concept:** A Security Guard for AI Coding Agents and Developers.
> **Core Principle:** *"LLM proposes. Deterministic security systems decide. Runtime evidence proves."*

When an AI agent or developer issues an action ("Do this"), the platform acts as the deterministic control plane asking:
1. **What are you trying to do?** (Intent Engine)
2. **What security controls are required?** (Security Blueprint Engine)
3. **Is it secure?** (Security Scanner Engine)
4. **Is it allowed?** (Policy Engine / OPA)
5. **Can we prove it remains safe in execution?** (Contract & Verification Engine + Runtime Evidence)

---

## 2. High-Level Architecture Flow

```text
                 👨💻 DEVELOPER / 🤖 AI AGENT
                               │
                               ▼
               🛡️ AGENT SECURITY GUARD GATEWAY
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
       "What?"              "Allowed?"            "Safe?"
          │                    │                    │
          ▼                    ▼                    ▼
     Intent Engine        Policy Engine       Security Engine
       (LLM/Schema)           (OPA)         (Semgrep/Gitleaks/OSV)
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                        ALLOW / BLOCK
                               │
                               ▼
                          ACTUAL ACTION
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
       GitHub                Docker               Cloud
       Jenkins                K8s                  AWS
                               │
                               ▼
                       👀 RUNTIME SENSORS
                          OpenTelemetry
                               │
                               ▼
                     Evidence / Logs / Traces
                               │
                               ▼
                     "Is it STILL safe?"
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
                    YES                  NO
                     │                    │
                     ▼                    ▼
                   DONE             FIX / BLOCK /
                                      ROLLBACK
```

---

## 3. The 10 Engines (Build Sequence & Roadmap)

| Engine | Purpose | Phase |
| :--- | :--- | :--- |
| **1. Intent Engine** | Parses natural language intent into structured technical requirements | **Phase 1 (MVP)** |
| **2. Security Blueprint Engine** | Derives required security controls from application intent | **Phase 1 (MVP)** |
| **3. Security Scanner Engine** | Orchestrates SAST, Secret Scanning, SCA (Semgrep, Gitleaks, OSV) | **Phase 1 (MVP)** |
| **4. Policy Engine** | Deterministic Allow/Block decisions using Open Policy Agent (OPA) | **Phase 1 (MVP)** |
| **5. AI Remediation Engine** | Generates verified diffs and patches when security issues arise | **Phase 1 (MVP)** |
| **6. MCP Gateway** | Wraps external MCP servers with identity, policy, and risk gates | **Phase 2** |
| **7. Agent Identity Engine** | Agent registry, delegations, least-privilege scoping, and data flow tracking | **Phase 3** |
| **8. Security Contract DSL** | Verifiable invariants (e.g., tenant isolation: `user.tenant_id == resource.tenant_id`) | **Phase 4** |
| **9. Runtime Evidence Collector** | OpenTelemetry ingestion for live verification and threat detection | **Phase 5** |
| **10. Attack & Recovery Engine** | Automated red-team attack agent + isolated rollbacks | **Phase 6+** |

---

## 4. Technology Stack

- **Backend:** Python + FastAPI (Async REST APIs + background tasks)
- **Database:** PostgreSQL (SQLAlchemy / Alembic for schema migrations & persistence)
- **Cache & Message Queue:** Redis
- **Policy Engine:** Open Policy Agent (OPA) with Rego policies
- **Scanners:**
  - SAST: Semgrep
  - Secrets: Gitleaks
  - SCA: OSV-Scanner / Trivy
  - IaC: Checkov
- **LLM Reasoning:** Ollama (local) + adapters for Anthropic / OpenAI / Gemini
- **Tool Standard:** Official Model Context Protocol (MCP) SDK
- **Runtime Observability:** OpenTelemetry (traces, metrics, logs)
- **Frontend:** React / Next.js (Clean, dynamic dashboard connected strictly to live APIs)

---

## 5. Phase 1 MVP Scope: The Complete Closed Loop

The initial deliverable focuses exclusively on the core loop:

```text
Developer Uploads / Connects Code
         │
         ▼
Intent Analysis (Extract architecture, auth, DB, endpoints)
         │
         ▼
Security Blueprint (Generate required controls for this specific stack)
         │
         ▼
Security Scanners (Execute real Semgrep + Gitleaks)
         │
   ┌─────┴─────┐
   ▼           ▼
 SAFE        UNSAFE
   │           │
   ▼           ▼
 PASS      Policy Block + AI Explains Issue
               │
               ▼
           AI Proposes Real Patch / Diff
               │
               ▼
           User Approves Patch
               │
               ▼
           Apply Patch & Re-scan
               │
         ┌─────┴─────┐
         ▼           ▼
       PASS        FAIL
```

---

## 6. Target Directory Layout

```text
secure-control-plane/
│
├── backend/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── api/
│   │   ├── projects.py
│   │   ├── scans.py
│   │   ├── policies.py
│   │   ├── agents.py
│   │   └── blueprints.py
│   ├── engines/
│   │   ├── intent/
│   │   ├── blueprint/
│   │   ├── scanner/
│   │   ├── policy/
│   │   └── remediation/
│   ├── models/
│   │   ├── project.py
│   │   ├── scan.py
│   │   ├── finding.py
│   │   ├── blueprint.py
│   │   └── audit.py
│   └── services/
│
├── policies/
│   └── opa/
│       ├── agent.rego
│       ├── production.rego
│       └── tests/
│
├── scanners/
│   ├── semgrep/
│   └── gitleaks/
│
├── mcp/
│   ├── client/
│   └── gateway/
│
├── frontend/
│
├── docker-compose.yml
└── README.md
```

---

## 6. AI Provider Layer & Autonomous Security Control Plane Architecture

### Core Design Principle
> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**
- **Antigravity is NOT the product's "AI brain" or security authority.** It is integrated as an **AI Execution & Remediation Provider**.
- The core THING security control plane (detect, policy decision, agent authorization, tool sandboxing, verification re-scans, and cryptographic audit logging) is completely independent of any external LLM model.
- If Antigravity is unavailable, expensive, or upgraded, the THING architecture does not change; other execution providers (Gemini, local Ollama, Claude, GPT) plug in seamlessly through the unified `AIExecutionProvider` interface.

### Architectural Hierarchy

```text
                    THING
          Autonomous Security Control Plane
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Detect           Decide           Verify
        │                │                │
     SAST/DAST       Policy Engine     Re-scan
     Secrets         Risk Engine       Tests
     SCA             Security Rules    Validation
     Cloud           AI Orchestrator   Evidence
        │                │                │
        └────────────────┼────────────────┘
                         │
                 AI Provider Layer
                         │
                ┌────────┴────────┐
                │                 │
           Antigravity        Other Models
           API/Core           (Gemini, Ollama)
                │
                ↓
        Remediation Agent
                │
       ┌────────┼─────────┐
       ↓        ↓         ↓
     Patch    PR       Explanation
       │        │         │
       └────────┼─────────┘
                ↓
          Security Tests
                ↓
             Re-scan
                ↓
       ┌────────┴────────┐
       │                 │
     PASS              FAIL
       │                 │
   Accept PR        Retry / Escalate
```

### AutoFix Closed-Loop Remediation Flow

```text
THING Scanner (Semgrep, Gitleaks, Trivy, ZAP)
      ↓
Finding Engine (Indexes in PostgreSQL `security_findings`)
      ↓
Risk + Policy Engine (Determines allowable remediation constraints)
      ↓
AI Remediation Orchestrator (`AIRemediationOrchestrator`)
      ↓
AI Provider (Antigravity Primary / Gemini / Local Fallback)
      ↓
Generate unified diff patch & PR metadata
      ↓
Apply patch in isolated workspace sandbox
      ↓
Run unit tests & AST semantic parsing
      ↓
Run security scanner again (re-scan)
      ↓
Vulnerability eradicated with 0 regressions?
      │
   YES ─────→ Gateway creates GitHub/GitLab PR (`POST /api/v1/pull-requests/fix`)
      │        Persist SLSA attestation evidence & mark finding resolved
   NO
      ↓
Escalate to human security engineer with diagnostic audit log
```

### Security Boundary Directives
1. **Zero Frontend Credentials:** API keys (`ANTIGRAVITY_API_KEY`, `GEMINI_API_KEY`) reside strictly in server-side configuration. The browser interacts only with authenticated THING backend endpoints.
2. **Restricted Tool Authorization:** External AI agents never receive direct access to production, databases, cloud accounts, or Git main branches. Every tool invocation passes through the THING Agent Security Gateway:
   ```text
   AI Agent -> THING Agent Gateway -> Permission Check -> Tool Authorization -> Sandbox -> Execute -> Audit Log
   ```
   * Allowed for remediation: `file.read`, `workspace.patch`, `test.run`, `scanner.rescan`, `vcs.branch.create`, `vcs.pull_request.open`
   * Blocked / Denied: `kubectl.delete_deployment`, `cloud.destroy_resource`, `db.drop_table`, `vcs.main.direct_push`, `secrets.read_raw`

### Core Product Differentiation
> *"THING doesn't just ask AI to fix vulnerabilities. It controls what an AI agent is allowed to do, gives it only the required authority, executes remediation in an isolated environment, verifies the security properties after the change, and produces evidence that the fix actually worked."*
