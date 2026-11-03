"""
THING Remediation Engine — Real Rescan Verifier
Enforces Rule 18: "Remediation must produce: original file, changed file, diff, reason, validation test, rescan result. Mark fixed only after re-scanning passes."
"""

import os
import shutil
import tempfile
import logging
from typing import Dict, Any, Optional

from app.engines.scanner.semgrep import SemgrepScanner
from app.engines.scanner.gitleaks import GitleaksScanner

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
        Creates an isolated temporary directory, writes the patched content,
        and executes the real scanner against it.
        """
        sandbox_dir = tempfile.mkdtemp(prefix="thing_rescan_")
        target_file = os.path.join(sandbox_dir, os.path.basename(file_path))

        try:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(patched_content)

            remaining_findings = []
            scan_success = False

            if scanner_type.lower() == "gitleaks":
                scanner = GitleaksScanner()
                result = await scanner.scan(sandbox_dir)
                scan_success = result.get("success", False)
                remaining_findings = [
                    f for f in result.get("findings", [])
                    if rule_id.lower() in str(f.get("rule_id", "")).lower()
                ]
            else:
                # Default to Semgrep scanner
                scanner = SemgrepScanner()
                result = await scanner.scan(sandbox_dir)
                scan_success = result.get("success", False)
                remaining_findings = [
                    f for f in result.get("findings", [])
                    if rule_id.lower() in str(f.get("rule_id", "")).lower()
                ]

            is_verified = (len(remaining_findings) == 0) and scan_success

            return {
                "verified": is_verified,
                "status": "VERIFIED_SAFE" if is_verified else "RESCAN_FAILED",
                "scanner_executed": scanner_type,
                "scan_success": scan_success,
                "remaining_findings_count": len(remaining_findings),
                "remaining_findings": remaining_findings,
                "message": (
                    "Re-scan verified that the vulnerability has been completely eliminated."
                    if is_verified
                    else f"Re-scan detected {len(remaining_findings)} remaining vulnerability occurrence(s)."
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
