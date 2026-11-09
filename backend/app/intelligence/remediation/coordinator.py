"""
Kavach Phase 4: Multi-File Remediation Coordinator
Orchestrates the entire coordinated multi-file lifecycle:
Impact Resolution -> Change-Set Planning -> Patch Generation ->
Patch Validation -> Approval Guard -> Transaction Application ->
Multi-Layer Verification -> Revision Loop.
"""

from __future__ import annotations

import os
import uuid
import logging
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.scan import SecurityFinding
from app.models.remediation import RemediationPlan, RemediationPatch
from app.intelligence.execution.approval_guard import ApprovalGuard
from app.intelligence.remediation.models import (
    MultiFileRemediationPlan,
    MultiFilePatchSet,
    PatchSetValidationResult,
    PatchTransactionRecord,
    MultiLayerVerificationReport,
    VerificationOutcome,
    RemediationPlanStatus,
)
from app.intelligence.remediation.impact_resolver import MultiFileImpactResolver
from app.intelligence.remediation.plan_manager import MultiFileRemediationPlanner
from app.intelligence.remediation.patch_generator import MultiFilePatchGenerator
from app.intelligence.remediation.validator import MultiFilePatchValidator
from app.intelligence.remediation.transaction_manager import PatchTransactionManager
from app.intelligence.remediation.verification_pipeline import MultiFileVerificationPipeline
from app.intelligence.remediation.revision_loop import PatchRevisionLoop

logger = logging.getLogger("kavach.remediation.coordinator")


