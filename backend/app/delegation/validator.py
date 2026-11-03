import fnmatch
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
import uuid

from app.delegation.errors import (
    AuthorityEscalationForbiddenError,
    DelegationDepthExceededError,
    EnvironmentEscalationForbiddenError,
    ExpirationEscalationForbiddenError,
    FurtherDelegationForbiddenError,
    ScopeEscalationForbiddenError,
    SelfDelegationForbiddenError,
)
from app.delegation.schemas import DelegationAuthority

MAX_DELEGATION_DEPTH = 3

ENV_HIERARCHY: Dict[str, int] = {
    "development": 1,
    "test": 2,
    "staging": 3,
    "production": 4,
}


class AuthoritySubsetValidator:
    """
    Deterministic validator enforcing the fundamental security rule:
    DELEGATED_AUTHORITY <= DELEGATOR_AUTHORITY.
    
    Ensures authority cannot increase through delegation across actions,
    resource scopes, environments, or expiration windows.
    """

    @staticmethod
    def validate_self_delegation(delegator_agent_id: uuid.UUID, delegate_agent_id: uuid.UUID) -> None:
        """Prevent self-delegation (Agent A -> Agent A)."""
        if delegator_agent_id == delegate_agent_id:
            raise SelfDelegationForbiddenError("An agent cannot delegate authority to itself.")

    @staticmethod
    def validate_authority_subset(
        available_actions: Set[str],
        requested_actions: List[str],
    ) -> None:
        """
        Validates: requested_actions ⊆ delegator_actions.
        If any requested action is not possessed by delegator, reject immediately.
        """
        missing_actions = [act for act in requested_actions if act not in available_actions]
        if missing_actions:
            raise AuthorityEscalationForbiddenError(
                f"Delegator lacks authority for requested actions: {missing_actions}. "
                "Authority cannot increase through delegation."
            )

    @staticmethod
    def validate_scope_subset(
        delegator_scope: Dict[str, Any],
        requested_scope: Dict[str, Any],
    ) -> None:
        """
        Validates: requested_resources ⊆ delegator_resources.
        Scope can only become narrower or equal, never wider.
        """
        # Project constraint
        delegator_pid = str(delegator_scope.get("project_id", "")).lower()
        requested_pid = str(requested_scope.get("project_id", "")).lower()
        if delegator_pid and requested_pid and delegator_pid != requested_pid:
            raise ScopeEscalationForbiddenError(
                f"Cross-project delegation forbidden. Delegator project '{delegator_pid}' "
                f"cannot delegate to project '{requested_pid}'."
            )

        # Repositories constraint
        del_repos = delegator_scope.get("repositories") or delegator_scope.get("repository")
        req_repos = requested_scope.get("repositories") or requested_scope.get("repository")
        if del_repos:
            del_list = [str(r).lower() for r in (del_repos if isinstance(del_repos, list) else [del_repos])]
            if req_repos:
                req_list = [str(r).lower() for r in (req_repos if isinstance(req_repos, list) else [req_repos])]
                # Every requested repo must be permitted in delegator scope
                if not all(any(dr in rr for dr in del_list) for rr in req_list):
                    raise ScopeEscalationForbiddenError(
                        f"Requested repository scope {req_list} exceeds delegator scope {del_list}."
                    )
            else:
                # If delegator is scoped to specific repos, delegate cannot have unbounded repos
                raise ScopeEscalationForbiddenError(
                    f"Delegator is restricted to repos {del_list}. Delegated authority must specify a repository subset."
                )

        # Branches constraint
        del_branches = delegator_scope.get("branches") or delegator_scope.get("branch")
        req_branches = requested_scope.get("branches") or requested_scope.get("branch")
        if del_branches:
            del_b_list = del_branches if isinstance(del_branches, list) else [del_branches]
            if req_branches:
                req_b_list = req_branches if isinstance(req_branches, list) else [req_branches]
                for rb in req_b_list:
                    if not any(fnmatch.fnmatch(rb, db) for db in del_b_list):
                        raise ScopeEscalationForbiddenError(
                            f"Requested branch scope '{rb}' exceeds delegator branch scope {del_b_list}."
                        )
            else:
                raise ScopeEscalationForbiddenError(
                    f"Delegator is restricted to branches {del_b_list}. Delegated authority must specify branch restrictions."
                )

    @staticmethod
    def validate_environment_clearance(
        delegator_env: str,
        requested_env: str,
    ) -> None:
        """
        Validates: requested_environment <= delegator_environment.
        A delegator authorized only for DEVELOPMENT cannot delegate PRODUCTION.
        """
        del_env_clean = (delegator_env or "development").lower()
        req_env_clean = (requested_env or "development").lower()

        del_level = ENV_HIERARCHY.get(del_env_clean, 1)
        req_level = ENV_HIERARCHY.get(req_env_clean, 1)

        if req_level > del_level:
            raise EnvironmentEscalationForbiddenError(
                f"Requested environment '{requested_env.upper()}' exceeds delegator clearance '{delegator_env.upper()}'. "
                "Authority cannot escalate to higher environments through delegation."
            )

    @staticmethod
    def validate_expiration_inheritance(
        delegator_expires_at: Optional[datetime],
        requested_expires_at: datetime,
    ) -> None:
        """
        Validates: requested_expiration <= delegator_expiration.
        A delegation cannot outlive its parent authority.
        """
        now = datetime.now(timezone.utc)
        req_exp = requested_expires_at
        if req_exp.tzinfo is None:
            req_exp = req_exp.replace(tzinfo=timezone.utc)

        if req_exp <= now:
            raise ExpirationEscalationForbiddenError("Requested delegation expiration is in the past.")

        if delegator_expires_at:
            del_exp = delegator_expires_at
            if del_exp.tzinfo is None:
                del_exp = del_exp.replace(tzinfo=timezone.utc)

            if req_exp > del_exp:
                raise ExpirationEscalationForbiddenError(
                    f"Requested expiration '{req_exp.isoformat()}' exceeds delegator authority expiration '{del_exp.isoformat()}'. "
                    "Delegations must be capped to authority lifetime."
                )

    @staticmethod
    def validate_further_delegation(
        allow_further: bool,
        is_subdelegation: bool,
    ) -> None:
        """
        If incoming authority has allow_further_delegation=False, subsequent delegation is blocked.
        """
        if is_subdelegation and not allow_further:
            raise FurtherDelegationForbiddenError(
                "Parent delegation explicitly forbade further delegation (allow_further_delegation=false)."
            )

    @staticmethod
    def validate_depth(depth: int, max_depth: int = MAX_DELEGATION_DEPTH) -> None:
        """Enforces configured delegation depth cap."""
        if depth > max_depth:
            raise DelegationDepthExceededError(depth=depth, max_depth=max_depth)

    @staticmethod
    def evaluate_condition_dsl(condition_spec: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """
        Evaluates structured condition DSL:
        {'all': [{'field': 'environment', 'operator': 'EQUALS', 'value': 'DEVELOPMENT'}]}
        """
        if not condition_spec:
            return True

        if "all" in condition_spec:
            return all(
                AuthoritySubsetValidator._eval_single_condition(c, context)
                for c in condition_spec["all"]
            )
        if "any" in condition_spec:
            return any(
                AuthoritySubsetValidator._eval_single_condition(c, context)
                for c in condition_spec["any"]
            )

        return AuthoritySubsetValidator._eval_single_condition(condition_spec, context)

    @staticmethod
    def _eval_single_condition(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
        field = rule.get("field")
        operator = rule.get("operator", "EQUALS").upper()
        expected = rule.get("value")

        actual = context.get(field)
        if actual is None:
            return False

        actual_str = str(actual).lower()
        expected_str = str(expected).lower() if expected is not None else ""

        if operator == "EQUALS":
            return actual_str == expected_str
        elif operator == "NOT_EQUALS":
            return actual_str != expected_str
        elif operator == "IN":
            if isinstance(expected, list):
                return actual_str in [str(x).lower() for x in expected]
            return False
        elif operator == "MATCHES":
            return fnmatch.fnmatch(actual_str, expected_str)
        elif operator == "CONTAINS":
            return expected_str in actual_str

        return False
