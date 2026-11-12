"""
Step 19 Graph Repository.

Section 145:
Encapsulates all database persistence and querying for nodes and edges.
Enforces multi-tenant project isolation (Rule 81) and bounded limits (Rule 53).
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_graph_models import (
    SecurityGraphNode,
    SecurityGraphEdge,
    SecurityAttackPath,
    SecurityChangeImpact,
    SecurityGraphSnapshot,
)


class GraphRepository:
    """
    SQLAlchemy-based storage and query engine for security graph data.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_node(self, project_id: uuid.UUID, node_id: uuid.UUID) -> Optional[SecurityGraphNode]:
        stmt = select(SecurityGraphNode).where(
            and_(
                SecurityGraphNode.project_id == project_id,
                SecurityGraphNode.id == node_id,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_nodes(
        self,
        project_id: uuid.UUID,
        node_type: Optional[str] = None,
        environment: Optional[str] = None,
        limit: int = 200,
        offset: int = 0,
    ) -> List[SecurityGraphNode]:
        conditions = [SecurityGraphNode.project_id == project_id]
        if node_type:
            conditions.append(SecurityGraphNode.node_type == node_type)
        if environment:
            conditions.append(SecurityGraphNode.environment == environment)

        stmt = select(SecurityGraphNode).where(and_(*conditions)).limit(min(limit, 500)).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def list_edges(
        self,
        project_id: uuid.UUID,
        edge_type: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 500,
        offset: int = 0,
    ) -> List[SecurityGraphEdge]:
        conditions = [SecurityGraphEdge.project_id == project_id]
        if edge_type:
            conditions.append(SecurityGraphEdge.edge_type == edge_type)
        if state:
            conditions.append(SecurityGraphEdge.state == state)

        stmt = select(SecurityGraphEdge).where(and_(*conditions)).limit(min(limit, 1000)).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def load_graph_projection(
        self,
        project_id: uuid.UUID,
        query_time: Optional[datetime] = None,
        max_nodes: int = 1000,
        max_edges: int = 2000,
    ) -> Dict[str, Any]:
        """
        Loads the in-memory graph representation (node_lookup, adjacency_outbound, adjacency_inbound)
        for a specific project, filtered by temporal validity.
        """
        if not isinstance(query_time, datetime):
            query_time = datetime.now(timezone.utc)
        elif query_time.tzinfo is None:
            query_time = query_time.replace(tzinfo=timezone.utc)

        # 1. Fetch nodes active at query_time
        node_stmt = select(SecurityGraphNode).where(
            and_(
                SecurityGraphNode.project_id == project_id,
                SecurityGraphNode.valid_from <= query_time,
                or_(
                    SecurityGraphNode.valid_until.is_(None),
                    SecurityGraphNode.valid_until > query_time,
                ),
            )
        ).limit(max_nodes)
        node_res = await self.session.execute(node_stmt)
        nodes = list(node_res.scalars().all())
        node_lookup = {node.id: node for node in nodes}

        # 2. Fetch edges active at query_time
        edge_stmt = select(SecurityGraphEdge).where(
            and_(
                SecurityGraphEdge.project_id == project_id,
                SecurityGraphEdge.valid_from <= query_time,
                or_(
                    SecurityGraphEdge.valid_until.is_(None),
                    SecurityGraphEdge.valid_until > query_time,
                ),
            )
        ).limit(max_edges)
        edge_res = await self.session.execute(edge_stmt)
        edges = list(edge_res.scalars().all())

        adjacency_outbound: Dict[uuid.UUID, List[SecurityGraphEdge]] = {nid: [] for nid in node_lookup}
        adjacency_inbound: Dict[uuid.UUID, List[SecurityGraphEdge]] = {nid: [] for nid in node_lookup}

        for edge in edges:
            if edge.source_node_id in adjacency_outbound:
                adjacency_outbound[edge.source_node_id].append(edge)
            if edge.target_node_id in adjacency_inbound:
                adjacency_inbound[edge.target_node_id].append(edge)

        return {
            "node_lookup": node_lookup,
            "adjacency_outbound": adjacency_outbound,
            "adjacency_inbound": adjacency_inbound,
            "nodes": nodes,
            "edges": edges,
        }

    async def save_attack_path(
        self,
        project_id: uuid.UUID,
        source_node_id: uuid.UUID,
        target_node_id: uuid.UUID,
        path_type: str,
        state: str,
        severity_context: str,
        path_length: int,
        hops: List[Dict[str, Any]],
        conditions: List[Dict[str, Any]],
        evidence_ids: Optional[List[str]] = None,
    ) -> SecurityAttackPath:
        path = SecurityAttackPath(
            project_id=project_id,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            path_type=path_type,
            state=state,
            severity_context=severity_context,
            path_length=path_length,
            hops=hops,
            conditions=conditions,
            evidence_ids=evidence_ids or [],
        )
        self.session.add(path)
        await self.session.commit()
        await self.session.refresh(path)
        return path

    async def list_attack_paths(
        self,
        project_id: uuid.UUID,
        state: Optional[str] = None,
        limit: int = 50,
    ) -> List[SecurityAttackPath]:
        conditions = [SecurityAttackPath.project_id == project_id]
        if state:
            conditions.append(SecurityAttackPath.state == state)

        stmt = select(SecurityAttackPath).where(and_(*conditions)).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def save_change_impact(
        self,
        project_id: uuid.UUID,
        trigger_type: str,
        trigger_id: str,
        impact_data: Dict[str, Any],
    ) -> SecurityChangeImpact:
        impact = SecurityChangeImpact(
            project_id=project_id,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            affected_nodes_count=impact_data.get("affected_nodes_count", 0),
            directly_affected=impact_data.get("directly_affected", []),
            indirectly_affected=impact_data.get("indirectly_affected", []),
            affected_requirements=impact_data.get("affected_requirements", []),
            affected_contracts=impact_data.get("affected_contracts", []),
        )
        self.session.add(impact)
        await self.session.commit()
        await self.session.refresh(impact)
        return impact

    async def create_snapshot(
        self,
        project_id: uuid.UUID,
        reason: str,
        source_event_id: Optional[str] = None,
    ) -> SecurityGraphSnapshot:
        projection = await self.load_graph_projection(project_id)
        nodes_data = [
            {"id": str(n.id), "name": n.name, "node_type": n.node_type, "environment": n.environment}
            for n in projection["nodes"]
        ]
        edges_data = [
            {"source_node_id": str(e.source_node_id), "target_node_id": str(e.target_node_id), "edge_type": e.edge_type, "state": e.state}
            for e in projection["edges"]
        ]

        snapshot = SecurityGraphSnapshot(
            project_id=project_id,
            reason=reason,
            source_event_id=source_event_id,
            node_count=len(nodes_data),
            edge_count=len(edges_data),
            snapshot_data={"nodes": nodes_data, "edges": edges_data},
        )
        self.session.add(snapshot)
        await self.session.commit()
        await self.session.refresh(snapshot)
        return snapshot
