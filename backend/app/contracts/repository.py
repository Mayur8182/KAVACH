import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.contracts.models import (
    SecurityContract,
    SecurityContractDependency,
    SecurityContractEvidenceRequirement,
    SecurityContractOverride,
    SecurityContractScope,
    SecurityContractVerification,
    SecurityContractVersion,
    SecurityContractViolation,
)


class ContractRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_contract_by_id(self, contract_id: uuid.UUID) -> Optional[SecurityContract]:
        stmt = (
            select(SecurityContract)
            .options(
                selectinload(SecurityContract.versions).selectinload(SecurityContractVersion.scopes),
                selectinload(SecurityContract.versions).selectinload(SecurityContractVersion.evidence_requirements),
            )
            .where(SecurityContract.id == contract_id)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_contract_by_key(self, project_id: uuid.UUID, contract_key: str) -> Optional[SecurityContract]:
        stmt = (
            select(SecurityContract)
            .options(selectinload(SecurityContract.versions))
            .where(
                SecurityContract.project_id == project_id,
                SecurityContract.contract_key == contract_key,
            )
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_project_contracts(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> List[SecurityContract]:
        stmt = (
            select(SecurityContract)
            .options(selectinload(SecurityContract.versions))
            .where(SecurityContract.project_id == project_id)
        )
        if status:
            stmt = stmt.where(SecurityContract.status == status)
        stmt = stmt.order_by(SecurityContract.created_at.desc())
        return (await self.db.execute(stmt)).scalars().all()

    async def get_version_by_id(self, version_id: uuid.UUID) -> Optional[SecurityContractVersion]:
        stmt = (
            select(SecurityContractVersion)
            .options(
                selectinload(SecurityContractVersion.contract),
                selectinload(SecurityContractVersion.scopes),
                selectinload(SecurityContractVersion.dependencies),
                selectinload(SecurityContractVersion.evidence_requirements),
            )
            .where(SecurityContractVersion.id == version_id)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_versions_for_contract(self, contract_id: uuid.UUID) -> List[SecurityContractVersion]:
        stmt = (
            select(SecurityContractVersion)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractVersion.version))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def get_latest_version(self, contract_id: uuid.UUID) -> Optional[SecurityContractVersion]:
        stmt = (
            select(SecurityContractVersion)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractVersion.version))
            .limit(1)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_dependencies(self, contract_version_id: uuid.UUID) -> List[SecurityContractDependency]:
        stmt = (
            select(SecurityContractDependency)
            .where(SecurityContractDependency.contract_version_id == contract_version_id)
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def list_verifications(self, contract_version_id: uuid.UUID) -> List[SecurityContractVerification]:
        stmt = (
            select(SecurityContractVerification)
            .where(SecurityContractVerification.contract_version_id == contract_version_id)
            .order_by(desc(SecurityContractVerification.evaluated_at))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def list_violations(self, project_id: uuid.UUID, status: Optional[str] = None) -> List[SecurityContractViolation]:
        stmt = (
            select(SecurityContractViolation)
            .where(SecurityContractViolation.project_id == project_id)
        )
        if status:
            stmt = stmt.where(SecurityContractViolation.status == status)
        stmt = stmt.order_by(desc(SecurityContractViolation.detected_at))
        return (await self.db.execute(stmt)).scalars().all()

    async def list_contracts_for_project(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> List[SecurityContract]:
        return await self.list_project_contracts(project_id, status)

    async def list_overrides(self, contract_version_id: uuid.UUID) -> List[SecurityContractOverride]:
        stmt = (
            select(SecurityContractOverride)
            .where(SecurityContractOverride.contract_version_id == contract_version_id)
            .order_by(desc(SecurityContractOverride.created_at))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def get_dependencies_for_contract(self, contract_id: uuid.UUID) -> List[SecurityContractDependency]:
        stmt = (
            select(SecurityContractDependency)
            .join(SecurityContractVersion, SecurityContractDependency.contract_version_id == SecurityContractVersion.id)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractDependency.created_at))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def get_verifications_for_contract(self, contract_id: uuid.UUID) -> List[SecurityContractVerification]:
        stmt = (
            select(SecurityContractVerification)
            .join(SecurityContractVersion, SecurityContractVerification.contract_version_id == SecurityContractVersion.id)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractVerification.evaluated_at))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def get_violations_for_contract(self, contract_id: uuid.UUID) -> List[SecurityContractViolation]:
        stmt = (
            select(SecurityContractViolation)
            .join(SecurityContractVersion, SecurityContractViolation.contract_version_id == SecurityContractVersion.id)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractViolation.detected_at))
        )
        return (await self.db.execute(stmt)).scalars().all()

    async def get_overrides_for_contract(self, contract_id: uuid.UUID) -> List[SecurityContractOverride]:
        stmt = (
            select(SecurityContractOverride)
            .join(SecurityContractVersion, SecurityContractOverride.contract_version_id == SecurityContractVersion.id)
            .where(SecurityContractVersion.contract_id == contract_id)
            .order_by(desc(SecurityContractOverride.created_at))
        )
        return (await self.db.execute(stmt)).scalars().all()
