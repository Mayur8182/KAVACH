"""
Unit and Integration Tests for CI/CD All Tabs & Actions:
- Summary & Metrics
- Pipelines Table & Detail with Stages, Artifacts, Logs
- Create Pipeline Mutation
- Environments Posture, Trend, and Deploy Mutation
- Integrations List, Test Connection, and Sync Now Mutations
- Templates Grid, Filters, and Use Template Mutation
"""
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.security import get_current_user
from app.models.user import User

test_user = User(
    id=uuid.uuid4(),
    email="admin@seculayer.com",
    name="Mayur K.",
    password_hash="testhash",
    is_active=True,
    is_superuser=True,
)

@pytest.mark.asyncio
async def test_cicd_all_tabs_and_actions():
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/cicd/summary?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc")
        assert resp.status_code == 200
        summary = resp.json()
        assert summary["total_pipelines"] >= 42
        assert summary["avg_build_time_seconds"] > 0
        assert "m " in summary["avg_build_time_formatted"]
        assert summary["security_issues_count"] >= 12

        # 2. Pipelines List
        p_resp = await client.get("/api/v1/cicd/pipelines?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc&page=1&page_size=10")
        assert p_resp.status_code == 200
        p_data = p_resp.json()
        assert len(p_data["items"]) == 10
        first_run_id = p_data["items"][0]["id"]

        # 3. Create Pipeline (+ New Pipeline button)
        cp_resp = await client.post("/api/v1/cicd/pipelines", json={
            "repository_id": "0ece8aa7-2b82-4709-ad39-957d588d73cc",
            "name": "Integration Test Pipeline",
            "workflow_file": ".github/workflows/test.yml",
            "default_branch": "main",
            "description": "Test created pipeline"
        })
        assert cp_resp.status_code == 201

        # 4. Pipeline Run Detail with Stages, Artifacts, Logs
        rd_resp = await client.get(f"/api/v1/cicd/runs/{first_run_id}/detail")
        assert rd_resp.status_code == 200
        rd_data = rd_resp.json()
        assert "stages" in rd_data
        assert "artifacts" in rd_data
        assert len(rd_data["artifacts"]) >= 3
        assert "logs" in rd_data

        # 5. Environments Overview
        env_resp = await client.get("/api/v1/cicd/environments?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc")
        assert env_resp.status_code == 200
        env_data = env_resp.json()
        assert env_data["total_environments"] >= 4
        assert env_data["healthy_count"] >= 2
        assert len(env_data["trend_series"]) == 8
        first_env_id = env_data["environments"][0]["id"]

        # 6. Deploy Environment
        dep_resp = await client.post(f"/api/v1/cicd/environments/{first_env_id}/deploy", json={
            "environment_id": first_env_id,
            "version": "v1.2.4",
            "branch": "main"
        })
        assert dep_resp.status_code == 200
        assert dep_resp.json()["status"] == "Healthy"

        # 7. Integrations Overview
        int_resp = await client.get("/api/v1/cicd/integrations")
        assert int_resp.status_code == 200
        int_data = int_resp.json()
        assert int_data["total_connected"] >= 8
        assert int_data["total_webhooks"] == 6
        assert len(int_data["integrations"]) >= 8
        first_int_id = int_data["integrations"][0]["id"]

        # 8. Test Integration Button
        test_resp = await client.post(f"/api/v1/cicd/integrations/{first_int_id}/test")
        assert test_resp.status_code == 200
        assert test_resp.json()["status"] == "Healthy"
        assert test_resp.json()["latency_ms"] > 0

        # 9. Sync Integration Button
        sync_resp = await client.post(f"/api/v1/cicd/integrations/{first_int_id}/sync")
        assert sync_resp.status_code == 200
        assert sync_resp.json()["status"] == "Success"

        # 10. Templates Overview
        tmpl_resp = await client.get("/api/v1/cicd/templates?page=1&page_size=9")
        assert tmpl_resp.status_code == 200
        tmpl_data = tmpl_resp.json()
        assert tmpl_data["total_templates"] >= 24
        assert tmpl_data["official_count"] == 12
        assert tmpl_data["popular_template_slug"] == "nextjs-ci"
        assert len(tmpl_data["templates"]) == 9
        first_tmpl_id = tmpl_data["templates"][0]["id"]

        # 11. Use Template Action
        use_resp = await client.post("/api/v1/cicd/templates/use", json={
            "template_id": first_tmpl_id,
            "repository_id": "0ece8aa7-2b82-4709-ad39-957d588d73cc",
            "pipeline_name": "Next.js App Deployment",
            "branch": "main"
        })
        assert use_resp.status_code == 200
        assert use_resp.json()["status"] == "Created"

        # 12. Jobs Tab Overview & Metrics (media_1790776638589.jpg)
        jobs_resp = await client.get("/api/v1/cicd/jobs?page=1&page_size=10")
        assert jobs_resp.status_code == 200
        jobs_data = jobs_resp.json()
        assert jobs_data["total_jobs"] == 126
        assert jobs_data["successful_jobs"] == 98
        assert jobs_data["failed_jobs"] == 14
        assert jobs_data["running_jobs"] == 5
        assert jobs_data["blocked_jobs"] == 9
        assert jobs_data["avg_duration_formatted"] == "2m 48s"
        assert len(jobs_data["items"]) == 10
        assert jobs_data["selected_job"] is not None
        assert jobs_data["selected_job"]["job_name"] == "security-scan"
        assert jobs_data["selected_job"]["status"] == "Failed"
        assert "SAST scan found" in jobs_data["selected_job"]["failure_reason"]

        # 13. Re-run Job Action
        first_job_id = jobs_data["items"][0]["id"]
        rerun_job_resp = await client.post(f"/api/v1/cicd/jobs/{first_job_id}/rerun")
        assert rerun_job_resp.status_code == 200
        assert rerun_job_resp.json()["status"] == "Running"

        # 14. Pipeline Runs Overview & Metrics (media_1790776607666.jpg)
        runs_ov_resp = await client.get("/api/v1/cicd/runs/overview?page=1&page_size=10")
        assert runs_ov_resp.status_code == 200
        runs_ov_data = runs_ov_resp.json()
        assert runs_ov_data["total_runs"] == 42
        assert runs_ov_data["successful_runs"] == 31
        assert runs_ov_data["failed_runs"] == 8
        assert runs_ov_data["running_runs"] == 3
        assert runs_ov_data["avg_build_time_formatted"] == "6m 24s"
        assert runs_ov_data["security_issues_count"] == 12
        assert len(runs_ov_data["runs"]) == 10
        assert runs_ov_data["active_run"] is not None
        assert len(runs_ov_data["active_run"]["stages"]) >= 6

        # 15. Workflow Editor Config & Save (media_1790776541488.png)
        wf_resp = await client.get("/api/v1/cicd/workflow/config")
        assert wf_resp.status_code == 200
        wf_data = wf_resp.json()
        assert len(wf_data["steps"]) == 8
        assert wf_data["name"] == "CI/CD Pipeline"
        assert wf_data["node_version"] == "20"
        assert wf_data["deployment_target"] == "Vercel"
        assert "name: CI/CD Pipeline" in wf_data["workflow_yaml"]

        save_wf_resp = await client.post("/api/v1/cicd/workflow/save", json={
            "repository_id": "0ece8aa7-2b82-4709-ad39-957d588d73cc",
            "name": "CI/CD Pipeline",
            "description": "Build, test, scan and deploy the frontend application",
            "workflow_yaml": wf_data["workflow_yaml"],
            "node_version": "20",
            "build_command": "npm run build",
            "test_command": "npm test -- --coverage",
            "deployment_target": "Vercel",
            "deploy_to_production": True,
        })
        assert save_wf_resp.status_code == 200
        assert save_wf_resp.json()["status"] == "Saved"

    app.dependency_overrides.clear()

