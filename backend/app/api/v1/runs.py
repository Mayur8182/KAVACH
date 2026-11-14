"""
Kavach Autonomous AI Security Execution Engine — Runs API Router
Exposes authoritative REST, WebSocket, and SSE endpoints for:
- Listing and creating multi-agent security runs against real repositories
- Selecting connected user GitHub repositories
- Live event streaming and chronological replay
- Monaco Editor workspace file content retrieval with strict security boundaries
"""

import os
import uuid
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_

from app.core.database import get_db, get_session_factory
from app.core.security import get_current_user, get_current_user_optional
from app.core.websocket_manager import ws_manager
from app.models.user import User
from app.models.project import Project
from app.models.github import GitHubRepository
from app.models.scan import (
    SecurityScan,
    ScannerExecution,
    SecurityFinding,
    ScanExecutionTask,
    ExecutionEvent,
)
from app.models.remediation import RemediationPlan, RemediationPatch
from app.services.run_manager import RunManager, subscribe_run_events, unsubscribe_run_events

logger = logging.getLogger("kavach.runs_api")

router = APIRouter(prefix="/runs", tags=["Runs & Live Executions"])


class CreateRunRequest(BaseModel):
    repository: Optional[str] = Field(None, description="Repository full name, e.g. Mayur8182/KAVACH")
    repository_id: Optional[str] = Field(None, description="GitHub repository UUID")
    project_id: Optional[str] = Field(None, description="Project UUID")
    branch: Optional[str] = Field(default=None, description="Git branch name")
    commit: Optional[str] = Field(default=None, description="Commit SHA to checkout and inspect")
    agents: Optional[List[str]] = Field(
        default=None,
        description="Active agents for this run. Supports all 12 specialized agents.",
    )
    scope: str = Field(default="full", description="Scan scope: full, changed, custom")


async def _resolve_user_accessible_projects(current_user: Optional[User], db: AsyncSession) -> List[uuid.UUID]:
    if not current_user:
        return []
    if getattr(current_user, "is_superuser", False):
        return []
    from app.models.invitation import OrganizationMember
    owned = (await db.execute(select(Project.id).where(Project.owner_id == current_user.id))).scalars().all()
    p_ids = set(owned)
    try:
        org_pids = (
            await db.execute(
                select(Project.id)
                .join(OrganizationMember, OrganizationMember.organization_id == Project.organization_id)
                .where(OrganizationMember.user_id == current_user.id, OrganizationMember.is_active == True)
            )
        ).scalars().all()
        for pid in org_pids:
            p_ids.add(pid)
    except Exception:
        pass
    return list(p_ids)


async def _check_scan_access(scan: Optional[SecurityScan], current_user: Optional[User], db: AsyncSession) -> bool:
    if not scan or not current_user:
        return False
    if getattr(current_user, "is_superuser", False):
        return True
    if not scan.project_id:
        return False
    from app.models.invitation import OrganizationMember
    proj = await db.get(Project, scan.project_id)
    if not proj:
        return False
    if proj.owner_id == current_user.id:
        return True
    if proj.organization_id:
        mem = await db.execute(
            select(OrganizationMember.id).where(
                and_(
                    OrganizationMember.organization_id == proj.organization_id,
                    OrganizationMember.user_id == current_user.id,
                    OrganizationMember.is_active == True,
                )
            )
        )
        if mem.scalars().first():
            return True
    return False


async def _resolve_scan(db: AsyncSession, run_id_str: str, current_user: Optional[User] = None) -> Optional[SecurityScan]:
    """
    Safely resolves a scan by UUID or prefix strictly scoped to authorized projects.
    """
    clean_id = (run_id_str or "").replace("RUN-", "").replace("run-", "").strip().lower()
    scan = None
    if len(clean_id) == 36:
        try:
            run_uuid = uuid.UUID(clean_id)
            scan = await db.get(SecurityScan, run_uuid)
        except Exception:
            scan = None

    if not scan and len(clean_id) >= 4:
        from sqlalchemy import cast, String
        stmt = (
            select(SecurityScan)
            .where(cast(SecurityScan.id, String).like(f"{clean_id}%"))
            .order_by(desc(SecurityScan.created_at))
            .limit(1)
        )
        res = await db.execute(stmt)
        scan = res.scalars().first()

    if not scan:
        return None

    if current_user and not await _check_scan_access(scan, current_user, db):
        return None

    return scan


