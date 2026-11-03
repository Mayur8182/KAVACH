import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.contracts.compiler.compiler import ContractCompiler
from app.contracts.compiler.dependency_resolver import DependencyResolver, DependencyCycleError
from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.dsl.hash import ContractHasher
from app.contracts.dsl.normalizer import ContractNormalizer
from app.contracts.dsl.validator import ContractSyntaxValidator
from app.contracts.enums import ContractStatus, ThreeValuedLogic, VerificationStatus
from app.contracts.evaluator.context import EvidenceContext
from app.contracts.evaluator.evaluator import ContractEvaluator
from app.contracts.evaluator.operators import ThreeValuedEvaluator
from app.contracts.integrations.delegation import DelegationEvidenceAdapter
from app.contracts.integrations.policy import ContractPolicyIntegration
from app.contracts.models import (
    SecurityContract,
    SecurityContractVersion,
    SecurityContractVerification,
    SecurityContractViolation,
    SecurityContractOverride,
)
from app.contracts.schemas import ContractCreateRequest
from app.contracts.service import ContractService
from app.models.project import Project
from app.models.user import User


# Fixtures
@pytest.fixture
def auth_headers(user_a: User):
    token = create_access_token(subject=str(user_a.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tenant_isolation_contract_raw():
    return {
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
            "severity": "HIGH",
            "description": "Cross-tenant access detected.",
        },
        "evidence": {
            "required": [
                {"type": "AUTHORIZATION_DECISION", "source": "AUTHORIZATION_ENGINE", "required": True},
                {"type": "API_RESPONSE", "source": "API_GATEWAY", "required": True},
            ]
        },
    }


@pytest.fixture
def delegation_authority_contract_raw():
    return {
        "key": "delegation-authority-bounded",
        "name": "Delegated Authority Bounded",
        "description": "Delegated agent authority cannot exceed delegator agent authority.",
        "scope": {
            "type": "AGENT",
            "environment": "PRODUCTION",
        },
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
            "description": "Delegated authority exceeded delegator granted bounds.",
        },
        "evidence": {
            "required": [
                {"type": "AGENT_ACTION", "source": "DELEGATION_ENGINE", "required": True}
            ]
        },
    }


# =========================================================================
# 1. DSL & COMPILER TESTS
# =========================================================================

def test_dsl_ast_valid_and_invalid(tenant_isolation_contract_raw):
    # Valid contract
    valid, errors, ast_obj = ContractSyntaxValidator.validate(tenant_isolation_contract_raw)
    assert valid is True
    assert len(errors) == 0
    assert isinstance(ast_obj, SecurityContractDefinition)
    assert ast_obj.contract_key == "tenant-isolation"

    # Missing invariant
    malformed = dict(tenant_isolation_contract_raw)
    del malformed["invariant"]
    valid_bad, errors_bad, _ = ContractSyntaxValidator.validate(malformed)
    assert valid_bad is False
    assert any("invariant" in str(e).lower() for e in errors_bad)

    # Invalid operator
    invalid_op = dict(tenant_isolation_contract_raw)
    invalid_op["invariant"] = {"operator": "UNKNOWN_OP", "left": {"field": "a"}, "right": {"value": 1}}
    valid_op, errors_op, _ = ContractSyntaxValidator.validate(invalid_op)
    assert valid_op is False
    assert any("operator" in str(e).lower() for e in errors_op)


