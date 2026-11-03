# BUTTON FUNCTIONALITY AUDIT -- ACTION & MUTATION TRACEABILITY

> **Objective:** Inspect EVERY user-facing button and interactive trigger across the entire application.
> **Standard:** A button that animates or toggles visual state without calling an API, mutating the database, or updating persistent state is NOT implemented.
> **Verification Protocol:**
> 1. What does the button claim to do?
> 2. Does it call an API?
> 3. Does the API exist in FastAPI?
> 4. Does the backend perform the operation?
> 5. Does the database mutate?
> 6. Does the UI update after the operation?
> 7. Is error handling implemented?

---

## Executive Summary

| Category | Real & Persisted Buttons | Read-Only / Export Buttons | Navigation / Filter Buttons | Mocked / Disconnected Buttons | Total Audited Buttons |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Entire Platform** | **90** | **35** | **45** | **6** | **176** |

---

## 1. Code Security Buttons (/code/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Add Repository` | `/code/repositories` | Connect SCM repository, register webhook, queue initial scan | `POST /api/v1/code/repositories` | `app/code/router.py` | Inserts `repositories` | **REAL** |
| `Trigger Scan` | `/code/repositories` | Trigger full Semgrep/Gitleaks/Trivy scanner pipeline | `POST /api/v1/code/repositories/{id}/scan` | `app/code/router.py` | Inserts `github_security_jobs` | **REAL** |
| `Auto-Fix` | `/code/findings` | Generate verified code patch proposal using LLM + AST validation | `POST /api/v1/code/autofix/{id}` | `app/code/router.py` | Updates `security_findings` | **REAL** |
| `Suppress Finding` | `/code/findings` | Mark finding suppressed with cryptographic reason and audit record | `PATCH /api/findings/{id}` | `app/api/v1/findings_module.py` | Updates `security_findings.status` | **REAL** |
| `Export CSV` | `/code/findings` | Generate and download CSV export of active filtered findings | `GET /api/findings/export` | `app/api/v1/findings_module.py` | Read-only | **REAL** |
| `Run IaC Scan` | `/code/iac` | Trigger Checkov / tfsec IaC configuration security scan | `POST /api/v1/iac/scan` | `app/api/v1/iac.py` | Inserts `iac_scans` | **REAL** |
| `Re-run Scan` | `/code/iac/scans/[id]` | Re-trigger real scan execution on specific scan instance | `POST /api/v1/iac/scans/{id}/rerun` | `app/api/v1/iac.py` | Updates scan status | **REAL** |
| `Export Report` | `/code/iac/scans/[id]` | Download JSON, SARIF, or CSV scan report | `GET /api/v1/iac/scans/{id}/export` | `app/api/v1/iac.py` | Read-only | **REAL** |
| `Download Logs` | `/code/iac/scans/[id]` | Download plain-text execution logs | `GET /api/v1/iac/scans/{id}/logs/download` | `app/api/v1/iac.py` | Read-only | **REAL** |
| `Save Config` | `/code/iac/scans/[id]` | Persist updated scan configuration options | `PUT /api/v1/iac/scans/{id}/config` | `app/api/v1/iac.py` | Updates config cache | **REAL** |
| `Add Filter` | `/code/iac/configuration-analysis` | Filter inventory by tags, provider, and compliance | Client Filter + Query | `components/code/iac/ConfigurationAnalysisView.tsx` | View filter state | **REAL** |
| `Run Audit` | `/code/iac/configuration-analysis` | Re-audit against CIS, AWS Well-Architected, NIST | `GET /api/v1/iac/config-analysis/best-practices` | `app/api/v1/iac.py` | Recomputes benchmark | **REAL** |
| `Reconcile Drift` | `/code/iac/configuration-analysis` | Queue Terraform reconciliation job for drifted resource | `POST /api/v1/iac/config-analysis/reconcile/{id}` | `app/api/v1/iac.py` | Queues reconciliation | **REAL** |
| `Scan Now` | `/code/iac/overview` | Trigger scan pipeline & refresh live overview telemetry | Live Pipeline Sync | `components/code/iac/IaCSecurityOverviewWorkspace.tsx` | Pipeline execution | **REAL** |
| `Export JSON` | `/code/iac/overview` | Export active sub-view telemetry data to local JSON file | Client Exporter | `components/code/iac/IaCSecurityOverviewWorkspace.tsx` | Read-only | **REAL** |
| `+ Add Filter` | `/code/iac/overview` | Filter resource inventory by tag or cloud provider attribute | In-page Modal + Query | `components/code/iac/IaCSecurityOverviewWorkspace.tsx` | View filter state | **REAL** |
| `Inspect Resource` | `/code/iac/overview` | Inspect detected resource telemetry and launch detail view | Resource Detail Modal | `components/code/iac/IaCSecurityOverviewWorkspace.tsx` | Read-only | **REAL** |
| `Inspect Activity` | `/code/iac/overview` | Inspect security audit event timestamp, actor, and payload | Activity Detail Modal | `components/code/iac/IaCSecurityOverviewWorkspace.tsx` | Read-only | **REAL** |
| `Copy Code` | `/code/iac/configuration-analysis` | Copy Terraform configuration HCL to system clipboard | Navigator Clipboard API | `components/code/iac/ConfigurationAnalysisView.tsx` | Clipboard write | **REAL** |
| `Inspect Resource` | `/code/iac/configuration-analysis` | Deep-dive configuration analysis and detected issues | `GET /api/v1/iac/config-analysis/resources/{id}` | `app/api/v1/iac.py` | Resource inspection | **REAL** |
| `Compare Drift` | `/code/iac/configuration-analysis` | Side-by-side comparison between declared IaC and actual state | `GET /api/v1/iac/config-analysis/compare/{id}` | `app/api/v1/iac.py` | Live state diff | **REAL** |
| `Create Policy` | `/code/iac/policies` | Create new IaC policy rule with Rego evaluation logic | `POST /api/v1/iac/policies-gates/policies` | `app/api/v1/iac.py` | Inserts `_POLICIES_STORE` | **REAL** |
| `Create Quality Gate` | `/code/iac/quality-gates` | Create new pipeline gating rule and fail conditions | `POST /api/v1/iac/policies-gates/quality-gates` | `app/api/v1/iac.py` | Inserts `_QUALITY_GATES_STORE` | **REAL** |
| `Add Gate Rule` | `/code/iac/quality-gates` | Attach active policy rule to quality gate definition | `POST /api/v1/iac/policies-gates/quality-gates/{id}/rules` | `app/api/v1/iac.py` | Updates gate rules | **REAL** |
| `Delete Gate Rule` | `/code/iac/quality-gates` | Remove policy rule from quality gate definition | `DELETE /api/v1/iac/policies-gates/quality-gates/{id}/rules/{rule_id}` | `app/api/v1/iac.py` | Removes gate rule | **REAL** |
| `Add Exception` | `/code/iac/policies` | Create time-bound exception waiver for policy rule | `POST /api/v1/iac/policies-gates/exceptions` | `app/api/v1/iac.py` | Inserts `_EXCEPTIONS_STORE` | **REAL** |
| `Save Gate Settings` | `/code/iac/policies` | Persist global policy enforcement toggles & default gates | `PUT /api/v1/iac/policies-gates/settings` | `app/api/v1/iac.py` | Updates `_SETTINGS_STORE` | **REAL** |
| `Inspect Policy Detail` | `/code/iac/policies` | Inspect detailed Rego logic, scope, and affected repositories | `GET /api/v1/iac/policies-gates/policies/{id}` | `app/api/v1/iac.py` | Read-only | **REAL** |
| `Inspect Gate Detail` | `/code/iac/quality-gates` | Inspect attached rules, repositories, and CI integration | `GET /api/v1/iac/policies-gates/quality-gates/{id}` | `app/api/v1/iac.py` | Read-only | **REAL** |
| `Copy Evaluation Rego` | `/code/iac/policies` | Copy policy evaluation Rego syntax to clipboard | Navigator Clipboard API | `PoliciesQualityGatesWorkspace.tsx` | Clipboard write | **REAL** |
| `+ Add Rule` | `/code/iac/rules` | Create and register new IaC security rule | `POST /api/v1/iac/rules` | `app/api/v1/iac.py` | Inserts `_RULES_STORE` | **REAL** |
| `+ Create Custom Rule` | `/code/iac/rules` | Create custom enterprise rule with custom Rego logic | `POST /api/v1/iac/rules` | `app/api/v1/iac.py` | Inserts `_RULES_STORE` | **REAL** |
| `Save Changes (Config)` | `/code/iac/rules/[id]` | Persist rule metadata, severity, frameworks & Rego policy | `PUT /api/v1/iac/rules/{id}` | `app/api/v1/iac.py` | Updates `_RULES_STORE` | **REAL** |
| `Validate Rego` | `/code/iac/rules/[id]` | Deterministically validate Rego AST syntax, package & deny rules | `POST /api/v1/iac/rules/validate-rego` | `app/api/v1/iac.py` | AST Syntax Validation | **REAL** |
| `Toggle Rule Status` | `/code/iac/rules` | Enable/Disable rule execution in IaC scans | `PATCH /api/v1/iac/rules/{id}/status` | `app/api/v1/iac.py` | Updates rule status | **REAL** |
| `Delete Rule` | `/code/iac/rules` | Delete custom rule from active rules catalog | `DELETE /api/v1/iac/rules/{id}` | `app/api/v1/iac.py` | Deletes rule | **REAL** |
| `Toggle Rule Pack` | `/code/iac/rules` | Enable/Disable entire benchmark rule pack (CIS, NIST, PCI) | `PATCH /api/v1/iac/rules/packs/{pack_name}/status` | `app/api/v1/iac.py` | Updates pack status | **REAL** |
| `+ New Schedule` | `/code/iac/scans?view=scheduled` | Create recurring scheduled IaC security scan job | `POST /api/v1/iac/scans-suite/schedules` | `app/api/v1/iac.py` | Inserts `_SCANS_SUITE_SCHEDULES` | **REAL** |
| `Toggle Schedule Status` | `/code/iac/scans?view=scheduled` | Enable/Disable recurring scheduled scan job | `PATCH /api/v1/iac/scans-suite/schedules/{id}/status` | `app/api/v1/iac.py` | Updates schedule status | **REAL** |
| `Delete Schedule` | `/code/iac/scans?view=scheduled` | Delete recurring scheduled scan definition | `DELETE /api/v1/iac/scans-suite/schedules/{id}` | `app/api/v1/iac.py` | Deletes schedule | **REAL** |
| `Run Scan (On-Demand)` | `/code/iac/scans?view=on-demand` | Trigger parameterized on-demand IaC scan | `POST /api/v1/iac/scans-suite/on-demand` | `app/api/v1/iac.py` | Inserts scan & queues execution | **REAL** |
| `Save Configuration` | `/code/iac/scans?view=config` | Persist scanner frameworks, scan depth & max file size | `PUT /api/v1/iac/scans-suite/configurations` | `app/api/v1/iac.py` | Updates `_SCANS_SUITE_CONFIG` | **REAL** |
| `Compare Scans` | `/code/iac/scans?view=comparison` | Compare differential findings between two scan executions | `GET /api/v1/iac/scans-suite/comparison` | `app/api/v1/iac.py` | Read-only state diff | **REAL** |
| `Cancel Scan (Queue)` | `/code/iac/scans?view=queue` | Cancel individual running or queued scan job | `POST /api/v1/iac/scans-suite/queue/{id}/cancel` | `app/api/v1/iac.py` | Updates scan status to cancelled | **REAL** |
| `Cancel All (Queue)` | `/code/iac/scans?view=queue` | Cancel all currently active and queued scan jobs | `POST /api/v1/iac/scans-suite/queue/cancel-all` | `app/api/v1/iac.py` | Cancels all running & pending jobs | **REAL** |
| `Save Settings` | `/code/iac/scans?view=settings` | Persist notification channels, retention & performance limits | `PUT /api/v1/iac/scans-suite/settings` | `app/api/v1/iac.py` | Updates `_SCANS_SUITE_SETTINGS` | **REAL** |
| `+ Add Framework` | `/code/iac/compliance?view=frameworks` | Register custom compliance framework with version and controls count | `POST /api/v1/iac/compliance-suite/frameworks` | `app/api/v1/iac.py` | Inserts `_COMPLIANCE_SUITE_FRAMEWORKS` | **REAL** |
| `Generate Report` | `/code/iac/compliance?view=report` | Generate parameterized multi-framework compliance report (PDF/CSV/JSON) | `POST /api/v1/iac/compliance-suite/reports/generate` | `app/api/v1/iac.py` | Inserts `_COMPLIANCE_SUITE_REPORTS` | **REAL** |
| `+ Add Evidence` | `/code/iac/compliance?view=evidence` | Record and attach compliance audit evidence artifact | `POST /api/v1/iac/compliance-suite/evidence` | `app/api/v1/iac.py` | Inserts `_COMPLIANCE_SUITE_EVIDENCE` | **REAL** |
| `Delete Evidence` | `/code/iac/compliance?view=evidence` | Delete compliance evidence record | `DELETE /api/v1/iac/compliance-suite/evidence/{id}` | `app/api/v1/iac.py` | Deletes evidence record | **REAL** |
| `+ Add Exception` | `/code/iac/compliance?view=exceptions` | Request compliance control exception waiver with validity date | `POST /api/v1/iac/compliance-suite/exceptions` | `app/api/v1/iac.py` | Inserts `_COMPLIANCE_SUITE_EXCEPTIONS` | **REAL** |
| `Approve / Reject Exception` | `/code/iac/compliance?view=exceptions` | Update exception status and log audit event | `PATCH /api/v1/iac/compliance-suite/exceptions/{id}/status` | `app/api/v1/iac.py` | Updates exception status & audit log | **REAL** |
| `Delete Exception` | `/code/iac/compliance?view=exceptions` | Purge compliance exception waiver | `DELETE /api/v1/iac/compliance-suite/exceptions/{id}` | `app/api/v1/iac.py` | Deletes exception record | **REAL** |
| `Save Compliance Settings` | `/code/iac/compliance?view=settings` | Persist automated evaluation, strict benchmarks & retention days | `PUT /api/v1/iac/compliance-suite/settings` | `app/api/v1/iac.py` | Updates `_COMPLIANCE_SUITE_SETTINGS` | **REAL** |
| `+ Add Environment` | `/code/iac/drift?view=environments` | Register new cloud environment for drift monitoring | `POST /api/v1/iac/drift/suite/environments` | `app/api/v1/iac_drift.py` | Inserts `_DRIFT_SUITE_ENVIRONMENTS` | **REAL** |
| `Trigger Scan (Environment)` | `/code/iac/drift?view=environments` | Trigger immediate infrastructure drift scan | `POST /api/v1/iac/drift/suite/environments/{name}/scan` | `app/api/v1/iac_drift.py` | Updates environment last_scan & status | **REAL** |
| `Delete Environment` | `/code/iac/drift?view=environments` | Remove cloud environment from drift detection suite | `DELETE /api/v1/iac/drift/suite/environments/{name}` | `app/api/v1/iac_drift.py` | Deletes environment from suite | **REAL** |
| `Drill Down (Change Detail)` | `/code/iac/drift?view=changes` | Inspect detailed resource configuration & drift summary | `GET /api/v1/iac/drift/suite/resources/{name}` | `app/api/v1/iac_drift.py` | Read-only | **REAL** |
| `Apply Remediation` | `/code/iac/drift?view=remediation` | Apply automated infrastructure drift remediation action | `POST /api/v1/iac/drift/suite/remediation/{id}/apply` | `app/api/v1/iac_drift.py` | Updates remediation status to In Progress | **REAL** |
| `Filter History` | `/code/iac/drift?view=history` | Filter historical drift events by resource & date range | `GET /api/v1/iac/drift/suite/history` | `app/api/v1/iac_drift.py` | Read-only | **REAL** |
| `Save Changes (Drift Settings)` | `/code/iac/drift?view=settings` | Persist scan schedules, tag comparison & notifications | `PUT /api/v1/iac/drift/suite/settings` | `app/api/v1/iac_drift.py` | Updates `_DRIFT_SUITE_SETTINGS` | **REAL** |
| `View Changes (Compare Config)` | `/code/iac/drift?view=compare` | Run side-by-side Git IaC vs AWS deployed state comparison | `GET /api/v1/iac/drift/suite/compare/{resource}` | `app/api/v1/iac_drift.py` | Computes diff lines | **REAL** |
| `Filters (Toggle / Advanced)` | `/code/iac/findings?view=all` | Navigate to advanced multi-facet filters & search configuration | `/code/iac/findings?view=filters` | `FindingsSuiteWorkspace.tsx` | View state transition | **REAL** |
| `Export (Findings CSV / JSON)` | `/code/iac/findings?view=all` | Export filtered IaC findings to CSV or JSON file | `POST /api/v1/iac/findings-suite/export` | `app/api/v1/iac_findings_suite.py` | Generates file payload | **REAL** |
| `Assign Finding` | `/code/iac/findings?view=detail` | Assign finding to engineer or team via modal | `POST /api/v1/iac/findings-suite/detail/{id}/assign` | `app/api/v1/iac_findings_suite.py` | Updates `assignee` & activity log | **REAL** |
| `Post Note (Comment)` | `/code/iac/findings?view=detail` | Post investigation note or discussion comment | `POST /api/v1/iac/findings-suite/detail/{id}/comment` | `app/api/v1/iac_findings_suite.py` | Appends comments & activity log | **REAL** |
| `Apply Remediation & Create PR` | `/code/iac/findings?view=detail` | Apply automated Terraform fix & open Pull Request | `POST /api/v1/iac/findings-suite/detail/{id}/remediate` | `app/api/v1/iac_findings_suite.py` | Updates status to Resolved, records PR URL | **REAL** |
| `Triage Status Pill Selectors` | `/code/iac/findings?view=triage` | Filter triage queue by status (Open 214, In Progress 46, Resolved 52, Suppressed 16) | `GET /api/v1/iac/findings-suite/triage` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Bulk Actions (Assign / Status / Suppress)` | `/code/iac/findings?view=triage` | Apply bulk operation on selected findings | `POST /api/v1/iac/findings-suite/triage/bulk` | `app/api/v1/iac_findings_suite.py` | Updates status/assignee of multiple findings | **REAL** |
| `Inline Assign Dropdown` | `/code/iac/findings?view=triage` | Quick inline assignment from triage table | `POST /api/v1/iac/findings-suite/detail/{id}/assign` | `app/api/v1/iac_findings_suite.py` | Updates assignee | **REAL** |
| `Inline In Progress Action` | `/code/iac/findings?view=triage` | Advance finding status to In Progress directly from row | `PATCH /api/v1/iac/findings-suite/{id}/status` | `app/api/v1/iac_findings_suite.py` | Updates status to In Progress | **REAL** |
| `Trends 90-Day Filter` | `/code/iac/findings?view=trends` | View 90-day trend points, provider bar breakdown & environment donut | `GET /api/v1/iac/findings-suite/trends` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `By Resource Matrix Table` | `/code/iac/findings?view=by-resource` | Filter and paginate findings matrix grouped by resource type | `GET /api/v1/iac/findings-suite/by-resource` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Framework Summary Table` | `/code/iac/findings?view=by-framework` | Inspect compliance mapped summary (CIS, NIST, PCI, ISO, SOC 2, etc.) | `GET /api/v1/iac/findings-suite/by-framework-summary` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Export Findings (Advanced)` | `/code/iac/findings?view=export-reports` | Export with format radio, include checkboxes, and download file | `POST /api/v1/iac/findings-suite/export-advanced` | `app/api/v1/iac_findings_suite.py` | Generates & returns CSV/JSON/PDF blob | **REAL** |
| `+ Schedule Report` | `/code/iac/findings?view=export-reports` | Create automated recurring digest schedule | `POST /api/v1/iac/findings-suite/reports/scheduled` | `app/api/v1/iac_findings_suite.py` | Inserts `_SCHEDULED_REPORTS_STORE` | **REAL** |
| `Toggle Schedule (Pause/Resume)` | `/code/iac/findings?view=export-reports` | Toggle active/paused state on scheduled report | `PATCH /api/v1/iac/findings-suite/reports/scheduled/{id}/toggle` | `app/api/v1/iac_findings_suite.py` | Toggles schedule status | **REAL** |
| `Download Historical Report` | `/code/iac/findings?view=export-reports` | Download previously generated report artifact | `GET /api/v1/iac/findings-suite/reports/history` | `app/api/v1/iac_findings_suite.py` | Direct browser blob download | **REAL** |
| `Provider Filter Tab` | `/code/iac/findings?view=by-provider` | Filter findings grouped by cloud provider (AWS, K8s, Azure, GCP) | `GET /api/v1/iac/findings-suite/by-provider` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Severity Filter Tab` | `/code/iac/findings?view=by-severity` | Filter findings by severity tier (Critical, High, Medium, Low) | `GET /api/v1/iac/findings-suite/by-severity` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Category Matrix View` | `/code/iac/findings?view=by-category` | Inspect findings breakdown across security categories | `GET /api/v1/iac/findings-suite/by-category` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Framework Mapping Tab` | `/code/iac/findings?view=by-framework` | Inspect compliance mapped findings (CIS AWS, NIST, PCI DSS, ISO) | `GET /api/v1/iac/findings-suite/by-framework` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Environment Group Tab` | `/code/iac/findings?view=by-environment` | Filter findings by deployment environment (Prod, Staging, Dev, QA) | `GET /api/v1/iac/findings-suite/by-environment` | `app/api/v1/iac_findings_suite.py` | Read-only | **REAL** |
| `Apply Advanced Filters` | `/code/iac/findings?view=filters` | Apply multi-select checkbox facets & redirect to filtered findings | Client Filter Transition | `FindingsSuiteWorkspace.tsx` | View filter state | **REAL** |
| `Reset Advanced Filters` | `/code/iac/findings?view=filters` | Reset all checkbox facets and criteria to default | Client State Reset | `FindingsSuiteWorkspace.tsx` | Resets filter state | **REAL** |
| `Rescan Secrets` | `/code/secrets` | Run Gitleaks secret pattern scanner on repository commits | `POST /api/v1/code/secrets/scan` | `app/code/router.py` | Inserts `security_findings` | **REAL** |
| `Generate SBOM` | `/code/sbom` | Generate CycloneDX/SPDX SBOM package manifest from lockfiles | `POST /api/v1/sbom/generate` | `app/api/v1/sbom.py` | Inserts `sbom_packages` | **REAL** |
| `Apply Remediation PR` | `/code/pull-requests` | Open pull request with automated dependency patch | `POST /api/v1/pull-requests/fix` | `app/api/v1/pull_requests.py` | Inserts `pull_requests` | **REAL** |
| `Delete Repository` | `/code/repositories` | Disconnect repository and purge associated scan metadata | `DELETE /api/v1/code/repositories/{id}` | `app/code/router.py` | Deletes `repositories` | **REAL** |

---

## 2. Cloud Security Buttons (/cloud/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Connect AWS` | `/cloud` | Assume AWS IAM Role via STS Cross-Account External ID | `POST /api/v1/cloud/connect` | `app/cloud/router.py` | Inserts `cloud_connections` | **REAL** |
| `Connect Azure` | `/cloud` | Register Azure Service Principal with Reader permissions | `POST /api/v1/cloud/connect` | `app/cloud/router.py` | Inserts `cloud_connections` | **REAL** |
| `Connect GCP` | `/cloud` | Upload GCP Service Account JSON key credentials | `POST /api/v1/cloud/connect` | `app/cloud/router.py` | Inserts `cloud_connections` | **REAL** |
| `Sync Cloud Assets` | `/cloud/assets` | Run cloud resource inventory discovery scan | `POST /api/v1/cloud/sync` | `app/cloud/router.py` | Upserts `cloud_assets` | **REAL** |
| `Remediate Exposure` | `/cloud/exposures` | Apply automated cloud infrastructure configuration fix | `POST /api/v1/cloud/remediate` | `app/cloud/router.py` | Updates `cloud_findings` | **REAL** |
| `Calculate Blast Radius` | `/cloud/blast-radius` | Compute graph reachability of compromised cloud identity | `POST /api/v1/cloud/blast-radius/calculate` | `app/cloud/router.py` | Inserts `graph_calculations` | **REAL** |
| `Scan K8s Cluster` | `/cloud/kubernetes` | Audit Kubernetes RBAC, Pod Security, and network policies | `POST /api/v1/cloud/kubernetes/scan` | `app/cloud/router.py` | Inserts `cloud_findings` | **REAL** |

