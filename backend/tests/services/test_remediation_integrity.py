import os
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.models.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan, ScannerExecution
from app.models.remediation import RemediationPlan, RemediationPatch, RemediationValidation
from app.models.cloud_models import CloudConnection, CloudResource, CloudSecurityObservation
from app.services.finding_service import FindingService
from app.services.ai_remediation_orchestrator import AIRemediationOrchestrator
from app.services.validation_service import ValidationService, _validate_syntax, _verify_security_scan
from app.cloud.service import CloudService
from app.services.remediation import (
    RepositoryContext,
    resolve_repository_context,
    extract_vulnerable_source,
    SourceExtractionError,
    apply_unified_diff,
    PatchApplicationError,
    RemediationPatchGenerator,
)


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def mock_users():
    user1 = User(
        id=uuid.uuid4(),
        email="alice@kavachsecurity.me",
        password_hash="hash1",
        name="Alice Admin",
        is_active=True,
        is_superuser=False,
    )
    user2 = User(
        id=uuid.uuid4(),
        email="bob@attacker.me",
        password_hash="hash2",
        name="Bob Tenant",
        is_active=True,
        is_superuser=False,
    )
    return user1, user2


# ─────────────────────────────────────────────────────────────────────────────
# 1. P0.4: Finding Resolution & Tenant Isolation Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_non_existent_finding_returns_none_no_limit_1_fallback(async_db, mock_users):
    user1, _ = mock_users
    async_db.add(user1)

    # Insert a legit finding for another purpose
    proj = Project(id=uuid.uuid4(), owner_id=user1.id, name="Test Project")
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    existing_finding = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        rule_id="EXISTING-RULE-01",
        title="Existing Bug",
        description="A bug",
        severity="HIGH",
        fingerprint="fp123",
        project_id=proj.id,
    )
    async_db.add_all([proj, scan, exec_run, existing_finding])
    await async_db.commit()

    service = FindingService(async_db)

    # Query for completely nonexistent finding
    result = await service.get_finding_detail("NON-EXISTENT-ID-9999", user1)
    assert result is None, "Non-existent finding must return None and NOT fall back to existing findings!"

    # apply_fix must raise ValueError for missing finding
    with pytest.raises(ValueError, match="not found"):
        await service.apply_fix("NON-EXISTENT-ID-9999", "sug1", user1)

    # test_fix must raise ValueError for missing finding
    with pytest.raises(ValueError, match="not found"):
        await service.test_fix("NON-EXISTENT-ID-9999", "sug1", user1)


