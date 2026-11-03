"""
Base interfaces and result containers for Step 14 Response Executors.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.enums import (
    ResponseActionType,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)
from app.response.models import SecurityResponseAction


class ResponseExecutionResult:
    """
    Standardized result emitted by any response executor upon completion or failure.
    """
    def __init__(
        self,
        status: ResponseStatus,
        success: bool,
        message: str,
        target_state_before: Optional[Dict[str, Any]] = None,
        target_state_after: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Any]] = None,
        post_action_evidence_payload: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        self.status = status
        self.success = success
        self.message = message
        self.target_state_before = target_state_before or {}
        self.target_state_after = target_state_after or {}
        self.details = details or {}
        self.post_action_evidence_payload = post_action_evidence_payload or {}
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value if hasattr(self.status, "value") else str(self.status),
            "success": self.success,
            "message": self.message,
            "target_state_before": self.target_state_before,
            "target_state_after": self.target_state_after,
            "details": self.details,
            "post_action_evidence_payload": self.post_action_evidence_payload,
            "error": self.error,
        }


class ResponseExecutor(ABC):
    """
    Abstract Base Class for all Step 14 Response Executors.
    """
    action_type: ResponseActionType
    target_type: ResponseTargetType
    is_retryable: bool = False
    reversibility: Reversibility = Reversibility.REVERSIBLE
    execution_timeout_seconds: float = 30.0

    @abstractmethod
    async def execute(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> ResponseExecutionResult:
        """
        Executes the response action against the real underlying subsystem.
        Must capture before-state, perform the action, verify after-state, and emit evidence.
        """
        pass

    @abstractmethod
    async def dry_run(
        self,
        action: SecurityResponseAction,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Simulates the response action without applying mutations.
        """
        pass
