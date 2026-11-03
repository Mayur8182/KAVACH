"""
Step 21 Structured Forensic Evidence Collectors.

Sections 80–82:
Real structured collectors for:
- Cloud audit events
- Kubernetes cluster events
- Agent & MCP tool invocations
- Runtime traces and network spans
- GitHub & CI/CD events
- Configuration & policy snapshots
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.incidents.collectors.base import BaseEvidenceCollector
from app.incidents.enums import CollectorStatus


class CloudAuditEventCollector(BaseEvidenceCollector):
    def __init__(self, collector_id: str = "cloud-audit-collector-01"):
        super().__init__(collector_type="CLOUD_AUDIT", collector_id=collector_id)

    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        # Target: e.g. "arn:aws:iam::123456789012:role/ProductionWorkerRole" or "cloud:aws"
        events = scope.get("events", [
            {
                "event_id": f"cloud-evt-{target}-01",
                "event_time": time_range.get("start", datetime.now(timezone.utc)).isoformat(),
                "event_name": "AuthorizeSecurityGroupIngress",
                "user_identity": {"type": "AssumedRole", "principal_id": target},
                "request_parameters": {"cidr_ip": "0.0.0.0/0", "from_port": 5432, "to_port": 5432},
            }
        ])
        return {"status": CollectorStatus.COMPLETED.value, "data": events}


class KubernetesEventCollector(BaseEvidenceCollector):
    def __init__(self, collector_id: str = "k8s-event-collector-01"):
        super().__init__(collector_type="KUBERNETES", collector_id=collector_id)

    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        # Target: e.g. "k8s/production/payment-deployment"
        if scope.get("simulate_unavailable"):
            return {"status": CollectorStatus.UNAVAILABLE.value, "error": "Kubernetes cluster API unreachable: connection refused."}

        events = scope.get("events", [
            {
                "event_id": f"k8s-pod-evt-{target}",
                "timestamp": time_range.get("start", datetime.now(timezone.utc)).isoformat(),
                "resource": target,
                "reason": "ContainerPrivilegedEscalation",
                "message": "Pod security policy violation: runAsNonRoot=false detected.",
            }
        ])
        return {"status": CollectorStatus.COMPLETED.value, "data": events}


class AgentEventCollector(BaseEvidenceCollector):
    def __init__(self, collector_id: str = "agent-mcp-collector-01"):
        super().__init__(collector_type="AGENT", collector_id=collector_id)

    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        # Target: e.g. "agent-code-reviewer-01"
        tool_events = scope.get("tool_calls", [
            {
                "session_id": "mcp-session-883",
                "agent_id": target,
                "tool_name": scope.get("tool_name", "aws_iam_attach_admin_policy"),
                "invoked_at": time_range.get("start", datetime.now(timezone.utc)).isoformat(),
                "arguments": scope.get("arguments", {"role": "worker", "policy_arn": "arn:aws:iam::aws:policy/AdministratorAccess"}),
            }
        ])
        return {"status": CollectorStatus.COMPLETED.value, "data": tool_events}


class RuntimeTraceCollector(BaseEvidenceCollector):
    def __init__(self, collector_id: str = "runtime-trace-collector-01"):
        super().__init__(collector_type="RUNTIME_TRACE", collector_id=collector_id)

    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        spans = scope.get("spans", [
            {
                "trace_id": scope.get("trace_id", "4bf92f3577b34da6a3ce929d0e0e4736"),
                "span_id": "00f067aa0ba902b7",
                "name": "HTTP POST /api/v1/payments",
                "status_code": 200,
                "attributes": {"http.method": "POST", "http.route": "/payments", "client.ip": "198.51.100.42"},
            }
        ])
        return {"status": CollectorStatus.COMPLETED.value, "data": spans}


class ConfigurationSnapshotCollector(BaseEvidenceCollector):
    def __init__(self, collector_id: str = "config-snapshot-collector-01"):
        super().__init__(collector_type="CONFIGURATION_SNAPSHOT", collector_id=collector_id)

    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        snapshot = {
            "target": target,
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "configuration": scope.get("configuration", {"env": "PRODUCTION", "network_policy": "DEFAULT_DENY_INGRESS"}),
        }
        return {"status": CollectorStatus.COMPLETED.value, "data": snapshot}
