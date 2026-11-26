"""
Kavach Repository Intelligence — Phase 4: Architecture Analyzer Service
Synthesizes AST symbols, directory hierarchies, dependency graphs, and manifests
into an authoritative repository architecture map and evidence-based understanding score.
"""

import os
import re
import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

from app.services.repository_discovery_service import RepositoryDiscoveryResult
from app.intelligence.codebase.ast_parser import CodeFileAST
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine

logger = logging.getLogger("kavach.intelligence.architecture")

# Database markers in symbols, calls, or imports
DATABASE_MARKERS = {
    "sqlalchemy": ("PostgreSQL / Relational DB", "SQLAlchemy ORM"),
    "asyncpg": ("PostgreSQL", "AsyncPG Driver"),
    "psycopg2": ("PostgreSQL", "Psycopg2 Driver"),
    "mysql": ("MySQL", "MySQL Connector"),
    "sqlite": ("SQLite", "SQLite Engine"),
    "aiosqlite": ("SQLite", "Async SQLite"),
    "pymongo": ("MongoDB", "PyMongo Driver"),
    "motor": ("MongoDB", "Async Motor Driver"),
    "mongoose": ("MongoDB", "Mongoose ODM"),
    "prisma": ("PostgreSQL / MySQL", "Prisma ORM"),
    "typeorm": ("Relational DB", "TypeORM"),
    "redis": ("Redis", "Redis In-Memory Store"),
    "dynamodb": ("AWS DynamoDB", "Boto3 DynamoDB"),
}

# Authentication & authorization markers
AUTH_MARKERS = {
    "jwt": "JSON Web Token (JWT)",
    "pyjwt": "PyJWT Verification",
    "argon2": "Argon2 Password Hashing",
    "bcrypt": "Bcrypt Password Hashing",
    "passlib": "Passlib Cryptographic Suite",
    "oauth": "OAuth2 / OIDC",
    "next-auth": "NextAuth.js Authentication",
    "passport": "Passport.js Authentication",
    "get_current_user": "FastAPI Dependency Authentication",
    "auth_required": "Route-level Authentication Gate",
}

# External API & Cloud integration markers
EXTERNAL_INTEGRATIONS = {
    "stripe": "Stripe Payments API",
    "boto3": "AWS Cloud SDK",
    "openai": "OpenAI API",
    "google.generativeai": "Google Gemini AI",
    "sendgrid": "SendGrid Email API",
    "slack": "Slack Webhooks / API",
    "github": "GitHub REST / GraphQL API",
    "twilio": "Twilio SMS / Communications",
    "resend": "Resend Email Platform",
}


@dataclass
class DiscoveredModule:
    name: str
    path: str
    file_count: int
    primary_language: str
    responsibilities: List[str]
    entry_files: List[str]
    dependencies: List[str] = field(default_factory=list)


@dataclass
class ArchitectureAnalysisResult:
    project_purpose: str
    architecture_style: str
    frontend_frameworks: List[str]
    backend_frameworks: List[str]
    database_technologies: List[str]
    orm_libraries: List[str]
    auth_mechanisms: List[str]
    external_integrations: List[str]
    modules: List[DiscoveredModule]
    api_endpoints_count: int
    total_symbols_count: int
    data_flows_count: int
    understanding_score: int
    understanding_metrics: Dict[str, Any]


