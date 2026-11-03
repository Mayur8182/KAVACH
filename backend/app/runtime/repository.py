"""
Runtime Evidence Repository.
Handles all database queries and transactions for:
- runtime_evidence
- runtime_evidence_sources
- evidence_checkpoints
- evidence_correlations
- contract verifications & violations
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.contracts.models import (
    SecurityContract,
    SecurityContractVersion,
    SecurityContractVerification,
    SecurityContractViolation,
)
from app.runtime.models import (
    EvidenceCheckpoint,
    EvidenceCorrelation,
    RuntimeEvidence,
    RuntimeEvidenceSource,
)


class RuntimeEvidenceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ==================== EVIDENCE ====================

    async def create_evidence(self, evidence: RuntimeEvidence) -> RuntimeEvidence:
        self.session.add(evidence)
        await self.session.flush()
        return evidence

    async def get_evidence_by_id(
        self, evidence_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[RuntimeEvidence]:
        stmt = (
            select(RuntimeEvidence)
            .options(selectinload(RuntimeEvidence.correlations))
            .where(RuntimeEvidence.id == evidence_id)
        )
        if project_id:
            stmt = stmt.where(RuntimeEvidence.project_id == project_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_evidence_by_hash(
        self, project_id: uuid.UUID, payload_hash: str
    ) -> Optional[RuntimeEvidence]:
        stmt = select(RuntimeEvidence).where(
            and_(
                RuntimeEvidence.project_id == project_id,
                RuntimeEvidence.payload_hash == payload_hash,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def get_evidence_by_source_event_id(
        self, source_id: str, source_event_id: str
    ) -> Optional[RuntimeEvidence]:
        stmt = select(RuntimeEvidence).where(
            and_(
                RuntimeEvidence.source_id == source_id,
                RuntimeEvidence.source_event_id == source_event_id,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_evidence(
        self,
        project_id: uuid.UUID,
        source_type: Optional[str] = None,
        event_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        environment: Optional[str] = None,
        status: Optional[str] = None,
        trace_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[RuntimeEvidence]:
        stmt = (
            select(RuntimeEvidence)
            .options(selectinload(RuntimeEvidence.correlations))
            .where(RuntimeEvidence.project_id == project_id)
            .order_by(desc(RuntimeEvidence.occurred_at))
        )
        if source_type:
            stmt = stmt.where(RuntimeEvidence.source_type == source_type)
        if event_type:
            stmt = stmt.where(RuntimeEvidence.event_type == event_type)
        if subject_id:
            stmt = stmt.where(RuntimeEvidence.subject_id == subject_id)
        if resource_id:
            stmt = stmt.where(RuntimeEvidence.resource_id == resource_id)
        if environment:
            stmt = stmt.where(RuntimeEvidence.environment == environment)
        if status:
            stmt = stmt.where(RuntimeEvidence.status == status)
        if trace_id:
            stmt = stmt.where(RuntimeEvidence.trace_id == trace_id)

        stmt = stmt.limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def list_all_evidence(
        self,
        project_ids: Optional[List[uuid.UUID]] = None,
        source_type: Optional[str] = None,
        event_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        environment: Optional[str] = None,
        status: Optional[str] = None,
        trace_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[RuntimeEvidence]:
        stmt = (
            select(RuntimeEvidence)
            .options(selectinload(RuntimeEvidence.correlations))
            .order_by(desc(RuntimeEvidence.occurred_at))
        )
        if project_ids is not None:
            stmt = stmt.where(RuntimeEvidence.project_id.in_(project_ids))
        if source_type:
            stmt = stmt.where(RuntimeEvidence.source_type == source_type)
        if event_type:
            stmt = stmt.where(RuntimeEvidence.event_type == event_type)
        if subject_id:
            stmt = stmt.where(RuntimeEvidence.subject_id == subject_id)
        if resource_id:
            stmt = stmt.where(RuntimeEvidence.resource_id == resource_id)
        if environment:
            stmt = stmt.where(RuntimeEvidence.environment == environment)
        if status:
            stmt = stmt.where(RuntimeEvidence.status == status)
        if trace_id:
            stmt = stmt.where(RuntimeEvidence.trace_id == trace_id)

        stmt = stmt.limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ==================== SOURCES ====================

    async def create_source(self, source: RuntimeEvidenceSource) -> RuntimeEvidenceSource:
        self.session.add(source)
        await self.session.flush()
        return source

    async def get_source_by_id(
        self, source_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[RuntimeEvidenceSource]:
        stmt = select(RuntimeEvidenceSource).where(RuntimeEvidenceSource.id == source_id)
        if project_id:
            stmt = stmt.where(RuntimeEvidenceSource.project_id == project_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_source_by_name(
        self, project_id: uuid.UUID, name: str
    ) -> Optional[RuntimeEvidenceSource]:
        stmt = select(RuntimeEvidenceSource).where(
            and_(
                RuntimeEvidenceSource.project_id == project_id,
                RuntimeEvidenceSource.name == name,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_sources(self, project_id: uuid.UUID) -> List[RuntimeEvidenceSource]:
        stmt = (
            select(RuntimeEvidenceSource)
            .where(RuntimeEvidenceSource.project_id == project_id)
            .order_by(RuntimeEvidenceSource.name)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def update_source_activity(
        self,
        source_id: uuid.UUID,
        status: Optional[str] = None,
        last_event_at: Optional[datetime] = None,
    ) -> None:
        source = await self.get_source_by_id(source_id)
        if source:
            if status:
                source.status = status
            now = datetime.now(timezone.utc)
            source.last_seen_at = now
            if last_event_at:
                source.last_event_at = last_event_at
            await self.session.flush()

    # ==================== CORRELATIONS ====================

    async def save_correlations(self, correlations: List[EvidenceCorrelation]) -> None:
        for c in correlations:
            self.session.add(c)
        await self.session.flush()

    async def find_evidence_by_correlation_key(
        self, project_id: uuid.UUID, correlation_key: str
    ) -> List[RuntimeEvidence]:
        stmt = (
            select(RuntimeEvidence)
            .join(EvidenceCorrelation, EvidenceCorrelation.evidence_id == RuntimeEvidence.id)
            .where(
                and_(
                    RuntimeEvidence.project_id == project_id,
                    EvidenceCorrelation.correlation_key == correlation_key,
                )
            )
            .order_by(RuntimeEvidence.occurred_at)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ==================== CONTRACTS & VERIFICATIONS ====================

    async def get_active_contract_versions(
        self, project_id: uuid.UUID
    ) -> List[SecurityContractVersion]:
        """
        Retrieves all currently ACTIVE contract versions for a project.
        """
        stmt = (
            select(SecurityContractVersion)
            .join(SecurityContract, SecurityContract.id == SecurityContractVersion.contract_id)
            .options(
                selectinload(SecurityContractVersion.scopes),
                selectinload(SecurityContractVersion.evidence_requirements),
                selectinload(SecurityContractVersion.contract),
            )
            .where(
                and_(
                    SecurityContract.project_id == project_id,
                    SecurityContract.status == "ACTIVE",
                    or_(
                        SecurityContractVersion.status == "ACTIVE",
                        SecurityContract.current_version_id == SecurityContractVersion.id,
                    ),
                )
            )
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def create_verification(
        self, verification: SecurityContractVerification
    ) -> SecurityContractVerification:
        self.session.add(verification)
        await self.session.flush()
        return verification

    async def get_verification_by_id(
        self, verification_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[SecurityContractVerification]:
        stmt = (
            select(SecurityContractVerification)
            .options(
                selectinload(SecurityContractVerification.contract_version).selectinload(
                    SecurityContractVersion.contract
                )
            )
            .where(SecurityContractVerification.id == verification_id)
        )
        if project_id:
            stmt = stmt.where(SecurityContractVerification.project_id == project_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_verifications(
        self,
        project_id: uuid.UUID,
        contract_version_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[SecurityContractVerification]:
        stmt = (
            select(SecurityContractVerification)
            .options(
                selectinload(SecurityContractVerification.contract_version).selectinload(
                    SecurityContractVersion.contract
                )
            )
            .where(SecurityContractVerification.project_id == project_id)
            .order_by(desc(SecurityContractVerification.evaluated_at))
        )
        if contract_version_id:
            stmt = stmt.where(
                SecurityContractVerification.contract_version_id == contract_version_id
            )
        if status:
            stmt = stmt.where(SecurityContractVerification.status == status)

        stmt = stmt.limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ==================== VIOLATIONS ====================

    async def create_violation(
        self, violation: SecurityContractViolation
    ) -> SecurityContractViolation:
        self.session.add(violation)
        await self.session.flush()
        return violation

    async def get_violation_by_id(
        self, violation_id: uuid.UUID, project_id: Optional[uuid.UUID] = None
    ) -> Optional[SecurityContractViolation]:
        stmt = (
            select(SecurityContractViolation)
            .options(
                selectinload(SecurityContractViolation.contract_version).selectinload(
                    SecurityContractVersion.contract
                )
            )
            .where(SecurityContractViolation.id == violation_id)
        )
        if project_id:
            stmt = stmt.where(SecurityContractViolation.project_id == project_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_violations(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[SecurityContractViolation]:
        stmt = (
            select(SecurityContractViolation)
            .options(
                selectinload(SecurityContractViolation.contract_version).selectinload(
                    SecurityContractVersion.contract
                )
            )
            .where(SecurityContractViolation.project_id == project_id)
            .order_by(desc(SecurityContractViolation.detected_at))
        )
        if status:
            stmt = stmt.where(SecurityContractViolation.status == status)
        if severity:
            stmt = stmt.where(SecurityContractViolation.severity == severity)

        stmt = stmt.limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