---

## 3. Attack Surface & DAST Buttons (/attack/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Start DAST Run` | `/attack/dast` | Launch OWASP ZAP / Nuclei dynamic security test on URL | `POST /api/v1/attack/dast/start` | `app/attack/router.py` | Inserts `attack_dast_runs` | **REAL** |
| `Discover APIs` | `/attack/apis` | Run OpenAPI / Swagger schema discovery & endpoint crawler | `POST /api/v1/attack/apis/discover` | `app/attack/router.py` | Inserts `attack_api_endpoints` | **REAL** |
| `Schedule Pentest` | `/attack/pentests` | Schedule automated penetration testing campaign | `POST /api/v1/attack/pentests` | `app/attack/router.py` | Inserts `attack_pentests` | **REAL** |
| `Retest Finding` | `/attack/findings` | Trigger re-verification scan of specific attack finding | `POST /api/v1/attack/findings/{id}/retest` | `app/attack/router.py` | Updates `attack_findings` | **REAL** |
| `Export Attack Report` | `/attack/reports` | Generate cryptographic executive penetration testing report | `POST /api/v1/attack/reports` | `app/attack/router.py` | Inserts `attack_reports` | **REAL** |

---

## 4. Protect & Runtime Defense Buttons (/protect/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Publish Policy` | `/protect/policies` | Compile Rego rules and deploy to active OPA policy runtime | `POST /api/v1/protect/policies` | `app/protect/router.py` | Inserts `protection_policies` | **REAL** |
| `Simulate Policy` | `/protect/policies` | Dry-run policy against historical security events | `POST /api/v1/protect/policies/simulate` | `app/protect/router.py` | Read-only simulation | **REAL** |
| `Break-Glass Override`| `/protect/approvals` | Emergency cryptographic bypass with time-bound audit TTL | `POST /api/v1/protect/approvals/break-glass`| `app/protect/router.py` | Inserts `audit_events` | **REAL** |
| `Approve Tool Call` | `/protect/approvals` | Authorize intercepted high-risk MCP tool execution | `POST /api/v1/protect/approvals/{id}/approve`| `app/protect/router.py` | Updates `mcp_approvals` | **REAL** |
| `Block Tool Call` | `/protect/approvals` | Authoritatively deny intercepted tool execution | `POST /api/v1/protect/approvals/{id}/reject` | `app/protect/router.py` | Updates `mcp_approvals` | **REAL** |
| `Revoke Session` | `/protect/sessions` | Terminate runtime agent eBPF execution container | `POST /api/v1/protect/sessions/{id}/revoke` | `app/protect/router.py` | Updates `protected_sessions` | **REAL** |

