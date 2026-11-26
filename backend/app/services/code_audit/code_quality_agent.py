import ast
import re
from typing import List, Dict, Any, Optional


class CodeQualityAuditAgent:
    """
    Analyzes code smells, cyclomatic/cognitive complexity, function/class size,
    nesting depth, unused imports/variables, and naming patterns.
    """

    def analyze(self, files: List[Any], symbols: List[Any] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        for file_obj in files:
            path = getattr(file_obj, "relative_path", "")
            content = getattr(file_obj, "content", "")
            if not content or self._should_skip_file(path):
                continue

            lines = content.splitlines()
            total_lines = len(lines)

            # Rule: Large File
            if total_lines > 800:
                findings.append({
                    "category": "QUALITY",
                    "rule_id": "KAV-QUAL-001",
                    "title": f"Excessive file size ({total_lines} lines)",
                    "description": f"File {path} exceeds the 800-line maintainability threshold. Large files decrease readability and increase merge conflicts.",
                    "severity": "MEDIUM",
                    "priority": "P2",
                    "confidence": "CONFIRMED",
                    "file_path": path,
                    "start_line": 1,
                    "end_line": total_lines,
                    "code_evidence": f"Total file length: {total_lines} lines",
                    "root_cause": "File accumulates too many distinct responsibilities over time without refactoring.",
                    "technical_impact": "High cognitive load for developers, frequent Git conflicts, low cohesion.",
                    "recommended_solution": "Decompose into smaller single-responsibility modules or sub-components.",
                    "estimated_remediation_minutes": 60,
                    "related_files": [],
                    "related_symbols": [],
                    "detection_method": "AST_ANALYSIS",
                })

            if path.endswith(".py"):
                self._analyze_python(path, content, lines, findings)
            elif path.endswith((".ts", ".tsx", ".js", ".jsx")):
                self._analyze_javascript(path, content, lines, findings)

        return findings

    def _should_skip_file(self, path: str) -> bool:
        norm = path.replace("\\", "/").lower()
        skip_patterns = [
            "node_modules/", "venv/", ".venv/", ".git/", "dist/", "build/",
            ".next/", "coverage/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"
        ]
        return any(p in norm for p in skip_patterns)

    def _analyze_python(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        try:
            tree = ast.parse(content)
        except Exception:
            return  # Syntax error or partial file

        # 1. Unused imports detection
        imported_names = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_names[name] = node.lineno
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_names[name] = node.lineno

        # Check usage in body (excluding import statements)
        for name, lineno in imported_names.items():
            if name == "*":
                findings.append({
                    "category": "QUALITY",
                    "rule_id": "KAV-QUAL-006",
                    "title": f"Wildcard import 'from ... import *'",
                    "description": f"Wildcard imports pollute the namespace and obscure symbol origins in {path}.",
                    "severity": "LOW",
                    "priority": "P3",
                    "confidence": "CONFIRMED",
                    "file_path": path,
                    "start_line": lineno,
                    "end_line": lineno,
                    "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "",
                    "root_cause": "Convenience import concealing explicit dependencies.",
                    "technical_impact": "Namespace collisions and invisible dependency coupling.",
                    "recommended_solution": "Replace with explicit named symbol imports.",
                    "estimated_remediation_minutes": 10,
                    "related_files": [],
                    "related_symbols": [name],
                    "detection_method": "AST_ANALYSIS",
                })
                continue

            pattern = r"\b" + re.escape(name) + r"\b"
            matches = list(re.finditer(pattern, content))
            # If only occurs once, it's just the import statement itself
            if len(matches) <= 1:
                findings.append({
                    "category": "QUALITY",
                    "rule_id": "KAV-QUAL-002",
                    "title": f"Unused import '{name}'",
                    "description": f"Imported symbol '{name}' appears to be unused in {path}.",
                    "severity": "LOW",
                    "priority": "P3",
                    "confidence": "HIGH",
                    "file_path": path,
                    "start_line": lineno,
                    "end_line": lineno,
                    "code_evidence": lines[lineno - 1] if 0 < lineno <= len(lines) else "",
                    "root_cause": "Dead code left behind after refactoring or feature deletion.",
                    "technical_impact": "Unnecessary memory overhead and developer confusion.",
                    "recommended_solution": f"Remove unused import '{name}'.",
                    "estimated_remediation_minutes": 5,
                    "related_files": [],
                    "related_symbols": [name],
                    "detection_method": "AST_ANALYSIS",
                })

        # 2. Function & Class Metrics
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_len = (node.end_lineno or node.lineno) - node.lineno + 1
                if fn_len > 60:
                    sev = "HIGH" if fn_len > 120 else "MEDIUM"
                    pri = "P1" if fn_len > 120 else "P2"
                    evidence = "\n".join(lines[node.lineno - 1: min(node.lineno + 4, len(lines))])
                    findings.append({
                        "category": "QUALITY",
                        "rule_id": "KAV-QUAL-003",
                        "title": f"Excessive function length ({fn_len} lines) in '{node.name}'",
                        "description": f"Function '{node.name}' spans {fn_len} lines (threshold: 60 lines). Long functions violate Single Responsibility Principle.",
                        "severity": sev,
                        "priority": pri,
                        "confidence": "CONFIRMED",
                        "file_path": path,
                        "start_line": node.lineno,
                        "end_line": node.end_lineno or node.lineno,
                        "code_evidence": evidence,
                        "root_cause": "Procedural accretion of logic without extraction into helper functions.",
                        "technical_impact": "High defect rate, difficulty writing unit tests, low reusability.",
                        "recommended_solution": "Extract sub-procedures into pure helper functions or domain service methods.",
                        "estimated_remediation_minutes": 30,
                        "related_files": [],
                        "related_symbols": [node.name],
                        "detection_method": "AST_ANALYSIS",
                    })

                # Cyclomatic Complexity
                cc = 1
                max_nesting = 0
                for sub in ast.walk(node):
                    if isinstance(sub, (ast.If, ast.For, ast.While, ast.ExceptHandler, ast.With)):
                        cc += 1
                    elif isinstance(sub, ast.BoolOp):
                        cc += len(sub.values) - 1

                # Calculate nesting depth
                def get_nesting(n: ast.AST, depth: int) -> int:
                    current_max = depth
                    for child in ast.iter_child_nodes(n):
                        if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With)):
                            current_max = max(current_max, get_nesting(child, depth + 1))
                        else:
                            current_max = max(current_max, get_nesting(child, depth))
                    return current_max

                max_nesting = get_nesting(node, 0)

                if cc > 10:
                    sev = "CRITICAL" if cc > 18 else "HIGH"
                    findings.append({
                        "category": "QUALITY",
                        "rule_id": "KAV-QUAL-004",
                        "title": f"High Cyclomatic Complexity (CC = {cc}) in '{node.name}'",
                        "description": f"Function '{node.name}' has a cyclomatic complexity of {cc} (threshold: 10). High branching paths make code bug-prone.",
                        "severity": sev,
                        "priority": "P1" if sev == "CRITICAL" else "P2",
                        "confidence": "CONFIRMED",
                        "file_path": path,
                        "start_line": node.lineno,
                        "end_line": node.end_lineno or node.lineno,
                        "code_evidence": f"def {node.name}(...): [Cyclomatic Complexity: {cc}]",
                        "root_cause": "Too many branching conditions and nested execution paths.",
                        "technical_impact": "Combinatorial explosion of test cases required, high defect probability.",
                        "recommended_solution": "Refactor using Guard Clauses, Strategy Pattern, or Table-Driven dispatch.",
                        "estimated_remediation_minutes": 45,
                        "related_files": [],
                        "related_symbols": [node.name],
                        "detection_method": "AST_ANALYSIS",
                    })

                if max_nesting > 4:
                    findings.append({
                        "category": "QUALITY",
                        "rule_id": "KAV-QUAL-005",
                        "title": f"Deeply nested control flow (depth {max_nesting}) in '{node.name}'",
                        "description": f"Function '{node.name}' contains control structures nested {max_nesting} levels deep (threshold: 4 levels).",
                        "severity": "MEDIUM",
                        "priority": "P2",
                        "confidence": "CONFIRMED",
                        "file_path": path,
                        "start_line": node.lineno,
                        "end_line": node.end_lineno or node.lineno,
                        "code_evidence": f"Max nesting depth: {max_nesting}",
                        "root_cause": "Arrow anti-pattern with nested loops and conditionals.",
                        "technical_impact": "High cognitive load, hard to reason about state at deep levels.",
                        "recommended_solution": "Use early return guard clauses and extract inner loops into dedicated functions.",
                        "estimated_remediation_minutes": 25,
                        "related_files": [],
                        "related_symbols": [node.name],
                        "detection_method": "AST_ANALYSIS",
                    })

            elif isinstance(node, ast.ClassDef):
                class_len = (node.end_lineno or node.lineno) - node.lineno + 1
                methods = [n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                if class_len > 400 or len(methods) > 20:
                    findings.append({
                        "category": "QUALITY",
                        "rule_id": "KAV-QUAL-007",
                        "title": f"Large class '{node.name}' ({class_len} lines, {len(methods)} methods)",
                        "description": f"Class '{node.name}' is accumulating too many responsibilities.",
                        "severity": "HIGH",
                        "priority": "P1",
                        "confidence": "CONFIRMED",
                        "file_path": path,
                        "start_line": node.lineno,
                        "end_line": node.end_lineno or node.lineno,
                        "code_evidence": f"class {node.name}: [Lines: {class_len}, Methods: {len(methods)}]",
                        "root_cause": "Violation of Single Responsibility Principle (God Class anti-pattern).",
                        "technical_impact": "Tight coupling, high maintenance cost, difficult test isolation.",
                        "recommended_solution": "Split class into cohesive domain services or composed helper objects.",
                        "estimated_remediation_minutes": 60,
                        "related_files": [],
                        "related_symbols": [node.name],
                        "detection_method": "AST_ANALYSIS",
                    })

    def _analyze_javascript(self, path: str, content: str, lines: List[str], findings: List[Dict[str, Any]]) -> None:
        # Regex-based JS/TS quality analysis
        fn_pattern = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\((.*?)\)\s*\{", re.MULTILINE)
        arrow_pattern = re.compile(r"^\s*(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*(?::\s*[^{]+)?=>\s*\{", re.MULTILINE)

        for match in list(fn_pattern.finditer(content)) + list(arrow_pattern.finditer(content)):
            fn_name = match.group(1)
            char_pos = match.start()
            lineno = content[:char_pos].count("\n") + 1

            # Estimate function length by bracket matching
            brace_count = 1
            idx = match.end()
            while idx < len(content) and brace_count > 0:
                if content[idx] == "{":
                    brace_count += 1
                elif content[idx] == "}":
                    brace_count -= 1
                idx += 1

            fn_body = content[match.start(): idx]
            fn_lines = fn_body.count("\n") + 1
            end_lineno = lineno + fn_lines - 1

            if fn_lines > 60:
                sev = "HIGH" if fn_lines > 120 else "MEDIUM"
                findings.append({
                    "category": "QUALITY",
                    "rule_id": "KAV-QUAL-003",
                    "title": f"Excessive function length ({fn_lines} lines) in '{fn_name}'",
                    "description": f"Function '{fn_name}' spans {fn_lines} lines. Consider breaking it down.",
                    "severity": sev,
                    "priority": "P2",
                    "confidence": "HIGH",
                    "file_path": path,
                    "start_line": lineno,
                    "end_line": end_lineno,
                    "code_evidence": "\n".join(lines[lineno - 1: min(lineno + 3, len(lines))]),
                    "root_cause": "Accumulation of UI, state, and transformation logic in a single function.",
                    "technical_impact": "Testing complexity, re-render inefficiencies, and cognitive overhead.",
                    "recommended_solution": "Extract sub-components or custom hooks/utility functions.",
                    "estimated_remediation_minutes": 30,
                    "related_files": [],
                    "related_symbols": [fn_name],
                    "detection_method": "AST_ANALYSIS",
                })

            # Check nesting
            max_indent = 0
            for line in fn_body.splitlines():
                stripped = line.lstrip()
                if stripped:
                    indent = (len(line) - len(stripped)) // 2  # Assuming 2 spaces
                    if indent > max_indent:
                        max_indent = indent

            if max_indent > 5:
                findings.append({
                    "category": "QUALITY",
                    "rule_id": "KAV-QUAL-005",
                    "title": f"Deeply nested blocks (nesting level {max_indent}) in '{fn_name}'",
                    "description": f"Function '{fn_name}' has deep indentation blocks.",
                    "severity": "MEDIUM",
                    "priority": "P2",
                    "confidence": "HIGH",
                    "file_path": path,
                    "start_line": lineno,
                    "end_line": end_lineno,
                    "code_evidence": f"Max nesting depth: {max_indent}",
                    "root_cause": "Nested conditionals and iterative loops.",
                    "technical_impact": "Cognitive overload, difficult boundary testing.",
                    "recommended_solution": "Flatten logic with guard clauses and early returns.",
                    "estimated_remediation_minutes": 25,
                    "related_files": [],
                    "related_symbols": [fn_name],
                    "detection_method": "AST_ANALYSIS",
                })

