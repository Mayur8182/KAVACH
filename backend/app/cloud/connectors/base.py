"""
Kavach Cloud Security — Connector Architecture Base
Defines the abstract interface for multi-cloud integrations:
AWS, Azure, GCP, and Kubernetes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import uuid


@dataclass
class ConnectionValidationResult:
    is_valid: bool
    status: str  # CONNECTED, AUTHENTICATION_FAILED, CONFIGURATION_REQUIRED, ERROR
    error_message: Optional[str] = None
    account_identifier: Optional[str] = None
    identity_info: Dict[str, Any] = field(default_factory=dict)
    discovered_resources: List[Dict[str, Any]] = field(default_factory=list)
    observations: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SetupInstructions:
    provider: str
    instructions_title: str
    instructions_markdown: str
    external_id: Optional[str] = None
    kavach_account_id: Optional[str] = None
    trust_policy: Optional[Dict[str, Any]] = None
    required_permissions: List[str] = field(default_factory=list)
    cli_snippet: Optional[str] = None
    cloudformation_template_json: Optional[str] = None
    cloudformation_quick_create_url: Optional[str] = None


class CloudConnectorBase(ABC):
    @abstractmethod
    def generate_setup_instructions(self, project_id: uuid.UUID) -> SetupInstructions:
        """Generates cryptographically unique parameters and instructions for customer IAM setup."""
        pass

    @abstractmethod
    async def validate_and_discover(
        self,
        credentials_payload: Dict[str, Any],
        default_region: str = "us-east-1",
    ) -> ConnectionValidationResult:
        """Validates credentials (e.g. AWS STS AssumeRole), tests read-only access, and discovers live resources."""
        pass

