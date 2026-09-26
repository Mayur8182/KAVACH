import json
from typing import Any, Dict, Optional
import httpx

from app.core.config import get_settings
from app.engines.intent.models import NormalizedIntent
from app.engines.intent.providers.base import IntentModelProvider

settings = get_settings()


class OllamaIntentProvider(IntentModelProvider):
    """Local LLM Intent understanding provider connecting to Ollama."""

    def __init__(self, base_url: Optional[str] = None, model_name: Optional[str] = None):
        self._base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self._model_name = model_name or settings.llm_model

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def is_available(self) -> bool:
        """Pings Ollama /api/tags endpoint to verify daemon connectivity."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self._base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def analyze(
        self,
        raw_input: str,
        project_context: Optional[Dict[str, Any]] = None,
    ) -> NormalizedIntent:
        system_prompt = (
            "You are an Intent Analysis Engine for software architecture. "
            "Analyze the developer's raw request and output a strictly valid JSON object matching the NormalizedIntent schema. "
            "Do NOT generate security controls, policies, or checklists yet (that belongs to the blueprint phase). "
            "Extract: purpose, application_type, actors, workflows, interfaces, technologies (version null unless stated), "
            "data_domains, external_services (status: INTENDED_INTEGRATION), deployment_context, state_changes, trust_boundaries, "
            "assumptions, ambiguities, missing_information, evidence, and overall_confidence (0.0 to 1.0). "
            "Output JSON ONLY without explanation."
        )

        user_content = f"Developer Request: {raw_input}\nContext: {json.dumps(project_context or {})}"

        payload = {
            "model": self._model_name,
            "prompt": f"{system_prompt}\n\n{user_content}",
            "stream": False,
            "format": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self._base_url}/api/generate", json=payload)
                if response.status_code != 200:
                    raise RuntimeError(f"Ollama returned HTTP {response.status_code}: {response.text}")
                result_json = response.json().get("response", "{}")
                data = json.loads(result_json)
        except Exception as exc:
            raise RuntimeError(f"Ollama intent generation failed: {str(exc)}") from exc

        # Enforce that raw_input is strictly preserved verbatim
        data["raw_input"] = raw_input

        # Deterministic Pydantic validation (Never trust raw LLM output without validation)
        return NormalizedIntent.model_validate(data)
