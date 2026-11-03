"""
Standalone Verification Script for Step 14 — Runtime Security Agent & Controlled Enforcement.
Proves all core platform invariants:
1. End-to-end Response Loop: DETECT -> VERIFY -> DECIDE -> APPROVAL -> EXECUTE -> EVIDENCE -> REVERIFY
2. Primary Demonstration: Real MCP Gateway tool block & denial (Section 101)
3. Second Demonstration: Real Step 11 delegation revocation (Section 102)
4. Third Demonstration: Real session revocation (Section 103)
5. Failure Demonstration: Unconfigured executors strictly report NOT_CONFIGURED (Section 104)
6. Self-Approval Prevention: Requester cannot approve their own high-risk action (Section 19)
7. Critical Authority Invariant: LLM cannot command execution; destructive commands forbidden (Section 87, 89)
8. Post-action Evidence & Contract Reverification (Section 73, 74)
9. Incident Correlation & Grouping (Section 94, 95)
"""

import asyncio
import uuid
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.agent import Agent
from app.models.mcp import MCPSession
from app.models.delegation import AgentDelegation
from app.contracts.models import (
    SecurityContract,
    SecurityContractVersion,
    SecurityContractViolation,
    SecurityContractVerification,
)
from app.mcp.gateway import MCPGateway
from app.mcp.authentication import MCPAuthenticator
from app.response.enums import (
    ResponseActionType,
    ResponseDecision,
    ResponseMode,
    ResponseSeverity,
    ResponseStatus,
    ResponseTargetType,
)
from app.response.models import (
    SecurityResponseAction,
    RuntimeEnforcementRule,
    SecurityIncident,
    SecurityIncidentEvent,
)
from app.response.schemas import SecurityResponseActionCreate
from app.response.service import RuntimeResponseService
from app.response.executors.container import ContainerIsolationExecutor
from app.response.executors.kubernetes import KubernetesIsolationExecutor
from app.response.executors.jenkins import JenkinsPipelineExecutor


