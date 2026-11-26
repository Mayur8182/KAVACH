import re
from typing import List, Dict, Any, Tuple
from collections import defaultdict
import networkx as nx


class ArchitectureAuditAgent:
    """
    Evaluates module boundaries, circular dependencies, coupling/cohesion,
    layering violations, and God object anti-patterns.
    """

    def analyze(
        self,
        files: List[Any],
        dependencies: List[Any] = None,
        symbols: List[Any] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        # 1. Build Dependency Graph
        graph = nx.DiGraph()
        file_to_module: Dict[str, str] = {}

        for file_obj in files:
            path = getattr(file_obj, "relative_path", "").replace("\\", "/")
            if not path or self._should_skip(path):
                continue
            module = self._get_module(path)
            file_to_module[path] = module
            graph.add_node(path, module=module)

        # Populate edges from file content imports if dependencies not fully provided
        for file_obj in files:
            src = getattr(file_obj, "relative_path", "").replace("\\", "/")
            content = getattr(file_obj, "content", "")
            if not content or self._should_skip(src):
                continue

            imported_paths = self._extract_imports(src, content, list(file_to_module.keys()))
            for target in imported_paths:
                if target != src:
                    graph.add_edge(src, target)

        # If explicit dependencies provided, add them too
        if dependencies:
            for dep in dependencies:
                s = getattr(dep, "source_file", "").replace("\\", "/")
                t = getattr(dep, "target_file", "").replace("\\", "/")
                if s and t and s in graph and t in graph and s != t:
                    graph.add_edge(s, t)

        # 2. Circular Dependency Detection
        circular_cycles: List[List[str]] = []
        try:
            cycles = list(nx.simple_cycles(graph))
            for cycle in cycles:
                if len(cycle) >= 2:
                    cycle_closed = cycle + [cycle[0]]
                    circular_cycles.append(cycle_closed)
                    cycle_str = " -> ".join(cycle_closed)
                    findings.append({
                        "category": "ARCHITECTURE",
                        "rule_id": "KAV-ARCH-001",
                        "title": f"Circular module dependency ({len(cycle)} files)",
                        "description": f"Circular dependency cycle detected: {cycle_str}. Circular imports cause fragile startup order, tight coupling, and testing complications.",
                        "severity": "HIGH",
                        "priority": "P1",
                        "confidence": "CONFIRMED",
                        "file_path": cycle[0],
                        "start_line": 1,
                        "end_line": 1,
                        "code_evidence": f"Cycle: {cycle_str}",
                        "root_cause": "Tightly coupled domain concepts or missing abstraction layer.",
                        "technical_impact": "Runtime initialization crashes, memory leaks, impossible isolated unit testing.",
                        "recommended_solution": "Extract shared types/interfaces to a common module or apply Dependency Inversion.",
                        "estimated_remediation_minutes": 90,
                        "related_files": cycle[1:],
                        "related_symbols": [],
                        "detection_method": "DEPENDENCY_GRAPH",
                    })
        except Exception:
            pass

        # 3. Layering Violations
        # e.g., UI directly importing DB or API controllers directly importing raw ORM drivers without services
        for u, v in graph.edges():
            u_lower = u.lower()
            v_lower = v.lower()
            if ("frontend" in u_lower or "components" in u_lower or "app/" in u_lower) and (
                "backend/app/models" in v_lower or "database" in v_lower or "alembic" in v_lower
            ):
                findings.append({
                    "category": "ARCHITECTURE",
                    "rule_id": "KAV-ARCH-002",
                    "title": f"Architectural layering breach: Frontend imports Backend DB model",
                    "description": f"Frontend component '{u}' directly references backend persistence file '{v}'.",
                    "severity": "CRITICAL",
                    "priority": "P0",
                    "confidence": "CONFIRMED",
                    "file_path": u,
                    "start_line": 1,
                    "end_line": 1,
                    "code_evidence": f"import from {v}",
                    "root_cause": "Improper monorepo boundary separation or accidental relative import.",
                    "technical_impact": "Security risk, bundle bloat, backend credentials/schema leaks in client bundle.",
                    "recommended_solution": "Communicate strictly via typed REST/GraphQL APIs and shared client DTO schemas.",
                    "estimated_remediation_minutes": 60,
                    "related_files": [v],
                    "related_symbols": [],
                    "detection_method": "DEPENDENCY_GRAPH",
                })

        # 4. High Module Coupling Analysis
        module_in = defaultdict(int)
        module_out = defaultdict(int)
        for u, v in graph.edges():
            mod_u = file_to_module.get(u, "root")
            mod_v = file_to_module.get(v, "root")
            if mod_u != mod_v:
                module_out[mod_u] += 1
                module_in[mod_v] += 1

        for mod, out_count in module_out.items():
            in_count = module_in[mod]
            total_edges = in_count + out_count
            if total_edges > 15 and out_count > 10:
                instability = out_count / total_edges if total_edges else 0
                if instability > 0.8:
                    findings.append({
                        "category": "ARCHITECTURE",
                        "rule_id": "KAV-ARCH-003",
                        "title": f"High outward coupling (Instability: {instability:.2f}) in module '{mod}'",
                        "description": f"Module '{mod}' depends on {out_count} external modules. High instability makes this module fragile to external changes.",
                        "severity": "MEDIUM",
                        "priority": "P2",
                        "confidence": "HIGH",
                        "file_path": f"{mod}/",
                        "start_line": 1,
                        "end_line": 1,
                        "code_evidence": f"Outward dependencies: {out_count}, Inward dependencies: {in_count}",
                        "root_cause": "Module lacks a cohesive domain boundary and aggregates cross-cutting calls.",
                        "technical_impact": "High blast radius of breaking changes when any downstream module changes.",
                        "recommended_solution": "Consolidate external dependencies behind a facade or adapter pattern.",
                        "estimated_remediation_minutes": 60,
                        "related_files": [],
                        "related_symbols": [],
                        "detection_method": "DEPENDENCY_GRAPH",
                    })

        # Calculate graph metadata for UI
        nodes_list = []
        for n, data in graph.nodes(data=True):
            in_deg = graph.in_degree(n)
            out_deg = graph.out_degree(n)
            nodes_list.append({
                "id": n,
                "label": n.split("/")[-1],
                "module": data.get("module", "root"),
                "in_degree": in_deg,
                "out_degree": out_deg,
            })

        edges_list = [{"source": u, "target": v} for u, v in graph.edges()]
        total_nodes = len(nodes_list) or 1
        coupling_index = round(len(edges_list) / total_nodes, 2)

        arch_metadata = {
            "graph_nodes": nodes_list[:150],  # cap for UI performance
            "graph_edges": edges_list[:250],
            "circular_dependencies": circular_cycles,
            "coupling_index": coupling_index,
            "modular_cohesion": round(max(0.0, 1.0 - (len(circular_cycles) * 0.15)), 2),
            "god_classes": [],
        }

        return findings, arch_metadata

    def _should_skip(self, path: str) -> bool:
        p = path.lower()
        return any(x in p for x in ["node_modules", ".git", "venv", ".venv", "dist", "build", ".next", "coverage"])

    def _get_module(self, path: str) -> str:
        parts = path.strip("/").split("/")
        if len(parts) >= 2:
            return f"{parts[0]}/{parts[1]}"
        return parts[0] if parts else "root"

    def _extract_imports(self, current_file: str, content: str, all_files: List[str]) -> List[str]:
        matched = set()
        # Python imports
        py_matches = re.findall(r"(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))", content)
        for m in py_matches:
            imp = m[0] or m[1]
            imp_path = imp.replace(".", "/")
            for f in all_files:
                if f.endswith(f"{imp_path}.py") or f.endswith(f"{imp_path}/__init__.py"):
                    matched.add(f)

        # JS/TS imports
        js_matches = re.findall(r"(?:import|from|require)\s*\(?['\"]([.@/\w_-]+)['\"]", content)
        for imp in js_matches:
            if imp.startswith("."):
                # Relative resolution
                cur_dir = "/".join(current_file.split("/")[:-1])
                target_base = f"{cur_dir}/{imp}".replace("//", "/")
                # Normalize path
                parts = []
                for p in target_base.split("/"):
                    if p == "..":
                        if parts:
                            parts.pop()
                    elif p != ".":
                        parts.append(p)
                norm_target = "/".join(parts)
                for f in all_files:
                    if f.startswith(norm_target):
                        matched.add(f)
        return list(matched)

