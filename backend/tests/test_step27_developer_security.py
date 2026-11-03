import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.cli_models import DeveloperDevice, RepositoryBinding, SecurityContextVersion
from app.models.policy import SecurityPolicy
from app.models.intent import Intent
from app.contracts.models import SecurityContract
import pytest_asyncio

@pytest_asyncio.fixture
async def cli_test_data(db_session: AsyncSession):
    user = User(email=f"cli_{uuid.uuid4()}@thing.local", password_hash="pw", name="Test User", is_active=True)
    db_session.add(user)
    await db_session.flush()
    
    project = Project(name="CLI Test Project", description="Test", owner_id=user.id)
    db_session.add(project)
    
    await db_session.flush()
    
    policy = SecurityPolicy(
        project_id=project.id,
        name="CLI Policy",
        created_by="system",
        description="test policy"
    )
    db_session.add(policy)
    
    intent = Intent(
        project_id=project.id,
        raw_input="CLI Intent"
    )
    db_session.add(intent)
    
    contract = SecurityContract(
        project_id=project.id,
        name="CLI Contract",
        description="CLI Contract Desc",
        contract_key="cli-contract-1",
        created_by="system"
    )
    db_session.add(contract)
    
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(project)
    return {"user": user, "project": project}


@pytest.mark.asyncio
async def test_cli_auth(client: AsyncClient, cli_test_data: dict, db_session: AsyncSession):
    # This expects a user to exist which we created above
    response = await client.post("/api/v1/cli/auth", json={
        "device_name": "TestDevice",
        "os_type": "LINUX"
    })
    assert response.status_code == 200
    data = response.json()
    assert "device_id" in data
    assert "token" in data
    
    device_id = data["device_id"]
    
    # Verify in DB
    result = await db_session.execute(select(DeveloperDevice).where(DeveloperDevice.id == uuid.UUID(device_id)))
    device = result.scalar_one_or_none()
    assert device is not None
    assert device.name == "TestDevice"


@pytest.mark.asyncio
async def test_cli_bind(client: AsyncClient, cli_test_data: dict, db_session: AsyncSession):
    # Auth first
    auth_resp = await client.post("/api/v1/cli/auth", json={
        "device_name": "TestDevice",
    })
    device_id = auth_resp.json()["device_id"]
    
    # Bind to project
    project = cli_test_data["project"]
    
    response = await client.post("/api/v1/cli/bind", json={
        "device_id": device_id,
        "project_id": str(project.id),
        "local_path_hash": "testhash123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "binding_id" in data
    
    binding_id = data["binding_id"]
    result = await db_session.execute(select(RepositoryBinding).where(RepositoryBinding.id == uuid.UUID(binding_id)))
    binding = result.scalar_one_or_none()
    assert binding is not None
    assert binding.local_path_hash == "testhash123"


@pytest.mark.asyncio
async def test_cli_context(client: AsyncClient, cli_test_data: dict):
    project = cli_test_data["project"]
    
    response = await client.get(f"/api/v1/cli/context/{project.id}")
    assert response.status_code == 200
    data = response.json()
    
    assert data["project_id"] == str(project.id)
    assert data["intent"]["raw_input"] == "CLI Intent"
    assert data["policy"]["default_action"] == "BLOCK"
    assert len(data["contracts"]) == 1
    assert data["contracts"][0]["name"] == "CLI Contract"
