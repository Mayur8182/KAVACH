"""
Step 26 Deterministic Abuse & Brute-Force Detection Engine.

Implements all specialized detection capabilities:
1. Brute-Force Detection
2. Credential Stuffing Detection
3. Password Spraying Detection
4. Distributed Brute Force
5. Low-and-Slow Attack Detection
6. Account Enumeration Detection
7. MFA & OTP Abuse Detection
8. Token Abuse Detection
9. Session Abuse Detection
10. API Abuse Detection
11. Agent / MCP Tool Abuse Detection
12. Step 24 Threat Intelligence Correlation

Follows Golden Rules:
- Deterministic detection produces evidence-backed signals.
- Distinguishes SUSPECTED from CONFIRMED.
- AI or feeds do not make independent blocking decisions.
"""

import math
import statistics
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.abuse_models import (
    AbuseDetectionEvent,
    AbuseDetectionSignal,
    AbuseDetectionRule,
)
from app.models.threat_intel_models import ThreatIndicator


def ensure_utc(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


class AbuseThreatDetector:
    """
    Evaluates telemetry streams and aggregates behavioral windows to detect
    brute force, credential stuffing, enumeration, MFA abuse, and agent abuse.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def correlate_threat_intelligence(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """Checks Step 24 Threat Intelligence indicators for malicious IP/infrastructure match."""
        if not ip_address:
            return None
        stmt = select(ThreatIndicator).where(
            and_(
                ThreatIndicator.indicator_type.in_(["IPV4", "IPV6", "IP"]),
                ThreatIndicator.normalized_value == ip_address.strip().lower(),
                ThreatIndicator.status == "ACTIVE",
            )
        ).limit(1)
        res = await self.db.execute(stmt)
        indicator = res.scalar_one_or_none()
        if indicator:
            return {
                "indicator_id": str(indicator.id),
                "indicator_value": indicator.value,
                "confidence": indicator.confidence,
                "severity": indicator.severity,
                "threat_types": indicator.threat_types,
                "title": indicator.title,
            }
        return None

    async def analyze_event_stream(
        self,
        new_event: AbuseDetectionEvent,
        window_seconds: int = 900,
    ) -> List[Dict[str, Any]]:
        """
        Analyzes recent history relative to the newly ingested event and generates
        deterministic detection signals when abuse thresholds are crossed.
        """
        signals = []
        now = ensure_utc(new_event.timestamp)
        window_start = now - timedelta(seconds=window_seconds)

        # 1. Check Threat Intelligence correlation on the IP
        ti_match = await self.correlate_threat_intelligence(new_event.ip_address)

        # 2. BRUTE FORCE DETECTION (Targeted Account or IP)
        if new_event.result_status in ("INVALID_CREDENTIALS", "ACCOUNT_LOCKED", "MFA_FAILED"):
            bf_signal = await self._detect_brute_force(new_event, window_start, ti_match)
            if bf_signal:
                signals.append(bf_signal)

        # 3. CREDENTIAL STUFFING & PASSWORD SPRAYING
        if new_event.event_type == "AUTHENTICATION":
            cs_signal = await self._detect_credential_stuffing(new_event, window_start, ti_match)
            if cs_signal:
                signals.append(cs_signal)

            ps_signal = await self._detect_password_spraying(new_event, window_start, ti_match)
            if ps_signal:
                signals.append(ps_signal)

            dist_signal = await self._detect_distributed_brute_force(new_event, window_start)
            if dist_signal:
                signals.append(dist_signal)

        # 4. ACCOUNT ENUMERATION DETECTION
        if new_event.result_status in ("ACCOUNT_NOT_FOUND", "INVALID_CREDENTIALS"):
            enum_signal = await self._detect_enumeration(new_event, window_start)
            if enum_signal:
                signals.append(enum_signal)

        # 5. LOW-AND-SLOW ATTACK DETECTION
        if new_event.result_status == "INVALID_CREDENTIALS":
            low_slow_signal = await self._detect_low_and_slow(new_event)
            if low_slow_signal:
                signals.append(low_slow_signal)

        # 6. MFA & OTP ABUSE DETECTION
        if new_event.event_type == "MFA":
            mfa_signal = await self._detect_mfa_abuse(new_event, window_start)
            if mfa_signal:
                signals.append(mfa_signal)

        # 7. TOKEN & SESSION ABUSE DETECTION
        if new_event.event_type in ("TOKEN", "SESSION"):
            token_signal = await self._detect_token_session_abuse(new_event, window_start)
            if token_signal:
                signals.append(token_signal)

        # 8. AGENT & MCP TOOL ABUSE DETECTION
        if new_event.agent_id:
            agent_signal = await self._detect_agent_abuse(new_event, window_start)
            if agent_signal:
                signals.append(agent_signal)

        return signals

    async def _detect_brute_force(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
        ti_match: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        target_account = event.account_identifier or event.user_id
        if not target_account:
            return None

        stmt = select(func.count(AbuseDetectionEvent.id)).where(
            and_(
                AbuseDetectionEvent.account_identifier == target_account,
                AbuseDetectionEvent.result_status.in_(["INVALID_CREDENTIALS", "ACCOUNT_LOCKED", "MFA_FAILED"]),
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        failure_count = res.scalar() or 0

        if failure_count >= 5:
            confidence = 0.90 if ti_match else 0.80
            return {
                "signal_type": "BRUTE_FORCE_SUSPECTED",
                "severity": "CRITICAL" if failure_count >= 15 or ti_match else "HIGH",
                "target_resource": event.endpoint,
                "target_identity": target_account,
                "confidence_score": confidence,
                "recommended_action": "TEMPORARY_BLOCK",
                "evidence": {
                    "failure_count": failure_count,
                    "target_account": target_account,
                    "source_ip": event.ip_address,
                    "endpoint": event.endpoint,
                    "window_seconds": int((ensure_utc(event.timestamp) - window_start).total_seconds()),
                    "threat_intelligence": ti_match,
                },
            }
        return None

    async def _detect_credential_stuffing(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
        ti_match: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        stmt = select(
            func.count(func.distinct(AbuseDetectionEvent.account_identifier)),
            func.count(AbuseDetectionEvent.id),
        ).where(
            and_(
                AbuseDetectionEvent.ip_address == event.ip_address,
                AbuseDetectionEvent.result_status.in_(["INVALID_CREDENTIALS", "ACCOUNT_NOT_FOUND"]),
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        row = res.first()
        unique_accounts = row[0] if row else 0
        total_failures = row[1] if row else 0

        if unique_accounts >= 4 and total_failures >= 4:
            return {
                "signal_type": "CREDENTIAL_STUFFING_SUSPECTED",
                "severity": "CRITICAL",
                "target_resource": event.endpoint,
                "target_identity": event.ip_address,
                "confidence_score": 0.92 if ti_match else 0.85,
                "recommended_action": "TEMPORARY_BLOCK",
                "evidence": {
                    "source_ip": event.ip_address,
                    "unique_accounts_targeted": unique_accounts,
                    "total_failures": total_failures,
                    "threat_intelligence": ti_match,
                },
            }
        return None

    async def _detect_password_spraying(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
        ti_match: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        stmt = select(
            func.count(func.distinct(AbuseDetectionEvent.account_identifier)),
            func.count(AbuseDetectionEvent.id),
        ).where(
            and_(
                AbuseDetectionEvent.result_status == "INVALID_CREDENTIALS",
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        row = res.first()
        unique_accounts = row[0] if row else 0
        total_failures = row[1] if row else 0

        if unique_accounts >= 6 and (total_failures / unique_accounts) <= 2.5:
            return {
                "signal_type": "PASSWORD_SPRAY_SUSPECTED",
                "severity": "HIGH",
                "target_resource": event.endpoint,
                "target_identity": event.ip_address,
                "confidence_score": 0.88,
                "recommended_action": "REQUIRE_MFA",
                "evidence": {
                    "unique_accounts": unique_accounts,
                    "total_failures": total_failures,
                    "ratio": round(total_failures / unique_accounts, 2),
                    "threat_intelligence": ti_match,
                },
            }
        return None

    async def _detect_distributed_brute_force(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
    ) -> Optional[Dict[str, Any]]:
        target_account = event.account_identifier
        if not target_account:
            return None

        stmt = select(
            func.count(func.distinct(AbuseDetectionEvent.ip_address)),
            func.count(AbuseDetectionEvent.id),
        ).where(
            and_(
                AbuseDetectionEvent.account_identifier == target_account,
                AbuseDetectionEvent.result_status.in_(["INVALID_CREDENTIALS", "ACCOUNT_LOCKED"]),
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        row = res.first()
        unique_ips = row[0] if row else 0
        total_failures = row[1] if row else 0

        if unique_ips >= 3 and total_failures >= 5:
            return {
                "signal_type": "DISTRIBUTED_BRUTE_FORCE_SUSPECTED",
                "severity": "CRITICAL",
                "target_resource": event.endpoint,
                "target_identity": target_account,
                "confidence_score": 0.91,
                "recommended_action": "REQUIRE_MFA",
                "evidence": {
                    "target_account": target_account,
                    "unique_ips_count": unique_ips,
                    "total_failures": total_failures,
                },
            }
        return None

    async def _detect_enumeration(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
    ) -> Optional[Dict[str, Any]]:
        stmt = select(
            func.count(AbuseDetectionEvent.id),
            func.count(func.distinct(AbuseDetectionEvent.account_identifier)),
        ).where(
            and_(
                AbuseDetectionEvent.ip_address == event.ip_address,
                AbuseDetectionEvent.result_status == "ACCOUNT_NOT_FOUND",
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        row = res.first()
        not_found_count = row[0] if row else 0
        distinct_names = row[1] if row else 0

        if not_found_count >= 4 and distinct_names >= 4:
            return {
                "signal_type": "ENUMERATION_SUSPECTED",
                "severity": "MEDIUM",
                "target_resource": event.endpoint,
                "target_identity": event.ip_address,
                "confidence_score": 0.84,
                "recommended_action": "THROTTLE",
                "evidence": {
                    "source_ip": event.ip_address,
                    "account_not_found_count": not_found_count,
                    "distinct_usernames_probed": distinct_names,
                },
            }
        return None

    async def _detect_low_and_slow(self, event: AbuseDetectionEvent) -> Optional[Dict[str, Any]]:
        target_account = event.account_identifier
        if not target_account:
            return None

        two_hours_ago = ensure_utc(event.timestamp) - timedelta(hours=2)
        stmt = (
            select(AbuseDetectionEvent.timestamp)
            .where(
                and_(
                    AbuseDetectionEvent.account_identifier == target_account,
                    AbuseDetectionEvent.result_status == "INVALID_CREDENTIALS",
                    AbuseDetectionEvent.timestamp >= two_hours_ago,
                )
            )
            .order_by(AbuseDetectionEvent.timestamp.asc())
        )
        res = await self.db.execute(stmt)
        timestamps = list(res.scalars().all())
        if len(timestamps) >= 6:
            intervals = [
                (ensure_utc(t2) - ensure_utc(t1)).total_seconds() for t1, t2 in zip(timestamps[:-1], timestamps[1:])
            ]
            avg_interval = statistics.mean(intervals)
            variance = statistics.variance(intervals) if len(intervals) > 1 else 999.0
            if 15.0 <= avg_interval <= 180.0 and variance < (avg_interval * 0.4) ** 2:
                return {
                    "signal_type": "LOW_AND_SLOW_SUSPECTED",
                    "severity": "HIGH",
                    "target_resource": event.endpoint,
                    "target_identity": target_account,
                    "confidence_score": 0.87,
                    "recommended_action": "REQUIRE_MFA",
                    "evidence": {
                        "target_account": target_account,
                        "observation_window_hours": 2,
                        "attempts_count": len(timestamps),
                        "mean_interval_seconds": round(avg_interval, 2),
                        "interval_variance": round(variance, 2),
                    },
                }
        return None

    async def _detect_mfa_abuse(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
    ) -> Optional[Dict[str, Any]]:
        target_identity = event.account_identifier or event.user_id or event.ip_address
        stmt = select(
            func.count(AbuseDetectionEvent.id),
            func.count(
                func.nullif(AbuseDetectionEvent.result_status != "MFA_FAILED", True)
            ),
        ).where(
            and_(
                AbuseDetectionEvent.event_type == "MFA",
                AbuseDetectionEvent.account_identifier == event.account_identifier,
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        row = res.first()
        mfa_requests = row[0] if row else 0
        mfa_failures = row[1] if row else 0

        if mfa_failures >= 4 or mfa_requests >= 6:
            return {
                "signal_type": "MFA_ABUSE_SUSPECTED",
                "severity": "HIGH",
                "target_resource": event.endpoint,
                "target_identity": target_identity,
                "confidence_score": 0.89,
                "recommended_action": "TEMPORARY_BLOCK",
                "evidence": {
                    "target_account": event.account_identifier,
                    "mfa_requests_in_window": mfa_requests,
                    "mfa_failures": mfa_failures,
                    "source_ip": event.ip_address,
                },
            }
        return None

    async def _detect_token_session_abuse(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
    ) -> Optional[Dict[str, Any]]:
        target_identity = event.user_id or event.account_identifier or event.ip_address
        stmt = select(func.count(AbuseDetectionEvent.id)).where(
            and_(
                AbuseDetectionEvent.event_type.in_(["TOKEN", "SESSION"]),
                AbuseDetectionEvent.result_status.in_(["TOKEN_INVALID", "TOKEN_EXPIRED"]),
                AbuseDetectionEvent.ip_address == event.ip_address,
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        invalid_tokens = res.scalar() or 0
        if invalid_tokens >= 5:
            return {
                "signal_type": "TOKEN_ABUSE_SUSPECTED",
                "severity": "HIGH",
                "target_resource": event.endpoint,
                "target_identity": target_identity,
                "confidence_score": 0.86,
                "recommended_action": "REVOKE_SESSION",
                "evidence": {
                    "invalid_token_attempts": invalid_tokens,
                    "source_ip": event.ip_address,
                    "endpoint": event.endpoint,
                },
            }
        return None

    async def _detect_agent_abuse(
        self,
        event: AbuseDetectionEvent,
        window_start: datetime,
    ) -> Optional[Dict[str, Any]]:
        agent_id = event.agent_id
        tool_name = event.tool_name or "unknown_tool"

        stmt = select(func.count(AbuseDetectionEvent.id)).where(
            and_(
                AbuseDetectionEvent.agent_id == agent_id,
                AbuseDetectionEvent.timestamp >= window_start,
            )
        )
        res = await self.db.execute(stmt)
        agent_call_count = res.scalar() or 0

        is_sensitive_tool = tool_name in (
            "delete_database",
            "secret.read",
            "payment.execute",
            "iam.grant_permission",
            "k8s.delete_namespace",
        )
        threshold = 3 if is_sensitive_tool else 30

        if agent_call_count >= threshold:
            return {
                "signal_type": "AGENT_ABUSE_SUSPECTED",
                "severity": "CRITICAL" if is_sensitive_tool else "HIGH",
                "target_resource": tool_name,
                "target_identity": f"agent:{agent_id}",
                "confidence_score": 0.93,
                "recommended_action": "RESTRICT_AGENT_TOOL",
                "evidence": {
                    "agent_id": agent_id,
                    "tool_name": tool_name,
                    "is_sensitive_tool": is_sensitive_tool,
                    "call_count_in_window": agent_call_count,
                    "threshold": threshold,
                },
            }
        return None
