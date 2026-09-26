import uuid
from typing import List, Optional, Tuple
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.policy import (
    DecisionEvidence,
    SecurityApproval,
    SecurityDecision,
    SecurityPolicy,
    SecurityPolicyVersion,
)


class PolicyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_policy(
        self,
        policy: SecurityPolicy,
        initial_version: SecurityPolicyVersion,
    ) -> SecurityPolicy:
        self.session.add(policy)
        await self.session.flush()
        initial_version.policy_id = policy.id
        self.session.add(initial_version)
        await self.session.flush()
        return policy

    async def get_policy_by_id(self, policy_id: uuid.UUID) -> Optional[SecurityPolicy]:
        stmt = (
            select(SecurityPolicy)
            .where(SecurityPolicy.id == policy_id)
            .options(selectinload(SecurityPolicy.versions))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_policies_for_project(
        self,
        project_id: uuid.UUID,
        active_only: bool = False,
    ) -> List[SecurityPolicy]:
        stmt = (
            select(SecurityPolicy)
            .where(
                (SecurityPolicy.project_id == project_id) | (SecurityPolicy.project_id.is_(None))
            )
            .options(selectinload(SecurityPolicy.versions))
            .order_by(desc(SecurityPolicy.priority), desc(SecurityPolicy.created_at))
        )
        if active_only:
            stmt = stmt.where(SecurityPolicy.status == "ACTIVE")
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def create_policy_version(
        self,
        version: SecurityPolicyVersion,
    ) -> SecurityPolicyVersion:
        self.session.add(version)
        await self.session.flush()
        return version

    async def get_policy_versions(self, policy_id: uuid.UUID) -> List[SecurityPolicyVersion]:
        stmt = (
            select(SecurityPolicyVersion)
            .where(SecurityPolicyVersion.policy_id == policy_id)
            .order_by(desc(SecurityPolicyVersion.version))
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def get_policy_version(self, version_id: uuid.UUID) -> Optional[SecurityPolicyVersion]:
        stmt = select(SecurityPolicyVersion).where(SecurityPolicyVersion.id == version_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_decision_with_evidence(
        self,
        decision: SecurityDecision,
        evidence_items: List[DecisionEvidence],
    ) -> SecurityDecision:
        self.session.add(decision)
        await self.session.flush()
        for ev in evidence_items:
            ev.decision_id = decision.id
            self.session.add(ev)
        await self.session.flush()
        return decision

    async def get_decision_by_id(self, decision_id: uuid.UUID) -> Optional[SecurityDecision]:
        stmt = (
            select(SecurityDecision)
            .where(SecurityDecision.id == decision_id)
            .options(
                selectinload(SecurityDecision.evidence),
                selectinload(SecurityDecision.approvals),
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_decisions_for_project(
        self,
        project_id: uuid.UUID,
        limit: int = 50,
    ) -> List[SecurityDecision]:
        stmt = (
            select(SecurityDecision)
            .where(SecurityDecision.project_id == project_id)
            .options(
                selectinload(SecurityDecision.evidence),
                selectinload(SecurityDecision.approvals),
            )
            .order_by(desc(SecurityDecision.created_at))
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def create_approval(self, approval: SecurityApproval) -> SecurityApproval:
        self.session.add(approval)
        await self.session.flush()
        return approval

    async def get_approval_by_id(self, approval_id: uuid.UUID) -> Optional[SecurityApproval]:
        stmt = (
            select(SecurityApproval)
            .where(SecurityApproval.id == approval_id)
            .options(selectinload(SecurityApproval.decision))
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def list_pending_approvals_for_project(
        self,
        project_id: uuid.UUID,
    ) -> List[SecurityApproval]:
        stmt = (
            select(SecurityApproval)
            .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
            .where(
                SecurityDecision.project_id == project_id,
                SecurityApproval.status == "PENDING",
            )
            .options(selectinload(SecurityApproval.decision))
            .order_by(desc(SecurityApproval.requested_at))
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
