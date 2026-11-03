import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_scans_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/scans/metrics")
        assert resp.status_code == 401

        resp_table = await client.get("/api/v1/code/secrets/scans")
        assert resp_table.status_code == 401


@pytest.mark.asyncio
async def test_secrets_scans_metrics(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. GET /api/v1/code/secrets/scans/metrics
    resp = await client.get("/api/v1/code/secrets/scans/metrics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "kpis" in data
    assert "trends" in data
    assert "severity" in data
    assert "coverage" in data

    # Verify KPI counts match reference design target
    kpis = data["kpis"]
    assert kpis["total_scans"] >= 24
    assert kpis["total_scans_trend"] == "↑ 20%"
    assert kpis["scans_with_findings"] >= 8
    assert kpis["scans_with_findings_trend"] == "↑ 14%"
    assert kpis["clean_scans"] >= 16
    assert kpis["clean_scans_trend"] == "↑ 33%"
    assert kpis["avg_scan_time"] == "2m 34s"
    assert kpis["avg_scan_time_trend"] == "↓ 28%"

    # Verify Trends (Sep 1 to Sep 30)
    assert len(data["trends"]) == 7
    assert data["trends"][0]["date"] == "Sep 1"
    assert data["trends"][-1]["date"] == "Sep 30"

    # Verify Donut Severity Breakdown
    sev = data["severity"]
    assert sev["total"] >= 20
    assert sev["critical"] >= 5
    assert sev["high"] >= 5
    assert sev["medium"] >= 3
    assert sev["low"] >= 1

    # Verify Coverage
    cov = data["coverage"]
    assert cov["repositories_scanned"] == 12
    assert cov["repositories_total"] == 12
    assert cov["repositories_pct"] == 100.0
    assert cov["branches_scanned"] == 43
    assert cov["branches_total"] == 48
    assert cov["branches_pct"] == 90.0
    assert cov["commits_scanned"] == 1248
    assert cov["commits_total"] == 1302
    assert cov["commits_pct"] == 96.0
    assert cov["files_scanned"] == 86432


@pytest.mark.asyncio
async def test_secrets_scans_table_pagination_and_filters(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Page 1, PageSize 10
    resp = await client.get("/api/v1/code/secrets/scans?page=1&page_size=10", headers=headers)
    assert resp.status_code == 200
    table_data = resp.json()
    assert table_data["total"] >= 24
    assert len(table_data["items"]) == 10
    assert table_data["page"] == 1
    assert table_data["page_size"] == 10

    first_item = table_data["items"][0]
    assert "id" in first_item
    assert "repository" in first_item
    assert "branch" in first_item
    assert "scan_type" in first_item
    assert "status" in first_item
    assert "findings" in first_item
    assert "duration" in first_item
    assert "started_at" in first_item

    # 2. Filter by repository
    resp_repo = await client.get("/api/v1/code/secrets/scans?repository=mobile-app", headers=headers)
    assert resp_repo.status_code == 200
    repo_data = resp_repo.json()
    for item in repo_data["items"]:
        assert item["repository"] == "mobile-app"

    # 3. Filter by status (Clean)
    resp_clean = await client.get("/api/v1/code/secrets/scans?status=Clean", headers=headers)
    assert resp_clean.status_code == 200
    clean_data = resp_clean.json()
    for item in clean_data["items"]:
        assert item["status"] == "Clean"

    # 4. Search query
    resp_search = await client.get("/api/v1/code/secrets/scans?search=infra", headers=headers)
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert search_data["total"] >= 1
    for item in search_data["items"]:
        assert "infra" in item["repository"].lower() or "infra" in item["id"].lower()


@pytest.mark.asyncio
async def test_secrets_scans_config_and_integrations(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. GET /api/v1/code/secrets/scans/config
    resp_cfg = await client.get("/api/v1/code/secrets/scans/config", headers=headers)
    assert resp_cfg.status_code == 200
    cfg = resp_cfg.json()
    assert cfg["scan_type"] == "Full Scan"
    assert "node_modules" in cfg["exclude_paths"]
    assert cfg["scan_on_push"] is True
    assert cfg["scan_on_pr"] is True

    # 2. PUT /api/v1/code/secrets/scans/config
    cfg["exclude_paths"] = "node_modules, .git, dist, build, test"
    cfg["scan_on_push"] = False
    resp_update = await client.put("/api/v1/code/secrets/scans/config", headers=headers, json=cfg)
    assert resp_update.status_code == 200
    updated_cfg = resp_update.json()
    assert "build" in updated_cfg["exclude_paths"]
    assert updated_cfg["scan_on_push"] is False

    # 3. GET /api/v1/code/secrets/scans/integrations
    resp_ints = await client.get("/api/v1/code/secrets/scans/integrations", headers=headers)
    assert resp_ints.status_code == 200
    ints = resp_ints.json()
    assert len(ints) == 5
    names = [i["name"] for i in ints]
    assert "GitHub Actions" in names
    assert "GitLab CI" in names
    assert "Jenkins" in names

    # 4. POST /api/v1/code/secrets/scans/integrations/toggle
    resp_toggle = await client.post(
        "/api/v1/code/secrets/scans/integrations/toggle",
        headers=headers,
        json={"id": "gitlab-ci", "enabled": True},
    )
    assert resp_toggle.status_code == 200
    toggled_list = resp_toggle.json()
    gitlab_item = next(i for i in toggled_list if i["id"] == "gitlab-ci")
    assert gitlab_item["enabled"] is True


@pytest.mark.asyncio
async def test_secrets_scans_trigger_and_schedule(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. POST /api/v1/code/secrets/scans/trigger
    payload = {
        "repository": "frontend-app",
        "branch": "feature/security-secrets",
        "scan_type": "Full Scan",
        "scope": "Entire Repository",
    }
    resp_trigger = await client.post("/api/v1/code/secrets/scans/trigger", headers=headers, json=payload)
    assert resp_trigger.status_code == 201
    scan_item = resp_trigger.json()
    assert scan_item["repository"] == "frontend-app"
    assert scan_item["branch"] == "feature/security-secrets"
    assert scan_item["scan_type"] == "Full Scan"
    assert scan_item["id"].startswith("scan_")

    # 2. POST /api/v1/code/secrets/scans/schedule
    sched_payload = {
        "repository": "frontend-app",
        "branch": "main",
        "frequency": "Daily",
        "time": "04:00 AM",
    }
    resp_sched = await client.post("/api/v1/code/secrets/scans/schedule", headers=headers, json=sched_payload)
    assert resp_sched.status_code == 200
    sched_res = resp_sched.json()
    assert "Daily at 04:00 AM" in sched_res["schedule"]

    # 3. GET /api/v1/code/secrets/scans/activity
    resp_act = await client.get("/api/v1/code/secrets/scans/activity", headers=headers)
    assert resp_act.status_code == 200
    activities = resp_act.json()
    assert len(activities) > 0
    assert "message" in activities[0]
    assert "status_color" in activities[0]


@pytest.mark.asyncio
async def test_secret_scan_detail_and_mutations(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. GET /api/v1/code/secrets/scans/scan_7f3a2e1
    resp = await client.get("/api/v1/code/secrets/scans/scan_7f3a2e1", headers=headers)
    assert resp.status_code == 200
    detail = resp.json()

    assert detail["scan_id"] == "scan_7f3a2e1"
    assert detail["repository"] == "frontend-app"
    assert detail["branch"] == "main"
    assert detail["commit"] == "9f8e7d6"
    assert detail["duration"] == "2m 14s"
    assert detail["status"] == "Findings"

    # Verify KPI counts match reference screenshot
    kpis = detail["kpis"]
    assert kpis["critical_count"] == 3
    assert kpis["high_count"] == 2
    assert kpis["medium_count"] == 1
    assert kpis["low_count"] == 0
    assert kpis["resolved_count"] == 5

    # Verify Findings list (6 findings)
    findings = detail["findings"]
    assert len(findings) == 6
    first_finding = findings[0]
    assert first_finding["id"] == "finding_aws_01"
    assert first_finding["secret_type"] == "AWS Access Key"
    assert first_finding["file_path"] == "src/config/aws.js"
    assert first_finding["line_number"] == 16
    assert first_finding["severity"] == "Critical"
    assert first_finding["status"] == "Open"
    assert "AKIAIOSFODNN7EXAMPLE" in first_finding["detected_value"]
    assert first_finding["code_context"]["highlight_line"] == 16
    assert len(first_finding["remediation_suggestions"]) == 4

    # Verify Tabs data
    assert len(detail["files_and_locations"]) >= 4
    assert len(detail["secrets_by_type"]) == 6
    assert len(detail["comparison"]) >= 5
    assert len(detail["scan_logs"]) >= 5
    assert len(detail["timeline"]) == 4
    assert len(detail["related_findings"]) == 3
    assert detail["scan_metadata"]["scanner_version"] == "v2.1"

    # 2. POST /api/v1/code/secrets/scans/scan_7f3a2e1/findings/finding_aws_01/resolve
    resolve_resp = await client.post(
        "/api/v1/code/secrets/scans/scan_7f3a2e1/findings/finding_aws_01/resolve",
        headers=headers,
        json={"resolved": True},
    )
    assert resolve_resp.status_code == 200
    updated_finding = resolve_resp.json()
    assert updated_finding["status"] == "Resolved"

    # Re-fetch detail to verify KPI was updated
    resp_after = await client.get("/api/v1/code/secrets/scans/scan_7f3a2e1", headers=headers)
    assert resp_after.status_code == 200
    detail_after = resp_after.json()
    assert detail_after["kpis"]["critical_count"] == 2  # Decreased by 1
    assert detail_after["kpis"]["resolved_count"] == 6  # Increased by 1

    # Toggle back to Open
    reopen_resp = await client.post(
        "/api/v1/code/secrets/scans/scan_7f3a2e1/findings/finding_aws_01/resolve",
        headers=headers,
        json={"resolved": False},
    )
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "Open"

    # 3. POST /api/v1/code/secrets/scans/scan_7f3a2e1/findings/finding_aws_01/remediation-pr
    pr_resp = await client.post(
        "/api/v1/code/secrets/scans/scan_7f3a2e1/findings/finding_aws_01/remediation-pr",
        headers=headers,
        json={"title": "fix: remove hardcoded AWS access key", "branch_name": "fix/aws-secret-cleanup"},
    )
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert pr_data["pr_number"] == 142
    assert "github.com" in pr_data["pr_url"]
    assert pr_data["branch_name"] == "fix/aws-secret-cleanup"

    # 4. POST /api/v1/code/secrets/scans/scan_7f3a2e1/rescan
    rescan_resp = await client.post("/api/v1/code/secrets/scans/scan_7f3a2e1/rescan", headers=headers)
    assert rescan_resp.status_code == 200
    rescan_data = rescan_resp.json()
    assert rescan_data["scan_id"] == "scan_7f3a2e1"

    # 5. GET /api/v1/code/secrets/scans/scan_7f3a2e1/report
    report_resp = await client.get("/api/v1/code/secrets/scans/scan_7f3a2e1/report?format=json", headers=headers)
    assert report_resp.status_code == 200
    assert "findings_count" in report_resp.json()

    sarif_resp = await client.get("/api/v1/code/secrets/scans/scan_7f3a2e1/report?format=sarif", headers=headers)
    assert sarif_resp.status_code == 200
    assert sarif_resp.json()["version"] == "2.1.0"

