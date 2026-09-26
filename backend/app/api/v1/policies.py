import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.policy import (
    ApprovalActionRequest,
    DecisionEvidenceResponse,
    EvaluateDecisionRequest,
    PolicyCreateRequest,
    PolicyUpdateRequest,
    PolicyVersionCreateRequest,
    PolicyVersionResponse,
    SecurityApprovalResponse,
    SecurityDecisionResponse,
    SecurityPolicyResponse,
    SimulateDecisionResponse,
)
from app.services.policy_service import PolicyService

router = APIRouter(tags=["Policy & Decision Engine"])


def _to_policy_response(pol) -> SecurityPolicyResponse:
    latest_ver = None
    versions_count = 0
    versions = pol.__dict__.get("versions")
    if versions:
        versions_count = len(versions)
        v0 = versions[0]
        latest_ver = PolicyVersionResponse(
            id=str(v0.id),
            policy_id=str(v0.policy_id),
            version=v0.version,
            definition=v0.definition,
            created_by=v0.created_by,
            created_at=v0.created_at,
            change_reason=v0.change_reason,
            active=v0.active,
        )

    return SecurityPolicyResponse(
        id=str(pol.id),
        project_id=str(pol.project_id) if pol.project_id else None,
        name=pol.name,
        description=pol.description,
        scope=pol.scope,
        status=pol.status,
        priority=pol.priority,
        policy_type=pol.policy_type,
        current_version=pol.current_version,
        created_by=pol.created_by,
        effective_from=pol.effective_from,
        effective_until=pol.effective_until,
        created_at=pol.created_at,
        updated_at=pol.updated_at,
        latest_version=latest_ver,
        versions_count=versions_count,
    )


def _to_decision_response(dec) -> SecurityDecisionResponse:
    evidence_items = [
        DecisionEvidenceResponse(
            id=str(ev.id),
            decision_id=str(ev.decision_id),
            evidence_type=ev.evidence_type,
            source_type=ev.source_type,
            source_id=ev.source_id,
            attribute=ev.attribute,
            observed_value=ev.observed_value,
            expected_condition=ev.expected_condition,
            effect=ev.effect,
            rule_name=ev.rule_name,
            policy_version_id=ev.policy_version_id,
            created_at=ev.created_at,
        )
        for ev in getattr(dec, "evidence", [])
    ]
    approvals_items = [
        SecurityApprovalResponse(
            id=str(ap.id),
            decision_id=str(ap.decision_id),
            status=ap.status,
            requested_by=ap.requested_by,
            approved_by=ap.approved_by,
            reason=ap.reason,
            approval_notes=ap.approval_notes,
            requested_at=ap.requested_at,
            approved_at=ap.approved_at,
            expires_at=ap.expires_at,
            created_at=ap.created_at,
            updated_at=ap.updated_at,
        )
        for ap in getattr(dec, "approvals", [])
    ]
    return SecurityDecisionResponse(
        id=str(dec.id),
        project_id=str(dec.project_id),
        actor_type=dec.actor_type,
        actor_id=dec.actor_id,
        operation_type=dec.operation_type,
        operation_id=dec.operation_id,
        resource_type=dec.resource_type,
        resource_id=dec.resource_id,
        environment=dec.environment,
        decision=dec.decision,
        reason=dec.reason,
        policy_version_ids=dec.policy_version_ids or [],
        blueprint_id=str(dec.blueprint_id) if dec.blueprint_id else None,
        scan_id=str(dec.scan_id) if dec.scan_id else None,
        created_at=dec.created_at,
        evidence=evidence_items,
        approvals=approvals_items,
    )


