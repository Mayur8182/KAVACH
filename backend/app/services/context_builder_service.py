"""
Kavach Repository Intelligence — Phase 7 & 8: Context Builder Service
Constructs tailored architectural and cross-file dataflow context packages for
SAST, SCA, Secrets, IaC, Investigation, and AI Remediation agents.
"""

import os
import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.repository_intelligence import (
    RepositorySnapshot,
    RepositoryArchitectureMap,
    RepositoryApiEndpoint,
    RepositoryCodeSymbol,
    RepositoryDependencyRelation,
    RepositoryFileIndex,
)

logger = logging.getLogger("kavach.intelligence.context_builder")


class ContextBuilderService:
    """
    Step 7 & 8: Context Packaging & Cross-File Resolution for AI Agents.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_agent_context_package(
        self,
        snapshot_id: uuid.UUID,
        agent_type: str,
        target_file_path: Optional[str] = None,
        max_symbols: int = 50,
    ) -> Dict[str, Any]:
        """
        Builds targeted context package scoped to the requested agent type.
        """
        # 1. Fetch snapshot & architecture map
        snap = await self.db.get(RepositorySnapshot, snapshot_id)
        if not snap:
            return {"error": "Snapshot not found"}

        arch_stmt = select(RepositoryArchitectureMap).where(RepositoryArchitectureMap.snapshot_id == snapshot_id)
        arch = (await self.db.execute(arch_stmt)).scalar_one_or_none()

        context_pkg: Dict[str, Any] = {
            "snapshot_id": str(snap.id),
            "commit_sha": snap.commit_sha,
            "branch": snap.branch,
            "understanding_score": snap.understanding_score,
            "project_purpose": arch.project_purpose if arch else "Application codebase",
            "architecture_style": snap.architecture_type,
            "primary_language": snap.primary_language,
            "frameworks": snap.frameworks,
            "languages": snap.languages,
            "entry_points": snap.entry_points,
            "agent_type": agent_type,
        }

        # 2. Add Architecture Details
        if arch:
            context_pkg["database_technologies"] = arch.database_technologies
            context_pkg["orm_libraries"] = arch.orm_libraries
            context_pkg["auth_mechanisms"] = arch.auth_mechanisms
            context_pkg["external_integrations"] = arch.external_integrations
            context_pkg["modules"] = arch.modules

        # 3. Agent-Specific Context Specialization
        if agent_type.upper() == "SAST":
            # Include API endpoints, controllers, and relevant symbols
            ep_stmt = select(RepositoryApiEndpoint).where(RepositoryApiEndpoint.snapshot_id == snapshot_id).limit(30)
            eps = (await self.db.execute(ep_stmt)).scalars().all()
            context_pkg["api_endpoints"] = [
                {
                    "method": ep.http_method,
                    "path": ep.path,
                    "handler": ep.handler_function,
                    "file_path": ep.file_path,
                    "line": ep.line_number,
                }
                for ep in eps
            ]

            # If target file specified, pull related callers & callees
            if target_file_path:
                sym_stmt = select(RepositoryCodeSymbol).where(
                    and_(
                        RepositoryCodeSymbol.snapshot_id == snapshot_id,
                        RepositoryCodeSymbol.file_path == target_file_path,
                    )
                ).limit(max_symbols)
                syms = (await self.db.execute(sym_stmt)).scalars().all()
                context_pkg["scoped_symbols"] = [
                    {
                        "name": s.name,
                        "type": s.symbol_type,
                        "line_start": s.line_start,
                        "line_end": s.line_end,
                        "calls_made": s.calls_made,
                        "called_by": s.called_by,
                    }
                    for s in syms
                ]

        elif agent_type.upper() == "SCA":
            # Include dependency relations and package manifests
            dep_stmt = select(RepositoryDependencyRelation).where(
                and_(
                    RepositoryDependencyRelation.snapshot_id == snapshot_id,
                    RepositoryDependencyRelation.is_external == True,
                )
            ).limit(100)
            deps = (await self.db.execute(dep_stmt)).scalars().all()
            context_pkg["external_dependencies"] = [
                {
                    "target": d.target_module,
                    "imported_by": d.source_module,
                    "file_path": d.file_path,
                }
                for d in deps
            ]

        elif agent_type.upper() == "SECRETS":
            # Include configuration files, env references, and repo privacy
            context_pkg["environment_classification"] = "Development / Staging / Production"
            f_stmt = select(RepositoryFileIndex).where(
                and_(
                    RepositoryFileIndex.snapshot_id == snapshot_id,
                    RepositoryFileIndex.role == "config",
                )
            ).limit(20)
            configs = (await self.db.execute(f_stmt)).scalars().all()
            context_pkg["config_files"] = [c.path for c in configs]

        elif agent_type.upper() in ("REMEDIATION", "INVESTIGATION"):
            # Include detailed architectural guidelines and surrounding context
            if target_file_path:
                f_stmt = select(RepositoryFileIndex).where(
                    and_(
                        RepositoryFileIndex.snapshot_id == snapshot_id,
                        RepositoryFileIndex.path == target_file_path,
                    )
                ).limit(1)
                f_obj = (await self.db.execute(f_stmt)).scalar_one_or_none()
                if f_obj:
                    context_pkg["target_file_metadata"] = {
                        "path": f_obj.path,
                        "language": f_obj.language,
                        "role": f_obj.role,
                        "imports": f_obj.imports,
                        "exports": f_obj.exports,
                    }

        return context_pkg

    async def build_cross_file_flow_evidence(
        self,
        snapshot_id: uuid.UUID,
        entry_file_path: str,
        sink_call_name: str = "execute",
    ) -> List[Dict[str, Any]]:
        """
        Traces cross-file dataflow: Entry Route -> Intermediate Service -> Database Sink.
        """
        # Lookup endpoint
        ep_stmt = select(RepositoryApiEndpoint).where(
            and_(
                RepositoryApiEndpoint.snapshot_id == snapshot_id,
                RepositoryApiEndpoint.file_path == entry_file_path,
            )
        ).limit(1)
        ep = (await self.db.execute(ep_stmt)).scalar_one_or_none()

        # Lookup symbols in that file
        sym_stmt = select(RepositoryCodeSymbol).where(
            and_(
                RepositoryCodeSymbol.snapshot_id == snapshot_id,
                RepositoryCodeSymbol.file_path == entry_file_path,
            )
        )
        symbols = (await self.db.execute(sym_stmt)).scalars().all()

        flow_steps: List[Dict[str, Any]] = []

        if ep:
            flow_steps.append({
                "step": 1,
                "role": "INPUT_SOURCE",
                "description": f"HTTP {ep.http_method} endpoint '{ep.path}' accepts untrusted user input",
                "file_path": ep.file_path,
                "line": ep.line_number,
                "handler": ep.handler_function,
            })

        for s in symbols:
            if any(sink_call_name in c for c in (s.calls_made or [])):
                flow_steps.append({
                    "step": len(flow_steps) + 1,
                    "role": "TAINTED_SINK",
                    "description": f"Function '{s.name}' invokes potential sink '{sink_call_name}'",
                    "file_path": s.file_path,
                    "line": s.line_start,
                    "calls": s.calls_made,
                })

        return flow_steps

