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
    name="Mayur K.",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_sbom_summary_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/sbom/summary")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_sbom_endpoints_authorized():
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/sbom/summary?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc")
        assert resp.status_code == 200
        summary = resp.json()
        assert summary["total_components"] == 124
        assert summary["vulnerable_components"] == 18
        assert summary["open_source_licenses"] == 32
        assert summary["high_risk_licenses"] == 6
        assert "by_severity" in summary
        assert len(summary["by_severity"]) == 5
        assert "by_type" in summary
        assert len(summary["by_type"]) == 4
        assert "top_vulnerable" in summary
        assert len(summary["top_vulnerable"]) >= 5

        # 2. Components List (page 1, 8 per page)
        resp_comp = await client.get(
            "/api/v1/sbom/components?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc&page=1&page_size=8"
        )
        assert resp_comp.status_code == 200
        comp_data = resp_comp.json()
        assert comp_data["total"] == 124
        assert len(comp_data["items"]) == 8
        assert comp_data["page"] == 1
        assert comp_data["total_pages"] == 16
        assert "available_types" in comp_data
        assert "available_licenses" in comp_data

        # Check top items match screenshot
        names = [item["name"] for item in comp_data["items"]]
        assert "react" in names or "next" in names or "lodash" in names

        # 3. Filtering by type
        resp_filter = await client.get(
            "/api/v1/sbom/components?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc&component_type=npm"
        )
        assert resp_filter.status_code == 200
        npm_data = resp_filter.json()
        assert npm_data["total"] == 92
        for item in npm_data["items"]:
            assert item["component_type"] == "npm"

        # 4. Search filter
        resp_search = await client.get(
            "/api/v1/sbom/components?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc&search=react"
        )
        assert resp_search.status_code == 200
        search_data = resp_search.json()
        assert search_data["total"] >= 1
        assert any("react" in i["name"].lower() for i in search_data["items"])

        # 5. Export CycloneDX
        resp_export = await client.get(
            "/api/v1/sbom/export?repository_id=0ece8aa7-2b82-4709-ad39-957d588d73cc"
        )
        assert resp_export.status_code == 200
        assert resp_export.headers.get("content-type") == "application/json"
        cdx = resp_export.json()
        assert "bomFormat" in cdx
        assert cdx["bomFormat"] == "CycloneDX"

    app.dependency_overrides.clear()
