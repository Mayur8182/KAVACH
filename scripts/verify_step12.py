"""
Standalone Verification Script for Step 12 — Security Contract DSL & Compiler.
Verifies all core architectural invariants, demonstrations, and persistence.
"""

import asyncio
import uuid
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.contracts.compiler.compiler import ContractCompiler
from app.contracts.compiler.dependency_resolver import DependencyResolver, DependencyCycleError
from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.dsl.hash import ContractHasher
from app.contracts.dsl.normalizer import ContractNormalizer
from app.contracts.dsl.validator import ContractSyntaxValidator
from app.contracts.enums import ThreeValuedLogic, VerificationStatus, ContractStatus
from app.contracts.evaluator.context import EvidenceContext
from app.contracts.evaluator.evaluator import ContractEvaluator
from app.contracts.integrations.delegation import DelegationEvidenceAdapter
from app.contracts.integrations.policy import ContractPolicyIntegration
from app.contracts.models import SecurityContract, SecurityContractVersion
from app.contracts.schemas import ContractCreateRequest, ContractVersionCreateRequest
from app.contracts.service import ContractService


async def run_step12_verification():
    print("=" * 70)
    print("STEP 12 — SECURITY CONTRACT DSL & COMPILER VERIFICATION")
    print("=" * 70)

    # 1. In-memory SQLite Async Engine
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Create Test User and Project
        user = User(
            id=uuid.uuid4(),
            email="security_engineer@platform.local",
            name="Security Engineer",
            password_hash="dummyhash",
            is_active=True,
        )
        project = Project(
            id=uuid.uuid4(),
            name="Production Invariant Control",
            description="Tenant and delegation security contract verification",
            repository_url="https://github.com/corp/production-service",
            owner_id=user.id,
            environment="production",
        )
        session.add_all([user, project])
        await session.commit()

        # -------------------------------------------------------------
        # CHECK 1: DSL Schema & Semantic Validation
        # -------------------------------------------------------------
        print("\n[CHECK 1] Validating Contract DSL Parser and Syntax Validator...")
        tenant_contract_raw = {
            "key": "tenant-isolation",
            "name": "Tenant Isolation Invariant",
            "description": "Users may access only resources belonging to their tenant.",
            "scope": {"type": "API", "resource_type": "INVOICE", "environment": "PRODUCTION"},
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
                "severity": "HIGH",
                "description": "Subject attempted to read resource of another tenant.",
            },
            "evidence": {
                "required": [
                    {"type": "AUTHORIZATION_DECISION", "source": "AUTHZ_ENGINE", "required": True},
                    {"type": "API_RESPONSE", "source": "API_GATEWAY", "required": True},
                ]
            },
        }

        valid, errors, ast_obj = ContractSyntaxValidator.validate(tenant_contract_raw)
        assert valid is True, f"Validation failed: {errors}"
        assert ast_obj.contract_key == "tenant-isolation"
        print("  [PASS] DSL Schema validated successfully.")

        # Test malformed contract rejection
        bad_contract = dict(tenant_contract_raw)
        bad_contract["invariant"] = {"operator": "INVALID_UNSAFE_OPERATOR"}
        bad_valid, bad_errors, _ = ContractSyntaxValidator.validate(bad_contract)
        assert bad_valid is False
        print("  [PASS] Malformed / unsafe contract successfully rejected with structured errors.")

        # -------------------------------------------------------------
        # CHECK 2: Deterministic Normalization and SHA-256 Hashing
        # -------------------------------------------------------------
        print("\n[CHECK 2] Verifying Deterministic Canonical Normalization & Hashing...")
        comp1 = ContractCompiler.compile(tenant_contract_raw, version=1)
        assert comp1.success is True

        # Re-order top-level and inner keys
        reordered = {
            "violation": tenant_contract_raw["violation"],
            "invariant": tenant_contract_raw["invariant"],
            "resource": tenant_contract_raw["resource"],
            "action": tenant_contract_raw["action"],
            "subject": tenant_contract_raw["subject"],
            "scope": tenant_contract_raw["scope"],
            "description": tenant_contract_raw["description"],
            "name": tenant_contract_raw["name"],
            "key": tenant_contract_raw["key"],
            "evidence": tenant_contract_raw["evidence"],
        }
        comp2 = ContractCompiler.compile(reordered, version=1)
        assert comp2.success is True

        assert comp1.normalized_definition == comp2.normalized_definition
        assert comp1.definition_hash == comp2.definition_hash
        print(f"  [PASS] Canonical SHA-256 hash reproducible: {comp1.definition_hash}")

        # -------------------------------------------------------------
        # CHECK 3: Section 60 Demonstration — Tenant Isolation Invariant
        # -------------------------------------------------------------
        print("\n[CHECK 3] Section 60 Demonstration — Tenant Isolation Invariant:")
        parsed_tenant_def: SecurityContractDefinition = comp1.parsed_definition

        # Case 1: Same Tenant -> TRUE
        ctx1 = EvidenceContext({
            "subject": {"tenant_id": "tenant-corp-1"},
            "resource": {"tenant_id": "tenant-corp-1"},
        })
        res1 = ContractEvaluator.evaluate(parsed_tenant_def, comp1.definition_hash, ctx1)
        print(f"  Case 1: subject=tenant-corp-1, resource=tenant-corp-1 -> {res1.truth_value.value}")
        assert res1.truth_value == ThreeValuedLogic.TRUE
        assert res1.is_satisfied is True

        # Case 2: Different Tenants -> FALSE
        ctx2 = EvidenceContext({
            "subject": {"tenant_id": "tenant-corp-1"},
            "resource": {"tenant_id": "tenant-adversary-2"},
        })
        res2 = ContractEvaluator.evaluate(parsed_tenant_def, comp1.definition_hash, ctx2)
        print(f"  Case 2: subject=tenant-corp-1, resource=tenant-adversary-2 -> {res2.truth_value.value}")
        assert res2.truth_value == ThreeValuedLogic.FALSE
        assert res2.is_violated is True
        assert res2.violation_details["type"] == "CROSS_TENANT_ACCESS"

        # Case 3: Missing evidence -> UNKNOWN
        ctx3 = EvidenceContext({
            "resource": {"tenant_id": "tenant-adversary-2"},
        })
        res3 = ContractEvaluator.evaluate(parsed_tenant_def, comp1.definition_hash, ctx3)
        print(f"  Case 3: subject.tenant_id=MISSING, resource=tenant-adversary-2 -> {res3.truth_value.value}")
        assert res3.truth_value == ThreeValuedLogic.UNKNOWN
        assert res3.is_unknown is True
        assert res3.is_satisfied is False
        assert res3.is_violated is False
        print("  [PASS] Three-valued logic invariant preserved: Missing evidence != TRUE and != FALSE.")

        # -------------------------------------------------------------
        # CHECK 4: Section 61 Demonstration — Delegation Authority Invariant
        # -------------------------------------------------------------
        print("\n[CHECK 4] Section 61 Demonstration — Delegated Authority Bounded:")
        delegation_contract_raw = {
            "key": "delegated-authority-bounded",
            "name": "Delegated Authority Invariant",
            "description": "Agent delegated authority must be a subset of parent agent authority.",
            "scope": {"type": "AGENT"},
            "subject": {"type": "AGENT"},
            "action": {"type": "DELEGATE"},
            "resource": {"type": "RESOURCE"},
            "invariant": {
                "operator": "IN",
                "left": {"field": "agent.authority"},
                "right": {"field": "delegated_authority"},
            },
            "violation": {
                "type": "AUTHORITY_ESCALATION",
                "severity": "CRITICAL",
                "description": "Delegated agent has exceeded parent authority.",
            },
        }
        del_comp = ContractCompiler.compile(delegation_contract_raw)
        assert del_comp.success is True

        # Case 1: [READ] ⊆ [READ, WRITE] -> TRUE
        del_ctx1 = DelegationEvidenceAdapter.build_delegation_context(
            delegator_id="agent-lead",
            delegate_id="agent-worker",
            delegator_authority=["READ", "WRITE"],
            delegate_authority=["READ"],
        )
        del_res1 = ContractEvaluator.evaluate(del_comp.parsed_definition, del_comp.definition_hash, del_ctx1)
        print(f"  Case 1: delegator=[READ, WRITE], delegate=[READ] -> {del_res1.truth_value.value}")
        assert del_res1.truth_value == ThreeValuedLogic.TRUE

        # Case 2: [READ, DELETE] ⊄ [READ] -> FALSE
        del_ctx2 = DelegationEvidenceAdapter.build_delegation_context(
            delegator_id="agent-lead",
            delegate_id="agent-worker",
            delegator_authority=["READ"],
            delegate_authority=["READ", "DELETE"],
        )
        del_res2 = ContractEvaluator.evaluate(del_comp.parsed_definition, del_comp.definition_hash, del_ctx2)
        print(f"  Case 2: delegator=[READ], delegate=[READ, DELETE] -> {del_res2.truth_value.value}")
        assert del_res2.truth_value == ThreeValuedLogic.FALSE
        assert del_res2.is_violated is True
        assert del_res2.violation_details["type"] == "AUTHORITY_ESCALATION"
        print("  [PASS] Step 11 delegation authority consumed without reimplementing authorization.")

        # -------------------------------------------------------------
        # CHECK 5: Dependency Cycle Prevention
        # -------------------------------------------------------------
        print("\n[CHECK 5] Testing Inter-Contract Dependency Cycle Prevention...")
        existing_deps = {
            "contract-A": {"contract-B"},
            "contract-B": {"contract-C"},
        }
        try:
            DependencyResolver.check_dependency_cycle("contract-C", "contract-A", existing_deps)
            assert False, "Should have detected cycle"
        except DependencyCycleError as e:
            print(f"  [PASS] Cycle rejected: {e}")

        # -------------------------------------------------------------
        # CHECK 6: Database Persistence, Versioning & Immutability
        # -------------------------------------------------------------
        print("\n[CHECK 6] Verifying Database Persistence & Active Version Immutability...")
        service = ContractService(session)

        # 1. Create Contract in DRAFT
        contract = await service.create_contract(
            project.id,
            ContractCreateRequest(
                name="Tenant Isolation",
                description="Persistent invariant",
                contract_key="tenant-isolation",
                definition=tenant_contract_raw,
            ),
            actor_id=str(user.id),
        )
        assert contract.status == "DRAFT"
        assert len(contract.versions) == 1
        v1 = contract.versions[0]
        assert v1.version == 1
        assert v1.status == "DRAFT"
        print(f"  [PASS] Contract created in DRAFT with version 1 (id: {contract.id})")

        # 2. Activate Version 1
        act_v1 = await service.activate_version(contract.id, v1.id, actor_id=str(user.id))
        assert act_v1.status == "ACTIVE"
        assert contract.status == "ACTIVE"
        assert contract.current_version_id == v1.id
        print("  [PASS] Version 1 atomically activated.")

        # 3. Create Version 2
        modified_v2 = dict(tenant_contract_raw)
        modified_v2["description"] = "Updated description for version 2"
        v2 = await service.create_version(
            contract.id,
            ContractVersionCreateRequest(definition=modified_v2),
            actor_id=str(user.id),
        )
        assert v2.version == 2
        assert v2.status == "DRAFT"
        assert contract.current_version_id == v1.id
        print("  [PASS] Version 2 created in DRAFT while v1 remains active.")

        # 4. Activate Version 2
        act_v2 = await service.activate_version(contract.id, v2.id, actor_id=str(user.id))
        assert act_v2.status == "ACTIVE"
        assert contract.current_version_id == v2.id
        await session.refresh(v1)
        assert v1.status == "VALID"
        print("  [PASS] Version 2 activated, v1 transitioned to VALID.")

        # 5. Execute Evaluation & Record Verification
        eval_res = await service.evaluate_contract(v2.id, ctx1)
        assert eval_res.truth_value == ThreeValuedLogic.TRUE
        verifications = await service.repo.get_verifications_for_contract(contract.id)
        assert len(verifications) == 1
        assert verifications[0].status == "TRUE"
        print(f"  [PASS] Verification record stored with SHA-256 hash: {v2.definition_hash[:12]}...")

        # -------------------------------------------------------------
        # CHECK 7: Step 7 Policy Integration
        # -------------------------------------------------------------
        print("\n[CHECK 7] Verifying Step 7 Policy Integration:")
        pol_viol = ContractPolicyIntegration.evaluate_contract_evidence(
            contract_key="tenant-isolation",
            contract_version=2,
            definition_hash=v2.definition_hash,
            verification_status=VerificationStatus.VIOLATED.value,
            severity="HIGH",
        )
        assert pol_viol.effect == "BLOCK"
        print(f"  Contract VIOLATED -> Policy Decision: {pol_viol.effect} ({pol_viol.reason})")

        pol_unkn = ContractPolicyIntegration.evaluate_contract_evidence(
            contract_key="tenant-isolation",
            contract_version=2,
            definition_hash=v2.definition_hash,
            verification_status=VerificationStatus.UNKNOWN.value,
            fail_closed_on_unknown=True,
        )
        assert pol_unkn.effect == "BLOCK"
        print(f"  Contract UNKNOWN (Fail Closed) -> Policy Decision: {pol_unkn.effect}")

        pol_ver = ContractPolicyIntegration.evaluate_contract_evidence(
            contract_key="tenant-isolation",
            contract_version=2,
            definition_hash=v2.definition_hash,
            verification_status=VerificationStatus.VERIFIED.value,
        )
        assert pol_ver.effect == "ALLOW"
        print(f"  Contract VERIFIED -> Policy Decision: {pol_ver.effect}")

    print("\n" + "=" * 70)
    print("ALL STEP 12 CHECKS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_step12_verification())