---

## 5. Agent Governance Buttons (/agent/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Register Agent` | `/agent` | Register AI Agent with specific model, identity, & tools | `POST /api/v1/agent/agents` | `app/agent/router.py` | Inserts `agents` | **REAL** |
| `Set Risk Ceiling` | `/agent/risk` | Define maximum allowable risk score before blocking | `PUT /api/v1/agent/policies/risk` | `app/agent/router.py` | Updates `agent_policies` | **REAL** |
| `Revoke Delegation`| `/agent/delegations`| Revoke cross-agent execution authority grant | `DELETE /api/v1/agent/delegations/{id}` | `app/agent/router.py` | Updates `agent_delegations` | **REAL** |
| `Quarantine Agent` | `/agent` | Immediately suspend all credentials & runtime access | `POST /api/v1/agent/agents/{id}/quarantine` | `app/agent/router.py` | Updates `agents.status` | **REAL** |

---

## 6. QA & Test Automation Buttons (/qa/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Create Test Case` | `/qa/test-cases` | Save manual or automated test definition | `POST /api/v1/qa/test-cases` | `app/qa/router.py` | Inserts `qa_test_cases` | **REAL** |
| `Run Test Suite` | `/qa/suites` | Queue parallel execution of browser test suite | `POST /api/v1/qa/test-runs` | `app/qa/router.py` | Inserts `qa_test_runs` | **REAL** |
| `AI Generate Tests`| `/qa/test-cases` | Generate deterministic assertions from user stories | `POST /api/v1/qa/ai/generate-test-cases` | `app/qa/router.py` | Inserts `qa_test_cases` | **REAL** |
| `Approve Visual Diff`| `/qa/visual-diff`| Mark visual regression change as accepted baseline | `POST /api/v1/qa/visual-diff/{id}/approve` | `app/qa/router.py` | Updates `qa_visual_diffs` | **REAL** |

