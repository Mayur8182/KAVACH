# STEP 24 — THREAT INTELLIGENCE PLATFORM & THREAT INTELLIGENCE INTEGRATION

## 1. Executive Summary & Core Principle

Step 24 implements the **Threat Intelligence Platform & Threat Intelligence Integration** inside Thing.

The platform provides continuous collection, normalization, validation, enrichment, deduplication, correlation, storage, distribution, and operationalization of threat intelligence from real external and community sources (STIX 2.1 / TAXII, CISA KEV Catalog, AlienVault OTX Pulses, and verified JSON feeds).

### Core Principle
> **"Threat intelligence becomes useful only when it can be connected to real assets, identities, code, cloud resources, agents, runtime activity, incidents, and security decisions."**

Thing strictly distinguishes between 5 distinct security concepts:
```text
INTELLIGENCE   (External assertion: Feed X states IP 203.0.113.88 is a C2 node)
OBSERVATION    (Internal fact: Thing observed workload checkout-api connecting to 203.0.113.88)
CORRELATION    (Match association: Observed IP matches active Threat Indicator 203.0.113.88)
DETECTION      (SOC signal: High-confidence correlation escalated as an operational SocAlert)
VERIFICATION   (Post-action proof: Runtime evidence proves containment action took effect)
```

An indicator appearing in an external threat feed does **not** automatically mean that the customer's environment is compromised. Furthermore, threat intelligence alone is **not** a blocklist and does not replace the deterministic policy engine.

When no feeds are configured, Thing clearly displays **`NOT CONFIGURED`**. Fake threat actors, artificial IPs, and synthetic CVE matches are strictly prohibited.

---

## 2. Rule Compliance Matrix

| Section / Rule | Directive | Implementation |
|---|---|---|
| **Rule 1** | No Fake Threat Intelligence | Feeds ingest and normalize real intelligence (STIX 2.1, CISA KEV, OTX). No simulated threat actors, indicators, or campaigns exist. |
| **Rule 2** | Intelligence $\neq$ Compromise | Matching an indicator produces a `ThreatMatch` and `ThreatObservation`, never an unbacked compromise assertion. |
| **Rule 3** | Intelligence $\neq$ Blocklist | Intelligence acts as context/input to policies and SOC analysts; it does not automatically become a global network block. |
| **Rule 4** | Observation Required for Environment Claims | Never claims an environment communicated with an indicator unless a real `ThreatObservation` exists in database. |
| **Rule 5** | Source Provenance Preserved | Multiple feeds reporting the same indicator update a single canonical `ThreatIndicator` while preserving distinct provenance rows in `threat_indicator_sources`. |
| **Rule 6** | Freshness & Expiration Tracking | Tracks `first_seen`, `last_seen`, `valid_from`, and `valid_until`. Expired indicators (`valid_until < now`) transition to `EXPIRED` status without deleting historical evidence. |
| **Rule 7** | Clear "NOT CONFIGURED" State | When zero feeds are active, dashboard stats return `is_configured: False` / `feed_health: NOT_CONFIGURED`, prompting the analyst to register a source. |
| **Rule 8 & 9** | Policy Authoritative & No Auto-Response | Threat intelligence cannot bypass policy. High-risk containment actions require explicit analyst authorization, Step 23 SOC case creation, and post-action verification. |
| **Rule 10** | Raw Intelligence Preservation | Raw feed payloads are cryptographically hashed using SHA-256 (`raw_data_reference: sha256:<hash>`) and preserved for auditability. |
| **Rule 11** | Multi-Tenant & Project Isolation | Matches, observations, and project-level suppressions are strictly partitioned by `project_id`. Private intelligence never crosses tenant boundaries. |
| **Rule 12** | `UNKNOWN` is Valid State | When indicator severity, confidence, or adversary attribution is unconfirmed, `UNKNOWN` is explicitly recorded. |

---

## 3. Database Architecture (16 Persistent Models)

Implemented in `backend/app/models/threat_intel_models.py` and persisted via Alembic migration `20260927_1800_add_step24_threat_intelligence.py`:

