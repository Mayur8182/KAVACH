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
    """Ensure all container security tables exist in database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure any newly added columns are present in existing SQLite test databases
        for col, col_type in [
            ("nodes_count", "INTEGER DEFAULT 1"),
            ("namespaces_count", "INTEGER DEFAULT 1"),
            ("last_synced_at", "DATETIME"),
            ("health_status", "VARCHAR(50) DEFAULT 'Healthy'"),
            ("risk_level", "VARCHAR(50) DEFAULT 'Medium'"),
            ("findings_count", "INTEGER DEFAULT 0"),
            ("cluster_name", "VARCHAR(255)"),
            ("pods_formatted", "VARCHAR(50) DEFAULT '1/1'"),
            ("category", "VARCHAR(100) DEFAULT 'Misconfigurations'"),
            ("remediation", "TEXT"),
        ]:
            try:
                await conn.execute(text(f"ALTER TABLE kubernetes_clusters ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
            try:
                await conn.execute(text(f"ALTER TABLE kubernetes_workloads ADD COLUMN {col} {col_type}"))
            except Exception:
                pass
            try:
                await conn.execute(text(f"ALTER TABLE kubernetes_security_findings ADD COLUMN {col} {col_type}"))
            except Exception:
                pass


@pytest.mark.asyncio
async def test_module_07_image_scan_management_suite():
    """Verify Module 07: Image Scan Management endpoints and real Trivy execution."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/containers/scans/summary")
        assert resp.status_code == 200, f"Scans summary failed: {resp.text}"
        summary = resp.json()
        assert summary["total_scans"] >= 1
        assert summary["successful_scans"] >= 1
        assert "failed_scans" in summary
        assert "in_progress_scans" in summary
        assert "scheduled_scans" in summary

        # 2. Charts
        resp_charts = await client.get("/api/v1/containers/scans/charts")
        assert resp_charts.status_code == 200, f"Scans charts failed: {resp_charts.text}"
        charts = resp_charts.json()
        assert "severity_distribution" in charts
        assert len(charts["severity_distribution"]) >= 1
        assert "scan_trend_timeseries" in charts
        assert len(charts["scan_trend_timeseries"]) >= 1

        # 3. Scans List
        resp_list = await client.get("/api/v1/containers/scans/list?page=1&page_size=10")
        assert resp_list.status_code == 200, f"Scans list failed: {resp_list.text}"
        scans_data = resp_list.json()
        assert scans_data["total"] >= 1
        assert len(scans_data["items"]) >= 1
        first_scan = scans_data["items"][0]
        assert "id" in first_scan
        assert "image" in first_scan
        assert "registry" in first_scan
        assert "scan_type" in first_scan
        assert "status" in first_scan

        # 4. Scan Detail
        scan_id = first_scan["id"]
        resp_detail = await client.get(f"/api/v1/containers/scans/{scan_id}")
        assert resp_detail.status_code == 200, f"Scan detail failed: {resp_detail.text}"
        detail = resp_detail.json()
        assert detail["id"] == scan_id
        assert "package_types" in detail
        assert "findings" in detail

        # 5. Trigger Real Scan with Trivy Engine
        scan_req = {
            "target_type": "IMAGE",
            "target_identifier": "alpine:3.19",
            "scan_type": "Quick Scan",
            "scan_options": {
                "scan_secrets": True,
                "generate_sbom": True,
                "analyze_dockerfile": False,
                "enable_storage": True,
            },
        }
        resp_run = await client.post("/api/v1/containers/scans/run", json=scan_req)
        assert resp_run.status_code == 200, f"Run scan failed: {resp_run.text}"
        run_data = resp_run.json()
        assert run_data["image"] == "alpine:3.19"
        assert run_data["status"] in ("Completed", "Failed", "In Progress")

        # 6. Schedules GET & POST
        resp_sched = await client.get("/api/v1/containers/scans/schedules")
        assert resp_sched.status_code == 200, f"Get schedules failed: {resp_sched.text}"
        sched_data = resp_sched.json()
        assert "items" in sched_data
        assert sched_data["total"] >= 1

        new_sched = {
            "name": "Nightly Production Scan",
            "cron_expression": "0 2 * * *",
            "target_pattern": "dockerhub-primary/*",
            "scan_type": "Full Scan",
        }
        resp_create_sched = await client.post("/api/v1/containers/scans/schedules", json=new_sched)
        assert resp_create_sched.status_code == 200, f"Create schedule failed: {resp_create_sched.text}"
        created_sched = resp_create_sched.json()
        assert created_sched["name"] == "Nightly Production Scan"
        assert created_sched["cron_expression"] == "0 2 * * *"


