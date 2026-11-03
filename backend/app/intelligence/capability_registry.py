"""
Kavach Platform Authoritative Capability Registry
Part of Phase 1: Complete Application Discovery & Capability Registry.

This registry serves as the deterministic source of truth for all security capabilities,
modules, backend APIs, data models, frontend routes, and authorized actions available in Kavach.
Zero fake capabilities or simulated functions are allowed.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum


class CapabilityStatus(str, Enum):
    IMPLEMENTED = "IMPLEMENTED"                  # Fully implemented and verified
    CONFIGURED = "CONFIGURED"                    # Available but requires tenant configuration
    REQUIRES_CONNECTION = "REQUIRES_CONNECTION"  # Requires cloud / external integration
    IN_DEVELOPMENT = "IN_DEVELOPMENT"            # Feature planned in roadmap, honest notification


@dataclass
class CapabilityCategory:
    name: str
    description: str


@dataclass
class PlatformCapability:
    capability_id: str
    name: str
    description: str
    module: str
    supported_intents: List[str]
    frontend_route: str
    existing_ui_components: List[str]
    backend_api: str
    data_sources: List[str]
    available_actions: List[str]
    required_permissions: List[str]
    implementation_status: CapabilityStatus
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def category(self) -> str:
        return self.module

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["implementation_status"] = self.implementation_status.value
        d["category"] = self.module
        return d


class CapabilityRegistry:
    """
    Central Authoritative Registry of all Kavach Platform capabilities.
    """
    _capabilities: Dict[str, PlatformCapability] = {}

    @classmethod
    def register(cls, cap: PlatformCapability) -> None:
        cls._capabilities[cap.capability_id] = cap

    @classmethod
    def get(cls, capability_id: str) -> Optional[PlatformCapability]:
        return cls._capabilities.get(capability_id)

    @classmethod
    def get_all(cls) -> List[PlatformCapability]:
        return list(cls._capabilities.values())

    @classmethod
    def get_all_capabilities(cls) -> List[PlatformCapability]:
        return list(cls._capabilities.values())

    @classmethod
    def get_all_categories(cls) -> List[CapabilityCategory]:
        modules: Dict[str, str] = {}
        for cap in cls._capabilities.values():
            if cap.module not in modules:
                modules[cap.module] = cap.description
        return [CapabilityCategory(name=m, description=d) for m, d in modules.items()]

    @classmethod
    def get_by_module(cls, module: str) -> List[PlatformCapability]:
        mod_lower = module.lower()
        return [c for c in cls._capabilities.values() if c.module.lower() == mod_lower]

    @classmethod
    def match_query(cls, query: str) -> List[PlatformCapability]:
        """
        Matches a natural language user query against registered capabilities.
        """
        q = query.lower().strip()
        matched: List[Tuple[int, PlatformCapability]] = []

        for cap in cls._capabilities.values():
            score = 0
            if cap.name.lower() in q:
                score += 5
            if cap.module.lower() in q:
                score += 3
            for intent in cap.supported_intents:
                if intent.lower() in q:
                    score += 2
                elif any(word in q for word in intent.lower().split() if len(word) > 3):
                    score += 1
            if score > 0:
                matched.append((score, cap))

        matched.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in matched]


# ─────────────────────────────────────────────────────────────────────────────
# Pre-Register All Real Platform Capabilities across 10 Core Modules
# ─────────────────────────────────────────────────────────────────────────────

def _initialize_capability_registry():
    # ── MODULE 1: TEAM MANAGEMENT & ADMINISTRATION ───────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="team.invite_member",
        name="Invite Workspace & Organization Member",
        description="Dispatches cryptographic email invitations to new team members with granular RBAC role assignments.",
        module="Team Management",
        supported_intents=["invite", "invite user", "invite member", "add team member", "give this user", "send invitation"],
        frontend_route="/settings",
        existing_ui_components=["MemberInviteCard", "MemberInviteSuccessCard", "InviteMemberForm", "TeamMembersPanel"],
        backend_api="/api/v1/assistant/members/invite",
        data_sources=["invitations", "organization_members", "users"],
        available_actions=["send_invite", "cancel_invite", "revoke_invite", "resend_invite"],
        required_permissions=["admin", "owner"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["PostgreSQL Invitations Table", "SMTP/Email Service"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="team.list_members",
        name="List Organization & Workspace Members",
        description="Lists active members, assigned roles, permissions, and pending membership invitations.",
        module="Team Management",
        supported_intents=["show members", "list members", "team members", "who has access", "user roles"],
        frontend_route="/settings",
        existing_ui_components=["TeamMembersPanel", "MemberDetailsPanel", "RoleManagementPanel"],
        backend_api="/api/v1/workspaces/members",
        data_sources=["organization_members", "users"],
        available_actions=["view_profile", "edit_role", "remove_member"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["PostgreSQL OrganizationMember Table"],
    ))

    # ── MODULE 2: REPOSITORIES & PROJECTS ────────────────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="repository.connect_github",
        name="Connect GitHub Organization & Repositories",
        description="Integrates GitHub account to discover repositories, branches, and register automated webhooks.",
        module="Repositories",
        supported_intents=["connect github", "add repo", "add repository", "connect repo", "link github"],
        frontend_route="/repositories",
        existing_ui_components=["ConnectGithubModal", "SelectRepositoriesModal", "RepositoryListCard"],
        backend_api="/api/v1/github/authorize",
        data_sources=["github_repositories", "projects"],
        available_actions=["authorize_oauth", "select_repositories", "sync_branches"],
        required_permissions=["developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["GitHub App / OAuth App"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="repository.list",
        name="List Monitored Repositories",
        description="Lists all repositories connected to the active project workspace with branch tracking.",
        module="Repositories",
        supported_intents=["show repo", "list repo", "my repo", "connected repo", "available repositories"],
        frontend_route="/repositories",
        existing_ui_components=["RepositoryListCard", "RepositoryExplorer"],
        backend_api="/api/v1/assistant/repositories",
        data_sources=["github_repositories"],
        available_actions=["select_repository", "switch_branch", "remove_repository"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["GitHub Integration"],
    ))

    # ── MODULE 3: CODE SECURITY (SAST, SECRETS, SCA, IAC) ───────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="code_security.scan",
        name="Trigger Multi-Engine Security Scan",
        description="Executes deterministic security scanners (Semgrep SAST, Gitleaks Secrets, Checkov IaC, OSV SCA) against source code.",
        module="Code Security",
        supported_intents=["scan", "scan repo", "scan repository", "scan my code", "audit code", "run scan", "start scan"],
        frontend_route="/scans",
        existing_ui_components=["ScanResultsCard", "ScanExecutionTimeline", "DynamicFindingsTableCard"],
        backend_api="/api/v1/assistant/scans/trigger",
        data_sources=["security_scans", "security_findings", "scanner_executions"],
        available_actions=["trigger_scan", "cancel_scan", "view_logs", "download_report"],
        required_permissions=["developer", "admin", "security_engineer"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["Semgrep", "Gitleaks", "Checkov", "OSV Scanner"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="code_security.findings_query",
        name="Query & Filter Security Findings",
        description="Retrieves security vulnerabilities filtered by severity, repository, scanner, and CWE/CVE identifier.",
        module="Code Security",
        supported_intents=["show critical", "find critical", "critical vulnerabilities", "show findings", "list findings"],
        frontend_route="/findings",
        existing_ui_components=["DynamicFindingsTableCard", "FindingDetailModal", "VulnerabilityExplorer"],
        backend_api="/api/v1/findings",
        data_sources=["security_findings"],
        available_actions=["inspect_finding", "mark_false_positive", "generate_patch", "create_pr"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["PostgreSQL SecurityFinding Table"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="code_security.investigate_finding",
        name="Investigate Vulnerability Details & Secrets",
        description="Inspects vulnerability root cause, file/line location, redacted code evidence, and technical remediation guidance.",
        module="Code Security",
        supported_intents=["explain finding", "explain vulnerability", "investigate finding", "hardcoded github personal access token", "explain token"],
        frontend_route="/findings",
        existing_ui_components=["DynamicVulnerabilityDetailCard", "FindingDetailModal"],
        backend_api="/api/v1/findings/{finding_id}",
        data_sources=["security_findings", "source_code"],
        available_actions=["generate_patch", "create_pr", "view_snippet", "rescan_file"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["SecurityFinding Model", "Source File Reader"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="code_security.remediate_patch",
        name="Generate AST-Verified Remediation Patch",
        description="Generates deterministic unified code diff to fix the identified vulnerability with syntax validation.",
        module="Code Security",
        supported_intents=["fix this", "fix issue", "auto fix", "remediate", "generate patch", "suggest fix"],
        frontend_route="/assistant",
        existing_ui_components=["DynamicVulnerabilityDetailCard", "CreatePRModal"],
        backend_api="/api/v1/autofix/generate",
        data_sources=["security_findings", "source_code"],
        available_actions=["review_diff", "approve_patch", "create_github_pr"],
        required_permissions=["developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["Autofix Engine"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="code_security.create_pull_request",
        name="Create Automated GitHub Remediation PR",
        description="Dispatches authenticated pull requests with the validated security fix directly to the remote repository.",
        module="Code Security",
        supported_intents=["create pull request", "create pr", "open pr", "open pull request", "make a pr"],
        frontend_route="/pull-requests",
        existing_ui_components=["CreatePRModal"],
        backend_api="/api/v1/pull-requests",
        data_sources=["pull_requests", "github_repositories"],
        available_actions=["submit_pr", "view_on_github", "merge_pr"],
        required_permissions=["developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["GitHub Integration with Write Access"],
    ))

    # ── MODULE 4: API SECURITY (DAST & OWASP API TOP 10) ─────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="api_security.scan",
        name="OWASP API Security Top 10 Assessment",
        description="Discovers endpoints and evaluates BOLA, broken authentication, excessive data exposure, and rate limiting.",
        module="API Security",
        supported_intents=["api security", "api scan", "scan api", "test api", "owasp api", "api endpoints", "fuzz api"],
        frontend_route="/api-security",
        existing_ui_components=["ApiSecurityResultsCard", "APIInventoryPanel", "APIFindingExplorer"],
        backend_api="/api/v1/api-security/scans",
        data_sources=["api_targets", "api_endpoints", "api_findings", "api_test_cases"],
        available_actions=["run_api_scan", "add_endpoint", "view_owasp_breakdown"],
        required_permissions=["developer", "admin", "security_engineer"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["API Security Scanner Engine"],
    ))

    # ── MODULE 5: CLOUD SECURITY (CSPM, CIEM, IAC POSTURE) ───────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="cloud_security.posture",
        name="Cloud Infrastructure Security Posture & Risks",
        description="Evaluates connected AWS, Azure, and GCP accounts for misconfigurations, public buckets, and IAM privilege risks.",
        module="Cloud Security",
        supported_intents=[
            "cloud infrastructure", "cloud security", "security risks in my cloud",
            "aws security", "azure security", "gcp security", "cloud misconfigurations", "cloud posture"
        ],
        frontend_route="/cloud-security",
        existing_ui_components=["CloudPostureDashboard", "CloudAssetInventory", "IAMRiskExplorer"],
        backend_api="/api/v1/cloud/posture",
        data_sources=["cloud_connections", "cloud_resources", "cloud_security_observations", "cloud_iam_principals"],
        available_actions=["connect_cloud", "sync_cloud_assets", "remediate_misconfiguration", "enforce_scp"],
        required_permissions=["viewer", "developer", "admin", "security_engineer"],
        implementation_status=CapabilityStatus.CONFIGURED,
        dependencies=["Cloud Provider Connections (AWS / Azure / GCP)"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="cloud_security.connect",
        name="Connect Cloud Infrastructure Account",
        description="Authenticates AWS IAM roles, Azure service principals, or GCP service accounts for continuous CSPM auditing.",
        module="Cloud Security",
        supported_intents=["connect aws", "connect azure", "connect gcp", "add cloud account", "link aws"],
        frontend_route="/cloud-security/connect",
        existing_ui_components=["ProposedIntegrationCard", "ConnectingIntegrationCard"],
        backend_api="/api/v1/assistant/integrations/connect",
        data_sources=["cloud_connections", "real_integrations"],
        available_actions=["authenticate_cloud_role", "verify_credentials", "disconnect_cloud"],
        required_permissions=["admin", "security_engineer"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["Cloud IAM Roles / STS"],
    ))

    # ── MODULE 6: CONTAINER & KUBERNETES SECURITY ────────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="container_security.audit",
        name="Container Image & Kubernetes Security Audit",
        description="Scans Dockerfiles, container base images, and Kubernetes manifests for known CVEs, root user usage, and misconfigurations.",
        module="Container Security",
        supported_intents=["container security", "check container", "docker security", "dockerfile", "kubernetes audit", "k8s posture"],
        frontend_route="/container-security",
        existing_ui_components=["ContainerInventory", "ImageScanResults", "ContainerFindingDetails"],
        backend_api="/api/v1/container-security/scans",
        data_sources=["container_scan_models", "container_runtime_models", "kubernetes_models"],
        available_actions=["scan_image", "audit_manifest", "view_cves"],
        required_permissions=["developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["Trivy Container Scanner", "Docker Daemon"],
    ))

    # ── MODULE 7: CI/CD SECURITY & DRIFT ─────────────────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="cicd_security.pipeline_gates",
        name="CI/CD Pipeline Security Gates & Drift",
        description="Inspects GitHub Actions, GitLab CI, and Jenkins workflows to block pull requests failing security policies.",
        module="CI/CD Security",
        supported_intents=["cicd security", "pipeline security", "security gates", "branch drift", "jenkins security"],
        frontend_route="/cicd",
        existing_ui_components=["PipelineSecurityPanel", "WorkflowExplorer", "SecurityGateConfiguration"],
        backend_api="/api/v1/cicd/pipelines",
        data_sources=["cicd_pipelines", "iac_drift_models"],
        available_actions=["enforce_quality_gate", "inspect_pipeline_runs", "audit_workflow_yaml"],
        required_permissions=["developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["GitHub Actions Webhook", "GitLab CI"],
    ))

    # ── MODULE 8: RUNTIME PROTECTION & THREATS ───────────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="runtime_protection.incidents",
        name="Runtime Threat Correlation & Audit Trail",
        description="Monitors live production security events, detects anomalous executions, and correlates with SIEM systems.",
        module="Runtime Protection",
        supported_intents=["runtime activity", "runtime threat", "monitor security", "security incidents", "audit logs"],
        frontend_route="/runtime",
        existing_ui_components=["RuntimeActivityPanel", "ThreatInvestigationPanel", "IncidentTimeline"],
        backend_api="/api/v1/incidents",
        data_sources=["audit_events", "incident_models", "threat_intel_models"],
        available_actions=["investigate_incident", "export_audit_log", "isolate_workload"],
        required_permissions=["security_engineer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["Audit Service", "SIEM Connector"],
    ))

    # ── MODULE 9: AI AGENT GOVERNANCE & MCP SECURITY ─────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="agent_governance.audit",
        name="AI Agent Governance & MCP Tool Execution Audit",
        description="Enforces strict deterministic policy boundaries, human-in-the-loop approvals, and immutable audit logs on AI actions.",
        module="Agent Governance",
        supported_intents=["agent governance", "mcp security", "agent permissions", "audit agent", "tool execution history", "approval queue"],
        frontend_route="/agent-governance",
        existing_ui_components=["ActiveAgentsModal", "AgentInventoryPanel", "AgentPermissionEditor", "ApprovalQueue"],
        backend_api="/api/v1/agent-governance/tools",
        data_sources=["ai_action_executions", "agent_governance", "mcp_tool_records"],
        available_actions=["approve_action", "reject_action", "revoke_tool_permission", "view_execution_trace"],
        required_permissions=["admin", "security_engineer"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["OPA Policy Engine", "MCP Security Gateway"],
    ))

    # ── MODULE 10: GOVERNANCE, POLICIES & REPORTING ──────────────────────────
    CapabilityRegistry.register(PlatformCapability(
        capability_id="governance.policy_create",
        name="Create & Enforce Security Policy (OPA Rego)",
        description="Authoritatively defines and validates infrastructure security policies across repositories and cloud accounts.",
        module="Governance",
        supported_intents=["create policy", "enforce policy", "block public s3", "security policy", "add policy"],
        frontend_route="/policies",
        existing_ui_components=["PolicyProposalCard", "PolicyEnforcementProgressCard", "PolicySuccessCard"],
        backend_api="/api/v1/assistant/policies/create-and-enforce",
        data_sources=["security_policies", "security_policy_versions"],
        available_actions=["create_and_enforce", "edit_policy", "toggle_policy"],
        required_permissions=["admin", "security_engineer"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["OPA Policy Engine"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="governance.report_generate",
        name="Generate Authoritative Security Posture Report",
        description="Synthesizes scan results, compliance posture (SOC 2, OWASP), and cryptographic evidence into audit-ready PDF/MD.",
        module="Governance",
        supported_intents=["generate report", "security report", "posture report", "export report", "audit report"],
        frontend_route="/reports",
        existing_ui_components=["SecurityReportModal", "ReportPreviewPanel"],
        backend_api="/api/v1/assistant/reports/download",
        data_sources=["security_findings", "security_scans", "security_policies"],
        available_actions=["download_markdown", "download_pdf", "email_report"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["ReportLab / PDF Generator"],
    ))

    CapabilityRegistry.register(PlatformCapability(
        capability_id="governance.overall_posture",
        name="Aggregate Security Posture & Health Score",
        description="Calculates real-time health scores (0-100) and grade (A-D) across all code, container, API, and cloud assets.",
        module="Governance",
        supported_intents=["security posture", "overall posture", "health status", "how secure is my code", "dashboard overview"],
        frontend_route="/assistant",
        existing_ui_components=["DynamicSecurityPostureCard", "FullDashboardModal"],
        backend_api="/api/v1/assistant/overview",
        data_sources=["security_findings", "security_scans", "github_repositories", "real_integrations", "security_policies"],
        available_actions=["open_dashboard", "trigger_scan", "view_critical_findings"],
        required_permissions=["viewer", "developer", "admin"],
        implementation_status=CapabilityStatus.IMPLEMENTED,
        dependencies=["PostgreSQL Aggregations"],
    ))


_initialize_capability_registry()
