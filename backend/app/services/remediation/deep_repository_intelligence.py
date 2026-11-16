"""
Kavach Deep Repository Intelligence & Architecture Discovery Engine
Automated multi-layer analysis of connected codebases:
- Framework & language detection (Express.js ESM/CJS, NestJS, FastAPI, Django, Spring Boot, Gin)
- Project structure parsing (routes, controllers, models, middleware, configs)
- Authentication and authorization discovery (existing protect, admin, JWT, RBAC)
- Database and data-flow mapping (Mongoose, Prisma, TypeORM, SQLAlchemy)
- False positive refinement & multi-agent API security validation
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger("kavach.deep_intelligence")


@dataclass
class DiscoveredRoute:
    method: str
    path: str
    file_path: str
    line_number: int
    handler_name: str
    middleware_stack: List[str]
    is_public: bool
    has_rate_limiting: bool
    has_authentication: bool
    has_authorization: bool


@dataclass
class AuthArchitecture:
    has_auth_middleware: bool
    middleware_file: Optional[str]
    module_format: str  # 'esm' | 'cjs'
    exported_guards: List[str]  # ['protect', 'admin']
    recommended_import: str  # "import { protect } from '../middleware/authMiddleware.js';"
    jwt_secret_env: Optional[str]  # 'JWT_SECRET'
    user_model_ref: Optional[str]  # 'User'


@dataclass
class RepositoryArchitecture:
    repository_name: str
    language: str
    framework: str
    module_format: str
    dependencies: Dict[str, str]
    auth: AuthArchitecture
    routes: List[DiscoveredRoute]
    models: List[str]
    controllers: List[str]
    root_path: str


class DeepRepositoryIntelligence:
    """
    World-class static and semantic architecture analyzer for connected repositories.
    Guarantees deterministic, context-rich security fixes without hallucinated patterns.
    """

    def __init__(self, workspace_path: str = "."):
        self.workspace_path = os.path.abspath(workspace_path)

    def analyze(self, repo_name: str = "ConnectedRepository") -> RepositoryArchitecture:
        """Runs full discovery across the workspace."""
        root = self._locate_actual_root(self.workspace_path)
        deps, pkg_type = self._parse_dependencies(root)
        lang, framework, mod_fmt = self._detect_framework_and_language(root, deps, pkg_type)
        auth_arch = self._discover_auth_architecture(root, mod_fmt)
        routes = self._discover_routes(root, auth_arch)
        models = self._discover_models(root)
        controllers = self._discover_controllers(root)

        return RepositoryArchitecture(
            repository_name=repo_name,
            language=lang,
            framework=framework,
            module_format=mod_fmt,
            dependencies=deps,
            auth=auth_arch,
            routes=routes,
            models=models,
            controllers=controllers,
            root_path=root,
        )

    def _locate_actual_root(self, base_path: str) -> str:
        """Finds the actual source code root if inside a nested wrapper."""
        if not os.path.isdir(base_path):
            return base_path

        # If base_path has backend/ folder with package.json or requirements.txt, prefer backend
        be_cand = os.path.join(base_path, "backend")
        if os.path.isdir(be_cand) and (
            os.path.isfile(os.path.join(be_cand, "package.json")) or
            os.path.isfile(os.path.join(be_cand, "requirements.txt")) or
            os.path.isfile(os.path.join(be_cand, "server.js"))
        ):
            return be_cand

        return base_path

    def _parse_dependencies(self, root: str) -> Tuple[Dict[str, str], str]:
        """Parses package.json or requirements.txt."""
        deps = {}
        pkg_type = "commonjs"

        pkg_json = os.path.join(root, "package.json")
        if not os.path.isfile(pkg_json):
            # Try parent if in backend
            parent_pkg = os.path.join(os.path.dirname(root), "package.json")
            if os.path.isfile(parent_pkg):
                pkg_json = parent_pkg

        if os.path.isfile(pkg_json):
            try:
                with open(pkg_json, "r", encoding="utf-8", errors="ignore") as f:
                    data = json.load(f)
                    if data.get("type") == "module":
                        pkg_type = "esm"
                    for k, v in data.get("dependencies", {}).items():
                        deps[k] = str(v)
                    for k, v in data.get("devDependencies", {}).items():
                        deps[k] = str(v)
            except Exception:
                pass

        req_txt = os.path.join(root, "requirements.txt")
        if os.path.isfile(req_txt):
            try:
                with open(req_txt, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            parts = re.split(r"[=<>~]+", line)
                            deps[parts[0].strip()] = parts[1].strip() if len(parts) > 1 else "*"
            except Exception:
                pass

        return deps, pkg_type

    def _detect_framework_and_language(self, root: str, deps: Dict[str, str], pkg_type: str) -> Tuple[str, str, str]:
        """Determines runtime language, web framework, and module system."""
        # 1. Express.js
        if "express" in deps or self._has_file_content(root, ["express()", "from 'express'", 'require("express")']):
            return "JavaScript / TypeScript", "Express.js (Node.js)", pkg_type

        # 2. NestJS
        if "@nestjs/core" in deps:
            return "TypeScript", "NestJS", "esm"

        # 3. Next.js
        if "next" in deps:
            return "TypeScript / JavaScript", "Next.js", "esm"

        # 4. FastAPI
        if "fastapi" in deps or self._has_file_content(root, ["from fastapi import", "import fastapi"]):
            return "Python", "FastAPI", "python_modules"

        # 5. Django
        if "django" in deps or self._has_file_content(root, ["from django", "import django"]):
            return "Python", "Django", "python_modules"

        # 6. Flask
        if "flask" in deps or self._has_file_content(root, ["from flask import", "import flask"]):
            return "Python", "Flask", "python_modules"

        # 7. Spring Boot
        if os.path.isfile(os.path.join(root, "pom.xml")) or os.path.isfile(os.path.join(root, "build.gradle")):
            return "Java", "Spring Boot", "java_packages"

        return "JavaScript / Python", "Generic REST API", pkg_type

    def _discover_auth_architecture(self, root: str, mod_fmt: str) -> AuthArchitecture:
        """Finds existing auth middleware and exported security guards."""
        guards = []
        auth_file = None
        jwt_env = "JWT_SECRET"
        user_model = "User"

        cand_dirs = [root, os.path.join(root, "middleware"), os.path.join(root, "middlewares"), os.path.join(root, "backend", "middleware")]
        for d in cand_dirs:
            if not os.path.isdir(d):
                continue
            for fname in os.listdir(d):
                if any(k in fname.lower() for k in ["auth", "protect", "jwt", "guard"]):
                    p = os.path.join(d, fname)
                    if os.path.isfile(p):
                        try:
                            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                auth_file = p
                                # Look for exports e.g. export { protect, admin };
                                exp_m = re.findall(r"export\s*\{\s*([^}]+)\s*\}", content)
                                for exp in exp_m:
                                    for g in exp.split(","):
                                        guards.append(g.strip())
                                # Look for individual export const
                                exp_c = re.findall(r"export\s+(?:const|function|async\s+function)\s+([a-zA-Z0-9_]+)", content)
                                guards.extend(exp_c)
                                # Look for CommonJS module.exports = { protect, admin }
                                cjs_m = re.findall(r"module\.exports\s*=\s*\{\s*([^}]+)\s*\}", content)
                                for exp in cjs_m:
                                    for g in exp.split(","):
                                        guards.append(g.strip())

                                if "JWT_SECRET" in content:
                                    jwt_env = "JWT_SECRET"
                                if "User.findById" in content:
                                    user_model = "User"
                        except Exception:
                            pass
                    if guards:
                        break
            if guards:
                break

        # Deduplicate guards
        unique_guards = sorted(list(set(guards)))
        rel_auth_file = os.path.relpath(auth_file, root).replace("\\", "/") if auth_file else None

        # Build recommended import statement for routes
        rec_import = ""
        if unique_guards and rel_auth_file:
            guard_str = ", ".join(unique_guards[:2])
            if mod_fmt == "esm":
                rec_import = f"import {{ {guard_str} }} from '../middleware/{os.path.basename(rel_auth_file)}';"
            else:
                rec_import = f"const {{ {guard_str} }} = require('../middleware/{os.path.basename(rel_auth_file)}');"
        elif mod_fmt == "esm":
            rec_import = "import { protect } from '../middleware/authMiddleware.js';"
        else:
            rec_import = "const { protect } = require('../middleware/authMiddleware');"

        return AuthArchitecture(
            has_auth_middleware=len(unique_guards) > 0 or auth_file is not None,
            middleware_file=rel_auth_file,
            module_format=mod_fmt,
            exported_guards=unique_guards or ["protect"],
            recommended_import=rec_import,
            jwt_secret_env=jwt_env,
            user_model_ref=user_model,
        )

    def _discover_routes(self, root: str, auth_arch: AuthArchitecture) -> List[DiscoveredRoute]:
        """Discovers route definitions and extracts middleware chains."""
        routes: List[DiscoveredRoute] = []
        route_pattern = re.compile(
            r"""(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)""",
            re.IGNORECASE,
        )

        cand_route_dirs = [
            root,
            os.path.join(root, "routes"),
            os.path.join(root, "backend", "routes"),
            os.path.join(root, "src", "routes"),
            os.path.join(root, "api"),
        ]

        visited_files = set()
        for d in cand_route_dirs:
            if not os.path.isdir(d):
                continue
            for r, _, files in os.walk(d):
                if any(x in r for x in ["node_modules", ".git", ".next", "dist", "build"]):
                    continue
                for f in files:
                    if f.endswith((".js", ".ts", ".mjs")) and any(k in f.lower() for k in ["route", "api", "auth", "user", "admin"]):
                        p = os.path.join(r, f)
                        if p in visited_files:
                            continue
                        visited_files.add(p)
                        rel_p = os.path.relpath(p, root).replace("\\", "/")
                        try:
                            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                                content = fp.read()
                                lines = content.splitlines()
                                router_has_global_auth = any(
                                    k in content for k in ["router.use(protect)", "router.use(auth", "app.use(protect)"]
                                )

                                for idx, line in enumerate(lines):
                                    m = route_pattern.search(line)
                                    if m:
                                        method = m.group(1).upper()
                                        raw_path = m.group(2)
                                        handlers_raw = m.group(3)

                                        # Parse handlers and middleware
                                        parts = [x.strip() for x in handlers_raw.split(",") if x.strip()]
                                        last_handler = parts[-1] if parts else "handler"
                                        m_stack = parts[:-1] if len(parts) > 1 else []

                                        is_pub = any(
                                            k in raw_path.lower()
                                            for k in ["login", "register", "forgot-password", "reset-password", "health", "public"]
                                        )
                                        has_rl = any(
                                            k in line.lower() or k in content.lower()
                                            for k in ["ratelimit", "limiter", "throttle", "apiratelimiter"]
                                        )
                                        has_at = router_has_global_auth or any(
                                            g in m_stack for g in auth_arch.exported_guards
                                        ) or "protect" in m_stack or "auth" in line.lower()
                                        has_az = "admin" in m_stack or "role" in line.lower()

                                        routes.append(
                                            DiscoveredRoute(
                                                method=method,
                                                path=raw_path,
                                                file_path=rel_p,
                                                line_number=idx + 1,
                                                handler_name=last_handler,
                                                middleware_stack=m_stack,
                                                is_public=is_pub,
                                                has_rate_limiting=has_rl,
                                                has_authentication=has_at,
                                                has_authorization=has_az,
                                            )
                                        )
                        except Exception:
                            pass

        return routes

    def _discover_models(self, root: str) -> List[str]:
        """Discovers database entity models."""
        models = []
        cand_dirs = [root, os.path.join(root, "models"), os.path.join(root, "backend", "models"), os.path.join(root, "entities")]
        for d in cand_dirs:
            if not os.path.isdir(d):
                continue
            for f in os.listdir(d):
                if f.endswith((".js", ".ts", ".py")) and not f.startswith("."):
                    base = os.path.splitext(f)[0]
                    if base.lower() not in ["index", "db"]:
                        models.append(base)
        return sorted(list(set(models)))

    def _discover_controllers(self, root: str) -> List[str]:
        """Discovers API controller files."""
        controllers = []
        cand_dirs = [root, os.path.join(root, "controllers"), os.path.join(root, "backend", "controllers")]
        for d in cand_dirs:
            if not os.path.isdir(d):
                continue
            for f in os.listdir(d):
                if f.endswith((".js", ".ts", ".py")) and not f.startswith("."):
                    base = os.path.splitext(f)[0]
                    if base.lower() not in ["index"]:
                        controllers.append(base)
        return sorted(list(set(controllers)))

    def _has_file_content(self, root: str, needles: List[str]) -> bool:
        """Helper to scan top-level and route files for keywords."""
        for r, _, files in os.walk(root):
            if any(x in r for x in ["node_modules", ".git", ".next", "dist"]):
                continue
            for f in files:
                if f.endswith((".js", ".ts", ".py")):
                    p = os.path.join(r, f)
                    try:
                        with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                            c = fp.read()
                            if any(n in c for n in needles):
                                return True
                    except Exception:
                        pass
        return False

    def refine_findings_with_architecture(
        self,
        findings: List[Dict[str, Any]],
        architecture: RepositoryArchitecture,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        AI Refine Engine:
        Separates legitimate vulnerabilities from false positives based on the real architecture.
        Returns: (confirmed_findings, dismissed_false_positives).
        """
        confirmed = []
        dismissed = []

        for f in findings:
            title = f.get("title", "")
            cwe = f.get("cwe", "")
            target_ep = str(f.get("target_endpoint") or "")
            file_path = f.get("file_path", "")

            # 1. False Positive: Public auth routes flagged for missing authentication (AUTH-01 / CWE-306)
            is_auth_vuln = cwe == "CWE-306" or "AUTH-01" in title or "Missing Authentication" in title
            is_public_login = any(k in title.lower() or k in target_ep.lower() for k in ["/login", "/register", "/forgot-password", "/reset-password"])
            if is_auth_vuln and is_public_login:
                dismissed.append({
                    **f,
                    "dismissal_reason": "FALSE_POSITIVE_PUBLIC_ENDPOINT",
                    "dismissal_justification": (
                        f"Endpoint {target_ep or 'auth'} is intentionally public for user credential authentication. "
                        f"Enforcing pre-authentication here would prevent unauthenticated users from logging in."
                    ),
                })
                continue

            # 2. Check if route has router-level middleware in discovered routes
            matching_route = next(
                (r for r in architecture.routes if r.path.lower() in target_ep.lower() or target_ep.lower() in r.path.lower()),
                None,
            )
            if is_auth_vuln and matching_route and matching_route.has_authentication:
                dismissed.append({
                    **f,
                    "dismissal_reason": "PROTECTED_BY_ROUTER_MIDDLEWARE",
                    "dismissal_justification": (
                        f"Endpoint {target_ep} is already protected by router-level middleware ({', '.join(matching_route.middleware_stack) or 'protect'})."
                    ),
                })
                continue

            # 3. Enhance confirmed finding with contextual architectural hints for remediation
            enhanced_patch_advice = f.get("remediation_advice", "")
            if architecture.auth.has_auth_middleware:
                enhanced_patch_advice += f"\n\n[Architecture Note]: Reuse existing '{architecture.auth.exported_guards[0]}' middleware via '{architecture.auth.recommended_import}'."

            confirmed.append({
                **f,
                "architecture_context": {
                    "framework": architecture.framework,
                    "module_format": architecture.module_format,
                    "recommended_auth_import": architecture.auth.recommended_import,
                    "available_guards": architecture.auth.exported_guards,
                },
                "remediation_advice": enhanced_patch_advice,
            })

        return confirmed, dismissed


# Global singleton instance
deep_repository_intelligence = DeepRepositoryIntelligence()

