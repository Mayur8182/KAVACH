import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class KubernetesCluster(Base):
    __tablename__ = "kubernetes_clusters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=True)  # EKS, GKE, AKS, SELF_MANAGED
    cluster_identifier = Column(String, nullable=True)
    environment = Column(String, nullable=False)
    status = Column(String, nullable=False, default="NOT_CONFIGURED")
    # credential_reference points to the secure credential store
    credential_reference = Column(String, nullable=True)
    # comma-separated allowed namespaces, or "*" if all (restricted by policy)
    namespace_scope = Column(String, nullable=True)
    server_version = Column(String, nullable=True)
    nodes_count = Column(Integer, nullable=True, default=0)
    namespaces_count = Column(Integer, nullable=True, default=0)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    health_status = Column(String, nullable=True, default="Healthy")  # Healthy, Unhealthy
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class KubernetesNamespace(Base):
    __tablename__ = "kubernetes_namespaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="ACTIVE")
    labels = Column(JSON, default=dict)
    annotations = Column(JSON, default=dict)
    observed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class KubernetesWorkload(Base):
    __tablename__ = "kubernetes_workloads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=False, index=True)
    namespace = Column(String, nullable=False)
    name = Column(String, nullable=False)
    kind = Column(String, nullable=False)  # Deployment, StatefulSet, DaemonSet, Job, CronJob
    uid = Column(String, nullable=True, index=True)   # Kubernetes UID

    desired_replicas = Column(Integer, nullable=True)
    ready_replicas = Column(Integer, nullable=True)

    # JSON list of image references (repo:tag@digest)
    image_references = Column(JSON, default=list)
    service_accounts = Column(JSON, default=list)
    labels = Column(JSON, default=dict)
    annotations = Column(JSON, default=dict)

    risk_level = Column(String, nullable=True, default="Low")  # Critical, High, Medium, Low
    findings_count = Column(Integer, nullable=True, default=0)
    cluster_name = Column(String, nullable=True)
    pods_formatted = Column(String, nullable=True, default="1/1")

    status = Column(String, nullable=False, default="UNKNOWN")
    observed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class KubernetesPod(Base):
    __tablename__ = "kubernetes_pods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=False, index=True)
    workload_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_workloads.id"), nullable=True)
    namespace = Column(String, nullable=False)
    name = Column(String, nullable=False)
    uid = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="UNKNOWN")
    node = Column(String, nullable=True)
    containers = Column(JSON, default=list)   # list of {name, image, imageID, ready, restartCount}
    image_digests = Column(JSON, default=list)  # collected from container statuses
    restart_count = Column(Integer, default=0)
    conditions = Column(JSON, default=list)
    service_account = Column(String, nullable=True)
    security_context = Column(JSON, default=dict)
    observed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class KubernetesSecurityObservation(Base):
    """Records security findings/violations observed during K8s inspection."""
    __tablename__ = "kubernetes_security_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=False, index=True)
    workload_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_workloads.id"), nullable=True)
    namespace = Column(String, nullable=True)
    resource_kind = Column(String, nullable=True)
    resource_name = Column(String, nullable=True)
    check_type = Column(String, nullable=False)   # PRIVILEGED, HOST_NETWORK, ROOT_EXECUTION, etc.
    severity = Column(String, nullable=False)
    category = Column(String, nullable=True, default="Misconfigurations")
    remediation = Column(String, nullable=True)
    detail = Column(JSON, default=dict)
    status = Column(String, nullable=False, default="OPEN")
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class KubernetesDeployment(Base):
    """Tracks controlled deployments performed through the platform."""
    __tablename__ = "kubernetes_deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=False)
    namespace = Column(String, nullable=False)
    workload_name = Column(String, nullable=False)
    workload_kind = Column(String, nullable=False)
    environment = Column(String, nullable=False, default="TEST")
    image_digest = Column(String, nullable=True, index=True)
    manifest_hash = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True)
    status = Column(String, nullable=False, default="REQUESTED")
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True)
    authorization_context = Column(JSON, default=dict)
    approval_id = Column(UUID(as_uuid=True), nullable=True)
    requested_by = Column(String, nullable=True)
    dry_run = Column(Boolean, default=False)
    failure_reason = Column(String, nullable=True)
    rollout_evidence = Column(JSON, default=dict)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
