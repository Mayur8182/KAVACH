import hashlib
import json
from typing import List

from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget


class SemgrepScanner(SecurityScanner):
    """
    SAST scanner executing real Semgrep CLI.
    Inspects source code for injection, insecure APIs, and vulnerability patterns.
    """
    scanner_name = "semgrep"
    scanner_type = "SAST"
    tool_name = "Semgrep"
    executable_name = "semgrep"

    def build_command(self, target: ScanTarget) -> List[str]:
        return [
            self.executable_name,
            "scan",
            "--json",
            "--config=auto",
            "--metrics=off",
            "--disable-version-check",
            "--exclude=node_modules",
            "--exclude=.venv",
            "--exclude=venv",
            "--exclude=.git",
            target.path,
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # Semgrep exits with 0 on no findings or with findings, 1 on finding in certain modes, 2 on blocking
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
            return []

        results = data.get("results", [])
        findings: List[NormalizedFindingCandidate] = []

        for item in results:
            check_id = item.get("check_id", "semgrep-rule")
            path = item.get("path")
            start = item.get("start", {})
            line = start.get("line")
            col = start.get("col")
            extra = item.get("extra", {})
            message = extra.get("message", "Semgrep security finding")
            lines_snippet = extra.get("lines")

            raw_sev = str(extra.get("severity", "WARNING")).upper()
            if raw_sev in {"ERROR", "CRITICAL"}:
                severity = "HIGH"
            elif raw_sev in {"WARNING"}:
                severity = "MEDIUM"
            elif raw_sev in {"INFO"}:
                severity = "LOW"
            else:
                severity = "INFORMATIONAL"

            fp_raw = f"semgrep:{check_id}:{path}:{line}"
            fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

            findings.append(
                NormalizedFindingCandidate(
                    rule_id=check_id,
                    title=f"SAST: {check_id}",
                    description=message,
                    severity=severity,
                    file_path=path,
                    line_number=line,
                    column_number=col,
                    snippet=lines_snippet[:500] if lines_snippet else None,
                    fingerprint=fingerprint,
                    raw_metadata={
                        "metadata": extra.get("metadata", {}),
                        "engine": "semgrep",
                    },
                )
            )

        return findings
