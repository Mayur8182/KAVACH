# STEP 20 — PRODUCTION-GRADE CONTINUOUS SECURITY INTELLIGENCE & ADAPTIVE CONTROL

## 1. Executive Summary & Core Principle

Step 20 delivers the **Continuous Security Intelligence and Adaptive Control** layer to the security control plane. It transforms the system from static, point-in-time scanning into a continuous, evidence-driven adaptive control loop.

### The Fundamental Invariant
> **"VERIFIED YESTERDAY != VERIFIED TODAY"**
> 
> $\text{Verification} + \text{Time} + \text{Current Evidence} = \text{Current Security State}$

When infrastructure, identity, delegations, network routes, or container images drift, previous security verifications are immediately marked **STALE** or **EXPIRED**. The system never claims a control remains verified without fresh, observable evidence.

---

## 2. Rule Compliance Matrix

| Rule | Title | System Implementation |
|---|---|---|
| **Rule 54** | No Static Security State | Security states are dynamic: `VERIFIED`, `VIOLATED`, `UNKNOWN`, `STALE`, `NOT_APPLICABLE`, `NOT_VERIFIED`. Controls are marked `STALE` the instant dependent resources mutate. |
| **Rule 55** | No Security Scores | Strictly prohibited any synthetic "Security Score", "Health Score", "Risk Score", or "Drift Score". Exposes factual dimensions only (`active_drift_events`, `stale_controls`, `behavior_anomalies`, `pending_recommendations`, `queued_verification_jobs`). |
| **Rule 56** | Drift is Not Automatically a Vulnerability | Drift represents an observed state delta. It schedules targeted verification rather than jumping directly to violation. |
| **Rule 57** | No Fake Baselines | Behavioral baselines are strictly computed from authentic historical observations (median, mean, p90, p95, p99, and frequency distributions). Zero arbitrary default numbers. |
| **Rule 58** | No Blind Adaptation | Anomaly/drift detections do not autonomously reconfigure IAM, security groups, or policies. They trigger verification and produce proposals (`PROPOSED`) requiring human or authorized policy approval. |
| **Rule 59** | LLM is Not the Adaptive Authority | LLM proposes explanations and policy updates, but deterministic systems (OPA, contract compilers, verified telemetry) decide. |
| **Rule 60** | Real Time-Series Data Only | Derived from OpenTelemetry metrics, traces, container events, and agent MCP invocations. |
| **Rule 61** | No "Anomaly = Attack" | Behavioral deviations are classified as `NORMAL`, `ANOMALOUS`, `SUSPICIOUS`, `VERIFIED_SECURITY_EVENT`, or `UNKNOWN`. Non-malicious anomalies remain isolated and do not contaminate normal baselines. |
| **Rule 62** | Explain Every Drift | Every drift event records exact changed fields, previous state, current state, affected resource, and human-readable explanation. |

---

## 3. Database Architecture (13 Persistent Models)

Created in `backend/app/models/intelligence_models.py` and Alembic migration `20260927_1500_add_step20_continuous_intelligence.py`:

1. **`security_drift_events`**: Tracks 17 categories of drift (code, config, infrastructure, cloud, kubernetes, identity, authority, delegation, data flow, network, container, deployment, policy, contract, runtime behavior, dependency, security control).
2. **`security_control_freshness`**: Records requirement and contract evidence freshness (`FRESH`, `STALE`, `EXPIRED`, `UNKNOWN`).
3. **`security_verification_triggers`**: Captures event-driven verification triggers (`ON_DEPLOYMENT`, `ON_IAM_CHANGE`, `ON_NETWORK_CHANGE`, etc.).
4. **`security_verification_jobs`**: Queued and running continuous verification jobs with deduplication keys.
5. **`security_behavior_baselines`**: Statistical behavioral models (median, percentiles, frequency distributions) with sample counts and contamination protection.
6. **`security_behavior_events`**: Observed deviations against active baselines (`NORMAL`, `ANOMALOUS`, `SUSPICIOUS`).
7. **`security_change_correlations`**: Chronological timelines grouping related events across domains.
8. **`security_correlation_members`**: Event links to correlation groups.
9. **`security_control_effectiveness`**: Factual metrics (verified, violated, unknown, stale counts, violation patterns) without arbitrary scores.
10. **`security_policy_recommendations`**: Proposed policy tightening with human review audit trail (`PROPOSED`, `ACCEPTED`, `REJECTED`).
11. **`security_contract_recommendations`**: Proposed contract additions derived from novel architectural elements.
12. **`security_requirement_recommendations`**: Recommended security blueprint additions for new architectural patterns.
13. **`security_intelligence_events`**: Unified audit and intelligence event stream.

---

## 4. Core Modules & Engine Implementations

