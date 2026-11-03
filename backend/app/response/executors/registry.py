"""
Response Executor Registry for Step 14.
Registers and resolves concrete executors by action_type and target_type.
"""

from typing import Dict, Optional, Tuple
from app.response.enums import ResponseActionType, ResponseTargetType
from app.response.executors.base import ResponseExecutor
from app.response.executors.alert import AlertExecutor
from app.response.executors.mcp import MCPBlockExecutor
from app.response.executors.session import SessionRevocationExecutor
from app.response.executors.delegation import DelegationRevocationExecutor
from app.response.executors.agent import AgentSuspensionExecutor
from app.response.executors.data_flow import DataFlowRestrictionExecutor
from app.response.executors.container import ContainerIsolationExecutor
from app.response.executors.kubernetes import KubernetesIsolationExecutor
from app.response.executors.github import GitHubDeploymentExecutor
from app.response.executors.jenkins import JenkinsPipelineExecutor


class ResponseExecutorRegistry:
    """
    Central registry for response executors.
    Resolves the appropriate executor based on (action_type, target_type) or action_type alone.
    """
    def __init__(self):
        self._executors: Dict[Tuple[str, str], ResponseExecutor] = {}
        self._action_default_executors: Dict[str, ResponseExecutor] = {}
        self._register_defaults()

    def register(self, executor: ResponseExecutor) -> None:
        act_key = executor.action_type.value if hasattr(executor.action_type, "value") else str(executor.action_type)
        tgt_key = executor.target_type.value if hasattr(executor.target_type, "value") else str(executor.target_type)
        self._executors[(act_key, tgt_key)] = executor
        self._action_default_executors[act_key] = executor

    def _register_defaults(self) -> None:
        self.register(AlertExecutor())
        self.register(MCPBlockExecutor())
        self.register(SessionRevocationExecutor())
        self.register(DelegationRevocationExecutor())
        self.register(AgentSuspensionExecutor())
        self.register(DataFlowRestrictionExecutor())
        self.register(ContainerIsolationExecutor())
        self.register(KubernetesIsolationExecutor())
        self.register(GitHubDeploymentExecutor())
        self.register(JenkinsPipelineExecutor())

    def get_executor(
        self,
        action_type: str,
        target_type: Optional[str] = None,
    ) -> Optional[ResponseExecutor]:
        if target_type:
            key = (str(action_type), str(target_type))
            if key in self._executors:
                return self._executors[key]

        return self._action_default_executors.get(str(action_type))


default_executor_registry = ResponseExecutorRegistry()
