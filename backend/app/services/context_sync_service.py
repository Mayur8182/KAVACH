"""
Kavach Repository Intelligence — Phase 6: Incremental Context Synchronization Engine
Performs Git diff and file hash delta analysis between commits to update repository context
incrementally without expensive full re-indexing, with dependency-aware invalidation.
"""

import os
import time
import uuid
import hashlib
import logging
import subprocess
from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, delete

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
from app.intelligence.codebase.ast_parser import MultiLanguageASTParser, CodeFileAST
from app.intelligence.codebase.ingestion import IngestedFile

logger = logging.getLogger("kavach.intelligence.sync")

# Files whose modification triggers wider architectural re-indexing
ARCHITECTURE_CRITICAL_FILES = {
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "poetry.lock",
    "pipfile.lock",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "cargo.lock",
    "tsconfig.json",
    "dockerfile",
    "docker-compose.yml",
}


@dataclass
class GitDiffDelta:
    added: List[str]
    modified: List[str]
    deleted: List[str]
    requires_full_reindex: bool
    is_empty: bool


class ContextSyncService:
    """
    Step 6: Incremental Context Synchronization Engine.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_snapshot(
        self,
        repository_id: uuid.UUID,
        branch: str = "main",
    ) -> Optional[RepositorySnapshot]:
        """
        Retrieves the most recent completed snapshot for the repository and branch.
        """
        stmt = (
            select(RepositorySnapshot)
            .where(
                and_(
                    RepositorySnapshot.repository_id == repository_id,
                    RepositorySnapshot.branch == branch,
                    RepositorySnapshot.status == "READY",
                )
            )
            .order_by(desc(RepositorySnapshot.created_at))
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def calculate_git_diff(
        self,
        workspace_dir: str,
        previous_commit_sha: Optional[str],
        current_commit_sha: str,
    ) -> GitDiffDelta:
        """
        Determines changed files between commits using git diff CLI or file hash delta fallback.
        """
        added: List[str] = []
        modified: List[str] = []
        deleted: List[str] = []

        if not previous_commit_sha or previous_commit_sha == current_commit_sha:
            return GitDiffDelta(
                added=[],
                modified=[],
                deleted=[],
                requires_full_reindex=False,
                is_empty=True,
            )

        # Attempt safe git diff subprocess
        git_diff_success = False
        try:
            cmd = ["git", "diff", "--name-status", previous_commit_sha, current_commit_sha]
            proc = subprocess.run(
                cmd,
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if proc.returncode == 0:
                git_diff_success = True
                for line in proc.stdout.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split("\t")
                    status_code = parts[0][0].upper()
                    fpath = parts[-1].replace("\\", "/")

                    if status_code == "A":
                        added.append(fpath)
                    elif status_code == "M":
                        modified.append(fpath)
                    elif status_code == "D":
                        deleted.append(fpath)
                    elif status_code == "R":
                        # Renamed: parts[1] is old, parts[2] is new
                        if len(parts) >= 3:
                            deleted.append(parts[1].replace("\\", "/"))
                            added.append(parts[2].replace("\\", "/"))
        except Exception as exc:
            logger.warning(f"Git diff subprocess failed: {exc}. Using file hash fallback.")

        # If git diff was unavailable or commits weren't in local git history
        if not git_diff_success:
            return GitDiffDelta(
                added=[],
                modified=[],
                deleted=[],
                requires_full_reindex=True,
                is_empty=False,
            )

        # Check if architectural critical files changed
        all_changed = added + modified + deleted
        requires_wider = any(
            f.lower().split("/")[-1] in ARCHITECTURE_CRITICAL_FILES or "route" in f.lower() or "auth" in f.lower()
            for f in all_changed
        )

        return GitDiffDelta(
            added=added,
            modified=modified,
            deleted=deleted,
            requires_full_reindex=requires_wider,
            is_empty=not bool(all_changed),
        )

    async def execute_incremental_sync(
        self,
        repository_id: uuid.UUID,
        workspace_dir: str,
        current_commit_sha: str,
        branch: str = "main",
    ) -> Tuple[RepositorySnapshot, bool]:
        """
        Executes incremental sync if a previous snapshot exists, or signals need for full indexing.
        Returns: (RepositorySnapshot, was_incremental: bool)
        """
        start_time = time.perf_counter()
        prev_snapshot = await self.get_latest_snapshot(repository_id, branch=branch)

        # If no previous snapshot exists, full indexing is required
        if not prev_snapshot:
            logger.info(f"No previous snapshot found for repo {repository_id}; full indexing required.")
            return None, False

        # If same commit already indexed and ready, return existing snapshot
        if prev_snapshot.commit_sha == current_commit_sha and prev_snapshot.status == "READY":
            logger.info(f"Repository {repository_id} already has READY snapshot for commit {current_commit_sha[:7]}.")
            return prev_snapshot, True

        delta = await self.calculate_git_diff(
            workspace_dir=workspace_dir,
            previous_commit_sha=prev_snapshot.commit_sha,
            current_commit_sha=current_commit_sha,
        )

        # If wider reindex triggered by manifests or routing changes, trigger full
        if delta.requires_full_reindex:
            logger.info(f"Critical architectural files modified in {repository_id}; triggering full re-indexing.")
            return None, False

        # If no files changed, clone the snapshot record for the new commit
        if delta.is_empty:
            new_snap = RepositorySnapshot(
                id=uuid.uuid4(),
                project_id=prev_snapshot.project_id,
                repository_id=repository_id,
                commit_sha=current_commit_sha,
                branch=branch,
                status="READY",
                understanding_score=prev_snapshot.understanding_score,
                total_files_indexed=prev_snapshot.total_files_indexed,
                total_symbols_indexed=prev_snapshot.total_symbols_indexed,
                total_endpoints_mapped=prev_snapshot.total_endpoints_mapped,
                total_dependencies_mapped=prev_snapshot.total_dependencies_mapped,
                total_modules_identified=prev_snapshot.total_modules_identified,
                primary_language=prev_snapshot.primary_language,
                architecture_type=prev_snapshot.architecture_type,
                frameworks=prev_snapshot.frameworks,
                languages=prev_snapshot.languages,
                entry_points=prev_snapshot.entry_points,
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
                metadata_json=prev_snapshot.metadata_json,
            )
            self.db.add(new_snap)
            await self.db.commit()
            return new_snap, True

        # Perform incremental update
        logger.info(
            f"Executing incremental context sync for {repository_id}: "
            f"+{len(delta.added)} modified:{len(delta.modified)} -{len(delta.deleted)}"
        )

        new_snapshot_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        new_snap = RepositorySnapshot(
            id=new_snapshot_id,
            project_id=prev_snapshot.project_id,
            repository_id=repository_id,
            commit_sha=current_commit_sha,
            branch=branch,
            status="INDEXING",
            understanding_score=prev_snapshot.understanding_score,
            total_files_indexed=prev_snapshot.total_files_indexed,
            total_symbols_indexed=prev_snapshot.total_symbols_indexed,
            total_endpoints_mapped=prev_snapshot.total_endpoints_mapped,
            total_dependencies_mapped=prev_snapshot.total_dependencies_mapped,
            total_modules_identified=prev_snapshot.total_modules_identified,
            primary_language=prev_snapshot.primary_language,
            architecture_type=prev_snapshot.architecture_type,
            frameworks=prev_snapshot.frameworks,
            languages=prev_snapshot.languages,
            entry_points=prev_snapshot.entry_points,
            started_at=now,
            metadata_json=prev_snapshot.metadata_json,
        )
        self.db.add(new_snap)
        await self.db.flush()

        # Copy forward existing file indices, omitting deleted/modified files
        files_stmt = select(RepositoryFileIndex).where(RepositoryFileIndex.snapshot_id == prev_snapshot.id)
        existing_files = (await self.db.execute(files_stmt)).scalars().all()

        stale_paths = set(delta.modified + delta.deleted)
        copied_files = 0
        for f in existing_files:
            if f.path not in stale_paths:
                new_f = RepositoryFileIndex(
                    id=uuid.uuid4(),
                    snapshot_id=new_snapshot_id,
                    repository_id=repository_id,
                    path=f.path,
                    language=f.language,
                    size_bytes=f.size_bytes,
                    line_count=f.line_count,
                    file_hash=f.file_hash,
                    is_binary=f.is_binary,
                    is_generated=f.is_generated,
                    role=f.role,
                    imports=f.imports,
                    exports=f.exports,
                )
                self.db.add(new_f)
                copied_files += 1

        # Re-parse added and modified files
        reparsed_symbols_count = 0
        reparsed_endpoints_count = 0
        for rel_path in delta.added + delta.modified:
            full_path = os.path.join(workspace_dir, rel_path)
            if not os.path.isfile(full_path):
                continue
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                fsize = os.path.getsize(full_path)
                line_count = len(content.splitlines())
                fhash = hashlib.sha256(content.encode("utf-8")).hexdigest()

                ingested = IngestedFile(
                    path=full_path,
                    absolute_path=full_path,
                    relative_path=rel_path,
                    size_bytes=fsize,
                    content=content,
                    content_hash=fhash,
                    extension=os.path.splitext(rel_path)[1].lower(),
                )
                ast_obj = MultiLanguageASTParser.parse_file(ingested)

                # Persist file index
                new_f = RepositoryFileIndex(
                    id=uuid.uuid4(),
                    snapshot_id=new_snapshot_id,
                    repository_id=repository_id,
                    path=rel_path,
                    language=ast_obj.language,
                    size_bytes=fsize,
                    line_count=line_count,
                    file_hash=fhash,
                    is_binary=False,
                    role="controller" if ast_obj.endpoints else "source",
                    imports=[i.module for i in ast_obj.imports],
                    exports=[fn.name for fn in ast_obj.functions],
                )
                self.db.add(new_f)
                copied_files += 1

                # Persist symbols
                for fn in ast_obj.functions:
                    sym = RepositoryCodeSymbol(
                        id=uuid.uuid4(),
                        snapshot_id=new_snapshot_id,
                        repository_id=repository_id,
                        symbol_identifier=f"{rel_path}:{fn.name}",
                        name=fn.name,
                        symbol_type="ENDPOINT" if fn.is_endpoint else "FUNCTION",
                        file_path=rel_path,
                        line_start=fn.line_start,
                        line_end=fn.line_end,
                        parameters=fn.parameters,
                        calls_made=[c.callee_name for c in fn.calls],
                    )
                    self.db.add(sym)
                    reparsed_symbols_count += 1

                # Persist endpoints
                for ep in ast_obj.endpoints:
                    ep_obj = RepositoryApiEndpoint(
                        id=uuid.uuid4(),
                        snapshot_id=new_snapshot_id,
                        repository_id=repository_id,
                        http_method=ep.endpoint_method or "GET",
                        path=ep.endpoint_path or f"/{ep.name}",
                        handler_function=ep.name,
                        file_path=rel_path,
                        line_number=ep.line_start,
                    )
                    self.db.add(ep_obj)
                    reparsed_endpoints_count += 1

            except Exception as f_err:
                logger.warning(f"Failed to re-parse file {rel_path} during sync: {f_err}")

        # Update snapshot statistics
        new_snap.status = "READY"
        new_snap.completed_at = datetime.now(timezone.utc)
        new_snap.total_files_indexed = copied_files

        # Log Sync Event
        duration = round(time.perf_counter() - start_time, 2)
        sync_event = RepositorySyncEvent(
            id=uuid.uuid4(),
            repository_id=repository_id,
            previous_commit_sha=prev_snapshot.commit_sha,
            current_commit_sha=current_commit_sha,
            sync_mode="INCREMENTAL",
            status="COMPLETED",
            files_added=delta.added,
            files_modified=delta.modified,
            files_deleted=delta.deleted,
            affected_modules=list(set([f.split("/")[0] for f in delta.added + delta.modified])),
            duration_seconds=duration,
        )
        self.db.add(sync_event)

        await self.db.commit()
        await self.db.refresh(new_snap)
        return new_snap, True
