import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class SecurityInvestigation(Base):
    __tablename__ = "security_investigations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("security_incidents.id"), nullable=True)
    violation_id = Column(UUID(as_uuid=True), ForeignKey("security_contract_violations.id"), nullable=True)
    finding_id = Column(UUID(as_uuid=True), nullable=True)  # No explicit foreign key yet
    verification_id = Column(UUID(as_uuid=True), nullable=True)
    contract_version_id = Column(UUID(as_uuid=True), ForeignKey("security_contract_versions.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, index=True)  # CREATED, QUEUED, COLLECTING_EVIDENCE, INVESTIGATING, VALIDATING, REMEDIATION_PROPOSED, AWAITING_APPROVAL, REMEDIATING, VERIFYING, COMPLETED, FAILED, CANCELLED, INSUFFICIENT_EVIDENCE
    severity = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    trigger_type = Column(String, nullable=False)
    trigger_id = Column(String, nullable=False)

    created_by_type = Column(String, nullable=False)
    created_by_id = Column(String, nullable=False)

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    evidence = relationship("InvestigationEvidence", back_populates="investigation", cascade="all, delete-orphan")
    hypotheses = relationship("InvestigationHypothesis", back_populates="investigation", cascade="all, delete-orphan")
    remediation_plans = relationship("RemediationPlan", back_populates="investigation", cascade="all, delete-orphan")


class InvestigationEvidence(Base):
    __tablename__ = "investigation_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("security_investigations.id"), nullable=False, index=True)
    
    evidence_type = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    
    content_reference = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    
    collected_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    observed_at = Column(DateTime(timezone=True), nullable=True)
    
    freshness = Column(String, nullable=True)
    reliability = Column(String, nullable=True)
    relevance = Column(String, nullable=True)
    
    metadata_ = Column("metadata", JSON, default=dict)

    investigation = relationship("SecurityInvestigation", back_populates="evidence")


class InvestigationHypothesis(Base):
    __tablename__ = "investigation_hypotheses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("security_investigations.id"), nullable=False, index=True)
    
    hypothesis = Column(String, nullable=False)
    type = Column(String, nullable=False)  # ROOT_CAUSE, CONTRIBUTING_FACTOR, ATTACK_PATH, etc.
    confidence = Column(Float, nullable=True)  # AI confidence
    
    supporting_evidence = Column(JSON, default=list)  # list of evidence IDs
    contradicting_evidence = Column(JSON, default=list)
    
    status = Column(String, nullable=False, default="PROPOSED")  # PROPOSED, SUPPORTED, CONTRADICTED, VALIDATED, REJECTED, UNKNOWN
    validation_method = Column(String, nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)

    investigation = relationship("SecurityInvestigation", back_populates="hypotheses")
