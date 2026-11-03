import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    CHAR,
    VARCHAR,
    TypeDecorator,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


def now_utc():
    return datetime.now(timezone.utc)


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.
    Uses PostgreSQL's UUID type, otherwise uses VARCHAR(36), storing as stringified UUID.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(VARCHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(str(value)))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                try:
                    return uuid.UUID(str(value))
                except Exception:
                    return value
            return value


# =============================================================================
# Core Integration Entity
# =============================================================================
class RealIntegration(Base):
    """
    Canonical Integration entity tracking connected developer tools, SCM providers,
    CI/CD runners, and alerting webhooks.
    """
    __tablename__ = "real_integrations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), nullable=False, index=True)
    workspace_id = Column(GUID(), nullable=True, index=True)

    # Provider: 'github', 'gitlab', 'bitbucket', 'jenkins', 'webhook', 'api'
    provider = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # Status: 'connected', 'connecting', 'error', 'disconnected', 'revoked'
    status = Column(String(50), nullable=False, default="disconnected")

    # External Provider Identity
    external_account_id = Column(String(255), nullable=True)
    external_account_name = Column(String(255), nullable=True)  # e.g., 'mayur.bharvad'
    organization_name = Column(String(255), nullable=True)    # e.g., 'CVMU'
    instance_url = Column(String(500), nullable=True)         # for self-hosted GitLab / Jenkins

    # Encrypted Credentials (at rest with AES/Fernet)
    access_token_encrypted = Column(Text, nullable=True)
    refresh_token_encrypted = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Authorized Scopes & Configuration Metadata
    scopes = Column(JSON, default=list)  # list of strings: ["repo", "read:user", etc.]
    integration_metadata = Column(JSON, default=dict)

    # Health & Sync Telemetry
    last_connected_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String(50), nullable=True)  # 'SUCCESS', 'FAILED', 'IN_PROGRESS'
    last_error = Column(Text, nullable=True)

    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    repositories = relationship("RealIntegrationRepository", back_populates="integration", cascade="all, delete-orphan")
    projects = relationship("RealIntegrationProject", back_populates="integration", cascade="all, delete-orphan")
    sync_jobs = relationship("RealIntegrationSyncJob", back_populates="integration", cascade="all, delete-orphan")
    events = relationship("RealIntegrationEvent", back_populates="integration", cascade="all, delete-orphan")
    cicd_config = relationship("RealCiCdConfig", back_populates="integration", uselist=False, cascade="all, delete-orphan")


# =============================================================================
# Synced Repositories (GitHub, Bitbucket)
# =============================================================================
class RealIntegrationRepository(Base):
    """Real synchronized repositories discovered from connected SCM integration."""
    __tablename__ = "real_integration_repositories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    integration_id = Column(GUID(), ForeignKey("real_integrations.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(GUID(), nullable=True, index=True)  # link to platform projects if imported
    external_repository_id = Column(String(255), nullable=False)

    name = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    default_branch = Column(String(100), default="main")

    private = Column(Boolean, default=True)
    permissions = Column(JSON, default=dict)  # {"admin": True, "push": True, "pull": True}
    is_selected = Column(Boolean, default=True)

    last_scan_at = Column(DateTime(timezone=True), nullable=True)
    last_scan_status = Column(String(50), default="Not Scanned")  # "Scanned", "Not Scanned", "Scanning"

    last_synced_at = Column(DateTime(timezone=True), default=now_utc)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    integration = relationship("RealIntegration", back_populates="repositories")


# =============================================================================
# Synced Projects (GitLab)
# =============================================================================
class RealIntegrationProject(Base):
    """Real synchronized projects/groups discovered from GitLab integration."""
    __tablename__ = "real_integration_projects"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    integration_id = Column(GUID(), ForeignKey("real_integrations.id", ondelete="CASCADE"), nullable=False, index=True)
    external_project_id = Column(String(255), nullable=False)

    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    project_type = Column(String(50), default="Project")  # "Group", "Project"
    visibility = Column(String(50), default="Private")    # "Public", "Internal", "Private"

    is_selected = Column(Boolean, default=True)
    last_scan_at = Column(DateTime(timezone=True), nullable=True)
    last_scan_status = Column(String(50), default="Not Scanned")

    last_synced_at = Column(DateTime(timezone=True), default=now_utc)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    integration = relationship("RealIntegration", back_populates="projects")


# =============================================================================
# Integration Event Log
# =============================================================================
class RealIntegrationEvent(Base):
    """Tracks webhook/API events emitted from or delivered to external provider."""
    __tablename__ = "real_integration_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    integration_id = Column(GUID(), ForeignKey("real_integrations.id", ondelete="CASCADE"), nullable=False, index=True)

    event_type = Column(String(100), nullable=False)  # 'push', 'pull_request', 'scan_completed'
    payload_reference = Column(String(255), nullable=True)
    status = Column(String(50), default="RECEIVED")   # 'RECEIVED', 'PROCESSED', 'FAILED'

    received_at = Column(DateTime(timezone=True), default=now_utc)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(Text, nullable=True)

    integration = relationship("RealIntegration", back_populates="events")


# =============================================================================
# Background Synchronization Jobs
# =============================================================================
class RealIntegrationSyncJob(Base):
    """Tracks asynchronous repository and project sync jobs."""
    __tablename__ = "real_integration_sync_jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    integration_id = Column(GUID(), ForeignKey("real_integrations.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(String(50), default="queued")  # 'queued', 'running', 'completed', 'failed'
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    items_found = Column(Integer, default=0)
    items_created = Column(Integer, default=0)
    items_updated = Column(Integer, default=0)
    error = Column(Text, nullable=True)

    integration = relationship("RealIntegration", back_populates="sync_jobs")


