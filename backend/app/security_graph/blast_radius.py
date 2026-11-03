"""
Step 19 Blast-Radius Intelligence Engine.

Sections 38–47:
Answers: "If this node or relationship changes or is compromised, what else may be affected?"

RULE 50 — NO SECURITY SCORE.
Produces detailed structured impact breakdowns without calculating arbitrary risk numbers.
"""

from typing import Dict, Any, List, Optional, Set
import uuid
from app.security_graph.traversal import GraphTraversalEngine


class BlastRadiusEngine:
    """
    Computes direct and indirect blast radius for compromised or changed entities.
    """

    @staticmethod
    def calculate_blast_radius(
        target_node_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        max_depth: int = 5,
        query_time: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Traverses outbound and inbound connections from target_node_id up to max_depth.
        Categorizes affected resources into services, agents, data, deployments, and contracts.
        """
        target_node = node_lookup.get(target_node_id)
        if not target_node:
            return {"error": "TARGET_NODE_NOT_FOUND", "target_id": str(target_node_id)}

        traversal = GraphTraversalEngine.traverse_bfs(
            start_node_id=target_node_id,
            adjacency=adjacency,
            node_lookup=node_lookup,
            max_depth=max_depth,
            query_time=query_time,
        )

        visited_nodes = traversal["visited_nodes"]
        distances = traversal["distances"]

        directly_affected: List[Dict[str, Any]] = []
        indirectly_affected: List[Dict[str, Any]] = []
        dependent_services: List[Dict[str, Any]] = []
        dependent_agents: List[Dict[str, Any]] = []
        dependent_data: List[Dict[str, Any]] = []
        dependent_deployments: List[Dict[str, Any]] = []
        affected_requirements: List[Dict[str, Any]] = []
        affected_contracts: List[Dict[str, Any]] = []

        for node in visited_nodes:
            nid = node.id
            dist = distances.get(str(nid), 0)
            if dist == 0:
                continue

            node_summary = {
                "id": str(node.id),
                "name": node.name,
                "node_type": node.node_type,
                "provider": node.provider,
                "environment": node.environment,
                "distance": dist,
                "explanation": f"Connected at hop distance {dist} via graph traversal",
            }

            if dist == 1:
                directly_affected.append(node_summary)
            else:
                indirectly_affected.append(node_summary)

            # Categorize by domain
            nt = node.node_type
            if nt in ("SERVICE", "COMPUTE", "FUNCTION"):
                dependent_services.append(node_summary)
            elif nt in ("AI_AGENT", "HUMAN"):
                dependent_agents.append(node_summary)
            elif nt in ("DATABASE", "STORAGE", "CLOUD_SECRET", "CLOUD_KEY"):
                dependent_data.append(node_summary)
            elif nt in ("DEPLOYMENT", "POD", "DOCKER_IMAGE"):
                dependent_deployments.append(node_summary)
            elif nt == "SECURITY_REQUIREMENT":
                affected_requirements.append(node_summary)
            elif nt == "SECURITY_CONTRACT":
                affected_contracts.append(node_summary)

        return {
            "target_node": {
                "id": str(target_node.id),
                "name": target_node.name,
                "node_type": target_node.node_type,
                "environment": target_node.environment,
            },
            "total_affected_nodes": len(directly_affected) + len(indirectly_affected),
            "directly_affected_count": len(directly_affected),
            "indirectly_affected_count": len(indirectly_affected),
            "directly_affected": directly_affected,
            "indirectly_affected": indirectly_affected,
            "dependent_services": dependent_services,
            "dependent_agents": dependent_agents,
            "dependent_data": dependent_data,
            "dependent_deployments": dependent_deployments,
            "affected_requirements": affected_requirements,
            "affected_contracts": affected_contracts,
        }
