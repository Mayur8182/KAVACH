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
