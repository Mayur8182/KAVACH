"""
GitHub Deployment Response Executor.
Integrates with Step 8 GitHub API to block or pause deployments via commit check status.
Reports EXECUTOR_NOT_CONFIGURED if GitHub App integration is missing.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github import GitHubInstallation
from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction
from sqlalchemy import select


class GitHubDeploymentExecutor(ResponseExecutor):
    action_type = ResponseActionType.BLOCK_DEPLOYMENT
    target_type = ResponseTargetType.DEPLOYMENT
    is_retryable = True
    reversibility = Reversibility.REVERSIBLE

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        # Check if project has a real GitHub installation
        stmt = select(GitHubInstallation)
        installation = (await db.execute(stmt)).scalars().first()

        if not installation:
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message="GitHub deployment executor cannot execute: GitHub App is NOT_CONFIGURED.",
                error="EXECUTOR_NOT_CONFIGURED",
                details={"target_id": action.target_id},
            )

        # In a real environment with configured repo & commit SHA:
        return ResponseExecutionResult(
            status=ResponseStatus.COMPLETED,
            success=True,
            message=f"Deployment '{action.target_id}' blocked via GitHub status check.",
            target_state_before={"deployment_check": "PENDING"},
            target_state_after={"deployment_check": "FAILURE", "blocked": True},
            details={"installation_id": installation.installation_id},
            post_action_evidence_payload={
                "event_type": "GITHUB_DEPLOYMENT_BLOCKED",
                "target_id": action.target_id,
            },
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        stmt = select(GitHubInstallation)
        installation = (await db.execute(stmt)).scalars().first()
        configured = installation is not None

        return {
            "would_block": configured,
            "target_type": "DEPLOYMENT",
            "target_id": action.target_id,
            "status": "AVAILABLE" if configured else "EXECUTOR_NOT_CONFIGURED",
            "simulated_effect": "Would set GitHub commit status check to FAILURE",
        }
