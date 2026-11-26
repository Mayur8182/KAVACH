import re
import ast
from typing import List, Dict, Any, Tuple


class TestingAuditAgent:
    """
    Evaluates unit and integration test coverage gaps, missing tests for critical business logic,
    weak assertions, and flaky test patterns.
    """

    def analyze(self, files: List[Any], symbols: List[Any] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        all_paths = [getattr(f, "relative_path", "").replace("\\", "/") for f in files]
        test_files = [p for p in all_paths if self._is_test_file(p)]
        source_files = [p for p in all_paths if not self._is_test_file(p) and not self._should_skip(p)]

        # 1. Critical source files without tests
        for src in source_files:
            if self._is_critical_business_logic(src):
                matching_test = self._find_matching_test(src, test_files)
                if not matching_test:
                    findings.append({
                        "category": "TESTING",
                        "rule_id": "KAV-TEST-001",
                        "title": f"Untested critical business logic: {src}",
                        "description": f"Critical service or controller '{src}' has no associated unit or integration test suite.",
                        "severity": "HIGH",
                        "priority": "P1",
                        "confidence": "HIGH",
                        "file_path": src,
                        "start_line": 1,
                        "end_line": 1,
                        "code_evidence": f"No test file matching pattern test_{src.split('/')[-1]} found in test suite.",
                        "root_cause": "Rapid feature delivery without accompanying automated unit tests.",
                        "technical_impact": "High risk of regressions during refactoring, zero safety net for production changes.",
                        "recommended_solution": f"Create a comprehensive test suite (e.g., tests/unit/test_{src.split('/')[-1]}).",
                        "estimated_remediation_minutes": 60,
                        "related_files": [],
                        "related_symbols": [],
                        "detection_method": "HEURISTIC",
                    })

        # 2. Analyze test file contents for weak assertions
        for file_obj in files:
            path = getattr(file_obj, "relative_path", "").replace("\\", "/")
            if not self._is_test_file(path):
                continue
            content = getattr(file_obj, "content", "")
            lines = content.splitlines()

            if path.endswith(".py"):
                self._analyze_python_tests(path, content, lines, findings)
            elif path.endswith((".ts", ".tsx", ".js", ".jsx")):
                self._analyze_js_tests(path, content, lines, findings)

        return findings

    def _is_test_file(self, path: str) -> bool:
        p = path.lower()
        return (
            "test" in p or "spec" in p
        ) and any(p.endswith(ext) for ext in [".py", ".ts", ".tsx", ".js", ".jsx"])

    def _should_skip(self, path: str) -> bool:
        p = path.lower()
        return any(x in p for x in [
            "node_modules", ".git", "venv", ".venv", "dist", "build", ".next",
            "coverage", "migrations", "alembic"
        ])

    def _is_critical_business_logic(self, path: str) -> bool:
        p = path.lower()
        critical_keywords = [
            "service", "controller", "pipeline", "auth", "payment",
            "security", "engine", "billing", "policy"
        ]
        return any(k in p for k in critical_keywords) and any(p.endswith(ext) for ext in [".py", ".ts", ".js"])

    def _find_matching_test(self, src: str, test_files: List[str]) -> bool:
        base_name = src.split("/")[-1].split(".")[0].lower()
        for t in test_files:
            t_base = t.split("/")[-1].lower()
            if base_name in t_base:
                return True
        return False

    def _analyze_python_tests(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        try:
            tree = ast.parse(content)
        except Exception:
            return

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.name.startswith("test_"):
                    # Check assertions
                    asserts = [n for n in ast.walk(node) if isinstance(n, ast.Assert)]
                    if not asserts:
                        findings.append({
                            "category": "TESTING",
                            "rule_id": "KAV-TEST-002",
                            "title": f"Test without assertions in '{node.name}'",
                            "description": f"Test function '{node.name}' at line {node.lineno} in {path} contains no assert statements.",
                            "severity": "MEDIUM",
                            "priority": "P2",
                            "confidence": "CONFIRMED",
                            "file_path": path,
                            "start_line": node.lineno,
                            "end_line": node.end_lineno or node.lineno,
                            "code_evidence": f"def {node.name}(...): [No assert statement found]",
                            "root_cause": "Smoke test executing code without verifying expected state or output.",
                            "technical_impact": "False confidence; test will pass even if business logic produces incorrect results.",
                            "recommended_solution": "Add meaningful assertions verifying return values or state mutations.",
                            "estimated_remediation_minutes": 15,
                            "related_files": [],
                            "related_symbols": [node.name],
                            "detection_method": "AST_ANALYSIS",
                        })
                    else:
                        # Check for trivial assert True
                        for a in asserts:
                            if isinstance(a.test, ast.Constant) and a.test.value is True:
                                findings.append({
                                    "category": "TESTING",
                                    "rule_id": "KAV-TEST-003",
                                    "title": f"Weak assertion 'assert True' in '{node.name}'",
                                    "description": f"Trivial assertion 'assert True' at line {a.lineno} in {path} does not test actual system behavior.",
                                    "severity": "HIGH",
                                    "priority": "P1",
                                    "confidence": "CONFIRMED",
                                    "file_path": path,
                                    "start_line": a.lineno,
                                    "end_line": a.lineno,
                                    "code_evidence": lines[a.lineno - 1] if 0 < a.lineno <= len(lines) else "assert True",
                                    "root_cause": "Placeholder test written to inflate test counts without testing actual logic.",
                                    "technical_impact": "Masks broken behavior and gives illusory test coverage metrics.",
                                    "recommended_solution": "Replace with assertions on actual return data.",
                                    "estimated_remediation_minutes": 15,
                                    "related_files": [],
                                    "related_symbols": [node.name],
                                    "detection_method": "AST_ANALYSIS",
                                })

    def _analyze_js_tests(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        # Check for expect(true).toBe(true)
        trivial = list(re.finditer(r"expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)", content))
        for m in trivial:
            lineno = content[:m.start()].count("\n") + 1
            findings.append({
                "category": "TESTING",
                "rule_id": "KAV-TEST-003",
                "title": "Trivial assertion 'expect(true).toBe(true)'",
                "description": f"Trivial assertion in test file {path} at line {lineno}.",
                "severity": "HIGH",
                "priority": "P1",
                "confidence": "CONFIRMED",
                "file_path": path,
                "start_line": lineno,
                "end_line": lineno,
                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "expect(true).toBe(true)",
                "root_cause": "Placeholder or stubbed test.",
                "technical_impact": "Zero regression safety.",
                "recommended_solution": "Assert actual component state or API responses.",
                "estimated_remediation_minutes": 15,
                "related_files": [],
                "related_symbols": [],
                "detection_method": "AST_ANALYSIS",
            })

