import json
import logging
from typing import Any, List, Optional
from mcp.server import Server as MCPServer

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

    return server
