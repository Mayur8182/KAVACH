import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.audit_event import AuditEvent
from app.models.project import Project
from app.models.user import User


# 1. Application Starts & OpenAPI Documentation
@pytest.mark.asyncio
async def test_application_starts_and_exposes_openapi(client: AsyncClient):
    """Verifies that the application starts, loads routes, and exposes OpenAPI schema."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/api/v1/projects" in schema["paths"]
    assert "/api/v1/agents" in schema["paths"]
    assert "/api/v1/audit-events" in schema["paths"]


# 2. Liveness Endpoint
@pytest.mark.asyncio
async def test_liveness_endpoint(client: AsyncClient):
    """Verifies that the process liveness probe returns HTTP 200 OK."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


# 3. Readiness Endpoint
@pytest.mark.asyncio
async def test_readiness_endpoint_structure(client: AsyncClient):
    """Verifies that the readiness probe returns dependency status."""
    response = await client.get("/api/v1/health/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "dependencies" in data
    assert "postgresql" in data["dependencies"]


# 4. Database Connectivity
@pytest.mark.asyncio
async def test_database_connectivity(db_session: AsyncSession):
    """Verifies direct execution of SQL statements against the persistence engine."""
    result = await db_session.execute(text("SELECT 1 AS alive"))
    assert result.scalar() == 1


# 5. User Registration & Persistence
@pytest.mark.asyncio
async def test_user_creation_and_persistence(client: AsyncClient, db_session: AsyncSession):
    """Verifies user creation via API and ensures real database persistence."""
    payload = {
        "email": "sarah.connor@cyberdyne.sec",
        "password": "StrongPassword987!",
        "name": "Sarah Connor",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    user_data = response.json()
    assert user_data["email"] == payload["email"]
    assert user_data["name"] == payload["name"]
    assert "id" in user_data

    # Query DB directly to verify persistence
    stmt = select(User).where(User.email == payload["email"])
    db_user = (await db_session.execute(stmt)).scalar_one_or_none()
    assert db_user is not None
    assert db_user.name == payload["name"]


# 6. Password Hashing (Argon2id)
@pytest.mark.asyncio
async def test_password_hashing_argon2id(client: AsyncClient, db_session: AsyncSession):
    """Verifies passwords are never stored in plaintext and use Argon2id format."""
    raw_password = "SuperSecretPlainTextPassword123!"
    payload = {
        "email": "hashing.test@control.sec",
        "password": raw_password,
        "name": "Hash Verifier",
    }
    await client.post("/api/v1/auth/register", json=payload)

    stmt = select(User).where(User.email == payload["email"])
    db_user = (await db_session.execute(stmt)).scalar_one()

    # Must NOT be plaintext
    assert db_user.password_hash != raw_password
    # Must be valid Argon2id hash format
    assert db_user.password_hash.startswith("$argon2id$")
    assert verify_password(raw_password, db_user.password_hash) is True


# 7. Project Creation
@pytest.mark.asyncio
async def test_project_creation(client: AsyncClient, token_user_a: str, user_a: User, db_session: AsyncSession):
    """Verifies that a project is validated, bound to owner, committed, and returns persisted record."""
    payload = {
        "name": "Payment Gateway API",
        "description": "Critical Stripe and ledger processing service",
        "primary_language": "python",
        "framework": "fastapi",
        "database_type": "postgresql",
        "cloud_provider": "aws",
        "environment": "production",
        "application_type": "payment_api",
    }
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = await client.post("/api/v1/projects", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["owner_id"] == str(user_a.id)
    assert data["environment"] == "production"

    # Verify persisted in database
    project_id = uuid.UUID(data["id"])
    stmt = select(Project).where(Project.id == project_id)
    persisted = (await db_session.execute(stmt)).scalar_one_or_none()
    assert persisted is not None
    assert persisted.name == payload["name"]


# 8. Project Retrieval
@pytest.mark.asyncio
async def test_project_retrieval(client: AsyncClient, token_user_a: str):
    """Verifies project retrieval by ID and listing."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    # Create project
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "Auth Service", "application_type": "microservice"},
        headers=headers,
    )
    project_id = create_res.json()["id"]

    # Get single project
    get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # List projects
    list_res = await client.get("/api/v1/projects", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == project_id for p in projects)


# 9. Project Update
@pytest.mark.asyncio
async def test_project_update(client: AsyncClient, token_user_a: str, db_session: AsyncSession):
    """Verifies project metadata updates in PostgreSQL."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "Initial Name", "environment": "development"},
        headers=headers,
    )
    project_id = create_res.json()["id"]

    # Update
    patch_res = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Hardened Production Name", "environment": "production"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["name"] == "Hardened Production Name"
    assert data["environment"] == "production"


# 10. Project Deletion (Soft Delete Strategy)
@pytest.mark.asyncio
async def test_project_deletion(client: AsyncClient, token_user_a: str, db_session: AsyncSession):
    """Verifies consistent soft-deletion strategy and audit preservation."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "To Be Deleted"},
        headers=headers,
    )
    project_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_at"] is not None

    # Subsequent GET returns 404
    get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert get_res.status_code == 404


# 11. Agent Creation
@pytest.mark.asyncio
async def test_agent_creation(client: AsyncClient, token_user_a: str):
    """Verifies that an agent is bound to a validated project and persisted."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    project_res = await client.post(
        "/api/v1/projects",
        json={"name": "Agent Host Project"},
        headers=headers,
    )
    project_id = project_res.json()["id"]

    agent_payload = {
        "project_id": project_id,
        "name": "cursor-coding-agent",
        "agent_type": "coding_assistant",
        "description": "Autonomous development agent",
        "trust_level": "restricted",
    }
    agent_res = await client.post("/api/v1/agents", json=agent_payload, headers=headers)
    assert agent_res.status_code == 201
    agent_data = agent_res.json()
    assert agent_data["name"] == agent_payload["name"]
    assert agent_data["project_id"] == project_id


# 12. Agent Retrieval
@pytest.mark.asyncio
async def test_agent_retrieval(client: AsyncClient, token_user_a: str):
    """Verifies agent retrieval by ID and by project query."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    project_res = await client.post(
        "/api/v1/projects",
        json={"name": "Agent Query Project"},
        headers=headers,
    )
    project_id = project_res.json()["id"]

    create_res = await client.post(
        "/api/v1/agents",
        json={"project_id": project_id, "name": "scanner-agent"},
        headers=headers,
    )
    agent_id = create_res.json()["id"]

    # Retrieve single agent
    get_res = await client.get(f"/api/v1/agents/{agent_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == agent_id

    # List agents by project
    list_res = await client.get(f"/api/v1/agents?project_id={project_id}", headers=headers)
    assert list_res.status_code == 200
    assert any(a["id"] == agent_id for a in list_res.json())


# 13. Audit Event Creation
@pytest.mark.asyncio
async def test_audit_event_creation(client: AsyncClient, token_user_a: str, db_session: AsyncSession):
    """Verifies that important operations automatically persist audit events."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    # Create project
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "Audit Tracked Project"},
        headers=headers,
    )
    project_id = proj_res.json()["id"]

    # Verify PROJECT_CREATED event in DB
    stmt = select(AuditEvent).where(AuditEvent.action == "PROJECT_CREATED")
    events = (await db_session.execute(stmt)).scalars().all()
    assert len(events) >= 1
    assert any(e.resource_id == project_id for e in events)


