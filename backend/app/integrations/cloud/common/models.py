"""
Step 18 Normalized Cloud Data Classes.

RULE 37 — CLOUD RESOURCE IDENTITY MUST BE IMMUTABLE.
Every imported resource preserves:
  - provider
  - provider_resource_id
  - resource_type
  - region
  - account/subscription/project
  - resource_uri where available
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.integrations.cloud.common.enums import (
    CloudConnectionStatus,
    CloudSecuritySeverity,
    CheckResultStatus,
)


@dataclass
class CloudConnectionResult:
    status: CloudConnectionStatus
    provider: str
    account_identifier: Optional[str] = None
    tenant_identifier: Optional[str] = None
    subscription_identifier: Optional[str] = None
    gcp_project_identifier: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedCloudResource:
    provider: str
    resource_type: str
    provider_resource_id: str
    resource_name: str
    resource_uri: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    account_id: Optional[str] = None
    subscription_id: Optional[str] = None
    gcp_project_id: Optional[str] = None
    parent_resource_id: Optional[str] = None
    status: str = "ACTIVE"
    tags: Dict[str, str] = field(default_factory=dict)
    labels: Dict[str, str] = field(default_factory=dict)
    configuration: Dict[str, Any] = field(default_factory=dict)
    relationships: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class CloudSecurityCheckResult:
    rule_id: str
    rule_name: str
    category: str
    severity: CloudSecuritySeverity
    status: CheckResultStatus  # PASS, FAIL, UNKNOWN, NOT_APPLICABLE
    resource_id: str
    resource_type: str
    observed_value: Any
    expected_value: Any
    evidence: Dict[str, Any]
    remediation_guidance: Optional[str] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ControlledActionResult:
    action_type: str
    resource_id: str
    success: bool
    status: str
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
    error: Optional[str] = None
    evidence: Dict[str, Any] = field(default_factory=dict)
