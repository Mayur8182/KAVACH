import hashlib
import json
import os
from typing import List

from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget


def mask_secret(secret_val: str) -> str:
    """Masks secret values to prevent cleartext exposure in databases and audit logs."""
    if not secret_val:
        return "[REDACTED]"
    if len(secret_val) <= 6:
        return "****"
    return f"{secret_val[:3]}...****...{secret_val[-2:]}"


class GitleaksScanner(SecurityScanner):
    """
    Secret detection scanner executing real Gitleaks CLI.
    Identifies hardcoded API tokens, credentials, private keys, and passwords.
    Strictly prevents persisting unmasked secret values in plaintext.
    """
    scanner_name = "gitleaks"
    scanner_type = "SECRETS"
    tool_name = "Gitleaks"
    executable_name = "gitleaks"

    def build_command(self, target: ScanTarget) -> List[str]:
        # Gitleaks detect with output printed to stdout in JSON format
        return [
            self.executable_name,
            "detect",
            "--no-git",
            "--source",
            target.path,
            "--report-format",
            "json",
            "--report-path",
            "/dev/stdout" if os.name != "nt" else "-",
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # Gitleaks exits with 0 (no leaks found) or 1 (leaks found)
        return [0, 1]

    async def normalize(
        self,
        raw_stdout: str,
        raw_stderr: str,
        exit_code: int,
        target: ScanTarget,
    ) -> List[NormalizedFindingCandidate]:
        if not raw_stdout or not raw_stdout.strip():
            return []

        try:
            data = json.loads(raw_stdout)
        except Exception:
            # Gitleaks may write report to stdout or stderr depending on OS
            try:
                data = json.loads(raw_stderr)
            except Exception:
                return []

        if not isinstance(data, list):
            return []

        findings: List[NormalizedFindingCandidate] = []

        for item in data:
            rule_id = item.get("RuleID", "generic-secret")
            desc = item.get("Description", "Detected plaintext secret")
            file_path = item.get("File")
            line = item.get("StartLine")
            raw_secret = item.get("Secret", "")

            # Security rule: Never store raw plaintext secrets!
            masked = mask_secret(raw_secret)
            secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()[:16]

            fp_raw = f"gitleaks:{rule_id}:{file_path}:{line}:{secret_hash}"
            fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

            findings.append(
                NormalizedFindingCandidate(
                    rule_id=f"gitleaks:{rule_id}",
                    title=f"Secret Exposed: {desc}",
                    description=f"{desc} identified in {file_path}:{line}. Exposed secret values violate core credentials security boundaries.",
                    severity="CRITICAL",
                    file_path=file_path,
                    line_number=line,
                    column_number=item.get("StartColumn"),
                    snippet=f"Detected Token: {masked}",
                    fingerprint=fingerprint,
                    raw_metadata={
                        "rule_id": rule_id,
                        "commit": item.get("Commit"),
                        "entropy": item.get("Entropy"),
                        "secret_hash_prefix": secret_hash,
                        "engine": "gitleaks",
                    },
                )
            )

        return findings


import os
os_name = os.name
