# NAVIGATION MAP & INFORMATION ARCHITECTURE

> **Objective:** Ensure every single page is fully discoverable without guessing URLs.
> **Principles:**
> 1. Logical Grouping: Group routes by hierarchical domain instead of overcrowding the primary sidebar.
> 2. Multilevel Pathways: Provide primary sidebar navigation, secondary in-page tabs, contextual breadcrumbs, and command palette search.
> 3. Zero Orphan Routes: Every route must have a parent, a breadcrumb path, and contextual cross-links.

---

## Workspace Navigation Hierarchy

```
SECULAYER CONTROL PLANE
│
├── 1. Overview & SOC
│   ├── /home (Security Command Center)
│   ├── /overview (Global Security Posture)
│   ├── /soc (Security Operations Center & Incidents)
│   └── /graph (Security Knowledge Graph & Blast Radius)
│
├── 2. Code Security (/code)
│   ├── /code (Code Security Overview)
│   ├── /code/repositories (Repositories Inventory & Scanning)
│   │   └── /code/repositories/[repositoryId] (Repository Detail)
│   ├── /code/pull-requests (Pull Request Security Reviews)
│   ├── /code/findings (Security Findings Hub)
│   │   └── /code/findings/[findingId] (Finding Remediation Detail)
│   ├── /code/sast (Static Application Security Testing)
│   │   ├── /code/sast/rules (Custom & Community SAST Rules)
│   │   ├── /code/sast/scans (SAST Execution Runs)
│   │   └── /code/sast/hotspots (Security Hotspots Review)
│   ├── /code/secrets (Secrets Detection & Credential Leaks)
│   │   ├── /code/secrets/detections (Active Secret Detections)
│   │   ├── /code/secrets/inventory (Enterprise Secret Inventory)
│   │   ├── /code/secrets/repositories (Secret Coverage by Repo)
│   │   └── /code/secrets/policies (Secret Rotation Policies)
│   ├── /code/dependencies (Open Source Vulnerability SCA)
│   ├── /code/sbom (Software Bill of Materials Manifests)
│   ├── /code/iac (Infrastructure as Code Security)
│   │   ├── /code/iac/overview (IaC Security Overview & Posture Suite)
│   │   ├── /code/iac/findings (IaC Security Findings Suite - Screens 3.1–3.8 & 2.1–2.8)
│   │   │   ├── ?view=overview (3.1 & 2.1 Findings Overview, 5 KPIs, Trend, Status Donut, Top Categories)
│   │   │   ├── ?view=all (3.2 & 2.2 All Findings Multi-filter, Search, Table & Drill-down)
│   │   │   ├── ?view=detail&id=FND-328 (3.3 Finding Detail Deep Dive: Overview, Evidence, Remediation, Comments, Activity)
│   │   │   ├── ?view=triage (3.4 Findings Triage: Status Pills [Open 214, In Progress 46, Resolved 52, Suppressed 16], Bulk Actions, Inline Assign)
│   │   │   ├── ?view=trends (3.5 Findings Trends: 90-Day Trend, Provider Bars [AWS 152, K8s 68, Azure 54, GCP 38, Others 16], Environment Donut)
│   │   │   ├── ?view=by-resource (3.6 Findings by Resource: S3 72, SG 56, IAM 42, RDS 38, Deploy 32, etc.)
│   │   │   ├── ?view=by-framework (3.7 Findings by Framework: CIS AWS 124, NIST 86, PCI DSS 68, ISO 27001 46, SOC 2 42, etc.)
│   │   │   ├── ?view=export-reports (3.8 Export & Reports: Format [CSV/JSON/PDF], Include Checkboxes, Scheduled Reports, Report History)
│   │   │   ├── ?view=by-provider (2.3 Findings by Provider [AWS/K8s/Azure/GCP])
│   │   │   ├── ?view=by-severity (2.4 Findings by Severity [Critical/High/Med/Low])
│   │   │   ├── ?view=by-category (2.5 Findings by Category Breakdown)
│   │   │   ├── ?view=by-environment (2.7 Findings by Environment [Prod/Staging/Dev/QA])
│   │   │   └── ?view=filters (2.8 Advanced Checkbox Facets & Multi-Select)
│   │   ├── /code/iac/configuration-analysis (Configuration Analysis & Resource Inspection)
│   │   ├── /code/iac/rules (Rules Workspace Suite - Screens 6.1–6.8)
│   │   ├── /code/iac/rules/[id] (Rule Detail & Rego Configuration)
│   │   ├── /code/iac/policies (Policies & Quality Gates Suite - Screens 13.1–13.8)
│   │   ├── /code/iac/quality-gates (Quality Gates Enforcement)
│   │   ├── /code/iac/scans (IaC Scans Suite - Screens 8.1–8.8)
│   │   │   ├── ?view=overview (8.1 Scans Overview & 30-Day Trend)
│   │   │   ├── ?view=history (8.2 Scan History & Repository Filter)
│   │   │   ├── ?view=scheduled (8.3 Scheduled Recurring Scans)
│   │   │   ├── ?view=on-demand (8.4 On-Demand Scan Execution)
│   │   │   ├── ?view=config (8.5 Scan Depth & Framework Config)
│   │   │   ├── ?view=comparison (8.6 Differential Scan Comparison)
│   │   │   ├── ?view=queue (8.7 Running & Queued Scan Jobs)
│   │   │   └── ?view=settings (8.8 Global Scan Retention & Channels)
│   │   ├── /code/iac/scans/[id] (IaC Scan Detail - Screens 9.1–9.8)
│   │   ├── /code/iac/compliance (Compliance & Benchmarks Suite - Screens 11.1–11.8)
│   │   │   ├── ?view=overview (11.1 Compliance Overview, KPIs & Donut)
│   │   │   ├── ?view=frameworks (11.2 Framework Catalog & Add Framework)
│   │   │   ├── ?view=controls (11.3 Controls Mapping Table & Filters)
│   │   │   ├── ?view=control-detail&control_id=CIS-1.2 (11.4 Control Detail & Findings)
│   │   │   ├── ?view=report (11.5 Compliance Report Generation & History)
│   │   │   ├── ?view=evidence (11.6 Compliance Evidence Management)
│   │   │   ├── ?view=exceptions (11.7 Compliance Exceptions Waivers)
│   │   │   ├── ?view=audit-logs (11.8 Compliance Audit Logs)
│   │   │   └── ?view=settings (Compliance Benchmark Evaluation Settings)
│   │   └── /code/iac/drift (Drift Detection Suite - Screens 10.1–10.8)
│   │       ├── ?view=overview (10.1 Drift Detection Overview, Donut & Trend)
│   │       ├── ?view=environments (10.2 Environments Catalog & Scan)
│   │       ├── ?view=changes (10.3 Drift Changes Multi-Filter & Search)
│   │       ├── ?view=resource-detail (10.4 Resource Detail & Deployed Config [TF/JSON/YAML])
│   │       ├── ?view=remediation (10.5 Remediation Recommendations & Apply)
│   │       ├── ?view=history (10.6 Drift History & Date Range)
│   │       ├── ?view=settings (10.7 Drift Detection Settings)
│   │       └── ?view=compare (10.8 Compare Configuration Side-by-Side Diff)
│   │   ├── /code/iac/remediation (Remediation Suite - Screens 5.1–5.8)
│   │   │   ├── ?view=overview (5.1 Remediation Overview, 4 KPIs, Stacked Bar Chart Sep 01–30, Top Categories)
│   │   │   ├── ?view=recommendations (5.2 Fix Recommendations Multi-Filters, Matrix Table & Drill-Down)
│   │   │   ├── ?view=detail&id=IAC-001 (5.3 Remediation Detail: Vulnerable vs Remediated Diff [TF/CFN/Helm], Fix Steps)
│   │   │   ├── ?view=autofix (5.4 Auto-Fix / AI Remediation: Available Badges & Generate PR Modal)
│   │   │   ├── ?view=prs (5.5 Pull Request Integration: PR #42, #38, #35, etc., Status Badges & PR Detail Drawer)
│   │   │   ├── ?view=suppressed (5.6 Suppressed Findings: Active/History, Waiver Expiry Edit & Revoke)
│   │   │   ├── ?view=activity (5.7 Remediation Activity: 30-Day Timeline, Action & User Filters)
│   │   ├── /code/iac/integrations (IaC Integrations Suite - Screens 14.1–14.8)
│   │   │   ├── ?view=overview (14.1 Integrations Overview, 4 KPIs, Donut Status Breakdown)
│   │   │   ├── ?view=connected (14.2 Connected Integrations Table & Type Filters)
│   │   │   ├── ?view=add (14.3 Add Integration Tool Catalog & Connect Modal)
│   │   │   ├── ?view=detail&id=github (14.4 Integration Detail & Sync Settings)
│   │   │   ├── ?view=repositories (14.5 Repositories Inventory & Scan Status Toggles)
│   │   │   ├── ?view=webhooks (14.6 Webhook Endpoints & Test Ping)
│   │   │   ├── ?view=scan-settings (14.7 Scan Configuration & Glob Path Filters)
│   │   │   └── ?view=sync-logs (14.8 Integration Activity & Audit Logs)
│   │   ├── /code/iac/run (IaC Security Run Suite - Screens 7.1–7.8)
│   │   │   ├── ?view=overview (7.1 Run Overview, 4 KPIs, Runtime Activity Stacked Bar Chart, Recent Events)
│   │   │   ├── ?view=workloads (7.2 Workloads Table, Cluster & Namespace Filters, Pod Counts)
│   │   │   ├── ?view=containers (7.3 Container Runtime State, CPU & Memory Metrics, Pod Mapping)
│   │   │   ├── ?view=kubernetes (7.4 Kubernetes Cluster Health, Nodes Status & Control Plane Health)
│   │   │   ├── ?view=threats (7.5 Runtime Threats Interception & Status Triage Modal)
│   │   │   ├── ?view=vulnerabilities (7.6 Runtime Container CVE Vulnerabilities & Status Mutation)
│   │   │   ├── ?view=network (7.7 Network Activity Flow Logs, Protocols, Ports & Allow/Block Metrics)
│   │   │   └── ?view=policies (7.8 Runtime Security Policies, Status Toggles & Create Policy Dialog)
│   │   └── /code/remediation (Unified Security Remediation Workspace)
│   ├── /code/container-security (Base Image & Dockerfile Scans)
│   ├── /code/supply-chain (Supply Chain Risk & Attestations)
│   ├── /code/ci-cd (CI/CD Pipeline Security Integration)
│   ├── /code/jobs (Security Scan Job Queue)
│   └── /code/configuration (Repository Rules & Scanning Config)
│
├── 3. Cloud Security (/cloud)
│   ├── /cloud (Cloud Security Posture Management)
│   ├── /cloud/assets (Multi-Cloud Resource Inventory)
│   │   └── /cloud/assets/[assetId] (Cloud Asset Detail)
│   ├── /cloud/findings (Cloud Misconfigurations & Risks)
│   │   └── /cloud/findings/[findingId] (Misconfiguration Detail)
│   ├── /cloud/kubernetes (Kubernetes Cluster & Workload Security)
│   ├── /cloud/iac (Cloud Infrastructure as Code)
│   ├── /cloud/docker (Container Registry Security)
│   ├── /cloud/exposures (Public Exposure & Attack Vectors)
│   ├── /cloud/attack-paths (Identity & Network Attack Paths)
│   ├── /cloud/blast-radius (Identity Compromise Blast Radius)
│   └── /cloud/compliance (CIS Benchmarks & Cloud Frameworks)
│
├── 4. Attack Surface & DAST (/attack)
│   ├── /attack (Attack Surface Management Overview)
│   ├── /attack/surface (External Attack Surface Discovery)
│   ├── /attack/apis (API Security & Endpoint Discovery)
│   │   └── /attack/apis/[apiId] (API Endpoint Detail)
│   ├── /attack/dast (Dynamic Application Security Testing)
│   │   └── /attack/dast/[runId] (DAST Execution Run)
│   ├── /attack/pentests (Automated Penetration Testing Campaigns)
│   │   └── /attack/pentests/[pentestId] (Pentest Campaign Detail)
│   ├── /attack/findings (External Security Findings)
│   ├── /attack/schedules (Recurring Attack Scan Schedules)
│   └── /attack/reports (Executive Penetration Reports)
│
├── 5. Protect & Runtime Defense (/protect)
│   ├── /protect (Runtime Defense & Protection Overview)
│   ├── /protect/mcp (Model Context Protocol Security Gateway)
│   │   ├── /protect/mcp/servers (Registered MCP Servers)
│   │   ├── /protect/mcp/tools (MCP Tool Access Controls)
│   │   └── /protect/mcp/audit (Tamper-Evident Tool Audit Logs)
│   ├── /protect/policies (OPA & Rego Runtime Policies)
│   │   └── /protect/policies/simulation (Policy Dry-Run Simulator)
│   ├── /protect/sessions (Protected Agent Containers & Sessions)
│   │   └── /protect/sessions/[id] (Protected Session Detail)
│   ├── /protect/approvals (Human-in-the-Loop Intercepts & Approvals)
│   │   └── /protect/approvals/break-glass (Emergency Break-Glass Override)
│   ├── /protect/network (eBPF Kernel-Level Network Guard)
│   ├── /protect/dns (DNS Exfiltration Defense)
│   └── /protect/api (Runtime API Gateway Protection)
│
├── 6. Agent Security & Governance (/agent)
│   ├── /agent (Agent Governance Overview)
│   ├── /agent/agents (AI Agent Registry & Identities)
│   │   └── /agent/agents/[agentId] (Agent Security Profile)
│   ├── /agent/delegations (Cross-Agent Authority Delegations)
│   │   └── /agent/delegations/graph (Delegation Lineage Graph)
│   ├── /agent/risk (Autonomous Risk Ceiling & Anomaly Scores)
│   ├── /agent/tools (Approved Tool Registry & Parameter Gates)
│   │   └── /agent/tools/[toolId] (Tool Guardrail Configuration)
│   └── /agent/identities (Agent Cryptographic Credentials)
│
├── 7. QA & Test Automation (/qa)
│   ├── /qa (QA Test Automation Hub)
│   ├── /qa/suites (End-to-End Test Suites)
│   ├── /qa/test-cases (Test Case Repository & AI Generator)
│   ├── /qa/runs (Automated Test Execution Runs)
│   │   └── /qa/runs/[runId] (Test Run Execution Detail)
│   ├── /qa/browsers (Multi-OS Browser Cloud Runner Grid)
│   ├── /qa/visual-diff (Pixel & DOM Visual Regression Diffs)
│   ├── /qa/api-tests (Contract & Integration API Tests)
│   └── /qa/performance (Latency & Load Performance Benchmarks)
│
└── 8. Settings & Governance (/settings, /governance)
    ├── /settings (Unified User Profile & Account Settings)
    ├── /settings/members (Organization Team Members & Invitations)
    ├── /settings/roles (Role-Based Access Control RBAC)
    ├── /settings/sessions (Active Authenticated Sessions & Devices)
    ├── /settings/login-history (Authentication Security Audit Log)
    ├── /settings/api-keys (Personal Access Tokens & API Keys)
    ├── /settings/sso (SAML 2.0 & OIDC Identity Providers)
    ├── /audit-logs (Enterprise Cryptographic Audit Trail)
    └── /governance (SOC 2, ISO 27001, HIPAA Compliance Controls)
```

