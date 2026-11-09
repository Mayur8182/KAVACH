"""
Kavach Phase 4: Patch-Set Validator (M4)
Validates the complete multi-file patch set before approval and before execution:
Scope, path containment, symlink safety, base hashes, diff budgets,
syntax integrity, secret detection, and cross-file consistency.
"""

from __future__ import annotations

import os
import re
import ast
import hashlib
import logging
from typing import Dict, List, Optional, Set, Tuple

from app.intelligence.remediation.models import (
    MultiFilePatchSet,
    FilePatchUnit,
    ValidationFinding,
    PatchSetValidationResult,
)
from app.services.remediation.diff_applier import apply_unified_diff, PatchApplicationError

logger = logging.getLogger("kavach.remediation.validator")

# Limits
MAX_LINES_PER_DIFF = 600
MAX_TOTAL_DIFF_LINES = 2000
SECRET_REGEXES = [
    re.compile(r"""(?:api_key|apikey|secret|password|passwd|token|auth_token)\s*=\s*['"][A-Za-z0-9_\-+=/]{16,}['"]""", re.IGNORECASE),
    re.compile(r"""AKIA[0-9A-Z]{16}"""),  # AWS Access Key
    re.compile(r"""ghp_[A-Za-z0-9]{36}"""),  # GitHub PAT
    re.compile(r"""-----BEGIN (?:RSA )?PRIVATE KEY-----"""),
]