class ArchitectureAnalyzerService:
    """
    Step 4: Repository Architecture Understanding Engine.
    """

    def __init__(
        self,
        discovery: RepositoryDiscoveryResult,
        file_asts: List[CodeFileAST],
        symbol_index: SymbolIndex,
        dep_graph: DependencyGraphEngine,
    ):
        self.discovery = discovery
        self.file_asts = file_asts
        self.symbol_index = symbol_index
        self.dep_graph = dep_graph

    def analyze(self) -> ArchitectureAnalysisResult:
        """
        Executes deep architecture analysis across all discovered codebase artifacts.
        """
        # 1. Classify Architecture Style
        arch_style = self._determine_architecture_style()

        # 2. Extract Frontend & Backend Frameworks
        frontend_fws, backend_fws = self._classify_frameworks()

        # 3. Detect Database & ORM Technologies
        db_techs, orm_libs = self._detect_databases_and_orms()

        # 4. Detect Authentication Mechanisms
        auth_mechs = self._detect_auth_mechanisms()

        # 5. Detect External Integrations
        ext_integrations = self._detect_external_integrations()

        # 6. Group Codebase into Functional Modules
        modules = self._discover_functional_modules()

        # 7. Trace Sinks and High-Level Data Flows
        flow_count = len(self.dep_graph.trace_dataflow_to_sinks("execute")) if hasattr(self.dep_graph, "trace_dataflow_to_sinks") else 0

        # 8. Calculate Evidence-Based Codebase Understanding Score (0-100%)
        score, metrics = self._calculate_understanding_score(
            arch_style=arch_style,
            frontend_fws=frontend_fws,
            backend_fws=backend_fws,
            db_techs=db_techs,
            auth_mechs=auth_mechs,
            modules=modules,
        )

        return ArchitectureAnalysisResult(
            project_purpose=self.discovery.readme_purpose,
            architecture_style=arch_style,
            frontend_frameworks=frontend_fws,
            backend_frameworks=backend_fws,
            database_technologies=db_techs,
            orm_libraries=orm_libs,
            auth_mechanisms=auth_mechs,
            external_integrations=ext_integrations,
            modules=modules,
            api_endpoints_count=len(self.symbol_index.endpoints),
            total_symbols_count=len(self.symbol_index.symbols),
            data_flows_count=flow_count,
            understanding_score=score,
            understanding_metrics=metrics,
        )

    def _determine_architecture_style(self) -> str:
        has_frontend = bool(self.discovery.frontend_directories) or any(
            fw in ("Next.js", "React", "Vue.js", "TailwindCSS") for fw in self.discovery.detected_frameworks
        )
        has_backend = bool(self.discovery.backend_directories) or any(
            fw in ("FastAPI", "Express", "NestJS", "Django", "Flask") for fw in self.discovery.detected_frameworks
        )

        if has_frontend and has_backend:
            return "Frontend + Backend (Monorepo)"
        elif has_frontend and not has_backend:
            return "Frontend SPA / Full-Stack SSR"
        elif has_backend and not has_frontend:
            return "Backend API Service"
        elif "CLI" in self.discovery.root_path or any("cli" in f.lower() for f in self.discovery.entry_points):
            return "Command-Line Application (CLI)"
        else:
            return "Modular Application Service"

    def _classify_frameworks(self) -> (List[str], List[str]):
        frontend_candidates = {"Next.js", "React", "Vue.js", "TailwindCSS", "Svelte", "Angular", "Vite"}
        backend_candidates = {"FastAPI", "Express", "NestJS", "Flask", "Django", "Spring Boot", "Gin"}

        all_detected = set(self.discovery.detected_frameworks)
        front = sorted(list(all_detected.intersection(frontend_candidates)))
        back = sorted(list(all_detected.intersection(backend_candidates)))
        return front, back

    def _detect_databases_and_orms(self) -> (List[str], List[str]):
        dbs: Set[str] = set()
        orms: Set[str] = set()

        # Check imports across ASTs
        for ast_obj in self.file_asts:
            for imp in ast_obj.imports:
                mod_lower = imp.module.lower()
                for key, (db_name, orm_name) in DATABASE_MARKERS.items():
                    if key in mod_lower:
                        dbs.add(db_name)
                        orms.add(orm_name)

            # Check database models declared in AST
            if ast_obj.database_models:
                orms.add("Declarative ORM Models")

        return sorted(list(dbs)), sorted(list(orms))

    def _detect_auth_mechanisms(self) -> List[str]:
        auth_set: Set[str] = set()

        for ast_obj in self.file_asts:
            for imp in ast_obj.imports:
                mod_lower = imp.module.lower()
                for key, label in AUTH_MARKERS.items():
                    if key in mod_lower:
                        auth_set.add(label)

            if ast_obj.is_auth_related:
                for fn in ast_obj.functions:
                    fn_low = fn.name.lower()
                    if "jwt" in fn_low or "token" in fn_low:
                        auth_set.add("Token-based Session / JWT")
                    if "password" in fn_low or "hash" in fn_low:
                        auth_set.add("Cryptographic Password Hashing")
                    if "oauth" in fn_low or "google" in fn_low or "github" in fn_low:
                        auth_set.add("OAuth2 Third-Party Authentication")

        return sorted(list(auth_set))

    def _detect_external_integrations(self) -> List[str]:
        integrations: Set[str] = set()
        for ast_obj in self.file_asts:
            for imp in ast_obj.imports:
                mod_lower = imp.module.lower()
                for key, label in EXTERNAL_INTEGRATIONS.items():
                    if key in mod_lower:
                        integrations.add(label)
        return sorted(list(integrations))

    def _discover_functional_modules(self) -> List[DiscoveredModule]:
        """
        Groups source files by directory namespaces to map functional responsibilities.
        """
        module_groups: Dict[str, List[CodeFileAST]] = {}

        for ast_obj in self.file_asts:
            parts = ast_obj.file_path.replace("\\", "/").split("/")
            if len(parts) > 1:
                # e.g. "backend/app/services" -> "services" or "frontend/components" -> "components"
                mod_name = parts[1] if parts[0] in ("backend", "frontend", "src", "app") and len(parts) > 2 else parts[0]
            else:
                mod_name = "root"

            if mod_name not in module_groups:
                module_groups[mod_name] = []
            module_groups[mod_name].append(ast_obj)

        modules: List[DiscoveredModule] = []
        for name, asts in module_groups.items():
            if name in (".git", "node_modules", ".next"):
                continue

            langs = [a.language for a in asts]
            prim_lang = max(set(langs), key=langs.count) if langs else "Unknown"

            # Infer responsibilities
            responsibilities = []
            if any(a.endpoints for a in asts):
                responsibilities.append("HTTP API Routing & Controllers")
            if any(a.database_models for a in asts):
                responsibilities.append("Database Models & Persistence")
            if any(a.is_auth_related for a in asts):
                responsibilities.append("Authentication & Identity Management")
            if any(a.is_middleware for a in asts):
                responsibilities.append("Request Pipeline Middleware")
            if not responsibilities:
                responsibilities.append("Business Logic & Processing")

            entry_files = [a.file_path for a in asts if any(e in a.file_path for e in ("main.py", "index.ts", "server.js", "router.py", "route.ts"))]

            modules.append(DiscoveredModule(
                name=name,
                path=asts[0].file_path.split("/")[0] if asts else name,
                file_count=len(asts),
                primary_language=prim_lang,
                responsibilities=responsibilities,
                entry_files=entry_files[:3],
                dependencies=[],
            ))

        return sorted(modules, key=lambda m: m.file_count, reverse=True)

    def _calculate_understanding_score(
        self,
        arch_style: str,
        frontend_fws: List[str],
        backend_fws: List[str],
        db_techs: List[str],
        auth_mechs: List[str],
        modules: List[DiscoveredModule],
    ) -> (int, Dict[str, Any]):
        """
        Calculates an evidence-based Codebase Understanding Score (0-100%).
        Rule: NO ARBITRARY STATIC NUMBERS. Each component provides audited points.
        """
        metrics: Dict[str, Any] = {}

        # 1. File & Ingestion Coverage (Max 25 pts)
        total_files = max(1, self.discovery.total_files)
        source_files = self.discovery.total_source_files
        parsed_files = len(self.file_asts)
        ingestion_ratio = min(1.0, parsed_files / max(1, source_files))
        file_pts = round(ingestion_ratio * 25)
        metrics["file_indexing_score"] = file_pts
        metrics["parsed_files"] = parsed_files
        metrics["source_files"] = source_files

        # 2. AST & Symbol Graph Coverage (Max 25 pts)
        symbol_count = len(self.symbol_index.symbols)
        if symbol_count > 100:
            ast_pts = 25
        elif symbol_count > 20:
            ast_pts = 18
        elif symbol_count > 0:
            ast_pts = 10
        else:
            ast_pts = 0
        metrics["symbol_graph_score"] = ast_pts
        metrics["symbols_identified"] = symbol_count

        # 3. Architecture & Module Structure (Max 20 pts)
        arch_pts = 0
        if arch_style != "Modular Application Service":
            arch_pts += 10
        if frontend_fws or backend_fws:
            arch_pts += 5
        if len(modules) >= 2:
            arch_pts += 5
        metrics["architecture_structure_score"] = arch_pts
        metrics["modules_identified"] = len(modules)

        # 4. API & Route Inventory (Max 15 pts)
        endpoint_count = len(self.symbol_index.endpoints)
        if endpoint_count > 20:
            api_pts = 15
        elif endpoint_count > 5:
            api_pts = 10
        elif endpoint_count > 0:
            api_pts = 5
        else:
            api_pts = 0
        metrics["api_inventory_score"] = api_pts
        metrics["endpoints_mapped"] = endpoint_count

        # 5. Database & Security Auth Mapping (Max 15 pts)
        sec_pts = 0
        if db_techs:
            sec_pts += 8
        if auth_mechs:
            sec_pts += 7
        metrics["db_and_auth_score"] = sec_pts
        metrics["databases_mapped"] = len(db_techs)
        metrics["auth_mechanisms_mapped"] = len(auth_mechs)

        total_score = min(100, file_pts + ast_pts + arch_pts + api_pts + sec_pts)
        metrics["total_score"] = total_score
        return total_score, metrics

