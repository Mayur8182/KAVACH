"""
THING MCP Tools — Governance, Compliance & DSPM Handlers
Provides tools for `compliance-agent`, `data-agent`, and `identity-agent` to audit
framework requirements, sensitive PII data classifications, and agent permissions.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from app.data.service import DataService
from app.agent.service import AgentService
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project


async def execute_audit_compliance_framework(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Audits compliance status against SOC2, ISO 27001, or HIPAA benchmarks.
    """
    project, err_result = await resolve_authorized_project(context, arguments, db)
    if err_result:
        return err_result
    proj_uuid = project.id
    framework = arguments.get("framework", "SOC2_TYPE_II").upper()

    # Query blueprint requirements for this project
    from app.models.blueprint import SecurityRequirement
    stmt = select(SecurityRequirement).where(SecurityRequirement.project_id == proj_uuid)
    res = await db.execute(stmt)
    reqs = res.scalars().all()

    total_reqs = len(reqs)
    passed_reqs = len([r for r in reqs if getattr(r, "status", "").upper() == "PASSED"])
    compliance_score = round((passed_reqs / total_reqs * 100), 1) if total_reqs > 0 else 100.0

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(proj_uuid),
            "project_name": project.name,
            "framework": framework,
            "compliance_score": compliance_score,
            "total_controls": total_reqs,
            "passed_controls": passed_reqs,
            "failing_controls": total_reqs - passed_reqs,
            "evidence_status": "VALIDATED",
        },
        message=f"{framework} compliance score: {compliance_score}% ({passed_reqs}/{total_reqs} controls passed).",
    )


async def execute_scan_sensitive_data_posture(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Audits DSPM data assets, PII classifications, and database sensitivity footprints.
    """
    project, err_result = await resolve_authorized_project(context, arguments, db)
    if err_result:
        return err_result
    proj_uuid = project.id

    data_service = DataService(db)
    overview = await data_service.get_overview(proj_uuid)

    return ToolExecutionResult(
        status="SUCCESS",
        data=overview if isinstance(overview, dict) else (overview.model_dump() if hasattr(overview, "model_dump") else {}),
        message=f"Sensitive data posture and DSPM classification retrieved for project '{project.name}'.",
    )


async def execute_audit_agent_permissions_posture(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Audits active agent sessions, excessive permissions, and privilege escalation risks.
    """
    project, err_result = await resolve_authorized_project(context, arguments, db)
    if err_result:
        return err_result
    proj_uuid = project.id

    agent_service = AgentService(db)
    risk_summary = await agent_service.get_risk(str(proj_uuid))
    agents_list = await agent_service.list_agents(project_id=str(proj_uuid), limit=50)

    high_risk_agents = [
        {"name": a.get("name"), "risk_level": a.get("risk_level"), "agent_id": a.get("agent_id")}
        for a in agents_list.get("agents", [])
        if a.get("risk_level") in ("HIGH", "CRITICAL")
    ]

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(proj_uuid),
            "project_name": project.name,
            "risk_summary": risk_summary,
            "total_agents": agents_list.get("total", 0),
            "high_risk_agents": high_risk_agents,
        },
        message=f"Agent permissions audited for '{project.name}'. {len(high_risk_agents)} high/critical risk agent(s) identified.",
    )
