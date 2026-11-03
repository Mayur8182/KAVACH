"""
Step 26 Advanced Rate Limiting, Abuse Detection & Brute-Force Protection API Endpoints.

Provides authenticated and audited endpoints for:
- Rate Limit Policy Management (creation, versioning, scoping, algorithms)
- Live Rate Limit Request Evaluation & Policy Simulation (dry run)
- Security Telemetry Ingestion (with SHA-256 cryptographic digests)
- Abuse & Brute-Force Detection Signals
- Block Management (Temporary & Permanent Blocks)
- Security Challenges
- Thing Protect Abuse & Rate Limiting Dashboard Metrics
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.abuse_models import (
    RateLimitPolicy,
    RateLimitDecision,
    AbuseDetectionEvent,
    AbuseDetectionSignal,
    TemporaryBlock,
    PermanentBlock,
    SecurityChallenge,
)
from app.abuse.service import AbuseProtectionService

router = APIRouter()


# ================================================================
# Pydantic Schemas
# ================================================================

class RateLimitPolicyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    scope: str = Field(default="GLOBAL", description="GLOBAL, TENANT, PROJECT, ENVIRONMENT, ENDPOINT, USER, AGENT, TOOL, WORKLOAD")
    priority: int = Field(default=100)
    algorithm: str = Field(default="TOKEN_BUCKET", description="TOKEN_BUCKET, LEAKY_BUCKET, FIXED_WINDOW, SLIDING_WINDOW, CONCURRENCY_LIMIT, ADAPTIVE")
    limit_count: int = Field(default=100, ge=1)
    window_seconds: int = Field(default=60, ge=1)
    burst: int = Field(default=20, ge=1)
    concurrency_limit: Optional[int] = None
    fail_behavior: str = Field(default="FAIL_OPEN", description="FAIL_OPEN, FAIL_CLOSED")
    conditions: Dict[str, Any] = Field(default_factory=dict)
    action: str = Field(default="THROTTLE", description="ALLOW, THROTTLE, DELAY, CHALLENGE, WARN, BLOCK, REQUIRE_MFA, REQUIRE_APPROVAL, REVOKE_SESSION")
    enabled: bool = True
    dry_run: bool = False
    tenant_id: Optional[str] = None


class RateLimitEvaluateRequest(BaseModel):
    endpoint: str = Field(..., min_length=1)
    http_method: str = "POST"
    ip_address: str = "127.0.0.1"
    user_id: Optional[str] = None
    account_identifier: Optional[str] = None
    agent_id: Optional[str] = None
    tool_name: Optional[str] = None
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class TelemetryIngestRequest(BaseModel):
    event_type: str = Field(default="AUTHENTICATION", description="AUTHENTICATION, MFA, TOKEN, SESSION, API_CALL, AGENT_TOOL")
    endpoint: str
    result_status: str = Field(default="INVALID_CREDENTIALS", description="SUCCESS, INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_NOT_FOUND, MFA_REQUIRED, MFA_FAILED, TOKEN_INVALID, TOKEN_EXPIRED, RATE_LIMITED, SERVER_ERROR")
    ip_address: str
    account_identifier: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    device_id: Optional[str] = None
    user_agent: Optional[str] = None
    agent_id: Optional[str] = None
    tool_name: Optional[str] = None
    metadata_payload: Optional[Dict[str, Any]] = None
    project_id: Optional[str] = None
    tenant_id: Optional[str] = None


class BlockCreateRequest(BaseModel):
    block_type: str = Field(..., description="IP, USER, ACCOUNT, AGENT, CIDR")
    target_value: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=3)
    permanent: bool = False
    duration_minutes: int = Field(default=60, ge=1)


# ================================================================
# 1. Rate Limit Policies
# ================================================================

@router.get("/rate-limits/policies")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all configured rate limit policies."""
    service = AbuseProtectionService(db)
    policies = await service.list_policies()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "version": p.version,
            "scope": p.scope,
            "priority": p.priority,
            "algorithm": p.algorithm,
            "limit_count": p.limit_count,
            "window_seconds": p.window_seconds,
            "burst": p.burst,
            "concurrency_limit": p.concurrency_limit,
            "fail_behavior": p.fail_behavior,
            "action": p.action,
            "enabled": p.enabled,
            "dry_run": p.dry_run,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in policies
    ]


