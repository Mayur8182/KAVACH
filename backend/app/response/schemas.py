"""
Pydantic schemas for Step 14 Runtime Security Agent and Controlled Enforcement.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.response.enums import (
    ResponseActionType,
    ResponseDecision,
    ResponseMode,
    ResponseSeverity,
    ResponseStatus,
    ResponseTargetType,
    Reversibility,
)


class SecurityResponsePlanCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    definition: Dict[str, Any] = Field(...)


class SecurityResponsePlanVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    version: int
    definition: Dict[str, Any]
    status: str
    created_by: str
    created_at: datetime


class SecurityResponsePlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: str
    active_version: int
    created_by: str
    activated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SecurityResponseDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    verification_id: Optional[uuid.UUID] = None
    violation_id: Optional[uuid.UUID] = None
    policy_version_id: Optional[uuid.UUID] = None
    decision: str
    reason: str
    evidence: Dict[str, Any]
    created_at: datetime


class SecurityResponseActionCreate(BaseModel):
    violation_id: Optional[uuid.UUID] = None
    verification_id: Optional[uuid.UUID] = None
    action_type: ResponseActionType
    target_type: ResponseTargetType
    target_id: str
    reason: Optional[str] = None
    mode: Optional[ResponseMode] = ResponseMode.OBSERVE
    severity: Optional[ResponseSeverity] = ResponseSeverity.HIGH
    parameters: Dict[str, Any] = Field(default_factory=dict)
    ttl_seconds: Optional[int] = 1800  # Default 30 min expiration


class SecurityResponseActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    violation_id: Optional[uuid.UUID] = None
    verification_id: Optional[uuid.UUID] = None
    contract_version_id: Optional[uuid.UUID] = None
    action_type: str
    status: str
    mode: str
    severity: str
    target_type: str
    target_id: str
    requested_by_type: str
    requested_by_id: str
    policy_decision_id: Optional[uuid.UUID] = None
    approval_id: Optional[uuid.UUID] = None
    authorization_context: Dict[str, Any]
    request: Dict[str, Any]
    result: Dict[str, Any]
    failure_reason: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None


class ResponseExecutionAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    response_action_id: uuid.UUID
    executor_type: str
    attempt_number: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    request: Dict[str, Any]
    result: Dict[str, Any]
    error_message: Optional[str] = None
    target_state_before: Optional[Dict[str, Any]] = None
    target_state_after: Optional[Dict[str, Any]] = None
    created_at: datetime


class SecurityResponseActionApproveRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class SecurityResponseActionRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class SecurityResponseActionCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class ResponseDryRunResponse(BaseModel):
    mode: str = "DRY_RUN"
    would_execute: bool
    action: str
    target: str
    authorization: str
    policy: str
    approval: str
    reversibility: str
    blast_radius: Dict[str, Any]
    simulated_effect: str
    reasons: List[str] = Field(default_factory=list)


class RuntimeEnforcementRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    rule_type: str
    target_type: str
    target_id: str
    action: str
    reason: str
    source_violation_id: Optional[uuid.UUID] = None
    expires_at: datetime
    status: str
    created_at: datetime


class SecurityIncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    status: str
    severity: str
    first_detected_at: datetime
    last_detected_at: datetime
    primary_violation_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime


class SecurityIncidentDetailResponse(SecurityIncidentResponse):
    events: List[Dict[str, Any]] = Field(default_factory=list)
    violations: List[Dict[str, Any]] = Field(default_factory=list)
    actions: List[Dict[str, Any]] = Field(default_factory=list)


class ResponseReverificationResponse(BaseModel):
    response_action_id: uuid.UUID
    contract_id: Optional[uuid.UUID] = None
    status: str  # VERIFIED | VIOLATED | UNKNOWN
    is_remediated: bool
    reverification_evidence_id: Optional[uuid.UUID] = None
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class ResponseOverviewResponse(BaseModel):
    project_id: uuid.UUID
    active_responses_count: int
    pending_approvals_count: int
    failed_actions_count: int
    completed_actions_count: int
    open_violations_count: int
    active_enforcement_rules_count: int
    open_incidents_count: int
