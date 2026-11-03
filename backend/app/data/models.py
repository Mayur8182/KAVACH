"""
Thing Data — DSPM Database Models

Entities:
- DataStore: discovered data stores (S3, RDS, Snowflake, Redis, etc.)
- DataInventoryRecord: sensitive data items found within stores
- DataFlow: observed data movement between services
- DataClassificationPolicy: DLP classification rules
- DataAccessEvent: audit record for data access
- DataLineageNode: lineage graph nodes
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
    BigInteger,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class DataStore(Base):
    """
    Discovered data store: S3, RDS, Snowflake, Redis, GCS, BigQuery, etc.
    Discovered through cloud integrations, agent telemetry, or manual registration.
    """
    __tablename__ = "data_stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(512), nullable=False, index=True)
    store_type = Column(String(64), nullable=False, index=True)  # AWS_S3, RDS_POSTGRESQL, SNOWFLAKE, REDIS, GCS, BIGQUERY, MONGODB, DYNAMODB, ELASTICSEARCH
    provider = Column(String(64), nullable=False, default="AWS", index=True)  # AWS, GCP, AZURE, ON_PREM
    location = Column(String(512), nullable=True)  # prod-db.us-east-1.internal:5432/main
    region = Column(String(64), nullable=True)
    environment = Column(String(64), nullable=False, default="production", index=True)

    # Classification
    sensitivity = Column(String(32), nullable=False, default="UNKNOWN", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN
    classification_labels = Column(JSON, default=list)  # ["PII", "Credentials", "Financial"]

    # Security posture
    encryption_at_rest = Column(String(128), nullable=True)  # AWS KMS (CMK), AES-256-GCM, None
    encryption_in_transit = Column(String(128), nullable=True)  # TLS 1.3, TLS 1.2, None
    public_access = Column(String(32), nullable=False, default="UNKNOWN", index=True)  # BLOCKED, RESTRICTED, PUBLIC, UNKNOWN
    mfa_delete = Column(Boolean, nullable=True)
    versioning_enabled = Column(Boolean, nullable=True)
    backup_enabled = Column(Boolean, nullable=True)
    audit_logging_enabled = Column(Boolean, nullable=True)

    # Metrics
    record_count = Column(BigInteger, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    sensitive_record_count = Column(BigInteger, nullable=True, default=0)
    pii_field_count = Column(Integer, nullable=True, default=0)

    # Compliance
    compliance_status = Column(String(32), nullable=False, default="UNKNOWN", index=True)  # COMPLIANT, NON_COMPLIANT, AUDIT_REQUIRED, UNKNOWN
    last_compliance_check = Column(DateTime(timezone=True), nullable=True)
    compliance_frameworks = Column(JSON, default=list)  # ["SOC2", "GDPR", "HIPAA"]

    # Discovery
    discovery_source = Column(String(64), nullable=False, default="MANUAL")  # CLOUD_INTEGRATION, AGENT_TELEMETRY, MANUAL, SCANNER
    last_scanned = Column(DateTime(timezone=True), nullable=True)
    scan_status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, RUNNING, COMPLETED, FAILED, NOT_CONFIGURED

    # Metadata
    tags = Column(JSON, default=dict)
    owner_team = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_data_stores_project_sensitivity", "project_id", "sensitivity"),
        Index("ix_data_stores_project_compliance", "project_id", "compliance_status"),
    )


class DataInventoryRecord(Base):
    """
    Sensitive data item found within a data store.
    Created by DSPM scanner when sensitive data is detected.
    """
    __tablename__ = "data_inventory_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    data_store_id = Column(UUID(as_uuid=True), ForeignKey("data_stores.id"), nullable=False, index=True)

    field_name = Column(String(256), nullable=True)
    table_name = Column(String(256), nullable=True)
    data_type = Column(String(64), nullable=False, index=True)  # PII, CREDENTIAL, FINANCIAL, PHI, PCI, SECRET, INTERNAL
    data_subtype = Column(String(128), nullable=True)  # email, ssn, credit_card, api_key, password_hash, etc.

    sample_count = Column(BigInteger, nullable=True)
    confidence = Column(Float, nullable=False, default=0.0)  # 0.0-1.0

    is_masked = Column(Boolean, nullable=False, default=False)
    is_encrypted = Column(Boolean, nullable=False, default=False)
    has_access_control = Column(Boolean, nullable=False, default=False)

    risk_score = Column(Float, nullable=False, default=0.0)
    policy_violations = Column(JSON, default=list)  # list of policy IDs that are violated

    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_data_inventory_store_type", "data_store_id", "data_type"),
        Index("ix_data_inventory_project_type", "project_id", "data_type"),
    )


class DataFlowRecord(Base):
    """
    Observed data movement between two services or stores.
    Created by network telemetry, agent traces, or static analysis.
    """
    __tablename__ = "data_flow_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    source_service = Column(String(256), nullable=False)
    destination_service = Column(String(256), nullable=False)
    data_classification = Column(String(64), nullable=False, index=True)  # PII, CREDENTIAL, FINANCIAL, INTERNAL, PUBLIC
    protocol = Column(String(64), nullable=False, default="HTTPS")  # HTTPS, gRPC, mTLS, TCP, AMQP

    policy_result = Column(String(32), nullable=False, default="ALLOW", index=True)  # ALLOW, BLOCK, MASK, ALERT
    policy_id = Column(String(256), nullable=True)  # which DLP policy evaluated this

    bytes_transferred = Column(BigInteger, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    is_encrypted = Column(Boolean, nullable=False, default=True)
    is_authorized = Column(Boolean, nullable=False, default=True)

    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_data_flows_project_result", "project_id", "policy_result"),
    )


class DataClassificationPolicy(Base):
    """
    DLP classification and enforcement policy.
    Determines what data is sensitive and what actions to take.
    """
    __tablename__ = "data_classification_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    data_types = Column(JSON, default=list)  # ["PII", "CREDENTIAL"]
    action = Column(String(32), nullable=False, default="ALERT")  # ALERT, BLOCK, MASK, QUARANTINE
    severity = Column(String(32), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    enabled = Column(Boolean, nullable=False, default=True)

    conditions = Column(JSON, default=dict)  # match conditions
    exceptions = Column(JSON, default=list)  # exception rules

    created_by = Column(String(256), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DataScanJob(Base):
    """
    Asynchronous data discovery/classification scan job.
    Tracks the scan state and results for a data store.
    """
    __tablename__ = "data_scan_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    data_store_id = Column(UUID(as_uuid=True), ForeignKey("data_stores.id"), nullable=False, index=True)

    status = Column(String(32), nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    scanner_type = Column(String(64), nullable=False, default="DSPM")  # DSPM, DLP, CLASSIFICATION, ACCESS_AUDIT
    triggered_by = Column(String(256), nullable=True)  # user_id or "SCHEDULE"

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)

    records_scanned = Column(BigInteger, nullable=True)
    sensitive_records_found = Column(BigInteger, nullable=True)
    policy_violations_found = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    scan_summary = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