# 14. Ownership Enforcement
@pytest.mark.asyncio
async def test_ownership_enforcement(client: AsyncClient, token_user_a: str, token_user_b: str):
    """Verifies that User B cannot access User A's project (returns 403 Forbidden)."""
    # User A creates project
    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    create_res = await client.post(
        "/api/v1/projects",
        json={"name": "User A Top Secret Project"},
        headers=headers_a,
    )
    project_id = create_res.json()["id"]

    # User B attempts to access User A's project
    headers_b = {"Authorization": f"Bearer {token_user_b}"}
    unauth_get = await client.get(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert unauth_get.status_code == 403
    assert "authorization" in unauth_get.json()["error"]["message"].lower()

    # User B attempts to modify User A's project
    unauth_patch = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Malicious Hijack"},
        headers=headers_b,
    )
    assert unauth_patch.status_code == 403

    # User B attempts to delete User A's project
    unauth_del = await client.delete(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert unauth_del.status_code == 403


# 15. Invalid Input
@pytest.mark.asyncio
async def test_invalid_input_validation(client: AsyncClient, token_user_a: str):
    """Verifies that malformed payloads return 422 Unprocessable Entity."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    # Name is empty string (min_length=1)
    response = await client.post("/api/v1/projects", json={"name": ""}, headers=headers)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# 16. Nonexistent Resource
@pytest.mark.asyncio
async def test_nonexistent_resource_returns_404(client: AsyncClient, token_user_a: str):
    """Verifies that requesting an unknown UUID returns 404 Not Found."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    random_uuid = str(uuid.uuid4())
    response = await client.get(f"/api/v1/projects/{random_uuid}", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "HTTP_404"


# 17. Database Unavailable Behavior
@pytest.mark.asyncio
async def test_database_unavailable_returns_503(client: AsyncClient):
    """Verifies that readiness probe returns 503 when database check fails."""
    from unittest.mock import AsyncMock, patch
    with patch("app.api.v1.health.check_database_connection", new_callable=AsyncMock) as mock_ping:
        mock_ping.return_value = {
            "healthy": False,
            "latency_ms": 1.0,
            "details": "Connection refused to PostgreSQL",
        }
        res = await client.get("/api/v1/health/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "not_ready"
        assert data["dependencies"]["postgresql"]["status"] == "unhealthy"


# 18. Unauthorized Access
@pytest.mark.asyncio
async def test_unauthorized_access_rejected(client: AsyncClient):
    """Verifies that accessing protected endpoints without Bearer token returns 401 Unauthorized."""
    # Attempting to list projects without token
    res = await client.get("/api/v1/projects")
    assert res.status_code == 401

    # Attempting to create project without token
    create_res = await client.post("/api/v1/projects", json={"name": "No Auth"})
    assert create_res.status_code == 401
