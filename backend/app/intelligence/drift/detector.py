"""
Step 20 Drift Detection Engine.

Sections 13–24:
Detects and classifies drift across code, infrastructure, K8s, cloud, identity,
delegations, data flows, networks, containers, and security controls.

RULE 56 — DRIFT IS NOT AUTOMATICALLY A VULNERABILITY.
RULE 62 — EXPLAIN EVERY DRIFT (what changed, previous state, current state, affected resource).
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.intelligence.enums import DriftType, DriftStatus


class DriftDetector:
    """
    Compares baseline/expected states with observed states to detect drift events.
    """

    @staticmethod
    def detect_state_drift(
        project_id: uuid.UUID,
        resource_type: str,
        resource_id: str,
        previous_state: Dict[str, Any],
        current_state: Dict[str, Any],
        drift_type: DriftType,
        source_event_id: Optional[str] = None,
        environment: str = "PRODUCTION",
        evidence_id: Optional[str] = None,
        graph_version: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Detects differences between previous_state and current_state.
        If drifted, returns an explainable drift event dictionary.
        """
        # Identify changed keys
        all_keys = set(previous_state.keys()) | set(current_state.keys())
        changed_fields = {}

        for k in all_keys:
            prev_val = previous_state.get(k)
            curr_val = current_state.get(k)
            if prev_val != curr_val:
                changed_fields[k] = {
                    "previous": prev_val,
                    "current": curr_val,
                }

        if not changed_fields:
            return None  # No drift detected

        # Determine severity context based on nature of changed fields
        severity = "MEDIUM"
        if environment == "PRODUCTION":
            critical_keywords = {"public", "admin", "privileged", "digest", "root", "secret", "permission", "0.0.0.0"}
            for field, diff in changed_fields.items():
                f_lower = field.lower()
                diff_str = str(diff).lower()
                if any(kw in f_lower or kw in diff_str for kw in critical_keywords):
                    severity = "CRITICAL"
                    break
                severity = "HIGH"

        now = datetime.now(timezone.utc)
        return {
            "project_id": project_id,
            "drift_type": drift_type.value,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "source_event_id": source_event_id,
            "previous_state": previous_state,
            "current_state": current_state,
            "detected_at": now,
            "observed_at": now,
            "environment": environment,
            "severity_context": severity,
            "status": DriftStatus.DETECTED.value,
            "evidence_id": evidence_id,
            "graph_version": graph_version,
            "metadata": {
                "changed_fields": changed_fields,
                "change_count": len(changed_fields),
                "explanation": f"Detected {len(changed_fields)} modified attributes on {resource_type} '{resource_id}'.",
            },
        }

    @staticmethod
    def detect_deployment_image_drift(
        project_id: uuid.UUID,
        deployment_id: str,
        expected_digest: str,
        observed_digest: str,
        source_event_id: Optional[str] = None,
        environment: str = "PRODUCTION",
    ) -> Optional[Dict[str, Any]]:
        """
        Specialized detector for container image digest drift (sha256:A -> sha256:B).
        """
        if expected_digest == observed_digest:
            return None

        return DriftDetector.detect_state_drift(
            project_id=project_id,
            resource_type="KUBERNETES_DEPLOYMENT",
            resource_id=deployment_id,
            previous_state={"image_digest": expected_digest},
            current_state={"image_digest": observed_digest},
            drift_type=DriftType.DEPLOYMENT_DRIFT,
            source_event_id=source_event_id,
            environment=environment,
        )

    @staticmethod
    def detect_authority_drift(
        project_id: uuid.UUID,
        principal_id: str,
        previous_permissions: List[str],
        current_permissions: List[str],
        source_event_id: Optional[str] = None,
        environment: str = "PRODUCTION",
    ) -> Optional[Dict[str, Any]]:
        """
        Specialized detector for IAM / Agent authority drift.
        """
        prev_set = set(previous_permissions)
        curr_set = set(current_permissions)

        if prev_set == curr_set:
            return None

        added_perms = list(curr_set - prev_set)
        removed_perms = list(prev_set - curr_set)

        return DriftDetector.detect_state_drift(
            project_id=project_id,
            resource_type="IAM_PRINCIPAL",
            resource_id=principal_id,
            previous_state={"permissions": previous_permissions},
            current_state={"permissions": current_permissions, "added": added_perms, "removed": removed_perms},
            drift_type=DriftType.AUTHORITY_DRIFT,
            source_event_id=source_event_id,
            environment=environment,
        )
