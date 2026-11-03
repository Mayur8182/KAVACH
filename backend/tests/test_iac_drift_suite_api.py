import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_application
from app.core.security import get_current_user
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="admin@kavachsecurity.me",
    password_hash="testhash",
    name="Dev Security",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_iac_drift_suite_endpoints():
    """
    Empirical automated tests for Section 10: Drift Detection Suite (Screens 10.1 - 10.8).
    100% Real API validation across all endpoints and actions.
    """
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # =====================================================================
        # Screen 10.1: Drift Detection Overview
        # =====================================================================
        resp_overview = await client.get("/api/v1/iac/drift/suite/overview")
        assert resp_overview.status_code == 200
        overview = resp_overview.json()
        assert "kpis" in overview
        kpis = overview["kpis"]
        assert kpis["total_resources"] == 24
        assert kpis["drifted"] == 8
        assert kpis["in_sync"] == 12
        assert kpis["not_tracked"] == 4

        # Trend points
        assert len(overview["trend"]) == 7
        assert overview["trend"][0]["date"] == "Sep 01"
        assert overview["trend"][-1]["date"] == "Sep 30"
        assert overview["trend"][-1]["drifted"] == 8
        assert overview["trend"][-1]["in_sync"] == 12

        # Recent events
        assert len(overview["recent_events"]) == 5
        assert overview["recent_events"][0]["resource"] == "eks-prod-cluster"
        assert overview["recent_events"][0]["change_type"] == "Modified"
        assert overview["recent_events"][0]["status"] == "Drifted"

        # =====================================================================
        # Screen 10.2: Environments
        # =====================================================================
        resp_envs = await client.get("/api/v1/iac/drift/suite/environments")
        assert resp_envs.status_code == 200
        envs = resp_envs.json()
        assert envs["total"] >= 5
        env_names = [e["name"] for e in envs["items"]]
        assert "production" in env_names
        assert "staging" in env_names
        assert "dev" in env_names
        assert "qa" in env_names
        assert "sandbox" in env_names

        # Add Environment POST
        resp_add_env = await client.post(
            "/api/v1/iac/drift/suite/environments",
            json={
                "name": "testing-lab",
                "provider": "AWS",
                "region": "eu-west-1",
            },
        )
        assert resp_add_env.status_code == 201
        assert resp_add_env.json()["name"] == "testing-lab"

        # Trigger Scan
        resp_scan_env = await client.post("/api/v1/iac/drift/suite/environments/production/scan")
        assert resp_scan_env.status_code == 200
        assert resp_scan_env.json()["status"] == "scan_started"

        # Delete Environment
        resp_del_env = await client.delete("/api/v1/iac/drift/suite/environments/testing-lab")
        assert resp_del_env.status_code == 200
        assert resp_del_env.json()["status"] == "deleted"

        # =====================================================================
        # Screen 10.3: Drift Changes
        # =====================================================================
        resp_changes = await client.get("/api/v1/iac/drift/suite/changes?page=1&page_size=10")
        assert resp_changes.status_code == 200
        changes = resp_changes.json()
        assert changes["total"] >= 10
        change_resources = [c["resource"] for c in changes["items"]]
        assert "eks-prod-cluster" in change_resources
        assert "s3-logs-bucket" in change_resources
        assert "vpc-main" in change_resources

        # Filter by change type
        resp_filter_mod = await client.get("/api/v1/iac/drift/suite/changes?change_type=Modified")
        assert resp_filter_mod.status_code == 200
        for item in resp_filter_mod.json()["items"]:
            assert item["change_type"] == "Modified"

        # =====================================================================
        # Screen 10.4: Resource Detail
        # =====================================================================
        resp_detail = await client.get("/api/v1/iac/drift/suite/resources/eks-prod-cluster")
        assert resp_detail.status_code == 200
        detail = resp_detail.json()
        assert detail["name"] == "eks-prod-cluster"
        assert detail["resource_type"] == "AWS::EKS::Cluster"
        assert detail["environment"] == "production"
        assert detail["status"] == "Drifted"
        assert detail["change_type"] == "Modified"
        assert detail["changed_fields_count"] == 4
        assert detail["severity"] == "High"
        assert "aws_eks_cluster" in detail["deployed_terraform"]
        assert "eks-prod-cluster" in detail["deployed_json"]
        assert "eks-prod-cluster" in detail["deployed_yaml"]

        # =====================================================================
        # Screen 10.5: Remediation
        # =====================================================================
        resp_rem = await client.get("/api/v1/iac/drift/suite/remediation")
        assert resp_rem.status_code == 200
        remediation_data = resp_rem.json()
        assert remediation_data["total"] >= 5
        rem_resources = [r["resource"] for r in remediation_data["items"]]
        assert "eks-prod-cluster" in rem_resources
        assert "s3-logs-bucket" in rem_resources

        # Apply remediation POST
        resp_apply = await client.post("/api/v1/iac/drift/suite/remediation/REM-001/apply")
        assert resp_apply.status_code == 200
        apply_res = resp_apply.json()
        assert apply_res["status"] == "In Progress"

        # =====================================================================
        # Screen 10.6: Drift History
        # =====================================================================
        resp_hist = await client.get("/api/v1/iac/drift/suite/history?page=1&page_size=10")
        assert resp_hist.status_code == 200
        hist_data = resp_hist.json()
        assert hist_data["total"] >= 10
        assert any(h["resource"] == "eks-prod-cluster" for h in hist_data["items"])
        assert any(h["changed_by"] == "Terraform" for h in hist_data["items"])
        assert any(h["changed_by"] == "Manual" for h in hist_data["items"])

        # =====================================================================
        # Screen 10.7: Settings
        # =====================================================================
        resp_settings = await client.get("/api/v1/iac/drift/suite/settings")
        assert resp_settings.status_code == 200
        settings = resp_settings.json()
        assert settings["enable_drift_detection"] is True
        assert settings["scan_frequency"] == "Daily"

        # Update Settings PUT
        resp_put_settings = await client.put(
            "/api/v1/iac/drift/suite/settings",
            json={
                "enable_drift_detection": True,
                "auto_scan_on_schedule": True,
                "notify_on_drift": True,
                "include_tags": True,
                "ignore_computed": True,
                "scan_frequency": "Hourly",
                "scan_time": "04:00",
                "environments": ["production", "staging", "dev"],
                "email_notifications": True,
                "slack_notifications": True,
            },
        )
        assert resp_put_settings.status_code == 200
        assert resp_put_settings.json()["scan_frequency"] == "Hourly"
        assert resp_put_settings.json()["ignore_computed"] is True

        # =====================================================================
        # Screen 10.8: Compare Configuration
        # =====================================================================
        resp_comp = await client.get("/api/v1/iac/drift/suite/compare/eks-prod-cluster")
        assert resp_comp.status_code == 200
        comp_data = resp_comp.json()
        assert comp_data["resource"] == "eks-prod-cluster"
        assert comp_data["differences_count"] == 3
        assert len(comp_data["diff_summary"]) == 3
        assert 'version  = "1.29"' in comp_data["git_terraform"]
        assert 'version  = "1.28"' in comp_data["deployed_terraform"]
        assert "subnet-789" in comp_data["deployed_terraform"]
