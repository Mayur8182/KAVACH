import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.intent.engine import IntentEngine
from app.engines.intent.models import ApplicationTypeEnum, NormalizedIntent
from app.models.audit_event import AuditEvent
from app.models.intent import Intent
from app.models.project import Project
from app.models.user import User


# 1. Engine Core Test: Payment API Natural-Language Understanding
@pytest.mark.asyncio
async def test_intent_understanding_payment_api_characteristics():
    """
    Verifies that the Intent Engine converts raw developer description into
    normalized application intent without generating security controls.
    """
    raw_prompt = (
        "Build a payment API using FastAPI and PostgreSQL. "
        "Users should be able to create payments and receive Stripe webhook events. "
        "Deploy it to AWS production."
    )
    engine = IntentEngine()
    normalized: NormalizedIntent = await engine.understand(raw_prompt)

    # Raw input must be preserved verbatim
    assert normalized.raw_input == raw_prompt

    # Application type classification
    assert normalized.application_type == ApplicationTypeEnum.PAYMENT_API.value
    assert normalized.overall_confidence >= 0.85

    # Technologies extracted without inventing versions
    tech_map = {t.name: t for t in normalized.technologies}
    assert "FastAPI" in tech_map
    assert tech_map["FastAPI"].category == "FRAMEWORK"
    assert tech_map["FastAPI"].version is None  # Never assume version!

    assert "PostgreSQL" in tech_map
    assert tech_map["PostgreSQL"].category == "DATABASE"
    assert tech_map["PostgreSQL"].version is None

    assert "AWS" in tech_map
    assert tech_map["AWS"].category == "CLOUD"

    # Interfaces
    interface_types = [i.type for i in normalized.interfaces]
    assert "REST_API" in interface_types
    assert "WEBHOOK" in interface_types

    # External services (must be marked INTENDED_INTEGRATION, never claimed verified)
    ext_services = {s.name: s for s in normalized.external_services}
    assert "Stripe" in ext_services
    assert ext_services["Stripe"].status == "INTENDED_INTEGRATION"
    assert ext_services["Stripe"].direction in ["BIDIRECTIONAL", "INBOUND"]

    # Data domains
    domain_names = [d.domain for d in normalized.data_domains]
    assert "PAYMENT_DATA" in domain_names
    assert "USER_DATA" in domain_names

    # Actors
    actor_names = [a.name for a in normalized.actors]
    assert any("Stripe" in name for name in actor_names)
    assert any("Customer" in name or "User" in name for name in actor_names)

    # Workflows
    workflow_names = [w.name for w in normalized.workflows]
    assert "CREATE_PAYMENT" in workflow_names or "PAYMENT_WEBHOOK_PROCESSING" in workflow_names

    # Deployment context
    assert normalized.deployment_context.cloud_provider == "AWS"
    assert normalized.deployment_context.environment == "production"

    # Trust boundaries
    boundary_types = [b.boundary_type for b in normalized.trust_boundaries]
    assert "UNTRUSTED_TO_TRUSTED" in boundary_types
    assert "APP_TO_DATA_STORE" in boundary_types
    assert "INTERNAL_TO_EXTERNAL_SERVICE" in boundary_types

    # Evidence tracking exists
    assert len(normalized.evidence) > 0


# 2. Ambiguity & Missing Information Detection
@pytest.mark.asyncio
async def test_ambiguity_detection_for_underspecified_prompt():
    """
    Verifies that the Intent Engine identifies missing information (e.g. no auth, no DB specified)
    instead of silently fabricating assumptions.
    """
    vague_prompt = "Build a microservice for processing analytics events."
    engine = IntentEngine()
    normalized = await engine.understand(vague_prompt)

    # Must detect missing authentication and missing database
    assert len(normalized.ambiguities) >= 1
    ambiguity_fields = [a.field for a in normalized.ambiguities]
    assert "authentication" in ambiguity_fields or "database_type" in ambiguity_fields
    assert len(normalized.missing_information) >= 1


