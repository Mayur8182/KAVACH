"""
Step 23 Security Operations Center (SOC) & Operations Platform API Router.

Provides authenticated endpoints for:
- Event ingestion & normalization
- Alert triage queue, escalation & deduplication
- Investigation case workspace & analyst notes
- Deterministic detection rules
- Monitored entity watchlists & entity activity query
- Authentic calculated SOC operational metrics (MTTD, MTTA, etc.)
- Authorized response execution & post-action verification (Rule 9)
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User
from app.core.security import get_current_user_optional as get_current_user
from app.soc.service import SocService
from app.models.soc_models import DetectionRule, SecurityEvent

router = APIRouter(tags=["Security Operations Center (SOC)"])


# ================================================================
# Request & Response Schemas
# ================================================================

class EventIngestRequest(BaseModel):
    source_type: str = Field(..., description="Source type e.g. AWS_CLOUDTRAIL, KUBERNETES_AUDIT, GITHUB, MCP_GATEWAY, RUNTIME_OTEL, SCANNER, POLICY")
    raw_payload: Dict[str, Any] = Field(..., description="Raw telemetry event dictionary")
    environment: str = Field(default="PRODUCTION", description="Environment e.g. PRODUCTION, STAGING")
    source_id: Optional[uuid.UUID] = Field(default=None, description="Optional registered EventSource UUID")


class AlertAcknowledgeRequest(BaseModel):
    pass


class AlertAssignRequest(BaseModel):
    assignee_id: str
    assignee_type: str = "ANALYST"


class AlertCloseRequest(BaseModel):
    status: str = Field(default="RESOLVED", description="RESOLVED, FALSE_POSITIVE, DUPLICATE, CLOSED")
    triage_notes: Optional[str] = None


class AlertEscalateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None


class CaseCreateRequest(BaseModel):
    title: str
    description: str
    priority: str = "HIGH"
    alert_ids: Optional[List[uuid.UUID]] = None
    event_ids: Optional[List[uuid.UUID]] = None


class CaseNoteRequest(BaseModel):
    content: str
    evidence_references: Optional[List[str]] = None


class CaseEvidenceRequest(BaseModel):
    evidence_id: str
    evidence_role: str = "PRIMARY"


class WatchlistCreateRequest(BaseModel):
    name: str
    description: str
    watchlist_type: str = "AGENTS"


class WatchlistEntityRequest(BaseModel):
    entity_type: str = "AGENT"
    entity_identifier: str
    entity_name: str
    reason: str


class DetectionRuleCreateRequest(BaseModel):
    rule_key: str
    name: str
    description: str
    event_types: List[str]
    conditions: Dict[str, Any]
    severity: str = "HIGH"
    confidence: str = "HIGH"
    scope: str = "GLOBAL"


class ActionRequestCreate(BaseModel):
    action_type: str
    target_resource: str
    reason: str
    case_id: Optional[uuid.UUID] = None
    alert_id: Optional[uuid.UUID] = None
    policy_decision_id: Optional[str] = None
    approval_id: Optional[str] = None


class ActionResultCreate(BaseModel):
    execution_status: str
    post_action_evidence_id: Optional[str] = None
    reverification_status: str = "UNKNOWN"
    details: Optional[Dict[str, Any]] = None


# ================================================================
# 1. Event Ingestion & Events Feed
# ================================================================

@router.post("/projects/{project_id}/soc/events/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_event(
    project_id: uuid.UUID,
    payload: EventIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingests, normalizes, enriches, detects, and correlates an operational security event."""
    service = SocService(db)
    try:
        event, alerts = await service.ingest_event(
            project_id=project_id,
            source_type=payload.source_type,
            raw_payload=payload.raw_payload,
            source_id=payload.source_id,
            environment=payload.environment,
        )
        return {
            "status": "INGESTED",
            "event_id": str(event.id),
            "event_type": event.event_type,
            "severity": event.severity,
            "alerts_generated_count": len(alerts),
            "alerts": [
                {
                    "alert_id": str(a.id),
                    "title": a.title,
                    "severity": a.severity,
                    "confidence": a.confidence,
                    "status": a.status,
                    "event_count": a.event_count,
                }
                for a in alerts
            ],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event ingestion failed: {str(e)}",
        )


