"""
Kavach Phase 3 — Specialist Agent Contracts & Schemas
Authoritative, typed Pydantic V2 models for specialist agents, DAG execution nodes,
and cryptographic human approval guardrails.
Strictly conforms to:
- "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
- AGENTS.md Rule 1: No Hardcoded Data
- AGENTS.md Rule 2: No Fake Success
- AGENTS.md Rule 13: Every Security Decision Must Have Evidence
- AGENTS.md Rule 14: LLM Is Not The Security Authority
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# 1. Shared Enums & Statuses
# ─────────────────────────────────────────────────────────────────────────────

class AgentType(str, Enum):
    SCAN = "scan_agent"
    INVESTIGATION = "investigation_agent"
    ATTACK_PATH = "attack_path_agent"
    REMEDIATION_PLANNER = "remediation_planner_agent"
    REMEDIATION_EXECUTOR = "remediation_executor_agent"
    VERIFICATION = "verification_agent"
    PULL_REQUEST = "pull_request_agent"


class RiskClassification(str, Enum):
    READ_ONLY = "READ_ONLY"
    LOW_RISK = "LOW_RISK"
    SENSITIVE = "SENSITIVE"
    HIGH_RISK = "HIGH_RISK"


class StepExecutionStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class WorkflowExecutionStatus(str, Enum):
    PLAN_CREATED = "PLAN_CREATED"
    EXECUTING = "EXECUTING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Specialist Agent Contracts
# ─────────────────────────────────────────────────────────────────────────────

# --- Scan Agent ---
class ScanInput(BaseModel):
    project_id: uuid.UUID
    repository: Optional[str] = None
    target_path: Optional[str] = None
    scanner_types: Optional[List[str]] = Field(default_factory=lambda: ["BUILTIN_SAST"])


class ScanOutput(BaseModel):
    scan_id: str
    status: str
    project_id: str
    repository: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int = 0
    low_count: int = 0
    target_finding_id: Optional[str] = None


# --- Investigation Agent ---
class InvestigationInput(BaseModel):
    project_id: uuid.UUID
    finding_id: Optional[str] = None
    scan_id: Optional[str] = None
    repository: Optional[str] = None


class InvestigationOutput(BaseModel):
    status: str
    finding_id: str
    title: str
    cwe: str
    category: str
    severity: str
    file_path: str
    line_number: int
    language: str
    code_snippet: str
    root_cause: str
    attack_vector: str
    remediation_strategy: str
    remediable: bool = True
    reachability_context: Dict[str, Any] = Field(default_factory=dict)


# --- Attack-Path Agent ---
class AttackPathHop(BaseModel):
    step_number: int
    caller: str
    callee: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    sanitization_applied: Optional[str] = None


class AttackPathInput(BaseModel):
    project_id: uuid.UUID
    finding_id: str
    repository: Optional[str] = None
    entrypoint: Optional[str] = None


class AttackPathOutput(BaseModel):
    status: str
    path_id: str
    finding_id: str
    title: str
    entrypoint: str
    sink: str
    hops: List[AttackPathHop] = Field(default_factory=list)
    preconditions: List[str] = Field(default_factory=list)
    mitigations: List[str] = Field(default_factory=list)
    blast_radius: str
    confidence: str
    is_exploitable: bool = True


# --- Remediation Planner Agent ---
class RemediationInvariant(BaseModel):
    rule: str
    description: str


class RollbackCriteria(BaseModel):
    trigger: str
    action: str


class RemediationPlannerInput(BaseModel):
    project_id: uuid.UUID
    finding_id: str
    investigation: Optional[InvestigationOutput] = None
    attack_path: Optional[AttackPathOutput] = None


class RemediationPlannerOutput(BaseModel):
    status: str
    plan_id: str
    finding_id: str
    strategy_name: str
    explanation: str
    invariants: List[RemediationInvariant] = Field(default_factory=list)
    affected_files: List[str] = Field(default_factory=list)
    rollback_criteria: List[RollbackCriteria] = Field(default_factory=list)
    estimated_risk: str = "LOW_RISK"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# --- Remediation Executor Agent ---
class FileDiffRecord(BaseModel):
    file_path: str
    original_hash: Optional[str] = None
    diff: str
    status: str = "PATCHED"


class RemediationExecutorInput(BaseModel):
    project_id: uuid.UUID
    plan_id: str
    finding_id: str
    workspace_path: Optional[str] = None
    base_commit_sha: Optional[str] = None


class RemediationExecutorOutput(BaseModel):
    status: str
    patch_id: str
    plan_id: str
    finding_id: str
    diff: str
    file_diffs: List[FileDiffRecord] = Field(default_factory=list)
    affected_files: List[str] = Field(default_factory=list)
    branch: str = "main"
    workspace_id: str
    model_used: str
    explanation: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# --- Independent Verification Agent ---
class VerificationCheckResult(BaseModel):
    check_type: str
    status: str
    tool: str
    summary: str
    error_details: Optional[str] = None


class VerificationInput(BaseModel):
    project_id: uuid.UUID
    patch_id: str
    finding_id: Optional[str] = None
    workspace_path: Optional[str] = None


class VerificationOutput(BaseModel):
    status: str
    patch_id: str
    passed: bool
    checks: List[VerificationCheckResult] = Field(default_factory=list)
    violations: List[str] = Field(default_factory=list)
    evidence: str


# --- Pull Request Agent ---
class PullRequestInput(BaseModel):
    project_id: uuid.UUID
    plan_id: str
    step_id: str
    finding_id: str
    patch_id: str
    approval_token: str
    repository: Optional[str] = None
    branch: Optional[str] = "main"
    title: Optional[str] = None


class PullRequestOutput(BaseModel):
    status: str
    success: bool
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    branch: str
    repository: str
    finding_id: str
    patch_id: str
    title: str
    message: str
    approved_by: str


# ─────────────────────────────────────────────────────────────────────────────
# 3. DAG Workflow & Approval Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DAGStepNode(BaseModel):
    step_id: str = Field(..., description="Unique step identifier in the workflow DAG")
    agent_type: str = Field(..., description="Specialized agent designated for this step")
    tool_id: str = Field(..., description="Registered platform tool identifier")
    title: str
    description: str
    risk_level: RiskClassification = Field(default=RiskClassification.READ_ONLY)
    requires_approval: bool = Field(default=False)
    depends_on: List[str] = Field(default_factory=list)
    status: StepExecutionStatus = Field(default=StepExecutionStatus.PENDING)
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class DAGWorkflowDefinition(BaseModel):
    plan_id: str = Field(..., description="Unique UUID for this workflow run")
    conversation_id: Optional[str] = None
    project_id: str
    user_id: str
    repository: Optional[str] = None
    branch: str = "main"
    goal: str
    status: WorkflowExecutionStatus = Field(default=WorkflowExecutionStatus.PLAN_CREATED)
    requires_approval: bool = Field(default=False)
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    steps: List[DAGStepNode] = Field(default_factory=list)
    approval_token: Optional[str] = None
    idempotency_key: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ApprovalTokenPayload(BaseModel):
    plan_id: str
    step_id: str
    project_id: str
    user_id: str
    target_resource: str
    action: str = "pull_request.create"
    expires_at: int
    nonce: str
    created_at: int

