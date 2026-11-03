from typing import Any, Dict, List, Tuple
from app.contracts.dsl.ast import InvariantExpr, SecurityContractDefinition
from app.contracts.dsl.parser import ContractParseError, ContractParser


class ContractSyntaxValidator:
    """
    Validates the syntactic correctness and AST coherence of contract definitions.
    """

    @classmethod
    def validate(cls, raw_data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]], SecurityContractDefinition]:
        errors: List[Dict[str, Any]] = []

        try:
            definition = ContractParser.parse_dict(raw_data)
        except ContractParseError as e:
            return False, e.errors, None

        # Verify expression syntax
        cls._validate_expr_syntax(definition.invariant, "invariant", errors)

        if definition.preconditions:
            cls._validate_expr_syntax(definition.preconditions, "preconditions", errors)

        if definition.postconditions:
            for idx, post in enumerate(definition.postconditions):
                cls._validate_expr_syntax(post, f"postconditions[{idx}]", errors)

        if errors:
            return False, errors, definition
        return True, [], definition

    @classmethod
    def _validate_expr_syntax(cls, expr: InvariantExpr, path: str, errors: List[Dict[str, Any]]) -> None:
        op = expr.operator.value if hasattr(expr.operator, "value") else str(expr.operator)

        if op in ("AND", "OR"):
            if not expr.conditions or len(expr.conditions) < 2:
                errors.append({
                    "path": f"{path}.conditions",
                    "code": "INVALID_COMPOSITE_EXPRESSION",
                    "message": f"Operator '{op}' requires at least 2 sub-conditions.",
                })
            else:
                for idx, cond in enumerate(expr.conditions):
                    cls._validate_expr_syntax(cond, f"{path}.conditions[{idx}]", errors)

        elif op == "NOT":
            if not expr.operand:
                errors.append({
                    "path": f"{path}.operand",
                    "code": "MISSING_NOT_OPERAND",
                    "message": "Operator 'NOT' requires a single 'operand' sub-expression.",
                })
            else:
                cls._validate_expr_syntax(expr.operand, f"{path}.operand", errors)

        elif op in ("EXISTS", "NOT_EXISTS"):
            if not expr.field and not expr.left:
                errors.append({
                    "path": f"{path}.field",
                    "code": "MISSING_UNARY_OPERAND",
                    "message": f"Operator '{op}' requires 'field' or 'left' operand.",
                })

        else:
            # Binary comparison operator
            if expr.left is None:
                errors.append({
                    "path": f"{path}.left",
                    "code": "MISSING_LEFT_OPERAND",
                    "message": f"Binary operator '{op}' requires 'left' operand.",
                })
            if expr.right is None:
                errors.append({
                    "path": f"{path}.right",
                    "code": "MISSING_RIGHT_OPERAND",
                    "message": f"Binary operator '{op}' requires 'right' operand.",
                })
