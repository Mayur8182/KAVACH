"""
Dependency Security & Compliance Policy Models.

Tables:
- dependency_policies: Rules governing vulnerability thresholds, package blocking, version constraints, and trust requirements.
- dependency_package_rules: Explicit Allowed / Blocked / Restricted package rules per ecosystem.
- dependency_policy_exceptions: Waivers and security approvals for accepted risks.
- dependency_policy_events: Execution audit logs of CI/CD and commit evaluations.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index,
    Integer, JSON, String, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DependencyPolicy(Base, TimestampMixin):
    """
    Persistent dependency policy definition.
    Enforces deterministic decisions (ALLOW, WARN, BLOCK) across repositories.
    """
    __tablename__ = "dependency_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    policy_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # e.g. DEP-SEC-01
    policy_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Vulnerability", index=True
    )  # Vulnerability, Package Rule, Version, License, Trust
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(
        String(100), nullable=False, default="All Repositories", index=True
    )  # All Repositories, Production, web-api, frontend-app
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Active", index=True
    )  # Active, Warn-Only, Inactive
    enforcement_mode: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Block CI/CD", index=True
    )  # Block CI/CD, Alert Only, PR Comment
    severity_threshold: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # CRITICAL, HIGH, etc.
    rule_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    violation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_evaluated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyPackageRule(Base, TimestampMixin):
    """
    Explicit package blacklist / whitelist rules per ecosystem.
    """
    __tablename__ = "dependency_package_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ecosystem: Mapped[str] = mapped_column(String(50), nullable=False, default="npm", index=True)
    rule_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="BLOCKED", index=True
    )  # BLOCKED, ALLOWED, RESTRICTED
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    scope: Mapped[str] = mapped_column(String(100), nullable=False, default="All Repositories")
    enforcement_action: Mapped[str] = mapped_column(String(50), nullable=False, default="Block Build")
    added_by: Mapped[str] = mapped_column(String(100), nullable=False, default="Security Officer")


class DependencyPolicyException(Base, TimestampMixin):
    """
    Security waivers and exceptions approved for specific components or CVEs.
    """
    __tablename__ = "dependency_policy_exceptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    policy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    target_version: Mapped[str] = mapped_column(String(100), nullable=False)
    cve_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[str] = mapped_column(String(100), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Active", index=True
    )  # Active, Pending, Expired, Revoked
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DependencyPolicyEvaluationEvent(Base, TimestampMixin):
    """
    Audit log of real-time policy evaluations across CI/CD jobs and repository commits.
    """
    __tablename__ = "dependency_policy_evaluation_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=True
    )
    policy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    repository_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    decision: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PASS", index=True
    )  # PASS, WARN, BLOCK
    policy_name: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
