"""
Kavach Model Security — Master Model Security Scanner (Advanced Deep Engine)
Coordinates:
1. Artifact Security Analyzer (16 deep checks, bytecode disassembly)
2. Configuration Security Analyzer (architectural flags, secrets, CORS, auth)
3. Provenance & Metadata Analyzer (signatures, publishers, revisions)
4. ML Supply Chain Analyzer (CVEs, typosquatting, dependency confusion)
5. Threat & Poisoning Analyzer (unverified base models, PII leakage, unencrypted logging)
Calculates deterministic risk scores and generates tamper-evident finding records.
"""

import hashlib
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from app.services.model_security.analyzers.artifact_analyzer import ArtifactSecurityAnalyzer
from app.services.model_security.analyzers.config_analyzer import ConfigurationSecurityAnalyzer
from app.services.model_security.analyzers.provenance_analyzer import ModelProvenanceAnalyzer
from app.services.model_security.analyzers.supply_chain_analyzer import MLSupplyChainAnalyzer
from app.services.model_security.analyzers.threat_analyzer import ThreatAnalyzer

logger = logging.getLogger("kavach.model_security.scanner")

SEVERITY_SCORES = {
    "CRITICAL": 9.5,
    "HIGH": 7.5,
    "MEDIUM": 5.0,
    "LOW": 2.5,
    "INFO": 0.5,
}

SEVERITY_PENALTIES = {
    "CRITICAL": 35,
    "HIGH": 20,
    "MEDIUM": 10,
    "LOW": 5,
    "INFO": 0,
}


class ModelSecurityScanner:
    """
    Master Scanning Orchestrator executing deep security analyzers against model assets.
    """

    def __init__(self):
        self.artifact_analyzer = ArtifactSecurityAnalyzer()
        self.config_analyzer = ConfigurationSecurityAnalyzer()
        self.provenance_analyzer = ModelProvenanceAnalyzer()
        self.supply_chain_analyzer = MLSupplyChainAnalyzer()
        self.threat_analyzer = ThreatAnalyzer()

    def run_scan(
        self,
        model_id_str: str,
        model_metadata: Dict[str, Any],
        artifacts: List[Dict[str, Any]],
        file_contents: Optional[Dict[str, bytes]] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete scanner suite against model artifacts.
        """
        start = time.monotonic()
        findings: List[Dict[str, Any]] = []
        checks_executed = 0
        file_contents = file_contents or {}

        # 1. Artifact Security Checks
        for art in artifacts:
            path = art.get("path", "")
            data = file_contents.get(path)
            abs_path = art.get("absolute_path") or path
            expected_hash = art.get("sha256")
            art_findings = self.artifact_analyzer.analyze_file(abs_path, file_bytes=data, expected_sha256=expected_hash)
            findings.extend(art_findings)
            checks_executed += 1

        # 2. Configuration Security Checks & Threat Modeling
        config_data = {}
        for art in artifacts:
            path = art.get("path", "")
            lower_p = path.lower()
            if lower_p.endswith((".json", ".yaml", ".yml", ".toml")):
                content_str = None
                if path in file_contents:
                    content_str = file_contents[path].decode("utf-8", errors="ignore")
                abs_path = art.get("absolute_path") or path
                cfg_findings = self.config_analyzer.analyze_config(abs_path, content=content_str)
                findings.extend(cfg_findings)
                checks_executed += 1

                # Parse JSON if config.json for threat analysis
                if lower_p.endswith("config.json") and content_str:
                    try:
                        config_data = json.loads(content_str)
                    except Exception:
                        pass

                # Privacy & PII scanning in configs/prompts
                if content_str:
                    pii_findings = self.threat_analyzer.analyze_privacy_and_leakage(
                        content_str,
                        file_path=abs_path,
                        serving_config=config_data if "serving" in lower_p else None,
                    )
                    findings.extend(pii_findings)
                    checks_executed += 1

        # 3. Supply Chain Dependency Checks
        for art in artifacts:
            path = art.get("path", "")
            lower_p = path.lower()
            if "requirements" in lower_p or "environment" in lower_p or lower_p.endswith("pyproject.toml"):
                content_str = None
                if path in file_contents:
                    content_str = file_contents[path].decode("utf-8", errors="ignore")
                abs_path = art.get("absolute_path") or path
                dep_findings = self.supply_chain_analyzer.analyze_dependencies(abs_path, content=content_str)
                findings.extend(dep_findings)
                checks_executed += 1

        # 4. Provenance & Integrity Checks
        prov_findings = self.provenance_analyzer.analyze_provenance(model_metadata, artifacts)
        findings.extend(prov_findings)
        checks_executed += 1

        # 5. Model Poisoning & Lineage Risks
        poison_findings = self.threat_analyzer.analyze_poisoning_risks(model_metadata, config_data)
        findings.extend(poison_findings)
        checks_executed += 1

        # Deduplicate and enrich findings with unique fingerprints & scores
        deduped_findings: List[Dict[str, Any]] = []
        seen_fingerprints = set()

        total_penalty = 0
        for f in findings:
            rule_id = f.get("rule_id", "KAVACH-UNKNOWN")
            affected = f.get("affected_file") or "model"
            fp = hashlib.sha256(f"{model_id_str}:{rule_id}:{affected}".encode("utf-8")).hexdigest()

            if fp in seen_fingerprints:
                continue
            seen_fingerprints.add(fp)

            sev = f.get("severity", "MEDIUM").upper()
            risk_score = f.get("risk_score") or SEVERITY_SCORES.get(sev, 5.0)
            penalty = SEVERITY_PENALTIES.get(sev, 10)
            total_penalty += penalty

            f["fingerprint"] = fp
            f["risk_score"] = risk_score
            f["confidence"] = f.get("confidence", "HIGH")
            f["model_id_str"] = model_id_str
            deduped_findings.append(f)

        # Calculate security score (0-100)
        security_score = max(0, 100 - total_penalty)

        # Derive overall risk level
        severities = [f.get("severity") for f in deduped_findings]
        if "CRITICAL" in severities:
            risk_level = "CRITICAL"
        elif "HIGH" in severities:
            risk_level = "HIGH"
        elif "MEDIUM" in severities:
            risk_level = "MEDIUM"
        elif "LOW" in severities:
            risk_level = "LOW"
        else:
            risk_level = "SAFE"

        duration_ms = int((time.monotonic() - start) * 1000)

        summary = {
            "total_findings": len(deduped_findings),
            "critical": severities.count("CRITICAL"),
            "high": severities.count("HIGH"),
            "medium": severities.count("MEDIUM"),
            "low": severities.count("LOW"),
            "checks_executed": checks_executed,
            "artifacts_scanned": len(artifacts),
        }

        return {
            "findings": deduped_findings,
            "security_score": security_score,
            "risk_level": risk_level,
            "checks_executed": checks_executed,
            "duration_ms": duration_ms,
            "summary": summary,
        }
