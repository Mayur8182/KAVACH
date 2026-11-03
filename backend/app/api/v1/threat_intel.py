"""
Step 24 Threat Intelligence Platform API Router.

Provides authenticated endpoints for:
- Threat intelligence source feeds & sync job execution
- Normalized threat indicators & provenance tracking
- Threat match correlation against customer observations
- Threat match escalation to Thing SOC (Section 24)
- Threat actors, malware families, and TTP techniques
- False positive suppression management (Section 45)
- Authentic calculated threat overview metrics (Section 38, 68)
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
from app.threat_intel.service import ThreatIntelligenceService
from app.models.threat_intel_models import ThreatActor, MalwareFamily, ThreatTechnique

router = APIRouter(tags=["Threat Intelligence Platform"])


# ================================================================
# Request & Response Schemas
# ================================================================

class SourceCreateRequest(BaseModel):
    name: str
    source_type: str = Field(..., description="STIX_TAXII, REST_API, JSON, CSV, ADVISORY, INTERNAL")
    provider: str
    endpoint: str
    protocol: str = "HTTPS"
    authentication_type: str = "NONE"
    configuration: Optional[Dict[str, Any]] = None
    poll_interval_minutes: int = 60


class SourceSyncRequest(BaseModel):
    feed_payload: Optional[Dict[str, Any]] = None


class ObservationCorrelateRequest(BaseModel):
    project_id: uuid.UUID
    observation_type: str
    observed_value: str
    observed_entity_id: str
    observed_entity_type: str = "WORKLOAD"
    environment: str = "PRODUCTION"
    evidence_reference: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class SuppressionCreateRequest(BaseModel):
    indicator_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    reason: str
    duration_days: int = 30
    scope: str = "PROJECT"


# ================================================================
# 1. Sources & Sync Jobs
# ================================================================

@router.get("/intelligence/sources")
async def list_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists registered threat intelligence sources."""
    service = ThreatIntelligenceService(db)
    sources = await service.list_sources()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "source_type": s.source_type,
            "provider": s.provider,
            "protocol": s.protocol,
            "endpoint": s.endpoint,
            "status": s.status,
            "status_reason": s.status_reason,
            "enabled": s.enabled,
            "poll_interval_minutes": s.poll_interval_minutes,
            "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
        }
        for s in sources
    ]


