import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.intent.engine import IntentEngine
from app.models.intent import Intent
from app.models.user import User
from app.repositories.intent_repository import IntentRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.intent import IntentSubmitRequest
from app.services.audit_service import AuditService


class IntentService:
    """Service orchestrating natural-language intent understanding, validation, and audit persistence."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = IntentRepository(db)
        self.project_repo = ProjectRepository(db)
        self.audit = AuditService(db)

    async def analyze_and_create(
        self,
        payload: IntentSubmitRequest,
        current_user: User,
        request_id: Optional[str] = None,
    ) -> Intent:
        # 1. Validate project existence
        project = await self.project_repo.get_by_id(payload.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target project '{payload.project_id}' does not exist",
            )

        # 2. Strict ownership validation
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to analyze intent for this project",
            )

        # 3. Execute Intent Understanding Engine
        engine = IntentEngine(preferred_provider=payload.preferred_provider)
        project_context = {
            "project_name": project.name,
            "environment": payload.environment or project.environment,
            "application_type": project.application_type,
            "repository_url": project.repository_url,
        }

        normalized = await engine.understand(
            raw_input=payload.description,
            project_context=project_context,
        )

        # 4. Persist Intent entity in PostgreSQL
        intent_record = Intent(
            project_id=payload.project_id,
            raw_input=payload.description,  # Preserved verbatim
            environment=payload.environment,
            application_type=normalized.application_type,
            purpose=normalized.purpose,
            normalized_intent=normalized.model_dump(),
            status="ANALYZED",
            provider=payload.preferred_provider or "deterministic",
            overall_confidence=normalized.overall_confidence,
        )
        created = await self.repo.create(intent_record)

        # 5. Log INTENT_ANALYZED audit event
        await self.audit.log_event(
            action="INTENT_ANALYZED",
            resource_type="intent",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(created.id),
            project_id=payload.project_id,
            status="SUCCESS",
            metadata={
                "application_type": normalized.application_type,
                "overall_confidence": normalized.overall_confidence,
                "technologies": [t.name for t in normalized.technologies],
                "interfaces": [i.type for i in normalized.interfaces],
                "data_domains": [d.domain for d in normalized.data_domains],
                "ambiguities_count": len(normalized.ambiguities),
                "request_id": request_id,
            },
        )

        await self.db.commit()
        await self.db.refresh(created)
        return created

    async def get_intent(self, intent_id: uuid.UUID, current_user: User) -> Intent:
        intent = await self.repo.get_by_id(intent_id)
        if not intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Intent record '{intent_id}' not found",
            )

        project = await self.project_repo.get_by_id(intent.project_id)
        if not project or (project.owner_id != current_user.id and not current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view this intent record",
            )

        return intent

    async def list_intents_for_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Intent]:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )

        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view intents for this project",
            )

        return await self.repo.list_by_project(project_id=project_id, limit=limit, offset=offset)
