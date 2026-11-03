"""
Step 23 Security Operations Center (SOC) Package.
"""

from app.soc.service import SocService
from app.soc.detection import DetectionEngine
from app.soc.correlation import AlertCorrelationEngine
from app.soc.adapters import EventNormalizationEngine
from app.soc.enrichment import ContextEnrichmentEngine

__all__ = [
    "SocService",
    "DetectionEngine",
    "AlertCorrelationEngine",
    "EventNormalizationEngine",
    "ContextEnrichmentEngine",
]
