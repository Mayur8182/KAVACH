"""
Kavach Central Tool Registry & Action Planner
Part of Stage 3: Tool Registry & Action Planner in the Universal AI Action Engine.

Core Architectural Directives:
- LLM proposes. Deterministic security systems decide. Runtime evidence proves.
- Every supported Kavach capability is explicitly registered with typed input/output schemas,
  RBAC permissions, risk classifications, approval requirements, and UI response schemas.
- Zero mock or placeholder capabilities. If an operation is unsupported, it must be reported honestly.
"""

import os
import uuid
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from pydantic import BaseModel, Field

logger = logging.getLogger("kavach.tool_registry")


class ToolRiskLevel(str, Enum):
    READ_ONLY = "READ_ONLY"          # Zero side-effects: queries, status, listings
    LOW_RISK = "LOW_RISK"            # Safe proposals: explanations, suggestions, patch previews
    SENSITIVE = "SENSITIVE"          # State mutations: patch commits, pull requests, invite members, integration links
    HIGH_RISK = "HIGH_RISK"          # Privileged/Critical: policy enforcement, cloud changes, deletions


class UIComponentType(str, Enum):
    FINDINGS_TABLE = "findings_table"
    VULNERABILITY_DETAIL = "vulnerability_detail"
    CODE_DIFF = "code_diff"
    SCAN_RESULTS = "scan_results"
    API_SECURITY_CARD = "api_security_card"
    REPOSITORY_LIST = "repository_list"
    INTEGRATION_FLOW = "integration_flow"
    INTEGRATIONS_LIST = "integrations_list"
    POLICY_CARD = "policy_card"
    POLICIES_LIST = "policies_list"
    MEMBER_INVITE = "member_invite"
    REPORT_PREVIEW = "report_preview"
    SECURITY_POSTURE = "security_posture"
    APPROVAL_REQUEST = "approval_request"
    CLOUD_POSTURE = "cloud_posture"
    CLOUD_CONNECT_PROMPT = "cloud_connect_prompt"
    CONTAINER_INVENTORY = "container_inventory"
    CICD_PIPELINE_GATES = "cicd_pipeline_gates"
    AGENT_GOVERNANCE_CARD = "agent_governance_card"
    UNIVERSAL_DYNAMIC_CARD = "universal_dynamic_card"
    CAPABILITY_UNAVAILABLE = "capability_unavailable"
    EMPTY_STATE = "empty_state"
    ERROR_STATE = "error_state"


@dataclass
class ToolDefinition:
    id: str
    name: str
    description: str
    category: str
    supported_intents: List[str]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    required_permissions: List[str]
    risk_level: ToolRiskLevel
    requires_approval: bool
    execution_timeout_seconds: int
    ui_component: UIComponentType
    backend_method: str
    idempotent: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ActionPlan:
    plan_id: str
    detected_intent: str
    selected_tool: ToolDefinition
    parameters: Dict[str, Any]
    target_project_id: Optional[uuid.UUID]
    target_repository: Optional[str]
    target_branch: str
    risk_level: ToolRiskLevel
    requires_approval: bool
    expected_ui_component: UIComponentType
    prerequisites_met: bool = True
    validation_error: Optional[str] = None