@pytest.mark.asyncio
async def test_cross_tenant_finding_access_is_forbidden(async_db, mock_users):
    user_owner, user_stranger = mock_users
    async_db.add_all([user_owner, user_stranger])

    proj = Project(id=uuid.uuid4(), owner_id=user_owner.id, name="Alice Secret Project")
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        rule_id="SEC-SECRET-LEAK",
        title="Database Credential Leak",
        description="Leaked creds",
        severity="CRITICAL",
        fingerprint="fp_secret",
        project_id=proj.id,
    )
    async_db.add_all([proj, scan, exec_run, finding])
    await async_db.commit()

    service = FindingService(async_db)

    # Bob (stranger) attempts to view Alice's finding
    detail = await service.get_finding_detail(str(finding.id), user_stranger)
    assert detail is None, "Cross-tenant access must be denied (returns None for 404 in endpoint)!"

    # Bob attempts to apply fix to Alice's finding
    with pytest.raises(ValueError, match="Unauthorized"):
        await service.apply_fix(str(finding.id), "sug1", user_stranger)

    # AI Orchestrator enforces tenant gate
    orch = AIRemediationOrchestrator(async_db)
    res = await orch.execute_closed_loop_autofix(str(finding.id), current_user=user_stranger)
    assert res["status"] == "FORBIDDEN"
    assert res["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 2. P0.3: Cloud Reality & Zero Synthetic Data Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cloud_overview_honest_unconnected_state(async_db):
    cloud_svc = CloudService(async_db)

    # When no connections exist, overview must NOT insert fake AWS/GCP accounts
    overview = await cloud_svc.get_overview()

    assert overview.assets_total_count == 0
    assert overview.critical_findings_count == 0
    assert overview.high_findings_count == 0
    assert overview.cloud_accounts_count == 0
    for provider in ("AWS", "AZURE", "GCP"):
        p_summary = overview.providers[provider]
        assert p_summary.status == "NOT_CONNECTED"
        assert p_summary.account_count == 0

    # ensure_baseline_cloud_data_seeded must be a safe no-op
    seeded_proj = await cloud_svc.ensure_baseline_cloud_data_seeded()
    assert seeded_proj is None or isinstance(seeded_proj, uuid.UUID)

    # Verify zero fake connections in DB
    overview_after = await cloud_svc.get_overview()
    assert overview_after.assets_total_count == 0
    assert overview_after.cloud_accounts_count == 0


# ─────────────────────────────────────────────────────────────────────────────
# 3. P0.1: Source Extraction & Diff Applicability Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_source_extraction_rejects_missing_file_and_traversal():
    repo_ctx = RepositoryContext(
        project_id=uuid.uuid4(),
        repository_id=uuid.uuid4(),
        repository_name="test-repo",
        root_path=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")),
        commit_sha="abcd123",
        branch="main",
    )

    # 1. Non-existent file
    with pytest.raises(SourceExtractionError, match="does not exist"):
        extract_vulnerable_source(repo_ctx, "non_existent_folder/fake_code.py")

    # 2. Path traversal attack
    with pytest.raises(SourceExtractionError, match="Security boundary error"):
        extract_vulnerable_source(repo_ctx, "../../windows/system32/cmd.exe")


def test_diff_applier_clean_application():
    orig_code = (
        "def query_user(user_id):\n"
        "    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n"
        "    return db.execute(query)\n"
    )
    diff = (
        "--- a/users.py\n"
        "+++ b/users.py\n"
        "@@ -1,3 +1,3 @@\n"
        " def query_user(user_id):\n"
        "-    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n"
        "+    query = \"SELECT * FROM users WHERE id = %s\"\n"
        "     return db.execute(query)\n"
    )

    patched = apply_unified_diff(orig_code, diff)
    assert 'query = "SELECT * FROM users WHERE id = %s"' in patched
    assert "f\"SELECT" not in patched


# ─────────────────────────────────────────────────────────────────────────────
# 4. P0.2: Real Patch Validation Engine Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_validation_rejects_patch_introducing_syntax_error(async_db):
    u = User(id=uuid.uuid4(), email="dev@kavach.me", password_hash="hash", name="Dev")
    proj = Project(id=uuid.uuid4(), owner_id=u.id, name="Test App")
    async_db.add_all([u, proj])
    await async_db.flush()

    plan = RemediationPlan(
        id=uuid.uuid4(),
        project_id=proj.id,
        title="AutoFix: SEC-01 in test.py",
        description="Fixing issue",
        type="SOURCE_CODE_PATCH",
        risk_level="LOW_RISK",
        status="PROPOSED",
        created_by_type="AI",
        created_by_id="system",
    )
    # Malformed python patch missing closing parenthesis
    bad_diff = (
        "--- a/test.py\n"
        "+++ b/test.py\n"
        "@@ -1,1 +1,1 @@\n"
        "-pass\n"
        "+def broken_syntax(:\n"
    )
    patch = RemediationPatch(
        id=uuid.uuid4(),
        remediation_plan_id=plan.id,
        patch_format="unified_diff",
        diff=bad_diff,
        affected_files=["test.py"],
        generated_by="system",
        status="GENERATED",
    )
    async_db.add_all([plan, patch])
    await async_db.commit()

    val_svc = ValidationService(async_db)
    passed = await val_svc.run_validations(patch.id)

    assert passed is False, "Patch introducing syntax errors must fail validation!"
    assert patch.status == "FAILED"


@pytest.mark.asyncio
async def test_validation_rejects_patch_retaining_sql_injection(async_db):
    u = User(id=uuid.uuid4(), email="dev2@kavach.me", password_hash="hash", name="Dev2")
    proj = Project(id=uuid.uuid4(), owner_id=u.id, name="Test App 2")
    async_db.add_all([u, proj])
    await async_db.flush()

    plan = RemediationPlan(
        id=uuid.uuid4(),
        project_id=proj.id,
        title="AutoFix: SAST-001 in api.py",
        description="Fixing SQL injection",
        type="SOURCE_CODE_PATCH",
        risk_level="LOW_RISK",
        status="PROPOSED",
        created_by_type="AI",
        created_by_id="system",
    )
    # Patch claims to fix SQLi but still contains unescaped f-string in execute() sink
    bad_diff = (
        "--- a/api.py\n"
        "+++ b/api.py\n"
        "@@ -1,1 +1,2 @@\n"
        "-pass\n"
        "+def get_data(x):\n"
        "+    return cursor.execute(f'SELECT * FROM table WHERE id = {x}')\n"
    )
    patch = RemediationPatch(
        id=uuid.uuid4(),
        remediation_plan_id=plan.id,
        patch_format="unified_diff",
        diff=bad_diff,
        affected_files=["api.py"],
        generated_by="system",
        status="GENERATED",
    )
    async_db.add_all([plan, patch])
    await async_db.commit()

    val_svc = ValidationService(async_db)
    passed = await val_svc.run_validations(patch.id)

    assert passed is False, "Patch leaving raw SQL f-string injection must be rejected by SCANNER validation!"
    assert patch.status == "FAILED"
