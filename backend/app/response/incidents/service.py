"""
Security Incident Management Service for Step 14.
Groups correlated violations, response actions, and evidence into high-level incidents.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.contracts.models import SecurityContractViolation
from app.response.models import SecurityIncident, SecurityIncidentEvent, SecurityResponseAction


class SecurityIncidentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def correlate_incident_for_violation(
        self,
        violation: SecurityContractViolation,
    ) -> SecurityIncident:
        now = datetime.now(timezone.utc)

        # Look for open incident for this project with matching violation type
        stmt = select(SecurityIncident).where(
            SecurityIncident.project_id == violation.project_id,
            SecurityIncident.status.in_(["OPEN", "INVESTIGATING"]),
            SecurityIncident.title.like(f"%{violation.violation_type}%"),
        ).order_by(SecurityIncident.last_detected_at.desc())

        incident = (await self.db.execute(stmt)).scalars().first()

        if incident:
            incident.last_detected_at = now
            incident.severity = violation.severity or incident.severity
        else:
            incident = SecurityIncident(
                id=uuid.uuid4(),
                project_id=violation.project_id,
                title=f"Incident: {violation.violation_type} ({violation.severity or 'HIGH'})",
                status="OPEN",
                severity=violation.severity or "HIGH",
                first_detected_at=now,
                last_detected_at=now,
                primary_violation_id=violation.id,
                created_at=now,
                updated_at=now,
            )
            self.db.add(incident)
            await self.db.flush()

        # Link event
        event = SecurityIncidentEvent(
            id=uuid.uuid4(),
            incident_id=incident.id,
            event_type="VIOLATION",
            event_id=str(violation.id),
            created_at=now,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(incident)

        return incident

    async def record_response_event(
        self,
        incident_id: uuid.UUID,
        action: SecurityResponseAction,
    ) -> SecurityIncidentEvent:
        event = SecurityIncidentEvent(
            id=uuid.uuid4(),
            incident_id=incident_id,
            event_type="RESPONSE",
            event_id=str(action.id),
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(event)

        # If action completed, update incident status to CONTAINED
        if action.status == "COMPLETED":
            incident = await self.db.get(SecurityIncident, incident_id)
            if incident and incident.status == "OPEN":
                incident.status = "CONTAINED"

        await self.db.commit()
        return event

    async def list_incidents(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> List[SecurityIncident]:
        stmt = select(SecurityIncident).where(SecurityIncident.project_id == project_id)
        if status:
            stmt = stmt.where(SecurityIncident.status == status)
        stmt = stmt.order_by(SecurityIncident.last_detected_at.desc())
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_incident(
        self,
        incident_id: uuid.UUID,
    ) -> Optional[SecurityIncident]:
        stmt = select(SecurityIncident).where(SecurityIncident.id == incident_id).options(
            selectinload(SecurityIncident.events)
        )
        return (await self.db.execute(stmt)).scalars().first()
