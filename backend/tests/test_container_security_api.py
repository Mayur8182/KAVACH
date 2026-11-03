import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_application
from app.core.security import get_current_user
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="test@secureai.local",
    password_hash="testhash",
    name="Mayur K.",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_container_summary_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/containers/summary")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_container_endpoints_authorized():
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/v1/containers/summary")
        assert resp.status_code == 200
        summary = resp.json()
        assert "total_images" in summary
        assert "vulnerable_images" in summary
        assert "critical_findings" in summary
        assert "high_findings" in summary
        assert "total_findings" in summary

        # 2. Images List
        resp_images = await client.get("/api/v1/containers/images")
        assert resp_images.status_code == 200
        images_data = resp_images.json()
        assert "items" in images_data
        assert "total" in images_data
        assert "available_registries" in images_data
        assert len(images_data["items"]) >= 1

        first_img = images_data["items"][0]
        assert "repository" in first_img
        assert "tag" in first_img
        assert "registry" in first_img
        assert "status" in first_img
        assert "vulnerabilities" in first_img
        assert "size_formatted" in first_img

        # 3. Image Detail
        img_id = first_img["id"]
        resp_detail = await client.get(f"/api/v1/containers/images/{img_id}")
        assert resp_detail.status_code == 200
        detail = resp_detail.json()
        assert detail["id"] == img_id
        assert "top_vulnerabilities" in detail
        assert "scanner_name" in detail
        assert "layers_count" in detail
        assert "labels" in detail

        # 4. Trigger Scan (async)
        scan_payload = {
            "project_id": str(first_img["project_id"]),
            "image_id": img_id,
            "repository": first_img["repository"],
            "tag": first_img["tag"],
        }
        resp_scan = await client.post("/api/v1/containers/scan", json=scan_payload)
        assert resp_scan.status_code == 202
        job_data = resp_scan.json()
        assert "job_id" in job_data
        assert job_data["status"] in ("QUEUED", "RUNNING", "COMPLETED", "FAILED")

        # 5. Check Scan Job Status
        job_id = job_data["job_id"]
        resp_job = await client.get(f"/api/v1/containers/jobs/{job_id}")
        assert resp_job.status_code == 200
        assert resp_job.json()["job_id"] == job_id

    app.dependency_overrides.clear()
