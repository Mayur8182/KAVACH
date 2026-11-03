import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.authorization.errors import AgentNotFoundError, AgentRevokedError, AgentSuspendedError
from app.delegation.data_flow import DataFlowSecurityEvaluator
from app.delegation.errors import (
    DelegatorNotAuthorizedError,
    FurtherDelegationForbiddenError,
    SelfDelegationForbiddenError,
)
from app.delegation.graph import AuthorityGraphService
from app.delegation.schemas import (
    AuthorityChainResponse,
    AuthorityGraphResponse,
    DataFlowCreateRequest,
    DataFlowResponse,
    DelegationCreateRequest,
    DelegationResponse,
    EffectiveAuthorityItem,
    EffectiveAuthorityResponse,
)
from app.delegation.validator import (
    AuthoritySubsetValidator,
    MAX_DELEGATION_DEPTH,
)
from app.models.agent import Agent
from app.models.authorization import AgentPermissionOverride, AgentRole, Permission, Role
from app.models.delegation import AgentAuthorityEdge, AgentDataFlow, AgentDelegation


class DelegationService:
    """
    Central orchestration service for Agent Delegation, Authority Graph management,
    Effective Authority calculation, and Data-Flow control.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.graph = AuthorityGraphService(db)
        self.data_flow = DataFlowSecurityEvaluator(db)
        from app.services.audit_service import AuditService
        self.audit = AuditService(db)

    async def create_delegation(
        self,
        delegator_agent_id: uuid.UUID,
        request: DelegationCreateRequest,
        actor_id: str = "system",
        actor_type: str = "USER",
    ) -> AgentDelegation:
        """
        Creates a persistent agent-to-agent delegation enforcing all Step 11 security constraints:
        - No self-delegation (Agent A -> Agent A)
        - Delegator possesses the requested authority
        - Requested authority ⊆ Delegator authority
        - Scope narrowing & environment clearance compliance
        - Expiration window capped by delegator authority
        - Further delegation rules respected
        - Maximum delegation depth capped
        - Bounded cycle detection
        - Atomic transactional creation of delegation and authority edge
        """
        # 1. Prevent self-delegation (Section 71)
        AuthoritySubsetValidator.validate_self_delegation(delegator_agent_id, request.delegate_agent_id)

        # 2. Resolve delegator and delegate
        stmt = select(Agent).where(Agent.id.in_([delegator_agent_id, request.delegate_agent_id]))
        agents = {a.id: a for a in (await self.db.execute(stmt)).scalars().all()}

        delegator = agents.get(delegator_agent_id)
        delegate = agents.get(request.delegate_agent_id)

        if not delegator:
            raise AgentNotFoundError(f"Delegator agent '{delegator_agent_id}' does not exist.")
        if not delegate:
            raise AgentNotFoundError(f"Delegate agent '{request.delegate_agent_id}' does not exist.")

        # Check statuses
        if delegator.status != "ACTIVE":
            raise DelegatorNotAuthorizedError(f"Delegator '{delegator.name}' is {delegator.status}. Cannot delegate.")
        if delegate.status != "ACTIVE":
            raise DelegatorNotAuthorizedError(f"Delegate '{delegate.name}' is {delegate.status}. Cannot receive authority.")

        # 3. Project boundary validation (Section 47)
        if delegator.project_id != delegate.project_id:
            raise DelegatorNotAuthorizedError("Cross-project delegation is prohibited without platform architecture bridging.")

        # 4. Resolve Delegator's Current Authority & Expiration
        delegator_effective = await self.get_effective_authority(delegator_agent_id)
        available_actions = {item.action for item in delegator_effective.effective_permissions}

        # Authority subset validation
        AuthoritySubsetValidator.validate_authority_subset(available_actions, request.authority.actions)

        # Scope subset validation
        delegator_scope = {"project_id": str(delegator.project_id)}
        requested_scope = dict(request.authority.resource_scope or {})
        if "project_id" not in requested_scope or not requested_scope["project_id"]:
            requested_scope["project_id"] = str(delegator.project_id)
        if request.authority.branch_scope:
            requested_scope["branches"] = request.authority.branch_scope

        AuthoritySubsetValidator.validate_scope_subset(delegator_scope, requested_scope)


        # Environment clearance validation
        delegator_max_env = "production" if any(
            item.scope.get("environment", "").lower() == "production"
            for item in delegator_effective.effective_permissions
        ) else "development"
        AuthoritySubsetValidator.validate_environment_clearance(delegator_max_env, request.authority.environment)

        # Expiration inheritance validation (Section 10)
        # Find earliest expiration among delegator's matching authorities if applicable
        matching_expirations = [
            item.expires_at for item in delegator_effective.effective_permissions
            if item.action in request.authority.actions and item.expires_at is not None
        ]
        delegator_exp_cap = min(matching_expirations) if matching_expirations else None
        AuthoritySubsetValidator.validate_expiration_inheritance(delegator_exp_cap, request.expires_at)

        # 5. Further delegation check (Section 20, 21)
        depth = 1
        parent_delegation = None
        if request.parent_delegation_id:
            parent_stmt = select(AgentDelegation).where(AgentDelegation.id == request.parent_delegation_id)
            parent_delegation = (await self.db.execute(parent_stmt)).scalar_one_or_none()
            if not parent_delegation or parent_delegation.status != "ACTIVE":
                raise DelegatorNotAuthorizedError("Parent delegation is invalid or inactive.")

            AuthoritySubsetValidator.validate_further_delegation(
                allow_further=parent_delegation.allow_further_delegation,
                is_subdelegation=True,
            )
            depth = parent_delegation.delegation_depth + 1

        # 6. Delegation Depth validation (Section 22)
        AuthoritySubsetValidator.validate_depth(depth, MAX_DELEGATION_DEPTH)

        # 7. Cycle Detection (Section 13 & 68)
        await self.graph.detect_cycle_before_delegation(delegator_agent_id, request.delegate_agent_id)

        # 8. Transactional Creation of Delegation & Graph Edge
        now = datetime.now(timezone.utc)
        req_exp = request.expires_at
        if req_exp.tzinfo is None:
            req_exp = req_exp.replace(tzinfo=timezone.utc)

        delegation = AgentDelegation(
            delegator_agent_id=delegator.id,
            delegate_agent_id=delegate.id,
            project_id=delegator.project_id,
            status="ACTIVE",
            starts_at=now,
            expires_at=req_exp,
            reason=request.reason,
            allow_further_delegation=request.allow_further_delegation,
            authority_snapshot=request.authority.model_dump(),
            scope=requested_scope,
            conditions=request.conditions,
            created_by=actor_id,
            created_by_type=actor_type,
            parent_delegation_id=request.parent_delegation_id,
            delegation_depth=depth,
        )
        self.db.add(delegation)
        await self.db.flush()

        # Add corresponding graph edge
        edge = AgentAuthorityEdge(
            delegation_id=delegation.id,
            source_agent_id=delegator.id,
            target_agent_id=delegate.id,
            project_id=delegator.project_id,
            authority=request.authority.model_dump(),
            scope=requested_scope,
            status="ACTIVE",
            depth=depth,
            expires_at=req_exp,
        )
        self.db.add(edge)
        await self.db.commit()
        await self.db.refresh(delegation)

        # 9. Audit event
        await self.audit.log_event(
            action="DELEGATION_CREATED",
            resource_type="AGENT_DELEGATION",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(delegation.id),
            project_id=delegator.project_id,
            status="SUCCESS",
            metadata={
                "delegator_agent": delegator.name,
                "delegate_agent": delegate.name,
                "actions": request.authority.actions,
                "depth": depth,
                "expires_at": req_exp.isoformat(),
            },
        )
        return delegation

    async def revoke_delegation(
        self,
        delegation_id: uuid.UUID,
        actor_id: str,
        reason: str = "User initiated revocation",
    ) -> List[uuid.UUID]:
        """
        Revokes a delegation and automatically invalidates all dependent child delegations in the subtree.
        """
        stmt = select(AgentDelegation).where(AgentDelegation.id == delegation_id)
        delegation = (await self.db.execute(stmt)).scalar_one_or_none()
        if not delegation:
            raise DelegatorNotAuthorizedError(f"Delegation '{delegation_id}' not found.")

        # Cascade revocation through graph service
        revoked_ids = await self.graph.cascade_revoke_delegation_subtree(
            delegation_id=delegation_id,
            revoked_by=actor_id,
            reason=reason,
        )

        await self.audit.log_event(
            action="DELEGATION_REVOKED",
            resource_type="AGENT_DELEGATION",
            actor_type="USER",
            actor_id=actor_id,
            resource_id=str(delegation_id),
            project_id=delegation.project_id,
            status="SUCCESS",
            metadata={
                "revoked_subtree_count": len(revoked_ids),
                "revocation_reason": reason,
            },
        )
        return revoked_ids

    async def get_effective_authority(self, agent_id: uuid.UUID) -> EffectiveAuthorityResponse:
        """
        Computes the complete effective authority profile for an agent,
        preserving distinct provenance for:
        - Direct role permissions
        - Active delegated permissions (with chain verification)
        - Filtering out expired or revoked authorities
        """
        # 1. Fetch agent
        stmt = (
            select(Agent)
            .options(
                selectinload(Agent.agent_roles)
                .selectinload(AgentRole.role)
                .selectinload(Role.permissions),
                selectinload(Agent.permission_overrides)
                .selectinload(AgentPermissionOverride.permission),
            )
            .where(Agent.id == agent_id)
            .execution_options(populate_existing=True)
        )
        agent = (await self.db.execute(stmt)).scalar_one_or_none()
        if not agent:
            raise AgentNotFoundError(f"Agent '{agent_id}' not found.")

        now = datetime.now(timezone.utc)
        items: List[EffectiveAuthorityItem] = []

        # 2. Direct Role Permissions
        if agent.status == "ACTIVE":
            for ar in agent.agent_roles:
                # Expiration check
                if ar.expires_at:
                    exp = ar.expires_at
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=timezone.utc)
                    if exp < now:
                        continue

                if ar.role and ar.role.status == "ACTIVE":
                    for perm in ar.role.permissions:
                        items.append(
                            EffectiveAuthorityItem(
                                action=perm.action,
                                resource_type=perm.resource_type,
                                source_type="DIRECT_ROLE",
                                source_agent_id=agent.id,
                                source_agent_name=agent.name,
                                role_name=ar.role.name,
                                scope=ar.scope or {},
                                expires_at=ar.expires_at,
                                allow_further_delegation=True,
                                depth=0,
                            )
                        )

            # 3. Active Incoming Delegations
            del_stmt = (
                select(AgentDelegation)
                .options(selectinload(AgentDelegation.delegator))
                .where(
                    AgentDelegation.delegate_agent_id == agent.id,
                    AgentDelegation.status == "ACTIVE",
                )
            )
            delegations = (await self.db.execute(del_stmt)).scalars().all()

            for dl in delegations:
                # Check expiration
                exp = dl.expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp < now:
                    dl.status = "EXPIRED"
                    continue

                # Verify delegator is still active (Section 11 & 72: Revoked Source Authority)
                if not dl.delegator or dl.delegator.status != "ACTIVE":
                    continue

                auth_snap = dl.authority_snapshot or {}
                actions = auth_snap.get("actions", [])
                resource_type = auth_snap.get("resource_type", "PROJECT")

                for act in actions:
                    items.append(
                        EffectiveAuthorityItem(
                            action=act,
                            resource_type=resource_type,
                            source_type="DELEGATION",
                            source_agent_id=dl.delegator_agent_id,
                            source_agent_name=dl.delegator.name if dl.delegator else "Delegator",
                            delegation_id=dl.id,
                            scope=dl.scope or {},
                            expires_at=dl.expires_at,
                            allow_further_delegation=dl.allow_further_delegation,
                            depth=dl.delegation_depth,
                        )
                    )

        return EffectiveAuthorityResponse(
            agent_id=agent.id,
            agent_name=agent.name,
            project_id=agent.project_id,
            status=agent.status,
            trust_level=agent.trust_level,
            effective_permissions=items,
            total_effective_actions=len(items),
        )

    async def get_project_authority_graph(self, project_id: uuid.UUID) -> AuthorityGraphResponse:
        """Exposes the real project authority graph."""
        return await self.graph.get_project_authority_graph(project_id)

    async def reconstruct_authority_chain(self, agent_id: uuid.UUID) -> AuthorityChainResponse:
        """Exposes the authority provenance chain."""
        return await self.graph.reconstruct_authority_chain(agent_id)

    async def evaluate_data_flow(
        self,
        source_agent_id: uuid.UUID,
        request: DataFlowCreateRequest,
        actor_id: str = "system",
    ) -> AgentDataFlow:
        """Evaluates and records an inter-agent data flow."""
        return await self.data_flow.evaluate_and_record_flow(
            source_agent_id=source_agent_id,
            request=request,
            actor_id=actor_id,
        )
