"""
Step 20 Continuous Security Intelligence Service.

Coordinating:
- Drift detection, persistence, and verification
- Behavioral baseline management and anomaly evaluation
- Control freshness checks
- Continuous verification job scheduling
- Incident correlation and timeline generation
- Adaptive recommendations workflow
- Factual intelligence summary (Rule 55: no security scores)
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intelligence_models import (
    SecurityDriftEvent,
    SecurityControlFreshness,
    SecurityVerificationJob,
    SecurityBehaviorBaseline,
    SecurityBehaviorEvent,
    SecurityChangeCorrelation,
    SecurityControlEffectiveness,
    SecurityPolicyRecommendation,
    SecurityRequirementRecommendation,
    SecurityIntelligenceEvent,
)
from app.intelligence.enums import (
    DriftType,
    DriftStatus,
    TriggerType,
    ControlFreshnessStatus,
    RecommendationStatus,
    IntelligenceEventType,
)
from app.intelligence.drift.detector import DriftDetector
from app.intelligence.behavior.baseline import BaselineCalculator
from app.intelligence.behavior.detector import BehaviorDetector
from app.intelligence.controls.freshness import ControlFreshnessEvaluator
from app.intelligence.controls.effectiveness import ControlEffectivenessAnalyzer
from app.intelligence.verification.planner import VerificationPlanner
from app.intelligence.correlation.incidents import CorrelationTimelineEngine
from app.intelligence.adaptive.recommendations import AdaptiveRecommendationEngine


class SecurityIntelligenceService:
    """
    Central continuous security intelligence service.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------------
    # Drift Management
    # ------------------------------------------------------------------------
    async def record_drift_event(
        self,
        project_id: uuid.UUID,
        resource_type: str,
        resource_id: str,
        previous_state: Dict[str, Any],
        current_state: Dict[str, Any],
        drift_type: DriftType,
        source_event_id: Optional[str] = None,
        environment: str = "PRODUCTION",
        evidence_id: Optional[str] = None,
    ) -> Optional[SecurityDriftEvent]:
        """
        Detects differences and records a persistent SecurityDriftEvent.
        """
        detected = DriftDetector.detect_state_drift(
            project_id=project_id,
            resource_type=resource_type,
            resource_id=resource_id,
            previous_state=previous_state,
            current_state=current_state,
            drift_type=drift_type,
            source_event_id=source_event_id,
            environment=environment,
            evidence_id=evidence_id,
        )

        if not detected:
            return None

        event = SecurityDriftEvent(
            project_id=project_id,
            drift_type=detected["drift_type"],
            resource_type=detected["resource_type"],
            resource_id=detected["resource_id"],
            source_event_id=detected["source_event_id"],
            previous_state=detected["previous_state"],
            current_state=detected["current_state"],
            environment=detected["environment"],
            severity_context=detected["severity_context"],
            status=detected["status"],
            evidence_id=detected["evidence_id"],
            metadata_=detected["metadata"],
        )
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)

        # Emit intelligence event
        await self.record_intelligence_event(
            project_id=project_id,
            event_type=IntelligenceEventType.DRIFT_DETECTED.value,
            source_type=resource_type,
            source_id=resource_id,
            severity=detected["severity_context"],
            metadata={"drift_id": str(event.id), "drift_type": detected["drift_type"]},
        )

        return event

    async def list_drift_events(
        self,
        project_id: uuid.UUID,
        drift_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[SecurityDriftEvent]:
        conditions = [SecurityDriftEvent.project_id == project_id]
        if drift_type:
            conditions.append(SecurityDriftEvent.drift_type == drift_type)
        if status:
            conditions.append(SecurityDriftEvent.status == status)

        stmt = select(SecurityDriftEvent).where(and_(*conditions)).order_by(SecurityDriftEvent.detected_at.desc()).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def dismiss_drift(
        self,
        drift_id: uuid.UUID,
        dismissed_by: str,
        reason: str,
    ) -> Optional[SecurityDriftEvent]:
        stmt = select(SecurityDriftEvent).where(SecurityDriftEvent.id == drift_id)
        res = await self.session.execute(stmt)
        drift = res.scalars().first()
        if not drift:
            return None

        drift.status = DriftStatus.DISMISSED.value
        drift.dismissed_by = dismissed_by
        drift.dismissed_reason = reason
        await self.session.commit()
        await self.session.refresh(drift)
        return drift

    # ------------------------------------------------------------------------
    # Behavioral Baselines & Anomalies
    # ------------------------------------------------------------------------
    async def save_numeric_baseline(
        self,
        project_id: uuid.UUID,
        subject_type: str,
        subject_id: str,
        metric: str,
        values: List[float],
        window_start: datetime,
        window_end: datetime,
    ) -> SecurityBehaviorBaseline:
        baseline_data = BaselineCalculator.calculate_numeric_baseline(
            values=values,
            metric_name=metric,
            window_start=window_start,
            window_end=window_end,
        )

        baseline = SecurityBehaviorBaseline(
            project_id=project_id,
            subject_type=subject_type,
            subject_id=subject_id,
            metric=metric,
            window_start=baseline_data["window_start"],
            window_end=baseline_data["window_end"],
            sample_count=baseline_data["sample_count"],
            calculation_method=baseline_data["calculation_method"],
            baseline_value=baseline_data["baseline_value"],
            variance=baseline_data["variance"],
            confidence=baseline_data["confidence"],
            source=baseline_data["source"],
        )
        self.session.add(baseline)
        await self.session.commit()
        await self.session.refresh(baseline)
        return baseline

    async def save_set_frequency_baseline(
        self,
        project_id: uuid.UUID,
        subject_type: str,
        subject_id: str,
        metric: str,
        items: List[str],
        window_start: datetime,
        window_end: datetime,
    ) -> SecurityBehaviorBaseline:
        baseline_data = BaselineCalculator.calculate_set_frequency_baseline(
            historical_items=items,
            metric_name=metric,
            window_start=window_start,
            window_end=window_end,
        )

        baseline = SecurityBehaviorBaseline(
            project_id=project_id,
            subject_type=subject_type,
            subject_id=subject_id,
            metric=metric,
            window_start=baseline_data["window_start"],
            window_end=baseline_data["window_end"],
            sample_count=baseline_data["sample_count"],
            calculation_method=baseline_data["calculation_method"],
            baseline_value=baseline_data["baseline_value"],
            variance=baseline_data["variance"],
            confidence=baseline_data["confidence"],
            source=baseline_data["source"],
        )
        self.session.add(baseline)
        await self.session.commit()
        await self.session.refresh(baseline)
        return baseline

    async def record_behavior_event(
        self,
        project_id: uuid.UUID,
        subject_type: str,
        subject_id: str,
        metric: str,
        observed_value: Any,
        evidence_id: Optional[str] = None,
    ) -> SecurityBehaviorEvent:
        """
        Evaluates incoming activity against active baseline and persists event.
        """
        # Fetch latest baseline for subject and metric
        stmt = (
            select(SecurityBehaviorBaseline)
            .where(
                and_(
                    SecurityBehaviorBaseline.project_id == project_id,
                    SecurityBehaviorBaseline.subject_id == subject_id,
                    SecurityBehaviorBaseline.metric == metric,
                    SecurityBehaviorBaseline.eligibility_status == "ELIGIBLE_FOR_BASELINE",
                )
            )
            .order_by(SecurityBehaviorBaseline.created_at.desc())
        )
        res = await self.session.execute(stmt)
        baseline = res.scalars().first()

        b_dict = {
            "id": str(baseline.id),
            "baseline_value": baseline.baseline_value,
        } if baseline else None

        if isinstance(observed_value, str):
            evaluation = BehaviorDetector.evaluate_tool_usage(
                project_id=project_id,
                agent_id=subject_id,
                tool_name=observed_value,
                baseline_record=b_dict,
                evidence_id=evidence_id,
            )
        else:
            evaluation = BehaviorDetector.evaluate_rate_metric(
                project_id=project_id,
                subject_type=subject_type,
                subject_id=subject_id,
                metric_name=metric,
                observed_value=float(observed_value),
                baseline_record=b_dict,
                evidence_id=evidence_id,
            )

        event = SecurityBehaviorEvent(
            project_id=project_id,
            subject_type=subject_type,
            subject_id=subject_id,
            event_type=evaluation["event_type"],
            observed_value=evaluation["observed_value"],
            baseline_reference=evaluation["baseline_reference"],
            deviation_context=evaluation["deviation_context"],
            observed_at=evaluation["observed_at"],
            evidence_id=evidence_id,
            status=evaluation["status"],
        )
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)

        if evaluation["status"] in ("ANOMALOUS", "SUSPICIOUS"):
            await self.record_intelligence_event(
                project_id=project_id,
                event_type=IntelligenceEventType.BEHAVIOR_ANOMALY.value,
                source_type=subject_type,
                source_id=subject_id,
                severity="HIGH" if evaluation["status"] == "SUSPICIOUS" else "MEDIUM",
                metadata={"behavior_event_id": str(event.id), "status": evaluation["status"]},
            )

        return event

    # ------------------------------------------------------------------------
    # Control Freshness & Verification
    # ------------------------------------------------------------------------
    async def evaluate_and_update_freshness(
        self,
        project_id: uuid.UUID,
        requirement_id: str,
        contract_id: Optional[str] = None,
        last_verified_at: Optional[datetime] = None,
        dependent_resource_modified_at: Optional[datetime] = None,
        telemetry_source_available: bool = True,
    ) -> SecurityControlFreshness:
        freshness = ControlFreshnessEvaluator.evaluate_freshness(
            last_verified_at=last_verified_at,
            dependent_resource_modified_at=dependent_resource_modified_at,
            telemetry_source_available=telemetry_source_available,
        )

        record = SecurityControlFreshness(
            project_id=project_id,
            requirement_id=requirement_id,
            contract_id=contract_id,
            last_verified_at=last_verified_at,
            status=freshness["status"],
            stale_reason=freshness["stale_reason"],
        )
        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)

        if freshness["status"] in (ControlFreshnessStatus.STALE.value, ControlFreshnessStatus.EXPIRED.value):
            await self.record_intelligence_event(
                project_id=project_id,
                event_type=IntelligenceEventType.CONTROL_STALE.value,
                source_type="SECURITY_REQUIREMENT",
                source_id=requirement_id,
                severity="MEDIUM",
                metadata={"status": freshness["status"], "stale_reason": freshness["stale_reason"]},
            )

        return record

    async def schedule_verification_job(
        self,
        project_id: uuid.UUID,
        trigger_type: TriggerType,
        trigger_id: str,
        contract_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> Optional[SecurityVerificationJob]:
        # Check active jobs for deduplication
        stmt = select(SecurityVerificationJob.deduplication_key).where(
            and_(
                SecurityVerificationJob.project_id == project_id,
                SecurityVerificationJob.status.in_(["QUEUED", "RUNNING"]),
            )
        )
        res = await self.session.execute(stmt)
        active_keys = set(res.scalars().all())

        plan = VerificationPlanner.plan_verification_job(
            project_id=project_id,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
            contract_id=contract_id,
            requirement_id=requirement_id,
            target_type=target_type,
            target_id=target_id,
            existing_active_dedup_keys=active_keys,
        )

        if not plan:
            return None  # Deduplicated

        job = SecurityVerificationJob(
            project_id=project_id,
            trigger_type=plan["trigger_type"],
            trigger_id=plan["trigger_id"],
            contract_id=plan["contract_id"],
            requirement_id=plan["requirement_id"],
            target_type=plan["target_type"],
            target_id=plan["target_id"],
            status="QUEUED",
            deduplication_key=plan["deduplication_key"],
        )
        self.session.add(job)
        await self.session.commit()
        await self.session.refresh(job)
        return job

    # ------------------------------------------------------------------------
    # Incident Correlation & Timelines
    # ------------------------------------------------------------------------
    async def correlate_incident_timeline(
        self,
        project_id: uuid.UUID,
        correlation_key: str,
        events: List[Dict[str, Any]],
        causality_verified: bool = False,
    ) -> SecurityChangeCorrelation:
        result = CorrelationTimelineEngine.build_timeline(events, causality_verified=causality_verified)

        correlation = SecurityChangeCorrelation(
            project_id=project_id,
            correlation_key=correlation_key,
            causality_status=result["causality_status"],
            timeline=result["timeline"],
            first_event_at=result["first_event_at"],
            last_event_at=result["last_event_at"],
            event_count=result["event_count"],
            summary=result["summary"],
        )
        self.session.add(correlation)
        await self.session.commit()
        await self.session.refresh(correlation)
        return correlation

    # ------------------------------------------------------------------------
    # Adaptive Recommendations
    # ------------------------------------------------------------------------
    async def create_requirement_recommendation(
        self,
        project_id: uuid.UUID,
        proposed_requirement: Dict[str, Any],
        reason: str,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> SecurityRequirementRecommendation:
        rec = SecurityRequirementRecommendation(
            project_id=project_id,
            proposed_requirement=proposed_requirement,
            reason=reason,
            evidence=evidence or {},
            status=RecommendationStatus.PROPOSED.value,
        )
        self.session.add(rec)
        await self.session.commit()
        await self.session.refresh(rec)
        return rec

    async def create_policy_recommendation(
        self,
        project_id: uuid.UUID,
        current_policy_version: str,
        proposed_policy: Dict[str, Any],
        reason: str,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> SecurityPolicyRecommendation:
        rec = SecurityPolicyRecommendation(
            project_id=project_id,
            current_policy_version=current_policy_version,
            proposed_policy=proposed_policy,
            reason=reason,
            evidence=evidence or {},
            status=RecommendationStatus.PROPOSED.value,
        )
        self.session.add(rec)
        await self.session.commit()
        await self.session.refresh(rec)
        return rec

    async def accept_policy_recommendation(
        self,
        recommendation_id: uuid.UUID,
        reviewed_by: str,
    ) -> Optional[SecurityPolicyRecommendation]:
        stmt = select(SecurityPolicyRecommendation).where(SecurityPolicyRecommendation.id == recommendation_id)
        res = await self.session.execute(stmt)
        rec = res.scalars().first()
        if not rec:
            return None

        rec.status = RecommendationStatus.ACCEPTED.value
        rec.reviewed_by = reviewed_by
        rec.reviewed_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(rec)
        return rec

    # ------------------------------------------------------------------------
    # Intelligence Events & Current State (Rule 55: Factual dimensions only)
    # ------------------------------------------------------------------------
    async def record_intelligence_event(
        self,
        project_id: uuid.UUID,
        event_type: str,
        source_type: str,
        source_id: str,
        severity: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SecurityIntelligenceEvent:
        ev = SecurityIntelligenceEvent(
            project_id=project_id,
            event_type=event_type,
            source_type=source_type,
            source_id=source_id,
            severity_context=severity,
            metadata_=metadata or {},
        )
        self.session.add(ev)
        await self.session.commit()
        return ev

    async def get_current_intelligence_summary(self, project_id: uuid.UUID) -> Dict[str, Any]:
        """
        RULE 55 — Exposes factual dimensions only:
          active_drift_events, stale_controls, anomalies, verification_jobs, recommendations.
        NO SECURITY SCORE.
        """
        # Active drift count
        d_stmt = select(func.count(SecurityDriftEvent.id)).where(
            and_(SecurityDriftEvent.project_id == project_id, SecurityDriftEvent.status != "DISMISSED")
        )
        drift_count = (await self.session.execute(d_stmt)).scalar() or 0

        # Stale controls count
        s_stmt = select(func.count(SecurityControlFreshness.id)).where(
            and_(SecurityControlFreshness.project_id == project_id, SecurityControlFreshness.status.in_(["STALE", "EXPIRED"]))
        )
        stale_count = (await self.session.execute(s_stmt)).scalar() or 0

        # Behavioral anomalies count
        a_stmt = select(func.count(SecurityBehaviorEvent.id)).where(
            and_(SecurityBehaviorEvent.project_id == project_id, SecurityBehaviorEvent.status.in_(["ANOMALOUS", "SUSPICIOUS"]))
        )
        anomaly_count = (await self.session.execute(a_stmt)).scalar() or 0

        # Pending recommendations count
        r_stmt = select(func.count(SecurityPolicyRecommendation.id)).where(
            and_(SecurityPolicyRecommendation.project_id == project_id, SecurityPolicyRecommendation.status == "PROPOSED")
        )
        pending_recs = (await self.session.execute(r_stmt)).scalar() or 0

        # Queued verification jobs
        v_stmt = select(func.count(SecurityVerificationJob.id)).where(
            and_(SecurityVerificationJob.project_id == project_id, SecurityVerificationJob.status == "QUEUED")
        )
        queued_verifs = (await self.session.execute(v_stmt)).scalar() or 0

        return {
            "project_id": str(project_id),
            "active_drift_events": drift_count,
            "stale_controls": stale_count,
            "behavior_anomalies": anomaly_count,
            "pending_recommendations": pending_recs,
            "queued_verification_jobs": queued_verifs,
        }
