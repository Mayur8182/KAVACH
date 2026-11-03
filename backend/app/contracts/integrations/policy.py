"""
Contract Engine integration with Step 7 Policy Engine.
Contract verification results feed policy decisions as deterministic evidence.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.contracts.enums import VerificationStatus, SeverityLevel


class ContractPolicyEvidence(BaseModel):
    contract_key: str
    contract_version: int
    verification_status: str
    severity: str
    definition_hash: str
    invariants_passed: int
    invariants_failed: int
    invariants_unknown: int
    trace: List[Dict[str, Any]] = Field(default_factory=list)


class ContractPolicyDecision(BaseModel):
    effect: str  # ALLOW, BLOCK, REQUIRE_APPROVAL, WARN
    reason: str
    rule_name: str
    evidence: ContractPolicyEvidence


class ContractPolicyIntegration:
    """
    Evaluates contract verification evidence against deterministic policy rules.
    Architectural rule:
    Contract engine does not replace policy engine; contract results become authoritative evidence.
    """

    @staticmethod
    def evaluate_contract_evidence(
        contract_key: str,
        contract_version: int,
        definition_hash: str,
        verification_status: str,
        severity: str = SeverityLevel.HIGH.value,
        evaluation_result: Optional[Dict[str, Any]] = None,
        fail_closed_on_unknown: bool = True,
    ) -> ContractPolicyDecision:
        evaluation_result = evaluation_result or {}
        trace = evaluation_result.get("trace", [])
        passed = sum(1 for t in trace if t.get("result") in ["TRUE", True])
        failed = sum(1 for t in trace if t.get("result") in ["FALSE", False])
        unknown = sum(1 for t in trace if t.get("result") == "UNKNOWN")

        evidence = ContractPolicyEvidence(
            contract_key=contract_key,
            contract_version=contract_version,
            verification_status=verification_status,
            severity=severity,
            definition_hash=definition_hash,
            invariants_passed=passed,
            invariants_failed=failed,
            invariants_unknown=unknown,
            trace=trace,
        )

        if verification_status == VerificationStatus.VIOLATED.value:
            if severity in [SeverityLevel.HIGH.value, SeverityLevel.CRITICAL.value]:
                return ContractPolicyDecision(
                    effect="BLOCK",
                    reason=f"Security contract '{contract_key}' violated with {severity} severity.",
                    rule_name="CONTRACT_VIOLATION_BLOCK",
                    evidence=evidence,
                )
            elif severity == SeverityLevel.MEDIUM.value:
                return ContractPolicyDecision(
                    effect="REQUIRE_APPROVAL",
                    reason=f"Security contract '{contract_key}' violated with MEDIUM severity requiring approval.",
                    rule_name="CONTRACT_VIOLATION_APPROVAL",
                    evidence=evidence,
                )
            else:
                return ContractPolicyDecision(
                    effect="WARN",
                    reason=f"Security contract '{contract_key}' violated with LOW severity.",
                    rule_name="CONTRACT_VIOLATION_WARN",
                    evidence=evidence,
                )

        if verification_status == VerificationStatus.UNKNOWN.value:
            if fail_closed_on_unknown:
                return ContractPolicyDecision(
                    effect="BLOCK",
                    reason=f"Security contract '{contract_key}' evaluation is UNKNOWN and policy enforces FAIL_CLOSED.",
                    rule_name="CONTRACT_UNKNOWN_FAIL_CLOSED",
                    evidence=evidence,
                )
            else:
                return ContractPolicyDecision(
                    effect="WARN",
                    reason=f"Security contract '{contract_key}' verification status is UNKNOWN (missing evidence).",
                    rule_name="CONTRACT_UNKNOWN_WARN",
                    evidence=evidence,
                )

        if verification_status == VerificationStatus.VERIFIED.value:
            return ContractPolicyDecision(
                effect="ALLOW",
                reason=f"Security contract '{contract_key}' verified with valid evidence.",
                rule_name="CONTRACT_VERIFIED_ALLOW",
                evidence=evidence,
            )

        # Default for NOT_VERIFIED, NOT_APPLICABLE, etc.
        return ContractPolicyDecision(
            effect="REQUIRE_APPROVAL" if fail_closed_on_unknown else "WARN",
            reason=f"Security contract '{contract_key}' has status {verification_status}.",
            rule_name="CONTRACT_DEFAULT_ENFORCEMENT",
            evidence=evidence,
        )
