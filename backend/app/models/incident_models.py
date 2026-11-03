"""
Step 21 Database Models: Security Incident Management, Investigation & Forensic Evidence.

Tables:
- security_incidents
- security_incident_events (Step 14 compatibility)
- security_incident_signals
- security_incident_timeline
- security_incident_evidence
- security_investigation_cases
- investigation_questions
- investigation_hypotheses_v2
- incident_root_causes
- evidence_chain_events
- incident_containment_records
- incident_recovery_records
- incident_postmortems
- incident_relationships
- incident_assignments
- incident_exports
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_key = Column(String(100), nullable=False, unique=True, index=True)  # e.g. INC-2026-0001
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Section 15: Incident Types
    incident_type = Column(String(100), nullable=False, index=True, default="CONTRACT_VIOLATION")
    
    # Rule 66: Strictly NO numerical score. Classifications only: INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL, UNKNOWN
    severity = Column(String(50), nullable=False, index=True, default="HIGH")
    
    # Section 13: Lifecycle status: DETECTED, TRIAGE, INVESTIGATING, CONTAINMENT_REQUIRED, CONTAINMENT_IN_PROGRESS, CONTAINED, ROOT_CAUSE_ANALYSIS, REMEDIATION, RECOVERY, VERIFICATION, CLOSED, FALSE_POSITIVE, DUPLICATE, CANCELLED, REOPENED
    status = Column(String(50), nullable=False, index=True, default="DETECTED")
    environment = Column(String(50), nullable=False, default="PRODUCTION")
    
    detected_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    first_observed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_observed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Step 14 backwards-compatibility timestamps & violation ID
    first_detected_at = Column(DateTime(timezone=True), nullable=True)
    last_detected_at = Column(DateTime(timezone=True), nullable=True)
    primary_violation_id = Column(UUID(as_uuid=True), ForeignKey("security_contract_violations.id", ondelete="SET NULL"), nullable=True)
    
    reported_by_type = Column(String(100), nullable=False, default="SYSTEM")
    reported_by_id = Column(String(255), nullable=False, default="CONTROL_PLANE")
    
    primary_resource_type = Column(String(100), nullable=False, default="WORKLOAD")
    primary_resource_id = Column(String(255), nullable=False, default="UNKNOWN")
    
    root_cause_status = Column(String(50), nullable=False, default="UNKNOWN")  # UNKNOWN, HYPOTHESIS, SUPPORTED, VERIFIED, REFUTED
    containment_status = Column(String(50), nullable=False, default="NOT_REQUIRED")  # NOT_REQUIRED, PROPOSED, PENDING_APPROVAL, AUTHORIZED, EXECUTING, COMPLETED, FAILED
    recovery_status = Column(String(50), nullable=False, default="NOT_REQUIRED")  # NOT_REQUIRED, PENDING, IN_PROGRESS, VERIFIED, FAILED
    
    closure_reason = Column(String(255), nullable=True)
    closed_with_limitations = Column(Boolean, default=False)
    outstanding_uncertainty = Column(Text, nullable=True)
    closed_by = Column(String(255), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    events = relationship("SecurityIncidentEvent", back_populates="incident", cascade="all, delete-orphan")
    signals = relationship("SecurityIncidentSignal", back_populates="incident", cascade="all, delete-orphan")
    timeline_events = relationship("SecurityIncidentTimeline", back_populates="incident", cascade="all, delete-orphan")
    evidence = relationship("SecurityIncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    investigations = relationship("SecurityInvestigationCase", back_populates="incident", cascade="all, delete-orphan")
    containment_records = relationship("IncidentContainmentRecord", back_populates="incident", cascade="all, delete-orphan")
    recovery_records = relationship("IncidentRecoveryRecord", back_populates="incident", cascade="all, delete-orphan")
    postmortem = relationship("IncidentPostmortem", back_populates="incident", uselist=False, cascade="all, delete-orphan")


class SecurityIncidentEvent(Base):
    __tablename__ = "security_incident_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)  # VIOLATION, RESPONSE, EVIDENCE, APPROVAL, VERIFICATION
    event_id = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="events")


class SecurityIncidentSignal(Base):
    __tablename__ = "security_incident_signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String(100), nullable=False)
    source_id = Column(String(255), nullable=False)
    signal_type = Column(String(100), nullable=False)
    observed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    evidence_id = Column(String(255), nullable=True)
    
    # TRIGGERED, SUPPORTS, CONTRADICTS, CORRELATED_WITH, AFFECTS, EXPLAINS, REMEDIATES
    relationship_type = Column(String(50), nullable=False, default="TRIGGERED")
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="signals")


class SecurityIncidentTimeline(Base):
    __tablename__ = "security_incident_timeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_time = Column(DateTime(timezone=True), nullable=False)
    event_type = Column(String(100), nullable=False)
    source_type = Column(String(100), nullable=False)
    source_id = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence_id = Column(String(255), nullable=True)
    
    actor_type = Column(String(100), nullable=True)
    actor_id = Column(String(255), nullable=True)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(255), nullable=True)
    
    # Section 28: OBSERVED, INFERRED, HYPOTHESIZED, VERIFIED, CONTRADICTED, UNKNOWN
    confidence = Column(String(50), nullable=False, default="OBSERVED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="timeline_events")


class SecurityIncidentEvidence(Base):
    __tablename__ = "security_incident_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(255), nullable=False, index=True)
    
    # Section 22: PRIMARY, SUPPORTING, CONTEXTUAL, CONTRADICTING, RECOVERY
    role = Column(String(50), nullable=False, default="PRIMARY")
    relevance = Column(String(255), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    collector_type = Column(String(100), nullable=False)
    collector_id = Column(String(255), nullable=False)
    authorization_context = Column(JSON, default=dict)
    
    # Section 23: SHA-256 integrity hash
    integrity_hash = Column(String(64), nullable=False)
    hash_algorithm = Column(String(20), nullable=False, default="SHA-256")
    artifact_size_bytes = Column(Integer, default=0)
    
    # Rule 73: Redacted storage of evidence
    redacted_content = Column(JSON, default=dict)
    is_secret_redacted = Column(Boolean, default=True)
    
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="evidence")
    chain_events = relationship("EvidenceChainEvent", back_populates="evidence", cascade="all, delete-orphan")


class EvidenceChainEvent(Base):
    __tablename__ = "evidence_chain_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("security_incident_evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Section 24: COLLECTED, STORED, ACCESSED, EXPORTED, ANALYZED, CORRELATED, REDACTED, ARCHIVED
    action = Column(String(50), nullable=False)
    actor_type = Column(String(100), nullable=False)
    actor_id = Column(String(255), nullable=False)
    purpose = Column(String(255), nullable=False)
    authorization = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    evidence = relationship("SecurityIncidentEvidence", back_populates="chain_events")


class SecurityInvestigationCase(Base):
    __tablename__ = "security_investigation_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # OPEN, ACTIVE, PAUSED, COMPLETED, CANCELLED, REOPENED
    status = Column(String(50), nullable=False, default="OPEN", index=True)
    lead_actor_type = Column(String(100), nullable=False, default="HUMAN")
    lead_actor_id = Column(String(255), nullable=False)
    
    # Section 31 Objectives
    objective = Column(String(100), nullable=False, default="IDENTIFY_ROOT_CAUSE")
    scope = Column(JSON, default=dict)
    
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    conclusion = Column(Text, nullable=True)
    conclusion_status = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="investigations")
    questions = relationship("InvestigationQuestion", back_populates="case", cascade="all, delete-orphan")
    hypotheses = relationship("InvestigationHypothesisV2", back_populates="case", cascade="all, delete-orphan")


class InvestigationQuestion(Base):
    __tablename__ = "investigation_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("security_investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    
    # Section 33: OPEN, INVESTIGATING, ANSWERED, ANSWERED_WITH_LIMITATIONS, REFUTED, UNKNOWN
    status = Column(String(50), nullable=False, default="OPEN")
    evidence_references = Column(JSON, default=list)
    answer = Column(Text, nullable=True)
    answer_confidence = Column(String(50), nullable=True)  # DIRECT, CORROBORATED, INFERRED, etc.
    answered_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("SecurityInvestigationCase", back_populates="questions")


class InvestigationHypothesisV2(Base):
    __tablename__ = "investigation_hypotheses_v2"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("security_investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="AI_PROPOSED")  # AI_PROPOSED, HUMAN_PROPOSED, SYSTEM_CORRELATED
    supporting_evidence = Column(JSON, default=list)
    contradicting_evidence = Column(JSON, default=list)
    
    # Section 35: PROPOSED, UNDER_TEST, SUPPORTED, REFUTED, UNKNOWN
    status = Column(String(50), nullable=False, default="PROPOSED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    case = relationship("SecurityInvestigationCase", back_populates="hypotheses")


class IncidentRootCause(Base):
    __tablename__ = "incident_root_causes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("security_investigation_cases.id", ondelete="SET NULL"), nullable=True)
    root_cause_statement = Column(Text, nullable=False)
    
    # Section 36: UNKNOWN, HYPOTHESIS, SUPPORTED, VERIFIED, REFUTED
    status = Column(String(50), nullable=False, default="HYPOTHESIS")
    supporting_evidence_ids = Column(JSON, default=list)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class IncidentContainmentRecord(Base):
    __tablename__ = "incident_containment_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Section 47 action types: BLOCK_REQUEST, DENY_TOOL_CALL, REVOKE_SESSION, REVOKE_DELEGATION, SUSPEND_AGENT, ISOLATE_AGENT, ISOLATE_WORKLOAD, QUARANTINE_ARTIFACT, DISABLE_INTEGRATION, PAUSE_DEPLOYMENT, BLOCK_DEPLOYMENT, RESTRICT_DATA_FLOW
    action_type = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=False)
    target_id = Column(String(255), nullable=False)
    scope = Column(JSON, default=dict)
    reason = Column(Text, nullable=False)
    
    # Section 50: PROPOSED, PENDING_APPROVAL, AUTHORIZED, EXECUTING, COMPLETED, FAILED, REJECTED
    status = Column(String(50), nullable=False, default="PROPOSED")
    policy_decision_id = Column(String(255), nullable=True)
    step14_response_id = Column(String(255), nullable=True)
    post_action_evidence_id = Column(String(255), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="containment_records")


class IncidentRecoveryRecord(Base):
    __tablename__ = "incident_recovery_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False)  # RESTORE_DEPLOYMENT, REDEPLOY_VERIFIED_ARTIFACT, etc.
    target = Column(String(255), nullable=False)
    
    # PENDING, IN_PROGRESS, VERIFIED, FAILED
    status = Column(String(50), nullable=False, default="PENDING")
    post_recovery_evidence_id = Column(String(255), nullable=True)
    reverification_result = Column(JSON, nullable=True)
    recovered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="recovery_records")


class IncidentPostmortem(Base):
    __tablename__ = "incident_postmortems"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    timeline = Column(JSON, default=list)
    root_cause = Column(Text, nullable=False)
    
    # Section 60: Contributing factors: list of MISSING_CONTROL, MISCONFIGURATION, AUTHORITY_TOO_BROAD, STALE_POLICY, MISSING_EVIDENCE, SOFTWARE_DEFECT, DEPLOYMENT_ERROR, DEPENDENCY_VULNERABILITY, UNKNOWN
    contributing_factors = Column(JSON, default=list)
    controls_involved = Column(JSON, default=list)
    containment_summary = Column(Text, nullable=True)
    recovery_summary = Column(Text, nullable=True)
    remediation_summary = Column(Text, nullable=True)
    lessons_learned = Column(JSON, default=list)
    evidence_references = Column(JSON, default=list)
    
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("SecurityIncident", back_populates="postmortem")


class IncidentRelationship(Base):
    __tablename__ = "incident_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    target_incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Section 68: RELATED_TO, DUPLICATE_OF, PARENT_OF, CHILD_OF, CAUSED_BY, CONTRIBUTED_TO, REMEDIATED_BY, CONTAINED_BY, RECOVERED_BY
    relationship_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class IncidentAssignment(Base):
    __tablename__ = "incident_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Section 77: HUMAN, SECURITY_TEAM, AI_AGENT
    assignee_type = Column(String(50), nullable=False)
    assignee_id = Column(String(255), nullable=False)
    assigned_by = Column(String(255), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class IncidentExport(Base):
    __tablename__ = "incident_exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type = Column(String(50), nullable=False)
    actor_id = Column(String(255), nullable=False)
    purpose = Column(String(255), nullable=False)
    scope = Column(JSON, default=dict)
    export_hash = Column(String(64), nullable=False)
    redacted = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