def test_dsl_deterministic_normalization_and_hash(tenant_isolation_contract_raw):
    # Build two dicts with completely different key orderings
    dict_a = {
        "key": "test-contract",
        "name": "Test",
        "description": "Deterministic test",
        "scope": {"type": "GLOBAL"},
        "subject": {"type": "USER"},
        "action": {"type": "READ"},
        "resource": {"type": "FILE"},
        "invariant": {"operator": "EQUALS", "left": {"field": "a"}, "right": {"value": 10}},
        "violation": {"type": "VIOLATION", "severity": "HIGH", "description": "desc"},
    }

    dict_b = {
        "resource": {"type": "FILE"},
        "action": {"type": "READ"},
        "subject": {"type": "USER"},
        "scope": {"type": "GLOBAL"},
        "description": "Deterministic test",
        "name": "Test",
        "key": "test-contract",
        "violation": {"description": "desc", "severity": "HIGH", "type": "VIOLATION"},
        "invariant": {"right": {"value": 10}, "left": {"field": "a"}, "operator": "EQUALS"},
    }

    norm_a = ContractNormalizer.normalize(dict_a)
    norm_b = ContractNormalizer.normalize(dict_b)

    # Normalized canonical dictionaries must match exactly
    assert norm_a == norm_b

    # Cryptographic hashes must match bit-for-bit
    hash_a = ContractHasher.hash_definition(norm_a)
    hash_b = ContractHasher.hash_definition(norm_b)
    assert hash_a == hash_b
    assert len(hash_a) == 64

    # Changing right value produces different hash
    dict_c = dict(dict_a)
    dict_c["invariant"] = {"operator": "EQUALS", "left": {"field": "a"}, "right": {"value": 99}}
    norm_c = ContractNormalizer.normalize(dict_c)
    hash_c = ContractHasher.hash_definition(norm_c)
    assert hash_a != hash_c


# =========================================================================
# 2. THREE-VALUED LOGIC OPERATORS
# =========================================================================

def test_three_valued_logic_operators():
    evaluator = ThreeValuedEvaluator()

    # Truth table for AND
    assert evaluator.evaluate_and([ThreeValuedLogic.TRUE, ThreeValuedLogic.TRUE]) == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_and([ThreeValuedLogic.TRUE, ThreeValuedLogic.FALSE]) == ThreeValuedLogic.FALSE
    assert evaluator.evaluate_and([ThreeValuedLogic.TRUE, ThreeValuedLogic.UNKNOWN]) == ThreeValuedLogic.UNKNOWN
    assert evaluator.evaluate_and([ThreeValuedLogic.FALSE, ThreeValuedLogic.UNKNOWN]) == ThreeValuedLogic.FALSE

    # Truth table for OR
    assert evaluator.evaluate_or([ThreeValuedLogic.TRUE, ThreeValuedLogic.UNKNOWN]) == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_or([ThreeValuedLogic.FALSE, ThreeValuedLogic.UNKNOWN]) == ThreeValuedLogic.UNKNOWN
    assert evaluator.evaluate_or([ThreeValuedLogic.FALSE, ThreeValuedLogic.FALSE]) == ThreeValuedLogic.FALSE

    # Truth table for NOT
    assert evaluator.evaluate_not(ThreeValuedLogic.TRUE) == ThreeValuedLogic.FALSE
    assert evaluator.evaluate_not(ThreeValuedLogic.FALSE) == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_not(ThreeValuedLogic.UNKNOWN) == ThreeValuedLogic.UNKNOWN

    # String & numerical operators
    assert evaluator.evaluate_starts_with("prod-us-east-1", "prod-") == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_starts_with("dev-us-east-1", "prod-") == ThreeValuedLogic.FALSE
    assert evaluator.evaluate_greater_than(100, 50) == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_greater_than(50, 100) == ThreeValuedLogic.FALSE
    assert evaluator.evaluate_exists("some_token") == ThreeValuedLogic.TRUE
    assert evaluator.evaluate_exists(None) == ThreeValuedLogic.FALSE


# =========================================================================
# 3. SECTION 60 DEMONSTRATION — TENANT ISOLATION
# =========================================================================

