from typing import Optional

from app.engines.intent.providers.base import IntentModelProvider
from app.engines.intent.providers.deterministic import DeterministicIntentProvider
from app.engines.intent.providers.ollama import OllamaIntentProvider


class IntentProviderFactory:
    """Factory resolving the active intent model provider."""

    @staticmethod
    async def get_provider(preferred_provider: Optional[str] = None) -> IntentModelProvider:
        """
        Returns active provider.
        If preferred is 'ollama', attempts Ollama check; if unavailable or preferred is deterministic,
        uses the DeterministicIntentProvider.
        """
        if preferred_provider == "ollama":
            ollama = OllamaIntentProvider()
            if await ollama.is_available():
                return ollama

        # Default robust deterministic provider
        return DeterministicIntentProvider()
