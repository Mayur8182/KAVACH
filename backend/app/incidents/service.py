"""
Step 21 Master Security Incident Management, Investigation & Forensic Evidence Service.

Coordinates:
- Incident lifecycle (Detected -> Triage -> Investigating -> Containment -> Root Cause -> Remediation -> Recovery -> Verification -> Closed)
- Duplicate detection & signal aggregation
- Evidence collection with authorization, secret redaction, SHA-256 hashing, and chain of custody
- Timeline reconstruction with confidence levels
- Investigation cases, questions, hypotheses, and contradiction detection
- Root cause verification constraints (Rule 68, Test 117)
- Containment execution routing through Step 14 (Rule 46)
- Closure validation against contract violations (Test 116)
- Incident reopening upon new evidence (Test 110)
- Multi-tenant boundary enforcement (Test 111)
- Incident postmortems and forensic export
"""

import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.incident_models import (
    SecurityIncident,
    SecurityIncidentSignal,
    SecurityIncidentTimeline,
    SecurityIncidentEvidence,
    EvidenceChainEvent,
    SecurityInvestigationCase,
    InvestigationQuestion,
    InvestigationHypothesisV2,
    IncidentRootCause,
    IncidentContainmentRecord,
    IncidentRecoveryRecord,
    IncidentPostmortem,
    IncidentRelationship,
    IncidentAssignment,
    IncidentExport,
)
from app.incidents.enums import (
    IncidentType,
    IncidentSeverity,
    IncidentStatus,
    SignalRelationshipType,
    TimelineConfidence,
    EvidenceRole,
    EvidenceChainAction,
    InvestigationObjective,
    QuestionStatus,
    HypothesisStatus,
    RootCauseStatus,
    ContainmentActionType,
    ContainmentStatus,
    RecoveryActionType,
    RecoveryStatus,
    IncidentRelationshipType,
    ContributingFactor,
    CollectorStatus,
)
from app.incidents.redaction import SecretRedactor, EvidenceIntegrityEngine
from app.incidents.timeline import IncidentTimelineEngine
from app.incidents.investigation import InvestigationEngine
from app.incidents.containment import IncidentContainmentCoordinator
from app.incidents.collectors import (
    BaseEvidenceCollector,
    CloudAuditEventCollector,
    KubernetesEventCollector,
    AgentEventCollector,
    RuntimeTraceCollector,
    ConfigurationSnapshotCollector,
)


def ensure_utc(dt: Any) -> datetime:
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return datetime.now(timezone.utc)
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    return datetime.now(timezone.utc)


