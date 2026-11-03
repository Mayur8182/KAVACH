# 08 — Product Module Architectural Diagrams

## Overview

This directory provides deep-dive architectural diagrams and documentation for each of the core product pillars implemented in SecuLayer:

---

## The 6 Product Modules

### 1. [Thing Code (Code Security)](./code-security.html)
- **Scope:** Source code repositories, SAST static analysis (Semgrep), Secret detection (Gitleaks), Software Composition Analysis (OSV), Software Bill of Materials (SPDX/CycloneDX), Infrastructure as Code (Checkov), Pull Request security checks, Hotspot review queue, and AI remediation with verified rescan gates.
- **Key Models:** `github_repositories`, `github_security_jobs`, `security_findings`, `hotspots`, `sbom_components`, `remediations`.
- **Key Endpoints:** `/api/v1/scans`, `/api/hotspots/*`, `/api/v1/sbom`, `/api/v1/iac/*`, `/api/v1/pull-requests`.

### 2. [Thing Cloud (Cloud Security Posture Management)](./cloud-security.html)
- **Scope:** Multi-cloud account connections (AWS, Azure, GCP), Kubernetes cluster integration, automated asset discovery (S3, EC2, IAM, RDS), CSPM benchmark evaluations, IaC drift detection, and blast radius calculation.
- **Key Models:** `cloud_accounts`, `cloud_assets`, `cloud_findings`, `iac_drifts`, `kubernetes_clusters`, `kubernetes_workloads`.
- **Key Endpoints:** `/api/v1/cloud/*`, `/api/v1/cloud/assets`, `/api/v1/iac_drift`.

### 3. [Thing Attack (Attack Surface & DAST)](./attack-surface.html)
- **Scope:** External attack surface management (EASM), public endpoint discovery, automated OpenAPI / Swagger cataloging, dynamic application security testing (DAST), authorization fuzzing, and proof-of-exploit reporting.
- **Key Models:** `attack_targets`, `attack_surface_assets`, `dast_scans`, `api_discovery_records`.
- **Key Endpoints:** `/api/v1/attack/*`, `/api/v1/attack/api-discovery`, `/api/v1/attack/targets`.

### 4. [Thing Protect (Runtime Defense & MCP Gateway)](./protect-runtime.html)
- **Scope:** Runtime container security, container registry sync (Docker Hub, ECR, GCR), image scanning with Trivy, eBPF system event monitoring, and the **MCP Security Gateway** wrapping external Model Context Protocol tools with identity scoping and approval barriers.
- **Key Models:** `container_registries`, `container_scans`, `mcp_servers`, `mcp_tools`, `mcp_access_logs`.
- **Key Endpoints:** `/api/v1/protect/*`, `/api/v1/mcp/*`, `/api/v1/container_security`.

### 5. [Thing Compliance & Agent Governance](./compliance-and-governance.html)
- **Scope:** Regulatory compliance frameworks (SOC 2, ISO 27001, HIPAA, PCI-DSS, NIST), Open Policy Agent (OPA) rule enforcement, immutable evidence collection, and **Agent Security Governance** (agent registries, delegation chains, token budgets, and tool access approvals).
- **Key Models:** `compliance_frameworks`, `policy_definitions`, `audit_events`, `agent_identities`, `agent_delegations`, `agent_tool_approvals`.
- **Key Endpoints:** `/api/v1/policies`, `/api/v1/governance`, `/api/v1/agent/*`, `/api/v1/audit`.

### 6. [Shared Control Plane (Multi-Tenancy & Administration)](./shared-control-plane.html)
- **Scope:** Multi-tenant workspace management, organization subscriptions, plan entitlements, seat quotas, feature catalog gating, member invitations, RBAC roles, and unified settings.
- **Key Models:** `organizations`, `organization_subscriptions`, `tenant_plans`, `quota_seat_trial`, `invitations`, `users`.
- **Key Endpoints:** `/api/v1/account`, `/api/v1/invitations`, `/api/v1/superadmin_*`, `/api/v1/entitlements`.

---

## Interactive Diagrams
- [Thing Code Architecture Diagram (`code-security.html`)](./code-security.html)
- [Thing Cloud Architecture Diagram (`cloud-security.html`)](./cloud-security.html)
- [Thing Attack Architecture Diagram (`attack-surface.html`)](./attack-surface.html)
- [Thing Protect & MCP Diagram (`protect-runtime.html`)](./protect-runtime.html)
- [Thing Compliance & Governance Diagram (`compliance-and-governance.html`)](./compliance-and-governance.html)
- [Shared Control Plane Diagram (`shared-control-plane.html`)](./shared-control-plane.html)
