"""
Kavach Phase 4: Multi-File Autonomous Remediation — Authoritative Schemas & Contracts
Conforms to:
- "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
- Rule 1: No Hardcoded Data
- Rule 2: No Fake Success
- Rule 6: Real Database Persistence
- Rule 18: Real Fixes Only (original file, changed file, diff, reason, validation test, rescan)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# 1. Enums
# ─────────────────────────────────────────────────────────────────────────────

class FileClassification(str, Enum):
    REQUIRED = "required"            # Must change for fix to be complete
    SUPPORTING = "supporting"        # Needed for types, interfaces, config, callers
    TEST = "test"                    # Tests/fixtures validating behavior
    DOCUMENTATION = "documentation"  # Docs requiring update
    GENERATED = "generated"          # Generated output, build/lockfile
    VENDOR = "vendor"                # Third-party code (excluded by default)
    UNRELATED = "unrelated"          # No relation to the fix (excluded)


class FileOperation(str, Enum):
    MODIFY = "modify"
    ADD = "add"
    DELETE = "delete"
    RENAME = "rename"


class TransactionStatus(str, Enum):
    PREPARING = "PREPARING"
    VERIFIED_BASE = "VERIFIED_BASE"
    STAGED = "STAGED"
    APPLYING = "APPLYING"
    APPLIED = "APPLIED"
    ABORTED = "ABORTED"
    ROLLED_BACK = "ROLLED_BACK"


class VerificationOutcome(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    INCONCLUSIVE = "inconclusive"
    PARTIALLY_PASSED = "partially_passed"


class RemediationPlanStatus(str, Enum):
    PROPOSED = "PROPOSED"
    VALIDATED = "VALIDATED"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    APPLIED = "APPLIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Impact Analysis Contracts (M1)
# ─────────────────────────────────────────────────────────────────────────────

class CandidateFileImpact(BaseModel):
    file_path: str
    classification: FileClassification
    target_symbols: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)
    callers: List[str] = Field(default_factory=list)
    callees: List[str] = Field(default_factory=list)
    imports: List[str] = Field(default_factory=list)
    is_included_in_plan: bool = True
    base_file_hash: Optional[str] = None


class MultiFileImpactReport(BaseModel):
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    finding_id: str
    primary_file: str
    primary_symbol: Optional[str] = None
    candidate_files: List[CandidateFileImpact] = Field(default_factory=list)
    completeness_warnings: List[str] = Field(default_factory=list)
    overall_confidence: float = 1.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# 3. Change-Set Planning Contracts (M2)
# ─────────────────────────────────────────────────────────────────────────────

class PlannedFileChange(BaseModel):
    file_path: str
    classification: FileClassification
    operation: FileOperation = FileOperation.MODIFY
    base_file_hash: str
    target_symbols: List[str] = Field(default_factory=list)
    rationale: str
    dependency_order: int = 0
    validation_requirements: List[str] = Field(default_factory=list)


class MultiFileRemediationPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: int = 1
    task_id: Optional[str] = None
    project_id: str
    repository: str
    base_commit_sha: str
    finding_ids: List[str]
    plan_hash: str = ""
    problem_statement: str
    security_objective: str
    files: List[PlannedFileChange] = Field(default_factory=list)
    invariants: List[Dict[str, str]] = Field(default_factory=list)
    rollback_strategy: str
    status: RemediationPlanStatus = RemediationPlanStatus.PROPOSED
    requires_approval: bool = True
    approval_token: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# 4. Patch Generation & Validator Contracts (M3, M4)
# ─────────────────────────────────────────────────────────────────────────────

class FilePatchUnit(BaseModel):
    file_path: str
    operation: FileOperation = FileOperation.MODIFY
    base_file_hash: str
    target_symbol: Optional[str] = None
    unified_diff: str
    original_code: str
    patched_code: str
    rationale: str
    expected_postconditions: List[str] = Field(default_factory=list)
    lines_added: int = 0
    lines_deleted: int = 0


class MultiFilePatchSet(BaseModel):
    patch_set_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    plan_hash: str
    version: int = 1
    base_commit_sha: str
    base_tree_hash: Optional[str] = None
    result_tree_hash: Optional[str] = None
    patches: List[FilePatchUnit] = Field(default_factory=list)
    file_count: int = 0
    total_additions: int = 0
    total_deletions: int = 0
    combined_diff: str = ""
    status: str = "GENERATED"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ValidationFinding(BaseModel):
    severity: str  # ERROR, WARNING, INFO
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    check_type: str  # PATH_TRAVERSAL, BASE_HASH_MISMATCH, SYNTAX, TYPE, SECRET, POLICY
    message: str
    is_blocking: bool = True


class PatchSetValidationResult(BaseModel):
    is_valid: bool
    blockers: List[ValidationFinding] = Field(default_factory=list)
    warnings: List[ValidationFinding] = Field(default_factory=list)
    checked_rules: List[str] = Field(default_factory=list)
    summary: str


# ─────────────────────────────────────────────────────────────────────────────
# 5. Transaction & Verification Contracts (M5, M6)
# ─────────────────────────────────────────────────────────────────────────────

class PatchTransactionRecord(BaseModel):
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patch_set_id: str
    plan_id: str
    workspace_id: str
    workspace_path: str
    status: TransactionStatus = TransactionStatus.PREPARING
    base_tree_hash: str
    result_tree_hash: Optional[str] = None
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: Optional[str] = None
    failure_code: Optional[str] = None
    failure_details: Optional[str] = None
    rollback_performed: bool = False
    files_applied: List[str] = Field(default_factory=list)


class VerificationLayerResult(BaseModel):
    layer_name: str  # Layer 1 Integrity, Layer 2 Static, Layer 3 Functional, Layer 4 Security, Layer 5 Change-Set
    status: str      # PASSED, FAILED, SKIPPED
    summary: str
    violations: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)


class MultiLayerVerificationReport(BaseModel):
    verification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patch_set_id: str
    plan_id: str
    outcome: VerificationOutcome
    layers: List[VerificationLayerResult] = Field(default_factory=list)
    original_finding_resolved: bool = False
    new_findings_count: int = 0
    new_findings: List[Dict[str, Any]] = Field(default_factory=list)
    summary: str
    evidence_artifacts: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# 6. Revision Loop Contracts (M7)
# ─────────────────────────────────────────────────────────────────────────────

class PatchRevisionRecord(BaseModel):
    revision_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    attempt_number: int
    max_attempts: int = 3
    previous_patch_set_id: str
    new_patch_set_id: Optional[str] = None
    revision_reason: str
    diagnostics: List[str] = Field(default_factory=list)
    changes_summary: Optional[str] = None
    diff_growth_percentage: float = 0.0
    reapproval_required: bool = False
    status: str = "IN_PROGRESS"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

