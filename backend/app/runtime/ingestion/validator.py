"""
Evidence Ingestion Validation.
Enforces size limits, timestamp validity, and structural invariants.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from app.runtime.enums import EvidenceSourceType, EvidenceEventType

MAX_PAYLOAD_BYTES = 2 * 1024 * 1024  # 2MB
MAX_FUTURE_SKEW_MINUTES = 15
MAX_PAST_SKEW_DAYS = 365


class EvidenceValidationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class EvidenceValidator:
    @classmethod
    def validate_ingestion_payload(
        cls,
        source_type: str,
        source_id: str,
        event_type: str,
        occurred_at: datetime,
        payload_size_bytes: int = 0,
    ) -> None:
        if not source_id or len(source_id.strip()) == 0:
            raise EvidenceValidationError("INVALID_SOURCE_ID", "Source ID must not be empty.")

        if payload_size_bytes > MAX_PAYLOAD_BYTES:
            raise EvidenceValidationError(
                "PAYLOAD_OVERSIZED",
                f"Payload size {payload_size_bytes} exceeds limit of {MAX_PAYLOAD_BYTES} bytes.",
            )

        now = datetime.now(timezone.utc)
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)

        if occurred_at > now + timedelta(minutes=MAX_FUTURE_SKEW_MINUTES):
            raise EvidenceValidationError(
                "TIMESTAMP_IN_FUTURE",
                f"Occurred timestamp {occurred_at.isoformat()} is too far in the future.",
            )

        if occurred_at < now - timedelta(days=MAX_PAST_SKEW_DAYS):
            raise EvidenceValidationError(
                "TIMESTAMP_TOO_OLD",
                f"Occurred timestamp {occurred_at.isoformat()} exceeds maximum age of {MAX_PAST_SKEW_DAYS} days.",
            )

    @classmethod
    def validate_event_size(cls, size_bytes: int):
        if size_bytes > MAX_PAYLOAD_BYTES:
            return False, f"Payload size {size_bytes} exceeds maximum of {MAX_PAYLOAD_BYTES} bytes."
        return True, None

    @classmethod
    def validate_timestamp_skew(cls, occurred_at: datetime):
        from app.runtime.enums import TimestampQuality
        now = datetime.now(timezone.utc)
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)

        if occurred_at > now + timedelta(minutes=MAX_FUTURE_SKEW_MINUTES):
            return False, TimestampQuality.INVALID, "Timestamp too far in future"
        if occurred_at < now - timedelta(days=MAX_PAST_SKEW_DAYS):
            return False, TimestampQuality.ESTIMATED, "Timestamp older than retention limit"
        return True, TimestampQuality.SOURCE_REPORTED, None
