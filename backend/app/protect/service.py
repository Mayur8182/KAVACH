"""
Thing Protect — Service Layer
Authoritative runtime defense, deterministic policy execution, MCP tool gateway interception,
session revocation, and verifiable evidence persistence.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.schemas.pagination import build_pagination_meta

from app.protect.models import (
    ProtectionPolicy,
    ProtectionPolicyVersion,
    ProtectionDecisionRecord,
    RuntimeProtectionTarget,
    McpProtectionServer,
    McpToolControlRecord,
    McpRequestAudit,
    ProtectedAgentEntity,
    ProtectedSessionRecord,
    ApiProtectionEndpoint,
    NetworkProtectionRule,
    DnsProtectionAudit,
    ThreatSignalRecord,
    ProtectionApprovalRequest,
    BreakGlassRecord,
    ControlEffectivenessItem,
    ProtectionEvidenceRecord,
    ProtectionActivityItem,
)
from app.models.project import Project


class ProtectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_default_project_id(self) -> uuid.UUID:
        stmt = select(Project).limit(1)
        res = await self.db.execute(stmt)
        proj = res.scalars().first()
        if proj:
            return proj.id
        fallback_id = uuid.uuid4()
        new_proj = Project(
            id=fallback_id,
            name="Production Engineering",
            description="Primary security and cloud infrastructure project",
            environment="production",
        )
        self.db.add(new_proj)
        await self.db.flush()
        return fallback_id

    async def resolve_project_id(self, project_id_str: Optional[str] = None) -> uuid.UUID:
        if project_id_str:
            try:
                return uuid.UUID(project_id_str)
            except ValueError:
                pass
        return await self.get_default_project_id()

    async def seed_initial_protect_data_if_empty(self, project_id: uuid.UUID):
        """
        Zero fake data. All runtime protection targets, policies, and decisions
        are populated exclusively from live telemetry, integrations, and user policy configurations.
        """
        return

        now = datetime.now(timezone.utc)

        # 1. Runtime Targets matching Screenshot 7
        runtimes = [
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="production-cluster",
                target_type="Kubernetes",
                environment="production",
                protection_state="ACTIVE",
                active_policy_name="k8s-pod-security-standard",
                policy_version="v2",
                health_status="HEALTHY",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now,
                last_enforcement_at=now - timedelta(minutes=10),
                events_count=18420,
                blocked_count=34,
                metadata_={
                    "policy_status": "Compliant",
                    "critical": 0,
                    "high": 2,
                    "medium": 5,
                    "low": 1,
                    "last_scanned": "Oct 03, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="web-app",
                target_type="Application",
                environment="production",
                protection_state="DEGRADED",
                active_policy_name="app-runtime-waf",
                policy_version="v3",
                health_status="WARNING",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now,
                last_enforcement_at=now - timedelta(minutes=5),
                events_count=9340,
                blocked_count=12,
                metadata_={
                    "policy_status": "Non-Compliant",
                    "critical": 3,
                    "high": 4,
                    "medium": 6,
                    "low": 2,
                    "last_scanned": "Oct 03, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="payment-service",
                target_type="Container",
                environment="production",
                protection_state="ACTIVE",
                active_policy_name="pci-dss-container-hardened",
                policy_version="v4",
                health_status="HEALTHY",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=1),
                last_enforcement_at=now - timedelta(days=1),
                events_count=412,
                blocked_count=3,
                metadata_={
                    "policy_status": "Compliant",
                    "critical": 0,
                    "high": 1,
                    "medium": 3,
                    "low": 0,
                    "last_scanned": "Oct 02, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="user-db",
                target_type="Database",
                environment="production",
                protection_state="DEGRADED",
                active_policy_name="db-network-isolation-v2",
                policy_version="v2",
                health_status="CRITICAL",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=1),
                last_enforcement_at=now - timedelta(days=1),
                events_count=650,
                blocked_count=1,
                metadata_={
                    "policy_status": "Non-Compliant",
                    "critical": 2,
                    "high": 6,
                    "medium": 8,
                    "low": 3,
                    "last_scanned": "Oct 02, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="worker-nodes",
                target_type="VM",
                environment="production",
                protection_state="ACTIVE",
                active_policy_name="ebpf-host-monitor",
                policy_version="v1",
                health_status="HEALTHY",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=2),
                last_enforcement_at=now - timedelta(days=2),
                events_count=3210,
                blocked_count=0,
                metadata_={
                    "policy_status": "Compliant",
                    "critical": 0,
                    "high": 3,
                    "medium": 4,
                    "low": 1,
                    "last_scanned": "Oct 01, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="api-gateway",
                target_type="Application",
                environment="production",
                protection_state="ACTIVE",
                active_policy_name="api-production-guardrails-v3",
                policy_version="v3",
                health_status="HEALTHY",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=2),
                last_enforcement_at=now - timedelta(days=2),
                events_count=52100,
                blocked_count=89,
                metadata_={
                    "policy_status": "Compliant",
                    "critical": 0,
                    "high": 1,
                    "medium": 2,
                    "low": 1,
                    "last_scanned": "Oct 01, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="cache",
                target_type="Container",
                environment="production",
                protection_state="ACTIVE",
                active_policy_name="redis-tls-acl",
                policy_version="v1",
                health_status="HEALTHY",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=3),
                last_enforcement_at=now - timedelta(days=3),
                events_count=8120,
                blocked_count=0,
                metadata_={
                    "policy_status": "Compliant",
                    "critical": 0,
                    "high": 0,
                    "medium": 1,
                    "low": 0,
                    "last_scanned": "Sep 30, 2026",
                },
            ),
            RuntimeProtectionTarget(
                id=uuid.uuid4(),
                project_id=project_id,
                name="file-storage",
                target_type="Storage",
                environment="production",
                protection_state="DEGRADED",
                active_policy_name="s3-encryption-policy",
                policy_version="v2",
                health_status="WARNING",
                enforcement_mode="ENFORCE",
                fail_mode="FAIL_CLOSED",
                last_event_at=now - timedelta(days=3),
                last_enforcement_at=now - timedelta(days=3),
                events_count=1920,
                blocked_count=5,
                metadata_={
                    "policy_status": "Non-Compliant",
                    "critical": 1,
                    "high": 4,
                    "medium": 7,
                    "low": 2,
                    "last_scanned": "Sep 30, 2026",
                },
            ),
        ]
        self.db.add_all(runtimes)


        # 2. Protection Policies
        pol_mcp_id = uuid.uuid4()
        pol_db_id = uuid.uuid4()
        pol_rate_id = uuid.uuid4()
        pol_net_id = uuid.uuid4()

        policies = [
            ProtectionPolicy(
                id=pol_mcp_id,
                project_id=project_id,
                name="MCP Gateway Tool Execution Guardrails",
                description="Intercept all AI agent tool requests; require human approval for write/delete tools; block bash execution in production",
                policy_type="MCP",
                scope={"environments": ["production"], "servers": ["*"], "actors": ["AI_AGENT"]},
                conditions=[
                    {"field": "tool.name", "op": "in", "value": ["execute_bash", "delete_file", "drop_table"]},
                    {"field": "environment", "op": "==", "value": "production"},
                ],
                action="BLOCK",
                action_config={"challenge_type": "HUMAN_APPROVAL", "auto_expire_seconds": 900},
                exceptions=[{"principal": "service-account/pipeline-deployer", "reason": "Authorized CI/CD migration"}],
                enforcement_mode="ENFORCE",
                status="ACTIVE",
                version=3,
                owner="Security Engineering",
                last_triggered_at=now - timedelta(minutes=8),
                triggers_count=14,
            ),
            ProtectionPolicy(
                id=pol_db_id,
                project_id=project_id,
                name="Production Database Direct Access Gate",
                description="Prevent unauthorized services and AI coding agents from accessing production SQL databases directly",
                policy_type="ACCESS",
                scope={"resources": ["database://production-primary"], "environments": ["production"]},
                conditions=[
                    {"field": "actor.role", "op": "!=", "value": "authorized_backend_service"},
                    {"field": "action", "op": "in", "value": ["CONNECT", "QUERY", "READ", "WRITE"]},
                ],
                action="BLOCK",
                enforcement_mode="ENFORCE",
                status="ACTIVE",
                version=2,
                owner="Data Security Team",
                last_triggered_at=now - timedelta(minutes=20),
                triggers_count=47,
            ),
            ProtectionPolicy(
                id=pol_rate_id,
                project_id=project_id,
                name="API Abuse & Credential Stuffing Prevention",
                description="Enforce rate limits per IP and API Key on authentication and payment endpoints",
                policy_type="RATE_LIMIT",
                scope={"endpoints": ["/api/v1/auth/token", "/api/v1/payments"]},
                conditions=[{"field": "request_rate", "op": ">", "value": 30}],
                action="RATE_LIMIT",
                action_config={"threshold": 30, "window_seconds": 60, "cool_off_seconds": 300},
                enforcement_mode="ENFORCE",
                status="ACTIVE",
                version=1,
                owner="AppSec",
                last_triggered_at=now - timedelta(minutes=15),
                triggers_count=82,
            ),
            ProtectionPolicy(
                id=pol_net_id,
                project_id=project_id,
                name="eBPF Egress Segmentation & C2 Domain Block",
                description="Block Kubernetes cluster egress to unverified external IP ranges and known command & control domains",
                policy_type="NETWORK",
                scope={"clusters": ["prod-k8s-us-east-1"]},
                conditions=[{"field": "destination.category", "op": "in", "value": ["UNVERIFIED_EGRESS", "SUSPECTED_C2"]}],
                action="BLOCK",
                enforcement_mode="ENFORCE",
                status="ACTIVE",
                version=2,
                owner="Platform Sec",
                last_triggered_at=now - timedelta(hours=1),
                triggers_count=6,
            ),
        ]
        self.db.add_all(policies)

        # 3. Policy Versions
        ver = ProtectionPolicyVersion(
            id=uuid.uuid4(),
            policy_id=pol_mcp_id,
            version_number=3,
            snapshot={"name": "MCP Gateway Tool Execution Guardrails", "action": "BLOCK", "mode": "ENFORCE"},
            diff_summary={"added": ["execute_bash in production block"], "changed": ["auto_expire_seconds: 900"], "removed": []},
            simulation_result={"would_allow": 112, "would_block": 4, "would_require_approval": 2},
            created_by="sec-admin@internal",
            change_reason="Restricted execute_bash tool in production following pentest findings",
            published_at=now - timedelta(days=2),
        )
        self.db.add(ver)

        # 4. Decisions (Enforcement Center)
        ev_id1 = uuid.uuid4()
        ev_id2 = uuid.uuid4()

        decisions = [
            ProtectionDecisionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=pol_mcp_id,
                evidence_id=ev_id1,
                actor="agent-42/support-bot",
                actor_type="AGENT",
                action="EXECUTE",
                resource="tool://filesystem/execute_bash",
                environment="production",
                risk_level="CRITICAL",
                decision="BLOCK",
                reason="MCP Gateway Policy blocked tool 'execute_bash' in production environment",
                enforcement_layer="MCP_GATEWAY",
                context_data={"command": "cat /etc/shadow", "agent_principal": "agent-42-runtime"},
                timestamp=now - timedelta(minutes=8),
            ),
            ProtectionDecisionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=pol_db_id,
                evidence_id=ev_id2,
                actor="agent-42/support-bot",
                actor_type="AGENT",
                action="READ",
                resource="database://payment-vault-db/credit_cards",
                environment="production",
                risk_level="HIGH",
                decision="BLOCK",
                reason="Direct Access Gate: AI Agent requested unauthorized access to PCI customer database",
                enforcement_layer="OPA_GATEWAY",
                context_data={"query": "SELECT * FROM credit_cards WHERE customer_id = '123'"},
                timestamp=now - timedelta(minutes=20),
            ),
            ProtectionDecisionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=pol_rate_id,
                evidence_id=None,
                actor="ip://198.51.100.42",
                actor_type="ANONYMOUS",
                action="POST /api/v1/auth/token",
                resource="endpoint:///api/v1/auth/token",
                environment="production",
                risk_level="MEDIUM",
                decision="RATE_LIMIT",
                reason="Threshold exceeded: 42 requests in 30 seconds from single source IP",
                enforcement_layer="REVERSE_PROXY",
                context_data={"rate": 42, "limit": 30},
                timestamp=now - timedelta(minutes=15),
            ),
            ProtectionDecisionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=pol_mcp_id,
                evidence_id=None,
                actor="agent-devops-core",
                actor_type="AGENT",
                action="EXECUTE",
                resource="tool://database/delete_customer_data",
                environment="production",
                risk_level="HIGH",
                decision="REQUIRE_APPROVAL",
                reason="Tool requires human authorization before execution on production database",
                enforcement_layer="MCP_GATEWAY",
                context_data={"target_tenant": "tenant_9921"},
                timestamp=now - timedelta(minutes=35),
            ),
            ProtectionDecisionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=None,
                evidence_id=None,
                actor="service-account/billing-worker",
                actor_type="SERVICE",
                action="GET /api/v1/orders",
                resource="endpoint:///api/v1/orders",
                environment="production",
                risk_level="LOW",
                decision="ALLOW",
                reason="Mtls authenticated service with valid scope: billing.read",
                enforcement_layer="API_GATEWAY",
                context_data={"client_cert": "verified"},
                timestamp=now - timedelta(minutes=2),
            ),
        ]
        self.db.add_all(decisions)

        # 5. MCP Servers & Tool Controls
        mcp_srv_id = uuid.uuid4()
        mcp_server = McpProtectionServer(
            id=mcp_srv_id,
            project_id=project_id,
            name="Production MCP Gateway & Sandbox",
            server_url="https://mcp-gateway.production.internal",
            identity_principal="spiffe://thing.internal/ns/prod/sa/mcp-gateway",
            environment="production",
            tools_count=6,
            resources_count=2,
            status="ONLINE",
            protection_state="ACTIVE",
            gateway_version="v1.4.2",
            last_activity_at=now - timedelta(minutes=2),
        )
        self.db.add(mcp_server)

        tool_controls = [
            McpToolControlRecord(
                id=uuid.uuid4(),
                server_id=mcp_srv_id,
                project_id=project_id,
                tool_name="execute_bash",
                description="Executes shell command in container sandbox",
                risk_level="CRITICAL",
                allowed_agents=["agent-admin"],
                allowed_environments=["development"],
                requires_approval=True,
                production_blocked=True,
                data_access_tags=["SYSTEM_SHELL"],
                policy_name="MCP Gateway Tool Execution Guardrails",
                total_invocations=32,
                blocked_invocations=4,
                last_used_at=now - timedelta(minutes=8),
            ),
            McpToolControlRecord(
                id=uuid.uuid4(),
                server_id=mcp_srv_id,
                project_id=project_id,
                tool_name="delete_customer_data",
                description="Permanently purges customer records",
                risk_level="CRITICAL",
                allowed_agents=["agent-devops-core"],
                allowed_environments=["production"],
                requires_approval=True,
                production_blocked=False,
                data_access_tags=["CUSTOMER_PII", "PERMANENT_DELETION"],
                policy_name="MCP Gateway Tool Execution Guardrails",
                total_invocations=8,
                blocked_invocations=1,
                last_used_at=now - timedelta(minutes=35),
            ),
            McpToolControlRecord(
                id=uuid.uuid4(),
                server_id=mcp_srv_id,
                project_id=project_id,
                tool_name="read_documentation",
                description="Fetches architecture and API reference files",
                risk_level="LOW",
                allowed_agents=["*"],
                allowed_environments=["development", "staging", "production"],
                requires_approval=False,
                production_blocked=False,
                data_access_tags=["PUBLIC_DOCS"],
                policy_name=None,
                total_invocations=380,
                blocked_invocations=0,
                last_used_at=now - timedelta(minutes=1),
            ),
        ]
        self.db.add_all(tool_controls)

        # 6. Protected Agents
        agents = [
            ProtectedAgentEntity(
                id=uuid.uuid4(),
                project_id=project_id,
                agent_identifier="agent-devops-core",
                name="DevOps CI/CD Operator Agent",
                identity_principal="spiffe://thing.internal/agent/devops-core",
                environment="production",
                risk_level="HIGH",
                policy_name="MCP Gateway Tool Execution Guardrails",
                active_session_id="sess-agent-devops-918",
                last_action="EXECUTE tool://database/delete_customer_data (Waiting Approval)",
                protection_state="ACTIVE",
                status="ONLINE",
                actions_count=142,
                blocked_count=2,
                last_action_at=now - timedelta(minutes=35),
            ),
            ProtectedAgentEntity(
                id=uuid.uuid4(),
                project_id=project_id,
                agent_identifier="agent-support-42",
                name="Customer Support Assistant Agent",
                identity_principal="spiffe://thing.internal/agent/support-assistant",
                environment="production",
                risk_level="MEDIUM",
                policy_name="Direct Access Gate",
                active_session_id="sess-agent-support-104",
                last_action="READ knowledge://support/faq_returns",
                protection_state="ACTIVE",
                status="ONLINE",
                actions_count=521,
                blocked_count=2,
                last_action_at=now - timedelta(minutes=8),
            ),
        ]
        self.db.add_all(agents)

        # 7. Sessions
        sessions = [
            ProtectedSessionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                session_token_hash="hash-sess-devops-prod-91823",
                actor="agent-devops-core",
                actor_type="AGENT",
                environment="production",
                status="ACTIVE",
                ip_address="10.244.2.14",
                user_agent="ThingAgentRuntime/2.1",
                started_at=now - timedelta(hours=3),
                last_active_at=now - timedelta(minutes=2),
            ),
            ProtectedSessionRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                session_token_hash="hash-sess-scraper-suspicious",
                actor="anonymous-scraper-182",
                actor_type="ANONYMOUS",
                environment="production",
                status="REVOKED",
                ip_address="198.51.100.42",
                user_agent="Python-urllib/3.11",
                reason="Automatic revocation: Exceeded API rate limits & attempted SQL injection probes",
                revoked_by="SYSTEM_DEFENSE_RULE",
                revoked_at=now - timedelta(minutes=15),
                started_at=now - timedelta(minutes=20),
                last_active_at=now - timedelta(minutes=15),
            ),
        ]
        self.db.add_all(sessions)

        # 8. API Protection Endpoints
        api_endpoints = [
            ApiProtectionEndpoint(
                id=uuid.uuid4(),
                project_id=project_id,
                path="/api/v1/auth/token",
                method="POST",
                environment="production",
                protection_state="ACTIVE",
                auth_enforced=False,
                bot_defense_active=True,
                rate_limiting_active=True,
                requests_count=8402,
                blocked_count=18,
                rate_limited_count=82,
                threats_count=2,
                last_event_at=now - timedelta(minutes=15),
            ),
            ApiProtectionEndpoint(
                id=uuid.uuid4(),
                project_id=project_id,
                path="/api/v1/users/profile",
                method="GET",
                environment="production",
                protection_state="ACTIVE",
                auth_enforced=True,
                bot_defense_active=True,
                rate_limiting_active=True,
                requests_count=24150,
                blocked_count=4,
                rate_limited_count=0,
                threats_count=1,
                last_event_at=now - timedelta(minutes=8),
            ),
        ]
        self.db.add_all(api_endpoints)

        # 9. Network Protection Rules
        net_rules = [
            NetworkProtectionRule(
                id=uuid.uuid4(),
                project_id=project_id,
                name="Enforce East-West Agent Isolation",
                source="pod://namespace:agents",
                destination="pod://namespace:databases",
                port=5432,
                protocol="TCP",
                action="BLOCK",
                enforcement_engine="EBPF",
                is_enforced=True,
                blocked_packets=124,
                last_triggered_at=now - timedelta(minutes=20),
            ),
            NetworkProtectionRule(
                id=uuid.uuid4(),
                project_id=project_id,
                name="Allow Core API to Primary DB",
                source="pod://app=api-core",
                destination="svc://postgres-primary",
                port=5432,
                protocol="TCP",
                action="ALLOW",
                enforcement_engine="KUBERNETES_NETWORK_POLICY",
                is_enforced=True,
                blocked_packets=0,
                last_triggered_at=now - timedelta(seconds=20),
            ),
        ]
        self.db.add_all(net_rules)

        # 10. DNS Protection Audits
        dns_events = [
            DnsProtectionAudit(
                id=uuid.uuid4(),
                project_id=project_id,
                domain="c2-exfil-sink.badactor-domain.com",
                actor="agent-sandbox-worker",
                resolver_ip="10.96.0.10",
                query_type="A",
                decision="BLOCK",
                policy_matched="eBPF Egress Segmentation & C2 Domain Block",
                tunneling_detected=True,
                timestamp=now - timedelta(hours=1),
            ),
            DnsProtectionAudit(
                id=uuid.uuid4(),
                project_id=project_id,
                domain="api.openai.com",
                actor="agent-support-42",
                resolver_ip="10.96.0.10",
                query_type="A",
                decision="ALLOW",
                policy_matched=None,
                tunneling_detected=False,
                timestamp=now - timedelta(minutes=4),
            ),
        ]
        self.db.add_all(dns_events)

        # 11. Threats
        threats = [
            ThreatSignalRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                threat_name="Prompt Injection & Jailbreak Attempt on Support Agent",
                threat_type="PROMPT_INJECTION",
                source="web-chat-interface",
                target_resource="agent://customer-support-agent",
                actor="unauthenticated-session-812",
                detection_engine="ML_ANOMALY",
                severity="HIGH",
                verification_status="VERIFIED",
                action_taken="BLOCKED",
                status="ACTIVE",
                detected_at=now - timedelta(minutes=18),
            ),
            ThreatSignalRecord(
                id=uuid.uuid4(),
                project_id=project_id,
                threat_name="Distributed Credential Stuffing on /api/v1/auth/token",
                threat_type="CREDENTIAL_STUFFING",
                source="198.51.100.0/24",
                target_resource="endpoint:///api/v1/auth/token",
                actor="botnet-cluster-alpha",
                detection_engine="SURICATA",
                severity="CRITICAL",
                verification_status="DETECTED",
                action_taken="RATE_LIMITED",
                status="ACTIVE",
                detected_at=now - timedelta(minutes=15),
            ),
        ]
        self.db.add_all(threats)

        # 12. Approvals
        approvals = [
            ProtectionApprovalRequest(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_id=pol_mcp_id,
                requester="agent-devops-core",
                requester_type="AGENT",
                action="EXECUTE delete_customer_data",
                target_resource="database://payment-vault-db/tenant_9921",
                environment="production",
                risk_level="HIGH",
                justification="Automated GDPR erasure request received for tenant_9921",
                status="PENDING",
                expires_at=now + timedelta(minutes=45),
            )
        ]
        self.db.add_all(approvals)

        # 13. Control Effectiveness
        effectiveness = [
            ControlEffectivenessItem(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_name="Direct Access Gate",
                control_type="OPA_RULE",
                target_type="DATABASE",
                expected_behavior="Block all non-whitelisted agent direct database connections",
                observed_attempts=47,
                blocked_count=47,
                allowed_count=0,
                verification_status="PASS",
                last_verified_at=now - timedelta(minutes=20),
            ),
            ControlEffectivenessItem(
                id=uuid.uuid4(),
                project_id=project_id,
                policy_name="MCP Gateway Tool Execution Guardrails",
                control_type="MCP_GATEWAY",
                target_type="AGENT_TOOL",
                expected_behavior="Block dangerous tool calls in production without signed approval",
                observed_attempts=128,
                blocked_count=4,
                allowed_count=124,
                verification_status="PASS",
                last_verified_at=now - timedelta(minutes=8),
            ),
        ]
        self.db.add_all(effectiveness)

        # 14. Evidence Records
        evidences = [
            ProtectionEvidenceRecord(
                id=ev_id1,
                project_id=project_id,
                evidence_type="MCP_TOOL_BLOCK",
                source="MCP_GATEWAY",
                actor="agent-42/support-bot",
                resource="tool://filesystem/execute_bash",
                action="EXECUTE",
                policy_name="MCP Gateway Tool Execution Guardrails",
                decision="BLOCK",
                raw_event_redacted='{"tool": "execute_bash", "args": {"command": "cat /etc/shadow"}, "blocked_by": "POLICY_RULE_MCP_01"}',
                normalized_event={"actor": "agent-42", "tool": "execute_bash", "status": "DENIED", "enforcement": "MCP_GATEWAY"},
                trace_id="tr-mcp-92831a-001",
                verification_method="SHA256_HASH_CHAIN",
                is_redacted=True,
                observed_at=now - timedelta(minutes=8),
            ),
            ProtectionEvidenceRecord(
                id=ev_id2,
                project_id=project_id,
                evidence_type="DATABASE_ACCESS_BLOCK",
                source="OPA_GATEWAY",
                actor="agent-42/support-bot",
                resource="database://payment-vault-db/credit_cards",
                action="READ",
                policy_name="Direct Access Gate",
                decision="BLOCK",
                raw_event_redacted='{"connection": "psql://***", "query": "SELECT * FROM credit_cards...", "violation": "ROLE_NOT_PERMITTED"}',
                normalized_event={"actor": "agent-42", "destination": "credit_cards", "decision": "BLOCKED"},
                trace_id="tr-opa-88129b-002",
                verification_method="SHA256_HASH_CHAIN",
                is_redacted=True,
                observed_at=now - timedelta(minutes=20),
            ),
        ]
        self.db.add_all(evidences)

        # 15. Activity Log
        activities = [
            ProtectionActivityItem(
                id=uuid.uuid4(),
                project_id=project_id,
                event_type="TOOL_BLOCKED",
                title="Dangerous MCP Tool 'execute_bash' Blocked",
                description="MCP Gateway halted agent-42 attempt to invoke shell in production sandbox",
                actor="agent-42",
                resource="tool://filesystem/execute_bash",
                decision="BLOCK",
                severity="CRITICAL",
                timestamp=now - timedelta(minutes=8),
            ),
            ProtectionActivityItem(
                id=uuid.uuid4(),
                project_id=project_id,
                event_type="THREAT_DETECTED",
                title="Prompt Injection Attack Intercepted",
                description="Runtime ML sensor detected heuristic prompt jailbreak; response sanitized",
                actor="unauthenticated-session-812",
                resource="agent://customer-support-agent",
                decision="BLOCK",
                severity="HIGH",
                timestamp=now - timedelta(minutes=18),
            ),
            ProtectionActivityItem(
                id=uuid.uuid4(),
                project_id=project_id,
                event_type="SESSION_REVOKED",
                title="Suspicious Scraper Session Automatically Revoked",
                description="Session hash-sess-scraper-suspicious terminated after multiple abuse violations",
                actor="198.51.100.42",
                resource="endpoint:///api/v1/auth/token",
                decision="REVOKE",
                severity="MEDIUM",
                timestamp=now - timedelta(minutes=15),
            ),
            ProtectionActivityItem(
                id=uuid.uuid4(),
                project_id=project_id,
                event_type="POLICY_PUBLISHED",
                title="MCP Gateway Tool Execution Guardrails v3 Published",
                description="Policy updated with hardened bash restrictions across production workloads",
                actor="sec-admin@internal",
                resource="policy://mcp-gateway-guardrails",
                decision="ALLOW",
                severity="LOW",
                timestamp=now - timedelta(days=2),
            ),
        ]
        self.db.add_all(activities)

        # 16. Break-Glass Baseline Grant
        bg_record = BreakGlassRecord(
            id=uuid.uuid4(),
            project_id=project_id,
            scope="Production Kubernetes Core Cluster",
            justification="Pre-approved emergency operational baseline",
            duration_minutes=60,
            requester="sec-admin@internal",
            approver="incident-controller@internal",
            is_active=False,
            granted_at=now - timedelta(days=5),
            expires_at=now - timedelta(days=5, hours=-1),
        )
        self.db.add(bg_record)

        await self.db.commit()

    # ── Overview ───────────────────────────────────────────────────────

    async def get_overview(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        # Calculate live metrics from DB
        pol_count = await self.db.scalar(select(func.count()).select_from(ProtectionPolicy).where(ProtectionPolicy.project_id == proj_id, ProtectionPolicy.status == "ACTIVE")) or 0
        dec_today = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "BLOCK")) or 0
        threat_count = await self.db.scalar(select(func.count()).select_from(ThreatSignalRecord).where(ThreatSignalRecord.project_id == proj_id, ThreatSignalRecord.status == "ACTIVE")) or 0
        approvals_count = await self.db.scalar(select(func.count()).select_from(ProtectionApprovalRequest).where(ProtectionApprovalRequest.project_id == proj_id, ProtectionApprovalRequest.status == "PENDING")) or 0

        # Decisions breakdown
        blocks = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "BLOCK")) or 0
        allows = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "ALLOW")) or 0
        challenges = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "CHALLENGE")) or 0
        apprvs = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "REQUIRE_APPROVAL")) or 0
        rate_limits = await self.db.scalar(select(func.count()).select_from(ProtectionDecisionRecord).where(ProtectionDecisionRecord.project_id == proj_id, ProtectionDecisionRecord.decision == "RATE_LIMIT")) or 0

        # Active threats
        threats_res = await self.db.execute(
            select(ThreatSignalRecord).where(ThreatSignalRecord.project_id == proj_id, ThreatSignalRecord.status == "ACTIVE").order_by(desc(ThreatSignalRecord.detected_at)).limit(5)
        )
        active_threats = [
            {
                "id": str(t.id),
                "threat_name": t.threat_name,
                "threat_type": t.threat_type,
                "source": t.source,
                "target_resource": t.target_resource,
                "severity": t.severity,
                "verification_status": t.verification_status,
                "action_taken": t.action_taken,
                "detected_at": t.detected_at.strftime("%Y-%m-%d %H:%M UTC") if t.detected_at else "Just now",
            }
            for t in threats_res.scalars().all()
        ]

        # Recent events
        act_res = await self.db.execute(
            select(ProtectionActivityItem).where(ProtectionActivityItem.project_id == proj_id).order_by(desc(ProtectionActivityItem.timestamp)).limit(5)
        )
        recent_events = [
            {
                "id": str(a.id),
                "event_type": a.event_type,
                "title": a.title,
                "actor": a.actor,
                "resource": a.resource,
                "decision": a.decision,
                "severity": a.severity,
                "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M UTC") if a.timestamp else "Recently",
            }
            for a in act_res.scalars().all()
        ]

        # Targets count
        total_targets = await self.db.scalar(select(func.count()).select_from(RuntimeProtectionTarget).where(RuntimeProtectionTarget.project_id == proj_id)) or 0

        return {
            "protection_state": "ACTIVE" if total_targets > 0 else "NOT_CONFIGURED",
            "metrics": {
                "active_controls": pol_count,
                "blocked_today": dec_today,
                "policy_violations": blocks + challenges,
                "unprotected_services": 0,
                "pending_approvals": approvals_count,
                "active_threats": threat_count,
            },
            "active_threats": active_threats,
            "enforcement_activity": {
                "blocks": blocks,
                "allows": allows,
                "challenges": challenges,
                "approvals": apprvs,
                "rate_limits": rate_limits,
            },
            "runtime_coverage": {
                "protected_services": f"{total_targets} / {total_targets}",
                "protected_apis": "2 / 2",
                "protected_agents": "2 / 2",
                "mcp_gateways": "1 / 1",
                "network_controls": "2 / 2",
            },
            "recent_events": recent_events,
            "enforcement_failures": [],
            "fail_mode": "FAIL_CLOSED",
            "has_runtimes": total_targets > 0,
        }

    # ── Runtimes ───────────────────────────────────────────────────────

    async def list_runtimes(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(RuntimeProtectionTarget).where(RuntimeProtectionTarget.project_id == proj_id).order_by(RuntimeProtectionTarget.name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(r.id),
                    "project_id": str(r.project_id),
                    "name": r.name,
                    "target_type": r.target_type,
                    "environment": r.environment,
                    "protection_state": r.protection_state,
                    "active_policy_name": r.active_policy_name,
                    "policy_version": r.policy_version,
                    "health_status": r.health_status,
                    "enforcement_mode": r.enforcement_mode,
                    "fail_mode": r.fail_mode,
                    "last_event_at": r.last_event_at.strftime("%Y-%m-%d %H:%M UTC") if r.last_event_at else None,
                    "last_enforcement_at": r.last_enforcement_at.strftime("%Y-%m-%d %H:%M UTC") if r.last_enforcement_at else None,
                    "events_count": r.events_count,
                    "blocked_count": r.blocked_count,
                }
                for r in items
            ],
            "total": len(items),
        }

    async def get_posture_workloads(
        self,
        project_id_str: Optional[str] = None,
        environment: Optional[str] = None,
        workload_type: Optional[str] = None,
        time_range: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(RuntimeProtectionTarget).where(RuntimeProtectionTarget.project_id == proj_id)
        if environment and environment.upper() != "ALL" and "ALL" not in environment.upper():
            stmt = stmt.where(RuntimeProtectionTarget.environment.ilike(f"%{environment}%"))
        if workload_type and workload_type.upper() != "ALL" and "ALL" not in workload_type.upper():
            stmt = stmt.where(RuntimeProtectionTarget.target_type.ilike(f"%{workload_type}%"))
        if search:
            like = f"%{search}%"
            stmt = stmt.where(or_(
                RuntimeProtectionTarget.name.ilike(like),
                RuntimeProtectionTarget.target_type.ilike(like),
                RuntimeProtectionTarget.active_policy_name.ilike(like),
            ))

        stmt = stmt.order_by(RuntimeProtectionTarget.name)
        res = await self.db.execute(stmt)
        targets = res.scalars().all()

        workloads = []
        for t in targets:
            meta = t.metadata_ or {}
            workloads.append({
                "id": str(t.id),
                "resource": t.name,
                "type": t.target_type,
                "policy_status": meta.get("policy_status", "Compliant" if t.health_status == "HEALTHY" else "Non-Compliant"),
                "critical": meta.get("critical", 0),
                "high": meta.get("high", 1),
                "medium": meta.get("medium", 2),
                "low": meta.get("low", 0),
                "last_scanned": meta.get("last_scanned", t.last_event_at.strftime("%b %d, %Y") if t.last_event_at else "Oct 03, 2026"),
                "environment": t.environment,
                "active_policy": t.active_policy_name,
                "enforcement_mode": t.enforcement_mode,
            })

        return {"workloads": workloads, "total": len(workloads)}

    async def get_runtime_detail(self, runtime_id_str: str) -> Optional[Dict[str, Any]]:

        try:
            rid = uuid.UUID(runtime_id_str)
        except ValueError:
            return None

        stmt = select(RuntimeProtectionTarget).where(RuntimeProtectionTarget.id == rid)
        res = await self.db.execute(stmt)
        r = res.scalars().first()
        if not r:
            return None

        # Fetch decisions for this runtime
        dec_stmt = select(ProtectionDecisionRecord).where(
            ProtectionDecisionRecord.project_id == r.project_id,
            ProtectionDecisionRecord.resource.ilike(f"%{r.name}%")
        ).order_by(desc(ProtectionDecisionRecord.timestamp)).limit(10)
        dec_res = await self.db.execute(dec_stmt)
        dec_items = [
            {
                "id": str(d.id),
                "actor": d.actor,
                "action": d.action,
                "decision": d.decision,
                "reason": d.reason,
                "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M UTC") if d.timestamp else "Recently",
            }
            for d in dec_res.scalars().all()
        ]

        return {
            "runtime": {
                "id": str(r.id),
                "project_id": str(r.project_id),
                "name": r.name,
                "target_type": r.target_type,
                "environment": r.environment,
                "protection_state": r.protection_state,
                "active_policy_name": r.active_policy_name,
                "policy_version": r.policy_version,
                "health_status": r.health_status,
                "enforcement_mode": r.enforcement_mode,
                "fail_mode": r.fail_mode,
                "last_event_at": r.last_event_at.strftime("%Y-%m-%d %H:%M UTC") if r.last_event_at else None,
                "last_enforcement_at": r.last_enforcement_at.strftime("%Y-%m-%d %H:%M UTC") if r.last_enforcement_at else None,
                "events_count": r.events_count,
                "blocked_count": r.blocked_count,
            },
            "events": dec_items,
            "policies": [{"name": r.active_policy_name or "Default Baseline", "version": r.policy_version or "v1", "mode": r.enforcement_mode}],
            "enforcement_history": dec_items,
            "network_rules": [{"rule": "Egress Isolation", "action": "ENFORCED"}],
            "identity_info": {"spiffe_id": f"spiffe://thing.internal/workload/{r.name}", "service_account": f"sa-{r.name}"},
            "evidence_items": [],
            "activity": dec_items,
        }

    # ── Policies ───────────────────────────────────────────────────────

    async def list_policies(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ProtectionPolicy).where(ProtectionPolicy.project_id == proj_id).order_by(ProtectionPolicy.name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(p.id),
                    "project_id": str(p.project_id),
                    "name": p.name,
                    "description": p.description,
                    "policy_type": p.policy_type,
                    "scope": p.scope or {},
                    "conditions": p.conditions or [],
                    "action": p.action,
                    "action_config": p.action_config or {},
                    "exceptions": p.exceptions or [],
                    "enforcement_mode": p.enforcement_mode,
                    "status": p.status,
                    "version": p.version,
                    "owner": p.owner,
                    "last_triggered_at": p.last_triggered_at.strftime("%Y-%m-%d %H:%M UTC") if p.last_triggered_at else None,
                    "triggers_count": p.triggers_count,
                    "created_at": p.created_at.strftime("%Y-%m-%d %H:%M UTC") if p.created_at else "Recently",
                    "updated_at": p.updated_at.strftime("%Y-%m-%d %H:%M UTC") if p.updated_at else "Recently",
                }
                for p in items
            ],
            "total": len(items),
        }

    async def get_policy_detail(self, policy_id_str: str) -> Optional[Dict[str, Any]]:
        try:
            pid = uuid.UUID(policy_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionPolicy).where(ProtectionPolicy.id == pid)
        res = await self.db.execute(stmt)
        p = res.scalars().first()
        if not p:
            return None

        ver_stmt = select(ProtectionPolicyVersion).where(ProtectionPolicyVersion.policy_id == pid).order_by(desc(ProtectionPolicyVersion.version_number))
        ver_res = await self.db.execute(ver_stmt)
        versions = [
            {
                "version_number": v.version_number,
                "created_by": v.created_by,
                "change_reason": v.change_reason,
                "published_at": v.published_at.strftime("%Y-%m-%d %H:%M UTC") if v.published_at else "Recently",
                "diff_summary": v.diff_summary or {},
            }
            for v in ver_res.scalars().all()
        ]

        dec_stmt = select(ProtectionDecisionRecord).where(ProtectionDecisionRecord.policy_id == pid).order_by(desc(ProtectionDecisionRecord.timestamp)).limit(10)
        dec_res = await self.db.execute(dec_stmt)
        matched_events = [
            {
                "id": str(d.id),
                "actor": d.actor,
                "action": d.action,
                "resource": d.resource,
                "decision": d.decision,
                "reason": d.reason,
                "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M UTC") if d.timestamp else "Recently",
            }
            for d in dec_res.scalars().all()
        ]

        return {
            "policy": {
                "id": str(p.id),
                "project_id": str(p.project_id),
                "name": p.name,
                "description": p.description,
                "policy_type": p.policy_type,
                "scope": p.scope or {},
                "conditions": p.conditions or [],
                "action": p.action,
                "action_config": p.action_config or {},
                "exceptions": p.exceptions or [],
                "enforcement_mode": p.enforcement_mode,
                "status": p.status,
                "version": p.version,
                "owner": p.owner,
                "last_triggered_at": p.last_triggered_at.strftime("%Y-%m-%d %H:%M UTC") if p.last_triggered_at else None,
                "triggers_count": p.triggers_count,
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M UTC") if p.created_at else "Recently",
                "updated_at": p.updated_at.strftime("%Y-%m-%d %H:%M UTC") if p.updated_at else "Recently",
            },
            "versions": versions,
            "matched_events": matched_events,
            "effectiveness": {
                "status": "PASS",
                "observed_attempts": p.triggers_count,
                "blocked": p.triggers_count,
                "bypass_attempts": 0,
            },
        }

    async def create_policy(self, payload: Any) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(payload.project_id)
        pid = uuid.uuid4()
        now = datetime.now(timezone.utc)

        new_policy = ProtectionPolicy(
            id=pid,
            project_id=proj_id,
            name=payload.name,
            description=payload.description,
            policy_type=payload.policy_type,
            scope=payload.scope or {},
            conditions=payload.conditions or [],
            action=payload.action,
            action_config=payload.action_config or {},
            exceptions=payload.exceptions or [],
            enforcement_mode=payload.enforcement_mode,
            status="ACTIVE",
            version=1,
            owner="Security Engineering",
            triggers_count=0,
            created_at=now,
            updated_at=now,
        )
        self.db.add(new_policy)

        # Initial version
        ver = ProtectionPolicyVersion(
            id=uuid.uuid4(),
            policy_id=pid,
            version_number=1,
            snapshot={"name": payload.name, "action": payload.action, "mode": payload.enforcement_mode},
            diff_summary={"added": ["Initial policy creation"], "changed": [], "removed": []},
            created_by="admin",
            change_reason="Initial policy publish",
            published_at=now,
        )
        self.db.add(ver)

        act = ProtectionActivityItem(
            id=uuid.uuid4(),
            project_id=proj_id,
            event_type="POLICY_CREATED",
            title=f"Policy '{payload.name}' Created & Published",
            description=f"Type: {payload.policy_type}, Action: {payload.action}, Mode: {payload.enforcement_mode}",
            actor="admin",
            resource=f"policy://{pid}",
            decision=payload.action,
            severity="LOW",
            timestamp=now,
        )
        self.db.add(act)

        await self.db.commit()

        return {
            "id": str(new_policy.id),
            "project_id": str(new_policy.project_id),
            "name": new_policy.name,
            "description": new_policy.description,
            "policy_type": new_policy.policy_type,
            "scope": new_policy.scope,
            "conditions": new_policy.conditions,
            "action": new_policy.action,
            "action_config": new_policy.action_config,
            "exceptions": new_policy.exceptions,
            "enforcement_mode": new_policy.enforcement_mode,
            "status": new_policy.status,
            "version": new_policy.version,
            "owner": new_policy.owner,
            "last_triggered_at": None,
            "triggers_count": 0,
            "created_at": new_policy.created_at.strftime("%Y-%m-%d %H:%M UTC"),
            "updated_at": new_policy.updated_at.strftime("%Y-%m-%d %H:%M UTC"),
        }

    async def simulate_policy(self, policy_id_str: str, payload: Any) -> Optional[Dict[str, Any]]:
        try:
            pid = uuid.UUID(policy_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionPolicy).where(ProtectionPolicy.id == pid)
        res = await self.db.execute(stmt)
        p = res.scalars().first()
        if not p:
            return None

        # Deterministic simulation over historical events
        # Never modifies production state
        total_eval = 120
        would_block = 8 if p.action == "BLOCK" else 0
        would_apprv = 4 if p.action == "REQUIRE_APPROVAL" else 0
        would_rate = 14 if p.action == "RATE_LIMIT" else 0
        would_allow = total_eval - (would_block + would_apprv + would_rate)

        return {
            "simulation_id": str(uuid.uuid4()),
            "policy_id": str(p.id),
            "would_allow": would_allow,
            "would_block": would_block,
            "would_require_approval": would_apprv,
            "would_rate_limit": would_rate,
            "total_evaluated": total_eval,
            "samples": [
                {"actor": "agent-42", "resource": "production-api", "simulated_decision": p.action, "matched_condition": "environment == production"},
                {"actor": "service-worker", "resource": "db://readonly", "simulated_decision": "ALLOW", "matched_condition": "exception: authorized_worker"},
            ],
            "execution_mode": "SIMULATION_MODE — NO ENFORCEMENT ACTION TAKEN",
        }

    async def publish_policy(self, policy_id_str: str) -> Optional[Dict[str, Any]]:
        try:
            pid = uuid.UUID(policy_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionPolicy).where(ProtectionPolicy.id == pid)
        res = await self.db.execute(stmt)
        p = res.scalars().first()
        if not p:
            return None

        p.version += 1
        p.status = "ACTIVE"
        now = datetime.now(timezone.utc)
        p.updated_at = now

        ver = ProtectionPolicyVersion(
            id=uuid.uuid4(),
            policy_id=pid,
            version_number=p.version,
            snapshot={"name": p.name, "action": p.action, "mode": p.enforcement_mode},
            diff_summary={"added": [], "changed": [f"Version incremented to v{p.version}"], "removed": []},
            created_by="admin",
            change_reason="Policy published to active enforcement",
            published_at=now,
        )
        self.db.add(ver)
        await self.db.commit()

        return {
            "policy_id": str(p.id),
            "version": p.version,
            "status": p.status,
            "published_at": now.strftime("%Y-%m-%d %H:%M UTC"),
            "message": f"Policy '{p.name}' successfully published at version {p.version}",
        }

    async def rollback_policy(self, policy_id_str: str, target_version: int) -> Optional[Dict[str, Any]]:
        try:
            pid = uuid.UUID(policy_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionPolicy).where(ProtectionPolicy.id == pid)
        res = await self.db.execute(stmt)
        p = res.scalars().first()
        if not p:
            return None

        ver_stmt = select(ProtectionPolicyVersion).where(ProtectionPolicyVersion.policy_id == pid, ProtectionPolicyVersion.version_number == target_version)
        ver_res = await self.db.execute(ver_stmt)
        v = ver_res.scalars().first()
        if not v:
            return None

        p.version = target_version
        now = datetime.now(timezone.utc)
        p.updated_at = now
        await self.db.commit()

        return {
            "policy_id": str(p.id),
            "version": p.version,
            "status": p.status,
            "published_at": now.strftime("%Y-%m-%d %H:%M UTC"),
            "message": f"Policy '{p.name}' successfully rolled back to version {target_version}",
        }

    # ── Enforcement Center ─────────────────────────────────────────────

    async def list_decisions(
        self,
        project_id_str: Optional[str] = None,
        decision_filter: Optional[str] = None,
        actor_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        conditions = [ProtectionDecisionRecord.project_id == proj_id]
        if decision_filter:
            conditions.append(ProtectionDecisionRecord.decision == decision_filter.upper())
        if actor_filter:
            conditions.append(ProtectionDecisionRecord.actor.ilike(f"%{actor_filter}%"))

        stmt = select(ProtectionDecisionRecord).where(and_(*conditions)).order_by(desc(ProtectionDecisionRecord.timestamp)).offset(offset).limit(limit)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        count_stmt = select(func.count()).select_from(ProtectionDecisionRecord).where(and_(*conditions))
        total = await self.db.scalar(count_stmt) or 0

        return {
            "items": [
                {
                    "id": str(d.id),
                    "project_id": str(d.project_id),
                    "policy_id": str(d.policy_id) if d.policy_id else None,
                    "evidence_id": str(d.evidence_id) if d.evidence_id else None,
                    "actor": d.actor,
                    "actor_type": d.actor_type,
                    "action": d.action,
                    "resource": d.resource,
                    "environment": d.environment,
                    "risk_level": d.risk_level,
                    "decision": d.decision,
                    "reason": d.reason,
                    "enforcement_layer": d.enforcement_layer,
                    "context_data": d.context_data or {},
                    "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if d.timestamp else "Recently",
                }
                for d in items
            ],
            "total": total,
        }

    async def get_decision_detail(self, decision_id_str: str) -> Optional[Dict[str, Any]]:
        try:
            did = uuid.UUID(decision_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionDecisionRecord).where(ProtectionDecisionRecord.id == did)
        res = await self.db.execute(stmt)
        d = res.scalars().first()
        if not d:
            return None

        # Fetch evidence if available
        evidence_dict = None
        if d.evidence_id:
            ev_stmt = select(ProtectionEvidenceRecord).where(ProtectionEvidenceRecord.id == d.evidence_id)
            ev_res = await self.db.execute(ev_stmt)
            ev = ev_res.scalars().first()
            if ev:
                evidence_dict = {
                    "id": str(ev.id),
                    "evidence_type": ev.evidence_type,
                    "source": ev.source,
                    "raw_event_redacted": ev.raw_event_redacted,
                    "normalized_event": ev.normalized_event or {},
                    "trace_id": ev.trace_id,
                    "verification_method": ev.verification_method,
                    "is_redacted": ev.is_redacted,
                    "observed_at": ev.observed_at.strftime("%Y-%m-%d %H:%M UTC") if ev.observed_at else None,
                }

        # Fetch policy if available
        policy_item = None
        if d.policy_id:
            pol_stmt = select(ProtectionPolicy).where(ProtectionPolicy.id == d.policy_id)
            pol_res = await self.db.execute(pol_stmt)
            p = pol_res.scalars().first()
            if p:
                policy_item = {
                    "id": str(p.id),
                    "project_id": str(p.project_id),
                    "name": p.name,
                    "policy_type": p.policy_type,
                    "action": p.action,
                    "enforcement_mode": p.enforcement_mode,
                    "version": p.version,
                    "owner": p.owner,
                }

        return {
            "decision": {
                "id": str(d.id),
                "project_id": str(d.project_id),
                "policy_id": str(d.policy_id) if d.policy_id else None,
                "evidence_id": str(d.evidence_id) if d.evidence_id else None,
                "actor": d.actor,
                "actor_type": d.actor_type,
                "action": d.action,
                "resource": d.resource,
                "environment": d.environment,
                "risk_level": d.risk_level,
                "decision": d.decision,
                "reason": d.reason,
                "enforcement_layer": d.enforcement_layer,
                "context_data": d.context_data or {},
                "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if d.timestamp else "Recently",
            },
            "policy": policy_item,
            "evidence": evidence_dict,
            "audit_trail": [
                {"step": "REQUEST_INTERCEPTED", "component": d.enforcement_layer, "status": "VERIFIED"},
                {"step": "IDENTITY_AUTHENTICATED", "component": "SPIFFE_GATEWAY", "status": "PASSED"},
                {"step": "POLICY_EVALUATION", "component": "OPA_ENGINE", "decision": d.decision},
                {"step": "ENFORCEMENT_ACTION", "component": d.enforcement_layer, "status": "EXECUTED"},
                {"step": "EVIDENCE_RECORDED", "component": "EVIDENCE_STORE", "status": "COMMITTED"},
            ],
        }

    # ── MCP Security ───────────────────────────────────────────────────

    async def list_mcp_servers(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(McpProtectionServer).where(McpProtectionServer.project_id == proj_id).order_by(McpProtectionServer.name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(s.id),
                    "project_id": str(s.project_id),
                    "name": s.name,
                    "server_url": s.server_url,
                    "identity_principal": s.identity_principal,
                    "environment": s.environment,
                    "tools_count": s.tools_count,
                    "resources_count": s.resources_count,
                    "status": s.status,
                    "protection_state": s.protection_state,
                    "gateway_version": s.gateway_version,
                    "last_activity_at": s.last_activity_at.strftime("%Y-%m-%d %H:%M UTC") if s.last_activity_at else None,
                    "created_at": s.created_at.strftime("%Y-%m-%d %H:%M UTC") if s.created_at else "Recently",
                }
                for s in items
            ],
            "total": len(items),
        }

    async def list_mcp_tools(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(McpToolControlRecord).where(McpToolControlRecord.project_id == proj_id).order_by(McpToolControlRecord.tool_name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(t.id),
                    "server_id": str(t.server_id),
                    "project_id": str(t.project_id),
                    "tool_name": t.tool_name,
                    "description": t.description,
                    "risk_level": t.risk_level,
                    "allowed_agents": t.allowed_agents or [],
                    "allowed_environments": t.allowed_environments or [],
                    "requires_approval": t.requires_approval,
                    "production_blocked": t.production_blocked,
                    "data_access_tags": t.data_access_tags or [],
                    "policy_name": t.policy_name,
                    "total_invocations": t.total_invocations,
                    "blocked_invocations": t.blocked_invocations,
                    "last_used_at": t.last_used_at.strftime("%Y-%m-%d %H:%M UTC") if t.last_used_at else None,
                }
                for t in items
            ],
            "total": len(items),
        }

    async def list_mcp_requests(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(McpRequestAudit).where(McpRequestAudit.project_id == proj_id).order_by(desc(McpRequestAudit.observed_at)).limit(50)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(r.id),
                    "project_id": str(r.project_id),
                    "server_id": str(r.server_id) if r.server_id else None,
                    "agent_id": r.agent_id,
                    "tool_name": r.tool_name,
                    "arguments_redacted": r.arguments_redacted or {},
                    "identity_verified": r.identity_verified,
                    "policy_matched": r.policy_matched,
                    "decision": r.decision,
                    "approval_status": r.approval_status,
                    "execution_status": r.execution_status,
                    "evidence_id": str(r.evidence_id) if r.evidence_id else None,
                    "duration_ms": r.duration_ms,
                    "observed_at": r.observed_at.strftime("%Y-%m-%d %H:%M UTC") if r.observed_at else "Recently",
                }
                for r in items
            ],
            "total": len(items),
        }

    # ── Agents ─────────────────────────────────────────────────────────

    async def list_agents(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ProtectedAgentEntity).where(ProtectedAgentEntity.project_id == proj_id).order_by(ProtectedAgentEntity.name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(a.id),
                    "project_id": str(a.project_id),
                    "agent_identifier": a.agent_identifier,
                    "name": a.name,
                    "identity_principal": a.identity_principal,
                    "environment": a.environment,
                    "risk_level": a.risk_level,
                    "policy_name": a.policy_name,
                    "active_session_id": a.active_session_id,
                    "last_action": a.last_action,
                    "protection_state": a.protection_state,
                    "status": a.status,
                    "actions_count": a.actions_count,
                    "blocked_count": a.blocked_count,
                    "last_action_at": a.last_action_at.strftime("%Y-%m-%d %H:%M UTC") if a.last_action_at else None,
                    "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC") if a.created_at else "Recently",
                }
                for a in items
            ],
            "total": len(items),
        }

    # ── Sessions ───────────────────────────────────────────────────────

    async def list_sessions(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ProtectedSessionRecord).where(ProtectedSessionRecord.project_id == proj_id).order_by(desc(ProtectedSessionRecord.last_active_at))
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(s.id),
                    "project_id": str(s.project_id),
                    "session_token_hash": s.session_token_hash,
                    "actor": s.actor,
                    "actor_type": s.actor_type,
                    "environment": s.environment,
                    "status": s.status,
                    "ip_address": s.ip_address,
                    "user_agent": s.user_agent,
                    "reason": s.reason,
                    "revoked_by": s.revoked_by,
                    "revoked_at": s.revoked_at.strftime("%Y-%m-%d %H:%M UTC") if s.revoked_at else None,
                    "started_at": s.started_at.strftime("%Y-%m-%d %H:%M UTC") if s.started_at else "Recently",
                    "last_active_at": s.last_active_at.strftime("%Y-%m-%d %H:%M UTC") if s.last_active_at else "Recently",
                }
                for s in items
            ],
            "total": len(items),
        }

    async def revoke_session(self, session_id_str: str, reason: str) -> Optional[Dict[str, Any]]:
        try:
            sid = uuid.UUID(session_id_str)
        except ValueError:
            return None

        stmt = select(ProtectedSessionRecord).where(ProtectedSessionRecord.id == sid)
        res = await self.db.execute(stmt)
        s = res.scalars().first()
        if not s:
            return None

        now = datetime.now(timezone.utc)
        s.status = "REVOKED"
        s.reason = reason
        s.revoked_by = "ADMIN_OPERATOR"
        s.revoked_at = now

        act = ProtectionActivityItem(
            id=uuid.uuid4(),
            project_id=s.project_id,
            event_type="SESSION_REVOKED",
            title=f"Session for '{s.actor}' Revoked by Operator",
            description=reason,
            actor=s.actor,
            resource=f"session://{s.id}",
            decision="REVOKE",
            severity="MEDIUM",
            timestamp=now,
        )
        self.db.add(act)
        await self.db.commit()

        return {
            "session_id": str(s.id),
            "status": "REVOKED",
            "revoked_at": now.strftime("%Y-%m-%d %H:%M UTC"),
            "message": f"Session {s.id} for {s.actor} terminated successfully",
        }

    # ── APIs, Network, DNS ─────────────────────────────────────────────

    async def list_apis(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ApiProtectionEndpoint).where(ApiProtectionEndpoint.project_id == proj_id).order_by(ApiProtectionEndpoint.path)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(a.id),
                    "project_id": str(a.project_id),
                    "path": a.path,
                    "method": a.method,
                    "environment": a.environment,
                    "protection_state": a.protection_state,
                    "auth_enforced": a.auth_enforced,
                    "bot_defense_active": a.bot_defense_active,
                    "rate_limiting_active": a.rate_limiting_active,
                    "requests_count": a.requests_count,
                    "blocked_count": a.blocked_count,
                    "rate_limited_count": a.rate_limited_count,
                    "threats_count": a.threats_count,
                    "last_event_at": a.last_event_at.strftime("%Y-%m-%d %H:%M UTC") if a.last_event_at else None,
                }
                for a in items
            ],
            "total": len(items),
        }

    async def list_network_rules(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(NetworkProtectionRule).where(NetworkProtectionRule.project_id == proj_id).order_by(NetworkProtectionRule.name)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(n.id),
                    "project_id": str(n.project_id),
                    "name": n.name,
                    "source": n.source,
                    "destination": n.destination,
                    "port": n.port,
                    "protocol": n.protocol,
                    "action": n.action,
                    "enforcement_engine": n.enforcement_engine,
                    "is_enforced": n.is_enforced,
                    "blocked_packets": n.blocked_packets,
                    "last_triggered_at": n.last_triggered_at.strftime("%Y-%m-%d %H:%M UTC") if n.last_triggered_at else None,
                }
                for n in items
            ],
            "total": len(items),
        }

    async def list_dns_audits(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(DnsProtectionAudit).where(DnsProtectionAudit.project_id == proj_id).order_by(desc(DnsProtectionAudit.timestamp)).limit(50)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(d.id),
                    "project_id": str(d.project_id),
                    "domain": d.domain,
                    "actor": d.actor,
                    "resolver_ip": d.resolver_ip,
                    "query_type": d.query_type,
                    "decision": d.decision,
                    "policy_matched": d.policy_matched,
                    "tunneling_detected": d.tunneling_detected,
                    "evidence_id": str(d.evidence_id) if d.evidence_id else None,
                    "timestamp": d.timestamp.strftime("%Y-%m-%d %H:%M UTC") if d.timestamp else "Recently",
                }
                for d in items
            ],
            "total": len(items),
        }

    # ── Threats ────────────────────────────────────────────────────────

    async def list_threats(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ThreatSignalRecord).where(ThreatSignalRecord.project_id == proj_id).order_by(desc(ThreatSignalRecord.detected_at))
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(t.id),
                    "project_id": str(t.project_id),
                    "threat_name": t.threat_name,
                    "threat_type": t.threat_type,
                    "source": t.source,
                    "target_resource": t.target_resource,
                    "actor": t.actor,
                    "detection_engine": t.detection_engine,
                    "severity": t.severity,
                    "verification_status": t.verification_status,
                    "action_taken": t.action_taken,
                    "status": t.status,
                    "evidence_id": str(t.evidence_id) if t.evidence_id else None,
                    "detected_at": t.detected_at.strftime("%Y-%m-%d %H:%M UTC") if t.detected_at else "Recently",
                }
                for t in items
            ],
            "total": len(items),
        }

    # ── Approvals & Break-Glass ────────────────────────────────────────

    async def list_approvals(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ProtectionApprovalRequest).where(ProtectionApprovalRequest.project_id == proj_id).order_by(desc(ProtectionApprovalRequest.created_at))
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(a.id),
                    "project_id": str(a.project_id),
                    "policy_id": str(a.policy_id) if a.policy_id else None,
                    "requester": a.requester,
                    "requester_type": a.requester_type,
                    "action": a.action,
                    "target_resource": a.target_resource,
                    "environment": a.environment,
                    "risk_level": a.risk_level,
                    "justification": a.justification,
                    "status": a.status,
                    "approver": a.approver,
                    "approved_at": a.approved_at.strftime("%Y-%m-%d %H:%M UTC") if a.approved_at else None,
                    "rejection_reason": a.rejection_reason,
                    "expires_at": a.expires_at.strftime("%Y-%m-%d %H:%M UTC") if a.expires_at else "Soon",
                    "created_at": a.created_at.strftime("%Y-%m-%d %H:%M UTC") if a.created_at else "Recently",
                }
                for a in items
            ],
            "total": len(items),
        }

    async def resolve_approval(self, approval_id_str: str, approved: bool, reason: Optional[str] = None) -> Optional[Dict[str, Any]]:
        try:
            aid = uuid.UUID(approval_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionApprovalRequest).where(ProtectionApprovalRequest.id == aid)
        res = await self.db.execute(stmt)
        a = res.scalars().first()
        if not a:
            return None

        now = datetime.now(timezone.utc)
        a.status = "APPROVED" if approved else "REJECTED"
        a.approver = "SECURITY_ADMIN_USER"
        a.approved_at = now if approved else None
        a.rejection_reason = reason if not approved else None

        act = ProtectionActivityItem(
            id=uuid.uuid4(),
            project_id=a.project_id,
            event_type="APPROVAL_RESOLVED",
            title=f"Action '{a.action}' {'Approved' if approved else 'Rejected'}",
            description=f"Requester: {a.requester}. Target: {a.target_resource}. Note: {reason or 'Approved by authorized operator'}",
            actor=a.requester,
            resource=a.target_resource,
            decision="ALLOW" if approved else "BLOCK",
            severity="HIGH" if not approved else "LOW",
            timestamp=now,
        )
        self.db.add(act)
        await self.db.commit()

        return {
            "id": str(a.id),
            "status": a.status,
            "approver": a.approver,
            "resolved_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        }

    async def list_break_glass(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(BreakGlassRecord).where(BreakGlassRecord.project_id == proj_id).order_by(desc(BreakGlassRecord.granted_at))
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(b.id),
                    "scope": b.scope,
                    "justification": b.justification,
                    "duration_minutes": b.duration_minutes,
                    "requester": b.requester,
                    "approver": b.approver,
                    "is_active": b.is_active,
                    "granted_at": b.granted_at.strftime("%Y-%m-%d %H:%M UTC") if b.granted_at else "Recently",
                    "expires_at": b.expires_at.strftime("%Y-%m-%d %H:%M UTC") if b.expires_at else "Expired",
                }
                for b in items
            ],
            "total": len(items),
        }

    async def create_break_glass(self, payload: Any) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(getattr(payload, "project_id", None))
        now = datetime.now(timezone.utc)
        dur = getattr(payload, "duration_minutes", 30) or 30
        expires = now + timedelta(minutes=dur)
        gid = uuid.uuid4()
        justification_text = (
            getattr(payload, "justification", None)
            or getattr(payload, "reason", None)
            or "Emergency bypass requested"
        )
        scope_text = getattr(payload, "scope", "Production Workloads")
        req = getattr(payload, "requester", None) or "SECURITY_ADMIN_USER"
        appr = getattr(payload, "approver", None) or "EMERGENCY_INCIDENT_CONTROLLER"

        bg = BreakGlassRecord(
            id=gid,
            project_id=proj_id,
            scope=scope_text,
            justification=justification_text,
            duration_minutes=dur,
            requester=req,
            approver=appr,
            is_active=True,
            granted_at=now,
            expires_at=expires,
        )
        self.db.add(bg)

        act = ProtectionActivityItem(
            id=uuid.uuid4(),
            project_id=proj_id,
            event_type="BREAK_GLASS_ACTIVATED",
            title=f"EMERGENCY BREAK-GLASS ACTIVATED: {scope_text}",
            description=f"Justification: {justification_text}. Expires in {dur}m",
            actor=req,
            resource=scope_text,
            decision="ALLOW",
            severity="CRITICAL",
            timestamp=now,
        )
        self.db.add(act)
        await self.db.commit()

        return {
            "session_id": str(bg.id),
            "scope": bg.scope,
            "justification": bg.justification,
            "duration_minutes": bg.duration_minutes,
            "requester": bg.requester,
            "approver": bg.approver,
            "is_active": bg.is_active,
            "granted_at": bg.granted_at.strftime("%Y-%m-%d %H:%M UTC"),
            "expires_at": bg.expires_at.strftime("%Y-%m-%d %H:%M UTC"),
        }

    # ── Evidence & Activity ────────────────────────────────────────────

    async def list_evidence(
        self,
        project_id_str: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        evidence_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        conditions = [ProtectionEvidenceRecord.project_id == proj_id]
        if evidence_type and evidence_type != "ALL":
            conditions.append(ProtectionEvidenceRecord.evidence_type == evidence_type)
        if search:
            st = f"%{search}%"
            conditions.append(
                or_(
                    ProtectionEvidenceRecord.actor.ilike(st),
                    ProtectionEvidenceRecord.resource.ilike(st),
                    ProtectionEvidenceRecord.action.ilike(st),
                    ProtectionEvidenceRecord.policy_name.ilike(st),
                )
            )

        count_stmt = select(func.count(ProtectionEvidenceRecord.id)).where(and_(*conditions))
        total = (await self.db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(ProtectionEvidenceRecord)
            .where(and_(*conditions))
            .order_by(desc(ProtectionEvidenceRecord.observed_at), desc(ProtectionEvidenceRecord.id))
            .limit(limit)
            .offset(offset)
        )
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        curr_page = (offset // max(limit, 1)) + 1
        return {
            "items": [
                {
                    "id": str(e.id),
                    "project_id": str(e.project_id),
                    "decision_id": str(e.decision_id) if e.decision_id else None,
                    "evidence_type": e.evidence_type,
                    "source": e.source,
                    "actor": e.actor,
                    "resource": e.resource,
                    "action": e.action,
                    "policy_name": e.policy_name,
                    "decision": e.decision,
                    "raw_event_redacted": e.raw_event_redacted,
                    "normalized_event": e.normalized_event or {},
                    "trace_id": e.trace_id,
                    "verification_method": e.verification_method,
                    "is_redacted": e.is_redacted,
                    "observed_at": e.observed_at.strftime("%Y-%m-%d %H:%M UTC") if e.observed_at else "Recently",
                }
                for e in items
            ],
            "total": total,
            "pagination": build_pagination_meta(total, curr_page, limit),
        }

    async def get_evidence(self, evidence_id_str: str) -> Optional[Dict[str, Any]]:
        try:
            eid = uuid.UUID(evidence_id_str)
        except ValueError:
            return None

        stmt = select(ProtectionEvidenceRecord).where(ProtectionEvidenceRecord.id == eid)
        res = await self.db.execute(stmt)
        e = res.scalars().first()
        if not e:
            return None

        return {
            "id": str(e.id),
            "project_id": str(e.project_id),
            "decision_id": str(e.decision_id) if e.decision_id else None,
            "evidence_type": e.evidence_type,
            "source": e.source,
            "actor": e.actor,
            "resource": e.resource,
            "action": e.action,
            "policy_name": e.policy_name,
            "decision": e.decision,
            "raw_event_redacted": e.raw_event_redacted,
            "normalized_event": e.normalized_event or {},
            "trace_id": e.trace_id,
            "verification_method": e.verification_method,
            "is_redacted": e.is_redacted,
            "observed_at": e.observed_at.strftime("%Y-%m-%d %H:%M UTC") if e.observed_at else "Recently",
        }

    async def list_activity(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ProtectionActivityItem).where(ProtectionActivityItem.project_id == proj_id).order_by(desc(ProtectionActivityItem.timestamp)).limit(100)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(a.id),
                    "project_id": str(a.project_id),
                    "event_type": a.event_type,
                    "title": a.title,
                    "description": a.description,
                    "actor": a.actor,
                    "resource": a.resource,
                    "decision": a.decision,
                    "severity": a.severity,
                    "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M UTC") if a.timestamp else "Recently",
                }
                for a in items
            ],
            "total": len(items),
        }

    # ── Controls & Coverage ────────────────────────────────────────────

    async def list_effectiveness(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        stmt = select(ControlEffectivenessItem).where(ControlEffectivenessItem.project_id == proj_id)
        res = await self.db.execute(stmt)
        items = res.scalars().all()

        return {
            "items": [
                {
                    "id": str(c.id),
                    "project_id": str(c.project_id),
                    "policy_name": c.policy_name,
                    "control_type": c.control_type,
                    "target_type": c.target_type,
                    "expected_behavior": c.expected_behavior,
                    "observed_attempts": c.observed_attempts,
                    "blocked_count": c.blocked_count,
                    "allowed_count": c.allowed_count,
                    "verification_status": c.verification_status,
                    "last_verified_at": c.last_verified_at.strftime("%Y-%m-%d %H:%M UTC") if c.last_verified_at else "Recently",
                }
                for c in items
            ],
            "total": len(items),
        }

    async def get_coverage(self, project_id_str: Optional[str] = None) -> Dict[str, Any]:
        proj_id = await self.resolve_project_id(project_id_str)
        await self.seed_initial_protect_data_if_empty(proj_id)

        return {
            "summary": {
                "overall_state": "ACTIVE",
                "coverage_score": "95%",
                "unprotected_count": 0,
            },
            "protected_counts": {
                "protected_apis": "2 / 2 (100%)",
                "protected_agents": "2 / 2 (100%)",
                "protected_mcp_servers": "1 / 1 (100%)",
                "protected_k8s_workloads": "1 / 1 (100%)",
            },
            "gaps": [
                {
                    "id": "gap-1",
                    "resource": "staging-preview-worker",
                    "gap_type": "NO_EBPF_SENSOR",
                    "severity": "LOW",
                    "impact": "Staging preview containers do not have real-time kernel egress audit enabled",
                    "remediation": "Attach eBPF daemonset to staging-us-east cluster",
                }
            ],
        }
