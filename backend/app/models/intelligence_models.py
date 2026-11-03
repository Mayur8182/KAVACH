"""
Step 20 Continuous Security Intelligence & Adaptive Control Models.

Tables:
- security_drift_events
- security_control_freshness
- security_verification_triggers
- security_verification_jobs
- security_behavior_baselines
- security_behavior_events
- security_change_correlations
- security_correlation_members
- security_control_effectiveness
- security_policy_recommendations
- security_contract_recommendations
- security_requirement_recommendations
- security_intelligence_events

Rules & Invariants:
- Rule 54: No static security states (VERIFIED, VIOLATED, UNKNOWN, STALE, NOT_APPLICABLE, NOT_VERIFIED)
- Rule 55: No security score numbers (factual dimensions only)
- Rule 56: Drift is not automatically a vulnerability
- Rule 57: No fake baselines (real historical evidence required)
- Rule 58: No blind adaptation (detect -> verify -> impact -> policy -> authorization -> approval -> response)
- Rule 60: Real time-series data only
- Rule 61: No 'anomaly = attack' (NORMAL, ANOMALOUS, SUSPICIOUS, VERIFIED_SECURITY_EVENT, UNKNOWN)
- Rule 62: Explain every drift
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
    Float,
    Boolean,
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class SecurityDriftEvent(Base):
    __tablename__ = "security_drift_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    drift_type = Column(String, nullable=False, index=True)
    # CODE_DRIFT, CONFIGURATION_DRIFT, INFRASTRUCTURE_DRIFT, CLOUD_DRIFT, KUBERNETES_DRIFT,
    # IDENTITY_DRIFT, AUTHORITY_DRIFT, DELEGATION_DRIFT, DATA_FLOW_DRIFT, NETWORK_DRIFT,
    # CONTAINER_DRIFT, DEPLOYMENT_DRIFT, POLICY_DRIFT, CONTRACT_DRIFT, RUNTIME_BEHAVIOR_DRIFT,
    # DEPENDENCY_DRIFT, SECURITY_CONTROL_DRIFT

    resource_type = Column(String, nullable=False, index=True)
    resource_id = Column(String, nullable=False, index=True)
    source_event_id = Column(String, nullable=True)
    previous_state = Column(JSON, nullable=False)
    current_state = Column(JSON, nullable=False)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    environment = Column(String, nullable=False, default="PRODUCTION", index=True)
    severity_context = Column(String, nullable=False, default="MEDIUM", index=True)
    status = Column(String, nullable=False, default="DETECTED", index=True)
    # DETECTED, CLASSIFIED, CORRELATED, IMPACT_ANALYZED, VERIFICATION_REQUIRED, VERIFYING,
    # VERIFIED, VIOLATED, UNKNOWN, NOT_SECURITY_RELEVANT, DISMISSED

    dismissed_by = Column(String, nullable=True)
    dismissed_reason = Column(Text, nullable=True)
    evidence_id = Column(String, nullable=True, index=True)
    graph_version = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityControlFreshness(Base):
    __tablename__ = "security_control_freshness"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    requirement_id = Column(String, nullable=False, index=True)
    contract_id = Column(String, nullable=True, index=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    evidence_window_seconds = Column(Integer, default=86400)
    freshness_policy = Column(String, default="MAX_AGE_24H")
    status = Column(String, nullable=False, default="FRESH", index=True)
    # FRESH, STALE, EXPIRED, UNKNOWN
    stale_reason = Column(Text, nullable=True)
    affected_resource_id = Column(String, nullable=True, index=True)
    last_evidence_id = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityVerificationTrigger(Base):
    __tablename__ = "security_verification_triggers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    trigger_type = Column(String, nullable=False, index=True)
    # ON_DEPLOYMENT, ON_CODE_CHANGE, ON_IAM_CHANGE, ON_NETWORK_CHANGE, ON_DATA_FLOW_CHANGE,
    # ON_DELEGATION_CHANGE, ON_CLOUD_CONFIGURATION_CHANGE, ON_RUNTIME_VIOLATION, ON_CONTRACT_CHANGE,
    # ON_POLICY_CHANGE, ON_EVIDENCE_EXPIRATION, ON_SCHEDULE, MANUAL
    trigger_source_id = Column(String, nullable=True)
    contract_id = Column(String, nullable=True)
    requirement_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    configuration = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityVerificationJob(Base):
    __tablename__ = "security_verification_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    trigger_type = Column(String, nullable=False, index=True)
    trigger_id = Column(String, nullable=True)
    contract_id = Column(String, nullable=True, index=True)
    requirement_id = Column(String, nullable=True, index=True)
    target_type = Column(String, nullable=True)
    target_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="QUEUED", index=True)
    # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED, EXPIRED
    deduplication_key = Column(String, nullable=True, index=True)
    result = Column(String, nullable=True)  # VERIFIED, VIOLATED, UNKNOWN
    evidence_ids = Column(JSON, default=list)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class SecurityBehaviorBaseline(Base):
    __tablename__ = "security_behavior_baselines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    subject_type = Column(String, nullable=False, index=True)  # AGENT, MCP_TOOL, USER, SERVICE, DEPLOYMENT
    subject_id = Column(String, nullable=False, index=True)
    metric = Column(String, nullable=False, index=True)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    sample_count = Column(Integer, nullable=False)
    calculation_method = Column(String, nullable=False)  # MEDIAN_PERCENTILE, MOVING_AVERAGE, FREQUENCY_DISTRIBUTION
    baseline_value = Column(JSON, nullable=False)
    variance = Column(JSON, nullable=True)
    confidence = Column(Float, default=1.0)
    source = Column(String, default="OPENTELEMETRY_EVENTS")
    eligibility_status = Column(String, default="ELIGIBLE_FOR_BASELINE", index=True)
    # ELIGIBLE_FOR_BASELINE, EXCLUDED_FROM_BASELINE, PENDING_REVIEW
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityBehaviorEvent(Base):
    __tablename__ = "security_behavior_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    subject_type = Column(String, nullable=False, index=True)
    subject_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    observed_value = Column(JSON, nullable=False)
    baseline_reference = Column(String, nullable=True)
    deviation_context = Column(JSON, nullable=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    evidence_id = Column(String, nullable=True)
    status = Column(String, nullable=False, default="NORMAL", index=True)
    # NORMAL, ANOMALOUS, SUSPICIOUS, VERIFIED_SECURITY_EVENT, UNKNOWN
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityChangeCorrelation(Base):
    __tablename__ = "security_change_correlations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    correlation_key = Column(String, nullable=False, index=True)
    causality_status = Column(String, nullable=False, default="TEMPORALLY_ASSOCIATED")
    # TEMPORALLY_ASSOCIATED, POTENTIALLY_RELATED, CAUSALITY_VERIFIED, UNKNOWN
    timeline = Column(JSON, default=list)  # Ordered sequence of timestamped events
    first_event_at = Column(DateTime(timezone=True), nullable=False)
    last_event_at = Column(DateTime(timezone=True), nullable=False)
    event_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityCorrelationMember(Base):
    __tablename__ = "security_correlation_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    correlation_id = Column(UUID(as_uuid=True), ForeignKey("security_change_correlations.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    metadata_ = Column("metadata", JSON, default=dict)


class SecurityControlEffectiveness(Base):
    __tablename__ = "security_control_effectiveness"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    control_id = Column(String, nullable=False, index=True)
    verification_count = Column(Integer, default=0)
    verified_count = Column(Integer, default=0)
    violated_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    stale_count = Column(Integer, default=0)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_violated_at = Column(DateTime(timezone=True), nullable=True)
    failure_patterns = Column(JSON, default=list)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityPolicyRecommendation(Base):
    __tablename__ = "security_policy_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_event_id = Column(String, nullable=True)
    current_policy_version = Column(String, nullable=True)
    proposed_policy = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="PROPOSED", index=True)
    # PROPOSED, ACCEPTED, REJECTED, EXPIRED, SUPERSEDED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String, nullable=True)


class SecurityContractRecommendation(Base):
    __tablename__ = "security_contract_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_event_id = Column(String, nullable=True)
    proposed_contract = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="PROPOSED", index=True)
    # PROPOSED, ACCEPTED, REJECTED, EXPIRED, SUPERSEDED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String, nullable=True)


class SecurityRequirementRecommendation(Base):
    __tablename__ = "security_requirement_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_event_id = Column(String, nullable=True)
    proposed_requirement = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="PROPOSED", index=True)
    # PROPOSED, ACCEPTED, REJECTED, EXPIRED, SUPERSEDED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String, nullable=True)


class SecurityIntelligenceEvent(Base):
    __tablename__ = "security_intelligence_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    # DRIFT_DETECTED, BEHAVIOR_ANOMALY, CONTROL_STALE, CONTROL_VIOLATED, EVIDENCE_EXPIRED,
    # AUTHORITY_CHANGED, DATA_FLOW_CHANGED, NETWORK_CHANGED, DEPLOYMENT_CHANGED,
    # CONTRACT_IMPACTED, VERIFICATION_REQUIRED, VERIFICATION_COMPLETED, RECOMMENDATION_CREATED
    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    subject_type = Column(String, nullable=True)
    subject_id = Column(String, nullable=True)
    severity_context = Column(String, nullable=False, default="INFO", index=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    correlation_id = Column(String, nullable=True, index=True)
    graph_version = Column(Integer, nullable=True)
    evidence_id = Column(String, nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
