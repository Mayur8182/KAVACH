import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_policies_compliance_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp_overview = await client.get("/api/v1/code/settings/policies/overview")
        assert resp_overview.status_code == 401

        resp_table = await client.get("/api/v1/code/settings/policies/table")
        assert resp_table.status_code == 401

        resp_templates = await client.get("/api/v1/code/settings/policies/templates")
        assert resp_templates.status_code == 401

        resp_export = await client.get("/api/v1/code/settings/policies/export")
        assert resp_export.status_code == 401


@pytest.mark.asyncio
async def test_policies_compliance_overview(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    resp = await client.get("/api/v1/code/settings/policies/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # 1. Top KPI cards verification matching screenshot
    kpis = data["kpis"]
    assert kpis["enforced_policies"] == 5
    assert kpis["enforced_policies_trend"] == "↑ 25%"
    assert kpis["compliance_frameworks"] == 3
    assert kpis["policy_violations"] == 12
    assert kpis["policy_violations_trend"] == "↓ 33%"
    assert kpis["compliance_score"] == 94
    assert kpis["compliance_score_trend"] == "↑ 6%"

    analytics = data["analytics"]

    # 2. Policy Violations Trend
    trends = analytics["trends"]
    assert len(trends) == 7
    assert trends[0]["date"] == "Sep 1"
    assert trends[0]["violations"] == 5
    assert trends[0]["resolved"] == 4
    assert trends[3]["date"] == "Sep 15"
    assert trends[3]["violations"] == 17
    assert trends[-1]["date"] == "Sep 30"
    assert trends[-1]["violations"] == 7

    # 3. Violations by Policy Type
    by_type = analytics["by_type"]
    assert len(by_type) == 5
    type_map = {item["label"]: item["count"] for item in by_type}
    assert type_map["Secret Policies"] == 5
    assert type_map["Code Quality"] == 3
    assert type_map["Dependency"] == 2
    assert type_map["IaC Security"] == 1
    assert type_map["Container Security"] == 1
    total_violations_donut = sum(item["count"] for item in by_type)
    assert total_violations_donut == 12

    # 4. Compliance Frameworks
    frameworks = analytics["frameworks"]
    assert len(frameworks) == 3
    fw_map = {fw["name"]: fw for fw in frameworks}
    assert fw_map["SOC 2"]["enabled"] is True
    assert fw_map["SOC 2"]["controls_passed"] == 12
    assert fw_map["SOC 2"]["controls_total"] == 12
    assert fw_map["SOC 2"]["score_pct"] == 94

    assert fw_map["ISO 27001"]["enabled"] is True
    assert fw_map["ISO 27001"]["controls_passed"] == 10
    assert fw_map["ISO 27001"]["controls_total"] == 11
    assert fw_map["ISO 27001"]["score_pct"] == 91

    assert fw_map["PCI DSS"]["enabled"] is False
    assert fw_map["PCI DSS"]["controls_passed"] == 0
    assert fw_map["PCI DSS"]["controls_total"] == 8
    assert fw_map["PCI DSS"]["score_pct"] is None

    # 5. Enforcement settings
    settings = analytics["enforcement_settings"]
    assert settings["block_merge_on_violation"] is True
    assert settings["auto_remediate_safe_issues"] is True
    assert settings["notify_on_new_violations"] is True
    assert settings["enable_policy_exceptions"] is True

    # 6. Recent violations
    recent = analytics["recent_violations"]
    assert len(recent) == 5
    assert recent[0]["title"] == "Hardcoded AWS key found"
    assert recent[0]["severity"] == "Critical"
    assert recent[0]["repository"] == "frontend-app"


@pytest.mark.asyncio
async def test_security_policies_table_and_filtering(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # Fetch default list
    resp = await client.get("/api/v1/code/settings/policies/table", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 8
    items = data["items"]
    names = [i["name"] for i in items]
    assert "No Hardcoded Secrets" in names
    assert "Dependency Vulnerability Check" in names
    assert "Code Quality Standards" in names
    assert "Container Security" in names
    assert "IaC Security Rules" in names
    assert "License Compliance" in names
    assert "Branch Protection" in names
    assert "PR Security Checks" in names

    # Filter by type: Dependency
    resp_dep = await client.get(
        "/api/v1/code/settings/policies/table?policy_type=Dependency", headers=headers
    )
    assert resp_dep.status_code == 200
    dep_items = resp_dep.json()["items"]
    assert len(dep_items) == 2
    for item in dep_items:
        assert item["type"] == "Dependency"

    # Filter by status: Warning
    resp_warn = await client.get(
        "/api/v1/code/settings/policies/table?status=Warning", headers=headers
    )
    assert resp_warn.status_code == 200
    warn_items = resp_warn.json()["items"]
    assert len(warn_items) == 1
    assert warn_items[0]["name"] == "Container Security"

    # Search filter
    resp_search = await client.get(
        "/api/v1/code/settings/policies/table?search=secrets", headers=headers
    )
    assert resp_search.status_code == 200
    search_items = resp_search.json()["items"]
    assert any("Secrets" in i["name"] for i in search_items)


@pytest.mark.asyncio
async def test_create_update_and_enforce_policies(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # 1. Create a new security policy
    new_payload = {
        "name": "Audit Logging Required",
        "type": "Code",
        "scope": "All Repositories",
        "status": "Warning",
        "description": "All public API routes must emit auditable security events.",
        "compliance_frameworks": ["SOC 2", "ISO 27001"],
    }
    create_resp = await client.post(
        "/api/v1/code/settings/policies", json=new_payload, headers=headers
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    pol_id = created["id"]
    assert created["name"] == "Audit Logging Required"
    assert created["status"] == "Warning"

    # 2. Get detail
    detail_resp = await client.get(
        f"/api/v1/code/settings/policies/detail/{pol_id}", headers=headers
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == pol_id

    # 3. Patch policy
    patch_payload = {
        "status": "Enforced",
        "description": "Updated description with strict enforcement.",
    }
    patch_resp = await client.patch(
        f"/api/v1/code/settings/policies/{pol_id}", json=patch_payload, headers=headers
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched["status"] == "Enforced"
    assert patched["description"] == "Updated description with strict enforcement."

    # 4. Enforce all policies
    enforce_resp = await client.post(
        "/api/v1/code/settings/policies/enforce-all", headers=headers
    )
    assert enforce_resp.status_code == 200
    enforce_data = enforce_resp.json()
    assert "updated_count" in enforce_data
    assert "message" in enforce_data


@pytest.mark.asyncio
async def test_enforcement_settings_and_templates_and_export(client, token_user_a):
    headers = {
        "Authorization": f"Bearer {token_user_a}",
    }

    # 1. Update enforcement settings
    settings_payload = {
        "block_merge_on_violation": False,
        "auto_remediate_safe_issues": True,
        "notify_on_new_violations": False,
        "enable_policy_exceptions": True,
    }
    resp_settings = await client.put(
        "/api/v1/code/settings/policies/settings", json=settings_payload, headers=headers
    )
    assert resp_settings.status_code == 200
    saved_settings = resp_settings.json()
    assert saved_settings["block_merge_on_violation"] is False
    assert saved_settings["notify_on_new_violations"] is False

    # Restore settings
    restore_payload = {
        "block_merge_on_violation": True,
        "auto_remediate_safe_issues": True,
        "notify_on_new_violations": True,
        "enable_policy_exceptions": True,
    }
    await client.put(
        "/api/v1/code/settings/policies/settings", json=restore_payload, headers=headers
    )

    # 2. Get templates
    resp_tpl = await client.get("/api/v1/code/settings/policies/templates", headers=headers)
    assert resp_tpl.status_code == 200
    templates = resp_tpl.json()
    assert len(templates) >= 4
    assert any(t["name"] == "Zero Tolerance Secrets Policy" for t in templates)

    # 3. Export policies
    resp_export = await client.get("/api/v1/code/settings/policies/export?format=json", headers=headers)
    assert resp_export.status_code == 200
    export_data = resp_export.json()
    assert export_data["format"] == "json"
    assert export_data["total_items"] >= 8
    assert len(export_data["data"]) >= 8
