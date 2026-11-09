"""
Kavach Security Intelligence Engine — Contextual Risk Scoring Engine.
Implements a deterministic, explainable, versioned priority scoring index (0 to 100)
and priority bands (P0 to P4) with explicit positive reasons and mitigating factors.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Tuple

from app.intelligence.security.schemas import (
    CanonicalFinding,
    FindingRiskAssessment,
    PriorityBand,
    ReachabilityStatus,
)

logger = logging.getLogger("kavach.security_intelligence.risk_engine")


class ContextualRiskEngine:
    """
    Evaluates contextual security risk deterministically.
    Formula:
      priority_score = clamp(0, 100,
        severity_comp + exploit_signal_comp + reachability_comp + exposure_comp + asset_impact_comp - mitigation_comp
      )
    """

    SCORING_VERSION = "v1.0"

    @classmethod
    def calculate_risk(
        cls,
        finding: CanonicalFinding,
        is_production: bool = True,
    ) -> FindingRiskAssessment:
        """
        Calculates transparent priority score and assigns priority band (P0 to P4).
        """
        reason_codes: List[str] = []
        positive_factors: List[str] = []
        mitigating_factors: List[str] = []

        # 1. Severity Component (Max 35)
        sev_score = 0.0
        norm_sev = finding.normalized_severity.value
        if norm_sev == "CRITICAL":
            sev_score = 25.0
            reason_codes.append("CRITICAL_BASE_SEVERITY")
            positive_factors.append("Scanner identified CRITICAL vulnerability severity.")
        elif norm_sev == "HIGH":
            sev_score = 18.0
            reason_codes.append("HIGH_BASE_SEVERITY")
            positive_factors.append("Scanner identified HIGH vulnerability severity.")
        elif norm_sev == "MEDIUM":
            sev_score = 10.0
            reason_codes.append("MEDIUM_BASE_SEVERITY")
        else:
            sev_score = 4.0

        # CVSS bonus (up to 10 pts)
        if finding.enrichment and finding.enrichment.cvss_score:
            cvss = finding.enrichment.cvss_score
            bonus = min(10.0, max(0.0, (cvss - 5.0) * 2.0))
            sev_score += bonus
            if cvss >= 9.0:
                reason_codes.append("CVSS_CRITICAL_SCORE")
                positive_factors.append(f"Authoritative CVSS score is {cvss:.1f} (Critical).")

        severity_comp = min(35.0, sev_score)

        # 2. Exploit Signal Component (Max 30)
        exploit_score = 0.0
        if finding.enrichment:
            if finding.enrichment.is_known_exploited:
                exploit_score += 20.0
                reason_codes.append("KNOWN_EXPLOITED_CVE")
                positive_factors.append("Listed in CISA Known Exploited Vulnerabilities (KEV) catalog.")

            if finding.enrichment.epss_score and finding.enrichment.epss_score > 0.5:
                exploit_score += 10.0
                reason_codes.append("HIGH_EPSS_EXPLOITATION_PROBABILITY")
                positive_factors.append(f"FIRST EPSS probability is {finding.enrichment.epss_score * 100:.1f}%.")

        exploit_signal_comp = min(30.0, exploit_score)

        # 3. Reachability Component (Max 25)
        reach_score = 0.0
        reach = finding.reachability
        if reach:
            if reach.status == ReachabilityStatus.CANDIDATE_PATH:
                reach_score = 25.0
                reason_codes.append("STATIC_CALL_PATH_FOUND")
                positive_factors.append(f"Static call path confirmed from entrypoint: {reach.entrypoint or 'HTTP Route'}.")
            elif reach.status == ReachabilityStatus.PATH_WITH_MITIGATION:
                reach_score = 12.0
                reason_codes.append("PATH_WITH_AUTH_MITIGATION")
                positive_factors.append("Static path exists, but is gated by authentication or validation middleware.")
            elif reach.status == ReachabilityStatus.NO_PATH_FOUND:
                reach_score = 0.0
                mitigating_factors.append("No static call path detected from external entry points.")
            else:
                reach_score = 5.0
        elif finding.evidence.route_endpoint:
            reach_score = 20.0
            reason_codes.append("DIRECT_API_ENDPOINT")
            positive_factors.append(f"Vulnerability is located directly inside route handler: {finding.evidence.route_endpoint}.")

        reachability_comp = min(25.0, reach_score)

        # 4. Exposure Component (Max 15)
        exposure_score = 0.0
        if finding.evidence.route_endpoint or (reach and reach.entrypoint):
            exposure_score += 10.0
            reason_codes.append("PUBLIC_ENTRY_POINT")
            positive_factors.append("Directly or transitively reachable from an exposed HTTP endpoint.")

        if is_production:
            exposure_score += 5.0
            reason_codes.append("PRODUCTION_ASSET")
            positive_factors.append("Asset is tagged as active production workload.")

        exposure_comp = min(15.0, exposure_score)

        # 5. Asset Impact Component (Max 15)
        impact_score = 0.0
        # If finding touches database sink or sensitive credential
        if finding.category.value == "SECRETS":
            impact_score += 12.0
            reason_codes.append("EXPOSED_SECRET_CREDENTIAL")
            positive_factors.append("Hardcoded credential threatens organizational secrets boundary.")
        elif reach and reach.sink_name:
            impact_score += 10.0
            reason_codes.append("SENSITIVE_DATA_SINK_TOUCHED")
            positive_factors.append(f"Vulnerable execution reaches sensitive data sink: {reach.sink_name}.")

        asset_impact_comp = min(15.0, impact_score)

        # 6. Mitigation Component (Deductions, Max 30)
        mitigation_deduction = 0.0
        if reach and reach.mitigations:
            mitigation_deduction += 15.0
            reason_codes.append("AUTH_MITIGATION_EVIDENCE")
            for m in reach.mitigations:
                mitigating_factors.append(m)

        if finding.fixed_version:
            mitigation_deduction += 5.0
            reason_codes.append("FIX_VERSION_AVAILABLE")
            mitigating_factors.append(f"Official vendor fix available in version {finding.fixed_version}.")

        mitigation_comp = min(30.0, mitigation_deduction)

        # ── Final Prioritization Calculation ──────────────────────────────────
        raw_score = (
            severity_comp
            + exploit_signal_comp
            + reachability_comp
            + exposure_comp
            + asset_impact_comp
            - mitigation_comp
        )
        final_score = round(max(0.0, min(100.0, raw_score)), 1)

        # Assign Priority Band
        if final_score >= 85.0:
            band = PriorityBand.P0
        elif final_score >= 70.0:
            band = PriorityBand.P1
        elif final_score >= 50.0:
            band = PriorityBand.P2
        elif final_score >= 30.0:
            band = PriorityBand.P3
        else:
            band = PriorityBand.P4

        assessment = FindingRiskAssessment(
            priority_score=final_score,
            priority_band=band,
            severity_component=round(severity_comp, 1),
            exploit_signal_component=round(exploit_signal_comp, 1),
            reachability_component=round(reachability_comp, 1),
            exposure_component=round(exposure_comp, 1),
            asset_impact_component=round(asset_impact_comp, 1),
            mitigation_component=round(mitigation_comp, 1),
            reason_codes=reason_codes,
            positive_factors=positive_factors,
            mitigating_factors=mitigating_factors,
            scoring_version=cls.SCORING_VERSION,
            assessed_at=datetime.now(timezone.utc),
        )

        finding.risk_assessment = assessment
        return assessment

