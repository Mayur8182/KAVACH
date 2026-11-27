"""
Kavach MCP GitHub Repository, Source File, Branch, Patch Application & Pull Request Tools.
Provides real GitHub API & tenant-isolated repository workflows for MCP clients.
"""

from __future__ import annotations

import asyncio
import base64
import difflib
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.engines.remediation.validator import PatchValidator
from app.integrations.github.client import GitHubClient
from app.integrations.github.workspace import _safe_run_subprocess
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.mcp.tools.context_helper import resolve_authorized_project
from app.models.github import GitHubInstallation, GitHubPullRequest, GitHubRepository
from app.models.integration import Integration
from app.models.integration_models import RealIntegration, RealIntegrationRepository
from app.models.project import Project
from app.models.remediation import RemediationPatch, RemediationPlan
from app.models.scan import SecurityFinding
from app.services.audit_service import AuditService
from app.services.workspace_resolver import (
    get_accessible_projects,
    get_user_org_and_workspace_scope,
    normalize_git_remote,
)

logger = logging.getLogger("kavach.mcp.github")


def _extract_owner_repo(full_name_or_url: str) -> Optional[Tuple[str, str, str]]:
    """Parses `owner/repo` or GitHub URL into `(owner, repo_name, owner/repo)` preserving original casing."""
    if not full_name_or_url or not isinstance(full_name_or_url, str):
        return None
    raw = full_name_or_url.strip().strip("/")
    if raw.endswith(".git"):
        raw = raw[:-4]
    if raw.startswith("git@") and ":" in raw:
        raw = raw.split(":", 1)[1].strip("/")
    elif "://" in raw:
        from urllib.parse import urlparse
        parsed = urlparse(raw)
        raw = (parsed.path or "").strip("/")
    elif raw.lower().startswith("github.com/"):
        raw = raw[len("github.com/") :].strip("/")
    parts = [p for p in raw.split("/") if p]
    if len(parts) >= 2:
        owner, name = parts[0], parts[1]
        return owner, name, f"{owner}/{name}"
    return None


