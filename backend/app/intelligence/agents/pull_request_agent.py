"""
Kavach Pull Request Agent
Creates authentic GitHub Pull Requests with verified security remediation patches.
Enforces cryptographic human approval gating before any branch mutation or PR creation.
"""

import uuid
import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.remediation import RemediationPatch
from app.models.scan import SecurityFinding
from app.services.finding_service import FindingService
from app.intelligence.execution.approval_guard import ApprovalGuard

logger = logging.getLogger("kavach.agents.pull_request")


class PullRequestAgent:
    """
    Autonomous Pull Request Agent.
    Creates real pull requests only after verifying cryptographic human-in-the-loop approval.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: User,
        plan_id: str,
        step_id: str,
        finding_id: str,
        patch_id: str,
        approval_token: str,
        repository: Optional[str] = None,
        branch: Optional[str] = "main",
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info(f"PullRequestAgent executing for finding {finding_id}, patch {patch_id}")

        # 1. Deterministic Approval Verification
        target_resource = f"finding:{finding_id}:patch:{patch_id}"
        is_valid, err_reason = ApprovalGuard.verify_approval_token(
            token=approval_token,
            expected_plan_id=plan_id,
            expected_step_id=step_id,
            expected_target_resource=target_resource,
            expected_action="pull_request.create",
        )

        if not is_valid:
            logger.error(f"Approval verification failed for PR creation: {err_reason}")
            raise PermissionError(f"Human approval verification failed: {err_reason}")

        # Redeem token to prevent replay
        ApprovalGuard.redeem_token(approval_token)

        # 2. Check patch and finding exist
        try:
            p_uuid = uuid.UUID(str(patch_id))
            patch = await db.get(RemediationPatch, p_uuid)
            if not patch:
                raise ValueError(f"Remediation patch '{patch_id}' not found")
        except ValueError:
            raise ValueError(f"Invalid patch ID format: {patch_id}")

        # 3. Create real PR via FindingService
        finding_svc = FindingService(db)
        pr_title = title or f"fix(security): Remediate vulnerability in {patch.affected_files[0] if patch.affected_files else 'source'}"

        try:
            pr_res = await finding_svc.create_pr(
                finding_id=finding_id,
                suggestion_id=None,
                title=pr_title,
                branch=branch,
                current_user=current_user,
                repository=repository,
            )

            # Update patch status
            patch.status = "APPLIED" if pr_res.success else "FAILED"
            await db.commit()

            return {
                "status": "OPEN" if pr_res.success else "FAILED",
                "success": pr_res.success,
                "pr_number": pr_res.pr_number,
                "pr_url": pr_res.pr_url,
                "branch": branch or "main",
                "repository": repository or "connected-repo",
                "finding_id": finding_id,
                "patch_id": patch_id,
                "title": pr_title,
                "message": getattr(pr_res, "message", None) or "",
                "approved_by": current_user.email,
            }
        except Exception as e:
            logger.error(f"PullRequestAgent failed to open PR: {e}")
            raise RuntimeError(f"Failed to create pull request on repository: {str(e)}")
