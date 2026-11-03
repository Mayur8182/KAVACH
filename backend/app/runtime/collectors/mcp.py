"""
MCP Gateway Evidence Collector.
Captures tool invocations, agent identities, delegation chains, and policy decisions.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.enums import EvidenceEventType, EvidenceSourceStatus, EvidenceSourceType
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class MCPEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.MCP

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        # Step 9 MCP gateway is always configured in-process
        return True

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        """
        Translates an MCPToolInvocation event from the MCP Gateway into a normalized runtime evidence request.
        """
        tool_execution_id = raw_event.get("tool_execution_id") or raw_event.get("invocation_id")
        agent_id = raw_event.get("agent_id") or "system-agent"
        tool_name = raw_event.get("tool_name", "unknown_tool")
        server_id = raw_event.get("server_id", "mcp-server-01")
        delegation_id = raw_event.get("delegation_id")
        delegation_chain = raw_event.get("delegation_chain", [])
        occurred_at = raw_event.get("started_at") or raw_event.get("occurred_at") or datetime.now(timezone.utc)
        if isinstance(occurred_at, str):
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))

        action_name = raw_event.get("action") or "EXECUTE"
        resource_id = raw_event.get("resource_id") or tool_name

        subject = {
            "type": "AGENT",
            "id": agent_id,
            "agent_id": agent_id,
            "delegation_id": delegation_id,
            "delegation_chain": delegation_chain,
            "authority": raw_event.get("agent_authority", []),
        }

        action = {
            "type": action_name,
            "name": tool_name,
            "parameters": raw_event.get("tool_input", {}),
        }

        resource = {
            "type": "MCP_TOOL",
            "id": resource_id,
            "name": tool_name,
            "server_id": server_id,
        }

        context = {
            "tool_execution_id": tool_execution_id,
            "server_id": server_id,
            "approval_id": raw_event.get("approval_id"),
            "environment": raw_event.get("environment", "production"),
        }

        result = {
            "status": raw_event.get("result_status", "SUCCESS"),
            "duration_ms": raw_event.get("duration_ms", 0),
            "output": raw_event.get("tool_output", {}),
        }

        decision = {
            "authorization": raw_event.get("authorization_decision", "ALLOW"),
            "policy": raw_event.get("policy_decision", "ALLOW"),
        }

        trace = {
            "trace_id": raw_event.get("trace_id") or tool_execution_id,
            "span_id": raw_event.get("span_id"),
        }

        return RuntimeEvidenceIngestRequest(
            event_id=f"mcp-{tool_execution_id}" if tool_execution_id else None,
            source_type=EvidenceSourceType.MCP.value,
            source_id=server_id,
            source_event_id=str(tool_execution_id) if tool_execution_id else None,
            event_type=EvidenceEventType.MCP_TOOL_CALL.value,
            occurred_at=occurred_at,
            subject=subject,
            action=action,
            resource=resource,
            context=context,
            result=result,
            trace=trace,
            classification=raw_event.get("classification", "CONFIDENTIAL"),
            environment=raw_event.get("environment", "production"),
            raw_payload=raw_event,
        )
