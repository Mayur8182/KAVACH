from typing import Any, Callable, Dict, List, Optional
from app.mcp.schemas import ToolDefinition
from app.mcp.tools.projects import execute_get_project
from app.mcp.tools.security import (
    execute_check_security_policy,
    execute_get_security_blueprint,
    execute_get_security_requirements,
)
from app.mcp.tools.scans import (
    execute_get_scan,
    execute_run_security_scan,
    execute_security_check,
)
from app.mcp.tools.github import (
    execute_get_github_repository,
    execute_get_pull_request,
)
from app.mcp.tools.remediation import (
    execute_propose_remediation_diff,
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
                description="Synthesize an automated minimal unified diff patch to fix a security vulnerability finding using LLM reasoning.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="SCAN_READ",
                risk_level="LOW",
                input_schema={
                    "type": "object",
                    "properties": {
                        "project_id": {"type": "string", "description": "Target project UUID"},
                        "rule_id": {"type": "string", "description": "Security rule identifier (e.g., bandit.B608)"},
                        "file_path": {"type": "string", "description": "Relative file path containing the issue"},
                        "snippet": {"type": "string", "description": "Vulnerable code snippet"},
                        "file_content": {"type": "string", "description": "Full or surrounding file content"},
                    },
                    "required": ["file_path"],
                },
            ),
            execute_propose_remediation_diff,
        )

        # 11. verify_remediation_patch
        self.register(
            ToolDefinition(
                name="verify_remediation_patch",
                description="Verify in an isolated sandbox that applying the patch removes the vulnerability under real scanner execution.",
                version="1.0.0",
                category="REMEDIATION",
                required_permission="SCAN_EXECUTE",
                risk_level="MEDIUM",
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Target file name"},
                        "original_content": {"type": "string", "description": "Pre-patch file content"},
                        "patched_content": {"type": "string", "description": "Post-patch file content"},
                        "rule_id": {"type": "string", "description": "Security rule that should now be resolved"},
                        "scanner_type": {"type": "string", "description": "semgrep or gitleaks"},
                    },
                    "required": ["file_path", "patched_content", "rule_id"],
                },
            ),
            execute_verify_remediation_patch,
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
