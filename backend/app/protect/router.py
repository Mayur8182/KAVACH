"""
Thing Protect — API Router
FastAPI router for Step 06 Runtime Defense, Policy Enforcement, MCP Security & Active Protection.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.protect.service import ProtectService
from app.protect.schemas import (
    ProtectOverviewResponse,
    RuntimeProtectionListResponse,
    RuntimeProtectionDetailResponse,
    ProtectionPolicyListResponse,
    ProtectionPolicyItem,
    ProtectionPolicyDetailResponse,
    CreatePolicyRequest,
    SimulatePolicyRequest,
    PolicySimulationResponse,
    PolicyPublishResponse,
    PolicyRollbackRequest,
    ProtectionDecisionListResponse,
    ProtectionDecisionDetailResponse,
    McpServerListResponse,
    McpToolControlListResponse,
    McpRequestAuditListResponse,
    ProtectedAgentListResponse,
    ProtectedSessionListResponse,
    RevokeSessionRequest,
    RevokeSessionResponse,
    ApiProtectionListResponse,
    NetworkProtectionListResponse,
    DnsProtectionListResponse,
    ThreatSignalListResponse,
    ProtectionApprovalListResponse,
    ResolveApprovalRequest,
    BreakGlassRequest,
    BreakGlassResponse,
    BreakGlassListResponse,
    ControlEffectivenessListResponse,
    ProtectionCoverageResponse,
    ProtectionEvidenceListResponse,
    ProtectionEvidenceItem,
    ProtectionActivityListResponse,
)

from app.protect.service import ProtectService
from app.core.entitlements import require_product

router = APIRouter(
    prefix="/protect",
    tags=["Thing Protect — Runtime Defense & Policy Enforcement"],
    dependencies=[Depends(require_product("thing_protect"))],
)


# ── Overview ──────────────────────────────────────────────────────────

@router.get("/overview", response_model=ProtectOverviewResponse)
async def get_protect_overview(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.get_overview(project_id)


# ── Runtime Protection ────────────────────────────────────────────────

@router.get("/runtime", response_model=RuntimeProtectionListResponse)
async def list_runtimes(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_runtimes(project_id)


@router.get("/posture")
async def get_security_posture(
    project_id: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    workload_type: Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.get_posture_workloads(
        project_id_str=project_id,
        environment=environment,
        workload_type=workload_type,
        time_range=time_range,
        search=search,
    )



@router.get("/runtime/{runtime_id}", response_model=RuntimeProtectionDetailResponse)
async def get_runtime_detail(
    runtime_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    detail = await service.get_runtime_detail(runtime_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Runtime target not found")
    return detail


# ── Policies ──────────────────────────────────────────────────────────

@router.get("/policies", response_model=ProtectionPolicyListResponse)
async def list_policies(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_policies(project_id)


@router.post("/policies", response_model=ProtectionPolicyItem, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: CreatePolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.create_policy(payload)


@router.get("/policies/{policy_id}", response_model=ProtectionPolicyDetailResponse)
async def get_policy_detail(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    detail = await service.get_policy_detail(policy_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Protection policy not found")
    return detail


@router.post("/policies/{policy_id}/simulate", response_model=PolicySimulationResponse)
async def simulate_policy(
    policy_id: str,
    payload: SimulatePolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    sim = await service.simulate_policy(policy_id, payload)
    if not sim:
        raise HTTPException(status_code=404, detail="Protection policy not found")
    return sim


@router.post("/policies/{policy_id}/publish", response_model=PolicyPublishResponse)
async def publish_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    res = await service.publish_policy(policy_id)
    if not res:
        raise HTTPException(status_code=404, detail="Protection policy not found")
    return res


@router.post("/policies/{policy_id}/rollback", response_model=PolicyPublishResponse)
async def rollback_policy(
    policy_id: str,
    payload: PolicyRollbackRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    res = await service.rollback_policy(policy_id, payload.target_version)
    if not res:
        raise HTTPException(status_code=404, detail="Policy or specified version not found")
    return res


# ── Enforcement Center ────────────────────────────────────────────────

@router.get("/enforcement", response_model=ProtectionDecisionListResponse)
async def list_decisions(
    project_id: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    actor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_decisions(
        project_id_str=project_id,
        decision_filter=decision,
        actor_filter=actor,
        limit=limit,
        offset=offset,
    )


@router.get("/enforcement/{decision_id}", response_model=ProtectionDecisionDetailResponse)
async def get_decision_detail(
    decision_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    detail = await service.get_decision_detail(decision_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Enforcement decision not found")
    return detail


# ── MCP Security ──────────────────────────────────────────────────────

@router.get("/mcp/servers", response_model=McpServerListResponse)
async def list_mcp_servers(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_mcp_servers(project_id)


@router.get("/mcp/tools", response_model=McpToolControlListResponse)
async def list_mcp_tools(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_mcp_tools(project_id)


@router.get("/mcp/requests", response_model=McpRequestAuditListResponse)
async def list_mcp_requests(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_mcp_requests(project_id)


# ── Agents & Sessions ─────────────────────────────────────────────────

@router.get("/agents", response_model=ProtectedAgentListResponse)
async def list_agents(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_agents(project_id)


@router.get("/sessions", response_model=ProtectedSessionListResponse)
async def list_sessions(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_sessions(project_id)


@router.post("/sessions/{session_id}/revoke", response_model=RevokeSessionResponse)
async def revoke_session(
    session_id: str,
    payload: RevokeSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    res = await service.revoke_session(session_id, payload.reason)
    if not res:
        raise HTTPException(status_code=404, detail="Protected session not found")
    return res


# ── APIs & Network & DNS ──────────────────────────────────────────────

@router.get("/apis", response_model=ApiProtectionListResponse)
async def list_apis(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_apis(project_id)


@router.get("/network", response_model=NetworkProtectionListResponse)
async def list_network_rules(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_network_rules(project_id)


@router.get("/network/dns", response_model=DnsProtectionListResponse)
async def list_dns_audits(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_dns_audits(project_id)


# ── Threats ───────────────────────────────────────────────────────────

@router.get("/threats", response_model=ThreatSignalListResponse)
async def list_threats(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_threats(project_id)


# ── Approvals & Break-Glass ───────────────────────────────────────────

@router.get("/approvals", response_model=ProtectionApprovalListResponse)
async def list_approvals(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_approvals(project_id)


@router.post("/approvals/{approval_id}/resolve")
async def resolve_approval(
    approval_id: str,
    payload: ResolveApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    res = await service.resolve_approval(approval_id, payload.approved, payload.reason)
    if not res:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return res


@router.get("/break-glass", response_model=BreakGlassListResponse)
async def list_break_glass(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_break_glass(project_id)


@router.post("/break-glass", response_model=BreakGlassResponse, status_code=status.HTTP_201_CREATED)
async def create_break_glass(
    payload: BreakGlassRequest,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.create_break_glass(payload)


# ── Controls, Coverage, Evidence & Activity ───────────────────────────

@router.get("/controls", response_model=ControlEffectivenessListResponse)
async def list_controls(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_effectiveness(project_id)


@router.get("/coverage", response_model=ProtectionCoverageResponse)
async def get_coverage(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.get_coverage(project_id)


@router.get("/evidence", response_model=ProtectionEvidenceListResponse)
async def list_evidence(
    project_id: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    evidence_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = ProtectService(db)
    return await service.list_evidence(
        project_id_str=project_id,
        limit=effective_limit,
        offset=effective_offset,
        search=search,
        evidence_type=evidence_type,
    )


@router.get("/evidence/{evidence_id}", response_model=ProtectionEvidenceItem)
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    ev = await service.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return ev


@router.get("/activity", response_model=ProtectionActivityListResponse)
async def list_activity(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = ProtectService(db)
    return await service.list_activity(project_id)
