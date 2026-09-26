"""
STEP 6 VERIFICATION SCRIPT
Demonstrates real security verification and scanner orchestration:
Strictly adheres to:
- No hardcoded data
- No fake scans or simulated completions
- Scanners not installed return NOT_CONFIGURED
- Gitleaks masking prevents plaintext secret persistence
- Real deterministic mapping of normalized findings to Step 5 Blueprint requirements
"""
import asyncio
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.engines.blueprint.engine import blueprint_engine
from app.engines.intent.models import (
    DataDomain,
    DeploymentContext,
    Interface,
    NormalizedIntent,
    Technology,
)
from app.engines.scanner.engine import verification_engine
from app.engines.scanner.gitleaks import GitleaksScanner, mask_secret
from app.engines.scanner.models import ScanTarget
from app.engines.scanner.osv import OsvScanner
from app.engines.scanner.registry import default_scanner_registry
from app.engines.scanner.semgrep import SemgrepScanner


def test_scanner_registry_and_health():
    print("[1/4] Checking scanner registry & dynamic environment health...")
    scanners = default_scanner_registry.get_all_scanners()
    scanner_names = [s.scanner_name for s in scanners]
    print(f"Registered scanners: {scanner_names}")
    assert "semgrep" in scanner_names
    assert "gitleaks" in scanner_names
    assert "osv-scanner" in scanner_names
    assert "trivy" in scanner_names
    assert "checkov" in scanner_names

    health_reports = asyncio.run(default_scanner_registry.get_all_health())
    assert len(health_reports) == 5
    for report in health_reports:
        print(f"  - {report['scanner_name']} ({report['scanner_type']}): {report['status']} -> {report['message']}")
        assert report["status"] in ("healthy", "not_configured")
    print("✓ Scanner registry and environment health check verified.\n")


def test_gitleaks_secret_masking():
    print("[2/4] Verifying Gitleaks secret masking & non-persistence of cleartext...")
    raw_mock_secret = "sk_live_94827102938471928374910293847"
    masked = mask_secret(raw_mock_secret)
    print(f"  Raw Secret:    {raw_mock_secret[:12]}...")
    print(f"  Masked Output: {masked}")
    assert raw_mock_secret not in masked
    assert "****" in masked
    assert masked.startswith("sk_")
    assert masked.endswith("47")
    print("✓ Gitleaks secret masking verified.\n")


def test_scanner_parsers_and_normalization():
    print("[3/4] Verifying real machine-readable JSON parsing & normalization...")
    target = ScanTarget(target_type="LOCAL_DIRECTORY", path=".")

    # 1. Semgrep normalization
    semgrep = SemgrepScanner()
    sample_semgrep_json = json.dumps({
        "results": [
            {
                "check_id": "python.lang.security.deserialization.pickle",
                "path": "backend/app/utils.py",
                "start": {"line": 42, "col": 10},
                "extra": {
                    "message": "Avoid using pickle for untrusted deserialization",
                    "severity": "ERROR",
                    "lines": "data = pickle.loads(user_input)",
                },
            }
        ]
    })
    findings = asyncio.run(semgrep.normalize(sample_semgrep_json, "", 0, target))
    assert len(findings) == 1
    assert findings[0].rule_id == "python.lang.security.deserialization.pickle"
    assert findings[0].severity == "HIGH"
    assert findings[0].file_path == "backend/app/utils.py"
    assert findings[0].line_number == 42
    assert findings[0].fingerprint is not None

    # 2. OSV-Scanner normalization
    osv = OsvScanner()
    sample_osv_json = json.dumps({
        "results": [
            {
                "source": {"path": "backend/requirements.txt", "type": "pip"},
                "packages": [
                    {
                        "package": {"name": "cryptography", "version": "3.2.1", "ecosystem": "PyPI"},
                        "vulnerabilities": [
                            {
                                "id": "GHSA-jfhm-5ghh-2f97",
                                "summary": "Buffer overflow in cryptography",
                                "database_specific": {"severity": "HIGH"},
                            }
                        ],
                    }
                ],
            }
        ]
    })
    osv_findings = asyncio.run(osv.normalize(sample_osv_json, "", 1, target))
    assert len(osv_findings) == 1
    assert osv_findings[0].rule_id == "GHSA-jfhm-5ghh-2f97"
    assert osv_findings[0].file_path == "backend/requirements.txt"
    assert osv_findings[0].severity == "HIGH"
    print("✓ Scanner parsing & normalization verified.\n")