class CentralToolRegistry:
    """
    Authoritative Registry of All Supported Kavach Security Capabilities.
    Maps natural-language intent to deterministic, verified platform operations.
    """

    _registry: Dict[str, ToolDefinition] = {}

    @classmethod
    def register(cls, tool: ToolDefinition) -> None:
        cls._registry[tool.id] = tool
        logger.debug(f"Registered Kavach tool: {tool.id} [{tool.risk_level}]")

    @classmethod
    def get(cls, tool_id: str) -> Optional[ToolDefinition]:
        return cls._registry.get(tool_id)

    @classmethod
    def get_all(cls) -> List[ToolDefinition]:
        return list(cls._registry.values())

    @classmethod
    def discover_tools(
        cls,
        intent_or_query: str,
        user_roles: Optional[List[str]] = None,
    ) -> List[ToolDefinition]:
        """
        Discovers the most relevant tools for an intent or query, filtered by user permissions.
        Ensures Gemini and the Action Planner only receive authorized, pertinent tools.
        """
        query_lower = intent_or_query.lower().strip()
        matched: List[ToolDefinition] = []

        for tool in cls._registry.values():
            # Check permissions
            if user_roles and tool.required_permissions:
                if not any(r in tool.required_permissions for r in user_roles) and "admin" not in user_roles:
                    continue

            # Match against supported intents
            score = 0
            for intent in tool.supported_intents:
                if intent.lower() in query_lower:
                    score += 1

            if score > 0:
                matched.append(tool)

        return matched

    @classmethod
    def create_plan(
        cls,
        tool: ToolDefinition,
        query: str,
        parameters: Dict[str, Any],
        project_id: Optional[uuid.UUID],
        repository: Optional[str],
        branch: str = "main",
        user_roles: Optional[List[str]] = None,
    ) -> ActionPlan:
        """
        Constructs and validates an actionable execution plan before running real backend code.
        """
        plan_id = f"plan-{uuid.uuid4().hex[:12]}"
        validation_error = None

        # Validate permissions
        if user_roles and tool.required_permissions:
            has_perm = any(r in tool.required_permissions for r in user_roles) or "admin" in user_roles
            if not has_perm:
                validation_error = f"User lacks required permissions: {tool.required_permissions}"

        return ActionPlan(
            plan_id=plan_id,
            detected_intent=query,
            selected_tool=tool,
            parameters=parameters,
            target_project_id=project_id,
            target_repository=repository,
            target_branch=branch,
            risk_level=tool.risk_level,
            requires_approval=tool.requires_approval,
            expected_ui_component=tool.ui_component,
            prerequisites_met=validation_error is None,
            validation_error=validation_error,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Pre-Register All Real Kavach Capabilities
# ─────────────────────────────────────────────────────────────────────────────

def _initialize_registry():
    """Initializes the comprehensive Kavach tool registry with all real capabilities."""

    # 1. REPOSITORY SCANNING (Multi-module / SAST / Secrets / IaC / SCA / Container)
    CentralToolRegistry.register(ToolDefinition(
        id="scan.start",
        name="Trigger Security Scan",
        description="Executes real automated security scanners (Semgrep, Gitleaks, Checkov, OSV) against repository code.",
        category="Scanning",
        supported_intents=[
            "scan", "scan repo", "scan repository", "scan my code", "audit code", "audit repository",
            "check security", "verify security", "run scan", "start scan", "trigger scan", "scan this repo"
        ],
        input_schema={
            "type": "object",
            "properties": {
                "repositories": {"type": "array", "items": {"type": "string"}},
                "branch": {"type": "string", "default": "main"},
                "scanners": {"type": "array", "items": {"type": "string"}},
            },
        },
        output_schema={"type": "object", "properties": {"scan_id": {"type": "string"}, "status": {"type": "string"}}},
        required_permissions=["developer", "admin", "security_engineer"],
        risk_level=ToolRiskLevel.LOW_RISK,
        requires_approval=False,
        execution_timeout_seconds=120,
        ui_component=UIComponentType.SCAN_RESULTS,
        backend_method="_handle_scan_action",
    ))

    # 2. SCAN HISTORY QUERY
    CentralToolRegistry.register(ToolDefinition(
        id="scan.list",
        name="List Security Scans",
        description="Retrieves the history of authentic security scans performed in the current workspace.",
        category="Scanning",
        supported_intents=["show scans", "list scans", "recent scans", "all scans", "view scans", "scan history"],
        input_schema={"type": "object", "properties": {"limit": {"type": "integer", "default": 10}}},
        output_schema={"type": "object", "properties": {"scans": {"type": "array"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.SCAN_RESULTS,
        backend_method="_handle_query_scans",
    ))

    # 3. FINDINGS QUERY & FILTERING
    CentralToolRegistry.register(ToolDefinition(
        id="finding.list",
        name="Query Security Findings",
        description="Queries authentic security findings from PostgreSQL with filtering by severity, repository, and scanner.",
        category="Vulnerabilities",
        supported_intents=[
            "show critical", "find critical", "critical vulnerabilities", "show all critical",
            "show findings", "list findings", "all findings", "top vulnerabilities", "vulnerabilities in my code"
        ],
        input_schema={
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "ALL"]},
                "repository": {"type": "string"},
                "limit": {"type": "integer", "default": 20},
            },
        },
        output_schema={"type": "object", "properties": {"findings": {"type": "array"}, "total": {"type": "integer"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.FINDINGS_TABLE,
        backend_method="_handle_query_findings",
    ))

    # 4. FINDING DETAIL & EXPLANATION
    CentralToolRegistry.register(ToolDefinition(
        id="finding.get_details",
        name="Investigate Vulnerability Details",
        description="Retrieves complete vulnerability metadata, affected file snippet, CWE/CVE mappings, and root cause analysis.",
        category="Vulnerabilities",
        supported_intents=[
            "explain finding", "explain vulnerability", "investigate finding", "investigate vulnerability",
            "explain the first", "tell me about this vulnerability", "finding details", "vulnerability details"
        ],
        input_schema={
            "type": "object",
            "properties": {"finding_id": {"type": "string"}, "query": {"type": "string"}},
        },
        output_schema={"type": "object", "properties": {"finding": {"type": "object"}, "explanation": {"type": "string"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=20,
        ui_component=UIComponentType.VULNERABILITY_DETAIL,
        backend_method="_handle_investigate_finding",
    ))

    # 5. REMEDIATION & PATCH GENERATION
    CentralToolRegistry.register(ToolDefinition(
        id="finding.remediate",
        name="Generate Vulnerability Remediation Patch",
        description="Generates an AST-verified deterministic unified code diff to fix the identified vulnerability.",
        category="Remediation",
        supported_intents=[
            "fix this", "fix issue", "auto fix", "remediate", "generate patch", "propose fix",
            "suggest fix", "how to fix", "fix vulnerability", "create patch"
        ],
        input_schema={
            "type": "object",
            "properties": {"finding_id": {"type": "string"}, "strategy": {"type": "string"}},
        },
        output_schema={"type": "object", "properties": {"diff": {"type": "string"}, "plan": {"type": "object"}}},
        required_permissions=["developer", "admin"],
        risk_level=ToolRiskLevel.LOW_RISK,
        requires_approval=False,
        execution_timeout_seconds=30,
        ui_component=UIComponentType.CODE_DIFF,
        backend_method="_handle_autofix_action",
    ))

    # 6. PULL REQUEST CREATION
    CentralToolRegistry.register(ToolDefinition(
        id="pull_request.create",
        name="Create Automated GitHub Pull Request",
        description="Dispatches a real pull request to GitHub containing the approved patch.",
        category="Remediation",
        supported_intents=[
            "create pull request", "create pr", "open pr", "open pull request", "make a pr", "submit pr"
        ],
        input_schema={
            "type": "object",
            "properties": {
                "finding_id": {"type": "string"},
                "title": {"type": "string"},
                "branch": {"type": "string"},
            },
        },
        output_schema={"type": "object", "properties": {"pr_url": {"type": "string"}, "pr_number": {"type": "integer"}}},
        required_permissions=["developer", "admin"],
        risk_level=ToolRiskLevel.SENSITIVE,
        requires_approval=True,
        execution_timeout_seconds=45,
        ui_component=UIComponentType.CODE_DIFF,
        backend_method="_handle_create_pr",
    ))

    # 7. API SECURITY TESTING ENGINE (OWASP API Top 10)
    CentralToolRegistry.register(ToolDefinition(
        id="api_security.scan",
        name="Run API Security Assessment",
        description="Tests discovered API targets against the OWASP API Security Top 10 vulnerabilities.",
        category="API Security",
        supported_intents=[
            "api security", "api scan", "scan api", "test api", "check api", "owasp api",
            "api endpoints", "test endpoints", "fuzz api", "rest api", "scan my api", "api vulnerability"
        ],
        input_schema={
            "type": "object",
            "properties": {"target_id": {"type": "string"}},
        },
        output_schema={"type": "object", "properties": {"endpoints_tested": {"type": "integer"}, "findings": {"type": "array"}}},
        required_permissions=["developer", "admin", "security_engineer"],
        risk_level=ToolRiskLevel.LOW_RISK,
        requires_approval=False,
        execution_timeout_seconds=60,
        ui_component=UIComponentType.API_SECURITY_CARD,
        backend_method="_handle_api_security_scan_action",
    ))

    # 8. REPOSITORY LIST & SELECT
    CentralToolRegistry.register(ToolDefinition(
        id="repository.list",
        name="List Connected Repositories",
        description="Lists all authenticated GitHub repositories accessible in the current workspace.",
        category="Repositories",
        supported_intents=[
            "show repo", "list repo", "my repo", "connected repo", "github repo",
            "repositories", "view repositories", "all repositories"
        ],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"repositories": {"type": "array"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.REPOSITORY_LIST,
        backend_method="_handle_list_repositories",
    ))

    CentralToolRegistry.register(ToolDefinition(
        id="repository.select",
        name="Select Active Repository Target",
        description="Sets the current active target repository context for subsequent operations.",
        category="Repositories",
        supported_intents=["select repo", "choose repo", "switch repo", "switch to repo", "use repo"],
        input_schema={"type": "object", "required": ["repo_name"], "properties": {"repo_name": {"type": "string"}}},
        output_schema={"type": "object", "properties": {"selected": {"type": "string"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=5,
        ui_component=UIComponentType.REPOSITORY_LIST,
        backend_method="_handle_select_repository",
    ))

    # 9. INTEGRATIONS (Jira, Slack, GitHub, GitLab, AWS, Datadog, etc.)
    CentralToolRegistry.register(ToolDefinition(
        id="integration.connect",
        name="Connect External Integration",
        description="Authenticates and configures an external service integration (Jira, Slack, AWS, Datadog, etc.).",
        category="Integrations",
        supported_intents=[
            "connect slack", "connect jira", "connect aws", "connect github", "connect gitlab",
            "connect datadog", "connect pagerduty", "connect sentry", "connect splunk", "connect linear",
            "connect discord", "connect integration", "setup integration", "link service"
        ],
        input_schema={
            "type": "object",
            "required": ["provider"],
            "properties": {"provider": {"type": "string"}, "credentials": {"type": "object"}},
        },
        output_schema={"type": "object", "properties": {"status": {"type": "string"}, "provider": {"type": "string"}}},
        required_permissions=["admin", "security_engineer"],
        risk_level=ToolRiskLevel.SENSITIVE,
        requires_approval=False,
        execution_timeout_seconds=30,
        ui_component=UIComponentType.INTEGRATION_FLOW,
        backend_method="_handle_connect_integration_intent",
    ))

    CentralToolRegistry.register(ToolDefinition(
        id="integration.list",
        name="List Configured Integrations",
        description="Lists all active and configured external service integrations in the workspace.",
        category="Integrations",
        supported_intents=[
            "show all active integrations", "show active integrations", "list integrations",
            "show integrations", "view integrations", "my integrations"
        ],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"integrations": {"type": "array"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.INTEGRATIONS_LIST,
        backend_method="_handle_list_integrations_intent",
    ))

    # 10. POLICIES (Creation & Enforcement)
    CentralToolRegistry.register(ToolDefinition(
        id="policy.create",
        name="Create & Enforce Security Policy",
        description="Proposes, validates with OPA, and enforces infrastructure security policies across accounts.",
        category="Governance",
        supported_intents=[
            "block public s3", "block public s3 buckets", "enforce this policy", "create a security policy",
            "create a policy", "create policy", "enforce policy", "add policy"
        ],
        input_schema={
            "type": "object",
            "properties": {"policy_name": {"type": "string"}, "scope": {"type": "string", "default": "GLOBAL"}},
        },
        output_schema={"type": "object", "properties": {"policy_id": {"type": "string"}, "status": {"type": "string"}}},
        required_permissions=["admin", "security_engineer"],
        risk_level=ToolRiskLevel.HIGH_RISK,
        requires_approval=False,
        execution_timeout_seconds=30,
        ui_component=UIComponentType.POLICY_CARD,
        backend_method="_handle_create_policy_intent",
    ))

    CentralToolRegistry.register(ToolDefinition(
        id="policy.list",
        name="List Security Policies",
        description="Lists all security governance policies and active enforcement quality gates.",
        category="Governance",
        supported_intents=["show policies", "list policies", "all policies", "view policies", "security policies"],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"policies": {"type": "array"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.POLICIES_LIST,
        backend_method="_handle_query_policies",
    ))

    # 11. WORKSPACE MEMBERS & INVITATIONS
    CentralToolRegistry.register(ToolDefinition(
        id="workspace.members.invite",
        name="Invite Workspace Member",
        description="Sends a cryptographic invitation to a new team member with assigned RBAC role.",
        category="Administration",
        supported_intents=["invite", "invite user", "invite member", "add team member", "give this user"],
        input_schema={
            "type": "object",
            "required": ["email"],
            "properties": {"email": {"type": "string"}, "role": {"type": "string", "default": "Viewer"}},
        },
        output_schema={"type": "object", "properties": {"invitation_id": {"type": "string"}, "email": {"type": "string"}}},
        required_permissions=["admin"],
        risk_level=ToolRiskLevel.SENSITIVE,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.MEMBER_INVITE,
        backend_method="_handle_invite_member_intent",
    ))

    # 12. SECURITY REPORTING
    CentralToolRegistry.register(ToolDefinition(
        id="report.generate",
        name="Generate Authoritative Security Report",
        description="Synthesizes findings, scanner evidence, and compliance posture into an audit-ready Markdown/PDF report.",
        category="Reporting",
        supported_intents=["report", "generate report", "create report", "export report", "security report", "posture report"],
        input_schema={"type": "object", "properties": {"format": {"type": "string", "default": "markdown"}}},
        output_schema={"type": "object", "properties": {"report_content": {"type": "string"}, "download_url": {"type": "string"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.LOW_RISK,
        requires_approval=False,
        execution_timeout_seconds=30,
        ui_component=UIComponentType.REPORT_PREVIEW,
        backend_method="_handle_report_action",
    ))

    # 13. OVERALL SECURITY POSTURE / DASHBOARD OVERVIEW
    CentralToolRegistry.register(ToolDefinition(
        id="security_posture.get",
        name="Get Security Posture Overview",
        description="Queries real aggregated health metrics, active scans, critical issue counts, and coverage across all modules.",
        category="Posture",
        supported_intents=[
            "security posture", "overall posture", "posture overview", "show posture", "posture of my project",
            "dashboard overview", "health status", "how secure is my code", "security status"
        ],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"score": {"type": "integer"}, "critical_count": {"type": "integer"}}},
        required_permissions=["viewer", "developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.SECURITY_POSTURE,
        backend_method="_handle_security_posture_action",
    ))

    # 14. CLOUD INFRASTRUCTURE SECURITY POSTURE (AWS, Azure, GCP)
    CentralToolRegistry.register(ToolDefinition(
        id="cloud.posture",
        name="Inspect Cloud Security Posture",
        description="Inspects real connected AWS, Azure, and GCP accounts for misconfigurations, IAM risks, and compliance.",
        category="Cloud Security",
        supported_intents=[
            "cloud infrastructure", "cloud security", "security risks in my cloud",
            "aws security", "azure security", "gcp security", "cloud misconfigurations", "cloud posture"
        ],
        input_schema={"type": "object", "properties": {"provider": {"type": "string"}}},
        output_schema={"type": "object", "properties": {"connections": {"type": "array"}, "assets_count": {"type": "integer"}}},
        required_permissions=["viewer", "developer", "admin", "security_engineer"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=20,
        ui_component=UIComponentType.CLOUD_POSTURE,
        backend_method="_handle_cloud_security_action",
    ))

    # 15. CONTAINER & KUBERNETES SECURITY AUDIT
    CentralToolRegistry.register(ToolDefinition(
        id="container.audit",
        name="Audit Container & Kubernetes Security",
        description="Scans container base images, Dockerfiles, and Kubernetes manifests for vulnerabilities and misconfigurations.",
        category="Container Security",
        supported_intents=["container security", "check container", "docker security", "dockerfile", "kubernetes audit", "k8s posture"],
        input_schema={"type": "object", "properties": {"target": {"type": "string"}}},
        output_schema={"type": "object", "properties": {"images_scanned": {"type": "integer"}, "cves": {"type": "array"}}},
        required_permissions=["developer", "admin"],
        risk_level=ToolRiskLevel.LOW_RISK,
        requires_approval=False,
        execution_timeout_seconds=45,
        ui_component=UIComponentType.CONTAINER_INVENTORY,
        backend_method="_handle_container_security_action",
    ))

    # 16. CI/CD PIPELINE SECURITY GATES
    CentralToolRegistry.register(ToolDefinition(
        id="cicd.pipeline_gates",
        name="Inspect CI/CD Pipeline Security Gates",
        description="Reviews GitHub Actions, GitLab CI, and Jenkins workflows to evaluate security policy enforcement.",
        category="CI/CD Security",
        supported_intents=["cicd security", "pipeline security", "security gates", "branch drift", "jenkins security"],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"pipelines": {"type": "array"}}},
        required_permissions=["developer", "admin"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.CICD_PIPELINE_GATES,
        backend_method="_handle_cicd_security_action",
    ))

    # 17. AI AGENT GOVERNANCE & TOOL EXECUTION AUDIT
    CentralToolRegistry.register(ToolDefinition(
        id="agent_governance.audit",
        name="Audit AI Agent Governance & Approvals",
        description="Inspects autonomous AI agent actions, pending approval queues, and immutable tool authorization trails.",
        category="Agent Governance",
        supported_intents=["agent governance", "mcp security", "agent permissions", "audit agent", "tool execution history", "approval queue"],
        input_schema={"type": "object", "properties": {}},
        output_schema={"type": "object", "properties": {"pending_approvals": {"type": "array"}, "executions": {"type": "array"}}},
        required_permissions=["admin", "security_engineer"],
        risk_level=ToolRiskLevel.READ_ONLY,
        requires_approval=False,
        execution_timeout_seconds=15,
        ui_component=UIComponentType.AGENT_GOVERNANCE_CARD,
        backend_method="_handle_agent_governance_action",
    ))


_initialize_registry()