---

## Detailed Route Navigation Map

### Code Security Module

#### `/code`
- **Parent:** Platform Root
- **Sidebar Location:** Code Security → Overview
- **Navigation Label:** Overview
- **Required Permission:** `code:read`
- **Related Pages:** `/code/repositories`, `/code/findings`, `/code/sast`
- **Breadcrumb:** `Home > Code`
- **Discoverability Method:** Primary Sidebar (First item in Code group)

#### `/code/repositories`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Repositories
- **Navigation Label:** Repositories
- **Required Permission:** `code:read`
- **Related Pages:** `/code/repositories/[id]`, `/code/pull-requests`, `/code/findings`
- **Breadcrumb:** `Home > Code > Repositories`
- **Discoverability Method:** Primary Sidebar, Global Search ("repos", "github")

#### `/code/findings`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Security Findings
- **Navigation Label:** Security Findings
- **Required Permission:** `code:read`
- **Related Pages:** `/code/findings/[id]`, `/code/sast`, `/code/secrets`, `/code/dependencies`
- **Breadcrumb:** `Home > Code > Findings`
- **Discoverability Method:** Primary Sidebar with dynamic badge counter, Global Search ("findings", "vulnerabilities")

#### `/code/sast`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → SAST
- **Navigation Label:** SAST
- **Required Permission:** `code:read`
- **Related Pages:** `/code/sast/rules`, `/code/sast/scans`, `/code/sast/hotspots`
- **Breadcrumb:** `Home > Code > SAST`
- **Discoverability Method:** Primary Sidebar, Secondary Tabs

