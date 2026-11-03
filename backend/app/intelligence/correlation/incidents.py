"""
Step 20 Change Correlation & Timeline Engine.

Sections 45–49:
Correlates events across domains and produces chronological incident timelines.

RULE 46 — CAUSALITY RULE:
Never state "A caused B" without deterministic proof.
Classifications: TEMPORALLY_ASSOCIATED, POTENTIALLY_RELATED, CAUSALITY_VERIFIED, UNKNOWN.
"""

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone
from app.intelligence.enums import CausalityStatus


class CorrelationTimelineEngine:
    """
    Groups events occurring within related correlation windows into factual incident timelines.
    """

    @staticmethod
    def build_timeline(
        events: List[Dict[str, Any]],
        causality_verified: bool = False,
    ) -> Dict[str, Any]:
        """
        Sorts events chronologically and assigns causality status.
        """
        if not events:
            return {
                "timeline": [],
                "event_count": 0,
                "causality_status": CausalityStatus.UNKNOWN.value,
            }

        # Ensure all events have a datetime timestamp
        def get_event_time(e: Dict[str, Any]) -> datetime:
            t = e.get("observed_at") or e.get("detected_at") or e.get("occurred_at") or e.get("created_at")
            if isinstance(t, str):
                try:
                    return datetime.fromisoformat(t)
                except Exception:
                    pass
            if isinstance(t, datetime):
                return t
            return datetime.now(timezone.utc)

        sorted_events = sorted(events, key=get_event_time)

        timeline_entries = []
        for ev in sorted_events:
            ev_time = get_event_time(ev)
            timeline_entries.append({
                "timestamp": ev_time.isoformat(),
                "event_type": ev.get("event_type") or ev.get("drift_type", "UNKNOWN_EVENT"),
                "source": ev.get("source_type") or ev.get("resource_type", "SYSTEM"),
                "resource_id": ev.get("resource_id", "UNKNOWN"),
                "details": ev.get("details") or ev.get("metadata", {}),
            })

        first_time = get_event_time(sorted_events[0])
        last_time = get_event_time(sorted_events[-1])

        causality = (
            CausalityStatus.CAUSALITY_VERIFIED.value
            if causality_verified
            else CausalityStatus.TEMPORALLY_ASSOCIATED.value
        )

        return {
            "causality_status": causality,
            "timeline": timeline_entries,
            "first_event_at": first_time,
            "last_event_at": last_time,
            "event_count": len(timeline_entries),
            "summary": f"Grouped {len(timeline_entries)} events between {first_time.isoformat()} and {last_time.isoformat()}.",
        }
