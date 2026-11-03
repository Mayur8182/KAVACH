"""
Jenkins Pipeline Response Executor.
Integrates with Jenkins CI/CD if configured.
Reports EXECUTOR_NOT_CONFIGURED when Jenkins endpoint or credentials are absent.
"""

import os
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.executors.base import ResponseExecutionResult, ResponseExecutor
from app.response.models import SecurityResponseAction


class JenkinsPipelineExecutor(ResponseExecutor):
    action_type = ResponseActionType.BLOCK_PIPELINE
    target_type = ResponseTargetType.PIPELINE
    is_retryable = False
    reversibility = Reversibility.REVERSIBLE

    def is_jenkins_configured(self) -> bool:
        return bool(os.environ.get("JENKINS_URL") and os.environ.get("JENKINS_USER"))

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        if not self.is_jenkins_configured():
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message="Jenkins pipeline executor cannot execute: Jenkins is NOT_CONFIGURED.",
                error="EXECUTOR_NOT_CONFIGURED",
                details={"target_id": action.target_id, "jenkins_configured": False},
            )

        return ResponseExecutionResult(
            status=ResponseStatus.FAILED,
            success=False,
            message="Jenkins API connection failed.",
            error="JENKINS_API_ERROR",
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_block": self.is_jenkins_configured(),
            "target_type": "PIPELINE",
            "target_id": action.target_id,
            "status": "AVAILABLE" if self.is_jenkins_configured() else "EXECUTOR_NOT_CONFIGURED",
            "simulated_effect": "Would abort or pause Jenkins build job",
        }
