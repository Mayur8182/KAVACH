import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.policy.engine import policy_engine
from app.engines.policy.models import (
    ActorContext,
    DecisionContext,
    DecisionType,
    OperationContext,
)
from app.engines.policy.validator import validate_policy_definition
from app.models.policy import (
    DecisionEvidence,
    SecurityApproval,
    SecurityDecision,
    SecurityPolicy,
    SecurityPolicyVersion,
)
from app.models.user import User
from app.repositories.blueprint_repository import BlueprintRepository
from app.repositories.policy_repository import PolicyRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.scan_repository import ScanRepository
from app.schemas.policy import (
    ApprovalActionRequest,
    EvaluateDecisionRequest,
    PolicyCreateRequest,
    PolicyUpdateRequest,
    PolicyVersionCreateRequest,
    SimulateDecisionResponse,
)
from app.services.audit_service import AuditService


class PolicyService:
    """
    Manages Security Policies, versioning, Allow-Warn-Block decisions,
    evidence persistence, and approval workflows.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PolicyRepository(db)
        self.project_repo = ProjectRepository(db)
        self.scan_repo = ScanRepository(db)
        self.blueprint_repo = BlueprintRepository(db)
        self.audit = AuditService(db)

    async def _verify_project_access(self, project_id: uuid.UUID, user: User) -> None:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found.",
            )
        if project.owner_id != user.id and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have authorization to access policies for this project.",
            )

    async def create_policy(
        self,
        project_id: uuid.UUID,
        payload: PolicyCreateRequest,
        current_user: User,
    ) -> SecurityPolicy:
        await self._verify_project_access(project_id, current_user)

        # Validate definition with Policy DSL validator
        is_valid, errors, parsed = validate_policy_definition(payload.definition)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid policy definition: {'; '.join(errors)}",
            )

        policy = SecurityPolicy(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            scope=payload.scope,
            priority=payload.priority,
            policy_type=payload.policy_type,
            status="ACTIVE",
            current_version=1,
            created_by=current_user.email,
        )

        initial_version = SecurityPolicyVersion(
            version=1,
            definition=payload.definition,
            created_by=current_user.email,
            change_reason="Initial policy creation",
            active=True,
        )

        created_policy = await self.repo.create_policy(policy, initial_version)

        await self.audit.log_event(
            action="POLICY_CREATED",
            resource_type="POLICY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(created_policy.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "name": payload.name,
                "scope": payload.scope,
                "priority": payload.priority,
                "version": 1,
            },
        )
        await self.db.commit()
        return await self.repo.get_policy_by_id(created_policy.id)

    async def list_policies(
        self,
        project_id: uuid.UUID,
        current_user: User,
        active_only: bool = False,
    ) -> List[SecurityPolicy]:
        await self._verify_project_access(project_id, current_user)
        return await self.repo.list_policies_for_project(project_id, active_only=active_only)

    async def get_policy(
        self,
        policy_id: uuid.UUID,
        current_user: User,
    ) -> SecurityPolicy:
        policy = await self.repo.get_policy_by_id(policy_id)
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Security policy not found.",
            )
        if policy.project_id:
            await self._verify_project_access(policy.project_id, current_user)
        return policy

    async def create_policy_version(
        self,
        policy_id: uuid.UUID,
        payload: PolicyVersionCreateRequest,
        current_user: User,
    ) -> SecurityPolicyVersion:
        policy = await self.get_policy(policy_id, current_user)

        is_valid, errors, parsed = validate_policy_definition(payload.definition)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid policy definition: {'; '.join(errors)}",
            )

        new_version_num = policy.current_version + 1
        policy.current_version = new_version_num
        policy.updated_at = datetime.now(timezone.utc)

        new_version = SecurityPolicyVersion(
            policy_id=policy.id,
            version=new_version_num,
            definition=payload.definition,
            created_by=current_user.email,
            change_reason=payload.change_reason or f"Updated to version {new_version_num}",
            active=True,
        )

        created_ver = await self.repo.create_policy_version(new_version)

        await self.audit.log_event(
            action="POLICY_VERSION_CREATED",
            resource_type="POLICY_VERSION",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(policy.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={
                "version": new_version_num,
                "change_reason": payload.change_reason,
            },
        )
        await self.db.commit()
        return created_ver

    async def activate_policy(
        self,
        policy_id: uuid.UUID,
        current_user: User,
    ) -> SecurityPolicy:
        policy = await self.get_policy(policy_id, current_user)
        policy.status = "ACTIVE"
        policy.updated_at = datetime.now(timezone.utc)

        await self.audit.log_event(
            action="POLICY_ACTIVATED",
            resource_type="POLICY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(policy.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={"name": policy.name, "version": policy.current_version},
        )
        await self.db.commit()
        return policy

    async def disable_policy(
        self,
        policy_id: uuid.UUID,
        current_user: User,
    ) -> SecurityPolicy:
        policy = await self.get_policy(policy_id, current_user)
        policy.status = "DISABLED"
        policy.updated_at = datetime.now(timezone.utc)

        await self.audit.log_event(
            action="POLICY_DISABLED",
            resource_type="POLICY",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(policy.id),
            project_id=policy.project_id,
            status="SUCCESS",
            metadata={"name": policy.name, "version": policy.current_version},
        )
        await self.db.commit()
        return policy

    async def get_policy_versions(
        self,
        policy_id: uuid.UUID,
        current_user: User,
    ) -> List[SecurityPolicyVersion]:
        await self.get_policy(policy_id, current_user)
        return await self.repo.get_policy_versions(policy_id)

    async def _build_decision_context(
        self,
        project_id: uuid.UUID,
        payload: EvaluateDecisionRequest,
        current_user: User,
    ) -> Tuple[DecisionContext, List[Tuple[str, int, Dict[str, Any], str]]]:
        # 1. Load active policies
        policies = await self.repo.list_policies_for_project(project_id, active_only=True)
        policy_tuples = []
        for pol in policies:
            if pol.versions:
                latest_ver = pol.versions[0]  # ordered by version desc
                policy_tuples.append((pol.name, latest_ver.version, latest_ver.definition, str(latest_ver.id)))

        # 2. Load findings and verifications from scan if specified, or latest scan
        findings_data: List[Dict[str, Any]] = []
        verifications_data: List[Dict[str, Any]] = []
        scan_id_uuid: Optional[uuid.UUID] = None

        if payload.scan_id:
            try:
                scan_id_uuid = uuid.UUID(payload.scan_id)
            except ValueError:
                pass
        else:
            # Query recent scans for project
            recent_scans = await self.scan_repo.list_by_project(project_id, limit=1)
            if recent_scans:
                scan_id_uuid = recent_scans[0].id

        if scan_id_uuid:
            findings = await self.scan_repo.get_findings_for_scan(scan_id_uuid)
            for f in findings:
                findings_data.append({
                    "id": str(f.id),
                    "fingerprint": f.fingerprint,
                    "rule_id": f.rule_id,
                    "title": f.title,
                    "description": f.description,
                    "severity": f.severity,
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                    "scanner_name": f.scanner_name,
                    "status": "OPEN",
                    "raw_metadata": f.raw_metadata or {},
                })

            verifications = await self.scan_repo.get_verifications_for_scan(scan_id_uuid)
            for v in verifications:
                verifications_data.append({
                    "id": str(v.id),
                    "requirement_id": str(v.requirement_id) if v.requirement_id else None,
                    "requirement_key": v.requirement_key,
                    "status": v.status,
                    "rationale": v.rationale,
                    "evidence_summary": v.evidence_summary,
                })

        # 3. Load blueprint requirements if specified
        blueprint_id_uuid: Optional[uuid.UUID] = None
        requirements_data: List[Dict[str, Any]] = []

        if payload.blueprint_id:
            try:
                blueprint_id_uuid = uuid.UUID(payload.blueprint_id)
            except ValueError:
                pass
        else:
            # Get latest active blueprint for project
            bp = await self.blueprint_repo.get_latest_for_project(project_id)
            if bp:
                blueprint_id_uuid = bp.id

        if blueprint_id_uuid:
            bp_obj = await self.blueprint_repo.get_by_id(blueprint_id_uuid)
            if bp_obj and bp_obj.requirements:
                for req in bp_obj.requirements:
                    requirements_data.append({
                        "id": str(req.id),
                        "requirement_key": req.requirement_key,
                        "title": req.title,
                        "priority": req.priority,
                        "severity": req.severity,
                        "mandatory": req.mandatory,
                        "category": req.category,
                    })

        # 4. Construct context
        actor_data = payload.actor or ActorInput(
            type="USER",
            id=current_user.email,
            name=current_user.full_name or current_user.email,
            roles=["DEVELOPER"],
        )

        context = DecisionContext(
            actor=ActorContext(
                type=actor_data.type,
                id=actor_data.id,
                name=actor_data.name,
                roles=actor_data.roles,
            ),
            operation=OperationContext(
                type=payload.operation.type,
                id=payload.operation.resource_id,
                environment=payload.operation.environment,
                resource_type=payload.operation.resource_type,
                resource_id=payload.operation.resource_id,
                metadata=payload.operation.metadata,
            ),
            project_id=str(project_id),
            environment=payload.operation.environment,
            blueprint_id=str(blueprint_id_uuid) if blueprint_id_uuid else None,
            scan_id=str(scan_id_uuid) if scan_id_uuid else None,
            findings=findings_data,
            verifications=verifications_data,
            requirements=requirements_data,
            context_snapshot={
                "environment": payload.operation.environment,
                "operation": payload.operation.type,
                "scan_id": str(scan_id_uuid) if scan_id_uuid else None,
                "findings_count": len(findings_data),
                "verifications_count": len(verifications_data),
            },
        )

        return context, policy_tuples

    async def evaluate_decision(
        self,
        project_id: uuid.UUID,
        payload: EvaluateDecisionRequest,
        current_user: User,
    ) -> SecurityDecision:
        await self._verify_project_access(project_id, current_user)

        context, policy_tuples = await self._build_decision_context(project_id, payload, current_user)

        # Execute deterministic policy evaluation
        evaluation_result = policy_engine.evaluate(context, policy_tuples)

        # Create immutable decision record
        decision_record = SecurityDecision(
            project_id=project_id,
            actor_type=context.actor.type,
            actor_id=context.actor.id,
            operation_type=context.operation.type,
            operation_id=context.operation.id,
            resource_type=context.operation.resource_type,
            resource_id=context.operation.resource_id,
            environment=context.environment,
            decision=evaluation_result.decision.value,
            reason=evaluation_result.reason,
            policy_version_ids=evaluation_result.policy_version_ids,
            blueprint_id=uuid.UUID(context.blueprint_id) if context.blueprint_id else None,
            scan_id=uuid.UUID(context.scan_id) if context.scan_id else None,
            context_snapshot=context.context_snapshot,
        )

        # Convert EvidenceItems to DecisionEvidence records
        evidence_records = [
            DecisionEvidence(
                evidence_type=ev.evidence_type,
                source_type=ev.source_type,
                source_id=ev.source_id,
                attribute=ev.attribute,
                observed_value=ev.observed_value,
                expected_condition=ev.expected_condition,
                effect=ev.effect,
                rule_name=ev.rule_name,
                policy_version_id=ev.policy_version_id,
            )
            for ev in evaluation_result.evidence
        ]

        saved_decision = await self.repo.create_decision_with_evidence(decision_record, evidence_records)

        # If REQUIRE_APPROVAL, create pending SecurityApproval record
        if evaluation_result.decision == DecisionType.REQUIRE_APPROVAL:
            approval = SecurityApproval(
                decision_id=saved_decision.id,
                status="PENDING",
                requested_by=context.actor.id,
                reason=f"Approval required by policy for {context.operation.type} in {context.environment}",
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
            await self.repo.create_approval(approval)

        # Audit events
        await self.audit.log_event(
            action="DECISION_EVALUATED",
            resource_type="DECISION",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(saved_decision.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "decision": saved_decision.decision,
                "operation": saved_decision.operation_type,
                "environment": saved_decision.environment,
                "reason": saved_decision.reason,
                "policy_versions": saved_decision.policy_version_ids,
            },
        )

        # Log decision-specific event
        specific_action_map = {
            "BLOCK": "DECISION_BLOCKED",
            "ALLOW": "DECISION_ALLOWED",
            "WARN": "DECISION_WARNED",
            "REQUIRE_APPROVAL": "DECISION_APPROVAL_REQUIRED",
        }
        spec_action = specific_action_map.get(saved_decision.decision)
        if spec_action:
            await self.audit.log_event(
                action=spec_action,
                resource_type="DECISION",
                actor_type="USER",
                actor_id=str(current_user.id),
                resource_id=str(saved_decision.id),
                project_id=project_id,
                status="SUCCESS",
                metadata={"reason": saved_decision.reason},
            )

        await self.db.commit()

        # Re-fetch with relationships
        return await self.repo.get_decision_by_id(saved_decision.id)

    async def simulate_decision(
        self,
        project_id: uuid.UUID,
        payload: EvaluateDecisionRequest,
        current_user: User,
    ) -> SimulateDecisionResponse:
        """
        Read-only dry-run simulation of policy evaluation.
        Does not mutate database or create immutable decision records.
        """
        await self._verify_project_access(project_id, current_user)

        context, policy_tuples = await self._build_decision_context(project_id, payload, current_user)

        sim_result = policy_engine.simulate(context, policy_tuples)

        await self.audit.log_event(
            action="POLICY_SIMULATED",
            resource_type="PROJECT",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(project_id),
            project_id=project_id,
            status="SUCCESS",
            metadata={
                "simulated_decision": sim_result.decision.value,
                "operation": context.operation.type,
                "environment": context.environment,
            },
        )
        await self.db.commit()

        return SimulateDecisionResponse(
            decision=sim_result.decision.value,
            reason=sim_result.reason,
            policy_version_ids=sim_result.policy_version_ids,
            matched_rules=[
                {
                    "rule_name": r.rule_name,
                    "policy_name": r.policy_name,
                    "decision": r.decision.value,
                    "rationale": r.rationale,
                }
                for r in sim_result.matched_rules
            ],
            evidence=[
                {
                    "evidence_type": ev.evidence_type,
                    "attribute": ev.attribute,
                    "observed_value": ev.observed_value,
                    "expected_condition": ev.expected_condition,
                    "effect": ev.effect,
                    "rule_name": ev.rule_name,
                }
                for ev in sim_result.evidence
            ],
            simulated_at=sim_result.simulated_at,
            would_block=sim_result.would_block,
            would_require_approval=sim_result.would_require_approval,
            would_warn=sim_result.would_warn,
            would_allow=sim_result.would_allow,
        )

    async def approve_decision(
        self,
        approval_id: uuid.UUID,
        payload: ApprovalActionRequest,
        current_user: User,
    ) -> SecurityApproval:
        approval = await self.repo.get_approval_by_id(approval_id)
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Security approval request not found.",
            )

        if approval.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Approval is already in '{approval.status}' state and cannot be approved.",
            )

        # Separation of duties (Section 21): Requester cannot self-approve!
        if approval.requested_by.lower() == current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Separation of duties violation: requester cannot approve their own operation. Independent review is required.",
            )

        # Check expiration (Section 22)
        if approval.expires_at and approval.expires_at < datetime.now(timezone.utc):
            approval.status = "EXPIRED"
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approval request has expired.",
            )

        approval.status = "APPROVED"
        approval.approved_by = current_user.email
        approval.approved_at = datetime.now(timezone.utc)
        approval.approval_notes = payload.approval_notes

        await self.audit.log_event(
            action="APPROVAL_GRANTED",
            resource_type="APPROVAL",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(approval.id),
            project_id=approval.decision.project_id if approval.decision else None,
            status="SUCCESS",
            metadata={
                "decision_id": str(approval.decision_id),
                "approved_by": current_user.email,
                "notes": payload.approval_notes,
            },
        )
        await self.db.commit()
        return approval

    async def reject_decision(
        self,
        approval_id: uuid.UUID,
        payload: ApprovalActionRequest,
        current_user: User,
    ) -> SecurityApproval:
        approval = await self.repo.get_approval_by_id(approval_id)
        if not approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Security approval request not found.",
            )

        if approval.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Approval is already in '{approval.status}' state and cannot be rejected.",
            )

        approval.status = "REJECTED"
        approval.approved_by = current_user.email
        approval.approved_at = datetime.now(timezone.utc)
        approval.approval_notes = payload.approval_notes
        approval.reason = payload.reason or "Rejected by reviewer"

        await self.audit.log_event(
            action="APPROVAL_REJECTED",
            resource_type="APPROVAL",
            actor_type="USER",
            actor_id=str(current_user.id),
            resource_id=str(approval.id),
            project_id=approval.decision.project_id if approval.decision else None,
            status="SUCCESS",
            metadata={
                "decision_id": str(approval.decision_id),
                "rejected_by": current_user.email,
                "reason": approval.reason,
            },
        )
        await self.db.commit()
        return approval

    async def list_decisions(
        self,
        project_id: uuid.UUID,
        current_user: User,
        limit: int = 50,
    ) -> List[SecurityDecision]:
        await self._verify_project_access(project_id, current_user)
        return await self.repo.list_decisions_for_project(project_id, limit=limit)

    async def get_decision(
        self,
        decision_id: uuid.UUID,
        current_user: User,
    ) -> SecurityDecision:
        decision = await self.repo.get_decision_by_id(decision_id)
        if not decision:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Security decision not found.",
            )
        await self._verify_project_access(decision.project_id, current_user)
        return decision

    async def list_pending_approvals(
        self,
        project_id: uuid.UUID,
        current_user: User,
    ) -> List[SecurityApproval]:
        await self._verify_project_access(project_id, current_user)
        return await self.repo.list_pending_approvals_for_project(project_id)
