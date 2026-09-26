import uuid
from typing import List, Optional
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.blueprint import (
    SecurityBlueprint,
    SecurityRequirement,
    SecurityRequirementEvidence,
    SecurityRequirementDependency,
)
from app.engines.blueprint.models import BlueprintRequirementCandidate


class BlueprintRepository:
    """PostgreSQL data access layer for Security Blueprints and Requirements."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_next_version(self, project_id: uuid.UUID) -> int:
        """Determines the next sequential blueprint version for a project."""
        query = select(func.coalesce(func.max(SecurityBlueprint.version), 0)).where(
            SecurityBlueprint.project_id == project_id
        )
        result = await self.session.execute(query)
        max_ver = result.scalar_one()
        return max_ver + 1

    async def create_blueprint(
        self,
        project_id: uuid.UUID,
        intent_id: uuid.UUID,
        version: int,
        status: str = "GENERATED",
        methodology_version: str = "2026.1.0",
        generated_by: str = "system",
        risk_factors: Optional[List[str]] = None,
    ) -> SecurityBlueprint:
        blueprint = SecurityBlueprint(
            project_id=project_id,
            intent_id=intent_id,
            version=version,
            status=status,
            methodology_version=methodology_version,
            generated_by=generated_by,
            risk_factors=risk_factors or [],
        )
        self.session.add(blueprint)
        await self.session.flush()
        return blueprint

    async def add_requirements_and_evidence(
        self,
        blueprint_id: uuid.UUID,
        candidates: List[BlueprintRequirementCandidate],
    ) -> List[SecurityRequirement]:
        """Persists all generated candidate requirements, evidence items, and dependencies."""
        db_requirements: List[SecurityRequirement] = []

        for cand in candidates:
            ev_list = [
                SecurityRequirementEvidence(
                    source_type=ev.source_type,
                    source_field=ev.source_field,
                    evidence_text=ev.evidence_text,
                )
                for ev in cand.evidence
            ]
            dep_list = [
                SecurityRequirementDependency(
                    depends_on_key=dep.depends_on_key,
                    dependency_type=dep.dependency_type,
                    description=dep.description,
                )
                for dep in cand.dependencies
            ]

            req = SecurityRequirement(
                blueprint_id=blueprint_id,
                requirement_key=cand.requirement_key,
                title=cand.title,
                description=cand.description,
                category=cand.category,
                severity=cand.severity,
                priority=cand.priority,
                mandatory=cand.mandatory,
                rationale=cand.rationale,
                verification_strategy=cand.verification_strategy,
                status="ACTIVE",
                security_invariant=cand.security_invariant,
                evidence_items=ev_list,
                dependencies=dep_list,
            )
            self.session.add(req)
            db_requirements.append(req)

        await self.session.flush()
        return db_requirements

    async def get_by_id(
        self,
        blueprint_id: uuid.UUID,
        include_requirements: bool = True,
    ) -> Optional[SecurityBlueprint]:
        query = select(SecurityBlueprint).where(SecurityBlueprint.id == blueprint_id)
        if include_requirements:
            query = query.options(
                selectinload(SecurityBlueprint.requirements)
                .selectinload(SecurityRequirement.evidence_items),
                selectinload(SecurityBlueprint.requirements)
                .selectinload(SecurityRequirement.dependencies),
            )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_for_project(
        self,
        project_id: uuid.UUID,
    ) -> List[SecurityBlueprint]:
        query = (
            select(SecurityBlueprint)
            .where(SecurityBlueprint.project_id == project_id)
            .options(selectinload(SecurityBlueprint.requirements))
            .order_by(desc(SecurityBlueprint.version))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_latest_for_project(
        self,
        project_id: uuid.UUID,
        include_requirements: bool = True,
    ) -> Optional[SecurityBlueprint]:
        query = (
            select(SecurityBlueprint)
            .where(SecurityBlueprint.project_id == project_id)
            .order_by(desc(SecurityBlueprint.version))
            .limit(1)
        )
        if include_requirements:
            query = query.options(
                selectinload(SecurityBlueprint.requirements)
                .selectinload(SecurityRequirement.evidence_items),
                selectinload(SecurityBlueprint.requirements)
                .selectinload(SecurityRequirement.dependencies),
            )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def supersede_previous_versions(
        self,
        project_id: uuid.UUID,
        current_blueprint_id: uuid.UUID,
    ) -> None:
        """Marks any prior GENERATED blueprints for the project as SUPERSEDED."""
        stmt = (
            update(SecurityBlueprint)
            .where(
                SecurityBlueprint.project_id == project_id,
                SecurityBlueprint.id != current_blueprint_id,
                SecurityBlueprint.status == "GENERATED",
            )
            .values(status="SUPERSEDED")
        )
        await self.session.execute(stmt)
