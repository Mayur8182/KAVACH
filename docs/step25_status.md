# STEP 25 — DNS SECURITY & DNS THREAT PROTECTION

## 1. Executive Summary & Core Principle

Step 25 implements the **DNS Security & DNS Threat Protection System** inside Thing.

DNS is treated as an authoritative **security control and evidence source**, not merely as a networking utility. The system collects, normalizes, validates, enriches, analyzes, and enforces security policies over DNS queries and resolutions initiated across workloads, Kubernetes pods, cloud services, and AI agents.

### Core Principle
> **"DNS must be treated as a security control and evidence source, not merely as a networking utility."**
> 
> Thing answers:
> *"Which workload, agent, user, or service resolved which domain, when, through which resolver, what intelligence was associated with that domain, what happened afterward, and what security policy governed the request?"*

The system strictly enforces that DNS intelligence or an anomaly does **not** equal confirmed compromise (Rule 3 & 4), that policies remain authoritative (Rule 5), and that enforcement actions must never claim `BLOCKED` unless actually verified (Rule 2). When no telemetry sources are active, the platform displays **`DNS Visibility NOT CONFIGURED`**. Fake queries or artificial DNS statistics are strictly prohibited (Rule 1).

---

## 2. Rule Compliance Matrix

| Section / Rule | Directive | Implementation |
|---|---|---|
| **Rule 1** | No Fake DNS Events | Telemetry is collected from real or registered sources (Cloud DNS, CoreDNS, external resolvers, agents). No simulated queries or synthetic traffic exist. |
| **Rule 2** | No Fake Block | Enforcement status explicitly tracks `REQUESTED`, `EXECUTING`, `BLOCKED`, `FAILED`, `UNKNOWN`. If resolver confirmation is absent, `BLOCKED` is never returned. |
| **Rule 3** | DNS Intelligence $\neq$ Compromise | A match against malicious domain feeds creates a `DNSSignal` and `ThreatMatch`, never an unbacked compromise verdict. |
| **Rule 4** | DNS Anomaly $\neq$ Attack | DGA-like behavior, tunneling patterns, or beaconing query deltas generate detection signals until verified by evidence. |
| **Rule 5** | Policy is Authoritative | AI can investigate and explain; deterministic policy engine and allowlists/blocklists decide allow or block actions. |
| **Rule 6** | Real Identity Tracking | Identifies `agent_identity`, `workload_identity`, `pod_id`, `namespace`, `client_identity`, and `user_identity`. |
| **Rule 7** | Authorized Inspection Only | Decryption or inspection is restricted to authorized gateways and resolver logs. |
| **Rule 8** | Tenant Isolation | Telemetry, decisions, signals, and policies are strictly isolated by `project_id`. |
| **Rule 9** | Cryptographic Evidence Preservation | Preserves raw DNS telemetry with SHA-256 digests (`raw_event_reference: sha256:<hash>`). |
| **Rule 10** | No Silent Dropping | Telemetry failures or parsing issues are audited and reported. |
| **Rule 11** | `UNKNOWN` is Valid State | Unverified enforcement, reputation, or IDN classification explicitly records `UNKNOWN`. |
| **Rule 12** | Centralized Telemetry Reuse | Connects directly to Step 23 SOC (`SocAlert`) and Step 24 Threat Intelligence (`threat_indicators`). |

---

## 3. Database Architecture (8 Persistent Models)

Implemented in `backend/app/models/dns_models.py` and persisted via Alembic migration `20260927_1900_add_step25_dns_security.py`:

1. **`dns_data_sources`**: Registry of DNS telemetry collectors (Cloud DNS, CoreDNS, Resolvers, Agents) tracking health status (`CONNECTED`, `NOT_CONFIGURED`, `DEGRADED`), endpoints, and collected query counts.
2. **`dns_events`**: Canonical DNS telemetry model recording query name, normalized query, query type (A, AAAA, CNAME, TXT, etc.), response code (NOERROR, NXDOMAIN, etc.), resolver, client/agent identity, raw payload SHA-256 digest, and decision link.
3. **`domains`**: Canonical domain registry decomposing FQDN, registered domain, subdomain, TLD, Shannon entropy score, reputation (`KNOWN_MALICIOUS`, `SUSPICIOUS`, `KNOWN_BENIGN`, `UNKNOWN`), classification, IDN/punycode flag, and query counts.
4. **`dns_policies`**: Scoped, versioned policy rules (`GLOBAL`, `PROJECT`, `WORKLOAD`, `AGENT`) with priority, action (`ALLOW`, `WARN`, `BLOCK`, `LOG`, `SINKHOLE`, `REQUIRE_APPROVAL`), and AST condition trees.
5. **`dns_list_entries`**: Explicit allowlists, blocklists, and watchlists supporting exact matches, wildcard patterns (`*.evil.com`), expiration timestamps, and justification.
6. **`dns_decisions`**: Enforcement audit trail recording action, reason, evidence snapshot, execution status (`REQUESTED`, `EXECUTING`, `BLOCKED`, `FAILED`, `UNKNOWN`), and post-enforcement verification flag.
7. **`dns_signals`**: Security detection signals (`MALICIOUS_DOMAIN`, `C2_DOMAIN`, `DNS_TUNNEL`, `DNS_EXFILTRATION`, `DGA_SUSPECTED`, `DNS_BEACONING`, `NXDOMAIN_ANOMALY`) linked to Step 23 SOC alerts.
8. **`dns_baselines`**: Behavioral baselines per workload/agent tracking established domains, average QPS, and NXDOMAIN ratios.

