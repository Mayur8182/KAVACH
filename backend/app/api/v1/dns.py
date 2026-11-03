"""
Step 25 DNS Security & DNS Threat Protection API Endpoints.

Provides authenticated, audited endpoints for:
- DNS Telemetry Sources
- DNS Telemetry Ingestion (with SHA-256 raw hashing)
- DNS Events & Canonical Domains
- DNS Policies & List Management (Allowlist, Blocklist, Watchlist)
- DNS Decisions & Post-Decision Enforcement Audits
- DNS Threat Signals (DGA, Tunneling, Beaconing) with Step 23 SOC Escalation
- Authentic Dashboard Metrics
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.dns.service import DNSSecurityService

router = APIRouter()


# ================================================================
# Pydantic Schemas
# ================================================================

class DNSSourceCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    source_type: str = Field(..., description="CLOUD_DNS, RESOLVER, KUBERNETES, ENDPOINT_AGENT, SENSOR")
    provider: str = Field(..., description="AWS_ROUTE53, COREDNS, CLOUDFLARE, BIND, GENERIC")
    endpoint: str = Field(..., min_length=1)
    authentication_type: str = Field(default="NONE")
    configuration: Optional[Dict[str, Any]] = None


class DNSTelemetryIngestRequest(BaseModel):
    query_name: str
    query_type: str = "A"
    response_code: str = "NOERROR"
    answers: Optional[List[Dict[str, Any]]] = None
    resolver: Optional[str] = "CoreDNS"
    resolver_ip: Optional[str] = "10.96.0.10"
    protocol: str = "UDP"
    client_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    client_identity: Optional[str] = None
    agent_identity: Optional[str] = None
    workload_identity: Optional[str] = None
    pod_id: Optional[str] = None
    namespace: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    environment: str = "PRODUCTION"
    duration_ms: Optional[float] = 1.0


class DNSPolicyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    conditions: Dict[str, Any]
    action: str = Field(default="BLOCK", description="ALLOW, WARN, BLOCK, LOG, SINKHOLE, REQUIRE_APPROVAL")
    scope: str = Field(default="GLOBAL")
    priority: int = Field(default=100)
    project_id: Optional[uuid.UUID] = None
    sinkhole_ip: Optional[str] = None


class DNSListEntryCreateRequest(BaseModel):
    list_type: str = Field(..., description="ALLOWLIST, BLOCKLIST, WATCHLIST")
    domain_pattern: str = Field(..., description="api.stripe.com or *.evil-c2.net")
    reason: str = Field(..., min_length=3)
    scope: str = Field(default="PROJECT")
    pattern_type: str = Field(default="EXACT")
    project_id: Optional[uuid.UUID] = None
    duration_days: Optional[int] = None


# ================================================================
# 1. Sources Registry
# ================================================================

@router.get("/dns/sources")
async def list_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists registered DNS telemetry sources."""
    service = DNSSecurityService(db)
    sources = await service.list_sources()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "source_type": s.source_type,
            "provider": s.provider,
            "endpoint": s.endpoint,
            "status": s.status,
            "enabled": s.enabled,
            "events_collected": s.events_collected,
            "last_seen": s.last_seen.isoformat() if s.last_seen else None,
            "last_success": s.last_success.isoformat() if s.last_success else None,
        }
        for s in sources
    ]