def test_section60_tenant_isolation_demonstration(tenant_isolation_contract_raw):
    """
    SECTION 60 DEMONSTRATION:
    Case 1: subject.tenant_id = tenant-1, resource.tenant_id = tenant-1 -> TRUE
    Case 2: subject.tenant_id = tenant-1, resource.tenant_id = tenant-2 -> FALSE
    Case 3: subject.tenant_id = missing, resource.tenant_id = tenant-2 -> UNKNOWN
    """
    comp = ContractCompiler.compile(tenant_isolation_contract_raw)
    assert comp.success is True
    parsed_def: SecurityContractDefinition = comp.parsed_definition

    # Case 1: Same Tenant -> TRUE
    ctx_case1 = EvidenceContext({
        "subject": {"tenant_id": "tenant-1"},
        "resource": {"tenant_id": "tenant-1"},
    })
    res_case1 = ContractEvaluator.evaluate(parsed_def, comp.definition_hash, ctx_case1)
    assert res_case1.truth_value == ThreeValuedLogic.TRUE
    assert res_case1.is_satisfied is True
    assert res_case1.is_violated is False

    # Case 2: Different Tenants -> FALSE (Violation triggered)
    ctx_case2 = EvidenceContext({
        "subject": {"tenant_id": "tenant-1"},
        "resource": {"tenant_id": "tenant-2"},
    })
    res_case2 = ContractEvaluator.evaluate(parsed_def, comp.definition_hash, ctx_case2)
    assert res_case2.truth_value == ThreeValuedLogic.FALSE
    assert res_case2.is_satisfied is False
    assert res_case2.is_violated is True
    assert res_case2.violation_details is not None
    assert res_case2.violation_details["type"] == "CROSS_TENANT_ACCESS"
    assert res_case2.violation_details["severity"] == "HIGH"

    # Case 3: Missing subject.tenant_id -> UNKNOWN (Missing evidence != FALSE and != TRUE)
    ctx_case3 = EvidenceContext({
        "resource": {"tenant_id": "tenant-2"},
    })
    res_case3 = ContractEvaluator.evaluate(parsed_def, comp.definition_hash, ctx_case3)
    assert res_case3.truth_value == ThreeValuedLogic.UNKNOWN
    assert res_case3.is_unknown is True
    assert res_case3.is_satisfied is False
    assert res_case3.is_violated is False


# =========================================================================
# 4. SECTION 61 DEMONSTRATION — DELEGATION AUTHORITY
# =========================================================================

def test_section61_delegation_authority_demonstration(delegation_authority_contract_raw):
    """
    SECTION 61 DEMONSTRATION:
    Case 1: Delegator: [READ, WRITE], Delegate: [READ] -> TRUE
    Case 2: Delegator: [READ], Delegate: [READ, DELETE] -> FALSE
    """
    comp = ContractCompiler.compile(delegation_authority_contract_raw)
    assert comp.success is True
    parsed_def: SecurityContractDefinition = comp.parsed_definition

    # Case 1: Delegate authority [READ] is subset of delegator [READ, WRITE] -> TRUE
    ctx_case1 = DelegationEvidenceAdapter.build_delegation_context(
        delegator_id="agent-parent",
        delegate_id="agent-child",
        delegator_authority=["READ", "WRITE"],
        delegate_authority=["READ"],
    )
    res_case1 = ContractEvaluator.evaluate(parsed_def, comp.definition_hash, ctx_case1)
    assert res_case1.truth_value == ThreeValuedLogic.TRUE
    assert res_case1.is_satisfied is True

    # Case 2: Delegate authority [READ, DELETE] exceeds delegator [READ] -> FALSE
    ctx_case2 = DelegationEvidenceAdapter.build_delegation_context(
        delegator_id="agent-parent",
        delegate_id="agent-child",
        delegator_authority=["READ"],
        delegate_authority=["READ", "DELETE"],
    )
    res_case2 = ContractEvaluator.evaluate(parsed_def, comp.definition_hash, ctx_case2)
    assert res_case2.truth_value == ThreeValuedLogic.FALSE
    assert res_case2.is_violated is True
    assert res_case2.violation_details["type"] == "AUTHORITY_ESCALATION"


# =========================================================================
# 5. DEPENDENCY CYCLE DETECTION
# =========================================================================

def test_dependency_cycle_detection():
    # A -> B, B -> C
    existing_edges = {
        "contract-A": {"contract-B"},
        "contract-B": {"contract-C"},
    }

    # Valid dependency: C -> D
    DependencyResolver.check_dependency_cycle("contract-C", "contract-D", existing_edges)

    # Invalid cycle: C -> A
    with pytest.raises(DependencyCycleError) as exc_info:
        DependencyResolver.check_dependency_cycle("contract-C", "contract-A", existing_edges)
    assert "cycle detected" in str(exc_info.value).lower()


# =========================================================================
# 6. POLICY INTEGRATION (STEP 7)
# =========================================================================

