import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.scan import SecurityScan, SecurityFinding
from app.models.incident_models import SecurityIncident
from app.models.integration import Integration
from app.models.audit_event import AuditEvent
from app.home.schemas.overview import (
    HomeOverviewResponse,
    HomeScope,
    AttentionSummary,
    IncidentsSummary,
    CoverageMetric,
    SecurityStateResponse,
    SecurityStateFactor,
    SecurityStateMethodology,
)


class HomeOverviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(
        self,
        project_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        environment_id: Optional[str] = None,
    ) -> HomeOverviewResponse:
        now = datetime.now(timezone.utc)
        proj_uuid = uuid.UUID(project_id) if project_id else None

        # 1. Attention: Count findings by severity from actual scanner records in a single GROUP BY
        sev_q = select(SecurityFinding.severity, func.count(SecurityFinding.id))
        if proj_uuid:
            sev_q = sev_q.outerjoin(SecurityScan, SecurityFinding.scan_id == SecurityScan.id).where(
                or_(
                    SecurityFinding.project_id == proj_uuid,
                    SecurityScan.project_id == proj_uuid,
                )
            )
        sev_q = sev_q.group_by(SecurityFinding.severity)
        sev_map = dict((await self.db.execute(sev_q)).all())
        crit_count = sev_map.get("CRITICAL", 0)
        high_count = sev_map.get("HIGH", 0)
        med_count = sev_map.get("MEDIUM", 0)
        low_count = sev_map.get("LOW", 0) + sev_map.get("INFORMATIONAL", 0)

        # 2. Incidents: Count actual incidents from security_incidents table in a single GROUP BY
        inc_q = select(SecurityIncident.status, func.count(SecurityIncident.id))
        if proj_uuid:
            inc_q = inc_q.where(SecurityIncident.project_id == proj_uuid)
        inc_q = inc_q.group_by(SecurityIncident.status)
        try:
            inc_map = dict((await self.db.execute(inc_q)).all())
        except Exception:
            inc_map = {}
        inc_open = inc_map.get("OPEN", 0) + inc_map.get("DETECTED", 0) + inc_map.get("TRIAGE", 0)
        inc_inv = inc_map.get("INVESTIGATING", 0)
        inc_cont = inc_map.get("CONTAINED", 0) + inc_map.get("CONTAINMENT_IN_PROGRESS", 0)
        inc_close = inc_map.get("CLOSED", 0)

        # 3. Coverage: Calculate real inventory in parallel / consolidated queries
        total_projects_q = select(func.count(Project.id))
        total_projects = (await self.db.execute(total_projects_q)).scalar() or 0

        scanned_projects_q = select(func.count(func.distinct(SecurityScan.project_id))).where(SecurityScan.status == "COMPLETED")
        scanned_projects = (await self.db.execute(scanned_projects_q)).scalar() or 0

        intg_q = select(Integration.is_connected, func.count(Integration.id))
        if proj_uuid:
            intg_q = intg_q.where(Integration.project_id == proj_uuid)
        intg_q = intg_q.group_by(Integration.is_connected)
        try:
            intg_map = dict((await self.db.execute(intg_q)).all())
        except Exception:
            intg_map = {}
        conn_intgs = intg_map.get(True, 0)
        total_intgs = sum(intg_map.values())

        return HomeOverviewResponse(
            generated_at=now,
            scope=HomeScope(
                organization_id=organization_id,
                project_id=project_id,
                environment_id=environment_id,
            ),
            attention=AttentionSummary(
                critical=crit_count,
                high=high_count,
                medium=med_count,
                low=low_count,
            ),
            incidents=IncidentsSummary(
                open=inc_open,
                investigating=inc_inv,
                contained=inc_cont,
                closed=inc_close,
            ),
            coverage={
                "code": CoverageMetric(
                    covered=scanned_projects,
                    total=total_projects,
                    unit="repositories",
                ),
                "cloud": CoverageMetric(
                    covered=conn_intgs,
                    total=total_intgs if total_intgs > 0 else 1,
                    unit="cloud_environments",
                ),
            },
        )

    async def get_security_state(
        self,
        project_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        environment_id: Optional[str] = None,
    ) -> SecurityStateResponse:
        now = datetime.now(timezone.utc)
        proj_uuid = uuid.UUID(project_id) if project_id else None

        # Count critical & high findings in single grouped query
        sev_q = select(SecurityFinding.severity, func.count(SecurityFinding.id)).where(
            SecurityFinding.severity.in_(["CRITICAL", "HIGH"])
        )
        if proj_uuid:
            sev_q = sev_q.outerjoin(SecurityScan, SecurityFinding.scan_id == SecurityScan.id).where(
                or_(
                    SecurityFinding.project_id == proj_uuid,
                    SecurityScan.project_id == proj_uuid,
                )
            )
        sev_q = sev_q.group_by(SecurityFinding.severity)
        sev_map = dict((await self.db.execute(sev_q)).all())
        crit_count = sev_map.get("CRITICAL", 0)
        high_count = sev_map.get("HIGH", 0)

        # Count open incidents
        inc_q = select(func.count(SecurityIncident.id)).where(SecurityIncident.status.in_(["OPEN", "DETECTED", "TRIAGE"]))
        if proj_uuid:
            inc_q = inc_q.where(SecurityIncident.project_id == proj_uuid)
        try:
            inc_count = (await self.db.execute(inc_q)).scalar() or 0
        except Exception:
            inc_count = 0

        # Count disconnected integrations
        disc_q = select(func.count(Integration.id)).where(Integration.is_connected == False)
        if proj_uuid:
            disc_q = disc_q.where(Integration.project_id == proj_uuid)
        try:
            disc_intgs = (await self.db.execute(disc_q)).scalar() or 0
        except Exception:
            disc_intgs = 0

        # Total completed scans
        scans_q = select(func.count(SecurityScan.id)).where(SecurityScan.status == "COMPLETED")
        if proj_uuid:
            scans_q = scans_q.where(SecurityScan.project_id == proj_uuid)
        total_scans = (await self.db.execute(scans_q)).scalar() or 0

        # Total audit events (evidence)
        audit_q = select(func.count(AuditEvent.id))
        if proj_uuid:
            audit_q = audit_q.where(AuditEvent.project_id == proj_uuid)
        evidence_count = (await self.db.execute(audit_q)).scalar() or 0

        # Deterministic state rules
        reason_codes = []
        factors = []

        if crit_count > 0:
            reason_codes.append("OPEN_CRITICAL_FINDINGS")
            factors.append(SecurityStateFactor(code="OPEN_CRITICAL_FINDINGS", value=crit_count, description=f"{crit_count} open critical vulnerability findings require remediation"))

        if inc_count > 0:
            reason_codes.append("OPEN_INCIDENTS")
            factors.append(SecurityStateFactor(code="OPEN_INCIDENTS", value=inc_count, description=f"{inc_count} active security incidents in triage"))

        if high_count > 0:
            reason_codes.append("OPEN_HIGH_FINDINGS")
            factors.append(SecurityStateFactor(code="OPEN_HIGH_FINDINGS", value=high_count, description=f"{high_count} open high-severity findings"))

        if disc_intgs > 0:
            reason_codes.append("DEGRADED_INTEGRATIONS")
            factors.append(SecurityStateFactor(code="DEGRADED_INTEGRATIONS", value=disc_intgs, description=f"{disc_intgs} integrations disconnected or failing authentication"))

        # Determine overall state
        if crit_count > 0 or inc_count > 0:
            state = "CRITICAL"
        elif high_count > 0 or disc_intgs > 0:
            state = "ATTENTION"
        elif total_scans > 0:
            state = "HEALTHY"
        else:
            state = "UNKNOWN"
            reason_codes.append("UNVERIFIED_ENVIRONMENT")
            factors.append(SecurityStateFactor(code="UNVERIFIED_ENVIRONMENT", value=0, description="No completed verification scans recorded for this scope"))

        return SecurityStateResponse(
            state=state,
            reason_codes=reason_codes,
            factors=factors,
            evidence_count=evidence_count + crit_count + high_count,
            calculated_at=now,
            methodology=SecurityStateMethodology(),
        )