class MultiFileRemediationCoordinator:
    """
    High-level orchestrator for Phase 4: Multi-File Autonomous Remediation.
    Guarantees:
    - Atomicity: patch set is one logical transaction
    - Minimality: smallest safe change set
    - Non-repudiation: approval binds exact plan hash & base commit
    - Verification: real 5-layer evidence before marking resolved
    """

    @classmethod
    async def plan_multi_file_remediation(
        cls,
        db: AsyncSession,
        finding_id: str,
        current_user: User,
        repository: str = "main-repo",
        base_commit_sha: str = "HEAD",
        repo_root: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes Steps 1-4: Impact Resolution -> Change-Set Planning ->
        Patch Generation -> Validation -> Cryptographic Approval Token.
        Returns plan, validation result, and approval token.
        """
        # 1. Impact Resolution (M1)
        impact_report = await MultiFileImpactResolver.resolve_impact(
            db=db,
            finding_id=finding_id,
            repo_root=repo_root,
            base_commit_sha=base_commit_sha,
        )

        # 2. Change-Set Planning (M2)
        plan = await MultiFileRemediationPlanner.create_plan(
            db=db,
            impact_report=impact_report,
            repository=repository,
            base_commit_sha=base_commit_sha,
            user_id=str(current_user.id),
        )

        # 3. Multi-File Patch Generation (M3)
        patch_set = await MultiFilePatchGenerator.generate_patch_set(
            db=db,
            plan=plan,
            repo_root=repo_root,
        )

        # 4. Patch-Set Validation (M4)
        validation_result = MultiFilePatchValidator.validate_patch_set(
            patch_set=patch_set,
            repo_root=repo_root,
        )

        if not validation_result.is_valid:
            plan.status = RemediationPlanStatus.FAILED
            return {
                "status": "VALIDATION_FAILED",
                "plan": plan.model_dump(),
                "patch_set": patch_set.model_dump(),
                "validation": validation_result.model_dump(),
                "approval_token": None,
                "message": f"Pre-apply validation rejected patch set: {validation_result.summary}",
            }

        # 5. Generate Replay-Proof Single-Use Cryptographic Approval Token
        token_info = ApprovalGuard.generate_approval_token(
            plan_id=plan.plan_id,
            step_id="multi-file-apply",
            target_resource=f"plan:{plan.plan_id}:hash:{plan.plan_hash[:16]}",
            action="remediation.multi_file_apply",
            project_id=plan.project_id,
            user_id=str(current_user.id),
            expires_in_seconds=3600,
        )
        plan.approval_token = token_info["token"]
        plan.status = RemediationPlanStatus.WAITING_APPROVAL

        return {
            "status": "WAITING_APPROVAL",
            "plan": plan.model_dump(),
            "patch_set": patch_set.model_dump(),
            "validation": validation_result.model_dump(),
            "approval_token": plan.approval_token,
            "message": (
                f"Multi-file remediation plan formulated across {len(plan.files)} files. "
                f"Validation passed cleanly. Human approval required to execute transaction."
            ),
        }

    @classmethod
    async def apply_and_verify_transaction(
        cls,
        db: AsyncSession,
        plan: MultiFileRemediationPlan,
        patch_set: MultiFilePatchSet,
        approval_token: str,
        current_user: User,
        repo_root: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes Steps 6-8: Verify Approval Token -> Apply in Isolated Workspace (M5) ->
        Run Multi-Layer Verification Pipeline (M6).
        """
        # 1. Verify single-use cryptographic token
        expected_resource = f"plan:{plan.plan_id}:hash:{plan.plan_hash[:16]}"
        is_valid, err = ApprovalGuard.verify_approval_token(
            token=approval_token,
            expected_plan_id=plan.plan_id,
            expected_step_id="multi-file-apply",
            expected_target_resource=expected_resource,
            expected_action="remediation.multi_file_apply",
        )
        if not is_valid:
            raise PermissionError(f"Human authorization failed: {err}")

        # Redeem token to prevent replay
        ApprovalGuard.redeem_token(token=approval_token)

        plan.approved_by = current_user.email
        plan.status = RemediationPlanStatus.APPROVED

        # 2. Transactional Application (M5)
        transaction_record = PatchTransactionManager.apply_patch_transaction(
            patch_set=patch_set,
            repo_root=repo_root,
        )

        # 3. Multi-Layer Verification Pipeline (M6)
        verification_report = await MultiFileVerificationPipeline.verify_patch_transaction(
            db=db,
            patch_set=patch_set,
            transaction=transaction_record,
            primary_finding_id=plan.finding_ids[0] if plan.finding_ids else None,
        )

        if verification_report.outcome == VerificationOutcome.PASSED:
            plan.status = RemediationPlanStatus.VERIFIED

            # Persist RemediationPatch record in DB for traceability
            db_patch = RemediationPatch(
                id=uuid.UUID(patch_set.patch_set_id),
                remediation_plan_id=uuid.UUID(plan.plan_id),
                base_commit_sha=plan.base_commit_sha,
                workspace_id=transaction_record.workspace_id,
                patch_format="unified_diff",
                original_hash=transaction_record.base_tree_hash,
                patched_hash=transaction_record.result_tree_hash,
                diff=patch_set.combined_diff,
                affected_files=[p.file_path for p in patch_set.patches],
                generated_by="MultiFileRemediationCoordinator",
                generation_model="gemini-2.5-flash-lite",
                status="VERIFIED",
            )
            db.add(db_patch)
            await db.commit()

            return {
                "status": "VERIFIED",
                "plan": plan.model_dump(),
                "patch_set": patch_set.model_dump(),
                "transaction": transaction_record.model_dump(),
                "verification": verification_report.model_dump(),
                "message": (
                    f"Multi-file remediation successfully applied and verified across {len(patch_set.patches)} files. "
                    f"Original finding eliminated with zero regressions."
                ),
            }
        else:
            plan.status = RemediationPlanStatus.FAILED
            # Rollback workspace on verification failure
            PatchTransactionManager.rollback_transaction(transaction_record)

            return {
                "status": "VERIFICATION_FAILED",
                "plan": plan.model_dump(),
                "patch_set": patch_set.model_dump(),
                "transaction": transaction_record.model_dump(),
                "verification": verification_report.model_dump(),
                "message": f"Verification failed. Transaction rolled back: {verification_report.summary}",
            }
