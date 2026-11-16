"""
Kavach Model Security — Base Model Source Connector Interface
Every connector must implement real authentication, connectivity testing,
model discovery, metadata extraction, and artifact references.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple


class BaseModelSourceConnector(ABC):
    """
    Abstract Base Class for all Model Source Connectors.
    Zero mock responses. All operations interact with live registries or file systems.
    """

    def __init__(self, source_id: Optional[str] = None, credentials: Optional[Dict[str, Any]] = None, endpoint_url: Optional[str] = None):
        self.source_id = source_id
        self.credentials = credentials or {}
        self.endpoint_url = endpoint_url

    @abstractmethod
    async def validate_credentials(self) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates credentials with remote provider.
        Returns (is_valid, message, account_info).
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Tuple[bool, int, str]:
        """
        Executes ping/health check.
        Returns (success, latency_ms, message).
        """
        pass

    @abstractmethod
    async def discover_models(self, limit: int = 50, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves list of available models from the source.
        Returns list of standardized model metadata dictionaries.
        """
        pass

    @abstractmethod
    async def get_model_details(self, model_id_str: str) -> Dict[str, Any]:
        """
        Retrieves comprehensive model metadata (tags, format, architecture, files).
        """
        pass

    @abstractmethod
    async def get_artifact_references(self, model_id_str: str) -> List[Dict[str, Any]]:
        """
        Retrieves list of files/artifacts (.safetensors, .pt, config.json, etc.).
        Returns: [{"path": str, "size": int, "type": str, "sha256": Optional[str], "download_url": Optional[str]}]
        """
        pass

