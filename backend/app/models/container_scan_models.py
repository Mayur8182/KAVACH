import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ContainerImageScanJob(Base):
    """
    Image Scan Management entity.
    Tracks all image scan executions, statuses, vulnerability breakdown, and scan options.
    Matches 07. Image Scan Management visual reference.
    """
    __tablename__ = "container_image_scan_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    image_id = Column(UUID(as_uuid=True), ForeignKey("docker_images.id"), nullable=True)

    image_name = Column(String, nullable=False, index=True)  # e.g. myapp/api:1.4.2
    registry_name = Column(String, nullable=False, default="Docker Hub")  # Docker Hub, Amazon ECR, GHCR, etc.
    scan_type = Column(String, nullable=False, default="Full Scan")  # Quick Scan, Full Scan, Compliance Scan, Custom Scan
    status = Column(String, nullable=False, default="Completed", index=True)  # Completed, In Progress, Failed, Queued

    vulnerabilities_count = Column(Integer, nullable=False, default=0)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    info_count = Column(Integer, nullable=False, default=0)

    secrets_count = Column(Integer, nullable=False, default=0)
    config_count = Column(Integer, nullable=False, default=0)
    sbom_count = Column(Integer, nullable=False, default=0)

    duration_seconds = Column(Integer, nullable=False, default=192)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    scan_options = Column(JSON, default=dict)  # {scan_secrets: true, generate_sbom: true, analyze_dockerfile: true, enable_storage: true}
    raw_logs = Column(Text, nullable=True)
    findings_detail = Column(JSON, default=list)  # list of {id, severity, package, version, issue, fix_available, layer}

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ContainerScanSchedule(Base):
    """
    Scheduled scan definition for container images and registries.
    """
    __tablename__ = "container_scan_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String, nullable=False)  # e.g. Daily Production Registry Scan
    target_type = Column(String, nullable=False, default="IMAGE")  # IMAGE, REPOSITORY, REGISTRY, KUBERNETES
    target_pattern = Column(String, nullable=False)  # myapp/*, prod-cluster, etc.
    cron_expression = Column(String, nullable=False, default="0 2 * * *")
    scan_type = Column(String, nullable=False, default="Full Scan")
    is_enabled = Column(Boolean, nullable=False, default=True)

    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
