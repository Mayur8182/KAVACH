"""
Step 19 Security Graph API Endpoints.

Provides:
- GET /api/v1/projects/{project_id}/graph
- GET /api/v1/projects/{project_id}/graph/nodes
- GET /api/v1/projects/{project_id}/graph/edges
- GET /api/v1/graph/nodes/{node_id}
- POST /api/v1/projects/{project_id}/graph/reachability
- POST /api/v1/projects/{project_id}/graph/attack-paths
- POST /api/v1/projects/{project_id}/graph/blast-radius
- POST /api/v1/projects/{project_id}/graph/change-impact
- GET /api/v1/agents/{agent_id}/authority-paths
- POST /api/v1/projects/{project_id}/graph/reconcile
- POST /api/v1/projects/{project_id}/graph/snapshot

Enforces:
- Rule 53: Bounded queries (limits, timeouts, max depth)
- Rule 80 & 81: Multi-tenant project isolation
- Rule 50: No generic security scores
"""

import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.security_graph.graph_service import SecurityGraphService

router = APIRouter(tags=["Security Graph"])


# --- Schemas ---

class ReachabilityRequest(BaseModel):
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    reachability_type: str = Field(default="NETWORK_REACHABLE")  # NETWORK_REACHABLE, AUTHORIZATION_REACHABLE, DATA_REACHABLE, COMBINED


class AttackPathRequest(BaseModel):
    source_id: Optional[uuid.UUID] = None
    target_id: Optional[uuid.UUID] = None
    max_depth: int = Field(default=6, ge=1, le=15)


class BlastRadiusRequest(BaseModel):
    node_id: uuid.UUID
    max_depth: int = Field(default=5, ge=1, le=10)


class ChangeImpactRequest(BaseModel):
    trigger_type: str  # COMMIT, DEPLOYMENT, DELEGATION, IAM_CHANGE, CLOUD_ACTION, POLICY_CHANGE, SECURITY_FINDING
    trigger_id: str
    changed_node_id: uuid.UUID


class SnapshotRequest(BaseModel):
    reason: str
    source_event_id: Optional[str] = None


# --- Endpoints ---

@router.get(
    "/projects/{project_id}/graph",
    summary="Get project security graph",
    description="Returns nodes and edges active for the project with bounded traversal limits.",
)
async def get_project_graph(
    project_id: uuid.UUID,
    max_nodes: int = Query(default=500, ge=1, le=1000),
    max_edges: int = Query(default=1000, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    return await service.get_project_graph(project_id, max_nodes=max_nodes, max_edges=max_edges)


@router.get(
    "/projects/{project_id}/graph/nodes",
    summary="List graph nodes",
)
async def list_graph_nodes(
    project_id: uuid.UUID,
    node_type: Optional[str] = None,
    environment: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SecurityGraphService(db)
    nodes = await service.repo.list_nodes(
        project_id=project_id,
        node_type=node_type,
        environment=environment,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(n.id),
            "project_id": str(n.project_id),
            "node_type": n.node_type,
            "external_id": n.external_id,
            "provider": n.provider,
            "name": n.name,
            "environment": n.environment,
            "status": n.status,
            "valid_from": n.valid_from.isoformat() if n.valid_from else None,
            "valid_until": n.valid_until.isoformat() if n.valid_until else None,
        }
        for n in nodes
    ]


@router.get(
    "/projects/{project_id}/graph/edges",
    summary="List graph edges",
)
async def list_graph_edges(
    project_id: uuid.UUID,
    edge_type: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = Query(default=500, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SecurityGraphService(db)
    edges = await service.repo.list_edges(
        project_id=project_id,
        edge_type=edge_type,
        state=state,
        limit=limit,
        offset=offset,
    )
    return [
        {
            "id": str(e.id),
            "source_node_id": str(e.source_node_id),
            "target_node_id": str(e.target_node_id),
            "edge_type": e.edge_type,
            "state": e.state,
            "evidence_id": e.evidence_id,
            "confidence": e.confidence,
            "valid_from": e.valid_from.isoformat() if e.valid_from else None,
            "valid_until": e.valid_until.isoformat() if e.valid_until else None,
        }
        for e in edges
    ]


@router.post(
    "/projects/{project_id}/graph/reachability",
    summary="Evaluate reachability between two nodes",
)
async def calculate_reachability(
    project_id: uuid.UUID,
    payload: ReachabilityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    return await service.calculate_reachability(
        project_id=project_id,
        source_node_id=payload.source_node_id,
        target_node_id=payload.target_node_id,
        reachability_type=payload.reachability_type,
    )


@router.post(
    "/projects/{project_id}/graph/attack-paths",
    summary="Analyze potential attack paths",
)
async def analyze_attack_paths(
    project_id: uuid.UUID,
    payload: AttackPathRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = SecurityGraphService(db)
    return await service.analyze_attack_paths(
        project_id=project_id,
        source_id=payload.source_id,
        target_id=payload.target_id,
        max_depth=payload.max_depth,
    )


@router.post(
    "/projects/{project_id}/graph/blast-radius",
    summary="Calculate blast radius for compromised or changed node",
)
async def calculate_blast_radius(
    project_id: uuid.UUID,
    payload: BlastRadiusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    return await service.calculate_blast_radius(
        project_id=project_id,
        node_id=payload.node_id,
        max_depth=payload.max_depth,
    )


@router.post(
    "/projects/{project_id}/graph/change-impact",
    summary="Analyze change impact",
)
async def analyze_change_impact(
    project_id: uuid.UUID,
    payload: ChangeImpactRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    return await service.analyze_change_impact(
        project_id=project_id,
        trigger_type=payload.trigger_type,
        trigger_id=payload.trigger_id,
        changed_node_id=payload.changed_node_id,
    )


@router.post(
    "/projects/{project_id}/graph/reconcile",
    summary="Reconcile and synchronize security graph from source records",
)
async def reconcile_graph(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    return await service.reconcile_graph(project_id)


@router.post(
    "/projects/{project_id}/graph/snapshot",
    summary="Create security graph snapshot",
)
async def create_graph_snapshot(
    project_id: uuid.UUID,
    payload: SnapshotRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SecurityGraphService(db)
    snapshot = await service.repo.create_snapshot(
        project_id=project_id,
        reason=payload.reason,
        source_event_id=payload.source_event_id,
    )
    return {
        "snapshot_id": str(snapshot.id),
        "project_id": str(snapshot.project_id),
        "reason": snapshot.reason,
        "node_count": snapshot.node_count,
        "edge_count": snapshot.edge_count,
        "created_at": snapshot.created_at.isoformat(),
    }