class SecurityIncidentService:
    """
    Core production incident management, investigation, and forensic evidence service.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.collectors: Dict[str, BaseEvidenceCollector] = {
            "CLOUD_AUDIT": CloudAuditEventCollector(),
            "KUBERNETES": KubernetesEventCollector(),
            "AGENT": AgentEventCollector(),
            "RUNTIME_TRACE": RuntimeTraceCollector(),
            "CONFIG_SNAPSHOT": ConfigurationSnapshotCollector(),
        }

    # ------------------------------------------------------------------------
    # 1. Incident Lifecycle & Creation
    # ------------------------------------------------------------------------
    async def create_incident(
        self,
        project_id: uuid.UUID,
        title: str,
        incident_type: IncidentType,
        severity: IncidentSeverity,
        primary_resource_type: str,
        primary_resource_id: str,
        environment: str = "PRODUCTION",
        description: Optional[str] = None,
        reported_by_type: str = "SYSTEM",
        reported_by_id: str = "CONTROL_PLANE",
        observed_at: Optional[datetime] = None,
        initial_signals: Optional[List[Dict[str, Any]]] = None,
    ) -> SecurityIncident:
        """
        Creates a new incident from real events (Rule 63).
        """
        now = datetime.now(timezone.utc)
        obs_time = observed_at or now

        # Generate unique human-readable incident key
        count_stmt = select(func.count(SecurityIncident.id)).where(SecurityIncident.project_id == project_id)
        count = (await self.session.execute(count_stmt)).scalar() or 0
        incident_key = f"INC-{now.strftime('%Y%m')}-{count + 1:04d}"

        incident = SecurityIncident(
            project_id=project_id,
            incident_key=incident_key,
            title=title,
            description=description,
            incident_type=incident_type.value,
            severity=severity.value,
            status=IncidentStatus.DETECTED.value,
            environment=environment,
            detected_at=now,
            first_observed_at=obs_time,
            last_observed_at=obs_time,
            first_detected_at=now,
            last_detected_at=now,
            reported_by_type=reported_by_type,
            reported_by_id=reported_by_id,
            primary_resource_type=primary_resource_type,
            primary_resource_id=primary_resource_id,
        )
        self.session.add(incident)
        await self.session.commit()
        await self.session.refresh(incident)

        # Attach initial signals if provided
        if initial_signals:
            for sig in initial_signals:
                await self.add_signal(
                    incident_id=incident.id,
                    source_type=sig.get("source_type", "EVENT"),
                    source_id=sig.get("source_id", "SIG-01"),
                    signal_type=sig.get("signal_type", incident_type.value),
                    observed_at=sig.get("observed_at", obs_time),
                    relationship_type=sig.get("relationship_type", SignalRelationshipType.TRIGGERED),
                    metadata=sig.get("metadata", {}),
                )

        # Record initial timeline event
        await self.add_timeline_entry(
            incident_id=incident.id,
            event_time=obs_time,
            event_type=f"INCIDENT_DETECTED_{incident_type.value}",
            source_type=reported_by_type,
            source_id=reported_by_id,
            description=f"Incident {incident_key} detected on {primary_resource_type} '{primary_resource_id}': {title}",
            confidence=TimelineConfidence.OBSERVED,
        )

        return incident

    async def get_incident(
        self,
        incident_id: uuid.UUID,
        project_id: Optional[uuid.UUID] = None,
    ) -> Optional[SecurityIncident]:
        """
        Retrieves incident with multi-tenant enforcement (Rule 72, Test 111).
        """
        conditions = [SecurityIncident.id == incident_id]
        if project_id:
            conditions.append(SecurityIncident.project_id == project_id)

        stmt = select(SecurityIncident).where(and_(*conditions))
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def list_incidents(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[SecurityIncident]:
        conditions = [SecurityIncident.project_id == project_id]
        if status:
            conditions.append(SecurityIncident.status == status)
        if severity:
            conditions.append(SecurityIncident.severity == severity)

        stmt = select(SecurityIncident).where(and_(*conditions)).order_by(SecurityIncident.detected_at.desc()).limit(limit)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ------------------------------------------------------------------------
    # 2. Duplicate Detection & Signal Aggregation (Section 19, Test 98)
    # ------------------------------------------------------------------------
    async def find_duplicate_or_related(
        self,
        project_id: uuid.UUID,
        primary_resource_type: str,
        primary_resource_id: str,
        environment: str = "PRODUCTION",
    ) -> Optional[SecurityIncident]:
        """
        Identifies if an active incident already exists for the resource in this environment.
        """
        stmt = (
            select(SecurityIncident)
            .where(
                and_(
                    SecurityIncident.project_id == project_id,
                    SecurityIncident.primary_resource_type == primary_resource_type,
                    SecurityIncident.primary_resource_id == primary_resource_id,
                    SecurityIncident.environment == environment,
                    SecurityIncident.status.in_([
                        IncidentStatus.DETECTED.value,
                        IncidentStatus.TRIAGE.value,
                        IncidentStatus.INVESTIGATING.value,
                        IncidentStatus.CONTAINMENT_REQUIRED.value,
                        IncidentStatus.CONTAINMENT_IN_PROGRESS.value,
                    ]),
                )
            )
            .order_by(SecurityIncident.detected_at.desc())
        )
        res = await self.session.execute(stmt)
        return res.scalars().first()

    async def link_incidents(
        self,
        source_incident_id: uuid.UUID,
        target_incident_id: uuid.UUID,
        relationship_type: IncidentRelationshipType,
    ) -> IncidentRelationship:
        rel = IncidentRelationship(
            source_incident_id=source_incident_id,
            target_incident_id=target_incident_id,
            relationship_type=relationship_type.value,
        )
        self.session.add(rel)
        await self.session.commit()
        await self.session.refresh(rel)
        return rel

    async def add_signal(
        self,
        incident_id: uuid.UUID,
        source_type: str,
        source_id: str,
        signal_type: str,
        observed_at: datetime,
        evidence_id: Optional[str] = None,
        relationship_type: SignalRelationshipType = SignalRelationshipType.CORRELATED_WITH,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SecurityIncidentSignal:
        sig = SecurityIncidentSignal(
            incident_id=incident_id,
            source_type=source_type,
            source_id=source_id,
            signal_type=signal_type,
            observed_at=observed_at,
            evidence_id=evidence_id,
            relationship_type=relationship_type.value,
            metadata_=metadata or {},
        )
        self.session.add(sig)

        # Update incident last_observed_at
        inc_stmt = select(SecurityIncident).where(SecurityIncident.id == incident_id)
        res = await self.session.execute(inc_stmt)
        inc = res.scalars().first()
        if inc and ensure_utc(observed_at) > ensure_utc(inc.last_observed_at):
            inc.last_observed_at = ensure_utc(observed_at)
            inc.last_detected_at = ensure_utc(observed_at)

        await self.session.commit()
        await self.session.refresh(sig)
        return sig

    # ------------------------------------------------------------------------
    # 3. Evidence Collection & Chain of Custody (Rules 69, 71, 72, 73, Sec 23, 24)
    # ------------------------------------------------------------------------
    async def collect_forensic_evidence(
        self,
        incident_id: uuid.UUID,
        collector_type: str,
        target: str,
        time_range: Dict[str, datetime],
        scope: Dict[str, Any],
        authorization_context: Dict[str, Any],
        role: EvidenceRole = EvidenceRole.PRIMARY,
    ) -> Tuple[Optional[SecurityIncidentEvidence], Dict[str, Any]]:
        """
        Executes an authorized forensic collector, stores redacted evidence,
        computes SHA-256 hash, and logs initial chain of custody.
        """
        collector = self.collectors.get(collector_type.upper())
        if not collector:
            return None, {
                "status": CollectorStatus.NOT_CONFIGURED.value,
                "error": f"Collector '{collector_type}' is not configured on this platform.",
            }

        result = await collector.collect(
            target=target,
            time_range=time_range,
            scope=scope,
            authorization_context=authorization_context,
        )

        if result["status"] != CollectorStatus.COMPLETED.value:
            return None, result

        # Create persistent evidence record
        evidence_id = f"EV-{uuid.uuid4().hex[:8]}"
        integrity = result["integrity"]

        evidence = SecurityIncidentEvidence(
            incident_id=incident_id,
            evidence_id=evidence_id,
            role=role.value,
            relevance=f"Forensic collection from {collector_type} for target '{target}'",
            collected_at=datetime.now(timezone.utc),
            collector_type=collector_type,
            collector_id=collector.collector_id,
            authorization_context=result["authorization_context"],
            integrity_hash=integrity["integrity_hash"],
            hash_algorithm=integrity["hash_algorithm"],
            artifact_size_bytes=integrity["artifact_size_bytes"],
            redacted_content=result["evidence"],
            is_secret_redacted=result["is_secret_redacted"],
            metadata_={"scope": scope, "target": target},
        )
        self.session.add(evidence)
        await self.session.commit()
        await self.session.refresh(evidence)

        # Log Chain of Custody: COLLECTED
        await self.record_chain_event(
            evidence_id=evidence.id,
            action=EvidenceChainAction.COLLECTED,
            actor_type="COLLECTOR",
            actor_id=collector.collector_id,
            purpose=f"Incident forensic triage for {target}",
            authorization=authorization_context,
        )

        return evidence, result

    async def record_chain_event(
        self,
        evidence_id: uuid.UUID,
        action: EvidenceChainAction,
        actor_type: str,
        actor_id: str,
        purpose: str,
        authorization: Optional[Dict[str, Any]] = None,
    ) -> EvidenceChainEvent:
        event = EvidenceChainEvent(
            evidence_id=evidence_id,
            action=action.value,
            actor_type=actor_type,
            actor_id=actor_id,
            purpose=purpose,
            authorization=authorization or {},
            timestamp=datetime.now(timezone.utc),
        )
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def list_incident_evidence(self, incident_id: uuid.UUID) -> List[SecurityIncidentEvidence]:
        stmt = (
            select(SecurityIncidentEvidence)
            .where(SecurityIncidentEvidence.incident_id == incident_id)
            .options(selectinload(SecurityIncidentEvidence.chain_events))
            .order_by(SecurityIncidentEvidence.collected_at.asc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ------------------------------------------------------------------------
    # 4. Incident Timeline Reconstruction (Section 27–29)
    # ------------------------------------------------------------------------
    async def add_timeline_entry(
        self,
        incident_id: uuid.UUID,
        event_time: datetime,
        event_type: str,
        source_type: str,
        source_id: str,
        description: str,
        confidence: TimelineConfidence = TimelineConfidence.OBSERVED,
        evidence_id: Optional[str] = None,
        actor_type: Optional[str] = None,
        actor_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> SecurityIncidentTimeline:
        entry = SecurityIncidentTimeline(
            incident_id=incident_id,
            event_time=IncidentTimelineEngine.parse_timestamp(event_time),
            event_type=event_type,
            source_type=source_type,
            source_id=source_id,
            description=description,
            confidence=confidence.value,
            evidence_id=evidence_id,
            actor_type=actor_type,
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        self.session.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def get_incident_timeline(self, incident_id: uuid.UUID) -> List[SecurityIncidentTimeline]:
        stmt = (
            select(SecurityIncidentTimeline)
            .where(SecurityIncidentTimeline.incident_id == incident_id)
            .order_by(SecurityIncidentTimeline.event_time.asc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    # ------------------------------------------------------------------------
    # 5. Investigation Cases, Questions, Hypotheses (Sections 30–35, 78)
    # ------------------------------------------------------------------------
    async def open_investigation_case(
        self,
        incident_id: uuid.UUID,
        project_id: uuid.UUID,
        lead_actor_type: str,
        lead_actor_id: str,
        objective: InvestigationObjective = InvestigationObjective.IDENTIFY_ROOT_CAUSE,
        scope: Optional[Dict[str, Any]] = None,
    ) -> SecurityInvestigationCase:
        case = SecurityInvestigationCase(
            incident_id=incident_id,
            project_id=project_id,
            status="ACTIVE",
            lead_actor_type=lead_actor_type,
            lead_actor_id=lead_actor_id,
            objective=objective.value,
            scope=scope or {},
        )
        self.session.add(case)

        # Update incident status to INVESTIGATING
        inc = await self.get_incident(incident_id)
        if inc:
            inc.status = IncidentStatus.INVESTIGATING.value

        await self.session.commit()
        await self.session.refresh(case)
        return case

    async def add_investigation_question(
        self,
        case_id: uuid.UUID,
        question: str,
    ) -> InvestigationQuestion:
        q = InvestigationQuestion(
            case_id=case_id,
            question=question,
            status=QuestionStatus.OPEN.value,
        )
        self.session.add(q)
        await self.session.commit()
        await self.session.refresh(q)
        return q

    async def answer_investigation_question(
        self,
        question_id: uuid.UUID,
        answer: str,
        answer_confidence: str,
        answered_by: str,
        evidence_references: Optional[List[str]] = None,
    ) -> Optional[InvestigationQuestion]:
        stmt = select(InvestigationQuestion).where(InvestigationQuestion.id == question_id)
        res = await self.session.execute(stmt)
        q = res.scalars().first()
        if not q:
            return None

        q.answer = answer
        q.answer_confidence = answer_confidence
        q.answered_by = answered_by
        q.evidence_references = evidence_references or []
        q.status = QuestionStatus.ANSWERED.value
        await self.session.commit()
        await self.session.refresh(q)
        return q

    async def add_investigation_hypothesis(
        self,
        case_id: uuid.UUID,
        hypothesis: str,
        source: str = "AI_PROPOSED",
        supporting_evidence: Optional[List[str]] = None,
        contradicting_evidence: Optional[List[str]] = None,
    ) -> InvestigationHypothesisV2:
        hyp = InvestigationHypothesisV2(
            case_id=case_id,
            hypothesis=hypothesis,
            source=source,
            supporting_evidence=supporting_evidence or [],
            contradicting_evidence=contradicting_evidence or [],
            status=HypothesisStatus.PROPOSED.value,
        )
        self.session.add(hyp)
        await self.session.commit()
        await self.session.refresh(hyp)
        return hyp

    # ------------------------------------------------------------------------
    # 6. Root Cause Tracking & Verification (Rule 68, Test 117)
    # ------------------------------------------------------------------------
    async def record_root_cause(
        self,
        incident_id: uuid.UUID,
        statement: str,
        supporting_evidence_ids: List[str],
        verified_by: Optional[str] = None,
        case_id: Optional[uuid.UUID] = None,
    ) -> Tuple[Optional[IncidentRootCause], Dict[str, Any]]:
        """
        Enforces Rule 68 & Test 117:
        Cannot mark root cause VERIFIED without supporting evidence.
        """
        # Fetch evidence items to check for contradictions
        ev_stmt = select(SecurityIncidentEvidence).where(SecurityIncidentEvidence.incident_id == incident_id)
        res = await self.session.execute(ev_stmt)
        evidence_items = [{"id": str(e.id), "content": e.redacted_content} for e in res.scalars().all()]
        contradictions = InvestigationEngine.detect_contradictions(evidence_items)

        validation = InvestigationEngine.validate_root_cause_verification(
            statement=statement,
            supporting_evidence_ids=supporting_evidence_ids,
            contradictions=contradictions,
        )

        status = validation["status"]
        verified_at = datetime.now(timezone.utc) if validation["allowed"] and verified_by else None

        rc = IncidentRootCause(
            incident_id=incident_id,
            case_id=case_id,
            root_cause_statement=statement,
            status=status,
            supporting_evidence_ids=supporting_evidence_ids,
            verified_at=verified_at,
            verified_by=verified_by if validation["allowed"] else None,
        )
        self.session.add(rc)

        # Update incident root_cause_status
        inc = await self.get_incident(incident_id)
        if inc:
            inc.root_cause_status = status

        await self.session.commit()
        await self.session.refresh(rc)
        return rc, validation

    # ------------------------------------------------------------------------
    # 7. Containment Coordination (Sections 46–50, Rule 46)
    # ------------------------------------------------------------------------
    async def propose_containment(
        self,
        incident_id: uuid.UUID,
        action_type: ContainmentActionType,
        target_type: str,
        target_id: str,
        reason: str,
        scope: Optional[Dict[str, Any]] = None,
    ) -> IncidentContainmentRecord:
        """
        Creates a structured containment proposal without executing it directly (Rule 46).
        """
        record = IncidentContainmentRecord(
            incident_id=incident_id,
            action_type=action_type.value,
            target_type=target_type,
            target_id=target_id,
            scope=scope or {"environment": "PRODUCTION", "target": target_id},
            reason=reason,
            status=ContainmentStatus.PROPOSED.value,
        )
        self.session.add(record)

        inc = await self.get_incident(incident_id)
        if inc:
            inc.containment_status = ContainmentStatus.PROPOSED.value

        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def execute_containment_via_step14(
        self,
        containment_record_id: uuid.UUID,
        policy_decision_id: str,
        step14_response_id: str,
        post_action_evidence_id: str,
    ) -> Optional[IncidentContainmentRecord]:
        """
        Records completion of containment authorized by Step 7/10 and executed by Step 14.
        """
        stmt = select(IncidentContainmentRecord).where(IncidentContainmentRecord.id == containment_record_id)
        res = await self.session.execute(stmt)
        rec = res.scalars().first()
        if not rec:
            return None

        rec.status = ContainmentStatus.COMPLETED.value
        rec.policy_decision_id = policy_decision_id
        rec.step14_response_id = step14_response_id
        rec.post_action_evidence_id = post_action_evidence_id
        rec.executed_at = datetime.now(timezone.utc)

        inc = await self.get_incident(rec.incident_id)
        if inc:
            inc.containment_status = ContainmentStatus.COMPLETED.value

        await self.session.commit()
        await self.session.refresh(rec)
        return rec

    # ------------------------------------------------------------------------
    # 8. Recovery & Post-Incident Verification (Sections 51–53)
    # ------------------------------------------------------------------------
    async def record_recovery(
        self,
        incident_id: uuid.UUID,
        action_type: RecoveryActionType,
        target: str,
        post_recovery_evidence_id: Optional[str] = None,
        reverification_result: Optional[Dict[str, Any]] = None,
    ) -> IncidentRecoveryRecord:
        rec = IncidentRecoveryRecord(
            incident_id=incident_id,
            action_type=action_type.value,
            target=target,
            status=RecoveryStatus.VERIFIED.value if reverification_result else RecoveryStatus.IN_PROGRESS.value,
            post_recovery_evidence_id=post_recovery_evidence_id,
            reverification_result=reverification_result,
            recovered_at=datetime.now(timezone.utc) if reverification_result else None,
        )
        self.session.add(rec)

        inc = await self.get_incident(incident_id)
        if inc and reverification_result:
            inc.recovery_status = RecoveryStatus.VERIFIED.value

        await self.session.commit()
        await self.session.refresh(rec)
        return rec

    # ------------------------------------------------------------------------
    # 9. Closure & Reopening (Sections 56–58, Tests 110, 116)
    # ------------------------------------------------------------------------
    async def close_incident(
        self,
        incident_id: uuid.UUID,
        closed_by: str,
        closure_reason: str,
        has_active_contract_violations: bool = False,
        closure_with_limitations: bool = False,
        outstanding_uncertainty: Optional[str] = None,
    ) -> Tuple[Optional[SecurityIncident], Dict[str, Any]]:
        """
        Enforces closure invariants (Test 116):
        Rejects closure if active contract violations exist and closure_with_limitations is false.
        """
        inc = await self.get_incident(incident_id)
        if not inc:
            return None, {"error": "Incident not found", "can_close": False}

        readiness = IncidentContainmentCoordinator.evaluate_closure_readiness(
            incident_status=inc.status,
            containment_status=inc.containment_status,
            root_cause_status=inc.root_cause_status,
            has_active_contract_violations=has_active_contract_violations,
            recovery_status=inc.recovery_status,
            closure_with_limitations=closure_with_limitations,
        )

        if not readiness["can_close"]:
            return inc, readiness

        now = datetime.now(timezone.utc)
        inc.status = readiness["closure_status"]
        inc.closure_reason = closure_reason
        inc.closed_with_limitations = closure_with_limitations
        inc.outstanding_uncertainty = outstanding_uncertainty
        inc.closed_by = closed_by
        inc.closed_at = now

        await self.add_timeline_entry(
            incident_id=incident_id,
            event_time=now,
            event_type="INCIDENT_CLOSED",
            source_type="HUMAN",
            source_id=closed_by,
            description=f"Incident closed by {closed_by}: {closure_reason}" + (f" (Limitations: {outstanding_uncertainty})" if closure_with_limitations else ""),
            confidence=TimelineConfidence.VERIFIED,
        )

        await self.session.commit()
        await self.session.refresh(inc)
        return inc, readiness

    async def reopen_incident(
        self,
        incident_id: uuid.UUID,
        reopened_by: str,
        new_evidence_id: str,
        reason: str,
    ) -> Optional[SecurityIncident]:
        """
        Reopens a closed incident upon discovery of new evidence, preserving closure history (Section 58, Test 110).
        """
        inc = await self.get_incident(incident_id)
        if not inc:
            return None

        previous_closure = {
            "closed_at": inc.closed_at.isoformat() if inc.closed_at else None,
            "closed_by": inc.closed_by,
            "closure_reason": inc.closure_reason,
            "limitations": inc.outstanding_uncertainty,
        }

        # Preserve previous closure history in metadata
        meta = inc.metadata_ or {}
        history = meta.get("closure_history", [])
        history.append(previous_closure)
        meta["closure_history"] = history
        inc.metadata_ = meta

        now = datetime.now(timezone.utc)
        inc.status = IncidentStatus.REOPENED.value
        inc.closed_at = None
        inc.closed_by = None
        inc.closure_reason = None

        await self.add_timeline_entry(
            incident_id=incident_id,
            event_time=now,
            event_type="INCIDENT_REOPENED",
            source_type="HUMAN",
            source_id=reopened_by,
            description=f"Incident reopened due to new evidence {new_evidence_id}: {reason}",
            confidence=TimelineConfidence.OBSERVED,
            evidence_id=new_evidence_id,
        )

        await self.session.commit()
        await self.session.refresh(inc)
        return inc

    # ------------------------------------------------------------------------
    # 10. Postmortem & Forensic Export (Sections 59–63)
    # ------------------------------------------------------------------------
    async def create_postmortem(
        self,
        incident_id: uuid.UUID,
        summary: str,
        root_cause: str,
        contributing_factors: List[ContributingFactor],
        controls_involved: List[str],
        lessons_learned: List[str],
        containment_summary: Optional[str] = None,
        recovery_summary: Optional[str] = None,
        remediation_summary: Optional[str] = None,
        approved_by: Optional[str] = None,
    ) -> IncidentPostmortem:
        timeline_entries = await self.get_incident_timeline(incident_id)
        timeline_json = [
            {"time": t.event_time.isoformat(), "event": t.event_type, "desc": t.description, "confidence": t.confidence}
            for t in timeline_entries
        ]

        postmortem = IncidentPostmortem(
            incident_id=incident_id,
            summary=summary,
            timeline=timeline_json,
            root_cause=root_cause,
            contributing_factors=[cf.value if hasattr(cf, 'value') else str(cf) for cf in contributing_factors],
            controls_involved=controls_involved,
            containment_summary=containment_summary or "Containment completed via authorized Step 14 responses.",
            recovery_summary=recovery_summary or "Service recovered and contracts re-verified.",
            remediation_summary=remediation_summary or "Step 15 code/config remediation applied.",
            lessons_learned=lessons_learned,
            approved_by=approved_by,
            approved_at=datetime.now(timezone.utc) if approved_by else None,
        )
        self.session.add(postmortem)
        await self.session.commit()
        await self.session.refresh(postmortem)
        return postmortem

    async def export_incident_dossier(
        self,
        incident_id: uuid.UUID,
        actor_type: str,
        actor_id: str,
        purpose: str,
    ) -> Dict[str, Any]:
        """
        Produces redacted forensic dossier and logs immutable export record (Sections 62–63, Test 118).
        """
        inc = await self.get_incident(incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found")

        timeline = await self.get_incident_timeline(incident_id)
        evidence = await self.list_incident_evidence(incident_id)

        dossier = {
            "incident": {
                "id": str(inc.id),
                "key": inc.incident_key,
                "title": inc.title,
                "type": inc.incident_type,
                "severity": inc.severity,
                "status": inc.status,
                "environment": inc.environment,
                "detected_at": inc.detected_at.isoformat(),
                "primary_resource": f"{inc.primary_resource_type}:{inc.primary_resource_id}",
                "root_cause_status": inc.root_cause_status,
                "containment_status": inc.containment_status,
                "recovery_status": inc.recovery_status,
            },
            "timeline": [
                {"time": t.event_time.isoformat(), "event": t.event_type, "confidence": t.confidence, "desc": t.description}
                for t in timeline
            ],
            "evidence": [
                {
                    "evidence_id": e.evidence_id,
                    "role": e.role,
                    "collector": e.collector_type,
                    "integrity_hash": e.integrity_hash,
                    "redacted_content": e.redacted_content,
                }
                for e in evidence
            ],
        }

        # Redact any unredacted fields in export payload
        redacted_dossier, _ = SecretRedactor.redact_data(dossier)
        integrity = EvidenceIntegrityEngine.compute_integrity(redacted_dossier)

        export_rec = IncidentExport(
            incident_id=incident_id,
            actor_type=actor_type,
            actor_id=actor_id,
            purpose=purpose,
            scope={"dossier_version": "1.0"},
            export_hash=integrity["integrity_hash"],
            redacted=True,
        )
        self.session.add(export_rec)
        await self.session.commit()

        return {
            "dossier": redacted_dossier,
            "export_hash": integrity["integrity_hash"],
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "actor": actor_id,
        }
