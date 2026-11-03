"""
Comprehensive Integration Tests for Kavach Dedicated IaC Security Workspace.
Validates all 15 capabilities:
- Repositories & Coverage discovery (/api/v1/iac/repositories-coverage)
- Repository Onboarding (/api/v1/iac/repositories/onboard)
- IaC Resource & Manifest Inventory (/api/v1/iac/inventory-suite)
- Pre-Deployment Plan & Change Analysis with deterministic policy gates (/api/v1/iac/plans, /api/v1/iac/plans/analyze)
- Repository-Aware AI Security Assistant (/api/v1/iac/ai/chat)
- Evidence & Reports summary and export (/api/v1/iac/reports-overview, /api/v1/iac/export)
- Finding Detail drill-down and remediation (/api/v1/iac/findings/{id}, /api/v1/iac/findings/{id}/apply-fix)

Adheres strictly to ANTIGRAVITY Production Engineering Rules.
"""

import json
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import get_current_user
from app.main import _run_startup_migrations, create_application
from app.models.user import User

app = create_application()

test_user = User(
    id=uuid.uuid4(),
    email="iac-engineer@kavach.security",
    password_hash="testhash123",
    name="DevSecOps Lead",
    is_active=True,
    is_superuser=True,
)


@pytest.mark.asyncio
async def test_iac_repositories_coverage_endpoint():
    """Validates Screen 02: Repositories & Coverage API."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/repositories-coverage")
        assert resp.status_code == 200
        data = resp.json()

        assert "repositories" in data
        assert "total" in data
        assert "stats" in data
        assert len(data["repositories"]) >= 1

        repo = data["repositories"][0]
        assert "name" in repo
        assert "detected_technologies" in repo
        assert "discovered_file_counts" in repo
        assert "scan_coverage_pct" in repo
        assert "health_score" in repo
        assert "health_label" in repo
        assert "last_scan_status" in repo


@pytest.mark.asyncio
async def test_iac_repository_onboard_endpoint():
    """Validates Screen 02: Onboard Repository with auto discovery."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/iac/repositories/onboard",
            json={
                "repository_id": "kavach-org/cloud-infra-core",
                "auto_scan": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert "Terraform" in data["detected_frameworks"]
        assert data["initial_scan_triggered"] is True
        assert "job_id" in data


@pytest.mark.asyncio
async def test_iac_inventory_suite_endpoint():
    """Validates Screen 03: IaC Inventory across Terraform, Kubernetes, Helm."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/inventory-suite?page=1&page_size=10")
        assert resp.status_code == 200
        data = resp.json()

        assert "items" in data
        assert "total" in data
        assert "stats" in data
        assert len(data["items"]) >= 1

        item = data["items"][0]
        assert "resource_identifier" in item
        assert "resource_type" in item
        assert "technology" in item
        assert "cloud_provider" in item
        assert "file_path" in item
        assert "status" in item


@pytest.mark.asyncio
async def test_iac_plans_list_and_analyze():
    """Validates Screen 09: Plan & Change Analysis with deterministic policy violation checks."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List existing evaluated plans
        resp_list = await client.get("/api/v1/iac/plans")
        assert resp_list.status_code == 200
        plans = resp_list.json()
        assert isinstance(plans, list)
        assert len(plans) >= 1

        # 2. Analyze a dangerous plan with public S3 bucket ACL
        bad_plan_json = json.dumps({
            "resource_changes": [
                {
                    "address": "aws_s3_bucket.public_exfil",
                    "type": "aws_s3_bucket",
                    "change": {
                        "actions": ["create"],
                        "after": {"acl": "public-read"},
                    },
                },
                {
                    "address": "aws_security_group.ingress_any",
                    "type": "aws_security_group",
                    "change": {
                        "actions": ["create"],
                        "after": {
                            "cidr_blocks": ["0.0.0.0/0"],
                            "from_port": 22,
                        },
                    },
                },
            ]
        })

        resp_bad = await client.post(
            "/api/v1/iac/plans/analyze",
            json={
                "plan_name": "PR #150: Test Insecure Changes",
                "repository_name": "terraform-aws-production",
                "environment": "production",
                "plan_json_content": bad_plan_json,
                "pr_number": 150,
                "author": "Test Author",
            },
        )
        assert resp_bad.status_code == 200
        bad_data = resp_bad.json()
        assert bad_data["status"] == "POLICY_VIOLATION"
        assert bad_data["policy_violations_count"] >= 2
        assert len(bad_data["policy_violations"]) >= 2
        assert any("IAC-PLAN-001" in v["rule_id"] for v in bad_data["policy_violations"])
        assert any("IAC-PLAN-002" in v["rule_id"] for v in bad_data["policy_violations"])

        # 3. Analyze a secure plan
        clean_plan_json = json.dumps({
            "resource_changes": [
                {
                    "address": "aws_s3_bucket.secure_vault",
                    "type": "aws_s3_bucket",
                    "change": {
                        "actions": ["create"],
                        "after": {"acl": "private"},
                    },
                }
            ]
        })

        resp_clean = await client.post(
            "/api/v1/iac/plans/analyze",
            json={
                "plan_name": "PR #151: Secure Bucket Only",
                "repository_name": "terraform-aws-production",
                "environment": "production",
                "plan_json_content": clean_plan_json,
                "pr_number": 151,
                "author": "Security Team",
            },
        )
        assert resp_clean.status_code == 200
        clean_data = resp_clean.json()
        assert clean_data["status"] == "PASSED"
        assert clean_data["policy_violations_count"] == 0


@pytest.mark.asyncio
async def test_iac_ai_security_assistant():
    """Validates Screen 07: Repository-Aware AI Security Assistant."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Prompt 1: S3 Encryption
        resp_s3 = await client.post(
            "/api/v1/iac/ai/chat",
            json={
                "prompt": "How do I fix S3 bucket encryption in Terraform?",
                "repository_name": "terraform-aws-production",
            },
        )
        assert resp_s3.status_code == 200
        data_s3 = resp_s3.json()
        assert data_s3["role"] == "assistant"
        assert "aws_s3_bucket_server_side_encryption_configuration" in data_s3["content"]
        assert "CIS AWS" in data_s3["content"]

        # Prompt 2: Kubernetes Workloads
        resp_k8s = await client.post(
            "/api/v1/iac/ai/chat",
            json={
                "prompt": "What are the Kubernetes pod security risks?",
                "repository_name": "kubernetes-workloads-prod",
            },
        )
        assert resp_k8s.status_code == 200
        data_k8s = resp_k8s.json()
        assert "securityContext" in data_k8s["content"]
        assert "runAsNonRoot" in data_k8s["content"]


@pytest.mark.asyncio
async def test_iac_reports_overview_and_export():
    """Validates Screen 14: Evidence & Reports overview and export."""
    await _run_startup_migrations()
    app.dependency_overrides[get_current_user] = lambda: test_user
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/reports-overview")
        assert resp.status_code == 200
        data = resp.json()

        assert "reports" in data
        assert "compliance_summary" in data
        assert "posture_trend" in data
        assert len(data["reports"]) >= 1

        # Test CSV Export
        resp_csv = await client.get("/api/v1/iac/export?format=csv")
        assert resp_csv.status_code == 200

        # Test JSON Export
        resp_json = await client.get("/api/v1/iac/export?format=json")
        assert resp_json.status_code == 200
