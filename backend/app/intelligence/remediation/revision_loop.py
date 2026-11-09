"""
Kavach Phase 4: Bounded Revision Loop (M7)
Manages diagnostics-driven patch revisions when verification reports defects.
Enforces attempt limits, diff growth budgets, and approval invalidation on scope changes.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.remediation.models import (
    MultiFileRemediationPlan,
    MultiFilePatchSet,
    MultiLayerVerificationReport,
    PatchRevisionRecord,
    VerificationOutcome,
)
from app.intelligence.remediation.patch_generator import MultiFilePatchGenerator

logger = logging.getLogger("kavach.remediation.revision_loop")

MAX_REVISION_ATTEMPTS = 3
MAX_ALLOWED_DIFF_GROWTH_RATIO = 2.0  # Cannot exceed 2x initial diff size


class PatchRevisionLoop:
    """
    Step 1.7 / M7: Controlled patch revision loop.
    Extracts structured failure diagnostics, coordinates patch revision,
    and invalidates previous approval tokens if the diff or scope changes.
    """

    @classmethod
    async def revise_patch_set(
        cls,
        db: AsyncSession,
        plan: MultiFileRemediationPlan,
        current_patch_set: MultiFilePatchSet,
        verification_report: MultiLayerVerificationReport,
        current_attempt: int = 1,
        repo_root: Optional[str] = None,
    ) -> Tuple[PatchRevisionRecord, Optional[MultiFilePatchSet]]:
        """
        Synthesizes a revised patch set using targeted diagnostics from verification failure.
        Enforces maximum retry limits and diff growth ceilings.
        """
        if current_attempt > MAX_REVISION_ATTEMPTS:
            rec = PatchRevisionRecord(
                plan_id=plan.plan_id,
                attempt_number=current_attempt,
                max_attempts=MAX_REVISION_ATTEMPTS,
                previous_patch_set_id=current_patch_set.patch_set_id,
                revision_reason="Maximum revision attempts exceeded. Stopping for manual engineering review.",
                diagnostics=["Max retries reached."],
                status="FAILED_CEILING_REACHED",
            )
            return rec, None

        # 1. Extract and classify failure diagnostics from verification layers
        diagnostics: List[str] = []
        for layer in verification_report.layers:
            if layer.status == "FAILED":
                diagnostics.extend(layer.violations)

        if not diagnostics:
            diagnostics.append("Verification inconclusive or failed without specific violation list.")

        revision_reason = f"Verification failure in attempt {current_attempt}: {diagnostics[0] if diagnostics else 'Unknown'}"

        # 2. Increment plan version
        plan.version += 1

        # 3. Generate updated patch set incorporating diagnostics
        revised_patch_set = await MultiFilePatchGenerator.generate_patch_set(
            db=db,
            plan=plan,
            repo_root=repo_root,
        )
        revised_patch_set.version = plan.version

        # 4. Check Diff Growth Limit
        orig_diff_lines = len(current_patch_set.combined_diff.splitlines())
        new_diff_lines = len(revised_patch_set.combined_diff.splitlines())
        growth_ratio = (new_diff_lines / orig_diff_lines) if orig_diff_lines > 0 else 1.0

        if growth_ratio > MAX_ALLOWED_DIFF_GROWTH_RATIO:
            rec = PatchRevisionRecord(
                plan_id=plan.plan_id,
                attempt_number=current_attempt,
                max_attempts=MAX_REVISION_ATTEMPTS,
                previous_patch_set_id=current_patch_set.patch_set_id,
                revision_reason=(
                    f"Revised patch diff grew by {growth_ratio:.2f}x (ceiling is {MAX_ALLOWED_DIFF_GROWTH_RATIO}x). "
                    f"Excessive diff growth indicates runaway refactoring; aborted for safety."
                ),
                diagnostics=diagnostics,
                diff_growth_percentage=(growth_ratio - 1.0) * 100.0,
                status="FAILED_DIFF_GROWTH_LIMIT",
            )
            return rec, None

        # 5. Invalidate previous approval token since patch content changed
        reapproval_needed = (revised_patch_set.combined_diff != current_patch_set.combined_diff)
        if reapproval_needed:
            plan.approval_token = None
            plan.approved_by = None
            plan.approved_at = None

        rec = PatchRevisionRecord(
            plan_id=plan.plan_id,
            attempt_number=current_attempt,
            max_attempts=MAX_REVISION_ATTEMPTS,
            previous_patch_set_id=current_patch_set.patch_set_id,
            new_patch_set_id=revised_patch_set.patch_set_id,
            revision_reason=revision_reason,
            diagnostics=diagnostics,
            changes_summary=f"Revised {len(revised_patch_set.patches)} files for attempt #{current_attempt}",
            diff_growth_percentage=(growth_ratio - 1.0) * 100.0,
            reapproval_required=reapproval_needed,
            status="REVISED",
        )

        logger.info(f"Patch revision #{current_attempt} successfully created for plan {plan.plan_id}")
        return rec, revised_patch_set

