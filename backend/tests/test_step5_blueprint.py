import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.engines.blueprint.engine import blueprint_engine
from app.engines.intent.models import (
    Actor,
    DeploymentContext,
    ExternalService,
    Interface,
    NormalizedIntent,
    StateChange,
    Technology,
    DataDomain,
)


@pytest.mark.asyncio
async def test_blueprint_engine_simple_api_negative_requirements():
    """
    Test 1: Simple REST API + FastAPI + PostgreSQL.
    Verify:
    1. Appropriate API and database requirements appear.
    2. Negative requirements are respected: NO payment, webhook, or kubernetes requirements appear!
    """
    simple_intent = NormalizedIntent(
        raw_input="Build a simple read-only book catalog REST API using FastAPI and PostgreSQL",
        purpose="Book catalog query service",
        application_type="REST_API",
        actors=[],
        workflows=[],
        interfaces=[
            Interface(type="REST_API", description="Public catalog endpoints", confidence=1.0)
        ],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
            Technology(name="FastAPI", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
        ],
        data_domains=[
            DataDomain(domain="PUBLIC_DATA", description="Book titles and authors", confidence=1.0)
        ],
        external_services=[],
        deployment_context=DeploymentContext(environment="development"),
        state_changes=[],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )

    result = blueprint_engine.generate_blueprint(simple_intent)
    req_keys = {r.requirement_key for r in result.requirements}

    # Positives
    assert "INPUT_VALIDATION_REQUIRED" in req_keys
    assert "RATE_LIMITING_REQUIRED" in req_keys
    assert "SECURE_DATABASE_ACCESS_REQUIRED" in req_keys

    # Negatives (Crucial Architectural Golden Rule)
    assert "PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED" not in req_keys, "Payment requirement generated without payment intent!"
    assert "PAYMENT_AUDIT_TRAIL_REQUIRED" not in req_keys
    assert "WEBHOOK_AUTHENTICITY_REQUIRED" not in req_keys, "Webhook requirement generated without webhook interface!"
    assert "WEBHOOK_REPLAY_PROTECTION_REQUIRED" not in req_keys
    assert "KUBERNETES_RBAC_REQUIRED" not in req_keys, "Kubernetes RBAC requirement generated without k8s technology!"
    assert "CONTAINER_HARDENING_REQUIRED" not in req_keys
    assert "AI_AGENT_IDENTITY_REQUIRED" not in req_keys

    # Verify risk factors
    assert "INTERNET_EXPOSED" in result.risk_factors
    assert "FINANCIAL_DATA" not in result.risk_factors
    assert "EXTERNAL_WEBHOOK" not in result.risk_factors


@pytest.mark.asyncio
async def test_blueprint_engine_payment_api():
    """
    Test 2: Payment API with Stripe, Webhooks, Financial Data, and State Mutation.
    Verify:
    1. Payment idempotency, audit trail, webhook authenticity, and secret protection appear.
    2. Evidence explicitly references the contributing intent facts.
    3. Invariants are defined.
    """
    payment_intent = NormalizedIntent(
        raw_input="Build a payment service integrating Stripe webhooks to charge customers and record payments in PostgreSQL",
        purpose="Payment processing and subscription billing",
        application_type="PAYMENT_API",
        actors=[
            Actor(id="act-1", name="Customer", type="CUSTOMER", description="End user paying", confidence=1.0),
            Actor(id="act-2", name="Stripe", type="WEBHOOK_PROVIDER", description="Payment gateway sending webhooks", confidence=1.0),
        ],
        workflows=[],
        interfaces=[
            Interface(type="REST_API", description="Payment submission API", confidence=1.0),
            Interface(type="WEBHOOK", description="Stripe webhook listener", confidence=1.0),
        ],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
            Technology(name="FastAPI", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
        ],
        data_domains=[
            DataDomain(domain="PAYMENT_DATA", description="Payment transactions and amounts", confidence=1.0),
            DataDomain(domain="ACCOUNT_DATA", description="Customer accounts", confidence=1.0),
        ],
        external_services=[
            ExternalService(name="Stripe", type="PAYMENT_GATEWAY", purpose="Payment execution", direction="BIDIRECTIONAL", confidence=1.0)
        ],
        deployment_context=DeploymentContext(environment="production"),
        state_changes=[
            StateChange(name="CREATE_PAYMENT", target_entity="Payment", description="Authorizes card and persists charge record", confidence=1.0)
        ],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.98,
    )

    result = blueprint_engine.generate_blueprint(payment_intent)
    req_by_key = {r.requirement_key: r for r in result.requirements}

    assert "PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED" in req_by_key
    assert "WEBHOOK_AUTHENTICITY_REQUIRED" in req_by_key
    assert "WEBHOOK_REPLAY_PROTECTION_REQUIRED" in req_by_key
    assert "SECRETS_PROTECTION_REQUIRED" in req_by_key
    assert "AUTHENTICATION_REQUIRED" in req_by_key
    assert "AUTHORIZATION_REQUIRED" in req_by_key
    assert "TRANSPORT_SECURITY_REQUIRED" in req_by_key

    # Check Idempotency properties
    idem_req = req_by_key["PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED"]
    assert idem_req.severity == "CRITICAL"
    assert idem_req.priority == "REQUIRED"
    assert idem_req.mandatory is True
    assert "INTEGRATION_TEST" in idem_req.verification_strategy
    assert idem_req.security_invariant is not None
    assert "idempotency_key" in idem_req.security_invariant

    # Check evidence traceability
    webhook_req = req_by_key["WEBHOOK_AUTHENTICITY_REQUIRED"]
    evidence_fields = {e.source_field for e in webhook_req.evidence}
    assert "interfaces" in evidence_fields

    # Check risk factors
    assert "FINANCIAL_DATA" in result.risk_factors
    assert "EXTERNAL_WEBHOOK" in result.risk_factors
    assert "PRODUCTION_ENVIRONMENT" in result.risk_factors


