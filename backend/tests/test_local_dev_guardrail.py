"""
Empirical Validation Test Suite: Kavach 1-Click Local Dev Guardrail & Direct-to-IDE Remediation
Tests:
- Deterministic 6-suite scanner orchestration (SAST, Secrets, SCA, API Security, Container, IaC)
- Side-by-side unified diff generation
- Gemini security intelligence explanation
- Anti-path traversal safety boundary
- Direct disk write with atomic .kavach_bak backup
- Delta verification rescan proving vulnerability cleared
"""

import os
import pytest
import tempfile
from app.services.local_audit_service import LocalAuditService, _resolve_safe_path


@pytest.mark.asyncio
async def test_workspace_info_inspection():
    service = LocalAuditService()
    info = service.get_workspace_info()
    assert "workspace_path" in info
    assert os.path.exists(info["workspace_path"])
    assert info["vscode_synced"] is True
    assert "branch" in info
    assert "dirty_files_count" in info


@pytest.mark.asyncio
async def test_anti_path_traversal_boundary():
    service = LocalAuditService()
    # Attempting to escape workspace root should raise ValueError
    with pytest.raises(ValueError):
        _resolve_safe_path(service.workspace_path, "../../etc/passwd")


@pytest.mark.asyncio
async def test_sample_vulnerability_lifecycle_and_direct_disk_remediation():
    service = LocalAuditService()
    
    # 1. Create sample fixture
    create_res = service.create_sample_vulnerability()
    assert create_res["created"] is True
    fixture_rel = create_res["file_path"]
    fixture_full = os.path.join(service.workspace_path, fixture_rel)
    assert os.path.isfile(fixture_full)

    try:
        # 2. Run local audit
        audit_res = await service.run_local_audit(target_files=[fixture_rel])
        assert "scanners" in audit_res
        assert "sast" in audit_res["scanners"]
        assert "secrets" in audit_res["scanners"]
        assert len(audit_res["findings"]) >= 1

        # Check SAST SQLi finding details
        sqli_finding = next((f for f in audit_res["findings"] if f["cwe"] == "CWE-89"), None)
        assert sqli_finding is not None
        assert sqli_finding["title"] == "SQL Injection"
        assert len(sqli_finding["diff_original"]) > 0
        assert len(sqli_finding["diff_patched"]) > 0
        assert "gemini_analysis" in sqli_finding
        assert "Deterministic rescan passed." in sqli_finding["gemini_analysis"]["deterministic_rescan"]

        # 3. Apply patch directly to disk
        apply_res = service.apply_patch_to_disk(
            finding_id=sqli_finding["id"],
            file_path=fixture_rel,
            original_snippet=sqli_finding["original_snippet"],
            patched_code=sqli_finding["patched_snippet"],
        )
        assert apply_res["success"] is True
        assert apply_res["verified"] is True
        assert os.path.isfile(apply_res["backup_path"])

        # 4. Verify file on disk is patched
        with open(fixture_full, "r", encoding="utf-8") as f:
            patched_file_content = f.read()
        assert "f\"SELECT * FROM users" not in patched_file_content

    finally:
        # 5. Clean up fixture
        cleanup_res = service.cleanup_sample_vulnerability()
        assert cleanup_res["success"] is True
        assert not os.path.isfile(fixture_full)


def test_local_dev_guardrail_http_endpoints():
    """Verifies FastAPI HTTP routes: /api/v1/local/workspace-info and /api/v1/local/scan."""
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        # 1. GET /api/v1/local/workspace-info
        res_info = test_client.get("/api/v1/local/workspace-info")
        assert res_info.status_code == 200
        info_data = res_info.json()
        assert "workspace_path" in info_data
        assert info_data["vscode_synced"] is True

        # 2. POST /api/v1/local/scan
        res_scan = test_client.post("/api/v1/local/scan", json={})
        assert res_scan.status_code == 200
        scan_data = res_scan.json()
        assert "scanners" in scan_data
        assert "sast" in scan_data["scanners"]
        assert "secrets" in scan_data["scanners"]
        assert "total_findings" in scan_data


