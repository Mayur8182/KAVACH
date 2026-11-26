"""
Kavach SAST Sub-Engine — Parser Engine
Parses source code into AST and token representations across Python, JavaScript, TypeScript, and Go.
"""

import ast
import os
import re
from typing import Dict, Any, List, Optional


class CodeASTNode:
    def __init__(self, node_type: str, name: str, line: int, col: int = 0, raw: str = ""):
        self.node_type = node_type
        self.name = name
        self.line = line
        self.col = col
        self.raw = raw
        self.children: List["CodeASTNode"] = []
        self.parent: Optional["CodeASTNode"] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.node_type,
            "name": self.name,
            "line": self.line,
            "col": self.col,
            "children_count": len(self.children),
        }


class CodeParserEngine:
    """
    Parses repository files into structured syntax trees for static and taint analysis.
    """

    def parse_python(self, content: str, file_path: str = "") -> Optional[ast.AST]:
        try:
            return ast.parse(content, filename=file_path)
        except SyntaxError:
            return None

    def extract_python_functions_and_calls(self, content: str) -> Dict[str, Any]:
        tree = self.parse_python(content)
        if not tree:
            return {"functions": [], "calls": [], "imports": []}

        functions = []
        calls = []
        imports = []

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append({
                    "name": node.name,
                    "line": node.lineno,
                    "args": [a.arg for a in node.args.args],
                })
            elif isinstance(node, ast.Call):
                func_name = ""
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = f"{getattr(node.func.value, 'id', '')}.{node.func.attr}"
                if func_name:
                    calls.append({
                        "name": func_name,
                        "line": getattr(node, "lineno", 1),
                    })
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                for alias in node.names:
                    imports.append(f"{mod}.{alias.name}")

        return {
            "functions": functions,
            "calls": calls,
            "imports": imports,
        }

    def parse_js_ts(self, content: str) -> Dict[str, Any]:
        """
        Lightweight lexical parser for JavaScript/TypeScript function definitions, calls, and imports.
        """
        functions = []
        calls = []
        imports = []

        lines = content.split("\n")
        func_pattern = re.compile(r"(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)")
        call_pattern = re.compile(r"([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)?)\s*\(")
        import_pattern = re.compile(r"import\s+.*?from\s+['\"](.*?)['\"]|require\(['\"](.*?)['\"]\)")

        for idx, line in enumerate(lines, 1):
            f_match = func_pattern.search(line)
            if f_match:
                name = f_match.group(1) or f_match.group(2)
                functions.append({"name": name, "line": idx})

            c_matches = call_pattern.findall(line)
            for c in c_matches:
                if c not in ("if", "for", "while", "switch", "catch"):
                    calls.append({"name": c, "line": idx})

            i_matches = import_pattern.findall(line)
            for i in i_matches:
                pkg = i[0] or i[1]
                if pkg:
                    imports.append(pkg)

        return {"functions": functions, "calls": calls, "imports": imports}

