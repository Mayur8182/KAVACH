"""
Thing Scan Orchestrator Service.
Provides authoritative API layer for asset discovery preview, dynamic plan generation,
and asynchronous orchestration dispatching via PostgreSQL Task Queue.
Strict compliance with AGENTS.md:
- Rule 6: PostgreSQL database persistence.
- Rule 12: Real async background worker jobs.
- Rule 13: Every security decision backed by evidence.
- Rule 20: Comprehensive audit logging.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.orchestrator.discovery import AssetDiscoveryEngine
from app.engines.orchestrator.models import AssetProfile, ScanPlan
from app.engines.orchestrator.planner import ScanPlanner
from app.models.project import Project
from app.models.scan import SecurityScan
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.task_queue import TaskResponse
from app.services.audit_service import AuditService
from app.services.task_queue_service import TaskQueueService


class ScanOrchestratorService:
    """
    Coordinates asset discovery, dynamic planning, and background job queueing.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.blueprint_repo = BlueprintRepository(db)
        self.scan_repo = ScanRepository(db)
        self.audit = AuditService(db)
        self.task_queue = TaskQueueService(db)
        self.discovery_engine = AssetDiscoveryEngine()
        self.planner = ScanPlanner()

    async def preview_scan_plan(
        self,
        project_id: uuid.UUID,
        target_path: Optional[str],
        current_user: User,
        requested_scanners: Optional[List[str]] = None,
        exclude_scanners: Optional[List[str]] = None,
    ) -> ScanPlan:
        """
        Discovers target assets and computes a deterministic ScanPlan preview
        without triggering actual scanner executions.
        """
        project = await self._verify_project_access(project_id, current_user)
        resolved_path = self._resolve_target_path(project, target_path)

        profile = await self.discovery_engine.discover(resolved_path)
        plan = await self.planner.create_plan(
            asset_profile=profile,
            requested_scanners=requested_scanners,
            exclude_scanners=exclude_scanners,
        )
        return plan

    async def trigger_orchestrated_scan(
        self,
        project_id: uuid.UUID,
        current_user: User,
        target_path: Optional[str] = None,
        requested_scanners: Optional[List[str]] = None,
        exclude_scanners: Optional[List[str]] = None,
        blueprint_id: Optional[uuid.UUID] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a persistent SecurityScan row, logs audit provenance, and enqueues
        a UNIFIED_SCAN_ORCHESTRATION background job in the PostgreSQL task queue.
        Returns immediately with scan_id and task_id for real-time progress tracking.
        """
        project = await self._verify_project_access(project_id, current_user)
        resolved_path = self._resolve_target_path(project, target_path)

        # 1. Resolve Blueprint & Step 5 Requirements
        blueprint = None
        if blueprint_id:
            blueprint = await self.blueprint_repo.get_by_id(blueprint_id, include_requirements=True)
            if not blueprint or blueprint.project_id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Security Blueprint '{blueprint_id}' not found for project",
                )
        else:
            blueprint = await self.blueprint_repo.get_latest_for_project(project_id, include_requirements=True)

        blueprint_requirements = []
        if blueprint and blueprint.requirements:
            blueprint_requirements = [
                {
                    "id": str(r.id),
                    "requirement_key": r.requirement_key,
                }
                for r in blueprint.requirements
            ]

        # 2. Create authoritative SecurityScan record in DB
        scan = await self.scan_repo.create_scan(
            project_id=project_id,
            blueprint_id=blueprint.id if blueprint else None,
            intent_id=blueprint.intent_id if blueprint else None,
            target_type="LOCAL_DIRECTORY",
            target_path=resolved_path,
            requested_by=current_user.email,
        )
        scan.status = "QUEUED"
        await self.db.commit()
        await self.db.refresh(scan)

        # 3. Log SCAN_STARTED audit trail
        await self.audit.log_event(
            action="SCAN_STARTED",
            resource_type="scan",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(scan.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "target_path": resolved_path,
                "blueprint_id": str(blueprint.id) if blueprint else None,
                "requested_scanners": requested_scanners,
                "exclude_scanners": exclude_scanners,
                "request_id": request_id,
            },
        )
        await self.db.commit()

        # 4. Enqueue real background task
        task_payload = {
            "scan_id": str(scan.id),
            "project_id": str(project_id),
            "target_path": resolved_path,
            "requested_scanners": requested_scanners,
            "exclude_scanners": exclude_scanners,
            "blueprint_requirements": blueprint_requirements,
            "requested_by": current_user.email,
        }

        task: TaskResponse = await self.task_queue.enqueue(
            task_type="UNIFIED_SCAN_ORCHESTRATION",
            project_id=str(project_id),
            payload=task_payload,
            priority=10,  # High priority for real-time user trigger
        )

        return {
            "scan_id": str(scan.id),
            "task_id": str(task.id),
            "status": "QUEUED",
            "target_path": resolved_path,
            "project_id": str(project_id),
            "blueprint_id": str(blueprint.id) if blueprint else None,
            "created_at": scan.created_at.isoformat() if scan.created_at else datetime.now(timezone.utc).isoformat(),
        }

    async def get_orchestration_status(
        self,
        scan_id: uuid.UUID,
        current_user: User,
    ) -> Dict[str, Any]:
        """Fetches live scan execution progress and diagnostics."""
        scan = await self.scan_repo.get_by_id(scan_id, include_details=True)
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security scan '{scan_id}' not found",
            )
        await self._verify_project_access(scan.project_id, current_user)

        # Find associated background task if running
        from app.models.task_queue import BackgroundTask
        stmt = (
            select(BackgroundTask)
            .where(BackgroundTask.payload["scan_id"].as_string() == str(scan_id))
            .order_by(BackgroundTask.created_at.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        bg_task = res.scalar_one_or_none()

        return {
            "scan_id": str(scan.id),
            "status": scan.status,
            "progress_percent": bg_task.progress_percent if bg_task else (100 if scan.status == "COMPLETED" else 0),
            "current_step": bg_task.current_step if bg_task else ("Completed" if scan.status == "COMPLETED" else "Waiting"),
            "target_path": scan.target_path,
            "scanner_count": scan.scanner_count,
            "finding_count": scan.finding_count,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "error_message": scan.error_message or (bg_task.error_message if bg_task else None),
            "executions": [
                {
                    "scanner_name": e.scanner_name,
                    "scanner_type": e.scanner_type,
                    "status": e.status,
                    "finding_count": e.finding_count,
                    "duration_ms": e.duration_ms,
                    "exit_code": e.exit_code,
                }
                for e in (scan.executions or [])
            ],
        }

    async def _verify_project_access(self, project_id: uuid.UUID, user: User) -> Project:
        """Ensures project exists and caller has authorization."""
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' does not exist",
            )
        if project.owner_id != user.id and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to inspect or trigger scans for this project",
            )
        return project

    def _resolve_target_path(self, project: Project, custom_path: Optional[str]) -> str:
        """Determines the valid on-disk target path to scan."""
        if custom_path and os.path.exists(custom_path):
            return os.path.abspath(custom_path)

        if project.repository_url and os.path.exists(project.repository_url):
            return os.path.abspath(project.repository_url)

        # Fallback to current workspace candidates
        candidates = [
            os.getcwd(),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")),
        ]
        for c in candidates:
            if os.path.exists(c):
                return c

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resolve valid source code target path on disk",
        )
