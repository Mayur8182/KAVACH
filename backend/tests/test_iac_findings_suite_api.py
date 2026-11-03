"""
Automated Pytest Suite for Section 2: Findings Suite
Tests all endpoints under /api/v1/iac/findings-suite/*
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_iac_findings_suite_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2.1 Overview
        res_overview = await client.get("/api/v1/iac/findings-suite/overview")
        assert res_overview.status_code == 200, res_overview.text
        data_ov = res_overview.json()
        assert data_ov["kpis"]["total_findings"] > 0
        assert data_ov["kpis"]["critical"] >= 0
        assert data_ov["kpis"]["high"] >= 0
        assert data_ov["kpis"]["medium"] >= 0
        assert data_ov["kpis"]["low"] >= 0
        assert len(data_ov["trend"]) >= 5
        assert len(data_ov["top_affected_resources"]) > 0
        assert "resource" in data_ov["top_affected_resources"][0]
        assert data_ov["top_affected_resources"][0]["count"] > 0

        # 2.2 All Findings
        res_all = await client.get("/api/v1/iac/findings-suite/all?page=1&page_size=10")
        assert res_all.status_code == 200, res_all.text
        data_all = res_all.json()
        assert data_all["total"] > 0
        assert len(data_all["items"]) <= 10
        assert data_all["items"][0]["id"].startswith("FND-")

        # 2.2 All Findings Filtered
        res_filtered = await client.get("/api/v1/iac/findings-suite/all?severity=Critical")
        assert res_filtered.status_code == 200
        data_filt = res_filtered.json()
        for item in data_filt["items"]:
            assert item["severity"] == "Critical"

        # 2.3 By Provider
        res_prov = await client.get("/api/v1/iac/findings-suite/by-provider?provider=AWS")
        assert res_prov.status_code == 200, res_prov.text
        data_prov = res_prov.json()
        assert data_prov["active_provider"] == "AWS"
        aws_entry = next(p for p in data_prov["providers"] if p["provider"] == "AWS")
        assert aws_entry["count"] > 0

        # 2.4 By Severity
        res_sev = await client.get("/api/v1/iac/findings-suite/by-severity?severity=Critical")
        assert res_sev.status_code == 200, res_sev.text
        data_sev = res_sev.json()
        assert data_sev["active_severity"] == "Critical"
        crit_entry = next(s for s in data_sev["severities"] if s["severity"] == "Critical")
        assert crit_entry["count"] > 0

        # 2.5 By Category
        res_cat = await client.get("/api/v1/iac/findings-suite/by-category")
        assert res_cat.status_code == 200, res_cat.text
        data_cat = res_cat.json()
        assert data_cat["total"] > 0
        assert len(data_cat["categories"]) > 0
        assert data_cat["categories"][0]["total"] > 0

        # 2.6 By Framework
        res_fw = await client.get("/api/v1/iac/findings-suite/by-framework?framework=CIS+AWS")
        assert res_fw.status_code == 200, res_fw.text
        data_fw = res_fw.json()
        assert data_fw["active_framework"] == "CIS AWS"
        cis_entry = next(f for f in data_fw["frameworks"] if f["framework"] == "CIS AWS")
        assert cis_entry["count"] > 0
        assert len(data_fw["rules"]) > 0
        assert data_fw["rules"][0]["total"] > 0

        # 2.7 By Environment
        res_env = await client.get("/api/v1/iac/findings-suite/by-environment?environment=Production")
        assert res_env.status_code == 200, res_env.text
        data_env = res_env.json()
        assert data_env["active_environment"] == "Production"
        prod_entry = next(e for e in data_env["environments"] if e["environment"] == "Production")
        assert prod_entry["count"] > 0

        # Export CSV
        res_export_csv = await client.post(
            "/api/v1/iac/findings-suite/export",
            json={"format": "CSV", "severity": "Critical"},
        )
        assert res_export_csv.status_code == 200, res_export_csv.text
        data_exp = res_export_csv.json()
        assert "ID,Title,Severity" in data_exp["download_content"]
        assert data_exp["exported_count"] > 0

        # Update Status
        res_update = await client.patch(
            "/api/v1/iac/findings-suite/FND-328/status",
            json={"status": "In Progress"},
        )
        assert res_update.status_code == 200, res_update.text
        assert res_update.json()["status"] == "In Progress"

        # 3.1 Overview Enhancements
        assert data_ov["status_breakdown"]["Open"] > 0
        assert len(data_ov["top_findings_by_category"]) > 0
        assert data_ov["top_findings_by_category"][0]["count"] > 0

        # 3.3 Finding Detail
        res_detail = await client.get("/api/v1/iac/findings-suite/detail/FND-328")
        assert res_detail.status_code == 200, res_detail.text
        data_det = res_detail.json()
        assert data_det["id"] == "FND-328"
        assert "S3 bucket" in data_det["title"]
        assert data_det["evidence"]["line_start"] == 14
        assert len(data_det["remediation"]["steps"]) > 0

        # Assign Finding
        res_assign = await client.post(
            "/api/v1/iac/findings-suite/detail/FND-328/assign",
            json={"assignee": "mayur.bhavsar"},
        )
        assert res_assign.status_code == 200, res_assign.text
        assert res_assign.json()["assignee"] == "mayur.bhavsar"

        # Comment on Finding
        res_comment = await client.post(
            "/api/v1/iac/findings-suite/detail/FND-328/comment",
            json={"comment": "Investigating bucket ACL configuration", "author": "Security Team"},
        )
        assert res_comment.status_code == 200, res_comment.text
        assert any("Investigating" in c["comment"] for c in res_comment.json()["comments"])

        # Remediate Finding
        res_remed = await client.post(
            "/api/v1/iac/findings-suite/detail/FND-328/remediate",
            json={"action": "apply"},
        )
        assert res_remed.status_code == 200, res_remed.text
        assert res_remed.json()["status"] == "Resolved"
        assert res_remed.json()["remediation"]["applied"] is True

        # 3.4 Findings Triage
        res_triage = await client.get("/api/v1/iac/findings-suite/triage?page=1&page_size=10")
        assert res_triage.status_code == 200, res_triage.text
        data_tri = res_triage.json()
        assert data_tri["status_counts"]["Open"] > 0
        assert len(data_tri["items"]) > 0

        # Bulk Triage Action
        res_bulk = await client.post(
            "/api/v1/iac/findings-suite/triage/bulk",
            json={"action": "assign", "finding_ids": ["FND-328", "FND-327"], "value": "dev-team"},
        )
        assert res_bulk.status_code == 200, res_bulk.text
        assert res_bulk.json()["updated_count"] >= 1

        # 3.5 Findings Trends
        res_trends = await client.get("/api/v1/iac/findings-suite/trends?time_range=Last+90+days")
        assert res_trends.status_code == 200, res_trends.text
        data_tr = res_trends.json()
        assert len(data_tr["trend"]) >= 5
        assert len(data_tr["provider_breakdown"]) > 0
        assert data_tr["provider_breakdown"][0]["count"] > 0
        assert len(data_tr["environment_breakdown"]) > 0
        assert data_tr["environment_breakdown"][0]["percentage"] > 0

        # 3.6 Findings by Resource
        res_by_res = await client.get("/api/v1/iac/findings-suite/by-resource")
        assert res_by_res.status_code == 200, res_by_res.text
        data_br = res_by_res.json()
        assert len(data_br["items"]) > 0
        assert data_br["items"][0]["total"] > 0

        # 3.7 Findings by Framework Summary
        res_by_fw = await client.get("/api/v1/iac/findings-suite/by-framework-summary")
        assert res_by_fw.status_code == 200, res_by_fw.text
        data_bfw = res_by_fw.json()
        assert len(data_bfw["items"]) > 0
        assert data_bfw["items"][0]["total"] > 0

        # 3.8 Advanced Export
        res_exp_adv = await client.post(
            "/api/v1/iac/findings-suite/export-advanced",
            json={"format": "PDF", "include_details": True, "include_remediation": True},
        )
        assert res_exp_adv.status_code == 200, res_exp_adv.text
        assert "SECULAYER IAC SECURITY AUDIT REPORT" in res_exp_adv.json()["download_content"]

        # Scheduled Reports
        res_sched = await client.get("/api/v1/iac/findings-suite/reports/scheduled")
        assert res_sched.status_code == 200, res_sched.text
        assert len(res_sched.json()) >= 3

        res_new_sched = await client.post(
            "/api/v1/iac/findings-suite/reports/scheduled",
            json={"name": "Weekly Audit", "frequency": "Weekly", "format": "PDF", "recipients": "admin@secu.com"},
        )
        assert res_new_sched.status_code == 200, res_new_sched.text

        res_toggle = await client.patch(f"/api/v1/iac/findings-suite/reports/scheduled/{res_new_sched.json()['id']}/toggle")
        assert res_toggle.status_code == 200, res_toggle.text
        assert res_toggle.json()["status"] == "Paused"

        # Report History
        res_hist = await client.get("/api/v1/iac/findings-suite/reports/history")
        assert res_hist.status_code == 200, res_hist.text
        assert len(res_hist.json()) >= 3
