import hashlib
import json
import os
from typing import List

from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget


class OsvScanner(SecurityScanner):
    """
    Software Composition Analysis (SCA) scanner executing real OSV-Scanner CLI.
    Identifies known CVEs and GHSA vulnerabilities across Python, Node, and container dependencies.
    """
    scanner_name = "osv-scanner"
    scanner_type = "SCA"
    tool_name = "OSV-Scanner"
    executable_name = "osv-scanner"

    def build_command(self, target: ScanTarget) -> List[str]:
        target_dir = target.path if os.path.isdir(target.path) else os.path.dirname(target.path)
        lockfile_names = [
            "package-lock.json",
            "yarn.lock",
            "pnpm-lock.yaml",
            "requirements.txt",
            "Pipfile.lock",
            "poetry.lock",
            "go.mod",
            "Cargo.lock",
        ]
        found_lockfiles = []
        if os.path.isdir(target_dir):
            for lf in lockfile_names:
                cand = os.path.join(target_dir, lf)
                if os.path.isfile(cand):
                    found_lockfiles.append(cand)

        if found_lockfiles:
            cmd = [self.executable_name, "scan", "source", "--format", "json"]
            for lf in found_lockfiles:
                cmd.extend(["-L", lf])
            return cmd

        return [
            self.executable_name,
            "scan",
            "source",
            "--format",
            "json",
            "--allow-no-lockfiles",
            "-r",
            target.path,
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # OSV-Scanner exits with 0 (no vulns) or 1 (vulnerabilities found)
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

        for res in results:
            source_path = res.get("source", {}).get("path")
            for pkg in res.get("packages", []):
                pkg_info = pkg.get("package", {})
                pkg_name = pkg_info.get("name", "unknown-package")
                pkg_ver = pkg_info.get("version", "unknown-version")

                for vuln in pkg.get("vulnerabilities", []):
                    vuln_id = vuln.get("id", "UNKNOWN-CVE")
                    summary = vuln.get("summary") or vuln.get("details") or f"Vulnerability in {pkg_name}"

                    # Determine severity from database_specific or ecosystem_specific
                    raw_sev = (
                        vuln.get("database_specific", {}).get("severity")
                        or vuln.get("ecosystem_specific", {}).get("severity")
                        or "HIGH"
                    )
                    sev_upper = str(raw_sev).upper()
                    if "CRITICAL" in sev_upper:
                        severity = "CRITICAL"
                    elif "HIGH" in sev_upper:
                        severity = "HIGH"
                    elif "MEDIUM" in sev_upper or "MODERATE" in sev_upper:
                        severity = "MEDIUM"
                    elif "LOW" in sev_upper:
                        severity = "LOW"
                    else:
                        severity = "HIGH"

                    fp_raw = f"osv:{vuln_id}:{pkg_name}:{pkg_ver}:{source_path}"
                    fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

                    findings.append(
                        NormalizedFindingCandidate(
                            rule_id=vuln_id,
                            title=f"Vulnerable Dependency: {pkg_name}@{pkg_ver} ({vuln_id})",
                            description=f"{summary} (Affects package {pkg_name} installed version {pkg_ver} via {source_path})",
                            severity=severity,
                            file_path=source_path,
                            line_number=None,
                            snippet=f"{pkg_name} == {pkg_ver}",
                            fingerprint=fingerprint,
                            raw_metadata={
                                "package": pkg_name,
                                "installed_version": pkg_ver,
                                "aliases": vuln.get("aliases", []),
                                "references": vuln.get("references", []),
                                "engine": "osv-scanner",
                            },
                        )
                    )

        return findings
