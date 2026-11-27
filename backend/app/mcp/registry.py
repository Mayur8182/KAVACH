from typing import Any, Callable, Dict, List, Optional
from app.mcp.schemas import ToolDefinition
from app.mcp.tools.projects import (
    execute_connect_repository,
    execute_create_project,
    execute_get_active_project,
    execute_get_available_permissions,
    execute_get_connection_status,
    execute_get_current_user,
    execute_get_project,
    execute_get_workspace,
    execute_list_projects,
    execute_list_workspaces,
    execute_set_active_project,
)
from app.mcp.tools.security import (
    execute_check_security_policy,
    execute_generate_security_blueprint,
    execute_get_security_blueprint,
    execute_get_security_requirements,
    execute_list_security_policies,
)
from app.mcp.tools.scans import (
    execute_get_scan,
    execute_run_security_scan,
    execute_security_check,
)
from app.mcp.tools.github import (
    execute_apply_remediation_patch,
    execute_create_branch,
    execute_create_pull_request,
    execute_get_file_content,
    execute_get_github_repository,
    execute_get_pull_request,
    execute_list_github_repositories,
    execute_list_pull_requests,
)
from app.mcp.tools.remediation import (
    execute_get_finding_detail,
    execute_propose_remediation_diff,
    execute_update_finding_status,
    execute_verify_patch,
    execute_verify_remediation_patch,
)
from app.mcp.tools.cloud_infra import (
    execute_audit_cloud_posture,
    execute_get_cloud_inventory,
    execute_scan_container_image_security,
)
from app.mcp.tools.threat_response import (
    execute_query_threat_intelligence,
    execute_get_active_incidents,
    execute_quarantine_compromised_target,
    execute_audit_attack_surface,
    execute_simulate_attack_path,
)
from app.mcp.tools.governance_compliance import (
    execute_audit_compliance_framework,
    execute_scan_sensitive_data_posture,
    execute_audit_agent_permissions_posture,
)
from app.mcp.tools.posture_audit import (
    execute_list_project_findings,
    execute_get_project_posture,
    execute_list_pending_approvals,
    execute_get_mcp_audit_trail,
)


