import os
import subprocess
import uuid
import logging
from dataclasses import dataclass
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.scan import SecurityFinding
from app.models.github import GitHubRepository
from app.models.project import Project
from app.models.user import User

logger = logging.getLogger("kavach.remediation.context")


@dataclass
class RepositoryContext:
    project_id: Optional[uuid.UUID]
    repository_id: Optional[uuid.UUID]
    repository_name: str
    root_path: str
    commit_sha: str
    branch: str


def _get_git_commit_sha(repo_dir: str) -> str:
    """Safely retrieves HEAD commit SHA of local git directory, or placeholder."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        return res.stdout.strip()
    except Exception:
        return "0000000000000000000000000000000000000000"


def _get_git_branch(repo_dir: str) -> str:
    """Safely retrieves active git branch name."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        return res.stdout.strip()
    except Exception:
        return "main"


def sanitize_and_resolve_path(root_path: str, relative_path: str) -> str:
    """
    Prevents path traversal attacks. Ensures the resolved path is strictly
    located within root_path.
    """
    normalized_rel = os.path.normpath(relative_path).lstrip(os.sep).lstrip("/").lstrip("\\")
    if ".." in normalized_rel.split(os.sep):
        raise ValueError(f"Path traversal detected in file path: {relative_path}")

    abs_target = os.path.abspath(os.path.join(root_path, normalized_rel))
    abs_root = os.path.abspath(root_path)

    # Common path check
    common = os.path.commonpath([abs_root, abs_target])
    if common != abs_root:
        raise ValueError(f"Target path {abs_target} escapes root repository boundary {abs_root}")

    return abs_target


async def resolve_repository_context(
    db: AsyncSession,
    finding: SecurityFinding,
    current_user: Optional[User] = None,
) -> RepositoryContext:
    """
    Resolves the authoritative repository workspace directory, commit SHA, and branch
    for a given SecurityFinding. Enforces strict project authorization.
    """
    # 1. Project Authorization Gate
    target_project_id = finding.project_id
    if target_project_id and current_user and not getattr(current_user, "is_superuser", False):
        proj = await db.get(Project, target_project_id)
        if proj and proj.owner_id != current_user.id:
            raise PermissionError(f"User {current_user.id} is not authorized to access project {target_project_id}")

    # 2. Resolve Repository Entity
    repo_entity: Optional[GitHubRepository] = None
    repo_name = getattr(finding, "repository", None) or "kavach"

    if target_project_id:
        # Check if project has an associated repository
        r_stmt = select(GitHubRepository).where(GitHubRepository.project_id == target_project_id).limit(1)
        repo_entity = (await db.execute(r_stmt)).scalar_one_or_none()

    if not repo_entity and repo_name and repo_name not in ("target", "repository", "codebase"):
        r_stmt = select(GitHubRepository).where(
            or_(
                GitHubRepository.name == repo_name,
                GitHubRepository.full_name == repo_name,
            )
        ).limit(1)
        repo_entity = (await db.execute(r_stmt)).scalar_one_or_none()

    # 3. Determine Workspace Root Directory
    # Default to the application workspace root (where the project lives)
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))

    # If the repository is cloned locally under a specific workspace folder
    custom_repo_path = None
    if repo_entity and getattr(repo_entity, "local_path", None):
        custom_repo_path = repo_entity.local_path

    effective_root = custom_repo_path if (custom_repo_path and os.path.isdir(custom_repo_path)) else workspace_root

    # 4. Resolve Git Metadata
    commit_sha = _get_git_commit_sha(effective_root)
    branch = _get_git_branch(effective_root)

    return RepositoryContext(
        project_id=target_project_id,
        repository_id=repo_entity.id if repo_entity else None,
        repository_name=repo_entity.name if repo_entity else repo_name,
        root_path=effective_root,
        commit_sha=commit_sha,
        branch=branch,
    )

