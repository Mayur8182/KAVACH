import json
import uuid
import pytest
from httpx import AsyncClient

from app.engines.scanner.checkov import CheckovScanner
from app.engines.scanner.engine import verification_engine
from app.engines.scanner.gitleaks import GitleaksScanner, mask_secret
from app.engines.scanner.models import (
    NormalizedFindingCandidate,
    ScannerExecutionResult,
    ScanTarget,
)
from app.engines.scanner.osv import OsvScanner
from app.engines.scanner.registry import default_scanner_registry
from app.engines.scanner.semgrep import SemgrepScanner
from app.engines.scanner.trivy import TrivyScanner


@pytest.mark.asyncio
async def test_scanner_environment_validation_and_health():
    """
    Test 1: Environment validation & health probes.
    If binaries are not installed on the system, scanners must report NOT_CONFIGURED
    and describe the exact reason. Never fake availability or fake 0 vulnerabilities!
    """
    health_list = await default_scanner_registry.get_all_health()
    assert len(health_list) == 5

    names = {h["scanner_name"] for h in health_list}
    assert names == {"semgrep", "gitleaks", "osv-scanner", "trivy", "checkov"}

    for h in health_list:
        assert h["status"] in ["healthy", "not_configured"]
        assert len(h["message"]) > 0


@pytest.mark.asyncio
async def test_semgrep_normalization():
    """
    Test 2: Normalization of real Semgrep JSON findings.
    """
    sample_semgrep_json = json.dumps({
        "results": [
            {
                "check_id": "python.fastapi.security.sqli.sql-injection",
                "path": "app/db/repository.py",
                "start": {"line": 54, "col": 12},
                "extra": {
                    "message": "Detected direct string interpolation in SQL query execution",
                    "severity": "ERROR",
                    "lines": "cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')",
                    "metadata": {"cwe": "CWE-89"},
                },
            }
        ]
    })

    scanner = SemgrepScanner()
    target = ScanTarget(path=".")
    findings = await scanner.normalize(
        raw_stdout=sample_semgrep_json,
        raw_stderr="",
        exit_code=1,
        target=target,
    )

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "python.fastapi.security.sqli.sql-injection"
    assert f.severity == "HIGH"
    assert f.file_path == "app/db/repository.py"
    assert f.line_number == 54
    assert "string interpolation" in f.description
    assert f.snippet is not None
    assert len(f.fingerprint) == 64  # SHA256 hex


@pytest.mark.asyncio
async def test_gitleaks_normalization_and_secret_masking():
    """
    Test 3: Normalization of Gitleaks findings and strict secret masking.
    Per production rule: secret values must NEVER be unnecessarily persisted in plaintext.
    """
    raw_secret_value = "sk_live_99887766554433221100aabbccdd"
    sample_gitleaks_json = json.dumps([
        {
            "Description": "Stripe API Key",
            "RuleID": "stripe-api-token",
            "File": "backend/app/core/config.py",
            "StartLine": 28,
            "StartColumn": 15,
            "Secret": raw_secret_value,
            "Commit": "abc1234",
            "Entropy": 3.8,
        }
    ])

    scanner = GitleaksScanner()
    target = ScanTarget(path=".")
    findings = await scanner.normalize(
        raw_stdout=sample_gitleaks_json,
        raw_stderr="",
        exit_code=1,
        target=target,
    )

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "gitleaks:stripe-api-token"
    assert f.severity == "CRITICAL"
    assert f.file_path == "backend/app/core/config.py"
    assert f.line_number == 28

    # CRITICAL CHECK: Raw secret must NOT be in snippet, title, or description!
    assert raw_secret_value not in f.snippet
    assert raw_secret_value not in f.title
    assert raw_secret_value not in f.description
    assert "****" in f.snippet


@pytest.mark.asyncio
async def test_osv_scanner_normalization():
    """
    Test 4: Normalization of OSV-Scanner dependency CVE findings.
    """
    sample_osv_json = json.dumps({
        "results": [
            {
                "source": {"path": "requirements.txt", "type": "lockfile"},
                "packages": [
                    {
                        "package": {"name": "cryptography", "version": "3.2.1"},
                        "vulnerabilities": [
                            {
                                "id": "GHSA-jfhm-5ghh-2f97",
                                "summary": "Buffer overflow in cryptography library",
                                "database_specific": {"severity": "HIGH"},
                                "aliases": ["CVE-2023-49083"],
                            }
                        ],
                    }
                ],
            }
        ]
    })

    scanner = OsvScanner()
    target = ScanTarget(path=".")
    findings = await scanner.normalize(
        raw_stdout=sample_osv_json,
        raw_stderr="",
        exit_code=1,
        target=target,
    )

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "GHSA-jfhm-5ghh-2f97"
    assert f.severity == "HIGH"
    assert "cryptography" in f.title
    assert "Buffer overflow" in f.description
    assert f.file_path == "requirements.txt"


