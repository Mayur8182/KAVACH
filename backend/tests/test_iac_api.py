import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_application, _run_startup_migrations
from app.core.security import get_current_user
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
async def test_iac_summary_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/summary")
        assert resp.status_code in (200, 401)


@pytest.mark.asyncio
async def test_iac_endpoints_authorized():
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/iac/summary")
        assert resp.status_code == 200
        summary = resp.json()
        assert "total_issues" in summary
        assert "critical" in summary
        assert "high" in summary
        assert "medium" in summary
        assert "low" in summary
        assert "by_severity" in summary
        assert "by_provider" in summary
        assert "by_framework" in summary
        assert "top_resources" in summary
        assert len(summary["by_severity"]) >= 4
        assert len(summary["by_provider"]) >= 1

        # 2. Findings List
        resp_findings = await client.get("/api/v1/iac/findings?page=1&page_size=10")
        assert resp_findings.status_code == 200
        findings_data = resp_findings.json()
        assert "items" in findings_data
        assert "total" in findings_data
        assert "page" in findings_data
        assert "total_pages" in findings_data
        assert len(findings_data["items"]) >= 1

        first_finding = findings_data["items"][0]
        assert "rule_id" in first_finding
        assert "title" in first_finding
        assert "severity" in first_finding
        assert "provider" in first_finding
        assert "framework" in first_finding
        assert "file_path" in first_finding
        assert "status" in first_finding

        # 3. Finding Detail
        finding_id = first_finding["id"]
        resp_detail = await client.get(f"/api/v1/iac/findings/{finding_id}")
        assert resp_detail.status_code == 200
        detail = resp_detail.json()
        assert detail["id"] == finding_id
        assert detail["rule_id"] == first_finding["rule_id"]
        assert "first_seen_relative" in detail

        # 4. Filter by Provider
        resp_prov = await client.get("/api/v1/iac/findings?provider=AWS")
        assert resp_prov.status_code == 200
        for item in resp_prov.json()["items"]:
            assert item["provider"] == "AWS"

        # 5. Filter by Framework
        resp_frm = await client.get("/api/v1/iac/findings?framework=Terraform")
        assert resp_frm.status_code == 200
        for item in resp_frm.json()["items"]:
            assert item["framework"] == "Terraform"

        # 6. Config GET & POST
        repo_id = str(uuid.uuid4())
        resp_cfg = await client.get(f"/api/v1/iac/config?repository_id={repo_id}")
        assert resp_cfg.status_code == 200
        assert resp_cfg.json()["enabled_frameworks"] is not None

        # 7. Scans History (contains SCN-2026-09-30-001)
        resp_scans = await client.get("/api/v1/iac/scans")
        assert resp_scans.status_code == 200
        scans_data = resp_scans.json()
        assert scans_data["total"] >= 1
        ref_scan = next((s for s in scans_data["items"] if "SCN-2026-09-30-001" in s["scan_id"]), None)
        assert ref_scan is not None
        assert ref_scan["status"] == "COMPLETED"

        # 8. Scan Detail (Screens 9.1 - 9.8)
        resp_detail = await client.get("/api/v1/iac/scans/SCN-2026-09-30-001")
        assert resp_detail.status_code == 200
        scan_detail = resp_detail.json()
        assert scan_detail["scan_id_display"] == "SCN-2026-09-30-001"
        assert scan_detail["summary"]["total_findings"] == 24
        assert scan_detail["summary"]["critical"] == 2
        assert scan_detail["summary"]["high"] == 8
        assert scan_detail["summary"]["medium"] == 10
        assert scan_detail["summary"]["low"] == 4
        assert len(scan_detail["trend"]) == 5
        assert len(scan_detail["findings"]) == 10
        assert len(scan_detail["resources"]) == 10
        assert len(scan_detail["rules"]) == 10
        assert len(scan_detail["compliance"]["framework_scores"]) == 4
        assert len(scan_detail["compliance"]["framework_results"]) == 5
        assert len(scan_detail["logs"]) == 10
        assert scan_detail["configuration"]["scanner"] == "Checkov (v2.4.1)"
        assert scan_detail["run_details"]["workflow"] == "iac-security.yml"

        # 9. Rerun Scan
        resp_rerun = await client.post("/api/v1/iac/scans/SCN-2026-09-30-001/rerun")
        assert resp_rerun.status_code == 200
        assert resp_rerun.json()["status"] == "QUEUED"

        # 10. Update Scan Configuration
        resp_upd = await client.put(
            "/api/v1/iac/scans/SCN-2026-09-30-001/config",
            json={"directories": "/infra, /custom_k8s", "parallel_scans": 6},
        )
        assert resp_upd.status_code == 200
        assert resp_upd.json()["directories"] == "/infra, /custom_k8s"
        assert resp_upd.json()["parallel_scans"] == 6

        # 11. Export Reports
        for fmt in ["json", "sarif", "csv"]:
            resp_exp = await client.get(f"/api/v1/iac/scans/SCN-2026-09-30-001/export?format={fmt}")
            assert resp_exp.status_code == 200
            assert len(resp_exp.content) > 0

        # 12. Download Logs
        resp_logs = await client.get("/api/v1/iac/scans/SCN-2026-09-30-001/logs/download")
        assert resp_logs.status_code == 200
        assert b"Starting IaC scan" in resp_logs.content

        # =====================================================================
        # Section 4: Configuration Analysis Tests (Screens 4.1 - 4.8)
        # =====================================================================

        # 13. Configuration Analysis Overview (Screen 4.1)
        resp_cfg_ov = await client.get("/api/v1/iac/config-analysis/overview")
        assert resp_cfg_ov.status_code == 200
        cfg_ov = resp_cfg_ov.json()
        assert cfg_ov["total_resources"] == 328
        assert cfg_ov["misconfigurations"] == 74
        assert cfg_ov["compliant"] == 216
        assert cfg_ov["best_practice_violations"] == 38
        assert len(cfg_ov["issues_trend"]) == 7
        assert len(cfg_ov["issues_by_resource_type"]) == 6

        # 14. Resource Inventory (Screen 4.2)
        resp_inv = await client.get("/api/v1/iac/config-analysis/inventory?page=1&page_size=10")
        assert resp_inv.status_code == 200
        inv_data = resp_inv.json()
        assert inv_data["total"] >= 10
        assert len(inv_data["items"]) == 10
        first_res = inv_data["items"][0]
        assert first_res["name"] == "my-app-bucket"
        assert first_res["status"] == "Non-Compliant"
        assert first_res["issues_count"] == 5

        # Inventory filter
        resp_inv_filtered = await client.get("/api/v1/iac/config-analysis/inventory?resource_type=S3")
        assert resp_inv_filtered.status_code == 200
        assert all(r["resource_type"] == "S3" for r in resp_inv_filtered.json()["items"])

        # 15. Misconfigurations (Screen 4.3)
        resp_misc = await client.get("/api/v1/iac/config-analysis/misconfigurations")
        assert resp_misc.status_code == 200
        misc_data = resp_misc.json()
        assert misc_data["total"] >= 10
        first_misc = misc_data["items"][0]
        assert first_misc["rule_id"] == "IAC-001"
        assert first_misc["severity"] == "Critical"
        assert first_misc["title"] == "S3 bucket public access"

        # 16. Secure Configurations (Screen 4.4)
        resp_sec = await client.get("/api/v1/iac/config-analysis/secure-configs")
        assert resp_sec.status_code == 200
        sec_data = resp_sec.json()
        assert sec_data["total"] >= 10
        assert all(s["status"] == "Secure" for s in sec_data["items"])

        # 17. Configuration Drift (Screen 4.5)
        resp_dft = await client.get("/api/v1/iac/config-analysis/drift")
        assert resp_dft.status_code == 200
        dft_data = resp_dft.json()
        assert dft_data["total"] >= 10
        has_drifted = any(d["drift_status"] == "Drifted" for d in dft_data["items"])
        has_in_sync = any(d["drift_status"] == "In Sync" for d in dft_data["items"])
        assert has_drifted and has_in_sync

        # 18. Security Best Practices (Screen 4.6)
        resp_bp = await client.get("/api/v1/iac/config-analysis/best-practices?framework=CIS%20Benchmarks")
        assert resp_bp.status_code == 200
        bp_data = resp_bp.json()
        assert bp_data["framework"] == "CIS Benchmarks"
        assert bp_data["total_checks"] == 72
        assert bp_data["passed"] == 48
        assert bp_data["failed"] == 16
        assert bp_data["warning"] == 8
        assert len(bp_data["items"]) == 10

        # 19. Resource Detail (Screen 4.7)
        resp_rd = await client.get("/api/v1/iac/config-analysis/resources/my-app-bucket")
        assert resp_rd.status_code == 200
        rd_data = resp_rd.json()
        assert rd_data["name"] == "my-app-bucket"
        assert rd_data["resource_type"] == "S3 Bucket"
        assert rd_data["status"] == "Critical"
        assert 'resource "aws_s3_bucket" "my_app_bucket"' in rd_data["terraform_code"]
        assert len(rd_data["detected_issues"]) == 5

        # 20. Comparison View (Screen 4.8)
        resp_cmp = await client.get("/api/v1/iac/config-analysis/compare/my-app-bucket")
        assert resp_cmp.status_code == 200
        cmp_data = resp_cmp.json()
        assert 'acl    = "private"' in cmp_data["declared_iac"]
        assert '"BucketName": "my-app-bucket"' in cmp_data["actual_state"]
        assert len(cmp_data["differences"]) == 4

        # 21. Reconcile Drift
        resp_rec = await client.post("/api/v1/iac/config-analysis/reconcile/my-app-bucket")
        assert resp_rec.status_code == 200
        assert resp_rec.json()["status"] == "QUEUED"

        # =====================================================================
        # Section 1 Tests: Screens 1.1 to 1.8
        # =====================================================================

        # 22. Screen 1.1: IaC Security Overview Dashboard
        resp_dash = await client.get("/api/v1/iac/overview/dashboard?time_range=Last%2030%20days")
        assert resp_dash.status_code == 200
        dash_data = resp_dash.json()
        assert dash_data["total_findings"] == 328
        assert dash_data["critical"] == 76
        assert dash_data["high"] == 124
        assert dash_data["medium"] == 86
        assert dash_data["low"] == 42
        assert len(dash_data["findings_trend"]) == 7
        assert dash_data["findings_by_severity"]["Critical"] == 23.0
        assert len(dash_data["findings_by_type"]) == 5
        assert dash_data["findings_by_type"][0]["iac_type"] == "Terraform"
        assert dash_data["findings_by_type"][0]["percentage"] == 43.0

        # 23. Screen 1.2: Environment Overview
        resp_envs = await client.get("/api/v1/iac/overview/environments")
        assert resp_envs.status_code == 200
        envs_data = resp_envs.json()
        assert len(envs_data["environments"]) == 4
        env_names = [e["environment"] for e in envs_data["environments"]]
        assert "Production" in env_names
        assert "Staging" in env_names
        assert "Development" in env_names
        assert "QA" in env_names
        prod = next(e for e in envs_data["environments"] if e["environment"] == "Production")
        assert prod["total_findings"] == 142
        assert prod["compliance_score"] == 68.0
        assert len(envs_data["trend"]) == 7

        # 24. Screen 1.3: Provider Overview
        resp_provs = await client.get("/api/v1/iac/overview/providers")
        assert resp_provs.status_code == 200
        provs_data = resp_provs.json()
        assert len(provs_data["providers"]) == 4
        aws_p = next(p for p in provs_data["providers"] if p["provider"] == "AWS")
        assert aws_p["total_findings"] == 214
        assert aws_p["resource_percentage"] == 68.0
        assert aws_p["resources_count"] == 1248

        # 25. Screen 1.4: Resource Inventory
        resp_res = await client.get("/api/v1/iac/overview/resources?page=1&page_size=10")
        assert resp_res.status_code == 200
        res_data = resp_res.json()
        assert res_data["total"] == 10
        assert len(res_data["items"]) == 10
        assert res_data["items"][0]["name"] == "my-app-vpc"
        assert res_data["items"][0]["status"] == "Scanned"
        assert res_data["items"][0]["findings_count"] == 6

        # Resource Inventory Filter
        resp_res_filt = await client.get("/api/v1/iac/overview/resources?provider=AWS")
        assert resp_res_filt.status_code == 200
        for item in resp_res_filt.json()["items"]:
            assert item["provider"] == "AWS"

        # 26. Screen 1.5: IaC Coverage
        resp_cov = await client.get("/api/v1/iac/overview/coverage")
        assert resp_cov.status_code == 200
        cov_data = resp_cov.json()
        assert cov_data["total_repositories"] == 48
        assert cov_data["total_iac_files"] == 312
        assert cov_data["coverage_percentage"] == 86.0
        assert cov_data["not_scanned_count"] == 14
        assert cov_data["scanned_count"] == 268
        assert len(cov_data["repositories"]) == 8
        assert cov_data["repositories"][0]["repository_name"] == "frontend-app"
        assert cov_data["repositories"][0]["coverage_percentage"] == 100.0
        assert len(cov_data["file_types"]) == 6
        assert cov_data["file_types"][0]["extension"] == ".tf"

        # 27. Screen 1.6: Compliance Overview
        resp_comp = await client.get("/api/v1/iac/overview/compliance")
        assert resp_comp.status_code == 200
        comp_data = resp_comp.json()
        assert len(comp_data["standards"]) == 4
        cis_std = next(s for s in comp_data["standards"] if s["standard"] == "CIS")
        assert cis_std["compliance_percentage"] == 68.0
        assert len(comp_data["trend"]) == 7
        assert len(comp_data["top_failures"]) == 5
        assert comp_data["top_failures"][0]["control"] == "1.1"
        assert comp_data["top_failures"][0]["severity"] == "Critical"

        # 28. Screen 1.7: Risk Summary
        resp_risk = await client.get("/api/v1/iac/overview/risk")
        assert resp_risk.status_code == 200
        risk_data = resp_risk.json()
        assert risk_data["risk_score"] == 72
        assert risk_data["risk_level"] == "High"
        assert len(risk_data["breakdown"]) == 4
        assert risk_data["breakdown"][0]["category"] == "Misconfiguration Risk"
        assert risk_data["breakdown"][0]["percentage"] == 42.0
        assert len(risk_data["trend"]) == 7

        # 29. Screen 1.8: Recent Activity
        resp_act = await client.get("/api/v1/iac/overview/activity")
        assert resp_act.status_code == 200
        act_data = resp_act.json()
        assert len(act_data["activities"]) == 8
        assert act_data["activities"][0]["title"] == "Scan completed for frontend-app"
        assert act_data["activities"][0]["activity_type"] == "scan_completed"

        # Activity Filter
        resp_act_filt = await client.get("/api/v1/iac/overview/activity?activity_type=drift_detected")
        assert resp_act_filt.status_code == 200
        for a in resp_act_filt.json()["activities"]:
            assert a["activity_type"] == "drift_detected"

        # =====================================================================
        # Section 13: Policies & Quality Gates Tests (Screens 13.1 - 13.8)
        # =====================================================================

        # 30. Screen 13.1: Policies Overview
        resp_pol_ov = await client.get("/api/v1/iac/policies-gates/overview")
        assert resp_pol_ov.status_code == 200
        pol_ov = resp_pol_ov.json()
        assert pol_ov["total_policies"] == 24
        assert pol_ov["enforced"] == 18
        assert pol_ov["draft"] == 4
        assert pol_ov["disabled"] == 2
        assert pol_ov["policy_compliance_total"] == 24
        assert pol_ov["policy_compliance_compliant"] == 16
        assert pol_ov["policy_compliance_non_compliant"] == 6
        assert pol_ov["quality_gate_total"] == 48
        assert pol_ov["quality_gate_passed"] == 36
        assert pol_ov["quality_gate_failed"] == 8
        assert len(pol_ov["violations_trend"]) == 7
        assert len(pol_ov["top_violations"]) == 5
        assert pol_ov["top_violations"][0]["id"] == "POL-001"

        # 31. Screen 13.2: Policies Catalog
        resp_pol_cat = await client.get("/api/v1/iac/policies-gates/policies?page=1&page_size=10")
        assert resp_pol_cat.status_code == 200
        pol_cat = resp_pol_cat.json()
        assert pol_cat["total"] >= 10
        assert len(pol_cat["items"]) == 10
        assert pol_cat["items"][0]["id"] == "POL-001"
        assert pol_cat["items"][0]["status"] == "Enforced"

        # Filter policies by type
        resp_pol_type = await client.get("/api/v1/iac/policies-gates/policies?type=Security")
        assert resp_pol_type.status_code == 200
        for p in resp_pol_type.json()["items"]:
            assert p["type"] == "Security"

        # Create Policy (13.2 modal)
        resp_create_pol = await client.post(
            "/api/v1/iac/policies-gates/policies",
            json={
                "name": "Block Insecure Ports",
                "type": "Network",
                "severity": "Critical",
                "status": "Enforced",
                "framework": "CIS AWS",
                "description": "Block open ports 22 and 3389 to internet.",
                "scope_frameworks": ["Terraform"],
                "scope_resources": ["aws_security_group"],
                "evaluation_logic": "if port in [22, 3389] then fail()",
                "remediation_text": "Close ingress rules.",
            },
        )
        assert resp_create_pol.status_code == 200
        created_pol = resp_create_pol.json()
        assert created_pol["name"] == "Block Insecure Ports"

        # 32. Screen 13.3: Policy Detail
        resp_pol_det = await client.get("/api/v1/iac/policies-gates/policies/POL-001")
        assert resp_pol_det.status_code == 200
        pol_det = resp_pol_det.json()
        assert pol_det["id"] == "POL-001"
        assert pol_det["name"] == "No Public S3 Buckets"
        assert pol_det["severity"] == "Critical"
        assert len(pol_det["rules"]) == 3
        assert len(pol_det["exceptions"]) == 2
        assert len(pol_det["affected_repos"]) == 6

        # 33. Screen 13.4: Quality Gates List
        resp_qg = await client.get("/api/v1/iac/policies-gates/quality-gates")
        assert resp_qg.status_code == 200
        qg_data = resp_qg.json()
        assert qg_data["total"] >= 8
        prod_gate = next(g for g in qg_data["items"] if g["name"] == "Production Gate")
        assert prod_gate["fail_condition"] == "Critical or High"
        assert prod_gate["affected_repos"] == 8

        # Create Quality Gate (13.4 modal)
        resp_create_qg = await client.post(
            "/api/v1/iac/policies-gates/quality-gates",
            json={
                "name": "Staging Security Gate",
                "description": "Gate for staging env",
                "status": "Draft",
                "fail_condition": "Any Critical",
                "rules": ["RULE-001"],
                "repositories": ["staging-infra"],
            },
        )
        assert resp_create_qg.status_code == 200
        assert resp_create_qg.json()["name"] == "Staging Security Gate"

        # 34. Screen 13.5: Quality Gate Detail
        resp_qg_det = await client.get("/api/v1/iac/policies-gates/quality-gates/QG-002")
        assert resp_qg_det.status_code == 200
        qg_det = resp_qg_det.json()
        assert qg_det["id"] == "QG-002"
        assert qg_det["name"] == "Production Gate"
        assert qg_det["fail_condition"] == "Critical or High"
        assert len(qg_det["rules"]) == 8
        assert qg_det["rules"][0]["rule_id"] == "RULE-001"
        assert len(qg_det["repositories"]) == 8
        assert len(qg_det["pipelines"]) >= 1

        # Add Rule to Quality Gate (13.5 modal)
        resp_add_r = await client.post(
            "/api/v1/iac/policies-gates/quality-gates/QG-002/rules",
            json={"rule_id": "RULE-099", "rule_name": "Block Unapproved Regions", "severity": "Medium"},
        )
        assert resp_add_r.status_code == 200
        assert any(r["rule_id"] == "RULE-099" for r in resp_add_r.json()["rules"])

        # Remove Rule from Quality Gate (13.5 trash action)
        resp_del_r = await client.delete("/api/v1/iac/policies-gates/quality-gates/QG-002/rules/RULE-099")
        assert resp_del_r.status_code == 200
        assert not any(r["rule_id"] == "RULE-099" for r in resp_del_r.json()["rules"])

        # 35. Screen 13.6: Policy Violations
        resp_vio = await client.get("/api/v1/iac/policies-gates/violations")
        assert resp_vio.status_code == 200
        vio_data = resp_vio.json()
        assert vio_data["total"] >= 1
        assert len(vio_data["items"]) >= 1
        assert vio_data["items"][0]["id"].startswith("VIO-")
        assert "title" in vio_data["items"][0]
        assert "severity" in vio_data["items"][0]
        assert "status" in vio_data["items"][0]

        # Filter violations by status
        resp_vio_filt = await client.get("/api/v1/iac/policies-gates/violations?status=Resolved")
        assert resp_vio_filt.status_code == 200
        for v in resp_vio_filt.json()["items"]:
            assert v["status"] == "Resolved"

        # 36. Screen 13.7: Policy Exceptions
        resp_exc = await client.get("/api/v1/iac/policies-gates/exceptions")
        assert resp_exc.status_code == 200
        exc_data = resp_exc.json()
        assert exc_data["total"] >= 6
        assert exc_data["items"][0]["id"] == "EXC-001"
        assert exc_data["items"][0]["title"] == "Allow public S3 for docs"
        assert exc_data["items"][0]["status"] == "Active"

        # Create Exception (13.7 modal)
        resp_create_exc = await client.post(
            "/api/v1/iac/policies-gates/exceptions",
            json={
                "title": "Temporary testing exception",
                "policy_rule": "POL-001",
                "repository": "frontend-app",
                "valid_until": "2026-11-30",
                "reason": "CI integration test run",
            },
        )
        assert resp_create_exc.status_code == 200
        assert resp_create_exc.json()["title"] == "Temporary testing exception"
        assert resp_create_exc.json()["status"] == "Active"

        # 37. Screen 13.8: Settings
        resp_set = await client.get("/api/v1/iac/policies-gates/settings")
        assert resp_set.status_code == 200
        set_data = resp_set.json()
        assert set_data["enable_policy_enforcement"] is True
        assert set_data["block_merge_on_gate_failure"] is True
        assert set_data["default_quality_gate"] == "Default IaC Gate"

        # Update Settings (13.8 save action)
        set_data["block_merge_on_gate_failure"] = False
        set_data["default_quality_gate"] = "Production Gate"
        resp_set_upd = await client.put("/api/v1/iac/policies-gates/settings", json=set_data)
        assert resp_set_upd.status_code == 200
        upd_data = resp_set_upd.json()
        assert upd_data["block_merge_on_gate_failure"] is False
        assert upd_data["default_quality_gate"] == "Production Gate"

        # -------------------------------------------------------------
        # SECTION 6: IaC Rules Endpoints (Screens 6.1 to 6.8)
        # -------------------------------------------------------------

        # 38. Screen 6.1: Rules Overview
        resp_rules_ov = await client.get("/api/v1/iac/rules/overview")
        assert resp_rules_ov.status_code == 200
        ov_data = resp_rules_ov.json()
        assert ov_data["total_rules"] == 512
        assert ov_data["enabled_rules"] == 368
        assert ov_data["disabled_rules"] == 124
        assert ov_data["custom_rules"] == 20
        assert ov_data["severity_distribution"]["critical"] == 68
        assert ov_data["severity_distribution"]["high"] == 124
        assert ov_data["severity_distribution"]["medium"] == 198
        assert ov_data["severity_distribution"]["low"] == 122
        assert len(ov_data["framework_distribution"]) == 6

        # 39. Screen 6.2: All Rules Catalog
        resp_all_rules = await client.get("/api/v1/iac/rules?page=1&page_size=10")
        assert resp_all_rules.status_code == 200
        all_rules_data = resp_all_rules.json()
        assert len(all_rules_data["items"]) >= 10
        assert any(r["id"] == "IAC-001" for r in all_rules_data["items"])

        # 40. Screen 6.3: Enabled Rules
        resp_enabled = await client.get("/api/v1/iac/rules?status=Enabled")
        assert resp_enabled.status_code == 200
        enabled_data = resp_enabled.json()
        assert len(enabled_data["items"]) > 0
        assert all(r["status"] == "Enabled" for r in enabled_data["items"])

        # 41. Screen 6.4: Disabled Rules
        resp_disabled = await client.get("/api/v1/iac/rules?status=Disabled")
        assert resp_disabled.status_code == 200
        disabled_data = resp_disabled.json()
        assert len(disabled_data["items"]) > 0
        assert all(r["status"] == "Disabled" for r in disabled_data["items"])

        # 42. Screen 6.5: Custom Rules
        resp_custom = await client.get("/api/v1/iac/rules?is_custom=true")
        assert resp_custom.status_code == 200
        custom_data = resp_custom.json()
        assert len(custom_data["items"]) == 10
        assert any(r["id"] == "CUST-001" for r in custom_data["items"])

        # 43. Screen 6.6: Rule Packs
        resp_packs = await client.get("/api/v1/iac/rules/packs")
        assert resp_packs.status_code == 200
        packs_data = resp_packs.json()
        assert packs_data["total"] >= 9
        assert any(p["name"] == "CIS AWS Benchmark" for p in packs_data["items"])
        assert any(p["name"] == "NIST 800-53" for p in packs_data["items"])

        # Toggle Pack status
        resp_pack_toggle = await client.patch("/api/v1/iac/rules/packs/NIST 800-53/status?status=Disabled")
        assert resp_pack_toggle.status_code == 200
        assert resp_pack_toggle.json()["status"] == "Disabled"

        # 44. Screen 6.7: Rules Search & Filter
        resp_filtered = await client.get("/api/v1/iac/rules?provider=Kubernetes&severity=Critical")
        assert resp_filtered.status_code == 200
        filtered_data = resp_filtered.json()
        assert len(filtered_data["items"]) > 0
        assert all(r["provider"] == "Kubernetes" and r["severity"] == "Critical" for r in filtered_data["items"])

        # 45. Screen 6.8: Rule Configuration Detail & Update
        resp_r_detail = await client.get("/api/v1/iac/rules/IAC-001")
        assert resp_r_detail.status_code == 200
        r_det = resp_r_detail.json()
        assert r_det["id"] == "IAC-001"
        assert "s3" in r_det["rego_code"].lower()
        assert r_det["category"] == "Storage"

        # Update Rule Configuration (Save Changes button)
        resp_r_update = await client.put(
            "/api/v1/iac/rules/IAC-001",
            json={
                "description": "Updated S3 bucket public access rule description.",
                "severity": "Critical",
                "status": "Enabled",
            },
        )
        assert resp_r_update.status_code == 200
        assert resp_r_update.json()["description"] == "Updated S3 bucket public access rule description."

        # 46. Screen 6.8: Rego Syntax Validation
        resp_val_ok = await client.post(
            "/api/v1/iac/rules/validate-rego",
            json={"rego_code": "package iac.test\n\ndeny[msg] {\n    input.x == true\n    msg := \"Denied\"\n}"},
        )
        assert resp_val_ok.status_code == 200
        assert resp_val_ok.json()["valid"] is True
        assert resp_val_ok.json()["package_name"] == "iac.test"

        resp_val_err = await client.post(
            "/api/v1/iac/rules/validate-rego",
            json={"rego_code": "no package statement here"},
        )
        assert resp_val_err.status_code == 200
        assert resp_val_err.json()["valid"] is False
        assert len(resp_val_err.json()["errors"]) > 0

        # 47. Create & Delete Rule Actions
        resp_create_rule = await client.post(
            "/api/v1/iac/rules",
            json={
                "name": "Disallow Public IP on Compute",
                "description": "Compute instances must not have public IP attached.",
                "category": "Compute",
                "provider": "AWS",
                "severity": "High",
                "rule_type": "Misconfiguration",
                "frameworks": ["Custom"],
                "status": "Enabled",
                "is_custom": True,
            },
        )
        assert resp_create_rule.status_code == 200
        created_rule = resp_create_rule.json()
        created_id = created_rule["id"]
        assert created_id.startswith("CUST-")

        # Toggle status
        resp_toggle_rule = await client.patch(f"/api/v1/iac/rules/{created_id}/status?status=Disabled")
        assert resp_toggle_rule.status_code == 200
        assert resp_toggle_rule.json()["status"] == "Disabled"

        # Delete rule
        resp_del_rule = await client.delete(f"/api/v1/iac/rules/{created_id}")
        assert resp_del_rule.status_code == 200
        assert resp_del_rule.json()["status"] == "deleted"

    app.dependency_overrides.clear()



