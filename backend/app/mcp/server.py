import json
import logging
from typing import Any, List, Optional
try:
    from mcp.server import Server as MCPServer
except ImportError:
    class MCPServer:
        def __init__(self, name: str = "mock-mcp"):
            self.name = name

from app.core.database import get_session_factory
from app.mcp.gateway import MCPGateway
from app.mcp.registry import default_tool_registry

logger = logging.getLogger("secure-control-plane.mcp")


def create_mcp_server(name: str = "secure-control-plane-mcp") -> MCPServer:
    """
    Creates and configures an official Model Context Protocol server using
    the official Python MCP 2.x SDK (MCPServer).
    Wired directly into our secure MCPGateway pipeline.
    """
    server = MCPServer(name)

    # 0. list_projects tool (Phase 1)
    @server.tool(
        name="list_projects",
        description="List all verified security projects owned by the authenticated user with pagination and tenant isolation.",
    )
    async def list_projects(session_id: str, limit: int = 20, offset: int = 0) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="list_projects",
                arguments={"limit": limit, "offset": offset},
            )
            return json.dumps(res.model_dump(), default=str)

    # 1. get_project tool
    @server.tool(
        name="get_project",
        description="Retrieve verified project details and configuration from the security control plane.",
    )
    async def get_project(project_id: str, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_project",
                arguments={"project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 2. get_security_blueprint tool
    @server.tool(
        name="get_security_blueprint",
        description="Retrieve the active dynamic security blueprint and requirements for the project.",
    )
    async def get_security_blueprint(project_id: str, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_security_blueprint",
                arguments={"project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 3. get_security_requirements tool
    @server.tool(
        name="get_security_requirements",
        description="Retrieve active security blueprint requirements for compliance tracking.",
    )
    async def get_security_requirements(project_id: str, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_security_requirements",
                arguments={"project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 4. run_security_scan tool
    @server.tool(
        name="run_security_scan",
        description="Execute real security verification tools (Semgrep, Gitleaks, OSV, Trivy, Checkov) against project target.",
    )
    async def run_security_scan(
        project_id: str,
        session_id: str,
        target_path: Optional[str] = None,
        scanners: Optional[List[str]] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="run_security_scan",
                arguments={
                    "project_id": project_id,
                    "target_path": target_path,
                    "scanners": scanners,
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 5. security_check tool
    @server.tool(
        name="security_check",
        description="Perform a complete security verification check combining scanners and policy evaluation.",
    )
    async def security_check(
        project_id: str,
        session_id: str,
        target_path: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="security_check",
                arguments={
                    "project_id": project_id,
                    "target_path": target_path,
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 6. get_scan tool
    @server.tool(
        name="get_scan",
        description="Retrieve detailed scan findings, evidence, and requirement verification results.",
    )
    async def get_scan(scan_id: str, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_scan",
                arguments={"scan_id": scan_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 7. check_security_policy tool
    @server.tool(
        name="check_security_policy",
        description="Query the deterministic Step 7 Policy Engine for an Allow/Warn/Block/Require_Approval decision.",
    )
    async def check_security_policy(
        project_id: str,
        operation: str,
        session_id: str,
        resource: Optional[dict] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="check_security_policy",
                arguments={
                    "project_id": project_id,
                    "operation": operation,
                    "resource": resource or {},
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 8. get_github_repository tool
    @server.tool(
        name="get_github_repository",
        description="Retrieve linked GitHub repository metadata for the project.",
    )
    async def get_github_repository(project_id: str, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_github_repository",
                arguments={"project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 9. get_pull_request tool
    @server.tool(
        name="get_pull_request",
        description="Retrieve pull request security and commit details.",
    )
    async def get_pull_request(pr_number: int, session_id: str) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_pull_request",
                arguments={"pr_number": pr_number},
            )
            return json.dumps(res.model_dump(), default=str)

    # 10. get_file_content tool
    @server.tool(
        name="get_file_content",
        description="Retrieve real source file contents from the connected GitHub repository.",
    )
    async def get_file_content(
        file_path: str,
        session_id: str,
        ref: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_file_content",
                arguments={"file_path": file_path, "ref": ref, "project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 11. create_branch tool
    @server.tool(
        name="create_branch",
        description="Create a remediation branch on the connected GitHub repository.",
    )
    async def create_branch(
        branch_name: str,
        session_id: str,
        base_branch: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="create_branch",
                arguments={"branch_name": branch_name, "base_branch": base_branch, "project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 12. apply_remediation_patch tool
    @server.tool(
        name="apply_remediation_patch",
        description="Apply and commit a verified remediation patch onto a GitHub remediation branch.",
    )
    async def apply_remediation_patch(
        file_path: str,
        branch: str,
        session_id: str,
        patch: Optional[str] = None,
        patched_content: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="apply_remediation_patch",
                arguments={
                    "file_path": file_path,
                    "branch": branch,
                    "patch": patch,
                    "patched_content": patched_content,
                    "project_id": project_id,
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 13. verify_patch tool
    @server.tool(
        name="verify_patch",
        description="Run syntax and security scanner verification on patched source before opening a PR.",
    )
    async def verify_patch(
        file_path: str,
        session_id: str,
        branch: Optional[str] = None,
        patched_content: Optional[str] = None,
        rule_id: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="verify_patch",
                arguments={
                    "file_path": file_path,
                    "branch": branch,
                    "patched_content": patched_content,
                    "rule_id": rule_id,
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 14. create_pull_request tool
    @server.tool(
        name="create_pull_request",
        description="Open a reviewable GitHub Pull Request from a verified remediation branch.",
    )
    async def create_pull_request(
        head_branch: str,
        title: str,
        session_id: str,
        base_branch: Optional[str] = None,
        body: Optional[str] = None,
    ) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="create_pull_request",
                arguments={
                    "head_branch": head_branch,
                    "base_branch": base_branch,
                    "title": title,
                    "body": body,
                },
            )
            return json.dumps(res.model_dump(), default=str)

    # 15. list_github_repositories tool
    @server.tool(
        name="list_github_repositories",
        description="List all connected GitHub repositories and App installations accessible in Kavach.",
    )
    async def list_github_repositories(session_id: str, project_id: Optional[str] = None, sync_live: bool = False) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="list_github_repositories",
                arguments={"project_id": project_id, "sync_live": sync_live},
            )
            return json.dumps(res.model_dump(), default=str)

    # 16. list_pull_requests tool
    @server.tool(
        name="list_pull_requests",
        description="List Pull Requests for the active project's connected repository.",
    )
    async def list_pull_requests(session_id: str, project_id: Optional[str] = None, state: str = "open") -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="list_pull_requests",
                arguments={"project_id": project_id, "state": state},
            )
            return json.dumps(res.model_dump(), default=str)

    # 17. get_finding_detail tool
    @server.tool(
        name="get_finding_detail",
        description="Retrieve full finding evidence, snippet, CWE/OWASP metadata, and persisted patches.",
    )
    async def get_finding_detail(finding_id: str, session_id: str, project_id: Optional[str] = None) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="get_finding_detail",
                arguments={"finding_id": finding_id, "project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 18. update_finding_status tool
    @server.tool(
        name="update_finding_status",
        description="Triage a finding status ('open', 'ignored', 'false_positive', 'accepted_risk') with reason.",
    )
    async def update_finding_status(finding_id: str, status: str, session_id: str, reason: str = "", project_id: Optional[str] = None) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="update_finding_status",
                arguments={"finding_id": finding_id, "status": status, "reason": reason, "project_id": project_id},
            )
            return json.dumps(res.model_dump(), default=str)

    # 19. list_security_policies tool
    @server.tool(
        name="list_security_policies",
        description="List active project security policies and deterministic MCP Firewall / OPA rules.",
    )
    async def list_security_policies(session_id: str, project_id: Optional[str] = None, active_only: bool = False) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="list_security_policies",
                arguments={"project_id": project_id, "active_only": active_only},
            )
            return json.dumps(res.model_dump(), default=str)

    # 20. generate_security_blueprint tool
    @server.tool(
        name="generate_security_blueprint",
        description="Generate a dynamic Security Blueprint and tailored requirements for the project.",
    )
    async def generate_security_blueprint(session_id: str, project_id: Optional[str] = None, intent_summary: Optional[str] = None) -> str:
        factory = get_session_factory()
        async with factory() as db:
            gateway = MCPGateway(db)
            import uuid
            res = await gateway.invoke_tool(
                session_id=uuid.UUID(session_id),
                tool_name="generate_security_blueprint",
                arguments={"project_id": project_id, "intent_summary": intent_summary},
            )
            return json.dumps(res.model_dump(), default=str)

    return server
