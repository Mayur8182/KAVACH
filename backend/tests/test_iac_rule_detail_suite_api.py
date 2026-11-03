"""
Unit & Integration Tests for IaC Rule Detail Suite API — Section 7 (Screens 7.1 through 7.8)
Endpoints under /api/v1/iac/rule-detail-suite
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_rule_overview():
    """Screen 7.1: Rule Detail Overview with 4 KPIs and Rule Information."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/overview")
        assert resp.status_code == 200
        data = resp.json()

        assert data["rule_id"] == "IAC-AWS-001"
        assert data["severity"] == "Critical"
        assert "S3 bucket" in data["rule_name"]

        # 4 KPIs
        kpis = data["kpis"]
        assert kpis["total_findings"] == 24
        assert kpis["open_findings"] == 18
        assert kpis["resolved_findings"] == 5
        assert kpis["suppressed_findings"] == 1

        # Rule Info
        info = data["rule_info"]
        assert info["category"] == "Storage"
        assert info["provider"] == "AWS"
        assert info["service"] == "S3"
        assert info["status"] == "Enabled"
        assert info["version"] == "v2.3.0"
        assert "CIS AWS" in info["frameworks"]


@pytest.mark.asyncio
async def test_get_rule_definition():
    """Screen 7.2: Rule Definition (Title, Description, Rationale, Impact, Recommendation, References, Labels)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/definition")
        assert resp.status_code == 200
        data = resp.json()

        assert "S3 bucket should not allow public access" in data["title"]
        assert "Checks if an S3 bucket is publicly accessible" in data["description"]
        assert "Public S3 buckets can lead to data leaks" in data["rationale"]
        assert "Sensitive data exposure" in data["impact"]
        assert "Enable block public access" in data["recommendation"]

        # References
        assert len(data["references"]) >= 4
        ref_titles = [r["title"] for r in data["references"]]
        assert any("AWS S3 Block Public Access" in t for t in ref_titles)
        assert any("CIS AWS Benchmark" in t for t in ref_titles)
        assert any("NIST 800-53" in t for t in ref_titles)
        assert any("PCI DSS" in t for t in ref_titles)

        # Labels
        assert "aws" in data["labels"]
        assert "s3" in data["labels"]
        assert "public-access" in data["labels"]
        assert "critical" in data["labels"]


@pytest.mark.asyncio
async def test_get_rule_logic():
    """Screen 7.3: Detection Logic AST & Non-Compliant Test Snippet."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/logic")
        assert resp.status_code == 200
        data = resp.json()

        assert data["rule_id"] == "IAC-AWS-001"
        assert data["active_engine"] == "terraform_checkov"
        engines = data["engines"]
        assert len(engines) >= 4

        engine_ids = [e["engine_id"] for e in engines]
        assert "terraform_checkov" in engine_ids
        assert "cloudformation" in engine_ids
        assert "kubernetes_crossplane" in engine_ids
        assert "others" in engine_ids

        # Check Checkov AST snippet
        checkov = next(e for e in engines if e["engine_id"] == "terraform_checkov")
        assert "block_public_acls" in checkov["ast_code"]
        assert "aws_s3_bucket" in checkov["test_resource_code"]
        assert "public-read" in checkov["test_resource_code"]


@pytest.mark.asyncio
async def test_get_rule_risk():
    """Screen 7.4: Severity & Risk (Risk details, CVSS, Risk factors checklist, Risk trend)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/risk")
        assert resp.status_code == 200
        data = resp.json()

        assert data["severity"] == "Critical"
        assert data["likelihood"] == "High"
        assert data["impact"] == "High"
        assert data["risk_score"] == 9.2
        assert data["cvss_score"] == 8.6
        assert data["cvss_rating"] == "High"
        assert "Confidential" in data["data_sensitivity"]

        # Risk Factors checklist
        assert len(data["risk_factors"]) >= 4
        assert any("Bucket is publicly accessible" in f for f in data["risk_factors"])
        assert any("Contains sensitive" in f for f in data["risk_factors"])

        # Risk Trend (Last 6 Months: Apr to Sep)
        trend = data["risk_trend"]
        assert len(trend) == 6
        assert [t["month"] for t in trend] == ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
        assert trend[0]["value"] == 30
        assert trend[-1]["value"] == 10


@pytest.mark.asyncio
async def test_get_rule_mappings():
    """Screen 7.5: Compliance Framework Mappings table + Related Requirements card."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/mappings")
        assert resp.status_code == 200
        data = resp.json()

        mappings = data["mappings"]
        assert len(mappings) >= 5
        frameworks = [m["framework"] for m in mappings]
        assert "CIS AWS" in frameworks
        assert "NIST 800-53" in frameworks
        assert "PCI DSS" in frameworks
        assert "ISO 27001" in frameworks
        assert "SOC 2" in frameworks

        # Status check
        for m in mappings:
            assert m["status"] == "Mapped"

        # Related requirement
        req = data["related_requirement"]
        assert "CIS AWS Benchmark" in req["framework"]
        assert req["control_id"] == "3.1"
        assert "Ensure S3 buckets are not public" in req["title"]


