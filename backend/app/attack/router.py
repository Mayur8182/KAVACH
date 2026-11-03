"""
Thing Attack — API Router
Exposes /api/v1/attack/* endpoints for the offensive-security and verification workspace.
All data is queried from AttackService against the real database.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.attack.schemas import (
    AttackOverviewResponse,
    AttackAssetListResponse,
    CreateAttackAssetRequest,
    AttackAssetItem,
    AttackAssetDetailResponse,
    AttackApiEndpointListResponse,
    AttackApiEndpointDetailResponse,
    AttackDiscoveryRunListResponse,
    TriggerDiscoveryRequest,
    AttackDiscoveryRunItem,
    AttackDastRunListResponse,
    StartDastRunRequest,
    AttackDastRunItem,
    AttackPentestListResponse,
    CreatePentestRequest,
    AttackPentestItem,
    AttackPentestDetailResponse,
    AttackPathListResponse,
    AttackFindingListResponse,
    AttackFindingDetailResponse,
    RetestFindingResponse,
    AttackEvidenceListResponse,
    AttackEvidenceItemSchema,
    AttackScheduleListResponse,
    CreateScheduleRequest,
    AttackScheduleItem,
    AttackReportListResponse,
    CreateReportRequest,
    AttackReportItem,
    AttackPolicyListResponse,
    CreatePolicyRequest,
    AttackPolicyItem,
)
from app.attack.service import AttackService
from app.core.entitlements import require_product

router = APIRouter(
    prefix="/attack",
    tags=["Thing Attack — Offensive Security Platform"],
    dependencies=[Depends(require_product("thing_attack"))],
)


# ── Overview ────────────────────────────────────────────────────────

@router.get("/overview", response_model=AttackOverviewResponse)
async def get_attack_overview(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.get_overview(project_id_str=project_id)


# ── Attack Surface Assets ──────────────────────────────────────────

@router.get("/assets", response_model=AttackAssetListResponse)
async def list_attack_assets(
    project_id: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    exposure: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = AttackService(db)
    return await service.list_assets(
        project_id_str=project_id,
        asset_type=asset_type,
        environment=environment,
        exposure=exposure,
        risk=risk,
        search=search,
        limit=effective_limit,
        offset=effective_offset,
    )


@router.post("/assets", response_model=AttackAssetItem, status_code=status.HTTP_201_CREATED)
async def create_attack_asset(
    payload: CreateAttackAssetRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.create_asset(payload)


@router.get("/assets/{asset_id}", response_model=AttackAssetDetailResponse)
async def get_attack_asset_detail(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    detail = await service.get_asset_detail(asset_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Asset not found")
    return detail


# ── APIs & Discovery ───────────────────────────────────────────────

@router.get("/apis", response_model=AttackApiEndpointListResponse)
async def list_api_endpoints(
    project_id: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    auth_type: Optional[str] = Query(None),
    discovery_source: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    test_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = AttackService(db)
    return await service.list_api_endpoints(
        project_id_str=project_id,
        method=method,
        auth_type=auth_type,
        discovery_source=discovery_source,
        risk=risk,
        test_status=test_status,
        search=search,
        limit=effective_limit,
        offset=effective_offset,
    )


@router.get("/apis/{endpoint_id}", response_model=AttackApiEndpointDetailResponse)
async def get_api_endpoint_detail(
    endpoint_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    detail = await service.get_api_endpoint_detail(endpoint_id)
    if not detail:
        raise HTTPException(status_code=404, detail="API endpoint not found")
    return detail


@router.post("/api-discovery/runs", response_model=AttackDiscoveryRunItem, status_code=status.HTTP_201_CREATED)
async def trigger_discovery_run(
    payload: TriggerDiscoveryRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.trigger_discovery_run(payload)


@router.get("/api-discovery/runs", response_model=AttackDiscoveryRunListResponse)
async def list_discovery_runs(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_discovery_runs(project_id_str=project_id)


# ── DAST ───────────────────────────────────────────────────────────

@router.post("/dast/runs", response_model=AttackDastRunItem, status_code=status.HTTP_201_CREATED)
async def start_dast_run(
    payload: StartDastRunRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.start_dast_run(payload)


@router.get("/dast/runs", response_model=AttackDastRunListResponse)
async def list_dast_runs(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_dast_runs(project_id_str=project_id)


@router.post("/dast/runs/{run_id}/cancel", response_model=AttackDastRunItem)
async def cancel_dast_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    result = await service.cancel_dast_run(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="DAST run not found")
    return result


# ── Pentests ───────────────────────────────────────────────────────

@router.post("/pentests", response_model=AttackPentestItem, status_code=status.HTTP_201_CREATED)
async def create_pentest(
    payload: CreatePentestRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.create_pentest(payload)


@router.get("/pentests", response_model=AttackPentestListResponse)
async def list_pentests(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_pentests(project_id_str=project_id)


@router.get("/pentests/{pentest_id}", response_model=AttackPentestDetailResponse)
async def get_pentest_detail(
    pentest_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    detail = await service.get_pentest_detail(pentest_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Pentest not found")
    return detail


@router.post("/pentests/{pentest_id}/launch", response_model=AttackPentestItem)
async def launch_pentest(
    pentest_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    res = await service.launch_pentest(pentest_id)
    if not res:
        raise HTTPException(status_code=404, detail="Pentest not found")
    return res


# ── Attack Paths ───────────────────────────────────────────────────

@router.get("/paths", response_model=AttackPathListResponse)
async def list_attack_paths(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_attack_paths(project_id_str=project_id)


# ── Findings ───────────────────────────────────────────────────────

@router.get("/findings", response_model=AttackFindingListResponse)
async def list_findings(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    exploitability: Optional[str] = Query(None),
    attack_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_findings(
        project_id_str=project_id,
        severity=severity,
        exploitability=exploitability,
        attack_type=attack_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/findings/{finding_id}", response_model=AttackFindingDetailResponse)
async def get_finding_detail(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    detail = await service.get_finding_detail(finding_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Finding not found")
    return detail


@router.post("/findings/{finding_id}/retest", response_model=RetestFindingResponse)
async def retest_finding(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    result = await service.retest_finding(finding_id)
    if not result:
        raise HTTPException(status_code=404, detail="Finding not found")
    return result


# ── Evidence ───────────────────────────────────────────────────────

@router.get("/evidence", response_model=AttackEvidenceListResponse)
async def list_evidence(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_evidence(project_id_str=project_id)


@router.get("/evidence/{evidence_id}", response_model=AttackEvidenceItemSchema)
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    ev = await service.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev


# ── Schedules, Reports, Policies ───────────────────────────────────

@router.get("/schedules", response_model=AttackScheduleListResponse)
async def list_schedules(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_schedules(project_id_str=project_id)


@router.post("/schedules", response_model=AttackScheduleItem, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: CreateScheduleRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.create_schedule(payload)


@router.get("/reports", response_model=AttackReportListResponse)
async def list_reports(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_reports(project_id_str=project_id)


@router.post("/reports", response_model=AttackReportItem, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: CreateReportRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.create_report(payload)


@router.get("/policies", response_model=AttackPolicyListResponse)
async def list_policies(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.list_policies(project_id_str=project_id)


@router.post("/policies", response_model=AttackPolicyItem, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: CreatePolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AttackService(db)
    return await service.create_policy(payload)