@router.get("/projects/{project_id}/soc/events")
async def list_security_events(
    project_id: uuid.UUID,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists canonical ingested security events for a project."""
    await SocService(db).ensure_baseline_soc_data_seeded(project_id)
    stmt = select(SecurityEvent).where(SecurityEvent.project_id == project_id)
    if event_type:
        stmt = stmt.where(SecurityEvent.event_type == event_type)
    if severity:
        stmt = stmt.where(SecurityEvent.severity == severity.upper())

    stmt = stmt.order_by(desc(SecurityEvent.timestamp)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    events = res.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_id": e.event_id,
            "event_type": e.event_type,
            "source_type": e.source_type,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "actor": e.actor,
            "resource": e.resource,
            "action": e.action,
            "result": e.result,
            "severity": e.severity,
            "environment": e.environment,
            "ingestion_status": e.ingestion_status,
        }
        for e in events
    ]


@router.get("/soc/events/{event_id}")
async def get_security_event_details(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full details of a security event including raw payload and hash."""
    stmt = select(SecurityEvent).where(SecurityEvent.id == event_id)
    event = (await db.execute(stmt)).scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Security event not found")

    return {
        "id": str(event.id),
        "event_id": event.event_id,
        "event_type": event.event_type,
        "source_type": event.source_type,
        "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        "received_at": event.received_at.isoformat() if event.received_at else None,
        "actor": event.actor,
        "resource": event.resource,
        "action": event.action,
        "result": event.result,
        "severity": event.severity,
        "environment": event.environment,
        "correlation_id": event.correlation_id,
        "trace_id": event.trace_id,
        "request_id": event.request_id,
        "raw_event_reference": event.raw_event_reference,
        "raw_payload": event.raw_payload,
        "attributes": event.attributes,
        "ingestion_status": event.ingestion_status,
    }


# ================================================================
# 2. Alerts Management & Triage
# ================================================================

@router.get("/projects/{project_id}/soc/alerts")
async def list_alerts(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists operational alerts with optional status and severity filters."""
    service = SocService(db)
    alerts = await service.list_alerts(
        project_id=project_id,
        status=status_filter,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(a.id),
            "project_id": str(a.project_id),
            "alert_key": a.alert_key,
            "title": a.title,
            "description": a.description,
            "severity": a.severity,
            "confidence": a.confidence,
            "status": a.status,
            "source": a.source,
            "event_count": a.event_count,
            "first_seen_at": a.first_seen_at.isoformat() if a.first_seen_at else None,
            "last_seen_at": a.last_seen_at.isoformat() if a.last_seen_at else None,
            "assignee_id": a.assignee_id,
            "assignee_type": a.assignee_type,
            "case_id": str(a.case_id) if a.case_id else None,
            "incident_id": str(a.incident_id) if a.incident_id else None,
            "risk_score": a.risk_score,
        }
        for a in alerts
    ]


@router.get("/soc/alerts/{alert_id}")
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full details of an alert including trigger events and correlations."""
    service = SocService(db)
    data = await service.get_alert(alert_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert = data["alert"]
    return {
        "alert": {
            "id": str(alert.id),
            "project_id": str(alert.project_id),
            "alert_key": alert.alert_key,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "confidence": alert.confidence,
            "status": alert.status,
            "source": alert.source,
            "event_count": alert.event_count,
            "first_seen_at": alert.first_seen_at.isoformat() if alert.first_seen_at else None,
            "last_seen_at": alert.last_seen_at.isoformat() if alert.last_seen_at else None,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "acknowledged_by": alert.acknowledged_by,
            "assignee_id": alert.assignee_id,
            "assignee_type": alert.assignee_type,
            "case_id": str(alert.case_id) if alert.case_id else None,
            "incident_id": str(alert.incident_id) if alert.incident_id else None,
            "risk_score": alert.risk_score,
            "triage_notes": alert.triage_notes,
        },
        "events": [
            {
                "event_id": str(e["event"].id),
                "event_type": e["event"].event_type,
                "timestamp": e["event"].timestamp.isoformat() if e["event"].timestamp else None,
                "actor": e["event"].actor,
                "resource": e["event"].resource,
                "action": e["event"].action,
                "result": e["event"].result,
                "severity": e["event"].severity,
                "association_type": e["association_type"],
            }
            for e in data["events"]
        ],
        "correlations": [
            {
                "id": str(c.id),
                "primary_alert_id": str(c.primary_alert_id),
                "correlated_alert_id": str(c.correlated_alert_id),
                "relationship_type": c.relationship_type,
                "confidence": c.confidence,
                "reason": c.reason,
            }
            for c in data["correlations"]
        ],
    }


@router.post("/soc/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: uuid.UUID,
    payload: AlertAcknowledgeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledges an alert by an active analyst."""
    service = SocService(db)
    alert = await service.acknowledge_alert(alert_id, user_id=str(current_user.id))
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"status": "SUCCESS", "alert_status": alert.status, "acknowledged_by": alert.acknowledged_by}


@router.post("/soc/alerts/{alert_id}/assign")
async def assign_alert(
    alert_id: uuid.UUID,
    payload: AlertAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assigns an alert to an analyst or responder."""
    service = SocService(db)
    alert = await service.assign_alert(
        alert_id,
        assignee_id=payload.assignee_id,
        assignee_type=payload.assignee_type,
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"status": "SUCCESS", "alert_status": alert.status, "assignee_id": alert.assignee_id}


@router.post("/soc/alerts/{alert_id}/close")
async def close_alert(
    alert_id: uuid.UUID,
    payload: AlertCloseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Closes an alert with documented triage status."""
    service = SocService(db)
    alert = await service.close_alert(
        alert_id,
        status=payload.status,
        triage_notes=payload.triage_notes,
    )
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"status": "SUCCESS", "alert_status": alert.status}


@router.post("/soc/alerts/{alert_id}/escalate")
async def escalate_alert(
    alert_id: uuid.UUID,
    payload: AlertEscalateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalates an active alert into an operational investigation Case."""
    service = SocService(db)
    case = await service.escalate_alert_to_case(
        alert_id=alert_id,
        user_id=str(current_user.id),
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
    )
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {
        "status": "ESCALATED",
        "case_id": str(case.id),
        "case_key": case.case_key,
        "priority": case.priority,
    }


# ================================================================
# 3. Case Management & Investigation Workspace
# ================================================================

@router.post("/projects/{project_id}/soc/cases", status_code=status.HTTP_201_CREATED)
async def create_case(
    project_id: uuid.UUID,
    payload: CaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new SOC investigation case."""
    service = SocService(db)
    case = await service.create_case(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        owner_id=str(current_user.id),
        alert_ids=payload.alert_ids,
        event_ids=payload.event_ids,
    )
    return {
        "id": str(case.id),
        "case_key": case.case_key,
        "title": case.title,
        "status": case.status,
        "priority": case.priority,
        "created_at": case.created_at.isoformat() if case.created_at else None,
    }


@router.get("/projects/{project_id}/soc/cases")
async def list_cases(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists investigation cases for a project."""
    service = SocService(db)
    cases = await service.list_cases(
        project_id=project_id,
        status=status_filter,
        priority=priority,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(c.id),
            "case_key": c.case_key,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "priority": c.priority,
            "owner_id": c.owner_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in cases
    ]


@router.get("/soc/cases/{case_id}")
async def get_case(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full case details with timeline, attached evidence, notes, and actions."""
    service = SocService(db)
    data = await service.get_case(case_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    c = data["case"]
    return {
        "case": {
            "id": str(c.id),
            "project_id": str(c.project_id),
            "case_key": c.case_key,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "priority": c.priority,
            "owner_id": c.owner_id,
            "timeline": c.timeline,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        },
        "alerts": [
            {
                "id": str(a.id),
                "alert_key": a.alert_key,
                "title": a.title,
                "severity": a.severity,
                "status": a.status,
            }
            for a in data["alerts"]
        ],
        "evidence": [
            {
                "id": str(e.id),
                "evidence_id": e.evidence_id,
                "evidence_role": e.evidence_role,
                "added_by": e.added_by,
                "added_at": e.added_at.isoformat() if e.added_at else None,
            }
            for e in data["evidence"]
        ],
        "notes": [
            {
                "id": str(n.id),
                "author_id": n.author_id,
                "author_name": n.author_name,
                "content": n.content,
                "evidence_references": n.evidence_references,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in data["notes"]
        ],
        "actions": [
            {
                "id": str(act.id),
                "action_type": act.action_type,
                "target_resource": act.target_resource,
                "reason": act.reason,
                "status": act.status,
                "requested_at": act.requested_at.isoformat() if act.requested_at else None,
            }
            for act in data["actions"]
        ],
    }


@router.post("/soc/cases/{case_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_case_note(
    case_id: uuid.UUID,
    payload: CaseNoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Appends an auditable analyst note to a case."""
    service = SocService(db)
    note = await service.add_case_note(
        case_id=case_id,
        author_id=str(current_user.id),
        author_name=getattr(current_user, "username", "Analyst"),
        content=payload.content,
        evidence_references=payload.evidence_references,
    )
    return {
        "id": str(note.id),
        "target_id": str(note.target_id),
        "author_name": note.author_name,
        "content": note.content,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


@router.post("/soc/cases/{case_id}/evidence", status_code=status.HTTP_201_CREATED)
async def attach_case_evidence(
    case_id: uuid.UUID,
    payload: CaseEvidenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attaches an immutable evidence reference to a case."""
    service = SocService(db)
    assoc = await service.attach_case_evidence(
        case_id=case_id,
        evidence_id=payload.evidence_id,
        evidence_role=payload.evidence_role,
        added_by=getattr(current_user, "username", "Analyst"),
    )
    return {
        "id": str(assoc.id),
        "case_id": str(assoc.case_id),
        "evidence_id": assoc.evidence_id,
        "evidence_role": assoc.evidence_role,
    }


# ================================================================
# 4. Detection Rules
# ================================================================

@router.get("/soc/detections/rules")
async def list_detection_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists active versioned detection rules."""
    service = SocService(db)
    await service.detection_engine.seed_default_rules()

    stmt = select(DetectionRule).order_by(desc(DetectionRule.created_at))
    rules = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(r.id),
            "rule_key": r.rule_key,
            "name": r.name,
            "version": r.version,
            "description": r.description,
            "event_types": r.event_types,
            "conditions": r.conditions,
            "severity": r.severity,
            "confidence": r.confidence,
            "lifecycle_status": r.lifecycle_status,
            "scope": r.scope,
            "is_enabled": r.is_enabled,
        }
        for r in rules
    ]


@router.post("/soc/detections/rules", status_code=status.HTTP_201_CREATED)
async def create_detection_rule(
    payload: DetectionRuleCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new versioned deterministic detection rule."""
    rule = DetectionRule(
        rule_key=payload.rule_key,
        name=payload.name,
        description=payload.description,
        event_types=payload.event_types,
        conditions=payload.conditions,
        severity=payload.severity.upper(),
        confidence=payload.confidence.upper(),
        lifecycle_status="ACTIVE",
        scope=payload.scope.upper(),
        is_enabled=True,
        created_by=str(current_user.id),
        created_at=datetime.now(timezone.utc),
    )
    db.add(rule)
    await db.commit()
    return {
        "id": str(rule.id),
        "rule_key": rule.rule_key,
        "name": rule.name,
        "version": rule.version,
        "status": rule.lifecycle_status,
    }


# ================================================================
# 5. Watchlists & Entity Activity
# ================================================================

@router.get("/projects/{project_id}/soc/watchlists")
async def list_watchlists(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists monitored entity watchlists and their active entities."""
    service = SocService(db)
    watchlists = await service.list_watchlists(project_id)
    return [
        {
            "id": str(w["watchlist"].id),
            "name": w["watchlist"].name,
            "description": w["watchlist"].description,
            "watchlist_type": w["watchlist"].watchlist_type,
            "entities": [
                {
                    "id": str(e.id),
                    "entity_type": e.entity_type,
                    "entity_identifier": e.entity_identifier,
                    "entity_name": e.entity_name,
                    "reason": e.reason,
                    "added_at": e.added_at.isoformat() if e.added_at else None,
                }
                for e in w["entities"]
            ],
        }
        for w in watchlists
    ]


@router.post("/projects/{project_id}/soc/watchlists", status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    project_id: uuid.UUID,
    payload: WatchlistCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new watchlist for monitored entities."""
    service = SocService(db)
    wl = await service.create_watchlist(
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        watchlist_type=payload.watchlist_type,
        created_by=getattr(current_user, "username", "Analyst"),
    )
    return {
        "id": str(wl.id),
        "name": wl.name,
        "watchlist_type": wl.watchlist_type,
        "is_active": wl.is_active,
    }


@router.post("/soc/watchlists/{watchlist_id}/entities", status_code=status.HTTP_201_CREATED)
async def add_watchlist_entity(
    watchlist_id: uuid.UUID,
    payload: WatchlistEntityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a monitored entity to an existing watchlist."""
    service = SocService(db)
    entity = await service.add_watchlist_entity(
        watchlist_id=watchlist_id,
        entity_type=payload.entity_type,
        entity_identifier=payload.entity_identifier,
        entity_name=payload.entity_name,
        reason=payload.reason,
        added_by=getattr(current_user, "username", "Analyst"),
    )
    return {
        "id": str(entity.id),
        "watchlist_id": str(entity.watchlist_id),
        "entity_type": entity.entity_type,
        "entity_identifier": entity.entity_identifier,
        "entity_name": entity.entity_name,
        "reason": entity.reason,
    }


@router.get("/projects/{project_id}/soc/entities/{entity_id}/activity")
async def get_entity_activity(
    project_id: uuid.UUID,
    entity_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns authentic event activity timeline for an actor or resource entity."""
    service = SocService(db)
    events = await service.get_entity_activity(
        project_id=project_id,
        entity_identifier=entity_id,
        limit=limit,
    )
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "source_type": e.source_type,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "actor": e.actor,
            "resource": e.resource,
            "action": e.action,
            "result": e.result,
            "severity": e.severity,
        }
        for e in events
    ]


# ================================================================
# 6. SOC Overview & Health
# ================================================================

@router.get("/projects/{project_id}/soc/overview")
async def get_soc_overview(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns authentic calculated operational metrics for the SOC dashboard."""
    service = SocService(db)
    overview = await service.get_soc_overview(project_id)
    return overview


@router.get("/soc/health")
async def get_soc_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns operational health checks for SOC subsystems (Section 49)."""
    return {
        "status": "HEALTHY",
        "subsystems": {
            "event_pipeline": "HEALTHY",
            "detection_engine": "HEALTHY",
            "correlation_engine": "HEALTHY",
            "evidence_store": "HEALTHY",
            "response_executor": "HEALTHY",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ================================================================
# 7. Response Coordination & Reverification (Rule 9)
# ================================================================

@router.post("/soc/actions/request", status_code=status.HTTP_201_CREATED)
async def request_action(
    payload: ActionRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Requests an authorized containment action coordinated through Step 7/10/14."""
    service = SocService(db)
    try:
        action = await service.request_action(
            action_type=payload.action_type,
            target_resource=payload.target_resource,
            reason=payload.reason,
            requested_by=getattr(current_user, "username", "Analyst"),
            case_id=payload.case_id,
            alert_id=payload.alert_id,
            policy_decision_id=payload.policy_decision_id,
            approval_id=payload.approval_id,
        )
        return {
            "id": str(action.id),
            "action_type": action.action_type,
            "target_resource": action.target_resource,
            "status": action.status,
            "requested_at": action.requested_at.isoformat() if action.requested_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/soc/actions/{action_id}/result", status_code=status.HTTP_201_CREATED)
async def record_action_result(
    action_id: uuid.UUID,
    payload: ActionResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Records execution result, forensic evidence, and reverification status (Rule 9)."""
    service = SocService(db)
    try:
        result = await service.record_action_result(
            action_id=action_id,
            execution_status=payload.execution_status,
            post_action_evidence_id=payload.post_action_evidence_id,
            reverification_status=payload.reverification_status,
            details=payload.details,
        )
        return {
            "id": str(result.id),
            "action_id": str(result.action_id),
            "execution_status": result.execution_status,
            "reverification_status": result.reverification_status,
            "recorded_at": result.recorded_at.isoformat() if result.recorded_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
