"""
Step 19 Cross-Domain Security Graph Models.

Tables:
- security_graph_nodes
- security_graph_edges
- security_attack_paths
- security_change_impact
- security_graph_snapshots
- security_graph_versions
- graph_analysis_jobs

Enforces:
- Rule 45: No fake graph nodes
- Rule 46: No invented relationships (actual evidence required)
- Rule 48: Distinguish CONFIGURED vs OBSERVED access
- Rule 50: No security scores
- Rule 51: Every graph fact has provenance
- Rule 52: Temporal graph with valid_from / valid_until
- Rule 81: Multi-tenant isolation via project_id
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
    Text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class SecurityGraphNode(Base):
    __tablename__ = "security_graph_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    node_type = Column(String, nullable=False, index=True)
    # HUMAN, AI_AGENT, AGENT_SESSION, DELEGATION, ROLE, PERMISSION, SERVICE_PRINCIPAL, SERVICE_ACCOUNT,
    # REPOSITORY, BRANCH, COMMIT, PULL_REQUEST, DEPENDENCY, VULNERABILITY,
    # JENKINS_INSTANCE, JENKINS_JOB, JENKINS_BUILD, BUILD_ARTIFACT,
    # DOCKER_IMAGE, IMAGE_DIGEST, REGISTRY,
    # CLUSTER, NAMESPACE, DEPLOYMENT, POD, CONTAINER, SERVICE, INGRESS,
    # CLOUD_ACCOUNT, CLOUD_IDENTITY, CLOUD_ROLE, CLOUD_POLICY, CLOUD_NETWORK, SUBNET, FIREWALL,
    # SECURITY_GROUP, STORAGE, DATABASE, COMPUTE, FUNCTION, CLOUD_SECRET, CLOUD_KEY,
    # SECURITY_REQUIREMENT, SECURITY_CONTRACT, SECURITY_FINDING, EVIDENCE, POLICY, POLICY_DECISION, SECURITY_INCIDENT

    external_id = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False, default="PLATFORM", index=True)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    resource_type = Column(String, nullable=True, index=True)
    environment = Column(String, nullable=False, default="PRODUCTION", index=True)
    status = Column(String, nullable=False, default="ACTIVE", index=True)
    metadata_ = Column("metadata", JSON, default=dict)

    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False, index=True)

    first_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    valid_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    valid_until = Column(DateTime(timezone=True), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_graph_node_project_ext", "project_id", "external_id"),
        Index("ix_graph_node_project_type", "project_id", "node_type"),
    )


class SecurityGraphEdge(Base):
    __tablename__ = "security_graph_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("security_graph_nodes.id"), nullable=False, index=True)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("security_graph_nodes.id"), nullable=False, index=True)
    edge_type = Column(String, nullable=False, index=True)
    # OWNS, ACTS_AS, DELEGATES_TO, HAS_PERMISSION, HAS_ROLE, ASSIGNED_TO, CAN_ACCESS, TRUSTS,
    # CONTAINS, DEPENDS_ON, BUILT_FROM, MODIFIED_BY, INTRODUCED_BY, TRIGGERS, BUILT_BY, PRODUCES,
    # DEPLOYED_TO, RUNS, EXPOSES, ROUTES_TO, USES_SERVICE_ACCOUNT, USES_SECRET, PROTECTED_BY,
    # VIOLATES, PROTECTS, VERIFIED_BY, SUPPORTED_BY, CAUSED_BY, REMEDIATED_BY, CONTROLLED_BY

    state = Column(String, nullable=False, default="CONFIGURED_ACCESS", index=True)
    # CONFIGURED_ACCESS, OBSERVED_ACCESS, AUTHORIZED_ACCESS, ATTEMPTED_ACCESS, DENIED_ACCESS, UNKNOWN

    source_type = Column(String, nullable=False)
    source_id = Column(String, nullable=False)
    evidence_id = Column(String, nullable=True, index=True)
    confidence = Column(Float, nullable=False, default=1.0)
    metadata_ = Column("metadata", JSON, default=dict)

    valid_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    valid_until = Column(DateTime(timezone=True), nullable=True, index=True)
    first_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_graph_edge_src_tgt", "source_node_id", "target_node_id"),
        Index("ix_graph_edge_type_state", "edge_type", "state"),
        Index("ix_graph_edge_temporal", "valid_from", "valid_until"),
    )


class SecurityAttackPath(Base):
    __tablename__ = "graph_attack_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("security_graph_nodes.id"), nullable=False, index=True)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("security_graph_nodes.id"), nullable=False, index=True)
    path_type = Column(String, nullable=False, index=True)  # NETWORK_TO_DATA, AGENT_TO_CLOUD, COMPROMISE_PROPAGATION, SUPPLY_CHAIN
    state = Column(String, nullable=False, default="POTENTIAL", index=True)
    # POTENTIAL, CONFIGURED, OBSERVED, VERIFIED, BLOCKED, EXPIRED, UNKNOWN
    severity_context = Column(String, nullable=False, default="HIGH", index=True)
    path_length = Column(Integer, nullable=False)
    hops = Column(JSON, nullable=False)  # Ordered list of node & edge IDs and descriptors
    conditions = Column(JSON, nullable=False)  # [{type: NETWORK, status: VERIFIED}, ...]
    evidence_ids = Column(JSON, default=list)

    valid_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SecurityChangeImpact(Base):
    __tablename__ = "security_change_impact"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    trigger_type = Column(String, nullable=False, index=True)  # COMMIT, DEPLOYMENT, DELEGATION, IAM_CHANGE, CLOUD_ACTION, POLICY_CHANGE, SECURITY_FINDING
    trigger_id = Column(String, nullable=False, index=True)
    affected_nodes_count = Column(Integer, nullable=False, default=0)
    directly_affected = Column(JSON, default=list)
    indirectly_affected = Column(JSON, default=list)
    affected_requirements = Column(JSON, default=list)
    affected_contracts = Column(JSON, default=list)
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityGraphSnapshot(Base):
    __tablename__ = "security_graph_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    reason = Column(String, nullable=False)
    source_event_id = Column(String, nullable=True)
    node_count = Column(Integer, nullable=False)
    edge_count = Column(Integer, nullable=False)
    snapshot_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityGraphVersion(Base):
    __tablename__ = "security_graph_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    change_summary = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class GraphAnalysisJob(Base):
    __tablename__ = "graph_analysis_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    analysis_type = Column(String, nullable=False, index=True)  # BLAST_RADIUS, ATTACK_PATH, RECONCILIATION, TEMPORAL_RECONSTRUCTION
    status = Column(String, nullable=False, default="QUEUED", index=True)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    parameters = Column(JSON, default=dict)
    result_summary = Column(JSON, default=dict)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
