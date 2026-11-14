"""
Kavach Multi-Cloud Connectors Registry
Provides unified factory for AWS, Azure, GCP, and Kubernetes connectors.
"""

from typing import Optional
from app.cloud.connectors.base import CloudConnectorBase, ConnectionValidationResult, SetupInstructions
from app.cloud.connectors.aws_connector import AWSCloudConnector
from app.cloud.connectors.azure_connector import AzureCloudConnector
from app.cloud.connectors.gcp_connector import GCPCloudConnector
from app.cloud.connectors.kubernetes_connector import KubernetesCloudConnector


def get_connector(provider: str) -> Optional[CloudConnectorBase]:
    p = provider.upper()
    if p == "AWS":
        return AWSCloudConnector()
    elif p == "AZURE":
        return AzureCloudConnector()
    elif p == "GCP":
        return GCPCloudConnector()
    elif p in ("KUBERNETES", "K8S"):
        return KubernetesCloudConnector()
    return None


__all__ = [
    "CloudConnectorBase",
    "ConnectionValidationResult",
    "SetupInstructions",
    "AWSCloudConnector",
    "AzureCloudConnector",
    "GCPCloudConnector",
    "KubernetesCloudConnector",
    "get_connector",
]

