"""
Kavach MCP Security Scan & Consolidated Security Check Tools.

Crucially resolves the active project's ACTUAL connected GitHub repository (cloning or pulling
it into an isolated workspace) or verified local workspace target — NEVER falling back to
scanning Kavach's own backend runtime directory (`os.getcwd()`).
"""

from datetime import datetime, timedelta, timezone
import os
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp.errors import MCPInvalidInputError
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.mcp.tools.github import (
    _extract_owner_repo,
    ensure_repo_workspace_cloned,
    resolve_github_token,
    resolve_project_github_repo,
)
from app.models.scan import SecurityScan
from app.models.user import User
from app.repositories.scan_repository import ScanRepository
from app.schemas.scan import ScanTriggerRequest
from app.services.scan_service import ScanService
from app.services.workspace_resolver import user_can_access_project


async def _resolve_scan_target_for_project(
    project: Any,
    user_id: uuid.UUID,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> tuple[Optional[str], Optional[str], Optional[uuid.UUID], str, Optional[str]]:
    """
    Resolves `(resolved_path, repo_full_name, repo_id, branch, error_message)`.
    Uses explicit `target_path` ONLY when explicitly passed and not pointing at the server cwd;
    otherwise clones/pulls the connected GitHub repository for `project`.
    """
    target = arguments.get("target", {})
    explicit_path = target.get("path") if isinstance(target, dict) else arguments.get("target_path")

    repo_arg = arguments.get("repository")
    repo, _ = await resolve_project_github_repo(project, user_id, db, repository_arg=repo_arg)
    branch = str(
        arguments.get("branch")
        or (repo.default_branch if repo else None)
        or getattr(project, "default_branch", None)
        or "main"
    ).strip()

    full_name: Optional[str] = None
    if repo_arg:
        parsed = _extract_owner_repo(str(repo_arg))
        if parsed:
            full_name = parsed[2]
    if not full_name and repo and repo.full_name:
        full_name = repo.full_name
    elif not full_name and getattr(project, "repository_url", None):
        parsed = _extract_owner_repo(project.repository_url)
        if parsed:
            full_name = parsed[2]

    if explicit_path:
        raw_p = str(explicit_path).strip()
        if ".." in raw_p.split(os.sep) or ".." in raw_p.split("/"):
            raise MCPInvalidInputError(f"Target path '{explicit_path}' contains forbidden traversal.")
        resolved_explicit = os.path.abspath(raw_p)
        if not os.path.exists(resolved_explicit):
            raise MCPInvalidInputError(f"Target path '{explicit_path}' does not exist.")
        return resolved_explicit, full_name, (repo.id if repo else None), branch, None

    if not full_name:
        return (
            None,
            None,
            None,
            branch,
            f"Project '{project.name}' has no connected GitHub repository. Run `connect_repository` first.",
        )

    token = await resolve_github_token(db, repo=repo, project=project, user_id=user_id)
    cloned_path, clone_err = await ensure_repo_workspace_cloned(
        repo=repo,
        project=project,
        full_name=full_name,
        branch=branch,
        token=token,
    )
    if not cloned_path:
        return None, full_name, (repo.id if repo else None), branch, clone_err

    return cloned_path, full_name, (repo.id if repo else None), branch, None


async def execute_run_security_scan(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Executes real security verification scanners against the project's connected repository
    (cloning/syncing it on demand) or an explicit workspace path. Never scans Kavach's own server cwd.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err
    project_uuid = project.id

    resolved_path, repo_full_name, repo_id, branch, target_err = await _resolve_scan_target_for_project(
        project, context.identity.agent_id, arguments, db
    )
    if target_err or not resolved_path:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message=target_err or "Target repository is not connected or could not be checked out.",
            error_code="MCP_TARGET_UNAVAILABLE",
        )

    enabled_scanners = arguments.get("scanners", ["semgrep", "gitleaks", "osv", "trivy", "checkov"])

    db_user = await db.get(User, context.identity.agent_id)
    principal_user = db_user or User(
        id=context.identity.agent_id,
        email=context.identity.authenticated_principal,
        name=context.identity.agent_name,
        password_hash="",
        is_superuser=bool(context.metadata.get("is_superuser", False)),
        is_active=True,
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
            target_reference=repo_full_name,
            repository_id=repo_id,
            branch=branch,
        )

        duration = 0.0
        if scan_record.started_at and scan_record.completed_at:
            duration = round((scan_record.completed_at - scan_record.started_at).total_seconds(), 2)

        persisted_findings = list(getattr(scan_record, "findings", []) or [])
        total_findings = len(persisted_findings) if persisted_findings else int(getattr(scan_record, "finding_count", 0) or 0)
        executions = list(getattr(scan_record, "executions", []) or [])
        completed_engines = [ex.scanner_name for ex in executions if ex.status == "COMPLETED"]
        unavailable_engines = [
            {"scanner": ex.scanner_name, "status": ex.status, "reason": ex.error_message}
            for ex in executions
            if ex.status != "COMPLETED"
        ]

        sev_counts: Dict[str, int] = {}
        for f in persisted_findings:
            s = str(f.severity or "MEDIUM").upper()
            sev_counts[s] = sev_counts.get(s, 0) + 1

        return ToolExecutionResult(
            status="SUCCESS",
            data={
                "scan_id": str(scan_record.id),
                "project_id": str(scan_record.project_id),
                "project_name": project.name,
                "repository": repo_full_name,
                "repository_id": str(repo_id) if repo_id else None,
                "branch": branch,
                "status": scan_record.status,
                "duration_seconds": duration,
                "finding_count": total_findings,
                "total_findings": total_findings,
                "severity_breakdown": sev_counts,
                "scanners_completed": completed_engines,
                "scanners_unavailable_or_failed": unavailable_engines,
                "reused_recent_scan": False,
            },
            message=(
                f"Scanned '{repo_full_name or project.name}' ({branch}): {scan_record.status} with "
                f"{total_findings} unique findings across {', '.join(completed_engines) or 'scanners'}."
            ),
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
    """Retrieves full verified scan results, deduplicated findings, and evidence with tenant isolation."""
    raw_sid = arguments.get("scan_id")
    if not raw_sid:
        raise MCPInvalidInputError("Missing required parameter 'scan_id'.")

    try:
        scan_uuid = uuid.UUID(str(raw_sid))
    except (ValueError, TypeError):
        raise MCPInvalidInputError(f"Invalid UUID string for 'scan_id': '{raw_sid}'.")

    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_by_id(scan_uuid, include_details=True)
    if not scan:
        return ToolExecutionResult(
            status="NOT_FOUND",
            message=f"Security scan '{scan_uuid}' not found.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )

    from app.mcp.tools.context_helper import _extract_token_uuid

    scan_project = await db.get(Project, scan.project_id)
    user_obj = await db.get(User, context.identity.agent_id)
    scoped_org_id = _extract_token_uuid(context.metadata, "org_id")
    if scan_project and user_obj:
        if not await user_can_access_project(user_obj, scan_project, db, scoped_org_id=scoped_org_id):
            return ToolExecutionResult(
                status="DENIED",
                message=f"Access denied: Security scan '{scan_uuid}' belongs to another tenant.",
                error_code="MCP_TENANT_ACCESS_DENIED",
            )
    elif scan_project and scan_project.owner_id != context.identity.agent_id and not bool(context.metadata.get("is_superuser", False)):
        return ToolExecutionResult(
            status="DENIED",
            message=f"Access denied: Security scan '{scan_uuid}' belongs to another tenant.",
            error_code="MCP_TENANT_ACCESS_DENIED",
        )

    findings = await scan_repo.get_findings_for_scan(scan_uuid)
    verifications = await scan_repo.get_verifications_for_scan(scan_uuid)

    findings_summary = [
        {
            "id": str(f.id),
            "scanner": f.scanner_name,
            "severity": f.severity,
            "status": f.status,
            "title": f.title,
            "repository": f.repository,
            "file_path": f.file_path,
            "line_number": f.line_number or f.line_start,
            "rule_id": f.rule_id,
            "snippet": f.snippet,
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
            "repository": scan.target_reference,
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
        message=f"Retrieved scan details for '{scan_uuid}' ({len(findings_summary)} findings).",
        result_reference=str(scan.id),
    )


async def execute_security_check(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Consolidated security verification combining latest scan (only triggering a new scan if none
    completed recently for the target repo or `force_rescan=True`) + deterministic policy evaluation.
    Prevents duplicate identical back-to-back scans when ChatGPT calls both `run_security_scan` & `security_check`.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    force_rescan = bool(arguments.get("force_rescan", False))
    target = arguments.get("target", {})
    explicit_path = target.get("path") if isinstance(target, dict) else arguments.get("target_path")

    repo, _ = await resolve_project_github_repo(project, context.identity.agent_id, db, repository_arg=arguments.get("repository"))
    expected_ref = (repo.full_name if repo else None) or (
        (_extract_owner_repo(project.repository_url) or (None, None, None))[2]
        if getattr(project, "repository_url", None)
        else None
    )

    scan_data: Dict[str, Any]
    if not force_rescan and not explicit_path:
        recent_stmt = (
            select(SecurityScan)
            .where(SecurityScan.project_id == project.id, SecurityScan.status.in_(["COMPLETED", "PARTIAL"]))
            .order_by(desc(SecurityScan.created_at))
            .limit(1)
        )
        recent = (await db.execute(recent_stmt)).scalars().first()
        if recent and recent.created_at:
            created_utc = recent.created_at if recent.created_at.tzinfo else recent.created_at.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - created_utc
            ref_matches = (not expected_ref) or (not recent.target_reference) or (recent.target_reference.lower() == expected_ref.lower())
            if age < timedelta(minutes=3) and ref_matches:
                from app.mcp.tools.security import execute_check_security_policy

                scan_repo = ScanRepository(db)
                recent_findings = await scan_repo.get_findings_for_scan(recent.id)
                policy_res = await execute_check_security_policy(
                    context,
                    {"project_id": str(project.id), "operation": "SECURITY_CHECK"},
                    db,
                )
                return ToolExecutionResult(
                    status="SUCCESS",
                    data={
                        "scan_id": str(recent.id),
                        "project_id": str(project.id),
                        "repository": recent.target_reference or expected_ref,
                        "status": recent.status,
                        "finding_count": len(recent_findings),
                        "total_findings": len(recent_findings),
                        "reused_recent_scan": True,
                        "policy_evaluation": policy_res.data,
                    },
                    message=(
                        f"Reused verified scan '{recent.id}' from {int(age.total_seconds())}s ago for "
                        f"'{recent.target_reference or expected_ref or project.name}' ({len(recent_findings)} findings) "
                        "and evaluated security policy."
                    ),
                    result_reference=str(recent.id),
                )

    scan_res = await execute_run_security_scan(context, arguments, db)
    if scan_res.status != "SUCCESS":
        return scan_res

    from app.mcp.tools.security import execute_check_security_policy

    policy_res = await execute_check_security_policy(
        context,
        {"project_id": str(project.id), "operation": "SECURITY_CHECK"},
        db,
    )
    scan_data = dict(scan_res.data or {})
    scan_data["policy_evaluation"] = policy_res.data
    return ToolExecutionResult(
        status="SUCCESS",
        data=scan_data,
        message=f"{scan_res.message} Policy decision: {(policy_res.data or {}).get('decision', 'EVALUATED')}.",
        result_reference=scan_res.result_reference,
    )
