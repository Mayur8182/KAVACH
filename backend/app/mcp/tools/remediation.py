"""
Kavach MCP Tools — Remediation Proposal, Sandbox Verification & Rescan Handlers.
Fetches real repository source context when synthesizing patches and executes real scanners
(Semgrep, Gitleaks, Checkov, OSV, Kavach Builtin + Syntax AST) when verifying fixes.
"""

import uuid
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.remediation.synthesizer import PatchSynthesizer
from app.engines.remediation.validator import PatchValidator
from app.engines.remediation.verifier import PatchVerifier
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.mcp.tools.github import (
    fetch_github_file_raw,
    resolve_github_token,
    resolve_local_repo_workspace,
    resolve_project_github_repo,
    _extract_owner_repo,
)
from app.models.remediation import RemediationValidation
from app.models.scan import SecurityFinding
from app.services.audit_service import AuditService


async def _load_finding_scoped(
    finding_id_raw: Any,
    project_id: uuid.UUID,
    db: AsyncSession,
) -> Optional[SecurityFinding]:
    if not finding_id_raw:
        return None
    try:
        fid = uuid.UUID(str(finding_id_raw).strip())
    except (ValueError, TypeError):
        return None
    finding = await db.get(SecurityFinding, fid)
    if not finding:
        return None
    if finding.project_id and finding.project_id != project_id:
        return None
    return finding