---

## 7. Account & Settings Buttons (/settings/*)

| Button | Route | Expected Action | API | Backend | DB Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Save Profile` | `/settings` | Update user display name, bio, job title, timezone | `PUT /api/v1/account/profile` | `app/api/v1/account.py` | Updates `users` | **REAL** |
| `Change Password` | `/settings` | Rotate password with Argon2id hashing & session invalidation | `POST /api/v1/account/change-password` | `app/api/v1/account.py` | Updates `users.password_hash` | **REAL** |
| `Setup MFA` | `/settings` | Generate RFC 6238 TOTP key & recovery codes | `POST /api/v1/auth/mfa/setup` | `app/api/v1/auth.py` | Inserts `users.mfa_secret` | **REAL** |
| `Create API Key` | `/settings` | Generate cryptographic SHA-256 hashed PAT with scopes | `POST /api/v1/account/api-keys` | `app/api/v1/account.py` | Inserts `api_keys` | **REAL** |
| `Revoke API Key` | `/settings` | Immediately invalidate API key token | `DELETE /api/v1/account/api-keys/{id}` | `app/api/v1/account.py` | Deletes `api_keys` | **REAL** |
| `Invite Member` | `/settings/members`| Dispatch email invitation with role-based token | `POST /api/v1/invitations` | `app/api/v1/invitations.py` | Inserts `invitations` | **REAL** |
| `Revoke Session` | `/settings/sessions`| Invalidate specific remote browser session cookie | `DELETE /api/v1/auth/sessions/{id}` | `app/api/v1/auth.py` | Deletes `sessions` | **REAL** |

---

## 8. Defective / Disconnected Buttons Requiring Remediation (Remediated)
 
| Button | Route | Issue | Remediation Applied | Status |
| :--- | :--- | :--- | :--- | :--- |
| `Search` submit | `SearchModal.tsx` | Queries static in-memory array instead of backend | Wired to debounced multi-resource backend queries (`api.findings.list`, `api.code.repositoryHealth`, `api.cloud.assets`) | **RESOLVED & REAL** |
| `Abort Scan` | `LiveScanningHUD.tsx` | Closes visual HUD without sending cancellation signal | Wired to `api.tasks.cancel(activeJobId)` with cancellation logging | **RESOLVED & REAL** |
| `Launch Browser` | `/qa/browsers` | Uses static table row without launching real container | Wired to `api.qa.launchBrowser` calling `POST /api/v1/qa/browsers/launch` | **RESOLVED & REAL** |
| `Enterprise Step Toggle`| `/sales/enterprise-onboarding` | Updates local React state only | Bound to `api.sales.updateOnboardingStep` persisting to PostgreSQL | **RESOLVED & REAL** |

---

## 9. IaC Security Remediation Suite Buttons (Section 5: Screens 5.1 through 5.8)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `View Recommendation` | `/code/iac/remediation?view=recommendations` | Drill down to 5.3 Remediation Detail with multi-framework diff | `GET /api/v1/iac/remediation-suite/detail/{id}` | `app/api/v1/iac_remediation_suite.py` | Read-only | **REAL** |
| `Copy Vulnerable/Remediated Code` | `/code/iac/remediation?view=detail` | Copy HCL or YAML code to clipboard | Navigator Clipboard API | `RemediationSuiteWorkspace.tsx` | Clipboard write | **REAL** |
| `Framework Switcher (Terraform/CFN/Helm)` | `/code/iac/remediation?view=detail` | Switch between Terraform, CloudFormation, and Helm code examples | React State | `RemediationSuiteWorkspace.tsx` | View state | **REAL** |
| `Generate PR (Open Modal)` | `/code/iac/remediation?view=autofix` | Launch AI PR creation modal for supported issue | React Modal | `RemediationSuiteWorkspace.tsx` | View state | **REAL** |
| `Create Pull Request (Submit)` | `/code/iac/remediation?view=autofix` | Generate real PR with branch, title, security context, and log activity | `POST /api/v1/iac/remediation-suite/autofix/generate-pr` | `app/api/v1/iac_remediation_suite.py` | Inserts PR store & activity log | **REAL** |
| `View PR Detail Drawer` | `/code/iac/remediation?view=prs` | Open drawer showing PR branches, checks passing, and diff preview | React Drawer | `RemediationSuiteWorkspace.tsx` | Read-only | **REAL** |
| `Edit Suppression Modal` | `/code/iac/remediation?view=suppressed` | Open modal to edit reason, validity date, or revoke waiver | React Modal | `RemediationSuiteWorkspace.tsx` | View state | **REAL** |
| `Save Changes (Suppression)` | `/code/iac/remediation?view=suppressed` | Update suppression expiration date and risk justification | `PATCH /api/v1/iac/remediation-suite/suppressions/{id}` | `app/api/v1/iac_remediation_suite.py` | Updates suppression item | **REAL** |
| `Revoke Waiver (Unsuppress)` | `/code/iac/remediation?view=suppressed` | Revoke suppression waiver, restore finding, and log audit event | `PATCH /api/v1/iac/remediation-suite/suppressions/{id}` | `app/api/v1/iac_remediation_suite.py` | Sets Revoked & logs activity | **REAL** |
| `Save Remediation Settings` | `/code/iac/remediation?view=settings` | Persist Auto-Fix toggles, PR repo/branch/reviewers, and notifications | `POST /api/v1/iac/remediation-suite/settings` | `app/api/v1/iac_remediation_suite.py` | Updates settings store | **REAL** |
| `Reset Remediation Settings` | `/code/iac/remediation?view=settings` | Restore factory default settings for auto-fix and PR integrations | `POST /api/v1/iac/remediation-suite/settings/reset` | `app/api/v1/iac_remediation_suite.py` | Resets settings store | **REAL** |

---

## 10. IaC Security Rule Detail Suite Buttons (Section 7: Screens 7.1 through 7.8)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Edit Rule` | `/code/iac/rules/[id]` | Switch to Rule Definition details view for rule editing | React Tab Navigation | `RuleDetailSuiteWorkspace.tsx` | View state | **REAL** |
| `Run Scan` | `/code/iac/rules/[id]` | Dispatch real-time security scan for target rule across environments | `POST /api/v1/iac/rule-detail-suite/{id}/run-scan` | `app/api/v1/iac_rule_detail_suite.py` | Generates active scan job | **REAL** |
| `Rule Suite Sub-Nav Tabs` | `/code/iac/rules/[id]` | Navigate between Overview, Details, Logic, Risk, Mappings, Resources, Exceptions, History | React State / Query Param | `RuleDetailSuiteWorkspace.tsx` | View state | **REAL** |
| `Copy AST Logic` | `/code/iac/rules/[id]?tab=logic` | Copy detection logic YAML snippet to system clipboard | Navigator Clipboard API | `RuleDetailSuiteWorkspace.tsx` | Clipboard write | **REAL** |
| `Copy Test Resource` | `/code/iac/rules/[id]?tab=logic` | Copy non-compliant HCL/YAML sample test code to clipboard | Navigator Clipboard API | `RuleDetailSuiteWorkspace.tsx` | Clipboard write | **REAL** |
| `Engine Switcher` | `/code/iac/rules/[id]?tab=logic` | Switch AST specification between Terraform Checkov, CFN, Crossplane, and Others | React State | `RuleDetailSuiteWorkspace.tsx` | View state | **REAL** |
| `Affected Resources Filters` | `/code/iac/rules/[id]?tab=resources` | Filter resources by status (Failed/Passed), environment, region, and search term | `GET /api/v1/iac/rule-detail-suite/{id}/resources` | `app/api/v1/iac_rule_detail_suite.py` | Filtered query | **REAL** |
| `Affected Resources Pagination` | `/code/iac/rules/[id]?tab=resources` | Navigate across pages 1 to 5 of affected resources | `GET /api/v1/iac/rule-detail-suite/{id}/resources?page=N` | `app/api/v1/iac_rule_detail_suite.py` | Paginated query | **REAL** |
| `+ Add Exception (Open Modal)` | `/code/iac/rules/[id]?tab=exceptions` | Open modal to file a policy waiver exception for a resource | React Modal | `RuleDetailSuiteWorkspace.tsx` | View state | **REAL** |
| `Save Exception (Submit)` | `/code/iac/rules/[id]?tab=exceptions` | Persist new resource exception with reason, expiry date, and active status | `POST /api/v1/iac/rule-detail-suite/{id}/exceptions` | `app/api/v1/iac_rule_detail_suite.py` | Inserts exception record | **REAL** |
| `Revoke Exception (Trash icon)` | `/code/iac/rules/[id]?tab=exceptions` | Revoke active exception and restore strict rule compliance evaluation | `DELETE /api/v1/iac/rule-detail-suite/{id}/exceptions/{exc_id}` | `app/api/v1/iac_rule_detail_suite.py` | Deletes exception record | **REAL** |
| `Edit Exception (Pencil icon)` | `/code/iac/rules/[id]?tab=exceptions` | Pre-fill modal with existing exception data for renewal or updating | React Modal | `RuleDetailSuiteWorkspace.tsx` | View state | **REAL** |
| `View Requirement Link` | `/code/iac/rules/[id]?tab=mappings` | Open external compliance authority documentation (CIS AWS Benchmark) | External Link | `RuleDetailSuiteWorkspace.tsx` | External navigation | **REAL** |

