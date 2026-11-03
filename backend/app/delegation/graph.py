import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.delegation.errors import DelegationCycleDetectedError
from app.delegation.schemas import (
    AuthorityChainItem,
    AuthorityChainResponse,
    AuthorityEdgeResponse,
    AuthorityGraphNode,
    AuthorityGraphResponse,
)
from app.models.agent import Agent
from app.models.delegation import AgentAuthorityEdge, AgentDelegation


class AuthorityGraphService:
    """
    Manages the Agent Authority Graph in PostgreSQL:
    - Bounded cycle detection via Depth-First Search (DFS)
    - Full authority chain reconstruction
    - Cascading invalidation of dependent delegations upon parent revocation
    - Project-scoped graph representation
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_cycle_before_delegation(
        self,
        delegator_agent_id: uuid.UUID,
        delegate_agent_id: uuid.UUID,
    ) -> None:
        """
        Detects if adding an edge (delegator -> delegate) would create a cycle.
        A cycle would occur if there already exists a path from delegate -> delegator.
        """
        # Load all currently ACTIVE authority edges
        stmt = select(AgentAuthorityEdge).where(AgentAuthorityEdge.status == "ACTIVE")
        edges = (await self.db.execute(stmt)).scalars().all()

        # Build adjacency list: node -> [targets]
        adj: Dict[uuid.UUID, List[uuid.UUID]] = {}
        for edge in edges:
            adj.setdefault(edge.source_agent_id, []).append(edge.target_agent_id)

        # Search for path from delegate_agent_id to delegator_agent_id
        visited: Set[uuid.UUID] = set()
        queue = [delegate_agent_id]

        while queue:
            current = queue.pop(0)
            if current == delegator_agent_id:
                raise DelegationCycleDetectedError(
                    f"Delegation cycle detected: agent '{delegate_agent_id}' already possesses an active authority "
                    f"path leading to delegator '{delegator_agent_id}'."
                )
            if current not in visited:
                visited.add(current)
                queue.extend(adj.get(current, []))

    async def get_project_authority_graph(self, project_id: uuid.UUID) -> AuthorityGraphResponse:
        """Retrieves real authority graph nodes and edges for a given project."""
        # 1. Fetch agents in project
        agent_stmt = select(Agent).where(Agent.project_id == project_id)
        agents = (await self.db.execute(agent_stmt)).scalars().all()

        nodes = [
            AuthorityGraphNode(
                id=str(a.id),
                name=a.name,
                agent_type=a.agent_type,
                status=a.status,
                trust_level=a.trust_level,
                project_id=str(a.project_id),
            )
            for a in agents
        ]

        # 2. Fetch edges
        edge_stmt = (
            select(AgentAuthorityEdge)
            .where(
                AgentAuthorityEdge.project_id == project_id,
                AgentAuthorityEdge.status == "ACTIVE",
            )
        )
        edges = (await self.db.execute(edge_stmt)).scalars().all()

        edge_responses = [
            AuthorityEdgeResponse(
                id=e.id,
                delegation_id=e.delegation_id,
                source_agent_id=e.source_agent_id,
                target_agent_id=e.target_agent_id,
                project_id=e.project_id,
                authority=e.authority,
                scope=e.scope,
                status=e.status,
                depth=e.depth,
                created_at=e.created_at,
                expires_at=e.expires_at,
                revoked_at=e.revoked_at,
            )
            for e in edges
        ]

        return AuthorityGraphResponse(
            project_id=project_id,
            nodes=nodes,
            edges=edge_responses,
            total_edges=len(edge_responses),
        )

    async def reconstruct_authority_chain(self, agent_id: uuid.UUID) -> AuthorityChainResponse:
        """
        Reconstructs the full upstream authority chain leading to this agent:
        Human/Root -> Agent A -> Agent B -> ... -> Target Agent.
        """
        agent = (await self.db.execute(select(Agent).where(Agent.id == agent_id))).scalar_one_or_none()
        if not agent:
            raise ValueError(f"Agent '{agent_id}' not found.")

        chain_items: List[AuthorityChainItem] = []
        current_agent_id = agent_id
        step = 1

        # Traverse backwards via incoming active delegations
        visited: Set[uuid.UUID] = set()
        root_principal = "Direct Authority"

        while current_agent_id not in visited:
            visited.add(current_agent_id)
            stmt = (
                select(AgentDelegation)
                .options(selectinload(AgentDelegation.delegator), selectinload(AgentDelegation.delegate))
                .where(
                    AgentDelegation.delegate_agent_id == current_agent_id,
                    AgentDelegation.status == "ACTIVE",
                )
                .order_by(AgentDelegation.created_at.desc())
            )
            incoming = (await self.db.execute(stmt)).scalars().first()
            if not incoming:
                break

            chain_items.append(
                AuthorityChainItem(
                    step=step,
                    source_agent_id=str(incoming.delegator_agent_id),
                    source_agent_name=incoming.delegator.name if incoming.delegator else "Unknown Delegator",
                    target_agent_id=str(incoming.delegate_agent_id),
                    target_agent_name=incoming.delegate.name if incoming.delegate else "Unknown Delegate",
                    delegation_id=str(incoming.id),
                    authority=incoming.authority_snapshot,
                    status=incoming.status,
                    expires_at=incoming.expires_at,
                )
            )
            root_principal = f"Human/{incoming.created_by}"
            current_agent_id = incoming.delegator_agent_id
            step += 1

        # Reverse to show flow from root delegator down to target agent
        chain_items.reverse()
        for idx, item in enumerate(chain_items, 1):
            item.step = idx

        return AuthorityChainResponse(
            agent_id=agent.id,
            agent_name=agent.name,
            project_id=agent.project_id,
            chain=chain_items,
            root_principal=root_principal,
        )

    async def cascade_revoke_delegation_subtree(
        self,
        delegation_id: uuid.UUID,
        revoked_by: str,
        reason: str,
    ) -> List[uuid.UUID]:
        """
        Recursively invalidates all dependent delegations in the subtree:
        If A -> B is revoked, then B -> C and C -> D are immediately marked REVOKED.
        Preserves audit trail while halting downstream authorization.
        """
        now = datetime.now(timezone.utc)
        revoked_ids: List[uuid.UUID] = []
        queue = [delegation_id]

        while queue:
            current_del_id = queue.pop(0)
            revoked_ids.append(current_del_id)

            # Mark delegation revoked
            del_stmt = (
                update(AgentDelegation)
                .where(AgentDelegation.id == current_del_id)
                .values(
                    status="REVOKED",
                    revoked_at=now,
                    revoked_by=revoked_by,
                    revocation_reason=reason,
                )
            )
            await self.db.execute(del_stmt)

            # Mark associated authority edges revoked
            edge_stmt = (
                update(AgentAuthorityEdge)
                .where(AgentAuthorityEdge.delegation_id == current_del_id)
                .values(status="REVOKED", revoked_at=now)
            )
            await self.db.execute(edge_stmt)

            # Find direct child delegations
            child_stmt = select(AgentDelegation.id).where(
                AgentDelegation.parent_delegation_id == current_del_id,
                AgentDelegation.status == "ACTIVE",
            )
            children = (await self.db.execute(child_stmt)).scalars().all()
            queue.extend(children)

        await self.db.commit()
        return revoked_ids
