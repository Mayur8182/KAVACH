"""
Kavach Codebase Intelligence — Step 1.5: Dependency Graph Engine
Constructs directed dependency and call graphs using NetworkX.
Traces cross-file call paths, module imports, external package usage, and taint reachability.
"""

from typing import Dict, List, Optional, Set, Tuple, Any, Union
try:
    import networkx as nx
except ImportError:
    nx = None

from app.intelligence.codebase.ast_parser import CodeFileAST
from app.intelligence.codebase.symbol_index import SymbolIndex, CodeSymbol


class DependencyGraphEngine:
    """
    Step 1.5: NetworkX-Powered Dependency & Taint Graph.
    """

    def __init__(self, symbol_index: Optional[SymbolIndex] = None):
        self.symbol_index = symbol_index or SymbolIndex()
        # DiGraph where nodes are either files, symbols, or external packages
        self.graph = nx.DiGraph() if nx is not None else None
        # Track external packages
        self.external_dependencies: Set[str] = set()

    def build_from_asts(self, asts: Union[List[CodeFileAST], Dict[str, CodeFileAST]]) -> None:
        """
        Builds graph from parsed ASTs and resolved symbol index.
        """
        ast_list: List[CodeFileAST] = list(asts.values()) if isinstance(asts, dict) else list(asts)
        # Ensure symbols are indexed and resolved
        for ast_obj in ast_list:
            if not any(s.file_path == ast_obj.file_path for s in self.symbol_index.symbols.values()):
                self.symbol_index.index_ast(ast_obj)
        self.symbol_index.resolve_call_graph()

        # 1. Add file nodes
        for ast_obj in ast_list:
            f_node = f"file:{ast_obj.file_path}"
            self.graph.add_node(f_node, node_type="file", path=ast_obj.file_path, language=ast_obj.language)

            # 2. Add imports (file -> file OR file -> external_pkg)
            for imp in ast_obj.imports:
                mod = imp.module
                if not mod:
                    continue

                # Check if it corresponds to an internal project file
                matched_internal = self._resolve_internal_import(mod, ast_list)
                if matched_internal:
                    target_file = f"file:{matched_internal}"
                    self.graph.add_edge(f_node, target_file, relationship="imports")
                else:
                    pkg_name = mod.split(".")[0].split("/")[0]
                    self.external_dependencies.add(pkg_name)
                    pkg_node = f"pkg:{pkg_name}"
                    self.graph.add_node(pkg_node, node_type="external_package", name=pkg_name)
                    self.graph.add_edge(f_node, pkg_node, relationship="depends_on")

        # 3. Add symbol nodes and call edges
        for sym_id, sym in self.symbol_index.symbols.items():
            s_node = f"symbol:{sym_id}"
            self.graph.add_node(
                s_node,
                node_type="symbol",
                name=sym.name,
                symbol_type=sym.symbol_type.value,
                file=sym.file_path,
                line_start=sym.line_start,
                is_endpoint=(sym.symbol_type.value == "ENDPOINT"),
            )
            # Link file -> symbol
            self.graph.add_edge(f"file:{sym.file_path}", s_node, relationship="contains")

            # Link symbol -> callee symbols or external/sink calls
            for callee_raw in sym.calls_made:
                target_name = callee_raw.split(".")[-1]
                callee_syms = self.symbol_index.find_symbol(target_name)
                if callee_syms:
                    for cs in callee_syms:
                        callee_node = f"symbol:{cs.id}"
                        self.graph.add_edge(s_node, callee_node, relationship="calls")
                else:
                    # External / Sink call (e.g. cursor.execute, os.system, db.query)
                    sink_node = f"sink:{callee_raw}"
                    self.graph.add_node(
                        sink_node,
                        node_type="sink",
                        name=callee_raw,
                        file=sym.file_path,
                        line_start=sym.line_start,
                    )
                    self.graph.add_edge(s_node, sink_node, relationship="calls_sink")

    def find_cross_file_path(self, start_symbol: str, target_symbol: str) -> Optional[List[str]]:
        """
        Calculates shortest execution path between two symbols across files.
        """
        start_node = f"symbol:{start_symbol}"
        target_node = f"symbol:{target_symbol}"

        if not self.graph.has_node(start_node) or not self.graph.has_node(target_node):
            return None

        try:
            return nx.shortest_path(self.graph, start_node, target_node)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def trace_dataflow_to_sinks(self, sink_pattern: str = "execute") -> List[Dict[str, Any]]:
        """
        Detects all API endpoints that can reach a function matching `sink_pattern`.
        Core to answering: 'Find all API endpoints where user input reaches an SQL query without sanitization'
        """
        findings = []
        endpoints = self.symbol_index.get_endpoints()

        # Find all nodes that match sink_pattern (either user-defined function or library sink)
        sink_nodes = [
            n for n, d in self.graph.nodes(data=True)
            if d.get("node_type") in ("sink", "symbol") and sink_pattern.lower() in d.get("name", "").lower()
        ]

        for ep in endpoints:
            ep_node = f"symbol:{ep.id}"
            if not self.graph.has_node(ep_node):
                continue

            for sink_node in sink_nodes:
                try:
                    if nx.has_path(self.graph, ep_node, sink_node):
                        path = nx.shortest_path(self.graph, ep_node, sink_node)
                        # Extract the chain of files and symbols
                        chain = []
                        for node_name in path:
                            nd = self.graph.nodes[node_name]
                            chain.append({
                                "node": node_name,
                                "name": nd.get("name"),
                                "file": nd.get("file"),
                                "line": nd.get("line_start"),
                            })

                        findings.append({
                            "endpoint_name": ep.name,
                            "endpoint_file": ep.file_path,
                            "endpoint_line": ep.line_start,
                            "endpoint_method": ep.endpoint_method,
                            "endpoint_path": ep.endpoint_path,
                            "sink_name": self.graph.nodes[sink_node].get("name"),
                            "sink_file": self.graph.nodes[sink_node].get("file"),
                            "path_length": len(path),
                            "call_chain": chain,
                        })
                except Exception:
                    continue

        return findings

    def _resolve_internal_import(self, mod_str: str, asts: List[CodeFileAST]) -> Optional[str]:
        clean_mod = mod_str.replace(".", "/").replace("@/", "")
        for a in asts:
            base_a, _ = a.file_path.rsplit(".", 1) if "." in a.file_path else (a.file_path, "")
            if base_a.endswith(clean_mod) or clean_mod.endswith(base_a):
                return a.file_path
        return None
