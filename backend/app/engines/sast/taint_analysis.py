"""
Kavach SAST Sub-Engine — Taint Analysis Engine
Tracks untrusted input sources (HTTP query, body, headers, CLI inputs) to dangerous sinks.
"""

import ast
import re
import uuid
from typing import Dict, Any, List, Set, Optional
from app.engines.base_engine import EngineFinding, EngineType


TAINT_SOURCES = {
    "request.args",
    "request.form",
    "request.json",
    "request.body",
    "request.GET",
    "request.POST",
    "req.query",
    "req.body",
    "req.params",
    "input(",
    "sys.argv",
    "os.environ",
}

TAINT_SINKS = {
    "cursor.execute": "CWE-89 SQL Injection",
    "os.system": "CWE-78 Command Injection",
    "subprocess.Popen": "CWE-78 Command Injection",
    "eval": "CWE-95 Code Injection",
    "exec": "CWE-95 Code Injection",
    "open": "CWE-22 Path Traversal",
}

SANITIZERS = {
    "int(",
    "float(",
    "shlex.quote",
    "escape(",
    "DOMPurify",
    "validator.isAlphanumeric",
    "urlencode",
}


class TaintAnalysisEngine:
    """
    Analyzes AST and token flows to trace untrusted variable propagations.
    """

    def analyze_python_taint(self, file_path: str, content: str) -> List[EngineFinding]:
        findings: List[EngineFinding] = []
        try:
            tree = ast.parse(content, filename=file_path)
        except Exception:
            return findings

        # Track tainted variable names
        tainted_vars: Set[str] = set()
        var_source_lines: Dict[str, int] = {}

        for node in ast.walk(tree):
            # Check variable assignments: var = request.args.get(...)
            if isinstance(node, ast.Assign):
                is_source = False
                source_expr = ""
                for src in TAINT_SOURCES:
                    if src in ast.unparse(node.value):
                        is_source = True
                        source_expr = src
                        break

                if is_source:
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            tainted_vars.add(target.id)
                            var_source_lines[target.id] = getattr(node, "lineno", 1)

            # Check function calls for sinks with tainted variables
            elif isinstance(node, ast.Call):
                func_str = ast.unparse(node.func)
                for sink_prefix, cwe_name in TAINT_SINKS.items():
                    if sink_prefix in func_str:
                        # Check if any argument contains a tainted variable
                        for arg in node.args:
                            arg_str = ast.unparse(arg)
                            for tvar in tainted_vars:
                                if tvar in arg_str:
                                    # Check if a sanitizer was applied
                                    is_sanitized = any(san in arg_str for san in SANITIZERS)
                                    if not is_sanitized:
                                        call_line = getattr(node, "lineno", 1)
                                        findings.append(EngineFinding(
                                            id=f"taint-{uuid.uuid4().hex[:8]}",
                                            engine=EngineType.SAST,
                                            sub_engine="Taint Analysis Engine",
                                            rule_id="KV-TAINT-001",
                                            title=f"Tainted Data Flow to Dangerous Sink ({cwe_name})",
                                            description=f"Untrusted input variable '{tvar}' from line {var_source_lines.get(tvar, 'unknown')} flows directly into dangerous sink '{func_str}' at line {call_line} without sanitization.",
                                            severity="CRITICAL",
                                            file_path=file_path,
                                            line_start=call_line,
                                            line_end=call_line,
                                            code_snippet=arg_str,
                                            remediation_guidance="Sanitize or validate untrusted input using strict type coercion or parameterized abstractions before sink execution.",
                                            evidence={
                                                "tainted_variable": tvar,
                                                "source_line": var_source_lines.get(tvar),
                                                "sink": func_str,
                                                "sink_line": call_line,
                                            },
                                        ))
        return findings

