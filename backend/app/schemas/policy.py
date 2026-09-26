from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PolicyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=2)
    scope: str = Field("PROJECT", description="PROJECT, ENVIRONMENT, OPERATION, GLOBAL")
    priority: int = Field(100, ge=1, le=1000)
    policy_type: str = Field("SECURITY", description="SECURITY, DEPLOYMENT, ACCESS_CONTROL, DATA_PROTECTION")
    definition: Dict[str, Any] = Field(..., description="Structured JSON/YAML Policy DSL definition")


class PolicyUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None


class PolicyVersionCreateRequest(BaseModel):
    definition: Dict[str, Any] = Field(..., description="New structured JSON/YAML Policy DSL definition")
    change_reason: Optional[str] = None


class PolicyVersionResponse(BaseModel):
    id: str
    policy_id: str
    version: int
    definition: Dict[str, Any]
    created_by: str
    created_at: datetime
    change_reason: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True


class SecurityPolicyResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    name: str
    description: str
    scope: str
    status: str
    priority: int
    policy_type: str
    current_version: int
    created_by: str
    effective_from: datetime
    effective_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[PolicyVersionResponse] = None
    versions_count: Optional[int] = None

    class Config:
        from_attributes = True


class OperationInput(BaseModel):
    type: str = Field(..., description="DEPLOY, MERGE, PUSH, EXECUTE_TOOL, ACCESS_SECRET, MODIFY_INFRASTRUCTURE, SCAN")
    environment: str = Field("development", description="development, staging, production")
    resource_type: Optional[str] = Field("APPLICATION", description="APPLICATION, DATABASE, CONTAINER, INFRASTRUCTURE, SECRET")
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ActorInput(BaseModel):
    type: str = Field("USER", description="USER, AI_AGENT, SYSTEM, SERVICE")
    id: str = Field(..., description="Identifier of the actor")
    name: Optional[str] = None
    roles: List[str] = Field(default_factory=list)


class EvaluateDecisionRequest(BaseModel):
    operation: OperationInput
    actor: Optional[ActorInput] = None
    scan_id: Optional[str] = None
    blueprint_id: Optional[str] = None


class DecisionEvidenceResponse(BaseModel):
    id: str
    decision_id: str
    evidence_type: str
    source_type: str
    source_id: Optional[str] = None
    attribute: str
    observed_value: Any
    expected_condition: str
    effect: str
    rule_name: Optional[str] = None
    policy_version_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityApprovalResponse(BaseModel):
    id: str
    decision_id: str
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    reason: Optional[str] = None
    approval_notes: Optional[str] = None
    requested_at: datetime
    approved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SecurityDecisionResponse(BaseModel):
    id: str
    project_id: str
    actor_type: str
    actor_id: str
    operation_type: str
    operation_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    environment: str
    decision: str
    reason: str
    policy_version_ids: List[str]
    blueprint_id: Optional[str] = None
    scan_id: Optional[str] = None
    created_at: datetime
    evidence: List[DecisionEvidenceResponse] = Field(default_factory=list)
    approvals: List[SecurityApprovalResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SimulateDecisionResponse(BaseModel):
    decision: str
    reason: str
    policy_version_ids: List[str]
    matched_rules: List[Dict[str, Any]] = Field(default_factory=list)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    simulated_at: datetime
    would_block: bool
    would_require_approval: bool
    would_warn: bool
    would_allow: bool


class ApprovalActionRequest(BaseModel):
    reason: Optional[str] = None
    approval_notes: Optional[str] = None
