"""
OpenTelemetry (OTLP) Evidence Collector.
Ingests standard OTLP/HTTP traces, spans, and logs, translating them into normalized runtime evidence.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.enums import EvidenceEventType, EvidenceSourceStatus, EvidenceSourceType
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class OTELEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.OPEN_TELEMETRY

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        # Check environment variable or explicit config
        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or (config or {}).get("endpoint")
        enabled = os.getenv("OTEL_ENABLED", "true").lower() in ("true", "1", "yes")
        return bool(enabled and (endpoint or config))

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        if not self.is_configured(config):
            return EvidenceSourceStatus.NOT_CONFIGURED
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        """
        Translates an OTLP Span or Log record into a uniform RuntimeEvidenceIngestRequest.
        """
        trace_id = raw_event.get("trace_id") or raw_event.get("traceId")
        span_id = raw_event.get("span_id") or raw_event.get("spanId")
        parent_span_id = raw_event.get("parent_span_id") or raw_event.get("parentSpanId")
        name = raw_event.get("name") or raw_event.get("operation_name", "otel.span")

        attributes = raw_event.get("attributes", {})
        service_name = raw_event.get("service_name") or attributes.get("service.name", "otel-instrumented-service")

        occurred_at = raw_event.get("start_time") or raw_event.get("timestamp") or datetime.now(timezone.utc)
        if isinstance(occurred_at, (int, float)):
            # Convert nanoseconds or seconds to datetime
            if occurred_at > 1e15:
                occurred_at = occurred_at / 1e9
            occurred_at = datetime.fromtimestamp(occurred_at, tz=timezone.utc)
        elif isinstance(occurred_at, str):
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))

        tenant_id = attributes.get("tenant.id") or attributes.get("tenant_id")
        user_id = attributes.get("user.id") or attributes.get("user_id") or "otel-service"

        subject = {
            "type": "SERVICE",
            "id": service_name,
            "tenant_id": tenant_id,
            "user_id": user_id,
        }

        action = {
            "type": "EXECUTE",
            "name": name,
            "attributes": attributes,
        }

        resource_type = attributes.get("resource.type") or attributes.get("db.system") or "TRACE_SPAN"
        resource_id = attributes.get("db.name") or attributes.get("http.target") or name

        resource = {
            "type": str(resource_type).upper(),
            "id": str(resource_id),
            "tenant_id": tenant_id,
        }

        context = {
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,
            "service_name": service_name,
            "attributes": attributes,
        }

        status_code = raw_event.get("status_code", "OK")
        result = {
            "status": status_code,
            "duration_ms": raw_event.get("duration_ms", 0),
        }

        trace = {
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,
        }

        return RuntimeEvidenceIngestRequest(
            event_id=f"otel-{span_id}" if span_id else None,
            source_type=EvidenceSourceType.OPEN_TELEMETRY.value,
            source_id=str(service_name),
            source_event_id=str(span_id) if span_id else None,
            event_type=EvidenceEventType.DATABASE_ACCESS.value if "db" in str(name).lower() else EvidenceEventType.API_REQUEST.value,
            occurred_at=occurred_at,
            subject=subject,
            action=action,
            resource=resource,
            context=context,
            result=result,
            trace=trace,
            classification="INTERNAL",
            environment=attributes.get("deployment.environment", "production"),
            raw_payload=raw_event,
        )
