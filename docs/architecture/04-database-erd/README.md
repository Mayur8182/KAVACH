# 04 — Database Entity-Relationship Architecture

## Overview

The SecuLayer Control Plane relies on **PostgreSQL** as the single authoritative source of truth. All models are defined using **SQLAlchemy 2.0 (Mapped / mapped_column)** with platform-independent `GUID(36)` primary keys and JSON support for extensible metadata.

There are **56 persistent database models** structured into six cohesive functional domains.

---

## 1. Domain Groupings

### A. Identity, Multi-Tenancy & Subscriptions
- `organizations`: Root tenant entity (`id`, `name`, `slug`, `domain`, `plan`).
- `organization_subscriptions`: Quotas (`max_repositories`, `max_scan_minutes`, `max_storage_gb`, `ai_remediation`).
- `users`: User profiles with password hashes, TOTP MFA secrets, recovery codes, and session records.
- `invitations`: Workspace invites with role scoping (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), verification tokens, expiration timestamps.
- `audit_events`: Immutable audit trail (`organization_id`, `actor_id`, `action`, `resource_type`, `ip_address`, `evidence_metadata`).

### B. Code Security & Vulnerability Management
- `projects`: Workspace containers grouping repositories and policies.
- `github_repositories`: SCM sync entities (`project_id`, `full_name`, `default_branch`, `clone_url`).
- `github_security_jobs`: Pipeline scan runs (`status`, `findings_count`, `stage_progress`, `scan_summary`).
- `security_findings`: Normalized vulnerabilities (`severity`, `category`, `cwe_id`, `file_path`, `line_start`, `remediation`).
- `hotspots`: Security-sensitive code locations requiring human review (`status`: `TO_REVIEW`, `SAFE`, `ACKNOWLEDGED`, `FIXED`).
- `sbom_components`: Software Bill of Materials inventory (`package_name`, `version`, `purl`, `licenses`, `vulnerabilities`).
- `remediations`: Proposed code patches, unified diffs, rescan validation status.

### C. Cloud Infrastructure & IaC Security
- `cloud_accounts`: AWS, Azure, GCP provider credentials and connection health.
- `cloud_assets`: Discovered cloud inventory (S3 buckets, EC2 instances, IAM roles, RDS clusters).
- `iac_scans`: Terraform/CloudFormation static scans powered by Checkov.
- `iac_drifts`: Discrepancies between IaC declarations and live cloud assets.
- `kubernetes_clusters`: K8s cluster connections, namespace topologies, workload security observations.

### D. Runtime Protection & MCP Security Gateway
- `mcp_servers`: Registered Model Context Protocol tool endpoints.
- `mcp_tools`: Scoped tool capabilities with risk classifications (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `mcp_access_logs`: Tool invocation traces, authorization decisions, approval states.
- `container_scans`: Image vulnerabilities discovered via Trivy scanner.

### E. Agent Identity & Governance
- `agent_identities`: AI agent registry (`agent_id`, `model_name`, `task_scope`, `trust_score`).
- `agent_delegations`: Delegation chains between agents with bounded authority and token budgets.
- `agent_tool_approvals`: Human-in-the-loop approvals for sensitive tool invocations.

### F. SOC, Threat Intelligence & Compliance
- `soc_incidents`: Security incident tickets with containment and remediation workflows.
- `threat_intel_indicators`: Real-time malicious IPs, domains, and hashes.
- `dns_security_events`: DNS tunneling, DGA, and hijacking observations.
- `abuse_protection_events`: Account takeover and credential stuffing telemetry.

---

## Interactive Diagram
Open [`database-erd.html`](./database-erd.html) in your browser for the full interactive database schema and ERD diagram.
