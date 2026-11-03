"""
Step 19 Reachability Engine.

Sections 28–31:
Distinguishes:
  - NETWORK_REACHABLE
  - AUTHORIZATION_REACHABLE
  - DATA_REACHABLE
  - COMBINED_REACHABLE
  - OBSERVED_REACHABLE

RULE 47 — Reachability does not equal authority.
RULE 48 — Distinguish CONFIGURED vs OBSERVED access.
"""

from typing import Dict, Any, List, Optional, Set
import uuid
from app.security_graph.traversal import GraphTraversalEngine
from app.security_graph.enums import ReachabilityType, EdgeState


class ReachabilityEngine:
    """
    Evaluates specific reachability dimensions between a source and a target.
    """

    NETWORK_EDGE_TYPES = {"ROUTES_TO", "EXPOSES", "DEPLOYED_TO", "RUNS"}
    AUTHORITY_EDGE_TYPES = {"DELEGATES_TO", "HAS_PERMISSION", "HAS_ROLE", "ASSIGNED_TO", "CAN_ACCESS", "ACTS_AS"}
    DATA_EDGE_TYPES = {"CAN_ACCESS", "USES_SECRET", "PRODUCES", "DEPENDS_ON"}
    SUPPLY_CHAIN_EDGE_TYPES = {"TRIGGERS", "PRODUCES", "DEPLOYED_TO", "BUILT_FROM", "DEPENDS_ON", "RUNS"}

    @staticmethod
    def evaluate_reachability(
        source_id: uuid.UUID,
        target_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        reachability_type: ReachabilityType = ReachabilityType.NETWORK_REACHABLE,
        query_time: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Determines whether source can reach target under the given reachability type.
        """
        if reachability_type == ReachabilityType.NETWORK_REACHABLE:
            allowed_edges = ReachabilityEngine.NETWORK_EDGE_TYPES
        elif reachability_type == ReachabilityType.AUTHORIZATION_REACHABLE:
            allowed_edges = ReachabilityEngine.AUTHORITY_EDGE_TYPES
        elif reachability_type == ReachabilityType.DATA_REACHABLE:
            allowed_edges = ReachabilityEngine.DATA_EDGE_TYPES
        elif reachability_type == ReachabilityType.SUPPLY_CHAIN_REACHABLE:
            allowed_edges = ReachabilityEngine.SUPPLY_CHAIN_EDGE_TYPES
        else:
            allowed_edges = None  # All edge types

        paths = GraphTraversalEngine.find_all_paths(
            source_id=source_id,
            target_id=target_id,
            adjacency=adjacency,
            node_lookup=node_lookup,
            edge_type_filter=allowed_edges,
            max_depth=8,
            query_time=query_time,
        )

        is_reachable = len(paths) > 0
        has_observed_access = False

        if is_reachable:
            # Check if any path contains confirmed OBSERVED_ACCESS
            for p in paths:
                if any(hop.get("state") == EdgeState.OBSERVED_ACCESS.value for hop in p):
                    has_observed_access = True
                    break

        reachability_status = "UNREACHABLE"
        if is_reachable:
            reachability_status = "OBSERVED_REACHABLE" if has_observed_access else "CONFIGURED_REACHABLE"

        return {
            "source_id": str(source_id),
            "target_id": str(target_id),
            "reachability_type": reachability_type.value,
            "status": reachability_status,
            "is_reachable": is_reachable,
            "has_observed_evidence": has_observed_access,
            "path_count": len(paths),
            "paths": paths,
        }

    @staticmethod
    def evaluate_combined_reachability(
        source_id: uuid.UUID,
        target_id: uuid.UUID,
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        query_time: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Combined Reachability:
        Checks both Network and Authorization reachability.
        Returns the exact missing condition if the path is incomplete (Section 31).
        """
        net_result = ReachabilityEngine.evaluate_reachability(
            source_id, target_id, adjacency, node_lookup, ReachabilityType.NETWORK_REACHABLE, query_time
        )
        auth_result = ReachabilityEngine.evaluate_reachability(
            source_id, target_id, adjacency, node_lookup, ReachabilityType.AUTHORIZATION_REACHABLE, query_time
        )

        net_ok = net_result["is_reachable"]
        auth_ok = auth_result["is_reachable"]

        missing_conditions = []
        if not net_ok:
            missing_conditions.append("NETWORK_PATH_UNAVAILABLE")
        if not auth_ok:
            missing_conditions.append("AUTHORIZATION_PATH_UNAVAILABLE")

        is_fully_reachable = net_ok and auth_ok

        return {
            "source_id": str(source_id),
            "target_id": str(target_id),
            "reachability_type": "COMBINED_REACHABLE",
            "is_fully_reachable": is_fully_reachable,
            "network_status": net_result["status"],
            "authorization_status": auth_result["status"],
            "missing_conditions": missing_conditions,
            "network_paths": net_result["paths"],
            "authorization_paths": auth_result["paths"],
        }
