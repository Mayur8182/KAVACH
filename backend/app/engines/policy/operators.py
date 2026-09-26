import fnmatch
import re
from typing import Any, Tuple
from app.engines.policy.models import ConditionCriterion, OperatorType


def evaluate_criterion(observed: Any, criterion: Any) -> Tuple[bool, str]:
    """
    Evaluates observed value against a criterion without using eval() or arbitrary code execution.
    Returns: (is_matched: bool, condition_description: str)
    """
    if isinstance(criterion, ConditionCriterion):
        op = criterion.operator
        val = criterion.value
    elif isinstance(criterion, dict):
        op_str = criterion.get("operator", "EQUALS")
        try:
            op = OperatorType(op_str.upper())
        except ValueError:
            op = OperatorType.EQUALS
        val = criterion.get("value")
    else:
        # Default simple literal equivalence
        op = OperatorType.EQUALS
        val = criterion

    cond_desc = f"{op.value} {val}"

    if op == OperatorType.EXISTS:
        matched = observed is not None and observed != "" and observed != []
        return matched, cond_desc

    if op == OperatorType.NOT_EXISTS:
        matched = observed is None or observed == "" or observed == []
        return matched, cond_desc

    if op == OperatorType.EQUALS:
        if observed is None and val is None:
            return True, cond_desc
        if observed is None or val is None:
            return False, cond_desc
        # String case-insensitive match for keywords/severities/environments
        if isinstance(observed, str) and isinstance(val, str):
            return observed.strip().upper() == val.strip().upper(), cond_desc
        return observed == val, cond_desc

    if op == OperatorType.NOT_EQUALS:
        if observed is None and val is None:
            return False, cond_desc
        if observed is None or val is None:
            return True, cond_desc
        if isinstance(observed, str) and isinstance(val, str):
            return observed.strip().upper() != val.strip().upper(), cond_desc
        return observed != val, cond_desc

    if op == OperatorType.IN:
        if observed is None:
            return False, cond_desc
        if isinstance(val, (list, tuple, set)):
            obs_norm = observed.strip().upper() if isinstance(observed, str) else observed
            val_norm = [item.strip().upper() if isinstance(item, str) else item for item in val]
            return obs_norm in val_norm, cond_desc
        elif isinstance(val, str) and isinstance(observed, str):
            return observed.strip().upper() in val.strip().upper(), cond_desc
        return False, cond_desc

    if op == OperatorType.NOT_IN:
        if observed is None:
            return True, cond_desc
        if isinstance(val, (list, tuple, set)):
            obs_norm = observed.strip().upper() if isinstance(observed, str) else observed
            val_norm = [item.strip().upper() if isinstance(item, str) else item for item in val]
            return obs_norm not in val_norm, cond_desc
        elif isinstance(val, str) and isinstance(observed, str):
            return observed.strip().upper() not in val.strip().upper(), cond_desc
        return True, cond_desc

    # Numeric comparisons
    try:
        obs_num = float(observed)
        val_num = float(val)
        if op == OperatorType.GREATER_THAN:
            return obs_num > val_num, cond_desc
        if op == OperatorType.GREATER_THAN_OR_EQUAL:
            return obs_num >= val_num, cond_desc
        if op == OperatorType.LESS_THAN:
            return obs_num < val_num, cond_desc
        if op == OperatorType.LESS_THAN_OR_EQUAL:
            return obs_num <= val_num, cond_desc
    except (ValueError, TypeError):
        pass

    if op == OperatorType.MATCHES:
        if observed is None or val is None:
            return False, cond_desc
        obs_str = str(observed)
        val_pattern = str(val)
        # Glob pattern match first
        if fnmatch.fnmatch(obs_str.lower(), val_pattern.lower()):
            return True, cond_desc
        # Safe regex pattern match
        try:
            return bool(re.search(val_pattern, obs_str, re.IGNORECASE)), cond_desc
        except re.error:
            return False, cond_desc

    return False, cond_desc
