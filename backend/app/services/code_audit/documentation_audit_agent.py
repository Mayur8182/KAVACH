import re
import ast
from typing import List, Dict, Any


class DocumentationAuditAgent:
    """
    Evaluates documentation quality: README completeness, environment variable
    documentation (.env.example), and public API docstring completeness.
    """

    def analyze(self, files: List[Any], symbols: List[Any] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        all_paths = [getattr(f, "relative_path", "").replace("\\", "/") for f in files]
        all_paths_lower = [p.lower() for p in all_paths]

        # 1. README completeness
        readme_path = None
        for p in all_paths:
            if p.lower().endswith("readme.md") and "/" not in p.strip("/"):
                readme_path = p
                break

        if not readme_path:
            findings.append({
                "category": "DOCUMENTATION",
                "rule_id": "KAV-DOC-001",
                "title": "Missing root README.md",
                "description": "The repository lacks a root README.md file documenting the project's purpose, setup, and architecture.",
                "severity": "MEDIUM",
                "priority": "P2",
                "confidence": "CONFIRMED",
                "file_path": "README.md",
                "start_line": 1,
                "end_line": 1,
                "code_evidence": "No README.md in root directory",
                "root_cause": "Omission of standard project onboarding documentation.",
                "technical_impact": "High onboarding friction for new developers, lack of clear architectural intent.",
                "recommended_solution": "Create a README.md detailing project architecture, prerequisites, and quickstart commands.",
                "estimated_remediation_minutes": 45,
                "related_files": [],
                "related_symbols": [],
                "detection_method": "HEURISTIC",
            })
        else:
            # Check length of readme
            for f in files:
                if getattr(f, "relative_path", "").replace("\\", "/") == readme_path:
                    content = getattr(f, "content", "")
                    words = len(content.split())
                    if words < 40:
                        findings.append({
                            "category": "DOCUMENTATION",
                            "rule_id": "KAV-DOC-002",
                            "title": f"Minimal README.md ({words} words)",
                            "description": f"The root README.md contains only {words} words. It lacks installation, environment setup, and architecture details.",
                            "severity": "LOW",
                            "priority": "P3",
                            "confidence": "CONFIRMED",
                            "file_path": readme_path,
                            "start_line": 1,
                            "end_line": len(content.splitlines()),
                            "code_evidence": content[:200],
                            "root_cause": "Stubbed README without complete developer documentation.",
                            "technical_impact": "Lack of onboarding instructions increases maintenance overhead.",
                            "recommended_solution": "Expand README with setup instructions, prerequisites, and deployment notes.",
                            "estimated_remediation_minutes": 30,
                            "related_files": [],
                            "related_symbols": [],
                            "detection_method": "HEURISTIC",
                        })

        # 2. Environment variable documentation: .env.example
        has_env_example = any("env.example" in p or "env.sample" in p for p in all_paths_lower)
        # Scan for env references in code
        uses_env_vars = False
        for f in files:
            content = getattr(f, "content", "")
            if "process.env." in content or "os.getenv(" in content or "os.environ" in content:
                uses_env_vars = True
                break

        if uses_env_vars and not has_env_example:
            findings.append({
                "category": "DOCUMENTATION",
                "rule_id": "KAV-DOC-003",
                "title": "Missing .env.example template",
                "description": "Codebase references environment variables, but no .env.example or .env.sample file exists in the repository.",
                "severity": "MEDIUM",
                "priority": "P2",
                "confidence": "CONFIRMED",
                "file_path": ".env.example",
                "start_line": 1,
                "end_line": 1,
                "code_evidence": "process.env / os.getenv references found across codebase, but no template file exists.",
                "root_cause": "Missing configuration template for external dependencies and keys.",
                "technical_impact": "Developers cannot reproduce local environment without trial-and-error crashes.",
                "recommended_solution": "Create .env.example documenting all required variable names and dummy values.",
                "estimated_remediation_minutes": 20,
                "related_files": [],
                "related_symbols": [],
                "detection_method": "HEURISTIC",
            })

        # 3. Public API Route Docstrings
        for f in files:
            path = getattr(f, "relative_path", "").replace("\\", "/")
            if "api" in path.lower() and path.endswith(".py"):
                content = getattr(f, "content", "")
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            # Check decorators for router methods
                            decorators = [
                                (d.attr if isinstance(d, ast.Attribute) else (
                                    d.func.attr if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) else ""
                                ))
                                for d in node.decorator_list
                            ]
                            if any(dec in ["get", "post", "put", "delete", "patch"] for dec in decorators):
                                doc = ast.get_docstring(node)
                                if not doc:
                                    findings.append({
                                        "category": "DOCUMENTATION",
                                        "rule_id": "KAV-DOC-004",
                                        "title": f"Undocumented API route '{node.name}'",
                                        "description": f"Endpoint function '{node.name}' in {path} lacks an OpenAPI docstring.",
                                        "severity": "LOW",
                                        "priority": "P3",
                                        "confidence": "CONFIRMED",
                                        "file_path": path,
                                        "start_line": node.lineno,
                                        "end_line": node.lineno,
                                        "code_evidence": f"def {node.name}(...)",
                                        "root_cause": "Missing docstring on public FastAPI endpoint.",
                                        "technical_impact": "Degrades auto-generated OpenAPI / Swagger documentation quality.",
                                        "recommended_solution": "Add comprehensive docstring with description, params, and response summary.",
                                        "estimated_remediation_minutes": 10,
                                        "related_files": [],
                                        "related_symbols": [node.name],
                                        "detection_method": "AST_ANALYSIS",
                                    })
                                    break  # cap at 1 per route file to avoid overwhelming output
                except Exception:
                    pass

        return findings

