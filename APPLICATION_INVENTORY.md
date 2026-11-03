# APPLICATION INVENTORY -- PRODUCTION AUDIT AND STATUS MATRIX

> Comprehensive inventory of all 268 route pages in the repository.
> Every route was audited against actual source code, API bindings, FastAPI routers, and PostgreSQL/SQLAlchemy models.

## Summary Metrics

- **Total Routes Audited:** 271
- **REAL (Fully Connected to API and Backend):** 206
- **PARTIALLY REAL (Connected but Contains Fallbacks/Mocks):** 0
- **HARDCODED / MOCKED:** 0
- **UI ONLY (Visual Template / Marketing / Static Alias):** 65

---

## 1. Code Security (SAST, Secrets, Dependencies, SBOM, IaC, Repositories, PRs)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Code Security Overview | `/code` | YES | YES | YES | YES | REAL | REAL |
| Ai security | `/code/ai-security` | YES | YES | YES | NO | NO | UI ONLY |
| Autonomous Code Fixes | `/code/autofix` | YES | YES | YES | YES | REAL | REAL |
| CI/CD Pipeline Security | `/code/ci-cd` | YES | YES | YES | NO | NO | UI ONLY |
| Configuration | `/code/configuration` | YES | YES | YES | YES | REAL | REAL |
| Container Security | `/code/container-security` | YES | YES | YES | YES | REAL | REAL |
| Dependency Vulnerabilities | `/code/dependencies` | YES | YES | YES | YES | REAL | REAL |
| Security and Compliance Evidence | `/code/evidence` | YES | YES | YES | YES | REAL | REAL |
| Security Findings | `/code/findings` | YES | YES | YES | YES | REAL | REAL |
| Findings Detail ([findingId]) | `/code/findings/[findingId]` | YES | YES | YES | YES | REAL | REAL |
| Infrastructure as Code Security | `/code/iac` | YES | YES | YES | YES | REAL | REAL |
| IaC Security Findings Suite (Screens 3.1–3.8 & 2.1–2.8) | `/code/iac/findings` | YES | YES | YES | YES | REAL | REAL |
| IaC Security Overview Suite | `/code/iac/overview` | YES | YES | YES | YES | REAL | REAL |
| IaC Configuration Analysis | `/code/iac/configuration-analysis` | YES | YES | YES | YES | REAL | REAL |
| IaC Policies & Quality Gates | `/code/iac/policies` | YES | YES | YES | YES | REAL | REAL |
| IaC Quality Gates Enforcement | `/code/iac/quality-gates` | YES | YES | YES | YES | REAL | REAL |
| IaC Scans Suite (Screens 8.1–8.8) | `/code/iac/scans` | YES | YES | YES | YES | REAL | REAL |
| IaC Scan Detail ([id]) | `/code/iac/scans/[id]` | YES | YES | YES | YES | REAL | REAL |
| IaC Compliance & Benchmarks Suite (Screens 11.1–11.8) | `/code/iac/compliance` | YES | YES | YES | YES | REAL | REAL |
| IaC Drift Detection Suite (Screens 10.1–10.8) | `/code/iac/drift` | YES | YES | YES | YES | REAL | REAL |
| IaC Remediation Suite (Screens 5.1–5.8) | `/code/iac/remediation` | YES | YES | YES | YES | REAL | REAL |
| IaC Rules Catalog & Packs | `/code/iac/rules` | YES | YES | YES | YES | REAL | REAL |
| IaC Rule Detail & Config (Screens 7.1–7.8) | `/code/iac/rules/[id]` | YES | YES | YES | YES | REAL | REAL |
| IaC Infrastructure Graph Suite (Screens 12.1–12.8) | `/code/iac/infrastructure-graph` | YES | YES | YES | YES | REAL | REAL |
| IaC Integrations Suite (Screens 14.1–14.8) | `/code/iac/integrations` | YES | YES | YES | YES | REAL | REAL |
| IaC Security Run Suite (Screens 7.1–7.8) | `/code/iac/run` | YES | YES | YES | YES | REAL | REAL |
| IaC Settings Suite (Screens 15.1–15.7) | `/code/iac/settings` | YES | YES | YES | YES | REAL | REAL |
| Iac security | `/code/iac-security` | YES | YES | YES | NO | NO | UI ONLY |
| Security Scan Jobs | `/code/jobs` | YES | YES | YES | YES | REAL | REAL |
| Security Posture Overview | `/code/overview` | YES | YES | YES | YES | REAL | REAL |
| Categories | `/code/overview/categories` | YES | YES | YES | YES | REAL | REAL |
| Recent findings | `/code/overview/recent-findings` | YES | YES | YES | YES | REAL | REAL |
| Scan status | `/code/overview/scan-status` | YES | YES | YES | YES | REAL | REAL |
| Severity | `/code/overview/severity` | YES | YES | YES | YES | REAL | REAL |
| Trends | `/code/overview/trends` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/code/policies` | YES | YES | YES | NO | NO | UI ONLY |
| Pr reviews | `/code/pr-reviews` | YES | YES | YES | NO | NO | UI ONLY |
| Pull Requests | `/code/pull-requests` | YES | YES | YES | YES | REAL | REAL |
| Pull requests Detail ([prId]) | `/code/pull-requests/[prId]` | YES | YES | YES | NO | NO | UI ONLY |
| Remediation and Fixes | `/code/remediation` | YES | YES | YES | YES | REAL | REAL |
| Repositories | `/code/repositories` | YES | YES | YES | YES | REAL | REAL |
| Repositories Detail ([repositoryId]) | `/code/repositories/[repositoryId]` | YES | YES | YES | YES | REAL | REAL |
| SAST Static Analysis | `/code/sast` | YES | YES | YES | YES | REAL | REAL |
| Security Hotspots | `/code/sast/hotspots` | YES | YES | YES | NO | NO | UI ONLY |
| Hotspots Detail ([id]) | `/code/sast/hotspots/[id]` | YES | YES | YES | NO | NO | UI ONLY |
| History | `/code/sast/hotspots/[id]/history` | YES | YES | YES | NO | NO | UI ONLY |
| List | `/code/sast/hotspots/list` | YES | YES | YES | NO | NO | UI ONLY |
| Third-Party Integrations | `/code/sast/integrations` | YES | YES | YES | NO | NO | UI ONLY |
| Api | `/code/sast/integrations/api` | YES | YES | YES | NO | NO | UI ONLY |
| Bitbucket | `/code/sast/integrations/bitbucket` | YES | YES | YES | NO | NO | UI ONLY |
| CI/CD Pipeline Security | `/code/sast/integrations/ci-cd` | YES | YES | YES | NO | NO | UI ONLY |
| Github | `/code/sast/integrations/github` | YES | YES | YES | NO | NO | UI ONLY |
| Gitlab | `/code/sast/integrations/gitlab` | YES | YES | YES | NO | NO | UI ONLY |
| Webhooks | `/code/sast/integrations/webhooks` | YES | YES | YES | NO | NO | UI ONLY |
| SBOM Software Bill of Materials | `/code/sbom` | YES | YES | YES | YES | REAL | REAL |
| Secrets Detection and Inventory | `/code/secrets` | YES | YES | YES | YES | REAL | REAL |
| Detail | `/code/secrets/detail` | YES | YES | YES | NO | NO | UI ONLY |
| Detail Detail ([id]) | `/code/secrets/detail/[id]` | YES | YES | YES | NO | NO | UI ONLY |
| Detections | `/code/secrets/detections` | YES | YES | YES | YES | REAL | REAL |
| Detections Detail ([id]) | `/code/secrets/detections/[id]` | YES | YES | YES | YES | REAL | REAL |
| Third-Party Integrations | `/code/secrets/integrations` | YES | YES | YES | YES | REAL | REAL |
| Inventory | `/code/secrets/inventory` | YES | YES | YES | YES | REAL | REAL |
| Inventory Detail ([id]) | `/code/secrets/inventory/[id]` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/code/secrets/policies` | YES | YES | YES | YES | REAL | REAL |
| Remediation and Fixes | `/code/secrets/remediation` | YES | YES | YES | YES | REAL | REAL |
| Repositories | `/code/secrets/repositories` | YES | YES | YES | YES | REAL | REAL |
| Scans | `/code/secrets/scans` | YES | YES | YES | YES | REAL | REAL |
| Scans Detail ([id]) | `/code/secrets/scans/[id]` | YES | YES | YES | YES | REAL | REAL |
| Detail | `/code/secrets/scans/detail` | YES | YES | YES | NO | NO | UI ONLY |
| Unified User and Org Settings | `/code/settings` | YES | YES | YES | YES | REAL | REAL |
| Compliance Frameworks | `/code/settings/compliance` | YES | YES | YES | NO | NO | UI ONLY |
| Third-Party Integrations | `/code/settings/integrations` | YES | YES | YES | NO | NO | UI ONLY |
| Security and OPA Policies | `/code/settings/policies` | YES | YES | YES | YES | REAL | REAL |
| Supply Chain Security | `/code/supply-chain` | YES | YES | YES | NO | NO | UI ONLY |