---

## 4. Normalization Engine (`DomainNormalizer`)

Located at `backend/app/dns/normalizer.py`:
* **Domain Normalization**: Strips leading/trailing whitespace, converts to lowercase, and strips trailing root dots (e.g., `   API.Stripe.COM.   ` $\rightarrow$ `api.stripe.com`).
* **FQDN Decomposition**: Accurately splits domain into Subdomain, Registered Domain, and TLD, with support for multi-part public suffixes (e.g. `checkout.service.internal.co.uk` $\rightarrow$ TLD: `co.uk`, Registered Domain: `internal.co.uk`, Subdomain: `checkout.service`).
* **Shannon Entropy Analysis**: Computes $H(X) = -\sum P(x) \log_2 P(x)$ on domain labels. Natural English domains measure $\sim 2.0 - 3.2$, while DGA and tunneling payloads score $> 3.6$.
* **IDN & Homoglyph Classification**: Detects Punycode prefixes (`xn--...`), internationalized characters, and mixed-script Cyrillic/Latin homoglyphs imitating popular brands (`NORMAL`, `SUSPICIOUS_IDN`, `UNKNOWN`).

---

## 5. Threat Detection Engine (`DNSThreatDetector`)

Located at `backend/app/dns/detector.py`:
* **Step 24 Threat Intelligence Correlation**: Cross-references incoming FQDNs and parent registered domains against active `ThreatIndicator` records from Step 24. Sets domain reputation to `KNOWN_MALICIOUS` and generates `MALICIOUS_DOMAIN` signals.
* **DGA Detection**: Deterministic evaluation of SLD label entropy ($> 3.55$), length ($\ge 12$ chars), consonant-to-vowel ratio ($> 75\%$), and consecutive consonant clusters ($\ge 4$). Generates `DGA_SUSPECTED` signals.
* **DNS Tunneling & Exfiltration Detection**: Identifies chunked data tunneling payloads with long labels ($\ge 28$ chars), high entropy ($> 3.6$), hex/base32 encoding, and TXT record abuse with large base64 answers. Generates `DNS_TUNNEL` or `DNS_EXFILTRATION` signals.
* **DNS Beaconing Detection**: Calculates the standard deviation ($\sigma$) of query interval deltas for repeated queries to the same domain. Programmatic periodic beaconing with minimal jitter ($\sigma < 2.5s$) triggers `DNS_BEACONING`.
* **NXDOMAIN Anomaly Detection**: Monitors workload and agent query failure spikes.

---

## 6. Authoritative Policy Engine (`DNSPolicyEngine`)

Located at `backend/app/dns/policy_engine.py`:
* **Hierarchical Evaluation**:
  1. **Allowlists**: Explicit allowlist entries (exact or wildcard) immediately permit resolution.
  2. **Blocklists**: Explicit blocklist entries block resolution and record post-decision evidence.
  3. **Watchlists**: Monitor and flag without blocking.
  4. **Scoped DNSPolicies**: Evaluates AST conditions against environment, identity, query type, and threat confidence.
* **Rule 2 Enforcement Status**:
  - `execution_status` records `REQUESTED`, `EXECUTING`, `BLOCKED`, `FAILED`, or `UNKNOWN`.
  - Blocks are only verified when confirmed by the gateway or resolver.

---

## 7. Step 23 SOC Escalation

