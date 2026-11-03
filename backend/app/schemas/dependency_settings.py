"""
Pydantic schemas for Module 15: Dependency Settings & Integrations
Authoritative response and request models for:
1. General Settings (/code/dependencies/settings)
2. Registry Integrations (/code/dependencies/settings/registries)
3. Scanner Configuration (/code/dependencies/settings/scanners)
4. Credentials & Permissions (/code/dependencies/settings/access)
5. Notifications & Audit (/code/dependencies/settings/audit)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Metric Cards ──
class SettingsOverviewMetrics(BaseModel):
    configured_integrations: int = 1
    active_scanners: int = 4
    access_rules: int = 2
    notification_channels: int = 1


# ── 1. General Settings Schemas ──
class GeneralSettingsPayload(BaseModel):
    repository_name: Optional[str] = "all"
    default_scan_mode: str = "Full SCA & Deep SBOM"
    scan_frequency: str = "On Every Push & Pull Request"
    supported_ecosystems: List[str] = Field(default_factory=lambda: ["npm", "python", "java", "go", "net", "cargo", "docker"])
    default_branches: str = "main, master, release/*, develop"
    auto_remediation: bool = True
    pr_annotations: bool = True
    fail_build_on_high_risk: bool = False
    enable_license_compliance: bool = True
    enable_vulnerability_scanning: bool = True
    enable_outdated_package_detection: bool = True
    enforce_policy_on_prs: bool = True
    block_fail_threshold: str = "Critical & High"
    allow_overrides_with_approval: bool = False
    default_reviewer_group: str = "Security Administrators"
    data_retention_days: int = 90


class CurrentConfigurationItem(BaseModel):
    setting: str
    value: str
    category: str


class GeneralSettingsDashboardResponse(BaseModel):
    metrics: SettingsOverviewMetrics
    settings: GeneralSettingsPayload
    current_configuration: List[CurrentConfigurationItem] = Field(default_factory=list)


# ── 2. Registry Integrations Schemas ──
class RegistryIntegrationItem(BaseModel):
    id: str
    name: str
    registry_type: str
    url: str
    auth_type: str
    credentials_masked: str
    scope: str
    repository_name: Optional[str] = None
    is_active: bool = True
    status: str = "CONNECTED"
    last_tested_at: Optional[str] = None


class CreateRegistryRequest(BaseModel):
    name: str
    registry_type: str  # npm, pypi, maven, go, docker, ecr, github
    url: str
    auth_type: str = "TOKEN"  # TOKEN, BASIC, IAM, NONE
    credentials: Optional[str] = None
    scope: str = "GLOBAL"  # GLOBAL, REPO_SPECIFIC
    repository_name: Optional[str] = None


class TestRegistryResponse(BaseModel):
    success: bool
    status: str
    latency_ms: int
    message: str


# ── 3. Scanner Configuration Schemas ──
class ScannerConfigItem(BaseModel):
    id: str
    scanner_id: str
    name: str
    description: str
    is_enabled: bool = True
    engine_version: str
    timeout_seconds: int = 300
    auto_update_db: bool = True
    deep_scan: bool = True
    fail_on_severity: str = "HIGH"
    status: str = "HEALTHY"
    last_tested_at: Optional[str] = None


class UpdateScannerConfigRequest(BaseModel):
    is_enabled: Optional[bool] = None
    engine_version: Optional[str] = None
    timeout_seconds: Optional[int] = None
    auto_update_db: Optional[bool] = None
    deep_scan: Optional[bool] = None
    fail_on_severity: Optional[str] = None


class TestScannerResponse(BaseModel):
    scanner_id: str
    success: bool
    engine_output: str
    duration_ms: int
    tested_at: str


# ── 4. Credentials & Permissions Schemas ──
class AccessRuleItem(BaseModel):
    id: str
    name: str
    principal_type: str
    principal_name: str
    role: str
    permissions: List[str] = Field(default_factory=list)
    scope: str
    repository_name: Optional[str] = None
    token_masked: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool = True


class CreateAccessRuleRequest(BaseModel):
    name: str
    principal_type: str = "SERVICE_ACCOUNT"  # SERVICE_ACCOUNT, ROLE, TEAM, USER
    principal_name: str
    role: str = "SECURITY_ENGINEER"  # ADMIN, SECURITY_ENGINEER, DEVELOPER, READ_ONLY
    permissions: List[str] = Field(default_factory=list)
    scope: str = "GLOBAL"
    repository_name: Optional[str] = None
    token: Optional[str] = None


# ── 5. Notifications & Audit Schemas ──
class NotificationChannelItem(BaseModel):
    id: str
    channel_type: str
    name: str
    destination: str
    events: List[str] = Field(default_factory=list)
    is_active: bool = True
    last_notified_at: Optional[str] = None


class CreateNotificationChannelRequest(BaseModel):
    channel_type: str = "SLACK"  # SLACK, TEAMS, EMAIL, PAGERDUTY, WEBHOOK
    name: str
    destination: str
    events: List[str] = Field(default_factory=list)


class TestNotificationResponse(BaseModel):
    success: bool
    message: str
    tested_at: str


class AuditLogItem(BaseModel):
    id: str
    actor: str
    action: str
    category: str
    target: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: str
    status: str
    timestamp: str


class AuditLogListResponse(BaseModel):
    total: int
    logs: List[AuditLogItem] = Field(default_factory=list)