@router.get("/repositories", summary="List connected repositories for run execution")
async def list_run_repositories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns real connected GitHub repositories from the database for the run initiator.
    """
    is_super = getattr(current_user, "is_superuser", False)
    accessible_pids = await _resolve_user_accessible_projects(current_user, db)

    if not is_super and not accessible_pids:
        return []

    stmt = (
        select(GitHubRepository, Project.name.label("project_name"))
        .outerjoin(Project, GitHubRepository.project_id == Project.id)
    )
    if not is_super:
        stmt = stmt.where(GitHubRepository.project_id.in_(accessible_pids))

    stmt = stmt.order_by(desc(GitHubRepository.updated_at), desc(GitHubRepository.created_at))
    res = await db.execute(stmt)
    rows = res.all()

    repos_data = []
    seen = set()
    for repo, proj_name in rows:
        if repo.full_name in seen:
            continue
        seen.add(repo.full_name)
        repos_data.append({
            "id": str(repo.id),
            "name": repo.name,
            "fullName": repo.full_name,
            "owner": repo.owner,
            "defaultBranch": repo.default_branch or "main",
            "cloneUrl": repo.clone_url,
            "htmlUrl": repo.html_url,
            "projectId": str(repo.project_id) if repo.project_id else None,
            "projectName": proj_name or "Default Project",
            "visibility": repo.visibility or ("private" if repo.private else "public"),
            "isPrivate": bool(repo.private),
        })

    return repos_data


@router.get("", summary="List security runs")
async def list_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns recent security runs persisted in the database scoped to current user.
    """
    is_super = getattr(current_user, "is_superuser", False)
    accessible_pids = await _resolve_user_accessible_projects(current_user, db)

    if not is_super and not accessible_pids:
        return []

    stmt = select(SecurityScan)
    if not is_super:
        stmt = stmt.where(SecurityScan.project_id.in_(accessible_pids))
    stmt = stmt.order_by(desc(SecurityScan.started_at), desc(SecurityScan.created_at)).limit(limit)

    res = await db.execute(stmt)
    scans = res.scalars().all()

    runs_data = []
    for s in scans:
        # Count findings by severity
        f_stmt = select(SecurityFinding).where(SecurityFinding.scan_id == s.id)
        f_res = await db.execute(f_stmt)
        findings = f_res.scalars().all()

        crit = sum(1 for f in findings if f.severity.upper() == "CRITICAL")
        high = sum(1 for f in findings if f.severity.upper() == "HIGH")
        med = sum(1 for f in findings if f.severity.upper() == "MEDIUM")
        low = sum(1 for f in findings if f.severity.upper() == "LOW")

        # Duration
        elapsed = ""
        if s.started_at:
            end_time = s.completed_at or datetime.now(timezone.utc)
            start_time = s.started_at
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            secs = max(0, int((end_time - start_time).total_seconds()))
            elapsed = f"{secs // 60:02d}:{secs % 60:02d}"

        repo_name = s.target_path
        branch_name = "main"
        commit_val = "HEAD"
        if s.target_reference and "@" in s.target_reference:
            parts = s.target_reference.split("@", 1)
            branch_name = parts[0]
            commit_val = parts[1]

        if not repo_name or "acme" in repo_name.lower():
            if s.project_id:
                p = await db.get(Project, s.project_id)
                if p:
                    repo_name = p.name

        runs_data.append({
            "id": str(s.id),
            "runNumber": str(s.id)[:8],
            "repository": repo_name or "Repository",
            "branch": branch_name,
            "commit": commit_val,
            "status": s.status,
            "agentsActive": s.scanner_count or 12,
            "findingsCount": len(findings),
            "criticalCount": crit,
            "highCount": high,
            "mediumCount": med,
            "lowCount": low,
            "elapsed": elapsed or "00:00",
            "startedAt": s.started_at.isoformat() if s.started_at else s.created_at.isoformat(),
            "completedAt": s.completed_at.isoformat() if s.completed_at else None,
        })

    return runs_data


