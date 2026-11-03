import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.scopes import ScopeContext, ScopeEvaluator
from app.models.agent import Agent
from app.models.authorization import AgentPermissionOverride, AgentRole

TRUST_LEVEL_HIERARCHY = {
    "UNTRUSTED": 0,
    "LOW": 1,
    "STANDARD": 2,
    "ELEVATED": 3,
}


class AuthorizationResult(BaseModel):
    decision: str  # ALLOW | DENY | REQUIRE_APPROVAL
    reason_code: str
    reason: str
    permission_snapshot: List[str] = Field(default_factory=list)
    scope_snapshot: Dict[str, Any] = Field(default_factory=dict)
    provenance: Optional[Dict[str, Any]] = None
    delegation_id: Optional[str] = None
    delegating_agent_id: Optional[str] = None


class DeterministicAuthorizationEvaluator:
    """
    Deterministic authorization engine for AI agents and principals.
    Enforces deny-by-default, strict project boundaries, and explicit precedence.
    No LLM is ever used to make authorization decisions.
    """

    @classmethod
    def evaluate(
        cls,
        principal: AuthenticatedPrincipal,
        action: str,
        scope_context: ScopeContext,
        agent: Optional[Agent] = None,
        minimum_trust_level: str = "LOW",
        delegations: Optional[List[Any]] = None,
    ) -> AuthorizationResult:
        now = datetime.now(timezone.utc)
        scope_dict = json.loads(scope_context.model_dump_json())

        # Handle Human / System Principals
        if principal.principal_type in ("USER", "SYSTEM"):
            # System has full internal authorization
            if principal.principal_type == "SYSTEM":
                return AuthorizationResult(
                    decision="ALLOW",
                    reason_code="SYSTEM_AUTHORIZED",
                    reason="System operations are intrinsically authorized.",
                    permission_snapshot=[action],
                    scope_snapshot=scope_dict,
                )
            # Users authorized within project scope
            return AuthorizationResult(
                decision="ALLOW",
                reason_code="USER_AUTHORIZED",
                reason=f"User principal '{principal.principal_id}' authorized for action.",
                permission_snapshot=[action],
                scope_snapshot=scope_dict,
            )

        # 1. Agent existence validation
        if not agent:
            return AuthorizationResult(
                decision="DENY",
                reason_code="AGENT_NOT_FOUND",
                reason=f"Agent ID '{principal.agent_id}' does not exist.",
                permission_snapshot=[],
                scope_snapshot=scope_dict,
            )

        # 2. Agent Lifecycle Status Check
        agent_status = (agent.status or "").upper()
        if agent_status == "REVOKED":
            return AuthorizationResult(
                decision="DENY",
                reason_code="AGENT_REVOKED",
                reason=f"Agent '{agent.name}' status is REVOKED. All operations unconditionally denied.",
                permission_snapshot=[],
                scope_snapshot=scope_dict,
            )

        if agent_status == "SUSPENDED":
            return AuthorizationResult(
                decision="DENY",
                reason_code="AGENT_SUSPENDED",
                reason=f"Agent '{agent.name}' status is SUSPENDED. Operations denied pending reactivation.",
                permission_snapshot=[],
                scope_snapshot=scope_dict,
            )

        if agent_status not in ("ACTIVE", "REGISTERED"):
            return AuthorizationResult(
                decision="DENY",
                reason_code="AGENT_INACTIVE",
                reason=f"Agent '{agent.name}' status is '{agent.status}'. Only ACTIVE agents may operate.",
                permission_snapshot=[],
                scope_snapshot=scope_dict,
            )

        # 3. Project Boundary Isolation Check
        if scope_context.project_id:
            if agent.project_id != scope_context.project_id:
                return AuthorizationResult(
                    decision="DENY",
                    reason_code="PROJECT_SCOPE_DENIED",
                    reason=(
                        f"Cross-project access violation: Agent '{agent.name}' is bound to project "
                        f"'{agent.project_id}' and cannot access target project '{scope_context.project_id}'."
                    ),
                    permission_snapshot=[],
                    scope_snapshot=scope_dict,
                )

        # 4. Trust Level Check
        agent_trust = (agent.trust_level or "STANDARD").upper()
        agent_rank = TRUST_LEVEL_HIERARCHY.get(agent_trust, 1)
        required_rank = TRUST_LEVEL_HIERARCHY.get(minimum_trust_level.upper(), 1)
        if agent_rank < required_rank:
            return AuthorizationResult(
                decision="DENY",
                reason_code="TRUST_LEVEL_INSUFFICIENT",
                reason=f"Agent trust level '{agent_trust}' is lower than required '{minimum_trust_level}'.",
                permission_snapshot=[],
                scope_snapshot=scope_dict,
            )

        # 5. Explicit Overrides Evaluation (Highest precedence)
        candidate_allowed = False
        overrides = agent.permission_overrides or []
        for ovr in overrides:
            # Check expiration
            if ovr.expires_at:
                exp = ovr.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    continue

            perm_name = ovr.permission.name if ovr.permission else ""
            if perm_name == action and ScopeEvaluator.matches_scope(ovr.scope or {}, scope_context):
                if ovr.effect.upper() == "DENY":
                    return AuthorizationResult(
                        decision="DENY",
                        reason_code="EXPLICIT_DENY",
                        reason=f"Explicit DENY override for '{action}': {ovr.reason or 'Administrative override'}",
                        permission_snapshot=[],
                        scope_snapshot=scope_dict,
                    )
                elif ovr.effect.upper() == "ALLOW":
                    candidate_allowed = True

        # 6. Role Permissions Resolution
        effective_permissions: List[str] = []
        agent_roles = agent.agent_roles or []
        for ar in agent_roles:
            # Check role assignment expiration
            if ar.expires_at:
                exp = ar.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    continue

            # Check role scope restriction
            if not ScopeEvaluator.matches_scope(ar.scope or {}, scope_context):
                continue

            if ar.role and ar.role.permissions:
                for perm in ar.role.permissions:
                    if perm.name not in effective_permissions:
                        effective_permissions.append(perm.name)

        # 6.5 Delegated Permissions Resolution (Step 11)
        delegated_match = None
        if delegations:
            for dl in delegations:
                # Expiration check
                exp = dl.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    continue

                # Delegator active status check (Revoked source authority propagation)
                if hasattr(dl, "delegator") and dl.delegator:
                    if dl.delegator.status != "ACTIVE":
                        continue

                # Scope check
                if not ScopeEvaluator.matches_scope(dl.scope or {}, scope_context):
                    continue

                auth_snap = dl.authority_snapshot or {}
                actions = auth_snap.get("actions", [])
                if action in actions:
                    from app.delegation.validator import AuthoritySubsetValidator
                    if dl.conditions and not AuthoritySubsetValidator.evaluate_condition_dsl(dl.conditions, scope_dict):
                        continue

                    if action not in effective_permissions:
                        effective_permissions.append(action)
                    delegated_match = dl
                    break

        # Baseline fallback permissions for agents without explicit roles or delegations assigned yet
        if not effective_permissions and not agent_roles and not delegations:
            effective_permissions = [
                "PROJECT_READ",
                "PROJECT_METADATA_READ",
                "BLUEPRINT_READ",
                "REQUIREMENT_READ",
                "SCAN_READ",
                "SCAN_EXECUTE",
                "FINDING_READ",
                "POLICY_READ",
                "POLICY_EVALUATE",
                "GITHUB_READ",
                "GITHUB_SCAN",
                "MCP_TOOL_DISCOVER",
                "MCP_TOOL_EXECUTE",
            ]

        # 7. Authorization Decision (Deny-by-default)
        if delegated_match:
            return AuthorizationResult(
                decision="ALLOW",
                reason_code="AUTHORIZED_VIA_DELEGATION",
                reason=f"Agent '{agent.name}' is authorized for action '{action}' via delegation from '{delegated_match.delegator_agent_id}'.",
                permission_snapshot=effective_permissions,
                scope_snapshot=scope_dict,
                provenance={
                    "source_type": "DELEGATION",
                    "delegation_id": str(delegated_match.id),
                    "delegator_agent_id": str(delegated_match.delegator_agent_id),
                },
                delegation_id=str(delegated_match.id),
                delegating_agent_id=str(delegated_match.delegator_agent_id),
            )

        if candidate_allowed or action in effective_permissions:
            return AuthorizationResult(
                decision="ALLOW",
                reason_code="AUTHORIZED",
                reason=f"Agent '{agent.name}' is authorized for action '{action}'.",
                permission_snapshot=effective_permissions,
                scope_snapshot=scope_dict,
                provenance={"source_type": "DIRECT_ROLE"},
            )

        return AuthorizationResult(
            decision="DENY",
            reason_code="PERMISSION_MISSING",
            reason=f"Agent '{agent.name}' lacks required permission '{action}'.",
            permission_snapshot=effective_permissions,
            scope_snapshot=scope_dict,
        )
