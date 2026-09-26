import logging
from typing import Any, Dict, Optional

from app.engines.intent.models import NormalizedIntent
from app.engines.intent.providers.factory import IntentProviderFactory

logger = logging.getLogger("secure-control-plane")


class IntentEngine:
    """
    Core Intent Understanding Engine.
    Converts raw developer instructions into normalized application intent,
    architectural characteristics, and detects ambiguities.
    """

    def __init__(self, preferred_provider: Optional[str] = None):
        self.preferred_provider = preferred_provider

    async def understand(
        self,
        raw_input: str,
        project_context: Optional[Dict[str, Any]] = None,
    ) -> NormalizedIntent:
        if not raw_input or not raw_input.strip():
            raise ValueError("Developer intent input cannot be empty.")

        logger.info(
            "Analyzing raw developer intent",
            extra={"event": "intent_analysis_start", "input_length": len(raw_input)},
        )

        provider = await IntentProviderFactory.get_provider(self.preferred_provider)
        logger.info(
            f"Using intent provider: {provider.provider_name} ({provider.model_name})",
            extra={"event": "intent_provider_selected", "provider": provider.provider_name},
        )

        normalized = await provider.analyze(raw_input=raw_input, project_context=project_context)

        # Enforce that raw_input was preserved exactly as submitted
        if normalized.raw_input != raw_input:
            normalized.raw_input = raw_input

        logger.info(
            f"Intent analyzed successfully: type={normalized.application_type}, confidence={normalized.overall_confidence}",
            extra={
                "event": "intent_analysis_complete",
                "application_type": normalized.application_type,
                "confidence": normalized.overall_confidence,
                "technologies_count": len(normalized.technologies),
                "ambiguities_count": len(normalized.ambiguities),
            },
        )
        return normalized
