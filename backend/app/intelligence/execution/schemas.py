"""
Kavach Agent Execution Workflow Schemas
Defines structured multi-step execution plans, individual step lifecycles,
risk levels, and approval states for autonomous security workflows.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class StepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class PlanStatus(str, Enum):
    PLAN_CREATED = "PLAN_CREATED"
    EXECUTING = "EXECUTING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AgentStepSchema(BaseModel):
    step_id: str = Field(..., description="Unique step identifier in plan DAG, e.g. step-1-scan")
    agent_type: str = Field(..., description="Specialized agent, e.g. scan_agent, investigation_agent")
    tool_id: str = Field(..., description="Registered tool ID, e.g. scan.start, finding.remediate")
    title: str = Field(..., description="Human-readable step title")
    description: str = Field(..., description="Detailed description of what this step does")
    risk_level: str = Field(default="READ_ONLY", description="READ_ONLY, LOW_RISK, SENSITIVE, HIGH_RISK")
    requires_approval: bool = Field(default=False, description="True if step requires human-in-the-loop approval")
    depends_on: List[str] = Field(default_factory=list, description="IDs of steps that must complete first")
    status: StepStatus = Field(default=StepStatus.PENDING)
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class AgentPlanSchema(BaseModel):
    plan_id: str = Field(..., description="Unique UUID for this execution plan")
    conversation_id: Optional[str] = None
    project_id: str = Field(..., description="Target project ID")
    user_id: str = Field(..., description="User who initiated the workflow")
    repository: Optional[str] = None
    branch: str = "main"
    goal: str = Field(..., description="Original user prompt or high-level objective")
    status: PlanStatus = Field(default=PlanStatus.PLAN_CREATED)
    requires_approval: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    steps: List[AgentStepSchema] = Field(default_factory=list)
    approval_token: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

