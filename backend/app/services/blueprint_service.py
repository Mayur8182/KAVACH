import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.blueprint.engine import blueprint_engine
from app.engines.intent.models import NormalizedIntent
from app.models.blueprint import SecurityBlueprint, SecurityRequirement
from app.models.intent import Intent
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.blueprint import (
    BlueprintComparisonResponse,
    RequirementDiff,
    SecurityRequirementResponse,
)
from app.services.audit_service import AuditService


class BlueprintService:
    """Orchestrates generation, regeneration, versioning, and auditing of Security Blueprints."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = BlueprintRepository(db)
        self.project_repo = ProjectRepository(db)
        self.audit = AuditService(db)

    async def generate_blueprint(
        self,
        project_id: uuid.UUID,
        current_user: User,
        intent_id: Optional[uuid.UUID] = None,
        request_id: Optional[str] = None,
    ) -> SecurityBlueprint:
        # 1. Project validation & ownership
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target project '{project_id}' does not exist",
            )
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to generate blueprints for this project",
            )

        # 2. Resolve Intent (version-specific or latest)
        if intent_id:
            intent_query = select(Intent).where(Intent.id == intent_id, Intent.project_id == project_id)
            res = await self.db.execute(intent_query)
            intent_record = res.scalar_one_or_none()
            if not intent_record:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Intent '{intent_id}' for project '{project_id}' does not exist",
                )
        else:
            intent_query = (
                select(Intent)
                .where(Intent.project_id == project_id)
                .order_by(desc(Intent.created_at))
                .limit(1)
            )
            res = await self.db.execute(intent_query)
            intent_record = res.scalar_one_or_none()
            if not intent_record:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot generate security blueprint: No analyzed intent found for project. Submit intent first.",
                )

        # 3. Parse Normalized Intent
        try:
            normalized_intent = NormalizedIntent.model_validate(intent_record.normalized_intent)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse stored normalized intent: {str(e)}",
            )

        # 4. Execute Deterministic Blueprint Engine
        eval_result = blueprint_engine.generate_blueprint(normalized_intent)

        # 5. Versioning: determine next version
        next_version = await self.repo.get_next_version(project_id)

        # 6. Persist Blueprint
        blueprint = await self.repo.create_blueprint(
            project_id=project_id,
            intent_id=intent_record.id,
            version=next_version,
            status="GENERATED",
            methodology_version=eval_result.methodology_version,
            generated_by=current_user.email,
            risk_factors=eval_result.risk_factors,
        )

        # 7. Persist Requirements, Evidence, Dependencies
        await self.repo.add_requirements_and_evidence(
            blueprint_id=blueprint.id,
            candidates=eval_result.requirements,
        )

        # 8. Supersede prior active blueprints for this project
        await self.repo.supersede_previous_versions(project_id, blueprint.id)

        # 9. Audit Event
        await self.audit.log_event(
            action="BLUEPRINT_CREATED",
            resource_type="blueprint",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(blueprint.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "version": next_version,
                "intent_id": str(intent_record.id),
                "requirement_count": len(eval_result.requirements),
                "risk_factors": eval_result.risk_factors,
                "methodology_version": eval_result.methodology_version,
                "request_id": request_id,
            },
        )

        await self.db.commit()

        # Reload with relationships
        loaded = await self.repo.get_by_id(blueprint.id, include_requirements=True)
        return loaded or blueprint

    async def get_blueprint(
        self,
        blueprint_id: uuid.UUID,
        current_user: User,
    ) -> SecurityBlueprint:
        blueprint = await self.repo.get_by_id(blueprint_id, include_requirements=True)
        if not blueprint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Security blueprint '{blueprint_id}' not found",
            )

        project = await self.project_repo.get_by_id(blueprint.project_id)
        if not project or (project.owner_id != current_user.id and not current_user.is_superuser):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view this security blueprint",
            )

        return blueprint

    async def list_blueprints_for_project(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> List[SecurityBlueprint]:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )
        if project.owner_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to view blueprints for this project",
            )

        return await self.repo.list_for_project(project_id)

    async def get_requirements(
        self,
        blueprint_id: uuid.UUID,
        current_user: User,
    ) -> List[SecurityRequirement]:
        blueprint = await self.get_blueprint(blueprint_id, current_user)
        return blueprint.requirements

    async def regenerate_blueprint(
        self,
        blueprint_id: uuid.UUID,
        current_user: User,
        intent_id: Optional[uuid.UUID] = None,
        request_id: Optional[str] = None,
    ) -> SecurityBlueprint:
        existing = await self.get_blueprint(blueprint_id, current_user)
        target_intent_id = intent_id or existing.intent_id

        new_blueprint = await self.generate_blueprint(
            project_id=existing.project_id,
            current_user=current_user,
            intent_id=target_intent_id,
            request_id=request_id,
        )

        # Log regeneration specific audit event
        await self.audit.log_event(
            action="BLUEPRINT_REGENERATED",
            resource_type="blueprint",
            actor_type="user",
            actor_id=str(current_user.id),
            resource_id=str(new_blueprint.id),
            project_id=existing.project_id,
            status="SUCCESS",
            metadata={
                "previous_blueprint_id": str(existing.id),
                "previous_version": existing.version,
                "new_version": new_blueprint.version,
                "intent_id": str(target_intent_id),
                "request_id": request_id,
            },
        )
        await self.db.commit()
        return new_blueprint

    async def compare_blueprints(
        self,
        blueprint_v1_id: uuid.UUID,
        blueprint_v2_id: uuid.UUID,
        current_user: User,
    ) -> BlueprintComparisonResponse:
        b1 = await self.get_blueprint(blueprint_v1_id, current_user)
        b2 = await self.get_blueprint(blueprint_v2_id, current_user)

        b1_reqs: Dict[str, SecurityRequirement] = {r.requirement_key: r for r in b1.requirements}
        b2_reqs: Dict[str, SecurityRequirement] = {r.requirement_key: r for r in b2.requirements}

        added: List[SecurityRequirementResponse] = []
        removed: List[SecurityRequirementResponse] = []
        modified: List[RequirementDiff] = []
        unchanged_count = 0

        # Keys in b2 not in b1 -> added
        for k, req in b2_reqs.items():
            if k not in b1_reqs:
                added.append(SecurityRequirementResponse.model_validate(req))

        # Keys in b1 not in b2 -> removed
        for k, req in b1_reqs.items():
            if k not in b2_reqs:
                removed.append(SecurityRequirementResponse.model_validate(req))

        # Common keys -> check diffs
        for k in set(b1_reqs.keys()) & set(b2_reqs.keys()):
            r1 = b1_reqs[k]
            r2 = b2_reqs[k]

            changes: Dict[str, Dict[str, Any]] = {}
            if r1.severity != r2.severity:
                changes["severity"] = {"old": r1.severity, "new": r2.severity}
            if r1.priority != r2.priority:
                changes["priority"] = {"old": r1.priority, "new": r2.priority}
            if r1.mandatory != r2.mandatory:
                changes["mandatory"] = {"old": r1.mandatory, "new": r2.mandatory}
            if r1.rationale != r2.rationale:
                changes["rationale"] = {"old": r1.rationale, "new": r2.rationale}
            if sorted(r1.verification_strategy) != sorted(r2.verification_strategy):
                changes["verification_strategy"] = {"old": r1.verification_strategy, "new": r2.verification_strategy}

            if changes:
                modified.append(RequirementDiff(
                    requirement_key=k,
                    title=r2.title,
                    changes=changes,
                ))
            else:
                unchanged_count += 1

        return BlueprintComparisonResponse(
            blueprint_v1_id=b1.id,
            blueprint_v1_version=b1.version,
            blueprint_v2_id=b2.id,
            blueprint_v2_version=b2.version,
            added_requirements=added,
            removed_requirements=removed,
            modified_requirements=modified,
            unchanged_count=unchanged_count,
        )
