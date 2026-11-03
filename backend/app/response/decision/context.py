"""
Risk Context Builder for Step 14 Response Decision Engine.
Calculates environment, criticality, blast radius, data classification, and reversibility.
"""

from typing import Any, Dict, List, Optional
from app.response.enums import Reversibility


class ResponseRiskContext:
    @staticmethod
    def calculate_risk_context(
        target_type: str,
        target_id: str,
        violation_severity: str = "HIGH",
        environment: str = "PRODUCTION",
        data_classification: str = "CONFIDENTIAL",
        reversibility: Reversibility = Reversibility.REVERSIBLE,
    ) -> Dict[str, Any]:
        env_upper = environment.upper()
        is_prod = "PROD" in env_upper

        # Target criticality
        if is_prod or violation_severity in ("HIGH", "CRITICAL"):
            target_criticality = "CRITICAL" if violation_severity == "CRITICAL" else "HIGH"
        else:
            target_criticality = "MEDIUM"

        # Blast radius analysis
        blast_radius = {
            "target_type": target_type,
            "target_id": target_id,
            "scope": "LOCAL_ENTITY" if target_type in ("SESSION", "MCP_TOOL_CALL", "REQUEST") else "SERVICE_LEVEL",
            "cross_project_risk": False,
        }

        # Approval requirement determination:
        # High impact operations on production workloads require human approval
        requires_approval = (
            is_prod
            and target_type in ("CONTAINER", "KUBERNETES_POD", "KUBERNETES_DEPLOYMENT", "SERVICE", "DEPLOYMENT")
            or violation_severity == "CRITICAL" and target_type in ("AGENT", "SERVICE")
        )

        return {
            "environment": env_upper,
            "target_criticality": target_criticality,
            "severity": violation_severity,
            "blast_radius": blast_radius,
            "data_classification": data_classification,
            "reversibility": reversibility.value if hasattr(reversibility, "value") else str(reversibility),
            "requires_approval": requires_approval,
            "confidence": 1.0,
        }
