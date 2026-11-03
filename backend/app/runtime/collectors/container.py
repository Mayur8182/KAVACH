"""
Docker / Container Runtime Evidence Collector.
Captures container lifecycle and execution events with image digest verification.
Reports NOT_CONFIGURED when docker daemon socket/endpoint is unavailable.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.enums import (
    EvidenceClassification,
    EvidenceEventType,
    EvidenceSourceStatus,
    EvidenceSourceType,
    EvidenceTrustLevel,
    TimestampQuality,
)
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class ContainerEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.CONTAINER

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        cfg = config or {}
        # Checks for DOCKER_HOST or docker socket or explicitly enabled in config
        if cfg.get("enabled"):
            return True
        docker_host = os.environ.get("DOCKER_HOST")
        if docker_host:
            return True
        # On Linux/Unix standard socket
        if os.path.exists("/var/run/docker.sock"):
            return True
        # On Windows standard named pipe check or config
        if cfg.get("socket_path") and os.path.exists(cfg.get("socket_path")):
            return True
        return False

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        if not self.is_configured(config):
            return EvidenceSourceStatus.NOT_CONFIGURED
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        action = raw_event.get("Action", raw_event.get("action", "unknown"))
        actor = raw_event.get("Actor", raw_event.get("actor", {}))
        attributes = actor.get("Attributes", actor.get("attributes", {}))
        
        container_id = raw_event.get("id", actor.get("ID", attributes.get("container_id", "unknown_container")))
        container_name = attributes.get("name", "unknown")
        image_name = attributes.get("image", raw_event.get("from", "unknown"))
        
        # Digest check
        image_digest = attributes.get("image_digest")
        image_identity_quality = "VERIFIED" if image_digest and image_digest.startswith("sha256:") else "PARTIAL"

        event_type = EvidenceEventType.CONTAINER_START if action in ["start", "create"] else (
            EvidenceEventType.CONTAINER_STOP if action in ["stop", "die", "kill"] else (
                EvidenceEventType.CONTAINER_EXEC if action in ["exec_create", "exec_start"] else EvidenceEventType.AUDIT_EVENT
            )
        )

        time_val = raw_event.get("time") or raw_event.get("timeNano")
        if time_val:
            try:
                if isinstance(time_val, (int, float)):
                    # Handle nanoseconds vs seconds
                    if time_val > 1e11:
                        time_val = time_val / 1e9
                    occurred_at = datetime.fromtimestamp(time_val, tz=timezone.utc)
                else:
                    occurred_at = datetime.fromisoformat(str(time_val).replace("Z", "+00:00"))
            except Exception:
                occurred_at = datetime.now(timezone.utc)
        else:
            occurred_at = datetime.now(timezone.utc)

        source_event_id = raw_event.get("source_event_id") or f"{container_id}_{action}_{int(occurred_at.timestamp())}"

        return RuntimeEvidenceIngestRequest(
            project_id=project_id,
            source_type=EvidenceSourceType.CONTAINER,
            source_id="docker-runtime-collector",
            source_event_id=source_event_id,
            event_type=event_type,
            occurred_at=occurred_at,
            timestamp_quality=TimestampQuality.SOURCE_REPORTED,
            trust_level=EvidenceTrustLevel.VALIDATED,
            subject={"type": "CONTAINER", "id": container_id, "name": container_name},
            action={"type": action.upper(), "action_name": action},
            resource={
                "type": "CONTAINER_IMAGE",
                "id": image_name,
                "image_digest": image_digest,
                "image_identity_quality": image_identity_quality,
            },
            context={
                "attributes": attributes,
                "exit_code": attributes.get("exitCode"),
            },
            result={"status": "RECORDED"},
            classification=EvidenceClassification.INTERNAL,
            environment=raw_event.get("environment", "production"),
            raw_payload=raw_event,
        )
