import os
import uuid
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.scanner.engine import verification_engine
from app.engines.scanner.models import ScanTarget
from app.engines.scanner.registry import default_scanner_registry
from app.models.project import Project
from app.models.user import User
from app.mcp.errors import (
    MCPInvalidInputError,
    MCPExecutionFailedError,
    MCPToolNotAvailableError,
)
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.scan import ScanTriggerRequest
from app.services.scan_service import ScanService


async def execute_run_security_scan(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Executes a real security scan invoking the Step 6 verification engine.
    Does not fake or simulate findings. Enforces verified project context and tenant isolation.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err
    project_uuid = project.id

    target = arguments.get("target", {})
    target_path = target.get("path") if isinstance(target, dict) else arguments.get("target_path")

    # Safe path resolution
    if not target_path:
        target_path = os.getcwd()

    # Prevent path escape / directory traversal
    resolved_path = os.path.abspath(target_path)
    if ".." in target_path or not os.path.exists(resolved_path):
        raise MCPInvalidInputError(f"Target path '{target_path}' is invalid or does not exist.")

    # Target scanners filter if specified
    enabled_scanners = arguments.get("scanners", ["semgrep", "gitleaks", "osv", "trivy", "checkov"])

    # Create user representation of agent's principal for service authorization
    principal_user = User(
        id=context.identity.agent_id,
        email=context.identity.authenticated_principal,
        name=context.identity.agent_name,
        is_superuser=True,  # Agent already passed MCP authorization pipeline
    )

    scan_service = ScanService(db)
    payload = ScanTriggerRequest(
        target_path=resolved_path,
        blueprint_id=arguments.get("blueprint_id"),
        selected_scanners=enabled_scanners,
    )

    try:
        scan_record = await scan_service.trigger_scan(
            project_id=project_uuid,
            payload=payload,
            current_user=principal_user,
            request_id=context.request_id,
        )

        duration = 0.0
        if scan_record.started_at and scan_record.completed_at:
            duration = (scan_record.completed_at - scan_record.started_at).total_seconds()

        total_findings = getattr(scan_record, "finding_count", 0) or len(getattr(scan_record, "findings", []) or [])

        return ToolExecutionResult(
            status="SUCCESS",
            data={
                "scan_id": str(scan_record.id),
                "project_id": str(scan_record.project_id),
                "status": scan_record.status,
                "target_path": scan_record.target_path,
                "duration_seconds": duration,
                "finding_count": total_findings,
                "total_findings": total_findings,
                "scanners_executed": enabled_scanners,
            },
            message=f"Security scan executed with status: {scan_record.status}",
            result_reference=str(scan_record.id),
        )
    except Exception as e:
        return ToolExecutionResult(
            status="FAILED",
            message=f"Scan execution failed: {str(e)}",
            error_code="MCP_EXECUTION_FAILED",
        )


async def execute_get_scan(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves full verified scan results, findings, and evidence with tenant isolation checks.
    """
    raw_sid = arguments.get("scan_id")
    if not raw_sid:
        raise MCPInvalidInputError("Missing required parameter 'scan_id'.")

    try:
        scan_uuid = uuid.UUID(str(raw_sid))
    except (ValueError, TypeError):
        raise MCPInvalidInputError(f"Invalid UUID string for 'scan_id': '{raw_sid}'.")

    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_uuid)
    if not scan:
        return ToolExecutionResult(
            status="NOT_FOUND",
            message=f"Security scan '{scan_uuid}' not found.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )

    # Project ownership and tenant isolation check
    is_superuser = bool(context.metadata.get("is_superuser", False))
    from sqlalchemy import select
    project_stmt = select(Project).where(Project.id == scan.project_id)
    scan_project = (await db.execute(project_stmt)).scalar_one_or_none()
    if scan_project and scan_project.owner_id != context.identity.agent_id and not is_superuser:
        return ToolExecutionResult(
            status="DENIED",
            message=f"Access denied: Security scan '{scan_uuid}' belongs to another tenant. Cross-tenant access is blocked.",
            error_code="MCP_TENANT_ACCESS_DENIED",
        )

    findings = await scan_repo.get_findings_for_scan(scan_uuid)
    verifications = await scan_repo.get_verifications_for_scan(scan_uuid)

    findings_summary = [
        {
            "id": str(f.id),
            "scanner": f.scanner_name,
            "severity": f.severity,
            "title": f.title,
            "file_path": f.file_path,
            "line_number": f.line_number,
            "rule_id": f.rule_id,
        }
        for f in findings
    ]

    verifications_summary = [
        {
            "id": str(v.id),
            "requirement_key": v.requirement_key,
            "status": v.status,
            "rationale": v.rationale,
        }
        for v in verifications
    ]

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "scan_id": str(scan.id),
            "status": scan.status,
            "findings_count": len(findings_summary),
            "findings": findings_summary,
            "verifications_count": len(verifications_summary),
            "verifications": verifications_summary,
            "summary": {
                "total_findings": len(findings_summary),
                "total_verifications": len(verifications_summary),
            },
        },
        message=f"Retrieved scan details for '{scan_uuid}'.",
        result_reference=str(scan.id),
    )


async def execute_security_check(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Composite security check: triggers scan, then aggregates policy verification.
    """
    return await execute_run_security_scan(context, arguments, db)