async def resolve_project_github_repo(
    project: Optional[Project],
    user_id: uuid.UUID,
    db: AsyncSession,
    repository_arg: Optional[str] = None,
) -> Tuple[Optional[GitHubRepository], List[GitHubRepository]]:
    """
    Resolves the authorized `GitHubRepository` for `project` (or explicit `repository_arg`)
    without crashing when multiple repositories exist under a workspace/project.
    Prioritizes explicit `repository_arg`, then `project.repository_url`, then linked repos.
    """
    _, ws_map, _ = await get_user_org_and_workspace_scope(
        await _load_user_stub(user_id, db),
        db,
    )
    inst_ids = list(
        (
            await db.execute(
                select(GitHubInstallation.id).where(
                    GitHubInstallation.connected_by_user_id == user_id,
                    GitHubInstallation.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )

    conds = []
    if project:
        conds.append(GitHubRepository.project_id == project.id)
        if project.workspace_id:
            conds.append(GitHubRepository.workspace_id == project.workspace_id)
    if ws_map:
        conds.append(GitHubRepository.workspace_id.in_(list(ws_map.keys())))
    if inst_ids:
        conds.append(GitHubRepository.installation_id.in_(inst_ids))

    if not conds:
        return None, []

    candidates = list(
        (
            await db.execute(
                select(GitHubRepository)
                .where(or_(*conds))
                .order_by(desc(GitHubRepository.updated_at))
            )
        )
        .scalars()
        .all()
    )

    if repository_arg:
        norm_arg = normalize_git_remote(repository_arg)
        for r in candidates:
            if (
                str(r.id) == str(repository_arg).strip()
                or (r.full_name and r.full_name.lower() == str(repository_arg).strip().lower())
                or (norm_arg and normalize_git_remote(f"github.com/{r.full_name}") == norm_arg)
            ):
                return r, candidates

    if project and project.repository_url:
        norm_proj_url = normalize_git_remote(project.repository_url)
        for r in candidates:
            if norm_proj_url and normalize_git_remote(f"github.com/{r.full_name}") == norm_proj_url:
                return r, candidates

    if project:
        proj_repos = [r for r in candidates if r.project_id == project.id]
        if proj_repos:
            return proj_repos[0], candidates

    return (candidates[0] if candidates else None), candidates


async def _load_user_stub(user_id: uuid.UUID, db: AsyncSession):
    from app.models.user import User

    u = await db.get(User, user_id)
    if u:
        return u
    return User(id=user_id, email="mcp@kavach.local", name="MCP User", password_hash="", is_active=True)


async def resolve_github_token(
    db: AsyncSession,
    repo: Optional[GitHubRepository] = None,
    project: Optional[Project] = None,
    user_id: Optional[uuid.UUID] = None,
) -> Optional[str]:
    """
    Resolves a real GitHub token scoped to the repository/installation/organization/settings:
    1. GitHub App short-lived installation token (if App credentials & installation exist)
    2. RealIntegration (connected GitHub OAuth/PAT scoped to workspace/org)
    3. Legacy Integration (connected GitHub credentials)
    4. Application GITHUB_TOKEN environment setting
    """
    # 1. GitHub App installation token
    if repo and repo.installation_id:
        inst = await db.get(GitHubInstallation, repo.installation_id)
        if inst and inst.github_installation_id:
            try:
                client = GitHubClient()
                if client.auth.is_configured():
                    return await client.get_installation_token(inst.github_installation_id)
            except Exception as exc:
                logger.warning(f"Installation token retrieval note for {inst.github_installation_id}: {exc}")

    # 2. RealIntegration scoped to organization/workspace first
    from app.core.encryption import decrypt_secret

    org_id = project.organization_id if project else None
    ws_id = (repo.workspace_id if repo else None) or (project.workspace_id if project else None)
    r_stmt = select(RealIntegration).where(
        RealIntegration.provider == "github",
        RealIntegration.status.in_(["connected", "CONNECTED"]),
    )
    if org_id:
        r_stmt = r_stmt.where(RealIntegration.organization_id == org_id)
    elif ws_id:
        r_stmt = r_stmt.where(RealIntegration.workspace_id == ws_id)

    for integ in (await db.execute(r_stmt.order_by(desc(RealIntegration.updated_at)).limit(3))).scalars().all():
        if integ.access_token_encrypted:
            try:
                return decrypt_secret(integ.access_token_encrypted)
            except Exception:
                return integ.access_token_encrypted

    # 3. Legacy Integration table (strictly scoped to project.id)
    if project:
        i_stmt = select(Integration).where(
            Integration.provider == "github",
            Integration.is_connected == True,  # noqa: E712
            Integration.project_id == project.id,
        )
        i_integ = (await db.execute(i_stmt.order_by(desc(Integration.updated_at)).limit(1))).scalars().first()
        if i_integ and i_integ.credentials_json:
            try:
                creds = json.loads(i_integ.credentials_json)
                if creds.get("access_token"):
                    return creds["access_token"]
            except Exception:
                pass

    settings = get_settings()
    return getattr(settings, "github_token", None) or os.getenv("GITHUB_TOKEN")


def resolve_local_repo_workspace(repo: Optional[GitHubRepository], project: Optional[Project]) -> Optional[str]:
    """Finds an existing checked-out workspace directory on disk if one matches this repo/project."""
    settings = get_settings()
    base_ws = os.path.abspath(getattr(settings, "github_workspace_dir", "scratch/github_workspaces"))
    candidates: List[str] = []
    if repo:
        clean_name = (repo.name or "").replace(".git", "")
        candidates.extend(
            [
                os.path.join(base_ws, f"repo_{repo.id}"),
                os.path.join(base_ws, f"repo_{clean_name}"),
                os.path.join(base_ws, clean_name),
            ]
        )
    if project:
        candidates.append(os.path.join(base_ws, f"repo_{project.id}"))
    for cand in candidates:
        if os.path.isdir(cand) and os.path.exists(os.path.join(cand, ".git")):
            return cand
    return None


async def ensure_repo_workspace_cloned(
    repo: Optional[GitHubRepository],
    project: Optional[Project],
    full_name: str,
    branch: str,
    token: Optional[str],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Ensures the target GitHub repository is cloned cleanly into a dedicated workspace directory
    under `github_workspace_dir` (never returning `os.getcwd()` of Kavach's own server).
    Returns `(workspace_path, error_message)`.
    """
    settings = get_settings()
    base_ws = os.path.abspath(getattr(settings, "github_workspace_dir", "scratch/github_workspaces"))
    os.makedirs(base_ws, exist_ok=True)
    ws_id_part = str(repo.id) if repo else (str(project.id) if project else re.sub(r"[^a-zA-Z0-9_-]", "_", full_name))
    target_ws = os.path.join(base_ws, f"repo_{ws_id_part}")

    clone_url = (
        f"https://x-access-token:{token}@github.com/{full_name}.git"
        if token
        else (repo.clone_url if repo and repo.clone_url else f"https://github.com/{full_name}.git")
    )

    if os.path.isdir(os.path.join(target_ws, ".git")):
        # Pull latest ref cleanly if remote matches
        _, rem_out, _ = await _safe_run_subprocess(["git", "-C", target_ws, "remote", "get-url", "origin"])
        rem_str = rem_out.decode("utf-8", errors="replace").strip() if rem_out else ""
        if normalize_git_remote(rem_str) == normalize_git_remote(f"github.com/{full_name}"):
            await _safe_run_subprocess(["git", "-C", target_ws, "remote", "set-url", "origin", clone_url])
            await _safe_run_subprocess(["git", "-C", target_ws, "fetch", "--depth", "20", "origin", branch])
            await _safe_run_subprocess(["git", "-C", target_ws, "checkout", branch])
            await _safe_run_subprocess(["git", "-C", target_ws, "reset", "--hard", f"origin/{branch}"])
            return target_ws, None

    # Clone fresh into clean directory
    temp_dir = os.path.join(base_ws, f"_tmp_{uuid.uuid4().hex[:8]}")
    code, _, err = await _safe_run_subprocess(
        ["git", "clone", "--depth", "20", "--branch", branch, clone_url, temp_dir]
    )
    if code != 0:
        # Fallback without --branch in case branch differs from remote HEAD
        code, _, err = await _safe_run_subprocess(["git", "clone", "--depth", "20", clone_url, temp_dir])
    if code != 0:
        err_text = err.decode("utf-8", errors="replace").strip() if err else "git clone failed"
        err_text = re.sub(r"x-access-token:[^@]+@", "x-access-token:***@", err_text)
        return None, f"Could not clone repository '{full_name}': {err_text[:280]}"

    if os.path.isdir(target_ws):
        import shutil

        shutil.rmtree(target_ws, ignore_errors=True)
    os.replace(temp_dir, target_ws)
    return target_ws, None


def _gh_headers(token: Optional[str]) -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Kavach-Security-MCP",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def fetch_github_file_raw(
    full_name: str,
    file_path: str,
    ref: str,
    token: Optional[str],
    local_ws: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Retrieves actual file text + blob SHA from GitHub REST API (with local workspace fallback).
    Returns `(content_text, git_blob_sha, error_message)`.
    """
    clean_path = (file_path or "").strip().lstrip("/").replace("\\", "/")
    if not clean_path or ".." in clean_path.split("/"):
        return None, None, f"Invalid file_path '{file_path}'."

    url = f"https://api.github.com/repos/{full_name}/contents/{clean_path}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=_gh_headers(token), params={"ref": ref})
            if resp.status_code == 200:
                payload = resp.json()
                if isinstance(payload, list):
                    return None, None, f"'{clean_path}' is a directory on '{full_name}', not a file."
                raw_b64 = payload.get("content", "")
                sha = payload.get("sha")
                if payload.get("encoding") == "base64" and raw_b64:
                    text = base64.b64decode(raw_b64).decode("utf-8", errors="replace")
                    return text, sha, None
                if payload.get("download_url"):
                    dl = await client.get(payload["download_url"], headers=_gh_headers(token))
                    if dl.status_code == 200:
                        return dl.text, sha, None
            elif resp.status_code in (401, 403, 404):
                msg = resp.json().get("message", f"HTTP {resp.status_code}") if resp.text else f"HTTP {resp.status_code}"
                gh_err = f"GitHub API ({resp.status_code}) fetching '{clean_path}'@{ref} on '{full_name}': {msg}"
            else:
                gh_err = f"GitHub API returned {resp.status_code} for '{clean_path}'@{ref}."
    except Exception as exc:
        gh_err = f"GitHub request error fetching '{clean_path}': {exc}"

    if local_ws and os.path.isdir(local_ws):
        disk_path = os.path.abspath(os.path.join(local_ws, clean_path))
        if disk_path.startswith(os.path.abspath(local_ws)) and os.path.isfile(disk_path):
            try:
                with open(disk_path, "r", encoding="utf-8", errors="replace") as f:
                    return f.read(), None, None
            except Exception as read_exc:
                return None, None, f"{gh_err}; local read error: {read_exc}"

    return None, None, gh_err


async def _resolve_target_repo_full_name(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> Tuple[Optional[Project], Optional[GitHubRepository], Optional[str], Optional[str], Optional[str], Optional[ToolExecutionResult]]:
    """
    Resolves `(project, repo, full_name, default_branch, token, error_result)`.
    Never fails with AttributeError on valid project/repo combinations.
    """
    project, err = await resolve_authorized_project(context, arguments, db)
    if err:
        return None, None, None, None, None, err

    explicit_repo = str(arguments.get("repository") or arguments.get("repo") or "").strip() or None
    repo, _ = await resolve_project_github_repo(
        project,
        context.identity.agent_id,
        db,
        repository_arg=explicit_repo,
    )

    full_name: Optional[str] = None
    default_branch = "main"

    if explicit_repo:
        parsed = _extract_owner_repo(explicit_repo)
        if parsed:
            _, _, full_name = parsed
    if not full_name and repo and repo.full_name:
        full_name = repo.full_name
        default_branch = repo.default_branch or "main"
    elif not full_name and project.repository_url:
        parsed = _extract_owner_repo(project.repository_url)
        if parsed:
            _, _, full_name = parsed
        default_branch = project.default_branch or "main"

    if not full_name:
        return (
            project,
            repo,
            None,
            default_branch,
            None,
            ToolExecutionResult(
                status="NOT_CONFIGURED",
                message=(
                    f"No GitHub repository is linked to project '{project.name}'. "
                    "Call `connect_repository` with `owner/repo` first."
                ),
                error_code="MCP_NOT_CONFIGURED",
            ),
        )

    token = await resolve_github_token(db, repo=repo, project=project, user_id=context.identity.agent_id)
    if repo and repo.default_branch:
        default_branch = repo.default_branch
    elif project.default_branch:
        default_branch = project.default_branch

    return project, repo, full_name, default_branch, token, None


# ── Tool Handlers ─────────────────────────────────────────────────────────────


async def execute_get_github_repository(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Retrieves verified GitHub repository metadata for the active/requested project."""
    project, err_result = await resolve_authorized_project(context, arguments, db)
    if err_result:
        return err_result

    repo_arg = arguments.get("repository") or arguments.get("repository_id")
    repo, all_repos = await resolve_project_github_repo(
        project, context.identity.agent_id, db, repository_arg=repo_arg
    )

    if not repo and not project.repository_url:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message=f"No GitHub repository connected to project '{project.name}'. Call `connect_repository` first.",
            error_code="MCP_NOT_CONFIGURED",
        )

    if not repo and project.repository_url:
        parsed = _extract_owner_repo(project.repository_url)
        if not parsed:
            return ToolExecutionResult(
                status="NOT_CONFIGURED",
                message=f"Project '{project.name}' has invalid repository URL '{project.repository_url}'.",
                error_code="MCP_NOT_CONFIGURED",
            )
        owner, name, full_name = parsed
        return ToolExecutionResult(
            status="SUCCESS",
            data={
                "id": None,
                "project_id": str(project.id),
                "owner": owner,
                "name": name,
                "repo_name": name,
                "full_name": full_name,
                "default_branch": project.default_branch or "main",
                "html_url": project.repository_url,
                "private": None,
                "status": "LINKED_URL_ONLY",
                "github_app_synced": False,
                "available_repositories": [
                    {"id": str(r.id), "full_name": r.full_name, "default_branch": r.default_branch}
                    for r in all_repos[:20]
                ],
            },
            message=f"Resolved linked repository '{full_name}' from project '{project.name}'.",
            result_reference=str(project.id),
        )

    assert repo is not None
    status_label = "ARCHIVED" if repo.archived else "ACTIVE"
    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(repo.id),
            "project_id": str(repo.project_id) if repo.project_id else str(project.id),
            "workspace_id": str(repo.workspace_id) if repo.workspace_id else None,
            "owner": repo.owner,
            "name": repo.name,
            "repo_name": repo.name,
            "full_name": repo.full_name,
            "default_branch": repo.default_branch or "main",
            "private": bool(repo.private),
            "visibility": repo.visibility,
            "html_url": repo.html_url,
            "archived": bool(repo.archived),
            "status": status_label,
            "last_synced_at": repo.last_synced_at.isoformat() if repo.last_synced_at else None,
            "available_repositories": [
                {"id": str(r.id), "full_name": r.full_name, "project_id": str(r.project_id) if r.project_id else None}
                for r in all_repos[:20]
            ],
        },
        message=f"Retrieved GitHub repository '{repo.full_name}' for project '{project.name}'.",
        result_reference=str(repo.id),
    )


async def execute_get_pull_request(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """Retrieves pull request details from PostgreSQL or live GitHub API."""
    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err

    raw_pr = arguments.get("pr_number") or arguments.get("number")
    if not raw_pr:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Missing required parameter 'pr_number'.",
            error_code="MCP_INVALID_INPUT",
        )
    try:
        pr_num = int(raw_pr)
    except (TypeError, ValueError):
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message=f"Invalid pull request number: '{raw_pr}'.",
            error_code="MCP_INVALID_INPUT",
        )

    pr: Optional[GitHubPullRequest] = None
    if repo:
        stmt = (
            select(GitHubPullRequest)
            .where(GitHubPullRequest.repository_id == repo.id, GitHubPullRequest.number == pr_num)
            .order_by(desc(GitHubPullRequest.updated_at))
        )
        pr = (await db.execute(stmt)).scalars().first()

    if pr:
        return ToolExecutionResult(
            status="SUCCESS",
            data={
                "id": str(pr.id),
                "project_id": str(project.id) if project else None,
                "repository": full_name,
                "pr_number": pr.number,
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "head_branch": pr.head_ref,
                "head_ref": pr.head_ref,
                "base_branch": pr.base_ref,
                "base_ref": pr.base_ref,
                "head_sha": pr.head_sha,
                "merged": bool(pr.merged),
                "html_url": pr.html_url,
            },
            message=f"Retrieved PR #{pr.number}: '{pr.title}'.",
            result_reference=str(pr.id),
        )

    # Live GitHub fallback if PR was opened directly on GitHub
    if full_name:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"https://api.github.com/repos/{full_name}/pulls/{pr_num}",
                    headers=_gh_headers(token),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return ToolExecutionResult(
                        status="SUCCESS",
                        data={
                            "id": str(data.get("id")),
                            "project_id": str(project.id) if project else None,
                            "repository": full_name,
                            "pr_number": data.get("number"),
                            "number": data.get("number"),
                            "title": data.get("title"),
                            "state": data.get("state"),
                            "head_branch": data.get("head", {}).get("ref"),
                            "head_ref": data.get("head", {}).get("ref"),
                            "base_branch": data.get("base", {}).get("ref"),
                            "base_ref": data.get("base", {}).get("ref"),
                            "head_sha": data.get("head", {}).get("sha"),
                            "merged": bool(data.get("merged", False)),
                            "html_url": data.get("html_url"),
                        },
                        message=f"Retrieved live PR #{data.get('number')} from '{full_name}'.",
                    )
        except Exception as exc:
            logger.warning(f"Live PR lookup failed for {full_name}#{pr_num}: {exc}")

    return ToolExecutionResult(
        status="NOT_FOUND",
        message=f"Pull request #{pr_num} not found in '{full_name}'.",
        error_code="MCP_RESOURCE_NOT_FOUND",
    )


async def execute_get_file_content(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves actual source code from the connected GitHub repository (or checked-out workspace).
    Supports optional `ref`/`branch`, `start_line`, and `end_line`.
    """
    file_path = str(arguments.get("file_path") or arguments.get("path") or "").strip()
    if not file_path:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Missing required parameter 'file_path'.",
            error_code="MCP_INVALID_INPUT",
        )

    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err
    assert full_name is not None

    ref = str(arguments.get("ref") or arguments.get("branch") or default_branch or "main").strip()
    local_ws = resolve_local_repo_workspace(repo, project)
    content, blob_sha, fetch_err = await fetch_github_file_raw(
        full_name=full_name,
        file_path=file_path,
        ref=ref,
        token=token,
        local_ws=local_ws,
    )
    if content is None:
        return ToolExecutionResult(
            status="NOT_FOUND" if "404" in (fetch_err or "") else "FAILED",
            message=fetch_err or f"Unable to retrieve '{file_path}' from '{full_name}'@{ref}.",
            error_code="MCP_RESOURCE_NOT_FOUND" if "404" in (fetch_err or "") else "MCP_EXECUTION_FAILED",
        )

    lines = content.splitlines()
    total_lines = len(lines)
    start_line = arguments.get("start_line")
    end_line = arguments.get("end_line")
    sliced = False
    view_content = content
    if start_line is not None or end_line is not None:
        s_idx = max(1, int(start_line or 1))
        e_idx = min(total_lines, int(end_line or total_lines))
        view_content = "\n".join(lines[s_idx - 1 : e_idx])
        sliced = True
    elif len(content) > 65000:
        view_content = "\n".join(lines[:500])
        sliced = True

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "repository": full_name,
            "file_path": file_path.lstrip("/"),
            "ref": ref,
            "sha": blob_sha,
            "total_lines": total_lines,
            "sliced": sliced,
            "content": view_content,
        },
        message=f"Retrieved real source '{file_path}'@{ref} from '{full_name}' ({total_lines} lines).",
        result_reference=f"{full_name}:{file_path}@{ref}",
    )


async def execute_create_branch(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Creates a real branch (e.g. `security/ai-remediation`) on the connected GitHub repository.
    Never modifies the base branch; requires valid write authorization on GitHub.
    """
    branch_name = str(arguments.get("branch_name") or arguments.get("branch") or "").strip()
    if not branch_name:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Missing required parameter 'branch_name' (e.g. 'security/ai-remediation').",
            error_code="MCP_INVALID_INPUT",
        )
    if re.search(r"\s|\.\.|~|\^|:", branch_name) or branch_name.startswith("/"):
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message=f"Invalid Git branch name: '{branch_name}'.",
            error_code="MCP_INVALID_INPUT",
        )

    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err
    assert full_name is not None

    if not token:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message=(
                f"GitHub write credentials are missing for '{full_name}'. "
                "Connect the Kavach GitHub App or configure a token with `Contents: Read & Write`."
            ),
            error_code="MCP_NOT_CONFIGURED",
        )

    base_branch = str(arguments.get("base_branch") or default_branch or "main").strip()
    headers = _gh_headers(token)

    async with httpx.AsyncClient(timeout=20.0) as client:
        ref_resp = await client.get(
            f"https://api.github.com/repos/{full_name}/git/ref/heads/{base_branch}",
            headers=headers,
        )
        if ref_resp.status_code != 200:
            return ToolExecutionResult(
                status="FAILED",
                message=f"Failed to resolve base branch '{base_branch}' on '{full_name}': {ref_resp.text[:250]}",
                error_code="MCP_GITHUB_API_ERROR",
            )
        base_sha = ref_resp.json()["object"]["sha"]

        create_resp = await client.post(
            f"https://api.github.com/repos/{full_name}/git/refs",
            headers=headers,
            json={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
        )
        already_existed = False
        branch_sha = base_sha
        if create_resp.status_code in (200, 201):
            branch_sha = create_resp.json().get("object", {}).get("sha", base_sha)
        elif create_resp.status_code == 422:
            existing_ref = await client.get(
                f"https://api.github.com/repos/{full_name}/git/ref/heads/{branch_name}",
                headers=headers,
            )
            if existing_ref.status_code == 200:
                already_existed = True
                branch_sha = existing_ref.json().get("object", {}).get("sha", base_sha)
            else:
                return ToolExecutionResult(
                    status="FAILED",
                    message=f"GitHub rejected branch '{branch_name}': {create_resp.text[:250]}",
                    error_code="MCP_GITHUB_API_ERROR",
                )
        else:
            return ToolExecutionResult(
                status="FAILED",
                message=f"GitHub API ({create_resp.status_code}) creating branch '{branch_name}': {create_resp.text[:250]}",
                error_code="MCP_GITHUB_API_ERROR",
            )

    local_ws = resolve_local_repo_workspace(repo, project)
    if local_ws:
        await _safe_run_subprocess(["git", "-C", local_ws, "fetch", "origin", branch_name])
        await _safe_run_subprocess(["git", "-C", local_ws, "checkout", "-B", branch_name])

    await AuditService(db).log_event(
        action="GITHUB_BRANCH_CREATED",
        resource_type="mcp_tool",
        actor_type="user",
        actor_id=str(context.identity.agent_id),
        resource_id=f"{full_name}:{branch_name}",
        project_id=project.id if project else None,
        status="SUCCESS",
        metadata={"repository": full_name, "branch": branch_name, "base_branch": base_branch, "sha": branch_sha},
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "repository": full_name,
            "branch": branch_name,
            "base_branch": base_branch,
            "commit_sha": branch_sha,
            "already_existed": already_existed,
            "html_url": f"https://github.com/{full_name}/tree/{branch_name}",
        },
        message=(
            f"Branch '{branch_name}' is ready on '{full_name}' (SHA {branch_sha[:10]})."
            if already_existed
            else f"Created branch '{branch_name}' from '{base_branch}' on '{full_name}' (SHA {branch_sha[:10]})."
        ),
        result_reference=branch_name,
    )


async def execute_apply_remediation_patch(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Applies a real source patch (unified diff or explicit `patched_content`) onto a remediation branch
    and commits it cleanly to the connected GitHub repository with PostgreSQL evidence.
    Never pushes unapproved placeholder patches or direct commits to default/main unless explicitly allowed.
    """
    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err
    assert full_name is not None

    if not token:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message=f"GitHub write credentials missing for '{full_name}'. Install Kavach GitHub App or configure PAT.",
            error_code="MCP_NOT_CONFIGURED",
        )

    finding: Optional[SecurityFinding] = None
    raw_fid = arguments.get("finding_id")
    if raw_fid:
        try:
            finding = await db.get(SecurityFinding, uuid.UUID(str(raw_fid)))
        except (ValueError, TypeError):
            return ToolExecutionResult(status="INVALID_INPUT", message="Invalid finding_id UUID.", error_code="MCP_INVALID_INPUT")
        if not finding or (project and finding.project_id and finding.project_id != project.id):
            return ToolExecutionResult(status="DENIED", message="Finding not found in active authorized project.", error_code="MCP_TENANT_ACCESS_DENIED")

    file_path = str(
        arguments.get("file_path") or (finding.file_path if finding else "") or ""
    ).strip().lstrip("/")
    if not file_path:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Missing 'file_path' (or 'finding_id' pointing to a file).",
            error_code="MCP_INVALID_INPUT",
        )

    branch = str(arguments.get("branch") or arguments.get("branch_name") or "security/ai-remediation").strip()
    if branch in {"main", "master", default_branch} and not arguments.get("allow_default_branch"):
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message=f"Refusing direct patch commit to protected/default branch '{branch}'. Use a remediation branch such as 'security/ai-remediation'.",
            error_code="MCP_PROTECTED_BRANCH",
        )

    patch_diff = str(arguments.get("patch") or arguments.get("diff") or "").strip()
    patched_content_arg = arguments.get("patched_content")
    if not patch_diff and patched_content_arg is None:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message="Provide either 'patch' (unified diff) or 'patched_content' to apply.",
            error_code="MCP_INVALID_INPUT",
        )

    # Ensure remediation branch exists if create_branch_if_missing=True (default)
    headers = _gh_headers(token)
    async with httpx.AsyncClient(timeout=25.0) as client:
        branch_ref = await client.get(
            f"https://api.github.com/repos/{full_name}/git/ref/heads/{branch}",
            headers=headers,
        )
        if branch_ref.status_code == 404:
            if not arguments.get("create_branch_if_missing", True):
                return ToolExecutionResult(
                    status="NOT_FOUND",
                    message=f"Branch '{branch}' does not exist on '{full_name}'. Call `create_branch` first.",
                    error_code="MCP_RESOURCE_NOT_FOUND",
                )
            base_ref = await client.get(
                f"https://api.github.com/repos/{full_name}/git/ref/heads/{default_branch or 'main'}",
                headers=headers,
            )
            if base_ref.status_code != 200:
                return ToolExecutionResult(
                    status="FAILED",
                    message=f"Could not find base branch '{default_branch}' to branch '{branch}': {base_ref.text[:200]}",
                    error_code="MCP_GITHUB_API_ERROR",
                )
            base_sha = base_ref.json()["object"]["sha"]
            mk_ref = await client.post(
                f"https://api.github.com/repos/{full_name}/git/refs",
                headers=headers,
                json={"ref": f"refs/heads/{branch}", "sha": base_sha},
            )
            if mk_ref.status_code not in (200, 201, 422):
                return ToolExecutionResult(
                    status="FAILED",
                    message=f"Failed to create branch '{branch}': {mk_ref.text[:250]}",
                    error_code="MCP_GITHUB_API_ERROR",
                )

    local_ws = resolve_local_repo_workspace(repo, project)
    original_content, blob_sha, fetch_err = await fetch_github_file_raw(
        full_name=full_name,
        file_path=file_path,
        ref=branch,
        token=token,
        local_ws=local_ws,
    )
    if original_content is None:
        return ToolExecutionResult(
            status="NOT_FOUND" if "404" in (fetch_err or "") else "FAILED",
            message=fetch_err or f"Unable to fetch original file '{file_path}'@{branch} before patching.",
            error_code="MCP_EXECUTION_FAILED",
        )

    if patched_content_arg is not None:
        new_content = str(patched_content_arg)
        applied_diff = "".join(
            difflib.unified_diff(
                original_content.splitlines(keepends=True),
                new_content.splitlines(keepends=True),
                fromfile=f"a/{file_path}",
                tofile=f"b/{file_path}",
            )
        )
        if not applied_diff.strip():
            return ToolExecutionResult(
                status="INVALID_INPUT",
                message="Supplied `patched_content` matches the existing file with zero changes.",
                error_code="MCP_INVALID_INPUT",
            )
    else:
        ok, new_content, apply_msg = PatchValidator.apply_diff_to_text(original_content, patch_diff)
        if not ok:
            return ToolExecutionResult(
                status="INVALID_INPUT",
                message=f"Failed to apply unified diff cleanly against '{file_path}'@{branch}: {apply_msg}",
                error_code="MCP_PATCH_APPLY_FAILED",
            )
        applied_diff = patch_diff

    syntax_ok, syntax_msg = PatchValidator.validate_syntax_for_file(file_path, new_content)
    if not syntax_ok:
        return ToolExecutionResult(
            status="FAILED",
            message=f"Refusing commit because patched code failed syntax validation: {syntax_msg}",
            error_code="MCP_SYNTAX_ERROR",
        )

    commit_msg = str(
        arguments.get("commit_message")
        or f"fix(security): remediate {(finding.rule_id if finding else 'security finding')} in {file_path}"
    )
    put_payload: Dict[str, Any] = {
        "message": commit_msg,
        "content": base64.b64encode(new_content.encode("utf-8")).decode("ascii"),
        "branch": branch,
    }
    if blob_sha:
        put_payload["sha"] = blob_sha

    async with httpx.AsyncClient(timeout=25.0) as client:
        put_resp = await client.put(
            f"https://api.github.com/repos/{full_name}/contents/{file_path}",
            headers=headers,
            json=put_payload,
        )
        if put_resp.status_code not in (200, 201):
            return ToolExecutionResult(
                status="FAILED",
                message=f"GitHub Contents API ({put_resp.status_code}) failed committing patch: {put_resp.text[:300]}",
                error_code="MCP_GITHUB_API_ERROR",
            )
        put_json = put_resp.json()

    commit_sha = put_json.get("commit", {}).get("sha")
    file_html_url = put_json.get("content", {}).get("html_url")

    # Persist real RemediationPlan & RemediationPatch record in PostgreSQL
    plan = RemediationPlan(
        id=uuid.uuid4(),
        project_id=project.id if project else uuid.uuid4(),
        title=f"MCP Applied Patch: {file_path}",
        description=commit_msg,
        type="SOURCE_CODE_PATCH",
        risk_level="LOW_RISK",
        status="APPLIED",
        created_by_type="MCP_AGENT",
        created_by_id=str(context.identity.agent_id),
    )
    db.add(plan)
    await db.flush()
    patch_row = RemediationPatch(
        id=uuid.uuid4(),
        remediation_plan_id=plan.id,
        patch_format="unified_diff",
        diff=applied_diff,
        affected_files=[file_path],
        generated_by="kavach-mcp",
        generation_model="mcp-agent",
        generation_provider="Kavach",
        status="APPLIED",
    )
    db.add(patch_row)

    await AuditService(db).log_event(
        action="REMEDIATION_PATCH_APPLIED",
        resource_type="mcp_tool",
        actor_type="user",
        actor_id=str(context.identity.agent_id),
        resource_id=str(patch_row.id),
        project_id=project.id if project else None,
        status="SUCCESS",
        metadata={
            "repository": full_name,
            "branch": branch,
            "file_path": file_path,
            "commit_sha": commit_sha,
            "finding_id": str(finding.id) if finding else None,
        },
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "repository": full_name,
            "branch": branch,
            "file_path": file_path,
            "commit_sha": commit_sha,
            "commit_url": file_html_url,
            "patch_id": str(patch_row.id),
            "plan_id": str(plan.id),
            "applied_diff": applied_diff,
            "syntax_valid": True,
            "syntax_message": syntax_msg,
            "next_step": "Call `verify_patch` with the same `branch`, `file_path`, and `finding_id`/`rule_id` before opening the PR.",
        },
        message=f"Applied verified patch to '{file_path}' on branch '{branch}' (commit {str(commit_sha)[:10]}).",
        result_reference=str(patch_row.id),
    )