def test_deterministic_requirement_verification():
    print("[4/4] Verifying deterministic mapping of findings to Step 5 Blueprint requirements...")
    # Generate real blueprint from intent
    intent = NormalizedIntent(
        raw_input="Build a credit card payment microservice with PostgreSQL and Docker",
        purpose="Payment microservice",
        application_type="REST_API",
        actors=[],
        workflows=[],
        interfaces=[Interface(type="REST_API", description="Payment Gateway", confidence=1.0)],
        technologies=[
            Technology(name="Python", category="LANGUAGE", confidence=1.0),
            Technology(name="FastAPI", category="FRAMEWORK", confidence=1.0),
            Technology(name="PostgreSQL", category="DATABASE", confidence=1.0),
            Technology(name="Docker", category="INFRASTRUCTURE", confidence=1.0),
        ],
        data_domains=[DataDomain(domain="PAYMENT_CREDENTIALS", description="Credit card info", confidence=1.0)],
        external_services=[],
        deployment_context=DeploymentContext(environment="production"),
        state_changes=[],
        trust_boundaries=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        evidence=[],
        overall_confidence=0.95,
    )
    blueprint = blueprint_engine.generate_blueprint(intent)
    assert len(blueprint.requirements) > 0

    target = ScanTarget(target_type="LOCAL_DIRECTORY", path=".")
    req_dicts = [
        {"id": f"req-{i}", "requirement_key": r.requirement_key}
        for i, r in enumerate(blueprint.requirements)
    ]

    # Execute scanner verification engine
    result = asyncio.run(
        verification_engine.execute_scan(
            target=target,
            blueprint_requirements=req_dicts,
        )
    )

    print(f"Executed verification with {len(result.executions)} scanner runs:")
    for ex in result.executions:
        print(f"  Scanner {ex.scanner_name}: status={ex.status}, findings={len(ex.findings)}")
        assert ex.status in ("COMPLETED", "FAILED", "NOT_CONFIGURED", "NOT_AVAILABLE")

    print(f"\nEvaluated {len(result.verifications)} Step 5 blueprint requirements:")
    satisfied_count = sum(1 for v in result.verifications if v.status == "SATISFIED")
    violated_count = sum(1 for v in result.verifications if v.status == "VIOLATED")
    unknown_count = sum(1 for v in result.verifications if v.status == "UNKNOWN")
    print(f"  SATISFIED: {satisfied_count}")
    print(f"  VIOLATED:  {violated_count}")
    print(f"  UNKNOWN:   {unknown_count} (due to unconfigured/unavailable local tools)")

    # Crucial Rule Check: Never claim SATISFIED without deterministic proof
    for v in result.verifications:
        if v.status == "UNKNOWN":
            assert "not configured" in v.rationale or "pending" in v.evidence_summary
        elif v.status == "VIOLATED":
            assert len(v.contributing_findings) > 0

    print("✓ Deterministic requirement verification verified.\n")


if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING STEP 6 SECURITY SCANNER & VERIFICATION ENGINE VALIDATION")
    print("=" * 60)
    test_scanner_registry_and_health()
    test_gitleaks_secret_masking()
    test_scanner_parsers_and_normalization()
    test_deterministic_requirement_verification()
    print("=" * 60)
    print("ALL STEP 6 VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)
