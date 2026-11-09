"""
Kavach Verification Agent
Executes isolated validation checks (AST parsing, syntax check, and scanner re-scan)
on proposed patches to prove zero residual flaws before human approval.
"""

import uuid
import logging
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.remediation import RemediationPatch, RemediationValidation
from app.services.validation_service import ValidationService

logger = logging.getLogger("kavach.agents.verification")


class VerificationAgent:
    """
    Autonomous Verification Agent.
    Applies the patch in an isolated sandbox, re-runs BuiltinScanner & AST verification,
    and enforces a strict zero-residual-vulnerability gate.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: User,
        patch_id: str,
    ) -> Dict[str, Any]:
        logger.info(f"VerificationAgent running isolated validation for patch {patch_id}")

        try:
            p_uuid = uuid.UUID(str(patch_id))
        except ValueError:
            raise ValueError(f"Invalid patch ID format: {patch_id}")

        patch = await db.get(RemediationPatch, p_uuid)
        if not patch:
            raise ValueError(f"Remediation patch '{patch_id}' not found")

        # Execute full validation battery via ValidationService
        val_service = ValidationService(db)
        passed = await val_service.run_validations(p_uuid)

        # Retrieve authentic validation records from DB
        v_stmt = select(RemediationValidation).where(RemediationValidation.patch_id == p_uuid)
        res = await db.execute(v_stmt)
        validations = res.scalars().all()

        checks_run = []
        violations = []
        for v in validations:
            check_item = {
                "type": v.validation_type,
                "status": v.status,
                "summary": v.result_summary,
                "tool": v.command_or_tool,
            }
            checks_run.append(check_item)
            if v.status == "FAILED" and v.failure_reason:
                violations.append(v.failure_reason)

        return {
            "status": "PASSED" if passed else "FAILED",
            "patch_id": str(patch.id),
            "passed": passed,
            "checks": checks_run,
            "violations": violations,
            "evidence": (
                "Deterministic verification passed: 0 syntax errors, 0 residual vulnerabilities, "
                "and clean AST re-scan execution."
                if passed else
                f"Verification failed: {'; '.join(violations) if violations else 'Security scanner detected violations'}"
            ),
        }

