"""
Integration tests for Section 5: IaC Remediation Suite (Screens 5.1 - 5.8).
Tests all endpoints: Overview, Recommendations, Detail, Auto-Fix, PR Integration, Suppressed Findings, Activity, and Settings.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_remediation_overview():
    """5.1 Remediation Overview — KPIs, Status Trend, and Categories."""
    res = client.get("/api/v1/iac/remediation-suite/overview")
    assert res.status_code == 200
    data = res.json()

    assert data["open_issues"] == 124
    assert data["fix_available"] == 86
    assert data["auto_fixable"] == 28
    assert data["in_progress"] == 10
    assert len(data["status_trend"]) == 7
    assert data["status_trend"][0]["date"] == "Sep 01"
    assert data["status_trend"][-1]["date"] == "Sep 30"

    assert len(data["top_categories"]) == 5
    cat_names = [c["category"] for c in data["top_categories"]]
    assert "Access Control" in cat_names
    assert "Encryption" in cat_names
    assert "Network Security" in cat_names
    assert "Logging & Monitoring" in cat_names
    assert "System Hardening" in cat_names

    access_ctrl = next(c for c in data["top_categories"] if c["category"] == "Access Control")
    assert access_ctrl["open_count"] == 32
    assert access_ctrl["in_progress_count"] == 8
    assert access_ctrl["fixed_count"] == 26
    assert access_ctrl["total_count"] == 66


def test_get_recommendations():
    """5.2 Fix Recommendations — Filtering, Search, and Pagination."""
    # Base call
    res = client.get("/api/v1/iac/remediation-suite/recommendations?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10
    assert len(data["items"]) == 10
    first_item = data["items"][0]
    assert first_item["finding"] == "Public S3 bucket"
    assert first_item["resource"] == "aws_s3_bucket.app"
    assert first_item["severity"] == "Critical"

    # Filter by Severity
    res_crit = client.get("/api/v1/iac/remediation-suite/recommendations?severity=Critical")
    assert res_crit.status_code == 200
    crit_data = res_crit.json()
    assert all(i["severity"] == "Critical" for i in crit_data["items"])

    # Filter by Framework
    res_k8s = client.get("/api/v1/iac/remediation-suite/recommendations?framework=Kubernetes")
    assert res_k8s.status_code == 200
    k8s_data = res_k8s.json()
    assert all(i["framework"] == "Kubernetes" for i in k8s_data["items"])

    # Search
    res_search = client.get("/api/v1/iac/remediation-suite/recommendations?search=RDS")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert any("RDS" in i["finding"] or "rds" in i["resource"] for i in search_data["items"])


def test_get_remediation_detail():
    """5.3 Remediation Detail — Overview, Fix Steps, Code Examples diff, References."""
    res = client.get("/api/v1/iac/remediation-suite/detail/IAC-001")
    assert res.status_code == 200
    data = res.json()

    assert data["finding_id"] == "IAC-001"
    assert "Public S3 bucket" in data["title"]
    assert data["severity"] == "Critical"
    assert len(data["fix_steps"]) >= 4

    # Code examples
    code_ex = data["code_examples"]
    assert "terraform" in code_ex
    assert "cloudformation" in code_ex
    assert "kubernetes" in code_ex

    tf = code_ex["terraform"]
    assert 'acl    = "public-read"' in tf["vulnerable_code"]
    assert 'acl    = "private"' in tf["remediated_code"]
    assert "aws_s3_bucket_public_access_block" in tf["remediated_code"]

    # References
    refs = data["references"]
    assert any("CIS AWS" in r["framework"] for r in refs)
    assert any("CWE-732" in r["control_id"] for r in refs)


def test_get_autofix_list():
    """5.4 Auto-Fix (AI Remediation) — Supported Findings list."""
    res = client.get("/api/v1/iac/remediation-suite/autofix")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10
    assert all(i["auto_fix_status"] == "Available" for i in data["items"])
    assert "AI can automatically generate" in data["beta_notice"]


def test_generate_autofix_pr():
    """5.4 Auto-Fix Mutation — Generates real PR and records activity."""
    req_body = {
        "finding_id": "IAC-001",
        "custom_title": "Automated patch: S3 Public Access Remediation",
        "target_branch": "main",
    }
    res = client.post("/api/v1/iac/remediation-suite/autofix/generate-pr", json=req_body)
    assert res.status_code == 201
    pr = res.json()
    assert pr["pr_number"] > 42
    assert pr["title"] == "Automated patch: S3 Public Access Remediation"
    assert pr["status"] == "Open"

    # Verify that the generated PR appears in PR Integration list
    pr_res = client.get(f"/api/v1/iac/remediation-suite/prs?search={pr['pr_number']}")
    assert pr_res.status_code == 200
    prs_data = pr_res.json()
    assert any(p["pr_number"] == pr["pr_number"] for p in prs_data["items"])

    # Verify activity was logged
    act_res = client.get("/api/v1/iac/remediation-suite/activity?action=Auto-fix PR")
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert any(str(pr["pr_number"]) in (a["details"] or "") for a in act_data["items"])


def test_get_prs():
    """5.5 PR Integration — List, status filter, repo filter."""
    res = client.get("/api/v1/iac/remediation-suite/prs?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10

    # Filter by status: Merged
    res_merged = client.get("/api/v1/iac/remediation-suite/prs?status=Merged")
    assert res_merged.status_code == 200
    assert all(p["status"] == "Merged" for p in res_merged.json()["items"])

    # Filter by repo: k8s-manifests
    res_repo = client.get("/api/v1/iac/remediation-suite/prs?repository=k8s-manifests")
    assert res_repo.status_code == 200
    assert all(p["repository"] == "k8s-manifests" for p in res_repo.json()["items"])


def test_get_and_update_suppressions():
    """5.6 Suppressed Findings — Query, Filter, and Update/Revoke."""
    res = client.get("/api/v1/iac/remediation-suite/suppressions")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 5
    first_supp = data["items"][0]
    assert first_supp["status"] == "Active"

    # Update expiration date
    patch_body = {
        "reason": "Updated waiver risk acceptance",
        "expires_at": "Mar 31, 2027",
    }
    patch_res = client.patch(
        f"/api/v1/iac/remediation-suite/suppressions/{first_supp['id']}",
        json=patch_body,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["reason"] == "Updated waiver risk acceptance"
    assert updated["expires_at"] == "Mar 31, 2027"

    # Revoke (unsuppress)
    revoke_res = client.patch(
        f"/api/v1/iac/remediation-suite/suppressions/{first_supp['id']}",
        json={"status": "Revoked"},
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "Revoked"

    # Check unsuppression activity logged
    act_res = client.get("/api/v1/iac/remediation-suite/activity?action=Unsuppressed")
    assert act_res.status_code == 200
    assert len(act_res.json()["items"]) >= 1


def test_get_activity():
    """5.7 Remediation Activity — Query, Action and User filtering."""
    res = client.get("/api/v1/iac/remediation-suite/activity?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10
    assert any(a["action"] == "PR merged" for a in data["items"])

    # Filter by user
    res_user = client.get("/api/v1/iac/remediation-suite/activity?user=mayur.bhanvad")
    assert res_user.status_code == 200
    assert all(a["user"] == "mayur.bhanvad" for a in res_user.json()["items"])


def test_remediation_settings_lifecycle():
    """5.8 Remediation Settings — Get, Save, and Reset."""
    # 1. Get settings
    res = client.get("/api/v1/iac/remediation-suite/settings")
    assert res.status_code == 200
    init_settings = res.json()
    assert init_settings["enable_ai_remediation"] is True
    assert init_settings["git_provider"] == "GitHub"

    # 2. Update settings
    update_body = {
        "include_test_validation": True,
        "auto_assign_reviewers": "secops-specialists",
        "git_provider": "GitLab",
    }
    update_res = client.post("/api/v1/iac/remediation-suite/settings", json=update_body)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["include_test_validation"] is True
    assert updated["auto_assign_reviewers"] == "secops-specialists"
    assert updated["git_provider"] == "GitLab"

    # 3. Reset settings
    reset_res = client.post("/api/v1/iac/remediation-suite/settings/reset")
    assert reset_res.status_code == 200
    reset = reset_res.json()
    assert reset["include_test_validation"] is False
    assert reset["auto_assign_reviewers"] == "devsecops-team"
    assert reset["git_provider"] == "GitHub"