async def execute_create_pull_request(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Opens a real reviewable Pull Request on GitHub from a remediation branch into base branch
    and records the PR in PostgreSQL. Never auto-merges.
    """
    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err
    assert full_name is not None

    if not token:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message=f"GitHub write credentials missing for '{full_name}'. Install Kavach GitHub App or configure PAT.",
            error_code="MCP_NOT_CONFIGURED",
        )

    head_branch = str(arguments.get("head_branch") or arguments.get("branch") or "security/ai-remediation").strip()
    base_branch = str(arguments.get("base_branch") or default_branch or "main").strip()
    if head_branch == base_branch:
        return ToolExecutionResult(
            status="INVALID_INPUT",
            message=f"`head_branch` and `base_branch` cannot both be '{base_branch}'.",
            error_code="MCP_INVALID_INPUT",
        )

    title = str(arguments.get("title") or "Security: AI remediation for verified findings").strip()
    body = str(
        arguments.get("body")
        or (
            "## Kavach Security Remediation\n\n"
            f"- **Repository:** `{full_name}`\n"
            f"- **Remediation Branch:** `{head_branch}` -> `{base_branch}`\n"
            "- **Verification:** Prepared via Kavach MCP Security Gateway.\n"
        )
    )
    draft = bool(arguments.get("draft", False))
    headers = _gh_headers(token)
    owner = full_name.split("/", 1)[0]

    async with httpx.AsyncClient(timeout=25.0) as client:
        pr_resp = await client.post(
            f"https://api.github.com/repos/{full_name}/pulls",
            headers=headers,
            json={"title": title, "body": body, "head": head_branch, "base": base_branch, "draft": draft},
        )
        reused = False
        if pr_resp.status_code in (200, 201):
            pr_data = pr_resp.json()
        elif pr_resp.status_code == 422:
            existing_resp = await client.get(
                f"https://api.github.com/repos/{full_name}/pulls",
                headers=headers,
                params={"head": f"{owner}:{head_branch}", "state": "open"},
            )
            if existing_resp.status_code == 200 and existing_resp.json():
                pr_data = existing_resp.json()[0]
                reused = True
            else:
                return ToolExecutionResult(
                    status="FAILED",
                    message=f"GitHub rejected PR creation ({head_branch} -> {base_branch}): {pr_resp.text[:350]}",
                    error_code="MCP_GITHUB_API_ERROR",
                )
        else:
            return ToolExecutionResult(
                status="FAILED",
                message=f"GitHub API ({pr_resp.status_code}) opening pull request: {pr_resp.text[:350]}",
                error_code="MCP_GITHUB_API_ERROR",
            )

    pr_num = pr_data.get("number")
    pr_url = pr_data.get("html_url")
    gh_pr_id = pr_data.get("id")
    head_sha = (pr_data.get("head") or {}).get("sha") or "HEAD"
    base_sha = (pr_data.get("base") or {}).get("sha") or base_branch

    if repo and pr_num and pr_url:
        ex_stmt = select(GitHubPullRequest).where(
            GitHubPullRequest.repository_id == repo.id,
            GitHubPullRequest.number == int(pr_num),
        )
        ex_pr = (await db.execute(ex_stmt)).scalars().first()
        if not ex_pr:
            db.add(
                GitHubPullRequest(
                    id=uuid.uuid4(),
                    repository_id=repo.id,
                    github_pr_id=int(gh_pr_id or pr_num),
                    number=int(pr_num),
                    title=title,
                    state=str(pr_data.get("state") or "open"),
                    head_sha=head_sha,
                    base_sha=base_sha,
                    head_ref=head_branch,
                    base_ref=base_branch,
                    author_login=(pr_data.get("user") or {}).get("login") or owner,
                    draft=draft,
                    merged=bool(pr_data.get("merged", False)),
                    html_url=pr_url,
                )
            )

    await AuditService(db).log_event(
        action="GITHUB_PULL_REQUEST_CREATED",
        resource_type="mcp_tool",
        actor_type="user",
        actor_id=str(context.identity.agent_id),
        resource_id=f"{full_name}#{pr_num}",
        project_id=project.id if project else None,
        status="SUCCESS",
        metadata={"repository": full_name, "pr_number": pr_num, "html_url": pr_url, "head": head_branch, "base": base_branch},
    )
    await db.commit()

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "repository": full_name,
            "pr_number": pr_num,
            "number": pr_num,
            "html_url": pr_url,
            "state": pr_data.get("state", "open"),
            "head_branch": head_branch,
            "base_branch": base_branch,
            "head_sha": head_sha,
            "draft": bool(pr_data.get("draft", draft)),
            "existing_pr_reused": reused,
        },
        message=f"Pull Request #{pr_num} ready on '{full_name}': {pr_url}",
        result_reference=str(pr_url or pr_num),
    )


async def execute_list_github_repositories(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Lists all authorized GitHub repositories & App installations accessible to the user's tenant
    (plus active project linkage) so ChatGPT can inspect or switch repositories seamlessly.
    """
    from app.models.user import User

    user = await db.get(User, context.identity.agent_id)
    if not user:
        return ToolExecutionResult(status="DENIED", message="Authenticated user not found.", error_code="MCP_AUTH_FAILED")

    _, ws_map, _ = await get_user_org_and_workspace_scope(user, db)
    projects = await get_accessible_projects(user, db)
    proj_map = {p.id: p for p in projects}

    inst_filters = [GitHubInstallation.connected_by_user_id == user.id]
    if getattr(user, "github_user_id", None):
        try:
            inst_filters.append(GitHubInstallation.github_account_id == int(user.github_user_id))
        except (ValueError, TypeError):
            pass
    if ws_map:
        inst_filters.append(GitHubInstallation.workspace_id.in_(list(ws_map.keys())))

    installations = list(
        (
            await db.execute(
                select(GitHubInstallation).where(
                    or_(*inst_filters),
                    GitHubInstallation.status == "ACTIVE",
                )
            )
        )
        .scalars()
        .all()
    )
    inst_ids = [i.id for i in installations]

    # Optionally sync repositories live from GitHub App installations when requested
    if arguments.get("sync_live", False) and installations:
        from app.services.github_service import GitHubService

        gh_srv = GitHubService(db)
        for inst in installations:
            if inst.installation_id:
                try:
                    await gh_srv.sync_installation_repositories(
                        installation_id=inst.installation_id,
                        workspace_id=inst.workspace_id,
                    )
                except Exception as exc:
                    logger.warning(f"[MCP] Live sync skipped for installation {inst.installation_id}: {exc}")

    repo_conds = []
    if ws_map:
        repo_conds.append(GitHubRepository.workspace_id.in_(list(ws_map.keys())))
    if proj_map:
        repo_conds.append(GitHubRepository.project_id.in_(list(proj_map.keys())))
    if inst_ids:
        repo_conds.append(GitHubRepository.installation_id.in_(inst_ids))

    repos: List[GitHubRepository] = []
    if repo_conds:
        repos = list(
            (
                await db.execute(
                    select(GitHubRepository)
                    .where(or_(*repo_conds))
                    .order_by(desc(GitHubRepository.updated_at))
                )
            )
            .scalars()
            .all()
        )

    active_proj, _ = await resolve_authorized_project(context, arguments, db)
    active_proj_id = active_proj.id if active_proj else None

    seen_full = set()
    repo_items: List[Dict[str, Any]] = []
    for r in repos:
        key = (r.full_name or "").lower()
        if key in seen_full:
            continue
        seen_full.add(key)
        linked_proj = proj_map.get(r.project_id) if r.project_id else None
        repo_items.append(
            {
                "id": str(r.id),
                "full_name": r.full_name,
                "name": r.name,
                "owner": r.owner,
                "default_branch": r.default_branch,
                "private": bool(r.private),
                "archived": bool(r.archived),
                "html_url": r.html_url,
                "linked_project_id": str(r.project_id) if r.project_id else None,
                "linked_project_name": linked_proj.name if linked_proj else None,
                "is_active_project_repo": bool(active_proj_id and r.project_id == active_proj_id),
            }
        )

    if not installations and not repo_items:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            data={
                "github_connected": False,
                "installations": [],
                "repositories": [],
            },
            message="GITHUB NOT CONNECTED: No active GitHub App installation or repository found. Connect GitHub in Kavach first or call `connect_repository` with 'owner/repo'.",
            error_code="GITHUB_NOT_CONNECTED",
        )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "github_connected": True,
            "installations_count": len(installations),
            "installations": [
                {
                    "installation_id": i.installation_id,
                    "account_login": i.github_account_login,
                    "account_type": i.github_account_type,
                }
                for i in installations
            ],
            "total_repositories": len(repo_items),
            "active_project": (
                {
                    "id": str(active_proj.id),
                    "name": active_proj.name,
                    "repository_url": active_proj.repository_url,
                }
                if active_proj
                else None
            ),
            "repositories": repo_items,
            "github_repositories": repo_items,
        },
        message=f"Found {len(repo_items)} authorized GitHub repository(ies) across {len(installations)} installation(s).",
    )


