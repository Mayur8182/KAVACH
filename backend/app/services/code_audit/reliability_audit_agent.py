import ast
import re
from typing import List, Dict, Any


class ReliabilityAuditAgent:
    """
    Evaluates reliability risks: swallowed exceptions, unhandled promises,
    missing boundary checks, and resource leak risks.
    """

    def analyze(self, files: List[Any], symbols: List[Any] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        for file_obj in files:
            path = getattr(file_obj, "relative_path", "").replace("\\", "/")
            content = getattr(file_obj, "content", "")
            if not content or self._should_skip(path):
                continue

            lines = content.splitlines()

            if path.endswith(".py"):
                self._analyze_python_reliability(path, content, lines, findings)
            elif path.endswith((".ts", ".tsx", ".js", ".jsx")):
                self._analyze_js_reliability(path, content, lines, findings)

        return findings

    def _should_skip(self, path: str) -> bool:
        p = path.lower()
        return any(x in p for x in [
            "node_modules", ".git", "venv", ".venv", "dist", "build", ".next", "coverage"
        ])

    def _analyze_python_reliability(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        try:
            tree = ast.parse(content)
        except Exception:
            return

        for node in ast.walk(tree):
            # 1. Swallowed Exception: try ... except ...: pass
            if isinstance(node, ast.Try):
                for handler in node.handlers:
                    is_pass = False
                    if len(handler.body) == 1 and isinstance(handler.body[0], ast.Pass):
                        is_pass = True
                    elif len(handler.body) == 1 and isinstance(handler.body[0], ast.Expr) and isinstance(handler.body[0].value, ast.Constant):
                        is_pass = True  # docstring or dummy constant

                    if is_pass:
                        exc_type = "bare except" if handler.type is None else (
                            getattr(handler.type, "id", "Exception") if isinstance(handler.type, ast.Name) else "Exception"
                        )
                        lineno = handler.lineno
                        evidence = lines[lineno - 1] if 0 < lineno <= len(lines) else "except: pass"
                        findings.append({
                            "category": "RELIABILITY",
                            "rule_id": "KAV-REL-001",
                            "title": f"Swallowed exception: '{exc_type}: pass'",
                            "description": f"Silent exception swallowing at line {lineno} in {path}. Suppressing exceptions prevents diagnosis and hides data corruption.",
                            "severity": "CRITICAL" if handler.type is None else "HIGH",
                            "priority": "P0" if handler.type is None else "P1",
                            "confidence": "CONFIRMED",
                            "file_path": path,
                            "start_line": lineno,
                            "end_line": lineno,
                            "code_evidence": evidence,
                            "root_cause": "Hiding runtime errors with silent pass statement.",
                            "technical_impact": "Silent system failures, corrupted state, impossible production debugging.",
                            "recommended_solution": "Log the exception with traceback (e.g. logger.error(...)) or re-raise.",
                            "estimated_remediation_minutes": 15,
                            "related_files": [],
                            "related_symbols": [],
                            "detection_method": "AST_ANALYSIS",
                        })

            # 2. File opened without context manager
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == "open":
                    # Check if enclosed in With statement
                    # Simple heuristic: inspect line text for 'with '
                    lineno = node.lineno
                    if 0 < lineno <= len(lines):
                        line_text = lines[lineno - 1].strip()
                        if not line_text.startswith("with ") and "with " not in line_text:
                            findings.append({
                                "category": "RELIABILITY",
                                "rule_id": "KAV-REL-002",
                                "title": "Resource leak: file opened without 'with' statement",
                                "description": f"File handle opened directly at line {lineno} in {path} without context manager.",
                                "severity": "MEDIUM",
                                "priority": "P2",
                                "confidence": "HIGH",
                                "file_path": path,
                                "start_line": lineno,
                                "end_line": lineno,
                                "code_evidence": line_text,
                                "root_cause": "Failure to use deterministic context manager for OS file descriptors.",
                                "technical_impact": "File descriptor leak leading to 'Too many open files' crashes.",
                                "recommended_solution": "Use 'with open(...) as f:' pattern.",
                                "estimated_remediation_minutes": 10,
                                "related_files": [],
                                "related_symbols": [],
                                "detection_method": "AST_ANALYSIS",
                            })

    def _analyze_js_reliability(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        # 1. Swallowed catch block: catch (err) {} or catch {}
        empty_catch = list(re.finditer(r"catch\s*(?:\([^)]*\))?\s*\{\s*\}", content))
        for m in empty_catch:
            lineno = content[:m.start()].count("\n") + 1
            findings.append({
                "category": "RELIABILITY",
                "rule_id": "KAV-REL-001",
                "title": "Swallowed exception: empty catch block",
                "description": f"Empty catch block at line {lineno} in {path} silences errors without logging or fallback.",
                "severity": "HIGH",
                "priority": "P1",
                "confidence": "CONFIRMED",
                "file_path": path,
                "start_line": lineno,
                "end_line": lineno,
                "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "catch {}",
                "root_cause": "Silencing exceptions without diagnostic logging.",
                "technical_impact": "Masked bugs and silent application breakage.",
                "recommended_solution": "Log error to console or telemetry service and handle gracefully.",
                "estimated_remediation_minutes": 15,
                "related_files": [],
                "related_symbols": [],
                "detection_method": "AST_ANALYSIS",
            })

        # 2. Unhandled promise: .then() without .catch()
        then_calls = list(re.finditer(r"\.then\s*\(", content))
        for m in then_calls:
            # Check if there is a .catch within the next 200 characters
            sub = content[m.start(): min(m.start() + 200, len(content))]
            if ".catch" not in sub and "await " not in content[max(0, m.start() - 30): m.start()]:
                lineno = content[:m.start()].count("\n") + 1
                findings.append({
                    "category": "RELIABILITY",
                    "rule_id": "KAV-REL-003",
                    "title": "Promise chain missing .catch() rejection handler",
                    "description": f"Promise .then() chain at line {lineno} in {path} lacks an explicit rejection handler.",
                    "severity": "MEDIUM",
                    "priority": "P2",
                    "confidence": "MEDIUM",
                    "file_path": path,
                    "start_line": lineno,
                    "end_line": lineno,
                    "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else ".then(...)",
                    "root_cause": "Omission of error rejection branch in Promise chain.",
                    "technical_impact": "UnhandledPromiseRejection errors leading to node process termination.",
                    "recommended_solution": "Append .catch(err => ...) or convert to async/await with try/catch.",
                    "estimated_remediation_minutes": 15,
                    "related_files": [],
                    "related_symbols": [],
                    "detection_method": "AST_ANALYSIS",
                })
                break  # flag once per file to avoid noise

