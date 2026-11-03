"""
Contract Engine integration with Step 5 Security Blueprint.
Allows deriving contract candidates from security blueprint requirements.
Preserves architectural separation: Blueprint Requirement -> Contract Candidate -> Validation -> Activation.
"""

from typing import Any, Dict, List, Optional
from app.contracts.schemas import ContractValidateRequest


class BlueprintContractGenerator:
    """
    Transforms Step 5 Security Requirements into contract candidate definitions.
    Does NOT automatically activate contracts.
    """

    @staticmethod
    def requirement_to_contract_candidate(
        requirement_key: str,
        title: str,
        description: str,
        category: str,
        severity: str = "HIGH",
    ) -> Dict[str, Any]:
        """
        Generates a valid structured DSL contract candidate from a blueprint requirement.
        """
        # Formulate structured candidate based on known requirement patterns
        if "IDEMPOTENCY" in requirement_key.upper() or "PAYMENT" in requirement_key.upper():
            return {
                "key": f"contract-{requirement_key.lower().replace('_', '-')}",
                "name": title,
                "description": description,
                "scope": {"type": "API", "resource_type": "PAYMENT"},
                "subject": {"type": "USER"},
                "action": {"type": "CREATE"},
                "resource": {"type": "PAYMENT"},
                "invariant": {
                    "operator": "EXISTS",
                    "field": "payment.idempotency_key",
                },
                "violation": {
                    "type": "PAYMENT_IDEMPOTENCY_MISSING",
                    "severity": severity,
                    "description": "Payment operation executed without idempotency key.",
                },
                "evidence": {
                    "required": [
                        {"type": "AUDIT_EVENT", "source": "API_GATEWAY", "required": True}
                    ]
                },
                "metadata": {"blueprint_requirement_key": requirement_key, "category": category},
            }

        # Generic contract candidate
        return {
            "key": f"contract-{requirement_key.lower().replace('_', '-')}",
            "name": title,
            "description": description,
            "scope": {"type": "PROJECT"},
            "subject": {"type": "SYSTEM"},
            "action": {"type": "EXECUTE"},
            "resource": {"type": "RESOURCE"},
            "invariant": {
                "operator": "EQUALS",
                "left": {"field": "context.requirement_verified"},
                "right": {"value": True},
            },
            "violation": {
                "type": f"VIOLATION_{requirement_key}",
                "severity": severity,
                "description": f"Requirement {requirement_key} invariant was violated.",
            },
            "evidence": {
                "required": [
                    {"type": "STATIC_ANALYSIS", "source": "SECURITY_SCANNER", "required": True}
                ]
            },
            "metadata": {"blueprint_requirement_key": requirement_key, "category": category},
        }
