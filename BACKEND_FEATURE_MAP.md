# BACKEND FEATURE MAP -- UI TO ENGINE CAPABILITY MATRIX

> **Objective:** Map every UI module and interaction to authoritative FastAPI backend routers, service classes, SQLAlchemy models, and required operations.
> **Architectural Golden Rule:** "LLM proposes. Deterministic security systems decide. Runtime evidence proves."

---

## 1. Security Findings Module
- **UI Route(s):** `/code/findings`, `/code/findings/[findingId]`, `/findings`, `/findings/[findingId]`
- **Required API Endpoints:**
  - `GET /api/findings` (List with server-side pagination, multi-facet filtering, sorting, full-text search)
  - `GET /api/findings/{id}` (Get finding detail with source code snippet, CWE details, remediation instructions)
  - `PATCH /api/findings/{id}` (Update status, triage state, assignment, suppression justification)
  - `GET /api/findings/summary` (Dynamic counts by severity, status, category, repository, and branch)
  - `GET /api/findings/export` (Stream real CSV/JSON export of filtered findings)
- **Backend Service:** `FindingsModuleService` (`backend/app/api/v1/findings_module.py`), `CodeService` (`backend/app/code/service.py`)
- **Database Model & Table:** `SecurityFinding` (`security_findings` table)
- **Required Operations:**
  - Full-text search and regex filtering on `file_path`, `title`, `cwe_id`
  - Dynamic severity pill counting (`critical`, `high`, `medium`, `low`)
  - Status updates (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `SUPPRESSED`, `FALSE_POSITIVE`)
  - Team assignment to verified user IDs
  - Tamper-evident audit logging of all state mutations

---

## 2. Repositories & SCM Management
- **UI Route(s):** `/code/repositories`, `/code/repositories/[repositoryId]`, `/repositories`
- **Required API Endpoints:**
  - `GET /api/v1/code/repositories` (List connected repositories with real scan metadata)
  - `GET /api/v1/code/repositories/health` (Aggregated scanner coverage, monitored counts, open findings)
  - `POST /api/v1/code/repositories` (Connect repository with git URL, branch, credentials, webhook setup)
  - `GET /api/v1/code/repositories/{id}` (Get repository detail, branches, commits, security history)
  - `DELETE /api/v1/code/repositories/{id}` (Disconnect repository and purge webhook)
  - `POST /api/v1/code/repositories/{id}/scan` (Enqueue full scanner pipeline execution)
