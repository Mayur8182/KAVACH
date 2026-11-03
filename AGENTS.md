# ANTIGRAVITY — PRODUCTION ENGINEERING RULES & SYSTEM DIRECTIVES

## Core Principle
This is a REAL security platform, not a UI demo, prototype with fake behavior, or static mockup.
Every feature must be implemented as a real working system with real inputs, real processing, real persistence, real integrations, real error handling, and verifiable outputs.

---

## Architectural Golden Rule
> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**
- LLM is NEVER the security authority for decisions (allow, block, grant permission, access secrets, deploy).
- Policy Engine (OPA / deterministic rules) + Security Scanners + Contract Engines make the authoritative decisions.
- MCP is an execution standard; our security gateway wraps MCP tools with identity, risk, and policy enforcement.

---

## 1. NO HARDCODED DATA
Never hardcode:
* users, projects, agents
* vulnerabilities, scan results, security scores
* cloud resources, GitHub repositories, Kubernetes resources
* metrics, logs, alerts, dashboard numbers, policy decisions, runtime events

If data is displayed in the UI, it must come from a real backend / API / database / integration.

## 2. NO FAKE SUCCESS
Never return "Scan completed successfully", "Deployment successful", "Security verified", or "AI fixed the issue" unless the operation actually happened. Every success message must correspond to a completed real operation.

## 3. NO MOCK API RESPONSES IN PRODUCTION CODE
Do not create fake endpoints such as `/api/mock/*`, `/api/demo/*`, `/api/fake/*` to simulate functionality.
If an integration is not implemented or configured, clearly show:
`NOT CONFIGURED` or `NOT CONNECTED`.

## 4. NO STATIC DASHBOARD NUMBERS
Dashboard values must be calculated from real data via actual database queries or live integrations. Never write static numbers.

## 5. NO PLACEHOLDER FUNCTIONALITY
Do not create buttons that only display "Coming soon" while pretending the feature exists. If a feature is not implemented, clearly mark it as unavailable.
* A button labeled "Scan" must actually execute a scanner.
* A button labeled "Fix" must actually create or apply a real proposed modification.
* A button labeled "Deploy" must actually initiate a deployment workflow.

## 6. REAL DATABASE PERSISTENCE
All important application state must be persisted in PostgreSQL:
* users, projects, agents, permissions
* policies, security blueprints, security contracts
* scans, findings, executions, approvals, evidence metadata, audit events

## 7. NO LOCALSTORAGE AS A DATABASE
Do not use `localStorage`, `sessionStorage`, or frontend in-memory arrays as primary sources of truth. Frontend state is only a cache/view. The backend/database is authoritative.

## 8. REAL SECURITY TOOLS MUST ACTUALLY RUN
When running Semgrep, Gitleaks, Trivy, OSV, Checkov, or OPA:
* Actually execute the CLI / container / API integrations.
* Do not simulate or fabricate their output.

## 9. NEVER INVENT SCAN RESULTS
* If Semgrep finds 0 vulnerabilities, display 0 findings.
* If a scanner fails, state `SCAN FAILED` with the real error reason. Never convert failure into zero vulnerabilities.

## 10. REAL INTEGRATIONS ONLY
For GitHub, AWS, Azure, GCP, Jenkins, Kubernetes, Docker:
* If credentials are missing: `NOT CONNECTED`
* If credentials are invalid: `AUTHENTICATION FAILED`
* If connected: show real resources only. Never show fake repositories or clusters.

## 11. NEVER HIDE ERRORS
Never silently catch errors (`try ... except: pass`).
Errors must be logged and exposed with:
* What failed
* Why it failed
* Actionable remediation steps

## 12. REAL ASYNCHRONOUS JOBS
Long-running operations (repository scan, docker build, Trivy scan, AI analysis) must not fake completion. Use real background workers and track states:
`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`.

## 13. EVERY SECURITY DECISION MUST HAVE EVIDENCE
Never mark something `SAFE` without deterministic evidence. Decisions must link to:
* Rule ID, scanner output, policy evaluation, input payload, timestamp, and audit evidence.

## 14. LLM IS NOT THE SECURITY AUTHORITY
Never allow an LLM alone to decide ALLOW / BLOCK / GRANT PERMISSION / ACCESS SECRET.
The LLM investigates, explains, and proposes patches. Deterministic policy engines (OPA) and security scanners decide.

## 15. NEVER GIVE AI UNRESTRICTED TOOL ACCESS
Every tool call must pass through authorization:
`Agent -> Tool Request -> Identity -> Authorization -> Policy -> Risk Check -> Approval -> Execution -> Audit`.

## 16. MCP MUST BE REAL
Use the official MCP protocol and SDK. Every MCP tool exposed or proxied must have input schemas, authorization, policy checks, execution, and audit events.

## 17. SECURITY BLUEPRINT MUST BE DYNAMIC
Derive security requirements dynamically from application intent, architecture, technology stack, and data sensitivity. Do not use a static checklist.

## 18. REAL FIXES ONLY
Remediation must produce: original file, changed file, diff, reason, validation test, rescan result. Mark fixed only after re-scanning passes.

## 19. NEVER BUILD GENERIC FAKE AI
The AI must receive real project context: repository files, architecture, dependencies, security findings, policies, and blueprints.

## 20. EVERY FEATURE MUST BE TRACEABLE
Store complete audit logs: who, what, when, where, why, policy evaluation, execution result, and evidence.

---

# FINAL DEVELOPMENT RULE
Never optimize for UI appearance over underlying functionality.
Priority:
REAL FUNCTIONALITY > REAL DATA > REAL SECURITY > REAL INTEGRATIONS > REAL EVIDENCE > REAL ERROR HANDLING > UI POLISH.

---

# UI/UX MASTER RULES & DATA REALITY (MOCKHUNTER)
For all frontend interface development and data verification, strictly follow the rules defined in:
`.agents/rules/ui-ux-master-rules.md`, `.agents/rules/ui-reality-rules.md`, `.agents/rules/ui-ux-design-rules.md`, `.agents/rules/ux-audit.md` (`.agents/skills/ux-audit/SKILL.md`), and `.agents/rules/mockhunter.md` (`.agents/skills/mockhunter/SKILL.md`).
Every screen, button, metric, table, chart, form, and modal must adhere to real backend contracts, real loading/empty/error states, zero fake UI, and verify data provenance (REAL vs MOCK/HARDCODED).

