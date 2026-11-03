# STEP 23 — SECURITY OPERATIONS CENTER (SOC) & SECURITY OPERATIONS PLATFORM

## 1. Executive Summary & Core Principle

Step 23 implements the **Security Operations Center (SOC) & Security Operations Platform** inside Thing.

The SOC acts as the **continuous operational security layer** that ingests real telemetry, normalizes it into a canonical security event model, enriches events with live agent/contract/policy/watchlist context, evaluates versioned deterministic detection rules (AST-based, zero arbitrary Python eval), deduplicates and correlates alerts, manages cases and investigation workspaces, and coordinates authorized containment actions with post-action verification (Rule 9).

### Core Principle
> **"Thing SOC must transform real security events into evidence-backed security cases and coordinated response workflows."**
> 
> $\text{Real Telemetry} \rightarrow \text{Normalization} \rightarrow \text{Enrichment} \rightarrow \text{Deterministic Detection} \rightarrow \text{Alert Correlation} \rightarrow \text{Triage} \rightarrow \text{Case Investigation} \rightarrow \text{Authorized Response} \rightarrow \text{Post-Action Verification}$

The SOC never fabricates alerts, incidents, attacker activity, or arbitrary security scores. When evidence is insufficient, explicit states are used:
```text
UNKNOWN
INSUFFICIENT_EVIDENCE
REQUIRES_INVESTIGATION
```

---

## 2. Rule Compliance Matrix

