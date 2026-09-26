import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.scanner.engine import verification_engine
from app.engines.scanner.models import ScanTarget
from app.engines.scanner.registry import default_scanner_registry
from app.models.scan import (
    RequirementVerificationResult,
    ScannerExecution,
    SecurityFinding,
    SecurityScan,
)
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.scan import (
    ScannerHealthResponse,
    ScanTriggerRequest,
)
from app.services.audit_service import AuditService


class ScanService:
    """Orchestrates security verification scans, persistence, and audit logging."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ScanRepository(db)
        self.project_repo = ProjectRepository(db)
        self.blueprint_repo = BlueprintRepository(db)
        self.audit = AuditService(db)

    async def trigger_scan(
        self,
        project_id: uuid.UUID,
        payload: ScanTriggerRequest,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> SecurityScan:
        # 1. Project ownership validation
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target project '{project_id}' does not exist",
            )
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to trigger security scans for this project",
            )

        # 2. Resolve target path
        target_path = payload.target_path
        if not target_path:
            # Default to project repository url if local directory, or current workspace
            target_path = project.repository_url or os.getcwd()

        if not os.path.exists(target_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target path '{target_path}' does not exist on disk",
            )

        # 3. Resolve Blueprint & Requirements
        blueprint = None
        if payload.blueprint_id:
            blueprint = await self.blueprint_repo.get_by_id(payload.blueprint_id, include_requirements=True)
            if not blueprint or blueprint.project_id != project_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Blueprint '{payload.blueprint_id}' not found for project",
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

        # 4. Create initial scan record in DB
        scan = await self.repo.create_scan(
            project_id=project_id,
            blueprint_id=blueprint.id if blueprint else None,
            intent_id=blueprint.intent_id if blueprint else None,
            target_type=payload.target_type,
            target_path=target_path,
            requested_by=current_user.email,
        )
        scan.status = "RUNNING"
        scan.started_at = datetime.now(timezone.utc)
        await self.db.commit()

        # 5. Log SCAN_STARTED audit event
        await self.audit.log_event(
            action="SCAN_STARTED",
            resource_type="scan",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(scan.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "target_type": payload.target_type,
                "target_path": target_path,
                "blueprint_id": str(blueprint.id) if blueprint else None,
                "selected_scanners": payload.selected_scanners,
                "request_id": request_id,
            },
        )
        await self.db.commit()

        # 6. Execute real scanners via Verification Engine
        scan_target = ScanTarget(
            target_type=payload.target_type,
            path=target_path,
            repository_url=project.repository_url,
        )

        scan_result = await verification_engine.execute_scan(
            target=scan_target,
            selected_scanners=payload.selected_scanners,
            blueprint_requirements=blueprint_requirements,
        )

        # 7. Persist real results, executions, findings, and verifications
        await self.repo.record_scan_results(scan.id, scan_result)

        # 8. Log SCAN_COMPLETED audit event
        await self.audit.log_event(
            action="SCAN_COMPLETED",
            resource_type="scan",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(scan.id),
            project_id=project_id,
            status="SUCCESS" if scan_result.status != "FAILED" else "FAILURE",
            metadata={
                "scanner_count": scan_result.scanner_count,
                "finding_count": scan_result.finding_count,
                "status": scan_result.status,
                "request_id": request_id,
            },
        )
        await self.db.commit()

        # Reload with eager loaded relationships
        loaded = await self.repo.get_by_id(scan.id, include_details=True)
        return loaded or scan

    async def get_scan(
        self,
        scan_id: uuid.UUID,
        current_user: User,
    ) -> SecurityScan:
        scan = await self.repo.get_by_id(scan_id, include_details=True)
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security scan '{scan_id}' not found",
            )

        project = await self.project_repo.get_by_id(scan.project_id)
        if not project or (project.owner_id != current_user.id and not current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view this security scan",
            )

        return scan

    async def list_scans_for_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SecurityScan]:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view scans for this project",
            )

        return await self.repo.list_by_project(project_id, limit=limit, offset=offset)

    async def get_findings(
        self,
        scan_id: uuid.UUID,
        current_user: User,
    ) -> List[SecurityFinding]:
        scan = await self.get_scan(scan_id, current_user)
        return scan.findings

    async def get_executions(
        self,
        scan_id: uuid.UUID,
        current_user: User,
    ) -> List[ScannerExecution]:
        scan = await self.get_scan(scan_id, current_user)
        return scan.executions

    async def get_verifications(
        self,
        scan_id: uuid.UUID,
        current_user: User,
    ) -> List[RequirementVerificationResult]:
        scan = await self.get_scan(scan_id, current_user)
        return scan.verifications

    async def get_scanners_health(self) -> List[ScannerHealthResponse]:
        raw_health = await default_scanner_registry.get_all_health()
        return [ScannerHealthResponse.model_validate(h) for h in raw_health]
