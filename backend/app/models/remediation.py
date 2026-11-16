import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base
import app.models.investigation  # noqa: F401


class RemediationPlan(Base):
    __tablename__ = "remediation_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("security_investigations.id"), nullable=True, index=True)
    
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, nullable=False)  # SOURCE_CODE_PATCH, CONFIGURATION_PATCH, etc.
    risk_level = Column(String, nullable=False)  # LOW_RISK, MEDIUM_RISK, HIGH_RISK, CRITICAL_RISK
    status = Column(String, nullable=False)  # PROPOSED, VALIDATED_PLAN, AWAITING_APPROVAL, APPROVED, etc.
    
    created_by_type = Column(String, nullable=False)
    created_by_id = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    investigation = relationship("SecurityInvestigation", back_populates="remediation_plans")
    versions = relationship("RemediationPlanVersion", back_populates="plan", cascade="all, delete-orphan")
    patches = relationship("RemediationPatch", back_populates="plan", cascade="all, delete-orphan")
    attempts = relationship("RemediationAttempt", back_populates="plan", cascade="all, delete-orphan")


class RemediationPlanVersion(Base):
    __tablename__ = "remediation_plan_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("remediation_plans.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    plan_json = Column(JSON, nullable=False)
    
    generated_by = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    model = Column(String, nullable=True)
    
    status = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    plan = relationship("RemediationPlan", back_populates="versions")


class RemediationPatch(Base):
    __tablename__ = "remediation_patches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id = Column(UUID(as_uuid=True), ForeignKey("security_investigations.id"), nullable=True)
    remediation_plan_id = Column(UUID(as_uuid=True), ForeignKey("remediation_plans.id"), nullable=True)
    
    base_commit_sha = Column(String, nullable=True)
    workspace_id = Column(String, nullable=True)
    patch_format = Column(String, nullable=False)  # e.g., 'unified_diff', 'ast_patch', 'file_replace'
    
    original_hash = Column(String, nullable=True)
    patched_hash = Column(String, nullable=True)
    
    diff = Column(String, nullable=False)
    affected_files = Column(JSON, default=list)
    
    generated_by = Column(String, nullable=False)
    generation_model = Column(String, nullable=True)
    generation_provider = Column(String, nullable=True)
    
    status = Column(String, nullable=False)  # GENERATED, VALIDATED, APPLIED, REJECTED, FAILED, REVERTED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    plan = relationship("RemediationPlan", back_populates="patches")
    validations = relationship("RemediationValidation", back_populates="patch", cascade="all, delete-orphan")
    reviews = relationship("RemediationReview", back_populates="patch", cascade="all, delete-orphan")


class RemediationValidation(Base):
    __tablename__ = "remediation_validations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("remediation_patches.id"), nullable=False, index=True)
    
    validation_type = Column(String, nullable=False)  # DIFF, SYNTAX, TESTS, SCANNER, CONTRACT, REQUIREMENT, REGRESSION
    status = Column(String, nullable=False)  # PASSED, FAILED, RUNNING, CANCELLED
    
    command_or_tool = Column(String, nullable=True)
    result_summary = Column(String, nullable=True)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(String, nullable=True)

    patch = relationship("RemediationPatch", back_populates="validations")


class RemediationAttempt(Base):
    __tablename__ = "remediation_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("remediation_plans.id"), nullable=False)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("remediation_patches.id"), nullable=True)
    
    actor_type = Column(String, nullable=False)
    actor_id = Column(String, nullable=False)
    
    authorization_context = Column(JSON, nullable=True)
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True)
    approval_id = Column(UUID(as_uuid=True), nullable=True)
    
    status = Column(String, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(String, nullable=True)

    plan = relationship("RemediationPlan", back_populates="attempts")


class RemediationReview(Base):
    __tablename__ = "remediation_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patch_id = Column(UUID(as_uuid=True), ForeignKey("remediation_patches.id"), nullable=False)
    
    review_type = Column(String, nullable=False)  # AI_REVIEW, HUMAN_REVIEW
    result = Column(String, nullable=False)  # APPROVED, REJECTED, NEEDS_CHANGES
    
    observations = Column(JSON, default=list)
    evidence_id = Column(UUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patch = relationship("RemediationPatch", back_populates="reviews")


class RemediationEvidence(Base):
    __tablename__ = "remediation_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    remediation_attempt_id = Column(UUID(as_uuid=True), ForeignKey("remediation_attempts.id"), nullable=False)
    
    evidence_type = Column(String, nullable=False)
    content_reference = Column(String, nullable=True)
    content_hash = Column(String, nullable=True)
    
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AutofixJob(Base):
    """
    Tracks the full end-to-end lifecycle of an AI-driven or deterministic vulnerability remediation job:
    Investigation -> Code Intelligence -> Strategy Proposal -> Patch Generation ->
    Multi-layer Validation -> Self-Healing Retries -> GitHub Pull Request -> Verification & TTR.
    """
    __tablename__ = "autofix_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    finding_id = Column(String(255), nullable=False, index=True)
    finding_type = Column(String(64), default="api_security")  # api_security, sast, sca, secrets, iac, container
    project_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    api_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    status = Column(String(64), default="QUEUED", index=True)
    # QUEUED, INVESTIGATING, STRATEGIZING, GENERATING_PATCH, APPLYING_PATCH, VALIDATING, SELF_HEALING, VERIFIED, PR_CREATED, COMPLETED, FAILED
    current_stage = Column(String(64), default="INVESTIGATION")
    
    repository_name = Column(String(255), nullable=True)
    base_commit_sha = Column(String(128), nullable=True)
    branch_name = Column(String(255), nullable=True)
    target_file = Column(String(512), nullable=True)
    language = Column(String(64), nullable=True)
    framework = Column(String(64), nullable=True)

    root_cause = Column(Text, nullable=True)
    code_context = Column(JSON, default=dict)
    strategies = Column(JSON, default=list)
    selected_strategy = Column(JSON, default=dict)

    patch_diff = Column(Text, nullable=True)
    original_code = Column(Text, nullable=True)
    patched_code = Column(Text, nullable=True)
    files_affected = Column(JSON, default=list)

    validation_results = Column(JSON, default=dict)
    self_healing_attempts = Column(JSON, default=list)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    execution_logs = Column(JSON, default=list)

    pr_number = Column(Integer, nullable=True)
    pr_url = Column(String(512), nullable=True)
    pr_branch = Column(String(255), nullable=True)
    pr_status = Column(String(64), default="NONE")  # NONE, OPEN, MERGED, CLOSED

    # Precise Time to Resolution (TTR) Timestamps
    detected_at = Column(DateTime(timezone=True), nullable=True)
    autofix_started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    investigation_completed_at = Column(DateTime(timezone=True), nullable=True)
    patch_generated_at = Column(DateTime(timezone=True), nullable=True)
    validation_completed_at = Column(DateTime(timezone=True), nullable=True)
    pr_created_at = Column(DateTime(timezone=True), nullable=True)
    pr_merged_at = Column(DateTime(timezone=True), nullable=True)
    verification_completed_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    time_to_resolution_seconds = Column(Float, nullable=True)
    durations = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
