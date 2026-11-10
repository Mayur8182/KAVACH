"""
Kavach Security Intelligence Engine — Security Knowledge Graph.
Maintains an evidence-backed graph connecting repositories, files, symbols,
routes, packages, findings, vulnerabilities, and sensitive sinks.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional, Set

try:
    import networkx as nx
except ImportError:
    nx = None

from app.intelligence.security.schemas import (
    CanonicalFinding,
    ConfidenceLevel,
)

logger = logging.getLogger("kavach.security_intelligence.knowledge_graph")


class SecurityKnowledgeGraph:
    """
    Evidence-backed graph connecting security findings to code entities and cloud assets.
    Tenant-isolated by organization_id and project_id.
    """

    def __init__(self, project_id: Optional[uuid.UUID] = None):
        self.project_id = project_id
        self.graph = nx.DiGraph() if nx is not None else None

    def add_finding_node(self, finding: CanonicalFinding) -> str:
        """Adds a finding node with rich metadata."""
        node_id = f"finding:{str(finding.id)}"
        sev = finding.normalized_severity.value
        band = finding.risk_assessment.priority_band.value if finding.risk_assessment else "P2"
        score = finding.risk_assessment.priority_score if finding.risk_assessment else 50.0

        self.graph.add_node(
            node_id,
            node_type="finding",
            title=finding.title,
            rule_id=finding.rule_id,
            category=finding.category.value,
            severity=sev,
            priority_band=band,
            priority_score=score,
            file_path=finding.evidence.file_path,
            start_line=finding.evidence.start_line,
        )

        # 1. Connect to File node
        if finding.evidence.file_path:
            file_node = f"file:{finding.evidence.file_path}"
            self.graph.add_node(file_node, node_type="file", path=finding.evidence.file_path)
            self.graph.add_edge(file_node, node_id, edge_type="has_finding", confidence=1.0)

        # 2. Connect to Symbol node
        if finding.evidence.symbol_name:
            sym_node = f"symbol:{finding.evidence.symbol_name}"
            self.graph.add_node(
                sym_node,
                node_type="symbol",
                name=finding.evidence.symbol_name,
                kind=finding.evidence.symbol_kind or "function",
            )
            self.graph.add_edge(sym_node, node_id, edge_type="has_finding", confidence=1.0)

        # 3. Connect to Route node
        if finding.evidence.route_endpoint:
            route_node = f"route:{finding.evidence.route_endpoint}"
            self.graph.add_node(
                route_node,
                node_type="route",
                endpoint=finding.evidence.route_endpoint,
                method=finding.evidence.http_method or "GET",
            )
            self.graph.add_edge(route_node, node_id, edge_type="exposes", confidence=1.0)

        # 4. Connect to Package node
        if finding.package_name:
            pkg_node = f"pkg:{finding.package_name}@{finding.installed_version or 'unknown'}"
            self.graph.add_node(
                pkg_node,
                node_type="package",
                package_name=finding.package_name,
                version=finding.installed_version,
            )
            self.graph.add_edge(pkg_node, node_id, edge_type="affected_by", confidence=1.0)

        # 5. Connect to CWE node
        if finding.enrichment and finding.enrichment.cwe_ids:
            for cwe in finding.enrichment.cwe_ids:
                cwe_node = f"cwe:{cwe}"
                self.graph.add_node(cwe_node, node_type="cwe", cwe_id=cwe)
                self.graph.add_edge(node_id, cwe_node, edge_type="maps_to_cwe", confidence=1.0)

        # 6. Add Reachability Edges
        if finding.reachability and finding.reachability.call_hops:
            prev_node = None
            for hop in finding.reachability.call_hops:
                src_node = f"entity:{hop.source_entity}"
                dst_node = f"entity:{hop.target_entity}"
                self.graph.add_node(src_node, node_type="call_entity", name=hop.source_entity)
                self.graph.add_node(dst_node, node_type="call_entity", name=hop.target_entity)
                self.graph.add_edge(
                    src_node,
                    dst_node,
                    edge_type=hop.relationship,
                    confidence=hop.confidence,
                    file_path=hop.file_path,
                    line_number=hop.line_number,
                )
                prev_node = dst_node

        return node_id

    def build_from_findings(self, findings: List[CanonicalFinding]) -> None:
        """Populates graph from a list of CanonicalFinding instances."""
        for f in findings:
            self.add_finding_node(f)

    def get_subgraph_for_finding(self, finding_id: uuid.UUID, max_depth: int = 2) -> Dict[str, Any]:
        """
        Extracts bounded ego-network around a specific finding for visualization.
        """
        center_node = f"finding:{str(finding_id)}"
        if center_node not in self.graph:
            return {"nodes": [], "edges": []}

        subgraph_nodes = set([center_node])
        current_layer = set([center_node])

        for _ in range(max_depth):
            next_layer = set()
            for node in current_layer:
                neighbors = set(self.graph.predecessors(node)).union(self.graph.successors(node))
                next_layer.update(neighbors - subgraph_nodes)
            subgraph_nodes.update(next_layer)
            current_layer = next_layer

        nodes_data = []
        for n in subgraph_nodes:
            d = dict(self.graph.nodes[n])
            d["id"] = n
            nodes_data.append(d)

        edges_data = []
        for u, v, d in self.graph.edges(subgraph_nodes, data=True):
            if v in subgraph_nodes:
                edges_data.append({
                    "source": u,
                    "target": v,
                    "edge_type": d.get("edge_type", "related"),
                    "confidence": d.get("confidence", 1.0),
                })

        return {"nodes": nodes_data, "edges": edges_data}

