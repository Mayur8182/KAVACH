import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp import MCPToolInvocation
from app.services.audit_service import AuditService


class MCPAuditor:
    """
    Manages structured audit logging and persistence for MCP Gateway events.
    Enforces secret redaction on all payloads before saving to PostgreSQL.
    """

    SECRET_PATTERNS = [
        re.compile(r'(?i)(token|password|secret|key|authorization|bearer)\s*[:=]\s*["\']?([^"\'\s,]+)'),
    ]

    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_service = AuditService(db)

    @classmethod
    def sanitize(cls, data: Any) -> Any:
        """
        Recursively redacts secrets and credentials from data payloads.
        """
        if isinstance(data, dict):
            sanitized = {}
            for k, v in data.items():
                lower_k = str(k).lower()
                if any(sec in lower_k for sec in ("token", "password", "secret", "private_key", "authorization", "bearer")):
                    sanitized[k] = "****"
                else:
                    sanitized[k] = cls.sanitize(v)
            return sanitized
        elif isinstance(data, list):
            return [cls.sanitize(item) for item in data]
        elif isinstance(data, str):
            # Check regex patterns
            s = data
            for pattern in cls.SECRET_PATTERNS:
                s = pattern.sub(r'\1: "****"', s)
            return s
        return data

    async def create_invocation(
        self,
        session_id: uuid.UUID,
        agent_id: uuid.UUID,
        project_id: uuid.UUID,
        tool_name: str,
        tool_version: str,
        request_id: str,
        operation: str,
        resource_type: str,
        resource_id: Optional[str],
        input_data: Dict[str, Any],
    ) -> MCPToolInvocation:
        """
        Creates an initial invocation record with PENDING state.
        """
        sanitized_input = self.sanitize(input_data)
        invocation = MCPToolInvocation(
            session_id=session_id,
            agent_id=agent_id,
            project_id=project_id,
            tool_name=tool_name,
            tool_version=tool_version,
            request_id=request_id,
            operation=operation,
            resource_type=resource_type,
            resource_id=resource_id,
            authorization_decision="PENDING",
            policy_decision="NOT_EVALUATED",
            status="PENDING",
            started_at=datetime.now(timezone.utc),
            input_summary=sanitized_input,
            metadata_={},
        )
        self.db.add(invocation)
        await self.db.commit()
        await self.db.refresh(invocation)

        # Log system audit event
        await self.audit_service.log_event(
            action="MCP_TOOL_INVOCATION_STARTED",
            resource_type="MCP_TOOL",
            actor_type="AGENT",
            actor_id=str(agent_id),
            resource_id=tool_name,
            project_id=project_id,
            status="RUNNING",
            metadata={"request_id": request_id, "session_id": str(session_id)},
        )

        return invocation

    async def update_invocation_completion(
        self,
        invocation: MCPToolInvocation,
        status: str,
        authorization_decision: str = "AUTHORIZED",
        policy_decision: str = "ALLOW",
        approval_id: Optional[uuid.UUID] = None,
        result_reference: Optional[str] = None,
        output_data: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Finalizes an invocation record with completion timestamp and results.
        """
        invocation.status = status
        invocation.authorization_decision = authorization_decision
        invocation.policy_decision = policy_decision
        invocation.approval_id = approval_id
        invocation.result_reference = result_reference
        invocation.completed_at = datetime.now(timezone.utc)
        if output_data is not None:
            invocation.output_summary = self.sanitize(output_data)
        invocation.error_code = error_code
        invocation.error_message = error_message

        await self.db.commit()

        # Audit event mapping
        audit_action = f"MCP_TOOL_{status}"
        if status == "COMPLETED":
            audit_action = "MCP_TOOL_EXECUTION_COMPLETED"
        elif status == "FAILED":
            audit_action = "MCP_TOOL_EXECUTION_FAILED"
        elif status == "DENIED":
            audit_action = "MCP_TOOL_DENIED"
        elif status == "REQUIRES_APPROVAL":
            audit_action = "MCP_TOOL_APPROVAL_REQUIRED"

        await self.audit_service.log_event(
            action=audit_action,
            resource_type="MCP_TOOL",
            actor_type="AGENT",
            actor_id=str(invocation.agent_id),
            resource_id=invocation.tool_name,
            project_id=invocation.project_id,
            status=status,
            metadata={
                "request_id": invocation.request_id,
                "session_id": str(invocation.session_id),
                "approval_id": str(approval_id) if approval_id else None,
                "error_code": error_code,
            },
        )
