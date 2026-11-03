"""
Step 21 Investigation Engine: Cases, Questions, Hypotheses & Root Cause Verification.

Rules:
- RULE 68: NO AUTOMATIC ROOT CAUSE CLAIM (hypotheses vs verified root cause).
- Section 84: Contradictory Evidence Handling.
- Section 117: Root cause cannot be marked VERIFIED without supporting evidence.
"""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone

from app.incidents.enums import (
    InvestigationObjective,
    QuestionStatus,
    HypothesisStatus,
    RootCauseStatus,
    EvidenceConfidence,
)


class InvestigationEngine:
    """
    Orchestrates forensic investigation cases, evidence queries, hypotheses, and root-cause validation.
    """

    @staticmethod
    def detect_contradictions(evidence_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Identifies contradicting evidence (e.g. access denied vs query executed).
        """
        contradictions = []
        has_denied = False
        has_executed = False
        denied_item = None
        executed_item = None

        for item in evidence_items:
            content = str(item.get("content") or item.get("data") or item.get("metadata", "")).lower()
            if "denied" in content or "unauthorized" in content or "blocked" in content:
                has_denied = True
                denied_item = item
            if "query executed" in content or "status: 200" in content or "write succeeded" in content or "access granted" in content:
                has_executed = True
                executed_item = item

        if has_denied and has_executed:
            contradictions.append({
                "type": "AUTHORIZATION_VS_EXECUTION_MISMATCH",
                "explanation": "Contradictory evidence detected: Telemetry shows access was blocked/denied, yet execution/data transfer was observed.",
                "evidence_a": denied_item.get("id") or denied_item.get("evidence_id"),
                "evidence_b": executed_item.get("id") or executed_item.get("evidence_id"),
                "status": "CONTRADICTED",
            })

        return contradictions

    @staticmethod
    def validate_root_cause_verification(
        statement: str,
        supporting_evidence_ids: List[str],
        contradictions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        RULE 68 & TEST 117:
        Validates whether a root cause can be marked VERIFIED.
        Rejects verification if supporting evidence is missing or if unresolved contradictions exist.
        """
        if not supporting_evidence_ids or len(supporting_evidence_ids) == 0:
            return {
                "allowed": False,
                "status": RootCauseStatus.HYPOTHESIS.value,
                "reason": "Root cause cannot be marked VERIFIED without deterministic supporting evidence (Rule 68, Test 117).",
            }

        if contradictions and len(contradictions) > 0:
            return {
                "allowed": False,
                "status": RootCauseStatus.SUPPORTED.value,
                "reason": "Unresolved contradictory evidence exists; root cause cannot be marked VERIFIED until contradictions are resolved.",
            }

        return {
            "allowed": True,
            "status": RootCauseStatus.VERIFIED.value,
            "reason": "Root cause verified by supporting forensic evidence without contradiction.",
        }
