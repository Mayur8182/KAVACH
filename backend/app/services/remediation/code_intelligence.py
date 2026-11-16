"""
Kavach Code Intelligence Engine
Performs repository structure analysis, framework detection, route mapping,
authentication/authorization pattern discovery, and surrounding context extraction.
"""

import os
import re
import ast
import json
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("kavach.remediation.intelligence")


@dataclass
class CodeContext:
    target_file: str
    language: str
    framework: str
    surrounding_code: str
    function_name: Optional[str] = None
    class_name: Optional[str] = None
    enclosing_scope: Optional[str] = None
    imports: List[str] = field(default_factory=list)
    auth_middleware: List[str] = field(default_factory=list)
    authorization_patterns: List[str] = field(default_factory=list)
    related_tests: List[str] = field(default_factory=list)
    dependencies: Dict[str, str] = field(default_factory=dict)
    repo_structure_summary: Dict[str, Any] = field(default_factory=dict)


class CodeIntelligenceService:
    """
    Deterministic Code Intelligence Engine.
    Analyzes repositories to extract verified structural context before LLM reasoning.
    """

    def __init__(self, root_path: str = "."):
        self.root_path = os.path.abspath(root_path)

    def analyze_vulnerability_context(
        self,
        file_path: str,
        line_number: Optional[int] = 1,
        source_content: Optional[str] = None,
    ) -> CodeContext:
        """
        Deeply inspects the vulnerable file and repository surrounding the finding.
        """
        clean_rel = file_path.lstrip("/").lstrip("\\")
        abs_path = os.path.join(self.root_path, clean_rel) if not os.path.isabs(clean_rel) else clean_rel

        content = source_content
        if not content and os.path.isfile(abs_path):
            try:
                with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            except Exception as e:
                logger.warning(f"Could not read file {abs_path}: {e}")

        content = content or ""
        lang = self.detect_language(file_path)
        framework = self.detect_framework(self.root_path, content, file_path)
        imports = self.extract_imports(content, lang)
        scope_info = self.extract_enclosing_scope(content, line_number or 1, lang)
        auth_middleware = self.discover_auth_middleware(self.root_path, content, lang)
        authz_patterns = self.discover_authorization_patterns(content, lang)
        related_tests = self.discover_related_tests(self.root_path, file_path)
        deps = self.extract_dependencies(self.root_path)
        repo_summary = self.summarize_repository_structure(self.root_path)

        lines = content.splitlines(keepends=True)
        target_idx = max(0, (line_number or 1) - 1)
        start_idx = max(0, target_idx - 25)
        end_idx = min(len(lines), target_idx + 25)
        surrounding_lines = lines[start_idx:end_idx]
        surrounding_code = "".join(surrounding_lines)

        return CodeContext(
            target_file=clean_rel,
            language=lang,
            framework=framework,
            surrounding_code=surrounding_code,
            function_name=scope_info.get("function_name"),
            class_name=scope_info.get("class_name"),
            enclosing_scope=scope_info.get("scope_code"),
            imports=imports,
            auth_middleware=auth_middleware,
            authorization_patterns=authz_patterns,
            related_tests=related_tests,
            dependencies=deps,
            repo_structure_summary=repo_summary,
        )

    def detect_language(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        mapping = {
            ".py": "python",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".js": "javascript",
            ".jsx": "javascript",
            ".go": "go",
            ".java": "java",
            ".rb": "ruby",
            ".php": "php",
            ".rs": "rust",
            ".cs": "csharp",
            ".tf": "terraform",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".json": "json",
            ".sql": "sql",
        }
        return mapping.get(ext, "unknown")

    def detect_framework(self, root_path: str, file_content: str, file_path: str) -> str:
        content_lower = file_content.lower()
        if "from fastapi import" in content_lower or "import fastapi" in content_lower:
            return "FastAPI (Python)"
        if "from flask import" in content_lower or "import flask" in content_lower:
            return "Flask (Python)"
        if "from django" in content_lower or "django.db" in content_lower:
            return "Django (Python)"
        if "express()" in content_lower or "from 'express'" in content_lower or 'require("express")' in content_lower:
            return "Express.js (Node.js)"
        if "next/server" in content_lower or "nextresponse" in content_lower or "nextapi" in content_lower:
            return "Next.js API Routes"
        if "@nestjs/" in content_lower:
            return "NestJS (TypeScript)"
        if "gin-gonic/gin" in content_lower or "github.com/gin" in content_lower:
            return "Gin (Go)"
        if "org.springframework" in content_lower or "@restcontroller" in content_lower:
            return "Spring Boot (Java)"

        # Check repository config files
        pkg_json = os.path.join(root_path, "package.json")
        if os.path.isfile(pkg_json):
            try:
                with open(pkg_json, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)
                    all_deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    if "next" in all_deps:
                        return "Next.js"
                    if "express" in all_deps:
                        return "Express.js"
                    if "@nestjs/core" in all_deps:
                        return "NestJS"
            except Exception:
                pass

        req_txt = os.path.join(root_path, "requirements.txt")
        if os.path.isfile(req_txt):
            try:
                with open(req_txt, "r", encoding="utf-8", errors="ignore") as f:
                    txt = f.read().lower()
                    if "fastapi" in txt:
                        return "FastAPI (Python)"
                    if "django" in txt:
                        return "Django (Python)"
                    if "flask" in txt:
                        return "Flask (Python)"
            except Exception:
                pass

        return "Generic Framework"

    def extract_imports(self, content: str, language: str) -> List[str]:
        imports = []
        if language == "python":
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("import ") or stripped.startswith("from "):
                    imports.append(stripped)
        elif language in ("typescript", "javascript"):
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("import ") or 'require(' in stripped:
                    imports.append(stripped)
        return imports[:30]

    def extract_enclosing_scope(self, content: str, line_num: int, language: str) -> Dict[str, Any]:
        """
        Uses AST for Python or line heuristics for TS/JS to locate the enclosing function and class.
        """
        if language == "python" and content:
            try:
                tree = ast.parse(content)
                target_func = None
                target_class = None
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                            if node.lineno <= line_num <= (node.end_lineno or node.lineno):
                                target_func = node
                    elif isinstance(node, ast.ClassDef):
                        if hasattr(node, "lineno") and hasattr(node, "end_lineno"):
                            if node.lineno <= line_num <= (node.end_lineno or node.lineno):
                                target_class = node

                lines = content.splitlines(keepends=True)
                scope_code = None
                if target_func:
                    s = max(0, target_func.lineno - 1)
                    e = min(len(lines), getattr(target_func, "end_lineno", target_func.lineno))
                    scope_code = "".join(lines[s:e])

                return {
                    "function_name": target_func.name if target_func else None,
                    "class_name": target_class.name if target_class else None,
                    "scope_code": scope_code,
                }
            except Exception:
                pass

        # Regex heuristic for TS/JS/Go
        lines = content.splitlines(keepends=True)
        func_name = None
        func_pattern = re.compile(r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(")
        for i in range(min(len(lines) - 1, line_num - 1), -1, -1):
            m = func_pattern.search(lines[i])
            if m:
                func_name = m.group(1) or m.group(2)
                break

        return {
            "function_name": func_name,
            "class_name": None,
            "scope_code": None,
        }

    def discover_auth_middleware(self, root_path: str, content: str, language: str) -> List[str]:
        detected = []
        patterns = [
            ("get_current_user", "FastAPI Depends(get_current_user)"),
            ("jwt.decode", "JSON Web Token (JWT) Verification"),
            ("passport.authenticate", "Passport.js Authentication Middleware"),
            ("verify_token", "Bearer Token Verification Guard"),
            ("require_auth", "RequireAuth Route Decorator/Middleware"),
            ("@login_required", "Django/Flask Login Required Gate"),
            ("authorization.bearer", "HTTP Authorization Header Parsing"),
            ("oauth2_scheme", "OAuth2 Password/Bearer Scheme"),
        ]
        lower = content.lower()
        for token, desc in patterns:
            if token in lower:
                detected.append(desc)

        return detected

    def discover_authorization_patterns(self, content: str, language: str) -> List[str]:
        patterns = []
        lower = content.lower()
        if "user_id" in lower and "owner_id" in lower:
            patterns.append("Resource ownership check (user_id == owner_id)")
        if "is_superuser" in lower or "is_admin" in lower:
            patterns.append("Privilege / Admin boundary check")
        if "role" in lower and "in [" in lower:
            patterns.append("Role-Based Access Control (RBAC)")
        if "tenant_id" in lower or "organization_id" in lower:
            patterns.append("Multi-tenant organization boundary check")
        if "403" in lower or "forbidden" in lower:
            patterns.append("HTTP 403 Forbidden enforcement")

        return patterns

    def discover_related_tests(self, root_path: str, file_path: str) -> List[str]:
        test_files = []
        base = os.path.splitext(os.path.basename(file_path))[0]
        cand_names = [f"test_{base}.py", f"{base}_test.py", f"{base}.spec.ts", f"{base}.test.ts", f"{base}.spec.js", f"{base}.test.js"]

        if os.path.isdir(root_path):
            for root, _, files in os.walk(root_path):
                if "node_modules" in root or ".git" in root or ".venv" in root:
                    continue
                for f in files:
                    if f in cand_names or (f.startswith("test_") and base in f):
                        rel = os.path.relpath(os.path.join(root, f), root_path)
                        test_files.append(rel.replace("\\", "/"))

        return test_files[:5]

    def extract_dependencies(self, root_path: str) -> Dict[str, str]:
        deps: Dict[str, str] = {}
        pkg_json = os.path.join(root_path, "package.json")
        if os.path.isfile(pkg_json):
            try:
                with open(pkg_json, "r", encoding="utf-8", errors="ignore") as f:
                    d = json.load(f)
                    for k, v in d.get("dependencies", {}).items():
                        deps[k] = str(v)
            except Exception:
                pass

        req_txt = os.path.join(root_path, "requirements.txt")
        if os.path.isfile(req_txt):
            try:
                with open(req_txt, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            parts = re.split(r"[=<>~]+", line)
                            if len(parts) >= 2:
                                deps[parts[0].strip()] = parts[1].strip()
                            elif parts:
                                deps[parts[0].strip()] = "*"
            except Exception:
                pass

        return dict(list(deps.items())[:20])

    def summarize_repository_structure(self, root_path: str) -> Dict[str, Any]:
        structure: Dict[str, Any] = {"directories": [], "total_source_files": 0}
        if not os.path.isdir(root_path):
            return structure

        count = 0
        top_dirs = set()
        for root, dirs, files in os.walk(root_path):
            if any(p in root for p in [".git", "node_modules", ".venv", "__pycache__", "dist", "build"]):
                continue
            rel = os.path.relpath(root, root_path)
            if rel != ".":
                parts = rel.split(os.sep)
                top_dirs.add(parts[0])
            for f in files:
                if f.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java")):
                    count += 1

        structure["directories"] = sorted(list(top_dirs))[:15]
        structure["total_source_files"] = count
        return structure

