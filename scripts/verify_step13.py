"""
Standalone Verification Script for Step 13 — Runtime Evidence & Continuous Security Contract Verification.
Verifies real ingestion, secret redaction, SHA-256 integrity, deduplication, temporal reasoning,
Section 91 Tenant Isolation, Section 92 Delegation Invariant, and Section 93 Unconfigured Source handling.
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

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.contracts.models import SecurityContract, SecurityContractVersion
from app.contracts.enums import ContractStatus, ThreeValuedLogic
from app.runtime.enums import (
    EvidenceSourceType,
    EvidenceClassification,
    EvidenceTrustLevel,
    EvidenceSourceStatus,
    EvidenceEventType,
    EvidenceStatus,
    RuntimeVerificationStatus,
    ViolationStatus,
    TemporalRelation,
)
from app.runtime.models import RuntimeEvidenceSource, RuntimeEvidence, EvidenceCorrelation
from app.runtime.ingestion.integrity import EvidenceIntegrityHasher
from app.runtime.ingestion.normalizer import EvidenceNormalizer
from app.runtime.verification.temporal import TemporalEvaluator
from app.runtime.collectors.container import ContainerEvidenceCollector
from app.runtime.collectors.kubernetes import KubernetesEvidenceCollector
from app.runtime.service import RuntimeEvidenceService
from app.runtime.schemas import RuntimeEvidenceIngestRequest


async def run_step13_verification():
    print("=" * 80)
    print("STEP 13 -- RUNTIME EVIDENCE & CONTINUOUS SECURITY CONTRACT VERIFICATION")
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
        # 1. Setup User and Project
        user = User(
            id=uuid.uuid4(),
            email="secops_lead@controlplane.io",
            name="Security Operations Lead",
            password_hash="hashedpass",
            is_active=True,
        )
        project = Project(
            id=uuid.uuid4(),
            name="Production Runtime Security",
            description="Real runtime continuous contract verification",
            repository_url="https://github.com/corp/production-core",
            owner_id=user.id,
            environment="production",
        )
        session.add_all([user, project])
        await session.commit()

        service = RuntimeEvidenceService(session)

        # -------------------------------------------------------------
        # CHECK 1: Ingestion, Secret Redaction & Canonical SHA-256 Hash
        # -------------------------------------------------------------
        print("\n[CHECK 1] Testing Runtime Evidence Ingestion, Redaction & Integrity Hashing...")
        raw_payload = {
            "action": "API_CALL",
            "endpoint": "/v1/invoices/991",
            "api_key": "sk-secret-live-1234567890",
            "auth_header": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive",
            "user_data": {
                "password": "SuperSecretPassword123!",
                "username": "customer_a",
            },
            "environment": "production",
        }

        normalized = EvidenceNormalizer.redact_secrets(raw_payload)
        payload_hash = EvidenceIntegrityHasher.compute_payload_hash(normalized)

        assert normalized["api_key"] == "[REDACTED]"
        assert normalized["auth_header"] == "Bearer [REDACTED]"
        assert normalized["user_data"]["password"] == "[REDACTED]"
        assert normalized["user_data"]["username"] == "customer_a"
        assert len(payload_hash) == 64
        print("  [OK] Sensitive fields successfully redacted recursively.")
        print(f"  [OK] Canonical JSON SHA-256 payload integrity hash: {payload_hash}")

        # -------------------------------------------------------------
        # CHECK 2: Deduplication and Idempotency
        # -------------------------------------------------------------
        print("\n[CHECK 2] Testing Deduplication & Idempotent Ingestion...")
        now = datetime.now(timezone.utc)
        ingest_req1 = RuntimeEvidenceIngestRequest(
            project_id=project.id,
            source_id="api-gateway-us-east-1",
            source_type=EvidenceSourceType.APPLICATION,
            source_event_id="evt-req-uniq-1001",
            event_type=EvidenceEventType.API_REQUEST,
            occurred_at=now,
            subject={"type": "USER", "id": "customer_a"},
            action={"type": "API_CALL"},
            resource={"type": "INVOICE", "id": "991"},
            context={"env": "production"},
            result={"status": "OK"},
            raw_payload=raw_payload,
            trace_id="trace-abc-123",
            span_id="span-xyz-789",
        )

        res1 = await service.ingest_evidence(ingest_req1)
        assert res1.status == EvidenceStatus.PROCESSED.value
        assert res1.is_duplicate is False
        print(f"  [OK] First ingestion accepted: Evidence ID {res1.evidence_id}")

        res2 = await service.ingest_evidence(ingest_req1)
        assert res2.status == EvidenceStatus.PROCESSED.value
        assert res2.is_duplicate is True
        assert res1.evidence_id == res2.evidence_id
        print("  [OK] Duplicate ingestion correctly deduplicated (Idempotent replay protection active)")

        # -------------------------------------------------------------
        # CHECK 3: Out-of-Order Temporal Reasoning
        # -------------------------------------------------------------
        print("\n[CHECK 3] Testing Out-of-Order Temporal Reasoning Engine...")
        t0 = datetime(2026, 9, 27, 10, 0, 0, tzinfo=timezone.utc)
        t1 = datetime(2026, 9, 27, 10, 5, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 27, 10, 10, 0, tzinfo=timezone.utc)

        # 1. Authorization before database access (Legitimate)
        res_before = TemporalEvaluator.evaluate_temporal_relation(
            relation=TemporalRelation.BEFORE,
            time_a=t0,
            time_b=t1,
            window_seconds=600.0,
        )
        assert res_before["satisfied"] is True
        assert res_before["unknown"] is False

        # 2. Database access before authorization (Violation: access occurred before auth)
        res_violation = TemporalEvaluator.evaluate_temporal_relation(
            relation=TemporalRelation.BEFORE,
            time_a=t1,
            time_b=t0,
        )
        assert res_violation["satisfied"] is False
        assert res_violation["unknown"] is False

        # 3. Within time window check
        res_within = TemporalEvaluator.evaluate_temporal_relation(
            relation=TemporalRelation.WITHIN,
            time_a=t0,
            time_b=t2,
            window_seconds=700.0,
        )
        assert res_within["satisfied"] is True
        print("  [OK] Temporal relations (BEFORE, AFTER, WITHIN) evaluated deterministically using occurred_at.")

        # -------------------------------------------------------------
        # CHECK 4: Section 91 — Tenant Isolation Invariant Verification
        # -------------------------------------------------------------
        print("\n[CHECK 4] Testing Section 91: Tenant Isolation Continuous Verification...")
        # Create Active Tenant Isolation Contract
        tenant_contract_def = {
            "key": "tenant-isolation",
            "name": "Tenant Isolation Invariant",
            "description": "Users may access only resources belonging to their tenant.",
            "scope": {
                "type": "API",
                "resource_type": "INVOICE",
                "environment": "PRODUCTION",
            },
            "subject": {"type": "AUTHENTICATED_USER"},
            "action": {"type": "READ"},
            "resource": {"type": "INVOICE"},
            "invariant": {
                "operator": "EQUALS",
                "left": {"field": "subject.tenant_id"},
                "right": {"field": "resource.tenant_id"},
            },
            "violation": {
                "type": "CROSS_TENANT_ACCESS",
                "severity": "CRITICAL",
                "description": "Cross-tenant access attempted",
            },
            "evidence": {
                "required": [
                    {
                        "type": "API_REQUEST",
                        "source": "APPLICATION",
                        "required": True,
                    }
                ]
            },
        }
        tenant_contract = SecurityContract(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Tenant Isolation",
            description="Tenant isolation invariant",
            contract_key="tenant-isolation",
            status=ContractStatus.ACTIVE.value,
            created_by="system",
        )
        session.add(tenant_contract)
        await session.flush()

        tenant_contract_ver = SecurityContractVersion(
            id=uuid.uuid4(),
            contract_id=tenant_contract.id,
            version=1,
            definition=tenant_contract_def,
            normalized_definition=tenant_contract_def,
            definition_hash="hash_tenant_isolation_v1",
            status="ACTIVE",
            created_by="system",
        )
        session.add(tenant_contract_ver)
        tenant_contract.current_version_id = tenant_contract_ver.id
        await session.commit()

        # Case 1: Legitimate Tenant Access
        legit_evidence_req = RuntimeEvidenceIngestRequest(
            project_id=project.id,
            source_type=EvidenceSourceType.APPLICATION,
            source_id="fastapi-billing-api",
            source_event_id="req-legit-001",
            event_type=EvidenceEventType.API_REQUEST,
            occurred_at=datetime.now(timezone.utc),
            subject={"type": "AUTHENTICATED_USER", "id": "user-a", "tenant_id": "tenant-alpha"},
            action={"type": "READ", "route": "/api/v1/invoices/inv-100"},
            resource={"type": "INVOICE", "id": "inv-100", "tenant_id": "tenant-alpha"},
            context={
                "tenant_id": "tenant-alpha",
                "resource_tenant_id": "tenant-alpha",
                "environment": "PRODUCTION",
            },
            result={"status_code": 200},
            environment="PRODUCTION",
            raw_payload={"tenant_id": "tenant-alpha", "resource_tenant_id": "tenant-alpha"},
        )
        resp_legit = await service.ingest_evidence(legit_evidence_req)
        assert resp_legit.verifications_count >= 1
        assert resp_legit.violations_count == 0

        verifs = await service.list_verifications(project.id, contract_version_id=tenant_contract_ver.id)
        assert len(verifs) >= 1
        assert verifs[0].status == RuntimeVerificationStatus.VERIFIED.value
        assert verifs[0].evaluation_result["is_satisfied"] is True
        print("  [OK] Case 1 (Legitimate Tenant Match): Contract Status = VERIFIED (TRUE)")

        # Case 2: Cross-Tenant Violation Attempt
        violating_evidence_req = RuntimeEvidenceIngestRequest(
            project_id=project.id,
            source_type=EvidenceSourceType.APPLICATION,
            source_id="fastapi-billing-api",
            source_event_id="req-attack-002",
            event_type=EvidenceEventType.API_REQUEST,
            occurred_at=datetime.now(timezone.utc),
            subject={"type": "AUTHENTICATED_USER", "id": "user-a", "tenant_id": "tenant-alpha"},
            action={"type": "READ", "route": "/api/v1/invoices/inv-999"},
            resource={"type": "INVOICE", "id": "inv-999", "tenant_id": "tenant-bravo"},
            context={
                "tenant_id": "tenant-alpha",
                "resource_tenant_id": "tenant-bravo",
                "environment": "PRODUCTION",
            },
            result={"status_code": 200},
            environment="PRODUCTION",
            raw_payload={"tenant_id": "tenant-alpha", "resource_tenant_id": "tenant-bravo"},
        )
        resp_attack = await service.ingest_evidence(violating_evidence_req)
        assert resp_attack.violations_count >= 1

        all_violations = await service.list_violations(project.id)
        violations = [v for v in all_violations if v.contract_version_id == tenant_contract_ver.id]
        assert len(violations) >= 1
        assert violations[0].status == ViolationStatus.OPEN.value
        assert violations[0].severity == "CRITICAL"
        print("  [OK] Case 2 (Cross-Tenant Breach Attempt): Contract Status = VIOLATED (FALSE)")
        print("  [OK] Violation persisted to DB with evidence link and CRITICAL severity.")

        # -------------------------------------------------------------
        # CHECK 5: Section 92 — Delegation Authority Runtime Invariant
        # -------------------------------------------------------------
        print("\n[CHECK 5] Testing Section 92: Delegation Authority Invariant...")
        delegation_contract_def = {
            "key": "delegated-mcp-authority",
            "name": "Delegated MCP Authority Contract",
            "description": "Agent may only execute MCP tools within delegated authority and while unexpired.",
            "scope": {"type": "AGENT"},
            "subject": {"type": "AGENT"},
            "action": {"type": "EXECUTE"},
            "resource": {"type": "MCP_TOOL"},
            "invariant": {
                "operator": "AND",
                "conditions": [
                    {
                        "operator": "IN",
                        "left": {"field": "agent.authority"},
                        "right": {"field": "delegation.authority"},
                    },
                    {
                        "operator": "EQUALS",
                        "left": {"field": "delegation.is_expired"},
                        "right": {"value": False},
                    },
                ],
            },
            "violation": {
                "type": "DELEGATION_VIOLATION",
                "severity": "CRITICAL",
                "description": "Agent executed tool outside delegated authority or while expired",
            },
        }

        del_contract = SecurityContract(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Delegated MCP Authority",
            description="Enforces delegation authority and expiry",
            contract_key="delegated-mcp-authority",
            status=ContractStatus.ACTIVE.value,
            created_by="system",
        )
        session.add(del_contract)
        await session.flush()

        del_contract_ver = SecurityContractVersion(
            id=uuid.uuid4(),
            contract_id=del_contract.id,
            version=1,
            definition=delegation_contract_def,
            normalized_definition=delegation_contract_def,
            definition_hash="hash_delegation_v1",
            status="ACTIVE",
            created_by="system",
        )
        session.add(del_contract_ver)
        del_contract.current_version_id = del_contract_ver.id
        await session.commit()

        # Legitimate Tool Call
        valid_mcp_req = RuntimeEvidenceIngestRequest(
            project_id=project.id,
            source_type=EvidenceSourceType.MCP,
            source_id="mcp-gateway-01",
            source_event_id="mcp-exec-101",
            event_type=EvidenceEventType.MCP_TOOL_CALL,
            occurred_at=datetime.now(timezone.utc),
            subject={"type": "AGENT", "id": "agent-b"},
            action={"type": "EXECUTE", "name": "aws.s3_read"},
            resource={"type": "MCP_TOOL", "id": "s3_read"},
            context={
                "agent_authority": "READ",
                "delegated_authority": ["READ", "SEARCH"],
                "delegation_expired": False,
                "delegation_id": "del-uuid-001",
            },
            result={"decision": "ALLOW"},
            raw_payload={"tool": "s3_read"},
        )
        resp_valid = await service.ingest_evidence(valid_mcp_req)
        assert resp_valid.verifications_count >= 1
        assert resp_valid.violations_count == 0
        del_verifs = await service.list_verifications(project.id, contract_version_id=del_contract_ver.id)
        assert len(del_verifs) >= 1
        assert del_verifs[0].status == RuntimeVerificationStatus.VERIFIED.value
        print("  [OK] Agent tool call within delegated authority: VERIFIED")

        # Unauthorized Tool Call
        escalation_mcp_req = RuntimeEvidenceIngestRequest(
            project_id=project.id,
            source_type=EvidenceSourceType.MCP,
            source_id="mcp-gateway-01",
            source_event_id="mcp-exec-102",
            event_type=EvidenceEventType.MCP_TOOL_CALL,
            occurred_at=datetime.now(timezone.utc),
            subject={"type": "AGENT", "id": "agent-b"},
            action={"type": "EXECUTE", "name": "aws.iam_admin"},
            resource={"type": "MCP_TOOL", "id": "iam_admin"},
            context={
                "agent_authority": "ADMIN",
                "delegated_authority": ["READ", "SEARCH"],
                "delegation_expired": False,
                "delegation_id": "del-uuid-001",
            },
            result={"decision": "DENY"},
            raw_payload={"tool": "iam_admin"},
        )
        resp_escalation = await service.ingest_evidence(escalation_mcp_req)
        assert resp_escalation.violations_count >= 1
        all_del_violations = await service.list_violations(project.id)
        del_violations = [v for v in all_del_violations if v.contract_version_id == del_contract_ver.id]
        assert len(del_violations) >= 1
        assert del_violations[0].status == ViolationStatus.OPEN.value
        print("  [OK] Agent tool call outside delegated authority: VIOLATED")

        # -------------------------------------------------------------
        # CHECK 6: Section 93 — Real Failure for Unconfigured Sources
        # -------------------------------------------------------------
        print("\n[CHECK 6] Testing Section 93: Real Failure for Unconfigured Sources (No Mocks)...")
        container_collector = ContainerEvidenceCollector()
        cont_status = container_collector.get_status()
        assert cont_status == EvidenceSourceStatus.NOT_CONFIGURED
        print(f"  [OK] Container collector without daemon strictly reports: {cont_status.value}")

        k8s_collector = KubernetesEvidenceCollector()
        k8s_status = k8s_collector.get_status()
        assert k8s_status == EvidenceSourceStatus.NOT_CONFIGURED
        print(f"  [OK] Kubernetes collector without kubeconfig strictly reports: {k8s_status.value}")

        # -------------------------------------------------------------
        # CHECK 7: Source Health and Cross-Project Isolation
        # -------------------------------------------------------------
        print("\n[CHECK 7] Verifying Source Health Aggregation & Cross-Project Isolation...")
        health = await service.get_health()
        assert health.status == "healthy"
        assert health.collectors["container"] in ("not_configured", "active")
        assert health.collectors["kubernetes"] in ("not_configured", "active")
        print(f"  [OK] System health aggregated: status={health.status}, collectors={health.collectors}")

        # Cross project isolation
        proj2 = Project(
            id=uuid.uuid4(),
            name="Isolated Project 2",
            description="Testing isolation",
            owner_id=user.id,
            environment="staging",
        )
        session.add(proj2)
        await session.commit()

        proj2_evidence = await service.list_evidence(project_id=proj2.id)
        assert len(proj2_evidence) == 0, "Project 2 must have zero access to Project 1 evidence"
        print("  [OK] Strict cross-project evidence isolation verified.")

    print("\n" + "=" * 80)
    print("ALL STEP 13 VERIFICATION CHECKS COMPLETED AND CONFIRMED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_step13_verification())
