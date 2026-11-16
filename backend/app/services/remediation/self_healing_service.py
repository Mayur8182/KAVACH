"""
Kavach Self-Healing Remediation Engine
Implements controlled, bounded retry loops for failed remediation patches.
Captures exact compiler, linter, and validation error output, requests an AI/deterministic
diagnosis, synthesizes a revised patch, and verifies it with runtime evidence.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from app.services.remediation.diff_applier import apply_unified_diff, PatchApplicationError
from app.services.remediation.validation_engine import ValidationOrchestrator, MultiLayerValidationReport

logger = logging.getLogger("kavach.remediation.self_healing")


@dataclass
class SelfHealingAttempt:
    attempt_number: int
    error_stage: str
    error_captured: str
    diagnosis: str
    revised_diff: str
    validation_passed: bool
    validation_summary: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SelfHealingService:
    """
    Manages self-healing retry cycles when an initial patch fails syntax or validation checks.
    """

    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.validation_orchestrator = ValidationOrchestrator()

    async def execute_self_healing_loop(
        self,
        gemini_service: Any,
        file_path: str,
        original_content: str,
        initial_failed_diff: str,
        initial_validation_report: MultiLayerValidationReport,
        finding_data: Dict[str, Any],
        language: str,
    ) -> Tuple[bool, str, str, List[SelfHealingAttempt]]:
        """
        Runs up to max_retries attempts to heal the patch until it passes all validation layers.
        Returns: (success: bool, final_diff: str, final_patched_content: str, history: List[SelfHealingAttempt])
        """
        attempts_history: List[SelfHealingAttempt] = []
        current_failed_diff = initial_failed_diff
        current_failure_reason = initial_validation_report.failure_reason or "Initial validation failed."
        current_failure_stage = initial_validation_report.failure_stage or "VALIDATION"

        for attempt in range(1, self.max_retries + 1):
            logger.info(f"Self-healing attempt {attempt}/{self.max_retries} for {file_path} (Stage: {current_failure_stage})")

            # 1. Ask Gemini / engine to diagnose and revise
            diagnosis, revised_diff = await self._diagnose_and_revise(
                gemini_service=gemini_service,
                file_path=file_path,
                original_content=original_content,
                failed_diff=current_failed_diff,
                failure_reason=current_failure_reason,
                failure_stage=current_failure_stage,
                finding_data=finding_data,
                language=language,
            )

            # 2. Attempt to apply the revised diff
            try:
                new_patched_content = apply_unified_diff(original_content, revised_diff)
            except PatchApplicationError as pe:
                attempts_history.append(
                    SelfHealingAttempt(
                        attempt_number=attempt,
                        error_stage="DIFF_APPLICATION",
                        error_captured=str(pe),
                        diagnosis=diagnosis,
                        revised_diff=revised_diff,
                        validation_passed=False,
                        validation_summary=f"Revised diff failed application: {str(pe)}",
                    )
                )
                current_failure_reason = f"Patch application failed: {str(pe)}"
                current_failure_stage = "DIFF_APPLICATION"
                current_failed_diff = revised_diff
                continue

            # 3. Re-run multi-layer validation
            val_report = self.validation_orchestrator.validate_patch(
                file_path=file_path,
                patched_content=new_patched_content,
                finding_data=finding_data,
                language=language,
            )

            attempt_record = SelfHealingAttempt(
                attempt_number=attempt,
                error_stage=current_failure_stage,
                error_captured=current_failure_reason,
                diagnosis=diagnosis,
                revised_diff=revised_diff,
                validation_passed=val_report.overall_passed,
                validation_summary=f"Validation {'PASSED' if val_report.overall_passed else 'FAILED'}: {val_report.failure_reason or 'All layers verified'}",
            )
            attempts_history.append(attempt_record)

            if val_report.overall_passed:
                logger.info(f"Self-healing SUCCEEDED on attempt {attempt} for {file_path}")
                return True, revised_diff, new_patched_content, attempts_history

            current_failed_diff = revised_diff
            current_failure_reason = val_report.failure_reason or "Validation checks failed."
            current_failure_stage = val_report.failure_stage or "VALIDATION"

        logger.warning(f"Self-healing exhausted {self.max_retries} attempts without passing validation for {file_path}")
        return False, current_failed_diff, "", attempts_history

    async def _diagnose_and_revise(
        self,
        gemini_service: Any,
        file_path: str,
        original_content: str,
        failed_diff: str,
        failure_reason: str,
        failure_stage: str,
        finding_data: Dict[str, Any],
        language: str,
    ) -> Tuple[str, str]:
        """
        Prompts Gemini (or falls back to grounded corrector) to fix the diagnosed error.
        """
        if gemini_service and hasattr(gemini_service, "diagnose_and_correct"):
            try:
                res = await gemini_service.diagnose_and_correct(
                    file_path=file_path,
                    original_content=original_content,
                    failed_diff=failed_diff,
                    failure_reason=failure_reason,
                    failure_stage=failure_stage,
                    finding_data=finding_data,
                )
                if res and res.get("revised_diff"):
                    return res.get("diagnosis", "Diagnosed and corrected patch"), res["revised_diff"]
            except Exception as e:
                logger.warning(f"Gemini self-healing prompt error: {e}")

        # Deterministic Grounded Correction
        diagnosis = f"Corrected syntax/boundary violation identified in {failure_stage}: {failure_reason}"
        revised_diff = self._synthesize_grounded_correction(file_path, original_content, failed_diff, finding_data)
        return diagnosis, revised_diff

    def _synthesize_grounded_correction(
        self,
        file_path: str,
        original_content: str,
        failed_diff: str,
        finding_data: Dict[str, Any],
    ) -> str:
        """
        Produces a clean, validated fallback diff adhering strictly to syntax and security rules.
        """
        from app.services.code_api_security_engine import code_api_security_engine

        lines = original_content.splitlines(keepends=True)
        cwe = str(finding_data.get("cwe") or "").upper()
        target_idx = max(0, min(len(lines) - 1, 10))

        if "639" in cwe or "BOLA" in str(finding_data.get("title", "")).upper():
            return code_api_security_engine._synthesize_bola_patch(file_path, lines, target_idx, {})
        elif "306" in cwe or "AUTH" in str(finding_data.get("title", "")).upper():
            return code_api_security_engine._synthesize_missing_auth_patch(file_path, lines, target_idx, {})
        elif "89" in cwe or "SQL" in str(finding_data.get("title", "")).upper():
            if file_path.endswith(".py"):
                return code_api_security_engine._synthesize_sqli_patch_py(file_path, lines, target_idx)
            return code_api_security_engine._synthesize_sqli_patch_js(file_path, lines, target_idx)
        else:
            return code_api_security_engine._synthesize_rate_limit_patch(file_path, lines, target_idx, {})

