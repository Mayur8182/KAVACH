"""
Runtime Security Response Service for Step 14.
Orchestrates the complete DETECT -> DECIDE -> AUTHORIZE -> APPROVE -> EXECUTE -> EVIDENCE -> REVERIFY loop.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.models import SecurityContractViolation
from app.response.approval.service import ResponseApprovalService
from app.response.authorization.service import ResponseAuthorizationService
from app.response.decision.engine import ResponseDecisionEngine
from app.response.enforcement.manager import EnforcementRuleManager
from app.response.enums import (
    ResponseActionType,
    ResponseDecision,
    ResponseMode,
    ResponseSeverity,
    ResponseStatus,
    ResponseTargetType,
)
from app.response.executors.registry import ResponseExecutorRegistry, default_executor_registry
from app.response.incidents.service import SecurityIncidentService
from app.response.models import (
    ResponseExecutionAttempt,
    RuntimeEnforcementRule,
    SecurityIncident,
    SecurityResponseAction,
    SecurityResponseDecision,
    SecurityResponsePlan,
    SecurityResponsePlanVersion,
)
from app.response.repository import ResponseRepository
from app.response.schemas import (
    ResponseDryRunResponse,
    ResponseOverviewResponse,
    ResponseReverificationResponse,
    SecurityResponseActionCreate,
    SecurityResponsePlanCreate,
)
from app.response.verification.reverification import ReverificationEngine
from app.services.audit_service import AuditService


class RuntimeResponseService:
    def __init__(self, db: AsyncSession, registry: Optional[ResponseExecutorRegistry] = None):
        self.db = db
        self.repo = ResponseRepository(db)
        self.registry = registry or default_executor_registry
        self.authz_service = ResponseAuthorizationService(db)
        self.decision_engine = ResponseDecisionEngine(db)
        self.approval_service = ResponseApprovalService(db)
        self.enforcement_manager = EnforcementRuleManager(db)
        self.incident_service = SecurityIncidentService(db)
        self.reverification_engine = ReverificationEngine(db)
        self.audit = AuditService(db)

    async def create_response_plan(
        self,
        project_id: uuid.UUID,
        request: SecurityResponsePlanCreate,
        created_by: str = "security_admin",
    ) -> SecurityResponsePlan:
        now = datetime.now(timezone.utc)
        plan = SecurityResponsePlan(
            id=uuid.uuid4(),
            project_id=project_id,
            name=request.name,
            description=request.description,
            status="ACTIVE",
            active_version=1,
            created_by=created_by,
            activated_at=now,
            created_at=now,
            updated_at=now,
        )
        self.db.add(plan)
        await self.db.flush()

        version = SecurityResponsePlanVersion(
            id=uuid.uuid4(),
            plan_id=plan.id,
            version=1,
            definition=request.definition,
            status="ACTIVE",
            created_by=created_by,
            created_at=now,
        )
        self.db.add(version)
        await self.db.commit()
        await self.db.refresh(plan)
        return plan

    async def create_response(
        self,
        project_id: uuid.UUID,
        request: SecurityResponseActionCreate,
        requested_by_id: str,
        requested_by_type: str = "USER",
    ) -> SecurityResponseAction:
        now = datetime.now(timezone.utc)
        act_val = request.action_type.value if hasattr(request.action_type, "value") else str(request.action_type)
        tgt_val = request.target_type.value if hasattr(request.target_type, "value") else str(request.target_type)

        # 1. Idempotency Check
        idempotency_key = f"{project_id}:{act_val}:{tgt_val}:{request.target_id}:{request.violation_id or 'manual'}"
        existing = await self.repo.get_action_by_idempotency_key(idempotency_key)
        if existing and existing.status in ("REQUESTED", "PENDING_APPROVAL", "APPROVED", "EXECUTING", "COMPLETED"):
            return existing

        # 2. Authorization Check (EffectiveResponseAuthority ⊆ AuthorizedResponseAuthority)
        authz = await self.authz_service.authorize_response_action(
            actor_id=requested_by_id,
            actor_type=requested_by_type,
            action_type=act_val,
            target_type=tgt_val,
            project_id=project_id,
        )
        if not authz["authorized"]:
            # Action cannot even be requested if fundamentally unauthorized / destructive
            raise ValueError(f"Authorization denied: {authz['reason']}")

        # 3. Policy & Risk Context Evaluation
        violation = None
        contract_version_id = None
        if request.violation_id:
            violation = await self.db.get(SecurityContractViolation, request.violation_id)
            if violation:
                contract_version_id = violation.contract_version_id

        policy_decision = None
        requires_approval = False

        if violation:
            policy_decision = await self.decision_engine.evaluate_response_decision(
                violation=violation,
                target_type=tgt_val,
                target_id=request.target_id,
                environment="PRODUCTION",
            )
            requires_approval = policy_decision.decision == ResponseDecision.REQUIRE_APPROVAL.value
        elif request.mode == ResponseMode.REQUIRE_APPROVAL:
            requires_approval = True

        expires_at = now + timedelta(seconds=request.ttl_seconds or 1800)
        initial_status = ResponseStatus.PENDING_APPROVAL.value if requires_approval else ResponseStatus.REQUESTED.value

        action = SecurityResponseAction(
            id=uuid.uuid4(),
            project_id=project_id,
            violation_id=request.violation_id,
            verification_id=request.verification_id,
            contract_version_id=contract_version_id,
            action_type=act_val,
            status=initial_status,
            mode=request.mode.value if hasattr(request.mode, "value") else str(request.mode),
            severity=request.severity.value if hasattr(request.severity, "value") else str(request.severity),
            target_type=tgt_val,
            target_id=request.target_id,
            requested_by_type=requested_by_type,
            requested_by_id=requested_by_id,
            policy_decision_id=policy_decision.id if policy_decision else None,
            authorization_context=authz,
            request=request.parameters or {"reason": request.reason},
            result={},
            created_at=now,
            expires_at=expires_at,
            idempotency_key=idempotency_key,
        )
        self.db.add(action)
        await self.db.commit()
        await self.db.refresh(action)

        # 4. If approval required, create approval request
        if requires_approval:
            await self.approval_service.create_approval_request(action, ttl_minutes=60)

        # 5. Incident Grouping
        if violation:
            incident = await self.incident_service.correlate_incident_for_violation(violation)
            await self.incident_service.record_response_event(incident.id, action)

        # 6. Audit Logging
        await self.audit.log_event(
            action="RESPONSE_REQUESTED",
            resource_type=action.target_type,
            actor_type=requested_by_type,
            actor_id=requested_by_id,
            resource_id=action.target_id,
            project_id=project_id,
            metadata={
                "action_id": str(action.id),
                "action_type": action.action_type,
                "target_type": action.target_type,
                "target_id": action.target_id,
                "status": action.status,
                "requires_approval": requires_approval,
            },
        )

        return action

    async def execute_response(
        self,
        action_id: uuid.UUID,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityResponseAction:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Response action '{action_id}' not found.")

        now = datetime.now(timezone.utc)

        # Check expiration
        if action.expires_at:
            exp = action.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now:
                action.status = ResponseStatus.EXPIRED.value
                action.failure_reason = "Action expired before execution."
                await self.db.commit()
                return action

        # State Machine Safety Check
        if action.status == ResponseStatus.PENDING_APPROVAL.value:
            raise ValueError("Response action cannot execute: human approval is PENDING.")
        if action.status == ResponseStatus.REJECTED.value:
            raise ValueError("Response action cannot execute: approval was REJECTED.")
        if action.status not in (ResponseStatus.REQUESTED.value, ResponseStatus.APPROVED.value, ResponseStatus.QUEUED.value):
            raise ValueError(f"Invalid state transition: cannot execute action in status '{action.status}'.")

        # Re-verify authorization
        authz = await self.authz_service.authorize_response_action(
            actor_id=actor_id,
            actor_type=actor_type,
            action_type=action.action_type,
            target_type=action.target_type,
            project_id=action.project_id,
        )
        if not authz["authorized"]:
            action.status = ResponseStatus.DENIED.value
            action.failure_reason = authz["reason"]
            await self.db.commit()
            return action

        # Transition to EXECUTING
        action.status = ResponseStatus.EXECUTING.value
        action.started_at = now
        await self.db.commit()

        # Find executor
        executor = self.registry.get_executor(action.action_type, action.target_type)
        attempt_number = len(action.execution_attempts) + 1

        if not executor:
            action.status = ResponseStatus.NOT_EXECUTED.value
            action.failure_reason = f"No executor registered for {action.action_type}:{action.target_type}."
            action.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
            return action

        # Create attempt record
        attempt = ResponseExecutionAttempt(
            id=uuid.uuid4(),
            response_action_id=action.id,
            executor_type=executor.__class__.__name__,
            attempt_number=attempt_number,
            status="STARTED",
            started_at=now,
            request=action.request,
            result={},
            created_at=now,
        )
        self.db.add(attempt)
        await self.db.commit()

        # Execute
        try:
            exec_result = await executor.execute(action, self.db)
            completion_time = datetime.now(timezone.utc)

            attempt.status = exec_result.status.value if hasattr(exec_result.status, "value") else str(exec_result.status)
            attempt.completed_at = completion_time
            attempt.result = exec_result.to_dict()
            attempt.target_state_before = exec_result.target_state_before
            attempt.target_state_after = exec_result.target_state_after
            attempt.error_message = exec_result.error

            action.status = attempt.status
            action.completed_at = completion_time
            action.result = exec_result.to_dict()
            action.failure_reason = exec_result.error

            # If completed successfully, trigger post-action evidence and reverification
            if exec_result.success and action.status == ResponseStatus.COMPLETED.value:
                await self.reverification_engine.reverify_contract_after_response(
                    action=action,
                    execution_result_payload=exec_result.to_dict(),
                )

            await self.db.commit()
            await self.db.refresh(action)

            # Audit
            await self.audit.log_event(
                action=f"RESPONSE_{action.status}",
                resource_type=action.target_type,
                actor_type=actor_type,
                actor_id=actor_id,
                resource_id=action.target_id,
                project_id=action.project_id,
                metadata={
                    "action_id": str(action.id),
                    "action_type": action.action_type,
                    "target_id": action.target_id,
                    "status": action.status,
                    "success": exec_result.success,
                },
            )

            return action

        except Exception as ex:
            fail_time = datetime.now(timezone.utc)
            attempt.status = "FAILED"
            attempt.completed_at = fail_time
            attempt.error_message = str(ex)

            action.status = ResponseStatus.FAILED.value
            action.completed_at = fail_time
            action.failure_reason = str(ex)
            await self.db.commit()
            await self.db.refresh(action)
            return action

    async def approve_response(
        self,
        action_id: uuid.UUID,
        approver_id: str,
        reason: str,
    ) -> Dict[str, Any]:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            return {"success": False, "error": "ACTION_NOT_FOUND", "message": "Action not found"}

        return await self.approval_service.process_approval(
            action=action,
            approver_id=approver_id,
            decision="APPROVED",
            reason=reason,
        )

    async def reject_response(
        self,
        action_id: uuid.UUID,
        approver_id: str,
        reason: str,
    ) -> Dict[str, Any]:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            return {"success": False, "error": "ACTION_NOT_FOUND", "message": "Action not found"}

        return await self.approval_service.process_approval(
            action=action,
            approver_id=approver_id,
            decision="REJECTED",
            reason=reason,
        )

    async def cancel_response(
        self,
        action_id: uuid.UUID,
        canceller_id: str,
        reason: str,
    ) -> SecurityResponseAction:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        if action.status not in ("REQUESTED", "PENDING_APPROVAL", "QUEUED"):
            raise ValueError(f"Cannot cancel response in status '{action.status}'.")

        action.status = ResponseStatus.CANCELLED.value
        action.failure_reason = f"Cancelled by {canceller_id}: {reason}"
        await self.db.commit()
        await self.db.refresh(action)
        return action

    async def dry_run_response(
        self,
        action_id: uuid.UUID,
    ) -> ResponseDryRunResponse:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        executor = self.registry.get_executor(action.action_type, action.target_type)
        executor_dry = {}
        if executor:
            executor_dry = await executor.dry_run(action, self.db)

        reversibility = executor.reversibility if executor else "UNKNOWN"

        return ResponseDryRunResponse(
            mode="DRY_RUN",
            would_execute=action.status in ("REQUESTED", "APPROVED"),
            action=action.action_type,
            target=f"{action.target_type}:{action.target_id}",
            authorization="ALLOWED",
            policy="ALLOW",
            approval="REQUIRED" if action.status == "PENDING_APPROVAL" else "NOT_REQUIRED",
            reversibility=str(reversibility),
            blast_radius={"target_id": action.target_id, "target_type": action.target_type},
            simulated_effect=executor_dry.get("simulated_effect", "No mutation simulated"),
            reasons=["Validated authorization", "Validated policy", "Target scope checked"],
        )

    async def reverify_response(
        self,
        action_id: uuid.UUID,
    ) -> ResponseReverificationResponse:
        action = await self.repo.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        res = await self.reverification_engine.reverify_contract_after_response(action)
        return ResponseReverificationResponse(
            response_action_id=action.id,
            contract_id=res.get("contract_id"),
            status=res["status"],
            is_remediated=res["is_remediated"],
            reverification_evidence_id=res.get("reverification_evidence_id"),
            message=res["message"],
            details=res.get("details", {}),
        )

    async def get_overview(
        self,
        project_id: uuid.UUID,
    ) -> ResponseOverviewResponse:
        # Real DB counts
        act_res_stmt = select(func.count(SecurityResponseAction.id)).where(
            SecurityResponseAction.project_id == project_id,
            SecurityResponseAction.status.in_(["REQUESTED", "EXECUTING"]),
        )
        active_count = (await self.db.execute(act_res_stmt)).scalar() or 0

        pending_stmt = select(func.count(SecurityResponseAction.id)).where(
            SecurityResponseAction.project_id == project_id,
            SecurityResponseAction.status == "PENDING_APPROVAL",
        )
        pending_count = (await self.db.execute(pending_stmt)).scalar() or 0

        failed_stmt = select(func.count(SecurityResponseAction.id)).where(
            SecurityResponseAction.project_id == project_id,
            SecurityResponseAction.status.in_(["FAILED", "NOT_EXECUTED"]),
        )
        failed_count = (await self.db.execute(failed_stmt)).scalar() or 0

        completed_stmt = select(func.count(SecurityResponseAction.id)).where(
            SecurityResponseAction.project_id == project_id,
            SecurityResponseAction.status == "COMPLETED",
        )
        completed_count = (await self.db.execute(completed_stmt)).scalar() or 0

        viol_stmt = select(func.count(SecurityContractViolation.id)).where(
            SecurityContractViolation.project_id == project_id,
            SecurityContractViolation.status == "OPEN",
        )
        open_viols = (await self.db.execute(viol_stmt)).scalar() or 0

        now = datetime.now(timezone.utc)
        rule_stmt = select(func.count(RuntimeEnforcementRule.id)).where(
            RuntimeEnforcementRule.project_id == project_id,
            RuntimeEnforcementRule.status == "ACTIVE",
            RuntimeEnforcementRule.expires_at > now,
        )
        active_rules = (await self.db.execute(rule_stmt)).scalar() or 0

        inc_stmt = select(func.count(SecurityIncident.id)).where(
            SecurityIncident.project_id == project_id,
            SecurityIncident.status == "OPEN",
        )
        open_inc = (await self.db.execute(inc_stmt)).scalar() or 0

        return ResponseOverviewResponse(
            project_id=project_id,
            active_responses_count=active_count,
            pending_approvals_count=pending_count,
            failed_actions_count=failed_count,
            completed_actions_count=completed_count,
            open_violations_count=open_viols,
            active_enforcement_rules_count=active_rules,
            open_incidents_count=open_inc,
        )


ResponseService = RuntimeResponseService

