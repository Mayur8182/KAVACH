import fnmatch
import re
from typing import Any, Dict, List, Tuple
from app.contracts.dsl.ast import InvariantExpr
from app.contracts.enums import EvaluationTruthValue
from app.contracts.evaluator.context import EvidenceContext, _SENTINEL_MISSING


class OperatorEvaluator:
    """
    Evaluates AST invariant expressions deterministically using Three-Valued Logic (3VL):
    - TRUE
    - FALSE
    - UNKNOWN

    Unknown/missing evidence NEVER converts to TRUE.
    """

    @classmethod
    def evaluate_expr(
        cls,
        expr: InvariantExpr,
        ctx: EvidenceContext,
        trace_steps: List[Dict[str, Any]],
    ) -> EvaluationTruthValue:
        op = expr.operator.value if hasattr(expr.operator, "value") else str(expr.operator)

        # 1. Composite AND
        if op == "AND":
            sub_results = []
            for idx, c in enumerate(expr.conditions or []):
                res = cls.evaluate_expr(c, ctx, trace_steps)
                sub_results.append(res)
                if res == EvaluationTruthValue.FALSE:
                    # Short-circuit in 3VL: FALSE and anything is FALSE
                    trace_steps.append({
                        "operator": "AND",
                        "sub_results": [r.value for r in sub_results],
                        "result": EvaluationTruthValue.FALSE.value,
                    })
                    return EvaluationTruthValue.FALSE

            if any(r == EvaluationTruthValue.UNKNOWN for r in sub_results):
                result = EvaluationTruthValue.UNKNOWN
            else:
                result = EvaluationTruthValue.TRUE

            trace_steps.append({
                "operator": "AND",
                "sub_results": [r.value for r in sub_results],
                "result": result.value,
            })
            return result

        # 2. Composite OR
        if op == "OR":
            sub_results = []
            for idx, c in enumerate(expr.conditions or []):
                res = cls.evaluate_expr(c, ctx, trace_steps)
                sub_results.append(res)
                if res == EvaluationTruthValue.TRUE:
                    # Short-circuit in 3VL: TRUE or anything is TRUE
                    trace_steps.append({
                        "operator": "OR",
                        "sub_results": [r.value for r in sub_results],
                        "result": EvaluationTruthValue.TRUE.value,
                    })
                    return EvaluationTruthValue.TRUE

            if any(r == EvaluationTruthValue.UNKNOWN for r in sub_results):
                result = EvaluationTruthValue.UNKNOWN
            else:
                result = EvaluationTruthValue.FALSE

            trace_steps.append({
                "operator": "OR",
                "sub_results": [r.value for r in sub_results],
                "result": result.value,
            })
            return result

        # 3. Composite NOT
        if op == "NOT":
            sub_res = cls.evaluate_expr(expr.operand, ctx, trace_steps)
            if sub_res == EvaluationTruthValue.TRUE:
                result = EvaluationTruthValue.FALSE
            elif sub_res == EvaluationTruthValue.FALSE:
                result = EvaluationTruthValue.TRUE
            else:
                result = EvaluationTruthValue.UNKNOWN

            trace_steps.append({
                "operator": "NOT",
                "operand_result": sub_res.value,
                "result": result.value,
            })
            return result

        # 4. Unary EXISTS / NOT_EXISTS
        if op in ("EXISTS", "NOT_EXISTS"):
            field_name = expr.field or (expr.left.get("field") if isinstance(expr.left, dict) else None)
            val = ctx.resolve_field(field_name) if field_name else _SENTINEL_MISSING
            exists = (val is not _SENTINEL_MISSING and val is not None)

            if op == "EXISTS":
                result = EvaluationTruthValue.TRUE if exists else EvaluationTruthValue.FALSE
            else:
                result = EvaluationTruthValue.FALSE if exists else EvaluationTruthValue.TRUE

            trace_steps.append({
                "operator": op,
                "field": field_name,
                "observed_value": None if val is _SENTINEL_MISSING else val,
                "exists": exists,
                "result": result.value,
            })
            return result

        # 5. Binary Comparison Operators
        left_val, left_str = cls._resolve_operand(expr.left, ctx)
        right_val, right_str = cls._resolve_operand(expr.right, ctx)

        # In three-valued logic, if either operand references an unsupplied field, result is UNKNOWN
        if left_val is _SENTINEL_MISSING or right_val is _SENTINEL_MISSING:
            trace_steps.append({
                "operator": op,
                "left_expr": left_str,
                "right_expr": right_str,
                "left_observed": "MISSING" if left_val is _SENTINEL_MISSING else left_val,
                "right_observed": "MISSING" if right_val is _SENTINEL_MISSING else right_val,
                "result": EvaluationTruthValue.UNKNOWN.value,
                "reason": "Missing evidence operand",
            })
            return EvaluationTruthValue.UNKNOWN

        truth = cls._evaluate_binary_operator(op, left_val, right_val)
        result = EvaluationTruthValue.TRUE if truth else EvaluationTruthValue.FALSE

        trace_steps.append({
            "operator": op,
            "left_expr": left_str,
            "right_expr": right_str,
            "left_observed": left_val,
            "right_observed": right_val,
            "result": result.value,
        })
        return result

    @classmethod
    def _resolve_operand(cls, operand: Any, ctx: EvidenceContext) -> Tuple[Any, str]:
        if isinstance(operand, dict):
            if "field" in operand:
                field_path = operand["field"]
                val = ctx.resolve_field(field_path)
                return val, f"field:{field_path}"
            elif "value" in operand:
                return operand["value"], f"value:{operand['value']}"
            return operand, str(operand)
        elif hasattr(operand, "field"):
            val = ctx.resolve_field(operand.field)
            return val, f"field:{operand.field}"
        elif hasattr(operand, "value"):
            return operand.value, f"value:{operand.value}"
        else:
            return operand, str(operand)

    @classmethod
    def _evaluate_binary_operator(cls, op: str, left: Any, right: Any) -> bool:
        if op == "EQUALS":
            return str(left) == str(right) if (isinstance(left, str) or isinstance(right, str)) else left == right
        elif op == "NOT_EQUALS":
            return str(left) != str(right) if (isinstance(left, str) or isinstance(right, str)) else left != right
        elif op == "IN":
            # Support set inclusion (left subset of right) e.g. agent.authority IN delegated_authority
            if isinstance(left, (list, tuple, set)) and isinstance(right, (list, tuple, set)):
                return set(left).issubset(set(right))
            if isinstance(right, (list, tuple, set)):
                return left in right or str(left) in [str(x) for x in right]
            return str(left) in str(right)
        elif op == "NOT_IN":
            if isinstance(left, (list, tuple, set)) and isinstance(right, (list, tuple, set)):
                return not set(left).issubset(set(right))
            if isinstance(right, (list, tuple, set)):
                return left not in right and str(left) not in [str(x) for x in right]
            return str(left) not in str(right)
        elif op == "CONTAINS":
            if isinstance(left, (list, tuple, set)):
                return right in left or str(right) in [str(x) for x in left]
            return str(right) in str(left)
        elif op == "NOT_CONTAINS":
            if isinstance(left, (list, tuple, set)):
                return right not in left and str(right) not in [str(x) for x in left]
            return str(right) not in str(left)
        elif op == "STARTS_WITH":
            return str(left).startswith(str(right))
        elif op == "ENDS_WITH":
            return str(left).endswith(str(right))
        elif op == "MATCHES":
            pattern = str(right)
            return bool(re.search(pattern, str(left)))
        elif op in ("GREATER_THAN", "GREATER_THAN_OR_EQUAL", "LESS_THAN", "LESS_THAN_OR_EQUAL"):
            try:
                l_num = float(left)
                r_num = float(right)
                if op == "GREATER_THAN":
                    return l_num > r_num
                elif op == "GREATER_THAN_OR_EQUAL":
                    return l_num >= r_num
                elif op == "LESS_THAN":
                    return l_num < r_num
                elif op == "LESS_THAN_OR_EQUAL":
                    return l_num <= r_num
            except (ValueError, TypeError):
                # Fallback to string comparison
                l_str = str(left)
                r_str = str(right)
                if op == "GREATER_THAN":
                    return l_str > r_str
                elif op == "GREATER_THAN_OR_EQUAL":
                    return l_str >= r_str
                elif op == "LESS_THAN":
                    return l_str < r_str
                elif op == "LESS_THAN_OR_EQUAL":
                    return l_str <= r_str
        return False

    @classmethod
    def evaluate_and(cls, items: List[EvaluationTruthValue]) -> EvaluationTruthValue:
        if any(i == EvaluationTruthValue.FALSE for i in items):
            return EvaluationTruthValue.FALSE
        if any(i == EvaluationTruthValue.UNKNOWN for i in items):
            return EvaluationTruthValue.UNKNOWN
        return EvaluationTruthValue.TRUE

    @classmethod
    def evaluate_or(cls, items: List[EvaluationTruthValue]) -> EvaluationTruthValue:
        if any(i == EvaluationTruthValue.TRUE for i in items):
            return EvaluationTruthValue.TRUE
        if any(i == EvaluationTruthValue.UNKNOWN for i in items):
            return EvaluationTruthValue.UNKNOWN
        return EvaluationTruthValue.FALSE

    @classmethod
    def evaluate_not(cls, item: EvaluationTruthValue) -> EvaluationTruthValue:
        if item == EvaluationTruthValue.TRUE:
            return EvaluationTruthValue.FALSE
        if item == EvaluationTruthValue.FALSE:
            return EvaluationTruthValue.TRUE
        return EvaluationTruthValue.UNKNOWN

    @classmethod
    def evaluate_starts_with(cls, left: Any, right: Any) -> EvaluationTruthValue:
        return EvaluationTruthValue.TRUE if str(left).startswith(str(right)) else EvaluationTruthValue.FALSE

    @classmethod
    def evaluate_greater_than(cls, left: Any, right: Any) -> EvaluationTruthValue:
        truth = cls._evaluate_binary_operator("GREATER_THAN", left, right)
        return EvaluationTruthValue.TRUE if truth else EvaluationTruthValue.FALSE

    @classmethod
    def evaluate_exists(cls, val: Any) -> EvaluationTruthValue:
        return EvaluationTruthValue.TRUE if (val is not None and val is not _SENTINEL_MISSING) else EvaluationTruthValue.FALSE


# Alias for compatibility
ThreeValuedEvaluator = OperatorEvaluator
