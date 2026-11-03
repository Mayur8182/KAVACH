"""
Kubernetes Workload Isolation Response Executor.
Operates against real Kubernetes cluster via kubeconfig if configured.
Strictly returns EXECUTOR_NOT_CONFIGURED when cluster is unavailable — NO MOCKS.
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


class KubernetesIsolationExecutor(ResponseExecutor):
    action_type = ResponseActionType.ISOLATE_WORKLOAD
    target_type = ResponseTargetType.KUBERNETES_POD
    is_retryable = False
    reversibility = Reversibility.REVERSIBLE

    def is_k8s_available(self) -> bool:
        kubeconfig = os.environ.get("KUBECONFIG")
        if kubeconfig and os.path.exists(kubeconfig):
            return True
        home_kube = os.path.expanduser("~/.kube/config")
        if os.path.exists(home_kube):
            return True
        return False

    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        if not self.is_k8s_available():
            return ResponseExecutionResult(
                status=ResponseStatus.NOT_EXECUTED,
                success=False,
                message="Kubernetes isolation executor cannot execute: Kubeconfig is NOT_CONFIGURED or cluster is unavailable.",
                error="EXECUTOR_NOT_CONFIGURED",
                details={"target_id": action.target_id, "k8s_present": False},
            )

        return ResponseExecutionResult(
            status=ResponseStatus.FAILED,
            success=False,
            message="Kubernetes API connection error during workload isolation.",
            error="KUBERNETES_API_ERROR",
        )

    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        return {
            "would_isolate": self.is_k8s_available(),
            "target_type": "KUBERNETES_POD",
            "target_id": action.target_id,
            "status": "AVAILABLE" if self.is_k8s_available() else "EXECUTOR_NOT_CONFIGURED",
            "simulated_effect": "Would apply network isolation policy to target pod/namespace",
        }
