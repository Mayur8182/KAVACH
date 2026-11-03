"""
THING AGENT — SQLAlchemy Models
Step 07: AI Agent Identity, Authorization, Delegation, Tool Control & Agent Runtime Security.

Architecture: IDENTITY → AUTHORITY → ACTION → EVIDENCE
All model names prefixed with "AgentW" (workspace) to avoid conflicts with
existing governance models (AgentDelegation, AgentToolInvocation, etc.)

Rules:
- Real DB persistence (SQLite dev / PostgreSQL prod)
- LLM proposes. Deterministic policy systems decide. Runtime evidence proves.
- No hardcoded agents, permissions, or activity.
- No fake states, scores, or simulated events.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, JSON, Integer, Float,
    Boolean, Text, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class AgentWEntity(Base):
    """
    Canonical AI agent registration record.
    Every agent that interacts with THING systems must be registered here.
    Status lifecycle: PENDING → ACTIVE → SUSPENDED → DISABLED / QUARANTINED / EXPIRED
    """
    __tablename__ = "agentw_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    agent_id = Column(String(255), nullable=False, unique=True, index=True)
    identity_uri = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)

    owner = Column(String(255), nullable=False, default="Unknown")
    owner_email = Column(String(255), nullable=True)
    environment_id = Column(String(64), nullable=False, default="production", index=True)
    organization_id = Column(String(255), nullable=True)
    tenant_id = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    protection_state = Column(String(32), nullable=False, default="PROTECTED")
    risk_level = Column(String(16), nullable=False, default="LOW", index=True)
    risk_score = Column(Float, nullable=True)
    risk_factors = Column(JSON, default=list)

    capabilities = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    extra_metadata = Column(JSON, default=dict)

    last_active_at = Column(DateTime(timezone=True), nullable=True)
    quarantined_at = Column(DateTime(timezone=True), nullable=True)
    quarantine_reason = Column(Text, nullable=True)

    credential_state = Column(String(32), default="VALID")
    credential_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_agentw_entities_project_status", "project_id", "status"),
        Index("idx_agentw_entities_project_risk", "project_id", "risk_level"),
    )


class AgentWIdentity(Base):
    """Cryptographic identity assertion for an agent."""
    __tablename__ = "agentw_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    issuer = Column(String(512), nullable=False)
    subject = Column(String(512), nullable=False)
    audience = Column(String(512), nullable=True)
    credential_type = Column(String(64), nullable=False, default="JWT")
    credential_fingerprint = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="VALID", index=True)
    issued_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revocation_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AgentWPermission(Base):
    """Explicit permission: WHO can do WHAT on WHICH resource in WHICH environment."""
    __tablename__ = "agentw_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    action = Column(String(64), nullable=False, index=True)
    resource = Column(String(512), nullable=False, index=True)
    resource_type = Column(String(64), nullable=True)
    environment_id = Column(String(64), nullable=False, default="production", index=True)
    scope = Column(JSON, default=dict)

    source = Column(String(32), nullable=False, default="DIRECT")
    granted_by = Column(String(255), nullable=True)
    policy_id = Column(String(255), nullable=True)
    role_name = Column(String(255), nullable=True)

    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_agentw_permissions_agent_status", "agent_entity_id", "status"),
    )


class AgentWTool(Base):
    """Tool registered in the agent tool inventory."""
    __tablename__ = "agentw_tools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    tool_name = Column(String(255), nullable=False, index=True)
    tool_id = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    provider = Column(String(128), nullable=True)
    tool_type = Column(String(64), nullable=False, default="ACTION")

    risk_level = Column(String(16), nullable=False, default="MEDIUM", index=True)
    risk_factors = Column(JSON, default=list)
    risk_reason = Column(Text, nullable=True)

    requires_approval = Column(Boolean, default=False)
    allowed_agents = Column(JSON, default=list)
    environment_restrictions = Column(JSON, default=list)
    parameters_schema = Column(JSON, default=dict)

    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    execution_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class AgentWSession(Base):
    """Runtime session for an agent execution context."""
    __tablename__ = "agentw_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    session_id = Column(String(255), nullable=False, unique=True, index=True)
    trigger = Column(String(255), nullable=True)
    trigger_type = Column(String(32), default="HUMAN")
    environment_id = Column(String(64), nullable=False, default="production", index=True)

    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    risk_level = Column(String(16), nullable=False, default="LOW")

    tool_calls = Column(Integer, default=0)
    data_accesses = Column(Integer, default=0)
    policy_decisions = Column(Integer, default=0)
    policy_blocks = Column(Integer, default=0)

    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    terminated_at = Column(DateTime(timezone=True), nullable=True)
    termination_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_agentw_sessions_agent_status", "agent_entity_id", "status"),
    )


class AgentWDelegation(Base):
    """Agent-to-Agent delegation record."""
    __tablename__ = "agentw_delegations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    issuer_agent_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    delegate_agent_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)

    delegated_actions = Column(JSON, default=list)
    delegated_resources = Column(JSON, default=list)
    scope = Column(JSON, default=dict)

    environment_id = Column(String(64), nullable=False, default="production", index=True)
    policy_id = Column(String(255), nullable=True)

    max_depth = Column(Integer, default=1)
    current_depth = Column(Integer, default=1)
    further_delegation_allowed = Column(Boolean, default=False)
    approval_required = Column(Boolean, default=False)

    status = Column(String(32), nullable=False, default="ACTIVE", index=True)
    reason = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revocation_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class AgentWAction(Base):
    """Individual tool execution record — authoritative audit trail."""
    __tablename__ = "agentw_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("agentw_sessions.id"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    tool_id = Column(String(255), nullable=False, index=True)
    tool_name = Column(String(255), nullable=False)

    action_type = Column(String(64), nullable=False, default="TOOL_CALL")
    input_payload = Column(JSON, default=dict)
    output_payload = Column(JSON, default=dict)
    target_resource = Column(String(512), nullable=True)
    environment_id = Column(String(64), nullable=False, default="production", index=True)

    policy_id = Column(String(255), nullable=True)
    policy_name = Column(String(255), nullable=True)
    decision = Column(String(32), nullable=False, default="ALLOWED", index=True)

    result = Column(String(32), nullable=True)
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)

    evidence_id = Column(String(255), nullable=True)
    trace_id = Column(String(255), nullable=True)
    correlation_id = Column(String(255), nullable=True)

    executed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_agentw_actions_agent_decision", "agent_entity_id", "decision"),
        Index("idx_agentw_actions_executed_at", "executed_at"),
    )


class AgentWDataAccess(Base):
    """Data access event record — tracks which data resources agents accessed."""
    __tablename__ = "agentw_data_accesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("agentw_sessions.id"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    data_resource = Column(String(512), nullable=False, index=True)
    data_classification = Column(String(32), nullable=False, default="INTERNAL")
    data_type = Column(String(64), nullable=True)

    action = Column(String(32), nullable=False, default="READ")
    purpose = Column(Text, nullable=True)
    environment_id = Column(String(64), nullable=False, default="production")

    policy_id = Column(String(255), nullable=True)
    decision = Column(String(32), nullable=False, default="ALLOWED")

    is_external_destination = Column(Boolean, default=False)
    external_destination = Column(String(512), nullable=True)
    flow_type = Column(String(32), default="DECLARED")

    risk_level = Column(String(16), nullable=False, default="LOW")
    evidence_id = Column(String(255), nullable=True)
    accessed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AgentWBehaviorEvent(Base):
    """Behavioral signal — unusual patterns or anomalies in agent runtime."""
    __tablename__ = "agentw_behavior_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    signal_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), nullable=False, default="LOW", index=True)
    verification_status = Column(String(32), nullable=False, default="SIGNAL")

    description = Column(Text, nullable=False)
    observed_value = Column(JSON, default=dict)
    baseline_value = Column(JSON, default=dict)
    evidence_id = Column(String(255), nullable=True)

    is_dismissed = Column(Boolean, default=False)
    dismissed_reason = Column(Text, nullable=True)

    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AgentWApproval(Base):
    """Human-in-the-loop approval gating record."""
    __tablename__ = "agentw_approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    request_type = Column(String(64), nullable=False)
    requested_action = Column(String(255), nullable=False)
    requested_resource = Column(String(512), nullable=False)
    environment_id = Column(String(64), nullable=False, default="production")
    risk_level = Column(String(16), nullable=False, default="HIGH")

    policy_id = Column(String(255), nullable=True)
    policy_name = Column(String(255), nullable=True)

    requested_by = Column(String(255), nullable=False)
    reviewed_by = Column(String(255), nullable=True)
    review_reason = Column(Text, nullable=True)

    status = Column(String(32), nullable=False, default="PENDING", index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    evidence_id = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class AgentWEvidence(Base):
    """Cryptographic evidence record linked to agent events."""
    __tablename__ = "agentw_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    evidence_type = Column(String(64), nullable=False)
    actor = Column(String(255), nullable=True)
    action = Column(String(255), nullable=True)
    resource = Column(String(512), nullable=True)
    decision = Column(String(32), nullable=True)

    raw_event = Column(JSON, default=dict)
    normalized_event = Column(JSON, default=dict)

    sha256_hash = Column(String(64), nullable=True)
    correlation_id = Column(String(255), nullable=True, index=True)
    trace_id = Column(String(255), nullable=True)
    policy_id = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class AgentWAuditEvent(Base):
    """Immutable audit log — every sensitive administrative action on agents."""
    __tablename__ = "agentw_audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_entity_id = Column(UUID(as_uuid=True), ForeignKey("agentw_entities.id"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    event_type = Column(String(64), nullable=False, index=True)
    actor = Column(String(255), nullable=False)
    target_entity_id = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    outcome = Column(String(32), nullable=False, default="SUCCESS")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
