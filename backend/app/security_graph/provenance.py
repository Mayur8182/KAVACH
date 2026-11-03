"""
Step 19 Graph Provenance Engine.

RULE 51 — EVERY GRAPH FACT HAS PROVENANCE.
Every node and edge must support:
  source_type, source_id, evidence_id, observed_at, valid_from, valid_until, confidence, state.
Confidence represents EVIDENCE CONFIDENCE (e.g. 1.0 for direct DB record, 0.9 for cloud API, etc.),
NOT a security score.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any


@dataclass
class EdgeProvenance:
    source_type: str  # AUTHORIZATION, DELEGATION, CLOUD_IAM, NETWORK_CONFIGURATION, RUNTIME_TELEMETRY, etc.
    source_id: str
    evidence_id: Optional[str] = None
    confidence: float = 1.0
    state: str = "CONFIGURED_ACCESS"
    metadata: Dict[str, Any] = field(default_factory=dict)
    valid_from: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    observed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class NodeProvenance:
    source_type: str
    source_id: str
    provider: str = "PLATFORM"
    environment: str = "PRODUCTION"
    valid_from: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    valid_until: Optional[datetime] = None
    first_seen_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
