"""
Step 19 Attack Path Analysis Engine.

Sections 32–37, 63–66:
Finds potential attack paths connecting entrypoints (e.g. Internet, Public Ingress, Untrusted Agents)
to sensitive assets (e.g. Production Databases, Storage, Secrets, Privileged IAM Roles).

RULE 49 — NO AUTOMATIC ATTACK PATH CLAIM.
  Paths start as POTENTIAL or CONFIGURED. Only Step 16 testing can verify a path.
RULE 50 — NO HIDDEN RISK SCORE.
  Uses factual criteria (production=True, sensitive_data=True, verified=True) with clear explanations.
"""

from typing import Dict, Any, List, Optional, Set
import uuid
from app.security_graph.traversal import GraphTraversalEngine
from app.security_graph.enums import AttackPathState, EdgeState


class AttackPathAnalyzer:
    """
    Analyzes cross-domain graph for attack paths with condition tracking.
    """

    ENTRYPOINT_TYPES = {"INGRESS", "FIREWALL", "LOAD_BALANCER", "AI_AGENT", "REPOSITORY"}
    SENSITIVE_TARGET_TYPES = {"DATABASE", "STORAGE", "CLOUD_SECRET", "CLOUD_KEY", "ROLE"}

    @staticmethod
    def identify_potential_paths(
        adjacency: Dict[uuid.UUID, List[Any]],
        node_lookup: Dict[uuid.UUID, Any],
        source_id: Optional[uuid.UUID] = None,
        target_id: Optional[uuid.UUID] = None,
        max_depth: int = 6,
        query_time: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Discovers paths from entrypoints to sensitive assets.
        Analyzes condition state for each hop.
        """
        # Determine sources
        if source_id:
            sources = [source_id]
        else:
            sources = [
                nid for nid, node in node_lookup.items()
                if getattr(node, "node_type", None) in AttackPathAnalyzer.ENTRYPOINT_TYPES
            ]

        # Determine targets
        if target_id:
            targets = {target_id}
        else:
            targets = {
                nid for nid, node in node_lookup.items()
                if getattr(node, "node_type", None) in AttackPathAnalyzer.SENSITIVE_TARGET_TYPES
            }

        analyzed_paths: List[Dict[str, Any]] = []

        for src in sources:
            for tgt in targets:
                if src == tgt:
                    continue

                raw_paths = GraphTraversalEngine.find_all_paths(
                    source_id=src,
                    target_id=tgt,
                    adjacency=adjacency,
                    node_lookup=node_lookup,
                    max_depth=max_depth,
                    max_paths=5,
                    query_time=query_time,
                )

                for raw_path in raw_paths:
                    conditions = []
                    has_blocked_condition = False
                    is_observed = False
                    evidence_ids = []

                    for hop in raw_path:
                        edge_state = hop.get("state")
                        ev_id = hop.get("evidence_id")
                        if ev_id:
                            evidence_ids.append(ev_id)

                        if edge_state == EdgeState.DENIED_ACCESS.value:
                            has_blocked_condition = True
                            conditions.append({"type": hop.get("edge_type"), "status": "BLOCKED"})
                        elif edge_state == EdgeState.OBSERVED_ACCESS.value:
                            is_observed = True
                            conditions.append({"type": hop.get("edge_type"), "status": "OBSERVED"})
                        else:
                            conditions.append({"type": hop.get("edge_type"), "status": "CONFIGURED"})

                    # Path state determination (Rule 49)
                    if has_blocked_condition:
                        path_state = AttackPathState.BLOCKED.value
                    elif is_observed:
                        path_state = AttackPathState.OBSERVED.value
                    else:
                        path_state = AttackPathState.POTENTIAL.value

                    src_node = node_lookup.get(src)
                    tgt_node = node_lookup.get(tgt)

                    is_production = (
                        getattr(src_node, "environment", "") == "PRODUCTION"
                        or getattr(tgt_node, "environment", "") == "PRODUCTION"
                    )

                    analyzed_paths.append({
                        "source_node_id": str(src),
                        "source_node_name": getattr(src_node, "name", str(src)),
                        "target_node_id": str(tgt),
                        "target_node_name": getattr(tgt_node, "name", str(tgt)),
                        "path_type": "CROSS_DOMAIN_EXPOSURE",
                        "state": path_state,
                        "severity_context": "CRITICAL" if is_production else "HIGH",
                        "path_length": len(raw_path),
                        "hops": raw_path,
                        "conditions": conditions,
                        "evidence_ids": evidence_ids,
                        "prioritization_factors": {
                            "is_production": is_production,
                            "sensitive_target": getattr(tgt_node, "node_type", "") in AttackPathAnalyzer.SENSITIVE_TARGET_TYPES,
                            "has_observed_activity": is_observed,
                            "hops_count": len(raw_path),
                        },
                    })

        # Sort by explainable prioritization factors (Rule 65 & 66: no arbitrary score)
        analyzed_paths.sort(
            key=lambda p: (
                p["prioritization_factors"]["is_production"],
                p["prioritization_factors"]["has_observed_activity"],
                -p["path_length"],
            ),
            reverse=True,
        )

        return analyzed_paths
