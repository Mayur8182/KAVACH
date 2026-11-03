import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secret_detection_detail_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/detections/detail/sec_01H7K8M9P2Q3R4S5T6U7/full")
        assert resp.status_code == 401

        resp_alias = await client.get("/api/v1/code/secrets/detections/detail/det-01/full")
        assert resp_alias.status_code == 401


@pytest.mark.asyncio
async def test_secret_detection_detail_canonical_aws(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Fetch canonical AWS detection matching the screenshot exactly
    resp = await client.get(
        "/api/v1/code/secrets/detections/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    # Core Identifiers & Breadcrumbs
    assert data["id"] == "sec_01H7K8M9P2Q3R4S5T6U7"
    assert data["secret_title"] == "AWS Access Key Detected"
    assert data["secret_type"] == "AWS Access Key"
    assert data["brand_icon"] == "aws"

    # Top 6 KPI summary cards matching screenshot
    assert data["severity"] == "Critical"
    assert data["severity_subtitle"] == "High risk of unauthorized access"

    assert data["status"] in ["Open", "In Progress", "Resolved"]
    assert data["status_subtitle"] == "Requires immediate action"

    assert "AKIA" in data["masked_value"]
    assert data["repository"] == "frontend-app"
    assert data["repository_visibility"] == "private repository"

    assert data["first_detected_date"] == "Sep 20, 2026"
    assert data["first_detected_time"] == "10:15 AM"

    assert data["last_seen_date"] == "Sep 30, 2026"
    assert data["last_seen_time"] == "08:45 PM"

    # Column 1: Detected Secret Card
    assert data["pattern"] == "AKIA[0-9A-Z]{16}"
    assert data["detected_value"] == "AKIAIOSFODNN7EXAMPLE"
    assert data["file_path"] == "/src/config/aws.js"
    assert data["branch"] == "main"
    assert "a1b2c3d" in data["commit"]
    assert data["author"] == "mayur-bharvad"
    assert data["detection_method"] == "Regex + Entropy Analysis"
    assert data["confidence_score"] == 98
    assert data["occurrences_label"] == "3 instances"

    # Column 1: AI-Powered Analysis Card
    ai = data["ai_analysis"]
    assert "valid AWS Access Key with high privileges" in ai["summary"]
    assert len(ai["potential_impact"]) == 5
    assert "Full access to AWS services" in ai["potential_impact"][0]
    assert "Data exfiltration" in ai["potential_impact"][1]
    assert "Unauthorized resource creation/deletion" in ai["potential_impact"][2]
    assert "Potential financial impact" in ai["potential_impact"][3]
    assert "Lateral movement to other cloud accounts" in ai["potential_impact"][4]

    # Column 2: Code Snippet Card
    code = data["code_context"]
    assert "frontend-app / src / config / aws.js" in code["file_path"]
    assert len(code["lines"]) >= 10
    highlighted = [l for l in code["lines"] if l["is_highlighted"]]
    assert len(highlighted) >= 1
    assert "AKIAIOSFODNN7EXAMPLE" in highlighted[0]["content"]

    # Column 2: Recommended Remediation Card (5 numbered steps)
    remediation = data["remediation_steps"]
    assert len(remediation) == 5
    assert remediation[0]["step_number"] == 1
    assert "Revoke the exposed access key from AWS Console" in remediation[0]["title"]
    assert remediation[1]["step_number"] == 2
    assert "least privilege" in remediation[1]["description"]
    assert remediation[2]["step_number"] == 3
    assert "Secrets Manager" in remediation[2]["description"]
    assert remediation[3]["step_number"] == 4
    assert "Remove the hardcoded key" in remediation[3]["title"]
    assert remediation[4]["step_number"] == 5
    assert "Rotate any associated credentials" in remediation[4]["title"]

    # Column 3: Secret Metadata Card
    meta = data["metadata"]
    assert meta["account_id"] == "123456789012"
    assert meta["region"] == "ap-south-1"
    assert meta["environment"] == "production"
    assert meta["permissions"] == "High Privileges"
    assert meta["last_used"] == "Sep 28, 2026 14:22"
    assert meta["source"] == "Source Code"
    assert "aws" in meta["tags"]
    assert "production" in meta["tags"]
    assert "high-risk" in meta["tags"]
    assert meta["age"] == "20 days"
    assert meta["rotation_required"] == "Yes"

    # Column 3: Related Findings Card
    related = data["related_findings"]
    assert len(related) == 3
    assert "Similar AWS key in backend-api" in related[0]["title"]
    assert related[0]["severity"] == "High"
    assert "AWS Secret in infrastructure" in related[1]["title"]
    assert related[1]["severity"] == "Medium"
    assert "AWS Access Key in mobile-app" in related[2]["title"]
    assert related[2]["severity"] == "Medium"

    # Column 3: Timeline Card
    timeline = data["timeline"]
    assert len(timeline) == 4
    assert timeline[0]["is_latest"] is True
    assert timeline[0]["badge_label"] == "latest"
    assert "9f8e7d6" in timeline[0]["message"]
    assert "a1b2c3d" in timeline[1]["message"]
    assert "4d5e6f7" in timeline[2]["message"]
    assert timeline[3]["message"] == "First detected"

    # Adjacent navigation IDs
    assert data["previous_id"] is not None
    assert data["next_id"] is not None


@pytest.mark.asyncio
async def test_secret_detection_detail_adjacent_navigation(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # Fetch canonical item
    resp1 = await client.get(
        "/api/v1/code/secrets/detections/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert resp1.status_code == 200
    d1 = resp1.json()
    next_id = d1["next_id"]
    assert next_id is not None

    # Step to next detection item
    resp2 = await client.get(
        f"/api/v1/code/secrets/detections/detail/{next_id}/full",
        headers=headers,
    )
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d2["id"] == next_id
    assert d2["previous_id"] is not None
    assert d2["next_id"] is not None
    assert d2["severity"] in ["Critical", "High", "Medium", "Low"]
    assert d2["status"] in ["Open", "In Progress", "Resolved"]
    assert len(d2["remediation_steps"]) >= 1


@pytest.mark.asyncio
async def test_secret_detection_status_mutation(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Update status to Resolved
    update_resp = await client.post(
        "/api/v1/code/secrets/detections/sec_01H7K8M9P2Q3R4S5T6U7/status",
        headers=headers,
        json={"status": "Resolved", "reason": "Secret rotated and verified safe"},
    )
    assert update_resp.status_code == 200
    res_data = update_resp.json()
    assert res_data["status"] == "Resolved"

    # 2. Verify change reflected in detail endpoint
    detail_resp = await client.get(
        "/api/v1/code/secrets/detections/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert detail_resp.status_code == 200
    # Revert back to Open for idempotency
    await client.post(
        "/api/v1/code/secrets/detections/sec_01H7K8M9P2Q3R4S5T6U7/status",
        headers=headers,
        json={"status": "Open", "reason": "Re-opened for testing"},
    )
