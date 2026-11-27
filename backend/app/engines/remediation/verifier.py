"""
THING Remediation Engine — Real Rescan Verifier
Enforces Rule 18: "Remediation must produce: original file, changed file, diff, reason, validation test, rescan result. Mark fixed only after re-scanning passes."
"""

import logging
import os
import shutil
import tempfile
from typing import Any, Dict, List

from app.engines.remediation.validator import PatchValidator
from app.engines.scanner.engine import verification_engine
from app.engines.scanner.models import ScanTarget

logger = logging.getLogger("thing.remediation.verifier")


class PatchVerifier:
    """Verifies that applying a proposed patch actually removes the finding under real re-scan."""

    @classmethod
    async def verify_patch_in_sandbox(
        cls,
        file_path: str,
        original_content: str,
        patched_content: str,
        rule_id: str,
        scanner_type: str = "semgrep",
    ) -> Dict[str, Any]:
        """
        Creates an isolated temporary directory, runs syntax checks + real security scanners
        via VerificationEngine on the patched file, and returns honest verification proof.
        """
        syntax_ok, syntax_msg = PatchValidator.validate_syntax_for_file(file_path, patched_content)
        if not syntax_ok:
            return {
                "verified": False,
                "status": "SYNTAX_ERROR",
                "scanner_executed": "syntax",
                "syntax_valid": False,
                "syntax_message": syntax_msg,
                "remaining_findings_count": 0,
                "remaining_findings": [],
                "message": f"Patched code failed syntax verification: {syntax_msg}",
            }

        sandbox_dir = tempfile.mkdtemp(prefix="kavach_rescan_")
        rel_clean = (file_path or "code.py").lstrip("/").replace("\\", "/")
        target_file = os.path.abspath(os.path.join(sandbox_dir, rel_clean))
        if not target_file.startswith(os.path.abspath(sandbox_dir)):
            target_file = os.path.join(sandbox_dir, os.path.basename(rel_clean))
        os.makedirs(os.path.dirname(target_file), exist_ok=True)

        try:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(patched_content)

            req_scanner = (scanner_type or "semgrep").strip().lower()
            selected_scanners: List[str] = ["seculayer-builtin"]
            if req_scanner and req_scanner not in selected_scanners:
                selected_scanners.insert(0, req_scanner)

            scan_res = await verification_engine.execute_scan(
                ScanTarget(
                    path=target_file,
                    target_type="file",
                    metadata={"relative_path": rel_clean},
                ),
                selected_scanners=selected_scanners,
            )

            completed_scanners = [
                ex.scanner_name for ex in scan_res.executions if ex.status == "COMPLETED"
            ]
            failed_scanners = [
                {"scanner": ex.scanner_name, "status": ex.status, "error": ex.error_message}
                for ex in scan_res.executions
                if ex.status != "COMPLETED"
            ]

            if not completed_scanners:
                return {
                    "verified": False,
                    "status": "SCAN_FAILED",
                    "scanner_executed": ", ".join(selected_scanners),
                    "syntax_valid": True,
                    "syntax_message": syntax_msg,
                    "completed_scanners": [],
                    "unavailable_or_failed_scanners": failed_scanners,
                    "remaining_findings_count": 0,
                    "remaining_findings": [],
                    "message": "No security scanner completed successfully on the patched file.",
                }

            norm_rule = (rule_id or "").strip().lower()
            remaining_all = list(scan_res.findings or [])
            remaining_matching = []
            for f in remaining_all:
                f_rule = (f.rule_id or "").lower()
                f_title = (f.title or "").lower()
                if not norm_rule or norm_rule == "security_rule" or norm_rule in f_rule or f_rule in norm_rule or norm_rule in f_title:
                    remaining_matching.append(
                        {
                            "rule_id": f.rule_id,
                            "title": f.title,
                            "severity": f.severity,
                            "file_path": f.file_path,
                            "line_number": f.line_number,
                            "snippet": f.snippet,
                        }
                    )

            is_verified = len(remaining_matching) == 0
            return {
                "verified": is_verified,
                "status": "VERIFIED_SAFE" if is_verified else "RESCAN_FAILED",
                "scanner_executed": ", ".join(completed_scanners),
                "completed_scanners": completed_scanners,
                "unavailable_or_failed_scanners": failed_scanners,
                "syntax_valid": True,
                "syntax_message": syntax_msg,
                "scan_success": True,
                "total_findings_in_file": len(remaining_all),
                "remaining_findings_count": len(remaining_matching),
                "remaining_findings": remaining_matching,
                "message": (
                    f"Re-scan across {', '.join(completed_scanners)} verified that '{rule_id}' is resolved (syntax valid)."
                    if is_verified
                    else f"Re-scan detected {len(remaining_matching)} remaining occurrence(s) matching '{rule_id}'."
                ),
            }

        except Exception as exc:
            logger.error(f"Rescan verification error: {exc}", exc_info=True)
            return {
                "verified": False,
                "status": "VERIFICATION_ERROR",
                "scanner_executed": scanner_type,
                "error": str(exc),
                "message": f"Verification failed during scanner execution: {str(exc)}",
            }
        finally:
            shutil.rmtree(sandbox_dir, ignore_errors=True)
