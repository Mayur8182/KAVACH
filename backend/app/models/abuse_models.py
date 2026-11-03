"""
Step 26 Advanced Rate Limiting, Abuse Detection & Brute-Force Protection Models.

Implements all entities per Step 26 specifications:
- rate_limit_policies
- rate_limit_policy_versions
- rate_limit_decisions
- abuse_detection_rules
- abuse_detection_events
- abuse_detection_signals
- abuse_detection_cases
- temporary_blocks
- permanent_blocks
- security_challenges
- response_actions
- response_verifications

Enforces Non-Negotiable Rules:
- Rule 1: No fake rate limit / abuse events or metrics.
- Rule 2: No fake block (execution_status: REQUESTED, EXECUTING, APPLIED, FAILED, UNKNOWN).
- Rule 5: Policy is authoritative over AI suggestions.
- Rule 6: Real identity association across IP, User, Account, Session, Device, Agent, Tool, Workload.
- Rule 8: Multi-tenant and project isolation.
- Rule 11: UNKNOWN is a valid state.
- Rule 13: Every decision has traceable evidence.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    JSON,
    Integer,
    Boolean,
    Text,
    Float,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class RateLimitPolicy(Base):
    """Authoritative rate limiting policy supporting multiple algorithms and scoped conditions."""
    __tablename__ = "rate_limit_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    scope = Column(String(64), nullable=False, default="GLOBAL")  # GLOBAL, TENANT, PROJECT, ENVIRONMENT, ENDPOINT, USER, AGENT, TOOL, WORKLOAD
    priority = Column(Integer, nullable=False, default=100)
    algorithm = Column(String(64), nullable=False, default="TOKEN_BUCKET")  # TOKEN_BUCKET, LEAKY_BUCKET, FIXED_WINDOW, SLIDING_WINDOW, CONCURRENCY_LIMIT, ADAPTIVE
    limit_count = Column(Integer, nullable=False, default=100)
    window_seconds = Column(Integer, nullable=False, default=60)
    burst = Column(Integer, nullable=False, default=20)
    concurrency_limit = Column(Integer, nullable=True)
    fail_behavior = Column(String(32), nullable=False, default="FAIL_OPEN")  # FAIL_OPEN, FAIL_CLOSED
    conditions = Column(JSON, default=dict)  # Endpoint, HTTP method, client types, sensitivity, environment, etc.
    action = Column(String(32), nullable=False, default="THROTTLE")  # ALLOW, THROTTLE, DELAY, CHALLENGE, WARN, BLOCK, REQUIRE_MFA, REQUIRE_APPROVAL, REVOKE_SESSION
    enabled = Column(Boolean, nullable=False, default=True)
    dry_run = Column(Boolean, nullable=False, default=False)  # If true: WOULD_BLOCK / WOULD_THROTTLE
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    tenant_id = Column(String(128), nullable=True)
    created_by = Column(String(255), nullable=False, default="SYSTEM")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_rate_limit_policies_scope", "scope", "priority"),
        Index("idx_rate_limit_policies_tenant", "tenant_id", "enabled"),
    )


class RateLimitPolicyVersion(Base):
    """Audit log of historical versions of rate limit policies."""
    __tablename__ = "rate_limit_policy_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("rate_limit_policies.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)
    change_summary = Column(Text, nullable=True)
    changed_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_rl_version_policy_id", "policy_id", "version"),
    )


class RateLimitDecision(Base):
    """Immutable audit record of a rate limit evaluation and its enforcement outcome."""
    __tablename__ = "rate_limit_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("rate_limit_policies.id", ondelete="SET NULL"), nullable=True)
    policy_name = Column(String(255), nullable=True)
    identity_key = Column(String(512), nullable=False)  # E.g. ip:1.2.3.4, user:uuid, agent:uuid
    identity_type = Column(String(64), nullable=False)  # IP, USER, ACCOUNT, SESSION, AGENT, TOOL, WORKLOAD
    endpoint = Column(String(512), nullable=False)
    http_method = Column(String(16), nullable=False, default="POST")
    algorithm_used = Column(String(64), nullable=False)
    tokens_remaining = Column(Float, nullable=True)
    retry_after_seconds = Column(Integer, nullable=True)
    decision = Column(String(32), nullable=False)  # ALLOW, THROTTLE, CHALLENGE, BLOCK, WOULD_BLOCK, WOULD_THROTTLE
    execution_status = Column(String(32), nullable=False, default="APPLIED")  # REQUESTED, EXECUTING, APPLIED, FAILED, UNKNOWN
    dry_run = Column(Boolean, nullable=False, default=False)
    reason = Column(Text, nullable=True)
    evidence = Column(JSON, default=dict)
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_rl_decision_timestamp", "timestamp"),
        Index("idx_rl_decision_identity", "identity_key", "decision"),
        Index("idx_rl_decision_endpoint", "endpoint"),
    )


class AbuseDetectionRule(Base):
    """Configurable and deterministic detection rules for abuse and brute-force behaviors."""
    __tablename__ = "abuse_detection_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    rule_type = Column(String(64), nullable=False)  # BRUTE_FORCE, CREDENTIAL_STUFFING, PASSWORD_SPRAY, ENUMERATION, MFA_ABUSE, TOKEN_ABUSE, API_ABUSE, AGENT_ABUSE, LOW_AND_SLOW
    description = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    severity = Column(String(32), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    thresholds = Column(JSON, nullable=False, default=dict)  # e.g. {"max_failures": 10, "window_seconds": 300, "unique_accounts_min": 5}
    conditions = Column(JSON, default=dict)
    automated_action = Column(String(32), nullable=False, default="ALERT")  # ALERT, TEMPORARY_BLOCK, REQUIRE_MFA, REVOKE_SESSION, ESCALATE_SOC
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class AbuseDetectionEvent(Base):
    """Normalized security telemetry event for authentication, tokens, MFA, and API invocations."""
    __tablename__ = "abuse_detection_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(64), nullable=False)  # AUTHENTICATION, MFA, TOKEN, SESSION, API_CALL, AGENT_TOOL
    endpoint = Column(String(512), nullable=False)
    http_method = Column(String(16), nullable=False, default="POST")
    result_status = Column(String(64), nullable=False)  # SUCCESS, INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_NOT_FOUND, MFA_REQUIRED, MFA_FAILED, TOKEN_INVALID, TOKEN_EXPIRED, RATE_LIMITED, SERVER_ERROR
    ip_address = Column(String(128), nullable=False)
    user_id = Column(String(255), nullable=True)
    account_identifier = Column(String(255), nullable=True)
    session_id = Column(String(255), nullable=True)
    device_id = Column(String(255), nullable=True)
    user_agent = Column(String(512), nullable=True)
    agent_id = Column(String(255), nullable=True)
    tool_name = Column(String(255), nullable=True)
    workload_identity = Column(String(255), nullable=True)
    duration_ms = Column(Float, nullable=True)
    metadata_payload = Column(JSON, default=dict)
    raw_hash = Column(String(64), nullable=False)  # SHA-256 hash of raw event payload
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_abuse_event_timestamp", "timestamp"),
        Index("idx_abuse_event_ip", "ip_address", "timestamp"),
        Index("idx_abuse_event_account", "account_identifier", "timestamp"),
        Index("idx_abuse_event_agent", "agent_id", "timestamp"),
    )


class AbuseDetectionSignal(Base):
    """Deterministic security signal raised when an abuse pattern or threshold is violated."""
    __tablename__ = "abuse_detection_signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signal_type = Column(String(64), nullable=False)  # BRUTE_FORCE_SUSPECTED, CREDENTIAL_STUFFING_SUSPECTED, PASSWORD_SPRAY_SUSPECTED, ENUMERATION_SUSPECTED, MFA_ABUSE_SUSPECTED, TOKEN_ABUSE_SUSPECTED, AGENT_ABUSE_SUSPECTED, LOW_AND_SLOW_SUSPECTED, API_ABUSE_SUSPECTED
    severity = Column(String(32), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, MITIGATED, FALSE_POSITIVE, ESCALATED_SOC, ESCALATED_INCIDENT
    confidence_score = Column(Float, nullable=False, default=0.85)
    target_resource = Column(String(512), nullable=False)  # Endpoint, account, or tool name
    target_identity = Column(String(512), nullable=False)  # IP, User, Account, or Agent ID
    detection_rule_id = Column(UUID(as_uuid=True), ForeignKey("abuse_detection_rules.id", ondelete="SET NULL"), nullable=True)
    rule_name = Column(String(255), nullable=True)
    evidence = Column(JSON, nullable=False, default=dict)
    recommended_action = Column(String(64), nullable=True)
    action_taken = Column(String(64), nullable=True)
    escalation_reference = Column(String(255), nullable=True)  # ID of SOC alert or Incident
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_abuse_signal_target", "target_identity", "signal_type"),
        Index("idx_abuse_signal_status", "status", "detected_at"),
    )


class AbuseDetectionCase(Base):
    """Investigation case aggregating multiple signals, entities, and remediation actions."""
    __tablename__ = "abuse_detection_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number = Column(String(64), nullable=False, unique=True)
    title = Column(String(255), nullable=False)
    attack_pattern = Column(String(64), nullable=False)  # DISTRIBUTED_BRUTE_FORCE, CREDENTIAL_STUFFING, AGENT_RUNAWAY, API_SCRAPING, ACCOUNT_TAKEOVER
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, INVESTIGATING, MITIGATED, CLOSED, FALSE_POSITIVE
    severity = Column(String(32), nullable=False, default="HIGH")
    primary_entity = Column(String(512), nullable=False)
    impact_summary = Column(Text, nullable=True)
    evidence = Column(JSON, default=dict)
    signal_ids = Column(JSON, default=list)
    remediation_status = Column(String(32), nullable=False, default="PENDING")  # PENDING, EXECUTED, VERIFIED, FAILED
    soc_alert_id = Column(String(255), nullable=True)
    incident_id = Column(String(255), nullable=True)
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TemporaryBlock(Base):
    """Time-bounded block applied automatically or manually with an explicit expiration."""
    __tablename__ = "temporary_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    block_type = Column(String(32), nullable=False)  # IP, USER, ACCOUNT, AGENT, CIDR, SESSION
    target_value = Column(String(512), nullable=False)
    scope = Column(String(64), nullable=False, default="GLOBAL")  # GLOBAL, ENDPOINT, TENANT, PROJECT
    endpoint_scope = Column(String(512), nullable=True)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    policy_reference = Column(String(255), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(String(255), nullable=False, default="SYSTEM")
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_temp_block_target", "block_type", "target_value", "active"),
        Index("idx_temp_block_expires", "expires_at", "active"),
    )


class PermanentBlock(Base):
    """Permanent block requiring authorized administrative approval."""
    __tablename__ = "permanent_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    block_type = Column(String(32), nullable=False)  # IP, USER, ACCOUNT, AGENT, CIDR
    target_value = Column(String(512), nullable=False)
    scope = Column(String(64), nullable=False, default="GLOBAL")
    reason = Column(Text, nullable=False)
    authorized_by = Column(String(255), nullable=False)
    evidence = Column(JSON, default=dict)
    active = Column(Boolean, nullable=False, default=True)
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_perm_block_target", "block_type", "target_value", "active"),
    )


class SecurityChallenge(Base):
    """Challenge issued when suspicious activity triggers step-up authentication or verification."""
    __tablename__ = "security_challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_type = Column(String(32), nullable=False)  # MFA, CAPTCHA, STEP_UP_AUTH, APPROVAL_REQUIRED, EMAIL_CONFIRM
    target_identity = Column(String(512), nullable=False)
    endpoint = Column(String(512), nullable=False)
    status = Column(String(32), nullable=False, default="PENDING")  # PENDING, PASSED, FAILED, EXPIRED
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    context_data = Column(JSON, default=dict)
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_security_challenge_status", "target_identity", "status"),
    )


class ResponseAction(Base):
    """Record of an automated or manual enforcement action executed against an identity or resource."""
    __tablename__ = "response_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_type = Column(String(64), nullable=False)  # THROTTLE, BLOCK, CHALLENGE, REVOKE_SESSION, REVOKE_TOKEN, DISABLE_API_KEY, RESTRICT_AGENT_TOOL
    target_entity = Column(String(512), nullable=False)
    execution_status = Column(String(32), nullable=False, default="REQUESTED")  # REQUESTED, EXECUTING, APPLIED, FAILED, UNKNOWN
    parameters = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    initiated_by = Column(String(255), nullable=False, default="POLICY_ENGINE")
    tenant_id = Column(String(128), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    executed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ResponseVerification(Base):
    """Runtime verification of whether an executed response successfully mitigated the target abuse."""
    __tablename__ = "response_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_id = Column(UUID(as_uuid=True), ForeignKey("response_actions.id", ondelete="CASCADE"), nullable=False)
    target_entity = Column(String(512), nullable=False)
    verification_status = Column(String(32), nullable=False)  # VERIFIED, VIOLATED, UNKNOWN, IN_PROGRESS
    expected_outcome = Column(Text, nullable=False)
    observed_outcome = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
