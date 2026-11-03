"""
Base Collector Interface for Runtime Evidence Sources.
All source adapters implement this contract.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from app.runtime.enums import EvidenceSourceStatus, EvidenceSourceType
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class BaseEvidenceCollector(ABC):
    source_type: EvidenceSourceType

    @abstractmethod
    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """Returns True if the collector has valid credentials and endpoints configured."""
        pass

    @abstractmethod
    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        """Returns live health status of the collector."""
        pass

    @abstractmethod
    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        """Translates raw source telemetry into uniform RuntimeEvidenceIngestRequest."""
        pass
