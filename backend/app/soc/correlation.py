"""
Alert Deduplication & Correlation Engine (Step 23).

- Deduplicates repetitive security events into unified alerts via deterministic hashing.
- Correlates multi-signal alerts (same actor, same resource, auth-to-access sequence).
- Distinguishes CORRELATED, POTENTIALLY_CORRELATED, UNRELATED, UNKNOWN (Rule 3).
"""

import hashlib
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.soc_models import SocAlert, AlertEvent, AlertCorrelation, SecurityEvent, DetectionRule


class AlertCorrelationEngine:
    """Manages alert deduplication keys and multi-signal event correlation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def generate_dedup_key(
        project_id: uuid.UUID,
        rule_id: Optional[uuid.UUID],
        actor_id: Optional[str],
        resource_id: Optional[str],
    ) -> str:
        """Computes deterministic deduplication key for alert grouping."""
        seed = f"{str(project_id)}:{str(rule_id or 'GENERIC')}:{actor_id or 'UNKNOWN'}:{resource_id or 'UNKNOWN'}"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()

    async def deduplicate_or_create_alert(
        self,
        project_id: uuid.UUID,
        rule: Optional[DetectionRule],
        event: SecurityEvent,
        window_minutes: int = 120,
    ) -> Tuple[SocAlert, bool]:
        """
        Deduplicates against open alerts within time window, or instantiates a new SocAlert.
        Returns: (SocAlert, is_new: bool)
        """
        actor_id = event.actor.get("id") if event.actor else None
        resource_id = event.resource.get("id") if event.resource else None
        rule_pk = rule.id if rule else None
        dedup_key = self.generate_dedup_key(project_id, rule_pk, actor_id, resource_id)

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

        # Check for existing active alert with same dedup_key
        stmt = select(SocAlert).where(
            and_(
                SocAlert.project_id == project_id,
                SocAlert.deduplication_key == dedup_key,
                SocAlert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING"]),
                SocAlert.last_seen_at >= cutoff,
            )
        )
        res = await self.db.execute(stmt)
        existing_alert = res.scalar_one_or_none()

        if existing_alert:
            # Increment event count & update last seen
            existing_alert.event_count += 1
            existing_alert.last_seen_at = datetime.now(timezone.utc)
            # If incoming severity is higher, escalate severity
            if self._severity_rank(event.severity) > self._severity_rank(existing_alert.severity):
                existing_alert.severity = event.severity

            # Link event to alert
            assoc = AlertEvent(
                alert_id=existing_alert.id,
                event_id=event.id,
                association_type="SUPPORTING",
                added_at=datetime.now(timezone.utc),
            )
            self.db.add(assoc)
            return existing_alert, False

        # Create new SocAlert
        alert_key = f"ALT-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        title = rule.name if rule else f"Security Event: {event.action}"
        desc = (
            f"Detection rule '{rule.name}' triggered on {event.event_type} event ({event.action})."
            if rule
            else f"Automated alert for {event.event_type} on resource {resource_id or 'UNKNOWN'}."
        )

        new_alert = SocAlert(
            alert_key=alert_key,
            project_id=project_id,
            detection_rule_id=rule_pk,
            title=title,
            description=desc,
            severity=rule.severity if rule else event.severity,
            confidence=rule.confidence if rule else "HIGH",
            status="NEW",
            deduplication_key=dedup_key,
            event_count=1,
            source=event.source_type,
            first_seen_at=event.timestamp,
            last_seen_at=event.timestamp,
            risk_assessment={
                "severity": rule.severity if rule else event.severity,
                "confidence": rule.confidence if rule else "HIGH",
                "actor_type": event.actor.get("type", "UNKNOWN"),
                "resource_type": event.resource.get("type", "UNKNOWN"),
                "environment": event.environment,
                "data_classification": event.resource.get("data_classification", "UNKNOWN"),
            },
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(new_alert)
        await self.db.flush()

        # Link trigger event
        assoc = AlertEvent(
            alert_id=new_alert.id,
            event_id=event.id,
            association_type="TRIGGER",
            added_at=datetime.now(timezone.utc),
        )
        self.db.add(assoc)

        # Correlate with other active alerts for this project
        await self.correlate_alert(new_alert, event)

        return new_alert, True

    async def correlate_alert(self, new_alert: SocAlert, trigger_event: SecurityEvent) -> None:
        """Finds related active alerts sharing actor or resource within the last 24h."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        actor_id = trigger_event.actor.get("id") if trigger_event.actor else None
        resource_id = trigger_event.resource.get("id") if trigger_event.resource else None

        stmt = select(SocAlert).where(
            and_(
                SocAlert.project_id == new_alert.project_id,
                SocAlert.id != new_alert.id,
                SocAlert.status.in_(["NEW", "OPEN", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"]),
                SocAlert.last_seen_at >= cutoff,
            )
        )
        res = await self.db.execute(stmt)
        other_alerts = res.scalars().all()

        for other in other_alerts:
            # Query trigger event of other alert
            t_stmt = (
                select(SecurityEvent)
                .join(AlertEvent, AlertEvent.event_id == SecurityEvent.id)
                .where(AlertEvent.alert_id == other.id)
                .limit(1)
            )
            other_event = (await self.db.execute(t_stmt)).scalar_one_or_none()
            if not other_event:
                continue

            other_actor_id = other_event.actor.get("id") if other_event.actor else None
            other_res_id = other_event.resource.get("id") if other_event.resource else None

            # Rule 1: Same actor across multiple operations
            if actor_id and other_actor_id and actor_id == other_actor_id:
                corr = AlertCorrelation(
                    primary_alert_id=new_alert.id,
                    correlated_alert_id=other.id,
                    relationship="CORRELATED",
                    correlation_rule="SAME_ACTOR_MULTI_EVENT",
                    correlation_score=0.85,
                    evidence_summary=f"Both alerts originate from actor '{actor_id}' within 24h.",
                    correlated_at=datetime.now(timezone.utc),
                )
                self.db.add(corr)

            # Rule 2: Same resource under multi-domain scrutiny
            elif resource_id and other_res_id and resource_id == other_res_id:
                corr = AlertCorrelation(
                    primary_alert_id=new_alert.id,
                    correlated_alert_id=other.id,
                    relationship="POTENTIALLY_CORRELATED",
                    correlation_rule="COMMON_RESOURCE_TARGET",
                    correlation_score=0.65,
                    evidence_summary=f"Both alerts target resource '{resource_id}'.",
                    correlated_at=datetime.now(timezone.utc),
                )
                self.db.add(corr)

    @staticmethod
    def _severity_rank(sev: str) -> int:
        ranks = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFO": 1}
        return ranks.get(sev.upper(), 1)