## 2. Cloud Security (AWS, Azure, GCP, Kubernetes, Assets, Blast Radius)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Cloud Security Overview | `/cloud` | YES | YES | YES | YES | REAL | REAL |
| Assets | `/cloud/assets` | YES | YES | YES | YES | REAL | REAL |
| Assets Detail ([assetId]) | `/cloud/assets/[assetId]` | YES | YES | YES | YES | REAL | REAL |
| Attack paths | `/cloud/attack-paths` | YES | YES | YES | YES | REAL | REAL |
| Aws | `/cloud/aws` | YES | YES | YES | YES | REAL | REAL |
| Azure | `/cloud/azure` | YES | YES | YES | YES | REAL | REAL |
| Blast radius | `/cloud/blast-radius` | YES | YES | YES | YES | REAL | REAL |
| Compliance Frameworks | `/cloud/compliance` | YES | YES | YES | YES | REAL | REAL |
| Databases | `/cloud/databases` | YES | YES | YES | YES | REAL | REAL |
| Docker | `/cloud/docker` | YES | YES | YES | YES | REAL | REAL |
| Security and Compliance Evidence | `/cloud/evidence` | YES | YES | YES | YES | REAL | REAL |
| Exposures | `/cloud/exposures` | YES | YES | YES | YES | REAL | REAL |
| Security Findings | `/cloud/findings` | YES | YES | YES | YES | REAL | REAL |
| Findings Detail ([findingId]) | `/cloud/findings/[findingId]` | YES | YES | YES | YES | REAL | REAL |
| Gcp | `/cloud/gcp` | YES | YES | YES | YES | REAL | REAL |
| Infrastructure as Code Security | `/cloud/iac` | YES | YES | YES | YES | REAL | REAL |
| Iam | `/cloud/iam` | YES | YES | YES | YES | REAL | REAL |
| Kubernetes | `/cloud/kubernetes` | YES | YES | YES | YES | REAL | REAL |
| Network | `/cloud/network` | YES | YES | YES | YES | REAL | REAL |
| Remediation and Fixes | `/cloud/remediation` | YES | YES | YES | YES | REAL | REAL |
| Unified User and Org Settings | `/cloud/settings` | YES | YES | YES | YES | REAL | REAL |
| Storage | `/cloud/storage` | YES | YES | YES | YES | REAL | REAL |