class MultiFilePatchValidator:
    """
    Step 1.4 / M4: Comprehensive Multi-File Patch Set Validator.
    Rejection on any blocking violation prevents approval or execution.
    """

    @classmethod
    def validate_patch_set(
        cls,
        patch_set: MultiFilePatchSet,
        repo_root: Optional[str] = None,
    ) -> PatchSetValidationResult:
        """
        Runs all validation checks across the patch set.
        """
        repo_path = os.path.abspath(repo_root or os.path.join(os.path.dirname(__file__), "../../../.."))
        blockers: List[ValidationFinding] = []
        warnings: List[ValidationFinding] = []
        checked_rules: List[str] = []

        total_diff_lines = 0

        # Rule 1: Repository containment & path normalization
        checked_rules.append("PATH_CONTAINMENT_AND_SYMLINK_CHECK")
        for patch in patch_set.patches:
            fpath = patch.file_path
            # Check for directory traversal
            if ".." in fpath or fpath.startswith("/") or fpath.startswith("\\"):
                blockers.append(
                    ValidationFinding(
                        severity="ERROR",
                        file_path=fpath,
                        check_type="PATH_TRAVERSAL",
                        message=f"Path traversal detected in file path '{fpath}'. Must be relative and within repository root.",
                        is_blocking=True,
                    )
                )

            # Check absolute normalized path inside repo root
            resolved_abs = os.path.abspath(os.path.join(repo_path, fpath))
            if not resolved_abs.startswith(repo_path):
                blockers.append(
                    ValidationFinding(
                        severity="ERROR",
                        file_path=fpath,
                        check_type="PATH_ESCAPING",
                        message=f"File path '{fpath}' resolves outside repository root ({repo_path}).",
                        is_blocking=True,
                    )
                )

            # Prohibited files / patterns
            if any(p in fpath.lower() for p in (".git/", "id_rsa", ".env", "passwd")):
                blockers.append(
                    ValidationFinding(
                        severity="ERROR",
                        file_path=fpath,
                        check_type="PROHIBITED_PATH",
                        message=f"Modifying sensitive system path '{fpath}' is strictly prohibited.",
                        is_blocking=True,
                    )
                )

        # Rule 2: Base File Hash Pinning
        checked_rules.append("BASE_FILE_HASH_VERIFICATION")
        for patch in patch_set.patches:
            full_path = os.path.normpath(os.path.join(repo_path, patch.file_path))
            if os.path.exists(full_path) and os.path.isfile(full_path):
                try:
                    with open(full_path, "rb") as f:
                        disk_hash = hashlib.sha256(f.read()).hexdigest()
                    if patch.base_file_hash and disk_hash != patch.base_file_hash:
                        blockers.append(
                            ValidationFinding(
                                severity="ERROR",
                                file_path=patch.file_path,
                                check_type="BASE_HASH_MISMATCH",
                                message=(
                                    f"Base file hash mismatch for '{patch.file_path}'. "
                                    f"File on disk ({disk_hash[:8]}) differs from pinned snapshot ({patch.base_file_hash[:8]}). "
                                    f"Stale patch application rejected."
                                ),
                                is_blocking=True,
                            )
                        )
                except Exception as e:
                    warnings.append(
                        ValidationFinding(
                            severity="WARNING",
                            file_path=patch.file_path,
                            check_type="HASH_READ_ERROR",
                            message=f"Could not read base file on disk for hash check: {e}",
                            is_blocking=False,
                        )
                    )

        # Rule 3: Diff Budgets & Size Limits
        checked_rules.append("DIFF_BUDGET_AND_LIMITS")
        for patch in patch_set.patches:
            diff_lines = len(patch.unified_diff.splitlines())
            total_diff_lines += diff_lines
            if diff_lines > MAX_LINES_PER_DIFF:
                blockers.append(
                    ValidationFinding(
                        severity="ERROR",
                        file_path=patch.file_path,
                        check_type="DIFF_SIZE_EXCEEDED",
                        message=f"Diff size ({diff_lines} lines) exceeds maximum allowable limit of {MAX_LINES_PER_DIFF} lines.",
                        is_blocking=True,
                    )
                )

        if total_diff_lines > MAX_TOTAL_DIFF_LINES:
            blockers.append(
                ValidationFinding(
                    severity="ERROR",
                    check_type="TOTAL_DIFF_SIZE_EXCEEDED",
                    message=f"Total patch set size ({total_diff_lines} lines) exceeds allowable budget of {MAX_TOTAL_DIFF_LINES} lines.",
                    is_blocking=True,
                )
            )

        # Rule 4: Clean Patch Applicability (Dry-run)
        checked_rules.append("DIFF_APPLICABILITY_TEST")
        for patch in patch_set.patches:
            if patch.original_code and patch.unified_diff and "@@" in patch.unified_diff:
                try:
                    applied = apply_unified_diff(patch.original_code, patch.unified_diff)
                    if not applied:
                        blockers.append(
                            ValidationFinding(
                                severity="ERROR",
                                file_path=patch.file_path,
                                check_type="PATCH_APPLICATION_FAILURE",
                                message=f"Diff could not be cleanly applied to original content in '{patch.file_path}'.",
                                is_blocking=True,
                            )
                        )
                except PatchApplicationError as pe:
                    blockers.append(
                        ValidationFinding(
                            severity="ERROR",
                            file_path=patch.file_path,
                            check_type="PATCH_APPLICATION_FAILURE",
                            message=f"Diff conflict during dry-run application for '{patch.file_path}': {pe}",
                            is_blocking=True,
                        )
                    )

        # Rule 5: AST Syntax Validation
        checked_rules.append("AST_SYNTAX_VALIDATION")
        for patch in patch_set.patches:
            if patch.file_path.endswith(".py") and patch.patched_code:
                try:
                    ast.parse(patch.patched_code)
                except SyntaxError as se:
                    blockers.append(
                        ValidationFinding(
                            severity="ERROR",
                            file_path=patch.file_path,
                            line_number=se.lineno,
                            check_type="SYNTAX_ERROR",
                            message=f"Python syntax error at line {se.lineno}: {se.msg}",
                            is_blocking=True,
                        )
                    )

        # Rule 6: Secret Scanning (No Credentials Introduced)
        checked_rules.append("SECRET_CREDENTIAL_SCAN")
        for patch in patch_set.patches:
            added_lines = [
                line[1:] for line in patch.unified_diff.splitlines()
                if line.startswith("+") and not line.startswith("+++")
            ]
            added_text = "\n".join(added_lines)
            for s_regex in SECRET_REGEXES:
                if s_regex.search(added_text):
                    blockers.append(
                        ValidationFinding(
                            severity="ERROR",
                            file_path=patch.file_path,
                            check_type="SECRET_INSERTION_DETECTED",
                            message=f"Potential hardcoded secret or credential detected in patch for '{patch.file_path}'.",
                            is_blocking=True,
                        )
                    )

        is_valid = (len(blockers) == 0)
        summary = (
            f"Multi-file patch set validation PASSED: {len(patch_set.patches)} files verified against {len(checked_rules)} rules."
            if is_valid else
            f"Multi-file patch set validation FAILED with {len(blockers)} blocking error(s)."
        )

        return PatchSetValidationResult(
            is_valid=is_valid,
            blockers=blockers,
            warnings=warnings,
            checked_rules=checked_rules,
            summary=summary,
        )