async def run_step14_verification():
    print("=" * 80)
    print("STEP 14 -- RUNTIME SECURITY AGENT & CONTROLLED ENFORCEMENT VERIFICATION")
    print("=" * 80)

    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        service = RuntimeResponseService(session)

        user_officer = User(
            id=uuid.uuid4(),
            email="sec-officer@fintech.io",
            password_hash="pw",
            name="Security Officer",
            is_active=True,
        )
        user_reviewer = User(
            id=uuid.uuid4(),
            email="reviewer@fintech.io",
            password_hash="pw",
            name="Secondary Approver",
            is_active=True,
        )
        project_id = uuid.uuid4()
        project = Project(
            id=project_id,
            owner_id=user_officer.id,
            name="FinTech Control Plane",
            description="Production financial platform",
        )
        session.add_all([user_officer, user_reviewer, project])
        await session.commit()

        # Contract & Violation
        contract = SecurityContract(
            id=uuid.uuid4(),
            project_id=project_id,
            name="Tool Authority Contract",
            description="Restricts agent tool calls",
            contract_key="tool-authority",
            status="ACTIVE",
            created_by="system",
        )
        session.add(contract)
        await session.flush()

        version = SecurityContractVersion(
            id=uuid.uuid4(),
            contract_id=contract.id,
            version=1,
            definition={"key": "tool-authority"},
            normalized_definition={"key": "tool-authority"},
            definition_hash="hash_v1",
            status="ACTIVE",
            created_by="system",
        )
        session.add(version)
        contract.current_version_id = version.id
        await session.flush()

        verification = SecurityContractVerification(
            id=uuid.uuid4(),
            project_id=project_id,
            contract_version_id=version.id,
            status="VIOLATED",
            verifier_type="Step13RuntimeVerificationEngine",
        )
        session.add(verification)
        await session.flush()

        violation = SecurityContractViolation(
            id=uuid.uuid4(),
            project_id=project_id,
            contract_version_id=version.id,
            violation_type="UNAUTHORIZED_TOOL_INVOCATION",
            severity="CRITICAL",
            description="Agent attempted unauthorized tool execution",
            subject="agent-test-1",
            resource="aws_admin_delete",
            action="EXECUTE",
            status="OPEN",
            detected_at=datetime.now(timezone.utc),
        )
        session.add(violation)
        await session.commit()

        print("\n[+] 1. COMPLETE CONTROLLED ENFORCEMENT LOOP")
        # 1. Propose response action
        req = SecurityResponseActionCreate(
            violation_id=violation.id,
            verification_id=verification.id,
            contract_version_id=version.id,
            action_type=ResponseActionType.ALERT,
            target_type=ResponseTargetType.SERVICE,
            target_id="payment-gateway",
            mode=ResponseMode.OBSERVE,
            severity=ResponseSeverity.MEDIUM,
            reason="Observed suspicious authentication rate",
        )
        action = await service.create_response(
            project_id=project_id,
            request=req,
            requested_by_id=str(user_officer.id),
            requested_by_type="USER",
        )
        print(f"    - Action created: {action.id} | Status: {action.status}")
        assert action.status in ("REQUESTED", "PENDING_APPROVAL")

        # 2. Dry Run / Simulation
        dry_run = await service.dry_run_response(action.id)
        print(f"    - Dry Run completed: would_execute={dry_run.would_execute} | approval={dry_run.approval} | mode={dry_run.mode}")
        if action.status == "PENDING_APPROVAL":
            assert dry_run.approval == "REQUIRED"
            appr_res = await service.approve_response(
                action_id=action.id,
                approver_id=str(user_reviewer.id),
                reason="Pre-authorized for verification test",
            )
            assert appr_res["status"] == "APPROVED"
            # Re-run simulation post-approval to confirm execution readiness
            dry_run_after = await service.dry_run_response(action.id)
            print(f"    - Post-approval Dry Run: would_execute={dry_run_after.would_execute} | approval={dry_run_after.approval}")
            assert dry_run_after.would_execute is True
        else:
            assert dry_run.would_execute is True

        # 3. Execution
        exec_action = await service.execute_response(
            action_id=action.id,
            actor_id=str(user_officer.id),
            actor_type="USER",
        )
        print(f"    - Action executed: {exec_action.id} | Status: {exec_action.status}")
        assert exec_action.status == "COMPLETED"

        # 4. Post-Action Contract Reverification
        reverify = await service.reverify_response(action.id)
        print(f"    - Post-action Reverification: status={reverify.status} | evidence_id={reverify.reverification_evidence_id}")
        assert reverify.status in ("VERIFIED", "VIOLATED")

        print("\n[+] 2. PRIMARY DEMONSTRATION: MCP TOOL BLOCK & ENFORCEMENT (Section 101)")
        # Create real MCP block action
        mcp_req = SecurityResponseActionCreate(
            violation_id=violation.id,
            action_type=ResponseActionType.DENY_TOOL_CALL,
            target_type=ResponseTargetType.MCP_TOOL_CALL,
            target_id="run_security_scan",
            mode=ResponseMode.AUTOMATIC,
            severity=ResponseSeverity.CRITICAL,
        )
        mcp_action = await service.create_response(
            project_id=project_id,
            request=mcp_req,
            requested_by_id=str(user_officer.id),
            requested_by_type="USER",
        )
        if mcp_action.status == "PENDING_APPROVAL":
            await service.approve_response(
                action_id=mcp_action.id,
                approver_id=str(user_reviewer.id),
                reason="Pre-authorized for verification test",
            )
        mcp_exec = await service.execute_response(
            action_id=mcp_action.id,
            actor_id=str(user_officer.id),
            actor_type="USER",
        )
        print(f"    - MCP block action executed: status={mcp_exec.status}")
        assert mcp_exec.status == "COMPLETED"

        # Verify active rule in runtime
        active_rule = await service.enforcement_manager.get_active_rule(
            project_id=project_id,
            target_type="MCP_TOOL_CALL",
            target_id="run_security_scan",
        )
        print(f"    - Active Enforcement Rule in DB: {active_rule.id} (Action: {active_rule.action})")
        assert active_rule is not None
        assert active_rule.status == "ACTIVE"

        # Test real MCP Gateway denial
        agent = Agent(id=uuid.uuid4(), project_id=project_id, name="Test Agent", status="ACTIVE")
        session.add(agent)
        await session.commit()

        authenticator = MCPAuthenticator(session)
        mcp_sess = await authenticator.create_session(
            agent_id=agent.id,
            project_id=project_id,
            authenticated_principal="test@fintech.io",
            transport="stdio",
        )
        gateway = MCPGateway(db=session)
        res = await gateway.invoke_tool(
            session_id=mcp_sess.id,
            tool_name="run_security_scan",
            arguments={"project_id": str(project_id), "target_path": "."},
        )
        print(f"    - Real MCP Gateway call result: status={res.status} | error_code={res.error_code}")
        assert res.status == "DENIED"
        assert res.error_code == "RUNTIME_ENFORCEMENT_BLOCKED"

        print("\n[+] 3. SECOND DEMONSTRATION: DELEGATION REVOCATION (Section 102)")
        agent_lead = Agent(id=uuid.uuid4(), project_id=project_id, name="Lead Agent", status="ACTIVE")
        agent_worker = Agent(id=uuid.uuid4(), project_id=project_id, name="Worker Agent", status="ACTIVE")
        session.add_all([agent_lead, agent_worker])
        await session.commit()

        now = datetime.now(timezone.utc)
        del_record = AgentDelegation(
            id=uuid.uuid4(),
            delegator_agent_id=agent_lead.id,
            delegate_agent_id=agent_worker.id,
            project_id=project_id,
            status="ACTIVE",
            starts_at=now,
            expires_at=now + timedelta(hours=4),
            reason="Delegation for runtime revocation test",
            authority_snapshot={"actions": ["SCAN_EXECUTE"]},
            scope={"resource_types": ["INVOICE"]},
            conditions={},
            delegation_depth=1,
            created_by=str(user_officer.id),
            created_by_type="USER",
        )
        session.add(del_record)
        await session.commit()
        await session.refresh(del_record)
        print(f"    - Initial delegation status: {del_record.status}")
        assert del_record.status == "ACTIVE"

        del_action = await service.create_response(
            project_id=project_id,
            request=SecurityResponseActionCreate(
                action_type=ResponseActionType.REVOKE_DELEGATION,
                target_type=ResponseTargetType.DELEGATION,
                target_id=str(del_record.id),
                mode=ResponseMode.AUTOMATIC,
            ),
            requested_by_id=str(user_officer.id),
        )
        del_exec = await service.execute_response(del_action.id, actor_id=str(user_officer.id))
        print(f"    - Revoke delegation action executed: status={del_exec.status}")
        assert del_exec.status == "COMPLETED"

        await session.refresh(del_record)
        print(f"    - Delegation status in Step 11: {del_record.status}")
        assert del_record.status == "REVOKED"

        print("\n[+] 4. THIRD DEMONSTRATION: SESSION REVOCATION (Section 103)")
        mcp_sess_target = MCPSession(
            id=uuid.uuid4(),
            agent_id=agent_lead.id,
            project_id=project_id,
            authenticated_principal="session-compromised@fintech.io",
            transport="stdio",
            status="ACTIVE",
            expires_at=now + timedelta(hours=1),
        )
        session.add(mcp_sess_target)
        await session.commit()
        print(f"    - Initial session status: {mcp_sess_target.status}")

        sess_action = await service.create_response(
            project_id=project_id,
            request=SecurityResponseActionCreate(
                action_type=ResponseActionType.REVOKE_SESSION,
                target_type=ResponseTargetType.SESSION,
                target_id=str(mcp_sess_target.id),
                mode=ResponseMode.AUTOMATIC,
            ),
            requested_by_id=str(user_officer.id),
        )
        sess_exec = await service.execute_response(sess_action.id, actor_id=str(user_officer.id))
        print(f"    - Revoke session action executed: status={sess_exec.status}")
        assert sess_exec.status == "COMPLETED"

        await session.refresh(mcp_sess_target)
        print(f"    - Session status in DB: {mcp_sess_target.status}")
        assert mcp_sess_target.status == "REVOKED"

        print("\n[+] 5. SEPARATION OF DUTIES & SELF-APPROVAL PREVENTION (Section 19)")
        approval_action = await service.create_response(
            project_id=project_id,
            request=SecurityResponseActionCreate(
                action_type=ResponseActionType.ISOLATE_WORKLOAD,
                target_type=ResponseTargetType.CONTAINER,
                target_id="production-billing-01",
                mode=ResponseMode.REQUIRE_APPROVAL,
                severity=ResponseSeverity.CRITICAL,
            ),
            requested_by_id=str(user_officer.id),
        )
        print(f"    - High-risk action created: status={approval_action.status}")
        assert approval_action.status == "PENDING_APPROVAL"

        # Attempt self-approval: requester tries to approve own action
        self_appr = await service.approve_response(
            action_id=approval_action.id,
            approver_id=str(user_officer.id),  # Same actor
            reason="I approve my own action",
        )
        print(f"    - Self-approval attempt: success={self_appr['success']} | error={self_appr.get('error')}")
        assert self_appr["success"] is False
        assert self_appr["error"] == "SELF_APPROVAL_FORBIDDEN"

        # Legitimate secondary approval
        legit_appr = await service.approve_response(
            action_id=approval_action.id,
            approver_id=str(user_reviewer.id),  # Independent reviewer
            reason="Approved by secondary security officer",
        )
        print(f"    - Independent approval: success={legit_appr['success']} | status={legit_appr['status']}")
        assert legit_appr["success"] is True
        assert legit_appr["status"] == "APPROVED"

        print("\n[+] 6. FAILURE DEMONSTRATION: UNCONFIGURED EXECUTORS (Section 104)")
        # Docker unconfigured
        docker_exec = ContainerIsolationExecutor()
        d_res = await docker_exec.execute(approval_action, session)
        print(f"    - Container executor (unconfigured): status={d_res.status.value} | error={d_res.error}")
        assert d_res.status == ResponseStatus.NOT_EXECUTED
        assert d_res.error == "EXECUTOR_NOT_CONFIGURED"

        # Kubernetes unconfigured
        k8s_exec = KubernetesIsolationExecutor()
        k_res = await k8s_exec.execute(approval_action, session)
        print(f"    - Kubernetes executor (unconfigured): status={k_res.status.value} | error={k_res.error}")
        assert k_res.status == ResponseStatus.NOT_EXECUTED
        assert k_res.error == "EXECUTOR_NOT_CONFIGURED"

        # Jenkins unconfigured
        jenkins_exec = JenkinsPipelineExecutor()
        j_res = await jenkins_exec.execute(approval_action, session)
        print(f"    - Jenkins executor (unconfigured): status={j_res.status.value} | error={j_res.error}")
        assert j_res.status == ResponseStatus.NOT_EXECUTED
        assert j_res.error == "EXECUTOR_NOT_CONFIGURED"

        print("\n[+] 7. CRITICAL SECURITY INVARIANTS (Section 87, 89)")
        # 1. LLM proposes "DELETE_DATABASE" -> Strictly forbidden by type system & schema
        print("    - Attempting forbidden destructive action (DELETE_DATABASE)...")
        rejected_by_schema = False
        try:
            SecurityResponseActionCreate(
                action_type="DELETE_DATABASE",
                target_type=ResponseTargetType.SERVICE,
                target_id="production-postgres",
            )
        except Exception as e:
            rejected_by_schema = True
            print(f"      -> Strictly rejected by schema: {type(e).__name__}")
        assert rejected_by_schema is True

        # 2. Agent tries to block deployment outside its Step 10 permissions
        print("    - Agent attempting high-impact action outside authority...")
        agent_unauthorized = False
        try:
            await service.create_response(
                project_id=project_id,
                request=SecurityResponseActionCreate(
                    action_type=ResponseActionType.BLOCK_DEPLOYMENT,
                    target_type=ResponseTargetType.DEPLOYMENT,
                    target_id="deploy-prod-001",
                ),
                requested_by_id=str(agent.id),
                requested_by_type="AGENT",
            )
        except ValueError as val_err:
            agent_unauthorized = True
            print(f"      -> Blocked by Step 10 authorization: {val_err}")
        assert agent_unauthorized is True

        print("\n[+] 8. SECURITY INCIDENT CORRELATION (Section 94, 95)")
        incidents = await service.incident_service.list_incidents(project_id)
        print(f"    - Correlated Incidents found: {len(incidents)}")
        assert len(incidents) >= 1
        incident = incidents[0]
        print(f"    - Primary Incident: {incident.title} | Status: {incident.status} | Severity: {incident.severity}")

        print("\n[+] 9. RESPONSE OVERVIEW & PROMETHEUS OBSERVABILITY (Section 61, 78)")
        overview = await service.get_overview(project_id)
        print(f"    - Overview active_responses: {overview.active_responses_count}")
        print(f"    - Overview active_enforcement_rules: {overview.active_enforcement_rules_count}")
        print(f"    - Overview completed_actions: {overview.completed_actions_count}")
        print(f"    - Overview open_incidents: {overview.open_incidents_count}")
        assert overview.completed_actions_count >= 3

        print("\n" + "=" * 80)
        print("ALL STEP 14 VERIFICATION CHECKS PASSED PERFECTLY!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_step14_verification())
