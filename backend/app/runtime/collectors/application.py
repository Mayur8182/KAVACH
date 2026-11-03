"""
Application & HTTP API Evidence Collector.
Captures REST API requests, tenant interactions, authenticated users, and route invocations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.enums import EvidenceEventType, EvidenceSourceStatus, EvidenceSourceType
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class ApplicationEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.APPLICATION

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        return True

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        """
        Translates application or HTTP API event into a normalized runtime evidence request.
        """
        req_id = raw_event.get("request_id") or raw_event.get("id")
        method = raw_event.get("method", "GET").upper()
        route = raw_event.get("route") or raw_event.get("path", "/")
        status_code = raw_event.get("status_code", 200)

        occurred_at = raw_event.get("occurred_at") or raw_event.get("timestamp") or datetime.now(timezone.utc)
        if isinstance(occurred_at, str):
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))

        tenant_id = raw_event.get("tenant_id") or raw_event.get("subject_tenant_id")
        user_id = raw_event.get("user_id") or raw_event.get("actor_id") or "anonymous"

        subject = {
            "type": raw_event.get("subject_type", "AUTHENTICATED_USER"),
            "id": user_id,
            "tenant_id": tenant_id,
            "roles": raw_event.get("roles", []),
        }

        # If resource tenant is explicitly provided (e.g. In multi-tenant database or invoice read)
        res_tenant_id = raw_event.get("resource_tenant_id") or raw_event.get("target_tenant_id") or tenant_id
        res_type = raw_event.get("resource_type", "API_ENDPOINT")
        res_id = raw_event.get("resource_id", route)

        resource = {
            "type": res_type,
            "id": res_id,
            "tenant_id": res_tenant_id,
            "path": route,
        }

        action_type = "READ" if method in ("GET", "HEAD") else ("CREATE" if method == "POST" else ("UPDATE" if method in ("PUT", "PATCH") else "DELETE"))
        action = {
            "type": action_type,
            "method": method,
            "route": route,
        }

        context = {
            "request_id": req_id,
            "ip": raw_event.get("client_ip"),
            "user_agent": raw_event.get("user_agent"),
            "environment": raw_event.get("environment", "production"),
        }

        result = {
            "status_code": status_code,
            "duration_ms": raw_event.get("duration_ms", 0),
            "success": 200 <= status_code < 400,
        }

        trace = {
            "trace_id": raw_event.get("trace_id") or req_id,
            "span_id": raw_event.get("span_id"),
            "request_id": req_id,
        }

        return RuntimeEvidenceIngestRequest(
            event_id=f"app-{req_id}" if req_id else None,
            source_type=EvidenceSourceType.APPLICATION.value,
            source_id=raw_event.get("service_name", "fastapi-service"),
            source_event_id=str(req_id) if req_id else None,
            event_type=EvidenceEventType.API_REQUEST.value,
            occurred_at=occurred_at,
            subject=subject,
            action=action,
            resource=resource,
            context=context,
            result=result,
            trace=trace,
            classification=raw_event.get("classification", "INTERNAL"),
            environment=raw_event.get("environment", "production"),
            raw_payload=raw_event,
        )
