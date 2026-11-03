"""
Step 20 Continuous Security Intelligence API Router.

Sections 69–73:
Endpoints for drift, behavior anomalies, control freshness, verification triggers,
incident correlations, and adaptive recommendations.

RULE 55 — No security scores.
RULE 58 — No blind adaptation.
"""

import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.intelligence.service import SecurityIntelligenceService
from app.intelligence.enums import TriggerType, DriftType

router = APIRouter(tags=["Security Intelligence"])


# --- Schemas ---

class DismissDriftRequest(BaseModel):
    reason: str


class BehaviorEventRequest(BaseModel):
    subject_type: str
    subject_id: str
    metric: str
    observed_value: Any
    evidence_id: Optional[str] = None


class VerificationTriggerRequest(BaseModel):
    trigger_type: str = Field(default="MANUAL")
    trigger_id: str
    contract_id: Optional[str] = None
    requirement_id: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None


class CorrelateIncidentRequest(BaseModel):
    correlation_key: str
    events: List[Dict[str, Any]]
    causality_verified: bool = False


# --- Endpoints ---

@router.get(
    "/projects/{project_id}/intelligence",
    summary="Get current factual security intelligence summary",
    description="Returns factual counts of drift, stale controls, anomalies, and jobs. NO SCORES.",
)
async def get_intelligence_summary(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    return await service.get_current_intelligence_summary(project_id)


@router.get(
    "/projects/{project_id}/drift",
    summary="List drift events for project",
)
async def list_drift_events(
    project_id: uuid.UUID,
    drift_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SecurityIntelligenceService(db)
    events = await service.list_drift_events(project_id, drift_type=drift_type, status=status, limit=limit)
    return [
        {
            "id": str(e.id),
            "project_id": str(e.project_id),
            "drift_type": e.drift_type,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "environment": e.environment,
            "severity_context": e.severity_context,
            "status": e.status,
            "detected_at": e.detected_at.isoformat() if e.detected_at else None,
            "metadata": e.metadata_,
        }
        for e in events
    ]


@router.post(
    "/drift/{drift_id}/dismiss",
    summary="Dismiss drift event with reason",
)
async def dismiss_drift_event(
    drift_id: uuid.UUID,
    payload: DismissDriftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    drift = await service.dismiss_drift(drift_id, dismissed_by=current_user.email, reason=payload.reason)
    if not drift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drift event not found")
    return {
        "drift_id": str(drift.id),
        "status": drift.status,
        "dismissed_by": drift.dismissed_by,
        "dismissed_reason": drift.dismissed_reason,
    }


@router.post(
    "/projects/{project_id}/behavior/events",
    summary="Record and evaluate behavior event against baseline",
)
async def record_behavior_event(
    project_id: uuid.UUID,
    payload: BehaviorEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    ev = await service.record_behavior_event(
        project_id=project_id,
        subject_type=payload.subject_type,
        subject_id=payload.subject_id,
        metric=payload.metric,
        observed_value=payload.observed_value,
        evidence_id=payload.evidence_id,
    )
    return {
        "event_id": str(ev.id),
        "status": ev.status,
        "subject_id": ev.subject_id,
        "event_type": ev.event_type,
        "deviation_context": ev.deviation_context,
        "observed_at": ev.observed_at.isoformat(),
    }


@router.post(
    "/projects/{project_id}/verification/trigger",
    summary="Trigger verification job with deduplication",
)
async def trigger_verification(
    project_id: uuid.UUID,
    payload: VerificationTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    job = await service.schedule_verification_job(
        project_id=project_id,
        trigger_type=TriggerType(payload.trigger_type),
        trigger_id=payload.trigger_id,
        contract_id=payload.contract_id,
        requirement_id=payload.requirement_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
    )
    if not job:
        return {"status": "DEDUPLICATED", "message": "An active verification job for this target is already queued or running."}
    return {
        "job_id": str(job.id),
        "status": job.status,
        "deduplication_key": job.deduplication_key,
        "trigger_type": job.trigger_type,
    }


@router.post(
    "/projects/{project_id}/correlations",
    summary="Create chronological incident correlation timeline",
)
async def correlate_incident(
    project_id: uuid.UUID,
    payload: CorrelateIncidentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    corr = await service.correlate_incident_timeline(
        project_id=project_id,
        correlation_key=payload.correlation_key,
        events=payload.events,
        causality_verified=payload.causality_verified,
    )
    return {
        "correlation_id": str(corr.id),
        "correlation_key": corr.correlation_key,
        "causality_status": corr.causality_status,
        "event_count": corr.event_count,
        "timeline": corr.timeline,
        "summary": corr.summary,
    }


@router.post(
    "/recommendations/{recommendation_id}/accept",
    summary="Accept policy recommendation (human review workflow)",
)
async def accept_policy_recommendation(
    recommendation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityIntelligenceService(db)
    rec = await service.accept_policy_recommendation(
        recommendation_id=recommendation_id,
        reviewed_by=current_user.email,
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")
    return {
        "recommendation_id": str(rec.id),
        "status": rec.status,
        "reviewed_by": rec.reviewed_by,
        "reviewed_at": rec.reviewed_at.isoformat(),
    }
