import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.integration import Integration
from app.home.schemas.health import ProductHealthItem, HomeProductHealthResponse


class HomeHealthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_product_health(
        self,
        project_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        environment_id: Optional[str] = None,
    ) -> HomeProductHealthResponse:
        proj_uuid = uuid.UUID(project_id) if project_id else None

        if not proj_uuid:
            from app.models.project import Project
            p_stmt = select(Project).limit(1)
            first_p = (await self.db.execute(p_stmt)).scalar_one_or_none()
            if first_p:
                proj_uuid = first_p.id

        intg_q = select(Integration)
        if proj_uuid:
            intg_q = intg_q.where(Integration.project_id == proj_uuid)

        integrations = (await self.db.execute(intg_q)).scalars().all()
        connected_integrations = [i for i in integrations if i.is_connected]
        providers_map = {i.provider.lower(): i.is_connected for i in integrations}

        # Code Security health: requires active GitHub/GitLab integration reporting
        github_connected = providers_map.get("github", False) or providers_map.get("gitlab", False)
        if not integrations or ("github" not in providers_map and "gitlab" not in providers_map):
            code_status = "NOT_CONFIGURED"
            code_msg = "No code repository connected"
        elif github_connected:
            code_status = "HEALTHY"
            code_msg = "SAST & Secret scanners active"
        else:
            code_status = "DISCONNECTED"
            code_msg = "Code repository disconnected"

        # Cloud health
        cloud_providers = [p for p in ["aws", "gcp", "azure", "kubernetes"] if p in providers_map]
        cloud_connected = [p for p in cloud_providers if providers_map[p]]
        if not cloud_providers:
            cloud_status = "NOT_CONFIGURED"
            cloud_msg = "No cloud connectors configured"
        elif len(cloud_connected) == len(cloud_providers):
            cloud_status = "HEALTHY"
            cloud_msg = f"{len(cloud_connected)} cloud providers reporting telemetry"
        elif len(cloud_connected) > 0:
            cloud_status = "DEGRADED"
            cloud_msg = f"{len(cloud_connected)} of {len(cloud_providers)} cloud providers connected"
        else:
            cloud_status = "DISCONNECTED"
            cloud_msg = "All configured cloud providers disconnected"

        # Runtime agent health: requires at least one connected integration that reports telemetry
        any_connected = bool(cloud_connected) or github_connected
        protect_status = "HEALTHY" if any_connected else "NOT_CONFIGURED"
        protect_msg = (
            "Runtime invariant engine active" if any_connected
            else "No telemetry sources — runtime protection inactive"
        )

        # MCP/OPA Agent: Only show active if there are connected integrations feeding policy engine
        agent_status = "HEALTHY" if any_connected else "NOT_CONFIGURED"
        agent_msg = (
            "MCP Security Gateway online" if any_connected
            else "Policy engine awaiting telemetry connection"
        )

        # SOC: only meaningful if there are incidents or at least cloud/code connected
        soc_status = "NOT_CONFIGURED" if not any_connected else "HEALTHY"
        soc_msg = (
            "Incident response queue active" if any_connected
            else "No telemetry sources — SOC correlation not active"
        )

        items: List[ProductHealthItem] = [
            ProductHealthItem(
                product="code",
                name="Thing Code",
                status=code_status,
                message=code_msg,
            ),
            ProductHealthItem(
                product="cloud",
                name="Thing Cloud",
                status=cloud_status,
                message=cloud_msg,
            ),
            ProductHealthItem(
                product="protect",
                name="Thing Protect",
                status=protect_status,
                message=protect_msg,
            ),
            ProductHealthItem(
                product="agent",
                name="Thing Agent",
                status=agent_status,
                message=agent_msg,
            ),
            ProductHealthItem(
                product="data",
                name="Thing Data",
                status="HEALTHY" if cloud_connected else "NOT_CONFIGURED",
                message="DLP monitoring active" if cloud_connected else "Data discovery not configured",
            ),
            ProductHealthItem(
                product="soc",
                name="Thing SOC",
                status=soc_status,
                message=soc_msg,
            ),
        ]

        overall = "NOT_CONFIGURED"
        statuses = [i.status for i in items]
        if any(s == "DISCONNECTED" for s in statuses):
            overall = "DEGRADED"
        elif any(s == "DEGRADED" for s in statuses):
            overall = "DEGRADED"
        elif any(s == "HEALTHY" for s in statuses):
            overall = "HEALTHY"

        return HomeProductHealthResponse(
            items=items,
            overall_health=overall,
        )
