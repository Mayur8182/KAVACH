"""
Step 28 — Agent Governance API

Routes:
  GET  /agent-governance/providers
  GET  /agent-governance/providers/{provider}/health
  POST /agent-governance/profiles
  GET  /agent-governance/profiles/{agent_id}

  POST /agent-governance/sessions
  GET  /agent-governance/sessions
  POST /agent-governance/sessions/{session_id}/end
  POST /agent-governance/sessions/{session_id}/revoke

  POST /agent-governance/actions/evaluate
  POST /agent-governance/actions/simulate

  POST /agent-governance/events/tool
  POST /agent-governance/events/command
  POST /agent-governance/events/file
  POST /agent-governance/events/network
  POST /agent-governance/events/code-change
  POST /agent-governance/events/git
  POST /agent-governance/events/mcp

  GET  /agent-governance/events
  GET  /agent-governance/sessions/{session_id}/timeline

  GET  /agent-governance/approvals
  POST /agent-governance/approvals
  POST /agent-governance/approvals/{approval_id}/review

  POST /agent-governance/agents/{agent_id}/revoke
  POST /agent-governance/sessions/{session_id}/revoke
  POST /agent-governance/kill-switch

  GET  /agent-governance/delegations
  POST /agent-governance/delegations

  GET  /agent-governance/anomalies

  GET  /agent-governance/dashboard
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.agent_governance_service import AgentGovernanceService

router = APIRouter(prefix="/agent-governance", tags=["Agent Governance — Step 28"])


# ─────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────

class ProviderAdapterResponse(BaseModel):
    id: uuid.UUID
    provider: str
    display_name: str
    adapter_version: str
    status: str
    integration_method: Optional[str]
    supported_capabilities: Optional[Dict]
    last_health_check: Optional[datetime]
    health_check_error: Optional[str]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateGovernanceProfileRequest(BaseModel):
    agent_id: uuid.UUID
    agent_provider: str = Field(..., description="cursor | claude_code | codex | github_copilot | antigravity | generic")
    agent_name: str
    agent_version: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    environment: str = "development"
    owner_user_id: Optional[uuid.UUID] = None
    policy_scope: Optional[Dict] = None


class GovernanceProfileResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    agent_provider: str
    agent_name: str
    agent_version: Optional[str]
    model_provider: Optional[str]
    model_name: Optional[str]
    environment: str
    lifecycle_status: str
    owner_user_id: Optional[uuid.UUID]
    revoked_at: Optional[datetime]
    revocation_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StartSessionRequest(BaseModel):
    agent_id: uuid.UUID
    project_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    repository_id: Optional[str] = None
    environment: str = "development"
    client_metadata: Optional[Dict] = None
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    policy_version: Optional[int] = None
    blueprint_version: Optional[int] = None
    contract_version: Optional[int] = None


class SessionResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    project_id: uuid.UUID
    repository_id: Optional[str]
    environment: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    ip_address: Optional[str]
    device_id: Optional[str]
    policy_version: Optional[int]
    blueprint_version: Optional[int]
    contract_version: Optional[int]
    revoked_at: Optional[datetime]
    revocation_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class RevokeRequest(BaseModel):
    reason: str
    trigger: str = "MANUAL"
    is_emergency: bool = False


class EvaluateActionRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    action_type: str
    resource: Optional[str] = None
    environment: str = "development"
    context: Optional[Dict] = None
    policy_version: Optional[int] = None
    blueprint_version: Optional[int] = None
    contract_version: Optional[int] = None


class PolicyDecisionResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    action_type: str
    resource: Optional[str]
    environment: Optional[str]
    decision: str
    risk_level: str
    matched_rules: Optional[List]
    required_approvals: Optional[List]
    policy_version: Optional[int]
    is_simulation: bool
    evaluated_at: datetime

    class Config:
        from_attributes = True


class RecordToolRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    tool_name: str
    tool_type: str
    resource: Optional[str] = None
    raw_arguments: Optional[Dict] = None
    policy_version: Optional[int] = None


class RecordCommandRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    raw_command: str


class RecordFileAccessRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    operation: str = Field(..., description="READ | WRITE | DELETE | LIST")
    file_path: str


class RecordNetworkRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    destination_host: str
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    destination_category: Optional[str] = None


class RecordCodeChangeRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    file_path: str
    change_description: Optional[str] = None
    diff_hash: Optional[str] = None
    lines_added: Optional[int] = None
    lines_removed: Optional[int] = None
    policy_version: Optional[int] = None


class RecordGitOperationRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: uuid.UUID
    operation: str
    repository: Optional[str] = None
    branch: Optional[str] = None
    target_branch: Optional[str] = None
    commit_sha: Optional[str] = None


class ToolInvocationResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    tool_name: str
    tool_type: str
    resource: Optional[str]
    arguments_hash: Optional[str]
    argument_metadata: Optional[Dict]
    risk_level: str
    policy_decision: str
    requested_at: datetime

    class Config:
        from_attributes = True


class CommandResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    raw_command: str
    executable: Optional[str]
    arguments: Optional[List]
    risk_level: str
    policy_decision: str
    block_reason: Optional[str]
    matched_policy_rule: Optional[str]
    requested_at: datetime

    class Config:
        from_attributes = True


class FileAccessResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    operation: str
    file_path: str
    is_sensitive_path: bool
    sensitivity_category: Optional[str]
    risk_level: str
    policy_decision: str
    is_path_traversal_attempt: bool
    block_reason: Optional[str]
    accessed_at: datetime

    class Config:
        from_attributes = True


class NetworkEventResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    destination_host: str
    destination_port: Optional[int]
    protocol: Optional[str]
    destination_category: Optional[str]
    risk_level: str
    policy_decision: str
    threat_intel_match: bool
    occurred_at: datetime

    class Config:
        from_attributes = True


class CodeChangeResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    file_path: str
    change_description: Optional[str]
    status: str
    policy_decision: str
    findings_count: int
    proposed_at: datetime
    applied_at: Optional[datetime]
    verified_at: Optional[datetime]

    class Config:
        from_attributes = True


class GitOperationResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: uuid.UUID
    operation: str
    repository: Optional[str]
    branch: Optional[str]
    risk_level: str
    policy_decision: str
    block_reason: Optional[str]
    occurred_at: datetime

    class Config:
        from_attributes = True


class SecurityEventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    agent_id: Optional[uuid.UUID]
    session_id: Optional[uuid.UUID]
    project_id: Optional[uuid.UUID]
    action: Optional[str]
    resource: Optional[str]
    risk_level: str
    policy_decision: Optional[str]
    details: Optional[Dict]
    occurred_at: datetime

    class Config:
        from_attributes = True


class CreateApprovalRequest(BaseModel):
    agent_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    requested_by_user_id: Optional[uuid.UUID] = None
    action_type: str
    resource: Optional[str] = None
    risk_level: str = "HIGH"
    context: Optional[Dict] = None
    expires_in_minutes: int = 60


class ReviewApprovalRequest(BaseModel):
    decision: str = Field(..., description="APPROVED | DENIED")
    review_note: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: Optional[uuid.UUID]
    project_id: uuid.UUID
    action_type: str
    resource: Optional[str]
    risk_level: str
    status: str
    review_note: Optional[str]
    requested_at: datetime
    reviewed_at: Optional[datetime]
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class CreateDelegationRequest(BaseModel):
    delegator_agent_id: uuid.UUID
    delegate_agent_id: uuid.UUID
    project_id: uuid.UUID
    original_user_id: Optional[uuid.UUID] = None
    scope: Optional[Dict] = None
    resources: Optional[List] = None
    actions: Optional[List] = None
    conditions: Optional[Dict] = None
    max_depth: int = Field(default=1, le=3)
    further_delegation_allowed: bool = False
    expires_in_hours: int = 24


class DelegationResponse(BaseModel):
    id: uuid.UUID
    delegator_agent_id: uuid.UUID
    delegate_agent_id: uuid.UUID
    project_id: uuid.UUID
    scope: Optional[Dict]
    actions: Optional[List]
    max_depth: int
    further_delegation_allowed: bool
    status: str
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    session_id: Optional[uuid.UUID]
    project_id: uuid.UUID
    anomaly_type: str
    description: str
    severity: str
    status: str
    baseline_deviation_score: Optional[float]
    detected_at: datetime

    class Config:
        from_attributes = True


class DashboardMetricsResponse(BaseModel):
    active_sessions: int
    blocked_actions: int
    pending_approvals: int
    open_anomalies: int
    total_events: int
    tool_invocations: int


# ─────────────────────────────────────────────────────────────────
# Provider Adapters
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/providers",
    response_model=List[ProviderAdapterResponse],
    summary="List all AI agent provider adapters with real integration status",
)
async def list_provider_adapters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ProviderAdapterResponse]:
    svc = AgentGovernanceService(db)
    adapters = await svc.list_provider_adapters()
    return [ProviderAdapterResponse.model_validate(a) for a in adapters]


@router.get(
    "/providers/{provider}",
    response_model=ProviderAdapterResponse,
    summary="Get provider adapter details",
)
async def get_provider_adapter(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProviderAdapterResponse:
    svc = AgentGovernanceService(db)
    adapter = await svc.get_provider_adapter(provider)
    if not adapter:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found")
    return ProviderAdapterResponse.model_validate(adapter)


# ─────────────────────────────────────────────────────────────────
# Governance Profiles
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/profiles",
    response_model=GovernanceProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a governance profile for an AI agent",
)
async def create_governance_profile(
    payload: CreateGovernanceProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GovernanceProfileResponse:
    svc = AgentGovernanceService(db)
    profile = await svc.create_governance_profile(
        agent_id=payload.agent_id,
        agent_provider=payload.agent_provider,
        agent_name=payload.agent_name,
        agent_version=payload.agent_version,
        model_provider=payload.model_provider,
        model_name=payload.model_name,
        environment=payload.environment,
        owner_user_id=payload.owner_user_id or current_user.id,
        policy_scope=payload.policy_scope,
    )
    await db.commit()
    return GovernanceProfileResponse.model_validate(profile)


@router.get(
    "/profiles/{agent_id}",
    response_model=GovernanceProfileResponse,
    summary="Get governance profile for an agent",
)
async def get_governance_profile(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GovernanceProfileResponse:
    svc = AgentGovernanceService(db)
    profile = await svc.get_governance_profile(agent_id)
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Governance profile not found")
    return GovernanceProfileResponse.model_validate(profile)


# ─────────────────────────────────────────────────────────────────
# Sessions
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new agent governance session",
)
async def start_session(
    payload: StartSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    svc = AgentGovernanceService(db)
    session = await svc.start_session(
        agent_id=payload.agent_id,
        project_id=payload.project_id,
        user_id=payload.user_id or current_user.id,
        repository_id=payload.repository_id,
        environment=payload.environment,
        client_metadata=payload.client_metadata,
        ip_address=payload.ip_address,
        device_id=payload.device_id,
        policy_version=payload.policy_version,
        blueprint_version=payload.blueprint_version,
        contract_version=payload.contract_version,
    )
    await db.commit()
    return SessionResponse.model_validate(session)


@router.get(
    "/sessions",
    response_model=List[SessionResponse],
    summary="List agent governance sessions",
)
async def list_sessions(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    project_id: Optional[uuid.UUID] = Query(default=None),
    session_status: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SessionResponse]:
    svc = AgentGovernanceService(db)
    sessions = await svc.list_sessions(
        agent_id=agent_id, project_id=project_id, status=session_status,
        limit=limit, offset=offset,
    )
    return [SessionResponse.model_validate(s) for s in sessions]


@router.post(
    "/sessions/{session_id}/end",
    response_model=SessionResponse,
    summary="End an agent governance session",
)
async def end_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    svc = AgentGovernanceService(db)
    session = await svc.end_session(session_id, status="COMPLETED")
    await db.commit()
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.model_validate(session)


@router.post(
    "/sessions/{session_id}/revoke",
    response_model=SessionResponse,
    summary="Revoke an agent session (kill switch)",
)
async def revoke_session(
    session_id: uuid.UUID,
    payload: RevokeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    svc = AgentGovernanceService(db)
    session = await svc.revoke_session(
        session_id=session_id,
        reason=payload.reason,
        revoked_by_user_id=current_user.id,
        trigger=payload.trigger,
    )
    await db.commit()
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.model_validate(session)


# ─────────────────────────────────────────────────────────────────
# Action Security Pipeline
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/actions/evaluate",
    response_model=PolicyDecisionResponse,
    summary="Evaluate agent action against security policy (§28.11)",
)
async def evaluate_action(
    payload: EvaluateActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PolicyDecisionResponse:
    svc = AgentGovernanceService(db)
    decision = await svc.evaluate_action(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        project_id=payload.project_id,
        action_type=payload.action_type,
        resource=payload.resource,
        environment=payload.environment,
        context=payload.context,
        is_simulation=False,
        policy_version=payload.policy_version,
        blueprint_version=payload.blueprint_version,
        contract_version=payload.contract_version,
    )
    await db.commit()
    return PolicyDecisionResponse.model_validate(decision)


@router.post(
    "/actions/simulate",
    response_model=PolicyDecisionResponse,
    summary="Simulate policy evaluation without executing action (§28.40)",
)
async def simulate_action(
    payload: EvaluateActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PolicyDecisionResponse:
    """Simulation only — action is NEVER executed."""
    svc = AgentGovernanceService(db)
    decision = await svc.evaluate_action(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        project_id=payload.project_id,
        action_type=payload.action_type,
        resource=payload.resource,
        environment=payload.environment,
        context=payload.context,
        is_simulation=True,  # critical: never executes
        policy_version=payload.policy_version,
        blueprint_version=payload.blueprint_version,
        contract_version=payload.contract_version,
    )
    await db.commit()
    return PolicyDecisionResponse.model_validate(decision)


# ─────────────────────────────────────────────────────────────────
# Event Recording
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/events/tool",
    response_model=ToolInvocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent tool invocation — arguments are hashed, never stored plaintext",
)
async def record_tool_invocation(
    payload: RecordToolRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToolInvocationResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_tool_invocation(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        user_id=payload.user_id,
        tool_name=payload.tool_name,
        tool_type=payload.tool_type,
        resource=payload.resource,
        raw_arguments=payload.raw_arguments,
        policy_version=payload.policy_version,
    )
    await db.commit()
    return ToolInvocationResponse.model_validate(record)


@router.post(
    "/events/command",
    response_model=CommandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent command — parsed + risk-classified deterministically (§28.13)",
)
async def record_command(
    payload: RecordCommandRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_command_execution(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        raw_command=payload.raw_command,
    )
    await db.commit()
    return CommandResponse.model_validate(record)


@router.post(
    "/events/file",
    response_model=FileAccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent file access — sensitive path detection runs deterministically",
)
async def record_file_access(
    payload: RecordFileAccessRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileAccessResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_file_access(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        operation=payload.operation,
        file_path=payload.file_path,
    )
    await db.commit()
    return FileAccessResponse.model_validate(record)


@router.post(
    "/events/network",
    response_model=NetworkEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent network request",
)
async def record_network_event(
    payload: RecordNetworkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NetworkEventResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_network_event(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        destination_host=payload.destination_host,
        destination_port=payload.destination_port,
        protocol=payload.protocol,
        destination_category=payload.destination_category,
    )
    await db.commit()
    return NetworkEventResponse.model_validate(record)


@router.post(
    "/events/code-change",
    response_model=CodeChangeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record AI agent code change — routes through security pipeline, never auto-trusted",
)
async def record_code_change(
    payload: RecordCodeChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeChangeResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_code_change(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        file_path=payload.file_path,
        change_description=payload.change_description,
        diff_hash=payload.diff_hash,
        lines_added=payload.lines_added,
        lines_removed=payload.lines_removed,
        policy_version=payload.policy_version,
    )
    await db.commit()
    return CodeChangeResponse.model_validate(record)


@router.post(
    "/events/git",
    response_model=GitOperationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record agent Git operation — high-risk ops (push, force-push) require approval",
)
async def record_git_operation(
    payload: RecordGitOperationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GitOperationResponse:
    svc = AgentGovernanceService(db)
    record = await svc.record_git_operation(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        operation=payload.operation,
        repository=payload.repository,
        branch=payload.branch,
        target_branch=payload.target_branch,
        commit_sha=payload.commit_sha,
    )
    await db.commit()
    return GitOperationResponse.model_validate(record)


@router.get(
    "/events",
    response_model=List[SecurityEventResponse],
    summary="List agent security events",
)
async def list_security_events(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    session_id: Optional[uuid.UUID] = Query(default=None),
    project_id: Optional[uuid.UUID] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SecurityEventResponse]:
    svc = AgentGovernanceService(db)
    events = await svc.list_events(
        agent_id=agent_id, session_id=session_id, project_id=project_id,
        event_type=event_type, risk_level=risk_level, limit=limit, offset=offset,
    )
    return [SecurityEventResponse.model_validate(e) for e in events]


# ─────────────────────────────────────────────────────────────────
# Approvals
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/approvals",
    response_model=List[ApprovalResponse],
    summary="List pending agent action approvals",
)
async def list_approvals(
    project_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ApprovalResponse]:
    svc = AgentGovernanceService(db)
    approvals = await svc.list_pending_approvals(project_id=project_id, limit=limit)
    return [ApprovalResponse.model_validate(a) for a in approvals]


@router.post(
    "/approvals",
    response_model=ApprovalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create approval request for high-risk agent action",
)
async def create_approval(
    payload: CreateApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    svc = AgentGovernanceService(db)
    approval = await svc.create_approval_request(
        agent_id=payload.agent_id,
        session_id=payload.session_id,
        project_id=payload.project_id,
        requested_by_user_id=payload.requested_by_user_id or current_user.id,
        action_type=payload.action_type,
        resource=payload.resource,
        risk_level=payload.risk_level,
        context=payload.context,
        expires_in_minutes=payload.expires_in_minutes,
    )
    await db.commit()
    return ApprovalResponse.model_validate(approval)


@router.post(
    "/approvals/{approval_id}/review",
    response_model=ApprovalResponse,
    summary="Approve or deny a pending agent action approval",
)
async def review_approval(
    approval_id: uuid.UUID,
    payload: ReviewApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApprovalResponse:
    svc = AgentGovernanceService(db)
    approval = await svc.review_approval(
        approval_id=approval_id,
        reviewed_by_user_id=current_user.id,
        decision=payload.decision,
        review_note=payload.review_note,
    )
    await db.commit()
    if not approval:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Approval not found")
    return ApprovalResponse.model_validate(approval)


# ─────────────────────────────────────────────────────────────────
# Kill Switch / Revocation
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/agents/{agent_id}/revoke",
    status_code=status.HTTP_200_OK,
    summary="Revoke an AI agent — terminates all sessions and delegations",
)
async def revoke_agent(
    agent_id: uuid.UUID,
    payload: RevokeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    svc = AgentGovernanceService(db)
    revocation = await svc.revoke_agent(
        agent_id=agent_id,
        reason=payload.reason,
        revoked_by_user_id=current_user.id,
        trigger=payload.trigger,
        is_emergency=payload.is_emergency,
    )
    await db.commit()
    return {
        "revocation_id": str(revocation.id),
        "agent_id": str(agent_id),
        "status": "REVOKED",
        "trigger": payload.trigger,
        "is_emergency": payload.is_emergency,
        "revoked_at": revocation.revoked_at.isoformat(),
    }


@router.post(
    "/kill-switch",
    status_code=status.HTTP_200_OK,
    summary="Emergency global/project kill switch for AI agents (§28.28)",
)
async def emergency_kill_switch(
    payload: RevokeRequest,
    project_id: Optional[uuid.UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Emergency kill switch: revokes all active sessions for all agents
    within a project (or globally if no project specified).
    All kill switch activations are: Authenticated + Authorized + Audited.
    """
    from sqlalchemy import select
    from app.models.agent_governance import AgentGovernanceSession

    # Get all active sessions to revoke
    stmt = select(AgentGovernanceSession).where(
        AgentGovernanceSession.status.in_(["ACTIVE", "IDLE", "STARTING"])
    )
    if project_id:
        stmt = stmt.where(AgentGovernanceSession.project_id == project_id)

    result = await db.execute(stmt)
    active_sessions = result.scalars().all()

    svc = AgentGovernanceService(db)
    revoked_count = 0
    for session in active_sessions:
        await svc.revoke_session(
            session_id=session.id,
            reason=f"EMERGENCY KILL SWITCH: {payload.reason}",
            revoked_by_user_id=current_user.id,
            trigger="KILL_SWITCH",
        )
        revoked_count += 1

    await db.commit()
    return {
        "status": "KILL_SWITCH_ACTIVATED",
        "sessions_revoked": revoked_count,
        "scope": str(project_id) if project_id else "GLOBAL",
        "triggered_by": str(current_user.id),
        "reason": payload.reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────
# Delegations
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/delegations",
    response_model=DelegationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create agent delegation — delegated authority ⊆ delegator authority",
)
async def create_delegation(
    payload: CreateDelegationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DelegationResponse:
    svc = AgentGovernanceService(db)
    delegation = await svc.create_delegation(
        delegator_agent_id=payload.delegator_agent_id,
        delegate_agent_id=payload.delegate_agent_id,
        project_id=payload.project_id,
        original_user_id=payload.original_user_id or current_user.id,
        scope=payload.scope,
        resources=payload.resources,
        actions=payload.actions,
        conditions=payload.conditions,
        max_depth=payload.max_depth,
        further_delegation_allowed=payload.further_delegation_allowed,
        expires_in_hours=payload.expires_in_hours,
    )
    await db.commit()
    return DelegationResponse.model_validate(delegation)


@router.get(
    "/delegations",
    response_model=List[DelegationResponse],
    summary="List agent delegations",
)
async def list_delegations(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    project_id: Optional[uuid.UUID] = Query(default=None),
    deleg_status: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DelegationResponse]:
    svc = AgentGovernanceService(db)
    delegations = await svc.list_delegations(
        agent_id=agent_id, project_id=project_id, status=deleg_status, limit=limit
    )
    return [DelegationResponse.model_validate(d) for d in delegations]


# ─────────────────────────────────────────────────────────────────
# Anomalies
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/anomalies",
    response_model=List[AnomalyResponse],
    summary="List agent behavior anomalies",
)
async def list_anomalies(
    agent_id: Optional[uuid.UUID] = Query(default=None),
    project_id: Optional[uuid.UUID] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    anom_status: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AnomalyResponse]:
    from sqlalchemy import select as sa_select
    from app.models.agent_governance import AgentBehaviorAnomaly

    stmt = sa_select(AgentBehaviorAnomaly)
    if agent_id:
        stmt = stmt.where(AgentBehaviorAnomaly.agent_id == agent_id)
    if project_id:
        stmt = stmt.where(AgentBehaviorAnomaly.project_id == project_id)
    if severity:
        stmt = stmt.where(AgentBehaviorAnomaly.severity == severity)
    if anom_status:
        stmt = stmt.where(AgentBehaviorAnomaly.status == anom_status)
    stmt = stmt.order_by(AgentBehaviorAnomaly.detected_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    anomalies = result.scalars().all()
    return [AnomalyResponse.model_validate(a) for a in anomalies]


# ─────────────────────────────────────────────────────────────────
# Dashboard
# ─────────────────────────────────────────────────────────────────

@router.get(
    "/dashboard",
    response_model=DashboardMetricsResponse,
    summary="Real-time agent governance dashboard metrics from DB",
)
async def get_dashboard_metrics(
    project_id: Optional[uuid.UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardMetricsResponse:
    """
    All numbers are computed from real DB queries.
    Never hardcoded. (§28.35)
    """
    svc = AgentGovernanceService(db)
    metrics = await svc.get_dashboard_metrics(project_id=project_id)
    return DashboardMetricsResponse(**metrics)
