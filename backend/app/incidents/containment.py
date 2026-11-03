"""
Step 21 Containment & Recovery Coordinator.

Sections 46–53, 56–58:
Coordinates containment and recovery with:
- Step 7 Policy Engine (OPA)
- Step 10 Authorization Engine
- Step 14 Response Execution
- Step 16 Attack / Contract Verification

RULE 46 — Never execute containment directly; all actions must route through Policy and Authorization.
RULE 67 — NO AUTOMATIC INCIDENT CLOSURE. Requires post-action verification.
"""

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone

from app.incidents.enums import (
    ContainmentActionType,
    ContainmentStatus,
    RecoveryActionType,
    RecoveryStatus,
)


class IncidentContainmentCoordinator:
    """
    Coordinates containment proposals with Step 7, Step 10, and Step 14.
    """

    @staticmethod
    def propose_containment(
        incident_id: uuid.UUID,
        action_type: ContainmentActionType,
        target_type: str,
        target_id: str,
        reason: str,
        scope: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Creates a structured containment proposal without executing it directly (Section 46).
        """
        return {
            "incident_id": incident_id,
            "action_type": action_type.value,
            "target_type": target_type,
            "target_id": target_id,
            "scope": scope or {"environment": "PRODUCTION", "target": target_id},
            "reason": reason,
            "status": ContainmentStatus.PROPOSED.value,
            "created_at": datetime.now(timezone.utc),
        }

    @staticmethod
    def evaluate_closure_readiness(
        incident_status: str,
        containment_status: str,
        root_cause_status: str,
        has_active_contract_violations: bool,
        recovery_status: str,
        closure_with_limitations: bool = False,
    ) -> Dict[str, Any]:
        """
        TEST 116 & SECTION 56:
        Validates closure readiness.
        Rejects closure if contracts are still violated, unless closure_with_limitations is approved.
        """
        rejection_reasons = []

        if has_active_contract_violations and not closure_with_limitations:
            rejection_reasons.append("Active contract violations remain unverified/unresolved.")

        if containment_status in (ContainmentStatus.PROPOSED.value, ContainmentStatus.PENDING_APPROVAL.value, ContainmentStatus.EXECUTING.value) or incident_status == "CONTAINMENT_REQUIRED":
            rejection_reasons.append("Containment is in progress or required but not completed.")

        if rejection_reasons:
            return {
                "can_close": False,
                "rejection_reasons": rejection_reasons,
                "closure_status": "REJECTED",
            }

        return {
            "can_close": True,
            "closure_status": "CLOSED_WITH_LIMITATIONS" if closure_with_limitations else "CLOSED",
            "rejection_reasons": [],
        }