* When a severe DNS threat signal occurs (`MALICIOUS_DOMAIN`, `DNS_TUNNEL`, `DNS_EXFILTRATION`, `DGA_SUSPECTED`), analysts or automation invoke `escalate_signal_to_soc(signal_id)`.
* Creates a real, operational [`SocAlert`](file:///c:/Users/USER/Desktop/YC%20THING/backend/app/models/soc_models.py) in Step 23 SOC with:
  - Source: `DNS_SECURITY`
  - Title: `[DNS SECURITY] <Alert Type>: <Domain>`
  - Deduplication key: `dns_<project_id>_<alert_type>_<domain>_<entity_id>`
  - Risk Assessment: `{"score": 90, "factors": ["DNS_THREAT", alert_type]}`
* Transitions signal status to `ESCALATED` and stores `soc_alert_id`.

---

## 8. Frontend Implementation (`DnsSecurityView.tsx`)

Implemented in `frontend/src/components/dns/DnsSecurityView.tsx`:
* **Overview & Sources**: Real metrics for active collectors, total events, blocked queries, malicious domains, tunneling signals, DGA signals, and resolver health. Displays `DNS Visibility NOT CONFIGURED` when unconfigured. Includes collector registration form.
* **DNS Traffic**: Live query telemetry table with response code filters, domain search, and an interactive **"Simulate Live DNS Query Resolution"** test form.
* **Domains & Reputation**: Canonical domains table with FQDN, registered domain, Shannon entropy score, reputation badges, and IDN indicators.
* **Threat Signals**: Detected DGA, tunneling, exfiltration, and beaconing signals with one-click **"Escalate to SOC"** action.
* **Policies & Lists**: Manage Allowlists, Blocklists, Watchlists, and Custom Scoped DNSPolicies.
* **Navigation**: Accessible under `RUNTIME` in `Sidebar.tsx` (`protect/dns`, `protect/dns-signals`) and routed in `App.tsx`.

---

## 9. Verification & Test Results

### 1. Pytest Unit & Integration Tests
Executed via: `py -3 -m pytest backend/tests/test_step25_dns_security.py`
```text
======================== 8 passed, 9 warnings in 4.01s ========================
```
* `test_domain_normalization_and_shannon_entropy`: PASS
* `test_dga_detection`: PASS
* `test_dns_tunneling_and_exfiltration_detection`: PASS
* `test_dns_beaconing_detection`: PASS
* `test_step24_threat_intel_correlation_with_dns`: PASS
* `test_dns_policy_enforcement_and_execution_status`: PASS
* `test_escalate_dns_signal_to_soc`: PASS
* `test_authentic_dns_overview_metrics`: PASS

### 2. Multi-Step Regression Tests (Steps 23, 24, 25)
Executed via: `py -3 -m pytest backend/tests/test_step24_threat_intel.py backend/tests/test_step23_soc.py`
```text
======================= 11 passed, 9 warnings in 6.87s ========================
```
All prior Step 23 SOC and Step 24 Threat Intelligence tests pass with zero regressions.

### 3. Full System Verification Script
Executed via: `py -3 scripts/verify_step25.py`
```text
================================================================================
STEP 25 VERIFICATION: DNS Security & DNS Threat Protection
================================================================================

--- 1. Database Model & Table Mapping (Section 6, 8, 13, 19, 51) ---
  [PASS] 8 DNS Security models defined and mapped
  [PASS] All 8 models have valid tablenames

--- 2. Domain Normalization, FQDN Decomposition & Entropy (Section 13-15) ---
  [PASS] Domain normalized: trimmed, lowercased, trailing dot removed
  [PASS] Multi-part TLD correctly identifies registered domain
  [PASS] TLD decomposed correctly
  [PASS] Subdomain decomposed correctly
  [PASS] Dictionary label has normal low entropy (< 3.0)
  [PASS] High-randomness label exhibits high Shannon entropy (> 3.6)

--- 3. Threat Detectors: DGA, Tunneling, Exfiltration & Beaconing (Section 26-32) ---
  [PASS] DGA candidate detected with high entropy and consonant ratio
  [PASS] DGA score calculated deterministically
  [PASS] DNS Tunneling candidate detected with long high-entropy label
  [PASS] Signal classified as DNS_TUNNEL
  [PASS] C2 Beaconing detected via regular query interval variance
  [PASS] Beaconing standard deviation delta is minimal (0.0s)

--- 4. Policy Engine & Rule 2 Enforcement Confirmation (Section 18-23, 51-52) ---
  [PASS] DNSDecision tracks execution_status (Rule 2)
  [PASS] DNSDecision identifies enforcement mechanism
  [PASS] DNSDecision tracks post-enforcement verification
  [PASS] DNSListEntry supports EXACT and WILDCARD matching

--- 5. SOC Escalation & Threat Evidence (Section 53-55, Rule 9) ---
  [PASS] DNSSignal links directly to Step 23 SocAlert
  [PASS] DNSEvent preserves raw payload SHA-256 digest
  [PASS] DNSEvent tracks AI Agent identity correlation (Rule 6)

--- 6. DNS Security API Endpoints (Section 68) ---
  [PASS] 10 API endpoints verified on dns_router

--- 7. Frontend Production Build Artifacts (Section 57-62) ---
  [PASS] frontend/dist/index.html exists
  [PASS] Production JavaScript bundle generated (index-BlpSrAnp.js)
  [PASS] Sidebar contains 'protect/dns' route link
  [PASS] Sidebar contains 'protect/dns-signals' route link
  [PASS] App.tsx imports and renders DnsSecurityView

================================================================================
ALL STEP 25 DNS SECURITY & THREAT PROTECTION VERIFICATIONS PASSED SUCCESSFULLY!
================================================================================
```

### 4. Frontend Production Build
Executed via: `npm run build` in `frontend/`
```text
✓ 1909 modules transformed.
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-BswNPCn7.css    4.47 kB │ gzip:   1.59 kB
dist/assets/index-BlpSrAnp.js   621.66 kB │ gzip: 139.63 kB
✓ built in 8.69s
```

---

## 10. STOP CONDITION (Section 79)

Step 25 is **fully complete**, verified, and all acceptance criteria pass.
As specified in Section 79:
> **STOP. Do not automatically implement Step 26. Step 26 must be treated as a separate implementation phase.**
