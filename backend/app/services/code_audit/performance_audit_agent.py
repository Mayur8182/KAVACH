import ast
import re
from typing import List, Dict, Any


class PerformanceAuditAgent:
    """
    Evaluates N+1 database queries, synchronous blocking calls in async loops,
    React re-render hazards, and memory leak patterns.
    """

    def analyze(self, files: List[Any], endpoints: List[Any] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        for file_obj in files:
            path = getattr(file_obj, "relative_path", "").replace("\\", "/")
            content = getattr(file_obj, "content", "")
            if not content or self._should_skip(path):
                continue

            lines = content.splitlines()

            if path.endswith(".py"):
                self._analyze_python_perf(path, content, lines, findings)
            elif path.endswith((".ts", ".tsx", ".js", ".jsx")):
                self._analyze_js_perf(path, content, lines, findings)

        return findings

    def _should_skip(self, path: str) -> bool:
        p = path.lower()
        return any(x in p for x in ["node_modules", ".git", "venv", ".venv", "dist", "build", ".next", "coverage"])

    def _analyze_python_perf(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        try:
            tree = ast.parse(content)
        except Exception:
            return

        for node in ast.walk(tree):
            # 1. N+1 Query Pattern: Loop containing DB query or HTTP call
            if isinstance(node, (ast.For, ast.While, ast.AsyncFor)):
                for sub in ast.walk(node):
                    if isinstance(sub, (ast.Call, ast.Await)):
                        call_repr = self._get_call_str(sub)
                        if self._is_db_or_network_call(call_repr):
                            lineno = getattr(sub, "lineno", node.lineno)
                            findings.append({
                                "category": "PERFORMANCE",
                                "rule_id": "KAV-PERF-001",
                                "title": f"N+1 Query Pattern: Database/Network operation inside loop ({call_repr})",
                                "description": f"Operation '{call_repr}' executed inside loop at line {lineno} in {path}. This can cause $O(N)$ sequential roundtrips.",
                                "severity": "HIGH",
                                "priority": "P1",
                                "confidence": "HIGH",
                                "file_path": path,
                                "start_line": lineno,
                                "end_line": lineno,
                                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else call_repr,
                                "root_cause": "Fetching relational data or dispatching requests per item rather than batching.",
                                "technical_impact": "Severe latency degradation, connection pool exhaustion, and high database load.",
                                "recommended_solution": "Batch queries using SQL IN clauses, joinedload/selectinload eager loading, or asyncio.gather.",
                                "estimated_remediation_minutes": 45,
                                "related_files": [],
                                "related_symbols": [call_repr],
                                "detection_method": "AST_ANALYSIS",
                            })
                            break  # report once per loop

            # 2. Blocking synchronous operations in async functions
            elif isinstance(node, ast.AsyncFunctionDef):
                for sub in ast.walk(node):
                    if isinstance(sub, ast.Call):
                        call_repr = self._get_call_str(sub)
                        if "time.sleep" in call_repr:
                            lineno = sub.lineno
                            findings.append({
                                "category": "PERFORMANCE",
                                "rule_id": "KAV-PERF-002",
                                "title": f"Blocking 'time.sleep' in async function '{node.name}'",
                                "description": f"Calling synchronous time.sleep() inside async function '{node.name}' freezes the event loop.",
                                "severity": "CRITICAL",
                                "priority": "P0",
                                "confidence": "CONFIRMED",
                                "file_path": path,
                                "start_line": lineno,
                                "end_line": lineno,
                                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else call_repr,
                                "root_cause": "Using synchronous blocking standard library calls in an asynchronous runtime.",
                                "technical_impact": "Complete freeze of server throughput and dropped concurrent requests.",
                                "recommended_solution": "Replace with 'await asyncio.sleep(...)'.",
                                "estimated_remediation_minutes": 10,
                                "related_files": [],
                                "related_symbols": [node.name],
                                "detection_method": "AST_ANALYSIS",
                            })
                        elif call_repr.startswith("requests."):
                            lineno = sub.lineno
                            findings.append({
                                "category": "PERFORMANCE",
                                "rule_id": "KAV-PERF-003",
                                "title": f"Synchronous 'requests' call inside async function '{node.name}'",
                                "description": f"Synchronous HTTP call '{call_repr}' blocks the Python async event loop in {path}.",
                                "severity": "HIGH",
                                "priority": "P1",
                                "confidence": "HIGH",
                                "file_path": path,
                                "start_line": lineno,
                                "end_line": lineno,
                                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else call_repr,
                                "root_cause": "Mixing synchronous requests library with async FastAPI endpoints.",
                                "technical_impact": "Degrades endpoint concurrency, causing thread pool starvation.",
                                "recommended_solution": "Use async HTTP client like 'httpx.AsyncClient' or 'aiohttp'.",
                                "estimated_remediation_minutes": 30,
                                "related_files": [],
                                "related_symbols": [node.name],
                                "detection_method": "AST_ANALYSIS",
                            })

    def _analyze_js_perf(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        # 1. Missing memoization or expensive operations in React components
        if path.endswith((".tsx", ".jsx")) or ("React" in content and path.endswith((".ts", ".js"))):
            # Check for JSON.parse or array.sort in render body without useMemo
            heavy_ops = [r"\bJSON\.parse\(", r"\.sort\(", r"\.filter\(.*?\)\.map\("]
            for op_pattern in heavy_ops:
                matches = list(re.finditer(op_pattern, content))
                if matches and "useMemo" not in content and len(lines) > 100:
                    first = matches[0]
                    lineno = content[:first.start()].count("\n") + 1
                    findings.append({
                        "category": "PERFORMANCE",
                        "rule_id": "KAV-PERF-004",
                        "title": f"Unmemoized expensive transformation in React component",
                        "description": f"Transformations like sort/filter or JSON.parse run on every component re-render in {path}.",
                        "severity": "MEDIUM",
                        "priority": "P2",
                        "confidence": "HIGH",
                        "file_path": path,
                        "start_line": lineno,
                        "end_line": lineno,
                        "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "",
                        "root_cause": "Inline heavy data transformation inside functional component render scope.",
                        "technical_impact": "Frame rate drops, UI stuttering, and CPU spikes during parent re-renders.",
                        "recommended_solution": "Wrap computationally expensive derivations in 'useMemo(..., [deps])'.",
                        "estimated_remediation_minutes": 20,
                        "related_files": [],
                        "related_symbols": [],
                        "detection_method": "AST_ANALYSIS",
                    })
                    break

        # 2. Async/await inside Array.forEach or Array.map causing unhandled promises
        async_foreach = re.search(r"\.forEach\s*\(\s*async\s*\(", content)
        if async_foreach:
            lineno = content[:async_foreach.start()].count("\n") + 1
            findings.append({
                "category": "PERFORMANCE",
                "rule_id": "KAV-PERF-005",
                "title": "Async callback in Array.forEach does not await operations",
                "description": f"Array.forEach does not await async promises at line {lineno} in {path}.",
                "severity": "HIGH",
                "priority": "P1",
                "confidence": "CONFIRMED",
                "file_path": path,
                "start_line": lineno,
                "end_line": lineno,
                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "",
                "root_cause": "Array.prototype.forEach ignores returned promises from async callbacks.",
                "technical_impact": "Concurrent unhandled promises, race conditions, and un-awaited operations.",
                "recommended_solution": "Use 'await Promise.all(items.map(async ...))' or a 'for...of' loop.",
                "estimated_remediation_minutes": 15,
                "related_files": [],
                "related_symbols": [],
                "detection_method": "AST_ANALYSIS",
            })

    def _get_call_str(self, node: ast.AST) -> str:
        if isinstance(node, ast.Await):
            return self._get_call_str(node.value)
        if isinstance(node, ast.Call):
            return self._get_call_str(node.func)
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            val = self._get_call_str(node.value)
            return f"{val}.{node.attr}" if val else node.attr
        return ""

    def _is_db_or_network_call(self, call_str: str) -> bool:
        low = call_str.lower()
        patterns = ["db.execute", "session.execute", "session.query", "session.add", "session.commit",
                    "select", "fetch", "requests.", "http.", "query", "find_one", "find"]
        return any(p in low for p in patterns)