#### `/code/secrets`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Secrets
- **Navigation Label:** Secrets
- **Required Permission:** `code:read`
- **Related Pages:** `/code/secrets/detections`, `/code/secrets/inventory`, `/code/secrets/repositories`
- **Breadcrumb:** `Home > Code > Secrets`
- **Discoverability Method:** Primary Sidebar, Secondary Tabs

#### `/code/dependencies`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Dependencies
- **Navigation Label:** Dependencies
- **Required Permission:** `code:read`
- **Related Pages:** `/code/sbom`, `/code/supply-chain`
- **Breadcrumb:** `Home > Code > Dependencies`
- **Discoverability Method:** Primary Sidebar, Global Search ("dependencies", "CVE")

#### `/code/sbom`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → SBOM
- **Navigation Label:** SBOM
- **Required Permission:** `code:read`
- **Related Pages:** `/code/dependencies`, `/code/supply-chain`
- **Breadcrumb:** `Home > Code > SBOM`
- **Discoverability Method:** Primary Sidebar, Contextual Link from Dependencies

#### `/code/iac`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → IaC Security
- **Navigation Label:** IaC Security
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac/scans`, `/code/iac/scans/[id]`, `/code/iac/drift`, `/cloud/iac`
- **Breadcrumb:** `Home > Code > IaC Security`
- **Discoverability Method:** Primary Sidebar, Cloud Workspace Cross-link

#### `/code/iac/scans`
- **Parent:** IaC Security (`/code/iac`)
- **Navigation Label:** IaC Scans
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac`, `/code/iac/scans/[id]`
- **Breadcrumb:** `Home > Code > IaC Security > Scans`
- **Discoverability Method:** IaC Security Scans Tab, Breadcrumbs

