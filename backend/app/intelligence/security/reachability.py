"""
Kavach Security Intelligence Engine — Bounded Reachability Analyzer.
Leverages Phase 1 AST Parser and Dependency Graph Engine to discover whether
vulnerable code or packages are reachable from exposed entry points (e.g. HTTP routes).
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Set, Tuple

try:
    import networkx as nx
except ImportError:
    nx = None

from app.intelligence.codebase.ast_parser import CodeFileAST, ASTFunction
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.security.schemas import (
    CanonicalFinding,
    ConfidenceLevel,
    ReachabilityAssessment,
    ReachabilityHop,
    ReachabilityStatus,
)

logger = logging.getLogger("kavach.security_intelligence.reachability")


class ReachabilityAnalyzer:
    """
    Evaluates whether vulnerable functions or packages have a static path from
    public entrypoints (HTTP routes) to vulnerable execution sinks.
    """

    KNOWN_AUTH_MITIGATIONS = {
        "require_auth", "get_current_user", "verify_token", "jwt_required",
        "login_required", "has_permission", "is_admin", "oauth2_scheme",
        "authenticate_user", "authorize_request", "csrf_protect"
    }

    KNOWN_SINK_PATTERNS = {
        "cursor.execute", "db.query", "session.execute", "raw_sql", "execute_sql",
        "os.system", "subprocess.popen", "subprocess.run", "subprocess.call",
        "eval", "exec", "pickle.loads", "yaml.load", "requests.get", "httpx.get"
    }

    @classmethod
    def analyze_finding_reachability(
        cls,
        finding: CanonicalFinding,
        dep_graph_engine: Optional[DependencyGraphEngine] = None,
        file_asts: Optional[Dict[str, CodeFileAST]] = None,
    ) -> ReachabilityAssessment:
        """
        Calculates reachability for a finding.
        Searches for:
        1. Exposed HTTP routes in the codebase.
        2. Paths from routes to the finding's enclosing function.
        3. Paths from the finding to sensitive execution sinks.
        """
        assessment = ReachabilityAssessment(
            status=ReachabilityStatus.NOT_RESOLVED,
            confidence=ConfidenceLevel.LOW,
            limitations=[
                "Static reachability analysis reflects static syntax trees.",
                "Dynamic dispatch, reflection, and runtime feature flags may alter execution flow.",
            ],
        )

        target_symbol = finding.evidence.symbol_name
        target_file = finding.evidence.file_path

        # If finding itself is marked as an API route
        if finding.evidence.route_endpoint:
            assessment.status = ReachabilityStatus.CANDIDATE_PATH
            assessment.confidence = ConfidenceLevel.HIGH
            assessment.entrypoint = f"{finding.evidence.http_method or 'GET'} {finding.evidence.route_endpoint}"
            assessment.entrypoint_file = target_file
            assessment.entrypoint_line = finding.evidence.start_line
            assessment.call_hops.append(
                ReachabilityHop(
                    hop_index=1,
                    source_entity="HTTP Client",
                    target_entity=target_symbol or "route_handler",
                    file_path=target_file,
                    line_number=finding.evidence.start_line,
                    relationship="exposes_route",
                    confidence=1.0,
                )
            )
            return assessment

        if not dep_graph_engine or not target_symbol:
            assessment.status = ReachabilityStatus.NOT_RESOLVED
            assessment.limitations.append("No dependency graph or symbol found for target file.")
            return assessment

        graph = dep_graph_engine.graph

        # Collect all exposed entrypoint symbols (HTTP routes)
        entrypoints: List[Tuple[str, str, int, str]] = []  # (symbol_key, route_path, line, file)
        if file_asts:
            for f_path, ast in file_asts.items():
                for fn in ast.functions:
                    if fn.is_endpoint:
                        route = getattr(fn, "endpoint_path", getattr(fn, "route_path", None)) or f"/{fn.name}"
                        method = getattr(fn, "endpoint_method", getattr(fn, "http_method", None)) or "GET"
                        ep_label = f"{method} {route}"
                        fn_line = getattr(fn, "line_start", getattr(fn, "start_line", 1))
                        entrypoints.append((fn.name, ep_label, fn_line, f_path))
                for cls_def in ast.classes:
                    for m in cls_def.methods:
                        if m.is_endpoint:
                            route = getattr(m, "endpoint_path", getattr(m, "route_path", None)) or f"/{m.name}"
                            method = getattr(m, "endpoint_method", getattr(m, "http_method", None)) or "GET"
                            ep_label = f"{method} {route}"
                            m_line = getattr(m, "line_start", getattr(m, "start_line", 1))
                            entrypoints.append((f"{cls_def.name}.{m.name}", ep_label, m_line, f_path))

        # If no explicit endpoints found in AST, look for graph nodes labeled as endpoints
        if not entrypoints:
            for node, data in graph.nodes(data=True):
                if data.get("node_type") == "symbol" and data.get("is_endpoint"):
                    entrypoints.append((data.get("name", node), f"ROUTE {node}", 1, data.get("file_path", "")))

        # Find target node candidates in the graph
        target_nodes = [
            n for n in graph.nodes()
            if target_symbol.lower() in n.lower() or (target_file and target_file in n)
        ]

        if not target_nodes:
            # Check if target is a sink itself or called directly
            assessment.status = ReachabilityStatus.NO_PATH_FOUND
            assessment.limitations.append("Target symbol has no incoming callers registered in static graph.")
            return assessment

        best_path = None
        best_entrypoint = None
        mitigations_found: List[str] = []

        # Find shortest path from any entrypoint to any target node
        for ep_name, ep_route, ep_line, ep_file in entrypoints:
            ep_nodes = [n for n in graph.nodes() if ep_name.lower() in n.lower()]
            for ep_node in ep_nodes:
                for t_node in target_nodes:
                    try:
                        if nx.has_path(graph, ep_node, t_node):
                            path = nx.shortest_path(graph, ep_node, t_node)
                            if best_path is None or len(path) < len(best_path):
                                best_path = path
                                best_entrypoint = (ep_name, ep_route, ep_line, ep_file)
                    except Exception:
                        pass

        if best_path:
            ep_name, ep_route, ep_line, ep_file = best_entrypoint
            assessment.entrypoint = ep_route
            assessment.entrypoint_file = ep_file
            assessment.entrypoint_line = ep_line

            hops: List[ReachabilityHop] = []
            for i in range(len(best_path) - 1):
                u = best_path[i]
                v = best_path[i + 1]
                edge_data = graph.get_edge_data(u, v) or {}
                rel = edge_data.get("relationship", "calls")
                evidence_dict = edge_data.get("evidence", {})
                hop_file = evidence_dict.get("file", ep_file)
                hop_line = evidence_dict.get("line", ep_line)

                # Check if this hop introduces a recognized mitigation
                for mit in cls.KNOWN_AUTH_MITIGATIONS:
                    if mit.lower() in u.lower() or mit.lower() in v.lower():
                        mitigations_found.append(f"Authentication/Authorization check: {mit}")

                hops.append(
                    ReachabilityHop(
                        hop_index=i + 1,
                        source_entity=u,
                        target_entity=v,
                        file_path=hop_file,
                        line_number=hop_line,
                        relationship=rel,
                        confidence=edge_data.get("confidence", 1.0),
                    )
                )

            # Check if target node leads further to an SQL or Command sink
            sinks_reached = []
            for successor in graph.successors(best_path[-1]):
                succ_data = graph.nodes.get(successor, {})
                if succ_data.get("node_type") == "sink" or any(s in successor.lower() for s in cls.KNOWN_SINK_PATTERNS):
                    sinks_reached.append(successor)
                    edge_data = graph.get_edge_data(best_path[-1], successor) or {}
                    hops.append(
                        ReachabilityHop(
                            hop_index=len(hops) + 1,
                            source_entity=best_path[-1],
                            target_entity=successor,
                            file_path=target_file,
                            line_number=finding.evidence.start_line,
                            relationship="calls_sink",
                            confidence=1.0,
                        )
                    )

            assessment.call_hops = hops
            if sinks_reached:
                assessment.sink_name = sinks_reached[0]
                assessment.sink_file = target_file
                assessment.sink_line = finding.evidence.start_line

            assessment.mitigations = list(set(mitigations_found))
            if assessment.mitigations:
                assessment.status = ReachabilityStatus.PATH_WITH_MITIGATION
                assessment.confidence = ConfidenceLevel.HIGH
            else:
                assessment.status = ReachabilityStatus.CANDIDATE_PATH
                assessment.confidence = ConfidenceLevel.HIGH

            return assessment

        # If no path from exposed route, check if symbol has internal callers
        has_callers = False
        for t_node in target_nodes:
            if graph.in_degree(t_node) > 0:
                has_callers = True
                break

        if has_callers:
            assessment.status = ReachabilityStatus.CANDIDATE_PATH
            assessment.confidence = ConfidenceLevel.MEDIUM
            assessment.limitations.append("Target is called internally, but no path from a public HTTP route was detected.")
        else:
            assessment.status = ReachabilityStatus.NO_PATH_FOUND
            assessment.confidence = ConfidenceLevel.MEDIUM
            assessment.limitations.append("No static call path connects any entry point to this finding.")

        return assessment
