import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.policy import (
    SecurityPolicy,
    SecurityPolicyVersion,
    SecurityDecision,
    PolicyRule,
    PolicyTestCase,
    PolicyException,
    PolicyEnforcementEvent,
)
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
    NLPolicyDraftRequest,
    NLPolicyDraftResponse,
    PolicyTestCaseResponse,
    PolicyTestRunResponse,
    PolicySimulationRequest,
    PolicySimulationResponse,
    PolicyReviewSubmitRequest,
    PolicyApprovalRequest,
    PolicyApprovalResultResponse,
    PolicyActivationRequest,
    PolicyRollbackRequest,
    PolicyEvaluationRequest,
    PolicyEvaluationResponse,
    PolicyExceptionCreateRequest,
    PolicyExceptionResponse,
    PolicyEnforcementEventResponse,
)
from app.services.policy_service import PolicyService
from app.intelligence.policy.coordinator import PolicyControlPlaneCoordinator

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


# =========================================================================
# Phase 5: AI Security Policy Engine & Governance Control Plane Endpoints
# =========================================================================

# 1. Top-Level Policy Management
@router.post(
    "/policies",
    response_model=SecurityPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create policy draft or import bundle",
)
async def create_top_level_policy(
    payload: PolicyCreateRequest,
    project_id: Optional[uuid.UUID] = Query(None, description="Optional target project ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    if project_id:
        pol = await service.create_policy(project_id, payload, current_user)
    else:
        # Create global / organization policy
        from app.engines.policy.validator import validate_policy_definition
        is_valid, errors, _ = validate_policy_definition(payload.definition)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid policy definition: {'; '.join(errors)}",
            )
        pol = SecurityPolicy(
            project_id=None,
            name=payload.name,
            description=payload.description,
            scope=payload.scope or "GLOBAL",
            status="DRAFT",
            priority=payload.priority,
            policy_type=payload.policy_type,
            current_version=1,
            created_by=current_user.email,
        )
        db.add(pol)
        await db.flush()
        ver = SecurityPolicyVersion(
            policy_id=pol.id,
            version=1,
            definition=payload.definition,
            created_by=current_user.email,
            active=False,
            change_reason="Initial policy bundle creation",
        )
        db.add(ver)
        await db.commit()
        await db.refresh(pol)
        pol.versions = [ver]
    return _to_policy_response(pol)


@router.get(
    "/policies",
    response_model=List[SecurityPolicyResponse],
    summary="List policies with scope, domain, and status filters",
)
async def list_top_level_policies(
    scope: Optional[str] = Query(None, description="Filter by scope: GLOBAL, ORGANIZATION, PROJECT, ENVIRONMENT"),
    domain: Optional[str] = Query(None, description="Filter by domain: CODE, REPOSITORY, PIPELINE, ARTIFACT, CLOUD_INFRASTRUCTURE, RUNTIME_KUBERNETES, IAM_ACCESS, AGENT_TOOL"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: DRAFT, ACTIVE, DEPRECATED, ARCHIVED"),
    project_id: Optional[uuid.UUID] = Query(None, description="Filter by project ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(SecurityPolicy)
    if scope:
        stmt = stmt.where(SecurityPolicy.scope == scope)
    if domain:
        stmt = stmt.where(SecurityPolicy.domain == domain)
    if status_filter:
        stmt = stmt.where(SecurityPolicy.status == status_filter)
    if project_id:
        stmt = stmt.where(or_(SecurityPolicy.project_id == project_id, SecurityPolicy.scope == "GLOBAL"))

    policies = (await db.execute(stmt.order_by(SecurityPolicy.priority.asc()))).scalars().all()
    return [_to_policy_response(p) for p in policies]


# 2. Natural-Language Assisted Authoring
@router.post(
    "/policies/draft",
    response_model=NLPolicyDraftResponse,
    status_code=status.HTTP_201_CREATED,
    summary="NL-assisted policy drafting (returns draft, tests, explanation)",
)
async def draft_policy_nl(
    payload: NLPolicyDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    proj_id = uuid.UUID(payload.project_id) if payload.project_id else None
    org_id = uuid.UUID(payload.organization_id) if payload.organization_id else None
    try:
        result = await coordinator.draft_policy_from_natural_language(
            prompt=payload.prompt,
            author=current_user,
            project_id=proj_id,
            organization_id=org_id,
            scope=payload.scope,
        )
        return NLPolicyDraftResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# 3. Policy Version Testing
@router.post(
    "/policy-versions/{version_id}/test",
    response_model=PolicyTestRunResponse,
    summary="Run test cases against policy version",
)
async def test_policy_version(
    version_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        report = await coordinator.test_runner.run_version_tests(version_id)
        return PolicyTestRunResponse(
            passed=report["all_passed"],
            total=report["total_tests"],
            passed_count=report["passed"],
            failed_count=report["failed"],
            details=report["results"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# 4. Policy Version Simulation
@router.post(
    "/policy-versions/{version_id}/simulate",
    response_model=PolicySimulationResponse,
    summary="Run simulation against historical scan snapshots",
)
async def simulate_policy_version(
    version_id: uuid.UUID,
    payload: Optional[PolicySimulationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        report = await coordinator.simulation.simulate_version_impact(version_id)
        burden = "HIGH" if report.new_blockers_detected > 3 else ("MEDIUM" if report.new_blockers_detected > 0 else "LOW")
        return PolicySimulationResponse(
            version_id=str(version_id),
            total_evaluated=report.total_resources_evaluated,
            passed_count=report.outcome_distribution.get("ALLOW", 0),
            denied_count=report.outcome_distribution.get("DENY", 0),
            blocked_actions_count=report.new_blockers_detected,
            blocker_delta=report.new_blockers_detected,
            new_violations=[{"resource": r, "type": "BLOCKER"} for r in report.affected_repositories],
            false_positive_candidates=report.potential_false_positives,
            remediation_burden=burden,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# 5. Peer Review & Dual Approval
@router.post(
    "/policy-versions/{version_id}/submit-review",
    response_model=PolicyVersionResponse,
    summary="Transition version to UNDER_REVIEW",
)
async def submit_policy_version_review(
    version_id: uuid.UUID,
    payload: Optional[PolicyReviewSubmitRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        ver = await coordinator.lifecycle.submit_for_review(version_id, current_user)
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
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/policy-versions/{version_id}/approve",
    response_model=PolicyApprovalResultResponse,
    summary="Record peer approval (dual control) with single-use cryptographic token",
)
async def approve_policy_version(
    version_id: uuid.UUID,
    payload: Optional[PolicyApprovalRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        notes = payload.approval_notes if payload else None
        res = await coordinator.lifecycle.approve_version(version_id, approver=current_user, approval_notes=notes)
        return PolicyApprovalResultResponse(
            approval_id=str(version_id),
            status=res["status"],
            approval_token=res["approval_token"],
            message=f"Version approved by {res['approved_by']}. Activation token valid for 3600 seconds.",
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# 6. Activation & Rollback
@router.post(
    "/policy-versions/{version_id}/activate",
    response_model=PolicyVersionResponse,
    summary="Activate approved policy version using single-use cryptographic token",
)
async def activate_policy_version_with_token(
    version_id: uuid.UUID,
    payload: PolicyActivationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        ver = await coordinator.lifecycle.activate_version(version_id, approval_token=payload.approval_token, current_user=current_user)
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
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/policies/{policy_id}/rollback",
    response_model=SecurityPolicyResponse,
    summary="Roll back to previous active version",
)
async def rollback_policy(
    policy_id: uuid.UUID,
    payload: PolicyRollbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        target_v = payload.target_version
        if target_v is None:
            pol = await db.get(SecurityPolicy, policy_id)
            if not pol:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
            target_v = max(1, pol.current_version - 1)
        ver = await coordinator.lifecycle.rollback_to_version(
            policy_id=policy_id,
            target_version_num=target_v,
            current_user=current_user,
            rollback_reason=payload.reason,
        )
        pol = await db.get(SecurityPolicy, policy_id)
        return _to_policy_response(pol)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# 7. Policy Evaluations
@router.post(
    "/policy-evaluations",
    response_model=PolicyEvaluationResponse,
    summary="Evaluate operation/context against active policies",
)
async def evaluate_policy_operation(
    payload: PolicyEvaluationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    actor_dict = payload.actor.model_dump() if payload.actor else {"type": "USER", "id": str(current_user.id), "name": current_user.email}
    op_dict = payload.operation.model_dump()
    dec = await coordinator.evaluate_operation(
        project_id=payload.project_id,
        operation=op_dict,
        actor=actor_dict,
        environment=payload.environment,
        repository=payload.repository,
    )
    return PolicyEvaluationResponse(
        decision_id=dec.decision_id,
        outcome=dec.decision.value,
        reason=dec.reason,
        enforcement_action="BLOCK" if dec.decision.value == "DENY" else ("WARN" if dec.decision.value == "WARN" else "ALLOW"),
        is_enforceable=dec.is_enforceable,
        requires_approval=(dec.decision.value == "DENY"),
        matched_rules=[
            {"rule_key": r.rule_key, "rule_name": r.rule_name, "decision": r.decision.value, "reason": r.rationale}
            for r in dec.matched_rules
        ],
        evidence=[
            {"attribute": e.attribute, "observed_value": e.observed_value, "expected_condition": e.expected_condition, "effect": e.effect}
            for e in dec.evidence
        ],
        evaluated_at=dec.evaluated_at,
    )


@router.get(
    "/policy-evaluations/{decision_id}",
    response_model=SecurityDecisionResponse,
    summary="Retrieve evaluation record with full evidence graph",
)
async def get_policy_evaluation_by_id(
    decision_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PolicyService(db)
    dec = await service.get_decision(decision_id, current_user)
    return _to_decision_response(dec)


# 8. Policy Exceptions & Waivers
@router.post(
    "/policy-exceptions",
    response_model=PolicyExceptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request policy exception",
)
async def request_policy_exception(
    payload: PolicyExceptionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        policy_uuid = uuid.UUID(payload.policy_id)
        rule_uuid = None
        if payload.rule_key:
            stmt = select(PolicyRule.id).where(PolicyRule.rule_key == payload.rule_key)
            rule_uuid = (await db.execute(stmt)).scalars().first()

        exc = await coordinator.exception_manager.request_exception(
            policy_id=policy_uuid,
            rule_id=rule_uuid,
            resource_scope=payload.target,
            justification=payload.justification,
            risk_owner=payload.risk_owner,
            requested_by=current_user,
            duration_days=payload.duration_days,
            compensating_controls=payload.compensating_controls,
        )
        return PolicyExceptionResponse.model_validate(exc)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/policy-exceptions/{exception_id}/approve",
    response_model=PolicyExceptionResponse,
    summary="Approve policy exception (dual control)",
)
async def approve_policy_exception(
    exception_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        exc = await coordinator.exception_manager.approve_exception(exception_id, approver=current_user)
        return PolicyExceptionResponse.model_validate(exc)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/policy-exceptions/{exception_id}/revoke",
    response_model=PolicyExceptionResponse,
    summary="Revoke active exception",
)
async def revoke_policy_exception(
    exception_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coordinator = PolicyControlPlaneCoordinator(db)
    try:
        exc = await coordinator.exception_manager.revoke_exception(exception_id, revoker=current_user)
        return PolicyExceptionResponse.model_validate(exc)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# 9. Enforcement Events Audit Log
@router.get(
    "/policy-enforcement-events",
    response_model=List[PolicyEnforcementEventResponse],
    summary="Audit log of policy enforcement actions",
)
async def list_policy_enforcement_events(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PolicyEnforcementEvent).order_by(desc(PolicyEnforcementEvent.created_at)).limit(limit)
    events = (await db.execute(stmt)).scalars().all()
    return [PolicyEnforcementEventResponse.model_validate(e) for e in events]

