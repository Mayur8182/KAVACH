"""
IaC Governance & Policy Enforcement Models.
Authoritative PostgreSQL database persistence for:
- Quality Gates
- Policy Exceptions & Exemptions
- Custom IaC Rules and Rule Pack status overrides
- IaC Settings & Configuration

Adheres strictly to ANTIGRAVITY Production Engineering Rules.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class IaCQualityGateRecord(Base, TimestampMixin):
    """
    Authoritative persistence for IaC Quality Gates.
    Replaces volatile in-memory _QUALITY_GATES_STORE.
    """
    __tablename__ = "iac_quality_gates"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )  # e.g., "QG-001", "QG-002"
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Enforced",  # Enforced, Draft, Disabled
        index=True,
    )
    fail_condition: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Critical findings > 0",
    )
    affected_repos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Security Engineer",
    )
    last_updated: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="",
    )
    rules_data: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    repositories_data: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    pipelines_data: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    notifications_data: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    audit_logs_data: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )


class IaCPolicyExceptionRecord(Base, TimestampMixin):
    """
    Authoritative persistence for IaC Policy Exceptions & Waivers.
    Replaces volatile in-memory _EXCEPTIONS_STORE.
    """
    __tablename__ = "iac_policy_exceptions"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )  # e.g., "EXC-001"
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    repository_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="frontend-app",
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    policy_rule: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    valid_until: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Active",  # Active, Expired, Revoked
        index=True,
    )
    created_by: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="SecOps Admin",
    )


class IaCCustomRuleRecord(Base, TimestampMixin):
    """
    Authoritative persistence for custom user-created rules and rule status overrides.
    Replaces volatile in-memory _RULES_STORE modifications.
    """
    __tablename__ = "iac_custom_rules"

    id: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
    )  # e.g. "RULE-CUSTOM-001"
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="High",
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="AWS",
        index=True,
    )
    framework: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Terraform",
        index=True,
    )
    rego_code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="Enabled",  # Enabled, Disabled
        index=True,
    )
    is_custom: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )


class IaCSettingsRecord(Base, TimestampMixin):
    """
    Authoritative persistence for IaC global & section configuration.
    Replaces volatile in-memory _SETTINGS_STORE.
    """
    __tablename__ = "iac_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    section: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )  # "policies", "general", "scan", "notifications", "advanced"
    config_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
