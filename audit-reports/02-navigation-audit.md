# KAVACH — SIDEBAR & INFORMATION ARCHITECTURE AUDIT

**Report ID:** KAV-AUDIT-02  
**Author:** Principal Product Architect & Senior UX Engineer  
**Date:** November 2026  
**Status:** COMPLETE & EMPIRICALLY VERIFIED  
**Scope:** Navigation Systems (`Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx`, route groupings)  

---

## 1. Executive Diagnosis: The "Morphing Sidebar" Anti-Pattern

The primary architectural breakdown in Kavach's user experience is that **the navigation sidebar completely rewrites itself based on the current URL prefix**.

In `frontend/components/navigation/Sidebar.tsx` (lines 151–234 and 521–704), the component inspects `pathname` and swaps out its navigation items for one of **10 mutually exclusive sidebar configurations**:

1. **Global Core Navigation:** (`/overview`, `/runs`, `/findings`, `/fixes`, `/reports`, `/repositories`, etc.)
2. **Code Security Lifecycle:** (`/code/*` — 18 items across 4 sections)
3. **SAST Analysis Engine Exclusive Navigation:** (`/code/sast/*` — 9 items + Back to Dashboard)
4. **Dependencies & SCA Engine Exclusive Navigation:** (`/code/dependencies/*` — 15 items + Back to Dashboard)
5. **IaC Security Exclusive Navigation:** (`/code/iac/*` — 14 items + Back to Dashboard)
6. **Container Security Exclusive Navigation:** (`/container-security/*` or `/code/container-security/*` — 15 items + Back to Dashboard)
7. **API Security Exclusive Navigation:** (`/api-security/*` — 11 items + Back to Dashboard)
8. **Cloud Security Workspace:** (`/cloud/*` — 6 items + Back to Dashboard)
9. **Sales & Enterprise Suite:** (`/sales/*` — 15 items + Back to Dashboard)
10. **Administration:** (`/settings/*` — 8 items + Back to Dashboard)

### The Usability Damage
- **Disorientation:** When a user is investigating code vulnerabilities on `/findings` and clicks on a SAST finding that links to `/code/sast/findings`, their entire sidebar changes. Their links to "Repositories", "Runs", "Fixes", and "Settings" disappear, replaced by a specialized 9-item menu.
- **Lost Context:** The user is forced to click a tiny, unstyled `← Back to Dashboard` link (e.g., line 563 in `Sidebar.tsx`) just to recover their primary navigation.
- **Contradiction of Stated Rules:** Line 42 of `Sidebar.tsx` explicitly claims:
  `* 2. Sidebar NEVER randomly changes between pages — stays permanent across the whole app.`
  In reality, the code does the exact opposite.
- **Route Alias Gymnastics:** Lines 729–900 of `Sidebar.tsx` require over 170 lines of fragile string matching (`checkIsActive`) simply to determine which menu item should be highlighted because the same concept lives at 4 different URL routes.

---

## 2. Analysis of Product Duplications & Dashboarditis

Security platforms often fall into the trap of "Dashboarditis" — creating a high-level overview dashboard for every sub-discipline. Kavach suffers from severe dashboard proliferation:

### 2.1 The Seven Overviews
A user logging into Kavach can land on any of seven nearly identical overview dashboards:
1. `/` (Public / marketing landing)
2. `/overview` (Global platform overview)
3. `/home` (Security HQ quick action search hero)
4. `/dashboard` (Redirects to `/overview`)
5. `/code` (Code Security hub — 2,736 lines)
6. `/code/sast` (SAST Overview)
7. `/code/dependencies` (SCA Overview)
8. `/code/iac` (IaC Overview)
9. `/container-security` (Container Overview)
10. `/api-security` (API Security Overview)
11. `/cloud` (Cloud Security Overview)

Every single overview page features nearly identical KPI cards:
- Critical Vulnerabilities Count
- Total Findings Count
- Repository Coverage Percentage
- Recent Scan Status

### 2.2 The Eight Scans Tables
When a security scan is running, there are eight separate pages where scan status is reported:
1. `/runs` (Global runs list)
2. `/scans` (Redirects to `/runs`)
3. `/code/jobs` (5,500-line monolithic security jobs suite)
4. `/code/sast/scans` (1,185-line SAST scans suite)
5. `/code/dependencies/scans` (SCA scans suite)
6. `/code/iac/scans` (IaC scans suite)
7. `/container-security/scans` (Container scans suite)
8. `/api-security/analysis` (API scans suite)