1. **`threat_intelligence_sources`**: Registry of intelligence feeds (STIX/TAXII, CISA KEV, OTX, REST APIs) with polling interval, authentication type, health status, and sync timestamps.
2. **`threat_feed_syncs`**: Immutable audit logs of sync executions tracking records received, valid, added, updated, skipped, errors, and raw payload SHA-256 hash.
3. **`threat_intelligence_objects`**: Canonical intelligence objects (INDICATOR, THREAT_ACTOR, MALWARE, CAMPAIGN, VULNERABILITY, TECHNIQUE, REPORT).
4. **`threat_indicators`**: Deduplicated canonical indicators (IPv4, IPv6, Domain, URL, Hash, CVE) with normalized search values, confidence, severity, and validity windows.
5. **`threat_indicator_sources`**: Provenance link tracking each feed reporting an indicator, reported confidence, severity, and external reference ID.
6. **`threat_actors`**: Tracked threat actors and adversary groups with aliases, motivation, targeting, confidence, and source attribution.
7. **`threat_campaigns`**: Tracked malicious campaigns with objectives, timelines, and adversary associations.
8. **`malware_families`**: Tracked malware families, toolkits, and types (trojan, ransomware, loader, stealer, C2 beacon).
9. **`threat_techniques`**: Mapping to MITRE ATT&CK techniques with tactic phases and external references.
10. **`threat_reports`**: Structured threat reports and security advisories.
11. **`threat_relationships`**: Semantic graph relationships (`USES`, `CONDUCTS`, `TARGETS`, `COMMUNICATES_WITH`, `RESOLVES_TO`).
12. **`threat_references`**: External citation links, CVE URLs, and advisory references.
13. **`threat_tags`**: Taxonomic classification labels.
14. **`threat_matches`**: Correlated matches between real customer telemetry and active indicators, with match type (`EXACT` vs `CONTEXTUAL`), severity, and Step 23 SOC alert link.
15. **`threat_observations`**: Real environmental sightings (DNS query, outbound network flow, container hash, package dependency, API call) linking entity to indicator.
16. **`threat_suppressions`**: Authorized false-positive suppressions with reason, scope (`PROJECT` or `GLOBAL`), author analyst, and expiration date.

---

## 4. Normalization Engine (`backend/app/threat_intel/adapters.py`)

The `ThreatIntelNormalizationEngine` provides standard ingestion and validation across heterogeneous formats:
* **STIX 2.1 Bundles**: Parses STIX patterns (`[domain-name:value = '...']`, `[ipv4-addr:value = '...']`, `[file:hashes... = '...']`), threat actors, malware, attack patterns, and relationships.
* **CISA Known Exploited Vulnerabilities (KEV) Catalog**: Maps catalog entries to canonical `CVE` indicators, extracts vendor, product, date added, due date, and prioritizes ransomware-associated vulnerabilities as `CRITICAL`.
* **AlienVault OTX Pulses**: Parses OTX pulse indicators, adversary attribution, and threat types.
* **Generic Indicator Feeds**: Ingests JSON indicator lists with regex-based type inference (IPv4, CVE, file hash, URL, Domain).
* **SHA-256 Payload Digest**: Computes canonical JSON SHA-256 hashes for all raw payloads before ingestion.

---

## 5. Deduplication & Provenance Architecture

When multiple independent feeds report the same indicator (e.g. AbuseIPDB and CISA both reporting IP `198.51.100.42`):
```text
Canonical Indicator: 198.51.100.42 (Type: IPV4, Status: ACTIVE, Source Count: 2)
  ├── Provenance 1: AbuseIPDB Feed (Reported: HIGH, Ref: abuse-report-1001)
  └── Provenance 2: CISA Network Feed (Reported: HIGH, Ref: indicator--feed-b-4242)
```
Thing updates the existing canonical `ThreatIndicator` record's `last_seen` timestamp and source count, while adding a new provenance record in `ThreatIndicatorSource`. No duplicate indicators are created.

---

## 6. Threat Match Engine (`backend/app/threat_intel/matcher.py`)

Correlates real observations against the threat store:
* **Exact Matching (`EXACT`)**: Observed value matches normalized indicator value exactly (e.g., DNS request for `malicious-stealer-c2.net` or outbound connection to `203.0.113.88`).
* **Contextual Matching (`CONTEXTUAL`)**: Observed infrastructure relates to known campaign or malware infrastructure.
* **False-Positive Suppression Evaluation**: Checks `threat_suppressions` before creating a match. Active suppressions prevent alert creation and preserve clean operation for internal partner IPs and load balancers.
* **Evidence Linking**: Every match records `evidence_reference` and observation context.

---

## 7. Step 23 SOC Integration

When an analyst or automated pipeline validates a high-confidence threat match:
1. `service.escalate_match_to_soc(match_id, analyst_user_id)` creates a real, operational `SocAlert` in Step 23 SOC.
2. The alert includes:
   * Title: `[THREAT MATCH] <Indicator Value>`
   * Source: `THREAT_INTELLIGENCE`
   * Severity: Matching indicator severity (`CRITICAL`, `HIGH`, etc.)
   * Risk Assessment: `{"score": 90, "factors": ["THREAT_MATCH", match_type]}`
   * Deduplication Key: Prevents duplicate SOC alerts for recurring sightings.
3. The match record status transitions to `ESCALATED_TO_SOC` and links `alert_id`.

---

## 8. Frontend Implementation (`ThreatIntelligenceView.tsx`)

A full interactive React + TypeScript interface located at `frontend/src/components/intelligence/ThreatIntelligenceView.tsx`:
* **Overview Tab**: Active sources count, total indicators, known exploited CVE count, threat match count, and feed health status. Displays clean `NOT CONFIGURED` banner when unconfigured.
* **Sources & Feeds Tab**: Register new feeds (STIX/TAXII, CISA KEV, OTX, JSON), view last sync timestamps, trigger on-demand sync, and view error reasons.
* **Indicators & Search Tab**: Real-time search across IPs, domains, hashes, and CVEs with type and severity filters. Expandable detail drawer showing supporting feeds, observations, and false-positive suppression button.
* **Environment Matches Tab**: Filter matches by project and severity. Includes one-click **"Escalate to SOC"** action that creates an operational Step 23 alert.
* **Adversaries & Malware Tab**: Cards for tracked threat actors, aliases, primary motivations, and malware families.

