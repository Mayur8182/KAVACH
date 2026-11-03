"""
Thing Protect — Models
Step 06 Runtime Protection, Policy Enforcement, MCP Security & Active Defense Models.

Rules:
- Real database persistence in PostgreSQL / SQLite
- LLM proposes. Deterministic security systems decide. Runtime evidence proves.
- Distinguish: OBSERVED, DETECTED, SUSPECTED, VERIFIED, BLOCKED, ALLOWED, FAILED, UNKNOWN.
- No fake protection states or static scores.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Float,
    Boolean,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ProtectionPolicy(Base):
    """
    Authoritative runtime policy definition.
    Types: ACCESS, API, AGENT, MCP, DATA, NETWORK, IDENTITY, RATE_LIMIT, THREAT, RUNTIME, ENVIRONMENT.
    """
    __tablename__ = "protection_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    policy_type = Column(String(64), nullable=False, index=True)  # ACCESS, API, AGENT, MCP, DATA, NETWORK, IDENTITY, RATE_LIMIT, THREAT, RUNTIME, ENVIRONMENT
    scope = Column(JSON, default=dict)  # environments, services, actors, resources
    conditions = Column(JSON, default=list)  # WHEN rules: [{"field": "actor.role", "op": "==", "value": "ai_agent"}]
    action = Column(String(64), nullable=False, default="BLOCK")  # ALLOW, BLOCK, CHALLENGE, REQUIRE_APPROVAL, RATE_LIMIT, QUARANTINE, ISOLATE, REVOKE, DENY
    action_config = Column(JSON, default=dict)  # rate_limit thresholds, challenge types, etc.
    exceptions = Column(JSON, default=list)  # Whitelisted principals or break-glass overrides
    
    enforcement_mode = Column(String(32), nullable=False, default="ENFORCE", index=True)  # MONITOR, ALERT, CHALLENGE, ENFORCE, APPROVAL
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # DRAFT, SIMULATED, ACTIVE, SUSPENDED, DEPRECATED
    version = Column(Integer, default=1)
    
    owner = Column(String(128), default="Security Engineering")
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    triggers_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProtectionPolicyVersion(Base):
    """
    Immutable version history for rollback and audit trail.
    """
    __tablename__ = "protection_policy_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("protection_policies.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    
    snapshot = Column(JSON, nullable=False)  # Full policy state at this version
    diff_summary = Column(JSON, default=dict)  # {"added": [...], "changed": [...], "removed": [...]}
    simulation_result = Column(JSON, nullable=True)  # {"would_allow": 12, "would_block": 4, "would_require_approval": 1}
    
    created_by = Column(String(128), nullable=False, default="admin")
    change_reason = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ProtectionDecisionRecord(Base):
    """
    Authoritative runtime decision log. Every allow, block, approval, or challenge is audited with evidence.
    """
    __tablename__ = "protection_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("protection_policies.id"), nullable=True, index=True)
    evidence_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    actor = Column(String(255), nullable=False, index=True)  # agent-42, service-worker, user-102
    actor_type = Column(String(64), nullable=False, default="AGENT")  # AGENT, SERVICE, USER, ANONYMOUS
    action = Column(String(64), nullable=False, index=True)  # READ, WRITE, EXECUTE, DELEGATE, EXPORT, CONNECT
    resource = Column(String(512), nullable=False, index=True)  # customer_db, payment_api, s3://secrets
    environment = Column(String(64), nullable=False, default="production", index=True)
    risk_level = Column(String(32), nullable=False, default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW

    decision = Column(String(64), nullable=False, index=True)  # ALLOW, BLOCK, CHALLENGE, REQUIRE_APPROVAL, RATE_LIMIT, QUARANTINE, ISOLATE, REVOKE, DENY
    reason = Column(Text, nullable=False)
    enforcement_layer = Column(String(64), nullable=False, default="OPA_GATEWAY")  # MCP_GATEWAY, OPA_GATEWAY, EBPF, SURICATA, REVERSE_PROXY
    
    context_data = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class RuntimeProtectionTarget(Base):
    """
    Monitored and guarded runtime workload.
    """
    __tablename__ = "runtime_protection_targets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    target_type = Column(String(64), nullable=False, index=True)  # APPLICATION, API, SERVICE, CONTAINER, KUBERNETES_WORKLOAD, CLOUD_WORKLOAD, AGENT, MCP_SERVER, DATABASE, NETWORK_SERVICE
    environment = Column(String(64), nullable=False, default="production", index=True)
    
    protection_state = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, DEGRADED, PARTIALLY_PROTECTED, DISABLED, FAILED, NOT_CONFIGURED, NOT_CONNECTED, UNKNOWN
    active_policy_name = Column(String(255), nullable=True)
    policy_version = Column(String(32), nullable=True)
    
    health_status = Column(String(32), default="HEALTHY")  # HEALTHY, WARNING, CRITICAL, OFFLINE
    enforcement_mode = Column(String(32), default="ENFORCE")  # MONITOR, ALERT, CHALLENGE, ENFORCE, APPROVAL
    fail_mode = Column(String(32), default="FAIL_CLOSED")  # FAIL_CLOSED, FAIL_OPEN
    
    last_event_at = Column(DateTime(timezone=True), nullable=True)
    last_enforcement_at = Column(DateTime(timezone=True), nullable=True)
    events_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class McpProtectionServer(Base):
    """
    Model Context Protocol (MCP) server protected by Thing MCP Gateway.
    """
    __tablename__ = "mcp_protection_servers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    server_url = Column(String(512), nullable=False)
    identity_principal = Column(String(255), nullable=False)
    environment = Column(String(64), nullable=False, default="production", index=True)
    
    tools_count = Column(Integer, default=0)
    resources_count = Column(Integer, default=0)
    status = Column(String(32), default="ONLINE", index=True)  # ONLINE, OFFLINE, DEGRADED, DISCONNECTED
    protection_state = Column(String(32), default="ACTIVE", index=True)  # ACTIVE, BYPASS, MONITOR, DISABLED
    gateway_version = Column(String(32), default="v1.4.0")
    
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class McpToolControlRecord(Base):
    """
    Tool-level security constraints for MCP endpoints.
    """
    __tablename__ = "mcp_tool_controls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_protection_servers.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    tool_name = Column(String(128), nullable=False, index=True)
    description = Column(Text, nullable=True)
    risk_level = Column(String(32), nullable=False, default="MEDIUM", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    
    allowed_agents = Column(JSON, default=list)  # ["agent-admin", "agent-deployer"]
    allowed_environments = Column(JSON, default=list)  # ["development", "staging"]
    requires_approval = Column(Boolean, default=False)
    production_blocked = Column(Boolean, default=False)
    data_access_tags = Column(JSON, default=list)  # ["SENSITIVE_PII", "DATABASE_ADMIN"]
    policy_name = Column(String(255), nullable=True)
    
    total_invocations = Column(Integer, default=0)
    blocked_invocations = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class McpRequestAudit(Base):
    """
    Intercepted MCP request stream passed through Thing MCP Gateway.
    """
    __tablename__ = "mcp_request_audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    server_id = Column(UUID(as_uuid=True), ForeignKey("mcp_protection_servers.id"), nullable=True, index=True)
    
    agent_id = Column(String(128), nullable=False, index=True)
    tool_name = Column(String(128), nullable=False, index=True)
    arguments_redacted = Column(JSON, default=dict)
    identity_verified = Column(Boolean, default=True)
    
    policy_matched = Column(String(255), nullable=True)
    decision = Column(String(32), nullable=False, default="ALLOW", index=True)  # ALLOW, BLOCK, REQUIRE_APPROVAL, RATE_LIMIT
    approval_status = Column(String(32), nullable=True)  # PENDING, APPROVED, REJECTED, EXPIRED, NOT_REQUIRED
    execution_status = Column(String(32), default="COMPLETED")  # WAITING, EXECUTING, COMPLETED, FAILED, BLOCKED
    
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    duration_ms = Column(Integer, default=45)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class ProtectedAgentEntity(Base):
    """
    Governed AI agent with runtime guardrails and action limits.
    """
    __tablename__ = "protected_agent_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    agent_identifier = Column(String(128), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    identity_principal = Column(String(255), nullable=False)
    environment = Column(String(64), nullable=False, default="production", index=True)
    
    risk_level = Column(String(32), nullable=False, default="MEDIUM", index=True)
    policy_name = Column(String(255), nullable=True)
    active_session_id = Column(String(128), nullable=True)
    last_action = Column(String(255), nullable=True)
    protection_state = Column(String(32), default="ACTIVE", index=True)  # ACTIVE, MONITORED, QUARANTINED, SUSPENDED
    status = Column(String(32), default="ONLINE", index=True)
    
    actions_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    last_action_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ProtectedSessionRecord(Base):
    """
    Session control table with active revocation and quarantine capability.
    """
    __tablename__ = "protected_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    session_token_hash = Column(String(128), nullable=False, index=True)
    actor = Column(String(255), nullable=False, index=True)
    actor_type = Column(String(64), nullable=False, default="AGENT")
    environment = Column(String(64), nullable=False, default="production")
    
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, SUSPENDED, REVOKED, QUARANTINED, TERMINATED
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    reason = Column(Text, nullable=True)
    
    revoked_by = Column(String(128), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_active_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ApiProtectionEndpoint(Base):
    """
    API runtime defense, abuse monitoring, and rate limiting status.
    """
    __tablename__ = "api_protection_endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    path = Column(String(512), nullable=False, index=True)
    method = Column(String(16), nullable=False, default="GET", index=True)
    environment = Column(String(64), nullable=False, default="production", index=True)
    
    protection_state = Column(String(32), default="ACTIVE", index=True)  # ACTIVE, MONITOR, BYPASS, DISABLED
    auth_enforced = Column(Boolean, default=True)
    bot_defense_active = Column(Boolean, default=True)
    rate_limiting_active = Column(Boolean, default=True)
    
    requests_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    rate_limited_count = Column(Integer, default=0)
    threats_count = Column(Integer, default=0)
    
    last_event_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class NetworkProtectionRule(Base):
    """
    Network segmentation, eBPF, and ingress/egress filtering rules.
    """
    __tablename__ = "network_protection_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    source = Column(String(255), nullable=False)  # agent-pod, 10.0.0.0/16, external
    destination = Column(String(255), nullable=False)  # database-service, 172.16.0.4
    port = Column(Integer, nullable=True)
    protocol = Column(String(16), default="TCP")  # TCP, UDP, HTTP, DNS
    action = Column(String(32), nullable=False, default="ALLOW")  # ALLOW, BLOCK, LOG_AND_DROP
    
    enforcement_engine = Column(String(64), default="EBPF")  # EBPF, SURICATA, KUBERNETES_NETWORK_POLICY, CLOUD_SECURITY_GROUP
    is_enforced = Column(Boolean, default=True)
    blocked_packets = Column(Integer, default=0)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DnsProtectionAudit(Base):
    """
    DNS filtering, suspicious domain blocks, and tunneling detection.
    """
    __tablename__ = "dns_protection_audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    domain = Column(String(255), nullable=False, index=True)
    actor = Column(String(255), nullable=False)
    resolver_ip = Column(String(64), default="10.96.0.10")
    query_type = Column(String(16), default="A")
    
    decision = Column(String(32), nullable=False, default="ALLOW", index=True)  # ALLOW, BLOCK, SUSPICIOUS
    policy_matched = Column(String(255), nullable=True)
    tunneling_detected = Column(Boolean, default=False)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class ThreatSignalRecord(Base):
    """
    Active runtime threats and anomaly signals.
    Distinguishes: SIGNAL, SUSPECTED, DETECTED, VERIFIED.
    """
    __tablename__ = "threat_signal_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    threat_name = Column(String(255), nullable=False)
    threat_type = Column(String(64), nullable=False, index=True)  # CREDENTIAL_STUFFING, DATA_EXFILTRATION, PROMPT_INJECTION, TOOL_ABUSE, BOLA_ATTEMPT, SSRF_CALL, DNS_TUNNELING
    source = Column(String(255), nullable=False)
    target_resource = Column(String(255), nullable=False)
    actor = Column(String(255), nullable=False)
    
    detection_engine = Column(String(64), default="ML_ANOMALY")  # ML_ANOMALY, SURICATA, OPA_RULE, BEHAVIOR_BASELINE
    severity = Column(String(32), nullable=False, default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    verification_status = Column(String(32), nullable=False, default="DETECTED", index=True)  # SIGNAL, SUSPECTED, DETECTED, VERIFIED
    action_taken = Column(String(32), default="BLOCKED")  # BLOCKED, QUARANTINED, CHALLENGED, LOGGED
    status = Column(String(32), default="ACTIVE", index=True)  # ACTIVE, MITIGATED, INVESTIGATING, DISMISSED
    
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class ProtectionApprovalRequest(Base):
    """
    Human-in-the-loop and system approval queue for sensitive actions.
    """
    __tablename__ = "protection_approval_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("protection_policies.id"), nullable=True, index=True)

    requester = Column(String(255), nullable=False)
    requester_type = Column(String(64), default="AGENT")  # AGENT, SERVICE, USER
    action = Column(String(64), nullable=False)
    target_resource = Column(String(512), nullable=False)
    environment = Column(String(64), default="production")
    risk_level = Column(String(32), default="HIGH")
    
    justification = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, APPROVED, REJECTED, EXPIRED
    
    approver = Column(String(128), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class BreakGlassRecord(Base):
    """
    Emergency break-glass access session with automatic expiration and audit.
    """
    __tablename__ = "break_glass_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    scope = Column(String(255), nullable=False)  # All Production APIs, Database Direct Access
    justification = Column(Text, nullable=False)
    duration_minutes = Column(Integer, default=30)
    
    requester = Column(String(128), nullable=False)
    approver = Column(String(128), nullable=False)
    is_active = Column(Boolean, default=True)
    
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


class ControlEffectivenessItem(Base):
    """
    Proves that a security control is actually executing and effectively blocking unauthorized actions.
    """
    __tablename__ = "control_effectiveness_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    policy_name = Column(String(255), nullable=False)
    control_type = Column(String(64), nullable=False)  # MCP_GATEWAY, OPA_RULE, NETWORK_SEGMENTATION, RATE_LIMITER
    target_type = Column(String(64), nullable=False)  # DATABASE, API, AGENT_TOOL
    expected_behavior = Column(Text, nullable=False)
    
    observed_attempts = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    allowed_count = Column(Integer, default=0)
    verification_status = Column(String(32), default="PASS")  # PASS, FAIL, DEGRADED
    
    last_verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ProtectionEvidenceRecord(Base):
    """
    Cryptographic and redacted runtime event proof.
    """
    __tablename__ = "protection_evidence_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    decision_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    evidence_type = Column(String(64), nullable=False)  # POLICY_DECISION, RUNTIME_EVENT, MCP_REQUEST, DNS_INTERCEPT, SURICATA_ALERT, EBPF_SIGNAL
    source = Column(String(64), nullable=False)  # OPA_ENGINE, MCP_GATEWAY, SURICATA, EBPF_KERNEL, API_GATEWAY
    actor = Column(String(255), nullable=False)
    resource = Column(String(512), nullable=False)
    action = Column(String(64), nullable=False)
    
    policy_name = Column(String(255), nullable=True)
    decision = Column(String(32), nullable=False)
    raw_event_redacted = Column(Text, nullable=True)  # Redacted JSON/payload
    normalized_event = Column(JSON, default=dict)
    
    trace_id = Column(String(128), nullable=True)
    verification_method = Column(String(128), default="SHA256_HASH_CHAIN")
    is_redacted = Column(Boolean, default=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class ProtectionActivityItem(Base):
    """
    Unified chronological runtime protection event stream.
    """
    __tablename__ = "protection_activity_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    event_type = Column(String(64), nullable=False)  # REQUEST_BLOCKED, POLICY_PUBLISHED, SESSION_REVOKED, AGENT_QUARANTINED, TOOL_BLOCKED, APPROVAL_GRANTED, THREAT_DETECTED
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    actor = Column(String(255), nullable=True)
    resource = Column(String(512), nullable=True)
    decision = Column(String(32), nullable=True)
    severity = Column(String(32), nullable=True)  # CRITICAL, HIGH, MEDIUM, LOW
    
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
