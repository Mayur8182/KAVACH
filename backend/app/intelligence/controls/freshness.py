"""
Step 20 Control Freshness & Evidence Expiration Engine.

Sections 25–27, 54:
Evaluates whether previously verified security requirements and contracts are still fresh
or have become STALE / EXPIRED due to time or dependent resource modifications.

RULE 54 — NO STATIC SECURITY STATE (VERIFIED YESTERDAY != VERIFIED TODAY).
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.intelligence.enums import ControlFreshnessStatus


class ControlFreshnessEvaluator:
    """
    Evaluates evidence expiration and marks controls STALE when dependent resources drift.
    """

    @staticmethod
    def evaluate_freshness(
        last_verified_at: Optional[datetime],
        evidence_window_seconds: int = 86400,  # 24h default
        dependent_resource_modified_at: Optional[datetime] = None,
        telemetry_source_available: bool = True,
    ) -> Dict[str, Any]:
        """
        Determines freshness state (FRESH, STALE, EXPIRED, UNKNOWN).
        """
        if not telemetry_source_available:
            return {
                "status": ControlFreshnessStatus.UNKNOWN.value,
                "stale_reason": "Required telemetry/evidence source is UNAVAILABLE or failed.",
                "is_verification_required": True,
            }

        if last_verified_at is None:
            return {
                "status": ControlFreshnessStatus.EXPIRED.value,
                "stale_reason": "Never verified.",
                "is_verification_required": True,
            }

        now = datetime.now(timezone.utc)
        if last_verified_at.tzinfo is None:
            last_verified_at = last_verified_at.replace(tzinfo=timezone.utc)

        # 1. Check if dependent resource was modified AFTER last verification
        if dependent_resource_modified_at is not None:
            if dependent_resource_modified_at.tzinfo is None:
                dependent_resource_modified_at = dependent_resource_modified_at.replace(tzinfo=timezone.utc)

            if dependent_resource_modified_at > last_verified_at:
                return {
                    "status": ControlFreshnessStatus.STALE.value,
                    "stale_reason": f"Dependent resource modified at {dependent_resource_modified_at.isoformat()}, after last verification at {last_verified_at.isoformat()}.",
                    "is_verification_required": True,
                }

        # 2. Check time window expiration
        age_seconds = (now - last_verified_at).total_seconds()
        if age_seconds > evidence_window_seconds:
            return {
                "status": ControlFreshnessStatus.EXPIRED.value,
                "stale_reason": f"Verification expired (age {int(age_seconds)}s exceeds window of {evidence_window_seconds}s).",
                "is_verification_required": True,
            }

        return {
            "status": ControlFreshnessStatus.FRESH.value,
            "stale_reason": None,
            "is_verification_required": False,
        }
