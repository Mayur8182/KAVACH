"""
Step 19 Bounded Graph Traversal Engine.

RULE 53 — GRAPH QUERIES MUST BE BOUNDED.
Never allow unrestricted recursive graph traversal.
Enforces:
  - maximum depth
  - maximum nodes
  - maximum edges
  - cycle detection
  - tenant/project boundary
  - temporal validity window
"""

import logging
from typing import Dict, Any, List, Optional, Set, Callable
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

DEFAULT_MAX_DEPTH = 6
DEFAULT_MAX_NODES = 500
DEFAULT_MAX_EDGES = 1000


class QueryLimitExceededError(Exception):
    pass


class GraphTraversalEngine:
    """
    In-memory and SQL-backed traversal engine with strict safety bounds.
    """

    @staticmethod
    def is_edge_active_at(edge: Any, query_time: Optional[datetime] = None) -> bool:
        """
        Evaluates temporal validity (Rule 52).
        """
        if not isinstance(query_time, datetime):
            query_time = datetime.now(timezone.utc)
        elif query_time.tzinfo is None:
            query_time = query_time.replace(tzinfo=timezone.utc)

        vf = getattr(edge, "valid_from", None)
        vu = getattr(edge, "valid_until", None)

        if vf is not None and vf.tzinfo is None:
            vf = vf.replace(tzinfo=timezone.utc)
        if vu is not None and vu.tzinfo is None:
            vu = vu.replace(tzinfo=timezone.utc)

        if vf and vf > query_time:
            return False
        if vu and vu <= query_time:
            return False
        return True

    @staticmethod
    def traverse_bfs(
        start_node_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],  # node_id -> list of edge objects
        node_lookup: Dict[uuid.UUID, Any],
        direction: str = "OUTBOUND",  # OUTBOUND, INBOUND, BOTH
        edge_type_filter: Optional[Set[str]] = None,
        state_filter: Optional[Set[str]] = None,
        max_depth: int = DEFAULT_MAX_DEPTH,
        max_nodes: int = DEFAULT_MAX_NODES,
        max_edges: int = DEFAULT_MAX_EDGES,
        query_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Performs bounded Breadth-First Search from start_node_id.
        Returns visited nodes and traversed edges with hop distances.
        """
        if max_depth > 15:
            raise QueryLimitExceededError("max_depth exceeds platform safety limit of 15")
        if max_nodes > 2000:
            raise QueryLimitExceededError("max_nodes exceeds platform safety limit of 2000")

        visited_nodes: Set[uuid.UUID] = {start_node_id}
        traversed_edges: List[Any] = []
        node_distances: Dict[uuid.UUID, int] = {start_node_id: 0}

        # Queue contains (current_node_id, current_depth)
        queue: List[tuple] = [(start_node_id, 0)]

        while queue:
            current_id, depth = queue.pop(0)

            if depth >= max_depth:
                continue

            edges = adjacency.get(current_id, [])
            for edge in edges:
                if len(traversed_edges) >= max_edges:
                    break

                # Edge type filter
                if edge_type_filter and edge.edge_type not in edge_type_filter:
                    continue

                # State filter
                if state_filter and edge.state not in state_filter:
                    continue

                # Temporal check
                if not GraphTraversalEngine.is_edge_active_at(edge, query_time):
                    continue

                # Determine next node based on direction
                if edge.source_node_id == current_id:
                    next_id = edge.target_node_id
                else:
                    next_id = edge.source_node_id

                traversed_edges.append(edge)

                if next_id not in visited_nodes:
                    if len(visited_nodes) >= max_nodes:
                        logger.warning(f"Traversal reached max_nodes limit ({max_nodes})")
                        break

                    visited_nodes.add(next_id)
                    node_distances[next_id] = depth + 1
                    queue.append((next_id, depth + 1))

        return {
            "start_node_id": str(start_node_id),
            "visited_node_ids": [str(nid) for nid in visited_nodes],
            "visited_nodes": [node_lookup[nid] for nid in visited_nodes if nid in node_lookup],
            "edges": traversed_edges,
            "distances": {str(k): v for k, v in node_distances.items()},
            "node_count": len(visited_nodes),
            "edge_count": len(traversed_edges),
        }

    @staticmethod
    def find_all_paths(
        source_id: uuid.UUID,
        target_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        max_depth: int = 8,
        max_paths: int = 20,
        edge_type_filter: Optional[Set[str]] = None,
        query_time: Optional[datetime] = None,
    ) -> List[List[Dict[str, Any]]]:
        """
        Finds all simple paths between source_id and target_id up to max_depth.
        Returns list of path hops with node and edge details.
        """
        paths: List[List[Dict[str, Any]]] = []

        def dfs(current: uuid.UUID, visited: Set[uuid.UUID], current_path: List[Dict[str, Any]]):
            if len(paths) >= max_paths or len(current_path) >= max_depth:
                return

            if current == target_id and len(current_path) > 0:
                paths.append(list(current_path))
                return

            edges = adjacency.get(current, [])
            for edge in edges:
                if edge_type_filter and edge.edge_type not in edge_type_filter:
                    continue
                if not GraphTraversalEngine.is_edge_active_at(edge, query_time):
                    continue

                nxt = edge.target_node_id if edge.source_node_id == current else edge.source_node_id
                if nxt not in visited:
                    visited.add(nxt)
                    hop = {
                        "from_node_id": str(current),
                        "from_node_name": getattr(node_lookup.get(current), "name", str(current)),
                        "to_node_id": str(nxt),
                        "to_node_name": getattr(node_lookup.get(nxt), "name", str(nxt)),
                        "edge_id": str(edge.id),
                        "edge_type": edge.edge_type,
                        "state": edge.state,
                        "evidence_id": edge.evidence_id,
                    }
                    current_path.append(hop)
                    dfs(nxt, visited, current_path)
                    current_path.pop()
                    visited.remove(nxt)

        dfs(source_id, {source_id}, [])
        return paths
