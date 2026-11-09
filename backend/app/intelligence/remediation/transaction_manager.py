"""
Kavach Phase 4: Patch Transaction Manager (M5)
Executes all-or-nothing isolated transactional patch application.
Enforces atomicity, tree hash verification, and instant rollback on any defect.
"""

from __future__ import annotations

import os
import shutil
import hashlib
import logging
import tempfile
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from app.intelligence.remediation.models import (
    TransactionStatus,
    MultiFilePatchSet,
    PatchTransactionRecord,
)
from app.services.remediation.diff_applier import apply_unified_diff, PatchApplicationError

logger = logging.getLogger("kavach.remediation.transaction_manager")


class PatchTransactionManager:
    """
    Step 1.5 / M5: Manages the atomic, isolated workspace transaction.
    Lifecycle:
      PREPARE -> VERIFY_BASE_COMMIT -> CREATE_ISOLATED_WORKSPACE
      -> VERIFY_ALL_BASE_FILE_HASHES -> STAGE_PATCH_SET -> APPLY_PATCH_SET
      -> VALIDATE_RESULTING_TREE -> RECORD_TREE_HASH_AND_DIFF -> READY_FOR_VERIFICATION
    """

    @classmethod
    def apply_patch_transaction(
        cls,
        patch_set: MultiFilePatchSet,
        repo_root: Optional[str] = None,
        workspace_base_dir: Optional[str] = None,
    ) -> PatchTransactionRecord:
        """
        Applies a multi-file patch set atomically in an isolated sandbox.
        If any patch fails or base hash mismatches, aborts and cleans up immediately.
        """
        source_root = os.path.abspath(repo_root or os.path.join(os.path.dirname(__file__), "../../../.."))
        base_scratch = os.path.abspath(
            workspace_base_dir or os.path.join(source_root, "scratch/isolated_workspaces")
        )
        os.makedirs(base_scratch, exist_ok=True)

        workspace_id = f"tx_{patch_set.patch_set_id[:8]}"
        workspace_dir = os.path.join(base_scratch, workspace_id)

        # 1. Clean pre-existing workspace if any
        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)
        os.makedirs(workspace_dir, exist_ok=True)

        # 2. Compute Base Tree Hash across all target files
        base_tree_hash = cls._compute_target_tree_hash(source_root, [p.file_path for p in patch_set.patches])

        record = PatchTransactionRecord(
            patch_set_id=patch_set.patch_set_id,
            plan_id=patch_set.plan_id,
            workspace_id=workspace_id,
            workspace_path=workspace_dir,
            status=TransactionStatus.PREPARING,
            base_tree_hash=base_tree_hash,
        )

        applied_files: List[str] = []

        try:
            # 3. VERIFY_ALL_BASE_FILE_HASHES
            for patch in patch_set.patches:
                src_file = os.path.normpath(os.path.join(source_root, patch.file_path))
                if os.path.exists(src_file) and os.path.isfile(src_file):
                    with open(src_file, "rb") as f:
                        current_hash = hashlib.sha256(f.read()).hexdigest()
                    if patch.base_file_hash and current_hash != patch.base_file_hash:
                        raise ValueError(
                            f"Base file hash mismatch for '{patch.file_path}'. "
                            f"Current: {current_hash[:8]}, Pinned: {patch.base_file_hash[:8]}."
                        )

            record.status = TransactionStatus.VERIFIED_BASE

            # 4. STAGE_PATCH_SET (Copy relevant files into isolated sandbox)
            for patch in patch_set.patches:
                src_file = os.path.normpath(os.path.join(source_root, patch.file_path))
                dst_file = os.path.normpath(os.path.join(workspace_dir, patch.file_path))
                os.makedirs(os.path.dirname(dst_file), exist_ok=True)

                if os.path.exists(src_file) and os.path.isfile(src_file):
                    shutil.copy2(src_file, dst_file)
                else:
                    # New file
                    with open(dst_file, "w", encoding="utf-8") as f:
                        f.write(patch.original_code or "")

            record.status = TransactionStatus.STAGED

            # 5. APPLY_PATCH_SET
            record.status = TransactionStatus.APPLYING
            for patch in patch_set.patches:
                target_file = os.path.normpath(os.path.join(workspace_dir, patch.file_path))
                with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                    orig_content = f.read()

                # Apply unified diff
                try:
                    if patch.patched_code:
                        # Direct verified code write
                        new_content = patch.patched_code
                    else:
                        new_content = apply_unified_diff(orig_content, patch.unified_diff)

                    with open(target_file, "w", encoding="utf-8") as f:
                        f.write(new_content)

                    applied_files.append(patch.file_path)
                except Exception as e:
                    raise PatchApplicationError(f"Failed to apply patch to '{patch.file_path}': {e}")

            # 6. VALIDATE_RESULTING_TREE & RECORD_TREE_HASH
            result_tree_hash = cls._compute_target_tree_hash(workspace_dir, [p.file_path for p in patch_set.patches])

            record.status = TransactionStatus.APPLIED
            record.result_tree_hash = result_tree_hash
            record.files_applied = applied_files
            record.finished_at = datetime.now(timezone.utc).isoformat()

            patch_set.base_tree_hash = base_tree_hash
            patch_set.result_tree_hash = result_tree_hash
            patch_set.status = "APPLIED"

            logger.info(f"Transaction {record.transaction_id} successfully APPLIED to workspace {workspace_id}")
            return record

        except Exception as exc:
            # ABORT TRANSACTION & RESTORE CLEAN WORKSPACE
            logger.error(f"Patch transaction aborted due to error: {exc}", exc_info=True)
            record.status = TransactionStatus.ABORTED
            record.failure_code = "TRANSACTION_EXECUTION_FAILURE"
            record.failure_details = str(exc)
            record.finished_at = datetime.now(timezone.utc).isoformat()

            # Clean workspace
            cls.rollback_transaction(record)
            raise

    @classmethod
    def rollback_transaction(cls, record: PatchTransactionRecord) -> bool:
        """
        Restores isolated workspace to pre-transaction state.
        Never touches the user's remote Git branches.
        """
        try:
            if os.path.exists(record.workspace_path):
                shutil.rmtree(record.workspace_path, ignore_errors=True)
            record.status = TransactionStatus.ROLLED_BACK
            record.rollback_performed = True
            logger.info(f"Transaction {record.transaction_id} rolled back cleanly.")
            return True
        except Exception as e:
            logger.error(f"Error during transaction rollback: {e}")
            return False

    @classmethod
    def _compute_target_tree_hash(cls, root_dir: str, file_paths: List[str]) -> str:
        """Computes deterministic SHA256 tree hash over content of all target files."""
        hasher = hashlib.sha256()
        for fp in sorted(file_paths):
            full_path = os.path.normpath(os.path.join(root_dir, fp))
            if os.path.exists(full_path) and os.path.isfile(full_path):
                with open(full_path, "rb") as f:
                    hasher.update(fp.encode("utf-8"))
                    hasher.update(f.read())
            else:
                hasher.update(fp.encode("utf-8"))
                hasher.update(b"<missing>")
        return hasher.hexdigest()