- **Backend Service:** `CodeService` (`backend/app/code/service.py`), `GithubService` (`backend/app/api/v1/github.py`)
- **Database Model & Table:** `Repository` (`repositories`), `GithubSecurityJob` (`github_security_jobs`)
- **Required Operations:**
  - Git remote authentication and shallow clone
  - Webhook registration for push and PR events
  - Job worker dispatching (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`)
  - Repository health calculation based on active findings

---

## 3. Static Analysis (SAST) & Hotspots
- **UI Route(s):** `/code/sast`, `/code/sast/rules`, `/code/sast/scans`, `/code/sast/hotspots`, `/code/sast/hotspots/[id]`
- **Required API Endpoints:**
  - `GET /api/v1/sast/overview` (Active SAST coverage, rule counts, recent scans)
  - `GET /api/v1/sast/rules` (Semgrep rule library, active custom rule definitions)
  - `POST /api/v1/sast/scan` (Execute deterministic Semgrep ruleset on target branch)
  - `GET /api/v1/hotspots` (List identified security hotspots requiring human review)
  - `PUT /api/v1/hotspots/{id}/review` (Triage security hotspot as safe or converted to finding)
- **Backend Service:** `SastService` (`backend/app/code/sast_service.py`), `HotspotsService` (`backend/app/api/v1/hotspots.py`)
- **Database Model & Table:** `SecurityFinding` (`security_findings`), `Hotspot` (`hotspots`)
- **Required Operations:**
  - Real CLI execution of Semgrep engine
  - Rule validation and parsing against YAML schemas
  - Deterministic AST matching
  - Hotspot triage audit trail

---

## 4. Secrets Detection & Lifecycle
- **UI Route(s):** `/code/secrets`, `/code/secrets/detections`, `/code/secrets/inventory`, `/code/secrets/repositories`, `/code/secrets/policies`
- **Required API Endpoints:**
  - `GET /api/v1/code/secrets/overview` (Secret leak counters, exposure duration, rotation velocity)
  - `GET /api/v1/code/secrets/detections` (Active detected credentials with commit and author context)
  - `GET /api/v1/code/secrets/inventory` (Enterprise inventory of discovered cloud and third-party keys)
  - `POST /api/v1/code/secrets/scan` (Trigger Gitleaks pattern scanner on git commit history)
  - `POST /api/v1/code/secrets/policies` (Define automated secret revocation and rotation guardrails)
- **Backend Service:** `SecretScannerService`, `CodeRouter` (`backend/app/code/router.py`)
- **Database Model & Table:** `SecurityFinding` (`security_findings` where `category = 'secret'`), `SecretPolicy`
- **Required Operations:**
  - Gitleaks entropy and regex scanner execution
  - Commit author blame tracing
  - Remediation PR creation for automated secret revocation

---

## 5. Cloud Security Posture Management (CSPM)
- **UI Route(s):** `/cloud`, `/cloud/assets`, `/cloud/findings`, `/cloud/kubernetes`, `/cloud/exposures`, `/cloud/blast-radius`, `/cloud/compliance`
- **Required API Endpoints:**
  - `GET /api/v1/cloud/overview` (Multi-cloud resource counts, posture score, critical findings)
  - `GET /api/v1/cloud/connections` (Active AWS, Azure, GCP accounts and credential health)
  - `POST /api/v1/cloud/connect` (Connect cloud provider via STS Role, Service Principal, or SA Key)
  - `GET /api/v1/cloud/assets` (Multi-cloud inventory of IAM, Compute, Storage, Database, Network resources)
  - `GET /api/v1/cloud/findings` (Cloud infrastructure misconfigurations and compliance violations)
  - `GET /api/v1/cloud/kubernetes` (Kubernetes clusters, workload security, RBAC audit)
  - `POST /api/v1/cloud/sync` (Run asynchronous resource discovery scan)
  - `POST /api/v1/cloud/remediate` (Execute verified cloud configuration remediation)
- **Backend Service:** `CloudService` (`backend/app/cloud/service.py`)
- **Database Model & Table:** `CloudConnection`, `CloudAsset`, `CloudFinding`
- **Required Operations:**
  - AWS STS AssumeRole / Azure SDK / Google Cloud SDK credential verification
  - Asynchronous resource graph synchronization
  - Checkov / OPA CIS benchmark policy evaluation
  - Blast radius reachability graph traversal

---

## 6. Dynamic Attack Surface & DAST
- **UI Route(s):** `/attack`, `/attack/surface`, `/attack/apis`, `/attack/dast`, `/attack/pentests`, `/attack/findings`
- **Required API Endpoints:**
  - `GET /api/v1/attack/overview` (External attack perimeter metrics, open ports, exposed APIs)
  - `GET /api/v1/attack/assets` (Discovered domains, subdomains, IP ranges, certificates)
  - `GET /api/v1/attack/apis` (Catalog of discovered REST, GraphQL, and gRPC endpoints)
  - `POST /api/v1/attack/dast/start` (Launch OWASP ZAP / Nuclei dynamic vulnerability scan)
  - `POST /api/v1/attack/pentests` (Schedule automated multi-stage pentest campaign)
  - `POST /api/v1/attack/findings/{id}/retest` (Trigger deterministic re-verification of vulnerability)
- **Backend Service:** `AttackService` (`backend/app/attack/service.py`)
- **Database Model & Table:** `AttackAsset`, `AttackApiEndpoint`, `AttackDastRun`, `AttackPentest`, `AttackFinding`
- **Required Operations:**
  - DNS resolution, TLS certificate inspection, and port scanning
  - Dynamic HTTP crawler and payload fuzzer execution
  - Real-time event streaming of DAST execution progress
  - Retest validation with differential evidence capture

---

## 7. Protect & Runtime MCP Defense
- **UI Route(s):** `/protect`, `/protect/mcp`, `/protect/policies`, `/protect/sessions`, `/protect/approvals`
- **Required API Endpoints:**
  - `GET /api/v1/protect/overview` (Active protected sessions, policy decisions, blocked threats)
  - `GET /api/v1/protect/mcp/servers` (Registered MCP servers, protocols, health status)
  - `GET /api/v1/protect/mcp/tools` (Discovered MCP tools and policy control status)
  - `GET /api/v1/protect/policies` (Active runtime protection policies)
  - `POST /api/v1/protect/policies` (Publish compiled OPA/Rego policy to runtime engine)
  - `POST /api/v1/protect/policies/simulate` (Evaluate policy against past events without enforcing)
  - `GET /api/v1/protect/approvals` (Pending human-in-the-loop tool execution intercepts)
  - `POST /api/v1/protect/approvals/{id}/approve` (Cryptographically sign tool authorization token)
  - `POST /api/v1/protect/approvals/{id}/reject` (Enforce authoritative block on intercepted tool call)
  - `POST /api/v1/protect/approvals/break-glass` (Emergency override with tamper-evident audit record)
- **Backend Service:** `ProtectService` (`backend/app/protect/service.py`), OPA Engine
- **Database Model & Table:** `ProtectionPolicy`, `McpServer`, `McpToolControl`, `ProtectedSession`, `AuditEvent`
- **Required Operations:**
  - MCP JSON-RPC protocol proxying with authorization hooks
  - In-process OPA Rego policy evaluation (<5ms latency ceiling)
  - Human-in-the-loop approval state machine with timeout handling
  - Break-glass cryptographic emergency overrides

---

## 8. Agent Security & Governance
- **UI Route(s):** `/agent`, `/agent/agents`, `/agent/delegations`, `/agent/risk`, `/agent/tools`
- **Required API Endpoints:**
  - `GET /api/v1/agent/overview` (Active agent count, delegation depth, aggregate risk score)
  - `GET /api/v1/agent/agents` (Registered AI coding and ops agents with capabilities)
  - `POST /api/v1/agent/agents` (Register new agent with specific LLM backend, tools, and identity)
  - `GET /api/v1/agent/delegations` (Lineage of cross-agent task authority grants)
  - `PUT /api/v1/agent/policies/risk` (Set maximum autonomous risk ceiling)
  - `POST /api/v1/agent/agents/{id}/quarantine` (Immediately suspend all active credentials)
- **Backend Service:** `AgentService` (`backend/app/agent/service.py`), `AgentsRouter` (`backend/app/api/v1/agents.py`)
- **Database Model & Table:** `Agent`, `AgentPolicy`, `AgentSession`, `AgentDelegation`
- **Required Operations:**
  - Agent identity and keypair provisioning
  - Capability boundary enforcement
  - Delegation chain validation (prevention of privilege escalation loops)
  - Immediate quarantine and credential invalidation

---

## 9. QA & Test Automation Hub
- **UI Route(s):** `/qa`, `/qa/suites`, `/qa/test-cases`, `/qa/runs`, `/qa/browsers`, `/qa/visual-diff`
- **Required API Endpoints:**
  - `GET /api/v1/qa/overview` (Pass rate, total runs, flaky tests, browser coverage)
  - `GET /api/v1/qa/test-cases` (Repository of manual and automated test definitions)
  - `POST /api/v1/qa/test-cases` (Save test case with assertions and steps)
  - `GET /api/v1/qa/test-suites` (Suites grouped by functional domain)
  - `POST /api/v1/qa/test-runs` (Trigger parallel suite execution on browser worker pool)
  - `GET /api/v1/qa/browsers` (Active runner container environments)
  - `POST /api/v1/qa/visual-diff/{id}/approve` (Update accepted screenshot baseline)
  - `POST /api/v1/qa/ai/generate-test-cases` (Generate deterministic tests from feature spec)
- **Backend Service:** `QAService` (`backend/app/qa/service.py`)
- **Database Model & Table:** `QATestCase`, `QATestSuite`, `QATestRun`, `QAVisualDiff`
- **Required Operations:**
  - Test runner job dispatch
  - Headless Chromium/Firefox/WebKit test execution
  - Pixel-by-pixel perceptual visual regression diffing
  - Flaky test statistical detection

---

## 10. Identity, Authentication & Account Settings
- **UI Route(s):** `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/settings`, `/settings/members`
- **Required API Endpoints:**
  - `POST /api/v1/auth/token` (OAuth2 password flow / Argon2id password verification)
  - `POST /api/v1/auth/register` (New tenant / user creation with verification email dispatch)
  - `POST /api/v1/auth/verify-email` (Cryptographic verification token validation)
  - `POST /api/v1/auth/mfa/setup` (RFC 6238 TOTP seed generation & QR code URI)
  - `POST /api/v1/auth/mfa/verify` (TOTP code verification & recovery code generation)
  - `GET /api/v1/account/profile` (Live user profile, timezone, contact info)
  - `PUT /api/v1/account/profile` (Update user display settings)
  - `POST /api/v1/account/change-password` (Argon2id password rotation with session purge)
  - `POST /api/v1/account/api-keys` (Generate SHA-256 hashed Personal Access Token)
  - `GET /api/v1/auth/sessions` (Active HTTP cookies and bearer sessions with IP/device info)
  - `DELETE /api/v1/auth/sessions/{id}` (Remote session revocation)
- **Backend Service:** `AuthService` (`backend/app/api/v1/auth.py`), `AccountService` (`backend/app/api/v1/account.py`)
- **Database Model & Table:** `User`, `ApiKey`, `Session`, `Invitation`
- **Required Operations:**
  - Argon2id password hashing
  - JWT token generation with correlation ID
  - TOTP verification
  - Multi-tenant organization isolation