class MCPToolRegistry:
    """
    Central registry of real tools executable via the MCP Gateway.
    Defines schemas, required permissions, risk levels, and dispatch handlers.
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._handlers: Dict[str, Callable] = {}
        self._register_default_tools()

    def _register_default_tools(self) -> None:
        # 0. list_projects (Phase 1)
        self.register(
            ToolDefinition(
                name="list_projects",
                description="List all verified security projects owned by the authenticated user with pagination and tenant isolation.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of projects to return (1-100, default 20)",
                            "default": 20,
                        },
                        "offset": {
                            "type": "integer",
                            "description": "Offset pagination cursor (default 0)",
                            "default": 0,
                        },
                    },
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "total_count": {"type": "integer"},
                        "limit": {"type": "integer"},
                        "offset": {"type": "integer"},
                        "projects": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "repository": {"type": "string"},
                                    "status": {"type": "string"},
                                    "created_at": {"type": "string"},
                                },
                            },
                        },
                    },
                },
            ),
            execute_list_projects,
        )

        # 1. get_project
        self.register(
            ToolDefinition(
                name="get_project",
                description="Retrieve verified project details and configuration from the security control plane.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"}
                    },
                    "required": ["project_id"],
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "repository_url": {"type": "string"},
                        "status": {"type": "string"},
                    },
                },
            ),
            execute_get_project,
        )

        # 1b. Account, Workspace & Project Context Tools
        self.register(
            ToolDefinition(
                name="get_current_user",
                description="Identify the authenticated Kavach user account, default workspace/project, and active client scopes.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={"type": "object", "properties": {}},
            ),
            execute_get_current_user,
        )
        self.register(
            ToolDefinition(
                name="list_workspaces",
                description="List all Personal and Organization workspaces accessible to the authenticated Kavach user.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={"type": "object", "properties": {}},
            ),
            execute_list_workspaces,
        )
        self.register(
            ToolDefinition(
                name="get_workspace",
                description="Get details and projects for the active workspace (or specified workspace_id).",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {"workspace_id": {"type": "string", "description": "Optional workspace UUID"}},
                },
            ),
            execute_get_workspace,
        )
        self.register(
            ToolDefinition(
                name="get_active_project",
                description="Get the currently active or default Kavach project resolved for this AI client.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {"git_remote": {"type": "string", "description": "Optional Git remote URL to auto-match"}},
                },
            ),
            execute_get_active_project,
        )
        self.register(
            ToolDefinition(
                name="set_active_project",
                description="Switch the active project for this AI client (and optionally update your shared default project).",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Authorized project UUID"},
                        "git_remote": {"type": "string", "description": "Optional Git remote URL to match"},
                        "set_as_default": {"type": "boolean", "description": "Also set as shared default project across clients", "default": False},
                    },
                },
            ),
            execute_set_active_project,
        )
        self.register(
            ToolDefinition(
                name="create_project",
                description="Create a new project in your authorized Kavach workspace and set it as active.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_WRITE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Project name"},
                        "description": {"type": "string", "description": "Project description"},
                        "workspace_id": {"type": "string", "description": "Optional workspace UUID"},
                        "repository_url": {"type": "string", "description": "Optional Git repository URL"},
                        "environment": {"type": "string", "description": "Environment (production, staging, development)", "default": "production"},
                        "set_as_default": {"type": "boolean", "default": False},
                    },
                    "required": ["name"],
                },
            ),
            execute_create_project,
        )
        self.register(
            ToolDefinition(
                name="connect_repository",
                description="Associate an authorized GitHub repository or Git remote URL with a Kavach project.",
                version="1.0.0",
                category="GITHUB",
                required_permission="PROJECT_WRITE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "repository": {"type": "string", "description": "Repository full name (owner/repo) or URL"},
                        "project_id": {"type": "string", "description": "Target project UUID (defaults to active project)"},
                    },
                    "required": ["repository"],
                },
            ),
            execute_connect_repository,
        )
        self.register(
            ToolDefinition(
                name="get_connection_status",
                description="Check Kavach MCP authentication status, active project, granted scopes, and GitHub connection status.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={"type": "object", "properties": {}},
            ),
            execute_get_connection_status,
        )
        self.register(
            ToolDefinition(
                name="get_available_permissions",
                description="Return granted OAuth scopes and per-tool authorization capabilities for this connection.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={"type": "object", "properties": {}},
            ),
            execute_get_available_permissions,
        )

        # 2. get_security_blueprint
        self.register(
            ToolDefinition(
                name="get_security_blueprint",
                description="Retrieve the active dynamic security blueprint and requirements for the project.",
                version="1.0.0",
                category="BLUEPRINT",
                required_permission="BLUEPRINT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"}
                    },
                    "required": ["project_id"],
                },
            ),
            execute_get_security_blueprint,
        )

        # 3. get_security_requirements
        self.register(
            ToolDefinition(
                name="get_security_requirements",
                description="Retrieve active security blueprint requirements for compliance tracking.",
                version="1.0.0",
                category="BLUEPRINT",
                required_permission="BLUEPRINT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"}
                    },
                    "required": ["project_id"],
                },
            ),
            execute_get_security_requirements,
        )

        # 4. run_security_scan
        self.register(
            ToolDefinition(
                name="run_security_scan",
                description="Execute real security verification tools (Semgrep, Gitleaks, OSV, Trivy, Checkov) against project target.",
                version="1.0.0",
                category="SCAN",
                required_permission="SCAN_EXECUTE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Project UUID"},
                        "target_path": {"type": "string", "description": "Local workspace filesystem path to inspect"},
                        "scanners": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional subset of scanners to run",
                        },
                    },
                    "required": ["project_id"],
                },
            ),
            execute_run_security_scan,
        )

        # 5. security_check
        self.register(
            ToolDefinition(
                name="security_check",
                description="Perform a complete security verification check combining scanners and policy evaluation.",
                version="1.0.0",
                category="SECURITY",
                required_permission="SCAN_EXECUTE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "target": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "path": {"type": "string"},
                            },
                        },
                    },
                    "required": ["project_id"],
                },
            ),
            execute_security_check,
        )

        # 6. get_scan
        self.register(
            ToolDefinition(
                name="get_scan",
                description="Retrieve detailed scan findings, evidence, and requirement verification results.",
                version="1.0.0",
                category="SCAN",
                required_permission="SCAN_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "scan_id": {"type": "string", "description": "Security scan UUID"}
                    },
                    "required": ["scan_id"],
                },
            ),
            execute_get_scan,
        )

        # 7. check_security_policy
        self.register(
            ToolDefinition(
                name="check_security_policy",
                description="Query the deterministic Step 7 Policy Engine for an Allow/Warn/Block/Require_Approval decision.",
                version="1.0.0",
                category="POLICY",
                required_permission="POLICY_EVALUATE",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "operation": {"type": "string", "description": "Operation name to evaluate"},
                        "resource": {"type": "object", "description": "Resource attributes"},
                    },
                    "required": ["project_id", "operation"],
                },
            ),
            execute_check_security_policy,
        )

        # 8. get_github_repository
        self.register(
            ToolDefinition(
                name="get_github_repository",
                description="Retrieve linked GitHub repository metadata for the project.",
                version="1.0.0",
                category="GITHUB",
                required_permission="GITHUB_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"}
                    },
                    "required": ["project_id"],
                },
            ),
            execute_get_github_repository,
        )

        # 9. get_pull_request
        self.register(
            ToolDefinition(
                name="get_pull_request",
                description="Retrieve pull request security and commit details.",
                version="1.0.0",
                category="GITHUB",
                required_permission="GITHUB_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "pr_number": {"type": "integer", "description": "Pull request number"}
                    },
                    "required": ["pr_number"],
                },
            ),
            execute_get_pull_request,
        )

        # 10. propose_remediation_diff
        self.register(
            ToolDefinition(
                name="propose_remediation_diff",
                description="Synthesize a source-grounded unified diff patch to remediate a security finding using live repository file source.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="REMEDIATION_PROPOSE",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "finding_id": {"type": "string", "description": "Verified SecurityFinding UUID (recommended — auto-loads file_path & snippet)"},
                        "rule_id": {"type": "string", "description": "Security rule identifier (e.g., SAST-001, SEC-001)"},
                        "file_path": {"type": "string", "description": "Relative file path in repository"},
                        "branch": {"type": "string", "description": "Optional branch/ref name"},
                        "line_number": {"type": "integer", "description": "1-based line number of finding"},
                        "snippet": {"type": "string", "description": "Vulnerable source code line/snippet"},
                        "file_content": {"type": "string", "description": "Optional full file content (fetched automatically from GitHub if omitted)"},
                    },
                },
            ),
            execute_propose_remediation_diff,
        )

        # 11. verify_remediation_patch
        self.register(
            ToolDefinition(
                name="verify_remediation_patch",
                description="Verify in an isolated sandbox that applying the patch eliminates the vulnerability under real scanner execution.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="SCAN_EXECUTE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string", "description": "Optional SecurityFinding UUID"},
                        "patch_id": {"type": "string", "description": "Optional RemediationPatch UUID"},
                        "file_path": {"type": "string", "description": "Target file path in repository"},
                        "branch": {"type": "string", "description": "Remediation branch to fetch & scan (e.g. 'security/ai-remediation')"},
                        "original_content": {"type": "string", "description": "Pre-patch file content"},
                        "patched_content": {"type": "string", "description": "Post-patch file content (fetched from branch if omitted)"},
                        "rule_id": {"type": "string", "description": "Security rule that must be resolved"},
                        "scanner_type": {"type": "string", "description": "semgrep, gitleaks, checkov, osv, or seculayer-builtin"},
                    },
                },
            ),
            execute_verify_remediation_patch,
        )

        # 11b. get_file_content
        self.register(
            ToolDefinition(
                name="get_file_content",
                description="Retrieve actual source file contents from the connected GitHub repository or synced workspace.",
                version="1.0.0",
                category="GITHUB",
                required_permission="GITHUB_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Repository-relative file path (e.g. 'app/main.py')"},
                        "ref": {"type": "string", "description": "Branch name, tag, or commit SHA (defaults to repo default branch)"},
                        "branch": {"type": "string", "description": "Alias for 'ref'"},
                        "repository": {"type": "string", "description": "Optional 'owner/repo' override"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "start_line": {"type": "integer", "description": "Optional 1-based start line"},
                        "end_line": {"type": "integer", "description": "Optional 1-based end line"},
                    },
                    "required": ["file_path"],
                },
            ),
            execute_get_file_content,
        )

        # 11c. create_branch
        self.register(
            ToolDefinition(
                name="create_branch",
                description="Create a remediation branch (e.g. 'security/ai-remediation') on the connected GitHub repository without modifying main.",
                version="1.0.0",
                category="GITHUB",
                required_permission="REMEDIATION_APPLY",
                risk_level="HIGH",
                requires_approval=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "branch_name": {"type": "string", "description": "New branch name (e.g. 'security/ai-remediation')"},
                        "base_branch": {"type": "string", "description": "Base branch to fork from (defaults to repository default branch)"},
                        "repository": {"type": "string", "description": "Optional 'owner/repo' override"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                    "required": ["branch_name"],
                },
            ),
            execute_create_branch,
        )

        # 11d. apply_remediation_patch
        self.register(
            ToolDefinition(
                name="apply_remediation_patch",
                description="Apply and commit a verified unified diff or patched file content onto a remediation branch on GitHub.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="REMEDIATION_APPLY",
                risk_level="HIGH",
                requires_approval=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Repository-relative file path to patch"},
                        "branch": {"type": "string", "description": "Target remediation branch (default 'security/ai-remediation')"},
                        "finding_id": {"type": "string", "description": "Optional SecurityFinding UUID"},
                        "patch": {"type": "string", "description": "Unified diff string (--- a/... +++ b/... @@ ... @@)"},
                        "patched_content": {"type": "string", "description": "Optional complete patched file content instead of unified diff"},
                        "commit_message": {"type": "string", "description": "Commit message for GitHub commit"},
                        "create_branch_if_missing": {"type": "boolean", "default": True},
                        "repository": {"type": "string", "description": "Optional 'owner/repo' override"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                },
            ),
            execute_apply_remediation_patch,
        )

        # 11e. verify_patch
        self.register(
            ToolDefinition(
                name="verify_patch",
                description="Run real syntax checks and security scanners against patched source code (inline or on a GitHub branch) before opening a PR.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="SCAN_EXECUTE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string", "description": "Optional SecurityFinding UUID"},
                        "patch_id": {"type": "string", "description": "Optional RemediationPatch UUID"},
                        "file_path": {"type": "string", "description": "Repository-relative file path"},
                        "branch": {"type": "string", "description": "GitHub branch containing applied patch"},
                        "patched_content": {"type": "string", "description": "Optional patched file text (fetched from branch if omitted)"},
                        "original_content": {"type": "string", "description": "Optional pre-patch file text"},
                        "rule_id": {"type": "string", "description": "Rule ID being verified resolved"},
                        "scanner_type": {"type": "string", "description": "Scanner name (semgrep, gitleaks, checkov, osv, seculayer-builtin)"},
                        "mark_resolved": {"type": "boolean", "description": "Only marks finding resolved after real rescan passes with 0 matching findings", "default": False},
                    },
                },
            ),
            execute_verify_patch,
        )

        # 11f. create_pull_request
        self.register(
            ToolDefinition(
                name="create_pull_request",
                description="Open a reviewable Pull Request on the connected GitHub repository from a remediation branch (never auto-merges).",
                version="1.0.0",
                category="GITHUB",
                required_permission="REMEDIATION_APPLY",
                risk_level="HIGH",
                requires_approval=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "head_branch": {"type": "string", "description": "Source remediation branch (e.g. 'security/ai-remediation')"},
                        "base_branch": {"type": "string", "description": "Target base branch (defaults to repository default branch)"},
                        "title": {"type": "string", "description": "Pull request title"},
                        "body": {"type": "string", "description": "Markdown PR summary with findings & verification proof"},
                        "draft": {"type": "boolean", "default": False},
                        "repository": {"type": "string", "description": "Optional 'owner/repo' override"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                    "required": ["head_branch", "title"],
                },
            ),
            execute_create_pull_request,
        )

        # 12. audit_cloud_posture
        self.register(
            ToolDefinition(
                name="audit_cloud_posture",
                description="Audit cloud security posture, active observations, and IAM security across AWS, GCP, and Azure.",
                version="1.0.0",
                category="CLOUD",
                required_permission="CLOUD_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_audit_cloud_posture,
        )

        # 13. get_cloud_inventory
        self.register(
            ToolDefinition(
                name="get_cloud_inventory",
                description="Retrieve live verified cloud assets, compute nodes, and storage instances.",
                version="1.0.0",
                category="CLOUD",
                required_permission="CLOUD_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "limit": {"type": "integer", "description": "Maximum items to retrieve"},
                    },
                },
            ),
            execute_get_cloud_inventory,
        )

        # 14. scan_container_image_security
        self.register(
            ToolDefinition(
                name="scan_container_image_security",
                description="Scan and retrieve container image CVE vulnerabilities and package details.",
                version="1.0.0",
                category="INFRASTRUCTURE",
                required_permission="SCAN_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_scan_container_image_security,
        )

        # 15. query_threat_intelligence
        self.register(
            ToolDefinition(
                name="query_threat_intelligence",
                description="Correlate threat indicators, IOCs, and active attacker telemetry against threat intel feeds.",
                version="1.0.0",
                category="THREAT",
                required_permission="THREAT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "query": {"type": "string", "description": "Search keyword or IOC indicator"},
                    },
                },
            ),
            execute_query_threat_intelligence,
        )

        # 16. get_active_incidents
        self.register(
            ToolDefinition(
                name="get_active_incidents",
                description="Retrieve active security incidents, severity levels, and response status.",
                version="1.0.0",
                category="INCIDENT",
                required_permission="INCIDENT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_get_active_incidents,
        )

        # 17. quarantine_compromised_target
        self.register(
            ToolDefinition(
                name="quarantine_compromised_target",
                description="Contain an active attack by isolating a compromised host or revoking a token. Requires operator approval.",
                version="1.0.0",
                category="INCIDENT",
                required_permission="INCIDENT_WRITE",
                risk_level="CRITICAL",
                requires_approval=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "target_id": {"type": "string", "description": "Identifier of target to quarantine"},
                        "target_type": {"type": "string", "description": "HOST, CONTAINER, or TOKEN"},
                        "reason": {"type": "string", "description": "Security justification for containment"},
                    },
                    "required": ["target_id"],
                },
            ),
            execute_quarantine_compromised_target,
        )

        # 18. audit_compliance_framework
        self.register(
            ToolDefinition(
                name="audit_compliance_framework",
                description="Audit control compliance against SOC2 Type II, ISO 27001, or HIPAA frameworks.",
                version="1.0.0",
                category="COMPLIANCE",
                required_permission="COMPLIANCE_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "framework": {"type": "string", "description": "SOC2_TYPE_II, ISO_27001, or HIPAA"},
                    },
                },
            ),
            execute_audit_compliance_framework,
        )

        # 19. scan_sensitive_data_posture
        self.register(
            ToolDefinition(
                name="scan_sensitive_data_posture",
                description="Audit Data Security Posture Management (DSPM), PII classifications, and database sensitivity.",
                version="1.0.0",
                category="DATA",
                required_permission="DATA_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_scan_sensitive_data_posture,
        )

        # 20. audit_agent_permissions_posture
        self.register(
            ToolDefinition(
                name="audit_agent_permissions_posture",
                description="Audit AI agent sessions, permissions, delegation chains, and privilege escalation risks.",
                version="1.0.0",
                category="AGENT",
                required_permission="AGENT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_audit_agent_permissions_posture,
        )

        # 21. audit_attack_surface
        self.register(
            ToolDefinition(
                name="audit_attack_surface",
                description="Audit the external attack surface, exposed endpoints, open ports, and attack paths for the project.",
                version="1.0.0",
                category="ATTACK",
                required_permission="ATTACK_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                    },
                },
            ),
            execute_audit_attack_surface,
        )

        # 22. simulate_attack_path
        self.register(
            ToolDefinition(
                name="simulate_attack_path",
                description="Simulate an autonomous red-team attack path / DAST vulnerability assessment against an authorized target endpoint.",
                version="1.0.0",
                category="ATTACK",
                required_permission="ATTACK_EXECUTE",
                risk_level="HIGH",
                requires_approval=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "target_url": {"type": "string", "description": "Target URL to assess (must belong to project attack surface)"},
                        "scan_profile": {"type": "string", "description": "Scan profile: FULL_ACTIVE, PASSIVE_ONLY, or API_FUZZ"},
                    },
                    "required": ["target_url"],
                },
            ),
            execute_simulate_attack_path,
        )

        # 23. list_project_findings
        self.register(
            ToolDefinition(
                name="list_project_findings",
                description="List verified vulnerability findings from PostgreSQL for the active or specified project with optional severity, status, and category filters.",
                version="1.0.0",
                category="SECURITY",
                required_permission="SECURITY_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "severity": {"type": "string", "description": "Filter severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL"},
                        "status": {"type": "string", "description": "Filter finding status (e.g. open, resolved)"},
                        "category": {"type": "string", "description": "Optional category filter"},
                        "limit": {"type": "integer", "description": "Max findings to return (1-100, default 25)", "default": 25},
                    },
                },
            ),
            execute_list_project_findings,
        )

        # 24. get_project_posture
        self.register(
            ToolDefinition(
                name="get_project_posture",
                description="Retrieve live project security posture computed from real open findings, recent scans, active security blueprints, and pending human approvals.",
                version="1.0.0",
                category="PROJECT",
                required_permission="PROJECT_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                },
            ),
            execute_get_project_posture,
        )

        # 25. list_pending_approvals
        self.register(
            ToolDefinition(
                name="list_pending_approvals",
                description="List real pending Human-in-the-Loop SecurityApproval tickets in PostgreSQL awaiting sign-off for gated MCP actions.",
                version="1.0.0",
                category="POLICY",
                required_permission="POLICY_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional project UUID filter"},
                    },
                },
            ),
            execute_list_pending_approvals,
        )

        # 26. get_mcp_audit_trail
        self.register(
            ToolDefinition(
                name="get_mcp_audit_trail",
                description="Query the immutable PostgreSQL audit trail of MCP tool invocations, resource reads, approvals, and policy verdicts for a project.",
                version="1.0.0",
                category="SECURITY",
                required_permission="SECURITY_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "limit": {"type": "integer", "description": "Max audit events to return (1-100, default 25)", "default": 25},
                    },
                },
            ),
            execute_get_mcp_audit_trail,
        )

        # 27. list_github_repositories
        self.register(
            ToolDefinition(
                name="list_github_repositories",
                description="List all connected GitHub repositories and App installations accessible in your Kavach tenant to inspect or switch repositories directly from ChatGPT.",
                version="1.0.0",
                category="GITHUB",
                required_permission="GITHUB_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional project UUID to check active repo link"},
                        "sync_live": {"type": "boolean", "description": "Optionally sync latest repositories from GitHub App installation", "default": False},
                    },
                },
            ),
            execute_list_github_repositories,
        )

        # 28. list_pull_requests
        self.register(
            ToolDefinition(
                name="list_pull_requests",
                description="List Pull Requests for the active project's connected GitHub repository.",
                version="1.0.0",
                category="GITHUB",
                required_permission="GITHUB_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "repository": {"type": "string", "description": "Optional 'owner/repo' override"},
                        "state": {"type": "string", "description": "Filter PR state: open, closed, or all", "default": "open"},
                        "limit": {"type": "integer", "description": "Max PRs to return (default 20)", "default": 20},
                    },
                },
            ),
            execute_list_pull_requests,
        )

        # 29. get_finding_detail
        self.register(
            ToolDefinition(
                name="get_finding_detail",
                description="Retrieve complete security finding evidence, vulnerable snippet, CWE/OWASP metadata, and persisted patches by finding_id.",
                version="1.0.0",
                category="SECURITY",
                required_permission="SECURITY_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string", "description": "SecurityFinding UUID"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                    "required": ["finding_id"],
                },
            ),
            execute_get_finding_detail,
        )

        # 30. update_finding_status
        self.register(
            ToolDefinition(
                name="update_finding_status",
                description="Triage a security finding status ('open', 'ignored', 'false_positive', 'accepted_risk') with immutable audit reason. Note: marking resolved requires verified rescan via `verify_patch`.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="REMEDIATION_PROPOSE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string", "description": "SecurityFinding UUID"},
                        "status": {"type": "string", "description": "New status: open, ignored, false_positive, or accepted_risk"},
                        "reason": {"type": "string", "description": "Justification for triage decision"},
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                    },
                    "required": ["finding_id", "status"],
                },
            ),
            execute_update_finding_status,
        )

        # 31. list_security_policies
        self.register(
            ToolDefinition(
                name="list_security_policies",
                description="List active project security policies and deterministic MCP Firewall / OPA rules.",
                version="1.0.0",
                category="POLICY",
                required_permission="POLICY_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "active_only": {"type": "boolean", "default": False},
                    },
                },
            ),
            execute_list_security_policies,
        )

        # 32. generate_security_blueprint
        self.register(
            ToolDefinition(
                name="generate_security_blueprint",
                description="Generate or regenerate a dynamic Security Blueprint and tailored security requirements for the project.",
                version="1.0.0",
                category="BLUEPRINT",
                required_permission="PROJECT_WRITE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Optional target project UUID"},
                        "intent_summary": {"type": "string", "description": "Optional architectural or data-sensitivity summary to derive dynamic requirements"},
                    },
                },
            ),
            execute_generate_security_blueprint,
        )

    def register(self, tool: ToolDefinition, handler: Callable) -> None:
        self._tools[tool.name] = tool
        self._handlers[tool.name] = handler

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def get_handler(self, name: str) -> Optional[Callable]:
        return self._handlers.get(name)

    def list_tools(self) -> List[ToolDefinition]:
        return [tool for tool in self._tools.values() if tool.enabled]


# Global tool registry
default_tool_registry = MCPToolRegistry()