#### `/code/iac/scans/[id]`
- **Parent:** IaC Scans (`/code/iac/scans`)
- **Navigation Label:** IaC Scan Detail
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac`, `/code/iac/scans`
- **Breadcrumb:** `Home > Code > IaC Security > Scans > [scanId]`
- **Discoverability Method:** Click on any scan in Scans Table, Direct URL

#### `/code/iac/configuration-analysis`
- **Parent:** IaC Security (`/code/iac`)
- **Navigation Label:** Configuration Analysis
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac`, `/code/iac/drift`, `/code/iac/scans`
- **Breadcrumb:** `Home > Code > IaC Security > Configuration Analysis`
- **Sub-Views:** Overview (4.1), Resource Inventory (4.2), Misconfigurations (4.3), Secure Configs (4.4), Configuration Drift (4.5), Best Practices (4.6), Resource Detail (4.7), Comparison (4.8)
#### `/code/iac/rules`
- **Parent:** IaC Security (`/code/iac`)
- **Navigation Label:** IaC Rules
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac`, `/code/iac/rules/[id]`, `/code/iac/policies`
- **Breadcrumb:** `Home > Code > IaC Security > Rules`
- **Sub-Views:** Rules Overview (6.1), All Rules (6.2), Enabled Rules (6.3), Disabled Rules (6.4), Custom Rules (6.5), Rule Packs (6.6), Rule Filters & Search (6.7), Rule Configuration (6.8)
- **Discoverability Method:** IaC Security Navigation Bar (Rules tab), IaC Left Sidebar, Direct URL

#### `/code/iac/rules/[id]`
- **Parent:** IaC Rules (`/code/iac/rules`)
- **Navigation Label:** IaC Rule Detail & Configuration
- **Required Permission:** `code:read`
- **Related Pages:** `/code/iac/rules`, `/code/iac`
- **Breadcrumb:** `Home > Code > IaC Security > Rules > [ruleId]`
- **Sub-Views:** Rule Configuration (6.8) with live Rego editor and deterministic validator
- **Discoverability Method:** Click Rule ID or Edit action in any Rules catalog table, Direct URL

#### `/code/container-security`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Container Security
- **Navigation Label:** Container Security
- **Required Permission:** `code:read`
- **Related Pages:** `/cloud/docker`, `/cloud/kubernetes`
- **Breadcrumb:** `Home > Code > Container Security`
- **Discoverability Method:** Primary Sidebar

#### `/code/jobs`
- **Parent:** Code Security (`/code`)
- **Sidebar Location:** Code Security → Security Jobs
- **Navigation Label:** Security Jobs
- **Required Permission:** `code:read`
- **Related Pages:** `/code/repositories`, `/code/sast`
- **Breadcrumb:** `Home > Code > Security Jobs`
- **Discoverability Method:** Primary Sidebar, Scan status link on Repositories page

---

### Cloud Security Module

#### `/cloud`
- **Parent:** Platform Root
- **Sidebar Location:** Cloud Security → Cloud Overview
- **Navigation Label:** Cloud Overview
- **Required Permission:** `cloud:read`
- **Related Pages:** `/cloud/assets`, `/cloud/findings`, `/cloud/kubernetes`
- **Breadcrumb:** `Home > Cloud`
- **Discoverability Method:** Primary Sidebar, Workspace Switcher

#### `/cloud/assets`
- **Parent:** Cloud Security (`/cloud`)
- **Sidebar Location:** Cloud Security → Cloud Assets
- **Navigation Label:** Assets
- **Required Permission:** `cloud:read`
- **Related Pages:** `/cloud/assets/[id]`, `/cloud/findings`, `/cloud/blast-radius`
- **Breadcrumb:** `Home > Cloud > Assets`
- **Discoverability Method:** Primary Sidebar, Search Modal ("s3", "ec2", "vpc")

#### `/cloud/findings`
- **Parent:** Cloud Security (`/cloud`)
- **Sidebar Location:** Cloud Security → Cloud Findings
- **Navigation Label:** Cloud Findings
- **Required Permission:** `cloud:read`
- **Related Pages:** `/cloud/exposures`, `/cloud/attack-paths`
- **Breadcrumb:** `Home > Cloud > Findings`
- **Discoverability Method:** Primary Sidebar, Global Search

#### `/cloud/kubernetes`
- **Parent:** Cloud Security (`/cloud`)
- **Sidebar Location:** Cloud Security → Kubernetes
- **Navigation Label:** Kubernetes
- **Required Permission:** `cloud:read`
- **Related Pages:** `/cloud/assets`, `/cloud/docker`
- **Breadcrumb:** `Home > Cloud > Kubernetes`
- **Discoverability Method:** Primary Sidebar, `/kubernetes` route alias

#### `/cloud/blast-radius`
- **Parent:** Cloud Security (`/cloud`)
- **Sidebar Location:** Cloud Security → Blast Radius
- **Navigation Label:** Blast Radius
- **Required Permission:** `cloud:read`
- **Related Pages:** `/cloud/attack-paths`, `/graph`
- **Breadcrumb:** `Home > Cloud > Blast Radius`
- **Discoverability Method:** Primary Sidebar, Contextual Link from Cloud Asset Detail

---

### Protect & Runtime Defense Module

#### `/protect`
- **Parent:** Platform Root
- **Sidebar Location:** Protect & Runtime → Overview
- **Navigation Label:** Runtime Overview
- **Required Permission:** `protect:read`
- **Related Pages:** `/protect/mcp`, `/protect/policies`, `/protect/sessions`
- **Breadcrumb:** `Home > Protect`
- **Discoverability Method:** Primary Sidebar, Workspace Switcher

#### `/protect/mcp`
- **Parent:** Protect (`/protect`)
- **Sidebar Location:** Protect & Runtime → MCP Security Gateway
- **Navigation Label:** MCP Gateway
- **Required Permission:** `protect:read`
- **Related Pages:** `/protect/mcp/servers`, `/protect/mcp/tools`, `/protect/mcp/audit`
- **Breadcrumb:** `Home > Protect > MCP Gateway`
- **Discoverability Method:** Primary Sidebar, Secondary Tabs

#### `/protect/policies`
- **Parent:** Protect (`/protect`)
- **Sidebar Location:** Protect & Runtime → Policies
- **Navigation Label:** Runtime Policies
- **Required Permission:** `protect:write`
- **Related Pages:** `/protect/policies/simulation`, `/governance`
- **Breadcrumb:** `Home > Protect > Policies`
- **Discoverability Method:** Primary Sidebar, Secondary Tabs

#### `/protect/approvals`
- **Parent:** Protect (`/protect`)
- **Sidebar Location:** Protect & Runtime → Approvals
- **Navigation Label:** Intercept Approvals
- **Required Permission:** `protect:approve`
- **Related Pages:** `/protect/approvals/break-glass`, `/protect/mcp/audit`
- **Breadcrumb:** `Home > Protect > Approvals`
- **Discoverability Method:** Primary Sidebar with notification bell, Header Alert badge

---

### Agent Governance Module

#### `/agent`
- **Parent:** Platform Root
- **Sidebar Location:** Agent Governance → Overview
- **Navigation Label:** Agent Overview
- **Required Permission:** `agent:read`
- **Related Pages:** `/agent/agents`, `/agent/delegations`, `/agent/risk`
- **Breadcrumb:** `Home > Agent Governance`
- **Discoverability Method:** Primary Sidebar, Workspace Switcher

#### `/agent/agents`
- **Parent:** Agent Governance (`/agent`)
- **Sidebar Location:** Agent Governance → Agents Registry
- **Navigation Label:** AI Agents
- **Required Permission:** `agent:read`
- **Related Pages:** `/agent/agents/[id]`, `/agent/tools`, `/protect/sessions`
- **Breadcrumb:** `Home > Agent Governance > Agents`
- **Discoverability Method:** Primary Sidebar, Search Modal ("claude", "agent", "worker")

#### `/agent/delegations`
- **Parent:** Agent Governance (`/agent`)
- **Sidebar Location:** Agent Governance → Delegations
- **Navigation Label:** Delegations & Lineage
- **Required Permission:** `agent:read`
- **Related Pages:** `/agent/delegations/graph`, `/graph`
- **Breadcrumb:** `Home > Agent Governance > Delegations`
- **Discoverability Method:** Primary Sidebar, Secondary Tabs

---

### QA & Automation Module

#### `/qa`
- **Parent:** Platform Root
- **Sidebar Location:** QA Automation → Hub
- **Navigation Label:** QA Automation
- **Required Permission:** `qa:read`
- **Related Pages:** `/qa/suites`, `/qa/test-cases`, `/qa/runs`
- **Breadcrumb:** `Home > QA Hub`
- **Discoverability Method:** Primary Sidebar, Workspace Switcher

#### `/qa/suites`
- **Parent:** QA Hub (`/qa`)
- **Sidebar Location:** QA Automation → Test Suites
- **Navigation Label:** Test Suites
- **Required Permission:** `qa:read`
- **Related Pages:** `/qa/test-cases`, `/qa/runs`
- **Breadcrumb:** `Home > QA > Suites`
- **Discoverability Method:** Primary Sidebar, Quick Access cards on `/qa`

#### `/qa/browsers`
- **Parent:** QA Hub (`/qa`)
- **Sidebar Location:** QA Automation → Browser Cloud
- **Navigation Label:** Browser Matrix
- **Required Permission:** `qa:write`
- **Related Pages:** `/qa/runs`, `/qa/visual-diff`
- **Breadcrumb:** `Home > QA > Browsers`
- **Discoverability Method:** Primary Sidebar, Quick Access cards on `/qa`

---

### Settings & Administration Module

#### `/settings`
- **Parent:** Platform Root
- **Sidebar Location:** Bottom Bar → Settings
- **Navigation Label:** Settings
- **Required Permission:** `user:read`
- **Related Pages:** `/settings/members`, `/settings/roles`, `/settings/sessions`, `/settings/api-keys`
- **Breadcrumb:** `Home > Settings`
- **Discoverability Method:** Primary Sidebar footer icon, User Profile dropdown menu

#### `/settings/members`
- **Parent:** Settings (`/settings`)
- **Sidebar Location:** Settings → Team Members
- **Navigation Label:** Members & Access
- **Required Permission:** `org:admin`
- **Related Pages:** `/settings/roles`, `/audit-logs`
- **Breadcrumb:** `Home > Settings > Members`
- **Discoverability Method:** Settings in-page tabs, Direct URL

#### `/audit-logs`
- **Parent:** Platform Root
- **Sidebar Location:** Governance → Audit Logs
- **Navigation Label:** Audit Logs
- **Required Permission:** `audit:read`
- **Related Pages:** `/governance`, `/protect/mcp/audit`
- **Breadcrumb:** `Home > Audit Logs`
- **Discoverability Method:** Primary Sidebar, Settings Security sub-tab

---

### Infrastructure as Code (IaC) Security Module

#### `/code/iac/overview`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Overview (Screens 1.1–1.8)
- **Navigation Label:** Overview
- **Required Permission:** `code:read`
- **Sub-Views:**
  - `1.1 IaC Security Overview`: Overall security metrics, findings trend stacked bar chart, severity distribution, IaC type distribution
  - `1.2 Environment Overview`: Production, Staging, Development, QA findings breakdown and compliance trends
  - `1.3 Provider Overview`: AWS, Azure, GCP, and other cloud provider coverage and findings distribution
  - `1.4 Resource Inventory`: Filtered and paginated detected IaC resources across providers and environments
  - `1.5 IaC Coverage`: Repositories and IaC files scanning coverage, file type breakdown, and scan status
  - `1.6 Compliance Overview`: CIS, NIST, PCI DSS, ISO 27001 posture tracking and top control failures
  - `1.7 Risk Summary`: Overall infrastructure risk score gauge, risk level, category breakdown, and risk trend
  - `1.8 Recent Activity`: Live timeline feed of scans, detections, drifts, violations, and rule updates
- **Related Pages:** `/code/iac`, `/code/iac/configuration-analysis`, `/code/iac/scans`
- **Breadcrumb:** `THING CODE > IaC Security > Overview`
- **Discoverability Method:** Primary Sidebar, IaC workspace header menu, repository overview tab

#### `/code/iac/policies`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Policies & Quality Gates (Screens 13.1–13.8)
- **Navigation Label:** Policies & Quality Gates
- **Required Permission:** `code:read`, `code:write`
- **Sub-Views:**
  - `13.1 Policies Overview`: Total policies, enforced/draft/disabled counts, policy compliance donut, quality gate status donut, violations trend, top policy violations
  - `13.2 Policies`: Full catalog with search, type/status/framework filters, pagination, + Create Policy modal
  - `13.3 Policy Detail`: Deep dive with description, scope, evaluation logic code snippet, remediation guide, rules, exceptions, affected repos, audit logs
  - `13.4 Quality Gates`: Quality gates table with fail conditions, status, affected repos, + Create Quality Gate modal
  - `13.5 Quality Gate Detail`: Detail view with rules list, + Add Rule modal, trash rule, repositories, pipeline integration snippets, notifications, audit logs
  - `13.6 Violations`: Policy violations list with severity, status, repo, date range filters, pagination
  - `13.7 Exceptions`: Policy exceptions list, validity dates, + Add Exception modal
  - `13.8 Settings`: General, Enforcement, Notifications, Approval Workflow, Advanced settings with live toggle persistence
- **Related Pages:** `/code/iac`, `/code/iac/overview`, `/code/iac/quality-gates`
- **Breadcrumb:** `THING CODE > IaC Security > Policies & Quality Gates > Overview`
#### `/code/iac/rules/[id]`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Rules → Rule Detail (Screens 7.1–7.8)
- **Navigation Label:** Rule Detail Suite
- **Required Permission:** `code:read`, `code:write`
- **Sub-Views:**
  - `7.1 Rule Detail – Overview`: Master rule header (ID, Critical badge, title, description, Edit Rule & Run Scan buttons), 4 KPI cards (Total Findings 24, Open 18, Resolved 5, Suppressed 1), Rule Information grid
  - `7.2 Rule Definition`: Details tab displaying Title, Description, Rationale, Impact, Recommendation, 4 interactive external reference links (AWS, CIS, NIST, PCI DSS), metadata labels
  - `7.3 Rule Logic`: AST Detection Logic viewer with multi-engine switchers (Terraform Checkov, CloudFormation, Kubernetes Crossplane, Others), YAML syntax formatting, Copy button, non-compliant test resource sample snippet
  - `7.4 Severity & Risk`: Severity card, Risk Details table (Likelihood, Impact, Risk Score 9.2/10, CVSS 8.6, Data Sensitivity, Business Impact, Exploitability), Risk Factors checklist, 6-Month Risk Trend SVG chart
  - `7.5 Framework Mappings`: Compliance Framework Mappings table (CIS AWS 3.1, NIST 800-53 SC-28, PCI DSS 1.2.1, ISO 27001 A.8.2.3, SOC 2 CC6.1) with Mapped badges, Related Framework Requirements card
  - `7.6 Affected Resources`: 4 KPI cards (24 Total, 18 Non-Compliant, 5 Compliant, 1 Suppressed), multi-filter controls (Status, Environment, Region, Search), paginated 10-resource table with pagination controls
  - `7.7 Exceptions`: 3 KPI cards (2 Active, 1 Expired, 0 Pending Review), Search, + Add Exception modal, Exceptions registry table with interactive Edit and Revoke/Delete actions
  - `7.8 Rule History`: Version timeline audit table (v2.3.0 through v1.0.0) with release dates, change summaries, and update author identities
- **Related Pages:** `/code/iac/rules`, `/code/iac/overview`, `/code/iac/remediation`
- **Breadcrumb:** `THING CODE > IaC Security > Rules > [ruleId]`
- **Discoverability Method:** Rules Catalog table click, Findings drill-down, direct link `/code/iac/rules/[id]`

#### `/code/iac/settings`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Settings (Screens 15.1–15.7)
- **Navigation Label:** Settings Suite
- **Required Permission:** `code:read`, `code:write`
- **Sub-Views:**
  - `15.1 General Settings`: Repository selector, default branch, IaC working directory, supported IaC types (Terraform, CloudFormation, K8s, Helm), push/PR/schedule scan triggers, Save & Reset
  - `15.2 Scan Settings`: Checkov primary scanner, version info, Check for updates live action, additional tools (tfsec, kube-score, kube-linter, custom scanner), file extensions, max file size, parallel scans, Save & Reset
  - `15.3 Rules & Policies`: Sub-tabs (Policy Packs, Custom Rules, Severity Thresholds), Enabled Policy Packs catalog with toggle statuses, severity mappings matrix for Checkov/tfsec/kube-score, Save & Reset
  - `15.4 Exclusions`: Sub-tabs (File / Path Exclusions, Resource Exclusions, Rule Exclusions), exclusions table with delete action, + Add Exclusion modal, live Preview path matcher testing input against active glob patterns
  - `15.5 Notifications`: Master notifications toggles (Enable, Scan Completion, Critical Findings, Policy Violations), Notification Channels registry (Slack, Email, Webhook, Jira), + Add Channel modal, notification event trigger checklist, Save & Reset
  - `15.6 Access & Permissions`: Sub-tabs (User Access, Roles, Permission Matrix), Users with Access table with avatar initials and role dropdown, + Add User modal, Predefined Role definitions (Admin, Editor, Viewer, Custom), Save & Reset
  - `15.7 Advanced Settings`: Performance limits (Scan Timeout, Max Memory Usage, Cache Results & TTL), Advanced Scanner Options (Checkov and tfsec CLI arguments), Environment Variables table with + Add Variable modal and delete action, Save & Reset
- **Related Pages:** `/code/iac`, `/code/iac/overview`, `/code/iac/rules`
- **Breadcrumb:** `THING CODE > IaC Security > Settings`
- **Discoverability Method:** Primary Sidebar under IaC Security (Settings), workspace header navigation

#### `/code/iac/infrastructure-graph`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Infrastructure Graph (Screens 12.1–12.8)
- **Navigation Label:** Infrastructure Graph Suite
- **Required Permission:** `code:read`, `code:write`
- **Sub-Views:**
  - `12.1 Infrastructure Graph Overview`: 4 KPI cards (268 Total Resources, 42 High Risk, 86 Medium Risk, 140 Low Risk), Filter bar, Logical Canvas (Users -> Route 53 -> CloudFront -> ALB -> EKS, EC2, RDS, S3), 7-category color legend
  - `12.2 Resource Graph`: Interactive topology tree with VPC root (`prod-vpc`), subnets (`subnet-a`, `subnet-b`), gateways (`igw-01`, `nat-01`), clusters (`prod-eks`, `prod-db`), and storage (`app-storage`), zoom/pan controls, table/graph toggle
  - `12.3 Resource Detail`: Resource hero banner (`EKS Cluster eks-prod-cluster`, High Risk badge, Open in AWS action, Previous/Next navigation), 3 columns (Basic Information, Risk Summary with findings breakdown, Configuration Status checklist with 5 compliant checks)
  - `12.4 Risk View`: Severity-weighted topological canvas (Route 53, ALB, EKS, RDS, EC2, S3) with findings badges, risk level filter, zoom controls, and 4-tier risk legend
  - `12.5 Relationships`: Upstream/downstream dependency matrix table, search input, relationship type filter, pagination, and 10 baseline relationships (Routes to, Forwards to, Uses, Stores data in, Connects to, Provides egress to, Assumed by, Allows traffic from, Encrypts)
  - `12.6 Blast Radius`: Impact analysis for compromised resource (`EKS Cluster eks-prod-cluster`), 12 affected resources counter with severity breakdown (2 Critical, 6 High, 3 Medium, 1 Low), direct and indirect dependency tree canvas
  - `12.7 Change History`: Infrastructure changes timeline table, date range indicator, resource filter dropdown, 9 historical modification events with authors (`mayur.bhanvad`, `dev.lead`, `terraform-ci`, `infra-team`, `scan-bot`, `security-team`), pagination
  - `12.8 Graph Settings`: Visualization preferences (Default View, Show Resource Labels, Show Relationships, Group by Environment, Show Risk Indicators), Analysis settings (Include External, Enable Blast Radius, Maximum Depth: 3, Show Deprecated), Export preferences (PNG/SVG/PDF) and working Save Changes
- **Related Pages:** `/code/iac/overview`, `/code/iac/rules`, `/code/iac/drift`
- **Breadcrumb:** `THING CODE > IaC Security > Infrastructure Graph > [View]`
- **Discoverability Method:** Primary Sidebar under IaC Security (Infrastructure Graph branch with sub-items)

#### `/code/iac/integrations`
- **Parent:** Code Security (`/code/iac`)
- **Sidebar Location:** IaC Security → Integrations (Screens 14.1–14.8)
- **Navigation Label:** Integrations Suite
- **Required Permission:** `code:read`, `code:write`
- **Sub-Views:**
  - `14.1 Integrations Overview`: 4 KPI cards (12 Total, 8 Connected, 2 Disconnected, 1 Failed), Donut chart status breakdown (8 Connected, 2 Disconnected, 1 Failed, 1 Not Configured), Popular integrations list (GitHub, GitLab, Jenkins, Azure DevOps, Terraform Cloud)
  - `14.2 Connected Integrations`: Tool management table, type filter (Code Repository, CI/CD, IaC Management, Secrets Management, Notifications, Issue Tracking), search input, real-time sync timestamps
  - `14.3 Add Integration`: Catalog grid of 12 cloud integrations (GitHub, GitLab, Bitbucket, Azure DevOps, Jenkins, GitHub Actions, GitLab CI, CircleCI, Terraform Cloud, AWS CodeBuild, Azure Pipelines, Slack), category pills, Connect modal
  - `14.4 Integration Detail (GitHub)`: Connection details (Status, Connected On, Connected By, App Type, Permissions, Reconnect action), Repository Selection (All repositories, Select repositories, Select by organization), Sync settings toggles, Disconnect button, Save Changes
  - `14.5 Repositories`: 10-repository inventory, search filter, visibility filter (Public/Private), scan status badges (Enabled/Disabled/Not Configured) with interactive toggle mutation, last scanned times, pagination
  - `14.6 Webhooks`: Webhook endpoints table, Active badge, + Add Webhook modal, Webhook Events subscription checklist (Push, Pull request, Merge, Release, Tag), Test Webhook latency check, Save Changes
  - `14.7 Scan Settings (Integration Level)`: Scan configuration toggles (Scan on Push, Scan on PR, Scan on Merge), Include/Exclude glob path filters, Scanner options (Checkov, Policy Pack, Severity Threshold), Reset to defaults & Save Changes
  - `14.8 Sync Logs`: Timeline of synchronization events, event filter dropdown (Repository Sync, Webhook Received, PR Scan Triggered, Scan Completed, etc.), status badges, manual Sync Now action, pagination
- **Related Pages:** `/code/iac/overview`, `/code/iac/scans`, `/code/iac/settings`
- **Breadcrumb:** `THING CODE > IaC Security > Integrations > [View]`
- **Discoverability Method:** Primary Sidebar under IaC Security (Integrations branch with sub-items)