# 3. Intent Submission API with Raw Input Preservation & Audit Persistence
@pytest.mark.asyncio
async def test_intent_api_submission_and_persistence(
    client: AsyncClient,
    token_user_a: str,
    user_a: User,
    db_session: AsyncSession,
):
    """
    Verifies POST /api/v1/intents:
    1. Validates project existence
    2. Runs intent analysis
    3. Preserves exact raw input
    4. Persists record in PostgreSQL
    5. Records INTENT_ANALYZED audit event
    """
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Create target project
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "E-Commerce Checkout", "application_type": "web_service"},
        headers=headers,
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Submit raw intent
    raw_description = "Build a checkout and payment API using FastAPI, PostgreSQL, and Stripe."
    intent_payload = {
        "project_id": project_id,
        "description": raw_description,
        "environment": "production",
    }
    res = await client.post("/api/v1/intents", json=intent_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert data["project_id"] == project_id
    assert data["raw_input"] == raw_description  # Exact raw input preserved
    assert data["application_type"] == "PAYMENT_API"
    assert data["status"] == "ANALYZED"
    assert "normalized_intent" in data
    assert data["normalized_intent"]["raw_input"] == raw_description

    intent_id = uuid.UUID(data["id"])

    # 3. Verify real database persistence
    stmt = select(Intent).where(Intent.id == intent_id)
    persisted_intent = (await db_session.execute(stmt)).scalar_one_or_none()
    assert persisted_intent is not None
    assert persisted_intent.raw_input == raw_description
    assert persisted_intent.application_type == "PAYMENT_API"

    # 4. Verify INTENT_ANALYZED audit event was created
    audit_stmt = select(AuditEvent).where(
        AuditEvent.action == "INTENT_ANALYZED",
        AuditEvent.project_id == uuid.UUID(project_id),
    )
    audit_event = (await db_session.execute(audit_stmt)).scalar_one_or_none()
    assert audit_event is not None
    assert audit_event.status == "SUCCESS"
    assert audit_event.resource_id == str(intent_id)


# 4. Intent Retrieval & Project Intent History
@pytest.mark.asyncio
async def test_get_intent_by_id_and_project_list(
    client: AsyncClient,
    token_user_a: str,
):
    """Verifies GET /api/v1/intents/{id} and GET /api/v1/intents/project/{project_id}."""
    headers = {"Authorization": f"Bearer {token_user_a}"}

    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "Auth Hub"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    submit_res = await client.post(
        "/api/v1/intents",
        json={
            "project_id": project_id,
            "description": "Build an authentication service using FastAPI and Redis for session tokens.",
        },
        headers=headers,
    )
    intent_id = submit_res.json()["id"]

    # Retrieve single intent
    get_res = await client.get(f"/api/v1/intents/{intent_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == intent_id
    assert get_res.json()["application_type"] == "AUTHENTICATION_SERVICE"

    # List intents for project
    list_res = await client.get(f"/api/v1/intents/project/{project_id}", headers=headers)
    assert list_res.status_code == 200
    intents = list_res.json()
    assert len(intents) >= 1
    assert intents[0]["id"] == intent_id


# 5. Ownership Enforcement on Intents
@pytest.mark.asyncio
async def test_intent_ownership_enforcement(
    client: AsyncClient,
    token_user_a: str,
    token_user_b: str,
):
    """Verifies that User B cannot submit or view an intent for User A's project (403 Forbidden)."""
    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    # User A creates project
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "User A Private Core"},
        headers=headers_a,
    )
    project_id = proj_res.json()["id"]

    # User B attempts to submit intent to User A's project -> 403 Forbidden
    unauth_submit = await client.post(
        "/api/v1/intents",
        json={
            "project_id": project_id,
            "description": "Malicious intent submission against another user project.",
        },
        headers=headers_b,
    )
    assert unauth_submit.status_code == 403
    assert "authorization" in unauth_submit.json()["error"]["message"].lower()


# 6. Invalid Input Validation
@pytest.mark.asyncio
async def test_intent_invalid_input(client: AsyncClient, token_user_a: str):
    """Verifies that empty or too short intent description returns 422 Unprocessable Entity."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    proj_res = await client.post("/api/v1/projects", json={"name": "Test Input"}, headers=headers)
    project_id = proj_res.json()["id"]

    # Description is too short (< 5 chars)
    res = await client.post(
        "/api/v1/intents",
        json={"project_id": project_id, "description": "hi"},
        headers=headers,
    )
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
