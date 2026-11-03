"""
Event Deduplication and Idempotency Key Generator.
Prevents duplicate runtime events from generating duplicate security violations.
"""

import hashlib
from datetime import datetime
from typing import Optional


class EvidenceDeduplicator:
    @staticmethod
    def generate_event_id(
        source_id: str,
        source_event_id: Optional[str],
        event_type: str,
        occurred_at: datetime,
        payload_hash: str,
    ) -> str:
        """
        Generates a deterministic idempotent event ID if not explicitly provided.
        """
        if source_event_id:
            # Deterministic prefix with source event id
            combined = f"{source_id}:{source_event_id}"
            return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:32]

        # Fingerprint of stable event attributes
        time_str = occurred_at.isoformat() if hasattr(occurred_at, "isoformat") else str(occurred_at)
        fingerprint = f"{source_id}:{event_type}:{time_str}:{payload_hash}"
        return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:32]
