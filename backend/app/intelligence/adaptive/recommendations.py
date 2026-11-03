"""
Step 20 Adaptive Security Recommendations.

Sections 55–59:
Proposes adaptive security requirements, policy tightening, and contract updates.

RULE 58 — NO BLIND ADAPTATION (human review and policy workflow required).
RULE 59 — LLM IS NOT THE ADAPTIVE AUTHORITY (proposals start as PROPOSED).
"""

from typing import Dict, Any, Optional
import uuid
from app.intelligence.enums import RecommendationStatus


class AdaptiveRecommendationEngine:
    """
    Generates proposed updates to blueprints, policies, and contracts.
    """

    @staticmethod
    def propose_requirement_recommendation(
        project_id: uuid.UUID,
        proposed_requirement: Dict[str, Any],
        reason: str,
        evidence: Optional[Dict[str, Any]] = None,
        source_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a proposed security requirement recommendation for human review.
        """
        return {
            "project_id": project_id,
            "source_event_id": source_event_id,
            "proposed_requirement": proposed_requirement,
            "reason": reason,
            "evidence": evidence or {},
            "status": RecommendationStatus.PROPOSED.value,
        }

    @staticmethod
    def propose_policy_tightening(
        project_id: uuid.UUID,
        current_policy_version: str,
        proposed_policy: Dict[str, Any],
        reason: str,
        evidence: Optional[Dict[str, Any]] = None,
        source_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Proposes policy tightening (e.g. require approval on repeated privileged operations).
        """
        return {
            "project_id": project_id,
            "source_event_id": source_event_id,
            "current_policy_version": current_policy_version,
            "proposed_policy": proposed_policy,
            "reason": reason,
            "evidence": evidence or {},
            "status": RecommendationStatus.PROPOSED.value,
        }