@router.post("/dns/sources", status_code=status.HTTP_201_CREATED)
async def register_source(
    payload: DNSSourceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registers a new DNS telemetry collector source."""
    service = DNSSecurityService(db)
    src = await service.register_source(
        name=payload.name,
        source_type=payload.source_type,
        provider=payload.provider,
        endpoint=payload.endpoint,
        authentication_type=payload.authentication_type,
        configuration=payload.configuration,
    )
    return {
        "id": str(src.id),
        "name": src.name,
        "source_type": src.source_type,
        "status": src.status,
    }


# ================================================================
# 2. Telemetry Ingestion
# ================================================================

@router.post("/dns/telemetry/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_dns_telemetry(
    payload: DNSTelemetryIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests and evaluates a single real DNS telemetry event:
    Calculates SHA-256 raw digest, extracts linguistic entropy, checks threat intelligence,
    evaluates policies, and records audit trail.
    """
    service = DNSSecurityService(db)
    res = await service.ingest_dns_event(
        raw_payload=payload.model_dump(),
        project_id=payload.project_id,
    )
    return res


# ================================================================
# 3. DNS Events & Domains
# ================================================================

@router.get("/dns/events")
async def list_events(
    project_id: Optional[uuid.UUID] = None,
    domain: Optional[str] = None,
    response_code: Optional[str] = None,
    agent_identity: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queries canonical DNS telemetry events."""
    service = DNSSecurityService(db)
    events = await service.list_events(
        project_id=project_id,
        domain_query=domain,
        response_code=response_code,
        agent_identity=agent_identity,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(e.id),
            "timestamp": e.timestamp.isoformat(),
            "query_name": e.query_name,
            "normalized_query": e.normalized_query,
            "query_type": e.query_type,
            "response_code": e.response_code,
            "answers": e.answers,
            "resolver": e.resolver,
            "protocol": e.protocol,
            "client_identity": e.client_identity,
            "agent_identity": e.agent_identity,
            "environment": e.environment,
            "raw_event_reference": e.raw_event_reference,
            "decision_id": str(e.decision_id) if e.decision_id else None,
        }
        for e in events
    ]


@router.get("/dns/domains")
async def list_domains(
    reputation: Optional[str] = None,
    classification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists observed canonical domains with reputation and entropy scores."""
    service = DNSSecurityService(db)
    domains = await service.list_domains(
        reputation=reputation,
        classification=classification,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(d.id),
            "fqdn": d.fqdn,
            "registered_domain": d.registered_domain,
            "subdomain": d.subdomain,
            "tld": d.tld,
            "entropy": d.entropy,
            "reputation": d.reputation,
            "classification": d.classification,
            "total_queries": d.total_queries,
            "status": d.status,
            "is_idn": d.is_idn,
            "idn_classification": d.idn_classification,
            "first_seen": d.first_seen.isoformat(),
            "last_seen": d.last_seen.isoformat(),
        }
        for d in domains
    ]


# ================================================================
# 4. Policies & Allowlists / Blocklists
# ================================================================

@router.get("/dns/policies")
async def list_policies(
    project_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists versioned DNS policies."""
    service = DNSSecurityService(db)
    policies = await service.list_policies(project_id)
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "version": p.version,
            "scope": p.scope,
            "priority": p.priority,
            "action": p.action,
            "conditions": p.conditions,
            "sinkhole_ip": p.sinkhole_ip,
            "enabled": p.enabled,
        }
        for p in policies
    ]


@router.post("/dns/policies", status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: DNSPolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new versioned DNS security policy."""
    service = DNSSecurityService(db)
    policy = await service.create_policy(
        name=payload.name,
        conditions=payload.conditions,
        action=payload.action,
        scope=payload.scope,
        priority=payload.priority,
        project_id=payload.project_id,
        sinkhole_ip=payload.sinkhole_ip,
        created_by=getattr(current_user, "username", "Admin"),
    )
    return {
        "id": str(policy.id),
        "name": policy.name,
        "action": policy.action,
        "scope": policy.scope,
    }


@router.get("/dns/lists")
async def list_list_entries(
    list_type: Optional[str] = None,
    project_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists entries from Allowlists, Blocklists, or Watchlists."""
    service = DNSSecurityService(db)
    entries = await service.list_list_entries(list_type, project_id)
    return [
        {
            "id": str(e.id),
            "list_type": e.list_type,
            "domain_pattern": e.domain_pattern,
            "pattern_type": e.pattern_type,
            "scope": e.scope,
            "reason": e.reason,
            "created_by": e.created_by,
            "expires_at": e.expires_at.isoformat() if e.expires_at else None,
            "is_active": e.is_active,
        }
        for e in entries
    ]


@router.post("/dns/lists", status_code=status.HTTP_201_CREATED)
async def create_list_entry(
    payload: DNSListEntryCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a domain pattern to Allowlist, Blocklist, or Watchlist."""
    service = DNSSecurityService(db)
    entry = await service.add_list_entry(
        list_type=payload.list_type,
        domain_pattern=payload.domain_pattern,
        reason=payload.reason,
        created_by=getattr(current_user, "username", "SecOps"),
        project_id=payload.project_id,
        scope=payload.scope,
        pattern_type=payload.pattern_type,
        duration_days=payload.duration_days,
    )
    return {
        "id": str(entry.id),
        "list_type": entry.list_type,
        "domain_pattern": entry.domain_pattern,
        "is_active": entry.is_active,
    }


# ================================================================
# 5. Signals & SOC Escalation
# ================================================================

@router.get("/dns/signals")
async def list_signals(
    project_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists detected security signals (Tunneling, DGA, Beaconing, Threat Match)."""
    service = DNSSecurityService(db)
    signals = await service.list_signals(project_id=project_id, status=status_filter, limit=limit)
    return [
        {
            "id": str(s.id),
            "signal_key": s.signal_key,
            "alert_type": s.alert_type,
            "severity": s.severity,
            "confidence": s.confidence,
            "domain": s.domain,
            "entity_id": s.entity_id,
            "entity_type": s.entity_type,
            "details": s.details,
            "status": s.status,
            "soc_alert_id": str(s.soc_alert_id) if s.soc_alert_id else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in signals
    ]


@router.post("/dns/signals/{signal_id}/escalate")
async def escalate_signal_to_soc(
    signal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalates an evidence-backed DNS signal to Thing SOC as an operational SocAlert."""
    service = DNSSecurityService(db)
    try:
        alert = await service.escalate_signal_to_soc(
            signal_id=signal_id,
            analyst_user_id=str(current_user.id),
        )
        return {
            "status": "ESCALATED",
            "soc_alert_id": str(alert.id),
            "alert_key": alert.alert_key,
            "severity": alert.severity,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ================================================================
# 6. Dashboard Metrics
# ================================================================

@router.get("/dns/overview")
@router.get("/dns/stats")
async def get_dns_overview(
    project_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculates authentic DNS security overview metrics."""
    service = DNSSecurityService(db)
    stats = await service.get_overview_statistics(project_id)
    return stats
