import uuid
from typing import Any, Dict, List

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.models.audit_event import AuditEvent
from app.models.policy import SecurityApproval, SecurityDecision
from app.models.scan import SecurityFinding, SecurityScan
from app.repositories.blueprint_repository import BlueprintRepository
from app.services.workspace_resolver import get_accessible_projects


async def execute_list_project_findings(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Lists real SecurityFinding rows from PostgreSQL for the authorized project
    with optional severity, status, category, scan_id, and deduplicated unique view.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    try:
        limit = max(1, min(int(arguments.get("limit", 50)), 100))
    except (TypeError, ValueError):
        limit = 50

    severity = str(arguments.get("severity") or "").strip().upper()
    finding_status = str(arguments.get("status") or "").strip().lower()
    category = str(arguments.get("category") or "").strip()
    deduplicate = bool(arguments.get("deduplicate", True))
    latest_scan_only = bool(arguments.get("latest_scan_only", False))
    scan_id_arg = arguments.get("scan_id")

    stmt = select(SecurityFinding).where(SecurityFinding.project_id == project.id)
    target_scan_id: Optional[uuid.UUID] = None
    if scan_id_arg:
        try:
            target_scan_id = uuid.UUID(str(scan_id_arg).strip())
            stmt = stmt.where(SecurityFinding.scan_id == target_scan_id)
        except (ValueError, TypeError):
            pass
    elif latest_scan_only:
        latest_scan = (
            await db.execute(
                select(SecurityScan.id)
                .where(SecurityScan.project_id == project.id)
                .order_by(desc(SecurityScan.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        if latest_scan:
            target_scan_id = latest_scan
            stmt = stmt.where(SecurityFinding.scan_id == latest_scan)

    if severity:
        stmt = stmt.where(func.upper(SecurityFinding.severity) == severity)
    if finding_status:
        stmt = stmt.where(func.lower(SecurityFinding.status) == finding_status)
    if category:
        stmt = stmt.where(SecurityFinding.category == category)

    stmt = stmt.order_by(desc(SecurityFinding.created_at)).limit(500 if deduplicate else limit)
    rows = (await db.execute(stmt)).scalars().all()

    items: List[Dict[str, Any]] = []
    seen_sigs = set()
    for f in rows:
        if deduplicate:
            sig = f.fingerprint or f"{f.rule_id}:{f.file_path}:{f.line_number or f.line_start}"
            if sig in seen_sigs:
                continue
            seen_sigs.add(sig)
        items.append(
            {
                "id": str(f.id),
                "scan_id": str(f.scan_id),
                "scanner": f.scanner_name,
                "rule_id": f.rule_id,
                "title": f.title,
                "severity": f.severity,
                "status": f.status,
                "category": f.category,
                "repository": f.repository,
                "branch": f.branch,
                "file_path": f.file_path,
                "line_number": f.line_number or f.line_start,
                "snippet": f.snippet,
                "cwe_id": f.cwe_id,
                "owasp_category": f.owasp_category,
                "confidence": f.confidence,
                "remediation": f.remediation,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
        )
        if len(items) >= limit:
            break

    sev_stmt = (
        select(func.upper(SecurityFinding.severity), func.count(SecurityFinding.id))
        .where(SecurityFinding.project_id == project.id, func.lower(SecurityFinding.status) == "open")
        .group_by(func.upper(SecurityFinding.severity))
    )
    severity_counts = {str(k or "UNKNOWN"): int(v or 0) for k, v in (await db.execute(sev_stmt)).all()}

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(project.id),
            "project_name": project.name,
            "repository_url": project.repository_url,
            "returned_count": len(items),
            "deduplicated": deduplicate,
            "raw_open_severity_breakdown": severity_counts,
            "open_severity_breakdown": severity_counts,
            "findings": items,
        },
        message=f"Retrieved {len(items)} finding(s) for project '{project.name}'.",
        result_reference=str(project.id),
    )


async def execute_get_project_posture(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Computes live deterministic security posture for the resolved project from
    PostgreSQL findings, scan runs, security blueprints, and pending approvals.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    sev_rows = (
        await db.execute(
            select(func.upper(SecurityFinding.severity), func.count(SecurityFinding.id))
            .where(SecurityFinding.project_id == project.id, func.lower(SecurityFinding.status) == "open")
            .group_by(func.upper(SecurityFinding.severity))
        )
    ).all()
    open_by_sev: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFORMATIONAL": 0}
    for sev_val, cnt in sev_rows:
        key = str(sev_val or "INFORMATIONAL").upper()
        open_by_sev[key] = open_by_sev.get(key, 0) + int(cnt or 0)

    total_open = sum(open_by_sev.values())

    recent_scans = (
        await db.execute(
            select(SecurityScan)
            .where(SecurityScan.project_id == project.id)
            .order_by(desc(SecurityScan.created_at))
            .limit(5)
        )
    ).scalars().all()

    bp_repo = BlueprintRepository(db)
    latest_bp = await bp_repo.get_latest_for_project(project.id)
    bp_summary: Dict[str, Any] = {"configured": False}
    if latest_bp:
        bp_obj = await bp_repo.get_by_id(latest_bp.id)
        reqs = list(getattr(bp_obj, "requirements", []) or []) if bp_obj else []
        bp_summary = {
            "configured": True,
            "blueprint_id": str(latest_bp.id),
            "version": latest_bp.version,
            "status": latest_bp.status,
            "requirements_count": len(reqs),
        }

    pending_approvals_count = (
        await db.execute(
            select(func.count(SecurityApproval.id))
            .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
            .where(
                SecurityDecision.project_id == project.id,
                SecurityApproval.status == "PENDING",
            )
        )
    ).scalar() or 0

    completed_scans = [s for s in recent_scans if str(s.status or "").upper() == "COMPLETED"]
    if open_by_sev["CRITICAL"] > 0:
        posture_rating = "CRITICAL_RISK"
    elif open_by_sev["HIGH"] > 0:
        posture_rating = "HIGH_RISK"
    elif open_by_sev["MEDIUM"] > 0:
        posture_rating = "MODERATE_RISK"
    elif total_open > 0:
        posture_rating = "LOW_RISK"
    elif completed_scans:
        posture_rating = "VERIFIED_CLEAN"
    else:
        posture_rating = "UNSCANNED"

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project": {
                "id": str(project.id),
                "name": project.name,
                "repository_url": project.repository_url,
                "default_branch": project.default_branch,
            },
            "posture_rating": posture_rating,
            "open_findings_total": total_open,
            "open_findings_by_severity": open_by_sev,
            "pending_approvals_count": int(pending_approvals_count),
            "blueprint": bp_summary,
            "recent_scans": [
                {
                    "id": str(s.id),
                    "status": s.status,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                }
                for s in recent_scans
            ],
        },
        message=f"Project '{project.name}' posture: {posture_rating} ({total_open} open findings, {len(recent_scans)} recent scans).",
        result_reference=str(project.id),
    )


async def execute_list_pending_approvals(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Lists real pending SecurityApproval requests in PostgreSQL awaiting human sign-off.
    """
    user_id = context.identity.agent_id
    token_org_id = context.metadata.get("org_id")
    org_uuid = None
    if token_org_id:
        try:
            org_uuid = uuid.UUID(str(token_org_id))
        except ValueError:
            pass

    from app.models.user import User

    user = await db.get(User, user_id)
    if not user:
        return ToolExecutionResult(
            status="FAILED",
            message="Authenticated user not found.",
            error_code="MCP_USER_NOT_FOUND",
        )

    projects = await get_accessible_projects(user, db, org_id=org_uuid)
    explicit_pid = arguments.get("project_id") or arguments.get("projectId")
    target_project_ids = [p.id for p in projects]
    if explicit_pid:
        try:
            target_uid = uuid.UUID(str(explicit_pid))
            if target_uid not in target_project_ids:
                return ToolExecutionResult(
                    status="DENIED",
                    message="Access denied to the requested project approvals.",
                    error_code="MCP_TENANT_ACCESS_DENIED",
                )
            target_project_ids = [target_uid]
        except ValueError:
            return ToolExecutionResult(
                status="INVALID_INPUT",
                message="Invalid project_id format.",
                error_code="MCP_INVALID_INPUT",
            )

    if not target_project_ids:
        return ToolExecutionResult(
            status="SUCCESS",
            data={"total_pending": 0, "approvals": []},
            message="No accessible projects found.",
        )

    stmt = (
        select(SecurityApproval, SecurityDecision)
        .join(SecurityDecision, SecurityApproval.decision_id == SecurityDecision.id)
        .where(
            SecurityDecision.project_id.in_(target_project_ids),
            SecurityApproval.status == "PENDING",
        )
        .order_by(desc(SecurityApproval.requested_at))
        .limit(50)
    )
    rows = (await db.execute(stmt)).all()
    project_name_map = {str(p.id): p.name for p in projects}

    items: List[Dict[str, Any]] = []
    for ap, dec in rows:
        snap = dec.context_snapshot if isinstance(dec.context_snapshot, dict) else {}
        items.append(
            {
                "approval_id": str(ap.id),
                "decision_id": str(dec.id),
                "project_id": str(dec.project_id),
                "project_name": project_name_map.get(str(dec.project_id), "Unknown"),
                "operation_type": dec.operation_type,
                "tool_name": snap.get("tool_name"),
                "client_name": snap.get("agent_name"),
                "status": ap.status,
                "reason": ap.reason,
                "requested_by": ap.requested_by,
                "requested_at": ap.requested_at.isoformat() if ap.requested_at else None,
                "expires_at": ap.expires_at.isoformat() if ap.expires_at else None,
            }
        )

    return ToolExecutionResult(
        status="SUCCESS",
        data={"total_pending": len(items), "approvals": items},
        message=f"Found {len(items)} pending security approval request(s).",
    )


async def execute_get_mcp_audit_trail(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Returns real immutable AuditEvent entries recorded for MCP tool and resource actions.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    try:
        limit = max(1, min(int(arguments.get("limit", 25)), 100))
    except (TypeError, ValueError):
        limit = 25

    stmt = (
        select(AuditEvent)
        .where(
            AuditEvent.project_id == project.id,
            AuditEvent.resource_type.in_(["mcp_tool", "mcp_resource", "mcp_approval", "mcp_gateway"]),
        )
        .order_by(desc(AuditEvent.timestamp))
        .limit(limit)
    )
    events = (await db.execute(stmt)).scalars().all()

    items: List[Dict[str, Any]] = [
        {
            "id": str(e.id),
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "actor_id": e.actor_id,
            "status": e.status,
            "metadata": e.event_metadata if isinstance(e.event_metadata, dict) else {},
            "created_at": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "project_id": str(project.id),
            "project_name": project.name,
            "events_count": len(items),
            "audit_events": items,
        },
        message=f"Retrieved {len(items)} immutable MCP audit event(s) for '{project.name}'.",
        result_reference=str(project.id),
    )