# =============================================================================
# Webhook Endpoints & Deliveries
# =============================================================================
class RealWebhookEndpoint(Base):
    """User-configured outbound webhook endpoints receiving real-time security events."""
    __tablename__ = "real_webhook_endpoints"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), nullable=False, index=True)
    workspace_id = Column(GUID(), nullable=True, index=True)
    integration_id = Column(GUID(), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    secret_encrypted = Column(Text, nullable=True)  # encrypted HMAC signing secret

    events = Column(JSON, default=list)  # ['scan_started', 'scan_completed', 'scan_failed', 'finding_resolved', etc.]
    status = Column(String(50), default="active")  # 'active', 'inactive'

    created_at = Column(DateTime(timezone=True), default=now_utc)
    last_delivery_at = Column(DateTime(timezone=True), nullable=True)

    deliveries = relationship("RealWebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")


class RealWebhookDelivery(Base):
    """Immutable audit records of actual HTTP deliveries sent to a webhook endpoint."""
    __tablename__ = "real_webhook_deliveries"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(GUID(), ForeignKey("real_webhook_endpoints.id", ondelete="CASCADE"), nullable=False, index=True)

    event_type = Column(String(100), nullable=False)
    status_code = Column(Integer, nullable=True)
    latency_ms = Column(Integer, default=0)
    request_payload = Column(Text, nullable=True)
    response_body = Column(Text, nullable=True)
    success = Column(Boolean, default=False)
    attempt_count = Column(Integer, default=1)
    error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=now_utc)

    webhook = relationship("RealWebhookEndpoint", back_populates="deliveries")


# =============================================================================
# API Keys (Public REST API Access)
# =============================================================================
class RealApiKey(Base):
    """Cryptographically generated and securely hashed platform API keys."""
    __tablename__ = "real_api_keys"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), nullable=False, index=True)
    workspace_id = Column(GUID(), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True, index=True)  # SHA-256 hash
    key_prefix = Column(String(50), nullable=False)                         # 'sk_live_1234...abcd'

    scopes = Column(JSON, default=list)  # ['read', 'write', 'scans:read', 'scans:write', etc.]
    status = Column(String(50), default="active")  # 'active', 'revoked', 'expired'

    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# =============================================================================
# CI/CD & Pipeline Scan Configuration (Jenkins, GitHub Actions, GitLab CI)
# =============================================================================
class RealCiCdConfig(Base):
    """Execution parameters and quality gate thresholds for automated pipeline scans."""
    __tablename__ = "real_cicd_configs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    integration_id = Column(GUID(), ForeignKey("real_integrations.id", ondelete="CASCADE"), nullable=False, unique=True)
    provider = Column(String(50), default="jenkins")

    # Jenkins Connection Parameters
    jenkins_url = Column(String(500), nullable=True)
    jenkins_username = Column(String(255), nullable=True)
    jenkins_token_encrypted = Column(Text, nullable=True)

    # Scan & Gate Policies
    scan_on_push = Column(Boolean, default=True)
    scan_on_pr = Column(Boolean, default=True)
    fail_on_critical = Column(Boolean, default=True)
    fail_on_high = Column(Boolean, default=False)
    generate_report = Column(Boolean, default=True)
    comment_on_pr = Column(Boolean, default=True)
    scan_changed_only = Column(Boolean, default=False)

    quality_gate_name = Column(String(100), default="Default Gate")
    severity_threshold = Column(String(50), default="High and above")
    quality_score_threshold = Column(Integer, default=80)

    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    integration = relationship("RealIntegration", back_populates="cicd_config")


# =============================================================================
# Event-Driven Automation Rules (WHEN event AND condition THEN action)
# =============================================================================
class IntegrationAutomationRule(Base):
    """
    Configurable event automation rule:
    WHEN a trigger occurs (push, pull_request, scan_completed, finding_new)
    AND conditions match (branch == main, severity >= HIGH, repo in selected)
    THEN execute actions (trigger_scan, notify_slack, create_jira_issue, emit_webhook)
    """
    __tablename__ = "integration_automation_rules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), nullable=False, index=True)
    integration_id = Column(GUID(), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True)

    event_trigger = Column(String(100), nullable=False, index=True)
    conditions = Column(JSON, default=dict)
    actions = Column(JSON, default=list)

    execution_count = Column(Integer, default=0)
    last_executed_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(50), nullable=True)

    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    executions = relationship("IntegrationRuleExecution", back_populates="rule", cascade="all, delete-orphan")


class IntegrationRuleExecution(Base):
    """Execution audit trail for automation rules."""
    __tablename__ = "integration_rule_executions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    rule_id = Column(GUID(), ForeignKey("integration_automation_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(GUID(), nullable=False, index=True)

    event_id = Column(String(255), nullable=True)
    event_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # 'SUCCESS', 'FAILED', 'SKIPPED'

    trigger_payload = Column(JSON, default=dict)
    actions_executed = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    error = Column(Text, nullable=True)

    executed_at = Column(DateTime(timezone=True), default=now_utc)

    rule = relationship("IntegrationAutomationRule", back_populates="executions")


# =============================================================================
# Webhook Dead-Letter Queue (DLQ)
# =============================================================================
class WebhookDeadLetter(Base):
    """Dead-letter queue for permanently failed or unroutable webhook events."""
    __tablename__ = "webhook_dead_letters"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    delivery_id = Column(String(255), nullable=True, index=True)
    provider = Column(String(50), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)

    payload = Column(Text, nullable=True)
    headers = Column(JSON, default=dict)
    reason = Column(Text, nullable=False)
    retry_count = Column(Integer, default=0)
    status = Column(String(50), default="DEAD")

    received_at = Column(DateTime(timezone=True), default=now_utc)
    last_attempt_at = Column(DateTime(timezone=True), default=now_utc)

