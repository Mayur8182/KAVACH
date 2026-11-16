"""
Kavach Model Security — Root Cause & Blast Radius Intelligence Engine
Correlates findings across artifacts, configs, dependencies, and endpoints to:
1. Identify primary root cause incidents.
2. Estimate blast radius across downstream applications, pipelines, and agents.
3. Compute multi-factor risk prioritization score (0.0 to 100.0).
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("kavach.model_security.root_cause")


class RootCauseEngine:
    """
    Groups individual model findings into actionable root causes
    and estimates organizational blast radius.
    """

    def analyze_model_findings(
        self,
        model_name: str,
        findings: List[Dict[str, Any]],
        environment: str = "production",
        is_public: bool = False,
    ) -> Dict[str, Any]:
        """
        Synthesizes findings into unified incident root causes,
        computes blast radius, and generates overall model security posture score.
        """
        if not findings:
            return {
                "model_name": model_name,
                "overall_risk_score": 0.0,
                "risk_tier": "LOW",
                "root_causes": [],
                "blast_radius": {
                    "impacted_services": [],
                    "exposure_level": "ISOLATED",
                    "data_sensitivity_impact": "NONE",
                },
            }

        # 1. Cluster findings into Root Causes
        root_causes = self._cluster_root_causes(findings)

        # 2. Compute Blast Radius
        blast_radius = self._estimate_blast_radius(model_name, findings, environment, is_public)

        # 3. Calculate Multi-Factor Risk Score
        risk_score, risk_tier = self._calculate_risk_score(findings, environment, is_public)

        return {
            "model_name": model_name,
            "overall_risk_score": risk_score,
            "risk_tier": risk_tier,
            "total_findings": len(findings),
            "root_causes": root_causes,
            "blast_radius": blast_radius,
        }

    def _cluster_root_causes(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Clusters findings by underlying root cause pattern:
        - INSECURE_SERIALIZATION_BUNDLE: Pickle weights, Zip Slip, Malicious Opcode
        - COMPROMISED_SUPPLY_CHAIN: Known CVEs, Typosquatting, Unpinned dependencies
        - MISCONFIGURED_SERVING_GATEWAY: Public exposure, Cleartext HTTP, Missing Auth, Missing Rate Limit
        - EMBEDDED_CREDENTIALS_AND_PII: Hardcoded secrets, PII leakage
        - ADVERSARIAL_TAMPERING_POISONING: Hash mismatch, Unverified base model
        """
        clusters: Dict[str, List[Dict[str, Any]]] = {}

        for f in findings:
            cat = f.get("category", "")
            rule = f.get("rule_id", "")

            if "SERIALIZATION" in rule or "PICKLE" in rule or "ZIP" in rule or "TAR" in rule or "ST-" in rule:
                key = "INSECURE_SERIALIZATION_BUNDLE"
            elif cat == "SUPPLY_CHAIN" or "CVE" in rule or "DEP" in rule:
                key = "COMPROMISED_SUPPLY_CHAIN"
            elif cat == "ENDPOINT_SECURITY" or "EP-" in rule:
                key = "MISCONFIGURED_SERVING_GATEWAY"
            elif "SECRET" in rule or "PII" in rule or cat == "PRIVACY_LEAKAGE":
                key = "EMBEDDED_CREDENTIALS_AND_PII"
            elif "POISON" in rule or "TAMPERING" in rule or "HASH-MISMATCH" in rule:
                key = "ADVERSARIAL_TAMPERING_POISONING"
            else:
                key = "CONFIGURATION_AND_ARCHITECTURE_DRIFT"

            if key not in clusters:
                clusters[key] = []
            clusters[key].append(f)

        root_causes = []
        cluster_titles = {
            "INSECURE_SERIALIZATION_BUNDLE": (
                "Vulnerable Model Weights & Packaging",
                "Model uses unsafe serialization formats (e.g. Python pickle or unverified archives) which permit arbitrary code execution.",
            ),
            "COMPROMISED_SUPPLY_CHAIN": (
                "ML Supply Chain & Vulnerable Dependencies",
                "Model environment depends on packages with known remote code execution or denial of service CVEs.",
            ),
            "MISCONFIGURED_SERVING_GATEWAY": (
                "Insecure Model Inference Deployment Gateway",
                "Serving infrastructure lacks essential transport encryption, authentication, or rate limiting controls.",
            ),
            "EMBEDDED_CREDENTIALS_AND_PII": (
                "Data Leakage & Hardcoded Identity Exposure",
                "Model configurations or context contain hardcoded API tokens or sensitive personal information.",
            ),
            "ADVERSARIAL_TAMPERING_POISONING": (
                "Adversarial Weight Tampering & Poisoning Risks",
                "Model artifacts show checksum discrepancies or derive from unverified upstream publishers.",
            ),
            "CONFIGURATION_AND_ARCHITECTURE_DRIFT": (
                "Insecure Architectural Configuration Options",
                "Model configurations enable unsafe features like trust_remote_code or excessive context sizes.",
            ),
        }

        for c_key, c_findings in clusters.items():
            title, description = cluster_titles.get(c_key, (c_key, "Identified security cluster"))
            highest_sev = "LOW"
            severities = [f.get("severity", "LOW") for f in c_findings]
            if "CRITICAL" in severities:
                highest_sev = "CRITICAL"
            elif "HIGH" in severities:
                highest_sev = "HIGH"
            elif "MEDIUM" in severities:
                highest_sev = "MEDIUM"

            root_causes.append({
                "cluster_id": c_key,
                "title": title,
                "description": description,
                "severity": highest_sev,
                "finding_count": len(c_findings),
                "finding_rule_ids": [f.get("rule_id") for f in c_findings],
                "recommended_action": f"Apply targeted AutoFix remediation for {title.lower()}.",
            })

        return root_causes

    def _estimate_blast_radius(
        self,
        model_name: str,
        findings: List[Dict[str, Any]],
        environment: str,
        is_public: bool,
    ) -> Dict[str, Any]:
        """Estimates impacted systems and organizational exposure."""
        has_critical = any(f.get("severity") == "CRITICAL" for f in findings)
        has_rce = any("PICKLE" in f.get("rule_id", "") or "ARBITRARY" in f.get("title", "").upper() for f in findings)

        if has_rce and is_public:
            exposure = "INTERNET_WIDE_REMOTE_TAKEOVER"
        elif has_rce:
            exposure = "CLUSTER_INTERNAL_CODE_EXECUTION"
        elif is_public:
            exposure = "PUBLIC_UNAUTHENTICATED_INFERENCE"
        else:
            exposure = "INTERNAL_TENANT_ISOLATED"

        return {
            "model_target": model_name,
            "environment": environment,
            "exposure_level": exposure,
            "potential_impact": (
                "Full host system compromise and secret exfiltration" if has_rce else
                "Unauthorized model consumption, data poisoning, or service disruption"
            ),
            "downstream_impact": [
                f"Production inference services calling '{model_name}'",
                "Data science automated training and fine-tuning pipelines",
                "Internal autonomous agents using this model for decision making",
            ],
        }

    def _calculate_risk_score(
        self,
        findings: List[Dict[str, Any]],
        environment: str,
        is_public: bool,
    ) -> (float, str):
        """
        Calculates an authoritative 0.0 - 100.0 Kavach Model Risk Score.
        Weight factors:
        - Critical finding: 30 pts each
        - High finding: 15 pts each
        - Medium finding: 5 pts each
        - Low finding: 1 pt each
        - Multiplier: Production (1.2x), Public exposure (1.3x)
        """
        raw_score = 0.0
        for f in findings:
            sev = f.get("severity", "LOW")
            if sev == "CRITICAL":
                raw_score += 30.0
            elif sev == "HIGH":
                raw_score += 15.0
            elif sev == "MEDIUM":
                raw_score += 5.0
            else:
                raw_score += 1.0

        multiplier = 1.0
        if environment == "production":
            multiplier *= 1.2
        if is_public:
            multiplier *= 1.3

        final_score = min(round(raw_score * multiplier, 1), 100.0)

        if final_score >= 80.0:
            tier = "CRITICAL"
        elif final_score >= 50.0:
            tier = "HIGH"
        elif final_score >= 20.0:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        return final_score, tier

