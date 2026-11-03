import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_secret_detail_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/code/secrets/inventory/detail/sec_01H7K8M9P2Q3R4S5T6U7/full")
        assert resp.status_code == 401

        resp_pr = await client.post(
            "/api/v1/code/secrets/inventory/sec_01H7K8M9P2Q3R4S5T6U7/remediate-pr",
            json={"branch_name": "fix/aws-key", "reviewers": ["mayur"], "commit_message": "fix: secret"},
        )
        assert resp_pr.status_code == 401


@pytest.mark.asyncio
async def test_secret_detail_canonical_aws(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get(
        "/api/v1/code/secrets/inventory/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    # Core Identifiers & KPIs
    assert data["id"] == "sec_01H7K8M9P2Q3R4S5T6U7"
    assert data["secret_title"] == "AWS Access Key"
    assert data["secret_type"] == "AWS Access Key"
    assert data["brand_icon"] == "aws"
    assert data["severity"] == "Critical"
    assert data["status"] in ["Open", "In Progress", "Resolved"]
    assert data["repository"] == "frontend-app"
    assert data["first_detected_date"] == "Sep 20, 2026"
    assert data["first_detected_time"] == "10:15 AM"
    assert data["last_seen_date"] == "Sep 30, 2026"
    assert data["last_seen_time"] == "08:45 PM"

    # Details
    assert data["pattern"] == "AKIA[0-9A-Z]{16}"
    assert "AKIA" in data["masked_value"]
    assert data["detected_value"] == "AKIAIOSFODNN7EXAMPLE"
    assert data["file_path"] == "/src/config/aws.js"
    assert data["branch"] == "main"
    assert "a1b2c3d" in data["commit"]
    assert data["author"] == "mayur-bharvad"
    assert data["detection_method"] == "Regex + Entropy Analysis"

    # Risk Assessment
    assert data["risk_assessment"]["risk_level"] == "Critical"
    assert len(data["risk_assessment"]["potential_impact"]) >= 4

    # Metadata
    assert data["metadata"]["confidence"] == "98%"
    assert data["metadata"]["account_id"] == "123456789012"
    assert data["metadata"]["region"] == "ap-south-1"
    assert data["metadata"]["iam_user_role"] == "mayur-dev"
    assert "aws" in data["metadata"]["tags"]

    # Code Context
    assert len(data["code_context"]["lines"]) >= 7
    highlighted_lines = [l for l in data["code_context"]["lines"] if l["is_highlighted"]]
    assert len(highlighted_lines) == 2
    assert "AKIAIOSFODNN7EXAMPLE" in highlighted_lines[0]["content"]

    # Repository History
    assert len(data["repo_history"]) == 4
    assert data["repo_history"][0]["author_initials"] == "MK"
    assert data["repo_history"][1]["author_initials"] == "RS"
    assert data["repo_history"][2]["author_initials"] == "PK"
    assert data["repo_history"][3]["author_initials"] == "VS"

    # Recommended Actions
    assert len(data["recommended_actions"]) == 3
    action_ids = [a["id"] for a in data["recommended_actions"]]
    assert "revoke" in action_ids
    assert "rotate" in action_ids
    assert "remediate_pr" in action_ids

    # Related Findings
    assert len(data["related_findings"]) == 2
    assert "backend-api" in data["related_findings"][0]["title"]


@pytest.mark.asyncio
async def test_secret_detail_remediation_pr_flow(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    payload = {
        "branch_name": "fix/rotate-aws-access-key-test",
        "reviewers": ["mayur-dev", "sec-team"],
        "commit_message": "security(secrets): replace hardcoded AWS access key with env vars",
        "replacement_env_var": "AWS_ACCESS_KEY_ID",
    }

    resp = await client.post(
        "/api/v1/code/secrets/inventory/sec_01H7K8M9P2Q3R4S5T6U7/remediate-pr",
        headers=headers,
        json=payload,
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["pr_number"] > 0
    assert "github.com" in res_data["pr_url"]
    assert res_data["branch_name"] == "fix/rotate-aws-access-key-test"
    assert res_data["status"] == "Open"

    # Check that detail status is now In Progress and activity log has new entry
    check = await client.get(
        "/api/v1/code/secrets/inventory/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert check.status_code == 200
    detail = check.json()
    assert detail["status"] == "In Progress"
    assert detail["activity_log"][0]["action"] == "Created Remediation PR"


@pytest.mark.asyncio
async def test_secret_detail_revoke_flow(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.post(
        "/api/v1/code/secrets/inventory/sec_01H7K8M9P2Q3R4S5T6U7/revoke",
        headers=headers,
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["status"] == "Resolved"
    assert res_data["validation_status"] == "Revoked (Inactive)"

    # Check detail metadata
    check = await client.get(
        "/api/v1/code/secrets/inventory/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert check.status_code == 200
    detail = check.json()
    assert detail["metadata"]["validation_status"] == "Revoked (Inactive)"
    assert detail["status"] == "Resolved"
    assert detail["activity_log"][0]["action"] == "Key Revoked"


@pytest.mark.asyncio
async def test_secret_detail_rotate_flow(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.post(
        "/api/v1/code/secrets/inventory/sec_01H7K8M9P2Q3R4S5T6U7/rotate",
        headers=headers,
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert "AKIA" in res_data["new_key_masked"]
    assert res_data["new_key_masked"] != res_data["old_key_masked"]

    # Check detail updated
    check = await client.get(
        "/api/v1/code/secrets/inventory/detail/sec_01H7K8M9P2Q3R4S5T6U7/full",
        headers=headers,
    )
    assert check.status_code == 200
    detail = check.json()
    assert detail["masked_value"] == res_data["new_key_masked"]
    assert detail["activity_log"][0]["action"] == "Credentials Rotated"


@pytest.mark.asyncio
async def test_secret_detail_dynamic_lookup(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get(
        "/api/v1/code/secrets/inventory/detail/inv-02/full",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "inv-02"
    assert "OpenAI" in data["secret_title"]
    assert data["repository"] == "backend-api"
    assert data["severity"] == "High"
