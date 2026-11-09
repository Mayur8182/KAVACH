import hashlib
import json
from typing import List

from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget


class TrivyScanner(SecurityScanner):
    """
    Container and Filesystem scanner executing real Trivy CLI.
    Inspects Dockerfiles, container layers, base images, and system packages for CVEs and misconfigurations.
    """
    scanner_name = "trivy"
    scanner_type = "CONTAINER"
    tool_name = "Trivy"
    executable_name = "trivy"

    def build_command(self, target: ScanTarget) -> List[str]:
        if target.target_type == "CONTAINER_IMAGE":
            if not target.image_reference:
                raise ValueError("Scan target specified CONTAINER_IMAGE but no image_reference provided")
            return [
                self.executable_name,
                "image",
                "--skip-db-update",
                "--format",
                "json",
                "--quiet",
                target.image_reference,
            ]
        # Default: filesystem / Dockerfile configuration scan
        return [
            self.executable_name,
            "fs",
            "--skip-db-update",
            "--format",
            "json",
            "--quiet",
            target.path,
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # Trivy exits with 0 or 1
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

        results = data.get("Results", [])
        findings: List[NormalizedFindingCandidate] = []

        for item in results:
            target_file = item.get("Target", target.path)
            tf_lower = str(target_file).lower()
            is_container = (
                target.target_type == "CONTAINER_IMAGE"
                or tf_lower.endswith(("dockerfile", ".dockerfile", "containerfile"))
                or "docker" in tf_lower
            )
            vuln_cat = "CONTAINER" if is_container else "DEPENDENCIES"
            vuln_prefix = "Container CVE: " if is_container else "Dependency CVE: "

            # 1. Vulnerabilities
            for vuln in item.get("Vulnerabilities", []):
                vuln_id = vuln.get("VulnerabilityID", "UNKNOWN-CVE")
                pkg_name = vuln.get("PkgName", "unknown-package")
                installed_ver = vuln.get("InstalledVersion", "")
                title = vuln.get("Title") or f"Vulnerability {vuln_id} in {pkg_name}"
                desc = vuln.get("Description") or title

                raw_sev = str(vuln.get("Severity", "HIGH")).upper()
                if raw_sev in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
                    severity = raw_sev
                else:
                    severity = "INFORMATIONAL"

                fp_raw = f"trivy:vuln:{vuln_id}:{pkg_name}:{installed_ver}:{target_file}"
                fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

                findings.append(
                    NormalizedFindingCandidate(
                        rule_id=vuln_id,
                        title=f"{vuln_prefix}{title}",
                        description=f"{desc} (Package {pkg_name} version {installed_ver} in {target_file})",
                        severity=severity,
                        file_path=target_file,
                        line_number=None,
                        snippet=f"{pkg_name} {installed_ver}",
                        fingerprint=fingerprint,
                        category=vuln_cat,
                        raw_metadata={
                            "package": pkg_name,
                            "installed_version": installed_ver,
                            "primary_url": vuln.get("PrimaryURL"),
                            "engine": "trivy",
                        },
                    )
                )

            # 2. Misconfigurations (e.g. running as root in Dockerfile)
            for misconf in item.get("Misconfigurations", []):
                check_id = misconf.get("ID", "TRIVY-MISCONF")
                title = misconf.get("Title", "Container Misconfiguration")
                desc = misconf.get("Description", "")
                msg = misconf.get("Message", "")
                full_desc = f"{title}. {desc} {msg}".strip()

                raw_sev = str(misconf.get("Severity", "HIGH")).upper()
                if raw_sev in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}:
                    severity = raw_sev
                else:
                    severity = "MEDIUM"

                fp_raw = f"trivy:misconf:{check_id}:{target_file}"
                fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

                findings.append(
                    NormalizedFindingCandidate(
                        rule_id=check_id,
                        title=f"Container Misconfiguration: {title}" if is_container else f"IaC Misconfiguration: {title}",
                        description=full_desc,
                        severity=severity,
                        file_path=target_file,
                        line_number=None,
                        snippet=misconf.get("Resolution"),
                        fingerprint=fingerprint,
                        category="CONTAINER" if is_container else "IAC",
                        raw_metadata={
                            "resolution": misconf.get("Resolution"),
                            "type": misconf.get("Type"),
                            "engine": "trivy",
                        },
                    )
                )

        return findings
