# Step 19 — Cross-Domain Security Graph, Attack Path & Blast-Radius Intelligence

## Status: COMPLETE ✅

---

## 1. Overview & Architectural Role

Step 19 implements the **Cross-Domain Security Graph Reasoning & Intelligence Layer** above the autonomous security control plane. It integrates data from:
- Humans, AI Agents, Delegations, Permissions (Steps 10 & 11)
- Git Repositories, Commits, PRs, Dependencies (Step 8)
- Jenkins Builds & Pipelines (Step 17)
- Docker Images & Registries (Step 17)
- Kubernetes Clusters, Namespaces, Workloads, Pods (Step 17)
- Multi-Cloud Accounts, IAM, Networks, Storage, Databases (Step 18)
- Runtime Evidence & Telemetry (Step 13)
- Security Blueprint Requirements (Step 5) & Security Contracts (Step 12)
- Security Findings & Remediation (Steps 6 & 15)
- Policies & Policy Decisions (Step 7)
- Security Response Actions & Incidents (Step 14)

---

## 2. Fundamental Principles Enforced

| Rule | Title | Implementation |
|---|---|---|
| **Rule 45** | **No Fake Graph** | Every node originates from an authentic database record (`source_type`, `source_id`). No fabricated dummy nodes to fill UI. |
| **Rule 46** | **No Invented Relationships** | Edges require real evidence (`AUTHORIZATION`, `DELEGATION`, `CLOUD_IAM`, `NETWORK_CONFIGURATION`, `RUNTIME_TELEMETRY`, etc.). |
| **Rule 47** | **Graph ≠ Authority** | Graph models access and reachability; Step 10 remains the canonical authorization authority and Step 7 remains policy authority. |
| **Rule 48** | **Configured vs Observed** | Edges explicitly distinguish `CONFIGURED_ACCESS`, `OBSERVED_ACCESS`, `AUTHORIZED_ACCESS`, `ATTEMPTED_ACCESS`, `DENIED_ACCESS`. |
| **Rule 49** | **No Automatic Attack Claims** | Attack paths classified as `POTENTIAL`, `CONFIGURED`, `OBSERVED`, `VERIFIED`, `BLOCKED`. Only Step 16 testing can verify a path. |
| **Rule 50** | **No Security Scores** | No "Graph Security Score" or "Attack Score". Impact and reachability are broken down factually by affected resources, requirements, and contracts. |
| **Rule 51** | **Graph Fact Provenance** | Every edge preserves `source_type`, `source_id`, `evidence_id`, `confidence` (evidence confidence, not risk), and `state`. |
| **Rule 52** | **Temporal Graph** | Historical states preserved via `valid_from` and `valid_until`. Replay queries show historically accurate reachability. |
| **Rule 53** | **Bounded Queries** | Strict safety limits on traversal depth (`max_depth <= 15`), max nodes (`<= 2000`), max edges, and query timeouts. |
| **Rule 81** | **Multi-Tenant Isolation** | All graph storage and traversals are strictly scoped by `project_id`. Cross-tenant traversal is blocked. |

---

## 3. Database Schema

Migration `20260927_1445_add_step19_security_graph.py` introduces:

| Table | Description |
|---|---|
| `security_graph_nodes` | Universal node projection with `project_id`, `node_type`, `external_id`, `provider`, `environment`, `source_type`, `source_id`, `valid_from`, `valid_until` |
| `security_graph_edges` | Cross-domain directed edge with `source_node_id`, `target_node_id`, `edge_type`, `state`, `evidence_id`, `confidence`, `valid_from`, `valid_until` |
| `graph_attack_paths` | Potential, observed, or verified attack paths with ordered hops, conditions, and evidence |
| `security_change_impact` | Change impact analysis results recording directly/indirectly affected resources and contracts |
| `security_graph_snapshots` | Point-in-time forensic snapshots of graph state for incident response |
| `security_graph_versions` | Monotonic version tracking for graph projection updates |
| `graph_analysis_jobs` | Asynchronous job state for long-running graph analyses |

---

## 4. Key Engines Implemented

### Bounded Graph Traversal (`app/security_graph/traversal.py`)
- Breadth-First Search (BFS) and Depth-First Search (DFS) with strict bounds (`max_depth`, `max_nodes`, `max_edges`)
- Automatic cycle detection and visited sets
- Temporal filtering: `valid_from <= query_time < valid_until` (with naive/aware timezone normalization)

