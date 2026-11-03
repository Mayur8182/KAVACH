"""
Thing Data — DSPM API Router
Exposes /api/v1/data/* endpoints for Data Security Posture Management.
All data is queried from DataService against the real database.
No hardcoded responses.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.data.service import DataService
from app.data.schemas import (
    DataOverviewResponse,
    DataStoreListResponse,
    DataStoreItem,
    CreateDataStoreRequest,
    DataInventoryListResponse,
    DataFlowListResponse,
    DataClassificationPolicyListResponse,
    DataClassificationPolicyItem,
    CreateClassificationPolicyRequest,
    DataScanJobItem,
    TriggerScanRequest,
)

router = APIRouter(prefix="/data", tags=["Thing Data — DSPM & Sensitive Data"])


# ── Overview ──────────────────────────────────────────────────────────

@router.get("/overview", response_model=DataOverviewResponse)
async def get_data_overview(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns DSPM metrics, store counts, compliance breakdown, and recent scans.
    All values calculated from real database records.
    """
    service = DataService(db)
    return await service.get_overview(project_id)


# ── Data Stores ───────────────────────────────────────────────────────

@router.get("/stores", response_model=DataStoreListResponse)
async def list_data_stores(
    project_id: Optional[str] = Query(None),
    store_type: Optional[str] = Query(None),
    sensitivity: Optional[str] = Query(None),
    compliance_status: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all data stores with real-time filtering."""
    service = DataService(db)
    return await service.list_stores(
        project_id_str=project_id,
        store_type=store_type,
        sensitivity=sensitivity,
        compliance_status=compliance_status,
        environment=environment,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/stores/{store_id}", response_model=DataStoreItem)
async def get_data_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single data store by ID."""
    service = DataService(db)
    store = await service.get_store(store_id)
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data store not found")
    return DataStoreItem.model_validate(store)


@router.post("/stores", response_model=DataStoreItem, status_code=status.HTTP_201_CREATED)
async def create_data_store(
    payload: CreateDataStoreRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new data store for DSPM monitoring."""
    service = DataService(db)
    store = await service.create_store(payload)
    return DataStoreItem.model_validate(store)


@router.delete("/stores/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a data store from DSPM monitoring."""
    service = DataService(db)
    deleted = await service.delete_store(store_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data store not found")


# ── Data Inventory ────────────────────────────────────────────────────

@router.get("/inventory", response_model=DataInventoryListResponse)
async def list_data_inventory(
    project_id: Optional[str] = Query(None),
    data_store_id: Optional[str] = Query(None),
    data_type: Optional[str] = Query(None),
    sensitivity_threshold: Optional[float] = Query(None, ge=0.0, le=1.0),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List sensitive data records discovered across all data stores.
    Filter by store, type (PII, CREDENTIAL, FINANCIAL, PHI, PCI, SECRET), or risk threshold.
    """
    service = DataService(db)
    return await service.list_inventory(
        project_id_str=project_id,
        data_store_id=data_store_id,
        data_type=data_type,
        sensitivity_threshold=sensitivity_threshold,
        limit=limit,
        offset=offset,
    )


# ── Data Flows ────────────────────────────────────────────────────────

@router.get("/flows", response_model=DataFlowListResponse)
async def list_data_flows(
    project_id: Optional[str] = Query(None),
    policy_result: Optional[str] = Query(None),
    data_classification: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List observed data flows between services.
    Filter by policy result (ALLOW, BLOCK, MASK) or data classification.
    """
    service = DataService(db)
    return await service.list_flows(
        project_id_str=project_id,
        policy_result=policy_result,
        data_classification=data_classification,
        limit=limit,
        offset=offset,
    )


# ── Classification Policies ───────────────────────────────────────────

@router.get("/policies", response_model=DataClassificationPolicyListResponse)
async def list_classification_policies(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all DLP classification policies."""
    service = DataService(db)
    return await service.list_policies(project_id)


@router.post("/policies", response_model=DataClassificationPolicyItem, status_code=status.HTTP_201_CREATED)
async def create_classification_policy(
    payload: CreateClassificationPolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new DLP classification policy."""
    service = DataService(db)
    policy = await service.create_policy(payload)
    return DataClassificationPolicyItem.model_validate(policy)


# ── Scan Jobs ─────────────────────────────────────────────────────────

@router.get("/scans", response_model=list)
async def list_scan_jobs(
    project_id: Optional[str] = Query(None),
    data_store_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List data scan jobs with their current status."""
    service = DataService(db)
    return await service.list_scan_jobs(project_id, data_store_id, limit)


@router.post("/scans", response_model=DataScanJobItem, status_code=status.HTTP_202_ACCEPTED)
async def trigger_data_scan(
    payload: TriggerScanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a DSPM scan for a data store.
    Creates a QUEUED scan job that a background worker will pick up.
    Returns immediately with the queued job details — does NOT wait for completion.
    """
    service = DataService(db)
    try:
        job = await service.trigger_scan(payload, triggered_by="api_user")
        return service._scan_job_to_schema(job)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
