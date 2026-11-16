"""
Kavach Model Security — SQLAlchemy Database Models
Zero mock data. 100% PostgreSQL / SQLite persistence across:
- ModelSource (model_sources)
- ModelAsset (model_assets)
- ModelVersion (model_versions)
- ModelArtifact (model_artifacts)
- ModelScan (model_scans)
- ModelFinding (model_findings)
- ModelRemediationJob (model_remediation_jobs)
- ModelComplianceEvidence (model_compliance_evidence)
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    BigInteger,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


def now_utc():
    return datetime.now(timezone.utc)


class ModelSource(Base, TimestampMixin):
    """
    Connected AI Model Source (e.g. Hugging Face, AWS SageMaker/Bedrock,
    Azure AI Foundry, GCP Vertex, GitHub, MLflow, Local Directory).
    Stores encrypted credentials at rest.
    """
    __tablename__ = "model_sources"
    __table_args__ = (
        Index("ix_model_sources_org_type", "organization_id", "source_type"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    # Source provider type: huggingface, aws_sagemaker, aws_bedrock, azure_foundry, gcp_vertex, github, mlflow, local_directory, upload
    source_type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    endpoint_url = Column(String(500), nullable=True)

    # Encrypted credentials (AES-128-CBC via Fernet)
    credentials_encrypted = Column(Text, nullable=True)

    # Status: connected, disconnected, error, unauthorized
    status = Column(String(50), nullable=False, default="disconnected", index=True)
    status_message = Column(Text, nullable=True)

    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    model_count = Column(Integer, default=0, nullable=False)
    source_metadata = Column(JSON, default=dict, nullable=False)

    # Relationships
    models = relationship("ModelAsset", back_populates="source", cascade="all, delete-orphan", lazy="selectin")


class ModelAsset(Base, TimestampMixin):
    """
    Authoritative AI Model Record in the Kavach Inventory.
    Represents foundation, fine-tuned, custom, or embedding models.
    """
    __tablename__ = "model_assets"
    __table_args__ = (
        Index("ix_model_assets_org_risk", "organization_id", "risk_level"),
        Index("ix_model_assets_proj_status", "project_id", "deployment_status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("model_sources.id", ondelete="SET NULL"), nullable=True, index=True)

    # Model identifiers
    model_id_str = Column(String(255), nullable=False, index=True)  # e.g. "meta-llama/Llama-2-7b-chat-hf" or "custom-fraud-detector"
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False, default="custom", index=True)  # huggingface, aws, azure, gcp, github, local, custom
    model_family = Column(String(100), nullable=False, default="general")       # llama, bert, mistral, gpt, clip, resnet, etc.
    task_type = Column(String(100), nullable=False, default="text-generation")  # text-generation, embeddings, classification, multimodal

    # Format & Architecture
    model_format = Column(String(50), nullable=False, default="safetensors")    # safetensors, pytorch_bin, onnx, gguf, tensorflow, mixed
    architecture = Column(String(150), nullable=True)
    parameters_str = Column(String(50), nullable=True)                          # e.g. "7B", "110M", "1.5B"
    size_bytes = Column(BigInteger, default=0, nullable=False)

    # Operational lifecycle
    environment = Column(String(50), nullable=False, default="development")     # production, staging, development, testing
    deployment_status = Column(String(50), nullable=False, default="stored")    # deployed, stored, training, deprecated
    is_private = Column(Boolean, default=True, nullable=False)
    artifact_location = Column(String(1000), nullable=True)                     # s3://..., hf://..., file://...
    source_repo_url = Column(String(500), nullable=True)
    author_name = Column(String(255), nullable=True)

    # Security & Integrity Posture
    integrity_status = Column(String(50), nullable=False, default="UNVERIFIED") # VERIFIED, UNVERIFIED, TAMPERED, UNKNOWN
    provenance_status = Column(String(50), nullable=False, default="UNVERIFIED")# VERIFIED, UNVERIFIED, UNKNOWN
    risk_level = Column(String(50), nullable=False, default="LOW", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    security_score = Column(Integer, default=100, nullable=False)               # 0 - 100
    finding_count = Column(Integer, default=0, nullable=False)
    last_scanned_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    tags = Column(JSON, default=list, nullable=False)
    asset_metadata = Column(JSON, default=dict, nullable=False)

    # Relationships
    source = relationship("ModelSource", back_populates="models")
    versions = relationship("ModelVersion", back_populates="model", cascade="all, delete-orphan", lazy="selectin")
    artifacts = relationship("ModelArtifact", back_populates="model", cascade="all, delete-orphan", lazy="selectin")
    scans = relationship("ModelScan", back_populates="model", cascade="all, delete-orphan", lazy="selectin")
    findings = relationship("ModelFinding", back_populates="model", cascade="all, delete-orphan", lazy="selectin")
    remediations = relationship("ModelRemediationJob", back_populates="model", cascade="all, delete-orphan", lazy="selectin")


class ModelVersion(Base):
    """Specific revision, tag or branch commit of a model."""
    __tablename__ = "model_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)

    version_str = Column(String(100), nullable=False, default="main")
    commit_sha = Column(String(100), nullable=True)
    artifact_location = Column(String(1000), nullable=True)
    size_bytes = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    model = relationship("ModelAsset", back_populates="versions")
    artifacts = relationship("ModelArtifact", back_populates="version", cascade="all, delete-orphan", lazy="selectin")


class ModelArtifact(Base):
    """Individual artifact file inside a model bundle (.safetensors, .pt, config.json, etc.)."""
    __tablename__ = "model_artifacts"
    __table_args__ = (
        Index("ix_model_artifacts_model_file", "model_id", "file_path"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=True, index=True)

    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # safetensors, pickle, config, tokenizer, script, archive
    size_bytes = Column(BigInteger, default=0, nullable=False)
    sha256_hash = Column(String(64), nullable=True, index=True)
    is_serialized_pickle = Column(Boolean, default=False, nullable=False)
    integrity_status = Column(String(50), nullable=False, default="UNVERIFIED") # MATCHED, MISMATCHED, UNVERIFIED
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    model = relationship("ModelAsset", back_populates="artifacts")
    version = relationship("ModelVersion", back_populates="artifacts")


class ModelScan(Base):
    """Execution record of an automated or manual security scan against an AI model."""
    __tablename__ = "model_scans"
    __table_args__ = (
        Index("ix_model_scans_model_status", "model_id", "status"),
        Index("ix_model_scans_created", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)

    # Scan type: FULL, ARTIFACT_ONLY, CONFIG_ONLY, SUPPLY_CHAIN, RESCAN
    scan_type = Column(String(50), nullable=False, default="FULL")
    # Status: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    status = Column(String(50), nullable=False, default="QUEUED", index=True)
    scanner_version = Column(String(50), nullable=False, default="1.0.0")

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, default=0, nullable=False)

    checks_executed = Column(Integer, default=0, nullable=False)
    findings_count = Column(Integer, default=0, nullable=False)
    findings_resolved = Column(Integer, default=0, nullable=False)
    security_score = Column(Integer, default=100, nullable=False)

    error_message = Column(Text, nullable=True)
    scan_summary = Column(JSON, default=dict, nullable=False)
    logs = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    model = relationship("ModelAsset", back_populates="scans")
    findings = relationship("ModelFinding", back_populates="scan", cascade="all, delete-orphan", lazy="selectin")


class ModelFinding(Base):
    """Authoritative, deduplicated Model Security Finding emitted by scanner checks."""
    __tablename__ = "model_findings"
    __table_args__ = (
        Index("ix_model_findings_model_status", "model_id", "status"),
        Index("ix_model_findings_model_sev", "model_id", "severity"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("model_scans.id", ondelete="SET NULL"), nullable=True, index=True)

    fingerprint = Column(String(64), nullable=False, index=True) # sha256(model_id + rule_id + affected_file)
    rule_id = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO
    severity = Column(String(50), nullable=False, index=True)
    confidence = Column(String(50), nullable=False, default="HIGH")
    risk_score = Column(Float, default=0.0, nullable=False) # 0.0 - 10.0 derived from CVSS / risk matrix

    # Category: ARTIFACT_SECURITY, PROVENANCE, CONFIGURATION, SUPPLY_CHAIN, ENDPOINT_SECURITY
    category = Column(String(100), nullable=False, index=True)
    cwe_id = Column(String(50), nullable=True)           # e.g. "CWE-502"
    owasp_category = Column(String(150), nullable=True)  # e.g. "ML09:2023 - Model Serialization Attack"
    affected_file = Column(String(500), nullable=True)

    technical_evidence = Column(JSON, default=dict, nullable=False)
    reproduction_steps = Column(Text, nullable=True)
    remediation_guidance = Column(Text, nullable=True)
    fix_available = Column(Boolean, default=False, nullable=False)

    # Supply Chain & Root Cause enrichment
    cvss_score = Column(Float, nullable=True)
    cve_id = Column(String(100), nullable=True)
    is_transitive = Column(Boolean, default=False, nullable=False)
    dependency_path = Column(String(500), nullable=True)
    reachability = Column(String(50), default="UNKNOWN", nullable=False) # DIRECT, TRANSITIVE, REACHABLE, UNREACHABLE, UNKNOWN
    root_cause_id = Column(String(100), nullable=True)

    # Status: OPEN, CONFIRMED, IN_PROGRESS, REMEDIATED, VERIFIED, REOPENED, ACCEPTED_RISK, FALSE_POSITIVE
    status = Column(String(50), nullable=False, default="OPEN", index=True)
    verification_status = Column(String(50), nullable=False, default="UNVERIFIED") # UNVERIFIED, VERIFIED_FIXED, VERIFICATION_FAILED

    first_detected_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    last_detected_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    model = relationship("ModelAsset", back_populates="findings")
    scan = relationship("ModelScan", back_populates="findings")
    remediations = relationship("ModelRemediationJob", back_populates="finding", cascade="all, delete-orphan", lazy="selectin")


class ModelRemediationJob(Base, TimestampMixin):
    """
    State machine for AutoFix execution:
    PLAN -> PATCH -> APPLY -> TEST -> VERIFY -> COMPLETE (or ROLLBACK)
    """
    __tablename__ = "model_remediation_jobs"
    __table_args__ = (
        Index("ix_model_remediation_model_status", "model_id", "status"),
        Index("ix_model_remediation_finding", "finding_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("model_findings.id", ondelete="CASCADE"), nullable=False, index=True)

    # Status: PLANNING, AWAITING_APPROVAL, APPROVED, APPLYING, TESTING, VERIFYING, COMPLETED, FAILED, ROLLING_BACK, ROLLED_BACK
    status = Column(String(50), nullable=False, default="PLANNING", index=True)
    strategy = Column(String(100), nullable=False) # CONVERT_TO_SAFETENSORS, SANITIZE_CONFIG, PIN_DEPENDENCY, ENFORCE_WEIGHTS_ONLY, CUSTOM_PATCH

    plan_json = Column(JSON, default=dict, nullable=False)
    patch_diff = Column(Text, nullable=True)

    # Rollback snapshot preservation
    snapshot_path = Column(String(1000), nullable=True)
    snapshot_hash = Column(String(64), nullable=True)
    original_hash = Column(String(64), nullable=True)
    remediated_hash = Column(String(64), nullable=True)

    test_results = Column(JSON, default=dict, nullable=False)
    verification_results = Column(JSON, default=dict, nullable=False)
    execution_logs = Column(JSON, default=list, nullable=False)
    error_message = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    model = relationship("ModelAsset", back_populates="remediations")
    finding = relationship("ModelFinding", back_populates="remediations")


class ModelComplianceEvidence(Base):
    """
    Compliance mapping records linking model findings & scan evidence
    to standard AI frameworks (OWASP ML Top 10, NIST AI RMF, ISO 42001, SOC 2).
    """
    __tablename__ = "model_compliance_evidence"
    __table_args__ = (
        Index("ix_model_comp_org_fw", "organization_id", "framework"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    framework = Column(String(50), nullable=False, index=True) # OWASP_ML_TOP_10, OWASP_LLM_TOP_10, NIST_AI_RMF, ISO_42001, SOC_2
    control_id = Column(String(50), nullable=False, index=True)
    control_title = Column(String(255), nullable=False)

    # Status: COMPLIANT, NON_COMPLIANT, EVIDENCE_UNAVAILABLE, NOT_APPLICABLE
    status = Column(String(50), nullable=False, default="EVIDENCE_UNAVAILABLE")
    evidence_summary = Column(Text, nullable=False)
    related_finding_ids = Column(JSON, default=list, nullable=False)
    last_evaluated_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class ModelEndpoint(Base, TimestampMixin):
    """
    Deployed AI Model Inference Endpoint.
    Stores authorization boundaries, TLS configuration, rate limiting, and test telemetry.
    """
    __tablename__ = "model_endpoints"
    __table_args__ = (
        Index("ix_model_endpoints_model", "model_id"),
        Index("ix_model_endpoints_org", "organization_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)

    endpoint_url = Column(String(1000), nullable=False)
    environment = Column(String(50), default="production", nullable=False)
    auth_type = Column(String(50), default="BEARER", nullable=False) # BEARER, API_KEY, MTLS, NONE
    is_public = Column(Boolean, default=False, nullable=False)
    tls_enforced = Column(Boolean, default=True, nullable=False)
    rate_limit_enabled = Column(Boolean, default=True, nullable=False)
    model_download_exposed = Column(Boolean, default=False, nullable=False)

    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    test_results = Column(JSON, default=dict, nullable=False)
    endpoint_metadata = Column(JSON, default=dict, nullable=False)

    model = relationship("ModelAsset", backref="endpoints")


class ModelBehavioralTestRun(Base):
    """
    Controlled Behavioral & Backdoor Evaluation Run.
    Documents triggers evaluated, reference model comparisons, anomalies, and explicit limitations.
    """
    __tablename__ = "model_behavioral_runs"
    __table_args__ = (
        Index("ix_model_behavioral_model", "model_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    model_id = Column(UUID(as_uuid=True), ForeignKey("model_assets.id", ondelete="CASCADE"), nullable=False, index=True)

    test_suite_name = Column(String(255), nullable=False)
    trigger_count = Column(Integer, default=0, nullable=False)
    anomalies_detected = Column(Integer, default=0, nullable=False)
    anomaly_score = Column(Float, default=0.0, nullable=False) # 0.0 - 100.0
    confidence = Column(String(50), default="MEDIUM", nullable=False)
    limitations = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    model = relationship("ModelAsset", backref="behavioral_runs")