@pytest.mark.asyncio
async def test_trivy_and_checkov_normalization():
    """
    Test 5: Normalization of Trivy container misconfigurations and Checkov IaC violations.
    """
    # Trivy Dockerfile check: Running as root
    sample_trivy_json = json.dumps({
        "Results": [
            {
                "Target": "Dockerfile",
                "Misconfigurations": [
                    {
                        "ID": "DS002",
                        "Title": "Image user should not be 'root'",
                        "Description": "Running containers with 'root' user allows easy privilege escalation.",
                        "Severity": "HIGH",
                        "Resolution": "Add 'USER nonroot' to Dockerfile",
                    }
                ],
            }
        ]
    })

    trivy = TrivyScanner()
    findings_trivy = await trivy.normalize(
        raw_stdout=sample_trivy_json,
        raw_stderr="",
        exit_code=0,
        target=ScanTarget(path="Dockerfile"),
    )
    assert len(findings_trivy) == 1
    assert findings_trivy[0].rule_id == "DS002"
    assert findings_trivy[0].severity == "HIGH"
    assert "root" in findings_trivy[0].description

    # Checkov Kubernetes RBAC check: wildcard permission
    sample_checkov_json = json.dumps({
        "check_type": "kubernetes",
        "results": {
            "failed_checks": [
                {
                    "check_id": "CKV_K8S_21",
                    "check_name": "ClusterRole should not grant wildcard permissions",
                    "file_path": "k8s/clusterrole.yaml",
                    "file_line_range": [10, 25],
                    "severity": "HIGH",
                    "guideline": "Specify explicit API groups and verbs",
                }
            ]
        },
    })

    checkov = CheckovScanner()
    findings_checkov = await checkov.normalize(
        raw_stdout=sample_checkov_json,
        raw_stderr="",
        exit_code=1,
        target=ScanTarget(path="k8s"),
    )
    assert len(findings_checkov) == 1
    assert findings_checkov[0].rule_id == "CKV_K8S_21"
    assert findings_checkov[0].file_path == "k8s/clusterrole.yaml"
    assert findings_checkov[0].line_number == 10


@pytest.mark.asyncio
async def test_verification_engine_requirement_evaluation():
    """
    Test 6: Requirement verification logic mapping findings to Step 5 requirements:
    1. Finding matches -> VIOLATED
    2. Relevant scanner completed with 0 matches -> SATISFIED
    3. Relevant scanner not configured -> UNKNOWN (never fake SATISFIED)
    """
    requirements = [
        {"id": str(uuid.uuid4()), "requirement_key": "SECRETS_PROTECTION_REQUIRED"},
        {"id": str(uuid.uuid4()), "requirement_key": "SECURE_DATABASE_ACCESS_REQUIRED"},
        {"id": str(uuid.uuid4()), "requirement_key": "CONTAINER_HARDENING_REQUIRED"},
    ]

    # Scenario A: Gitleaks ran and found a secret violation
    secret_finding = NormalizedFindingCandidate(
        rule_id="gitleaks:stripe-api-token",
        title="Secret Exposed: Stripe Token",
        description="Plaintext token in config.py",
        severity="CRITICAL",
        file_path="config.py",
        fingerprint="fp1",
        raw_metadata={"engine": "gitleaks"},
    )
    executions = [
        ScannerExecutionResult(
            scanner_name="gitleaks",
            scanner_type="SECRETS",
            status="COMPLETED",
            findings=[secret_finding],
        ),
        ScannerExecutionResult(
            scanner_name="semgrep",
            scanner_type="SAST",
            status="COMPLETED",
            findings=[],  # Zero findings for database
        ),
        ScannerExecutionResult(
            scanner_name="trivy",
            scanner_type="CONTAINER",
            status="NOT_CONFIGURED",
            findings=[],
        ),
    ]

    verifications = verification_engine.evaluate_requirements(
        requirements=requirements,
        execution_results=executions,
        findings=[secret_finding],
    )

    verif_by_key = {v.requirement_key: v for v in verifications}

    # 1. SECRETS_PROTECTION_REQUIRED -> VIOLATED (because secret finding exists)
    assert verif_by_key["SECRETS_PROTECTION_REQUIRED"].status == "VIOLATED"
    assert len(verif_by_key["SECRETS_PROTECTION_REQUIRED"].contributing_findings) == 1

    # 2. SECURE_DATABASE_ACCESS_REQUIRED -> SATISFIED (semgrep ran and found 0 matching findings)
    assert verif_by_key["SECURE_DATABASE_ACCESS_REQUIRED"].status == "SATISFIED"

    # 3. CONTAINER_HARDENING_REQUIRED -> UNKNOWN (trivy is not configured; cannot claim satisfied!)
    assert verif_by_key["CONTAINER_HARDENING_REQUIRED"].status == "UNKNOWN"


