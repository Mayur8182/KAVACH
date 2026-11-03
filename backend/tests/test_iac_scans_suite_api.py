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
async def test_iac_scans_suite_endpoints():
    """
    Empirical automated tests for Section 8: Scans Suite (Screens 8.1 - 8.8)
    100% Real API validation across all endpoints and actions.
    """
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # =====================================================================
        # Screen 8.1: Scans Overview
        # =====================================================================
        resp_overview = await client.get("/api/v1/iac/scans-suite/overview?time_range=Last 30 days")
        assert resp_overview.status_code == 200
        overview = resp_overview.json()
        assert overview["total_scans"] == 36
        assert overview["succeeded_scans"] == 28
        assert overview["failed_scans"] == 5
        assert overview["in_progress_scans"] == 3
        assert len(overview["results_trend"]) == 7
        assert overview["results_trend"][0]["date"] == "Sep 01"
        assert overview["results_trend"][-1]["date"] == "Sep 30"
        assert overview["results_trend"][-1]["critical"] == 5
        assert overview["results_trend"][-1]["high"] == 12
        assert overview["results_trend"][-1]["medium"] == 18
        assert overview["results_trend"][-1]["low"] == 25
        assert len(overview["top_repositories"]) == 5
        assert overview["top_repositories"][0]["repository"] == "frontend-app"
        assert overview["top_repositories"][0]["scans"] == 8
        assert overview["top_repositories"][0]["critical"] == 5
        assert overview["top_repositories"][0]["high"] == 12
        assert overview["top_repositories"][0]["medium"] == 18
        assert overview["top_repositories"][0]["low"] == 25

        # =====================================================================
        # Screen 8.2: Scan History
        # =====================================================================
        # 1. Default history
        resp_hist = await client.get("/api/v1/iac/scans-suite/history?page=1&page_size=10")
        assert resp_hist.status_code == 200
        hist = resp_hist.json()
        assert hist["total"] == 10
        assert len(hist["items"]) == 10
        assert hist["items"][0]["scan_id"] == "SCN-001"
        assert hist["items"][0]["repository"] == "frontend-app"
        assert hist["items"][0]["status"] == "Succeeded"
        assert hist["items"][0]["findings_count"] == 24

        # 2. Filter by repository
        resp_hist_repo = await client.get("/api/v1/iac/scans-suite/history?repository=infrastructure")
        assert resp_hist_repo.status_code == 200
        hist_repo = resp_hist_repo.json()
        assert hist_repo["total"] >= 1
        assert all(item["repository"] == "infrastructure" for item in hist_repo["items"])

        # 3. Filter by environment
        resp_hist_env = await client.get("/api/v1/iac/scans-suite/history?environment=staging")
        assert resp_hist_env.status_code == 200
        hist_env = resp_hist_env.json()
        assert hist_env["total"] >= 1
        assert all(item["environment"] == "staging" for item in hist_env["items"])

        # 4. Search query
        resp_hist_search = await client.get("/api/v1/iac/scans-suite/history?search=SCN-003")
        assert resp_hist_search.status_code == 200
        hist_search = resp_hist_search.json()
        assert hist_search["total"] == 1
        assert hist_search["items"][0]["scan_id"] == "SCN-003"
        assert hist_search["items"][0]["repository"] == "k8s-manifests"

        # 5. Pagination
        resp_hist_page = await client.get("/api/v1/iac/scans-suite/history?page=2&page_size=4")
        assert resp_hist_page.status_code == 200
        hist_page = resp_hist_page.json()
        assert len(hist_page["items"]) == 4
        assert hist_page["page"] == 2
        assert hist_page["total_pages"] == 3

        # =====================================================================
        # Screen 8.3: Scheduled Scans
        # =====================================================================
        # 1. List schedules
        resp_sched = await client.get("/api/v1/iac/scans-suite/schedules")
        assert resp_sched.status_code == 200
        sched = resp_sched.json()
        assert sched["total"] >= 6
        assert len(sched["items"]) >= 6
        assert sched["items"][0]["name"] == "Daily Infra Scan"
        assert sched["items"][0]["repository"] == "infrastructure"
        assert sched["items"][0]["frequency"] == "Daily"
        assert sched["items"][0]["status"] == "Active"

        # 2. Create new schedule
        resp_new_sched = await client.post(
            "/api/v1/iac/scans-suite/schedules",
            json={
                "name": "Integration Test Scan",
                "repository": "auth-service",
                "frequency": "Weekly",
                "next_run": "Oct 15, 08:00 AM",
                "status": "Active",
            },
        )
        assert resp_new_sched.status_code == 200
        new_sched = resp_new_sched.json()
        assert new_sched["name"] == "Integration Test Scan"
        created_sched_id = new_sched["id"]

        # 3. Toggle schedule status
        resp_toggle = await client.patch(
            f"/api/v1/iac/scans-suite/schedules/{created_sched_id}/status?status=Inactive"
        )
        assert resp_toggle.status_code == 200
        assert resp_toggle.json()["status"] == "Inactive"

        # 4. Delete schedule
        resp_del_sched = await client.delete(f"/api/v1/iac/scans-suite/schedules/{created_sched_id}")
        assert resp_del_sched.status_code == 200
        assert resp_del_sched.json()["status"] == "deleted"

        # =====================================================================
        # Screen 8.4: On-Demand Scan (Run New Scan)
        # =====================================================================
        resp_on_demand = await client.post(
            "/api/v1/iac/scans-suite/on-demand",
            json={
                "repository": "frontend-app",
                "branch": "main",
                "environment": "production",
                "scan_type": "Full Scan",
                "include_terraform": True,
                "include_cloudformation": True,
                "include_kubernetes": True,
                "include_custom_templates": False,
            },
        )
        assert resp_on_demand.status_code == 200
        on_demand_res = resp_on_demand.json()
        assert on_demand_res["repository"] == "frontend-app"
        assert on_demand_res["branch"] == "main"
        assert on_demand_res["environment"] == "production"
        assert on_demand_res["status"] in ("In Progress", "Running", "Queued")
        assert on_demand_res["scan_id"].startswith("SCN-")

        # =====================================================================
        # Screen 8.5: Scan Configurations
        # =====================================================================
        # 1. Get configuration
        resp_cfg = await client.get("/api/v1/iac/scans-suite/configurations")
        assert resp_cfg.status_code == 200
        cfg = resp_cfg.json()
        assert cfg["name"] == "Default IaC Scan"
        assert cfg["scan_depth"] == "Standard"
        assert cfg["max_file_size"] == "5 MB"
        assert cfg["parallel_scans"] == 4
        assert "Terraform" in cfg["scanners"]

        # 2. Update configuration (Save Configuration)
        cfg["scan_depth"] = "Deep"
        cfg["parallel_scans"] = 6
        resp_upd_cfg = await client.put("/api/v1/iac/scans-suite/configurations", json=cfg)
        assert resp_upd_cfg.status_code == 200
        assert resp_upd_cfg.json()["scan_depth"] == "Deep"
        assert resp_upd_cfg.json()["parallel_scans"] == 6

        # =====================================================================
        # Screen 8.6: Results Comparison
        # =====================================================================
        resp_comp = await client.get(
            "/api/v1/iac/scans-suite/comparison?scan_1_id=SCN-2026-09-30-001&scan_2_id=SCN-2026-09-23-004"
        )
        assert resp_comp.status_code == 200
        comp = resp_comp.json()
        assert comp["scan_1_id"] == "SCN-2026-09-30-001"
        assert comp["scan_2_id"] == "SCN-2026-09-23-004"
        # 4 Severity diff cards matching Screen 8.6
        assert comp["critical"]["current_count"] == 5
        assert comp["critical"]["delta"] == -3
        assert comp["high"]["current_count"] == 12
        assert comp["high"]["delta"] == 4
        assert comp["medium"]["current_count"] == 18
        assert comp["medium"]["delta"] == -6
        assert comp["low"]["current_count"] == 25
        assert comp["low"]["delta"] == -8
        # Chart bars
        assert len(comp["chart_data"]) == 4
        # Top changed resources table
        assert len(comp["top_changed_resources"]) == 5
        assert comp["top_changed_resources"][0]["resource"] == "aws_s3_bucket.app"
        assert comp["top_changed_resources"][0]["change_type"] == "New"
        assert comp["top_changed_resources"][0]["current_severity"] == "Critical"

        # =====================================================================
        # Screen 8.7: Scan Queue
        # =====================================================================
        # 1. Get queue
        resp_q = await client.get("/api/v1/iac/scans-suite/queue")
        assert resp_q.status_code == 200
        q = resp_q.json()
        assert len(q["running"]) >= 1
        assert len(q["queued"]) >= 1
        first_running = q["running"][0]
        assert "progress" in first_running

        # 2. Cancel single scan
        scan_to_cancel = first_running["scan_id"]
        resp_cancel_one = await client.post(f"/api/v1/iac/scans-suite/queue/{scan_to_cancel}/cancel")
        assert resp_cancel_one.status_code == 200
        assert resp_cancel_one.json()["status"] == "cancelled"

        # 3. Cancel all
        resp_cancel_all = await client.post("/api/v1/iac/scans-suite/queue/cancel-all")
        assert resp_cancel_all.status_code == 200
        assert resp_cancel_all.json()["cancelled_count"] >= 0

        # =====================================================================
        # Screen 8.8: Scan Settings
        # =====================================================================
        # 1. Get settings
        resp_settings = await client.get("/api/v1/iac/scans-suite/settings")
        assert resp_settings.status_code == 200
        settings = resp_settings.json()
        assert settings["configuration_preset"] == "Default IaC Scan"
        assert settings["scan_retention_days"] == 90
        assert settings["concurrent_scans"] == 4
        assert settings["scan_timeout_minutes"] == 30
        assert settings["notify_on_completion"] is True
        assert "Email" in settings["notification_channels"]
        assert "Slack" in settings["notification_channels"]

        # 2. Update settings (Save Settings)
        settings["scan_retention_days"] = 60
        settings["concurrent_scans"] = 8
        resp_upd_settings = await client.put("/api/v1/iac/scans-suite/settings", json=settings)
        assert resp_upd_settings.status_code == 200
        assert resp_upd_settings.json()["scan_retention_days"] == 60
        assert resp_upd_settings.json()["concurrent_scans"] == 8

    app.dependency_overrides.clear()
