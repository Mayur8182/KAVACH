import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_detections_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/detections/overview")
        assert resp.status_code == 401

        resp_table = await client.get("/api/v1/code/secrets/detections/table")
        assert resp_table.status_code == 401


@pytest.mark.asyncio
async def test_secrets_detections_overview(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/secrets/detections/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # KPI verification matching screenshot
    kpis = data["kpis"]
    assert kpis["total_findings"] == 18
    assert kpis["total_trend"] == "↑ 12%"
    assert kpis["critical_count"] == 3
    assert kpis["high_count"] == 7
    assert kpis["medium_count"] == 6
    assert kpis["low_count"] == 2

    assert kpis["resolved_count"] == 12
    assert kpis["resolved_trend"] == "↑ 20%"
    assert kpis["resolved_rate"] == "66% resolution rate"

    assert kpis["open_count"] == 6
    assert kpis["open_trend"] == "↓ 25%"
    assert kpis["open_subtitle"] == "requiring attention"

    assert kpis["repos_affected"] == 5
    assert kpis["repos_total"] == 8
    assert kpis["repos_trend"] == "↑ 17%"

    # Analytics verification matching charts in screenshot
    analytics = data["analytics"]
    trends = analytics["trends"]
    assert len(trends) == 7
    assert trends[0]["date"] == "Sep 1"
    assert trends[-1]["date"] == "Sep 30"
    # Peak detection around Sep 15
    peak = next(t for t in trends if t["date"] == "Sep 15")
    assert peak["total"] == 38

    # Donut chart distribution by type
    by_type = analytics["by_type"]
    assert len(by_type) == 6
    type_labels = [item["label"] for item in by_type]
    assert "API Keys" in type_labels
    assert "Cloud Credentials" in type_labels
    assert "Tokens" in type_labels
    assert "Database URLs" in type_labels
    assert "Private Keys" in type_labels
    assert "Other" in type_labels
    total_types = sum(item["count"] for item in by_type)
    assert total_types == 18

    # Severity bar chart
    by_severity = analytics["by_severity"]
    assert len(by_severity) == 4
    sev_map = {item["severity"]: item["count"] for item in by_severity}
    assert sev_map["Critical"] == 3
    assert sev_map["High"] == 7
    assert sev_map["Medium"] == 6
    assert sev_map["Low"] == 2


@pytest.mark.asyncio
async def test_secrets_detections_table_pagination(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Page 1 (8 items / page matching SecuLayer default table size)
    resp_p1 = await client.get("/api/v1/code/secrets/detections/table?page=1&page_size=8", headers=headers)
    assert resp_p1.status_code == 200
    data_p1 = resp_p1.json()
    assert data_p1["total"] == 18
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 8
    assert data_p1["total_pages"] == 3
    assert len(data_p1["items"]) == 8

    # Verify first 8 canonical rows from the design reference
    row_titles = [i["secret_title"] for i in data_p1["items"]]
    assert "AWS Access Key" in row_titles
    assert "OpenAI API Key" in row_titles
    assert "Database URL" in row_titles
    assert "GitHub Token" in row_titles
    assert "Slack Token" in row_titles
    assert "Private Key" in row_titles
    assert "SendGrid API Key" in row_titles
    assert "JWT Secret" in row_titles

    # Page 2 (8 items)
    resp_p2 = await client.get("/api/v1/code/secrets/detections/table?page=2&page_size=8", headers=headers)
    assert resp_p2.status_code == 200
    data_p2 = resp_p2.json()
    assert data_p2["page"] == 2
    assert len(data_p2["items"]) == 8

    # Page 3 (remaining 2 items)
    resp_p3 = await client.get("/api/v1/code/secrets/detections/table?page=3&page_size=8", headers=headers)
    assert resp_p3.status_code == 200
    data_p3 = resp_p3.json()
    assert data_p3["page"] == 3
    assert len(data_p3["items"]) == 2


@pytest.mark.asyncio
async def test_secrets_detections_filters(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Severity filter = Critical
    resp_crit = await client.get("/api/v1/code/secrets/detections/table?severity=Critical", headers=headers)
    assert resp_crit.status_code == 200
    items_crit = resp_crit.json()["items"]
    assert len(items_crit) == 3
    assert all(i["severity"] == "Critical" for i in items_crit)

    # 2. Status filter = Resolved
    resp_res = await client.get("/api/v1/code/secrets/detections/table?status=Resolved", headers=headers)
    assert resp_res.status_code == 200
    items_res = resp_res.json()["items"]
    assert len(items_res) > 0
    assert all(i["status"] == "Resolved" for i in items_res)

    # 3. Repository filter = frontend-app
    resp_repo = await client.get("/api/v1/code/secrets/detections/table?repository=frontend-app", headers=headers)
    assert resp_repo.status_code == 200
    items_repo = resp_repo.json()["items"]
    assert len(items_repo) > 0
    assert all("frontend-app" in i["repository"] for i in items_repo)

    # 4. Search query = openai
    resp_search = await client.get("/api/v1/code/secrets/detections/table?search=openai", headers=headers)
    assert resp_search.status_code == 200
    items_search = resp_search.json()["items"]
    assert len(items_search) >= 1
    assert any("openai" in i["secret_title"].lower() or "openai" in i["file_path"].lower() for i in items_search)


@pytest.mark.asyncio
async def test_secrets_detections_detail_and_status(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Detail
    resp_det = await client.get("/api/v1/code/secrets/detections/detail/inv-01", headers=headers)
    assert resp_det.status_code == 200
    item = resp_det.json()
    assert item["id"] == "inv-01"
    assert item["secret_title"] == "AWS Access Key"
    assert item["repository"] == "frontend-app"
    assert item["file_path"] == "/src/config/aws.js"

    # Status update to In Progress
    payload = {"status": "In Progress", "reason": "Rotating key via AWS Console"}
    resp_stat = await client.post("/api/v1/code/secrets/detections/inv-01/status", json=payload, headers=headers)
    assert resp_stat.status_code == 200
    assert resp_stat.json()["status"] == "In Progress"

    # Revert back to Open
    payload_rev = {"status": "Open", "reason": "Test revert"}
    resp_rev = await client.post("/api/v1/code/secrets/detections/inv-01/status", json=payload_rev, headers=headers)
    assert resp_rev.status_code == 200
    assert resp_rev.json()["status"] == "Open"


@pytest.mark.asyncio
async def test_secrets_detections_export(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # JSON export
    resp_json = await client.get("/api/v1/code/secrets/detections/export?format=json", headers=headers)
    assert resp_json.status_code == 200
    data_json = resp_json.json()
    assert data_json["format"] == "json"
    assert data_json["total_items"] == 18
    assert len(data_json["data"]) == 18

    # CSV export
    resp_csv = await client.get("/api/v1/code/secrets/detections/export?format=csv", headers=headers)
    assert resp_csv.status_code == 200
    data_csv = resp_csv.json()
    assert data_csv["format"] == "csv"
    assert data_csv["total_items"] == 18
