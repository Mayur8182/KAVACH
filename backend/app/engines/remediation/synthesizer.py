"""
THING Remediation Engine — Patch Synthesizer
Generates minimal, production-grade security patches (unified diffs) using Google Gemini
with root-cause analysis and deterministic security rules fallback.
"""

import json
import logging
from typing import Any, Dict, Optional

from app.services.gemini_service import GeminiRemediationService

logger = logging.getLogger("thing.remediation.synthesizer")


class PatchSynthesizer:
    """
    Synthesizes precise security fixes for findings discovered by scanners.
    Outputs structured diffs and explains the exact security remediation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.gemini_service = GeminiRemediationService(api_key=api_key)

    async def synthesize_patch(
        self,
        finding: Dict[str, Any],
        file_content: Optional[str] = None,
        repository_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Coordinates patch generation.
        Returns:
          {
            "is_fixable": bool,
            "root_cause": str,
            "explanation": str,
            "patch": str (unified diff),
            "files_changed": list,
            "confidence": float,
            "risk": str
          }
        """
        try:
            result = await self.gemini_service.analyze_and_remediate(
                finding=finding,
                file_content=file_content,
                repository_context=repository_context,
            )
            return result
        except Exception as exc:
            logger.error(f"Patch synthesis failed: {exc}", exc_info=True)
            return {
                "is_fixable": False,
                "root_cause": f"Patch synthesis failed with error: {str(exc)}",
                "explanation": "Could not synthesize an automated patch.",
                "patch": "",
                "files_changed": [],
                "confidence": 0.0,
                "risk": "HIGH",
            }
