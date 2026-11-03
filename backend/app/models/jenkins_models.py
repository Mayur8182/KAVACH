import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class JenkinsInstance(Base):
    __tablename__ = "jenkins_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    base_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="NOT_CONFIGURED")
    # credential_reference points to the secure credential store, NOT the secret itself
    credential_reference = Column(String, nullable=True)
    version = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class JenkinsJob(Base):
    __tablename__ = "jenkins_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jenkins_instance_id = Column(UUID(as_uuid=True), ForeignKey("jenkins_instances.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    job_name = Column(String, nullable=False)
    job_path = Column(String, nullable=True)
    job_type = Column(String, nullable=True)   # PIPELINE, FREESTYLE, MULTIBRANCH
    repository = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    configuration_reference = Column(String, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class JenkinsBuild(Base):
    __tablename__ = "jenkins_builds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jenkins_jobs.id"), nullable=False, index=True)
    build_number = Column(Integer, nullable=False)
    commit_sha = Column(String, nullable=True, index=True)
    branch = Column(String, nullable=True)
    status = Column(String, nullable=False, default="RUNNING")   # RUNNING, SUCCESS, FAILED, ABORTED
    result = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # References to log/artifact storage, never raw content
    artifact_reference = Column(String, nullable=True)
    console_log_reference = Column(String, nullable=True)
    security_job_id = Column(UUID(as_uuid=True), nullable=True)  # link back to GitHub security job
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class JenkinsWebhookEvent(Base):
    __tablename__ = "jenkins_webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    delivery_id = Column(String, nullable=False, unique=True, index=True)  # idempotency key
    event_type = Column(String, nullable=False)
    jenkins_instance_id = Column(UUID(as_uuid=True), nullable=True)
    job_name = Column(String, nullable=True)
    build_number = Column(Integer, nullable=True)
    commit_sha = Column(String, nullable=True)
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    payload_hash = Column(String, nullable=True)
    processing_status = Column(String, nullable=False, default="RECEIVED")


class BuildArtifact(Base):
    __tablename__ = "build_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    jenkins_build_id = Column(UUID(as_uuid=True), ForeignKey("jenkins_builds.id"), nullable=True, index=True)
    artifact_type = Column(String, nullable=False)  # DOCKER_IMAGE, JAR, TAR, etc.
    name = Column(String, nullable=False)
    digest = Column(String, nullable=True, index=True)
    location_reference = Column(String, nullable=True)  # reference to artifact storage
    commit_sha = Column(String, nullable=True, index=True)
    provenance = Column(JSON, default=dict)   # builder, build environment, etc.
    sbom_reference = Column(String, nullable=True)
    signature_reference = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class SecurityDeployment(Base):
    """Tracks all deployment requests routed through the security control plane."""
    __tablename__ = "security_deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    source_type = Column(String, nullable=False)    # JENKINS, MANUAL, AGENT, API
    source_id = Column(String, nullable=True)
    commit_sha = Column(String, nullable=True, index=True)
    artifact_id = Column(UUID(as_uuid=True), ForeignKey("build_artifacts.id"), nullable=True)
    image_digest = Column(String, nullable=True, index=True)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("kubernetes_clusters.id"), nullable=True)
    namespace = Column(String, nullable=True)
    workload_type = Column(String, nullable=True)
    workload_name = Column(String, nullable=True)
    environment = Column(String, nullable=False)
    status = Column(String, nullable=False, default="REQUESTED", index=True)
    policy_decision_id = Column(UUID(as_uuid=True), nullable=True)
    authorization_context = Column(JSON, default=dict)
    approval_id = Column(UUID(as_uuid=True), nullable=True)
    requested_by = Column(String, nullable=True)
    failure_reason = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
