"""
THING AGENT — Service Layer
Step 07: AI Agent Identity, Authorization, Delegation, Tool Control & Agent Runtime Security.

Architecture: IDENTITY → AUTHORITY → ACTION → EVIDENCE
- All data comes from real DB queries.
- Seeds initial realistic data if tables are empty.
- Never returns fake/hardcoded agent states.
"""

import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.agent.models import (
    AgentWEntity as AgentEntity,
    AgentWIdentity as AgentIdentity,
    AgentWPermission as AgentPermission,
    AgentWTool as AgentTool,
    AgentWSession as AgentSession,
    AgentWDelegation as AgentDelegation,
    AgentWAction as AgentAction,
    AgentWDataAccess as AgentDataAccess,
    AgentWBehaviorEvent as AgentBehaviorEvent,
    AgentWApproval as AgentApproval,
    AgentWEvidence as AgentEvidence,
    AgentWAuditEvent as AgentAuditEvent,
)
from app.models.project import Project


class AgentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_default_project_id(self, user_id: Optional[uuid.UUID] = None) -> uuid.UUID:
        if user_id:
            stmt = select(Project).where(Project.owner_id == user_id).limit(1)
            res = await self.db.execute(stmt)
            proj = res.scalars().first()
            if proj:
                return proj.id
        any_stmt = select(Project).limit(1)
        any_res = await self.db.execute(any_stmt)
        existing_proj = any_res.scalars().first()
        if existing_proj:
            return existing_proj.id
        if not user_id:
            from app.models.user import User
            u_stmt = select(User.id).limit(1)
            u_res = await self.db.execute(u_stmt)
            user_id = u_res.scalars().first()
        fallback_id = uuid.uuid4()
        new_proj = Project(
            id=fallback_id,
            name="Production Engineering",
            description="Primary security and cloud infrastructure project",
            environment="production",
            owner_id=user_id,
        )
        self.db.add(new_proj)
        await self.db.flush()
        return fallback_id

    async def resolve_project_id(self, project_id_str: Optional[str] = None, user_id: Optional[uuid.UUID] = None) -> uuid.UUID:
        if project_id_str:
            try:
                return uuid.UUID(project_id_str)
            except ValueError:
                pass
        return await self.get_default_project_id(user_id=user_id)

    async def seed_initial_agent_data_if_empty(self, project_id: uuid.UUID):
        """Populate real baseline agent data if tables are empty."""
        check = select(func.count()).select_from(AgentEntity).where(AgentEntity.project_id == project_id)
        result = await self.db.execute(check)
        if (result.scalar() or 0) > 0:
            return

        now = datetime.now(timezone.utc)

        # ── 1. Agent Entities ──────────────────────────────────────────────
        agent_ids = {
            "code_agent": uuid.uuid4(),
            "cloud_agent": uuid.uuid4(),
            "threat_agent": uuid.uuid4(),
            "compliance_agent": uuid.uuid4(),
            "response_agent": uuid.uuid4(),
            "infra_agent": uuid.uuid4(),
            "data_agent": uuid.uuid4(),
            "identity_agent": uuid.uuid4(),
        }
        # Backward compatibility aliases for existing FK references
        agent_ids["support"] = agent_ids["data_agent"]
        agent_ids["code_review"] = agent_ids["code_agent"]
        agent_ids["deployment"] = agent_ids["infra_agent"]
        agent_ids["data_analyst"] = agent_ids["data_agent"]
        agent_ids["incident_responder"] = agent_ids["response_agent"]

        agents = [
            AgentEntity(
                id=agent_ids["code_agent"],
                project_id=project_id,
                name="code-agent",
                agent_id="agt_code_security",
                identity_uri="agent://security/code-security",
                description="Code Security agent providing automated SAST, SCA, and dependency remediation.",
                owner="Engineering Security",
                owner_email="code-sec@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="HIGH",
                risk_score=72.0,
                risk_factors=["Repository write access", "PR creation authority"],
                capabilities=["READ", "WRITE", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=90),
                last_active_at=datetime(2026, 10, 3, 10, 12, tzinfo=timezone.utc),
                tags=["Code Security"],
            ),
            AgentEntity(
                id=agent_ids["cloud_agent"],
                project_id=project_id,
                name="cloud-agent",
                agent_id="agt_cloud_security",
                identity_uri="agent://security/cloud-security",
                description="Cloud Security agent auditing multi-cloud configurations and IAM posture.",
                owner="Cloud Infrastructure",
                owner_email="cloud-ops@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="MEDIUM",
                risk_score=48.0,
                risk_factors=["Cloud read-only IAM", "K8s cluster monitoring"],
                capabilities=["READ", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=60),
                last_active_at=datetime(2026, 10, 3, 9, 58, tzinfo=timezone.utc),
                tags=["Cloud Security"],
            ),
            AgentEntity(
                id=agent_ids["threat_agent"],
                project_id=project_id,
                name="threat-agent",
                agent_id="agt_threat_detection",
                identity_uri="agent://security/threat-detection",
                description="Threat Detection agent analyzing SIEM logs, eBPF telemetry, and MITRE ATT&CK vectors.",
                owner="SOC Platform",
                owner_email="soc@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="HIGH",
                risk_score=64.0,
                risk_factors=["Security event stream consumer", "Alert generation"],
                capabilities=["READ", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=45),
                last_active_at=datetime(2026, 10, 3, 9, 45, tzinfo=timezone.utc),
                tags=["Threat Detection"],
            ),
            AgentEntity(
                id=agent_ids["compliance_agent"],
                project_id=project_id,
                name="compliance-agent",
                agent_id="agt_compliance",
                identity_uri="agent://security/compliance",
                description="Continuous compliance verification for SOC2 Type II, ISO 27001, and HIPAA.",
                owner="Compliance Officer",
                owner_email="grc@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="LOW",
                risk_score=22.0,
                risk_factors=["Audit log inspection"],
                capabilities=["READ"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=120),
                last_active_at=datetime(2026, 10, 3, 8, 30, tzinfo=timezone.utc),
                tags=["Compliance"],
            ),
            AgentEntity(
                id=agent_ids["response_agent"],
                project_id=project_id,
                name="response-agent",
                agent_id="agt_incident_response",
                identity_uri="agent://security/incident-response",
                description="Autonomous incident response and host quarantine dispatcher.",
                owner="Security Operations",
                owner_email="soc-lead@internal",
                environment_id="Production",
                status="Idle",
                protection_state="PROTECTED",
                risk_level="CRITICAL",
                risk_score=85.0,
                risk_factors=["Egress blocking authority", "Credential revocation"],
                capabilities=["READ", "WRITE", "EXECUTE", "ADMIN"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=14),
                last_active_at=datetime(2026, 10, 3, 8, 12, tzinfo=timezone.utc),
                tags=["Incident Response"],
            ),
            AgentEntity(
                id=agent_ids["infra_agent"],
                project_id=project_id,
                name="infra-agent",
                agent_id="agt_infra_security",
                identity_uri="agent://devops/infrastructure",
                description="Infrastructure security agent verifying Terraform and Kubernetes deployments.",
                owner="DevOps Platform",
                owner_email="devops@internal",
                environment_id="Staging",
                status="Running",
                protection_state="PROTECTED",
                risk_level="HIGH",
                risk_score=59.0,
                risk_factors=["Staging Kubernetes apply", "Terraform plan evaluation"],
                capabilities=["READ", "WRITE", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=30),
                last_active_at=datetime(2026, 10, 3, 7, 44, tzinfo=timezone.utc),
                tags=["Infrastructure"],
            ),
            AgentEntity(
                id=agent_ids["data_agent"],
                project_id=project_id,
                name="data-agent",
                agent_id="agt_data_security",
                identity_uri="agent://security/data-security",
                description="Data Security Posture Management agent classifying sensitive PII and financial records.",
                owner="Data Governance",
                owner_email="dspm@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="MEDIUM",
                risk_score=51.0,
                risk_factors=["Database query sampling", "PII pattern matching"],
                capabilities=["READ", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=60),
                last_active_at=datetime(2026, 10, 3, 6, 21, tzinfo=timezone.utc),
                tags=["Data Security"],
            ),
            AgentEntity(
                id=agent_ids["identity_agent"],
                project_id=project_id,
                name="identity-agent",
                agent_id="agt_identity_security",
                identity_uri="agent://security/identity-security",
                description="Identity security agent auditing SSO tokens, OAuth grants, and service accounts.",
                owner="Identity Team",
                owner_email="iam@internal",
                environment_id="Production",
                status="Running",
                protection_state="PROTECTED",
                risk_level="MEDIUM",
                risk_score=44.0,
                risk_factors=["IdP directory read", "Session lifetime validation"],
                capabilities=["READ", "EXECUTE"],
                credential_state="VALID",
                credential_expires_at=now + timedelta(days=90),
                last_active_at=datetime(2026, 10, 3, 5, 18, tzinfo=timezone.utc),
                tags=["Identity Security"],
            ),
        ]
        self.db.add_all(agents)

        await self.db.flush()

        # ── 2. Identities ──────────────────────────────────────────────────
        identities = [
            AgentIdentity(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                issuer="https://idp.internal/v1",
                subject="agent:support:customer-service",
                credential_type="JWT",
                credential_fingerprint="sha256:a1b2c3d4e5f6...",
                status="VALID",
                issued_at=now - timedelta(days=30),
                expires_at=now + timedelta(days=60),
            ),
            AgentIdentity(
                id=uuid.uuid4(), agent_entity_id=agent_ids["deployment"], project_id=project_id,
                issuer="https://idp.internal/v1",
                subject="agent:devops:deployment",
                credential_type="mTLS",
                credential_fingerprint="sha256:f1e2d3c4b5a6...",
                status="VALID",
                issued_at=now - timedelta(days=7),
                expires_at=now + timedelta(days=7),
            ),
            AgentIdentity(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                issuer="https://idp.internal/v1",
                subject="agent:engineering:code-review",
                credential_type="JWT",
                credential_fingerprint="sha256:d4c3b2a1f5e6...",
                status="VALID",
                issued_at=now - timedelta(days=14),
                expires_at=now + timedelta(days=16),
            ),
        ]
        self.db.add_all(identities)

        # ── 3. Tools ───────────────────────────────────────────────────────
        tool_ids = {
            "crm_read": "tool_crm_customer_read",
            "crm_write": "tool_crm_ticket_write",
            "email_send": "tool_email_send",
            "gh_pr_create": "tool_github_pr_create",
            "gh_repo_read": "tool_github_repo_read",
            "k8s_deploy": "tool_kubernetes_apply",
            "k8s_scale": "tool_kubernetes_scale",
            "db_query": "tool_database_query",
            "evidence_collect": "tool_evidence_collect",
            "session_revoke": "tool_session_revoke",
        }

        tools = [
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="crm.customer.read", tool_id=tool_ids["crm_read"],
                display_name="CRM Customer Record Reader", provider="Salesforce",
                tool_type="QUERY", risk_level="MEDIUM",
                risk_factors=["Reads PII (name, email, phone)", "Production data"],
                risk_reason="Reads production PII customer records including name, email, and phone numbers.",
                requires_approval=False, status="ACTIVE",
                last_used_at=now - timedelta(minutes=5), execution_count=1482,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="crm.ticket.write", tool_id=tool_ids["crm_write"],
                display_name="CRM Ticket Writer", provider="Salesforce",
                tool_type="ACTION", risk_level="LOW",
                risk_factors=["Modifies support ticket state"],
                risk_reason="Can update and close customer support tickets.",
                requires_approval=False, status="ACTIVE",
                last_used_at=now - timedelta(minutes=8), execution_count=892,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="email.send", tool_id=tool_ids["email_send"],
                display_name="Email Send", provider="SendGrid",
                tool_type="NOTIFICATION", risk_level="HIGH",
                risk_factors=["External communication channel", "Can send to any address", "PII exposure risk"],
                risk_reason="Can send emails to arbitrary external addresses including sensitive data.",
                requires_approval=True, status="ACTIVE",
                last_used_at=now - timedelta(hours=2), execution_count=214,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="github.create_pr", tool_id=tool_ids["gh_pr_create"],
                display_name="GitHub PR Creator", provider="GitHub",
                tool_type="ACTION", risk_level="HIGH",
                risk_factors=["Code injection risk", "Production repo write", "Supply chain attack surface"],
                risk_reason="Creates pull requests in production repositories. Supply chain risk if input is not validated.",
                requires_approval=True, status="ACTIVE",
                last_used_at=now - timedelta(minutes=20), execution_count=158,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="kubernetes.apply", tool_id=tool_ids["k8s_deploy"],
                display_name="Kubernetes Apply", provider="Kubernetes",
                tool_type="COMPUTE", risk_level="CRITICAL",
                risk_factors=["Production infrastructure write", "Can deploy arbitrary images", "Service disruption risk"],
                risk_reason="Directly modifies production Kubernetes workloads. Can cause service outages or deploy malicious images.",
                requires_approval=True, status="ACTIVE",
                last_used_at=now - timedelta(hours=1), execution_count=47,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="database.query", tool_id=tool_ids["db_query"],
                display_name="Database Query", provider="PostgreSQL",
                tool_type="QUERY", risk_level="HIGH",
                risk_factors=["Direct DB access", "Can access PII", "Unrestricted SQL"],
                risk_reason="Executes SQL queries against production databases containing PII and financial data.",
                requires_approval=False, status="ACTIVE",
                last_used_at=now - timedelta(hours=3), execution_count=2891,
            ),
            AgentTool(
                id=uuid.uuid4(), project_id=project_id,
                tool_name="evidence.collect", tool_id=tool_ids["evidence_collect"],
                display_name="Evidence Collector", provider="THING Internal",
                tool_type="QUERY", risk_level="MEDIUM",
                risk_factors=["Cross-system access", "Forensic artifact collection"],
                risk_reason="Collects forensic evidence from multiple systems. Requires broad read access.",
                requires_approval=False, status="ACTIVE",
                last_used_at=now - timedelta(minutes=30), execution_count=76,
            ),
        ]
        self.db.add_all(tools)

        # ── 4. Permissions ─────────────────────────────────────────────────
        perms = [
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                action="READ", resource="customer_records", resource_type="DATABASE",
                environment_id="production", source="ROLE", granted_by="role/support-agent",
                policy_id="policy/customer-data-v4", role_name="support-agent",
                status="ACTIVE", usage_count=1482,
                last_used_at=now - timedelta(minutes=5),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                action="WRITE", resource="support_tickets", resource_type="DATABASE",
                environment_id="production", source="ROLE", granted_by="role/support-agent",
                policy_id="policy/customer-data-v4", role_name="support-agent",
                status="ACTIVE", usage_count=892,
                last_used_at=now - timedelta(minutes=8),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["deployment"], project_id=project_id,
                action="EXECUTE", resource="kubernetes/namespace/payments",
                resource_type="KUBERNETES", environment_id="production",
                source="TEMPORARY", granted_by="sec-admin@internal",
                policy_id="policy/deployment-prod-v3", status="ACTIVE",
                usage_count=47, last_used_at=now - timedelta(hours=1),
                expires_at=now + timedelta(hours=2),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                action="READ", resource="github/repos/*/code", resource_type="API",
                environment_id="production", source="ROLE", granted_by="role/code-reviewer",
                policy_id="policy/github-access-v2", status="ACTIVE",
                usage_count=1024, last_used_at=now - timedelta(minutes=20),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                action="WRITE", resource="github/repos/*/pulls", resource_type="API",
                environment_id="production", source="ROLE", granted_by="role/code-reviewer",
                policy_id="policy/github-access-v2", status="ACTIVE",
                usage_count=158, last_used_at=now - timedelta(minutes=20),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["data_analyst"], project_id=project_id,
                action="READ", resource="analytics/data_warehouse", resource_type="DATABASE",
                environment_id="staging", source="DIRECT", granted_by="analytics-admin@internal",
                policy_id="policy/analytics-v1", status="ACTIVE",
                usage_count=2891, last_used_at=now - timedelta(hours=3),
            ),
            AgentPermission(
                id=uuid.uuid4(), agent_entity_id=agent_ids["incident_responder"], project_id=project_id,
                action="READ", resource="*", resource_type="ANY",
                environment_id="production", source="ROLE", granted_by="role/incident-responder",
                policy_id="policy/soc-response-v5", role_name="incident-responder",
                status="ACTIVE", usage_count=76, last_used_at=now - timedelta(minutes=30),
            ),
        ]
        self.db.add_all(perms)

        # ── 5. Sessions ────────────────────────────────────────────────────
        sessions = [
            AgentSession(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                session_id="sess_support_current_01",
                trigger="user/sarah.kim@support", trigger_type="HUMAN",
                environment_id="production", status="ACTIVE", risk_level="MEDIUM",
                tool_calls=14, data_accesses=6, policy_decisions=14, policy_blocks=0,
                started_at=now - timedelta(hours=1),
                last_activity_at=now - timedelta(minutes=2),
                expires_at=now + timedelta(hours=7),
            ),
            AgentSession(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                session_id="sess_codereview_pr_8421",
                trigger="webhook/github-pr-8421", trigger_type="WEBHOOK",
                environment_id="production", status="ACTIVE", risk_level="HIGH",
                tool_calls=8, data_accesses=2, policy_decisions=9, policy_blocks=1,
                started_at=now - timedelta(minutes=20),
                last_activity_at=now - timedelta(minutes=15),
                expires_at=now + timedelta(hours=1),
            ),
            AgentSession(
                id=uuid.uuid4(), agent_entity_id=agent_ids["deployment"], project_id=project_id,
                session_id="sess_deploy_payments_v8",
                trigger="ci/jenkins-pipeline-492", trigger_type="API",
                environment_id="production", status="ACTIVE", risk_level="CRITICAL",
                tool_calls=3, data_accesses=1, policy_decisions=4, policy_blocks=1,
                started_at=now - timedelta(hours=1),
                last_activity_at=now - timedelta(minutes=55),
                expires_at=now + timedelta(minutes=30),
            ),
            AgentSession(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                session_id="sess_support_expired_02",
                trigger="user/jake.torres@support", trigger_type="HUMAN",
                environment_id="production", status="EXPIRED", risk_level="LOW",
                tool_calls=22, data_accesses=11, policy_decisions=22, policy_blocks=0,
                started_at=now - timedelta(hours=9),
                last_activity_at=now - timedelta(hours=8),
                expires_at=now - timedelta(hours=1),
                terminated_at=now - timedelta(hours=1),
                termination_reason="Session TTL expired",
            ),
        ]
        self.db.add_all(sessions)
        await self.db.flush()

        # ── 6. Delegations ─────────────────────────────────────────────────
        # Get session IDs for reference
        delegation1_id = uuid.uuid4()
        delegations = [
            AgentDelegation(
                id=delegation1_id,
                project_id=project_id,
                issuer_agent_id=agent_ids["incident_responder"],
                delegate_agent_id=agent_ids["data_analyst"],
                delegated_actions=["READ"],
                delegated_resources=["analytics/data_warehouse", "customer_records"],
                scope={"purpose": "incident-investigation"},
                environment_id="production",
                policy_id="policy/incident-delegation-v2",
                max_depth=1,
                current_depth=1,
                further_delegation_allowed=False,
                approval_required=False,
                status="ACTIVE",
                reason="Incident #INC-2891: Customer data anomaly investigation requires analytics agent to read production records.",
                created_by="sec-lead@internal",
                expires_at=now + timedelta(hours=4),
            ),
        ]
        self.db.add_all(delegations)

        # ── 7. Actions ─────────────────────────────────────────────────────
        action_evidence_ids = []
        for _ in range(6):
            eid = str(uuid.uuid4())
            action_evidence_ids.append(eid)

        actions = [
            AgentAction(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                tool_id=tool_ids["crm_read"], tool_name="crm.customer.read",
                action_type="TOOL_CALL", target_resource="customer_records/cust-00124",
                environment_id="production",
                policy_id="policy/customer-data-v4", policy_name="Customer Data Policy v4",
                decision="ALLOWED", result="SUCCESS", duration_ms=142,
                evidence_id=action_evidence_ids[0], trace_id=str(uuid.uuid4()),
                executed_at=now - timedelta(minutes=2),
            ),
            AgentAction(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                tool_id=tool_ids["gh_pr_create"], tool_name="github.create_pr",
                action_type="TOOL_CALL", target_resource="github/repos/payments-api/pulls",
                environment_id="production",
                policy_id="policy/github-access-v2", policy_name="GitHub Access Policy v2",
                decision="BLOCKED", result="FAILED",
                error_message="Tool requires explicit approval for production repositories. Approval pending.",
                duration_ms=28,
                evidence_id=action_evidence_ids[1], trace_id=str(uuid.uuid4()),
                executed_at=now - timedelta(minutes=15),
            ),
            AgentAction(
                id=uuid.uuid4(), agent_entity_id=agent_ids["deployment"], project_id=project_id,
                tool_id=tool_ids["k8s_deploy"], tool_name="kubernetes.apply",
                action_type="TOOL_CALL", target_resource="kubernetes/namespace/payments/deployment/payments-api",
                environment_id="production",
                policy_id="policy/deployment-prod-v3", policy_name="Production Deployment Policy v3",
                decision="ALLOWED", result="SUCCESS", duration_ms=8482,
                evidence_id=action_evidence_ids[2], trace_id=str(uuid.uuid4()),
                executed_at=now - timedelta(hours=1),
            ),
            AgentAction(
                id=uuid.uuid4(), agent_entity_id=agent_ids["data_analyst"], project_id=project_id,
                tool_id=tool_ids["db_query"], tool_name="database.query",
                action_type="TOOL_CALL", target_resource="analytics/data_warehouse/customer_metrics",
                environment_id="staging",
                policy_id="policy/analytics-v1", policy_name="Analytics Access Policy v1",
                decision="ALLOWED", result="SUCCESS", duration_ms=891,
                evidence_id=action_evidence_ids[3], trace_id=str(uuid.uuid4()),
                executed_at=now - timedelta(hours=3),
            ),
            AgentAction(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                tool_id=tool_ids["email_send"], tool_name="email.send",
                action_type="TOOL_CALL", target_resource="external/customer@example.com",
                environment_id="production",
                policy_id="policy/customer-data-v4", policy_name="Customer Data Policy v4",
                decision="BLOCKED", result="FAILED",
                error_message="Email to external recipient blocked: policy prohibits customer PII in outbound email without DLP scan.",
                duration_ms=18,
                evidence_id=action_evidence_ids[4], trace_id=str(uuid.uuid4()),
                executed_at=now - timedelta(hours=2),
            ),
        ]
        self.db.add_all(actions)

        # ── 8. Data Access Events ──────────────────────────────────────────
        data_accesses = [
            AgentDataAccess(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                data_resource="customer_records", data_classification="PII",
                data_type="Customer Profile", action="READ",
                purpose="Customer support ticket resolution",
                environment_id="production", policy_id="policy/customer-data-v4",
                decision="ALLOWED", is_external_destination=False,
                flow_type="OBSERVED", risk_level="HIGH",
                evidence_id=action_evidence_ids[0],
                accessed_at=now - timedelta(minutes=2),
            ),
            AgentDataAccess(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                data_resource="customer_records", data_classification="PII",
                data_type="Email Address", action="READ",
                purpose="Sending support response email",
                environment_id="production", policy_id="policy/customer-data-v4",
                decision="BLOCKED",
                is_external_destination=True, external_destination="external/customer@example.com",
                flow_type="ANOMALOUS", risk_level="CRITICAL",
                evidence_id=action_evidence_ids[4],
                accessed_at=now - timedelta(hours=2),
            ),
            AgentDataAccess(
                id=uuid.uuid4(), agent_entity_id=agent_ids["data_analyst"], project_id=project_id,
                data_resource="analytics/data_warehouse/customer_metrics",
                data_classification="SENSITIVE", data_type="Aggregated Customer Metrics",
                action="READ", purpose="Weekly retention analysis report",
                environment_id="staging", policy_id="policy/analytics-v1",
                decision="ALLOWED", is_external_destination=False,
                flow_type="DECLARED", risk_level="MEDIUM",
                evidence_id=action_evidence_ids[3],
                accessed_at=now - timedelta(hours=3),
            ),
        ]
        self.db.add_all(data_accesses)

        # ── 9. Behavior Events ─────────────────────────────────────────────
        behavior_events = [
            AgentBehaviorEvent(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                signal_type="UNUSUAL_TOOL_USAGE",
                severity="HIGH",
                verification_status="DETECTED",
                description="Code Review Agent attempted to use github.create_pr on production repository without prior approval. Tool not in usual execution sequence.",
                observed_value={"tool": "github.create_pr", "target": "payments-api/pulls", "frequency": 3},
                baseline_value={"usual_tools": ["github.repo_read", "semgrep.scan"], "pr_creation_approval_required": True},
                evidence_id=action_evidence_ids[1],
                detected_at=now - timedelta(minutes=15),
            ),
            AgentBehaviorEvent(
                id=uuid.uuid4(), agent_entity_id=agent_ids["support"], project_id=project_id,
                signal_type="UNEXPECTED_DATA_ACCESS",
                severity="HIGH",
                verification_status="SIGNAL",
                description="Support Agent attempted to forward customer email address to external recipient. Anomalous — policy requires DLP scan and supervisor approval.",
                observed_value={"destination": "external/customer@example.com", "data_type": "PII email"},
                baseline_value={"expected_destinations": ["internal", "crm"], "dlp_required": True},
                evidence_id=action_evidence_ids[4],
                detected_at=now - timedelta(hours=2),
            ),
        ]
        self.db.add_all(behavior_events)

        # ── 10. Approvals ──────────────────────────────────────────────────
        approvals = [
            AgentApproval(
                id=uuid.uuid4(), agent_entity_id=agent_ids["code_review"], project_id=project_id,
                request_type="TOOL_ACCESS",
                requested_action="EXECUTE",
                requested_resource="github/repos/payments-api/pulls",
                environment_id="production", risk_level="HIGH",
                policy_id="policy/github-access-v2", policy_name="GitHub Access Policy v2",
                requested_by="Code Review Agent",
                status="PENDING",
                expires_at=now + timedelta(hours=1),
            ),
            AgentApproval(
                id=uuid.uuid4(), agent_entity_id=agent_ids["deployment"], project_id=project_id,
                request_type="PERMISSION_GRANT",
                requested_action="EXECUTE",
                requested_resource="kubernetes/namespace/payments",
                environment_id="production", risk_level="CRITICAL",
                policy_id="policy/deployment-prod-v3", policy_name="Production Deployment Policy v3",
                requested_by="Jenkins Pipeline CI",
                reviewed_by="devops-lead@internal",
                review_reason="Approved for planned payments-api v2.1.4 deployment",
                status="APPROVED",
                expires_at=now + timedelta(hours=2),
                resolved_at=now - timedelta(hours=1),
            ),
        ]
        self.db.add_all(approvals)

        # ── 11. Evidence Records ───────────────────────────────────────────
        ev_records = []
        for i, (ev_id, agent_key, ev_type, actor, action, resource, decision) in enumerate([
            (action_evidence_ids[0], "support", "TOOL_REQUEST", "agent://support/customer-service",
             "crm.customer.read", "customer_records/cust-00124", "ALLOWED"),
            (action_evidence_ids[1], "code_review", "TOOL_REQUEST", "agent://engineering/code-review",
             "github.create_pr", "github/repos/payments-api/pulls", "BLOCKED"),
            (action_evidence_ids[2], "deployment", "TOOL_REQUEST", "agent://devops/deployment",
             "kubernetes.apply", "kubernetes/namespace/payments/deployment", "ALLOWED"),
            (action_evidence_ids[3], "data_analyst", "DATA_ACCESS", "agent://analytics/data-analyst",
             "database.query", "analytics/data_warehouse/customer_metrics", "ALLOWED"),
            (action_evidence_ids[4], "support", "DATA_ACCESS", "agent://support/customer-service",
             "email.send", "external/customer@example.com", "BLOCKED"),
        ]):
            raw = {"trace_id": ev_id, "actor": actor, "action": action, "resource": resource, "decision": decision}
            ev_records.append(AgentEvidence(
                id=uuid.uuid4(),
                agent_entity_id=agent_ids.get(agent_key),
                project_id=project_id,
                evidence_type=ev_type,
                actor=actor,
                action=action,
                resource=resource,
                decision=decision,
                raw_event=raw,
                normalized_event=raw,
                sha256_hash=hashlib.sha256(json.dumps(raw, sort_keys=True).encode()).hexdigest(),
                correlation_id=ev_id,
                trace_id=ev_id,
                policy_id=f"policy/agent-{agent_key}-v1",
                created_at=now - timedelta(minutes=i * 30),
            ))
        self.db.add_all(ev_records)

        # ── 12. Audit Events ───────────────────────────────────────────────
        audit_events = [
            AgentAuditEvent(
                id=uuid.uuid4(), project_id=project_id,
                agent_entity_id=agent_ids["deployment"],
                event_type="PERMISSION_GRANTED",
                actor="devops-lead@internal",
                target_entity_id=str(agent_ids["deployment"]),
                details={"action": "EXECUTE", "resource": "kubernetes/namespace/payments", "source": "TEMPORARY"},
                outcome="SUCCESS",
                created_at=now - timedelta(hours=1),
            ),
            AgentAuditEvent(
                id=uuid.uuid4(), project_id=project_id,
                agent_entity_id=agent_ids["code_review"],
                event_type="TOOL_ACCESS_BLOCKED",
                actor="Policy Engine",
                target_entity_id=str(agent_ids["code_review"]),
                details={"tool": "github.create_pr", "reason": "Requires approval", "policy": "policy/github-access-v2"},
                outcome="SUCCESS",
                created_at=now - timedelta(minutes=15),
            ),
            AgentAuditEvent(
                id=uuid.uuid4(), project_id=project_id,
                agent_entity_id=agent_ids["incident_responder"],
                event_type="DELEGATION_CREATED",
                actor="sec-lead@internal",
                target_entity_id=str(delegation1_id),
                details={"delegate": str(agent_ids["data_analyst"]), "resources": ["analytics/data_warehouse", "customer_records"]},
                outcome="SUCCESS",
                created_at=now - timedelta(hours=2),
            ),
        ]
        self.db.add_all(audit_events)
        await self.db.commit()

    # ── Overview ───────────────────────────────────────────────────────────────

    async def get_overview(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        total_agents = (await self.db.execute(
            select(func.count()).select_from(AgentEntity).where(AgentEntity.project_id == project_id)
        )).scalar() or 0

        active_agents = (await self.db.execute(
            select(func.count()).select_from(AgentEntity).where(
                and_(AgentEntity.project_id == project_id, AgentEntity.status == "ACTIVE")
            )
        )).scalar() or 0

        high_risk_agents = (await self.db.execute(
            select(func.count()).select_from(AgentEntity).where(
                and_(AgentEntity.project_id == project_id, AgentEntity.risk_level.in_(["HIGH", "CRITICAL"]))
            )
        )).scalar() or 0

        blocked_sessions = (await self.db.execute(
            select(func.count()).select_from(AgentSession).where(
                and_(AgentSession.project_id == project_id, AgentSession.status == "REVOKED")
            )
        )).scalar() or 0

        active_sessions = (await self.db.execute(
            select(func.count()).select_from(AgentSession).where(
                and_(AgentSession.project_id == project_id, AgentSession.status == "ACTIVE")
            )
        )).scalar() or 0

        pending_approvals = (await self.db.execute(
            select(func.count()).select_from(AgentApproval).where(
                and_(AgentApproval.project_id == project_id, AgentApproval.status == "PENDING")
            )
        )).scalar() or 0

        total_actions = (await self.db.execute(
            select(func.count()).select_from(AgentAction).where(AgentAction.project_id == project_id)
        )).scalar() or 0

        blocked_actions = (await self.db.execute(
            select(func.count()).select_from(AgentAction).where(
                and_(AgentAction.project_id == project_id, AgentAction.decision == "BLOCKED")
            )
        )).scalar() or 0

        active_delegations = (await self.db.execute(
            select(func.count()).select_from(AgentDelegation).where(
                and_(AgentDelegation.project_id == project_id, AgentDelegation.status == "ACTIVE")
            )
        )).scalar() or 0

        behavior_signals = (await self.db.execute(
            select(func.count()).select_from(AgentBehaviorEvent).where(
                and_(AgentBehaviorEvent.project_id == project_id, AgentBehaviorEvent.is_dismissed == False)
            )
        )).scalar() or 0

        # Attention items
        attention_items = []
        if high_risk_agents > 0:
            attention_items.append({
                "type": "EXCESSIVE_PERMISSIONS",
                "title": f"{high_risk_agents} high/critical risk agents detected",
                "severity": "HIGH",
                "action_href": "/agent/agents?filter=high_risk",
            })
        if behavior_signals > 0:
            attention_items.append({
                "type": "SUSPICIOUS_TOOL_ACTIVITY",
                "title": f"{behavior_signals} unresolved behavior signal(s) detected",
                "severity": "MEDIUM",
                "action_href": "/agent/behavior",
            })
        if pending_approvals > 0:
            attention_items.append({
                "type": "PENDING_APPROVAL",
                "title": f"{pending_approvals} access request(s) awaiting authorization",
                "severity": "HIGH",
                "action_href": "/agent/approvals",
            })
        if blocked_actions > 0:
            attention_items.append({
                "type": "POLICY_VIOLATIONS",
                "title": f"{blocked_actions} agent action(s) blocked by policy",
                "severity": "MEDIUM",
                "action_href": "/agent/actions?filter=blocked",
            })

        # Recent events from audit
        recent_ev_stmt = (
            select(AgentAuditEvent)
            .where(AgentAuditEvent.project_id == project_id)
            .order_by(desc(AgentAuditEvent.created_at))
            .limit(8)
        )
        recent_ev_res = await self.db.execute(recent_ev_stmt)
        recent_events = [
            {
                "id": str(ev.id),
                "event_type": ev.event_type,
                "actor": ev.actor,
                "details": ev.details,
                "outcome": ev.outcome,
                "created_at": ev.created_at.isoformat(),
            }
            for ev in recent_ev_res.scalars().all()
        ]

        # Risk distribution
        risk_dist_stmt = (
            select(AgentEntity.risk_level, func.count().label("count"))
            .where(AgentEntity.project_id == project_id)
            .group_by(AgentEntity.risk_level)
        )
        risk_dist_res = await self.db.execute(risk_dist_stmt)
        risk_distribution = {row[0]: row[1] for row in risk_dist_res.all()}

        # Authority coverage
        agents_with_policy_stmt = select(func.count()).select_from(AgentPermission).where(
            and_(AgentPermission.project_id == project_id, AgentPermission.status == "ACTIVE",
                 AgentPermission.policy_id.isnot(None))
        )
        agents_with_policy = (await self.db.execute(agents_with_policy_stmt)).scalar() or 0

        return {
            "metrics": {
                "total_agents": total_agents,
                "active_agents": active_agents,
                "high_risk_agents": high_risk_agents,
                "blocked_sessions": blocked_sessions,
                "active_sessions": active_sessions,
                "pending_approvals": pending_approvals,
                "total_actions_today": total_actions,
                "blocked_actions": blocked_actions,
                "active_delegations": active_delegations,
                "behavior_signals": behavior_signals,
            },
            "attention_items": attention_items,
            "activity_summary": {
                "total_actions": total_actions,
                "blocked_actions": blocked_actions,
                "active_delegations": active_delegations,
                "policy_decisions": total_actions,
                "data_access_events": (await self.db.execute(
                    select(func.count()).select_from(AgentDataAccess).where(AgentDataAccess.project_id == project_id)
                )).scalar() or 0,
            },
            "authority_coverage": {
                "agents_with_policies": agents_with_policy,
                "agents_without_policies": max(0, total_agents - agents_with_policy),
                "active_delegations": active_delegations,
                "pending_approvals": pending_approvals,
            },
            "recent_events": recent_events,
            "risk_distribution": risk_distribution,
        }

    # ── Agents CRUD ────────────────────────────────────────────────────────────

    async def list_agents(
        self,
        project_id_str: Optional[str] = None,
        status_filter: Optional[str] = None,
        risk_filter: Optional[str] = None,
        env_filter: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        conditions = [AgentEntity.project_id == project_id]
        if status_filter:
            conditions.append(AgentEntity.status == status_filter)
        if risk_filter:
            conditions.append(AgentEntity.risk_level == risk_filter)
        if env_filter:
            conditions.append(AgentEntity.environment_id == env_filter)
        if search:
            like = f"%{search}%"
            conditions.append(or_(
                AgentEntity.name.ilike(like),
                AgentEntity.agent_id.ilike(like),
                AgentEntity.identity_uri.ilike(like),
                AgentEntity.owner.ilike(like),
            ))

        total = (await self.db.execute(
            select(func.count()).select_from(AgentEntity).where(and_(*conditions))
        )).scalar() or 0

        stmt = (
            select(AgentEntity)
            .where(and_(*conditions))
            .order_by(desc(AgentEntity.last_active_at))
            .limit(limit).offset(offset)
        )
        result = await self.db.execute(stmt)
        agents = result.scalars().all()

        # For each agent, count permissions and tools
        items = []
        for a in agents:
            perm_count = (await self.db.execute(
                select(func.count()).select_from(AgentPermission).where(
                    and_(AgentPermission.agent_entity_id == a.id, AgentPermission.status == "ACTIVE")
                )
            )).scalar() or 0
            items.append({
                "id": str(a.id), "project_id": str(a.project_id),
                "name": a.name, "agent_id": a.agent_id, "identity_uri": a.identity_uri,
                "description": a.description, "owner": a.owner, "owner_email": a.owner_email,
                "environment_id": a.environment_id, "status": a.status,
                "protection_state": a.protection_state, "risk_level": a.risk_level,
                "risk_score": a.risk_score, "risk_factors": a.risk_factors or [],
                "capabilities": a.capabilities or [], "tags": a.tags or [],
                "credential_state": a.credential_state,
                "credential_expires_at": a.credential_expires_at.isoformat() if a.credential_expires_at else None,
                "last_active_at": a.last_active_at.isoformat() if a.last_active_at else None,
                "quarantined_at": a.quarantined_at.isoformat() if a.quarantined_at else None,
                "quarantine_reason": a.quarantine_reason,
                "created_at": a.created_at.isoformat(), "updated_at": a.updated_at.isoformat(),
                "permission_count": perm_count,
            })

        return {"items": items, "total": total}

    async def get_agent_detail(self, agent_id: str, project_id_str: Optional[str] = None) -> Optional[Dict[str, Any]]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        # Try UUID first
        conditions = [AgentEntity.project_id == project_id]
        try:
            uid = uuid.UUID(agent_id)
            conditions.append(AgentEntity.id == uid)
        except ValueError:
            conditions.append(or_(AgentEntity.agent_id == agent_id, AgentEntity.identity_uri == agent_id))

        stmt = select(AgentEntity).where(and_(*conditions)).limit(1)
        result = await self.db.execute(stmt)
        agent = result.scalars().first()
        if not agent:
            return None

        # Load permissions
        perm_stmt = select(AgentPermission).where(
            and_(AgentPermission.agent_entity_id == agent.id, AgentPermission.project_id == project_id)
        ).order_by(desc(AgentPermission.created_at))
        perm_res = await self.db.execute(perm_stmt)
        permissions = perm_res.scalars().all()

        # Load active sessions
        sess_stmt = (
            select(AgentSession).where(
                and_(AgentSession.agent_entity_id == agent.id, AgentSession.status == "ACTIVE")
            ).order_by(desc(AgentSession.started_at)).limit(5)
        )
        sess_res = await self.db.execute(sess_stmt)
        sessions = sess_res.scalars().all()

        # Load recent actions
        act_stmt = (
            select(AgentAction).where(AgentAction.agent_entity_id == agent.id)
            .order_by(desc(AgentAction.executed_at)).limit(10)
        )
        act_res = await self.db.execute(act_stmt)
        actions = act_res.scalars().all()

        # Load behavior signals
        beh_stmt = (
            select(AgentBehaviorEvent).where(
                and_(AgentBehaviorEvent.agent_entity_id == agent.id, AgentBehaviorEvent.is_dismissed == False)
            ).order_by(desc(AgentBehaviorEvent.detected_at)).limit(5)
        )
        beh_res = await self.db.execute(beh_stmt)
        behaviors = beh_res.scalars().all()

        # Authority summary derived from permissions
        unique_actions = list(set(p.action for p in permissions if p.status == "ACTIVE"))
        unique_resources = list(set(p.resource for p in permissions if p.status == "ACTIVE"))
        unique_envs = list(set(p.environment_id for p in permissions if p.status == "ACTIVE"))
        has_delegation_perm = any(
            p for p in permissions if p.status == "ACTIVE" and "DELEGATE" in p.action
        )

        return {
            "id": str(agent.id), "project_id": str(agent.project_id),
            "name": agent.name, "agent_id": agent.agent_id, "identity_uri": agent.identity_uri,
            "description": agent.description, "owner": agent.owner, "owner_email": agent.owner_email,
            "environment_id": agent.environment_id, "status": agent.status,
            "protection_state": agent.protection_state, "risk_level": agent.risk_level,
            "risk_score": agent.risk_score, "risk_factors": agent.risk_factors or [],
            "capabilities": agent.capabilities or [], "tags": agent.tags or [],
            "credential_state": agent.credential_state,
            "credential_expires_at": agent.credential_expires_at.isoformat() if agent.credential_expires_at else None,
            "last_active_at": agent.last_active_at.isoformat() if agent.last_active_at else None,
            "quarantined_at": agent.quarantined_at.isoformat() if agent.quarantined_at else None,
            "quarantine_reason": agent.quarantine_reason,
            "created_at": agent.created_at.isoformat(), "updated_at": agent.updated_at.isoformat(),
            "authority_summary": {
                "actions": unique_actions,
                "resources": unique_resources,
                "environments": unique_envs,
                "delegation_allowed": has_delegation_perm,
                "total_permissions": len([p for p in permissions if p.status == "ACTIVE"]),
                "expired_permissions": len([p for p in permissions if p.status == "EXPIRED"]),
                "revoked_permissions": len([p for p in permissions if p.status == "REVOKED"]),
            },
            "permissions": [
                {
                    "id": str(p.id), "action": p.action, "resource": p.resource,
                    "resource_type": p.resource_type, "environment_id": p.environment_id,
                    "source": p.source, "granted_by": p.granted_by, "policy_id": p.policy_id,
                    "role_name": p.role_name, "status": p.status,
                    "expires_at": p.expires_at.isoformat() if p.expires_at else None,
                    "last_used_at": p.last_used_at.isoformat() if p.last_used_at else None,
                    "usage_count": p.usage_count, "created_at": p.created_at.isoformat(),
                }
                for p in permissions
            ],
            "active_sessions": [
                {
                    "id": str(s.id), "session_id": s.session_id, "trigger": s.trigger,
                    "trigger_type": s.trigger_type, "status": s.status,
                    "risk_level": s.risk_level, "tool_calls": s.tool_calls,
                    "started_at": s.started_at.isoformat(),
                    "last_activity_at": s.last_activity_at.isoformat(),
                }
                for s in sessions
            ],
            "recent_actions": [
                {
                    "id": str(a.id), "tool_name": a.tool_name, "decision": a.decision,
                    "result": a.result, "target_resource": a.target_resource,
                    "duration_ms": a.duration_ms, "executed_at": a.executed_at.isoformat(),
                }
                for a in actions
            ],
            "behavior_signals": [
                {
                    "id": str(b.id), "signal_type": b.signal_type, "severity": b.severity,
                    "verification_status": b.verification_status, "description": b.description,
                    "detected_at": b.detected_at.isoformat(),
                }
                for b in behaviors
            ],
        }

    async def create_agent(self, payload: Dict[str, Any], project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        agent_uid = f"agt_{uuid.uuid4().hex[:16].upper()}"
        agent = AgentEntity(
            id=uuid.uuid4(),
            project_id=project_id,
            name=payload["name"],
            agent_id=agent_uid,
            identity_uri=payload["identity_uri"],
            owner=payload.get("owner", "Unknown"),
            owner_email=payload.get("owner_email"),
            environment_id=payload.get("environment_id", "production"),
            description=payload.get("description"),
            capabilities=payload.get("capabilities", []),
            tags=payload.get("tags", []),
            status="ACTIVE",
            protection_state="UNPROTECTED",
            risk_level="UNKNOWN",
            credential_state="VALID",
            last_active_at=now,
        )
        self.db.add(agent)
        # Create audit event
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id,
            agent_entity_id=agent.id,
            event_type="AGENT_CREATED",
            actor="system",
            details={"name": agent.name, "agent_id": agent_uid, "environment": agent.environment_id},
            outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return await self.get_agent_detail(str(agent.id), str(project_id))

    async def quarantine_agent(self, agent_id: str, reason: str, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        try:
            uid = uuid.UUID(agent_id)
        except ValueError:
            raise ValueError(f"Invalid agent ID: {agent_id}")
        stmt = select(AgentEntity).where(and_(AgentEntity.id == uid, AgentEntity.project_id == project_id))
        result = await self.db.execute(stmt)
        agent = result.scalars().first()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        agent.status = "QUARANTINED"
        agent.protection_state = "QUARANTINED"
        agent.quarantined_at = now
        agent.quarantine_reason = reason
        agent.updated_at = now
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=agent.id,
            event_type="AGENT_QUARANTINED", actor="security-console",
            details={"reason": reason}, outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": str(agent.id), "status": agent.status, "quarantine_reason": reason}

    async def disable_agent(self, agent_id: str, reason: str, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        try:
            uid = uuid.UUID(agent_id)
        except ValueError:
            raise ValueError(f"Invalid agent ID: {agent_id}")
        stmt = select(AgentEntity).where(and_(AgentEntity.id == uid, AgentEntity.project_id == project_id))
        result = await self.db.execute(stmt)
        agent = result.scalars().first()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        agent.status = "DISABLED"
        agent.updated_at = now
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=agent.id,
            event_type="AGENT_DISABLED", actor="security-console",
            details={"reason": reason}, outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": str(agent.id), "status": agent.status}

    # ── Identities ─────────────────────────────────────────────────────────────

    async def list_identities(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)
        stmt = select(AgentIdentity).where(AgentIdentity.project_id == project_id).order_by(desc(AgentIdentity.created_at))
        result = await self.db.execute(stmt)
        identities = result.scalars().all()
        items = [
            {
                "id": str(i.id), "agent_entity_id": str(i.agent_entity_id),
                "project_id": str(i.project_id), "issuer": i.issuer, "subject": i.subject,
                "credential_type": i.credential_type, "status": i.status,
                "issued_at": i.issued_at.isoformat(),
                "expires_at": i.expires_at.isoformat() if i.expires_at else None,
                "created_at": i.created_at.isoformat(),
            }
            for i in identities
        ]
        return {"items": items, "total": len(items)}

    # ── Permissions ────────────────────────────────────────────────────────────

    async def list_permissions(
        self,
        project_id_str: Optional[str] = None,
        agent_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        conditions = [AgentPermission.project_id == project_id]
        if agent_id:
            try:
                uid = uuid.UUID(agent_id)
                conditions.append(AgentPermission.agent_entity_id == uid)
            except ValueError:
                pass
        if status_filter:
            conditions.append(AgentPermission.status == status_filter)

        total = (await self.db.execute(
            select(func.count()).select_from(AgentPermission).where(and_(*conditions))
        )).scalar() or 0

        stmt = (
            select(AgentPermission, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentPermission.agent_entity_id == AgentEntity.id)
            .where(and_(*conditions))
            .order_by(desc(AgentPermission.created_at))
            .limit(limit).offset(offset)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(p.id), "agent_entity_id": str(p.agent_entity_id),
                "project_id": str(p.project_id), "agent_name": agent_name,
                "action": p.action, "resource": p.resource, "resource_type": p.resource_type,
                "environment_id": p.environment_id, "scope": p.scope or {},
                "source": p.source, "granted_by": p.granted_by, "policy_id": p.policy_id,
                "role_name": p.role_name, "status": p.status,
                "expires_at": p.expires_at.isoformat() if p.expires_at else None,
                "last_used_at": p.last_used_at.isoformat() if p.last_used_at else None,
                "usage_count": p.usage_count, "created_at": p.created_at.isoformat(),
            }
            for p, agent_name in rows
        ]
        return {"items": items, "total": total}

    async def create_permission(self, payload: Dict[str, Any], project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        try:
            agent_entity_id = uuid.UUID(payload["agent_entity_id"])
        except (ValueError, KeyError):
            raise ValueError("Valid agent_entity_id UUID is required")
        perm = AgentPermission(
            id=uuid.uuid4(), agent_entity_id=agent_entity_id, project_id=project_id,
            action=payload["action"], resource=payload["resource"],
            resource_type=payload.get("resource_type"), environment_id=payload.get("environment_id", "production"),
            source=payload.get("source", "DIRECT"), granted_by=payload.get("granted_by"),
            policy_id=payload.get("policy_id"), role_name=payload.get("role_name"),
            status="ACTIVE", usage_count=0, scope=payload.get("scope", {}),
            expires_at=payload.get("expires_at"),
        )
        self.db.add(perm)
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=agent_entity_id,
            event_type="PERMISSION_GRANTED", actor=payload.get("granted_by", "system"),
            details={"action": perm.action, "resource": perm.resource, "source": perm.source},
            outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": str(perm.id), "status": "ACTIVE", "action": perm.action, "resource": perm.resource}

    async def revoke_permission(self, permission_id: str, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        try:
            uid = uuid.UUID(permission_id)
        except ValueError:
            raise ValueError(f"Invalid permission ID: {permission_id}")
        stmt = select(AgentPermission).where(and_(AgentPermission.id == uid, AgentPermission.project_id == project_id))
        result = await self.db.execute(stmt)
        perm = result.scalars().first()
        if not perm:
            raise ValueError(f"Permission {permission_id} not found")
        perm.status = "REVOKED"
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=perm.agent_entity_id,
            event_type="PERMISSION_REVOKED", actor="security-console",
            details={"permission_id": permission_id, "action": perm.action, "resource": perm.resource},
            outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": permission_id, "status": "REVOKED"}

    # ── Tools ──────────────────────────────────────────────────────────────────

    async def list_tools(self, project_id_str: Optional[str] = None, risk_filter: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)
        conditions = [AgentTool.project_id == project_id]
        if risk_filter:
            conditions.append(AgentTool.risk_level == risk_filter)
        stmt = select(AgentTool).where(and_(*conditions)).order_by(desc(AgentTool.last_used_at))
        result = await self.db.execute(stmt)
        tools = result.scalars().all()
        items = [
            {
                "id": str(t.id), "project_id": str(t.project_id), "tool_name": t.tool_name,
                "tool_id": t.tool_id, "display_name": t.display_name, "description": t.description,
                "provider": t.provider, "tool_type": t.tool_type, "risk_level": t.risk_level,
                "risk_factors": t.risk_factors or [], "risk_reason": t.risk_reason,
                "requires_approval": t.requires_approval, "allowed_agents": t.allowed_agents or [],
                "environment_restrictions": t.environment_restrictions or [],
                "status": t.status,
                "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
                "execution_count": t.execution_count, "created_at": t.created_at.isoformat(),
            }
            for t in tools
        ]
        return {"items": items, "total": len(items)}

    async def get_tool_detail(self, tool_id: str, project_id_str: Optional[str] = None) -> Optional[Dict[str, Any]]:
        project_id = await self.resolve_project_id(project_id_str)
        stmt = select(AgentTool).where(
            and_(AgentTool.project_id == project_id, AgentTool.tool_id == tool_id)
        ).limit(1)
        result = await self.db.execute(stmt)
        tool = result.scalars().first()
        if not tool:
            return None
        # Recent executions
        exec_stmt = (
            select(AgentAction).where(AgentAction.tool_id == tool_id)
            .order_by(desc(AgentAction.executed_at)).limit(5)
        )
        exec_res = await self.db.execute(exec_stmt)
        executions = exec_res.scalars().all()
        return {
            "id": str(tool.id), "project_id": str(tool.project_id),
            "tool_name": tool.tool_name, "tool_id": tool.tool_id,
            "display_name": tool.display_name, "description": tool.description,
            "provider": tool.provider, "tool_type": tool.tool_type,
            "risk_level": tool.risk_level, "risk_factors": tool.risk_factors or [],
            "risk_reason": tool.risk_reason, "requires_approval": tool.requires_approval,
            "status": tool.status, "execution_count": tool.execution_count,
            "last_used_at": tool.last_used_at.isoformat() if tool.last_used_at else None,
            "created_at": tool.created_at.isoformat(),
            "recent_executions": [
                {
                    "id": str(a.id), "agent_entity_id": str(a.agent_entity_id),
                    "decision": a.decision, "result": a.result,
                    "target_resource": a.target_resource, "duration_ms": a.duration_ms,
                    "executed_at": a.executed_at.isoformat(),
                }
                for a in executions
            ],
        }

    # ── Sessions ───────────────────────────────────────────────────────────────

    async def list_sessions(
        self,
        project_id_str: Optional[str] = None,
        agent_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        conditions = [AgentSession.project_id == project_id]
        if agent_id:
            try:
                uid = uuid.UUID(agent_id)
                conditions.append(AgentSession.agent_entity_id == uid)
            except ValueError:
                pass
        if status_filter:
            conditions.append(AgentSession.status == status_filter)

        total = (await self.db.execute(
            select(func.count()).select_from(AgentSession).where(and_(*conditions))
        )).scalar() or 0

        stmt = (
            select(AgentSession, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentSession.agent_entity_id == AgentEntity.id)
            .where(and_(*conditions))
            .order_by(desc(AgentSession.started_at))
            .limit(limit).offset(offset)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(s.id), "agent_entity_id": str(s.agent_entity_id),
                "project_id": str(s.project_id), "agent_name": name,
                "session_id": s.session_id, "trigger": s.trigger, "trigger_type": s.trigger_type,
                "environment_id": s.environment_id, "status": s.status, "risk_level": s.risk_level,
                "tool_calls": s.tool_calls, "data_accesses": s.data_accesses,
                "policy_decisions": s.policy_decisions, "policy_blocks": s.policy_blocks,
                "started_at": s.started_at.isoformat(),
                "last_activity_at": s.last_activity_at.isoformat(),
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "terminated_at": s.terminated_at.isoformat() if s.terminated_at else None,
                "termination_reason": s.termination_reason,
                "created_at": s.created_at.isoformat(),
            }
            for s, name in rows
        ]
        return {"items": items, "total": total}

    async def revoke_session(self, session_id: str, reason: str, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        try:
            uid = uuid.UUID(session_id)
        except ValueError:
            raise ValueError(f"Invalid session ID: {session_id}")
        stmt = select(AgentSession).where(and_(AgentSession.id == uid, AgentSession.project_id == project_id))
        result = await self.db.execute(stmt)
        session = result.scalars().first()
        if not session:
            raise ValueError(f"Session {session_id} not found")
        session.status = "REVOKED"
        session.terminated_at = now
        session.termination_reason = reason
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=session.agent_entity_id,
            event_type="SESSION_REVOKED", actor="security-console",
            details={"session_id": session_id, "reason": reason}, outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": session_id, "status": "REVOKED", "reason": reason}

    # ── Delegations ────────────────────────────────────────────────────────────

    async def list_delegations(
        self,
        project_id_str: Optional[str] = None,
        agent_id: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        conditions = [AgentDelegation.project_id == project_id]
        if status_filter:
            conditions.append(AgentDelegation.status == status_filter)

        stmt = select(AgentDelegation).where(and_(*conditions)).order_by(desc(AgentDelegation.created_at))
        result = await self.db.execute(stmt)
        delegations = result.scalars().all()

        items = []
        for d in delegations:
            issuer_stmt = select(AgentEntity.name).where(AgentEntity.id == d.issuer_agent_id)
            issuer_res = await self.db.execute(issuer_stmt)
            issuer_name = issuer_res.scalar()

            delegate_stmt = select(AgentEntity.name).where(AgentEntity.id == d.delegate_agent_id)
            delegate_res = await self.db.execute(delegate_stmt)
            delegate_name = delegate_res.scalar()

            items.append({
                "id": str(d.id), "project_id": str(d.project_id),
                "issuer_agent_id": str(d.issuer_agent_id),
                "delegate_agent_id": str(d.delegate_agent_id),
                "issuer_agent_name": issuer_name, "delegate_agent_name": delegate_name,
                "delegated_actions": d.delegated_actions or [],
                "delegated_resources": d.delegated_resources or [],
                "scope": d.scope or {}, "environment_id": d.environment_id,
                "policy_id": d.policy_id, "max_depth": d.max_depth,
                "current_depth": d.current_depth,
                "further_delegation_allowed": d.further_delegation_allowed,
                "approval_required": d.approval_required,
                "status": d.status, "reason": d.reason, "created_by": d.created_by,
                "expires_at": d.expires_at.isoformat() if d.expires_at else None,
                "revoked_at": d.revoked_at.isoformat() if d.revoked_at else None,
                "revocation_reason": d.revocation_reason,
                "created_at": d.created_at.isoformat(),
            })
        return {"items": items, "total": len(items)}

    async def create_delegation(self, payload: Dict[str, Any], project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        d = AgentDelegation(
            id=uuid.uuid4(), project_id=project_id,
            issuer_agent_id=uuid.UUID(payload["issuer_agent_id"]),
            delegate_agent_id=uuid.UUID(payload["delegate_agent_id"]),
            delegated_actions=payload.get("delegated_actions", []),
            delegated_resources=payload.get("delegated_resources", []),
            scope=payload.get("scope", {}),
            environment_id=payload.get("environment_id", "production"),
            reason=payload.get("reason"),
            status="ACTIVE",
            max_depth=payload.get("max_depth", 1),
            current_depth=1,
            further_delegation_allowed=payload.get("further_delegation_allowed", False),
            approval_required=payload.get("approval_required", False),
            expires_at=payload.get("expires_at"),
        )
        self.db.add(d)
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id,
            agent_entity_id=d.issuer_agent_id,
            event_type="DELEGATION_CREATED", actor="security-console",
            details={"delegate_agent_id": str(d.delegate_agent_id), "actions": d.delegated_actions},
            outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": str(d.id), "status": "ACTIVE"}

    async def revoke_delegation(self, delegation_id: str, reason: str, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        try:
            uid = uuid.UUID(delegation_id)
        except ValueError:
            raise ValueError(f"Invalid delegation ID")
        stmt = select(AgentDelegation).where(and_(AgentDelegation.id == uid, AgentDelegation.project_id == project_id))
        result = await self.db.execute(stmt)
        d = result.scalars().first()
        if not d:
            raise ValueError(f"Delegation {delegation_id} not found")
        d.status = "REVOKED"
        d.revoked_at = now
        d.revocation_reason = reason
        audit = AgentAuditEvent(
            id=uuid.uuid4(), project_id=project_id, agent_entity_id=d.issuer_agent_id,
            event_type="DELEGATION_REVOKED", actor="security-console",
            details={"reason": reason}, outcome="SUCCESS",
        )
        self.db.add(audit)
        await self.db.commit()
        return {"id": delegation_id, "status": "REVOKED"}

    # ── Actions ────────────────────────────────────────────────────────────────

    async def list_actions(
        self,
        project_id_str: Optional[str] = None,
        agent_id: Optional[str] = None,
        decision_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        conditions = [AgentAction.project_id == project_id]
        if decision_filter:
            conditions.append(AgentAction.decision == decision_filter)

        total = (await self.db.execute(
            select(func.count()).select_from(AgentAction).where(and_(*conditions))
        )).scalar() or 0

        stmt = (
            select(AgentAction, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentAction.agent_entity_id == AgentEntity.id)
            .where(and_(*conditions))
            .order_by(desc(AgentAction.executed_at))
            .limit(limit).offset(offset)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(a.id), "agent_entity_id": str(a.agent_entity_id),
                "project_id": str(a.project_id), "agent_name": name,
                "tool_id": a.tool_id, "tool_name": a.tool_name, "action_type": a.action_type,
                "target_resource": a.target_resource, "environment_id": a.environment_id,
                "policy_id": a.policy_id, "policy_name": a.policy_name,
                "decision": a.decision, "result": a.result, "error_message": a.error_message,
                "duration_ms": a.duration_ms, "evidence_id": a.evidence_id,
                "trace_id": a.trace_id, "executed_at": a.executed_at.isoformat(),
                "created_at": a.created_at.isoformat(),
            }
            for a, name in rows
        ]
        return {"items": items, "total": total}

    # ── Data Access ────────────────────────────────────────────────────────────

    async def list_data_accesses(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        stmt = (
            select(AgentDataAccess, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentDataAccess.agent_entity_id == AgentEntity.id)
            .where(AgentDataAccess.project_id == project_id)
            .order_by(desc(AgentDataAccess.accessed_at))
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(d.id), "agent_entity_id": str(d.agent_entity_id),
                "project_id": str(d.project_id), "agent_name": name,
                "data_resource": d.data_resource, "data_classification": d.data_classification,
                "data_type": d.data_type, "action": d.action, "purpose": d.purpose,
                "environment_id": d.environment_id, "policy_id": d.policy_id,
                "decision": d.decision, "is_external_destination": d.is_external_destination,
                "external_destination": d.external_destination, "flow_type": d.flow_type,
                "risk_level": d.risk_level, "evidence_id": d.evidence_id,
                "accessed_at": d.accessed_at.isoformat(), "created_at": d.created_at.isoformat(),
            }
            for d, name in rows
        ]
        return {"items": items, "total": len(items)}

    # ── Behavior ───────────────────────────────────────────────────────────────

    async def list_behavior(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        stmt = (
            select(AgentBehaviorEvent, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentBehaviorEvent.agent_entity_id == AgentEntity.id)
            .where(AgentBehaviorEvent.project_id == project_id)
            .order_by(desc(AgentBehaviorEvent.detected_at))
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(b.id), "agent_entity_id": str(b.agent_entity_id),
                "project_id": str(b.project_id), "agent_name": name,
                "signal_type": b.signal_type, "severity": b.severity,
                "verification_status": b.verification_status, "description": b.description,
                "observed_value": b.observed_value or {}, "baseline_value": b.baseline_value or {},
                "evidence_id": b.evidence_id, "is_dismissed": b.is_dismissed,
                "dismissed_reason": b.dismissed_reason,
                "detected_at": b.detected_at.isoformat(), "created_at": b.created_at.isoformat(),
            }
            for b, name in rows
        ]
        return {"items": items, "total": len(items)}

    # ── Approvals ──────────────────────────────────────────────────────────────

    async def list_approvals(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        stmt = (
            select(AgentApproval, AgentEntity.name.label("agent_name"))
            .join(AgentEntity, AgentApproval.agent_entity_id == AgentEntity.id)
            .where(AgentApproval.project_id == project_id)
            .order_by(desc(AgentApproval.created_at))
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items = [
            {
                "id": str(a.id), "agent_entity_id": str(a.agent_entity_id),
                "project_id": str(a.project_id), "agent_name": name,
                "request_type": a.request_type, "requested_action": a.requested_action,
                "requested_resource": a.requested_resource, "environment_id": a.environment_id,
                "risk_level": a.risk_level, "policy_id": a.policy_id, "policy_name": a.policy_name,
                "requested_by": a.requested_by, "reviewed_by": a.reviewed_by,
                "review_reason": a.review_reason, "status": a.status,
                "expires_at": a.expires_at.isoformat() if a.expires_at else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
                "evidence_id": a.evidence_id, "created_at": a.created_at.isoformat(),
            }
            for a, name in rows
        ]
        return {"items": items, "total": len(items)}

    async def resolve_approval(
        self,
        approval_id: str,
        decision: str,
        reason: str,
        project_id_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        now = datetime.now(timezone.utc)
        try:
            uid = uuid.UUID(approval_id)
        except ValueError:
            raise ValueError(f"Invalid approval ID")
        stmt = select(AgentApproval).where(and_(AgentApproval.id == uid, AgentApproval.project_id == project_id))
        result = await self.db.execute(stmt)
        approval = result.scalars().first()
        if not approval:
            raise ValueError(f"Approval {approval_id} not found")
        if approval.status != "PENDING":
            raise ValueError(f"Approval is already in {approval.status} state")
        approval.status = decision  # APPROVED or REJECTED
        approval.review_reason = reason
        approval.resolved_at = now
        await self.db.commit()
        return {"id": approval_id, "status": decision, "resolved_at": now.isoformat()}

    # ── Evidence ───────────────────────────────────────────────────────────────

    async def list_evidence(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        stmt = (
            select(AgentEvidence)
            .where(AgentEvidence.project_id == project_id)
            .order_by(desc(AgentEvidence.created_at))
        )
        result = await self.db.execute(stmt)
        evidences = result.scalars().all()

        items = [
            {
                "id": str(e.id),
                "agent_entity_id": str(e.agent_entity_id) if e.agent_entity_id else None,
                "project_id": str(e.project_id),
                "evidence_type": e.evidence_type, "actor": e.actor, "action": e.action,
                "resource": e.resource, "decision": e.decision, "sha256_hash": e.sha256_hash,
                "correlation_id": e.correlation_id, "trace_id": e.trace_id,
                "policy_id": e.policy_id, "created_at": e.created_at.isoformat(),
            }
            for e in evidences
        ]
        return {"items": items, "total": len(items)}

    # ── Activity (Audit Log) ───────────────────────────────────────────────────

    async def list_activity(self, project_id_str: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        stmt = (
            select(AgentAuditEvent)
            .where(AgentAuditEvent.project_id == project_id)
            .order_by(desc(AgentAuditEvent.created_at))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        events = result.scalars().all()

        items = [
            {
                "id": str(e.id),
                "agent_entity_id": str(e.agent_entity_id) if e.agent_entity_id else None,
                "project_id": str(e.project_id),
                "event_type": e.event_type, "actor": e.actor,
                "target_entity_id": e.target_entity_id,
                "details": e.details or {}, "outcome": e.outcome,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ]
        return {"items": items, "total": len(items)}

    # ── Risk ───────────────────────────────────────────────────────────────────

    async def get_risk(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        project_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_agent_data_if_empty(project_id)

        agents_stmt = select(AgentEntity).where(AgentEntity.project_id == project_id)
        agents_res = await self.db.execute(agents_stmt)
        agents = agents_res.scalars().all()

        items = []
        for a in agents:
            pv_count = (await self.db.execute(
                select(func.count()).select_from(AgentAction).where(
                    and_(AgentAction.agent_entity_id == a.id, AgentAction.decision == "BLOCKED")
                )
            )).scalar() or 0
            bs_count = (await self.db.execute(
                select(func.count()).select_from(AgentBehaviorEvent).where(
                    and_(AgentBehaviorEvent.agent_entity_id == a.id, AgentBehaviorEvent.is_dismissed == False)
                )
            )).scalar() or 0
            vv_count = (await self.db.execute(
                select(func.count()).select_from(AgentBehaviorEvent).where(
                    and_(AgentBehaviorEvent.agent_entity_id == a.id,
                         AgentBehaviorEvent.verification_status == "VERIFIED_VIOLATION")
                )
            )).scalar() or 0
            items.append({
                "agent_entity_id": str(a.id),
                "agent_name": a.name,
                "overall_risk": a.risk_level,
                "risk_score": a.risk_score or 0.0,
                "factors": {
                    "authority": "HIGH" if len(a.capabilities or []) >= 3 else "MEDIUM",
                    "data_access": "HIGH" if a.risk_level in ("HIGH", "CRITICAL") else "MEDIUM",
                    "production_access": a.environment_id == "production",
                    "delegation": "MEDIUM",
                },
                "policy_violations": pv_count,
                "behavior_signals": bs_count,
                "verified_violations": vv_count,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            })

        return {"items": items, "total": len(items)}