async def execute_propose_remediation_diff(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Synthesizes a minimal unified diff grounded in actual file source from the project's
    connected GitHub repository or workspace. Never invents placeholder fixes.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    finding_row = await _load_finding_scoped(arguments.get("finding_id"), project.id, db)
    if arguments.get("finding_id") and not finding_row:
        return ToolExecutionResult(
            status="NOT_FOUND",
            message=f"Finding '{arguments.get('finding_id')}' not found in active project '{project.name}'.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )

    raw_finding = arguments.get("finding") if isinstance(arguments.get("finding"), dict) else {}
    file_path = str(
        raw_finding.get("file_path")
        or arguments.get("file_path")
        or (finding_row.file_path if finding_row else "")
        or ""
    ).strip()
    if not file_path:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Provide `finding_id` or `file_path` to synthesize a targeted security fix.",
            error_code="MCP_INVALID_INPUT",
        )

    line_num = (
        raw_finding.get("line_number")
        or arguments.get("line_number")
        or (finding_row.line_number or finding_row.line_start if finding_row else None)
        or 1
    )
    finding_payload: Dict[str, Any] = {
        "id": str(finding_row.id) if finding_row else raw_finding.get("id"),
        "rule_id": raw_finding.get("rule_id") or arguments.get("rule_id") or (finding_row.rule_id if finding_row else "SECURITY_ISSUE"),
        "title": raw_finding.get("title") or arguments.get("title") or (finding_row.title if finding_row else ""),
        "severity": raw_finding.get("severity") or arguments.get("severity") or (finding_row.severity if finding_row else "HIGH"),
        "file_path": file_path,
        "line_number": int(line_num),
        "snippet": raw_finding.get("snippet") or arguments.get("snippet") or (finding_row.snippet if finding_row else "") or "",
    }

    file_content = arguments.get("file_content")
    repo, _ = await resolve_project_github_repo(
        project,
        context.identity.agent_id,
        db,
        repository_arg=arguments.get("repository"),
    )
    ref = str(arguments.get("branch") or arguments.get("ref") or (finding_row.branch if finding_row else None) or (repo.default_branch if repo else None) or project.default_branch or "main")

    # Auto-fetch real file source from workspace / GitHub when not supplied
    source_fetch_note = None
    if not file_content:
        full_name = repo.full_name if repo else None
        if not full_name and project.repository_url:
            parsed = _extract_owner_repo(project.repository_url)
            if parsed:
                full_name = parsed[2]
        if full_name:
            token = await resolve_github_token(db, repo=repo, project=project, user_id=context.identity.agent_id)
            local_ws = resolve_local_repo_workspace(repo, project)
            fetched, _, fetch_err = await fetch_github_file_raw(
                full_name=full_name,
                file_path=file_path,
                ref=ref,
                token=token,
                local_ws=local_ws,
            )
            if fetched is not None:
                file_content = fetched
            else:
                source_fetch_note = fetch_err

    repo_context = dict(arguments.get("repository_context") or {})
    if repo:
        repo_context.setdefault("full_name", repo.full_name)
        repo_context.setdefault("default_branch", repo.default_branch or "main")
    elif project.repository_url:
        repo_context.setdefault("repository_url", project.repository_url)

    synthesizer = PatchSynthesizer()
    result = await synthesizer.synthesize_patch(
        finding=finding_payload,
        file_content=file_content,
        repository_context=repo_context,
    )

    diff = str(result.get("patch") or "").strip()
    is_valid_format, format_msg = PatchValidator.validate_diff_format(diff) if diff else (False, "No diff generated")
    is_fixable = bool(result.get("is_fixable")) and is_valid_format

    patched_preview = result.get("patched_content")
    if file_content and diff and is_valid_format and not patched_preview:
        applied_ok, maybe_new, apply_msg = PatchValidator.apply_diff_to_text(file_content, diff)
        if applied_ok:
            patched_preview = maybe_new
        else:
            is_fixable = False
            format_msg = f"Synthesized diff did not cleanly match '{file_path}': {apply_msg}"

    return ToolExecutionResult(
        status="SUCCESS" if is_fixable else "NOT_FIXABLE",
        data={
            "finding_id": str(finding_row.id) if finding_row else finding_payload.get("id"),
            "project_id": str(project.id),
            "file_path": file_path,
            "ref": ref,
            "is_fixable": is_fixable,
            "root_cause": result.get("root_cause", ""),
            "explanation": result.get("explanation", ""),
            "patch": diff if is_fixable else "",
            "patched_content": patched_preview if is_fixable else None,
            "is_valid_format": is_valid_format,
            "format_message": format_msg,
            "source_loaded": bool(file_content),
            "source_fetch_note": source_fetch_note,
            "confidence": result.get("confidence", 0.0) if is_fixable else 0.0,
            "strategies": result.get("strategies", []) if is_fixable else [],
            "next_step": (
                "Review diff, call `apply_remediation_patch` on a remediation branch (e.g. 'security/ai-remediation'), then `verify_patch` and `create_pull_request`."
                if is_fixable
                else "Inspect exact code with `get_file_content` and apply a verified diff directly with `apply_remediation_patch`."
            ),
        },
        message=(
            f"Patch synthesized and format-verified for '{file_path}'."
            if is_fixable
            else f"Could not auto-synthesize verified diff for '{file_path}': {result.get('explanation') or format_msg}"
        ),
        result_reference=str(finding_row.id) if finding_row else file_path,
    )


async def execute_verify_remediation_patch(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Executes real syntax + security scanner verification in an isolated sandbox to prove the patch
    eliminates the vulnerability without introducing regressions.
    Supports either explicit `patched_content` or fetching `file_path` directly from `branch`.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return err

    finding_row = await _load_finding_scoped(arguments.get("finding_id"), project.id, db)
    file_path = str(
        arguments.get("file_path") or (finding_row.file_path if finding_row else "") or "code.py"
    ).strip()
    rule_id = str(
        arguments.get("rule_id") or (finding_row.rule_id if finding_row else "") or "SECURITY_RULE"
    ).strip()
    scanner_type = str(
        arguments.get("scanner_type") or (finding_row.scanner_name if finding_row else "") or "semgrep"
    ).strip()

    original_content = arguments.get("original_content") or ""
    patched_content = arguments.get("patched_content")
    branch = str(arguments.get("branch") or arguments.get("ref") or "").strip()

    repo, _ = await resolve_project_github_repo(
        project,
        context.identity.agent_id,
        db,
        repository_arg=arguments.get("repository"),
    )
    full_name = repo.full_name if repo else None
    if not full_name and project.repository_url:
        parsed = _extract_owner_repo(project.repository_url)
        if parsed:
            full_name = parsed[2]

    # Fetch patched code from remediation branch if `patched_content` wasn't passed inline
    if patched_content is None and branch and full_name:
        token = await resolve_github_token(db, repo=repo, project=project, user_id=context.identity.agent_id)
        local_ws = resolve_local_repo_workspace(repo, project)
        fetched, _, fetch_err = await fetch_github_file_raw(
            full_name=full_name,
            file_path=file_path,
            ref=branch,
            token=token,
            local_ws=local_ws,
        )
        if fetched is None:
            return ToolExecutionResult(
                status="FAILED",
                message=fetch_err or f"Could not fetch '{file_path}'@{branch} for verification.",
                error_code="MCP_EXECUTION_FAILED",
            )
        patched_content = fetched

        # If caller supplied a diff rather than patched_content directly
        if arguments.get("patch") and not arguments.get("already_applied", True):
            ok, applied_text, apply_msg = PatchValidator.apply_diff_to_text(patched_content, str(arguments["patch"]))
            if not ok:
                return ToolExecutionResult(
                    status="FAILED",
                    message=f"Could not apply diff for verification: {apply_msg}",
                    error_code="MCP_PATCH_APPLY_FAILED",
                )
            patched_content = applied_text

    if patched_content is None:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Provide either `patched_content` or `branch` + `file_path` so real source code can be verified.",
            error_code="MCP_INVALID_INPUT",
        )

    result = await PatchVerifier.verify_patch_in_sandbox(
        file_path=file_path,
        original_content=str(original_content),
        patched_content=str(patched_content),
        rule_id=rule_id,
        scanner_type=scanner_type,
    )

    if arguments.get("patch_id"):
        try:
            patch_uuid = uuid.UUID(str(arguments["patch_id"]))
            db.add(
                RemediationValidation(
                    id=uuid.uuid4(),
                    patch_id=patch_uuid,
                    validation_type="SECURITY_RESCAN",
                    status="PASSED" if result.get("verified") else "FAILED",
                    command_or_tool=str(result.get("scanner_executed") or scanner_type),
                    result_summary=result.get("message"),
                    failure_reason=(
                        None
                        if result.get("verified")
                        else f"Remaining matching findings: {result.get('remaining_findings_count', 0)}"
                    ),
                )
            )
        except (ValueError, TypeError):
            pass

    if finding_row and result.get("verified") and arguments.get("mark_resolved", False):
        finding_row.status = "resolved"
        db.add(finding_row)

    await AuditService(db).log_event(
        action="REMEDIATION_PATCH_VERIFIED" if result.get("verified") else "REMEDIATION_PATCH_VERIFY_FAILED",
        resource_type="mcp_tool",
        actor_type="user",
        actor_id=str(context.identity.agent_id),
        resource_id=str(finding_row.id) if finding_row else file_path,
        project_id=project.id,
        status="SUCCESS" if result.get("verified") else "FAILURE",
        metadata={
            "file_path": file_path,
            "rule_id": rule_id,
            "branch": branch or None,
            "scanners": result.get("completed_scanners"),
            "remaining_findings_count": result.get("remaining_findings_count"),
        },
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS" if result.get("verified") else "FAILED",
        data={
            **result,
            "finding_id": str(finding_row.id) if finding_row else None,
            "file_path": file_path,
            "branch": branch or None,
        },
        message=result.get("message", "Verification completed."),
        result_reference=str(finding_row.id) if finding_row else file_path,
    )


async def execute_verify_patch(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """First-class alias for `verify_patch` executing real syntax + scanner verification."""
    return await execute_verify_remediation_patch(context, arguments, db)