## 3. Attack Surface and DAST (External Attack Surface, API Security, Pentests)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Attack Surface Overview | `/attack` | YES | YES | YES | YES | REAL | REAL |
| Api discovery | `/attack/api-discovery` | YES | YES | YES | YES | REAL | REAL |
| Apis | `/attack/apis` | YES | YES | YES | YES | REAL | REAL |
| Apis Detail ([apiId]) | `/attack/apis/[apiId]` | YES | YES | YES | YES | REAL | REAL |
| Campaigns | `/attack/campaigns` | YES | YES | YES | YES | REAL | REAL |
| Dast | `/attack/dast` | YES | YES | YES | YES | REAL | REAL |
| Security and Compliance Evidence | `/attack/evidence` | YES | YES | YES | YES | REAL | REAL |
| Exploits | `/attack/exploits` | YES | YES | YES | YES | REAL | REAL |
| Security Findings | `/attack/findings` | YES | YES | YES | YES | REAL | REAL |
| Findings Detail ([findingId]) | `/attack/findings/[findingId]` | YES | YES | YES | YES | REAL | REAL |
| Paths | `/attack/paths` | YES | YES | YES | YES | REAL | REAL |
| Pentests | `/attack/pentests` | YES | YES | YES | YES | REAL | REAL |
| Pentests Detail ([pentestId]) | `/attack/pentests/[pentestId]` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/attack/policies` | YES | YES | YES | YES | REAL | REAL |
| Reports | `/attack/reports` | YES | YES | YES | YES | REAL | REAL |
| Schedules | `/attack/schedules` | YES | YES | YES | YES | REAL | REAL |
| Unified User and Org Settings | `/attack/settings` | YES | YES | YES | NO | NO | UI ONLY |
| Surface | `/attack/surface` | YES | YES | YES | YES | REAL | REAL |
| Surface Detail ([assetId]) | `/attack/surface/[assetId]` | YES | YES | YES | YES | REAL | REAL |
| Targets | `/attack/targets` | YES | YES | YES | YES | REAL | REAL |
| Web apps | `/attack/web-apps` | YES | YES | YES | YES | REAL | REAL |

## 4. Protect and Runtime Defense (MCP Gateway, eBPF, Tool Controls, Approvals)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Runtime Protection Overview | `/protect` | YES | YES | YES | YES | REAL | REAL |
| Activity | `/protect/activity` | YES | YES | YES | YES | REAL | REAL |
| Agents | `/protect/agents` | YES | YES | YES | YES | REAL | REAL |
| Apis | `/protect/apis` | YES | YES | YES | YES | REAL | REAL |
| Approvals | `/protect/approvals` | YES | YES | YES | YES | REAL | REAL |
| Break glass | `/protect/break-glass` | YES | YES | YES | YES | REAL | REAL |
| Controls | `/protect/controls` | YES | YES | YES | YES | REAL | REAL |
| Coverage | `/protect/coverage` | YES | YES | YES | YES | REAL | REAL |
| Enforcement | `/protect/enforcement` | YES | YES | YES | YES | REAL | REAL |
| Enforcement Detail ([decisionId]) | `/protect/enforcement/[decisionId]` | YES | YES | YES | YES | REAL | REAL |
| Security and Compliance Evidence | `/protect/evidence` | YES | YES | YES | YES | REAL | REAL |
| Mcp | `/protect/mcp` | YES | YES | YES | YES | REAL | REAL |
| Network | `/protect/network` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/protect/policies` | YES | YES | YES | YES | REAL | REAL |
| Policies Detail ([policyId]) | `/protect/policies/[policyId]` | YES | YES | YES | YES | REAL | REAL |
| Runtime | `/protect/runtime` | YES | YES | YES | YES | REAL | REAL |
| Runtime Detail ([runtimeId]) | `/protect/runtime/[runtimeId]` | YES | YES | YES | YES | REAL | REAL |
| Active Sessions and Devices | `/protect/sessions` | YES | YES | YES | YES | REAL | REAL |
| Unified User and Org Settings | `/protect/settings` | YES | YES | YES | NO | NO | UI ONLY |
| Threats | `/protect/threats` | YES | YES | YES | YES | REAL | REAL |

