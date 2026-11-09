"""
Kavach Security Intelligence Engine (SIE) — API Router.
Provides contextual, evidence-backed security intelligence endpoints:
- Prioritized findings with deterministic risk bands (P0 to P4)
- Reachability analysis connecting public API entry points to vulnerable code/sinks
- Candidate attack path exploration
- Aggregate posture metrics
- Controlled, audited finding suppression
"""

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import TenantContext, get_current_tenant_context
from app.models.user import User
from app.models.scan import SecurityFinding, SecurityScan
from app.models.audit_event import AuditEvent
from app.intelligence.security.engine import SecurityIntelligenceEngine
from app.intelligence.security.schemas import PriorityBand, ReachabilityStatus

router = APIRouter(prefix="/security-intelligence", tags=["Security Intelligence"])


class SuppressFindingRequest(BaseModel):
    reason: str = Field(description="Justification for suppressing the security finding")
    expiry_days: Optional[int] = Field(default=90, description="Number of days until suppression review")


@router.get(
    "/findings",
    summary="List and rank canonical security findings by contextual priority",
    response_model=Dict[str, Any],
)
async def list_prioritized_findings(
    project_id: Optional[uuid.UUID] = Query(None, description="Scope by project ID"),
    repository: Optional[str] = Query(None, description="Scope by repository name"),
    priority_band: Optional[str] = Query(None, description="Filter by priority band (P0, P1, P2, P3, P4)"),
    category: Optional[str] = Query(None, description="Filter by category (SAST, SECRETS, SCA, IAC, CONTAINER, API)"),
    reachable_only: bool = Query(False, description="Filter to findings with confirmed reachability from entry points"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns prioritized security findings enriched with vulnerability intelligence,
    reachability paths, and explainable reason codes.
    """
    if project_id and not tenant.validate_project_access(project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access denied: You do not have access to the specified project.",
        )

    # 1. Query findings strictly within authorized projects
    stmt = select(SecurityFinding).order_by(desc(SecurityFinding.created_at))
    if project_id:
        stmt = stmt.where(SecurityFinding.project_id == project_id)
    elif tenant.accessible_project_ids:
        stmt = stmt.where(SecurityFinding.project_id.in_(tenant.accessible_project_ids))

    if repository:
        stmt = stmt.where(SecurityFinding.repository == repository)
    if category:
        stmt = stmt.where(SecurityFinding.category.ilike(f"%{category}%"))

    res = await db.execute(stmt.limit(150))
    raw_findings = res.scalars().all()

    # 2. Process through Security Intelligence Engine
    engine = SecurityIntelligenceEngine(db)
    canonical_list, attack_paths, summary = engine.process_raw_findings(
        raw_items=raw_findings,
        scanner_name="kavach_unified",
        project_id=project_id,
        repository_name=repository,
    )

    # 3. Apply post-intelligence filters
    filtered = canonical_list
    if priority_band:
        band_upper = priority_band.upper()
        filtered = [f for f in filtered if f.risk_assessment and f.risk_assessment.priority_band.value == band_upper]

    if reachable_only:
        filtered = [
            f for f in filtered
            if f.reachability and f.reachability.status in (ReachabilityStatus.CANDIDATE_PATH, ReachabilityStatus.PATH_WITH_MITIGATION)
        ]

    paginated = filtered[offset : offset + limit]
    evidence_packages = [engine.build_evidence_package(f).model_dump() for f in paginated]

    return {
        "total": len(filtered),
        "offset": offset,
        "limit": limit,
        "summary": summary,
        "items": evidence_packages,
    }


@router.get(
    "/findings/{finding_id}",
    summary="Get full evidence package for a specific finding",
    response_model=Dict[str, Any],
)
async def get_finding_evidence(
    finding_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns complete grounded evidence for a finding including code coordinates,
    call hops from entrypoint, CVE intelligence, and remediation recommendations.
    """
    stmt = select(SecurityFinding).where(SecurityFinding.id == finding_id)
    res = await db.execute(stmt)
    f = res.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    if f.project_id and not tenant.validate_project_access(f.project_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied.")

    engine = SecurityIntelligenceEngine(db)
    canonical_list, _, _ = engine.process_raw_findings(
        raw_items=[f],
        scanner_name=f.scanner_name or "builtin",
        project_id=f.project_id,
        repository_name=f.repository,
    )

    if not canonical_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unable to process finding")

    evidence_pkg = engine.build_evidence_package(canonical_list[0])
    return evidence_pkg.model_dump()


@router.get(
    "/attack-paths",
    summary="List candidate attack paths connecting exposed entry points to vulnerabilities",
    response_model=Dict[str, Any],
)
async def list_attack_paths(
    project_id: Optional[uuid.UUID] = Query(None, description="Scope by project ID"),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns candidate multi-hop attack paths linking public HTTP entry points
    to vulnerable packages, code injection flaws, and sensitive database sinks.
    """
    if project_id and not tenant.validate_project_access(project_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied.")

    stmt = select(SecurityFinding).order_by(desc(SecurityFinding.created_at)).limit(100)
    if project_id:
        stmt = stmt.where(SecurityFinding.project_id == project_id)
    elif tenant.accessible_project_ids:
        stmt = stmt.where(SecurityFinding.project_id.in_(tenant.accessible_project_ids))

    res = await db.execute(stmt)
    raw_findings = res.scalars().all()

    engine = SecurityIntelligenceEngine(db)
    _, attack_paths, _ = engine.process_raw_findings(
        raw_items=raw_findings,
        scanner_name="kavach_unified",
        project_id=project_id,
    )

    return {
        "total": len(attack_paths),
        "items": [p.model_dump() for p in attack_paths],
    }


@router.get(
    "/posture",
    summary="Get aggregate contextual security posture summary",
    response_model=Dict[str, Any],
)
async def get_posture_summary(
    project_id: Optional[uuid.UUID] = Query(None, description="Scope by project ID"),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns high-level posture metrics: P0-P4 distribution, reachable vulnerabilities,
    CISA KEV presence, and highest risk assets.
    """
    if project_id and not tenant.validate_project_access(project_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied.")

    stmt = select(SecurityFinding).order_by(desc(SecurityFinding.created_at)).limit(200)
    if project_id:
        stmt = stmt.where(SecurityFinding.project_id == project_id)
    elif tenant.accessible_project_ids:
        stmt = stmt.where(SecurityFinding.project_id.in_(tenant.accessible_project_ids))

    res = await db.execute(stmt)
    raw_findings = res.scalars().all()

    engine = SecurityIntelligenceEngine(db)
    findings, attack_paths, summary = engine.process_raw_findings(
        raw_items=raw_findings,
        scanner_name="kavach_unified",
        project_id=project_id,
    )

    # Identify highest priority items for immediate action
    p0_items = [
        engine.build_evidence_package(f).model_dump()
        for f in findings
        if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P0
    ][:5]

    return {
        "project_id": str(project_id) if project_id else None,
        "summary": summary,
        "immediate_actions": p0_items,
        "attack_paths_count": len(attack_paths),
    }


@router.post(
    "/findings/{finding_id}/suppress",
    summary="Controlled, audited finding suppression",
    response_model=Dict[str, Any],
)
async def suppress_finding(
    finding_id: uuid.UUID,
    payload: SuppressFindingRequest,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Audited suppression of a finding. Requires actor justification and does NOT delete raw scanner evidence.
    """
    stmt = select(SecurityFinding).where(SecurityFinding.id == finding_id)
    res = await db.execute(stmt)
    f = res.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    if f.project_id and not tenant.validate_project_access(f.project_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-tenant access denied.")

    f.status = "suppressed"
    audit = AuditEvent(
        id=uuid.uuid4(),
        action="FINDING_SUPPRESSED",
        resource_type="SECURITY_FINDING",
        resource_id=str(f.id),
        actor_id=str(current_user.id),
        actor_type="USER",
        project_id=f.project_id,
        status="SUCCESS",
        metadata={
            "reason": payload.reason,
            "expiry_days": payload.expiry_days,
            "rule_id": f.rule_id,
            "file_path": f.file_path,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Finding {f.id} has been suppressed.",
        "suppression_reason": payload.reason,
    }

