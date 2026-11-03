"""
Kubernetes Cluster Evidence Collector.
Captures pod lifecycle, namespace changes, container restarts, and config/secret accesses.
Reports NOT_CONFIGURED when KUBECONFIG or in-cluster service account is absent.
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


class KubernetesEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.KUBERNETES

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        cfg = config or {}
        if cfg.get("enabled"):
            return True
        kubeconfig = os.environ.get("KUBECONFIG")
        if kubeconfig and os.path.exists(kubeconfig):
            return True
        # In-cluster token path
        if os.path.exists("/var/run/secrets/kubernetes.io/serviceaccount/token"):
            return True
        # Default ~/.kube/config
        default_kube = os.path.expanduser("~/.kube/config")
        if os.path.exists(default_kube):
            return True
        return False

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        if not self.is_configured(config):
            return EvidenceSourceStatus.NOT_CONFIGURED
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        metadata = raw_event.get("metadata", {})
        involved_object = raw_event.get("involvedObject", {})
        
        name = metadata.get("name", involved_object.get("name", "unknown"))
        namespace = metadata.get("namespace", involved_object.get("namespace", "default"))
        kind = involved_object.get("kind", raw_event.get("kind", "Pod"))
        reason = raw_event.get("reason", "Event")
        message = raw_event.get("message", "")

        event_type = EvidenceEventType.KUBERNETES_EVENT
        if reason in ["Failed", "BackOff", "Unhealthy", "Killing"]:
            event_type = EvidenceEventType.CONTAINER_STOP
        elif reason in ["Started", "Created", "Pulled"]:
            event_type = EvidenceEventType.CONTAINER_START

        time_str = raw_event.get("eventTime") or raw_event.get("firstTimestamp") or metadata.get("creationTimestamp")
        if time_str:
            try:
                occurred_at = datetime.fromisoformat(str(time_str).replace("Z", "+00:00"))
            except Exception:
                occurred_at = datetime.now(timezone.utc)
        else:
            occurred_at = datetime.now(timezone.utc)

        uid = metadata.get("uid", f"{namespace}_{kind}_{name}_{reason}")

        return RuntimeEvidenceIngestRequest(
            project_id=project_id,
            source_type=EvidenceSourceType.KUBERNETES,
            source_id="k8s-cluster-collector",
            source_event_id=uid,
            event_type=event_type,
            occurred_at=occurred_at,
            timestamp_quality=TimestampQuality.SOURCE_REPORTED,
            trust_level=EvidenceTrustLevel.VALIDATED,
            subject={"type": "K8S_RESOURCE", "id": f"{namespace}/{kind}/{name}", "kind": kind, "namespace": namespace},
            action={"type": reason.upper(), "action_name": reason},
            resource={"type": "K8S_OBJECT", "id": name, "namespace": namespace, "kind": kind},
            context={
                "message": message,
                "reason": reason,
                "type": raw_event.get("type", "Normal"),
                "involved_object": involved_object,
            },
            result={"status": "RECORDED"},
            classification=EvidenceClassification.INTERNAL,
            environment=raw_event.get("environment", namespace),
            raw_payload=raw_event,
        )
