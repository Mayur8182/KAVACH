from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.engines.intent.models import NormalizedIntent


class IntentModelProvider(ABC):
    """Abstract interface for natural-language intent understanding model providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Identifier name of the model provider."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Underlying model identifier."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Determines if the provider service is operational and reachable."""
        pass

    @abstractmethod
    async def analyze(
        self,
        raw_input: str,
        project_context: Optional[Dict[str, Any]] = None,
    ) -> NormalizedIntent:
        """
        Analyzes developer natural language description and returns a validated NormalizedIntent.
        Raises an exception if the provider fails or produces invalid schema output.
        """
        pass