@pytest.mark.asyncio
async def test_get_affected_resources():
    """Screen 7.6: Affected Resources with filters and pagination."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Default fetch
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/resources?page=1&page_size=10")
        assert resp.status_code == 200
        data = resp.json()

        assert data["kpis"]["total_resources"] == 24
        assert data["kpis"]["non_compliant"] == 18
        assert data["kpis"]["compliant"] == 5
        assert data["kpis"]["suppressed"] == 1

        items = data["items"]
        assert len(items) == 10
        names = [r["resource"] for r in items]
        assert "my-public-bucket" in names
        assert "logs-bucket" in names
        assert "assets-bucket" in names
        assert "data-bucket" in names
        assert "media-bucket" in names

        # Filter by status: Failed
        resp_failed = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/resources?status=Failed")
        assert resp_failed.status_code == 200
        data_failed = resp_failed.json()
        for r in data_failed["items"]:
            assert r["status"] == "Failed"

        # Filter by region
        resp_reg = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/resources?region=ap-south-1")
        assert resp_reg.status_code == 200
        for r in resp_reg.json()["items"]:
            assert r["region"] == "ap-south-1"

        # Filter by search
        resp_search = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/resources?search=cloudtrail")
        assert resp_search.status_code == 200
        assert len(resp_search.json()["items"]) == 1
        assert resp_search.json()["items"][0]["resource"] == "cloudtrail-logs"


@pytest.mark.asyncio
async def test_get_and_mutate_exceptions():
    """Screen 7.7: Exceptions (List, Create new exception, and Revoke)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Initial list
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/exceptions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["kpis"]["active_exceptions"] >= 2
        initial_count = data["total"]

        # Create new exception
        new_payload = {
            "resource": "test-analytics-bucket",
            "reason": "Temporary access during load testing",
            "expires_at": "Nov 15, 2026",
        }
        create_resp = await client.post("/api/v1/iac/rule-detail-suite/IAC-AWS-001/exceptions", json=new_payload)
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["resource"] == "test-analytics-bucket"
        assert created["status"] == "Active"
        created_id = created["id"]

        # Verify it appears in list
        list_again = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/exceptions")
        assert list_again.status_code == 200
        assert list_again.json()["total"] == initial_count + 1
        assert any(e["id"] == created_id for e in list_again.json()["items"])

        # Revoke/Delete the exception
        del_resp = await client.delete(f"/api/v1/iac/rule-detail-suite/IAC-AWS-001/exceptions/{created_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["success"] is True

        # Verify revoked
        list_after_del = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/exceptions")
        assert not any(e["id"] == created_id for e in list_after_del.json()["items"])


@pytest.mark.asyncio
async def test_get_rule_history():
    """Screen 7.8: Version History timeline (v2.3.0 through v1.0.0)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/rule-detail-suite/IAC-AWS-001/history")
        assert resp.status_code == 200
        data = resp.json()

        assert data["rule_id"] == "IAC-AWS-001"
        items = data["items"]
        assert len(items) == 6

        versions = [i["version"] for i in items]
        assert versions == ["v2.3.0", "v2.2.0", "v2.1.0", "v2.0.0", "v1.1.0", "v1.0.0"]

        assert items[0]["updated_by"] == "mayur.bhanvad"
        assert "block_public_policy" in items[0]["changes"]
        assert items[-1]["changes"] == "Initial version"


@pytest.mark.asyncio
async def test_trigger_rule_scan():
    """Action: Run Scan button triggers scan job with deterministic queued result."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/iac/rule-detail-suite/IAC-AWS-001/run-scan",
            json={"environment": "production"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["rule_id"] == "IAC-AWS-001"
        assert data["status"] == "QUEUED"
        assert "scan-job-" in data["scan_job_id"]
        assert "started_at" in data