@router.post("", summary="Start a new security run", status_code=status.HTTP_201_CREATED)
async def create_run(
    payload: CreateRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates and initiates an autonomous multi-agent security execution scoped to tenant.
    """
    is_super = getattr(current_user, "is_superuser", False)
    accessible_pids = await _resolve_user_accessible_projects(current_user, db)

    proj_uuid = None
    if payload.project_id:
        try:
            proj_uuid = uuid.UUID(payload.project_id)
            if not is_super and proj_uuid not in accessible_pids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to requested project")
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project_id")
    else:
        if accessible_pids:
            proj_uuid = accessible_pids[0]
        else:
            from app.api.v1.workspaces import ensure_personal_workspace
            ws = await ensure_personal_workspace(current_user, db)
            p = Project(
                id=uuid.uuid4(),
                owner_id=current_user.id,
                workspace_id=ws.id if ws else None,
                organization_id=ws.organization_id if ws else None,
                name="Default Security Project",
                description="Primary security workspace for repository scans",
            )
            db.add(p)
            await db.commit()
            await db.refresh(p)
            proj_uuid = p.id

    repo_uuid = None
    if payload.repository_id:
        try:
            repo_uuid = uuid.UUID(payload.repository_id)
            repo_obj = await db.get(GitHubRepository, repo_uuid)
            if not repo_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
            if not is_super and repo_obj.project_id not in accessible_pids and repo_obj.project_id != proj_uuid:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to repository")
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid repository_id")

    manager = RunManager(db)
    scan = await manager.create_run(
        current_user=current_user,
        repository_name=payload.repository,
        repository_id=repo_uuid,
        project_id=proj_uuid,
        branch=payload.branch,
        commit_sha=payload.commit,
        agents=payload.agents,
        scan_scope=payload.scope,
    )

    ref_parts = (scan.target_reference or "main@HEAD").split("@", 1)

    return {
        "runId": str(scan.id),
        "repository": scan.target_path,
        "branch": ref_parts[0],
        "commit": ref_parts[1] if len(ref_parts) > 1 else "HEAD",
        "status": scan.status,
        "agents": payload.agents or ["sast", "iac", "container", "secrets", "sca", "api", "remediation"],
        "scope": payload.scope,
    }


@router.get("/{run_id}", summary="Get run details and state")
async def get_run_details(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns full metadata, execution tasks for all 12 agents, and active findings for a run.
    """
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    actual_run_id = scan.id

    # Tasks for Execution Graph
    task_stmt = (
        select(ScanExecutionTask)
        .where(ScanExecutionTask.scan_id == actual_run_id)
        .order_by(ScanExecutionTask.stage_order)
    )
    tasks = (await db.execute(task_stmt)).scalars().all()

    # Findings
    f_stmt = (
        select(SecurityFinding)
        .where(SecurityFinding.scan_id == actual_run_id)
        .order_by(desc(SecurityFinding.detected_at), desc(SecurityFinding.severity))
    )
    findings = (await db.execute(f_stmt)).scalars().all()

    # Remediation Proposal Diff from DB
    plan_stmt = (
        select(RemediationPlan)
        .where(RemediationPlan.project_id == scan.project_id)
        .order_by(desc(RemediationPlan.created_at))
        .limit(1)
    )
    plan = (await db.execute(plan_stmt)).scalars().first()
    patch_diff = None
    if plan:
        patch_stmt = (
            select(RemediationPatch)
            .where(RemediationPatch.remediation_plan_id == plan.id)
            .order_by(desc(RemediationPatch.created_at))
            .limit(1)
        )
        patch = (await db.execute(patch_stmt)).scalars().first()
        if patch:
            patch_diff = patch.diff

    # Dynamic or persisted suggestedFix
    suggested_fix = None
    if plan and patch_diff:
        suggested_fix = {
            "title": plan.title,
            "description": plan.description,
            "diff": patch_diff,
        }
    elif findings:
        top_f = findings[0]
        suggested_fix = {
            "title": f"Remediate {top_f.rule_id} in {top_f.file_path}",
            "description": f"Remediate {top_f.title}. Enforce validation and secure parameterization.",
            "diff": (
                f"--- a/{top_f.file_path}\n"
                f"+++ b/{top_f.file_path}\n"
                f"@@ -{top_f.line_number or 1},1 +{top_f.line_number or 1},1 @@\n"
                f"-{top_f.snippet or '// vulnerable code'}\n"
                f"+// SECURE: Validated and parameterized input binding\n"
            ),
        }

    # Calculate steps completed
    total_steps = len(tasks) * 5 if tasks else 60
    completed_steps = sum(
        5 if t.status == "completed" else (2 if t.status == "running" else 0)
        for t in tasks
    )

    # Elapsed
    elapsed_str = "00:00"
    if scan.started_at:
        end_time = scan.completed_at or datetime.now(timezone.utc)
        start_time = scan.started_at
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        secs = max(0, int((end_time - start_time).total_seconds()))
        elapsed_str = f"{secs // 60:02d}:{secs % 60:02d}"

    repo_name = scan.target_path or "Mayur8182/KAVACH"
    branch_name = "main"
    commit_val = "HEAD"
    if scan.target_reference and "@" in scan.target_reference:
        parts = scan.target_reference.split("@", 1)
        branch_name = parts[0]
        commit_val = parts[1]

    return {
        "id": str(scan.id),
        "runNumber": str(scan.id)[:8],
        "repository": repo_name,
        "branch": branch_name,
        "commit": commit_val,
        "status": scan.status,
        "agentsActive": scan.scanner_count or len(tasks),
        "elapsed": elapsed_str,
        "stepsTotal": total_steps,
        "stepsCompleted": completed_steps,
        "progressPercentage": 100 if scan.status == "COMPLETED" else min(99, int((completed_steps / max(1, total_steps)) * 100)),
        "tasks": [t.to_dict() for t in tasks],
        "findings": [
            {
                "id": str(f.id),
                "ruleId": f.rule_id,
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "agent": f.scanner_name,
                "location": f"{f.file_path}:{f.line_number or 1}",
                "filePath": f.file_path,
                "lineNumber": f.line_number,
                "lineStart": f.line_start,
                "lineEnd": f.line_end,
                "snippet": f.snippet,
                "status": f.status,
                "category": f.category,
                "detectedAt": f.detected_at.isoformat() if f.detected_at else f.created_at.isoformat(),
            }
            for f in findings
        ],
        "suggestedFix": suggested_fix,
    }


@router.get("/{run_id}/events", summary="Get execution events for replay")
async def get_run_events(
    run_id: str,
    since_sequence: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns chronological events for replay and live UI state synchronization.
    """
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    actual_run_id = scan.id

    stmt = (
        select(ExecutionEvent)
        .where(ExecutionEvent.scan_id == actual_run_id)
        .order_by(ExecutionEvent.created_at)
        .limit(limit)
    )
    events = (await db.execute(stmt)).scalars().all()
    return [
        {
            "eventId": f"evt_{e.id}",
            "runId": str(actual_run_id or run_id),
            "agentId": e.task_key or "orchestrator",
            "type": e.event_type,
            "status": e.status,
            "timestamp": e.created_at.isoformat(),
            "currentActivity": e.current_activity,
            "description": e.description,
            "progress": e.progress_percentage,
            "payload": e.event_metadata or {},
        }
        for e in events
    ]


@router.get("/{run_id}/files/content", summary="Safely read file content for Monaco Editor")
async def get_run_file_content(
    run_id: str,
    file_path: str = Query(..., description="Relative path in workspace, e.g. src/auth/session.ts"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Serves inspected source files for the Monaco Code Viewer.
    Strictly enforces workspace containment to prevent path traversal attacks.
    """
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    from app.integrations.github.workspace import GitHubWorkspaceManager
    wm = GitHubWorkspaceManager()
    clean_path = file_path.replace("\\", "/").lstrip("/")

    # 1. Check isolated job workspace
    workspace_dir = wm._get_job_workspace_path(scan.id)
    target_abs = os.path.abspath(os.path.join(workspace_dir, clean_path))
    if target_abs.startswith(os.path.abspath(workspace_dir)) and os.path.isfile(target_abs):
        with open(target_abs, "r", encoding="utf-8", errors="replace") as f:
            return {"file": clean_path, "content": f.read()}

    # 2. Check if finding exists in database for this scan with code snippet
    finding_stmt = (
        select(SecurityFinding)
        .where(
            and_(
                SecurityFinding.scan_id == scan.id,
                or_(
                    SecurityFinding.file_path == clean_path,
                    SecurityFinding.file_path.ilike(f"%{os.path.basename(clean_path)}%")
                )
            )
        )
        .limit(1)
    )
    f_res = await db.execute(finding_stmt)
    matched_finding = f_res.scalars().first()
    snippet = getattr(matched_finding, "snippet", None) or getattr(matched_finding, "code_snippet", None)
    if matched_finding and snippet:
        return {
            "file": clean_path,
            "content": f"// Inspected source evidence for {clean_path}\n// Finding: {matched_finding.title} ({matched_finding.rule_id})\n\n" + snippet
        }

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File {clean_path} not found in workspace for this run")


@router.get("/{run_id}/stream", summary="SSE Event Stream fallback")
async def stream_run_events(
    run_id: str,
    request: Request,
):
    """
    Server-Sent Events (SSE) stream for environments where WebSocket is restricted.
    """
    run_str = str(run_id)
    queue = await subscribe_run_events(run_str)

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield ": ping\n\n"
        finally:
            await unsubscribe_run_events(run_str, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/{run_id}/ws")
async def websocket_run_stream(
    websocket: WebSocket,
    run_id: str,
):
    """
    Authoritative WebSocket endpoint for live execution visualization.
    Subscribes the browser client to the run room and receives live agent activity.
    """
    await websocket.accept()
    room_name = f"execution:{run_id}"
    client_id = f"client_{uuid.uuid4()}"
    ws_manager.join_room(client_id, room_name)

    try:
        # Send initial confirmation message
        await websocket.send_json({
            "type": "CONNECTED",
            "runId": str(run_id),
            "room": room_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        while True:
            # Keep socket alive and accept ping / command messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.leave_room(client_id, room_name)
    except Exception as e:
        logger.debug(f"WebSocket client disconnected: {e}")
        ws_manager.leave_room(client_id, room_name)


# ─── REAL RUN EXECUTION CONTROLS ──────────────────────────────────────────────

@router.post("/{run_id}/pause", summary="Pause run execution")
async def pause_run_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    manager = RunManager(db)
    updated = await manager.pause_run(scan.id)
    return {"status": "success", "runId": str(scan.id), "runStatus": updated.status}


@router.post("/{run_id}/resume", summary="Resume run execution")
async def resume_run_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    manager = RunManager(db)
    updated = await manager.resume_run(scan.id)
    return {"status": "success", "runId": str(scan.id), "runStatus": updated.status}


@router.post("/{run_id}/cancel", summary="Cancel run execution")
async def cancel_run_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    manager = RunManager(db)
    updated = await manager.cancel_run(scan.id)
    return {"status": "success", "runId": str(scan.id), "runStatus": updated.status}


@router.post("/{run_id}/tasks/{task_key}/retry", summary="Retry a failed agent task")
async def retry_task_endpoint(
    run_id: str,
    task_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    manager = RunManager(db)
    task = await manager.retry_task(scan.id, task_key)
    return {"status": "success", "runId": str(scan.id), "taskKey": task.task_key, "taskStatus": task.status}


@router.get("/{run_id}/tool-output", summary="Get real CLI tool outputs and exit codes")
async def get_tool_output_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    stmt = (
        select(ScannerExecution)
        .where(ScannerExecution.scan_id == scan.id)
        .order_by(desc(ScannerExecution.started_at))
    )
    executions = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(e.id),
            "tool": e.scanner_name,
            "type": e.scanner_type,
            "status": e.status,
            "version": e.scanner_version,
            "command": e.command,
            "exitCode": e.exit_code,
            "stdoutSummary": e.stdout_summary,
            "stderrOutput": e.stderr_output,
            "durationMs": e.duration_ms,
            "findingsCount": e.finding_count,
            "startedAt": e.started_at.isoformat() if e.started_at else None,
            "completedAt": e.completed_at.isoformat() if e.completed_at else None,
        }
        for e in executions
    ]


@router.get("/{run_id}/inspected-files", summary="Get list of files inspected in workspace")
async def get_inspected_files_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    from app.integrations.github.workspace import GitHubWorkspaceManager
    wm = GitHubWorkspaceManager()
    ws_dir = wm._get_job_workspace_path(scan.id)

    files_list = []
    if os.path.isdir(ws_dir):
        for root, _, files in os.walk(ws_dir):
            if any(ignored in root for ignored in [".git", "node_modules", ".venv", "venv", "__pycache__"]):
                continue
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), ws_dir).replace("\\", "/")
                files_list.append(rel)

    # Query all real findings for this scan to ensure vulnerable files are included and prioritized
    f_stmt = (
        select(SecurityFinding)
        .where(SecurityFinding.scan_id == scan.id)
    )
    findings = (await db.execute(f_stmt)).scalars().all()
    finding_map: Dict[str, List[Dict[str, Any]]] = {}
    for f in findings:
        clean_fp = (f.file_path or "").replace("\\", "/").lstrip("/")
        if clean_fp not in finding_map:
            finding_map[clean_fp] = []
        finding_map[clean_fp].append({
            "id": str(f.id),
            "ruleId": f.rule_id,
            "title": f.title,
            "description": f.description,
            "severity": f.severity,
            "lineNumber": f.line_number,
            "snippet": f.snippet,
            "category": f.category,
            "fingerprint": f.fingerprint,
        })
        if clean_fp and clean_fp not in files_list:
            files_list.insert(0, clean_fp)

    vulnerable_files = [fp for fp in files_list if fp in finding_map]
    clean_files = [fp for fp in files_list if fp not in vulnerable_files]
    ordered_files = vulnerable_files + clean_files

    return {
        "runId": str(scan.id),
        "totalFiles": len(ordered_files),
        "files": ordered_files[:100],
        "fileFindings": finding_map,
    }


@router.get("/{run_id}/artifacts", summary="Get generated patches, diffs, and audit artifacts")
async def get_artifacts_endpoint(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scan = await _resolve_scan(db, run_id, current_user)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    plan_stmt = select(RemediationPlan).where(RemediationPlan.project_id == scan.project_id).order_by(desc(RemediationPlan.created_at)).limit(5)
    plans = (await db.execute(plan_stmt)).scalars().all()

    patches_data = []
    for p in plans:
        patch_stmt = select(RemediationPatch).where(RemediationPatch.remediation_plan_id == p.id)
        patch = (await db.execute(patch_stmt)).scalars().first()
        patches_data.append({
            "planId": str(p.id),
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "diff": patch.diff if patch else None,
            "affectedFiles": patch.affected_files if patch else [],
        })

    return {
        "runId": str(scan.id),
        "patches": patches_data,
        "evidenceDossier": f"kavach-audit-{scan.id}.json",
    }
