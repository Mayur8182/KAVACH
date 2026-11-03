import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.enums import EvaluationTruthValue
from app.contracts.evaluator.context import EvidenceContext
from app.contracts.evaluator.operators import OperatorEvaluator


class ContractEvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    truth_value: EvaluationTruthValue
    is_satisfied: bool
    is_violated: bool
    is_unknown: bool
    is_not_applicable: bool
    contract_key: str
    version: int
    definition_hash: str
    evaluated_at: datetime
    verifier_version: str = "contract-evaluator:1.0.0"
    evaluation_trace: List[Dict[str, Any]] = Field(default_factory=list)
    violation_details: Optional[Dict[str, Any]] = None
    evidence_summary: Dict[str, Any] = Field(default_factory=dict)


class ContractEvaluator:
    """
    Deterministic Security Contract Evaluator.
    Input: SecurityContractDefinition + EvidenceContext
    Output: ContractEvaluationResult (TRUE, FALSE, UNKNOWN, NOT_APPLICABLE) with full evaluation trace.
    """

    VERIFIER_VERSION = "contract-evaluator:1.0.0"

    @classmethod
    def evaluate(
        cls,
        definition: SecurityContractDefinition,
        definition_hash: str,
        context: EvidenceContext,
        version: int = 1,
        evidence_summary: Optional[Dict[str, Any]] = None,
    ) -> ContractEvaluationResult:
        now = datetime.now(timezone.utc)
        trace_steps: List[Dict[str, Any]] = []

        # 1. Evaluate Preconditions if specified
        if definition.preconditions:
            pre_res = OperatorEvaluator.evaluate_expr(definition.preconditions, context, trace_steps)
            if pre_res == EvaluationTruthValue.FALSE:
                return ContractEvaluationResult(
                    truth_value=EvaluationTruthValue.NOT_APPLICABLE,
                    is_satisfied=False,
                    is_violated=False,
                    is_unknown=False,
                    is_not_applicable=True,
                    contract_key=definition.key,
                    version=version,
                    definition_hash=definition_hash,
                    evaluated_at=now,
                    evaluation_trace=trace_steps,
                    evidence_summary=evidence_summary or {},
                )
            elif pre_res == EvaluationTruthValue.UNKNOWN:
                return ContractEvaluationResult(
                    truth_value=EvaluationTruthValue.UNKNOWN,
                    is_satisfied=False,
                    is_violated=False,
                    is_unknown=True,
                    is_not_applicable=False,
                    contract_key=definition.key,
                    version=version,
                    definition_hash=definition_hash,
                    evaluated_at=now,
                    evaluation_trace=trace_steps,
                    evidence_summary=evidence_summary or {},
                )

        # 2. Evaluate Primary Invariant
        inv_res = OperatorEvaluator.evaluate_expr(definition.invariant, context, trace_steps)

        # 3. Check Postconditions if primary invariant holds
        post_res = EvaluationTruthValue.TRUE
        if inv_res == EvaluationTruthValue.TRUE and definition.postconditions:
            for post in definition.postconditions:
                r = OperatorEvaluator.evaluate_expr(post, context, trace_steps)
                if r == EvaluationTruthValue.FALSE:
                    post_res = EvaluationTruthValue.FALSE
                    break
                elif r == EvaluationTruthValue.UNKNOWN:
                    post_res = EvaluationTruthValue.UNKNOWN

        final_truth = inv_res if post_res == EvaluationTruthValue.TRUE else post_res

        # 4. Violation Details if violated
        violation_details = None
        if final_truth == EvaluationTruthValue.FALSE:
            violation_details = {
                "type": definition.violation.type,
                "severity": definition.violation.severity,
                "description": definition.violation.description,
                "detected_at": now.isoformat(),
            }

        return ContractEvaluationResult(
            truth_value=final_truth,
            is_satisfied=(final_truth == EvaluationTruthValue.TRUE),
            is_violated=(final_truth == EvaluationTruthValue.FALSE),
            is_unknown=(final_truth == EvaluationTruthValue.UNKNOWN),
            is_not_applicable=(final_truth == EvaluationTruthValue.NOT_APPLICABLE),
            contract_key=definition.key,
            version=version,
            definition_hash=definition_hash,
            evaluated_at=now,
            verifier_version=cls.VERIFIER_VERSION,
            evaluation_trace=trace_steps,
            violation_details=violation_details,
            evidence_summary=evidence_summary or {},
        )
