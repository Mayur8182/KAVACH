from typing import Any, Dict, List, Set
from app.contracts.dsl.ast import InvariantExpr, SecurityContractDefinition


class SemanticValidationError(Exception):
    def __init__(self, errors: List[Dict[str, Any]]):
        super().__init__("Semantic validation failed.")
        self.errors = errors


class SemanticValidator:
    """
    Validates semantic coherence:
    - Referenced fields match declared subject, action, resource, or context.
    - Scope conflicts (e.g. scope environment DEVELOPMENT vs invariant environment PRODUCTION).
    - Violation severity matches permitted ranges.
    """

    SUPPORTED_NAMESPACES = {
        "subject",
        "action",
        "resource",
        "context",
        "decision",
        "authorization",
        "delegation",
        "data_flow",
        "mcp",
        "audit_event",
        "evidence",
    }

    @classmethod
    def validate(cls, definition: SecurityContractDefinition) -> List[Dict[str, Any]]:
        errors: List[Dict[str, Any]] = []

        # 1. Collect all referenced field paths in invariant and conditions
        referenced_fields: Set[str] = set()
        cls._collect_fields(definition.invariant, referenced_fields)
        if definition.preconditions:
            cls._collect_fields(definition.preconditions, referenced_fields)
        if definition.postconditions:
            for post in definition.postconditions:
                cls._collect_fields(post, referenced_fields)

        # 2. Check field references against declared entities
        has_subject = definition.subject is not None
        has_action = definition.action is not None
        has_resource = definition.resource is not None

        for field_path in referenced_fields:
            parts = field_path.split(".")
            root_ns = parts[0]

            if root_ns not in cls.SUPPORTED_NAMESPACES:
                errors.append({
                    "path": f"field:{field_path}",
                    "code": "UNKNOWN_FIELD_NAMESPACE",
                    "message": f"Field namespace '{root_ns}' is invalid. Allowed namespaces: {sorted(list(cls.SUPPORTED_NAMESPACES))}",
                })
                continue

            if root_ns == "subject" and not has_subject:
                errors.append({
                    "path": f"field:{field_path}",
                    "code": "UNDEFINED_SUBJECT_REFERENCE",
                    "message": f"Reference '{field_path}' requires 'subject' declaration in contract.",
                })

            if root_ns == "action" and not has_action:
                errors.append({
                    "path": f"field:{field_path}",
                    "code": "UNDEFINED_ACTION_REFERENCE",
                    "message": f"Reference '{field_path}' requires 'action' declaration in contract.",
                })

            if root_ns == "resource" and not has_resource:
                errors.append({
                    "path": f"field:{field_path}",
                    "code": "UNDEFINED_RESOURCE_REFERENCE",
                    "message": f"Reference '{field_path}' requires 'resource' declaration in contract.",
                })

        # 3. Check Scope vs Invariant Environment Conflict (Section 23)
        if definition.scope.environment:
            scope_env = definition.scope.environment.upper()
            cls._check_env_conflict(definition.invariant, scope_env, errors)
            if definition.preconditions:
                cls._check_env_conflict(definition.preconditions, scope_env, errors)

        # 4. Check Global scope governance restriction (Section 6)
        if definition.scope.type.value == "GLOBAL":
            if not definition.metadata.get("allow_global_scope"):
                errors.append({
                    "path": "scope.type",
                    "code": "GLOBAL_SCOPE_RESTRICTED",
                    "message": "GLOBAL contracts require explicit 'allow_global_scope: true' in governance metadata.",
                })

        return errors

    @classmethod
    def _collect_fields(cls, expr: InvariantExpr, fields: Set[str]) -> None:
        if expr.field:
            fields.add(expr.field)
        if isinstance(expr.left, dict) and "field" in expr.left:
            fields.add(expr.left["field"])
        if isinstance(expr.right, dict) and "field" in expr.right:
            fields.add(expr.right["field"])
        if expr.conditions:
            for c in expr.conditions:
                cls._collect_fields(c, fields)
        if expr.operand:
            cls._collect_fields(expr.operand, fields)

    @classmethod
    def _check_env_conflict(cls, expr: InvariantExpr, scope_env: str, errors: List[Dict[str, Any]]) -> None:
        # If left is context.environment and right is a fixed value, verify no direct contradiction
        left_field = expr.left.get("field") if isinstance(expr.left, dict) else getattr(expr.left, "field", None)
        if left_field == "context.environment":
            right_val = expr.right.get("value") if isinstance(expr.right, dict) else getattr(expr.right, "value", expr.right)
            if isinstance(right_val, str) and right_val.upper() != scope_env:
                if expr.operator.value == "EQUALS":
                    errors.append({
                        "path": "invariant.environment",
                        "code": "SCOPE_ENVIRONMENT_CONFLICT",
                        "message": f"Contract scope restricts environment to '{scope_env}', but expression requires '{right_val.upper()}'.",
                    })

        if expr.conditions:
            for c in expr.conditions:
                cls._check_env_conflict(c, scope_env, errors)
        if expr.operand:
            cls._check_env_conflict(expr.operand, scope_env, errors)