# 1. Policy CRUD
@router.post(
    "/projects/{project_id}/policies",
    response_model=SecurityPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Security Policy for a project",
)
async def create_policy(
    project_id: uuid.UUID,
    payload: PolicyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    pol = await service.create_policy(project_id, payload, current_user)
    return _to_policy_response(pol)


@router.get(
    "/projects/{project_id}/policies",
    response_model=List[SecurityPolicyResponse],
    summary="List all policies applicable to a project",
)
async def list_policies(
    project_id: uuid.UUID,
    active_only: bool = Query(False, description="Filter for ACTIVE policies only"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    policies = await service.list_policies(project_id, current_user, active_only=active_only)
    return [_to_policy_response(p) for p in policies]


@router.get(
    "/policies/{policy_id}",
    response_model=SecurityPolicyResponse,
    summary="Get single policy by ID",
)
async def get_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    pol = await service.get_policy(policy_id, current_user)
    return _to_policy_response(pol)


@router.post(
    "/policies/{policy_id}/versions",
    response_model=PolicyVersionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new version for an existing policy",
)
async def create_policy_version(
    policy_id: uuid.UUID,
    payload: PolicyVersionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    ver = await service.create_policy_version(policy_id, payload, current_user)
    return PolicyVersionResponse(
        id=str(ver.id),
        policy_id=str(ver.policy_id),
        version=ver.version,
        definition=ver.definition,
        created_by=ver.created_by,
        created_at=ver.created_at,
        change_reason=ver.change_reason,
        active=ver.active,
    )


@router.get(
    "/policies/{policy_id}/versions",
    response_model=List[PolicyVersionResponse],
    summary="List all versions of a policy",
)
async def list_policy_versions(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    versions = await service.get_policy_versions(policy_id, current_user)
    return [
        PolicyVersionResponse(
            id=str(v.id),
            policy_id=str(v.policy_id),
            version=v.version,
            definition=v.definition,
            created_by=v.created_by,
            created_at=v.created_at,
            change_reason=v.change_reason,
            active=v.active,
        )
        for v in versions
    ]


@router.post(
    "/policies/{policy_id}/activate",
    response_model=SecurityPolicyResponse,
    summary="Activate a policy",
)
async def activate_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    pol = await service.activate_policy(policy_id, current_user)
    return _to_policy_response(pol)


@router.post(
    "/policies/{policy_id}/disable",
    response_model=SecurityPolicyResponse,
    summary="Disable a policy",
)
async def disable_policy(
    policy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    pol = await service.disable_policy(policy_id, current_user)
    return _to_policy_response(pol)


# 2. Decision Evaluation & Simulation
@router.post(
    "/projects/{project_id}/decisions/evaluate",
    response_model=SecurityDecisionResponse,
    summary="Evaluate an operation against active policies and persist immutable decision",
)
async def evaluate_decision(
    project_id: uuid.UUID,
    payload: EvaluateDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    dec = await service.evaluate_decision(project_id, payload, current_user)
    return _to_decision_response(dec)


@router.post(
    "/projects/{project_id}/policies/simulate",
    response_model=SimulateDecisionResponse,
    summary="Dry-run simulate policy evaluation without persisting decision or mutating state",
)
async def simulate_decision(
    project_id: uuid.UUID,
    payload: EvaluateDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    return await service.simulate_decision(project_id, payload, current_user)


@router.get(
    "/projects/{project_id}/decisions",
    response_model=List[SecurityDecisionResponse],
    summary="List historical security decisions for a project",
)
async def list_decisions(
    project_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    decisions = await service.list_decisions(project_id, current_user, limit=limit)
    return [_to_decision_response(d) for d in decisions]


@router.get(
    "/decisions/{decision_id}",
    response_model=SecurityDecisionResponse,
    summary="Get single decision with evidence items and approvals",
)
async def get_decision(
    decision_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    dec = await service.get_decision(decision_id, current_user)
    return _to_decision_response(dec)


# 3. Approvals
@router.post(
    "/approvals/{approval_id}/approve",
    response_model=SecurityApprovalResponse,
    summary="Approve a decision requiring approval (enforces separation of duties)",
)
async def approve_decision(
    approval_id: uuid.UUID,
    payload: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    ap = await service.approve_decision(approval_id, payload, current_user)
    return SecurityApprovalResponse(
        id=str(ap.id),
        decision_id=str(ap.decision_id),
        status=ap.status,
        requested_by=ap.requested_by,
        approved_by=ap.approved_by,
        reason=ap.reason,
        approval_notes=ap.approval_notes,
        requested_at=ap.requested_at,
        approved_at=ap.approved_at,
        expires_at=ap.expires_at,
        created_at=ap.created_at,
        updated_at=ap.updated_at,
    )


@router.post(
    "/approvals/{approval_id}/reject",
    response_model=SecurityApprovalResponse,
    summary="Reject a decision requiring approval",
)
async def reject_decision(
    approval_id: uuid.UUID,
    payload: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    ap = await service.reject_decision(approval_id, payload, current_user)
    return SecurityApprovalResponse(
        id=str(ap.id),
        decision_id=str(ap.decision_id),
        status=ap.status,
        requested_by=ap.requested_by,
        approved_by=ap.approved_by,
        reason=ap.reason,
        approval_notes=ap.approval_notes,
        requested_at=ap.requested_at,
        approved_at=ap.approved_at,
        expires_at=ap.expires_at,
        created_at=ap.created_at,
        updated_at=ap.updated_at,
    )


@router.get(
    "/projects/{project_id}/approvals/pending",
    response_model=List[SecurityApprovalResponse],
    summary="List pending approvals for a project",
)
async def list_pending_approvals(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    approvals = await service.list_pending_approvals(project_id, current_user)
    return [
        SecurityApprovalResponse(
            id=str(ap.id),
            decision_id=str(ap.decision_id),
            status=ap.status,
            requested_by=ap.requested_by,
            approved_by=ap.approved_by,
            reason=ap.reason,
            approval_notes=ap.approval_notes,
            requested_at=ap.requested_at,
            approved_at=ap.approved_at,
            expires_at=ap.expires_at,
            created_at=ap.created_at,
            updated_at=ap.updated_at,
        )
        for ap in approvals
    ]