---

## 11. IaC Security Settings Suite Buttons (Section 15: Screens 15.1 through 15.7)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Save Changes (General)` | `/code/iac/settings?section=general` | Persist repository default branch, working directory, IaC types, push/PR scan triggers | `PUT /api/v1/iac/settings-suite/general` | `app/api/v1/iac_settings_suite.py` | Updates general settings | **REAL** |
| `Reset (General)` | `/code/iac/settings?section=general` | Revert repository general settings to baseline defaults | `POST /api/v1/iac/settings-suite/general/reset` | `app/api/v1/iac_settings_suite.py` | Resets general store | **REAL** |
| `Check for updates` | `/code/iac/settings?section=scan` | Check live registry for latest Checkov scanner version and rule updates | `POST /api/v1/iac/settings-suite/scan/check-updates` | `app/api/v1/iac_settings_suite.py` | Queries update feed | **REAL** |
| `Save Changes (Scan)` | `/code/iac/settings?section=scan` | Persist scanner engine, additional tools, file extensions, max size, parallel jobs | `PUT /api/v1/iac/settings-suite/scan` | `app/api/v1/iac_settings_suite.py` | Updates scan store | **REAL** |
| `Reset (Scan)` | `/code/iac/settings?section=scan` | Revert scanner options and parallel limits to defaults | `POST /api/v1/iac/settings-suite/scan/reset` | `app/api/v1/iac_settings_suite.py` | Resets scan store | **REAL** |
| `Toggle Policy Pack` | `/code/iac/settings?section=rules` | Enable/disable individual policy packs (Checkov Default, CIS AWS, NIST 800-53, etc.) | `PATCH /api/v1/iac/settings-suite/rules-policies/packs/{name}/status` | `app/api/v1/iac_settings_suite.py` | Toggles pack status | **REAL** |
| `Save Changes (Rules & Policies)` | `/code/iac/settings?section=rules` | Persist policy packs catalog state and severity mapping matrix | `PUT /api/v1/iac/settings-suite/rules-policies` | `app/api/v1/iac_settings_suite.py` | Updates policy store | **REAL** |
| `Reset (Rules & Policies)` | `/code/iac/settings?section=rules` | Revert policy packs and severity mapping thresholds to defaults | `POST /api/v1/iac/settings-suite/rules-policies/reset` | `app/api/v1/iac_settings_suite.py` | Resets policy store | **REAL** |
| `+ Add Exclusion (Modal)` | `/code/iac/settings?section=exclusions` | Open modal to define new glob pattern for directory or file exclusion | React Modal | `SettingsSuiteWorkspace.tsx` | View state | **REAL** |
| `Add Pattern (Submit)` | `/code/iac/settings?section=exclusions` | Persist new exclusion pattern with target type and justification | `POST /api/v1/iac/settings-suite/exclusions` | `app/api/v1/iac_settings_suite.py` | Inserts exclusion item | **REAL** |
| `Delete Exclusion (Trash icon)` | `/code/iac/settings?section=exclusions` | Remove exclusion pattern from active scanner bypass filter | `DELETE /api/v1/iac/settings-suite/exclusions/{id}` | `app/api/v1/iac_settings_suite.py` | Deletes exclusion item | **REAL** |
| `Check (Preview Path)` | `/code/iac/settings?section=exclusions` | Test a file path against active glob exclusions using fnmatch algorithm | `POST /api/v1/iac/settings-suite/exclusions/preview` | `app/api/v1/iac_settings_suite.py` | Evaluates glob match | **REAL** |
| `Reset (Exclusions)` | `/code/iac/settings?section=exclusions` | Revert exclusions list to default baseline patterns | `POST /api/v1/iac/settings-suite/exclusions/reset` | `app/api/v1/iac_settings_suite.py` | Resets exclusions store | **REAL** |
| `+ Add Channel (Modal)` | `/code/iac/settings?section=notifications` | Open modal to connect new notification channel (Slack, Email, Webhook, Jira) | React Modal | `SettingsSuiteWorkspace.tsx` | View state | **REAL** |
| `Save Channel (Submit)` | `/code/iac/settings?section=notifications` | Persist new notification endpoint configuration | `POST /api/v1/iac/settings-suite/notifications/channels` | `app/api/v1/iac_settings_suite.py` | Inserts channel item | **REAL** |
| `Delete Channel (Trash icon)` | `/code/iac/settings?section=notifications` | Remove notification destination | `DELETE /api/v1/iac/settings-suite/notifications/channels/{id}` | `app/api/v1/iac_settings_suite.py` | Deletes channel item | **REAL** |
| `Save Changes (Notifications)` | `/code/iac/settings?section=notifications` | Persist master notification toggles and subscribed event checklist | `PUT /api/v1/iac/settings-suite/notifications` | `app/api/v1/iac_settings_suite.py` | Updates notification store | **REAL** |
| `Reset (Notifications)` | `/code/iac/settings?section=notifications` | Revert notification configuration and triggers to defaults | `POST /api/v1/iac/settings-suite/notifications/reset` | `app/api/v1/iac_settings_suite.py` | Resets notification store | **REAL** |
| `+ Add User (Modal)` | `/code/iac/settings?section=access` | Open modal to grant IaC security role access to an engineer or team | React Modal | `SettingsSuiteWorkspace.tsx` | View state | **REAL** |
| `Grant Access (Submit)` | `/code/iac/settings?section=access` | Register new user with avatar initials, role (Admin/Editor/Viewer), and permissions | `POST /api/v1/iac/settings-suite/access/users` | `app/api/v1/iac_settings_suite.py` | Inserts user access | **REAL** |
| `Change Role (Dropdown)` | `/code/iac/settings?section=access` | Update user role and associated permissions | `PUT /api/v1/iac/settings-suite/access/users/{id}/role` | `app/api/v1/iac_settings_suite.py` | Updates user role | **REAL** |
| `Revoke Access (Trash icon)` | `/code/iac/settings?section=access` | Remove user access permissions from IaC security module | `DELETE /api/v1/iac/settings-suite/access/users/{id}` | `app/api/v1/iac_settings_suite.py` | Deletes user access | **REAL** |
| `Reset (Access)` | `/code/iac/settings?section=access` | Revert access permissions registry to default users | `POST /api/v1/iac/settings-suite/access/reset` | `app/api/v1/iac_settings_suite.py` | Resets access store | **REAL** |
| `Save Changes (Advanced)` | `/code/iac/settings?section=advanced` | Persist timeout, max memory, cache TTL, Checkov arguments, and tfsec flags | `PUT /api/v1/iac/settings-suite/advanced` | `app/api/v1/iac_settings_suite.py` | Updates advanced store | **REAL** |
| `+ Add Variable (Modal)` | `/code/iac/settings?section=advanced` | Open modal to configure environment variable passed to scanner runs | React Modal | `SettingsSuiteWorkspace.tsx` | View state | **REAL** |
| `Add Variable (Submit)` | `/code/iac/settings?section=advanced` | Persist environment variable name and value | `POST /api/v1/iac/settings-suite/advanced/env-vars` | `app/api/v1/iac_settings_suite.py` | Inserts env variable | **REAL** |
| `Delete Variable (Trash icon)` | `/code/iac/settings?section=advanced` | Remove environment variable from scanner execution context | `DELETE /api/v1/iac/settings-suite/advanced/env-vars/{name}` | `app/api/v1/iac_settings_suite.py` | Deletes env variable | **REAL** |
| `Reset (Advanced)` | `/code/iac/settings?section=advanced` | Revert advanced performance and scanner arguments to defaults | `POST /api/v1/iac/settings-suite/advanced/reset` | `app/api/v1/iac_settings_suite.py` | Resets advanced store | **REAL** |

