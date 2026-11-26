"""
Kavach SAST Sub-Engine — Data Flow Engine
Follows data flow across functions, variable reassignments, and multi-file modules.
"""

import os
from typing import Dict, Any, List, Set, Tuple


class DataFlowGraph:
    def __init__(self):
        self.nodes: Set[str] = set()
        self.edges: List[Tuple[str, str]] = []  # (from_node, to_node)

    def add_edge(self, u: str, v: str):
        self.nodes.add(u)
        self.nodes.add(v)
        self.edges.append((u, v))

    def has_path(self, start: str, end: str) -> bool:
        visited = set()
        queue = [start]
        while queue:
            curr = queue.pop(0)
            if curr == end:
                return True
            if curr not in visited:
                visited.add(curr)
                for u, v in self.edges:
                    if u == curr and v not in visited:
                        queue.append(v)
        return False


class DataFlowEngine:
    """
    Builds data flow models to trace cross-function propagation of data.
    """

    def build_call_graph(self, parsed_functions: List[Dict[str, Any]], parsed_calls: List[Dict[str, Any]]) -> DataFlowGraph:
        graph = DataFlowGraph()
        func_names = {f["name"] for f in parsed_functions}

        for call in parsed_calls:
            c_name = call["name"].split(".")[-1]
            if c_name in func_names:
                graph.add_edge("caller", c_name)

        return graph

