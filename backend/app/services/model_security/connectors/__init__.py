"""
Kavach Model Security — Connectors Registry & Factory
"""

from typing import Any, Dict, Optional
from app.services.model_security.connectors.base import BaseModelSourceConnector
from app.services.model_security.connectors.huggingface_connector import HuggingFaceConnector
from app.services.model_security.connectors.local_connector import LocalModelConnector
from app.services.model_security.connectors.github_connector import GitHubModelConnector
from app.services.model_security.connectors.aws_connector import AWSSageMakerBedrockConnector


def get_connector_for_source(
    source_type: str,
    source_id: Optional[str] = None,
    credentials: Optional[Dict[str, Any]] = None,
    endpoint_url: Optional[str] = None,
) -> BaseModelSourceConnector:
    """
    Factory function returning the specialized connector for a model source.
    """
    st = (source_type or "").lower().strip()
    if st in ("huggingface", "hf"):
        return HuggingFaceConnector(source_id=source_id, credentials=credentials, endpoint_url=endpoint_url)
    elif st in ("local", "local_directory", "upload", "file"):
        return LocalModelConnector(source_id=source_id, credentials=credentials, endpoint_url=endpoint_url)
    elif st in ("github", "git"):
        return GitHubModelConnector(source_id=source_id, credentials=credentials, endpoint_url=endpoint_url)
    elif st in ("aws", "aws_sagemaker", "aws_bedrock", "sagemaker", "bedrock"):
        return AWSSageMakerBedrockConnector(source_id=source_id, credentials=credentials, endpoint_url=endpoint_url)
    else:
        # Default fallback to Local/Custom connector
        return LocalModelConnector(source_id=source_id, credentials=credentials, endpoint_url=endpoint_url)


__all__ = [
    "BaseModelSourceConnector",
    "HuggingFaceConnector",
    "LocalModelConnector",
    "GitHubModelConnector",
    "AWSSageMakerBedrockConnector",
    "get_connector_for_source",
]