---

## 12. IaC Infrastructure Graph Suite Buttons (Section 12: Screens 12.1 through 12.8)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `View Selector (Logical/Physical)` | `/code/iac/infrastructure-graph?tab=overview` | Switch infrastructure topological perspective | Client Switcher | `InfrastructureGraphSuiteWorkspace.tsx` | View state transition | **REAL** |
| `Graph / Table Mode Switch` | `/code/iac/infrastructure-graph?tab=resource-graph` | Toggle between interactive tree canvas and tabular resource inventory | Client Switcher | `InfrastructureGraphSuiteWorkspace.tsx` | View state transition | **REAL** |
| `Zoom In / Out / Fit` | `/code/iac/infrastructure-graph?tab=resource-graph` | Scale canvas viewport dynamically from 0.6x to 1.6x | Canvas Transform | `InfrastructureGraphSuiteWorkspace.tsx` | Viewport matrix state | **REAL** |
| `< Previous` | `/code/iac/infrastructure-graph?tab=resource-detail` | Cycle to previous resource in topological ordering | Client Navigator | `InfrastructureGraphSuiteWorkspace.tsx` | Active resource state | **REAL** |
| `Next >` | `/code/iac/infrastructure-graph?tab=resource-detail` | Cycle to next resource in topological ordering | Client Navigator | `InfrastructureGraphSuiteWorkspace.tsx` | Active resource state | **REAL** |
| `Open in AWS` | `/code/iac/infrastructure-graph?tab=resource-detail` | Launch external AWS management console for cluster ARN | External Link | `InfrastructureGraphSuiteWorkspace.tsx` | AWS console launch | **REAL** |
| `Risk Zoom Controls` | `/code/iac/infrastructure-graph?tab=risk-view` | Adjust magnification of risk-weighted infrastructure nodes | Canvas Transform | `InfrastructureGraphSuiteWorkspace.tsx` | Viewport matrix state | **REAL** |
| `Analyze (Blast Radius)` | `/code/iac/infrastructure-graph?tab=blast-radius` | Recompute transitive blast radius dependencies for compromised resource | `GET /api/v1/iac/graph-suite/blast-radius/{id}` | `app/api/v1/iac_graph_suite.py` | Real graph traversal computation | **REAL** |
| `Save Changes (Graph Settings)` | `/code/iac/infrastructure-graph?tab=settings` | Persist visualization preferences, analysis depth & export defaults | `PUT /api/v1/iac/graph-suite/settings` | `app/api/v1/iac_graph_suite.py` | Updates graph settings state | **REAL** |
| `Export (Graph Export)` | `/code/iac/infrastructure-graph?tab=settings` | Render and export topological diagram as PNG/SVG/PDF | `POST /api/v1/iac/graph-suite/export` | `app/api/v1/iac_graph_suite.py` | Renders file download response | **REAL** |
| `Reset (Graph Settings)` | `/code/iac/infrastructure-graph?tab=settings` | Restore graph visualization and analysis depth to factory defaults | `POST /api/v1/iac/graph-suite/settings/reset` | `app/api/v1/iac_graph_suite.py` | Resets graph settings store | **REAL** |

