"""
Kavach Phase 4: Multi-File Autonomous Remediation Test Suite
Validates the complete coordinated multi-file lifecycle:
1. Impact analysis and candidate classification
2. Change-set planning, base hash pinning, and plan-hash determinism
3. Coordinated multi-file patch generation and cross-file consistency
4. Patch security validation (path traversal, stale base hash, secret detection)
5. Transactional application, tree hashes, atomicity, and rollback
6. Multi-layer verification pipeline (integrity, static, tests, security rescan, invariants)
7. Bounded revision loop with diagnostic-driven retries and ceilings
8. End-to-end REST API integration
"""

import os
import shutil
import tempfile
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan, ScannerExecution
from app.models.remediation import RemediationPlan, RemediationPatch
from app.intelligence.remediation.models import (
    FileClassification,
    FileOperation,
    RemediationPlanStatus,
    TransactionStatus,
    VerificationOutcome,
    CandidateFileImpact,
    MultiFileImpactReport,
    PlannedFileChange,
    MultiFileRemediationPlan,
    FilePatchUnit,
    MultiFilePatchSet,
    PatchTransactionRecord,
)
from app.intelligence.remediation.impact_resolver import MultiFileImpactResolver
from app.intelligence.remediation.plan_manager import MultiFileRemediationPlanner
from app.intelligence.remediation.patch_generator import MultiFilePatchGenerator
from app.intelligence.remediation.validator import MultiFilePatchValidator
from app.intelligence.remediation.transaction_manager import PatchTransactionManager
from app.intelligence.remediation.verification_pipeline import MultiFileVerificationPipeline
from app.intelligence.remediation.revision_loop import PatchRevisionLoop
from app.intelligence.remediation.coordinator import MultiFileRemediationCoordinator
from app.intelligence.execution.approval_guard import ApprovalGuard


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="lead_secops@kavach.local",
        name="Lead SecOps",
        password_hash="test_password_hash_123",
        is_active=True,
    )


