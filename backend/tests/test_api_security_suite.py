"""
Kavach API Security — Automated Integration Test Suite
Verifies API spec import, endpoint discovery, test plan generation,
scan execution orchestration, findings deduplication, attack paths,
AI analyst chat, and report generation.
"""

import pytest
import uuid
import json
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_api_security_full_lifecycle(async_client: AsyncClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Overview Telemetry
    res = await async_client.get("/api/v1/api-security/overview", headers=headers)
    assert res.status_code == 200
    overview_data = res.json()
    assert "connected_apis" in overview_data
    assert "endpoints_discovered" in overview_data

    # 2. Import OpenAPI Specification
    sample_spec = {
        "openapi": "3.0.0",
        "info": {"title": "E-Commerce Test API", "version": "1.0"},
        "servers": [{"url": "https://api.test-ecommerce.com"}],
        "paths": {
            "/api/v1/users/{id}": {
                "get": {
                    "summary": "Get User Profile",
                    "tags": ["Users"],
                    "responses": {"200": {"description": "User profile data"}},
                },
                "put": {
                    "summary": "Update Profile",
                    "tags": ["Users"],
                    "responses": {"200": {"description": "Updated"}},
                },
            },
            "/api/v1/orders": {
                "post": {
                    "summary": "Place Order",
                    "tags": ["Orders"],
                    "responses": {"201": {"description": "Order created"}},
                }
            },
            "/api/v1/auth/login": {
                "post": {
                    "summary": "User Login",
                    "tags": ["Authentication"],
                    "responses": {"200": {"description": "Token granted"}},
                }
            },
        },
    }

    import_payload = {
        "name": "E-Commerce Test API",
        "version": "1.0",
        "base_url": "https://api.test-ecommerce.com",
        "environment": "PRODUCTION",
        "spec_type": "OPENAPI",
        "spec_content": json.dumps(sample_spec),
        "auth_type": "BEARER",
    }

    res = await async_client.post("/api/v1/api-security/apis", json=import_payload, headers=headers)
    assert res.status_code in [200, 201]
    api_target = res.json()
    api_id = api_target["id"]
    assert api_target["name"] == "E-Commerce Test API"
    assert api_target["endpoints_count"] >= 3

    # 3. List APIs
    res = await async_client.get("/api/v1/api-security/apis", headers=headers)
    assert res.status_code == 200
    apis_list = res.json()
    assert apis_list["total"] >= 1
    assert any(a["id"] == api_id for a in apis_list["items"])

    # 4. Get Discovered Endpoints
    res = await async_client.get(f"/api/v1/api-security/apis/{api_id}/endpoints", headers=headers)
    assert res.status_code == 200
    endpoints_data = res.json()
    assert endpoints_data["total"] >= 3
    paths = [ep["path"] for ep in endpoints_data["items"]]
    assert "/api/v1/users/{id}" in paths
    assert "/api/v1/orders" in paths

    # 5. Get AI Security Analysis
    res = await async_client.get(f"/api/v1/api-security/apis/{api_id}/ai-analysis", headers=headers)
    assert res.status_code == 200
    ai_analysis = res.json()
    assert "api_summary" in ai_analysis
    assert "ai_insights" in ai_analysis
    assert "recommended_security_tests" in ai_analysis

    # 6. Create Test Plan
    plan_payload = {
        "name": "E-Commerce Automated Security Plan",
        "selected_categories": [
            "Authentication Testing",
            "Authorization Testing",
            "Rate Limiting & Abuse",
            "Injection Testing",
        ],
    }
    res = await async_client.post(
        f"/api/v1/api-security/apis/{api_id}/test-plans", json=plan_payload, headers=headers
    )
    assert res.status_code in [200, 201]
    plan = res.json()
    plan_id = plan["id"]
    assert len(plan["selected_categories"]) == 4

    # 7. Start Security Scan
    scan_payload = {
        "api_id": api_id,
        "plan_id": plan_id,
    }
    res = await async_client.post("/api/v1/api-security/scans", json=scan_payload, headers=headers)
    assert res.status_code in [200, 201]
    scan = res.json()
    scan_id = scan["id"]
    assert scan["status"] in ["RUNNING_TESTS", "COMPLETED", "INITIALIZING"]

    # 8. Get Scan Status & Progress
    res = await async_client.get(f"/api/v1/api-security/scans/{scan_id}", headers=headers)
    assert res.status_code == 200
    scan_status = res.json()
    assert "progress_pct" in scan_status
    assert "execution_logs" in scan_status

    # 9. Get Scan Results Dashboard
    res = await async_client.get(f"/api/v1/api-security/scans/{scan_id}/results", headers=headers)
    assert res.status_code == 200
    results_data = res.json()
    assert "scan" in results_data
    assert "findings" in results_data
    assert "findings_by_category" in results_data

    # 10. List Findings
    res = await async_client.get(f"/api/v1/api-security/findings?api_id={api_id}", headers=headers)
    assert res.status_code == 200
    findings_list = res.json()
    assert findings_list["total"] >= 1
    finding_id = findings_list["items"][0]["id"]

    # 11. Get Finding Detail
    res = await async_client.get(f"/api/v1/api-security/findings/{finding_id}", headers=headers)
    assert res.status_code == 200
    finding_detail = res.json()
    assert "remediation_advice" in finding_detail
    assert "evidence" in finding_detail

    # 12. Update Finding Status
    res = await async_client.patch(
        f"/api/v1/api-security/findings/{finding_id}",
        json={"status": "RESOLVED"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    # 13. Attack Path Graph
    res = await async_client.get(f"/api/v1/api-security/attack-paths?api_id={api_id}", headers=headers)
    assert res.status_code == 200
    attack_paths = res.json()
    assert "items" in attack_paths

    # 14. AI Analyst Chat
    chat_payload = {
        "prompt": "What are the biggest risks in my API?",
        "api_id": api_id,
    }
    res = await async_client.post("/api/v1/api-security/analyst/chat", json=chat_payload, headers=headers)
    assert res.status_code == 200
    chat_resp = res.json()
    assert "response" in chat_resp
    assert len(chat_resp["response"]) > 0

    # 15. Generate Security Report
    report_payload = {
        "api_id": api_id,
        "scan_id": scan_id,
        "format": "PDF",
        "include_sections": ["Executive Summary", "Findings Details", "Remediation Guide"],
    }
    res = await async_client.post("/api/v1/api-security/reports/generate", json=report_payload, headers=headers)
    assert res.status_code in [200, 201]
    report = res.json()
    assert "download_url" in report or "summary" in report

    # 16. Integrations List
    res = await async_client.get("/api/v1/api-security/integrations", headers=headers)
    assert res.status_code == 200
    integrations = res.json()
    assert len(integrations["items"]) >= 4

    # 17. Dual Inventory Coverage (Code vs Runtime)
    res = await async_client.get(f"/api/v1/api-security/apis/{api_id}/coverage", headers=headers)
    assert res.status_code == 200
    coverage = res.json()
    assert "total_code_discovered" in coverage
    assert "coverage_percentage" in coverage

    # 18. Analyze Connected GitHub Repository with non-UUID numeric string ID & None clone_url
    repo_payload = {
        "id": "84920194",
        "name": "payments-api",
        "full_name": "org/payments-api",
        "default_branch": "main",
        "html_url": "https://github.com/org/payments-api",
        "clone_url": None,
    }
    res = await async_client.post(
        "/api/v1/api-security/repositories/84920194/analyze?branch=main",
        json=repo_payload,
        headers=headers,
    )
    assert res.status_code == 200
    repo_analysis = res.json()
    assert "api_id" in repo_analysis
    assert repo_analysis["endpoints_count"] > 0
    assert "detected_frameworks" in repo_analysis
    assert "ai_engine" in repo_analysis


async def _create_test_target_and_endpoints(async_client: AsyncClient, headers: dict) -> tuple[str, list[dict]]:
    """Helper to create a standard test target with 3 endpoints."""
    spec = {
        "openapi": "3.0.0",
        "info": {"title": "Test Banking API", "version": "2.0"},
        "servers": [{"url": "https://api.banking.internal"}],
        "paths": {
            "/api/v1/accounts/{id}": {
                "get": {"summary": "Get Account", "tags": ["Accounts"], "responses": {"200": {"description": "OK"}}},
                "delete": {"summary": "Close Account", "tags": ["Accounts"], "responses": {"204": {"description": "Closed"}}},
            },
            "/api/v1/transfers": {
                "post": {"summary": "Submit Transfer", "tags": ["Transfers"], "responses": {"201": {"description": "Created"}}},
            },
            "/api/v1/auth/token": {
                "post": {"summary": "Issue Token", "tags": ["Auth"], "responses": {"200": {"description": "Token"}}},
            },
        },
    }
    payload = {
        "name": f"Banking API {uuid.uuid4().hex[:6]}",
        "version": "2.0",
        "base_url": "https://api.banking.internal",
        "environment": "STAGING",
        "spec_type": "OPENAPI",
        "spec_content": json.dumps(spec),
        "auth_type": "BEARER",
    }
    res = await async_client.post("/api/v1/api-security/apis", json=payload, headers=headers)
    assert res.status_code in [200, 201]
    api_target = res.json()
    api_id = api_target["id"]

    ep_res = await async_client.get(f"/api/v1/api-security/apis/{api_id}/endpoints", headers=headers)
    assert ep_res.status_code == 200
    endpoints = ep_res.json()["items"]
    return api_id, endpoints


@pytest.mark.asyncio
async def test_category_selection_filters_execution_plan(async_client: AsyncClient, test_user_token: str):
    """AC 1: Selecting only authentication tests does not execute unrelated categories."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, _ = await _create_test_target_and_endpoints(async_client, headers)

    # Preview with ONLY Authentication Testing
    payload = {
        "name": "Auth Only Plan",
        "selected_categories": ["Authentication Testing"],
        "configurations": {"categories": ["Authentication Testing"], "scope_type": "all"},
    }
    res = await async_client.post(f"/api/v1/api-security/apis/{api_id}/test-plans/preview", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_test_cases"] > 0

    # Ensure every single generated test belongs to Authentication Testing
    for tc in data["preview_test_cases"]:
        assert tc["category"] == "Authentication Testing", f"Unexpected category {tc['category']} generated when only Authentication was selected"
        assert "Authorization" not in tc["category"]
        assert "Rate Limiting" not in tc["category"]
        assert "Injection" not in tc["category"]


@pytest.mark.asyncio
async def test_endpoint_scope_filters_execution(async_client: AsyncClient, test_user_token: str):
    """AC 2: Selecting specific endpoints excludes unselected endpoints from execution."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, endpoints = await _create_test_target_and_endpoints(async_client, headers)
    assert len(endpoints) >= 3

    # Pick only the auth token endpoint
    auth_ep = next((e for e in endpoints if "auth" in e["path"]), endpoints[0])
    selected_id = auth_ep["id"]

    payload = {
        "name": "Single Endpoint Plan",
        "selected_categories": ["Authentication Testing", "Rate Limiting & Abuse"],
        "configurations": {
            "scope_type": "selected",
            "selected_endpoint_ids": [selected_id],
            "categories": ["Authentication Testing", "Rate Limiting & Abuse"],
        },
    }
    res = await async_client.post(f"/api/v1/api-security/apis/{api_id}/test-plans/preview", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["target_endpoints_count"] == 1

    # Every preview case must target auth_ep path, none target accounts or transfers
    for tc in data["preview_test_cases"]:
        assert tc["endpoint"] == auth_ep["path"]
        assert "accounts" not in tc["endpoint"]
        assert "transfers" not in tc["endpoint"]


@pytest.mark.asyncio
async def test_configuration_changes_applicable_tests(async_client: AsyncClient, test_user_token: str):
    """AC 3: Changing configuration changes applicable generated tests."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, _ = await _create_test_target_and_endpoints(async_client, headers)

    # Config 1: 1 category
    res1 = await async_client.post(
        f"/api/v1/api-security/apis/{api_id}/test-plans/preview",
        json={"selected_categories": ["Authentication Testing"], "configurations": {"categories": ["Authentication Testing"]}},
        headers=headers,
    )
    # Config 2: 3 categories
    res2 = await async_client.post(
        f"/api/v1/api-security/apis/{api_id}/test-plans/preview",
        json={
            "selected_categories": ["Authentication Testing", "Authorization Testing", "Rate Limiting & Abuse"],
            "configurations": {"categories": ["Authentication Testing", "Authorization Testing", "Rate Limiting & Abuse"]},
        },
        headers=headers,
    )
    assert res1.status_code == 200 and res2.status_code == 200
    plan1 = res1.json()
    plan2 = res2.json()

    assert plan1["total_test_cases"] < plan2["total_test_cases"]
    assert len(plan1["categories_covered"]) < len(plan2["categories_covered"])


@pytest.mark.asyncio
async def test_validate_target_ssrf_protection(async_client: AsyncClient, test_user_token: str):
    """AC 13: Out-of-scope targets and cloud metadata SSRF vectors are rejected."""
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # AWS metadata IP must be rejected
    res_aws = await async_client.post(
        "/api/v1/api-security/apis/validate-target",
        json={"base_url": "http://169.254.169.254/latest/meta-data", "environment": "PRODUCTION"},
        headers=headers,
    )
    assert res_aws.status_code == 200
    data_aws = res_aws.json()
    assert data_aws["valid"] is False
    assert "SSRF" in data_aws["error"] or "blocked" in data_aws["error"].lower()

    # GCP metadata hostname must be rejected
    res_gcp = await async_client.post(
        "/api/v1/api-security/apis/validate-target",
        json={"base_url": "http://metadata.google.internal/computeMetadata/v1", "environment": "PRODUCTION"},
        headers=headers,
    )
    assert res_gcp.status_code == 200
    data_gcp = res_gcp.json()
    assert data_gcp["valid"] is False

    # Localhost in PRODUCTION must be rejected
    res_prod_loop = await async_client.post(
        "/api/v1/api-security/apis/validate-target",
        json={"base_url": "http://127.0.0.1:8080/api", "environment": "PRODUCTION"},
        headers=headers,
    )
    assert res_prod_loop.status_code == 200
    assert res_prod_loop.json()["valid"] is False

    # Localhost in DEVELOPMENT is permitted
    res_dev_loop = await async_client.post(
        "/api/v1/api-security/apis/validate-target",
        json={"base_url": "http://127.0.0.1:8080/api", "environment": "DEVELOPMENT"},
        headers=headers,
    )
    assert res_dev_loop.status_code == 200
    assert res_dev_loop.json()["valid"] is True


@pytest.mark.asyncio
async def test_real_api_test_case_records_persisted(async_client: AsyncClient, test_user_token: str):
    """AC 5 & AC 6: Starting a scan produces actual backend execution records."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, _ = await _create_test_target_and_endpoints(async_client, headers)

    scan_config = {
        "categories": ["Authentication Testing"],
        "concurrency": 2,
        "scope_type": "all",
    }
    start_res = await async_client.post(
        "/api/v1/api-security/scans",
        json={"api_id": api_id, "scan_config": scan_config},
        headers=headers,
    )
    assert start_res.status_code in [200, 201]
    scan_id = start_res.json()["scan_id"]

    # Poll until scan finishes
    status_res = await async_client.get(f"/api/v1/api-security/scans/{scan_id}", headers=headers)
    assert status_res.status_code == 200
    scan_data = status_res.json()

    # AC 7: Test runs must contain real records with test_identifier and evidence
    assert "test_runs" in scan_data
    assert len(scan_data["test_runs"]) > 0

    first_test = scan_data["test_runs"][0]
    assert "test_identifier" in first_test
    assert first_test["test_identifier"].startswith("TC-")
    assert "endpoint" in first_test
    assert first_test["status"] in ["PASSED", "FAILED", "RUNNING", "SKIPPED"]
    assert "duration_ms" in first_test
    assert "evidence" in first_test
    assert "description" in first_test


@pytest.mark.asyncio
async def test_scan_cancellation_safe_stop(async_client: AsyncClient, test_user_token: str):
    """AC 11: Cancellation stops further execution safely."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, _ = await _create_test_target_and_endpoints(async_client, headers)

    start_res = await async_client.post(
        "/api/v1/api-security/scans",
        json={"api_id": api_id, "scan_config": {"categories": ["Authentication Testing", "Authorization Testing"]}},
        headers=headers,
    )
    scan_id = start_res.json()["scan_id"]

    # Request stop
    stop_res = await async_client.post(f"/api/v1/api-security/scans/{scan_id}/stop", headers=headers)
    assert stop_res.status_code == 200
    stop_data = stop_res.json()
    assert stop_data["status"] == "STOPPED"


@pytest.mark.asyncio
async def test_rerun_scan_endpoint(async_client: AsyncClient, test_user_token: str):
    """AC 7: Rerun scan produces fresh execution records with matching configuration."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    api_id, _ = await _create_test_target_and_endpoints(async_client, headers)

    start_res = await async_client.post(
        "/api/v1/api-security/scans",
        json={"api_id": api_id, "scan_config": {"categories": ["Authentication Testing"]}},
        headers=headers,
    )
    original_scan_id = start_res.json()["scan_id"]

    # Trigger rerun
    rerun_res = await async_client.post(f"/api/v1/api-security/scans/{original_scan_id}/rerun", headers=headers)
    assert rerun_res.status_code == 200
    rerun_data = rerun_res.json()
    assert rerun_data["status"] == "SUCCESS"
    assert rerun_data["scan_id"] != original_scan_id


@pytest.mark.asyncio
async def test_empty_api_inventory_honest_response(async_client: AsyncClient, test_user_token: str):
    """AC 14: Empty API inventories and zero findings are displayed honestly."""
    headers = {"Authorization": f"Bearer {test_user_token}"}

    empty_spec = {
        "openapi": "3.0.0",
        "info": {"title": "Empty API", "version": "1.0"},
        "paths": {},
    }
    create_res = await async_client.post(
        "/api/v1/api-security/apis",
        json={
            "name": f"Empty API {uuid.uuid4().hex[:6]}",
            "version": "1.0",
            "base_url": "https://api.empty.internal",
            "environment": "STAGING",
            "spec_type": "OPENAPI",
            "spec_content": json.dumps(empty_spec),
            "auth_type": "BEARER",
        },
        headers=headers,
    )
    api_id = create_res.json()["id"]

    # Preview on empty inventory
    preview_res = await async_client.post(
        f"/api/v1/api-security/apis/{api_id}/test-plans/preview",
        json={"selected_categories": ["Authentication Testing"], "configurations": {}},
        headers=headers,
    )
    assert preview_res.status_code == 200
    data = preview_res.json()
    # Must honestly report 0 test cases, never fabricate mock findings or tests
    assert data["total_test_cases"] == 0
    assert len(data["preview_test_cases"]) == 0