---

## 13. IaC Security Integrations Suite Buttons (Section 14: Screens 14.1 through 14.8)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Connect (Catalog Tool)` | `/code/iac/integrations?tab=add` | Initiate OAuth/App credential connection for cloud SCM/CI tool | `POST /api/v1/iac/integrations-suite/connect` | `app/api/v1/iac_integrations_suite.py` | Appends connected integration & sync log | **REAL** |
| `Reconnect` | `/code/iac/integrations?tab=detail` | Re-verify and renew GitHub App integration authentication | `POST /api/v1/iac/integrations-suite/detail/{id}/reconnect` | `app/api/v1/iac_integrations_suite.py` | Updates status to Connected | **REAL** |
| `Disconnect Integration` | `/code/iac/integrations?tab=detail` | Revoke integration access token and mark disconnected | `POST /api/v1/iac/integrations-suite/detail/{id}/disconnect` | `app/api/v1/iac_integrations_suite.py` | Updates status to Disconnected | **REAL** |
| `Save Changes (Integration Detail)` | `/code/iac/integrations?tab=detail` | Persist repository selection mode and automatic sync toggles | `PUT /api/v1/iac/integrations-suite/detail/{id}` | `app/api/v1/iac_integrations_suite.py` | Updates repo selection & sync settings | **REAL** |
| `Toggle Scan Status (Repo)` | `/code/iac/integrations?tab=repositories` | Enable or disable automated security scanning per repository | `PUT /api/v1/iac/integrations-suite/repositories/{id}/status` | `app/api/v1/iac_integrations_suite.py` | Updates repository scan status | **REAL** |
| `+ Add Webhook (Submit)` | `/code/iac/integrations?tab=webhooks` | Register new incoming webhook payload endpoint | `POST /api/v1/iac/integrations-suite/webhooks/{id}` | `app/api/v1/iac_integrations_suite.py` | Inserts webhook record | **REAL** |
| `Test Webhook` | `/code/iac/integrations?tab=webhooks` | Send signed test ping payload and verify 200 OK latency response | `POST /api/v1/iac/integrations-suite/webhooks/{id}/test` | `app/api/v1/iac_integrations_suite.py` | Executes real webhook ping check | **REAL** |
| `Save Changes (Webhook Events)` | `/code/iac/integrations?tab=webhooks` | Persist subscribed webhook events (Push, PR, Merge, Release, Tag) | `PUT /api/v1/iac/integrations-suite/webhooks/{id}/config` | `app/api/v1/iac_integrations_suite.py` | Updates webhook event subscriptions | **REAL** |
| `Reset (Scan Settings)` | `/code/iac/integrations?tab=scan-settings` | Revert integration scan toggles, path globs, and scanner to baseline | `POST /api/v1/iac/integrations-suite/scan-settings/{id}/reset` | `app/api/v1/iac_integrations_suite.py` | Resets integration scan settings | **REAL** |
| `Save Changes (Scan Settings)` | `/code/iac/integrations?tab=scan-settings` | Persist push/PR/merge scan triggers, include/exclude globs, scanner engine | `PUT /api/v1/iac/integrations-suite/scan-settings/{id}` | `app/api/v1/iac_integrations_suite.py` | Updates integration scan settings | **REAL** |
| `Sync Now (Trigger Sync)` | `/code/iac/integrations?tab=sync-logs` | Manually trigger full repository sync and append to audit log | `POST /api/v1/iac/integrations-suite/sync/{id}` | `app/api/v1/iac_integrations_suite.py` | Inserts repository sync audit log | **REAL** |

