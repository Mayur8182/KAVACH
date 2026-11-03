"""
Step 21 Incident Timeline Reconstruction Engine.

Sections 27–29:
Reconstructs unified chronological incident timelines from multiple cross-domain sources.
Confidence states: OBSERVED, INFERRED, HYPOTHESIZED, VERIFIED, CONTRADICTED, UNKNOWN.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.incidents.enums import TimelineConfidence


class IncidentTimelineEngine:
    """
    Sorts and classifies incident timeline events chronologically with factual confidence markers.
    """

    @staticmethod
    def parse_timestamp(val: Any) -> datetime:
        if isinstance(val, datetime):
            if val.tzinfo is None:
                return val.replace(tzinfo=timezone.utc)
            return val
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val)
                if dt.tzinfo is None:
                    return dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
        return datetime.now(timezone.utc)

    @classmethod
    def reconstruct_timeline(
        cls,
        raw_events: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Sorts raw forensic and system events by factual event_time (NOT ingestion order).
        Assigns confidence level and formats entries.
        """
        if not raw_events:
            return []

        formatted_events = []
        for ev in raw_events:
            event_time = cls.parse_timestamp(
                ev.get("event_time") or ev.get("observed_at") or ev.get("timestamp") or ev.get("detected_at")
            )
            confidence = ev.get("confidence", TimelineConfidence.OBSERVED.value)
            
            # Verify confidence string validity
            if isinstance(confidence, TimelineConfidence):
                conf_str = confidence.value
            elif confidence in [c.value for c in TimelineConfidence]:
                conf_str = confidence
            else:
                conf_str = TimelineConfidence.UNKNOWN.value

            formatted_events.append({
                "event_time": event_time,
                "event_type": ev.get("event_type") or ev.get("signal_type") or "SECURITY_EVENT",
                "source_type": ev.get("source_type") or "SYSTEM",
                "source_id": str(ev.get("source_id") or "UNKNOWN"),
                "description": ev.get("description") or ev.get("explanation") or f"Event occurred on {ev.get('resource_id', 'target')}",
                "evidence_id": ev.get("evidence_id"),
                "actor_type": ev.get("actor_type"),
                "actor_id": ev.get("actor_id"),
                "resource_type": ev.get("resource_type"),
                "resource_id": ev.get("resource_id"),
                "confidence": conf_str,
            })

        # Sort strictly by event_time (Sec 29, Test 102)
        formatted_events.sort(key=lambda x: x["event_time"])
        return formatted_events
