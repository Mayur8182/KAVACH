"""
Step 19 Authority Paths & Data-Flow Intelligence.

Sections 23–27:
- Authority Paths: Traces delegation chain from human to acting agent and cloud resources.
- Data-Flow Paths: Traces flow of confidential/secret data across agents and services.
"""

from typing import Dict, Any, List, Optional
import uuid
from app.security_graph.traversal import GraphTraversalEngine


class AuthorityPathEngine:
    """
    Traces delegated authority and provenance chains.
    """

    AUTHORITY_EDGE_TYPES = {"DELEGATES_TO", "ACTS_AS", "HAS_PERMISSION", "HAS_ROLE", "ASSIGNED_TO", "CAN_ACCESS"}

    @staticmethod
    def trace_authority_chain(
        agent_node_id: uuid.UUID,
        adjacency_inbound: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        query_time: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Traces backwards from agent_node_id up to the root Human actor.
        """
        chain: List[Dict[str, Any]] = []
        current_id = agent_node_id
        visited = {current_id}

        while True:
            in_edges = adjacency_inbound.get(current_id, [])
            auth_edges = [
                e for e in in_edges
                if e.edge_type in ("DELEGATES_TO", "ACTS_AS", "OWNS")
                and GraphTraversalEngine.is_edge_active_at(e, query_time)
            ]

            if not auth_edges:
                break

            # Follow primary delegation hop
            edge = auth_edges[0]
            delegator_id = edge.source_node_id
            if delegator_id in visited:
                break  # Cycle detected

            visited.add(delegator_id)
            delegator_node = node_lookup.get(delegator_id)

            chain.append({
                "delegator_id": str(delegator_id),
                "delegator_name": getattr(delegator_node, "name", str(delegator_id)),
                "delegator_type": getattr(delegator_node, "node_type", "UNKNOWN"),
                "acting_agent_id": str(current_id),
                "edge_type": edge.edge_type,
                "evidence_id": edge.evidence_id,
                "confidence": edge.confidence,
                "state": edge.state,
            })

            current_id = delegator_id

        return chain

    @staticmethod
    def get_accessible_resources(
        agent_node_id: uuid.UUID,
        adjacency_outbound: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        query_time: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Returns all cloud and software resources reachable by the agent via authorized permissions.
        """
        traversal = GraphTraversalEngine.traverse_bfs(
            start_node_id=agent_node_id,
            adjacency=adjacency_outbound,
            node_lookup=node_lookup,
            edge_type_filter={"DELEGATES_TO", "HAS_PERMISSION", "HAS_ROLE", "CAN_ACCESS", "ROUTES_TO"},
            max_depth=5,
            query_time=query_time,
        )

        accessible = []
        for node in traversal["visited_nodes"]:
            if node.id == agent_node_id:
                continue
            if node.node_type in ("DATABASE", "STORAGE", "COMPUTE", "CLOUD_SECRET", "REPOSITORY"):
                accessible.append({
                    "id": str(node.id),
                    "name": node.name,
                    "resource_type": node.resource_type or node.node_type,
                    "environment": node.environment,
                    "distance": traversal["distances"].get(str(node.id), 1),
                })

        return accessible