### 2.3 The Nine Findings Tables
Findings are scattered across nine disconnected tables:
1. `/findings` (Unified findings hub)
2. `/code/findings` (Redirects to `/findings`)
3. `/code/sast/findings` (SAST findings)
4. `/code/secrets` (Secrets findings)
5. `/code/dependencies/vulnerabilities` (Dependency CVEs)
6. `/code/iac/findings` (IaC misconfigurations)
7. `/container-security/findings` (Container CVEs)
8. `/api-security/findings` (API security vulnerabilities)
9. `/cloud/findings` (Cloud security observations)

---

## 3. Comprehensive Navigation Treatment Table

Below is the evaluation of every current navigation destination across the platform, with its recommended treatment and architectural rationale.

| Current Page | Route | Actual Purpose | Problems | Suggested Treatment | Reason |
|---|---|---|---|---|---|
| **Security HQ** | `/home` | Action launcher & quick search | Redundant with `/overview`; causes navigation confusion. | **MERGE** | Merge the quick search and action pills directly into the top of the unified Security HQ (`/overview`). |
| **Global Overview** | `/overview` | Main security posture dashboard | Renders `code/page.tsx` directly; lacks unified asset score. | **KEEP** | This should become the sole authoritative **Security HQ** destination. |
| **Code Overview** | `/code` | Code security command center | Duplicate of `/overview`. Causes sidebar to switch modes. | **MERGE** | Absorb into `/overview`. |
| **Dashboard Redirect** | `/dashboard` | Redirect stub | Dead route existing only to bounce to `/overview`. | **REMOVE** | Permanent 301 redirect to `/overview`. |
| **Repositories Hub** | `/repositories` | VCS repository management | Isolated from cloud assets and container registries. | **MOVE & EXPAND** | Rename and elevate to **Assets** (`/assets/repositories`), housing repos, cloud accounts, and containers. |
| **Legacy Code Repos** | `/code/repositories`| Redirect stub | Redundant route alias. | **REMOVE** | Keep HTTP redirect, delete duplicate nav item. |
| **Unified Findings** | `/findings` | Primary vulnerability triage | Good underlying table, but bypassed by specialized scanner sub-menus. | **KEEP & EXPAND** | Make this the **Single Authoritative Findings Hub** for all scanners (SAST, Secrets, SCA, IaC, Containers, API, Cloud). |
| **Legacy Findings** | `/code/findings` | Redirect stub | Redundant route alias. | **REMOVE** | Keep HTTP redirect, eliminate nav entry. |
| **SAST Overview** | `/code/sast` | SAST scanner dashboard | Sast is a scanner engine, not a separate SaaS product. | **CONVERT TO TAB** | Make SAST a category filter/tab within `/findings` and `/runs`. |
| **SAST Findings** | `/code/sast/findings`| SAST-only findings table | Duplicates `/findings?category=SAST`. | **CONVERT TO FILTER**| Link directly to `/findings?category=SAST`. |
| **SAST Hotspots** | `/code/sast/hotspots`| Manual code review queue | Buried 3 levels deep under SAST. | **CONVERT TO TAB** | Place as a sub-tab under Findings (`/findings/hotspots`). |
| **SAST Scans** | `/code/sast/scans` | SAST scan execution history | Duplicates `/runs`. 1,185 lines of duplicate code. | **MERGE** | Absorb into unified `/runs?engine=semgrep`. |
| **SAST Rules** | `/code/sast/rules` | Semgrep rule configuration | Fragmented from OPA policies. | **MERGE** | Move into unified Policies (`/policies/rules`). |
| **SAST Remediation** | `/code/sast/remediation`| SAST patch proposals | Fragmented from `/fixes`. | **MERGE** | Merge into unified Fixes (`/fixes`). |
| **SAST Agent** | `/code/sast/agent` | Autonomous SAST agent view | Disconnected from global Assistant. | **CONVERT TO DRAWER**| Trigger via contextual Copilot drawer in Findings. |
| **Secrets Detection**| `/code/secrets` | Exposed secret findings | Separate page with duplicate findings table. | **CONVERT TO FILTER**| Link to `/findings?category=SECRETS`. |
| **SCA Overview** | `/code/dependencies`| Dependency dashboard | Over-engineered 78-page sub-product. | **MERGE** | Absorb high-level metrics into Security HQ. |
| **SCA Inventory** | `/code/dependencies/inventory`| Package dependency list | Valuable asset data, but isolated. | **MOVE** | Move to Assets tab (`/assets/packages`). |
| **SCA Vulnerabilities**| `/code/dependencies/vulnerabilities`| Package CVE list | Exact duplicate of `/findings?category=SCA`. | **CONVERT TO FILTER**| Link to `/findings?category=SCA`. |
| **SCA Versions** | `/code/dependencies/versions`| Outdated packages list | Useful maintenance data. | **CONVERT TO TAB** | Tab under `/assets/packages`. |
| **SCA Ecosystems** | `/code/dependencies/ecosystems`| Breakdown by npm/pip/go | Thin KPI metrics page. | **CONVERT TO DETAIL VIEW**| Integrate as facet filter in `/assets/packages`. |
| **SCA Graph** | `/code/dependencies/graph`| Interactive dependency tree | Excellent visual asset. | **CONVERT TO DETAIL VIEW**| Open as modal/drawer on package selection. |
| **SCA Licenses** | `/code/dependencies/licenses`| License compliance risks | Legal/compliance workflow. | **CONVERT TO TAB** | Tab under Governance & Compliance (`/governance/licenses`). |
| **SCA Health** | `/code/dependencies/health`| Maintenance & decay score | Niche metric cards. | **MERGE** | Merge into `/assets/packages`. |
| **SCA Remediation** | `/code/dependencies/remediation`| Package upgrade PRs | Duplicates `/fixes`. | **MERGE** | Merge into `/fixes?type=dependency`. |
| **SCA SBOM** | `/code/dependencies/sbom`| SBOM export & view | Redundant with `/code/sbom`. | **MERGE** | Merge with `/reports/sbom`. |
| **SCA Policies** | `/code/dependencies/policies`| Disallowed package rules | Fragmented from `/policies`. | **MERGE** | Move to `/policies?domain=dependencies`. |
| **SCA CI/CD** | `/code/dependencies/ci-cd`| CI/CD PR gate status | Duplicate of `/ci-cd`. | **MERGE** | Merge into unified `/runs`. |
| **SCA Scans** | `/code/dependencies/scans`| Dependency scan runs | Duplicate of `/runs`. | **MERGE** | Merge into unified `/runs`. |
| **SCA Reports** | `/code/dependencies/reports`| SCA PDF/CSV exports | Duplicate of `/reports`. | **MERGE** | Merge into unified `/reports`. |
| **SCA Settings** | `/code/dependencies/settings`| Dependency scan flags | Fragmented settings. | **MOVE** | Move to Settings (`/settings/scanners`). |
| **SBOM Hub** | `/code/sbom` | CycloneDX SBOM viewer | Useful compliance asset. | **CONVERT TO TAB** | Tab under Reports & Evidence (`/reports/sbom`). |
| **Supply Chain** | `/code/supply-chain`| Ecosystem risk graph | Niche exploratory view. | **CONVERT TO DETAIL VIEW**| Detail view under Assets. |
| **IaC Overview** | `/code/iac` | IaC security dashboard | Separate dashboard for Checkov. | **MERGE** | Absorb metrics into Security HQ. |
| **IaC Inventory** | `/code/iac/inventory`| Terraform resources | Infrastructure asset inventory. | **MOVE** | Move to Assets tab (`/assets/cloud`). |
| **IaC Findings** | `/code/iac/findings` | Misconfiguration table | Duplicate of `/findings?category=IAC`. | **CONVERT TO FILTER**| Link to `/findings?category=IAC`. |
| **IaC Graph** | `/code/iac/graph` | Terraform resource graph | Good visualization. | **CONVERT TO DETAIL VIEW**| Drawer on cloud asset inspection. |
| **IaC AI Assistant** | `/code/iac/ai` | Specialized IaC assistant | Disconnected from Assistant. | **CONVERT TO DRAWER**| Universal Copilot slide-over. |
| **IaC Plans** | `/code/iac/plans` | Terraform plan analysis | Pre-deployment gate check. | **CONVERT TO TAB** | Sub-tab under Runs (`/runs/plans`). |
| **Container Overview**| `/container-security`| Docker & K8s dashboard | Duplicate of `/code/container-security`. | **MERGE** | Consolidate and move containers to Assets. |
| **Container Images** | `/container-security/images`| Registry image repository | Real asset inventory. | **MOVE** | Move to Assets tab (`/assets/containers`). |
| **Container Findings**| `/container-security/findings`| Image CVEs table | Duplicate of `/findings?category=CONTAINER`. | **CONVERT TO FILTER**| Link to `/findings?category=CONTAINER`. |
| **API Security** | `/api-security` | API OWASP assessment | High quality engine, but isolated in navigation. | **MERGE & EXPAND** | Move API endpoints to Assets (`/assets/apis`), findings to Findings (`/findings?category=API`). |
| **Security Runs Hub**| `/runs` | Global scan timeline | Real execution history. Clean layout. | **KEEP & EXPAND** | Make this the **Single Authoritative Runs & Pipeline Destination**. |
| **Security Jobs** | `/code/jobs` | 5,500-line monolithic jobs table | Massive duplicate of `/runs`. | **MERGE & DELETE** | Absorb schedule modal into `/runs`, delete `code/jobs`. |
| **Fixes Hub** | `/fixes` | 1-click remediation list | Clean, simple workflow. | **KEEP** | Standardize as **Fixes & Pull Requests** (`/fixes`). |
| **Autofix Studio** | `/code/autofix` | Comprehensive diff workspace | Excellent diff editor. | **MERGE** | Make this the detailed proposal view (`/fixes/[id]`). |
| **Pull Requests Hub**| `/code/pull-requests`| GitHub PR sync & tracking | Essential DevSecOps step. | **CONVERT TO TAB** | Tab under `/fixes/pull-requests`. |
| **Reports Hub** | `/reports` | Executive & compliance export | Authoritative reports. | **KEEP** | Retain as **Reports & Evidence** (`/reports`). |
| **Evidence Store** | `/code/evidence` | Scan execution evidence | Fragmented from reports. | **MERGE** | Tab under `/reports/evidence`. |
| **Policies Hub** | `/policies` | OPA Rego governance rules | Authoritative policy definition. | **KEEP** | Retain as **Policies & Gates** (`/policies`). |
| **Code Policies** | `/code/policies` | Duplicate OPA editor | Exact clone of `/policies`. | **REMOVE** | Redirect to `/policies`. |
| **Audit Logs** | `/audit-logs` | Immutable audit stream | Authoritative security log. | **KEEP** | Move under Administration / Activity. |
| **AI Assistant** | `/assistant` | Grounded chat copilot | Full page chat takes user away from active workflow. | **CONVERT TO DRAWER**| Provide as a **Global Slide-Over Copilot** accessible from any page, while keeping `/assistant` for deep sessions. |
| **Agent Guard** | `/agent` | Multi-agent runtime monitor | Advanced capability, currently niche. | **MOVE** | Place under Specialized Defense (`/agent-guard`). |
| **Cloud Security** | `/cloud` | Cloud posture dashboard | Seeds fake AWS/GCP data. | **HIDE UNTIL READY** | Hide until real cloud connector (AWS IAM Role / GCP Service Account) is verified. |
| **Attack Surface** | `/attack/surface` | External DAST & port scanner | Incomplete background worker. | **HIDE UNTIL READY** | Hide from main sidebar until worker pipelines are complete. |
| **Protect Gateway** | `/protect` | MCP runtime gateway | Specialized runtime defense. | **MOVE** | Retain under Specialized Defense drawer. |
| **SOC & Triage** | `/soc` | Incident & alert workspace | SecOps workflow, separate persona from DevSecOps. | **MOVE** | Retain under Specialized Defense drawer. |
| **Nexora QA** | `/qa` | QA testing suite | Unrelated to core application security platform. | **HIDE UNTIL READY** | Hide from core navigation to prevent product dilution. |
| **Sales Suite** | `/sales/*` | 15 sales/POC mock pages | Marketing/sales demos shouldn't be in authenticated product sidebar. | **REMOVE FROM SIDEBAR**| Remove from authenticated sidebar. Keep routes accessible for sales team via direct URL. |
| **Superadmin Suite**| `/superadmin/*` | Platform SaaS management | 52 pages of admin tools. | **MOVE** | Only visible to `is_superuser=True` via separate topbar switcher. |

---

## 4. Proposed 7-Item Permanent Navigation Structure

To eliminate disorientation and align with industry-leading products like Aikido Security, the sidebar must be **locked permanently** across all routes. The entire platform can be cleanly navigated through just **seven primary items**:

```
THING / KAVACH (Permanent Enterprise Sidebar)
│
├── 1. Security HQ          (/overview)         ── Executive posture, triage feed, critical alerts
├── 2. Assets               (/assets)           ── Repositories, Cloud Accounts, Containers, APIs
├── 3. Findings             (/findings)         ── Unified vulnerabilities across all engines (SAST, SCA, Secrets, IaC, API)
├── 4. Fixes & PRs          (/fixes)            ── AI proposals, code diffs, automated pull requests
├── 5. Security Runs        (/runs)             ── Real-time pipeline scans, CI/CD telemetry, stdout logs
├── 6. Policies & Gates     (/policies)         ── OPA rules, PR blocking gates, compliance frameworks
└── 7. Settings & Integrations (/settings)      ── Connectors (GitHub, Slack, Jira), Team, API Keys, Billing
│
└── [Global Drawer] AI Copilot (⌘K or Slide-Over) ── Grounded contextual assistant on any screen
```

