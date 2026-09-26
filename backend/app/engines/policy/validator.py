from typing import Any, Dict, List, Optional, Tuple
from app.engines.policy.models import DecisionType, OperatorType, PolicyDefinition, RuleDefinition


DANGEROUS_PATTERNS = ["__", "eval(", "exec(", "import ", "os.", "sys.", "subprocess", "globals(", "locals("]


def validate_policy_definition(data: Dict[str, Any]) -> Tuple[bool, List[str], Optional[PolicyDefinition]]:
    """
    Validates a raw policy definition dictionary against the Policy DSL schema.
    Returns: (is_valid, errors_list, parsed_policy_definition)
    """
    errors: List[str] = []

    if not isinstance(data, dict):
        return False, ["Policy definition must be a JSON/YAML object."], None

    # Check for dangerous code injection attempts in string fields
    def check_strings_for_injection(obj: Any, path: str = ""):
        if isinstance(obj, str):
            for pat in DANGEROUS_PATTERNS:
                if pat in obj:
                    errors.append(f"Dangerous pattern '{pat}' detected at {path}. Dynamic code execution is forbidden.")
        elif isinstance(obj, dict):
            for k, v in obj.items():
                if any(pat in str(k) for pat in DANGEROUS_PATTERNS):
                    errors.append(f"Dangerous key '{k}' detected at {path}.")
                check_strings_for_injection(v, f"{path}.{k}" if path else str(k))
        elif isinstance(obj, list):
            for i, elem in enumerate(obj):
                check_strings_for_injection(elem, f"{path}[{i}]")

    check_strings_for_injection(data)
    if errors:
        return False, errors, None

    # Validate top-level fields
    name = data.get("name")
    if not name or not isinstance(name, str) or not name.strip():
        errors.append("Policy 'name' is required and must be a non-empty string.")

    rules_data = data.get("rules")
    if not rules_data or not isinstance(rules_data, list) or len(rules_data) == 0:
        errors.append("Policy must contain at least one rule in 'rules' array.")

    # Validate each rule
    if isinstance(rules_data, list):
        for idx, rule in enumerate(rules_data):
            if not isinstance(rule, dict):
                errors.append(f"Rule at index {idx} must be an object.")
                continue

            rule_name = rule.get("name")
            if not rule_name or not isinstance(rule_name, str):
                errors.append(f"Rule at index {idx} must have a valid 'name'.")

            decision_str = rule.get("decision")
            try:
                DecisionType(str(decision_str).upper())
            except (ValueError, TypeError):
                errors.append(
                    f"Rule '{rule_name or idx}' has invalid decision '{decision_str}'. "
                    f"Must be one of {[d.value for d in DecisionType]}"
                )

            when = rule.get("when")
            if not when or not isinstance(when, dict):
                errors.append(f"Rule '{rule_name or idx}' must specify a 'when' condition object.")
            else:
                # Validate operators in 'when'
                def validate_criterion(crit: Any, crit_path: str):
                    if isinstance(crit, dict):
                        op_str = crit.get("operator")
                        if op_str:
                            try:
                                OperatorType(str(op_str).upper())
                            except ValueError:
                                errors.append(
                                    f"Invalid operator '{op_str}' at {crit_path}. "
                                    f"Must be one of {[o.value for o in OperatorType]}"
                                )

                for condition_group, conditions in when.items():
                    if isinstance(conditions, dict):
                        if "operator" in conditions:
                            validate_criterion(conditions, f"{rule_name}.when.{condition_group}")
                        else:
                            for field_name, criterion in conditions.items():
                                validate_criterion(criterion, f"{rule_name}.when.{condition_group}.{field_name}")
                    else:
                        validate_criterion(conditions, f"{rule_name}.when.{condition_group}")

    if errors:
        return False, errors, None

    # Pydantic parse
    try:
        parsed = PolicyDefinition.model_validate(data)
        return True, [], parsed
    except Exception as exc:
        errors.append(f"Schema validation error: {str(exc)}")
        return False, errors, None