@router.post("/rate-limits/policies", status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: RateLimitPolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new rate limit policy and records its initial version."""
    service = AbuseProtectionService(db)
    policy = await service.create_policy(
        data=payload.model_dump(),
        created_by=getattr(current_user, "email", "ADMIN"),
    )
    return {
        "id": str(policy.id),
        "name": policy.name,
        "algorithm": policy.algorithm,
        "limit_count": policy.limit_count,
        "window_seconds": policy.window_seconds,
        "action": policy.action,
        "status": "CREATED",
    }


@router.get("/rate-limits/policies/{policy_id}")
async def get_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gets policy details."""
    service = AbuseProtectionService(db)
    p = await service.get_policy(policy_id)
    if not p:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description,
        "scope": p.scope,
        "priority": p.priority,
        "algorithm": p.algorithm,
        "limit_count": p.limit_count,
        "window_seconds": p.window_seconds,
        "burst": p.burst,
        "fail_behavior": p.fail_behavior,
        "conditions": p.conditions,
        "action": p.action,
        "enabled": p.enabled,
        "dry_run": p.dry_run,
    }


# ================================================================
# 2. Evaluation & Simulation Endpoints
# ================================================================

@router.post("/rate-limits/evaluate")
async def evaluate_live_request(
    payload: RateLimitEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluates incoming request parameters in real-time.
    Enforces active blocks and rate limits, records decision audit log,
    and returns authoritative decision (ALLOW, THROTTLE, CHALLENGE, BLOCK).
    """
    service = AbuseProtectionService(db)
    res = await service.evaluate_request(
        endpoint=payload.endpoint,
        http_method=payload.http_method,
        ip_address=payload.ip_address,
        user_id=payload.user_id,
        account_identifier=payload.account_identifier,
        agent_id=payload.agent_id,
        tool_name=payload.tool_name,
        tenant_id=payload.tenant_id,
        project_id=payload.project_id,
        context=payload.context,
    )
    return {
        "decision": res.decision,
        "allowed": res.allowed,
        "tokens_remaining": res.tokens_remaining,
        "retry_after_seconds": res.retry_after,
        "policy_name": res.policy_name,
        "algorithm_used": res.algorithm_used,
        "execution_status": res.execution_status,
        "dry_run": res.dry_run,
        "reason": res.reason,
        "evidence": res.evidence,
    }


@router.post("/rate-limits/simulate")
async def simulate_policy_check(
    payload: RateLimitEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Performs dry-run policy simulation without updating token counters or persisting decisions."""
    service = AbuseProtectionService(db)
    return await service.simulate_policy(
        endpoint=payload.endpoint,
        http_method=payload.http_method,
        ip_address=payload.ip_address,
        account_identifier=payload.account_identifier,
        agent_id=payload.agent_id,
        tool_name=payload.tool_name,
        context=payload.context,
    )


@router.get("/rate-limits/decisions")
async def list_decisions(
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns recent rate limit decision audit records."""
    service = AbuseProtectionService(db)
    decisions = await service.list_decisions(limit=limit)
    return [
        {
            "id": str(d.id),
            "policy_name": d.policy_name,
            "identity_key": d.identity_key,
            "identity_type": d.identity_type,
            "endpoint": d.endpoint,
            "http_method": d.http_method,
            "algorithm_used": d.algorithm_used,
            "decision": d.decision,
            "execution_status": d.execution_status,
            "tokens_remaining": d.tokens_remaining,
            "retry_after_seconds": d.retry_after_seconds,
            "dry_run": d.dry_run,
            "reason": d.reason,
            "timestamp": d.timestamp.isoformat() if d.timestamp else None,
        }
        for d in decisions
    ]


# ================================================================
# 3. Telemetry Ingestion & Abuse Signals
# ================================================================

@router.post("/abuse/events", status_code=status.HTTP_201_CREATED)
async def ingest_abuse_event(
    payload: TelemetryIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ingests normalized authentication/MFA/API/Agent telemetry,
    hashes raw payload with SHA-256 for tamper-proof evidence,
    and runs deterministic abuse & brute-force detectors.
    """
    service = AbuseProtectionService(db)
    return await service.ingest_security_event(
        event_type=payload.event_type,
        endpoint=payload.endpoint,
        result_status=payload.result_status,
        ip_address=payload.ip_address,
        account_identifier=payload.account_identifier,
        user_id=payload.user_id,
        session_id=payload.session_id,
        device_id=payload.device_id,
        user_agent=payload.user_agent,
        agent_id=payload.agent_id,
        tool_name=payload.tool_name,
        metadata_payload=payload.metadata_payload,
        project_id=payload.project_id,
        tenant_id=payload.tenant_id,
    )


@router.get("/abuse/signals")
async def list_abuse_signals(
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns detected abuse and brute force signals."""
    service = AbuseProtectionService(db)
    signals = await service.list_signals(limit=limit)
    return [
        {
            "id": str(s.id),
            "signal_type": s.signal_type,
            "severity": s.severity,
            "status": s.status,
            "confidence_score": s.confidence_score,
            "target_resource": s.target_resource,
            "target_identity": s.target_identity,
            "evidence": s.evidence,
            "recommended_action": s.recommended_action,
            "action_taken": s.action_taken,
            "escalation_reference": s.escalation_reference,
            "detected_at": s.detected_at.isoformat() if s.detected_at else None,
        }
        for s in signals
    ]


# ================================================================
# 4. Blocks & Security Challenges
# ================================================================

@router.get("/blocks")
async def list_blocks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists currently active temporary and permanent blocks."""
    service = AbuseProtectionService(db)
    blocks_data = await service.list_blocks()
    return {
        "temporary_blocks": [
            {
                "id": str(b.id),
                "block_type": b.block_type,
                "target_value": b.target_value,
                "reason": b.reason,
                "expires_at": b.expires_at.isoformat() if b.expires_at else None,
                "active": b.active,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in blocks_data["temporary_blocks"]
        ],
        "permanent_blocks": [
            {
                "id": str(b.id),
                "block_type": b.block_type,
                "target_value": b.target_value,
                "reason": b.reason,
                "authorized_by": b.authorized_by,
                "active": b.active,
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in blocks_data["permanent_blocks"]
        ],
    }


@router.post("/blocks", status_code=status.HTTP_201_CREATED)
async def create_block(
    payload: BlockCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a temporary or permanent block on an IP, account, or agent."""
    service = AbuseProtectionService(db)
    return await service.create_block(
        block_type=payload.block_type,
        target_value=payload.target_value,
        reason=payload.reason,
        permanent=payload.permanent,
        duration_minutes=payload.duration_minutes,
        authorized_by=getattr(current_user, "email", "ADMIN"),
    )


@router.delete("/blocks/{block_id}")
async def delete_block(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivates a temporary or permanent block."""
    temp_stmt = select(TemporaryBlock).where(TemporaryBlock.id == block_id)
    res_temp = await db.execute(temp_stmt)
    tb = res_temp.scalar_one_or_none()
    if tb:
        tb.active = False
        await db.commit()
        return {"id": str(block_id), "status": "DEACTIVATED"}

    perm_stmt = select(PermanentBlock).where(PermanentBlock.id == block_id)
    res_perm = await db.execute(perm_stmt)
    pb = res_perm.scalar_one_or_none()
    if pb:
        pb.active = False
        await db.commit()
        return {"id": str(block_id), "status": "DEACTIVATED"}

    raise HTTPException(status_code=404, detail="Block not found")


# ================================================================
# 5. Dashboard Metrics & Overview
# ================================================================

@router.get("/abuse/overview")
async def get_abuse_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns authentic dashboard metrics aggregated directly from database tables.
    Never returns static numbers or synthetic mock data.
    """
    service = AbuseProtectionService(db)
    return await service.get_overview_statistics()
