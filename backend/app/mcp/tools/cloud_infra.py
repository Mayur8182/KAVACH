"""
THING MCP Tools — Cloud & Infrastructure Handlers
Provides tools for `cloud-agent` and `infra-agent` to audit multi-cloud resources,
IAM principals, container images, and Kubernetes workload security.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

from app.cloud.service import CloudService
from app.models.docker_models import DockerImage, ContainerImageFinding
from app.models.kubernetes_models import KubernetesWorkload
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project


async def execute_audit_cloud_posture(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Audits cloud security posture, active observations, and IAM security for the project.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err
    proj_uuid = project.id

    cloud_service = CloudService(db)
    overview = await cloud_service.get_overview(proj_uuid)
    findings = await cloud_service.list_findings(proj_uuid, limit=20)
    iam = await cloud_service.list_iam(proj_uuid)

    data = {
        "status": "ANALYZED",
        "posture_score": overview.posture_score,
        "critical_issues": overview.critical_issues,
        "high_issues": overview.high_issues,
        "active_findings": [f.model_dump() for f in findings.items],
        "iam_summary": {
            "total_principals": iam.total_principals,
            "overprivileged_count": iam.overprivileged_count,
            "inactive_keys_count": iam.inactive_keys_count,
        },
    }

    return ToolExecutionResult(
        status="SUCCESS",
        data=data,
        message=f"Cloud posture audited. Score: {overview.posture_score}%. {overview.critical_issues} critical finding(s).",
    )


async def execute_get_cloud_inventory(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Lists real cloud assets and infrastructure resources across connected providers.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err
    proj_uuid = project.id

    cloud_service = CloudService(db)
    assets = await cloud_service.get_assets(project_id=str(proj_uuid), limit=arguments.get("limit", 50))

    items_dumped = [a.model_dump() if hasattr(a, "model_dump") else dict(a) for a in assets.items]
    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(proj_uuid),
            "project_name": project.name,
            "total_assets": assets.total,
            "total_resources": assets.total,
            "assets": items_dumped,
            "resources": items_dumped,
        },
        message=f"Retrieved {len(assets.items)} verified cloud asset(s) for project '{project.name}'.",
    )


async def execute_scan_container_image_security(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Inspects Docker container images and CVE vulnerabilities.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err
    proj_uuid = project.id

    stmt = select(DockerImage).where(DockerImage.project_id == proj_uuid).order_by(desc(DockerImage.created_at)).limit(20)
    res = await db.execute(stmt)
    images = res.scalars().all()

    findings_summary = []
    for img in images:
        f_stmt = select(ContainerImageFinding).where(ContainerImageFinding.image_id == img.id)
        f_res = await db.execute(f_stmt)
        cves = f_res.scalars().all()
        findings_summary.append({
            "image_id": str(img.id),
            "repository": img.repository,
            "tag": img.tag,
            "total_cves": len(cves),
            "critical_cves": len([c for c in cves if str(c.severity).upper() == "CRITICAL"]),
            "findings": [
                {"cve_id": c.vulnerability_id, "severity": c.severity, "package": c.package}
                for c in cves[:10]
            ],
        })

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "images_scanned": len(images),
            "images": findings_summary,
        },
        message=f"Container image security audited for {len(images)} image(s).",
    )
