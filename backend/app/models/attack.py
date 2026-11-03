import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Float, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base

class AttackTarget(Base):
    __tablename__ = "security_attack_targets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    
    target_type = Column(String, nullable=False)
    target_identifier = Column(String, nullable=False)
    environment = Column(String, nullable=False)
    
    base_url = Column(String, nullable=True)
    repository_id = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True)
    service_id = Column(String, nullable=True)
    container_id = Column(String, nullable=True)
    kubernetes_namespace = Column(String, nullable=True)
    kubernetes_workload = Column(String, nullable=True)
    
    scope = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="ACTIVE")
    authorization = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AttackCampaign(Base):
    __tablename__ = "security_attack_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    status = Column(String, nullable=False, default="DRAFT", index=True)
    environment = Column(String, nullable=False)
    
    target_type = Column(String, nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_targets.id"), nullable=False)
    
    created_by_type = Column(String, nullable=False)
    created_by_id = Column(String, nullable=False)
    
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True)
    authorization_context = Column(JSON, default=dict)
    scope = Column(JSON, default=dict)
    
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    failure_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AttackTest(Base):
    __tablename__ = "security_attack_tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_campaigns.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    requirement_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    contract_version_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    test_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    target_type = Column(String, nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_targets.id"), nullable=False)
    environment = Column(String, nullable=False)
    
    authorization_scope = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="PLANNED", index=True)
    
    expected_behavior = Column(JSON, default=dict)
    actual_behavior = Column(JSON, default=dict)
    oracle_result = Column(String, nullable=True)
    
    severity = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class AttackTestEvidence(Base):
    __tablename__ = "attack_test_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_test_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_tests.id"), nullable=False)
    
    evidence_type = Column(String, nullable=False)
    source = Column(String, nullable=False)
    
    content_reference = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    request_reference = Column(String, nullable=True)
    response_reference = Column(String, nullable=True)
    trace_id = Column(String, nullable=True)
    log_reference = Column(String, nullable=True)
    
    before_state = Column(JSON, default=dict)
    after_state = Column(JSON, default=dict)
    metadata_ = Column("metadata", JSON, default=dict)

class AttackResult(Base):
    __tablename__ = "security_attack_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_test_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_tests.id"), nullable=False, unique=True)
    
    result = Column(String, nullable=False)  # VERIFIED, VIOLATED, UNKNOWN, NOT_EXECUTED, NOT_APPLICABLE
    oracle_type = Column(String, nullable=False)
    
    expected_behavior = Column(JSON, default=dict)
    actual_behavior = Column(JSON, default=dict)
    
    confidence = Column(Float, nullable=True)
    evidence_ids = Column(JSON, default=list)
    
    requirement_status_before = Column(String, nullable=True)
    requirement_status_after = Column(String, nullable=True)
    contract_status_before = Column(String, nullable=True)
    contract_status_after = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AttackPath(Base):
    __tablename__ = "security_attack_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_test_id = Column(UUID(as_uuid=True), ForeignKey("security_attack_tests.id"), nullable=False)
    
    path_nodes = Column(JSON, nullable=False) # List of edges/nodes
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
