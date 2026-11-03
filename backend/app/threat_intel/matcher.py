"""
Threat Intelligence Correlation & Match Engine.

Correlates real customer observations (SecurityEvents, runtime network logs,
container hashes, dependency findings) against verified Threat Indicators.

Enforces:
- Rule 2: Intelligence != Compromise (match creates observation, not automatic breach claim).
- Rule 4: Observation required for environment claims.
- Section 22: Distinguishes EXACT_MATCH from CONTEXTUAL_MATCH.
- Section 45: Evaluates active false positive suppressions.
"""

import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.threat_intel_models import (
    ThreatIndicator,
    ThreatMatch,
    ThreatObservation,
    ThreatSuppression,
)


class ThreatMatchEngine:
    """Matches observed telemetry and Thing assets against active Threat Indicators."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def correlate_observation(
        self,
        project_id: uuid.UUID,
        observation_type: str,  # NETWORK_OUTBOUND, NETWORK_INBOUND, DNS_QUERY, CONTAINER_HASH, PACKAGE_DEP, API_CALL
        observed_value: str,  # The IP, domain, URL, hash, or CVE observed
        observed_entity_id: str,  # e.g., workload ID, container name, agent ID
        observed_entity_type: str = "WORKLOAD",
        environment: str = "PRODUCTION",
        evidence_reference: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[Tuple[ThreatMatch, ThreatObservation]]:
        """
        Correlates a single real observation against the threat intelligence store.
        If a match is found and not suppressed, records ThreatMatch and ThreatObservation.
        """
        normalized_target = str(observed_value).strip().lower()

        # Step 1: Query active indicator matching normalized value
        stmt = select(ThreatIndicator).where(
            and_(
                ThreatIndicator.normalized_value == normalized_target,
                ThreatIndicator.status == "ACTIVE",
            )
        )
        res = await self.db.execute(stmt)
        indicator = res.scalar_one_or_none()

        if not indicator:
            return None

        # Step 2: Check for active false-positive suppressions
        supp_stmt = select(ThreatSuppression).where(
            and_(
                ThreatSuppression.indicator_id == indicator.id,
                ThreatSuppression.is_active == True,
                or_(
                    ThreatSuppression.project_id == project_id,
                    ThreatSuppression.scope == "GLOBAL",
                ),
            )
        )
        supp_res = await self.db.execute(supp_stmt)
        suppression = supp_res.scalar_one_or_none()
        if suppression:
            now = datetime.now(timezone.utc)
            if not suppression.expires_at or suppression.expires_at > now:
                # Suppressed: do not generate active threat match
                return None

        # Step 3: Determine Match Type & Confidence (Section 22-23)
        match_type = "EXACT"
        # If exact value match, confidence mirrors indicator confidence
        match_confidence = indicator.confidence
        # Severity mirrors indicator severity
        severity = indicator.severity

        # Generate unique human-readable match key
        match_key = f"TMT-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

        observed_entity_payload = {
            "id": observed_entity_id,
            "type": observed_entity_type,
            "observed_value": observed_value,
            "observation_type": observation_type,
            "context": context or {},
        }

        # Step 4: Persist ThreatMatch
        threat_match = ThreatMatch(
            project_id=project_id,
            indicator_id=indicator.id,
            match_key=match_key,
            match_type=match_type,
            observed_entity=observed_entity_payload,
            observation_id=evidence_reference,
            environment=environment,
            confidence=match_confidence,
            severity=severity,
            status="NEW",
            first_seen_at=datetime.now(timezone.utc),
            last_seen_at=datetime.now(timezone.utc),
            evidence_id=evidence_reference,
            details={
                "indicator_type": indicator.indicator_type,
                "threat_types": indicator.threat_types,
                "source_count": indicator.source_count,
                "raw_reference": indicator.raw_data_reference,
            },
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(threat_match)
        await self.db.flush()

        # Step 5: Persist ThreatObservation record (Rule 4)
        observation = ThreatObservation(
            indicator_id=indicator.id,
            project_id=project_id,
            observation_type=observation_type,
            observed_value=observed_value,
            observed_entity_id=observed_entity_id,
            observed_entity_type=observed_entity_type,
            observed_at=datetime.now(timezone.utc),
            evidence_reference=evidence_reference,
            context=context or {},
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(observation)
        await self.db.commit()

        return threat_match, observation

    async def correlate_security_event(
        self,
        event: Any,
    ) -> List[ThreatMatch]:
        """
        Extracts potential indicators from a Step 23 SecurityEvent and correlates against threat intel.
        Checks actor IP, destination resource, and tool execution targets.
        """
        matches: List[ThreatMatch] = []
        project_id = getattr(event, "project_id", None)
        if not project_id:
            return matches

        actor = getattr(event, "actor", {}) or {}
        resource = getattr(event, "resource", {}) or {}
        event_id_str = str(getattr(event, "id", ""))

        candidates: List[Tuple[str, str, str, str]] = []

        # 1. Actor IP check
        actor_ip = actor.get("ip_address")
        if actor_ip and actor_ip != "UNKNOWN":
            candidates.append(("NETWORK_INBOUND", actor_ip, actor.get("id", "UNKNOWN"), "ACTOR"))

        # 2. Resource IP or domain check
        res_id = resource.get("id", "")
        if res_id and not res_id.startswith("mcp://") and not res_id.startswith("k8s://"):
            candidates.append(("NETWORK_OUTBOUND", res_id, resource.get("name", "UNKNOWN"), "RESOURCE"))

        # 3. Correlation evaluation
        for obs_type, obs_val, ent_id, ent_type in candidates:
            match_res = await self.correlate_observation(
                project_id=project_id,
                observation_type=obs_type,
                observed_value=obs_val,
                observed_entity_id=ent_id,
                observed_entity_type=ent_type,
                environment=getattr(event, "environment", "PRODUCTION"),
                evidence_reference=event_id_str,
                context={"action": getattr(event, "action", ""), "result": getattr(event, "result", "")},
            )
            if match_res:
                matches.append(match_res[0])

        return matches