def test_contract_policy_integration():
    # Violated contract -> Policy BLOCK
    decision_violated = ContractPolicyIntegration.evaluate_contract_evidence(
        contract_key="tenant-isolation",
        contract_version=1,
        definition_hash="abc123hash",
        verification_status=VerificationStatus.VIOLATED.value,
        severity="HIGH",
    )
    assert decision_violated.effect == "BLOCK"
    assert "violated" in decision_violated.reason.lower()

    # Verified contract -> Policy ALLOW
    decision_verified = ContractPolicyIntegration.evaluate_contract_evidence(
        contract_key="tenant-isolation",
        contract_version=1,
        definition_hash="abc123hash",
        verification_status=VerificationStatus.VERIFIED.value,
    )
    assert decision_verified.effect == "ALLOW"

    # Unknown contract with fail_closed=True -> Policy BLOCK
    decision_unknown_closed = ContractPolicyIntegration.evaluate_contract_evidence(
        contract_key="tenant-isolation",
        contract_version=1,
        definition_hash="abc123hash",
        verification_status=VerificationStatus.UNKNOWN.value,
        fail_closed_on_unknown=True,
    )
    assert decision_unknown_closed.effect == "BLOCK"

    # Unknown contract with fail_closed=False -> Policy WARN
    decision_unknown_open = ContractPolicyIntegration.evaluate_contract_evidence(
        contract_key="tenant-isolation",
        contract_version=1,
        definition_hash="abc123hash",
        verification_status=VerificationStatus.UNKNOWN.value,
        fail_closed_on_unknown=False,
    )
    assert decision_unknown_open.effect == "WARN"


# =========================================================================
# 7. DATABASE PERSISTENCE, LIFECYCLE & IMMUTABILITY
# =========================================================================

@pytest.mark.asyncio
async def test_contract_service_lifecycle_and_immutability(
    db_session: AsyncSession,
    user_a: User,
    tenant_isolation_contract_raw,
):
    project = Project(
        id=uuid.uuid4(),
        name="Contract Test Project",
        description="Project for contract lifecycle testing",
        repository_url="https://github.com/org/test-project",
        owner_id=user_a.id,
        environment="development",
    )
    db_session.add(project)
    await db_session.flush()

    service = ContractService(db_session)

    # 1. Create Contract in DRAFT
    req = ContractCreateRequest(
        name="Tenant Isolation",
        description="Tenant isolation invariant",
        contract_key="tenant-isolation",
        definition=tenant_isolation_contract_raw,
    )
    contract = await service.create_contract(project.id, req, actor_id=str(user_a.id))
    assert contract.status == "DRAFT"
    assert contract.contract_key == "tenant-isolation"
    assert contract.current_version_id is None
    assert len(contract.versions) == 1
    v1 = contract.versions[0]
    assert v1.version == 1
    assert v1.status == "DRAFT"
    assert len(v1.definition_hash) == 64

    # 2. Activate Version 1
    activated_v1 = await service.activate_version(contract.id, v1.id, actor_id=str(user_a.id))
    assert activated_v1.status == "ACTIVE"
    assert contract.status == "ACTIVE"
    assert contract.current_version_id == v1.id

    # 3. Create Version 2 (modifications must create new version, not mutate active in place)
    modified_def = dict(tenant_isolation_contract_raw)
    modified_def["description"] = "Updated description for v2"
    from app.contracts.schemas import ContractVersionCreateRequest
    v2_req = ContractVersionCreateRequest(definition=modified_def)
    v2 = await service.create_version(contract.id, v2_req, actor_id=str(user_a.id))
    assert v2.version == 2
    assert v2.status == "DRAFT"

    # v1 remains active until v2 is explicitly activated
    assert contract.current_version_id == v1.id

    # 4. Activate Version 2 -> atomically deactivates v1
    activated_v2 = await service.activate_version(contract.id, v2.id, actor_id=str(user_a.id))
    assert activated_v2.status == "ACTIVE"
    assert contract.current_version_id == v2.id

    # Refresh v1 to confirm transition to VALID
    await db_session.refresh(v1)
    assert v1.status == "VALID"

    # 5. Overrides
    from app.contracts.schemas import ContractOverrideCreateRequest
    override_req = ContractOverrideCreateRequest(
        reason="Approved emergency migration window",
        scope={"tenant_id": "tenant-emergency"},
        expires_in_hours=2,
    )
    override = await service.create_override(contract.id, override_req, actor_id=str(user_a.id))
    assert override.status == "ACTIVE"
    assert override.contract_version_id == v2.id

    # 6. Evaluate and persist verification record
    ctx = EvidenceContext({
        "subject": {"tenant_id": "tenant-100"},
        "resource": {"tenant_id": "tenant-100"},
    })
    eval_res = await service.evaluate_contract(v2.id, ctx)
    assert eval_res.truth_value == ThreeValuedLogic.TRUE

    # Query verification from DB
    verifications = await service.repo.get_verifications_for_contract(contract.id)
    assert len(verifications) == 1
    assert verifications[0].status == "TRUE"
    assert verifications[0].contract_version_id == v2.id


