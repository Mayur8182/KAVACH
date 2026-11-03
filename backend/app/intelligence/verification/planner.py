"""
Step 20 Continuous Verification Planner.

Sections 28–32:
Plans and deduplicates verification jobs triggered by drift, graph changes,
evidence expiration, deployments, or runtime anomalies.

RULE 29 — FACTUAL REASONS (no opaque AI risk scores).
SECTION 32 — DEDUPLICATION of redundant verification requests.
"""

from typing import Dict, Any, List, Optional
import uuid
from app.intelligence.enums import TriggerType


class VerificationPlanner:
    """
    Schedules deterministic verification cycles with deduplication.
    """

    @staticmethod
    def plan_verification_job(
        project_id: uuid.UUID,
        trigger_type: TriggerType,
        trigger_id: str,
        contract_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        existing_active_dedup_keys: Optional[set] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Creates a planned verification job plan. Deduplicates if an identical job is already queued/running.
        """
        # Formulate deduplication key (Section 32)
        c_part = contract_id or "all_contracts"
        t_part = target_id or "project_wide"
        dedup_key = f"{project_id}:{trigger_type.value}:{c_part}:{t_part}"

        if existing_active_dedup_keys and dedup_key in existing_active_dedup_keys:
            # Already queued or running, skip duplicate creation
            return None

        # Factual priority assignment (Section 29)
        priority_reasons = []
        if trigger_type == TriggerType.ON_RUNTIME_VIOLATION:
            priority_reasons.append("ACTIVE_RUNTIME_VIOLATION")
        elif trigger_type == TriggerType.ON_DEPLOYMENT:
            priority_reasons.append("NEW_DEPLOYMENT_VERIFICATION")
        elif trigger_type in (TriggerType.ON_CLOUD_CONFIGURATION_CHANGE, TriggerType.ON_NETWORK_CHANGE, TriggerType.ON_IAM_CHANGE):
            priority_reasons.append("SECURITY_DRIFT_DETECTED")
        elif trigger_type == TriggerType.ON_EVIDENCE_EXPIRATION:
            priority_reasons.append("EVIDENCE_EXPIRED")
        else:
            priority_reasons.append("SCHEDULED_VERIFICATION")

        return {
            "project_id": project_id,
            "trigger_type": trigger_type.value,
            "trigger_id": trigger_id,
            "contract_id": contract_id,
            "requirement_id": requirement_id,
            "target_type": target_type,
            "target_id": target_id,
            "status": "QUEUED",
            "deduplication_key": dedup_key,
            "priority_reasons": priority_reasons,
        }