### Navigation Wiring
* Added `intelligence/threat-intel`, `intelligence/threat-sources`, `intelligence/threat-indicators`, and `intelligence/threat-matches` routes in `frontend/src/types/navigation.ts`.
* Updated `frontend/src/components/shell/Sidebar.tsx` with Threat Intelligence links in the `INTELLIGENCE` section.
* Updated `frontend/src/App.tsx` to mount `ThreatIntelligenceView` with tab routing.

---

## 9. Verification & Test Results

### 1. Pytest Unit & Integration Tests
Executed via: `py -3 -m pytest backend/tests/test_step24_threat_intel.py`
```text
======================= 7 passed, 9 warnings in 13.91s ========================
```
* `test_normalization_stix21_and_raw_digest`: PASS
* `test_normalization_cisa_kev`: PASS
* `test_indicator_deduplication_and_provenance`: PASS
* `test_threat_match_engine_exact_and_clean`: PASS
* `test_threat_suppression_lifecycle`: PASS
* `test_escalate_threat_match_to_soc`: PASS
* `test_threat_intel_overview_metrics`: PASS

### 2. Full System Verification Script
Executed via: `py -3 scripts/verify_step24.py`
```text
================================================================================
STEP 24 VERIFICATION: Threat Intelligence Platform & Integration
================================================================================

--- 1. Database Model & Table Mapping (Section 16) ---
  [PASS] 16 Threat Intelligence models defined and mapped
  [PASS] All 16 models have valid tablenames

--- 2. Normalization & Cryptographic Raw Digest (Section 6, 8, 15, Rule 10) ---
  [PASS] STIX 2.1 indicator extracted
  [PASS] Indicator type normalized to DOMAIN
  [PASS] Normalized value lowercased
  [PASS] Indicator includes raw SHA-256 digest
  [PASS] STIX threat actor extracted
  [PASS] STIX malware extracted
  [PASS] CISA KEV catalog parsed
  [PASS] CISA entry mapped to CVE indicator
  [PASS] Known ransomware CVE prioritized as CRITICAL
  [PASS] CISA entry preserves SHA-256 digest

--- 3. Source Provenance & Freshness Rules (Section 12, 14, Rule 5, 6) ---
  [PASS] ThreatIndicatorSource tracks origin source ID
  [PASS] ThreatIndicatorSource links to canonical indicator
  [PASS] ThreatIndicatorSource preserves source reported confidence
  [PASS] ThreatIndicator supports valid_from and valid_until
  [PASS] ThreatIndicator tracks first_seen and last_seen

--- 4. Correlation & Threat Matching Engine (Section 20-23, Rule 2, 4) ---
  [PASS] ThreatMatch defines match_type (EXACT vs CONTEXTUAL)
  [PASS] ThreatMatch requires real observed entity (Rule 4)
  [PASS] ThreatMatch records evaluated confidence
  [PASS] ThreatObservation distinguishes network/dns/hash telemetry

--- 5. SOC Integration & Escalation (Section 24, 25) ---
  [PASS] ThreatMatch links directly to Step 23 SocAlert
  [PASS] ThreatMatch supports lifecycle state (NEW, CONFIRMED, ESCALATED_TO_SOC)

--- 6. False Positive Suppression (Section 45) ---
  [PASS] ThreatSuppression requires explicit reason
  [PASS] ThreatSuppression scopes to PROJECT or GLOBAL
  [PASS] ThreatSuppression tracks author analyst
  [PASS] ThreatSuppression enforces expiration duration

--- 7. Threat Intelligence API Endpoints (Section 59) ---
  [PASS] 11 API endpoints verified on threat_intel_router

--- 8. Frontend Production Build Artifacts (Section 65-68) ---
  [PASS] frontend/dist/index.html exists
  [PASS] Production JavaScript bundle generated (index--QLz_Ovg.js)
  [PASS] Sidebar contains 'intelligence/threat-intel' route link
  [PASS] Sidebar contains 'intelligence/threat-matches' route link
  [PASS] App.tsx imports and renders ThreatIntelligenceView

================================================================================
ALL STEP 24 THREAT INTELLIGENCE VERIFICATIONS PASSED SUCCESSFULLY!
================================================================================
```

### 3. Frontend Production Build
Executed via: `npm run build` in `frontend/`
```text
✓ 1908 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-BswNPCn7.css    4.47 kB │ gzip:   1.59 kB
dist/assets/index--QLz_Ovg.js   589.57 kB │ gzip: 134.94 kB
✓ built in 1.80s
```

---

## 10. STOP CONDITION (Section 74)

Step 24 is **fully complete**, verified, and all acceptance criteria pass.
As specified in Section 74:
> **STOP. Do not automatically implement Step 25. Step 25 must be treated as a separate implementation phase.**