## 5. Agent Security and Governance (AI Agent Registry, Delegations, Risk, Sessions)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Agent Governance Overview | `/agent` | YES | YES | YES | YES | REAL | REAL |
| Actions | `/agent/actions` | YES | YES | YES | YES | REAL | REAL |
| Activity | `/agent/activity` | YES | YES | YES | YES | REAL | REAL |
| Agents | `/agent/agents` | YES | YES | YES | YES | REAL | REAL |
| Agents Detail ([agentId]) | `/agent/agents/[agentId]` | YES | YES | YES | YES | REAL | REAL |
| New | `/agent/agents/new` | YES | YES | YES | YES | REAL | REAL |
| Approvals | `/agent/approvals` | YES | YES | YES | YES | REAL | REAL |
| Behavior | `/agent/behavior` | YES | YES | YES | YES | REAL | REAL |
| Data access | `/agent/data-access` | YES | YES | YES | YES | REAL | REAL |
| Delegation | `/agent/delegation` | YES | YES | YES | NO | NO | UI ONLY |
| Security Knowledge Graph | `/agent/delegation/graph` | YES | YES | YES | NO | NO | UI ONLY |
| Delegations | `/agent/delegations` | YES | YES | YES | YES | REAL | REAL |
| Security Knowledge Graph | `/agent/delegations/graph` | YES | YES | YES | YES | REAL | REAL |
| Security and Compliance Evidence | `/agent/evidence` | YES | YES | YES | YES | REAL | REAL |
| Identities | `/agent/identities` | YES | YES | YES | YES | REAL | REAL |
| Permissions | `/agent/permissions` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/agent/policies` | YES | YES | YES | YES | REAL | REAL |
| Risk | `/agent/risk` | YES | YES | YES | YES | REAL | REAL |
| Active Sessions and Devices | `/agent/sessions` | YES | YES | YES | YES | REAL | REAL |
| Unified User and Org Settings | `/agent/settings` | YES | YES | YES | NO | NO | UI ONLY |
| Tools | `/agent/tools` | YES | YES | YES | YES | REAL | REAL |
| Tools Detail ([toolId]) | `/agent/tools/[toolId]` | YES | YES | YES | NO | NO | UI ONLY |

## 6. QA and Test Automation (Nexora QA Test Suites, Test Runs, Browsers, Visual Diff)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| QA and Test Automation Hub | `/qa` | YES | YES | YES | YES | REAL | REAL |
| Accessibility | `/qa/accessibility` | YES | YES | YES | YES | REAL | REAL |
| Api testing | `/qa/api-testing` | YES | YES | YES | YES | REAL | REAL |
| Automation | `/qa/automation` | YES | YES | YES | YES | REAL | REAL |
| Browsers | `/qa/browsers` | YES | YES | YES | YES | REAL | REAL |
| Defects | `/qa/defects` | YES | YES | YES | YES | REAL | REAL |
| Manual testing | `/qa/manual-testing` | YES | YES | YES | YES | REAL | REAL |
| Performance | `/qa/performance` | YES | YES | YES | YES | REAL | REAL |
| Quality gates | `/qa/quality-gates` | YES | YES | YES | YES | REAL | REAL |
| Test cases | `/qa/test-cases` | YES | YES | YES | YES | REAL | REAL |
| Test cases Detail ([id]) | `/qa/test-cases/[id]` | YES | YES | YES | YES | REAL | REAL |
| Test plans | `/qa/test-plans` | YES | YES | YES | YES | REAL | REAL |
| Test runs | `/qa/test-runs` | YES | YES | YES | YES | REAL | REAL |
| Test suites | `/qa/test-suites` | YES | YES | YES | YES | REAL | REAL |
| Visual regression | `/qa/visual-regression` | YES | YES | YES | YES | REAL | REAL |

## 7. Authentication and Identity (Login, Register, MFA, SSO, Recovery)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Github | `/auth/callback/github` | YES | YES | YES | YES | REAL | REAL |
| Google | `/auth/callback/google` | YES | YES | YES | YES | REAL | REAL |
| Single Sign-On (SSO) | `/auth/callback/sso` | YES | YES | YES | YES | REAL | REAL |
| Single Sign-On (SSO) | `/auth/sso` | YES | YES | YES | YES | REAL | REAL |
| Forgot Password | `/forgot-password` | YES | YES | YES | YES | REAL | REAL |
| User Login | `/login` | YES | YES | YES | YES | REAL | REAL |
| Reset Password | `/reset-password` | YES | YES | YES | YES | REAL | REAL |

## 8. Account and Organization Settings (Profile, Security, API Keys, Team, Billing)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Unified User and Org Settings | `/settings` | YES | YES | YES | YES | REAL | REAL |
| API Keys and PATs | `/settings/api-keys` | YES | YES | YES | NO | NO | UI ONLY |
| Billing and Subscriptions | `/settings/billing` | YES | YES | YES | YES | REAL | REAL |
| Login History and Audit Trail | `/settings/login-history` | YES | YES | YES | YES | REAL | REAL |
| Team Members and Access | `/settings/members` | YES | YES | YES | YES | REAL | REAL |
| Roles and Permissions (RBAC) | `/settings/roles` | YES | YES | YES | YES | REAL | REAL |
| Active Sessions and Devices | `/settings/sessions` | YES | YES | YES | YES | REAL | REAL |
| Single Sign-On (SSO) | `/settings/sso` | YES | YES | YES | NO | NO | UI ONLY |

## 9. Sales, Demos and Guided Tours (Guided Demos, POC Workspaces, Inquiry)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Demo | `/demo` | YES | YES | YES | YES | REAL | REAL |
| Sales | `/sales` | YES | YES | YES | YES | REAL | REAL |
| Book demo | `/sales/book-demo` | YES | YES | YES | YES | REAL | REAL |
| Contact | `/sales/contact` | YES | YES | YES | YES | REAL | REAL |
| Contract | `/sales/contract` | YES | YES | YES | YES | REAL | REAL |
| Demo workspace | `/sales/demo-workspace` | YES | YES | YES | YES | REAL | REAL |
| Enterprise inquiry | `/sales/enterprise-inquiry` | YES | YES | YES | YES | REAL | REAL |
| Enterprise onboarding | `/sales/enterprise-onboarding` | YES | YES | YES | YES | REAL | REAL |
| Guided demo | `/sales/guided-demo` | YES | YES | YES | YES | REAL | REAL |
| Pipeline | `/sales/pipeline` | YES | YES | YES | YES | REAL | REAL |
| Poc progress | `/sales/poc-progress` | YES | YES | YES | YES | REAL | REAL |
| Poc request | `/sales/poc-request` | YES | YES | YES | YES | REAL | REAL |
| Poc results | `/sales/poc-results` | YES | YES | YES | YES | REAL | REAL |
| Poc workspace | `/sales/poc-workspace` | YES | YES | YES | YES | REAL | REAL |
| Proposal | `/sales/proposal` | YES | YES | YES | YES | REAL | REAL |
| Qualification | `/sales/qualification` | YES | YES | YES | YES | REAL | REAL |
| Quote | `/sales/quote` | YES | YES | YES | YES | REAL | REAL |
| Request demo | `/sales/request-demo` | YES | YES | YES | YES | REAL | REAL |
| Security expert | `/sales/security-expert` | YES | YES | YES | YES | REAL | REAL |

## 10. Customer Onboarding and Setup (Organization, Project, GitHub Connect)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Onboarding | `/onboarding` | YES | YES | YES | NO | NO | UI ONLY |
| Complete | `/onboarding/complete` | YES | YES | YES | YES | REAL | REAL |
| Configuration | `/onboarding/configuration` | YES | YES | YES | YES | REAL | REAL |
| Connect github | `/onboarding/connect-github` | YES | YES | YES | YES | REAL | REAL |
| Enterprise | `/onboarding/enterprise` | YES | YES | YES | YES | REAL | REAL |
| Environment | `/onboarding/environment` | YES | YES | YES | YES | REAL | REAL |
| Organization | `/onboarding/organization` | YES | YES | YES | YES | REAL | REAL |
| Products | `/onboarding/products` | YES | YES | YES | YES | REAL | REAL |
| Project | `/onboarding/project` | YES | YES | YES | YES | REAL | REAL |
| Workspace | `/onboarding/workspace` | YES | YES | YES | YES | REAL | REAL |

## 11. Security Operations and Threat Intel (Incidents, Alerts, Threat Feeds)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| SOC Operations and Incidents | `/soc` | YES | YES | YES | YES | REAL | REAL |

## 12. Security Knowledge Graph (Entity Relationships, Blast Radius)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Security Knowledge Graph | `/graph` | YES | YES | YES | YES | REAL | REAL |

## 13. Data Security DSPM (Data Classification, Sensitivity Discovery)

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Data Security and DSPM | `/data` | YES | YES | YES | YES | REAL | REAL |

## 14. Core Overview, Platform Roots and Public Documentation

| Feature | Route | UI Exists | Backend Exists | DB Exists | API Connected | Real Functionality | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| SecuLayer Platform Home | `/` | YES | YES | YES | NO | NO | UI ONLY |
| Account locked | `/account-locked` | YES | YES | YES | YES | REAL | REAL |
| Account recovery | `/account-recovery` | YES | YES | YES | YES | REAL | REAL |
| Audit logs | `/audit-logs` | YES | YES | YES | NO | NO | UI ONLY |
| CI/CD Pipeline Security | `/ci-cd` | YES | YES | YES | NO | NO | UI ONLY |
| Compliance Frameworks | `/compliance` | YES | YES | YES | NO | NO | UI ONLY |
| Contact | `/contact` | YES | YES | YES | YES | REAL | REAL |
| Control plane | `/control-plane` | YES | YES | YES | YES | REAL | REAL |
| Documentation and Developer Guides | `/docs` | YES | YES | YES | NO | NO | UI ONLY |
| Enterprise | `/enterprise` | YES | YES | YES | YES | REAL | REAL |
| Security Findings | `/findings` | YES | YES | YES | NO | NO | UI ONLY |
| Findings Detail ([findingId]) | `/findings/[findingId]` | YES | YES | YES | NO | NO | UI ONLY |
| Governance and Controls | `/governance` | YES | YES | YES | YES | REAL | REAL |
| Security Command Center (Home) | `/home` | YES | YES | YES | NO | NO | UI ONLY |
| Third-Party Integrations | `/integrations` | YES | YES | YES | NO | NO | UI ONLY |
| Intelligence | `/intelligence` | YES | YES | YES | YES | REAL | REAL |
| Accept | `/invitations/accept` | YES | YES | YES | YES | REAL | REAL |
| Kubernetes | `/kubernetes` | YES | YES | YES | NO | NO | UI ONLY |
| Logout | `/logout` | YES | YES | YES | YES | REAL | REAL |
| Mfa | `/mfa` | YES | YES | YES | YES | REAL | REAL |
| MFA Backup Codes | `/mfa/backup-codes` | YES | YES | YES | NO | NO | UI ONLY |
| Account Recovery | `/mfa/recovery` | YES | YES | YES | NO | NO | UI ONLY |
| MFA Setup | `/mfa/setup` | YES | YES | YES | NO | NO | UI ONLY |
| MFA Verification | `/mfa/verify` | YES | YES | YES | NO | NO | UI ONLY |
| Security Posture Overview | `/overview` | YES | YES | YES | NO | NO | UI ONLY |
| Platform | `/platform` | YES | YES | YES | NO | NO | UI ONLY |
| Poc | `/poc` | YES | YES | YES | YES | REAL | REAL |
| Security and OPA Policies | `/policies` | YES | YES | YES | NO | NO | UI ONLY |
| Product Pricing Plans | `/pricing` | YES | YES | YES | NO | NO | UI ONLY |
| Privacy | `/privacy` | YES | YES | YES | NO | NO | UI ONLY |
| Products | `/products` | YES | YES | YES | NO | NO | UI ONLY |
| Agent Governance Overview | `/products/agent` | YES | YES | YES | NO | NO | UI ONLY |
| Attack Surface Overview | `/products/attack` | YES | YES | YES | YES | REAL | REAL |
| Cloud Security Overview | `/products/cloud` | YES | YES | YES | NO | NO | UI ONLY |
| Code Security Overview | `/products/code` | YES | YES | YES | NO | NO | UI ONLY |
| Data Security and DSPM | `/products/data` | YES | YES | YES | YES | REAL | REAL |
| Security Knowledge Graph | `/products/graph` | YES | YES | YES | YES | REAL | REAL |
| Runtime Protection Overview | `/products/protect` | YES | YES | YES | YES | REAL | REAL |
| Projects | `/projects` | YES | YES | YES | NO | NO | UI ONLY |
| Repositories | `/repositories` | YES | YES | YES | NO | NO | UI ONLY |
| Resources | `/resources` | YES | YES | YES | NO | NO | UI ONLY |
| Security Hotspots | `/sast/hotspots` | YES | YES | YES | YES | REAL | REAL |
| Hotspots Detail ([id]) | `/sast/hotspots/[id]` | YES | YES | YES | YES | REAL | REAL |
| History | `/sast/hotspots/[id]/history` | YES | YES | YES | YES | REAL | REAL |
| List | `/sast/hotspots/list` | YES | YES | YES | YES | REAL | REAL |
| Third-Party Integrations | `/sast/integrations` | YES | YES | YES | YES | REAL | REAL |
| Api | `/sast/integrations/api` | YES | YES | YES | YES | REAL | REAL |
| Bitbucket | `/sast/integrations/bitbucket` | YES | YES | YES | YES | REAL | REAL |
| CI/CD Pipeline Security | `/sast/integrations/ci-cd` | YES | YES | YES | YES | REAL | REAL |
| Github | `/sast/integrations/github` | YES | YES | YES | YES | REAL | REAL |
| Gitlab | `/sast/integrations/gitlab` | YES | YES | YES | YES | REAL | REAL |
| Webhooks | `/sast/integrations/webhooks` | YES | YES | YES | YES | REAL | REAL |
| Scans | `/scans` | YES | YES | YES | NO | NO | UI ONLY |
| Security | `/security` | YES | YES | YES | NO | NO | UI ONLY |
| Session expired | `/session-expired` | YES | YES | YES | NO | NO | UI ONLY |
| Signup | `/signup` | YES | YES | YES | YES | REAL | REAL |
| Solutions | `/solutions` | YES | YES | YES | NO | NO | UI ONLY |
| Terms | `/terms` | YES | YES | YES | NO | NO | UI ONLY |
| Unauthorized | `/unauthorized` | YES | YES | YES | NO | NO | UI ONLY |
| Email Verification | `/verify-email` | YES | YES | YES | NO | NO | UI ONLY |
| Expired | `/verify-email/expired` | YES | YES | YES | YES | REAL | REAL |
| Success | `/verify-email/success` | YES | YES | YES | YES | REAL | REAL |
| IaC Security Overview (1.1–1.8) | `/code/iac/overview` | YES | YES | YES | YES | REAL | REAL |
| IaC Rule Detail Suite (7.1–7.8) | `/code/iac/rules/[id]` | YES | YES | YES | YES | REAL | REAL |
| IaC Security Settings Suite (15.1–15.7) | `/code/iac/settings` | YES | YES | YES | YES | REAL | REAL |


