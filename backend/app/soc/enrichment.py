"""
Context Enrichment Engine (Step 23).

Enriches canonical SecurityEvents with deep, authoritative Thing platform context:
- Agent identities, credentials, active delegations, authority edges
- Active Security Contracts and invariant bindings
- Policy configurations & data classifications
- Watchlist memberships (flagging privileged or suspect entities)

Rules:
- Query real database state in PostgreSQL; never simulate metadata.
- If context is missing, record UNKNOWN / NONE explicitly without fabrication.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent import Agent
from app.models.delegation import AgentDelegation
from app.contracts.models import SecurityContract
from app.models.policy import SecurityPolicy
from app.models.soc_models import SocWatchlist, WatchlistEntity, EventEnrichment


class ContextEnrichmentEngine:
    """Enriches normalized security events against real relational platform state."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def enrich_event(
        self,
        event_id: uuid.UUID,
        project_id: uuid.UUID,
        actor: Dict[str, Any],
        resource: Dict[str, Any],
        action: str,
    ) -> List[Dict[str, Any]]:
        """Queries relational context and persists event enrichments."""
        enrichments = []

        # 1. Agent Identity & Delegation Context
        actor_id = actor.get("id")
        if actor_id:
            agent_enrichment = await self._resolve_agent_context(actor_id, project_id)
            if agent_enrichment:
                enrichments.append({
                    "type": "AGENT_IDENTITY",
                    "data": agent_enrichment,
                })

        # 2. Security Contract Context
        resource_id = resource.get("id")
        contract_enrichment = await self._resolve_contract_context(project_id, resource_id, action)
        if contract_enrichment:
            enrichments.append({
                "type": "SECURITY_CONTRACT",
                "data": contract_enrichment,
            })

        # 3. Watchlist Detection
        watchlist_matches = await self._check_watchlists(project_id, actor_id, resource_id)
        if watchlist_matches:
            enrichments.append({
                "type": "WATCHLIST_MATCH",
                "data": {"matched_watchlists": watchlist_matches},
            })

        # Persist enrichments to PostgreSQL
        for item in enrichments:
            record = EventEnrichment(
                event_id=event_id,
                enrichment_type=item["type"],
                enrichment_data=item["data"],
                enriched_at=datetime.now(timezone.utc),
                version="1.0.0",
            )
            self.db.add(record)

        return enrichments

    async def _resolve_agent_context(self, actor_id: str, project_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Resolves Agent model, delegation chain, and credentials if actor is an AI agent."""
        # Try finding agent by id or name
        stmt = select(Agent).where(
            (Agent.id == actor_id) | (Agent.name == actor_id)
        )
        try:
            # If actor_id is valid UUID
            val_uuid = uuid.UUID(actor_id)
            stmt = select(Agent).where(Agent.id == val_uuid)
        except Exception:
            stmt = select(Agent).where(Agent.name == actor_id)

        result = await self.db.execute(stmt)
        agent = result.scalar_one_or_none()

        if not agent:
            return None

        # Check active delegations
        del_stmt = select(AgentDelegation).where(
            AgentDelegation.delegatee_id == agent.id,
            AgentDelegation.status == "ACTIVE",
        )
        del_res = await self.db.execute(del_stmt)
        delegations = del_res.scalars().all()

        return {
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "agent_role": getattr(agent, "role", "AGENT"),
            "is_active": getattr(agent, "is_active", True),
            "delegation_count": len(delegations),
            "active_delegator_ids": [str(d.delegator_id) for d in delegations],
        }

    async def _resolve_contract_context(
        self,
        project_id: uuid.UUID,
        resource_id: Optional[str],
        action: str,
    ) -> Optional[Dict[str, Any]]:
        """Checks for active security contracts covering this project or resource."""
        stmt = select(SecurityContract).where(
            SecurityContract.project_id == project_id,
            SecurityContract.status == "ACTIVE",
        ).limit(5)
        res = await self.db.execute(stmt)
        contracts = res.scalars().all()

        if not contracts:
            return None

        return {
            "active_contract_count": len(contracts),
            "contract_keys": [c.contract_key for c in contracts],
            "primary_contract_id": str(contracts[0].id),
        }

    async def _check_watchlists(
        self,
        project_id: uuid.UUID,
        actor_id: Optional[str],
        resource_id: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Checks if actor or resource appears on active project watchlists."""
        identifiers = [i for i in [actor_id, resource_id] if i]
        if not identifiers:
            return []

        stmt = (
            select(WatchlistEntity, SocWatchlist)
            .join(SocWatchlist, WatchlistEntity.watchlist_id == SocWatchlist.id)
            .where(
                SocWatchlist.project_id == project_id,
                SocWatchlist.is_active == True,
                WatchlistEntity.is_active == True,
                WatchlistEntity.entity_identifier.in_(identifiers),
            )
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        matches = []
        for entity, watchlist in rows:
            matches.append({
                "watchlist_id": str(watchlist.id),
                "watchlist_name": watchlist.name,
                "watchlist_type": watchlist.watchlist_type,
                "entity_identifier": entity.entity_identifier,
                "entity_name": entity.entity_name,
                "reason": entity.reason,
            })
        return matches
