"""
Thing Code — Dependency Settings & Integrations Models
Database persistence for:
1. General Settings & Policy Enforcement
2. Registry Integrations (npm, PyPI, Maven Central, Docker, etc.)
3. Scanner Configurations (Trivy, Syft, OSV, Semgrep, RetireJS)
4. Credentials & Access Rules
5. Notification Channels
6. Audit Logs
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


def now_utc():
    return datetime.now(timezone.utc)


class DependencyGeneralSettings(Base, TimestampMixin):
    """
    Global and repository-level settings for dependency scanning and policy enforcement.
    """
    __tablename__ = "dependency_general_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="all",
        index=True,
    )

    # General Scan Settings
    default_scan_mode: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Full SCA & Deep SBOM",
    )
    scan_frequency: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="On Every Push & Pull Request",
    )
    supported_ecosystems: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["npm", "python", "java", "go", "net", "cargo", "docker"],
    )
    default_branches: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="main, master, release/*, develop",
    )
    auto_remediation: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    pr_annotations: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    fail_build_on_high_risk: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Policy & Behavior
    enable_license_compliance: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    enable_vulnerability_scanning: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    enable_outdated_package_detection: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    enforce_policy_on_prs: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    block_fail_threshold: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Critical & High",
    )
    allow_overrides_with_approval: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    default_reviewer_group: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Security Administrators",
    )
    data_retention_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=90,
    )


class DependencyRegistryIntegration(Base, TimestampMixin):
    """
    Connected package registries (Private npm, PyPI, Maven, Go Module Proxy, GitHub Packages, etc.)
    """
    __tablename__ = "dependency_registry_integrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    registry_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # npm, pypi, maven, go, docker, ecr, github
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(50), nullable=False, default="TOKEN")  # TOKEN, BASIC, IAM, NONE
    credentials_masked: Mapped[str] = mapped_column(String(255), nullable=False, default="configured_token_masked")
    scope: Mapped[str] = mapped_column(String(50), nullable=False, default="GLOBAL")  # GLOBAL, REPO_SPECIFIC
    repository_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="CONNECTED")  # CONNECTED, FAILED, TESTING
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyScannerConfig(Base, TimestampMixin):
    """
    SCA Scanner configurations and execution policies (Trivy, Syft, OSV, Semgrep).
    """
    __tablename__ = "dependency_scanner_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    scanner_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    engine_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v0.58.0")
    timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    auto_update_db: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deep_scan: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fail_on_severity: Mapped[str] = mapped_column(String(50), nullable=False, default="HIGH")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="HEALTHY")
    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyAccessRule(Base, TimestampMixin):
    """
    Authentication credentials, service accounts, and role permissions for dependency operations.
    """
    __tablename__ = "dependency_access_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    principal_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SERVICE_ACCOUNT")
    principal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="SECURITY_ENGINEER")
    permissions: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    scope: Mapped[str] = mapped_column(String(50), nullable=False, default="GLOBAL")
    repository_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    token_masked: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class DependencyNotificationChannel(Base, TimestampMixin):
    """
    Notification targets for dependency security alerts and build breakages.
    """
    __tablename__ = "dependency_notification_channels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    channel_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SLACK")  # SLACK, TEAMS, EMAIL, PAGERDUTY, WEBHOOK
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(500), nullable=False)
    events: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyAuditLog(Base):
    """
    Immutable audit trail of changes made to dependency settings, registries, scanners, or access.
    """
    __tablename__ = "dependency_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    actor: Mapped[str] = mapped_column(String(255), nullable=False, default="Mayur K. (admin)")
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="SETTINGS")
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False, default="127.0.0.1")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUCCESS")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        server_default=func.now(),
        nullable=False,
    )
