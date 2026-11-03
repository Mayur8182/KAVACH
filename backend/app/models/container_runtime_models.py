import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ContainerRuntimeAlert(Base):
    """
    Container Runtime Security Alert.
    Represents detected anomalies, suspicious processes, file system changes, and policy violations.
    Matches 09. Container Runtime Security visual reference.
    """
    __tablename__ = "container_runtime_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    time_stamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    severity = Column(String, nullable=False, default="HIGH", index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    event_type = Column(String, nullable=False, index=True)  # Suspicious Process, Network Activity, File System Changes, Privilege Escalation, Crypto Mining
    process_name = Column(String, nullable=False)  # /bin/bash, curl, /usr/bin/python, sudo, /tmp/miner
    workload_name = Column(String, nullable=False)  # payment-service, ml-service, worker, frontend-web, unknown
    namespace = Column(String, nullable=False, default="prod")  # prod, ml, default

    status = Column(String, nullable=False, default="Open", index=True)  # Open, Investigating, Resolved
    evidence = Column(JSON, default=dict)  # {pid, ppid, cmdline, container_id, image, user, parent_process, network_dest, file_path}

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ContainerRuntimeEvent(Base):
    """
    Detailed container process and behavioral event log.
    Ingested from runtime sensors (eBPF / Falco / Auditd) or recorded telemetry.
    """
    __tablename__ = "container_runtime_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    event_type = Column(String, nullable=False, index=True)  # Suspicious Processes, File System, Network, Privilege Escalation, Process Execution
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    severity = Column(String, nullable=False, default="MEDIUM", index=True)
    process = Column(String, nullable=False)  # /bin/bash, wget, curl, chmod +s
    cmdline = Column(String, nullable=True)
    workload = Column(String, nullable=False)
    namespace = Column(String, nullable=False, default="prod")
    container_id = Column(String, nullable=True)
    details = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ContainerRuntimePolicy(Base):
    """
    Runtime security policy governing process, network, and file system execution.
    Can be in Blocking or Detection mode.
    """
    __tablename__ = "container_runtime_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)

    name = Column(String, nullable=False, unique=True, index=True)  # block-privilege-escalation, detect-crypto-mining, etc.
    policy_type = Column(String, nullable=False, default="Detection")  # Blocking, Detection
    category = Column(String, nullable=False, default="Process Control")  # Process Control, Network, File System, Capabilities, System
    action = Column(String, nullable=False, default="Alert")  # Blocked, Alert
    status = Column(String, nullable=False, default="Enabled")  # Enabled, Disabled
    scope = Column(String, nullable=False, default="All Clusters")  # All Clusters, Production, Staging
    enforcement_mechanism = Column(String, nullable=True, default="Kernel eBPF LSM / Falco Probe")
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
