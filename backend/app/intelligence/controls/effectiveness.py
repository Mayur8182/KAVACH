"""
Step 20 Control Effectiveness Analysis.

Sections 50–52:
Quantifies factual verification outcomes without inventing aggregate scores.

RULE 55 — NO CONTROL SCORE / HEALTH SCORE.
Exposes factual counts: verified, violated, unknown, stale, and observed failure patterns.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class ControlEffectivenessAnalyzer:
    """
    Analyzes historical effectiveness of security controls and requirements.
    """

    @staticmethod
    def calculate_effectiveness(
        control_id: str,
        verification_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Factual tally of verification outcomes.
        """
        verified_count = 0
        violated_count = 0
        unknown_count = 0
        stale_count = 0
        last_verified_at = None
        last_violated_at = None

        for item in verification_history:
            result = item.get("result")
            v_time = item.get("verified_at") or item.get("completed_at")

            if result == "VERIFIED":
                verified_count += 1
                if not last_verified_at or (v_time and v_time > last_verified_at):
                    last_verified_at = v_time
            elif result == "VIOLATED":
                violated_count += 1
                if not last_violated_at or (v_time and v_time > last_violated_at):
                    last_violated_at = v_time
            elif result == "UNKNOWN":
                unknown_count += 1
            elif result == "STALE":
                stale_count += 1

        total = len(verification_history)

        failure_patterns = []
        if violated_count > 3:
            failure_patterns.append("REPEATED_CONTROL_VIOLATIONS")
        if stale_count > 5:
            failure_patterns.append("FREQUENT_STALE_EVIDENCE")
        if unknown_count > 2:
            failure_patterns.append("EVIDENCE_SOURCE_GAPS")

        return {
            "control_id": control_id,
            "verification_count": total,
            "verified_count": verified_count,
            "violated_count": violated_count,
            "unknown_count": unknown_count,
            "stale_count": stale_count,
            "last_verified_at": last_verified_at,
            "last_violated_at": last_violated_at,
            "failure_patterns": failure_patterns,
        }
