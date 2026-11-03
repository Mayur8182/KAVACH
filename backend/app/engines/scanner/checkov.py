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
            "--skip-path",
            "node_modules",
            "--skip-path",
            "scratch",
            "--skip-path",
            ".venv",
            "--skip-path",
            "venv",
            "--skip-path",
            ".git",
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

                # Derive provider
                resource_str = str(check.get("resource") or "").lower()
                check_id_upper = str(check_id).upper()
                file_lower = str(file_path or "").lower()

                if resource_str.startswith("aws_") or "_AWS_" in check_id_upper or "aws" in file_lower:
                    provider = "AWS"
                elif resource_str.startswith(("azurerm_", "azure_")) or "_AZURE_" in check_id_upper or "azure" in file_lower:
                    provider = "Azure"
                elif resource_str.startswith(("google_", "gcp_")) or "_GCP_" in check_id_upper or "gcp" in file_lower:
                    provider = "GCP"
                elif (
                    resource_str.startswith(("kubernetes_", "k8s_"))
                    or "_K8S_" in check_id_upper
                    or "k8s" in file_lower
                    or report.get("check_type") in ["kubernetes", "helm"]
                ):
                    provider = "Kubernetes"
                else:
                    provider = "AWS"

                # Derive framework
                check_type_lower = str(report.get("check_type") or "").lower()
                if "helm" in check_type_lower or "helm" in file_lower or "chart.yaml" in file_lower:
                    framework = "Helm"
                elif "terraform" in check_type_lower or file_lower.endswith(".tf"):
                    framework = "Terraform"
                elif "cloudformation" in check_type_lower or "cfn" in file_lower:
                    framework = "CloudFormation"
                elif "kubernetes" in check_type_lower or file_lower.endswith((".yaml", ".yml")):
                    framework = "Kubernetes"
                else:
                    framework = "Terraform"

                findings.append(
                    NormalizedFindingCandidate(
                        rule_id=check_id,
                        title=check_name,
                        description=guideline if guideline != check_name else f"{check_name} in {file_path}",
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
                            "provider": provider,
                            "framework": framework,
                            "status": "OPEN",
                        },
                    )
                )

        return findings
