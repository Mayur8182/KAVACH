import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.policy import SecurityApproval, SecurityDecision
from app.mcp.schemas import MCPContext, ToolDefinition


class MCPApprovalManager:
    """
    Integrates Step 7 SecurityApproval records with MCP Gateway execution.
    Creates approval tickets when required and stops execution immediately.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_approval_request(
        self,
        context: MCPContext,
        tool: ToolDefinition,
        arguments: Dict[str, Any],
        reason: str,
        policy_decision_id: Optional[uuid.UUID] = None,
    ) -> uuid.UUID:
        """
        Creates a persistent SecurityApproval record in PostgreSQL.
        """
        if not policy_decision_id:
            decision_record = SecurityDecision(
                project_id=context.identity.project_id,
                actor_type="AI_AGENT",
                actor_id=str(context.identity.agent_id),
                operation_type=f"MCP_TOOL_{tool.name.upper()}",
                operation_id=str(context.request_id),
                resource_type=tool.category,
                resource_id=str(arguments.get("project_id") or arguments.get("scan_id") or "") or None,
                environment=context.metadata.get("environment", "development"),
                decision="REQUIRE_APPROVAL",
                reason=reason,
                policy_version_ids=[],
                context_snapshot={
                    "tool_name": tool.name,
                    "agent_id": str(context.identity.agent_id),
                    "agent_name": context.identity.agent_name,
                    "arguments": arguments,
                },
            )
            self.db.add(decision_record)
            await self.db.flush()
            policy_decision_id = decision_record.id

        approval = SecurityApproval(
            decision_id=policy_decision_id,
            status="PENDING",
            requested_by=context.identity.authenticated_principal or str(context.identity.agent_id),
            reason=f"Approval required for tool '{tool.name}': {reason}",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        self.db.add(approval)
        await self.db.commit()
        await self.db.refresh(approval)
        return approval.id

