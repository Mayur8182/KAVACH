import pytest
import uuid
from httpx import AsyncClient
from app.models.organization import Organization, Workspace
from app.models.invitation import OrganizationMember
from app.models.project import Project
from app.models.github import GitHubRepository
from app.models.audit_event import AuditEvent

@pytest.mark.asyncio
async def test_workspace_hierarchy_complete_flow(client: AsyncClient, token_user_a: str, user_a, db_session):
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Fetch workspaces - ensure personal workspace is auto-created
    resp = await client.get("/api/v1/workspaces", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "personal" in data
    assert len(data["personal"]) >= 1
    assert data["personal"][0]["workspace_type"] == "PERSONAL"
    personal_ws_id = data["personal"][0]["id"]

    # 2. Create an Organization Workspace
    # First create an organization for user_a
    org = Organization(
        id=uuid.uuid4(),
        name="ADIT Projects Org",
        slug="adit-projects-org",
        description="Engineering and Security research org"
    )
    db_session.add(org)
    await db_session.flush()

    member = OrganizationMember(
        id=uuid.uuid4(),
        organization_id=org.id,
        user_id=user_a.id,
        role="admin"
    )
    db_session.add(member)
    await db_session.commit()

    create_ws_payload = {
        "name": "Research & ML Security",
        "description": "AI security and ML pipeline hardening",
        "workspace_type": "ORGANIZATION",
        "organization_id": str(org.id),
        "visibility": "INTERNAL",
        "default_branch": "develop"
    }
    resp = await client.post("/api/v1/workspaces", json=create_ws_payload, headers=headers)
    assert resp.status_code == 201, resp.text
    created_ws = resp.json()
    assert created_ws["name"] == "Research & ML Security"
    assert created_ws["workspace_type"] == "ORGANIZATION"
    assert created_ws["organization_id"] == str(org.id)
    org_ws_id = created_ws["id"]

    # 3. Create Project inside the Workspace
    proj_payload = {
        "name": "Kavach Platform Core",
        "description": "Deterministic Defense Engine",
        "slug": "kavach-platform-core"
    }
    resp = await client.post(f"/api/v1/workspaces/{org_ws_id}/projects", json=proj_payload, headers=headers)
    assert resp.status_code == 201, resp.text
    created_proj = resp.json()
    assert created_proj["name"] == "Kavach Platform Core"
    assert created_proj["workspace_id"] == org_ws_id
    proj_id = created_proj["id"]

    # 4. Connect / Assign Repository to Workspace
    repo = GitHubRepository(
        id=uuid.uuid4(),
        owner="Mayur8182",
        name="kavach-core",
        full_name="Mayur8182/kavach-core",
        html_url="https://github.com/Mayur8182/kavach-core",
        github_repository_id=987654321,
        project_id=uuid.UUID(proj_id),
        workspace_id=uuid.UUID(org_ws_id),
        default_branch="develop",
        private=True,
    )
    db_session.add(repo)
    await db_session.commit()

    # 5. Verify Workspace Detail & Dynamic Counts
    resp = await client.get(f"/api/v1/workspaces/{org_ws_id}", headers=headers)
    assert resp.status_code == 200
    ws_detail = resp.json()
    assert ws_detail["project_count"] == 1
    assert ws_detail["repository_count"] == 1

    # 6. Verify Workspace Projects and Repositories Endpoints
    resp = await client.get(f"/api/v1/workspaces/{org_ws_id}/projects", headers=headers)
    assert resp.status_code == 200
    projects_list = resp.json()
    assert len(projects_list) == 1
    assert projects_list[0]["name"] == "Kavach Platform Core"

    resp = await client.get(f"/api/v1/workspaces/{org_ws_id}/repositories", headers=headers)
    assert resp.status_code == 200
    repos_list = resp.json()
    assert len(repos_list) == 1
    assert repos_list[0]["name"] == "kavach-core"

    # 7. Update Workspace Settings
    patch_payload = {
        "name": "Research & AI Defense",
        "description": "Updated description",
        "default_branch": "main"
    }
    resp = await client.patch(f"/api/v1/workspaces/{org_ws_id}", json=patch_payload, headers=headers)
    assert resp.status_code == 200
    updated_ws = resp.json()
    assert updated_ws["name"] == "Research & AI Defense"
    assert updated_ws["default_branch"] == "main"

    # 8. Check Organization Overview metrics & real activity stream
    resp = await client.get(f"/api/v1/organizations/{org.id}/overview", headers=headers)
    assert resp.status_code == 200
    overview = resp.json()
    assert overview["workspaces_count"] >= 1
    assert overview["projects_count"] >= 1
    assert overview["repositories_count"] >= 1
    assert overview["members_count"] >= 1
    assert len(overview["workspaces"]) >= 1
    assert len(overview["recent_activity"]) >= 1

    # 9. Verify Safe Workspace Deletion
    del_resp = await client.delete(f"/api/v1/workspaces/{org_ws_id}", headers=headers)
    assert del_resp.status_code == 200
    del_data = del_resp.json()
    assert del_data["status"] == "DELETED"

    # Verify it is deleted from list
    get_del = await client.get(f"/api/v1/workspaces/{org_ws_id}", headers=headers)
    assert get_del.status_code == 404

@pytest.mark.asyncio
async def test_workspace_isolation_between_users(client: AsyncClient, token_user_a: str, token_user_b: str, user_a, user_b, db_session):
    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    # User A creates a personal workspace
    resp = await client.get("/api/v1/workspaces", headers=headers_a)
    assert resp.status_code == 200
    ws_a_id = resp.json()["personal"][0]["id"]

    # User B should NOT be able to access or patch User A's personal workspace
    resp_b_access = await client.get(f"/api/v1/workspaces/{ws_a_id}", headers=headers_b)
    assert resp_b_access.status_code in [403, 404]

    resp_b_patch = await client.patch(f"/api/v1/workspaces/{ws_a_id}", json={"name": "Hacked Name"}, headers=headers_b)
    assert resp_b_patch.status_code in [403, 404]

    resp_b_delete = await client.delete(f"/api/v1/workspaces/{ws_a_id}", headers=headers_b)
    assert resp_b_delete.status_code in [403, 404]