async def execute_list_pull_requests(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Lists Pull Requests for the active/specified project's connected repository
    from PostgreSQL and live GitHub API when credentials are present.
    """
    project, repo, full_name, default_branch, token, err = await _resolve_target_repo_full_name(context, arguments, db)
    if err:
        return err
    assert full_name is not None

    state_filter = str(arguments.get("state") or "open").strip().lower()
    if state_filter not in {"open", "closed", "all"}:
        state_filter = "open"
    try:
        limit = max(1, min(int(arguments.get("limit", 20)), 50))
    except (TypeError, ValueError):
        limit = 20

    pr_by_num: Dict[int, Dict[str, Any]] = {}
    if repo:
        stmt = select(GitHubPullRequest).where(GitHubPullRequest.repository_id == repo.id)
        if state_filter != "all":
            stmt = stmt.where(GitHubPullRequest.state == state_filter)
        db_prs = (await db.execute(stmt.order_by(desc(GitHubPullRequest.created_at)).limit(limit))).scalars().all()
        for pr in db_prs:
            pr_by_num[int(pr.number)] = {
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "head_branch": pr.head_ref,
                "base_branch": pr.base_ref,
                "draft": bool(pr.draft),
                "merged": bool(pr.merged),
                "html_url": pr.html_url,
                "author": pr.author_login,
                "source": "database",
            }

    if token:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                gh_resp = await client.get(
                    f"https://api.github.com/repos/{full_name}/pulls",
                    params={"state": state_filter, "per_page": limit},
                    headers=_gh_headers(token),
                )
                if gh_resp.status_code == 200:
                    for item in gh_resp.json():
                        num = int(item.get("number", 0))
                        if num:
                            pr_by_num[num] = {
                                "number": num,
                                "title": item.get("title"),
                                "state": item.get("state"),
                                "head_branch": (item.get("head") or {}).get("ref"),
                                "base_branch": (item.get("base") or {}).get("ref"),
                                "draft": bool(item.get("draft", False)),
                                "merged": bool(item.get("merged_at")),
                                "html_url": item.get("html_url"),
                                "author": (item.get("user") or {}).get("login"),
                                "source": "github_live",
                            }
        except Exception as exc:
            logger.warning(f"[MCP] Live PR listing fallback to DB for {full_name}: {exc}")

    items = sorted(pr_by_num.values(), key=lambda x: x["number"], reverse=True)[:limit]
    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "repository": full_name,
            "state": state_filter,
            "total_count": len(items),
            "pull_requests": items,
        },
        message=f"Retrieved {len(items)} pull request(s) for '{full_name}' (state={state_filter}).",
        result_reference=full_name,
    )
