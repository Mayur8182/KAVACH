import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.policy.models import DecisionType
from app.mcp.approvals import MCPApprovalManager
from app.mcp.audit import MCPAuditor
from app.mcp.authentication import MCPAuthenticator
from app.mcp.authorization import MCPAuthorizer
from app.mcp.errors import (
    MCPApprovalRequiredError,
    MCPAuthorizationError,
    MCPError,
    MCPInvalidInputError,
    MCPPolicyBlockedError,
    MCPProjectAccessDeniedError,
    MCPToolNotFoundError,
)
from app.mcp.executor import MCPToolExecutor
from app.mcp.policy import MCPPolicyEvaluator
from app.mcp.registry import MCPToolRegistry, default_tool_registry
from app.mcp.risk import MCPRiskEvaluator
from app.mcp.schemas import MCPContext, ToolDefinition, ToolExecutionResult


class MCPGateway:
    """
    Production-grade Security Gateway for Model Context Protocol interactions.
    Enforces the complete security pipeline on every tool invocation:
    
    MCP Request
      ↓
    Parse & Validate Request
      ↓
    Authenticate Session
      ↓
    Resolve Agent Identity
      ↓
    Authorize Project & Permissions
      ↓
    Evaluate Step 7 Policy
      ↓
    Evaluate Risk Factors
      ↓
    Check / Create Approval (Blocks execution if required)
      ↓
    Execute Approved Tool
      ↓
    Sanitize & Validate Result
      ↓
    Persist Audit Event
      ↓
    Return MCP Result
    """

    def __init__(
        self,
        db: AsyncSession,
        registry: Optional[MCPToolRegistry] = None,
    ):
        self.db = db
        self.registry = registry or default_tool_registry
        self.authenticator = MCPAuthenticator(db)
        self.policy_evaluator = MCPPolicyEvaluator(db)
        self.approval_manager = MCPApprovalManager(db)
        self.auditor = MCPAuditor(db)

    async def list_available_tools(
        self,
        context: MCPContext,
    ) -> List[ToolDefinition]:
        """
        Returns the list of tools permitted for the authenticated agent context.
        """
        all_tools = self.registry.list_tools()
        permitted = []
        for tool in all_tools:
            if tool.required_permission in context.identity.permissions:
                permitted.append(tool)
        return permitted

    async def invoke_tool(
        self,
        session_id: uuid.UUID,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> ToolExecutionResult:
        """
        Full 10-step secure pipeline invocation.
        Guarantees that no tool executes without passing identity, authorization, policy, and approval checks.
        """
        # Step 1: Session Authentication
        context = await self.authenticator.authenticate_session(session_id)

        # Step 2: Tool Registry Lookup
        tool = self.registry.get_tool(tool_name)
        if not tool:
            raise MCPToolNotFoundError(tool_name)

        handler = self.registry.get_handler(tool_name)
        if not handler:
            raise MCPToolNotFoundError(tool_name)

        # Step 3: Create initial audit invocation record (state: PENDING)
        invocation = await self.auditor.create_invocation(
            session_id=context.session_id,
            agent_id=context.identity.agent_id,
            project_id=context.identity.project_id,
            tool_name=tool.name,
            tool_version=tool.version,
            request_id=context.request_id,
            operation=f"MCP_TOOL_{tool.name.upper()}",
            resource_type=tool.category,
            resource_id=arguments.get("project_id") or arguments.get("scan_id"),
            input_data=arguments,
        )

        try:
            # Step 4: Authorization & Project Isolation
            authz_result = await MCPAuthorizer.evaluate_full_authorization(
                context=context,
                tool=tool,
                arguments=arguments,
                db=self.db,
            )

            if authz_result.decision != "ALLOW":
                await self.auditor.update_invocation_completion(
                    invocation=invocation,
                    status="DENIED",
                    authorization_decision="DENIED",
                    policy_decision="NOT_EVALUATED",
                    error_code=authz_result.reason_code,
                    error_message=authz_result.reason,
                )
                return ToolExecutionResult(
                    status="DENIED",
                    message=authz_result.reason,
                    error_code=authz_result.reason_code,
                )

            # Record delegation metadata if acting via delegation (Section 53)
            if authz_result.delegation_id:
                inv_meta = dict(invocation.metadata_ or {})
                inv_meta["acting_agent"] = str(context.identity.agent_id)
                inv_meta["delegating_agent"] = authz_result.delegating_agent_id
                inv_meta["delegation_id"] = authz_result.delegation_id
                inv_meta["provenance"] = authz_result.provenance
                invocation.metadata_ = inv_meta

            # Step 4.5: Check Step 14 Active Runtime Enforcement Rules
            from datetime import datetime, timezone
            from sqlalchemy import select
            from app.response.models import RuntimeEnforcementRule

            now = datetime.now(timezone.utc)
            enforcement_stmt = select(RuntimeEnforcementRule).where(
                RuntimeEnforcementRule.project_id == context.identity.project_id,
                RuntimeEnforcementRule.status == "ACTIVE",
                RuntimeEnforcementRule.expires_at > now,
                (RuntimeEnforcementRule.target_id == tool.name)
                | (RuntimeEnforcementRule.target_id == str(context.identity.agent_id)),
            )
            enforcement_rule = (await self.db.execute(enforcement_stmt)).scalars().first()
            if enforcement_rule:
                await self.auditor.update_invocation_completion(
                    invocation=invocation,
                    status="BLOCKED",
                    authorization_decision="AUTHORIZED",
                    policy_decision="RUNTIME_ENFORCEMENT_BLOCKED",
                    error_code="RUNTIME_ENFORCEMENT_BLOCKED",
                    error_message=f"Blocked by active runtime enforcement rule: {enforcement_rule.reason}",
                )
                return ToolExecutionResult(
                    status="DENIED",
                    message=f"Operation blocked by active runtime security enforcement rule: {enforcement_rule.reason}",
                    error_code="RUNTIME_ENFORCEMENT_BLOCKED",
                )

            # Step 5: Policy Evaluation via Step 7 Engine
            policy_result = await self.policy_evaluator.evaluate(context, tool, arguments)

            if policy_result.decision == DecisionType.BLOCK:
                await self.auditor.update_invocation_completion(
                    invocation=invocation,
                    status="BLOCKED",
                    authorization_decision="AUTHORIZED",
                    policy_decision="BLOCK",
                    error_code="MCP_POLICY_BLOCKED",
                    error_message=f"Policy blocked execution: {policy_result.reason}",
                )
                return ToolExecutionResult(
                    status="DENIED",
                    message=f"Operation blocked by policy: {policy_result.reason}",
                    error_code="MCP_POLICY_BLOCKED",
                )

            # Step 6: Risk Evaluation
            risk_factors = MCPRiskEvaluator.evaluate_risk(context, tool, arguments)

            # Step 7: Approval Check
            if policy_result.decision == DecisionType.REQUIRE_APPROVAL or tool.requires_approval:
                approval_id = await self.approval_manager.create_approval_request(
                    context=context,
                    tool=tool,
                    arguments=arguments,
                    reason=policy_result.reason or "Tool policy mandates human approval prior to execution",
                )
                await self.auditor.update_invocation_completion(
                    invocation=invocation,
                    status="REQUIRES_APPROVAL",
                    authorization_decision="AUTHORIZED",
                    policy_decision="REQUIRE_APPROVAL",
                    approval_id=approval_id,
                    error_code="MCP_APPROVAL_REQUIRED",
                    error_message=f"Human approval required (ticket: {approval_id})",
                )
                # STOP EXECUTION IMMEDIATELY. DO NOT PROCEED TO HANDLER.
                return ToolExecutionResult(
                    status="REQUIRES_APPROVAL",
                    approval_id=str(approval_id),
                    message=f"Tool '{tool.name}' requires explicit security approval. Ticket ID: {approval_id}.",
                    error_code="MCP_APPROVAL_REQUIRED",
                )

            # Step 8: Controlled Tool Execution
            result = await MCPToolExecutor.execute_tool(
                context=context,
                tool=tool,
                handler=handler,
                arguments=arguments,
                db=self.db,
            )

            # Step 9: Finalize Audit with Execution Results
            inv_status = "COMPLETED" if result.status == "SUCCESS" else result.status
            await self.auditor.update_invocation_completion(
                invocation=invocation,
                status=inv_status,
                authorization_decision="AUTHORIZED",
                policy_decision=policy_result.decision.value,
                result_reference=result.result_reference,
                output_data=result.data,
                error_code=result.error_code,
                error_message=result.message if result.status != "SUCCESS" else None,
            )

            return result

        except (MCPAuthorizationError, MCPProjectAccessDeniedError) as auth_err:
            await self.auditor.update_invocation_completion(
                invocation=invocation,
                status="DENIED",
                authorization_decision="DENIED",
                policy_decision="NOT_EVALUATED",
                error_code=auth_err.code,
                error_message=auth_err.message,
            )
            return ToolExecutionResult(
                status="DENIED",
                message=auth_err.message,
                error_code=auth_err.code,
            )
        except MCPError as mcp_err:
            await self.auditor.update_invocation_completion(
                invocation=invocation,
                status="FAILED",
                error_code=mcp_err.code,
                error_message=mcp_err.message,
            )
            return ToolExecutionResult(
                status="FAILED",
                message=mcp_err.message,
                error_code=mcp_err.code,
            )
        except Exception as ex:
            await self.auditor.update_invocation_completion(
                invocation=invocation,
                status="FAILED",
                error_code="MCP_INTERNAL_ERROR",
                error_message=str(ex),
            )
            return ToolExecutionResult(
                status="FAILED",
                message=f"Internal MCP execution error: {str(ex)}",
                error_code="MCP_INTERNAL_ERROR",
            )
