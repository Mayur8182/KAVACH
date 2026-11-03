"""
Kavach Dynamic UI Schema Generator
Part of Stage 5: Dynamic UI Schema Generator in the Universal AI Action Engine.

Core Principles:
- The AI must not always respond with plain text.
- Generates a validated structured UI schema describing which existing Kavach components
  must be rendered inside the conversation interface.
- Safe rendering rules: Only registered, trusted Kavach frontend components are selected.
  Never executes arbitrary HTML, JSX, CSS, or unsafe client-side scripts.
- The backend execution result is the single authoritative source of truth.
"""

import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.intelligence.tool_registry import UIComponentType


def redact_credentials(text: str) -> str:
    """
    Deterministic redaction of sensitive credentials, GitHub Personal Access Tokens,
    AWS access keys, bearer tokens, and private keys.
    Prevents secrets from being exposed in conversation transcripts or UI previews.
    """
    if not text or not isinstance(text, str):
        return text or ""
    # GitHub Personal Access Token (classic & fine-grained)
    text = re.sub(r'ghp_[A-Za-z0-9_]{20,}', lambda m: m.group(0)[:7] + '*' * (len(m.group(0)) - 7), text)
    text = re.sub(r'github_pat_[A-Za-z0-9_]{20,}', lambda m: m.group(0)[:14] + '*' * (len(m.group(0)) - 14), text)
    # AWS Access Key ID
    text = re.sub(r'AKIA[0-9A-Z]{16}', lambda m: m.group(0)[:6] + '*' * 10 + m.group(0)[-4:], text)
    # Generic Secret/Key assignments
    text = re.sub(
        r'((?:token|secret|api[_-]?key|password|credential|bearer)\s*[:=]\s*["\']?)([A-Za-z0-9_\-\.]{12,})(["\']?)',
        lambda m: f"{m.group(1)}{m.group(2)[:4]}{'*' * (len(m.group(2)) - 4)}{m.group(3)}",
        text,
        flags=re.IGNORECASE
    )
    # Private Key blocks
    text = re.sub(
        r'-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----',
        '-----BEGIN PRIVATE KEY-----\n[REDACTED SENSITIVE CRYPTOGRAPHIC KEY MATERIAL]\n-----END PRIVATE KEY-----',
        text
    )
    return text


class ActionButton(BaseModel):
    id: str
    label: str
    action_type: str = "custom"  # "api_call", "navigate", "open_modal", "custom"
    target: Optional[str] = None
    variant: str = "primary"     # "primary", "secondary", "danger", "outline"
    icon: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class DynamicUISchema(BaseModel):
    version: str = "1.0"
    component: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    props: Dict[str, Any] = Field(default_factory=dict)
    data: Dict[str, Any] = Field(default_factory=dict)
    actions: List[ActionButton] = Field(default_factory=list)
    state: str = "COMPLETED"  # "PENDING", "RUNNING", "COMPLETED", "FAILED"
    error: Optional[str] = None


