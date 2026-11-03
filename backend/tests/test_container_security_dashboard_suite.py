import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from app.main import create_application
from app.core.security import get_current_user
from app.core.database import engine
from app.models import Base
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="security-lead@thing.local",
    password_hash="testhash",
    name="Mayur B.",
    is_active=True,
    is_superuser=True,
)


@pytest_asyncio.fixture(autouse=True)
async def ensure_tables():
    """Ensure database schema tables and columns are migrated in the test engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col, col_type in [
            ("registry_type", "VARCHAR(50) DEFAULT 'Cloud'"),
            ("images_count", "INTEGER DEFAULT 0"),
            ("repositories_count", "INTEGER DEFAULT 0"),
            ("last_synced_at", "DATETIME"),
            ("sync_status", "VARCHAR(50) DEFAULT 'Connected'"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE container_registries ADD COLUMN {col} {col_type}"))
            except Exception:
                pass


@pytest.mark.asyncio
async def test_module_a_dockerfiles_security_suite():
    """Verify Module A: Dockerfile & Build Security endpoints and data provenance."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/containers/dockerfiles/summary")
        assert resp.status_code == 200, f"Summary failed: {resp.text}"
        summary = resp.json()
        assert summary["scanned_dockerfiles"] >= 1
        assert "dockerfiles_with_issues" in summary
        assert "critical_count" in summary
        assert "high_count" in summary
        assert "best_practice_compliance_pct" in summary

        # 2. Charts
        resp_charts = await client.get("/api/v1/containers/dockerfiles/charts")
        assert resp_charts.status_code == 200, f"Charts failed: {resp_charts.text}"
        charts = resp_charts.json()
        assert "top_issues" in charts
        assert len(charts["top_issues"]) >= 1
        assert "findings_by_severity_timeseries" in charts
        assert "build_stage_analysis" in charts
        assert charts["total_dockerfiles"] >= 1

        # 3. Dockerfiles List
        resp_list = await client.get("/api/v1/containers/dockerfiles")
        assert resp_list.status_code == 200, f"List failed: {resp_list.text}"
        d_list = resp_list.json()
        assert "items" in d_list
        assert d_list["total"] >= 1
        assert len(d_list["items"]) >= 1
        first_df = d_list["items"][0]
        assert "path" in first_df
        assert "repository" in first_df
        assert "issues" in first_df
        assert "status" in first_df

        # 4. Findings
        resp_findings = await client.get("/api/v1/containers/dockerfiles/findings")
        assert resp_findings.status_code == 200, f"Findings failed: {resp_findings.text}"
        findings = resp_findings.json()
        assert isinstance(findings, list)
        assert len(findings) >= 1
        first_find = findings[0]
        assert "rule_id" in first_find
        assert "title" in first_find
        assert "severity" in first_find

        # 5. Recommendations
        resp_recs = await client.get("/api/v1/containers/dockerfiles/recommendations")
        assert resp_recs.status_code == 200, f"Recommendations failed: {resp_recs.text}"
        recs = resp_recs.json()
        assert isinstance(recs, list)
        assert len(recs) >= 1

        # 6. Real Dockerfile Scan Trigger
        scan_req = {
            "dockerfile_path": "./Dockerfile.test",
            "repository_name": "myapp/api",
            "content": "FROM node:18\nUSER root\nRUN apt-get update && apt-get install -y curl\nENTRYPOINT [\"node\", \"server.js\"]\n",
        }
        resp_scan = await client.post("/api/v1/containers/dockerfiles/scan", json=scan_req)
        assert resp_scan.status_code == 200, f"Scan trigger failed: {resp_scan.text}"
        scan_res = resp_scan.json()
        assert "scan_id" in scan_res
        assert scan_res["status"] in ("Completed", "COMPLETED")
        assert "findings" in scan_res
        assert len(scan_res["findings"]) >= 1

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_module_b_configuration_hardening_suite():
    """Verify Module B: Container Configuration & Hardening endpoints."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/containers/configuration/summary")
        assert resp.status_code == 200, f"Config summary failed: {resp.text}"
        summary = resp.json()
        assert summary["analyzed_containers"] >= 1
        assert "misconfigurations" in summary
        assert "privileged_containers" in summary
        assert "running_as_root" in summary
        assert "capability_issues" in summary

        # 2. Charts
        resp_charts = await client.get("/api/v1/containers/configuration/charts")
        assert resp_charts.status_code == 200, f"Config charts failed: {resp_charts.text}"
        charts = resp_charts.json()
        assert "issues_by_category" in charts
        assert "posture_distribution" in charts
        assert "top_hardening_recommendations" in charts
        assert charts["total_containers"] >= 1

        # 3. Containers list
        resp_conts = await client.get("/api/v1/containers/configuration/containers")
        assert resp_conts.status_code == 200, f"Config containers failed: {resp_conts.text}"
        conts = resp_conts.json()
        assert "items" in conts
        assert conts["total"] >= 1
        first_c = conts["items"][0]
        assert "container_name" in first_c
        assert "image" in first_c
        assert "privileged" in first_c
        assert "user" in first_c
        assert "security_posture" in first_c

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_module_c_registry_integrations_suite():
    """Verify Module C: Registry Integrations endpoints and catalog sync."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/containers/registries/summary")
        assert resp.status_code == 200, f"Registry summary failed: {resp.text}"
        summary = resp.json()
        assert summary["connected_registries"] >= 1
        assert summary["total_images"] >= 1
        assert "sync_successful" in summary

        # 2. Enhanced list
        resp_regs = await client.get("/api/v1/containers/registries/enhanced")
        assert resp_regs.status_code == 200, f"Registries enhanced failed: {resp_regs.text}"
        regs = resp_regs.json()
        assert "items" in regs
        assert regs["total"] >= 1
        first_r = regs["items"][0]
        assert "name" in first_r
        assert "provider" in first_r
        assert "type" in first_r
        assert "status" in first_r
        assert first_r["status"] in ("Connected", "Not Configured", "Failed", "In Progress")

        # 3. Create & Connect a new test registry
        new_reg_payload = {
            "name": "test-ecr-registry",
            "provider": "aws_ecr",
            "url": "https://112233445566.dkr.ecr.us-east-1.amazonaws.com",
            "account_id": "112233445566",
            "region": "us-east-1",
        }
        create_resp = await client.post("/api/v1/containers/registries", json=new_reg_payload)
        assert create_resp.status_code in (200, 201), f"Create registry failed: {create_resp.text}"
        created_data = create_resp.json()
        assert created_data["success"] is True
        created_id = created_data["registry"]["id"]

        # 4. Sync the newly connected registry
        resp_sync = await client.post(f"/api/v1/containers/registries/{created_id}/sync")
        assert resp_sync.status_code == 200, f"Registry sync failed: {resp_sync.text}"
        sync_res = resp_sync.json()
        assert sync_res["success"] is True

        # 5. Disconnect registry
        resp_dis = await client.post(f"/api/v1/containers/registries/{created_id}/disconnect")
        assert resp_dis.status_code == 200, f"Registry disconnect failed: {resp_dis.text}"

    app.dependency_overrides.clear()
