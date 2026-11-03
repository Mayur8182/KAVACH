import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, BigInteger, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ContainerRegistry(Base):
    __tablename__ = "container_registries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)  # DOCKER_HUB, ECR, GCR, ACR, GHCR, SELF_HOSTED
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="NOT_CONFIGURED")
    # credential_reference points to the secure credential store, NOT the secret itself
    credential_reference = Column(String, nullable=True)
    # Extended fields matching Container Security Dashboard Suite
    registry_type = Column(String, nullable=True, default="Cloud")  # "Cloud" | "Self-hosted"
    images_count = Column(Integer, nullable=True, default=0)
    repositories_count = Column(Integer, nullable=True, default=0)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String, nullable=True, default="SUCCESSFUL")  # SUCCESSFUL, FAILED, IN_PROGRESS
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DockerImage(Base):
    __tablename__ = "docker_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    registry_id = Column(UUID(as_uuid=True), ForeignKey("container_registries.id"), nullable=True)

    repository = Column(String, nullable=False)
    tag = Column(String, nullable=True)
    digest = Column(String, nullable=True, index=True)  # sha256:...
    image_id = Column(String, nullable=True)  # local image ID

    # Provenance linkage
    commit_sha = Column(String, nullable=True, index=True)
    jenkins_build_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    github_repo_id = Column(UUID(as_uuid=True), nullable=True)

    architecture = Column(String, nullable=True)
    os = Column(String, nullable=True)
    size = Column(BigInteger, nullable=True)

    status = Column(String, nullable=False, default="DISCOVERED")
    metadata_ = Column("metadata", JSON, default=dict)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    observed_at = Column(DateTime(timezone=True), nullable=True)


class ContainerImageFinding(Base):
    __tablename__ = "container_image_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    image_id = Column(UUID(as_uuid=True), ForeignKey("docker_images.id"), nullable=False, index=True)
    scanner_execution_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    vulnerability_id = Column(String, nullable=True)   # CVE-..., GHSA-..., etc.
    package = Column(String, nullable=True)
    installed_version = Column(String, nullable=True)
    fixed_version = Column(String, nullable=True)
    severity = Column(String, nullable=True, index=True)  # CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE
    status = Column(String, nullable=False, default="OPEN")
    evidence = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DockerfileScan(Base):
    """Persisted Dockerfile build security scan record."""
    __tablename__ = "dockerfile_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    repository_id = Column(UUID(as_uuid=True), nullable=True)
    repository_name = Column(String, nullable=False, default="default")
    file_path = Column(String, nullable=False)  # e.g. ./Dockerfile, ./services/payment/Dockerfile
    base_image = Column(String, nullable=False, default="alpine:latest")  # node:18, python:3.11, etc.
    lines_count = Column(Integer, nullable=False, default=1)
    issues_count = Column(Integer, nullable=False, default=0)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    build_type = Column(String, nullable=False, default="Single-stage")  # Multi-stage, Single-stage, Distroless, Scratch, Others
    status = Column(String, nullable=False, default="Completed")  # Completed, Running, Failed
    raw_content = Column(String, nullable=True)
    build_config = Column(JSON, default=dict)
    last_scanned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DockerfileFinding(Base):
    """Deterministic misconfiguration or security finding identified in a Dockerfile."""
    __tablename__ = "dockerfile_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dockerfile_id = Column(UUID(as_uuid=True), ForeignKey("dockerfile_scans.id"), nullable=False, index=True)
    rule_id = Column(String, nullable=False)  # e.g. "DS002", "DS005", "CKV_DOCKER_1"
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    line_number = Column(Integer, nullable=True)
    snippet = Column(String, nullable=True)
    remediation = Column(String, nullable=True)
    category = Column(String, nullable=False, default="Best Practice")  # Security, Best Practice, Compliance
    status = Column(String, nullable=False, default="OPEN")  # OPEN, RESOLVED, SUPPRESSED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ContainerConfigItem(Base):
    """Container runtime configuration, workload capabilities, and hardening audit entity."""
    __tablename__ = "container_config_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    container_name = Column(String, nullable=False)  # e.g. api-7c4d5f7c9
    image = Column(String, nullable=False)  # e.g. myapp/api:1.4.2
    namespace = Column(String, nullable=False, default="default")  # payments, default, web
    cluster = Column(String, nullable=False, default="prod-cluster")  # prod-cluster, staging
    privileged = Column(Boolean, nullable=False, default=False)
    user_id = Column(String, nullable=False, default="1000")  # "1000", "0 (root)", etc.
    capabilities_count = Column(Integer, nullable=False, default=0)
    capabilities_list = Column(JSON, default=list)  # ["CAP_NET_BIND_SERVICE", ...]
    status = Column(String, nullable=False, default="Running")  # Running, Stopped, Degraded
    findings_count = Column(Integer, nullable=False, default=0)
    security_posture = Column(String, nullable=False, default="Compliant")  # Compliant, Minor issues, High risk, Critical
    host_mounts = Column(JSON, default=list)
    insecure_env_vars = Column(JSON, default=list)
    seccomp_profile = Column(String, nullable=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ContainerConfigFinding(Base):
    """Specific misconfiguration finding associated with a container runtime spec."""
    __tablename__ = "container_config_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    container_id = Column(UUID(as_uuid=True), ForeignKey("container_config_items.id"), nullable=False, index=True)
    category = Column(String, nullable=False)  # "Privileged mode", "Running as root", "Excessive capabilities", "Host mounts", "Insecure environment vars", "Other"
    title = Column(String, nullable=False)
    rule_id = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    description = Column(String, nullable=False)
    remediation = Column(String, nullable=True)
    evidence = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