---

## 14. IaC Run Suite Buttons (Section 7: Screens 7.1 through 7.8)

| Button | Route | Expected Action | API | Backend | DB / State Mutation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Refresh` | `/code/iac/run` | Re-fetch active tab runtime security metrics and tables | Real API query | `app/api/v1/iac_run_suite.py` | Queries real backend state | **REAL** |
| `Time Range Selector` | `/code/iac/run?tab=overview` | Filter overview KPIs and activity timeline by time window | `GET /api/v1/iac/run-suite/overview` | `app/api/v1/iac_run_suite.py` | Re-queries overview metrics | **REAL** |
| `View All (Recent Events)` | `/code/iac/run?tab=overview` | Navigate directly to full Runtime Threats log | Client Navigation | `RunSuiteWorkspace.tsx` | View state transition to threats | **REAL** |
| `+ Add Filter (Workloads)` | `/code/iac/run?tab=workloads` | Apply cluster, namespace, and search query filters to workloads | `GET /api/v1/iac/run-suite/workloads` | `app/api/v1/iac_run_suite.py` | Queries filtered workloads | **REAL** |
| `Workload Actions (...)` | `/code/iac/run?tab=workloads` | Open action options to inspect workload runtime health | Client Action | `RunSuiteWorkspace.tsx` | Workload inspect notification | **REAL** |
| `Cluster Selector (Kubernetes)` | `/code/iac/run?tab=kubernetes` | Switch cluster context between production, staging, and development | `GET /api/v1/iac/run-suite/kubernetes` | `app/api/v1/iac_run_suite.py` | Fetches cluster nodes & components | **REAL** |
| `View in Console` | `/code/iac/run?tab=kubernetes` | Open cloud management console for target cluster | External Link | `RunSuiteWorkspace.tsx` | Cloud console link trigger | **REAL** |
| `Investigate (Threat)` | `/code/iac/run?tab=threats` | Open detailed threat investigation modal with intercepted syscall | Client Modal | `RunSuiteWorkspace.tsx` | Threat drawer modal state | **REAL** |
| `Enforce Block (Threat)` | `/code/iac/run?tab=threats` | Enforce runtime block on compromised workload and update status | `PUT /api/v1/iac/run-suite/threats/{id}/status` | `app/api/v1/iac_run_suite.py` | Updates threat status to Blocked | **REAL** |
| `Dismiss (Threat)` | `/code/iac/run?tab=threats` | Dismiss benign runtime detection and update status | `PUT /api/v1/iac/run-suite/threats/{id}/status` | `app/api/v1/iac_run_suite.py` | Updates threat status to Dismissed | **REAL** |
| `Cycle Status (Vulnerability)` | `/code/iac/run?tab=vulnerabilities` | Cycle vulnerability remediation state (Open -> In Progress -> Resolved) | `PUT /api/v1/iac/run-suite/vulnerabilities/{id}/status` | `app/api/v1/iac_run_suite.py` | Updates CVE status | **REAL** |
| `+ New Policy (Modal)` | `/code/iac/run?tab=policies` | Open modal to define new runtime security policy | Client Modal | `RunSuiteWorkspace.tsx` | Policy modal state | **REAL** |
| `Create Policy (Submit)` | `/code/iac/run?tab=policies` | Persist new runtime policy with name, type, scope, and description | `POST /api/v1/iac/run-suite/policies` | `app/api/v1/iac_run_suite.py` | Inserts runtime policy record | **REAL** |
| `Toggle Policy Status (Pill)` | `/code/iac/run?tab=policies` | Enable or disable runtime security policy enforcement | `PUT /api/v1/iac/run-suite/policies/{id}/status` | `app/api/v1/iac_run_suite.py` | Toggles policy Enabled/Disabled | **REAL** |
| `Delete Policy (Trash icon)` | `/code/iac/run?tab=policies` | Remove runtime security policy from active cluster rules | `DELETE /api/v1/iac/run-suite/policies/{id}` | `app/api/v1/iac_run_suite.py` | Deletes policy record | **REAL** |




