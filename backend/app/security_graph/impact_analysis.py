"""
Step 19 Change Impact Analysis & Graph Diff Engine.

Sections 50, 135–138:
Computes impact of changes (Git commit, IAM change, deployment, policy change)
and calculates differential comparison between two graph states.
"""

from typing import Dict, Any, List, Optional, Set
import uuid
from datetime import datetime, timezone
from app.security_graph.traversal import GraphTraversalEngine


class ChangeImpactAnalyzer:
    """
    Computes security impact when a change occurs in the environment.
    """

    @staticmethod
    def analyze_change(
        trigger_type: str,
        trigger_id: str,
        changed_node_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        max_depth: int = 4,
    ) -> Dict[str, Any]:
        """
        Determines what resources, services, and requirements are affected by a change.
        """
        traversal = GraphTraversalEngine.traverse_bfs(
            start_node_id=changed_node_id,
            adjacency=adjacency,
            node_lookup=node_lookup,
            max_depth=max_depth,
        )

        visited = traversal["visited_nodes"]
        directly_affected = []
        indirectly_affected = []
        affected_requirements = []
        affected_contracts = []

        distances = traversal["distances"]

        for node in visited:
            nid = node.id
            dist = distances.get(str(nid), 0)
            if dist == 0:
                continue

            entry = {"id": str(node.id), "name": node.name, "node_type": node.node_type}
            if dist == 1:
                directly_affected.append(entry)
            else:
                indirectly_affected.append(entry)

            if node.node_type == "SECURITY_REQUIREMENT":
                affected_requirements.append(entry)
            elif node.node_type == "SECURITY_CONTRACT":
                affected_contracts.append(entry)

        return {
            "trigger_type": trigger_type,
            "trigger_id": trigger_id,
            "changed_node_id": str(changed_node_id),
            "affected_nodes_count": len(directly_affected) + len(indirectly_affected),
            "directly_affected": directly_affected,
            "indirectly_affected": indirectly_affected,
            "affected_requirements": affected_requirements,
            "affected_contracts": affected_contracts,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def diff_graphs(
        graph_before: Dict[str, Any],
        graph_after: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculates Graph A vs Graph B diff (Sections 135–138).
        Identifies ADDED_NODE, REMOVED_NODE, ADDED_EDGE, REMOVED_EDGE, CHANGED_STATE.
        """
        nodes_before = {str(n.get("id", n.get("external_id"))): n for n in graph_before.get("nodes", [])}
        nodes_after = {str(n.get("id", n.get("external_id"))): n for n in graph_after.get("nodes", [])}

        edges_before = {f"{e.get('source_node_id')}->{e.get('target_node_id')}:{e.get('edge_type')}": e for e in graph_before.get("edges", [])}
        edges_after = {f"{e.get('source_node_id')}->{e.get('target_node_id')}:{e.get('edge_type')}": e for e in graph_after.get("edges", [])}

        added_nodes = [v for k, v in nodes_after.items() if k not in nodes_before]
        removed_nodes = [v for k, v in nodes_before.items() if k not in nodes_after]

        added_edges = [v for k, v in edges_after.items() if k not in edges_before]
        removed_edges = [v for k, v in edges_before.items() if k not in edges_after]

        changed_edges = []
        for k, eb in edges_before.items():
            if k in edges_after:
                ea = edges_after[k]
                if eb.get("state") != ea.get("state"):
                    changed_edges.append({
                        "edge_key": k,
                        "state_before": eb.get("state"),
                        "state_after": ea.get("state"),
                    })

        return {
            "added_nodes_count": len(added_nodes),
            "removed_nodes_count": len(removed_nodes),
            "added_edges_count": len(added_edges),
            "removed_edges_count": len(removed_edges),
            "changed_edges_count": len(changed_edges),
            "added_nodes": added_nodes,
            "removed_nodes": removed_nodes,
            "added_edges": added_edges,
            "removed_edges": removed_edges,
            "changed_edges": changed_edges,
        }