@pytest.mark.asyncio
async def test_blueprint_engine_admin_dashboard():
    """
    Test 3: Admin Dashboard with Privileged Operators and Role Boundaries.
    Verify administrative action authorization and audit logging.
    """
    admin_intent = NormalizedIntent(
        raw_input="Internal admin portal for system operators to suspend fraudulent users and inspect customer records",
        purpose="Administrative operations and moderation",
        application_type="ADMIN_DASHBOARD",
        actors=[
            Actor(id="act-admin", name="Operator", type="ADMIN", description="System administrator", confidence=1.0),
        ],
        workflows=[],
        interfaces=[
            Interface(type="WEB_UI", description="Internal management console", confidence=1.0)
        ],
        technologies=[
            Technology(name="React", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
        ],
        data_domains=[
            DataDomain(domain="USER_DATA", description="User profiles", confidence=1.0),
            DataDomain(domain="SECRETS", description="System configurations", confidence=1.0),
        ],
        external_services=[],
        deployment_context=DeploymentContext(environment="production"),
        state_changes=[
            StateChange(name="SUSPEND_USER", target_entity="User", description="Revokes account privileges", confidence=1.0)
        ],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )

    result = blueprint_engine.generate_blueprint(admin_intent)
    req_keys = {r.requirement_key for r in result.requirements}

    assert "ADMIN_ACTION_AUTHORIZATION_REQUIRED" in req_keys
    assert "AUDIT_LOGGING_REQUIRED" in req_keys
    assert "SESSION_SECURITY_REQUIRED" in req_keys
    assert "ADMIN_OPERATION" in result.risk_factors


@pytest.mark.asyncio
async def test_blueprint_engine_ai_agent_platform():
    """
    Test 4: AI Agent Platform with MCP tools.
    Verify AI agent identity and tool authorization gates are generated.
    """
    ai_intent = NormalizedIntent(
        raw_input="Autonomous AI coding agent that executes tools via MCP protocol to patch security bugs",
        purpose="Autonomous code remediation agent",
        application_type="AI_AGENT_PLATFORM",
        actors=[
            Actor(id="act-ai", name="RemediationAgent", type="AI_AGENT", description="Autonomous code fixer", confidence=1.0),
        ],
        workflows=[],
        interfaces=[
            Interface(type="MCP_TOOL", description="Model Context Protocol execution gateway", confidence=1.0)
        ],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
        ],
        data_domains=[
            DataDomain(domain="SOURCE_CODE", description="Customer source code repositories", confidence=1.0)
        ],
        external_services=[],
        deployment_context=DeploymentContext(environment="development"),
        state_changes=[],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )

    result = blueprint_engine.generate_blueprint(ai_intent)
    req_keys = {r.requirement_key for r in result.requirements}

    assert "AI_AGENT_IDENTITY_REQUIRED" in req_keys
    assert "AI_TOOL_AUTHORIZATION_REQUIRED" in req_keys
    assert "AI_AGENT" in result.risk_factors
    assert "EXTERNAL_TOOL" in result.risk_factors