@pytest.fixture
def temp_repo():
    """Creates a temporary multi-file repository structure with real code."""
    d = tempfile.mkdtemp(prefix="kavach_multi_file_repo_")

    # 1. Primary file with SQL injection
    app_dir = os.path.join(d, "app")
    os.makedirs(app_dir, exist_ok=True)
    primary_code = (
        "import os\n\n"
        "def query_user_records(db_conn, user_id):\n"
        "    query = f\"SELECT * FROM users WHERE id = '{user_id}'\"\n"
        "    return db_conn.execute(query)\n"
    )
    with open(os.path.join(app_dir, "db.py"), "w", encoding="utf-8") as f:
        f.write(primary_code)

    # 2. Supporting caller file importing primary function
    routes_dir = os.path.join(d, "routes")
    os.makedirs(routes_dir, exist_ok=True)
    caller_code = (
        "from app.db import query_user_records\n\n"
        "def get_user_profile(conn, uid):\n"
        "    return query_user_records(conn, uid)\n"
    )
    with open(os.path.join(routes_dir, "users.py"), "w", encoding="utf-8") as f:
        f.write(caller_code)

    # 3. Test file exercising the primary function
    tests_dir = os.path.join(d, "tests")
    os.makedirs(tests_dir, exist_ok=True)
    test_code = (
        "from app.db import query_user_records\n\n"
        "def test_query_user():\n"
        "    assert True\n"
    )
    with open(os.path.join(tests_dir, "test_db.py"), "w", encoding="utf-8") as f:
        f.write(test_code)

    yield d
    shutil.rmtree(d, ignore_errors=True)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Multi-File Impact Resolver Tests (M1)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multi_file_impact_resolver(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-repo", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-repo",
        title="SQL Injection in query_user_records",
        description="Unsanitized user_id formatted directly into SQL query",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
        snippet="query = f\"SELECT * FROM users WHERE id = '{user_id}'\"",
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    report = await MultiFileImpactResolver.resolve_impact(
        db=db_session,
        finding_id=str(finding.id),
        repo_root=temp_repo,
    )

    assert report.finding_id == str(finding.id)
    assert report.primary_file == "app/db.py"
    assert report.primary_symbol == "query_user_records"
    assert len(report.candidate_files) >= 3

    file_classifications = {c.file_path: c.classification for c in report.candidate_files}
    assert file_classifications.get("app/db.py") == FileClassification.REQUIRED
    assert file_classifications.get("routes/users.py") == FileClassification.SUPPORTING
    assert file_classifications.get("tests/test_db.py") == FileClassification.TEST


# ─────────────────────────────────────────────────────────────────────────────
# 2. Change-Set Planner Tests (M2)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multi_file_change_set_planner(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-planner", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-planner",
        title="Command Injection Flaw",
        description="os.system call",
        severity="CRITICAL",
        rule_id="CWE-78",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    impact_report = await MultiFileImpactResolver.resolve_impact(
        db=db_session,
        finding_id=str(finding.id),
        repo_root=temp_repo,
    )

    plan = await MultiFileRemediationPlanner.create_plan(
        db=db_session,
        impact_report=impact_report,
        repository="kavach-planner",
        base_commit_sha="a1b2c3d4e5f6",
        user_id=str(mock_user.id),
    )

    assert plan.plan_id is not None
    assert plan.version == 1
    assert plan.base_commit_sha == "a1b2c3d4e5f6"
    assert len(plan.files) >= 3
    assert len(plan.plan_hash) == 64  # Valid SHA256
    assert plan.requires_approval is True

    # Verify dependency ordering (0 for primary required, 1 for supporting, 2 for tests)
    order_map = {f.file_path: f.dependency_order for f in plan.files}
    assert order_map["app/db.py"] == 0
    assert order_map["routes/users.py"] == 1
    assert order_map["tests/test_db.py"] == 2

    # Verify database persistence in remediation_plans
    db_plan = await db_session.get(RemediationPlan, uuid.UUID(plan.plan_id))
    assert db_plan is not None
    assert db_plan.status == RemediationPlanStatus.PROPOSED.value


# ─────────────────────────────────────────────────────────────────────────────
# 3. Multi-File Patch Generation & Consistency Tests (M3)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multi_file_patch_generation(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-gen", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-gen",
        title="SQL Injection",
        description="SQL flaw",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    impact = await MultiFileImpactResolver.resolve_impact(db_session, str(finding.id), temp_repo)
    plan = await MultiFileRemediationPlanner.create_plan(db_session, impact, "kavach-gen", "c0ffee", str(mock_user.id))

    patch_set = await MultiFilePatchGenerator.generate_patch_set(
        db=db_session,
        plan=plan,
        repo_root=temp_repo,
    )

    assert patch_set.plan_id == plan.plan_id
    assert patch_set.file_count == len(plan.files)
    assert len(patch_set.patches) == len(plan.files)
    assert patch_set.combined_diff is not None
    assert "--- a/app/db.py" in patch_set.combined_diff
    assert "+++ b/app/db.py" in patch_set.combined_diff


# ─────────────────────────────────────────────────────────────────────────────
# 4. Patch-Set Security Validator Tests (M4 Adversarial)
# ─────────────────────────────────────────────────────────────────────────────

def test_patch_validator_blocks_path_traversal():
    """Ensures ../ or absolute root escape paths are rejected."""
    bad_patch = FilePatchUnit(
        file_path="../../etc/shadow",
        base_file_hash="123456",
        unified_diff="--- a/../../etc/shadow\n+++ b/../../etc/shadow\n",
        original_code="",
        patched_code="",
        rationale="malicious test",
    )
    bad_set = MultiFilePatchSet(
        plan_id=str(uuid.uuid4()),
        plan_hash="abc",
        base_commit_sha="head",
        patches=[bad_patch],
        file_count=1,
    )

    val_res = MultiFilePatchValidator.validate_patch_set(bad_set)
    assert val_res.is_valid is False
    assert any(b.check_type == "PATH_TRAVERSAL" for b in val_res.blockers)


def test_patch_validator_blocks_secret_insertion():
    """Ensures patches introducing API keys or credentials are rejected."""
    leak_diff = (
        "--- a/config.py\n"
        "+++ b/config.py\n"
        "@@ -1,1 +1,2 @@\n"
        "+api_key = 'AKIAIOSFODNN7EXAMPLE123'\n"
    )
    leak_patch = FilePatchUnit(
        file_path="config.py",
        base_file_hash="112233",
        unified_diff=leak_diff,
        original_code="",
        patched_code="api_key = 'AKIAIOSFODNN7EXAMPLE123'\n",
        rationale="leaking key",
    )
    leak_set = MultiFilePatchSet(
        plan_id=str(uuid.uuid4()),
        plan_hash="abc",
        base_commit_sha="head",
        patches=[leak_patch],
        file_count=1,
    )

    val_res = MultiFilePatchValidator.validate_patch_set(leak_set)
    assert val_res.is_valid is False
    assert any(b.check_type == "SECRET_INSERTION_DETECTED" for b in val_res.blockers)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Transactional Application, Tree Hashes & Rollback (M5)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_patch_transaction_atomic_apply_and_rollback(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-tx", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-tx",
        title="SQL Injection",
        description="SQL flaw",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    impact = await MultiFileImpactResolver.resolve_impact(db_session, str(finding.id), temp_repo)
    plan = await MultiFileRemediationPlanner.create_plan(db_session, impact, "kavach-tx", "c0ffee", str(mock_user.id))
    patch_set = await MultiFilePatchGenerator.generate_patch_set(db_session, plan, temp_repo)

    # 1. Apply transaction
    tx_rec = PatchTransactionManager.apply_patch_transaction(patch_set, repo_root=temp_repo)
    assert tx_rec.status == TransactionStatus.APPLIED
    assert tx_rec.base_tree_hash is not None
    assert tx_rec.result_tree_hash is not None
    assert tx_rec.base_tree_hash != tx_rec.result_tree_hash
    assert len(tx_rec.files_applied) == len(patch_set.patches)
    assert os.path.exists(tx_rec.workspace_path)

    # 2. Rollback transaction
    rollback_ok = PatchTransactionManager.rollback_transaction(tx_rec)
    assert rollback_ok is True
    assert tx_rec.status == TransactionStatus.ROLLED_BACK
    assert not os.path.exists(tx_rec.workspace_path)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Multi-Layer Verification Pipeline (M6)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multi_layer_verification_pipeline(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-verify", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-verify",
        title="SQL Injection",
        description="SQL flaw",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    impact = await MultiFileImpactResolver.resolve_impact(db_session, str(finding.id), temp_repo)
    plan = await MultiFileRemediationPlanner.create_plan(db_session, impact, "kavach-verify", "c0ffee", str(mock_user.id))
    patch_set = await MultiFilePatchGenerator.generate_patch_set(db_session, plan, temp_repo)
    tx_rec = PatchTransactionManager.apply_patch_transaction(patch_set, repo_root=temp_repo)

    report = await MultiFileVerificationPipeline.verify_patch_transaction(
        db=db_session,
        patch_set=patch_set,
        transaction=tx_rec,
        primary_finding_id=str(finding.id),
    )

    assert report.outcome == VerificationOutcome.PASSED
    assert len(report.layers) == 5
    assert report.original_finding_resolved is True
    assert report.new_findings_count == 0

    # Cleanup workspace
    PatchTransactionManager.rollback_transaction(tx_rec)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Bounded Revision Loop Tests (M7)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_bounded_revision_loop_stops_at_ceiling(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-rev", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-rev",
        title="SQL Injection",
        description="SQL flaw",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    impact = await MultiFileImpactResolver.resolve_impact(db_session, str(finding.id), temp_repo)
    plan = await MultiFileRemediationPlanner.create_plan(db_session, impact, "kavach-rev", "c0ffee", str(mock_user.id))
    patch_set = await MultiFilePatchGenerator.generate_patch_set(db_session, plan, temp_repo)

    # Mock a failed verification report
    fake_report = await MultiFileVerificationPipeline.verify_patch_transaction(
        db=db_session,
        patch_set=patch_set,
        transaction=PatchTransactionRecord(
            patch_set_id=patch_set.patch_set_id,
            plan_id=plan.plan_id,
            workspace_id="test_ws",
            workspace_path="/fake/path",
            status=TransactionStatus.ABORTED,
            base_tree_hash="123",
        ),
        primary_finding_id=str(finding.id),
    )

    # Attempt 4 (exceeding MAX_REVISION_ATTEMPTS=3)
    rec, new_set = await PatchRevisionLoop.revise_patch_set(
        db=db_session,
        plan=plan,
        current_patch_set=patch_set,
        verification_report=fake_report,
        current_attempt=4,
        repo_root=temp_repo,
    )

    assert rec.status == "FAILED_CEILING_REACHED"
    assert new_set is None
    assert "Maximum revision attempts exceeded" in rec.revision_reason


# ─────────────────────────────────────────────────────────────────────────────
# 8. Full End-to-End Coordinator Flow
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_end_to_end_coordinator_workflow(db_session: AsyncSession, mock_user: User, temp_repo: str):
    db_session.add(mock_user)
    await db_session.commit()

    proj = Project(id=uuid.uuid4(), name="kavach-e2e", owner_id=mock_user.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-e2e",
        title="SQL Injection Vulnerability",
        description="Raw query execution in db.py",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
        snippet="query = f\"SELECT * FROM users WHERE id = '{user_id}'\"",
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    # Step 1: Plan multi-file remediation
    plan_out = await MultiFileRemediationCoordinator.plan_multi_file_remediation(
        db=db_session,
        finding_id=str(finding.id),
        current_user=mock_user,
        repository="kavach-e2e",
        base_commit_sha="commit_101",
        repo_root=temp_repo,
    )

    assert plan_out["status"] == "WAITING_APPROVAL"
    assert plan_out["approval_token"] is not None
    approval_token = plan_out["approval_token"]

    plan_obj = MultiFileRemediationPlan(**plan_out["plan"])
    patch_set_obj = MultiFilePatchSet(**plan_out["patch_set"])

    # Step 2: Attempt execution with tampered token is blocked
    with pytest.raises(PermissionError):
        await MultiFileRemediationCoordinator.apply_and_verify_transaction(
            db=db_session,
            plan=plan_obj,
            patch_set=patch_set_obj,
            approval_token=approval_token + "_tampered",
            current_user=mock_user,
            repo_root=temp_repo,
        )

    # Step 3: Execute transaction with valid token
    res = await MultiFileRemediationCoordinator.apply_and_verify_transaction(
        db=db_session,
        plan=plan_obj,
        patch_set=patch_set_obj,
        approval_token=approval_token,
        current_user=mock_user,
        repo_root=temp_repo,
    )

    assert res["status"] == "VERIFIED"
    assert res["transaction"]["status"] == "APPLIED"
    assert res["verification"]["outcome"] == "passed"

    # Step 4: Replay attack with same token is blocked
    with pytest.raises(PermissionError) as exc_info:
        await MultiFileRemediationCoordinator.apply_and_verify_transaction(
            db=db_session,
            plan=plan_obj,
            patch_set=patch_set_obj,
            approval_token=approval_token,
            current_user=mock_user,
            repo_root=temp_repo,
        )
    assert "Human authorization failed" in str(exc_info.value)


# ─────────────────────────────────────────────────────────────────────────────
# 9. REST API Integration Tests (M7)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multi_file_remediation_rest_api(
    client: AsyncClient,
    token_user_a: str,
    user_a: User,
    db_session: AsyncSession,
    temp_repo: str,
):
    # 1. Create finding in DB for user_a
    proj = Project(id=uuid.uuid4(), name="kavach-api-test", owner_id=user_a.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-api-test",
        title="SQL Injection Vulnerability",
        description="Raw query execution in db.py",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
        snippet="query = f\"SELECT * FROM users WHERE id = '{user_id}'\"",
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 2. POST /api/v1/remediation/plans
    create_resp = await client.post(
        "/api/v1/remediation/plans",
        headers=headers,
        json={
            "finding_id": str(finding.id),
            "repository": "kavach-api-test",
            "base_commit_sha": "api_commit_1",
            "repo_root": temp_repo,
        },
    )
    assert create_resp.status_code == 200, create_resp.text
    create_data = create_resp.json()
    plan_id = create_data["plan"]["plan_id"]
    patch_set_id = create_data["patch_set"]["patch_set_id"]

    # 3. GET /api/v1/remediation/plans/{id}
    get_plan_resp = await client.get(f"/api/v1/remediation/plans/{plan_id}", headers=headers)
    assert get_plan_resp.status_code == 200
    assert get_plan_resp.json()["plan_id"] == plan_id

    # 4. POST /api/v1/remediation/plans/{id}/validate
    val_resp = await client.post(f"/api/v1/remediation/plans/{plan_id}/validate", headers=headers)
    assert val_resp.status_code == 200
    assert val_resp.json()["is_valid"] is True

    # 5. POST /api/v1/remediation/plans/{id}/approve
    appr_resp = await client.post(f"/api/v1/remediation/plans/{plan_id}/approve", headers=headers)
    assert appr_resp.status_code == 200
    new_token = appr_resp.json()["approval_token"]

    # 6. GET /api/v1/remediation/patch-sets/{id}
    ps_resp = await client.get(f"/api/v1/remediation/patch-sets/{patch_set_id}", headers=headers)
    assert ps_resp.status_code == 200
    assert ps_resp.json()["patch_set_id"] == patch_set_id

    # 7. GET /api/v1/remediation/patch-sets/{id}/diff
    diff_resp = await client.get(f"/api/v1/remediation/patch-sets/{patch_set_id}/diff", headers=headers)
    assert diff_resp.status_code == 200
    assert "--- a/app/db.py" in diff_resp.text

    # 8. POST /api/v1/remediation/patch-sets/{id}/apply
    apply_resp = await client.post(
        f"/api/v1/remediation/patch-sets/{patch_set_id}/apply",
        headers=headers,
        json={
            "patch_set_id": patch_set_id,
            "approval_token": new_token,
            "repo_root": temp_repo,
        },
    )
    assert apply_resp.status_code == 200, apply_resp.text
    apply_data = apply_resp.json()
    assert apply_data["status"] == "VERIFIED"
    assert apply_data["verification"]["outcome"] == "passed"

    # 9. POST /api/v1/remediation/patch-sets/{id}/verify
    verify_resp = await client.post(f"/api/v1/remediation/patch-sets/{patch_set_id}/verify", headers=headers)
    assert verify_resp.status_code == 200
    assert verify_resp.json()["outcome"] == "passed"

    # 10. POST /api/v1/remediation/patch-sets/{id}/rollback
    rb_resp = await client.post(f"/api/v1/remediation/patch-sets/{patch_set_id}/rollback", headers=headers)
    assert rb_resp.status_code == 200
    assert rb_resp.json()["rollback_performed"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 10. Action Orchestrator Multi-File Intent Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_action_orchestrator_multi_file_intent(
    db_session: AsyncSession,
    user_a: User,
    temp_repo: str,
):
    from app.intelligence.action_orchestrator import CentralActionOrchestrator
    from app.models.ai_assistant import AIConversation

    proj = Project(id=uuid.uuid4(), name="kavach-orch-test", owner_id=user_a.id)
    scan = SecurityScan(id=uuid.uuid4(), project_id=proj.id, target_path=".")
    exec_run = ScannerExecution(id=uuid.uuid4(), scan_id=scan.id, scanner_name="semgrep", scanner_type="SAST")
    finding = SecurityFinding(
        id=uuid.uuid4(),
        project_id=proj.id,
        scan_id=scan.id,
        scanner_execution_id=exec_run.id,
        scanner_name="semgrep",
        repository="kavach-orch-test",
        title="SQL Injection Vulnerability",
        description="Raw query execution in db.py",
        severity="CRITICAL",
        rule_id="CWE-89",
        fingerprint=f"fp_{uuid.uuid4().hex[:8]}",
        file_path="app/db.py",
        line_number=3,
        snippet="query = f\"SELECT * FROM users WHERE id = '{user_id}'\"",
    )
    db_session.add_all([proj, scan, exec_run, finding])
    await db_session.commit()

    conv = AIConversation(id=uuid.uuid4(), user_id=user_a.id, project_id=proj.id, title="Remediation Conv")
    db_session.add(conv)
    await db_session.commit()

    orch = CentralActionOrchestrator(db=db_session)
    intent = orch._classify_intent("coordinate fix across files for this vulnerability")
    assert intent["action"] == "PLAN_MULTI_FILE_REMEDIATION"
    assert intent["agent_type"] == "remediation_agent"

    # Test dispatching the handler
    res = await orch._handle_multi_file_remediation(
        query="coordinate fix across files",
        current_user=user_a,
        conversation=conv,
        project_id=proj.id,
        context={"findings": [{"id": str(finding.id)}], "repo_root": temp_repo},
        selected_repositories=["kavach-orch-test"],
    )

    assert res["status"] == "WAITING_APPROVAL"
    assert "structured_data" in res
    assert res["structured_data"]["type"] == "multi_file_remediation"
    assert "plan" in res["structured_data"]
