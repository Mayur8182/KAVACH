"""
Evidence Collectors Registry and Exports.
"""

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.collectors.mcp import MCPEvidenceCollector
from app.runtime.collectors.application import ApplicationEvidenceCollector
from app.runtime.collectors.otel import OTELEvidenceCollector
from app.runtime.collectors.github import GitHubEvidenceCollector
from app.runtime.collectors.container import ContainerEvidenceCollector
from app.runtime.collectors.kubernetes import KubernetesEvidenceCollector

__all__ = [
    "BaseEvidenceCollector",
    "MCPEvidenceCollector",
    "ApplicationEvidenceCollector",
    "OTELEvidenceCollector",
    "GitHubEvidenceCollector",
    "ContainerEvidenceCollector",
    "KubernetesEvidenceCollector",
]
