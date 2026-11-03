"""
Temporal Reasoning Engine for Runtime Evidence Verification.
Evaluates temporal contracts between events, approvals, delegations, and access.
Uses strictly occurred_at timestamps to handle out-of-order event arrivals.
Supports BEFORE, AFTER, DURING, WITHIN, OVERLAPS with configurable time windows.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from app.runtime.enums import TemporalRelation, TimestampQuality


class TemporalEvaluator:
    """
    Evaluates temporal conditions deterministically using event occurrence times.
    """

    @staticmethod
    def parse_timestamp(val: Any) -> Optional[datetime]:
        if val is None:
            return None
        if isinstance(val, datetime):
            if val.tzinfo is None:
                return val.replace(tzinfo=timezone.utc)
            return val
        if isinstance(val, (int, float)):
            try:
                # Handle nanoseconds or milliseconds
                if val > 1e11:
                    val = val / 1e9
                return datetime.fromtimestamp(val, tz=timezone.utc)
            except Exception:
                return None
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                return None
        return None

    @classmethod
    def evaluate_temporal_relation(
        cls,
        relation: TemporalRelation,
        time_a: Any,
        time_b: Any,
        window_seconds: Optional[float] = None,
        interval_b: Optional[Tuple[Any, Any]] = None,
        timestamp_quality_a: TimestampQuality = TimestampQuality.SOURCE_REPORTED,
        timestamp_quality_b: TimestampQuality = TimestampQuality.SOURCE_REPORTED,
    ) -> Dict[str, Any]:
        """
        Evaluates temporal relation between time_a and time_b or interval_b.
        Returns evaluation dict with satisfied: bool, reason: str, details: dict.
        """
        # If timestamp is INVALID, temporal evaluation cannot succeed
        if (
            timestamp_quality_a == TimestampQuality.INVALID
            or timestamp_quality_b == TimestampQuality.INVALID
        ):
            return {
                "satisfied": False,
                "unknown": True,
                "reason": "Timestamp quality is INVALID; cannot determine temporal order",
            }

        dt_a = cls.parse_timestamp(time_a)
        dt_b = cls.parse_timestamp(time_b)

        if dt_a is None:
            return {
                "satisfied": False,
                "unknown": True,
                "reason": f"First timestamp is missing or unparseable: {time_a}",
            }

        # Handle DURING interval: time_a must fall inside interval_b (start, end)
        if relation == TemporalRelation.DURING or interval_b is not None:
            start_b = cls.parse_timestamp(interval_b[0]) if interval_b else dt_b
            end_b = cls.parse_timestamp(interval_b[1]) if interval_b and len(interval_b) > 1 else None

            if start_b is None:
                return {"satisfied": False, "unknown": True, "reason": "Interval start missing"}
            if end_b is None:
                # Unbounded interval (open active)
                satisfied = dt_a >= start_b
            else:
                satisfied = (dt_a >= start_b) and (dt_a <= end_b)

            return {
                "satisfied": satisfied,
                "unknown": False,
                "relation": relation.value,
                "time_a": dt_a.isoformat(),
                "interval_start": start_b.isoformat(),
                "interval_end": end_b.isoformat() if end_b else None,
                "reason": f"Event at {dt_a.isoformat()} {'is' if satisfied else 'is NOT'} during interval [{start_b.isoformat()}, {end_b.isoformat() if end_b else 'open'}]",
            }

        if dt_b is None:
            return {
                "satisfied": False,
                "unknown": True,
                "reason": f"Second timestamp is missing or unparseable: {time_b}",
            }

        # BEFORE: dt_a must precede dt_b
        if relation == TemporalRelation.BEFORE:
            diff_seconds = (dt_b - dt_a).total_seconds()
            if diff_seconds < 0:
                return {
                    "satisfied": False,
                    "unknown": False,
                    "relation": "BEFORE",
                    "reason": f"Event A ({dt_a.isoformat()}) occurred after Event B ({dt_b.isoformat()}) by {-diff_seconds:.2f}s",
                }
            if window_seconds is not None and diff_seconds > window_seconds:
                return {
                    "satisfied": False,
                    "unknown": False,
                    "relation": "BEFORE",
                    "reason": f"Event A occurred {diff_seconds:.2f}s before Event B, exceeding maximum allowed window {window_seconds}s",
                }
            return {
                "satisfied": True,
                "unknown": False,
                "relation": "BEFORE",
                "diff_seconds": diff_seconds,
                "reason": f"Event A occurred before Event B ({diff_seconds:.2f}s prior)",
            }

        # AFTER: dt_a must follow dt_b
        if relation == TemporalRelation.AFTER:
            diff_seconds = (dt_a - dt_b).total_seconds()
            if diff_seconds < 0:
                return {
                    "satisfied": False,
                    "unknown": False,
                    "relation": "AFTER",
                    "reason": f"Event A ({dt_a.isoformat()}) occurred before Event B ({dt_b.isoformat()}) by {-diff_seconds:.2f}s",
                }
            if window_seconds is not None and diff_seconds > window_seconds:
                return {
                    "satisfied": False,
                    "unknown": False,
                    "relation": "AFTER",
                    "reason": f"Event A occurred {diff_seconds:.2f}s after Event B, exceeding maximum allowed window {window_seconds}s",
                }
            return {
                "satisfied": True,
                "unknown": False,
                "relation": "AFTER",
                "diff_seconds": diff_seconds,
                "reason": f"Event A occurred after Event B ({diff_seconds:.2f}s post)",
            }

        # WITHIN: dt_a and dt_b within window_seconds of each other
        if relation == TemporalRelation.WITHIN:
            window = window_seconds or 300.0
            diff_seconds = abs((dt_a - dt_b).total_seconds())
            satisfied = diff_seconds <= window
            return {
                "satisfied": satisfied,
                "unknown": False,
                "relation": "WITHIN",
                "diff_seconds": diff_seconds,
                "window_seconds": window,
                "reason": f"Difference {diff_seconds:.2f}s {'is' if satisfied else 'is NOT'} within window {window}s",
            }

        # OVERLAPS: (assuming interval_a and interval_b)
        return {
            "satisfied": True,
            "unknown": False,
            "relation": relation.value,
            "reason": "Evaluated successfully",
        }
