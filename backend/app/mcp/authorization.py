import uuid
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.authorization.evaluator import AuthorizationResult
from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.scopes import ScopeContext
from app.authorization.service import AuthorizationService
from app.mcp.errors import (
    MCPAuthorizationError,
    MCPProjectAccessDeniedError,
)
from app.mcp.schemas import MCPContext, ToolDefinition


class MCPAuthorizer:
    """
    Enforces deterministic authorization rules on the MCP Gateway:
    1. Tool capability / permission match
    2. Strict Project boundary isolation (prevents cross-project manipulation)
    3. Block dangerous unrestricted permissions
    4. Seamless integration with Step 10 AuthorizationService
    """

    # Prohibited dangerous permissions in MCP Gateway
    PROHIBITED_PERMISSIONS = {
        "PRODUCTION_DEPLOY",
        "SECRET_ACCESS",
        "SECRET_READ",
        "DATABASE_WRITE",
        "DATABASE_DELETE",
        "CLOUD_RESOURCE_WRITE",
        "CLOUD_RESOURCE_DELETE",
        "KUBERNETES_WRITE",
        "EXECUTE_SHELL",
        "IAM_WRITE",
    }

    @classmethod
    def authorize_tool_call(
        cls,
        context: MCPContext,
        tool: ToolDefinition,
        arguments: Dict[str, Any],
    ) -> None:
        """
        Synchronous baseline check for permission matching and project boundaries.
        """
        # 1. Check prohibited permissions
        if tool.required_permission in cls.PROHIBITED_PERMISSIONS:
            raise MCPAuthorizationError(
                f"Permission '{tool.required_permission}' is strictly prohibited on the MCP Gateway."
            )

        # 2. Strict Project Boundary Enforcement
        if "project_id" in arguments and arguments["project_id"] is not None:
            raw_pid = arguments["project_id"]
            try:
                target_pid = uuid.UUID(str(raw_pid))
            except (ValueError, TypeError):
                raise MCPAuthorizationError(f"Invalid project_id parameter: '{raw_pid}'.")

            if target_pid != context.identity.project_id:
                raise MCPProjectAccessDeniedError(
                    project_id=str(target_pid),
                    agent_id=str(context.identity.agent_id),
                )

        # 3. Check agent permissions if listed
        if context.identity.permissions and tool.required_permission not in context.identity.permissions:
            raise MCPAuthorizationError(
                f"Agent '{context.identity.agent_name}' lacks required permission '{tool.required_permission}' "
                f"to execute tool '{tool.name}'."
            )

    @classmethod
    async def evaluate_full_authorization(
        cls,
        context: MCPContext,
        tool: ToolDefinition,
        arguments: Dict[str, Any],
        db: AsyncSession,
    ) -> AuthorizationResult:
        """
        Full deterministic authorization evaluation via Step 10 AuthorizationService.
        Persists immutable AuthorizationDecision in database.
        """
        # Baseline sync checks (prohibited perms, cross project)
        cls.authorize_tool_call(context, tool, arguments)

        authz_svc = AuthorizationService(db)

        # Determine target project
        target_pid = context.identity.project_id
        if "project_id" in arguments and arguments["project_id"]:
            try:
                target_pid = uuid.UUID(str(arguments["project_id"]))
            except (ValueError, TypeError):
                pass

        scope_context = ScopeContext(
            project_id=target_pid,
            environment=context.metadata.get("environment", "development"),
            resource_type=tool.category,
            resource_id=str(arguments.get("project_id") or arguments.get("scan_id") or "") or None,
            metadata=arguments,
        )

        principal = context.principal or AuthenticatedPrincipal(
            principal_id=str(context.identity.agent_id),
            principal_type="AGENT",
            agent_id=context.identity.agent_id,
            project_id=context.identity.project_id,
            authentication_method="SESSION_TOKEN",
            trust_level=context.identity.trust_level,
        )

        result = await authz_svc.authorize(
            principal=principal,
            action=tool.required_permission,
            scope_context=scope_context,
            minimum_trust_level=tool.minimum_trust_level,
        )
        return result