# =========================================================================
# 8. REST API INTEGRATION TESTS
# =========================================================================

@pytest.mark.asyncio
async def test_contracts_api_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    user_a: User,
    auth_headers: dict,
    tenant_isolation_contract_raw,
):
    project = Project(
        id=uuid.uuid4(),
        name="API Contract Project",
        description="Testing contract API endpoints",
        repository_url="https://github.com/org/api-project",
        owner_id=user_a.id,
        environment="production",
    )
    db_session.add(project)
    await db_session.commit()

    # 1. Validate endpoint
    val_resp = await client.post(
        f"/api/v1/projects/{project.id}/contracts/validate",
        json={"definition": tenant_isolation_contract_raw},
        headers=auth_headers,
    )
    assert val_resp.status_code == 200
    assert val_resp.json()["valid"] is True

    # 2. Compile endpoint
    comp_resp = await client.post(
        f"/api/v1/projects/{project.id}/contracts/compile",
        json={"definition": tenant_isolation_contract_raw},
        headers=auth_headers,
    )
    assert comp_resp.status_code == 200
    assert comp_resp.json()["success"] is True
    assert len(comp_resp.json()["definition_hash"]) == 64

    # 3. Create Contract
    create_resp = await client.post(
        f"/api/v1/projects/{project.id}/contracts",
        json={
            "name": "Tenant Isolation",
            "description": "Tenant isolation invariant",
            "contract_key": "tenant-isolation",
            "definition": tenant_isolation_contract_raw,
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    contract_data = create_resp.json()
    contract_id = contract_data["id"]
    assert contract_data["contract_key"] == "tenant-isolation"
    assert contract_data["status"] == "DRAFT"

    # 4. List Contracts
    list_resp = await client.get(
        f"/api/v1/projects/{project.id}/contracts",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 5. Get Contract by ID
    get_resp = await client.get(
        f"/api/v1/contracts/{contract_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == contract_id

    # 6. Get Versions
    vers_resp = await client.get(
        f"/api/v1/contracts/{contract_id}/versions",
        headers=auth_headers,
    )
    assert vers_resp.status_code == 200
    assert len(vers_resp.json()) == 1
    version_id = vers_resp.json()[0]["id"]

    # 7. Activate Version
    act_resp = await client.post(
        f"/api/v1/contracts/{contract_id}/versions/{version_id}/activate",
        headers=auth_headers,
    )
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "ACTIVE"

    # 8. Controlled Test Evaluation through API
    eval_resp = await client.post(
        f"/api/v1/contracts/{contract_id}/versions/{version_id}/evaluate",
        json={
            "subject": {"tenant_id": "tenant-A"},
            "resource": {"tenant_id": "tenant-B"},
        },
        headers=auth_headers,
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["truth_value"] == "FALSE"
    assert eval_data["is_violated"] is True

    # 9. Get Violations
    viol_resp = await client.get(
        f"/api/v1/contracts/{contract_id}/violations",
        headers=auth_headers,
    )
    assert viol_resp.status_code == 200
    assert len(viol_resp.json()) == 1
    assert viol_resp.json()[0]["violation_type"] == "CROSS_TENANT_ACCESS"

    # 10. Get Verifications
    hist_resp = await client.get(
        f"/api/v1/contracts/{contract_id}/verifications",
        headers=auth_headers,
    )
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) == 1
    assert hist_resp.json()[0]["status"] == "FALSE"
