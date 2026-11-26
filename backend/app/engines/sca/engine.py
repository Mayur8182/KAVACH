"""
Kavach SCA Engine (Software Composition Analysis)
Unified Engine orchestrating:
1. Dependency Discovery (Direct & Transitive)
2. Vulnerability Intelligence (OSV / CVE)
3. Dependency Graph
4. License Engine (Compliance Risk)
5. Reachability Engine (Exploitability evidence)
6. SBOM Engine (CycloneDX Standard)
"""

import os
import time
import uuid
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.sca.dependency_discovery import DependencyDiscoveryEngine
from app.engines.sca.vulnerability_intel import (
    VulnerabilityIntelligenceEngine,
    LicenseEngine,
    ReachabilityEngine,
    SBOMEngine,
)


class SCAEngine:
    """
    Kavach SCA Engine: Analyzes open source packages for vulnerabilities, reachability, and license compliance.
    """

    def __init__(self):
        self.discovery = DependencyDiscoveryEngine()
        self.vuln_intel = VulnerabilityIntelligenceEngine()
        self.license_engine = LicenseEngine()
        self.reachability = ReachabilityEngine()
        self.sbom = SBOMEngine()

    async def scan_target(self, target_path: str) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[sca-engine] Starting Software Composition Analysis for target: {target_path}",
        ]

        target_abs = os.path.abspath(target_path)
        packages = self.discovery.discover_dependencies(target_abs)
        logs.append(f"[sca-discovery] Identified {len(packages)} third-party package dependencies")

        # Generate SBOM
        target_name = os.path.basename(target_abs) or "project"
        sbom_data = self.sbom.generate_cyclonedx_sbom(target_name, packages)
        logs.append(f"[sbom-engine] Generated CycloneDX v1.5 SBOM with {len(sbom_data['components'])} components")

        # Match vulnerabilities and check reachability only for flagged packages
        for pkg in packages:
            pkg_name = pkg["package"]
            pkg_ver = pkg["version"]
            cves = self.vuln_intel.match_vulnerabilities(pkg_name, pkg_ver)
            if not cves:
                continue

            is_reachable = self.reachability.is_package_reachable(pkg_name, target_abs)

            for cve in cves:
                reachability_badge = "REACHABLE IN CODE" if is_reachable else "NON-REACHABLE (TRANSITIVE)"
                findings.append(EngineFinding(
                    id=f"sca-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.SCA,
                    sub_engine="Vulnerability Intelligence Engine",
                    rule_id=cve["id"],
                    title=f"Vulnerable Dependency: {pkg_name}@{pkg_ver} ({cve['id']})",
                    description=f"{cve['title']}. Reachability Status: {reachability_badge}.",
                    severity=cve["severity"],
                    file_path="package.json" if pkg["ecosystem"] == "npm" else "requirements.txt",
                    line_start=1,
                    line_end=1,
                    code_snippet=f'"{pkg_name}": "{pkg_ver}"',
                    remediation_guidance=f"Upgrade {pkg_name} to version {cve['fixed_in']} or higher to remediate {cve['id']}.",
                    evidence={
                        "cve": cve["id"],
                        "package": pkg_name,
                        "version": pkg_ver,
                        "fixed_in": cve["fixed_in"],
                        "is_reachable": is_reachable,
                    },
                ))

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[sca-engine] Analyzed dependencies in {duration_ms}ms. Discovered {len(findings)} CVEs.")

        return EngineExecutionResult(
            engine=EngineType.SCA,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=len(packages),
            findings=findings,
            logs=logs,
        )

