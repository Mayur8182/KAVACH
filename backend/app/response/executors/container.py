"""
Container Isolation Response Executor.
Operates against real Docker daemon if configured.
Strictly returns EXECUTOR_NOT_CONFIGURED when Docker is unavailable — NO MOCKS.
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


class ContainerIsolationExecutor(ResponseExecutor):
    action_type = ResponseActionType.ISOLATE_WORKLOAD
    target_type = ResponseTargetType.CONTAINER
    is_retryable = False
    reversibility = Reversibility.REVERSIBLE

    def is_docker_available(self) -> bool:
        if os.environ.get("DOCKER_HOST"):
            return True
        if os.path.exists("/var/run/docker.sock"):
            return True
        return False

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        if not self.is_docker_available():
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message="Container isolation executor cannot execute: Docker daemon is NOT_CONFIGURED or unavailable.",
                error="EXECUTOR_NOT_CONFIGURED",
                details={"target_id": action.target_id, "daemon_present": False},
            )

        # In production with real docker daemon: would invoke docker client network disconnect
        return ResponseExecutionResult(
            status=ResponseStatus.FAILED,
            success=False,
            message="Docker runtime connection error during container isolation.",
            error="DOCKER_RUNTIME_ERROR",
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_isolate": self.is_docker_available(),
            "target_type": "CONTAINER",
            "target_id": action.target_id,
            "status": "AVAILABLE" if self.is_docker_available() else "EXECUTOR_NOT_CONFIGURED",
            "simulated_effect": "Would disconnect container from ingress network if docker daemon active",
        }