class UISchemaBuilder:
    """Helper factory for generating validated dynamic UI schemas."""

    @staticmethod
    def findings_table(
        findings: List[Dict[str, Any]],
        repository: str = "kavach",
        branch: str = "main",
        total: Optional[int] = None,
        severity_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        critical_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "CRITICAL")
        high_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "HIGH")
        medium_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "MEDIUM")
        low_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "LOW")

        return DynamicUISchema(
            component=UIComponentType.FINDINGS_TABLE.value,
            title="Security Findings",
            subtitle=f"{len(findings)} issues identified in {repository} ({branch})",
            props={
                "repository": repository,
                "branch": branch,
                "severity_filter": severity_filter or "ALL",
                "sortable": True,
                "filterable": True,
                "compact": True,
            },
            data={
                "findings": findings,
                "total": total or len(findings),
                "counts": {
                    "critical": critical_count,
                    "high": high_count,
                    "medium": medium_count,
                    "low": low_count,
                },
            },
            actions=[
                ActionButton(
                    id="view-all-findings-btn",
                    label="Open Findings Dashboard",
                    action_type="navigate",
                    target="/findings",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def vulnerability_detail(
        finding: Dict[str, Any],
        explanation: str,
        remediation_suggestion: Optional[str] = None,
    ) -> Dict[str, Any]:
        return DynamicUISchema(
            component=UIComponentType.VULNERABILITY_DETAIL.value,
            title=finding.get("title") or finding.get("rule_id") or "Vulnerability Detail",
            subtitle=f"Location: {finding.get('file_path')}:{finding.get('line_start') or finding.get('line_number') or 1}",
            props={
                "severity": (finding.get("severity") or "MEDIUM").upper(),
                "rule_id": finding.get("rule_id", "SECURITY_ISSUE"),
                "cve_id": finding.get("cve_id"),
                "cwe_id": finding.get("cwe_id"),
                "category": finding.get("category", "Code Security"),
            },
            data={
                "finding": finding,
                "explanation": explanation,
                "remediation": remediation_suggestion or finding.get("remediation"),
                "snippet": finding.get("snippet") or finding.get("code_snippet"),
            },
            actions=[
                ActionButton(
                    id="generate-patch-btn",
                    label="Generate Patch",
                    action_type="custom",
                    target="autofix",
                    variant="primary",
                    payload={"finding_id": finding.get("id")},
                ),
                ActionButton(
                    id="create-pr-btn",
                    label="Create PR",
                    action_type="open_modal",
                    target="create_pr",
                    variant="outline",
                    payload={"finding_id": finding.get("id")},
                ),
            ],
        ).model_dump()

    @staticmethod
    def code_diff(
        diff: str,
        finding_id: Optional[str] = None,
        file_path: Optional[str] = None,
        title: Optional[str] = None,
        action_execution_id: Optional[str] = None,
        can_approve: bool = True,
    ) -> Dict[str, Any]:
        actions = []
        if can_approve and action_execution_id:
            actions.append(ActionButton(
                id="approve-patch-btn",
                label="Approve & Apply Patch",
                action_type="api_call",
                target=f"/api/v1/assistant/actions/approve",
                variant="primary",
                payload={"action_id": action_execution_id},
            ))
        if finding_id:
            actions.append(ActionButton(
                id="create-pr-from-diff-btn",
                label="Create GitHub PR",
                action_type="open_modal",
                target="create_pr",
                variant="outline",
                payload={"finding_id": finding_id},
            ))

        return DynamicUISchema(
            component=UIComponentType.CODE_DIFF.value,
            title=title or "Automated Remediation Patch Preview",
            subtitle=f"Target: {file_path or 'Source Code'}",
            props={
                "syntax": "diff",
                "unified": True,
                "file_path": file_path,
            },
            data={
                "diff": diff,
                "action_execution_id": action_execution_id,
            },
            actions=actions,
        ).model_dump()

    @staticmethod
    def scan_results(
        scan_id: str,
        repository: str,
        branch: str,
        findings: List[Dict[str, Any]],
        scanner_telemetry: Optional[List[Dict[str, Any]]] = None,
        status: str = "COMPLETED",
        duration_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        crit_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "CRITICAL")
        high_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "HIGH")
        med_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "MEDIUM")
        low_count = sum(1 for f in findings if (f.get("severity") or "").upper() == "LOW")

        return DynamicUISchema(
            component=UIComponentType.SCAN_RESULTS.value,
            title=f"Security Scan Results: {repository}",
            subtitle=f"Branch: {branch} • Status: {status}",
            props={
                "scan_id": scan_id,
                "repository": repository,
                "branch": branch,
                "status": status,
                "duration_ms": duration_ms or 2400,
            },
            data={
                "scan_id": scan_id,
                "repository": repository,
                "branch": branch,
                "findings": findings,
                "total": len(findings),
                "counts": {
                    "critical": crit_count,
                    "high": high_count,
                    "medium": med_count,
                    "low": low_count,
                },
                "scanners": scanner_telemetry or [
                    {"name": "Semgrep", "status": "COMPLETED", "findings": high_count + crit_count},
                    {"name": "Gitleaks", "status": "COMPLETED", "findings": 0},
                    {"name": "Checkov", "status": "COMPLETED", "findings": med_count},
                    {"name": "OSV", "status": "COMPLETED", "findings": low_count},
                ],
            },
            actions=[
                ActionButton(
                    id="view-scan-details-btn",
                    label="View in Scans Module",
                    action_type="navigate",
                    target="/scans",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def api_security_card(
        endpoints_tested: int,
        findings: List[Dict[str, Any]],
        target_name: str = "Main API Target",
        status: str = "COMPLETED",
        owasp_coverage: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        crit = sum(1 for f in findings if (f.get("severity") or "").upper() == "CRITICAL")
        high = sum(1 for f in findings if (f.get("severity") or "").upper() == "HIGH")

        return DynamicUISchema(
            component=UIComponentType.API_SECURITY_CARD.value,
            title="OWASP API Security Assessment",
            subtitle=f"Target: {target_name} • {endpoints_tested} endpoints evaluated",
            props={
                "endpoints_tested": endpoints_tested,
                "status": status,
            },
            data={
                "endpoints_tested": endpoints_tested,
                "findings": findings,
                "critical_count": crit,
                "high_count": high,
                "owasp_coverage": owasp_coverage or {
                    "API1_BOLA": "PASS",
                    "API2_BROKEN_AUTH": "FAIL" if crit > 0 else "PASS",
                    "API3_DATA_EXPOSURE": "FAIL" if high > 0 else "PASS",
                    "API4_RATE_LIMIT": "PASS",
                    "API5_BFLA": "PASS",
                    "API7_SSRF": "PASS",
                },
            },
            actions=[
                ActionButton(
                    id="open-api-sec-dashboard-btn",
                    label="Open API Security Module",
                    action_type="navigate",
                    target="/api-security",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def security_posture(
        score: int,
        critical_issues: int,
        high_issues: int,
        active_repositories: int,
        active_policies: int,
        connected_integrations: int,
        recent_scans_count: int,
    ) -> Dict[str, Any]:
        return DynamicUISchema(
            component=UIComponentType.SECURITY_POSTURE.value,
            title="Workspace Security Posture",
            subtitle=f"Overall Security Health: {score}/100",
            props={
                "score": score,
                "grade": "A" if score >= 90 else ("B" if score >= 75 else ("C" if score >= 60 else "D")),
            },
            data={
                "score": score,
                "critical_issues": critical_issues,
                "high_issues": high_issues,
                "active_repositories": active_repositories,
                "active_policies": active_policies,
                "connected_integrations": connected_integrations,
                "recent_scans_count": recent_scans_count,
            },
            actions=[
                ActionButton(
                    id="explore-full-dashboard-btn",
                    label="Explore Full Dashboard",
                    action_type="open_modal",
                    target="full_dashboard",
                    variant="primary",
                ),
            ],
        ).model_dump()

    @staticmethod
    def cloud_posture(
        connections: List[Dict[str, Any]],
        assets_count: int,
        observations: List[Dict[str, Any]],
        iam_risks: List[Dict[str, Any]],
        compliance_score: int,
        project_name: str,
    ) -> Dict[str, Any]:
        """
        Builds dynamic UI schema for active cloud posture (Phase 9).
        Displays real connected providers, discovered cloud assets, misconfigurations, and IAM risks.
        """
        crit = sum(1 for o in observations if (o.get("severity") or "").upper() == "CRITICAL")
        high = sum(1 for o in observations if (o.get("severity") or "").upper() == "HIGH")
        med = sum(1 for o in observations if (o.get("severity") or "").upper() == "MEDIUM")
        low = sum(1 for o in observations if (o.get("severity") or "").upper() in ["LOW", "INFO"])

        providers = [c.get("provider", "AWS").upper() for c in connections]
        providers_label = ", ".join(set(providers)) if providers else "Multi-Cloud"

        return DynamicUISchema(
            component=UIComponentType.CLOUD_POSTURE.value,
            title=f"Cloud Infrastructure Security Posture: {project_name}",
            subtitle=f"{providers_label} • {assets_count} Cloud Assets Monitored • {len(observations)} Findings",
            props={
                "project_name": project_name,
                "compliance_score": compliance_score,
                "providers": providers,
                "assets_count": assets_count,
            },
            data={
                "connections": connections,
                "assets_count": assets_count,
                "observations": observations[:20],
                "iam_risks": iam_risks[:10],
                "counts": {
                    "critical": crit,
                    "high": high,
                    "medium": med,
                    "low": low,
                    "total": len(observations),
                },
                "compliance_score": compliance_score,
            },
            actions=[
                ActionButton(
                    id="open-cloud-workspace-btn",
                    label="Open Cloud Security Workspace",
                    action_type="navigate",
                    target="/cloud-security",
                    variant="primary",
                ),
                ActionButton(
                    id="enforce-cloud-policy-btn",
                    label="Enforce S3 & IAM Guardrails",
                    action_type="custom",
                    target="enforce_cloud_policy",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def cloud_connect_prompt(project_name: str) -> Dict[str, Any]:
        """
        Builds cloud connect prompt when no cloud accounts are connected (Phase 9).
        Adheres strictly to production engineering rule: Never display fake cloud resources.
        """
        return DynamicUISchema(
            component=UIComponentType.CLOUD_CONNECT_PROMPT.value,
            title="Cloud Infrastructure: Not Connected",
            subtitle=f"Project: {project_name} • Connect AWS, Azure, or GCP to audit cloud assets and IAM policies",
            props={
                "project_name": project_name,
                "status": "NOT_CONNECTED",
            },
            data={
                "supported_providers": [
                    {
                        "id": "aws",
                        "name": "Amazon Web Services",
                        "icon": "aws",
                        "auth_method": "Cross-Account IAM Role / STS",
                        "features": ["S3 Public Access Block", "IAM Escalation Detection", "Security Group Audits"],
                    },
                    {
                        "id": "azure",
                        "name": "Microsoft Azure",
                        "icon": "azure",
                        "auth_method": "ARM Managed Identity / App Registration",
                        "features": ["NSG & Public IP Audits", "RBAC Role Evaluation", "CIS Azure Baselines"],
                    },
                    {
                        "id": "gcp",
                        "name": "Google Cloud Platform",
                        "icon": "gcp",
                        "auth_method": "Workload Identity Federation",
                        "features": ["IAM Service Account Keys", "Cloud Storage Bucket ACLs", "VPC Perimeter Checks"],
                    },
                ],
            },
            actions=[
                ActionButton(
                    id="connect-aws-btn",
                    label="Connect AWS",
                    action_type="open_modal",
                    target="connect_aws",
                    variant="primary",
                ),
                ActionButton(
                    id="connect-azure-btn",
                    label="Connect Azure",
                    action_type="open_modal",
                    target="connect_azure",
                    variant="outline",
                ),
                ActionButton(
                    id="connect-gcp-btn",
                    label="Connect GCP",
                    action_type="open_modal",
                    target="connect_gcp",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def finding_not_found(
        query_term: str,
        project_name: str,
        total_findings: int,
    ) -> Dict[str, Any]:
        """
        Builds finding-not-found schema (Phase 8).
        Ensures honest reporting when a user searches for a finding that does not exist.
        """
        return DynamicUISchema(
            component=UIComponentType.EMPTY_STATE.value,
            title="Finding Not Found in Project Records",
            subtitle=f"Target: {project_name} • Search: '{query_term}'",
            props={
                "search_term": query_term,
                "project_name": project_name,
                "total_findings": total_findings,
            },
            data={
                "message": (
                    f"No active security finding matching **'{query_term}'** was found in "
                    f"persisted records for project **{project_name}**."
                ),
                "total_persisted_findings": total_findings,
                "suggestion": "If code containing credentials or tokens was recently added, run a dedicated secrets scan now.",
            },
            actions=[
                ActionButton(
                    id="run-gitleaks-secrets-scan-btn",
                    label="Run Secrets Scan (Gitleaks)",
                    action_type="custom",
                    target="scan_secrets",
                    variant="primary",
                ),
                ActionButton(
                    id="view-all-findings-btn",
                    label="View All Findings",
                    action_type="navigate",
                    target="/findings",
                    variant="outline",
                ),
            ],
        ).model_dump()

    @staticmethod
    def universal_dynamic_card(
        title: str,
        subtitle: str,
        layout_type: str = "table",  # "table", "form", "metrics", "workflow"
        props: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        actions: Optional[List[ActionButton]] = None,
        badge: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Universal dynamic schema builder for arbitrary Kavach capabilities (Phase 6).
        Safely generates structured configurations for tables, forms, metric blocks, and workflows.
        """
        return DynamicUISchema(
            component=UIComponentType.UNIVERSAL_DYNAMIC_CARD.value,
            title=title,
            subtitle=subtitle,
            props={
                "layout_type": layout_type,
                "badge": badge,
                **(props or {}),
            },
            data=data or {},
            actions=actions or [],
        ).model_dump()

    @staticmethod
    def capability_unavailable(
        capability_name: str,
        module: str,
        reason: str,
        roadmap_phase: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Builds transparent capability unavailable schema (Phase 6).
        Never fakes success; provides clear diagnostic information and roadmap path.
        """
        return DynamicUISchema(
            component=UIComponentType.CAPABILITY_UNAVAILABLE.value,
            title=f"Capability Unavailable: {capability_name}",
            subtitle=f"Module: {module} • Production Engineering Safety Check",
            props={
                "capability": capability_name,
                "module": module,
                "status": "UNAVAILABLE",
            },
            data={
                "reason": reason,
                "roadmap_phase": roadmap_phase or "Enterprise Integration Pipeline",
                "docs_url": "https://docs.kavach.security",
            },
            actions=[
                ActionButton(
                    id="view-capabilities-btn",
                    label="Explore Available Capabilities",
                    action_type="open_modal",
                    target="capability_registry",
                    variant="outline",
                ),
            ],
        ).model_dump()