@router.post("/intelligence/sources", status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: SourceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registers a new threat intelligence feed."""
    service = ThreatIntelligenceService(db)
    src = await service.create_source(
        name=payload.name,
        source_type=payload.source_type,
        provider=payload.provider,
        endpoint=payload.endpoint,
        protocol=payload.protocol,
        authentication_type=payload.authentication_type,
        configuration=payload.configuration,
        poll_interval_minutes=payload.poll_interval_minutes,
    )
    return {
        "id": str(src.id),
        "name": src.name,
        "source_type": src.source_type,
        "status": src.status,
    }


@router.post("/intelligence/sources/{source_id}/sync")
async def trigger_source_sync(
    source_id: uuid.UUID,
    payload: SourceSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes a synchronization job for the specified intelligence feed."""
    service = ThreatIntelligenceService(db)
    try:
        sync_job = await service.sync_source(
            source_id=source_id,
            feed_payload=payload.feed_payload,
        )
        return {
            "sync_id": str(sync_job.id),
            "source_id": str(sync_job.source_id),
            "status": sync_job.status,
            "records_received": sync_job.records_received,
            "records_added": sync_job.records_added,
            "records_updated": sync_job.records_updated,
            "error_count": sync_job.error_count,
            "error_message": sync_job.error_message,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Sync execution failed: {str(e)}")


# ================================================================
# 2. Indicators & Search
# ================================================================

@router.get("/intelligence/indicators")
async def list_indicators(
    indicator_type: Optional[str] = None,
    confidence: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queries canonical threat indicators."""
    service = ThreatIntelligenceService(db)
    indicators = await service.list_indicators(
        indicator_type=indicator_type,
        confidence=confidence,
        severity=severity,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(ind.id),
            "indicator_type": ind.indicator_type,
            "value": ind.value,
            "title": ind.title,
            "description": ind.description,
            "confidence": ind.confidence,
            "severity": ind.severity,
            "status": ind.status,
            "source_count": ind.source_count,
            "threat_types": ind.threat_types,
            "first_seen": ind.first_seen.isoformat() if ind.first_seen else None,
            "last_seen": ind.last_seen.isoformat() if ind.last_seen else None,
            "valid_until": ind.valid_until.isoformat() if ind.valid_until else None,
        }
        for ind in indicators
    ]


@router.get("/intelligence/indicators/{indicator_id}")
async def get_indicator_detail(
    indicator_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full indicator details with supporting sources and customer observations."""
    service = ThreatIntelligenceService(db)
    data = await service.get_indicator(indicator_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")

    ind = data["indicator"]
    return {
        "indicator": {
            "id": str(ind.id),
            "indicator_type": ind.indicator_type,
            "value": ind.value,
            "title": ind.title,
            "description": ind.description,
            "confidence": ind.confidence,
            "severity": ind.severity,
            "status": ind.status,
            "source_count": ind.source_count,
            "threat_types": ind.threat_types,
            "first_seen": ind.first_seen.isoformat() if ind.first_seen else None,
            "last_seen": ind.last_seen.isoformat() if ind.last_seen else None,
            "valid_until": ind.valid_until.isoformat() if ind.valid_until else None,
            "raw_data_reference": ind.raw_data_reference,
        },
        "sources": data["sources"],
        "observations": [
            {
                "id": str(o.id),
                "observation_type": o.observation_type,
                "observed_entity_id": o.observed_entity_id,
                "observed_entity_type": o.observed_entity_type,
                "observed_at": o.observed_at.isoformat() if o.observed_at else None,
            }
            for o in data["observations"]
        ],
        "matches": [
            {
                "id": str(m.id),
                "match_key": m.match_key,
                "match_type": m.match_type,
                "confidence": m.confidence,
                "severity": m.severity,
                "status": m.status,
                "first_seen_at": m.first_seen_at.isoformat() if m.first_seen_at else None,
            }
            for m in data["matches"]
        ],
    }


@router.post("/intelligence/indicators/{indicator_id}/suppress", status_code=status.HTTP_201_CREATED)
async def suppress_indicator_direct(
    indicator_id: uuid.UUID,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suppresses an indicator directly by ID."""
    service = ThreatIntelligenceService(db)
    reason = payload.get("reason", "False positive")
    duration_days = payload.get("duration_days", 30)
    scope = payload.get("scope", "GLOBAL")
    proj_id_raw = payload.get("project_id")
    project_id = uuid.UUID(proj_id_raw) if proj_id_raw else None

    supp = await service.suppress_indicator(
        indicator_id=indicator_id,
        project_id=project_id,
        reason=reason,
        suppressed_by=getattr(current_user, "username", "Analyst"),
        duration_days=duration_days,
        scope=scope,
    )
    return {
        "id": str(supp.id),
        "indicator_id": str(supp.indicator_id),
        "scope": supp.scope,
        "is_active": supp.is_active,
        "expires_at": supp.expires_at.isoformat() if supp.expires_at else None,
    }


# ================================================================
# 3. Correlation & Matches
# ================================================================

@router.post("/intelligence/correlate")
async def correlate_observation(
    payload: ObservationCorrelateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Correlates an observed entity/telemetry against active threat indicators."""
    service = ThreatIntelligenceService(db)
    result = await service.matcher.correlate_observation(
        project_id=payload.project_id,
        observation_type=payload.observation_type,
        observed_value=payload.observed_value,
        observed_entity_id=payload.observed_entity_id,
        observed_entity_type=payload.observed_entity_type,
        environment=payload.environment,
        evidence_reference=payload.evidence_reference,
        context=payload.context,
    )
    if not result:
        return {"matched": False, "message": "No active unsuppressed threat indicator matched."}

    match, obs = result
    return {
        "matched": True,
        "match_id": str(match.id),
        "match_key": match.match_key,
        "match_type": match.match_type,
        "confidence": match.confidence,
        "severity": match.severity,
        "status": match.status,
    }


@router.get("/projects/{project_id}/intelligence/matches")
async def list_threat_matches(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists threat matches for a project."""
    service = ThreatIntelligenceService(db)
    matches = await service.list_matches(
        project_id=project_id,
        status=status_filter,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(m.id),
            "match_key": m.match_key,
            "match_type": m.match_type,
            "observed_entity": m.observed_entity,
            "environment": m.environment,
            "confidence": m.confidence,
            "severity": m.severity,
            "status": m.status,
            "first_seen_at": m.first_seen_at.isoformat() if m.first_seen_at else None,
            "last_seen_at": m.last_seen_at.isoformat() if m.last_seen_at else None,
            "alert_id": str(m.alert_id) if m.alert_id else None,
        }
        for m in matches
    ]


@router.get("/intelligence/matches/{match_id}")
async def get_match_detail(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full details for a single threat match."""
    service = ThreatIntelligenceService(db)
    data = await service.get_match(match_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Threat match not found")
    m = data["match"]
    ind = data["indicator"]
    return {
        "id": str(m.id),
        "match_key": m.match_key,
        "match_type": m.match_type,
        "observed_entity": m.observed_entity,
        "environment": m.environment,
        "confidence": m.confidence,
        "severity": m.severity,
        "status": m.status,
        "first_seen_at": m.first_seen_at.isoformat() if m.first_seen_at else None,
        "last_seen_at": m.last_seen_at.isoformat() if m.last_seen_at else None,
        "alert_id": str(m.alert_id) if m.alert_id else None,
        "indicator": {
            "id": str(ind.id),
            "indicator_type": ind.indicator_type,
            "value": ind.value,
            "confidence": ind.confidence,
            "severity": ind.severity,
        } if ind else None,
    }


@router.post("/intelligence/matches/{match_id}/escalate")
async def escalate_match_to_soc(
    match_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalates an evidence-backed threat match to Step 23 SOC as an operational SocAlert."""
    service = ThreatIntelligenceService(db)
    try:
        soc_alert = await service.escalate_match_to_soc(
            match_id=match_id,
            analyst_user_id=str(current_user.id),
        )
        return {
            "status": "ESCALATED_TO_SOC",
            "alert_id": str(soc_alert.id),
            "alert_key": soc_alert.alert_key,
            "severity": soc_alert.severity,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ================================================================
# 4. Threat Actors, Malware & Techniques
# ================================================================

@router.get("/intelligence/threat-actors")
async def list_threat_actors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists tracked threat actors and adversary groups."""
    service = ThreatIntelligenceService(db)
    await service.ensure_baseline_threat_intel_seeded()
    stmt = select(ThreatActor).order_by(ThreatActor.name)
    res = await db.execute(stmt)
    actors = res.scalars().all()
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "aliases": a.aliases,
            "description": a.description,
            "country": a.country,
            "motivation": a.motivation,
            "confidence": a.confidence,
            "references": a.references,
        }
        for a in actors
    ]


@router.get("/intelligence/malware")
async def list_malware(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists tracked malware families and toolkits."""
    service = ThreatIntelligenceService(db)
    await service.ensure_baseline_threat_intel_seeded()
    stmt = select(MalwareFamily).order_by(MalwareFamily.name)
    res = await db.execute(stmt)
    malware = res.scalars().all()
    return [
        {
            "id": str(m.id),
            "name": m.name,
            "aliases": m.aliases,
            "malware_type": m.malware_type,
            "description": m.description,
            "confidence": m.confidence,
            "references": m.references,
        }
        for m in malware
    ]


@router.get("/intelligence/techniques")
async def list_threat_techniques(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists MITRE ATT&CK techniques associated with threat intelligence."""
    service = ThreatIntelligenceService(db)
    await service.ensure_baseline_threat_intel_seeded()
    stmt = select(ThreatTechnique).order_by(ThreatTechnique.technique_id)
    res = await db.execute(stmt)
    techniques = res.scalars().all()
    return [
        {
            "id": str(t.id),
            "technique_id": t.technique_id,
            "name": t.name,
            "tactic": t.tactic,
            "description": t.description,
            "url": t.url,
            "detection_guidance": t.detection_guidance,
        }
        for t in techniques
    ]


# ================================================================
# 5. Suppressions & Dashboard Overview
# ================================================================

@router.post("/intelligence/suppressions", status_code=status.HTTP_201_CREATED)
async def suppress_indicator(
    payload: SuppressionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a false-positive or legitimate business service suppression rule."""
    service = ThreatIntelligenceService(db)
    supp = await service.suppress_indicator(
        indicator_id=payload.indicator_id,
        project_id=payload.project_id,
        reason=payload.reason,
        suppressed_by=getattr(current_user, "username", "Analyst"),
        duration_days=payload.duration_days,
        scope=payload.scope,
    )
    return {
        "id": str(supp.id),
        "indicator_id": str(supp.indicator_id),
        "scope": supp.scope,
        "is_active": supp.is_active,
        "expires_at": supp.expires_at.isoformat() if supp.expires_at else None,
    }


@router.get("/intelligence/overview")
async def get_threat_intel_overview(
    project_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns authentic operational threat intelligence dashboard metrics."""
    service = ThreatIntelligenceService(db)
    overview = await service.get_overview_statistics(project_id)
    return overview
