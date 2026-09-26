import hashlib
import json
from typing import List

from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget


class CheckovScanner(SecurityScanner):
    """
    Infrastructure as Code (IaC) scanner executing real Checkov CLI.
    Audits Terraform templates, Kubernetes manifests, and Docker configurations.
    """
    scanner_name = "checkov"
    scanner_type = "IAC"
    tool_name = "Checkov"
    executable_name = "checkov"

    def build_command(self, target: ScanTarget) -> List[str]:
        return [
            self.executable_name,
            "-d",
            target.path,
            "-o",
            "json",
            "--quiet",
            "--compact",
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # Checkov exits with 0 on pass or 1 when failed checks exist
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

        # Checkov output can be a single dict or a list of dicts (multi-framework scan)
        check_reports = data if isinstance(data, list) else [data]
        findings: List[NormalizedFindingCandidate] = []

        for report in check_reports:
            results = report.get("results", {})
            failed_checks = results.get("failed_checks", [])

            for check in failed_checks:
                check_id = check.get("check_id", "CKV_GENERIC")
                check_name = check.get("check_name", "IaC Security Policy Violation")
                file_path = check.get("file_path")
                line_range = check.get("file_line_range", [])
                line_number = line_range[0] if line_range else None
                guideline = check.get("guideline") or check_name

                raw_sev = str(check.get("severity", "MEDIUM") or "MEDIUM").upper()
                if raw_sev in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
                    severity = raw_sev
                else:
                    severity = "HIGH" if "ADMIN" in check_id or "ROOT" in check_id else "MEDIUM"

                fp_raw = f"checkov:{check_id}:{file_path}:{line_range}"
                fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

                findings.append(
                    NormalizedFindingCandidate(
                        rule_id=check_id,
                        title=f"IaC Violation: {check_name}",
                        description=f"{check_name} ({check_id}) in {file_path}. Guideline: {guideline}",
                        severity=severity,
                        file_path=file_path,
                        line_number=line_number,
                        snippet=check.get("code_block", [[None, ""]])[0][1] if check.get("code_block") else None,
                        fingerprint=fingerprint,
                        raw_metadata={
                            "check_type": report.get("check_type"),
                            "resource": check.get("resource"),
                            "guideline": guideline,
                            "engine": "checkov",
                        },
                    )
                )

        return findings
