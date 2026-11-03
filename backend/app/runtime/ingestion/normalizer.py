"""
Evidence Normalization and Sensitive Data Redaction.
Translates heterogeneous raw events into canonical runtime evidence payloads
and sanitizes credentials/secrets deterministically.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

REDACTION_SENSITIVE_KEYS: Set[str] = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret",
    "private_key",
    "authorization",
    "cookie",
    "client_secret",
    "ssh_key",
    "credential",
    "bearer",
}

REDACTION_MASK = "[REDACTED]"


class EvidenceNormalizer:
    """
    Normalizes incoming telemetry and security events into a uniform,
    tamper-evident, sanitized schema.
    """

    @classmethod
    def redact_secrets(cls, data: Any) -> Any:
        """
        Recursively redacts sensitive keys and values from payloads.
        """
        if isinstance(data, dict):
            redacted = {}
            for k, v in data.items():
                k_lower = str(k).lower().strip()
                if any(sensitive in k_lower for sensitive in REDACTION_SENSITIVE_KEYS):
                    redacted[k] = REDACTION_MASK
                else:
                    redacted[k] = cls.redact_secrets(v)
            return redacted
        elif isinstance(data, list):
            return [cls.redact_secrets(item) for item in data]
        elif isinstance(data, str):
            # Check for bearer token pattern: "Bearer ey..."
            if data.lower().startswith("bearer ") and len(data) > 20:
                return "Bearer [REDACTED]"
            return data
        else:
            return data

    @classmethod
    def normalize_event(
        cls,
        event_id: str,
        project_id: str,
        source_type: str,
        source_id: str,
        source_event_id: Optional[str],
        event_type: str,
        occurred_at: datetime,
        subject: Optional[Dict[str, Any]] = None,
        action: Optional[Dict[str, Any]] = None,
        resource: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        trace: Optional[Dict[str, Any]] = None,
        classification: str = "INTERNAL",
        environment: str = "production",
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Produces (normalized_payload, sanitized_raw_payload)
        """
        subject = subject or {}
        action = action or {}
        resource = resource or {}
        context = context or {}
        result = result or {}
        trace = trace or {}
        raw_payload = raw_payload or {}

        # 1. Sanitize raw payload
        sanitized_raw = cls.redact_secrets(raw_payload)

        # 2. Extract trace correlation identifiers
        trace_id = trace.get("trace_id") or context.get("trace_id")
        span_id = trace.get("span_id") or context.get("span_id")
        parent_span_id = trace.get("parent_span_id") or context.get("parent_span_id")
        request_id = context.get("request_id") or trace.get("request_id")

        clean_trace = {
            "trace_id": str(trace_id) if trace_id else None,
            "span_id": str(span_id) if span_id else None,
            "parent_span_id": str(parent_span_id) if parent_span_id else None,
            "request_id": str(request_id) if request_id else None,
        }

        # 3. Canonical normalized structure
        normalized = {
            "schema_version": "1.0.0",
            "event_id": event_id,
            "project_id": str(project_id),
            "source_type": source_type,
            "source_id": source_id,
            "source_event_id": source_event_id,
            "event_type": event_type,
            "occurred_at": occurred_at.isoformat() if hasattr(occurred_at, "isoformat") else str(occurred_at),
            "environment": environment,
            "classification": classification,
            "subject": cls.redact_secrets(subject),
            "action": cls.redact_secrets(action),
            "resource": cls.redact_secrets(resource),
            "context": cls.redact_secrets(context),
            "result": cls.redact_secrets(result),
            "trace": clean_trace,
        }

        return normalized, sanitized_raw

    @classmethod
    def redact_sensitive_keys(cls, data: Any) -> Any:
        return cls.redact_secrets(data)

    @classmethod
    def normalize(
        cls,
        event_id: Optional[str],
        project_id: Any,
        source_type: Any,
        source_id: str,
        event_type: Any,
        occurred_at: datetime,
        received_at: Optional[datetime] = None,
        subject: Optional[Dict[str, Any]] = None,
        action: Optional[Dict[str, Any]] = None,
        resource: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
        result: Optional[Dict[str, Any]] = None,
        classification: Any = "INTERNAL",
        environment: str = "production",
        raw_payload: Optional[Dict[str, Any]] = None,
        trace: Optional[Dict[str, Any]] = None,
        source_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        st_val = source_type.value if hasattr(source_type, "value") else str(source_type)
        et_val = event_type.value if hasattr(event_type, "value") else str(event_type)
        cl_val = classification.value if hasattr(classification, "value") else str(classification)
        eid = event_id or f"evt_{uuid_gen()}"

        normalized, _ = cls.normalize_event(
            event_id=eid,
            project_id=str(project_id),
            source_type=st_val,
            source_id=source_id,
            source_event_id=source_event_id,
            event_type=et_val,
            occurred_at=occurred_at,
            subject=subject,
            action=action,
            resource=resource,
            context=context,
            result=result,
            trace=trace,
            classification=cl_val,
            environment=environment,
            raw_payload=raw_payload,
        )
        return normalized


import uuid
def uuid_gen():
    return str(uuid.uuid4())[:18]
