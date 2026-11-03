import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_application
from app.core.security import get_current_user
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="admin@seculayer.io",
    password_hash="testhash",
    name="Dev Security",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_iac_compliance_suite_endpoints():
    """
    Empirical automated tests for Section 11: Compliance & Benchmarks Suite (Screens 11.1 - 11.8).
    100% Real API validation across all endpoints and actions.
    """
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # =====================================================================
        # Screen 11.1: Compliance Overview
        # =====================================================================
        resp_overview = await client.get("/api/v1/iac/compliance-suite/overview")
        assert resp_overview.status_code == 200
        overview = resp_overview.json()
        assert "kpis" in overview
        kpis = overview["kpis"]
        assert kpis["frameworks"] >= 6
        assert kpis["total_controls"] == 132
        assert kpis["compliant_controls"] == 96
        assert kpis["non_compliant_controls"] == 26
        assert kpis["not_evaluated_controls"] == 10
        assert kpis["compliance_percentage"] == 73

        # Framework coverage list
        assert len(overview["framework_coverages"]) == 6
        fw_names = [f["name"] for f in overview["framework_coverages"]]
        assert "CIS AWS" in fw_names
        assert "CIS Kubernetes" in fw_names
        assert "NIST 800-53" in fw_names
        assert "PCI DSS" in fw_names
        assert "SOC 2" in fw_names
        assert "ISO 27001" in fw_names

        # Trend points
        assert len(overview["trend"]) == 7
        assert overview["trend"][0]["date"] == "Sep 01"
        assert overview["trend"][-1]["date"] == "Sep 30"
        assert overview["trend"][-1]["compliant"] == 96
        assert overview["trend"][-1]["non_compliant"] == 26
        assert overview["trend"][-1]["not_evaluated"] == 10

        # =====================================================================
        # Screen 11.2: Frameworks
        # =====================================================================
        resp_fw = await client.get("/api/v1/iac/compliance-suite/frameworks")
        assert resp_fw.status_code == 200
        fw_data = resp_fw.json()
        assert fw_data["total"] >= 6
        assert any(f["name"] == "CIS AWS Foundations" for f in fw_data["items"])

        # Search filter
        resp_fw_search = await client.get("/api/v1/iac/compliance-suite/frameworks?search=Kubernetes")
        assert resp_fw_search.status_code == 200
        search_items = resp_fw_search.json()["items"]
        assert len(search_items) >= 1
        assert "Kubernetes" in search_items[0]["name"]

        # Add framework POST
        resp_add_fw = await client.post(
            "/api/v1/iac/compliance-suite/frameworks",
            json={
                "name": "FedRAMP Moderate",
                "version": "Rev 4",
                "description": "Federal Risk and Authorization Management Program baseline",
                "controls_count": 325,
            },
        )
        assert resp_add_fw.status_code == 201
        added_fw = resp_add_fw.json()
        assert added_fw["name"] == "FedRAMP Moderate"
        assert added_fw["is_custom"] is True

        # =====================================================================
        # Screen 11.3: Controls Mapping
        # =====================================================================
        resp_ctrls = await client.get("/api/v1/iac/compliance-suite/controls?page=1&page_size=10")
        assert resp_ctrls.status_code == 200
        ctrls = resp_ctrls.json()
        assert ctrls["total"] >= 10
        ctrl_ids = [c["control_id"] for c in ctrls["items"]]
        assert "CIS-1.1" in ctrl_ids
        assert "CIS-1.2" in ctrl_ids
        assert "K8S-5.1" in ctrl_ids

        # Filter by status
        resp_ctrls_status = await client.get("/api/v1/iac/compliance-suite/controls?status=Non-Compliant")
        assert resp_ctrls_status.status_code == 200
        for item in resp_ctrls_status.json()["items"]:
            assert item["status"] == "Non-Compliant"

        # Filter by framework
        resp_ctrls_fw = await client.get("/api/v1/iac/compliance-suite/controls?framework=CIS AWS")
        assert resp_ctrls_fw.status_code == 200
        for item in resp_ctrls_fw.json()["items"]:
            assert "CIS AWS" in item["framework"]

        # =====================================================================
        # Screen 11.4: Control Detail
        # =====================================================================
        resp_detail = await client.get("/api/v1/iac/compliance-suite/controls/CIS-1.2")
        assert resp_detail.status_code == 200
        detail = resp_detail.json()
        assert detail["control_id"] == "CIS-1.2"
        assert detail["status"] == "Non-Compliant"
        assert detail["severity"] == "High"
        assert len(detail["findings"]) == 3
        assert detail["findings_by_severity"]["Critical"] == 1
        assert detail["findings_by_severity"]["High"] == 2
        assert "documentation_url" in detail
        assert "remediation_guide" in detail

        # =====================================================================
        # Screen 11.5: Compliance Report
        # =====================================================================
        resp_gen_report = await client.post(
            "/api/v1/iac/compliance-suite/reports/generate",
            json={
                "frameworks": ["CIS-AWS", "CIS-Kubernetes", "NIST 800-53"],
                "repository": "All Repositories",
                "date_range": "Sep 01, 2026 - Sep 30, 2026",
                "format": "PDF",
                "include_executive_summary": True,
                "include_control_status": True,
                "include_findings_details": True,
                "include_remediation": True,
                "include_evidence": True,
                "include_appendices": True,
            },
        )
        assert resp_gen_report.status_code == 200
        gen_report = resp_gen_report.json()
        assert gen_report["report_id"].startswith("REP-")
        assert gen_report["format"] == "PDF"

        # List reports history
        resp_reports_list = await client.get("/api/v1/iac/compliance-suite/reports")
        assert resp_reports_list.status_code == 200
        assert resp_reports_list.json()["total"] >= 2

        # =====================================================================
        # Screen 11.6: Evidence
        # =====================================================================
        resp_evidence = await client.get("/api/v1/iac/compliance-suite/evidence?page=1&page_size=10")
        assert resp_evidence.status_code == 200
        evidence_data = resp_evidence.json()
        assert evidence_data["total"] >= 6
        ev_ids = [e["evidence_id"] for e in evidence_data["items"]]
        assert "EV-001" in ev_ids
        assert "EV-002" in ev_ids

        # Add Evidence
        resp_add_ev = await client.post(
            "/api/v1/iac/compliance-suite/evidence",
            json={
                "control_id": "CIS-1.2",
                "description": "IAM MFA audit log verification snippet",
                "type": "Log file",
                "status": "Valid",
            },
        )
        assert resp_add_ev.status_code == 201
        added_ev = resp_add_ev.json()
        new_ev_id = added_ev["evidence_id"]
        assert new_ev_id.startswith("EV-")

        # Delete evidence
        resp_del_ev = await client.delete(f"/api/v1/iac/compliance-suite/evidence/{new_ev_id}")
        assert resp_del_ev.status_code == 200

        # =====================================================================
        # Screen 11.7: Exceptions
        # =====================================================================
        resp_exceptions = await client.get("/api/v1/iac/compliance-suite/exceptions")
        assert resp_exceptions.status_code == 200
        ex_data = resp_exceptions.json()
        assert ex_data["total"] >= 4
        assert any(e["exception_id"] == "EX-001" for e in ex_data["items"])

        # Add Exception
        resp_add_ex = await client.post(
            "/api/v1/iac/compliance-suite/exceptions",
            json={
                "control_id": "PCI-1.1",
                "reason": "Firewall configuration migration scheduled for Q4",
                "valid_until": "Dec 31, 2026",
                "status": "Pending",
            },
        )
        assert resp_add_ex.status_code == 201
        new_ex_id = resp_add_ex.json()["exception_id"]

        # Update status
        resp_update_ex = await client.patch(
            f"/api/v1/iac/compliance-suite/exceptions/{new_ex_id}/status?status=Approved"
        )
        assert resp_update_ex.status_code == 200
        assert resp_update_ex.json()["status"] == "Approved"

        # Delete Exception
        resp_del_ex = await client.delete(f"/api/v1/iac/compliance-suite/exceptions/{new_ex_id}")
        assert resp_del_ex.status_code == 200

        # =====================================================================
        # Screen 11.8: Audit Logs
        # =====================================================================
        resp_audit = await client.get("/api/v1/iac/compliance-suite/audit-logs?page=1&page_size=10")
        assert resp_audit.status_code == 200
        audit_data = resp_audit.json()
        assert audit_data["total"] >= 8
        assert any(a["user"] == "mayur.bharvad" for a in audit_data["items"])
        assert any(a["event"] == "Exception Approved" for a in audit_data["items"])

        # Filter by event
        resp_audit_filter = await client.get("/api/v1/iac/compliance-suite/audit-logs?event=Evidence")
        assert resp_audit_filter.status_code == 200
        for item in resp_audit_filter.json()["items"]:
            assert "Evidence" in item["event"]

        # =====================================================================
        # Settings
        # =====================================================================
        resp_settings = await client.get("/api/v1/iac/compliance-suite/settings")
        assert resp_settings.status_code == 200
        settings = resp_settings.json()
        assert settings["auto_evaluate_on_scan"] is True

        resp_put_settings = await client.put(
            "/api/v1/iac/compliance-suite/settings",
            json={
                "auto_evaluate_on_scan": True,
                "enforce_strict_benchmarks": True,
                "notify_on_non_compliance": True,
                "notification_channels": ["Email", "Slack", "PagerDuty"],
                "default_framework": "CIS AWS Foundations",
                "evidence_retention_days": 180,
            },
        )
        assert resp_put_settings.status_code == 200
        assert resp_put_settings.json()["evidence_retention_days"] == 180