### Reachability Engine (`app/security_graph/reachability.py`)
- Evaluates specific reachability dimensions:
  - `NETWORK_REACHABLE`: Route tables, ingress, load balancers, firewalls, security groups
  - `AUTHORIZATION_REACHABLE`: Delegations, permissions, IAM roles, service principals
  - `DATA_REACHABLE`: Secret references, confidential data flows
  - `SUPPLY_CHAIN_REACHABLE`: Commit -> Build -> Image -> Deployment -> Pod
  - `COMBINED_REACHABLE`: Checks both network and authorization; returns exact missing conditions if unreachable
- Automatically differentiates `CONFIGURED_REACHABLE` from `OBSERVED_REACHABLE` based on runtime evidence

### Blast-Radius Engine (`app/security_graph/blast_radius.py`)
- Traverses outbound and inbound connections from a target node
- Categorizes impacts factually:
  - `directly_affected` (distance = 1)
  - `indirectly_affected` (distance >= 2)
  - `dependent_services`, `dependent_agents`, `dependent_data`, `dependent_deployments`
  - `affected_requirements` & `affected_contracts`
- Explains why each node is included without calculating arbitrary risk numbers

### Attack Path Analyzer (`app/security_graph/attack_paths.py`)
- Traces potential attack paths from public entrypoints to sensitive assets
- Analyzes and persists conditions for every hop
- Classifies paths as `POTENTIAL`, `OBSERVED`, or `BLOCKED` (when an intermediate control denies access)
- Prioritizes paths using factual criteria (`is_production`, `sensitive_target`, `has_observed_activity`)

### Authority Path Engine (`app/security_graph/authority_paths.py`)
- Traces delegation chains backwards: `Acting Agent <- Delegated By <- Authorized By Human`
- Preserves delegation IDs, confidence, and evidence
- Enumerates accessible resources for compromised agent reasoning

### Graph Projection & Reconciliation (`app/security_graph/graph_projection.py`)
- Synchronizes canonical tables (Users, Agents, Delegations, Containers, K8s, Cloud, Contracts, Requirements) into graph projections idempotently
- Ensures no duplicate nodes or edges

### Change Impact & Graph Diff (`app/security_graph/impact_analysis.py`)
- Evaluates blast radius and policy impacts when a change occurs
- Computes `Graph A vs Graph B` diff: `added_nodes`, `removed_nodes`, `added_edges`, `removed_edges`, `changed_edges`

---

## 5. REST API Endpoints (`app/api/v1/graph.py`)

- `GET /api/v1/projects/{project_id}/graph` — Full project graph view with bounded limits
- `GET /api/v1/projects/{project_id}/graph/nodes` — Filterable node catalog
- `GET /api/v1/projects/{project_id}/graph/edges` — Filterable edge catalog
- `POST /api/v1/projects/{project_id}/graph/reachability` — Evaluate reachability between two nodes
- `POST /api/v1/projects/{project_id}/graph/attack-paths` — Discover potential attack paths
- `POST /api/v1/projects/{project_id}/graph/blast-radius` — Compute blast radius of compromised entity
- `POST /api/v1/projects/{project_id}/graph/change-impact` — Analyze impact of an infrastructure or IAM change
- `POST /api/v1/projects/{project_id}/graph/reconcile` — Synchronize graph projection with canonical DB state
- `POST /api/v1/projects/{project_id}/graph/snapshot` — Create forensic graph snapshot

---

## 6. End-to-End Verification (`scripts/verify_step19.py`)

All 11 verification test suites passed:
1. ✅ **Node & Edge Provenance**: Nodes and edges created with real IDs, evidence references, and confidence.
2. ✅ **CONFIGURED vs OBSERVED Access**: Differentiates configured access from runtime telemetry access.
3. ✅ **Authority Path Tracing**: Traced `Agent B <- Agent A <- Human Owner` delegation chain.
4. ✅ **Blast Radius Analysis**: Production DB blast radius categorized services, data, and security requirements without arbitrary scores.
5. ✅ **Supply Chain Reachability**: `Commit -> Build -> Image -> Deployment` verified via `SUPPLY_CHAIN_REACHABLE`.
6. ✅ **Attack Path Analysis**: Public Ingress -> Vulnerable Service -> Production DB detected as `POTENTIAL` with conditions.
7. ✅ **Blocked Path Detection**: Intermediate firewall deny rule classified path as `BLOCKED`.
8. ✅ **Temporal Validity**: Querying at T1 (active) returns reachable; querying at T3 (after revocation) returns unreachable.
9. ✅ **Change Impact & Graph Diff**: Correctly computed affected nodes and Graph A vs B diff.
10. ✅ **Multi-Tenant Isolation & Bounded Limits**: Foreign project queries return 0 nodes; `max_depth` breach raises `QueryLimitExceededError`.
11. ✅ **Graph Snapshot Creation**: Pre-deployment snapshot created and verified.

---

**Step 19 is fully complete and operational.**
