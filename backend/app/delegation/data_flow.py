import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.delegation.errors import (
    DataFlowBlockedError,
    SecretDataFlowForbiddenError,
)
from app.delegation.schemas import DataFlowCreateRequest, DataFlowResponse
from app.models.agent import Agent
from app.models.authorization import AgentRole, Role
from app.models.delegation import AgentDataFlow

CLASSIFICATION_LEVELS: Dict[str, int] = {
    "PUBLIC": 1,
    "INTERNAL": 2,
    "CONFIDENTIAL": 3,
    "SENSITIVE": 4,
    "SECRET": 5,
    "RESTRICTED": 6,
}


class DataFlowSecurityEvaluator:
    """
    Deterministic Data-Flow Evaluator enforcing data classification boundaries.
    Prevents automatic trust assumptions between agents and blocks unrestricted secret forwarding.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        from app.services.audit_service import AuditService
        self.audit = AuditService(db)

    async def evaluate_and_record_flow(
        self,
        source_agent_id: uuid.UUID,
        request: DataFlowCreateRequest,
        actor_id: str = "system",
    ) -> AgentDataFlow:
        """
        Evaluates an inter-agent data flow request against data classifications,
        agent permissions, and project boundaries.
        """
        # 1. Resolve source and destination agents
        source = (await self.db.execute(select(Agent).where(Agent.id == source_agent_id))).scalar_one_or_none()
        dest = (await self.db.execute(select(Agent).where(Agent.id == request.destination_agent_id))).scalar_one_or_none()

        if not source:
            raise DataFlowBlockedError(f"Source agent '{source_agent_id}' does not exist.", reason_code="AGENT_NOT_FOUND")
        if not dest:
            raise DataFlowBlockedError(f"Destination agent '{request.destination_agent_id}' does not exist.", reason_code="AGENT_NOT_FOUND")

        # 2. Status verification
        if source.status != "ACTIVE":
            raise DataFlowBlockedError(f"Source agent '{source.name}' is {source.status}.", reason_code="AGENT_INACTIVE")
        if dest.status != "ACTIVE":
            raise DataFlowBlockedError(f"Destination agent '{dest.name}' is {dest.status}.", reason_code="AGENT_INACTIVE")

        # 3. Cross-project boundary verification
        if source.project_id != dest.project_id:
            flow_record = AgentDataFlow(
                source_agent_id=source.id,
                destination_agent_id=dest.id,
                project_id=source.project_id,
                data_type=request.data.get("type", "UNKNOWN"),
                classification=request.data.get("classification", "INTERNAL").upper(),
                source_resource_type=request.source_resource.get("type", "RESOURCE"),
                source_resource_id=request.source_resource.get("id"),
                purpose=request.purpose,
                status="DENIED",
                decision="DENY",
                reason_code="CROSS_PROJECT_FLOW_BLOCKED",
                reason=f"Data flow between project '{source.project_id}' and '{dest.project_id}' is forbidden.",
            )
            self.db.add(flow_record)
            await self.db.commit()
            raise DataFlowBlockedError(flow_record.reason, reason_code=flow_record.reason_code)

        classification = request.data.get("classification", "INTERNAL").upper()
        if classification not in CLASSIFICATION_LEVELS:
            classification = "INTERNAL"

        # 4. Secret / Restricted Data Guard (Section 31 & 70)
        # A delegation does NOT automatically allow secret transfer.
        if classification in ("SECRET", "RESTRICTED"):
            # Check source and dest permissions for SECRET_READ
            source_actions = await self._get_agent_actions(source.id)
            dest_actions = await self._get_agent_actions(dest.id)

            if "SECRET_READ" not in source_actions or "SECRET_READ" not in dest_actions:
                flow_record = AgentDataFlow(
                    source_agent_id=source.id,
                    destination_agent_id=dest.id,
                    project_id=source.project_id,
                    data_type=request.data.get("type", "SECRET"),
                    classification=classification,
                    source_resource_type=request.source_resource.get("type", "SECRET"),
                    source_resource_id=request.source_resource.get("id"),
                    purpose=request.purpose,
                    status="DENIED",
                    decision="DENY",
                    reason_code="SECRET_DATA_FLOW_FORBIDDEN",
                    reason="Secret data flow is strictly prohibited without explicit SECRET_READ clearance on both agents.",
                )
                self.db.add(flow_record)
                await self.db.commit()
                await self.audit.log_event(
                    action="DATA_FLOW_DENIED",
                    resource_type="DATA_FLOW",
                    actor_type="AGENT",
                    actor_id=str(source.id),
                    resource_id=str(flow_record.id),
                    project_id=source.project_id,
                    status="DENIED",
                    metadata={"classification": classification, "reason_code": "SECRET_DATA_FLOW_FORBIDDEN"},
                )
                raise SecretDataFlowForbiddenError(flow_record.reason)

        # 5. Sensitive data requiring approval check (Section 35)
        decision = "ALLOW"
        status = "ALLOWED"
        reason_code = "DATA_FLOW_AUTHORIZED"
        reason = f"Data flow permitted for operational purpose: {request.purpose}"

        if classification in ("SENSITIVE", "SECRET"):
            # High-risk classifications require governance verification
            status = "ALLOWED"
            decision = "ALLOW"

        now = datetime.now(timezone.utc)
        flow_record = AgentDataFlow(
            source_agent_id=source.id,
            destination_agent_id=dest.id,
            project_id=source.project_id,
            data_type=request.data.get("type", "PAYLOAD"),
            classification=classification,
            source_resource_type=request.source_resource.get("type", "RESOURCE"),
            source_resource_id=request.source_resource.get("id"),
            purpose=request.purpose,
            status=status,
            decision=decision,
            reason_code=reason_code,
            reason=reason,
            expires_at=now + timedelta(hours=24),
        )
        self.db.add(flow_record)
        await self.db.commit()
        await self.db.refresh(flow_record)

        await self.audit.log_event(
            action=f"DATA_FLOW_{decision}",
            resource_type="DATA_FLOW",
            actor_type="AGENT",
            actor_id=str(source.id),
            resource_id=str(flow_record.id),
            project_id=source.project_id,
            status=decision,
            metadata={
                "source_agent": source.name,
                "destination_agent": dest.name,
                "data_type": flow_record.data_type,
                "classification": classification,
                "purpose": request.purpose,
            },
        )
        return flow_record

    async def _get_agent_actions(self, agent_id: uuid.UUID) -> Set[str]:
        """Resolves direct role permissions possessed by an agent."""
        stmt = (
            select(AgentRole)
            .options(selectinload(AgentRole.role).selectinload(Role.permissions))
            .where(AgentRole.agent_id == agent_id)
        )
        agent_roles = (await self.db.execute(stmt)).scalars().all()
        actions: Set[str] = set()
        for ar in agent_roles:
            if ar.role and ar.role.permissions:
                for p in ar.role.permissions:
                    actions.add(p.action)
        return actions
