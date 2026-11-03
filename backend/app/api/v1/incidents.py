"""
Step 21 Security Incident Management, Investigation & Forensic Evidence API Router.

Sections 64–66:
Exposes all incident lifecycle, evidence collection, timeline reconstruction,
investigation, root-cause, containment, recovery, and postmortem endpoints.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.core.security import get_current_user
from app.incidents.service import SecurityIncidentService
from app.incidents.enums import (
    IncidentType,
    IncidentSeverity,
    IncidentStatus,
    SignalRelationshipType,
    TimelineConfidence,
    EvidenceRole,
    ContainmentActionType,
    RecoveryActionType,
    ContributingFactor,
    InvestigationObjective,
)

router = APIRouter(tags=["Security Incidents & Forensics"])


# --- Request/Response Schemas ---

class IncidentCreateRequest(BaseModel):
    title: str
    incident_type: IncidentType = IncidentType.CONTRACT_VIOLATION
    severity: IncidentSeverity = IncidentSeverity.HIGH
    primary_resource_type: str
    primary_resource_id: str
    environment: str = "PRODUCTION"
    description: Optional[str] = None
    initial_signals: Optional[List[Dict[str, Any]]] = None


class IncidentSignalCreateRequest(BaseModel):
    source_type: str
    source_id: str
    signal_type: str
    observed_at: Optional[datetime] = None
    evidence_id: Optional[str] = None
    relationship_type: SignalRelationshipType = SignalRelationshipType.CORRELATED_WITH
    metadata: Optional[Dict[str, Any]] = None


class TimelineEntryCreateRequest(BaseModel):
    event_time: datetime
    event_type: str
    source_type: str
    source_id: str
    description: str
    confidence: TimelineConfidence = TimelineConfidence.OBSERVED
    evidence_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None


class EvidenceCollectionRequest(BaseModel):
    collector_type: str  # CLOUD_AUDIT, KUBERNETES, AGENT, RUNTIME_TRACE, CONFIG_SNAPSHOT
    target: str
    time_range_start: datetime
    time_range_end: datetime
    scope: Optional[Dict[str, Any]] = None
    role: EvidenceRole = EvidenceRole.PRIMARY


class InvestigationCaseCreateRequest(BaseModel):
    lead_actor_type: str = "HUMAN"
    objective: InvestigationObjective = InvestigationObjective.IDENTIFY_ROOT_CAUSE
    scope: Optional[Dict[str, Any]] = None


class QuestionCreateRequest(BaseModel):
    question: str


class QuestionAnswerRequest(BaseModel):
    answer: str
    answer_confidence: str = "DIRECT"
    evidence_references: Optional[List[str]] = None


class HypothesisCreateRequest(BaseModel):
    hypothesis: str
    source: str = "AI_PROPOSED"
    supporting_evidence: Optional[List[str]] = None
    contradicting_evidence: Optional[List[str]] = None


class RootCauseRecordRequest(BaseModel):
    root_cause_statement: str
    supporting_evidence_ids: List[str]
    case_id: Optional[uuid.UUID] = None


class ContainmentProposalRequest(BaseModel):
    action_type: ContainmentActionType
    target_type: str
    target_id: str
    reason: str
    scope: Optional[Dict[str, Any]] = None


class ContainmentExecuteRequest(BaseModel):
    policy_decision_id: str
    step14_response_id: str
    post_action_evidence_id: str


class RecoveryRecordRequest(BaseModel):
    action_type: RecoveryActionType
    target: str
    post_recovery_evidence_id: Optional[str] = None
    reverification_result: Optional[Dict[str, Any]] = None


class IncidentCloseRequest(BaseModel):
    closure_reason: str
    has_active_contract_violations: bool = False
    closure_with_limitations: bool = False
    outstanding_uncertainty: Optional[str] = None


class IncidentReopenRequest(BaseModel):
    new_evidence_id: str
    reason: str


class PostmortemCreateRequest(BaseModel):
    summary: str
    root_cause: str
    contributing_factors: List[ContributingFactor]
    controls_involved: List[str]
    lessons_learned: List[str]
    containment_summary: Optional[str] = None
    recovery_summary: Optional[str] = None
    remediation_summary: Optional[str] = None


# --- Endpoints ---

@router.post("/projects/{project_id}/incidents", status_code=status.HTTP_201_CREATED)
async def create_incident(
    project_id: uuid.UUID,
    payload: IncidentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    incident = await service.create_incident(
        project_id=project_id,
        title=payload.title,
        incident_type=payload.incident_type,
        severity=payload.severity,
        primary_resource_type=payload.primary_resource_type,
        primary_resource_id=payload.primary_resource_id,
        environment=payload.environment,
        description=payload.description,
        reported_by_type="HUMAN",
        reported_by_id=str(current_user.id),
        initial_signals=payload.initial_signals,
    )
    return incident


@router.get("/projects/{project_id}/incidents")
async def list_incidents(
    project_id: uuid.UUID,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.list_incidents(project_id, status=status, severity=severity, limit=limit)


@router.get("/incidents/{incident_id}")
async def get_incident_detail(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    incident = await service.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident


@router.post("/incidents/{incident_id}/signals")
async def add_signal_to_incident(
    incident_id: uuid.UUID,
    payload: IncidentSignalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    sig = await service.add_signal(
        incident_id=incident_id,
        source_type=payload.source_type,
        source_id=payload.source_id,
        signal_type=payload.signal_type,
        observed_at=payload.observed_at or datetime.now(timezone.utc),
        evidence_id=payload.evidence_id,
        relationship_type=payload.relationship_type,
        metadata=payload.metadata,
    )
    return sig


@router.get("/incidents/{incident_id}/timeline")
async def get_timeline(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.get_incident_timeline(incident_id)


@router.post("/incidents/{incident_id}/timeline")
async def add_timeline_entry(
    incident_id: uuid.UUID,
    payload: TimelineEntryCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.add_timeline_entry(
        incident_id=incident_id,
        event_time=payload.event_time,
        event_type=payload.event_type,
        source_type=payload.source_type,
        source_id=payload.source_id,
        description=payload.description,
        confidence=payload.confidence,
        evidence_id=payload.evidence_id,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
    )


@router.post("/incidents/{incident_id}/evidence/collect")
async def collect_evidence(
    incident_id: uuid.UUID,
    payload: EvidenceCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    auth_context = {
        "actor_id": str(current_user.id),
        "permissions": ["forensics:*", "admin"],
    }
    evidence, result = await service.collect_forensic_evidence(
        incident_id=incident_id,
        collector_type=payload.collector_type,
        target=payload.target,
        time_range={"start": payload.time_range_start, "end": payload.time_range_end},
        scope=payload.scope or {},
        authorization_context=auth_context,
        role=payload.role,
    )
    if not evidence:
        raise HTTPException(status_code=400, detail=result.get("error", "Evidence collection failed"))
    return evidence


@router.get("/incidents/{incident_id}/evidence")
async def list_evidence(
    incident_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.list_incident_evidence(incident_id)


@router.post("/incidents/{incident_id}/investigations")
async def open_investigation(
    incident_id: uuid.UUID,
    payload: InvestigationCaseCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    inc = await service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    case = await service.open_investigation_case(
        incident_id=incident_id,
        project_id=inc.project_id,
        lead_actor_type=payload.lead_actor_type,
        lead_actor_id=str(current_user.id),
        objective=payload.objective,
        scope=payload.scope,
    )
    return case


@router.post("/investigations/{case_id}/questions")
async def add_question(
    case_id: uuid.UUID,
    payload: QuestionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.add_investigation_question(case_id, payload.question)


@router.post("/investigations/questions/{question_id}/answer")
async def answer_question(
    question_id: uuid.UUID,
    payload: QuestionAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    q = await service.answer_investigation_question(
        question_id=question_id,
        answer=payload.answer,
        answer_confidence=payload.answer_confidence,
        answered_by=str(current_user.id),
        evidence_references=payload.evidence_references,
    )
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    return q


@router.post("/investigations/{case_id}/hypotheses")
async def add_hypothesis(
    case_id: uuid.UUID,
    payload: HypothesisCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.add_investigation_hypothesis(
        case_id=case_id,
        hypothesis=payload.hypothesis,
        source=payload.source,
        supporting_evidence=payload.supporting_evidence,
        contradicting_evidence=payload.contradicting_evidence,
    )


@router.post("/incidents/{incident_id}/root-cause")
async def record_root_cause(
    incident_id: uuid.UUID,
    payload: RootCauseRecordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    rc, validation = await service.record_root_cause(
        incident_id=incident_id,
        statement=payload.root_cause_statement,
        supporting_evidence_ids=payload.supporting_evidence_ids,
        verified_by=str(current_user.id),
        case_id=payload.case_id,
    )
    return {"root_cause": rc, "validation": validation}


@router.post("/incidents/{incident_id}/containment")
async def propose_containment(
    incident_id: uuid.UUID,
    payload: ContainmentProposalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.propose_containment(
        incident_id=incident_id,
        action_type=payload.action_type,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        scope=payload.scope,
    )


@router.post("/incidents/containment/{record_id}/execute")
async def execute_containment(
    record_id: uuid.UUID,
    payload: ContainmentExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    rec = await service.execute_containment_via_step14(
        containment_record_id=record_id,
        policy_decision_id=payload.policy_decision_id,
        step14_response_id=payload.step14_response_id,
        post_action_evidence_id=payload.post_action_evidence_id,
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Containment record not found.")
    return rec


@router.post("/incidents/{incident_id}/recover")
async def record_recovery(
    incident_id: uuid.UUID,
    payload: RecoveryRecordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.record_recovery(
        incident_id=incident_id,
        action_type=payload.action_type,
        target=payload.target,
        post_recovery_evidence_id=payload.post_recovery_evidence_id,
        reverification_result=payload.reverification_result,
    )


@router.post("/incidents/{incident_id}/close")
async def close_incident(
    incident_id: uuid.UUID,
    payload: IncidentCloseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    inc, readiness = await service.close_incident(
        incident_id=incident_id,
        closed_by=str(current_user.id),
        closure_reason=payload.closure_reason,
        has_active_contract_violations=payload.has_active_contract_violations,
        closure_with_limitations=payload.closure_with_limitations,
        outstanding_uncertainty=payload.outstanding_uncertainty,
    )
    if not readiness.get("can_close"):
        raise HTTPException(status_code=400, detail={"message": "Incident closure rejected", "reasons": readiness.get("rejection_reasons")})
    return inc


@router.post("/incidents/{incident_id}/reopen")
async def reopen_incident(
    incident_id: uuid.UUID,
    payload: IncidentReopenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    inc = await service.reopen_incident(
        incident_id=incident_id,
        reopened_by=str(current_user.id),
        new_evidence_id=payload.new_evidence_id,
        reason=payload.reason,
    )
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return inc


@router.post("/incidents/{incident_id}/postmortem")
async def create_postmortem(
    incident_id: uuid.UUID,
    payload: PostmortemCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.create_postmortem(
        incident_id=incident_id,
        summary=payload.summary,
        root_cause=payload.root_cause,
        contributing_factors=payload.contributing_factors,
        controls_involved=payload.controls_involved,
        lessons_learned=payload.lessons_learned,
        containment_summary=payload.containment_summary,
        recovery_summary=payload.recovery_summary,
        remediation_summary=payload.remediation_summary,
        approved_by=str(current_user.id),
    )


@router.get("/incidents/{incident_id}/export")
async def export_incident(
    incident_id: uuid.UUID,
    purpose: str = Query("External Compliance Audit"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SecurityIncidentService(db)
    return await service.export_incident_dossier(
        incident_id=incident_id,
        actor_type="HUMAN",
        actor_id=str(current_user.id),
        purpose=purpose,
    )
