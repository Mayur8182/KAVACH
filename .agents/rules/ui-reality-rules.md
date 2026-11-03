# THING UI REALITY RULES

## Production-Grade Frontend ↔ Backend Integration Standard

**Status:** NON-NEGOTIABLE  
**Applies to:** Entire Thing frontend  
**Applies from:** UI Step 1 onward  
**Scope:** Every page, component, button, table, chart, form, modal, action, status, workflow and integration  

---

# 1. PRIMARY OBJECTIVE

The Thing frontend is NOT a prototype.
It is NOT a static dashboard.
It is NOT a visual mockup.
It is NOT a collection of fake product screens.
It is NOT allowed to simulate backend functionality.

The frontend must be a real client of the Thing backend.

The fundamental architecture is:

```text
USER
  ↓
THING FRONTEND
  ↓
REAL API CLIENT
  ↓
REAL HTTP / SSE / WebSocket
  ↓
THING BACKEND
  ↓
DOMAIN SERVICE
  ↓
DATABASE / REAL INTEGRATION
  ↓
REAL RESULT
  ↓
THING FRONTEND
  ↓
USER
```

The frontend must never invent application state.

---

# 2. ABSOLUTE RULE

## REAL FUNCTIONALITY > REAL DATA > REAL SECURITY > REAL INTEGRATIONS > REAL EVIDENCE > UI POLISH

Never reverse this priority.
A beautiful fake dashboard is a failure.
A simple UI displaying `NOT CONNECTED` is correct if the backend has no integration.

---

# 3. ZERO FAKE DATA POLICY

The frontend must contain ZERO hardcoded production/application data.
All findings, repositories, security scores, cloud assets, incidents, users, vulnerabilities, and integrations must come strictly from the backend.

---

# 4. ZERO DEMO DATA IN PRODUCTION UI

Do not ship demo fixtures in production UI (`demo-api`, `test-project`, `John Doe`, `Acme Corp`, etc.).

---

# 5. NO MOCK API RESPONSES

Never return mock responses, `Promise.resolve(mockFindings)`, or create `/api/mock/*`, `/api/demo/*`, `/api/fake/*`.

---

# 6. NO FALLBACK TO FAKE DATA

If backend fails, display `ERROR` with Request ID and actionable remediation. Never catch an error to render fake successful dashboards.

---

# 7. BACKEND IS THE SOURCE OF TRUTH

```text
Backend = Authority
Frontend = Representation + Interaction
```

---

# 8. FRONTEND MUST NOT INVENT STATE

Do not set `status = "completed"` after clicking a button. Follow real job state transitions (`QUEUED` -> `RUNNING` -> `COMPLETED`/`FAILED`).

---

# 9. EVERY BUTTON MUST HAVE A REAL CONTRACT

Define: Button -> User Action -> API Endpoint -> Request Schema -> Backend Operation -> Database/Integration Change -> Response -> UI Update.

---

# 10. NO DEAD BUTTONS

Forbidden: `<button onClick={() => {}}>Scan</button>` or buttons that trigger alert("Coming soon"). If a capability is unavailable, display `NOT AVAILABLE` or `COMING SOON`.

---

# 11. EVERY ACTION MUST HAVE A BACKEND RESULT

Every action (scan, connect, disconnect, fix, approve, deploy, rollback, block) must produce a real backend mutation and evidence.

---

# 12. BUTTON STATE MACHINE

Support full asynchronous states: `IDLE` -> `SUBMITTING` -> `QUEUED` -> `RUNNING` -> `COMPLETED` / `FAILED` / `CANCELLED` / `REQUIRES_APPROVAL` / `BLOCKED`.

---

# 13. NO FAKE PROGRESS BARS

Do not simulate `setProgress(20 -> 40 -> 60)` with timers. Progress values must come from actual backend job records.

---

# 14. REAL-TIME DATA

Use real SSE, WebSockets, or polling against real job status endpoints.

---

# 15. NO RANDOM DATA

`Math.random()` or faker libraries are strictly forbidden for application metrics, findings, risk scores, or charts.

---

# 16. NO HARDCODED DASHBOARD METRICS

No static percentages or counts. Display actual database query results or loading states.

---

# 17. NO FAKE CHARTS

Charts must use real time-series records from the backend. If insufficient data exists, display `Not enough historical data`.

---

# 18. NO FAKE SECURITY SCORE

Do not show an arbitrary score out of 100 unless backed by a formally defined backend methodology. Prefer measurable facts (critical findings count, verified controls count, connected repositories).

---

