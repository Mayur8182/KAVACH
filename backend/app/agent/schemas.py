"""
THING AGENT — Pydantic Schemas
Step 07 Request/Response schemas for all THING AGENT API endpoints.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ── Agent Entity ──────────────────────────────────────────────────────────────

class AgentEntityItem(BaseModel):
    id: str
    project_id: str
    name: str
    agent_id: str
    identity_uri: str
    description: Optional[str] = None
    owner: str
    owner_email: Optional[str] = None
    environment_id: str
    status: str
    protection_state: str
    risk_level: str
    risk_score: Optional[float] = None
    risk_factors: List[str] = []
    capabilities: List[str] = []
    tags: List[str] = []
    credential_state: str
    credential_expires_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    quarantined_at: Optional[datetime] = None
    quarantine_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentEntityListResponse(BaseModel):
    items: List[AgentEntityItem]
    total: int


class CreateAgentRequest(BaseModel):
    name: str
    identity_uri: str
    owner: str
    owner_email: Optional[str] = None
    environment_id: str = "production"
    description: Optional[str] = None
    capabilities: List[str] = []
    tags: List[str] = []


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    owner: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None


class AgentActionRequest(BaseModel):
    reason: str


# ── Agent Identity ─────────────────────────────────────────────────────────────

class AgentIdentityItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    issuer: str
    subject: str
    audience: Optional[str] = None
    credential_type: str
    credential_fingerprint: Optional[str] = None
    status: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentIdentityListResponse(BaseModel):
    items: List[AgentIdentityItem]
    total: int


# ── Agent Permission ───────────────────────────────────────────────────────────

class AgentPermissionItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    action: str
    resource: str
    resource_type: Optional[str] = None
    environment_id: str
    scope: Dict[str, Any] = {}
    source: str
    granted_by: Optional[str] = None
    policy_id: Optional[str] = None
    role_name: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AgentPermissionListResponse(BaseModel):
    items: List[AgentPermissionItem]
    total: int


class CreatePermissionRequest(BaseModel):
    agent_entity_id: str
    action: str
    resource: str
    resource_type: Optional[str] = None
    environment_id: str = "production"
    source: str = "DIRECT"
    granted_by: Optional[str] = None
    policy_id: Optional[str] = None
    role_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    scope: Dict[str, Any] = {}


# ── Agent Tool ─────────────────────────────────────────────────────────────────

class AgentToolItem(BaseModel):
    id: str
    project_id: str
    tool_name: str
    tool_id: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    tool_type: str
    risk_level: str
    risk_factors: List[str] = []
    risk_reason: Optional[str] = None
    requires_approval: bool
    allowed_agents: List[str] = []
    environment_restrictions: List[str] = []
    status: str
    last_used_at: Optional[datetime] = None
    execution_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AgentToolListResponse(BaseModel):
    items: List[AgentToolItem]
    total: int


class AgentToolDetailResponse(BaseModel):
    tool: AgentToolItem
    recent_executions: List[Dict[str, Any]] = []
    authorized_agents: List[Dict[str, Any]] = []


# ── Agent Session ──────────────────────────────────────────────────────────────

class AgentSessionItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    session_id: str
    trigger: Optional[str] = None
    trigger_type: str
    environment_id: str
    status: str
    risk_level: str
    tool_calls: int
    data_accesses: int
    policy_decisions: int
    policy_blocks: int
    started_at: datetime
    last_activity_at: datetime
    expires_at: Optional[datetime] = None
    terminated_at: Optional[datetime] = None
    termination_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentSessionListResponse(BaseModel):
    items: List[AgentSessionItem]
    total: int


class RevokeAgentSessionRequest(BaseModel):
    reason: str


# ── Agent Delegation ───────────────────────────────────────────────────────────

class AgentDelegationItem(BaseModel):
    id: str
    project_id: str
    issuer_agent_id: str
    delegate_agent_id: str
    issuer_agent_name: Optional[str] = None
    delegate_agent_name: Optional[str] = None
    delegated_actions: List[str] = []
    delegated_resources: List[str] = []
    scope: Dict[str, Any] = {}
    environment_id: str
    policy_id: Optional[str] = None
    max_depth: int
    current_depth: int
    further_delegation_allowed: bool
    approval_required: bool
    status: str
    reason: Optional[str] = None
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentDelegationListResponse(BaseModel):
    items: List[AgentDelegationItem]
    total: int


class CreateDelegationRequest(BaseModel):
    issuer_agent_id: str
    delegate_agent_id: str
    delegated_actions: List[str]
    delegated_resources: List[str]
    environment_id: str = "production"
    scope: Dict[str, Any] = {}
    reason: str
    expires_at: Optional[datetime] = None
    further_delegation_allowed: bool = False
    max_depth: int = 1


class RevokeDelegationRequest(BaseModel):
    reason: str


# ── Agent Actions ──────────────────────────────────────────────────────────────

class AgentActionItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    tool_id: str
    tool_name: str
    action_type: str
    target_resource: Optional[str] = None
    environment_id: str
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    decision: str
    result: Optional[str] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    evidence_id: Optional[str] = None
    trace_id: Optional[str] = None
    executed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AgentActionDetailResponse(BaseModel):
    action: AgentActionItem
    input_payload: Dict[str, Any] = {}
    output_payload: Dict[str, Any] = {}


class AgentActionListResponse(BaseModel):
    items: List[AgentActionItem]
    total: int


# ── Data Access ────────────────────────────────────────────────────────────────

class AgentDataAccessItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    data_resource: str
    data_classification: str
    data_type: Optional[str] = None
    action: str
    purpose: Optional[str] = None
    environment_id: str
    policy_id: Optional[str] = None
    decision: str
    is_external_destination: bool
    external_destination: Optional[str] = None
    flow_type: str
    risk_level: str
    evidence_id: Optional[str] = None
    accessed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AgentDataAccessListResponse(BaseModel):
    items: List[AgentDataAccessItem]
    total: int


# ── Behavior ───────────────────────────────────────────────────────────────────

class AgentBehaviorEventItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    signal_type: str
    severity: str
    verification_status: str
    description: str
    observed_value: Dict[str, Any] = {}
    baseline_value: Dict[str, Any] = {}
    evidence_id: Optional[str] = None
    is_dismissed: bool
    dismissed_reason: Optional[str] = None
    detected_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AgentBehaviorListResponse(BaseModel):
    items: List[AgentBehaviorEventItem]
    total: int


# ── Approvals ──────────────────────────────────────────────────────────────────

class AgentApprovalItem(BaseModel):
    id: str
    agent_entity_id: str
    project_id: str
    agent_name: Optional[str] = None
    request_type: str
    requested_action: str
    requested_resource: str
    environment_id: str
    risk_level: str
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    requested_by: str
    reviewed_by: Optional[str] = None
    review_reason: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    evidence_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentApprovalListResponse(BaseModel):
    items: List[AgentApprovalItem]
    total: int


class ResolveAgentApprovalRequest(BaseModel):
    decision: str  # APPROVED | REJECTED
    reason: str


# ── Evidence ───────────────────────────────────────────────────────────────────

class AgentEvidenceItem(BaseModel):
    id: str
    agent_entity_id: Optional[str] = None
    project_id: str
    agent_name: Optional[str] = None
    evidence_type: str
    actor: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    decision: Optional[str] = None
    sha256_hash: Optional[str] = None
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    policy_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AgentEvidenceListResponse(BaseModel):
    items: List[AgentEvidenceItem]
    total: int


# ── Overview ───────────────────────────────────────────────────────────────────

class AgentOverviewResponse(BaseModel):
    metrics: Dict[str, Any]
    attention_items: List[Dict[str, Any]]
    activity_summary: Dict[str, Any]
    authority_coverage: Dict[str, Any]
    recent_events: List[Dict[str, Any]]
    risk_distribution: Dict[str, int]


# ── Risk ───────────────────────────────────────────────────────────────────────

class AgentRiskItem(BaseModel):
    agent_entity_id: str
    agent_name: str
    overall_risk: str
    risk_score: float
    factors: Dict[str, Any] = {}
    policy_violations: int
    behavior_signals: int
    verified_violations: int
    computed_at: datetime


class AgentRiskListResponse(BaseModel):
    items: List[AgentRiskItem]
    total: int