| Section / Rule | Directive | Implementation |
|---|---|---|
| **Rule 1** | No Fake Security Events | All security events originate from real telemetry sources (AWS CloudTrail, Kubernetes Audit, GitHub Webhooks, MCP Gateway, OTel Runtime, Scanners, Policy Decisions). |
| **Rule 2** | No Fake Alerts | Alerts are generated only when deterministic AST detection rules match or critical denied security violations occur. |
| **Rule 3** | No Automatic Attack Claims | Alerts and cases maintain factual statuses (`NEW`, `OPEN`, `ACKNOWLEDGED`, `INVESTIGATING`, `ESCALATED`, `RESOLVED`, `FALSE_POSITIVE`). Never automatically declares an attack solely due to sequential events. |
| **Rule 4** | LLM is Not the Authority | Detection rules and response permissions are deterministic AST expressions and OPA/RBAC policies. LLM is strictly advisory. |
| **Rule 5 & 10** | Immutable Forensic Evidence & Verbatim Payloads | Raw telemetry is preserved with SHA-256 cryptographic hashes (`raw_event_reference: sha256:<hash>`). Payloads are never mutated or destroyed. |
| **Rule 7** | Real PostgreSQL Persistence | 16 dedicated relational database tables created and managed via Alembic migration `20260927_1700_add_step23_soc_platform.py`. |
| **Rule 9** | Post-Action Verification | Containment actions record `post_action_evidence_id` and require `reverification_status: VERIFIED` before case or alert closure. |
| **Rule 11** | Multi-Tenant Isolation | All events, alerts, cases, and watchlists strictly partitioned by `project_id` and tenant boundaries. |
| **Section 20-21**| Separate Severity & Confidence | Alerts and rules maintain strictly separated `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) and `confidence` (`HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`). |
| **Section 51**| Authentic Operational Metrics | Computes real MTTD (Mean Time to Detect) and MTTA (Mean Time to Acknowledge) from actual PostgreSQL timestamps. |

---

## 3. Database Architecture (16 Persistent Models)

Created in `backend/app/models/soc_models.py` and persisted via Alembic migration `20260927_1700_add_step23_soc_platform.py`:

1. **`event_sources`**: Registered telemetry ingestion sources (AWS, K8s, GitHub, MCP, OTel, etc.) tracking event count and health.
2. **`security_events`**: Canonical security event model preserving `raw_event_reference` SHA-256 hash, raw payload, actor, resource, action, result, and severity.
3. **`event_enrichments`**: Project context associations (Agent identities, active delegations, data classification, security contracts, watchlists).
4. **`detection_rules`**: Versioned deterministic detection rules with AST condition trees and lifecycle states (`DRAFT`, `VALID`, `ACTIVE`, `DISABLED`, `RETIRED`).
5. **`detection_executions`**: Execution audit tracking evaluation duration, matches found, and engine health.
6. **`soc_alerts`**: Operational alerts with deduplication keys, event counts, severity, confidence, triage notes, and assignment.
7. **`alert_events`**: Relational join mapping canonical events to alerts (`TRIGGER` or `SUPPORTING`).
8. **`alert_correlations`**: Correlation links between related alerts (`SEQUENTIAL`, `SAME_ACTOR`, `SAME_RESOURCE`, `CAUSAL`).
9. **`soc_cases`**: Investigation cases with human-readable keys (`CASE-YYYYMM-XXXX`), priority, owner, and structured timeline.
10. **`case_events`**: Direct mapping of security events linked to a case.
11. **`case_evidence`**: Relational links between investigation cases and immutable forensic evidence records.
12. **`soc_watchlists`**: Monitored entity categories (`AGENTS`, `RESOURCES`, `USERS`, `IPS`).
13. **`watchlist_entities`**: Monitored entities with identifier, reason, and active status.
14. **`investigation_notes`**: Immutable, auditable analyst observations and findings referencing evidence IDs.
15. **`soc_actions`**: Requested containment actions (`BLOCK_MCP_TOOL`, `REVOKE_SESSION`, `REVOKE_DELEGATION`, `ISOLATE_WORKLOAD`, etc.).
16. **`soc_action_results`**: Recorded execution outcomes, post-action evidence references, and reverification status.

---

## 4. SOC Engine Implementations

- **`app.soc.adapters.EventNormalizationEngine`**:
  - Implements adapters for AWS CloudTrail, Kubernetes Audit, GitHub Webhooks, MCP Tool Gateway, OpenTelemetry Runtime, Security Scanners, and Policy Decisions.
  - Automatically computes SHA-256 raw payload digest and formats canonical event dictionaries.
- **`app.soc.enrichment.ContextEnrichmentEngine`**:
  - Queries active agents, active delegations, linked security contracts, and watchlist registrations to enrich incoming events with project context.
- **`app.soc.detection.DetectionEngine`**:
  - Evaluates recursive AST condition trees (`AND`, `OR`, `NOT`, `eq`, `neq`, `contains`, `in`, `not_in`, `startswith`, `endswith`, `is_null`).
  - Pre-seeds default rules: `DET-AGENT-RESTRICTED-ACCESS`, `DET-AUTH-BRUTE-FORCE`, `DET-WATCHLIST-ANOMALY`, `DET-CRITICAL-SECRET-FINDING`, `DET-PROD-POLICY-VIOLATION`.
  - Zero arbitrary Python execution (`eval`/`exec`).
- **`app.soc.correlation.AlertCorrelationEngine`**:
  - Computes deterministic deduplication keys: `sha256(project_id + rule_id + actor_id + resource_id)`.
  - Deduplicates events within configurable time windows (default: 120 minutes) and increments `event_count` without alert duplication.
  - Correlates multi-source signals sharing entities or causal attack paths.
- **`app.soc.service.SocService`**:
  - Central orchestrator for event ingestion, alert triage, case escalation, notes, evidence attachment, watchlist management, and authentic operational metrics.

---

## 5. API v1 Endpoints

Registered in `backend/app/api/v1/soc.py` and mounted on `v1_router`:

- `POST /api/v1/projects/{project_id}/soc/events/ingest`: Ingests, normalizes, detects, and correlates telemetry.
- `GET /api/v1/projects/{project_id}/soc/events`: Lists canonical project security events.
- `GET /api/v1/soc/events/{event_id}`: Retrieves full event detail, raw payload, and SHA-256 hash.
- `GET /api/v1/projects/{project_id}/soc/alerts`: Lists operational alerts with status/severity filters.
- `GET /api/v1/soc/alerts/{alert_id}`: Retrieves alert details, supporting events, and correlations.
- `POST /api/v1/soc/alerts/{alert_id}/acknowledge`: Analyst acknowledgment.
- `POST /api/v1/soc/alerts/{alert_id}/assign`: Assigns alert to analyst or agent.
- `POST /api/v1/soc/alerts/{alert_id}/close`: Closes alert (`RESOLVED`, `FALSE_POSITIVE`, `DUPLICATE`).
- `POST /api/v1/soc/alerts/{alert_id}/escalate`: Escalates alert to an investigation case.
- `POST /api/v1/projects/{project_id}/soc/cases`: Creates new investigation case.
- `GET /api/v1/projects/{project_id}/soc/cases`: Lists active investigation cases.
- `GET /api/v1/soc/cases/{case_id}`: Full case workspace with timeline, evidence, and notes.
- `POST /api/v1/soc/cases/{case_id}/notes`: Adds auditable analyst note to case.
- `POST /api/v1/soc/cases/{case_id}/evidence`: Attaches immutable evidence reference.
- `GET /api/v1/soc/detections/rules`: Lists active versioned detection rules.
- `POST /api/v1/projects/{project_id}/soc/watchlists`: Creates monitored entity watchlist.
- `GET /api/v1/projects/{project_id}/soc/watchlists`: Lists active watchlists and contained entities.
- `GET /api/v1/projects/{project_id}/soc/entities/{entity_id}/activity`: Queries authentic entity timeline.
- `GET /api/v1/projects/{project_id}/soc/overview`: Returns real operational metrics (MTTD, MTTA, counts).
- `GET /api/v1/soc/health`: Subsystem health monitoring (Section 49).
- `POST /api/v1/soc/actions/request`: Requests authorized containment action.
- `POST /api/v1/soc/actions/{action_id}/result`: Records execution result and reverification status (Rule 9).

---

## 6. Frontend SOC View & UX Integration

Implemented in `frontend/src/components/soc/SocOverviewView.tsx` and integrated with `Sidebar.tsx` and `App.tsx`:

- **SOC Overview Tab**:
  - Live metric cards: Open Alerts, Critical Alerts, Active Cases, Ingested Events (24h).
  - SLA Performance: Mean Time to Detect (MTTD), Mean Time to Acknowledge (MTTA), and Correlated Signals.
  - Subsystem Health: Real-time health badges for event pipeline, detection engine, correlation engine, and response executor.
- **Alert Queue Tab**:
  - Filterable alert list with separate Severity and Confidence badges.
  - Interactive triage buttons: Acknowledge, Escalate to Case, Resolve, False Positive.
  - Slide-out details inspection panel showing supporting events and correlated signals.
- **Security Events Tab**:
  - Live stream table of canonical events (Time, Source, Event Type, Actor, Action, Result, Severity).
  - Modal inspection of cryptographic SHA-256 raw event reference and formatted JSON payload.
- **Cases & Workspace Tab**:
  - Split-view investigation workspace showing case metadata, forensic timeline, analyst notes, and interactive note addition.
- **Watchlists Tab**:
  - High-risk entity monitor displaying registered agents, sensitive resources, and reasons.
- **Detection Rules Tab**:
  - Versioned deterministic rules inspector showing event types, trigger conditions, and lifecycle status.
- **Navigation & Routing**:
  - Added `SOC & OPERATIONS` product compartment to `Sidebar.tsx`.
  - Added `soc/overview`, `soc/alerts`, `soc/events`, `soc/cases`, `soc/watchlists`, `soc/rules` to `AppRoute` in `navigation.ts`.
  - Wired routes in `App.tsx` directly to `SocOverviewView`.
  - Production bundle verified with `npm run build` (`tsc -b && vite build` in 735ms).

---

## 7. Verification & Test Results

1. **Unit & Integration Tests (`backend/tests/test_step23_soc.py`)**:
   - `test_event_normalization_and_hash_preservation`: PASSED
   - `test_ast_detection_engine_conditions`: PASSED
   - `test_alert_deduplication_and_correlation`: PASSED
   - `test_full_soc_lifecycle_and_metrics`: PASSED
   - Result: **4 passed in 1.84s**

2. **Step Verification Script (`scripts/verify_step23.py`)**:
   - `[1/7] Canonical Event Normalization & SHA-256 Integrity`: PASSED
   - `[2/7] Deterministic AST Detection Rules Engine`: PASSED
   - `[3/7] Deterministic Alert Deduplication Keys`: PASSED
   - `[4/7] PostgreSQL Relational Database Schema Models (16 models)`: PASSED
   - `[5/7] FastAPI Router Registration (20 endpoints)`: PASSED
   - `[6/7] Frontend Architecture & Production Bundle`: PASSED
   - `[7/7] Auditing Non-Negotiable Engineering Rules (AGENTS.md)`: PASSED
   - Result: **All 7 stages passed with exit code 0**

---

## 8. Stop Condition Adherence

Per Section 72:
> **STOP CONDITION: After Step 23 is fully implemented and all acceptance criteria pass: STOP. Do not automatically implement Step 24.**

Step 23 is complete. Execution halts here awaiting next user directive.
