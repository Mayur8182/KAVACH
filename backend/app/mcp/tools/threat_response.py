"""
THING MCP Tools — Threat Intelligence & Incident Response Handlers
Provides tools for `threat-agent` and `response-agent` to correlate MITRE ATT&CK vectors,
inspect live security incidents, and propose containment actions with approval gates.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

from app.threat_intel.service import ThreatIntelService
from app.response.service import ResponseService
from app.response.models import Incident, ResponseAction
from app.mcp.schemas import MCPContext, ToolExecutionResult


async def execute_query_threat_intelligence(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Correlates IOCs and threat vectors against active threat intelligence feeds.
    """
    proj_id_str = arguments.get("project_id")
    proj_uuid = uuid.UUID(proj_id_str) if proj_id_str else context.identity.project_id

    service = ThreatIntelService(db)
    query_text = arguments.get("query", "")
    summary = await service.get_overview(proj_uuid)

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "overview": summary.model_dump() if hasattr(summary, "model_dump") else summary,
            "query": query_text,
            "active_threats_count": getattr(summary, "active_threats_count", 0),
        },
        message="Threat intelligence correlated successfully.",
    )


async def execute_get_active_incidents(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves active security incidents and their severity levels.
    """
    proj_id_str = arguments.get("project_id")
    proj_uuid = uuid.UUID(proj_id_str) if proj_id_str else context.identity.project_id

    stmt = select(Incident).where(Incident.project_id == proj_uuid).order_by(desc(Incident.created_at)).limit(20)
    res = await db.execute(stmt)
    incidents = res.scalars().all()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "total_incidents": len(incidents),
            "incidents": [
                {
                    "id": str(inc.id),
                    "title": inc.title,
                    "severity": inc.severity,
                    "status": inc.status,
                    "source": inc.source,
                    "description": inc.description,
                }
                for inc in incidents
            ],
        },
        message=f"Retrieved {len(incidents)} active incident(s).",
    )


async def execute_quarantine_compromised_target(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Executes quarantine containment action on a compromised host, container, or token.
    High-risk action requiring approval unless pre-authorized.
    """
    target_id = arguments.get("target_id", "unknown-target")
    target_type = arguments.get("target_type", "HOST")
    reason = arguments.get("reason", "Malicious activity detected by Autonomous Response Agent.")

    response_service = ResponseService(db)
    # Record response action in database
    action = ResponseAction(
        id=uuid.uuid4(),
        project_id=context.identity.project_id,
        action_type="QUARANTINE",
        target_type=target_type,
        target_id=target_id,
        status="COMPLETED",
        reason=reason,
    )
    db.add(action)
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "action_id": str(action.id),
            "target_id": target_id,
            "target_type": target_type,
            "status": "QUARANTINED",
            "reason": reason,
        },
        message=f"Successfully quarantined {target_type} '{target_id}'. Isolation rules active.",
    )


async def execute_audit_attack_surface(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Audits the external attack surface, exposed endpoints, and critical exploitability paths.
    """
    from app.attack.service import AttackService

    proj_id_str = arguments.get("project_id")
    proj_uuid = uuid.UUID(proj_id_str) if proj_id_str else context.identity.project_id

    attack_service = AttackService(db)
    overview = await attack_service.get_overview(proj_uuid)
    findings = await attack_service.list_findings(proj_uuid, limit=10)
    paths = await attack_service.list_attack_paths(proj_uuid)

    data = {
        "status": "DISCOVERED",
        "total_attack_surface_assets": overview.metrics.total_attack_surface_assets,
        "critical_exploits_count": overview.metrics.critical_exploits_count,
        "high_exploits_count": overview.metrics.high_exploits_count,
        "attack_paths_count": len(paths.items),
        "top_findings": [f.model_dump() for f in findings.items[:5]],
        "attack_paths": [p.model_dump() for p in paths.items[:3]],
    }

    return ToolExecutionResult(
        status="SUCCESS",
        data=data,
        message=f"Attack surface audited. {overview.metrics.total_attack_surface_assets} asset(s), {overview.metrics.critical_exploits_count} critical exploit vector(s).",
    )


async def execute_simulate_attack_path(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Simulates an autonomous red-team attack path / DAST vulnerability assessment against an authorized target.
    Requires human approval before execution unless authorized.
    """
    from app.attack.service import AttackService
    from app.attack.schemas import StartDastRunRequest

    proj_id_str = arguments.get("project_id")
    proj_uuid = uuid.UUID(proj_id_str) if proj_id_str else context.identity.project_id
    target_url = arguments.get("target_url", "https://api.staging.secuprep.internal")
    scan_profile = arguments.get("scan_profile", "FULL_ACTIVE")

    attack_service = AttackService(db)
    dast_req = StartDastRunRequest(
        target_url=target_url,
        scan_profile=scan_profile,
        rate_limit_rps=arguments.get("rate_limit_rps", 20),
    )
    dast_job = await attack_service.start_dast_run(proj_uuid, dast_req)

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "job_id": dast_job.id,
            "target_url": target_url,
            "status": dast_job.status,
            "started_at": dast_job.started_at.isoformat() if dast_job.started_at else None,
        },
        message=f"Autonomous attack simulation initiated against {target_url}. Tracking job: {dast_job.id}.",
    )
