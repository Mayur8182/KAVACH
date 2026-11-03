import uuid
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github import GitHubCommit, GitHubPullRequest, GitHubRepository
from app.mcp.errors import MCPInvalidInputError, MCPNotConfiguredError
from app.mcp.schemas import MCPContext, ToolExecutionResult
from app.services.github_service import GitHubService


async def execute_get_github_repository(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves connected GitHub repository details for the project.
    """
    stmt = select(GitHubRepository).where(
        GitHubRepository.project_id == context.identity.project_id
    )
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()

    if not repo:
        return ToolExecutionResult(
            status="NOT_CONFIGURED",
            message="No GitHub repository connected to this project.",
            error_code="MCP_NOT_CONFIGURED",
        )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(repo.id),
            "owner": repo.owner,
            "repo_name": repo.repo_name,
            "full_name": repo.full_name,
            "default_branch": repo.default_branch,
            "private": repo.private,
            "status": repo.status,
        },
        message=f"Retrieved GitHub repository '{repo.full_name}'.",
        result_reference=str(repo.id),
    )


async def execute_get_pull_request(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Retrieves pull request information for the project.
    """
    pr_number = arguments.get("pr_number")
    if not pr_number:
        raise MCPInvalidInputError("Missing required parameter 'pr_number'.")

    stmt = select(GitHubPullRequest).join(
        GitHubRepository, GitHubPullRequest.repository_id == GitHubRepository.id
    ).where(
        GitHubRepository.project_id == context.identity.project_id,
        GitHubPullRequest.pr_number == int(pr_number),
    )
    res = await db.execute(stmt)
    pr = res.scalar_one_or_none()

    if not pr:
        return ToolExecutionResult(
            status="NOT_FOUND",
            message=f"Pull request #{pr_number} not found for this project.",
            error_code="MCP_RESOURCE_NOT_FOUND",
        )

    return ToolExecutionResult(
        status="SUCCESS",
        data={
            "id": str(pr.id),
            "pr_number": pr.pr_number,
            "title": pr.title,
            "state": pr.state,
            "head_branch": pr.head_branch,
            "base_branch": pr.base_branch,
            "head_sha": pr.head_sha,
            "merged": pr.merged,
        },
        message=f"Retrieved PR #{pr.pr_number}: '{pr.title}'.",
        result_reference=str(pr.id),
    )
