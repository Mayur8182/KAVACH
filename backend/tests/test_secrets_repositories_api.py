import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secrets_repositories_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/repositories/overview")
        assert resp.status_code == 401

        resp_table = await client.get("/api/v1/code/secrets/repositories/table")
        assert resp_table.status_code == 401


@pytest.mark.asyncio
async def test_secrets_repositories_overview(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/secrets/repositories/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # KPI verification matching screenshot
    kpis = data["kpis"]
    assert kpis["total_repositories"] == 12
    assert kpis["repositories_with_secrets"] == 8
    assert kpis["repositories_with_secrets_trend"] == "↑ 33%"
    assert kpis["total_secrets_found"] == 18
    assert kpis["total_secrets_trend"] == "↑ 12%"
    assert kpis["high_risk_repositories"] == 3
    assert kpis["high_risk_trend"] == "↑ 50%"
    assert kpis["clean_repositories"] == 4
    assert kpis["clean_trend"] == "↓ 20%"

    # Analytics: Repositories by secret count
    analytics = data["analytics"]
    by_count = analytics["by_secret_count"]
    assert len(by_count) == 6
    count_map = {b["repository"]: b["count"] for b in by_count}
    assert count_map["frontend-app"] == 8
    assert count_map["backend-api"] == 5
    assert count_map["mobile-app"] == 3
    assert count_map["infrastructure"] == 2
    assert count_map["ml-service"] == 2
    assert count_map["others"] == 1

    # Analytics: Secret types across repositories
    by_type = analytics["by_secret_type"]
    assert len(by_type) == 5
    type_map = {t["label"]: t["count"] for t in by_type}
    assert type_map["API Keys"] == 7
    assert type_map["Tokens"] == 4
    assert type_map["Cloud Credentials"] == 3
    assert type_map["Database URLs"] == 2
    assert type_map["Private Keys"] == 2
    assert sum(t["count"] for t in by_type) == 18

    # Analytics: Top repositories by risk
    top_risk = analytics["top_risk_repositories"]
    assert len(top_risk) == 5
    assert top_risk[0]["rank"] == 1
    assert top_risk[0]["repository"] == "frontend-app"
    assert top_risk[0]["risk_level"] == "Critical"
    assert top_risk[0]["secrets_count"] == 8

    assert top_risk[1]["rank"] == 2
    assert top_risk[1]["repository"] == "backend-api"
    assert top_risk[1]["risk_level"] == "High"

    assert top_risk[2]["rank"] == 3
    assert top_risk[2]["repository"] == "infrastructure"
    assert top_risk[2]["risk_level"] == "Medium"


@pytest.mark.asyncio
async def test_secrets_repositories_table_pagination(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Page 1 (10 items / page matching SecuLayer default table size)
    resp_p1 = await client.get("/api/v1/code/secrets/repositories/table?page=1&page_size=10", headers=headers)
    assert resp_p1.status_code == 200
    data_p1 = resp_p1.json()
    assert data_p1["total"] == 12
    assert data_p1["page"] == 1
    assert data_p1["page_size"] == 10
    assert data_p1["total_pages"] == 2
    assert len(data_p1["items"]) == 10

    # Verify first row matches frontend-app from screenshot
    first = data_p1["items"][0]
    assert first["name"] == "frontend-app"
    assert first["organization"] == "NJ Group"
    assert first["visibility"] == "Private"
    assert first["secret_count"] == 8
    assert first["critical"] == 3
    assert first["high"] == 3
    assert first["medium"] == 1
    assert first["low"] == 1
    assert first["status"] == "Issues Found"
    assert first["risk_level"] == "Critical"

    # Verify second row matches backend-api
    second = data_p1["items"][1]
    assert second["name"] == "backend-api"
    assert second["secret_count"] == 5
    assert second["critical"] == 2
    assert second["high"] == 1
    assert second["status"] == "Issues Found"

    # Page 2 (remaining 2 items)
    resp_p2 = await client.get("/api/v1/code/secrets/repositories/table?page=2&page_size=10", headers=headers)
    assert resp_p2.status_code == 200
    data_p2 = resp_p2.json()
    assert data_p2["page"] == 2
    assert len(data_p2["items"]) == 2


@pytest.mark.asyncio
async def test_secrets_repositories_filters(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Visibility = Public
    resp_pub = await client.get("/api/v1/code/secrets/repositories/table?visibility=Public", headers=headers)
    assert resp_pub.status_code == 200
    items_pub = resp_pub.json()["items"]
    assert len(items_pub) > 0
    assert all(r["visibility"] == "Public" for r in items_pub)

    # 2. Risk Level = Critical
    resp_crit = await client.get("/api/v1/code/secrets/repositories/table?risk_level=Critical", headers=headers)
    assert resp_crit.status_code == 200
    items_crit = resp_crit.json()["items"]
    assert len(items_crit) == 1
    assert items_crit[0]["name"] == "frontend-app"
    assert items_crit[0]["risk_level"] == "Critical"

    # 3. Status = Clean
    resp_clean = await client.get("/api/v1/code/secrets/repositories/table?scan_status=Clean", headers=headers)
    assert resp_clean.status_code == 200
    items_clean = resp_clean.json()["items"]
    assert len(items_clean) >= 4
    assert all(r["status"] == "Clean" for r in items_clean)

    # 4. Search query = mobile
    resp_search = await client.get("/api/v1/code/secrets/repositories/table?search=mobile", headers=headers)
    assert resp_search.status_code == 200
    items_search = resp_search.json()["items"]
    assert len(items_search) == 1
    assert items_search[0]["name"] == "mobile-app"


@pytest.mark.asyncio
async def test_secrets_repositories_detail(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Detail by name
    resp_det = await client.get("/api/v1/code/secrets/repositories/detail/frontend-app", headers=headers)
    assert resp_det.status_code == 200
    repo = resp_det.json()
    assert repo["name"] == "frontend-app"
    assert repo["organization"] == "NJ Group"
    assert repo["default_branch"] == "main"
    assert repo["secret_count"] == 8
    assert repo["open_findings"] == 8
    assert repo["risk_level"] == "Critical"

    # Detail by ID
    resp_id = await client.get("/api/v1/code/secrets/repositories/detail/repo-01", headers=headers)
    assert resp_id.status_code == 200
    assert resp_id.json()["id"] == "repo-01"

    # 404 for unknown repository
    resp_404 = await client.get("/api/v1/code/secrets/repositories/detail/unknown-repo-xyz", headers=headers)
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_secrets_repositories_scan_trigger(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    payload = {"repository": "frontend-app", "branch": "main"}
    resp = await client.post("/api/v1/code/secrets/repositories/scan", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["repository"] == "frontend-app"
    assert data["status"] == "QUEUED"
    assert data["scan_id"].startswith("sec-scan-")
    assert "queued successfully" in data["message"]


@pytest.mark.asyncio
async def test_secrets_repositories_export(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # JSON export
    resp_json = await client.get("/api/v1/code/secrets/repositories/export?format=json", headers=headers)
    assert resp_json.status_code == 200
    data_json = resp_json.json()
    assert data_json["format"] == "json"
    assert data_json["total_items"] == 12
    assert len(data_json["data"]) == 12

    # CSV export
    resp_csv = await client.get("/api/v1/code/secrets/repositories/export?format=csv", headers=headers)
    assert resp_csv.status_code == 200
    data_csv = resp_csv.json()
    assert data_csv["format"] == "csv"
    assert data_csv["total_items"] == 12
