"""
IaC Infrastructure Graph Suite API Router — Section 12: Screens 12.1 through 12.8
Prefix: /api/v1/iac/graph-suite
Authoritative REST endpoints for Infrastructure Overview, Resource Graph, Resource Detail,
Risk View, Relationships, Blast Radius, Change History, and Graph Settings.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, Path, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.iac_graph_suite import (
    GraphOverviewResponse,
    ResourceGraphResponse,
    ResourceDetailResponse,
    RiskViewResponse,
    RelationshipsPageResponse,
    BlastRadiusResponse,
    ChangeHistoryPageResponse,
    GraphSettingsDTO,
    ExportGraphRequest,
    ExportGraphResponse,
)
from app.services.iac_graph_suite_service import IaCGraphSuiteService

router = APIRouter(prefix="/iac/graph-suite", tags=["IaC Infrastructure Graph Suite"])


# ============================================================================
# 12.1 Infrastructure Graph Overview
# ============================================================================

@router.get(
    "/overview",
    response_model=GraphOverviewResponse,
    summary="12.1 Infrastructure Graph Overview (4 KPIs, Provider-Aware Nodes & Edges)",
)
async def get_infrastructure_overview(
    repository: str = Query("frontend-app", description="Target repository"),
    environment: str = Query("production", description="Environment filter"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
    db: AsyncSession = Depends(get_db),
) -> GraphOverviewResponse:
    return await IaCGraphSuiteService.get_overview(
        repository=repository,
        environment=environment,
        provider=provider,
        db=db,
    )


# ============================================================================
# 12.2 Resource Graph
# ============================================================================

@router.get(
    "/resource-graph",
    response_model=ResourceGraphResponse,
    summary="12.2 Resource Graph Topology (VPC/VNet, Subnets, Gateways, Clusters, Storage)",
)
async def get_resource_graph(
    repository: str = Query("frontend-app", description="Target repository"),
    environment: str = Query("production", description="Environment filter"),
    resource_type: str = Query("All Resource Types", description="Resource type filter"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> ResourceGraphResponse:
    return IaCGraphSuiteService.get_resource_graph(
        repository=repository,
        environment=environment,
        resource_type=resource_type,
        provider=provider,
    )


# ============================================================================
# 12.3 Resource Detail
# ============================================================================

@router.get(
    "/resource/{resource_id}",
    response_model=ResourceDetailResponse,
    summary="12.3 Resource Detail (EKS/AKS/GKE Cluster metadata, Risk Breakdown, Compliance checks)",
)
async def get_resource_detail(
    resource_id: str = Path(..., description="Resource identifier, e.g. eks-prod-cluster"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> ResourceDetailResponse:
    return IaCGraphSuiteService.get_resource_detail(resource_id=resource_id, provider=provider)


# ============================================================================
# 12.4 Risk View
# ============================================================================

@router.get(
    "/risk-view",
    response_model=RiskViewResponse,
    summary="12.4 Infrastructure Risk View (Severity-weighted nodes with findings counts)",
)
async def get_risk_view(
    repository: str = Query("frontend-app", description="Target repository"),
    environment: str = Query("production", description="Environment filter"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> RiskViewResponse:
    return IaCGraphSuiteService.get_risk_view(
        repository=repository,
        environment=environment,
        provider=provider,
    )


# ============================================================================
# 12.5 Relationships
# ============================================================================

@router.get(
    "/relationships",
    response_model=RelationshipsPageResponse,
    summary="12.5 Resource Relationships (Upstream/Downstream dependency matrix)",
)
async def get_relationships(
    search: Optional[str] = Query(None, description="Search term for resources or relationship"),
    relationship_type: Optional[str] = Query("All Relationship Types", description="Relationship type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> RelationshipsPageResponse:
    return IaCGraphSuiteService.get_relationships(
        search=search,
        relationship_type=relationship_type,
        page=page,
        page_size=page_size,
        provider=provider,
    )


# ============================================================================
# 12.6 Blast Radius
# ============================================================================

@router.get(
    "/blast-radius/{resource_id}",
    response_model=BlastRadiusResponse,
    summary="12.6 Blast Radius Analysis (Affected resources, direct & indirect impact)",
)
async def get_blast_radius(
    resource_id: str = Path(..., description="Target compromised resource ID"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> BlastRadiusResponse:
    return IaCGraphSuiteService.get_blast_radius(resource_id=resource_id, provider=provider)


# ============================================================================
# 12.7 Change History
# ============================================================================

@router.get(
    "/change-history",
    response_model=ChangeHistoryPageResponse,
    summary="12.7 Change History Timeline (Resource change log with audit trail)",
)
async def get_change_history(
    resource: Optional[str] = Query("All Resources", description="Resource filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    provider: str = Query("AWS", description="Cloud provider filter: AWS, Azure, GCP"),
) -> ChangeHistoryPageResponse:
    return IaCGraphSuiteService.get_change_history(
        resource=resource,
        page=page,
        page_size=page_size,
        provider=provider,
    )


# ============================================================================
# 12.8 Graph Settings
# ============================================================================

@router.get(
    "/settings",
    response_model=GraphSettingsDTO,
    summary="12.8 Get Graph Settings",
)
async def get_graph_settings() -> GraphSettingsDTO:
    return IaCGraphSuiteService.get_settings()


@router.put(
    "/settings",
    response_model=GraphSettingsDTO,
    summary="12.8 Update Graph Settings",
)
async def update_graph_settings(
    payload: Dict[str, Any] = Body(...),
) -> GraphSettingsDTO:
    return IaCGraphSuiteService.update_settings(payload)


@router.post(
    "/settings/reset",
    response_model=GraphSettingsDTO,
    summary="12.8 Reset Graph Settings to Default",
)
async def reset_graph_settings() -> GraphSettingsDTO:
    return IaCGraphSuiteService.reset_settings()


@router.post(
    "/export",
    response_model=ExportGraphResponse,
    summary="12.8 Export Graph (PNG, SVG, JSON)",
)
async def export_graph(
    req: ExportGraphRequest = Body(...),
) -> ExportGraphResponse:
    return IaCGraphSuiteService.export_graph(req)
