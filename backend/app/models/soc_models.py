"""
Step 23 Security Operations Center (SOC) & Operations Platform Models.

Implements all canonical event ingestion, normalization, deterministic detection rules,
alert deduplication and correlation, case management, watchlists, analyst notes,
and authorized response coordination.

Rules:
- Rule 1: No fake security events
- Rule 2: No fake alerts
- Rule 3: No automatic attack claims (UNKNOWN / REQUIRES_INVESTIGATION)
- Rule 4: LLM is never the security authority
- Rule 5: Forensic evidence required
- Rule 7: Real database persistence in PostgreSQL
- Rule 10: Preserve raw events verbatim
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
from sqlalchemy.orm import synonym
from app.models.base import Base


class EventSource(Base):
    """Registered telemetry and event ingestion sources."""
    __tablename__ = "event_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False, index=True)  # GITHUB, AWS_CLOUDTRAIL, KUBERNETES_AUDIT, RUNTIME_OTEL, MCP_GATEWAY, SCANNER, AGENT_GATEWAY, DOCKER, CI_CD
    status = Column(String, nullable=False, default="ACTIVE")  # ACTIVE, INACTIVE, DEGRADED, ERROR
    adapter_version = Column(String, nullable=False, default="1.0.0")
    configuration = Column(JSON, default=dict)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    last_event_at = Column(DateTime(timezone=True), nullable=True)
    events_received_count = Column(Integer, default=0, nullable=False)
    events_failed_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityEvent(Base):
    """Canonical normalized security event preserving raw reference."""
    __tablename__ = "security_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(String, nullable=False, unique=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("event_sources.id"), nullable=True, index=True)
    source_type = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, TOOL_EXECUTION, DEPLOYMENT, CONFIG_CHANGE, POLICY_EVALUATION, SCAN_FINDING, CONTRACT_VIOLATION, ANOMALY
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)  # Original occurrence time
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    actor = Column(JSON, nullable=False, default=dict)  # {id, type, role, principal, ip_address, user_agent}
    resource = Column(JSON, nullable=False, default=dict)  # {id, type, name, arn_or_path, data_classification, environment}
    action = Column(String, nullable=False, index=True)
    result = Column(String, nullable=False, index=True)  # SUCCESS, DENIED, FAILED, ERROR, BLOCKED, VIOLATION
    severity = Column(String, nullable=False, default="INFO")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    environment = Column(String, nullable=False, default="PRODUCTION")  # PRODUCTION, STAGING, DEVELOPMENT
    correlation_id = Column(String, nullable=True, index=True)
    trace_id = Column(String, nullable=True, index=True)
    request_id = Column(String, nullable=True, index=True)
    raw_event_reference = Column(String, nullable=True)  # Cryptographic hash or identifier of raw payload
    raw_payload = Column(JSON, nullable=False, default=dict)  # Preserved verbatim per Rule 10
    attributes = Column(JSON, default=dict)
    ingestion_status = Column(String, nullable=False, default="NORMALIZED")  # NORMALIZED, CORRELATED, ANALYZED, FAILED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_security_events_project_time", "project_id", "timestamp"),
        Index("ix_security_events_type_res", "event_type", "result"),
    )


class EventEnrichment(Base):
    """Contextual enrichment linking events to Thing entities."""
    __tablename__ = "event_enrichments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("security_events.id"), nullable=False, index=True)
    enrichment_type = Column(String, nullable=False)  # AGENT_IDENTITY, SECURITY_CONTRACT, POLICY_BINDING, CLOUD_ASSET, DATA_CLASSIFICATION
    enrichment_data = Column(JSON, nullable=False, default=dict)
    enriched_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    version = Column(String, nullable=False, default="1.0.0")


class DetectionRule(Base):
    """Versioned deterministic detection rules evaluated over canonical events."""
    __tablename__ = "detection_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(String, nullable=False, unique=True, index=True)  # e.g., DET-AGENT-001
    rule_key = synonym("rule_id")
    name = Column(String, nullable=False)
    version = Column(String, nullable=False, default="1.0.0")
    description = Column(Text, nullable=False)
    lifecycle_status = Column(String, nullable=False, default="ACTIVE")  # DRAFT, VALID, ACTIVE, DISABLED, RETIRED
    event_types = Column(JSON, nullable=False, default=list)  # Target event types
    conditions = Column(JSON, nullable=False, default=dict)  # Structured AST conditions
    severity = Column(String, nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence = Column(String, nullable=False, default="HIGH")  # HIGH, MEDIUM, LOW, UNKNOWN
    scope = Column(JSON, default=dict)  # Targeted environments or projects
    created_by = Column(String, nullable=False, default="SYSTEM")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DetectionExecution(Base):
    """Audit log of detection rule evaluations."""
    __tablename__ = "detection_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("detection_rules.id"), nullable=False, index=True)
    executed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    events_evaluated_count = Column(Integer, default=0, nullable=False)
    matches_found_count = Column(Integer, default=0, nullable=False)
    execution_duration_ms = Column(Integer, default=0, nullable=False)
    status = Column(String, nullable=False, default="SUCCESS")  # SUCCESS, DEGRADED, FAILED
    error_message = Column(Text, nullable=True)


class SocAlert(Base):
    """Operational security alert deduplicated and correlated."""
    __tablename__ = "soc_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_key = Column(String, nullable=False, unique=True, index=True)  # ALT-YYYYMM-XXXX
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    detection_rule_id = Column(UUID(as_uuid=True), ForeignKey("detection_rules.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence = Column(String, nullable=False, default="HIGH")  # HIGH, MEDIUM, LOW, UNKNOWN
    status = Column(String, nullable=False, default="NEW")  # NEW, OPEN, ACKNOWLEDGED, INVESTIGATING, ESCALATED, RESOLVED, FALSE_POSITIVE, DUPLICATE, CLOSED
    deduplication_key = Column(String, nullable=False, index=True)
    event_count = Column(Integer, default=1, nullable=False)
    source = Column(String, nullable=False)
    first_seen_at = Column(DateTime(timezone=True), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String, nullable=True)
    assignee_id = Column(String, nullable=True)
    assignee_type = Column(String, nullable=False, default="ANALYST")
    case_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    incident_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    risk_assessment = Column(JSON, default=dict)  # Calculated risk factors
    triage_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_soc_alerts_proj_stat_sev", "project_id", "status", "severity"),
    )


class AlertEvent(Base):
    """Supporting security events for an alert."""
    __tablename__ = "alert_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("soc_alerts.id"), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("security_events.id"), nullable=False, index=True)
    association_type = Column(String, nullable=False, default="TRIGGER")  # TRIGGER, SUPPORTING, CORRELATED
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AlertCorrelation(Base):
    """Explicit correlation links between security alerts."""
    __tablename__ = "alert_correlations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    primary_alert_id = Column(UUID(as_uuid=True), ForeignKey("soc_alerts.id"), nullable=False, index=True)
    correlated_alert_id = Column(UUID(as_uuid=True), ForeignKey("soc_alerts.id"), nullable=False, index=True)
    relationship = Column(String, nullable=False, default="CORRELATED")  # CORRELATED, POTENTIALLY_CORRELATED, UNRELATED, UNKNOWN
    correlation_rule = Column(String, nullable=False)
    correlation_score = Column(Float, nullable=True)
    evidence_summary = Column(Text, nullable=False)
    correlated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SocCase(Base):
    """Operational investigation case aggregating alerts, events, and evidence."""
    __tablename__ = "soc_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_key = Column(String, nullable=False, unique=True, index=True)  # CASE-YYYYMM-XXXX
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String, nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String, nullable=False, default="OPEN")  # OPEN, TRIAGE, INVESTIGATING, ESCALATED, RESOLVED, CLOSED
    owner_id = Column(String, nullable=True)
    incident_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    timeline = Column(JSON, default=list)  # Chronological developments
    resolution_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CaseEvent(Base):
    """Event associations for an active case."""
    __tablename__ = "case_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("soc_cases.id"), nullable=False, index=True)
    event_id = Column(UUID(as_uuid=True), ForeignKey("security_events.id"), nullable=False, index=True)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CaseEvidence(Base):
    """Immutable forensic evidence attachments for a case."""
    __tablename__ = "case_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("soc_cases.id"), nullable=False, index=True)
    evidence_id = Column(String, nullable=False, index=True)
    evidence_role = Column(String, nullable=False, default="PRIMARY")  # PRIMARY, CORROBORATING, CONTRADICTING
    added_by = Column(String, nullable=False)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SocWatchlist(Base):
    """Targeted watchlists for high-risk or privileged entities."""
    __tablename__ = "soc_watchlists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    watchlist_type = Column(String, nullable=False)  # AGENTS, USERS, IPS, CLOUD_RESOURCES, REPOSITORIES, MCP_SERVERS, WORKLOADS
    created_by = Column(String, nullable=False, default="SYSTEM")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class WatchlistEntity(Base):
    """Monitored entity within a watchlist."""
    __tablename__ = "watchlist_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watchlist_id = Column(UUID(as_uuid=True), ForeignKey("soc_watchlists.id"), nullable=False, index=True)
    entity_type = Column(String, nullable=False)  # AGENT, USER, IP, CLOUD_RESOURCE, REPOSITORY, MCP_SERVER, WORKLOAD
    entity_identifier = Column(String, nullable=False, index=True)
    entity_name = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    added_by = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class InvestigationNote(Base):
    """Immutable, auditable analyst notes on cases or alerts."""
    __tablename__ = "investigation_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String, nullable=False)  # CASE, ALERT
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    author_id = Column(String, nullable=False)
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    evidence_references = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SocAction(Base):
    """Authorized containment or response action coordinated by SOC."""
    __tablename__ = "soc_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    alert_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    action_type = Column(String, nullable=False)  # BLOCK_MCP_TOOL, REVOKE_SESSION, REVOKE_DELEGATION, ISOLATE_WORKLOAD, QUARANTINE_ARTIFACT, DISABLE_INTEGRATION, PAUSE_PIPELINE, RESTRICT_DATA_FLOW
    target_resource = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    policy_decision_id = Column(String, nullable=True)
    approval_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="PENDING")  # PENDING, APPROVED, EXECUTED, REJECTED, FAILED
    requested_by = Column(String, nullable=False)
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime(timezone=True), nullable=True)


class SocActionResult(Base):
    """Post-action execution evidence and reverification."""
    __tablename__ = "soc_action_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_id = Column(UUID(as_uuid=True), ForeignKey("soc_actions.id"), nullable=False, index=True)
    execution_status = Column(String, nullable=False)  # SUCCESS, FAILED, PARTIAL
    post_action_evidence_id = Column(String, nullable=True)
    reverification_status = Column(String, nullable=False, default="UNKNOWN")  # VERIFIED, VIOLATED, UNKNOWN, INSUFFICIENT_EVIDENCE
    details = Column(JSON, default=dict)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