# 19. EMPTY ≠ ZERO

- `Empty`: No items registered yet.
- `Zero`: Scanned/evaluated and found 0 issues.
- `Unknown`: Coverage/status could not be determined.
- `Failed`: Evaluation error occurred.

---

# 20. UNKNOWN MUST REMAIN UNKNOWN

`UNKNOWN ≠ SAFE`, `UNKNOWN ≠ ZERO`, `UNKNOWN ≠ VERIFIED`, `UNKNOWN ≠ HEALTHY`.

---

# 21. NOT CONNECTED MUST REMAIN NOT CONNECTED

If an integration is absent, clearly display `NOT CONNECTED`.

---

# 22. ERROR MUST REMAIN ERROR

HTTP 500 must show an error state with Request ID, not an empty table.

---

# 23-27. SPECIALIZED STATUS STATES

- Authentication Failure -> `AUTHENTICATION FAILED` + Reconnect
- Permission Denied -> `ACCESS DENIED` + Required permission
- Not Configured -> `NOT CONFIGURED` + Configure CTA
- Unsupported -> `UNSUPPORTED`
- Partial -> Real ratios (e.g. `8 evaluated, 1 failed, 1 unknown`)

---

# 28-32. API CLIENT & CONTRACT INTEGRITY

- Shared API schemas matching backend Pydantic models.
- No `any` types for security data.
- Validate responses at boundaries.
- Centralize all requests in `lib/api/client.ts`.

---

# 33-36. CREDENTIAL & PERSISTENCE SECURITY

- Never access PostgreSQL directly from React.
- Never expose cloud credentials, secrets, or API keys in browser code.
- No security credentials in `localStorage`.
- `localStorage` only permitted for client UI preferences (theme, collapsed sidebar).

---

# 37-40. TENANT ISOLATION & AUTHORIZATION

- Scope all queries by real tenant (`Organization` -> `Project` -> `Environment` -> `Resource`).
- Frontend checks are for UX only; backend authorization is authoritative for every mutation.

---

# 41-46. ASYNC JOBS & PERSISTENT LIFECYCLE

- Long-running tasks use real `job_id`.
- Browser refresh must preserve real job state from the backend.
- Deep links must use real entity IDs, not client-fabricated fake IDs.

---

# 47-54. UI MUTATIONS & ACTIONS

- Traceable Action Registry: Every active button links to an exact API route.
- Forms submit to real endpoints; toasts never replace persistent state.
- Dangerous actions require confirmation with reason and impact.
- Optimistic updates prohibited for high-risk security changes.
- Always invalidate queries and refetch authoritative server state after mutations.

---

# 57-64. SCANNERS, AI & EVIDENCE

- Scanners must actually execute. Zero findings only when scan passes with 0 issues.
- Frontend never makes security decisions (`ALLOW`/`BLOCK`).
- LLM outputs are hypotheses; only deterministic scanners/OPA policies make authoritative decisions.
- AI remediation requires real diffs, test re-scans, and policy validation before being marked `FIXED`.

---

# 65-72. INTEGRATIONS, AUDIT & EVIDENCE

- Integration health originates from backend queries.
- Activity feeds consume real audit records.
- Every finding links to verifiable evidence (Rule ID, input, execution trace, timestamp).

---

# 172. THE THING FRONTEND CONTRACT

```text
THE FRONTEND DOES NOT INVENT REALITY.
THE BACKEND DEFINES REALITY.
THE FRONTEND DISPLAYS REALITY.
THE USER INITIATES ACTIONS.
THE BACKEND AUTHORIZES ACTIONS.
THE BACKEND EXECUTES ACTIONS.
THE BACKEND PERSISTS RESULTS.
THE FRONTEND REFLECTS RESULTS.
EVIDENCE SUPPORTS SECURITY CLAIMS.
UNKNOWN REMAINS UNKNOWN.
FAILURE REMAINS FAILURE.
UNAVAILABLE REMAINS UNAVAILABLE.

NO FAKE SUCCESS.
NO FAKE DATA.
NO FAKE SECURITY.
NO DEAD BUTTONS.
NO SIMULATED OPERATIONS.
```

---

# FINAL PRIORITY

```text
1. REAL FUNCTIONALITY
2. REAL BACKEND CONNECTION
3. REAL DATA
4. REAL AUTHORIZATION
5. REAL INTEGRATIONS
6. REAL SECURITY DECISIONS
7. REAL EVIDENCE
8. REAL ERROR HANDLING
9. REAL STATE MANAGEMENT
10. UI POLISH
```
