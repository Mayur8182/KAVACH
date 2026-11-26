"""
Kavach Repository Intelligence — Master Orchestrator Service
Coordinates Repository Discovery, AST Analysis, Architecture Synthesis,
Incremental Synchronization, and Persistent Storage across PostgreSQL & MongoDB.
"""

import os
import time
import uuid
import hashlib
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from app.models.github import GitHubRepository
from app.models.repository_intelligence import (
    RepositorySnapshot,
    RepositoryFileIndex,
    RepositoryCodeSymbol,
    RepositoryApiEndpoint,
    RepositoryArchitectureMap,
    RepositoryDependencyRelation,
    RepositorySyncEvent,
)
from app.integrations.github.workspace import GitHubWorkspaceManager
from app.services.repository_discovery_service import RepositoryDiscoveryService
from app.services.architecture_analyzer_service import ArchitectureAnalyzerService
from app.services.context_sync_service import ContextSyncService
from app.services.context_builder_service import ContextBuilderService

from app.intelligence.codebase.ast_parser import MultiLanguageASTParser, CodeFileAST
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.ingestion import IngestedFile
from app.core.mongo import get_mongo_db

logger = logging.getLogger("kavach.intelligence.orchestrator")


class RepositoryIntelligenceService:
    """
    Master Service Orchestrating Codebase Intelligence & Context Persistence.
    """

    def __init__(self, db: AsyncSession, current_user: Optional[Any] = None):
        self.db = db
        self.current_user = current_user
        self.workspace_manager = GitHubWorkspaceManager()
        self.sync_service = ContextSyncService(db)
        self.context_builder = ContextBuilderService(db)

    async def get_repository_or_fail(self, repository_id: uuid.UUID) -> GitHubRepository:
        repo = await self.db.get(GitHubRepository, repository_id)
        if not repo:
            raise ValueError(f"Repository with ID {repository_id} not found")
        return repo

    async def index_repository(
        self,
        repository_id: uuid.UUID,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
        force_full: bool = False,
    ) -> RepositorySnapshot:
        """
        Executes complete discovery, indexing, architecture analysis, and persistence.
        Applies incremental synchronization when possible unless force_full is True.
        """
        repo = await self.get_repository_or_fail(repository_id)
        target_branch = branch or repo.default_branch or "main"
        target_commit = commit_sha or "HEAD"

        start_time = time.perf_counter()

        # Step 1: Prepare safe isolated workspace checkout
        workspace_path = await self.workspace_manager.prepare_workspace(
            job_id=uuid.uuid4(),
            clone_url=repo.clone_url,
            commit_sha=target_commit if target_commit != "HEAD" else None,
            branch=target_branch,
            repository_id=repo.id,
        )

        # Resolve exact commit sha from git if HEAD was passed
        if target_commit == "HEAD":
            try:
                import subprocess
                p = subprocess.run(["git", "rev-parse", "HEAD"], cwd=workspace_path, capture_output=True, text=True)
                if p.returncode == 0 and p.stdout.strip():
                    target_commit = p.stdout.strip()
            except Exception:
                target_commit = str(uuid.uuid4())[:8]

        # Step 2: Attempt Incremental Sync if not forced full
        if not force_full:
            snap, was_incremental = await self.sync_service.execute_incremental_sync(
                repository_id=repo.id,
                workspace_dir=workspace_path,
                current_commit_sha=target_commit,
                branch=target_branch,
            )
            if was_incremental and snap:
                logger.info(f"Incremental sync succeeded for repository {repo.full_name} at commit {target_commit[:7]}")
                return snap

        # Step 3: Full Indexing Pipeline
        logger.info(f"Starting FULL Repository Intelligence indexing for {repo.full_name} ({target_commit[:7]})")

        snapshot_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        snapshot = RepositorySnapshot(
            id=snapshot_id,
            project_id=repo.project_id,
            repository_id=repo.id,
            commit_sha=target_commit,
            branch=target_branch,
            status="INDEXING",
            started_at=now,
        )
        self.db.add(snapshot)
        await self.db.commit()

        try:
            # 3.1: Repository Discovery
            discovery_service = RepositoryDiscoveryService(workspace_path)
            discovery_res = discovery_service.discover(max_files=1000)

            # 3.2: AST Parsing & Symbol Indexing
            parsed_asts: List[CodeFileAST] = []
            symbol_index = SymbolIndex()

            for root, _, filenames in os.walk(workspace_path):
                if any(p in root for p in [".git", "node_modules", ".next", "dist", ".venv", "venv"]):
                    continue
                for fname in filenames:
                    fpath = os.path.join(root, fname)
                    rel_path = os.path.relpath(fpath, workspace_path).replace("\\", "/")
                    if discovery_service._is_ignored(rel_path):
                        continue

                    ext = os.path.splitext(fname)[1].lower()
                    if ext in (".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".java"):
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                            fsize = os.path.getsize(fpath)
                            fhash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                            ingested = IngestedFile(
                                path=fpath,
                                absolute_path=fpath,
                                relative_path=rel_path,
                                size_bytes=fsize,
                                content=content,
                                content_hash=fhash,
                                extension=ext,
                            )
                            ast_obj = MultiLanguageASTParser.parse_file(ingested)
                            parsed_asts.append(ast_obj)
                            symbol_index.index_ast(ast_obj)
                        except Exception as parse_err:
                            logger.warning(f"Error parsing file {rel_path}: {parse_err}")

            symbol_index.resolve_call_graph()

            # 3.3: Dependency Graph Construction
            dep_graph = DependencyGraphEngine(symbol_index)
            dep_graph.build_from_asts(parsed_asts)

            # 3.4: Architecture Understanding & Score
            arch_analyzer = ArchitectureAnalyzerService(
                discovery=discovery_res,
                file_asts=parsed_asts,
                symbol_index=symbol_index,
                dep_graph=dep_graph,
            )
            arch_result = arch_analyzer.analyze()

            # 3.5: Database Persistence in PostgreSQL
            # A. Update Snapshot
            snapshot.status = "READY"
            snapshot.understanding_score = arch_result.understanding_score
            snapshot.total_files_indexed = discovery_res.total_files
            snapshot.total_symbols_indexed = len(symbol_index.symbols)
            snapshot.total_endpoints_mapped = len(symbol_index.endpoints)
            snapshot.total_dependencies_mapped = len(dep_graph.external_dependencies)
            snapshot.total_modules_identified = len(arch_result.modules)
            snapshot.primary_language = discovery_res.primary_language
            snapshot.architecture_type = arch_result.architecture_style
            snapshot.frameworks = discovery_res.detected_frameworks
            snapshot.languages = discovery_res.languages
            snapshot.entry_points = discovery_res.entry_points
            snapshot.completed_at = datetime.now(timezone.utc)
            snapshot.metadata_json = {
                "total_source_files": discovery_res.total_source_files,
                "manifests": discovery_res.manifests,
                "package_managers": discovery_res.package_managers,
                "understanding_metrics": arch_result.understanding_metrics,
            }

            # B. Persist File Indices
            for ast_obj in parsed_asts:
                full_fpath = os.path.join(workspace_path, ast_obj.file_path)
                fsize = os.path.getsize(full_fpath) if os.path.isfile(full_fpath) else 0
                line_count = sum(1 for _ in open(full_fpath, "r", encoding="utf-8", errors="ignore")) if os.path.isfile(full_fpath) else 0
                fhash = hashlib.sha256(ast_obj.file_path.encode("utf-8")).hexdigest()

                f_rec = RepositoryFileIndex(
                    id=uuid.uuid4(),
                    snapshot_id=snapshot_id,
                    repository_id=repo.id,
                    path=ast_obj.file_path,
                    language=ast_obj.language,
                    size_bytes=fsize,
                    line_count=line_count,
                    file_hash=fhash,
                    is_binary=False,
                    role="controller" if ast_obj.endpoints else "source",
                    imports=[i.module for i in ast_obj.imports],
                    exports=[fn.name for fn in ast_obj.functions],
                )
                self.db.add(f_rec)

            # C. Persist Symbols
            for sym_id, sym in list(symbol_index.symbols.items())[:300]:
                sym_rec = RepositoryCodeSymbol(
                    id=uuid.uuid4(),
                    snapshot_id=snapshot_id,
                    repository_id=repo.id,
                    symbol_identifier=sym.id,
                    name=sym.name,
                    symbol_type=sym.symbol_type.value,
                    file_path=sym.file_path,
                    line_start=sym.line_start,
                    line_end=sym.line_end,
                    parameters=sym.parameters,
                    calls_made=sym.calls_made,
                    called_by=sym.called_by,
                )
                self.db.add(sym_rec)

            # D. Persist Endpoints
            for ep_id in symbol_index.endpoints:
                sym_ep = symbol_index.symbols.get(ep_id)
                if sym_ep:
                    ep_rec = RepositoryApiEndpoint(
                        id=uuid.uuid4(),
                        snapshot_id=snapshot_id,
                        repository_id=repo.id,
                        http_method=sym_ep.endpoint_method or "GET",
                        path=sym_ep.endpoint_path or f"/{sym_ep.name}",
                        handler_function=sym_ep.name,
                        file_path=sym_ep.file_path,
                        line_number=sym_ep.line_start,
                    )
                    self.db.add(ep_rec)

            # E. Persist Architecture Map
            arch_rec = RepositoryArchitectureMap(
                id=uuid.uuid4(),
                snapshot_id=snapshot_id,
                repository_id=repo.id,
                project_purpose=arch_result.project_purpose,
                architecture_style=arch_result.architecture_style,
                frontend_frameworks=arch_result.frontend_frameworks,
                backend_frameworks=arch_result.backend_frameworks,
                database_technologies=arch_result.database_technologies,
                orm_libraries=arch_result.orm_libraries,
                auth_mechanisms=arch_result.auth_mechanisms,
                external_integrations=arch_result.external_integrations,
                modules=[
                    {
                        "name": m.name,
                        "path": m.path,
                        "file_count": m.file_count,
                        "primary_language": m.primary_language,
                        "responsibilities": m.responsibilities,
                        "entry_files": m.entry_files,
                    }
                    for m in arch_result.modules
                ],
                data_flows=[],
                execution_entry_points=discovery_res.entry_points,
                understanding_metrics=arch_result.understanding_metrics,
            )
            self.db.add(arch_rec)

            # F. Persist External Dependencies
            for ext_pkg in dep_graph.external_dependencies:
                dep_rec = RepositoryDependencyRelation(
                    id=uuid.uuid4(),
                    snapshot_id=snapshot_id,
                    repository_id=repo.id,
                    source_module="repository",
                    target_module=ext_pkg,
                    relationship_type="DEPENDS_ON",
                    is_external=True,
                    file_path="package-manifest",
                    line_number=1,
                )
                self.db.add(dep_rec)

            # G. Record Sync Event
            duration = round(time.perf_counter() - start_time, 2)
            sync_event = RepositorySyncEvent(
                id=uuid.uuid4(),
                repository_id=repo.id,
                previous_commit_sha=None,
                current_commit_sha=target_commit,
                sync_mode="FULL",
                status="COMPLETED",
                files_added=[a.file_path for a in parsed_asts],
                files_modified=[],
                files_deleted=[],
                affected_modules=[m.name for m in arch_result.modules],
                duration_seconds=duration,
            )
            self.db.add(sync_event)

            # Commit relational transaction
            await self.db.commit()
            await self.db.refresh(snapshot)

            # 3.6: Optional MongoDB Cache Synchronization
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                try:
                    col = mongo_db["repository_intelligence_snapshots"]
                    doc = {
                        "_id": str(snapshot.id),
                        "repository_id": str(repo.id),
                        "project_id": str(repo.project_id) if repo.project_id else None,
                        "commit_sha": target_commit,
                        "branch": target_branch,
                        "understanding_score": snapshot.understanding_score,
                        "architecture": {
                            "style": arch_result.architecture_style,
                            "purpose": arch_result.project_purpose,
                            "frameworks": discovery_res.detected_frameworks,
                            "databases": arch_result.database_technologies,
                            "auth": arch_result.auth_mechanisms,
                            "modules": [m.name for m in arch_result.modules],
                            "entry_points": discovery_res.entry_points,
                        },
                        "total_files": discovery_res.total_files,
                        "total_symbols": len(symbol_index.symbols),
                        "total_endpoints": len(symbol_index.endpoints),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                    col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
                except Exception as m_err:
                    logger.warning(f"Could not sync snapshot into MongoDB: {m_err}")

            return snapshot

        except Exception as exc:
            logger.error(f"Full repository indexing failed: {exc}", exc_info=True)
            snapshot.status = "FAILED"
            snapshot.error_message = str(exc)
            await self.db.commit()
            raise

    async def get_repository_context(
        self,
        repository_id: uuid.UUID,
        commit_sha: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns structured high-level context matching Section 2 of requirements:
        {
          "project": "...",
          "understanding_score": 94,
          "languages": [...],
          "frameworks": [...],
          "database": [...],
          "architecture": "Frontend + Backend",
          "modules": [...],
          "entryPoints": [...]
        }
        """
        repo = await self.get_repository_or_fail(repository_id)

        # Resolve latest ready snapshot
        stmt = (
            select(RepositorySnapshot)
            .where(
                and_(
                    RepositorySnapshot.repository_id == repo.id,
                    RepositorySnapshot.status == "READY",
                )
            )
            .order_by(desc(RepositorySnapshot.created_at))
            .limit(1)
        )
        snap = (await self.db.execute(stmt)).scalar_one_or_none()

        if not snap:
            return {
                "repository_id": str(repo.id),
                "repository_name": repo.full_name or repo.name,
                "status": "NOT_INDEXED",
                "understanding_score": 0,
                "message": "Repository has not been indexed yet. Trigger indexing to build codebase context.",
                "languages": [],
                "frameworks": [],
                "database": [],
                "architecture": "Unknown",
                "modules": [],
                "entryPoints": [],
            }

        # Fetch architecture map
        arch_stmt = select(RepositoryArchitectureMap).where(RepositoryArchitectureMap.snapshot_id == snap.id)
        arch = (await self.db.execute(arch_stmt)).scalar_one_or_none()

        modules_list = [m.get("name") for m in (arch.modules or [])] if arch and arch.modules else []

        return {
            "repository_id": str(repo.id),
            "repository_name": repo.full_name or repo.name,
            "status": snap.status,
            "commit_sha": snap.commit_sha,
            "branch": snap.branch,
            "understanding_score": snap.understanding_score,
            "project": arch.project_purpose if arch else "Application codebase",
            "languages": list(snap.languages.keys()) if isinstance(snap.languages, dict) else [snap.primary_language],
            "frameworks": snap.frameworks or [],
            "database": arch.database_technologies if arch else [],
            "orm_libraries": arch.orm_libraries if arch else [],
            "auth_mechanisms": arch.auth_mechanisms if arch else [],
            "external_integrations": arch.external_integrations if arch else [],
            "architecture": snap.architecture_type,
            "modules": modules_list,
            "entryPoints": snap.entry_points or [],
            "total_files_indexed": snap.total_files_indexed,
            "total_symbols_indexed": snap.total_symbols_indexed,
            "total_endpoints_mapped": snap.total_endpoints_mapped,
            "total_dependencies_mapped": snap.total_dependencies_mapped,
            "total_modules_identified": snap.total_modules_identified,
            "metrics": arch.understanding_metrics if arch else {},
            "last_indexed_at": snap.completed_at.isoformat() if snap.completed_at else None,
        }

    async def get_repository_architecture(self, repository_id: uuid.UUID) -> Dict[str, Any]:
        """Returns deep architecture details, modules, and data flow maps."""
        repo = await self.get_repository_or_fail(repository_id)
        stmt = (
            select(RepositoryArchitectureMap)
            .join(RepositorySnapshot, RepositorySnapshot.id == RepositoryArchitectureMap.snapshot_id)
            .where(RepositorySnapshot.repository_id == repo.id)
            .order_by(desc(RepositoryArchitectureMap.created_at))
            .limit(1)
        )
        arch = (await self.db.execute(stmt)).scalar_one_or_none()
        if not arch:
            return {"architecture": None, "status": "NOT_INDEXED"}

        return {
            "project_purpose": arch.project_purpose,
            "architecture_style": arch.architecture_style,
            "frontend_frameworks": arch.frontend_frameworks,
            "backend_frameworks": arch.backend_frameworks,
            "database_technologies": arch.database_technologies,
            "orm_libraries": arch.orm_libraries,
            "auth_mechanisms": arch.auth_mechanisms,
            "external_integrations": arch.external_integrations,
            "modules": arch.modules,
            "execution_entry_points": arch.execution_entry_points,
            "understanding_metrics": arch.understanding_metrics,
        }

    async def get_repository_dependencies(self, repository_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Returns internal module relations and external package dependencies."""
        repo = await self.get_repository_or_fail(repository_id)
        stmt = (
            select(RepositoryDependencyRelation)
            .where(RepositoryDependencyRelation.repository_id == repo.id)
            .order_by(RepositoryDependencyRelation.target_module)
            .limit(150)
        )
        deps = (await self.db.execute(stmt)).scalars().all()
        return [
            {
                "source": d.source_module,
                "target": d.target_module,
                "type": d.relationship_type,
                "is_external": d.is_external,
                "file_path": d.file_path,
            }
            for d in deps
        ]

    async def get_sync_status(self, repository_id: uuid.UUID) -> Dict[str, Any]:
        """Returns synchronization freshness, latest events, and commit tracking."""
        repo = await self.get_repository_or_fail(repository_id)
        snap = await self.sync_service.get_latest_snapshot(repo.id, branch=repo.default_branch or "main")

        events_stmt = (
            select(RepositorySyncEvent)
            .where(RepositorySyncEvent.repository_id == repo.id)
            .order_by(desc(RepositorySyncEvent.created_at))
            .limit(5)
        )
        events = (await self.db.execute(events_stmt)).scalars().all()

        return {
            "repository_id": str(repo.id),
            "repository_name": repo.full_name or repo.name,
            "has_snapshot": snap is not None,
            "status": snap.status if snap else "NOT_INDEXED",
            "last_commit_sha": snap.commit_sha if snap else None,
            "understanding_score": snap.understanding_score if snap else 0,
            "last_synced_at": snap.completed_at.isoformat() if snap and snap.completed_at else None,
            "recent_sync_events": [
                {
                    "mode": e.sync_mode,
                    "status": e.status,
                    "commit_sha": e.current_commit_sha[:7],
                    "added": len(e.files_added or []),
                    "modified": len(e.files_modified or []),
                    "deleted": len(e.files_deleted or []),
                    "duration_seconds": e.duration_seconds,
                    "created_at": e.created_at.isoformat(),
                }
                for e in events
            ],
        }