@pytest.mark.asyncio
async def test_blueprint_api_generation_versioning_regeneration_comparison(
    client: AsyncClient,
    token_user_a: str,
):
    """
    Test 5: Full API lifecycle:
    1. Create Project
    2. Submit Intent
    3. Generate Blueprint v1 (verify status=GENERATED, requirements populated)
    4. Retrieve Blueprint by ID and Requirements list
    5. Regenerate Blueprint v2 (verify v2 created, v1 status becomes SUPERSEDED)
    6. Compare Blueprint v1 vs v2
    7. List project blueprints (returns v2, v1)
    """
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Create Project
    proj_res = await client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "Payment Gateway Project",
            "description": "Production billing service",
            "environment": "production",
            "application_type": "web_service",
        },
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Submit Intent
    intent_res = await client.post(
        "/api/v1/intents",
        headers=headers,
        json={
            "project_id": project_id,
            "description": "FastAPI service with Stripe webhooks processing customer card payments and storing invoices in PostgreSQL",
            "environment": "production",
        },
    )
    assert intent_res.status_code == 201
    intent_id = intent_res.json()["id"]

    # 3. Generate Blueprint v1
    gen_res = await client.post(
        f"/api/v1/projects/{project_id}/blueprints",
        headers=headers,
        json={"intent_id": intent_id},
    )
    assert gen_res.status_code == 201
    bp_v1 = gen_res.json()
    assert bp_v1["version"] == 1
    assert bp_v1["status"] == "GENERATED"
    assert bp_v1["methodology_version"] == "2026.1.0"
    assert bp_v1["requirement_count"] > 0
    assert len(bp_v1["requirements"]) == bp_v1["requirement_count"]

    # Verify initial requirement status is ACTIVE (never SATISFIED at step 5)
    for req in bp_v1["requirements"]:
        assert req["status"] == "ACTIVE"
        assert len(req["verification_strategy"]) > 0
        assert req["severity"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]

    bp_v1_id = bp_v1["id"]

    # 4. Retrieve Blueprint by ID
    get_res = await client.get(f"/api/v1/blueprints/{bp_v1_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == bp_v1_id

    # Retrieve Requirements directly
    reqs_res = await client.get(f"/api/v1/blueprints/{bp_v1_id}/requirements", headers=headers)
    assert reqs_res.status_code == 200
    assert len(reqs_res.json()) == bp_v1["requirement_count"]

    # 5. Regenerate Blueprint v2
    regen_res = await client.post(
        f"/api/v1/blueprints/{bp_v1_id}/regenerate",
        headers=headers,
        json={},
    )
    assert regen_res.status_code == 201
    bp_v2 = regen_res.json()
    assert bp_v2["version"] == 2
    assert bp_v2["status"] == "GENERATED"
    assert bp_v2["id"] != bp_v1_id
    bp_v2_id = bp_v2["id"]

    # Verify old blueprint v1 is now SUPERSEDED
    old_bp_res = await client.get(f"/api/v1/blueprints/{bp_v1_id}", headers=headers)
    assert old_bp_res.json()["status"] == "SUPERSEDED"

    # 6. Compare Blueprint v1 vs v2
    comp_res = await client.get(
        f"/api/v1/blueprints/compare?v1={bp_v1_id}&v2={bp_v2_id}",
        headers=headers,
    )
    assert comp_res.status_code == 200
    comparison = comp_res.json()
    assert comparison["blueprint_v1_version"] == 1
    assert comparison["blueprint_v2_version"] == 2
    assert comparison["unchanged_count"] == bp_v1["requirement_count"]
    assert len(comparison["added_requirements"]) == 0
    assert len(comparison["removed_requirements"]) == 0

    # 7. List Project Blueprints
    list_res = await client.get(f"/api/v1/projects/{project_id}/blueprints", headers=headers)
    assert list_res.status_code == 200
    bps = list_res.json()
    assert len(bps) == 2
    assert bps[0]["version"] == 2
    assert bps[1]["version"] == 1


@pytest.mark.asyncio
async def test_blueprint_ownership_enforcement(
    client: AsyncClient,
    token_user_a: str,
    token_user_b: str,
):
    """
    Test 6: Strict authorization and ownership checks:
    User B cannot view or regenerate User A's blueprint (403 Forbidden).
    """
    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    # User A creates project and intent
    proj_res = await client.post(
        "/api/v1/projects",
        headers=headers_a,
        json={
            "name": "Secret Project",
            "description": "User A project",
            "environment": "development",
        },
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    intent_res = await client.post(
        "/api/v1/intents",
        headers=headers_a,
        json={
            "project_id": project_id,
            "description": "FastAPI service with PostgreSQL",
        },
    )
    assert intent_res.status_code == 201

    gen_res = await client.post(
        f"/api/v1/projects/{project_id}/blueprints",
        headers=headers_a,
        json={},
    )
    assert gen_res.status_code == 201
    blueprint_id = gen_res.json()["id"]

    # User B attempts to access User A's blueprint -> 403 Forbidden
    view_res = await client.get(
        f"/api/v1/blueprints/{blueprint_id}",
        headers=headers_b,
    )
    assert view_res.status_code == 403

    # User B attempts to generate blueprint for User A's project -> 403 Forbidden
    unauth_gen = await client.post(
        f"/api/v1/projects/{project_id}/blueprints",
        headers=headers_b,
        json={},
    )
    assert unauth_gen.status_code == 403