@pytest.mark.asyncio
async def test_scan_api_lifecycle_and_ownership(
    client: AsyncClient,
    token_user_a: str,
    token_user_b: str,
):
    """
    Test 7: Full API lifecycle:
    1. Project creation + Intent submission + Blueprint generation
    2. POST /api/v1/projects/{project_id}/scans
    3. GET /api/v1/scans/{scan_id}
    4. GET /api/v1/scans/{scan_id}/findings
    5. GET /api/v1/scans/{scan_id}/executions
    6. GET /api/v1/scans/{scan_id}/verifications
    7. GET /api/v1/scans/tools/health
    8. User B attempts unauthorized access -> 403 Forbidden
    """
    headers_a = {"Authorization": f"Bearer {token_user_a}"}
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    # 1. Setup Project & Blueprint
    proj_res = await client.post(
        "/api/v1/projects",
        headers=headers_a,
        json={"name": "Scan Verification Project", "environment": "production"},
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    intent_res = await client.post(
        "/api/v1/intents",
        headers=headers_a,
        json={
            "project_id": project_id,
            "description": "FastAPI service with PostgreSQL database storing customer accounts",
        },
    )
    assert intent_res.status_code == 201
    intent_id = intent_res.json()["id"]

    bp_res = await client.post(
        f"/api/v1/projects/{project_id}/blueprints",
        headers=headers_a,
        json={"intent_id": intent_id},
    )
    assert bp_res.status_code == 201
    blueprint_id = bp_res.json()["id"]

    # 2. Trigger Scan
    scan_res = await client.post(
        f"/api/v1/projects/{project_id}/scans",
        headers=headers_a,
        json={
            "target_type": "LOCAL_DIRECTORY",
            "blueprint_id": blueprint_id,
        },
    )
    assert scan_res.status_code == 201
    scan_data = scan_res.json()
    scan_id = scan_data["id"]
    assert scan_data["project_id"] == project_id
    assert scan_data["blueprint_id"] == blueprint_id
    assert scan_data["status"] in ["COMPLETED", "PARTIAL", "FAILED"]

    # 3. Retrieve Scan Details
    get_res = await client.get(f"/api/v1/scans/{scan_id}", headers=headers_a)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == scan_id

    # 4. Retrieve Findings
    findings_res = await client.get(f"/api/v1/scans/{scan_id}/findings", headers=headers_a)
    assert findings_res.status_code == 200
    assert isinstance(findings_res.json(), list)

    # 5. Retrieve Executions
    execs_res = await client.get(f"/api/v1/scans/{scan_id}/executions", headers=headers_a)
    assert execs_res.status_code == 200
    execs = execs_res.json()
    assert len(execs) == 5  # semgrep, gitleaks, osv-scanner, trivy, checkov
    scanner_names = {e["scanner_name"] for e in execs}
    assert "semgrep" in scanner_names
    assert "gitleaks" in scanner_names

    # 6. Retrieve Verifications
    verifs_res = await client.get(f"/api/v1/scans/{scan_id}/verifications", headers=headers_a)
    assert verifs_res.status_code == 200
    verifs = verifs_res.json()
    assert len(verifs) > 0

    # 7. Check Tool Health endpoint
    health_res = await client.get("/api/v1/scans/tools/health", headers=headers_a)
    assert health_res.status_code == 200
    tools = health_res.json()
    assert len(tools) == 5

    # 8. Ownership check: User B denied access (403 Forbidden)
    unauth_get = await client.get(f"/api/v1/scans/{scan_id}", headers=headers_b)
    assert unauth_get.status_code == 403

    unauth_trigger = await client.post(
        f"/api/v1/projects/{project_id}/scans",
        headers=headers_b,
        json={},
    )
    assert unauth_trigger.status_code == 403
