import uuid
from typing import List, Optional
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scan import SecurityFinding, SecurityScan
from app.models.incident_models import SecurityIncident
from app.models.audit_event import AuditEvent
from app.home.schemas.attention import AttentionItem, AttentionListResponse


class HomeAttentionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_attention_items(
        self,
        project_id: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 15,
    ) -> AttentionListResponse:
        items: List[AttentionItem] = []
        proj_uuid = uuid.UUID(project_id) if project_id else None

        # 1. Findings (Critical & High)
        find_q = select(SecurityFinding, SecurityScan).outerjoin(SecurityScan, SecurityFinding.scan_id == SecurityScan.id)
        if proj_uuid:
            find_q = find_q.where(
                or_(
                    SecurityFinding.project_id == proj_uuid,
                    SecurityScan.project_id == proj_uuid,
                )
            )
        if severity:
            find_q = find_q.where(SecurityFinding.severity == severity.upper())
        else:
            find_q = find_q.where(SecurityFinding.severity.in_(["CRITICAL", "HIGH"]))

        find_q = find_q.order_by(desc(SecurityFinding.created_at)).limit(limit)
        find_res = await self.db.execute(find_q)

        crit_count = 0
        high_count = 0

        for finding, scan in find_res.all():
            sev = finding.severity.upper()
            if sev == "CRITICAL":
                crit_count += 1
            elif sev == "HIGH":
                high_count += 1

            items.append(
                AttentionItem(
                    id=str(finding.id),
                    severity=sev,
                    title=finding.title,
                    description=finding.description,
                    product="Thing Code",
                    resource=finding.file_path or (scan.target_path if scan else None) or "Source Repository",
                    timestamp=finding.created_at,
                    status="OPEN",
                    evidence_reference=finding.rule_id,
                    drilldown_url=f"/code?findingId={finding.id}",
                )
            )

        # 2. Active Incidents
        inc_q = select(SecurityIncident).where(
            SecurityIncident.status.in_(["OPEN", "DETECTED", "TRIAGE", "INVESTIGATING"])
        )
        if proj_uuid:
            inc_q = inc_q.where(SecurityIncident.project_id == proj_uuid)
        inc_q = inc_q.order_by(desc(SecurityIncident.detected_at)).limit(limit)

        try:
            inc_res = await self.db.execute(inc_q)
            for inc in inc_res.scalars().all():
                sev = (inc.severity or "HIGH").upper()
                if sev == "CRITICAL":
                    crit_count += 1
                else:
                    high_count += 1

                items.append(
                    AttentionItem(
                        id=str(inc.id),
                        severity=sev,
                        title=inc.title,
                        description=inc.description,
                        product="Thing SOC",
                        resource=inc.incident_key,
                        timestamp=inc.detected_at,
                        status=inc.status,
                        evidence_reference=inc.incident_key,
                        drilldown_url=f"/soc?incidentId={inc.id}",
                    )
                )
        except Exception:
            # Handle if incidents table is empty or unpopulated
            pass

        # Sort combined items by timestamp descending
        items.sort(key=lambda x: x.timestamp, reverse=True)
        trimmed_items = items[:limit]

        return AttentionListResponse(
            items=trimmed_items,
            total=len(items),
            critical_count=crit_count,
            high_count=high_count,
        )