- **`app.intelligence.drift.DriftDetector`**: State comparison, image digest drift (`sha256:A -> sha256:B`), and authority drift analysis.
- **`app.intelligence.behavior.baseline.BaselineCalculator`**: Median, p90, p95, p99, variance calculations, and contamination filtering.
- **`app.intelligence.behavior.detector.BehaviorDetector`**: Evaluates rate metrics against p99 and checks tool usage against baseline distributions.
- **`app.intelligence.controls.freshness.ControlFreshnessEvaluator`**: Dynamic invalidation on dependent resource changes and telemetry outages.
- **`app.intelligence.controls.effectiveness.ControlEffectivenessAnalyzer`**: Detects repeated failure patterns without aggregate scores.
- **`app.intelligence.verification.planner.VerificationPlanner`**: Schedules deterministic verification jobs with composite deduplication keys (`project:trigger:contract:target`).
- **`app.intelligence.correlation.incidents.CorrelationTimelineEngine`**: Chronological incident timelines strictly classifying temporal association vs verified causality (Rule 46).
- **`app.intelligence.adaptive.recommendations.AdaptiveRecommendationEngine`**: Generates proposals for blueprint and policy changes.
- **`app.intelligence.service.SecurityIntelligenceService`**: Master orchestrator exposing async operations.

---

## 5. REST API Endpoints

Integrated into FastAPI under `/api/v1`:
- `GET /api/v1/projects/{project_id}/intelligence`: Factual summary (Rule 55 compliant).
- `GET /api/v1/projects/{project_id}/drift`: List recorded drift events.
- `GET /api/v1/drift/{drift_id}`: Get drift details.
- `POST /api/v1/drift/{drift_id}/dismiss`: Dismiss drift with required actor and audit reason.
- `GET /api/v1/projects/{project_id}/behavior/baselines`: View active statistical baselines.
- `GET /api/v1/projects/{project_id}/behavior/events`: List classified behavioral events.
- `GET /api/v1/projects/{project_id}/controls/freshness`: Control freshness inspection.
- `GET /api/v1/projects/{project_id}/controls/effectiveness`: Factual control effectiveness.
- `GET /api/v1/projects/{project_id}/verification/jobs`: Queued verification jobs.
- `POST /api/v1/projects/{project_id}/verification/jobs`: Trigger on-demand verification with deduplication.
- `GET /api/v1/projects/{project_id}/correlations`: List correlated incident timelines.
- `GET /api/v1/projects/{project_id}/recommendations`: View adaptive proposals.
- `POST /api/v1/recommendations/{recommendation_id}/accept`: Human approval workflow.

---

## 6. Frontend Security Intelligence Center

- Created `frontend/src/components/SecurityIntelligenceView.tsx`:
  - **Current State Tab**: Displays factual counts without any synthetic security scores.
  - **Drift Tab**: Inspects resource drift, changed fields, explanations, and audit dismissal.
  - **Behavior Tab**: Statistical baselines, sample sizes, and anomaly classifications.
  - **Control Freshness Tab**: Real-time freshness evaluation with stale reasons.
  - **Verification Jobs Tab**: Job queues with deduplication keys.
  - **Correlations Tab**: Chronological incident timelines with causality states.
  - **Recommendations Tab**: Human approval workflow for policy and blueprint updates.
- Integrated into `Navigation.tsx` and `App.tsx`.
- Production bundle and TypeScript type checking verified (`npm run build` completed with 0 errors).

---

## 7. Verification Results (`scripts/verify_step20.py`)

All 10 test suites passed synchronously against live SQLite/in-memory async database:
1. `DEPLOYMENT_DRIFT` detected on digest change (`sha256:A -> sha256:B`) and dismissed with audit reason.
2. `AUTHORITY_DRIFT` detected on permission escalation (`read -> write`).
3. Behavioral Baseline computed (`median`, `p99`) and anomaly detected on rate spike (ratio > 6.0x).
4. Baseline Contamination Protection verified: Incident samples excluded from normal distributions.
5. Control Freshness marked `STALE` when dependent resource modified after verification.
6. Evidence Failure Handling: Telemetry outage marked control `UNKNOWN` (never `VERIFIED`).
7. Verification Deduplication: 10 concurrent requests yielded exactly 1 planned verification job.
8. Incident Correlation & Timeline generated with `TEMPORALLY_ASSOCIATED` causality classification.
9. Adaptive Recommendation Workflow: Policy proposal created (`PROPOSED`) and accepted by human review.
10. Factual Intelligence Summary: Verified complete absence of forbidden score keys (Rule 55).

---

## 8. Absolute Stop Condition

Step 20 is complete.
No synthetic SIEM, SOC, autonomous hacking, or Step 21 features were introduced.
Development is halted in strict compliance with the **ABSOLUTE STOP CONDITION**.
