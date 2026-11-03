import uuid
from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.scan import SecurityScan
from app.models.integration import Integration
from app.models.agent import Agent
from app.home.schemas.coverage import HomeCoverageResponse, CoverageDetail


class HomeCoverageService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_coverage(
        self,
        project_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        environment_id: Optional[str] = None,
    ) -> HomeCoverageResponse:
        proj_uuid = uuid.UUID(project_id) if project_id else None

        # 1. Code Repositories
        total_proj_q = select(func.count(Project.id))
        scanned_proj_q = select(func.count(func.distinct(SecurityScan.project_id))).where(SecurityScan.status == "COMPLETED")

        total_projects = (await self.db.execute(total_proj_q)).scalar() or 0
        scanned_projects = (await self.db.execute(scanned_proj_q)).scalar() or 0

        # 2. Cloud Environments
        cloud_total_q = select(func.count(Integration.id)).where(Integration.provider.in_(["aws", "gcp", "azure", "kubernetes"]))
        cloud_conn_q = select(func.count(Integration.id)).where(
            Integration.provider.in_(["aws", "gcp", "azure", "kubernetes"]),
            Integration.is_connected == True,
        )
        if proj_uuid:
            cloud_total_q = cloud_total_q.where(Integration.project_id == proj_uuid)
            cloud_conn_q = cloud_conn_q.where(Integration.project_id == proj_uuid)

        cloud_total = (await self.db.execute(cloud_total_q)).scalar() or 0
        cloud_conn = (await self.db.execute(cloud_conn_q)).scalar() or 0

        # 3. Agent Governance
        agent_total_q = select(func.count(Agent.id))
        agent_gov_q = select(func.count(Agent.id)).where(Agent.status == "ACTIVE")
        if proj_uuid:
            agent_total_q = agent_total_q.where(Agent.project_id == proj_uuid)
            agent_gov_q = agent_gov_q.where(Agent.project_id == proj_uuid)

        try:
            agent_total = (await self.db.execute(agent_total_q)).scalar() or 0
            agent_gov = (await self.db.execute(agent_gov_q)).scalar() or 0
        except Exception:
            agent_total = 0
            agent_gov = 0

        # Status classifications
        code_status = "COMPLETE" if scanned_projects >= total_projects and total_projects > 0 else ("PARTIAL" if scanned_projects > 0 else "NOT_CONFIGURED")
        cloud_status = "COMPLETE" if cloud_conn >= cloud_total and cloud_total > 0 else ("PARTIAL" if cloud_conn > 0 else "NOT_CONFIGURED")
        agent_status = "COMPLETE" if agent_gov >= agent_total and agent_total > 0 else ("PARTIAL" if agent_gov > 0 else "NOT_CONFIGURED")

        return HomeCoverageResponse(
            code=CoverageDetail(
                covered=scanned_projects,
                total=total_projects,
                unit="repositories",
                status=code_status,
            ),
            cloud=CoverageDetail(
                covered=cloud_conn,
                total=cloud_total if cloud_total > 0 else 0,
                unit="cloud_environments",
                status=cloud_status,
            ),
            protect=CoverageDetail(
                covered=1 if scanned_projects > 0 else 0,
                total=1,
                unit="runtime_sensors",
                status="COMPLETE" if scanned_projects > 0 else "NOT_CONFIGURED",
            ),
            agent=CoverageDetail(
                covered=agent_gov,
                total=agent_total,
                unit="agents",
                status=agent_status,
            ),
            data=CoverageDetail(
                covered=cloud_conn,
                total=cloud_total if cloud_total > 0 else 0,
                unit="data_assets",
                status=cloud_status,
            ),
        )
