"""
Tests for CI/CD Pipeline API endpoints.
Validates /api/v1/cicd/summary, /api/v1/cicd/pipelines, /api/v1/cicd/runs/{id}, /api/v1/cicd/run, and /api/v1/cicd/workflow.
"""
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import get_current_user
from app.main import create_application
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="admin@kavachsecurity.me",
    password_hash="testhash",
    name="Mayur K.",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_cicd_endpoints():
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/cicd/summary?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc")
        assert resp.status_code == 200
        summary = resp.json()
        assert summary["total_pipelines"] == 42
        assert summary["successful_runs"] == 31
        assert summary["failed_runs"] == 8
        assert summary["running_runs"] == 3
        assert summary["avg_build_time_formatted"] == "6m 24s"
        assert summary["security_issues_count"] == 12
        assert len(summary["trend_series"]) == 8
        assert len(summary["status_breakdown"]) == 4
        assert len(summary["stage_averages"]) == 4
        assert len(summary["environments"]) == 4
        assert len(summary["integrations"]) == 7

        # 2. Pipelines List (Page 1)
        resp2 = await client.get("/api/v1/cicd/pipelines?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc&page=1&page_size=10")
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["total"] == 42
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["total_pages"] == 5

        # Check screenshot top rows
        first_item = data["items"][0]
        assert first_item["pipeline_name"] == "Build & Deploy"
        assert first_item["branch"] == "main"
        assert first_item["trigger"] == "Push"
        assert first_item["status"] == "Success"
        assert first_item["duration_formatted"] == "4m 32s"

        second_item = data["items"][1]
        assert second_item["pipeline_name"] == "PR Validation"
        assert second_item["status"] == "Failed"
        assert second_item["duration_formatted"] == "8m 21s"

        # 3. Pipeline Run Details
        run_id = first_item["id"]
        resp3 = await client.get(f"/api/v1/cicd/runs/{run_id}")
        assert resp3.status_code == 200
        detail = resp3.json()
        assert detail["id"] == run_id
        assert len(detail["stages"]) == 4

        # 4. Trigger Run
        resp4 = await client.post(
            "/api/v1/cicd/run",
            json={
                "repository_id": "0ece8aa7-2b82-4709-ad39-957d588d73cc",
                "pipeline_name": "Build & Deploy",
                "branch": "main",
                "environment": "Production",
            },
        )
        assert resp4.status_code == 202
        new_run = resp4.json()
        assert new_run["status"] == "Running"
        assert "run_id" in new_run

        # 5. Workflow YAML
        resp5 = await client.get("/api/v1/cicd/workflow?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc")
        assert resp5.status_code == 200
        wf = resp5.json()
        assert "actions/checkout@v4" in wf["content"]
