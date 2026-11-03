"""
Thing Protect — Schemas
Pydantic v2 schemas for all THING PROTECT endpoints, data contracts, and workflows.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Overview Schemas ──────────────────────────────────────────────

class ProtectOverviewResponse(BaseModel):
    protection_state: str  # ACTIVE, DEGRADED, PARTIALLY_PROTECTED, DISABLED, FAILED, NOT_CONFIGURED, NOT_CONNECTED, UNKNOWN
    metrics: Dict[str, Any] = Field(default_factory=dict)
    active_threats: List[Dict[str, Any]] = Field(default_factory=list)
    enforcement_activity: Dict[str, int] = Field(default_factory=dict)
    runtime_coverage: Dict[str, Any] = Field(default_factory=dict)
    recent_events: List[Dict[str, Any]] = Field(default_factory=list)
    enforcement_failures: List[Dict[str, Any]] = Field(default_factory=list)
    fail_mode: str = "FAIL_CLOSED"
    has_runtimes: bool = True


# ── Runtime Protection Schemas ─────────────────────────────────────

class RuntimeProtectionItem(BaseModel):
    id: str
    project_id: str
    name: str
    target_type: str
    environment: str
    protection_state: str
    active_policy_name: Optional[str] = None
    policy_version: Optional[str] = None
    health_status: str
    enforcement_mode: str
    fail_mode: str
    last_event_at: Optional[str] = None
    last_enforcement_at: Optional[str] = None
    events_count: int
    blocked_count: int


class RuntimeProtectionListResponse(BaseModel):
    items: List[RuntimeProtectionItem]
    total: int


class RuntimeProtectionDetailResponse(BaseModel):
    runtime: RuntimeProtectionItem
    events: List[Dict[str, Any]]
    policies: List[Dict[str, Any]]
    enforcement_history: List[Dict[str, Any]]
    network_rules: List[Dict[str, Any]]
    identity_info: Dict[str, Any]
    evidence_items: List[Dict[str, Any]]
    activity: List[Dict[str, Any]]


# ── Policy Engine Schemas ──────────────────────────────────────────

class ProtectionPolicyItem(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    policy_type: str
    scope: Dict[str, Any]
    conditions: List[Dict[str, Any]]
    action: str
    action_config: Dict[str, Any]
    exceptions: List[Dict[str, Any]]
    enforcement_mode: str
    status: str
    version: int
    owner: str
    last_triggered_at: Optional[str] = None
    triggers_count: int
    created_at: str
    updated_at: str


class ProtectionPolicyListResponse(BaseModel):
    items: List[ProtectionPolicyItem]
    total: int


class CreatePolicyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    policy_type: str = "ACCESS"
    scope: Dict[str, Any] = Field(default_factory=dict)
    conditions: List[Dict[str, Any]] = Field(default_factory=list)
    action: str = "BLOCK"
    action_config: Dict[str, Any] = Field(default_factory=dict)
    exceptions: List[Dict[str, Any]] = Field(default_factory=list)
    enforcement_mode: str = "ENFORCE"
    project_id: Optional[str] = None


class UpdatePolicyRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[Dict[str, Any]] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    action: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None
    exceptions: Optional[List[Dict[str, Any]]] = None
    enforcement_mode: Optional[str] = None
    status: Optional[str] = None


class SimulatePolicyRequest(BaseModel):
    historical_window_days: int = 7
    sample_events: List[Dict[str, Any]] = Field(default_factory=list)


class PolicySimulationResponse(BaseModel):
    simulation_id: str
    policy_id: str
    would_allow: int
    would_block: int
    would_require_approval: int
    would_rate_limit: int
    total_evaluated: int
    samples: List[Dict[str, Any]]
    execution_mode: str = "SIMULATION_MODE — NO ENFORCEMENT ACTION TAKEN"


class PolicyPublishResponse(BaseModel):
    policy_id: str
    version: int
    status: str
    published_at: str
    message: str


class PolicyRollbackRequest(BaseModel):
    target_version: int


class ProtectionPolicyDetailResponse(BaseModel):
    policy: ProtectionPolicyItem
    versions: List[Dict[str, Any]]
    matched_events: List[Dict[str, Any]]
    effectiveness: Dict[str, Any]


# ── Enforcement Center Schemas ─────────────────────────────────────

class ProtectionDecisionItem(BaseModel):
    id: str
    project_id: str
    policy_id: Optional[str] = None
    evidence_id: Optional[str] = None
    actor: str
    actor_type: str
    action: str
    resource: str
    environment: str
    risk_level: str
    decision: str
    reason: str
    enforcement_layer: str
    context_data: Dict[str, Any]
    timestamp: str


class ProtectionDecisionListResponse(BaseModel):
    items: List[ProtectionDecisionItem]
    total: int


class ProtectionDecisionDetailResponse(BaseModel):
    decision: ProtectionDecisionItem
    policy: Optional[ProtectionPolicyItem] = None
    evidence: Optional[Dict[str, Any]] = None
    audit_trail: List[Dict[str, Any]]


# ── MCP Security Schemas ───────────────────────────────────────────

class McpServerItem(BaseModel):
    id: str
    project_id: str
    name: str
    server_url: str
    identity_principal: str
    environment: str
    tools_count: int
    resources_count: int
    status: str
    protection_state: str
    gateway_version: str
    last_activity_at: Optional[str] = None
    created_at: str


class McpServerListResponse(BaseModel):
    items: List[McpServerItem]
    total: int


class McpToolControlItem(BaseModel):
    id: str
    server_id: str
    project_id: str
    tool_name: str
    description: Optional[str] = None
    risk_level: str
    allowed_agents: List[str]
    allowed_environments: List[str]
    requires_approval: bool
    production_blocked: bool
    data_access_tags: List[str]
    policy_name: Optional[str] = None
    total_invocations: int
    blocked_invocations: int
    last_used_at: Optional[str] = None


class McpToolControlListResponse(BaseModel):
    items: List[McpToolControlItem]
    total: int


class McpRequestAuditItem(BaseModel):
    id: str
    project_id: str
    server_id: Optional[str] = None
    agent_id: str
    tool_name: str
    arguments_redacted: Dict[str, Any]
    identity_verified: bool
    policy_matched: Optional[str] = None
    decision: str
    approval_status: Optional[str] = None
    execution_status: str
    evidence_id: Optional[str] = None
    duration_ms: int
    observed_at: str


class McpRequestAuditListResponse(BaseModel):
    items: List[McpRequestAuditItem]
    total: int


# ── Agent Protection Schemas ───────────────────────────────────────

class ProtectedAgentItem(BaseModel):
    id: str
    project_id: str
    agent_identifier: str
    name: str
    identity_principal: str
    environment: str
    risk_level: str
    policy_name: Optional[str] = None
    active_session_id: Optional[str] = None
    last_action: Optional[str] = None
    protection_state: str
    status: str
    actions_count: int
    blocked_count: int
    last_action_at: Optional[str] = None
    created_at: str


class ProtectedAgentListResponse(BaseModel):
    items: List[ProtectedAgentItem]
    total: int


class ProtectedAgentDetailResponse(BaseModel):
    agent: ProtectedAgentItem
    permissions: List[Dict[str, Any]]
    active_sessions: List[Dict[str, Any]]
    tools: List[Dict[str, Any]]
    action_timeline: List[Dict[str, Any]]
    threats: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]


# ── Session Control Schemas ────────────────────────────────────────

class ProtectedSessionItem(BaseModel):
    id: str
    project_id: str
    session_token_hash: str
    actor: str
    actor_type: str
    environment: str
    status: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    reason: Optional[str] = None
    revoked_by: Optional[str] = None
    revoked_at: Optional[str] = None
    started_at: str
    last_active_at: str


class ProtectedSessionListResponse(BaseModel):
    items: List[ProtectedSessionItem]
    total: int


class RevokeSessionRequest(BaseModel):
    reason: str = Field(..., description="Actionable reason for terminating or revoking this session")


class RevokeSessionResponse(BaseModel):
    session_id: str
    status: str
    revoked_at: str
    message: str


# ── API & Network & DNS Schemas ────────────────────────────────────

class ApiProtectionEndpointItem(BaseModel):
    id: str
    project_id: str
    path: str
    method: str
    environment: str
    protection_state: str
    auth_enforced: bool
    bot_defense_active: bool
    rate_limiting_active: bool
    requests_count: int
    blocked_count: int
    rate_limited_count: int
    threats_count: int
    last_event_at: Optional[str] = None


class ApiProtectionListResponse(BaseModel):
    items: List[ApiProtectionEndpointItem]
    total: int


class NetworkProtectionRuleItem(BaseModel):
    id: str
    project_id: str
    name: str
    source: str
    destination: str
    port: Optional[int] = None
    protocol: str
    action: str
    enforcement_engine: str
    is_enforced: bool
    blocked_packets: int
    last_triggered_at: Optional[str] = None


class NetworkProtectionListResponse(BaseModel):
    items: List[NetworkProtectionRuleItem]
    total: int


class DnsProtectionAuditItem(BaseModel):
    id: str
    project_id: str
    domain: str
    actor: str
    resolver_ip: str
    query_type: str
    decision: str
    policy_matched: Optional[str] = None
    tunneling_detected: bool
    evidence_id: Optional[str] = None
    timestamp: str


class DnsProtectionListResponse(BaseModel):
    items: List[DnsProtectionAuditItem]
    total: int


# ── Threats Schemas ────────────────────────────────────────────────

class ThreatSignalItem(BaseModel):
    id: str
    project_id: str
    threat_name: str
    threat_type: str
    source: str
    target_resource: str
    actor: str
    detection_engine: str
    severity: str
    verification_status: str
    action_taken: str
    status: str
    evidence_id: Optional[str] = None
    detected_at: str


class ThreatSignalListResponse(BaseModel):
    items: List[ThreatSignalItem]
    total: int


# ── Approvals & Break-Glass Schemas ────────────────────────────────

class ProtectionApprovalItem(BaseModel):
    id: str
    project_id: str
    policy_id: Optional[str] = None
    requester: str
    requester_type: str
    action: str
    target_resource: str
    environment: str
    risk_level: str
    justification: Optional[str] = None
    status: str
    approver: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    expires_at: str
    created_at: str


class ProtectionApprovalListResponse(BaseModel):
    items: List[ProtectionApprovalItem]
    total: int


class ResolveApprovalRequest(BaseModel):
    approved: bool
    reason: Optional[str] = None


class BreakGlassRequest(BaseModel):
    scope: str = Field(..., description="Target scope or resources requiring emergency bypass")
    justification: Optional[str] = Field(None, description="Actionable emergency explanation")
    reason: Optional[str] = Field(None, description="Alternative field for emergency explanation")
    duration_minutes: int = Field(default=30, ge=5, le=120)
    project_id: Optional[str] = None
    approver: Optional[str] = None


class BreakGlassResponse(BaseModel):
    session_id: str
    scope: str
    justification: str
    duration_minutes: int
    requester: str
    approver: str
    is_active: bool
    granted_at: str
    expires_at: str


class BreakGlassItem(BaseModel):
    id: str
    scope: str
    justification: Optional[str] = None
    duration_minutes: int
    requester: str
    approver: str
    is_active: bool
    granted_at: str
    expires_at: str


class BreakGlassListResponse(BaseModel):
    items: List[BreakGlassItem]
    total: int


# ── Control Effectiveness & Coverage Schemas ───────────────────────

class ControlEffectivenessItem(BaseModel):
    id: str
    project_id: str
    policy_name: str
    control_type: str
    target_type: str
    expected_behavior: str
    observed_attempts: int
    blocked_count: int
    allowed_count: int
    verification_status: str
    last_verified_at: str


class ControlEffectivenessListResponse(BaseModel):
    items: List[ControlEffectivenessItem]
    total: int


class ProtectionCoverageResponse(BaseModel):
    summary: Dict[str, Any]
    protected_counts: Dict[str, str]
    gaps: List[Dict[str, Any]]


# ── Evidence & Activity Schemas ────────────────────────────────────

class ProtectionEvidenceItem(BaseModel):
    id: str
    project_id: str
    decision_id: Optional[str] = None
    evidence_type: str
    source: str
    actor: str
    resource: str
    action: str
    policy_name: Optional[str] = None
    decision: str
    raw_event_redacted: Optional[str] = None
    normalized_event: Dict[str, Any]
    trace_id: Optional[str] = None
    verification_method: str
    is_redacted: bool
    observed_at: str


from app.schemas.pagination import PaginationMeta


class ProtectionEvidenceListResponse(BaseModel):
    items: List[ProtectionEvidenceItem]
    total: int
    pagination: Optional[PaginationMeta] = None


class ProtectionActivityItem(BaseModel):
    id: str
    project_id: str
    event_type: str
    title: str
    description: Optional[str] = None
    actor: Optional[str] = None
    resource: Optional[str] = None
    decision: Optional[str] = None
    severity: Optional[str] = None
    timestamp: str


class ProtectionActivityListResponse(BaseModel):
    items: List[ProtectionActivityItem]
    total: int
