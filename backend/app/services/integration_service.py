import uuid
from typing import List, Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration
from app.models.user import User
from app.schemas.integration import IntegrationCreate, IntegrationUpdate
from app.services.audit_service import AuditService

class IntegrationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit = AuditService(db)

    async def create_integration(
        self, payload: IntegrationCreate, current_user: User, request_id: str | None = None
    ) -> Integration:
        integration = Integration(
            project_id=payload.project_id,
            provider=payload.provider,
            credentials_json=payload.credentials_json,
            is_connected=payload.is_connected
        )
        self.db.add(integration)
        await self.db.flush()

        await self.audit.log_event(
            action="INTEGRATION_CREATED",
            resource_type="integration",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(integration.id),
            project_id=payload.project_id,
            metadata={"provider": payload.provider, "project_id": str(payload.project_id), "request_id": request_id}
        )

        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def list_integrations(
        self, project_id: uuid.UUID | None = None, limit: int = 100, offset: int = 0
    ) -> Sequence[Integration]:
        stmt = select(Integration)
        if project_id:
            stmt = stmt.where(Integration.project_id == project_id)
        stmt = stmt.limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_integration(
        self, integration_id: uuid.UUID
    ) -> Integration:
        stmt = select(Integration).where(Integration.id == integration_id)
        result = await self.db.execute(stmt)
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
        return integration

    async def update_integration(
        self, integration_id: uuid.UUID, payload: IntegrationUpdate, current_user: User, request_id: str | None = None
    ) -> Integration:
        integration = await self.get_integration(integration_id)
        
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(integration, key, value)
            
        await self.audit.log_event(
            action="INTEGRATION_UPDATED",
            resource_type="integration",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(integration.id),
            project_id=integration.project_id,
            metadata={"updated_fields": list(update_data.keys()), "request_id": request_id}
        )
        
        await self.db.commit()
        await self.db.refresh(integration)
        return integration

    async def delete_integration(
        self, integration_id: uuid.UUID, current_user: User, request_id: str | None = None
    ) -> Integration:
        integration = await self.get_integration(integration_id)
        
        await self.db.delete(integration)
        
        await self.audit.log_event(
            action="INTEGRATION_DELETED",
            resource_type="integration",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(integration.id),
            project_id=integration.project_id,
            metadata={"provider": integration.provider, "request_id": request_id}
        )
        
        await self.db.commit()
        return integration
