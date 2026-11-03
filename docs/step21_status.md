# STEP 21 — PRODUCTION-GRADE SECURITY INCIDENT, INVESTIGATION & FORENSIC EVIDENCE ENGINE

## 1. Executive Summary & Core Principle

Step 21 implements the **Security Incident Management, Investigation Orchestration, Forensic Evidence, Timeline Reconstruction, Root-Cause Analysis, Containment Coordination, and Post-Incident Verification** engine.

### The Fundamental Principle
> **Finding != Incident, Incident != Attack, Hypothesis != Verified Root Cause**
> 
> $\text{Signal} + \text{Evidence} + \text{Context} + \text{Impact} + \text{Verification} = \text{Incident State}$

The system transforms verified runtime violations and cross-domain correlated anomalies into an immutable, evidence-backed incident lifecycle that coordinates directly with Step 7 (Policy), Step 10 (Authorization), Step 14 (Controlled Response), Step 15 (AI Remediation), and Step 16 (Attack Verification).

---

## 2. Rule Compliance Matrix

| Rule | Title | System Implementation |
|---|---|---|
| **Rule 63** | No Fake Incidents | Every incident originates from authentic events, findings, runtime evidence, contract violations, policy decisions, drift events, or user reports. Zero mock records. |
| **Rule 64** | Incident != Finding | Separate models and lifecycles. Findings contribute signals and evidence to incidents, but are never conflated with incidents. |
| **Rule 65** | Incident != Attack | Explicit classification taxonomy: `SECURITY_EVENT`, `SUSPICIOUS_ACTIVITY`, `VERIFIED_VIOLATION`, `POTENTIAL_ATTACK`, `VERIFIED_ATTACK`, `INCIDENT`. |
| **Rule 66** | No Incident Score | Strictly prohibited any synthetic "Incident Score", "Threat Score", "Compromise Score", or "Severity Score". Explicit categorical classifications: `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `UNKNOWN`. |
| **Rule 67** | No Automatic Incident Closure | Executing response does not close an incident. Closure requires post-action evidence, re-verification, and verified recovery. |
| **Rule 68** | No Automatic Root Cause Claim | LLM hypotheses remain `HYPOTHESIS` or `PROPOSED`. Root cause status transitions to `VERIFIED` only when proven by deterministic forensic evidence without contradiction. |
| **Rule 69** | Forensic Evidence is Immutable | Evidence artifacts and chains of custody are immutable. Updates or redactions create explicit versioned chain events. |
| **Rule 70** | No Evidence Fabrication | Missing telemetry is represented as `UNKNOWN` or `EVIDENCE_UNAVAILABLE`. The AI assistant is forbidden from inventing logs or command outputs. |
| **Rule 71** | Evidence Collection Must Be Authorized | Every forensic collector verifies actor identity, role, scope, and specific collection permissions before collecting artifacts. |
| **Rule 72** | Minimum Necessary Evidence | Collectors operate on targeted scopes and time windows, avoiding broad indiscriminate data dumps. |
| **Rule 73** | Secret Redaction | Automatically detects and masks AWS access keys, GitHub tokens, JWT bearer tokens, private keys, and credential fields with forensic SHA-256 fingerprints: `[REDACTED_SECRET:<hash>]`. |

---

## 3. Database Architecture (15 Persistent Models)

Created in `backend/app/models/incident_models.py` and Alembic migration `20260927_1600_add_step21_incident_management.py`:

1. **`security_incidents`**: Central incident record with human-readable keys (`INC-YYYYMM-XXXX`), lifecycle states, factual severity, environment, and closure tracking.
2. **`security_incident_events`**: Step 14 backward-compatible concrete event mapping.
3. **`security_incident_signals`**: Multi-source security signals (`TRIGGERED`, `SUPPORTS`, `CONTRADICTS`, `CORRELATED_WITH`, etc.).
4. **`security_incident_timeline`**: Chronological forensic events with confidence classifications (`OBSERVED`, `INFERRED`, `HYPOTHESIZED`, `VERIFIED`, `CONTRADICTED`, `UNKNOWN`).
5. **`security_incident_evidence`**: Forensic artifacts stored with SHA-256 integrity hashes, byte lengths, collector details, and secret redaction flags.
6. **`evidence_chain_events`**: Immutable chain of custody (`COLLECTED`, `STORED`, `ACCESSED`, `EXPORTED`, `ANALYZED`, `CORRELATED`, `REDACTED`, `ARCHIVED`).
7. **`security_investigation_cases`**: Investigation workflows (`IDENTIFY_ROOT_CAUSE`, `VERIFY_DATA_ACCESS`, `VERIFY_ATTACK_PATH`, etc.).
8. **`investigation_questions`**: Structured investigation inquiries (`OPEN`, `INVESTIGATING`, `ANSWERED`, `ANSWERED_WITH_LIMITATIONS`, `REFUTED`, `UNKNOWN`).
9. **`investigation_hypotheses_v2`**: AI and human proposed hypotheses (`PROPOSED`, `UNDER_TEST`, `SUPPORTED`, `REFUTED`, `UNKNOWN`).
10. **`incident_root_causes`**: Verified root causes referencing immutable evidence IDs.
11. **`incident_containment_records`**: Structured containment actions coordinated through Step 7/10/14.
12. **`incident_recovery_records`**: Recovery actions and post-recovery reverification records.
13. **`incident_postmortems`**: Incident retrospectives, timelines, contributing factors, lessons learned, and approvals.
14. **`incident_relationships`**: Inter-incident links (`RELATED_TO`, `DUPLICATE_OF`, `PARENT_OF`, `CHILD_OF`, `CAUSED_BY`, etc.).
15. **`incident_assignments`**: Assignment records (`HUMAN`, `SECURITY_TEAM`, `AI_AGENT`).
16. **`incident_exports`**: Cryptographically sealed forensic dossier export records.

---

## 4. Core Modules & Engine Implementations

- **`app.incidents.redaction.SecretRedactor`**: Detects and sanitizes credentials, private keys, and session tokens across strings, dicts, and lists.
- **`app.incidents.redaction.EvidenceIntegrityEngine`**: Generates SHA-256 cryptographic checksums and byte counts for forensic artifacts.
- **`app.incidents.collectors.BaseEvidenceCollector`**: Enforces authorization, redacts secrets, and computes integrity before returning artifacts.
- **`app.incidents.collectors.implementations`**: Structured collectors for CloudTrail audit events, Kubernetes pod/RBAC events, Agent/MCP tool calls, runtime traces, and configuration snapshots.
- **`app.incidents.timeline.IncidentTimelineEngine`**: Reconstructs unified timelines strictly sorted by factual event timestamps rather than ingestion order.
- **`app.incidents.investigation.InvestigationEngine`**: Detects contradictory evidence (e.g. access denied vs query executed) and enforces Rule 68 root cause verification constraints.
- **`app.incidents.containment.IncidentContainmentCoordinator`**: Formulates containment proposals without direct execution; routes through Step 7 OPA policy, Step 10 authorization, and Step 14 responses.
- **`app.incidents.service.SecurityIncidentService`**: Master orchestrator for incident lifecycle, investigations, duplicate detection, closure validation, and postmortems.

---

## 5. REST API Endpoints

Integrated into FastAPI under `/api/v1`:
- `POST /api/v1/projects/{project_id}/incidents`: Create incident from real signals.
- `GET /api/v1/projects/{project_id}/incidents`: List incidents with status and severity filters.
- `GET /api/v1/incidents/{incident_id}`: Incident details.
- `POST /api/v1/incidents/{incident_id}/signals`: Attach signals.
- `GET /api/v1/incidents/{incident_id}/timeline`: Retrieve chronological timeline.
- `POST /api/v1/incidents/{incident_id}/timeline`: Add manual or verified timeline entry.
- `POST /api/v1/incidents/{incident_id}/evidence/collect`: Authorized structured evidence collection.
- `GET /api/v1/incidents/{incident_id}/evidence`: List evidence with SHA-256 integrity hashes.
- `POST /api/v1/incidents/{incident_id}/investigations`: Open investigation case.
- `POST /api/v1/investigations/{case_id}/questions`: Add investigation question.
- `POST /api/v1/investigations/questions/{question_id}/answer`: Answer question with confidence context.
- `POST /api/v1/investigations/{case_id}/hypotheses`: Add hypothesis.
- `POST /api/v1/incidents/{incident_id}/root-cause`: Propose or verify root cause.
- `POST /api/v1/incidents/{incident_id}/containment`: Propose containment action.
- `POST /api/v1/incidents/containment/{record_id}/execute`: Execute containment via Step 14.
- `POST /api/v1/incidents/{incident_id}/recover`: Record recovery and post-recovery evidence.
- `POST /api/v1/incidents/{incident_id}/close`: Close incident (enforces contract resolution or limitations approval).
- `POST /api/v1/incidents/{incident_id}/reopen`: Reopen incident upon new evidence while preserving closure history.
- `POST /api/v1/incidents/{incident_id}/postmortem`: Create incident postmortem.
- `GET /api/v1/incidents/{incident_id}/export`: Export cryptographically sealed forensic dossier.

---

## 6. Frontend Incident Center

- Created `frontend/src/components/IncidentsView.tsx`:
  - **Active Incidents Split View**: Factual severity badges, statuses, and resource identifiers.
  - **Reconstructed Timeline View**: Chronological sequence with confidence markers (`OBSERVED`, `VERIFIED`, `HYPOTHESIZED`).
  - **Forensic Evidence View**: Artifact inspection, SHA-256 seal, and secret redaction badges.
  - **Investigation & Root Cause View**: Question workflows, hypotheses, and evidence verification status.
  - **Containment Coordination View**: Step 14 integration status and authorized response linkage.
  - **Closure & Reopening Actions**: Dynamic modal workflow with explicit limitation justifications.
- Wired into `Navigation.tsx` and `App.tsx`.
- Production bundle and TypeScript type checking verified (`npm run build` completed with 0 errors).

---

## 7. Verification Results (`scripts/verify_step21.py`)

All 15 test suites passed synchronously against live SQLite/in-memory async database:
1. Real Incident Creation from signals (`INC-YYYYMM-XXXX`).
2. Duplicate & Related Incident Detection for primary resources.
3. Forensic Evidence Collection with SHA-256 Integrity Seal and Chain of Custody logging.
4. Authorization Enforcement on Evidence Collection (unauthorized requests rejected).
5. Secret Redaction: AWS keys, JWTs, and passwords replaced with SHA-256 fingerprints.
6. Timeline Reconstruction: Chronological ordering verified across out-of-order ingestions.
7. Contradictory Evidence Detection: Flagged access denied vs executed queries.
8. Root Cause Verification Constraints: Rejected verification without supporting evidence (Rule 68).
9. Containment Coordination: Proposed action routed through Step 14 response execution.
10. Recovery & Reverification: Verified artifact redeployment and reverification results.
11. Closure Invariants: Rejected closure while contract violations remain unresolved; allowed with approved limitations.
12. Incident Reopening on New Evidence: Restored active state while preserving closure history.
13. Multi-Tenant Boundary Enforcement: Cross-project access strictly denied.
14. Forensic Export Dossier: Generated full dossier with SHA-256 audit seal.
15. Rule 66 Compliance: Verified complete absence of numerical incident scores.

---

## 8. Absolute Stop Condition

Step 21 is complete.
No synthetic SIEM, SOC, autonomous hacking, or Step 22 features were introduced.
Development is halted in strict compliance with the **ABSOLUTE STOP CONDITION**.
