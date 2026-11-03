"""
Step 21 Forensic Evidence Collector Interface.

Sections 80–83:
Structured forensic collectors for Cloud, Kubernetes, Agent/MCP, Traces, GitHub, and CI/CD.
RULE 71 — Evidence Collection Must Be Authorized.
RULE 72 — Minimum Necessary Evidence.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.incidents.enums import CollectorStatus
from app.incidents.redaction import SecretRedactor, EvidenceIntegrityEngine


class BaseEvidenceCollector(ABC):
    """
    Abstract interface for authorized, structured forensic evidence collection.
    """

    def __init__(self, collector_type: str, collector_id: str):
        self.collector_type = collector_type
        self.collector_id = collector_id

    @abstractmethod
    async def execute_collection(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Implementation-specific collection logic. Must return raw evidence payload.
        """
        pass

    async def collect(
        self,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
        authorization_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Enforces authorization, collects artifacts, redacts secrets, calculates integrity hash, and returns standardized forensic record.
        """
        # Rule 71: Check Authorization Context
        actor = authorization_context.get("actor_id")
        permissions = authorization_context.get("permissions", [])
        required_permission = f"forensics:collect:{self.collector_type.lower()}"

        if not actor or (required_permission not in permissions and "admin" not in permissions and "forensics:*" not in permissions):
            return {
                "status": CollectorStatus.DENIED.value,
                "error": f"Authorization denied: actor '{actor}' lacks '{required_permission}' permission.",
                "evidence": None,
                "integrity": None,
            }

        try:
            raw_payload = await self.execute_collection(target, time_range, scope)
            if not raw_payload or raw_payload.get("status") in (CollectorStatus.NOT_CONFIGURED.value, CollectorStatus.UNAVAILABLE.value):
                return {
                    "status": raw_payload.get("status", CollectorStatus.UNAVAILABLE.value) if raw_payload else CollectorStatus.UNAVAILABLE.value,
                    "error": raw_payload.get("error", "Integration or telemetry source not configured or unreachable.") if raw_payload else "Source unreachable",
                    "evidence": None,
                    "integrity": None,
                }

            # Rule 73: Redact secrets before storing or hashing
            redacted_payload, was_redacted = SecretRedactor.redact_data(raw_payload.get("data", raw_payload))
            
            # Section 23: Compute SHA-256 integrity hash
            integrity_info = EvidenceIntegrityEngine.compute_integrity(redacted_payload)

            return {
                "status": CollectorStatus.COMPLETED.value,
                "collector_type": self.collector_type,
                "collector_id": self.collector_id,
                "target": target,
                "time_range": {k: v.isoformat() if hasattr(v, 'isoformat') else str(v) for k, v in time_range.items()},
                "scope": scope,
                "authorization_context": {
                    "actor_id": actor,
                    "authorized_at": datetime.now(timezone.utc).isoformat(),
                },
                "is_secret_redacted": was_redacted,
                "evidence": redacted_payload,
                "integrity": integrity_info,
                "error": None,
            }

        except Exception as ex:
            return {
                "status": CollectorStatus.FAILED.value,
                "error": f"Forensic collection failed: {str(ex)}",
                "evidence": None,
                "integrity": None,
            }
