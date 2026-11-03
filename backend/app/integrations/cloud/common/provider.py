"""
Step 18 Abstract Cloud Provider Interface.

Defines the contract for AWS, Azure, and GCP provider implementations.
RULE 33 — No shell CLI execution. Structured APIs and official SDKs only.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.integrations.cloud.common.models import (
    CloudConnectionResult,
    NormalizedCloudResource,
    CloudSecurityCheckResult,
    ControlledActionResult,
)


class CloudProvider(ABC):
    """
    Abstract base class for AWS, Azure, and GCP integrations.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns 'AWS', 'AZURE', or 'GCP'."""
        pass

    @abstractmethod
    async def verify_connection(self, credential_reference: Optional[str] = None) -> CloudConnectionResult:
        """
        Verifies authentication and permissions against the real cloud provider.
        Returns CloudConnectionResult with real status and identity info.
        """
        pass

    @abstractmethod
    async def discover_resources(
        self,
        credential_reference: Optional[str] = None,
        resource_types: Optional[List[str]] = None,
        regions: Optional[List[str]] = None,
    ) -> List[NormalizedCloudResource]:
        """
        Discovers cloud resources using paginated official SDK API calls.
        Returns normalized resources with immutable provider identifiers.
        """
        pass

    @abstractmethod
    async def get_resource(
        self,
        provider_resource_id: str,
        resource_type: str,
        credential_reference: Optional[str] = None,
    ) -> Optional[NormalizedCloudResource]:
        """
        Fetches an individual resource from the cloud provider.
        """
        pass

    @abstractmethod
    async def get_iam_configuration(
        self,
        credential_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches IAM principals, roles, policies, and assignments.
        """
        pass

    @abstractmethod
    async def get_network_configuration(
        self,
        credential_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches VPCs/VNets, subnets, route tables, and security groups / firewall rules.
        """
        pass

    @abstractmethod
    async def get_security_configuration(
        self,
        resource_id: str,
        resource_type: str,
        credential_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches security attributes for a specific resource (e.g. S3 PublicAccessBlock, RDS encryption).
        """
        pass

    @abstractmethod
    async def collect_evidence(
        self,
        resource_id: str,
        evidence_type: str,
        credential_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Collects authoritative evidence from the cloud provider.
        """
        pass

    @abstractmethod
    async def execute_controlled_action(
        self,
        action_type: str,
        resource_id: str,
        parameters: Dict[str, Any],
        credential_reference: Optional[str] = None,
    ) -> ControlledActionResult:
        """
        Executes a controlled, validated, non-generic security action.
        RULE 41 & RULE 42: No generic shell commands or DELETE /anything.
        """
        pass