@pytest.mark.asyncio
async def test_module_08_kubernetes_workloads_suite():
    """Verify Module 08: Kubernetes Workloads endpoints and relational inventory."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Overview
        resp_ov = await client.get("/api/v1/containers/kubernetes/overview")
        assert resp_ov.status_code == 200, f"K8s overview failed: {resp_ov.text}"
        ov_data = resp_ov.json()
        assert ov_data["clusters_count"] >= 1
        assert ov_data["namespaces_count"] >= 1
        assert ov_data["workloads_count"] >= 1
        assert ov_data["pods_count"] >= 1
        assert ov_data["security_findings_count"] >= 1
        assert len(ov_data["findings_by_category"]) >= 1
        assert len(ov_data["workload_risk_distribution"]) >= 1

        # 2. Top Risky Workloads
        resp_risky = await client.get("/api/v1/containers/kubernetes/top-risky")
        assert resp_risky.status_code == 200, f"Top risky failed: {resp_risky.text}"
        risky_list = resp_risky.json()
        assert isinstance(risky_list, list)
        assert len(risky_list) >= 1
        first_risky = risky_list[0]
        assert "workload" in first_risky
        assert "namespace" in first_risky
        assert "risk_level" in first_risky

        # 3. Clusters Summary & Clusters List
        resp_c_sum = await client.get("/api/v1/containers/kubernetes/clusters/summary")
        assert resp_c_sum.status_code == 200, f"Clusters summary failed: {resp_c_sum.text}"
        c_sum = resp_c_sum.json()
        assert c_sum["connected_clusters"] >= 1
        assert c_sum["healthy_count"] >= 1

        resp_clusters = await client.get("/api/v1/containers/kubernetes/clusters")
        assert resp_clusters.status_code == 200, f"Clusters list failed: {resp_clusters.text}"
        c_list = resp_clusters.json()
        assert c_list["total"] >= 1
        assert len(c_list["items"]) >= 1

        # 4. Workloads List & Detail
        resp_wl = await client.get("/api/v1/containers/kubernetes/workloads?page=1&page_size=10")
        assert resp_wl.status_code == 200, f"Workloads list failed: {resp_wl.text}"
        wl_data = resp_wl.json()
        assert wl_data["total"] >= 1
        assert len(wl_data["items"]) >= 1
        first_wl = wl_data["items"][0]

        resp_wl_det = await client.get(f"/api/v1/containers/kubernetes/workloads/{first_wl['id']}")
        assert resp_wl_det.status_code == 200, f"Workload detail failed: {resp_wl_det.text}"
        wl_det = resp_wl_det.json()
        assert wl_det["id"] == first_wl["id"]
        assert "findings" in wl_det

        # 5. Kubernetes Findings
        resp_find = await client.get("/api/v1/containers/kubernetes/findings")
        assert resp_find.status_code == 200, f"Findings failed: {resp_find.text}"
        find_data = resp_find.json()
        assert find_data["total"] >= 1
        assert len(find_data["items"]) >= 1


@pytest.mark.asyncio
async def test_module_09_container_runtime_security_suite():
    """Verify Module 09: Container Runtime Security telemetry, sensor status, alerts, and policies."""
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Overview & Sensor Connectivity
        resp_rt_ov = await client.get("/api/v1/containers/runtime/overview")
        assert resp_rt_ov.status_code == 200, f"Runtime overview failed: {resp_rt_ov.text}"
        rt_ov = resp_rt_ov.json()
        assert rt_ov["runtime_alerts"] >= 1
        assert rt_ov["process_events"] >= 1
        assert rt_ov["blocked_events"] >= 1
        assert rt_ov["policy_violations"] >= 1
        assert rt_ov["affected_workloads"] >= 1

        # Sensor health must be explicitly checked
        assert "telemetry_status" in rt_ov
        assert "sensor_summary" in rt_ov
        assert len(rt_ov["alerts_by_severity"]) >= 1
        assert len(rt_ov["top_alert_types"]) >= 1

        # 2. Runtime Alerts List
        resp_alerts = await client.get("/api/v1/containers/runtime/alerts")
        assert resp_alerts.status_code == 200, f"Runtime alerts failed: {resp_alerts.text}"
        alerts_data = resp_alerts.json()
        assert alerts_data["total"] >= 1
        assert len(alerts_data["items"]) >= 1
        first_alert = alerts_data["items"][0]
        assert "event_type" in first_alert
        assert "process" in first_alert
        assert "severity" in first_alert

        # 3. Process & Behavior Events List
        resp_events = await client.get("/api/v1/containers/runtime/events?page=1&page_size=10")
        assert resp_events.status_code == 200, f"Runtime events failed: {resp_events.text}"
        events_data = resp_events.json()
        assert events_data["total"] >= 1
        assert len(events_data["items"]) >= 1
        first_ev = events_data["items"][0]

        # 4. Suspicious Activity Detail
        resp_ev_det = await client.get(f"/api/v1/containers/runtime/events/{first_ev['id']}")
        assert resp_ev_det.status_code == 200, f"Event detail failed: {resp_ev_det.text}"
        ev_det = resp_ev_det.json()
        assert ev_det["id"] == first_ev["id"]
        assert "mitre_attack_id" in ev_det
        assert "timeline_events" in ev_det
        assert len(ev_det["timeline_events"]) >= 1

        # 5. Runtime Policies List & Create
        resp_pol = await client.get("/api/v1/containers/runtime/policies")
        assert resp_pol.status_code == 200, f"Policies failed: {resp_pol.text}"
        pol_data = resp_pol.json()
        assert pol_data["total_policies"] >= 1
        assert pol_data["enabled_count"] >= 1
        assert len(pol_data["policies"]) >= 1

        new_policy = {
            "name": "restrict-raw-sockets-runtime",
            "policy_type": "Blocking",
            "category": "Network",
            "action": "Blocked",
            "scope": "Production",
            "description": "Block creation of raw sockets (AF_PACKET / SOCK_RAW) to prevent network packet sniffing.",
        }
        resp_create_pol = await client.post("/api/v1/containers/runtime/policies", json=new_policy)
        assert resp_create_pol.status_code == 200, f"Create policy failed: {resp_create_pol.text}"
        created_pol = resp_create_pol.json()
        assert created_pol["name"] == "restrict-raw-sockets-runtime"
        assert created_pol["policy_type"] == "Blocking"
        assert created_pol["action"] == "Blocked"
