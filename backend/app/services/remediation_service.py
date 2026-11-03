import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.remediation import (
    RemediationPlan,
    RemediationAttempt,
    RemediationPatch,
    RemediationValidation,
)
from app.services.ai_provider_service import (
    InvestigationLLMProvider,
    get_default_ai_provider,
)
from app.services.patch_service import PatchService
from app.services.validation_service import ValidationService

logger = logging.getLogger("thing.remediation.service")


class RemediationService:
    def __init__(self, db: AsyncSession, ai_provider: Optional[InvestigationLLMProvider] = None):
        self.db = db
        self.ai_provider = ai_provider or get_default_ai_provider()
        self.patch_service = PatchService(db, self.ai_provider)
        self.validation_service = ValidationService(db)

    async def create_plan(
        self,
        project_id: uuid.UUID,
        investigation_id: uuid.UUID,
        created_by_type: str,
        created_by_id: str,
        context: Dict[str, Any]
    ) -> RemediationPlan:
        # Generate plan using AI Provider
        plan_data = await self.ai_provider.generate_remediation_plan(context)
        
        plan = RemediationPlan(
            project_id=project_id,
            investigation_id=investigation_id,
            title=plan_data.get("problem", "Remediation Plan"),
            description=plan_data.get("root_cause", ""),
            type="SOURCE_CODE_PATCH",
            risk_level="LOW_RISK",
            status="PROPOSED",
            created_by_type=created_by_type,
            created_by_id=created_by_id
        )
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def approve_plan(self, plan_id: uuid.UUID) -> bool:
        stmt = select(RemediationPlan).where(RemediationPlan.id == plan_id)
        plan = (await self.db.execute(stmt)).scalar_one_or_none()
        if not plan:
            return False
            
        plan.status = "APPROVED"
        await self.db.commit()
        return True

    async def execute_plan(
        self,
        plan_id: uuid.UUID,
        actor_type: str,
        actor_id: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Executes an approved plan:
        1. Generates patch via configured AI Provider
        2. Applies patch in isolated disk workspace sandbox
        3. Executes 7-stage deterministic verification suite
        4. Cryptographically attests results and updates plan status
        """
        stmt = select(RemediationPlan).where(RemediationPlan.id == plan_id)
        plan = (await self.db.execute(stmt)).scalar_one_or_none()
        if not plan or plan.status != "APPROVED":
            return "Plan not approved"
            
        attempt = RemediationAttempt(
            plan_id=plan.id,
            actor_type=actor_type,
            actor_id=actor_id,
            status="RUNNING",
            started_at=datetime.now(timezone.utc)
        )
        self.db.add(attempt)
        await self.db.commit()
        
        try:
            # 1. Generate Patch
            patch = await self.patch_service.generate_patch(plan.id, context)
            attempt.patch_id = patch.id
            await self.db.commit()
            
            # 2. Apply patch in isolated disk sandbox workspace
            applied = await self.patch_service.apply_patch_in_isolated_workspace(patch.id)
            if not applied:
                attempt.status = "FAILED"
                attempt.failure_reason = "Failed to apply patch in isolated workspace"
                plan.status = "FAILED"
                await self.db.commit()
                return "Failed to apply patch"
                
            # 3. Validate Patch using real 7-phase deterministic verification gate
            valid = await self.validation_service.run_validations(patch.id)
            if not valid:
                val_stmt = (
                    select(RemediationValidation)
                    .where(
                        RemediationValidation.patch_id == patch.id,
                        RemediationValidation.status == "FAILED"
                    )
                    .order_by(RemediationValidation.started_at.desc())
                    .limit(1)
                )
                failed_val = (await self.db.execute(val_stmt)).scalar_one_or_none()
                err_detail = failed_val.failure_reason if failed_val else "Verification gate failed"
                
                attempt.status = "FAILED"
                attempt.failure_reason = f"Validation failed: {err_detail}"
                plan.status = "FAILED"
                await self.db.commit()
                return "Validation failed"
                
            # If all validations passed
            attempt.status = "COMPLETED"
            attempt.completed_at = datetime.now(timezone.utc)
            plan.status = "VERIFIED"
            await self.db.commit()
            
            # Return verified status
            return "FIX_VERIFIED"
            
        except Exception as e:
            logger.exception("Failed to execute plan")
            attempt.status = "FAILED"
            attempt.failure_reason = str(e)
            plan.status = "FAILED"
            await self.db.commit()
            return "ERROR"
