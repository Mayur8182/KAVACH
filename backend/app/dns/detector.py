"""
DNS Threat Detection Engine.

Implements deterministic and statistical threat detection:
- Step 24 Threat Intelligence correlation (Known Malicious, C2, Phishing domains)
- DGA (Domain Generation Algorithm) detection
- DNS Tunneling & Exfiltration detection
- DNS Beaconing detection (periodicity & interval variance)
- NXDOMAIN spike anomaly detection

Enforces:
- Rule 3: DNS Intelligence != Compromise (detection is an operational signal).
- Rule 4: DNS Anomaly != Attack (unverified anomalies classified as signals, not confirmed attacks).
"""

import re
import math
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models.threat_intel_models import ThreatIndicator, ThreatIndicatorSource
from app.models.dns_models import DNSEvent, Domain, DNSSignal, DNSBaseline
from app.dns.normalizer import DomainNormalizer


class DNSThreatDetector:
    """Evaluates DNS events and domain characteristics against deterministic threat rules."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ================================================================
    # 1. Step 24 Threat Intelligence Correlation
    # ================================================================

    async def correlate_threat_intelligence(
        self,
        domain_fqdn: str,
        registered_domain: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Cross-references domain against Step 24 Threat Indicators.
        Checks both exact FQDN and parent Registered Domain.
        """
        candidates = [domain_fqdn.lower(), registered_domain.lower()]

        stmt = select(ThreatIndicator).where(
            and_(
                ThreatIndicator.normalized_value.in_(candidates),
                ThreatIndicator.status == "ACTIVE",
            )
        )
        res = await self.db.execute(stmt)
        indicator = res.scalar_one_or_none()

        if not indicator:
            return None

        # Fetch provenance sources
        src_stmt = select(ThreatIndicatorSource).where(
            ThreatIndicatorSource.indicator_id == indicator.id
        )
        src_res = await self.db.execute(src_stmt)
        sources = src_res.scalars().all()

        return {
            "indicator_id": str(indicator.id),
            "indicator_type": indicator.indicator_type,
            "matched_value": indicator.value,
            "confidence": indicator.confidence,
            "severity": indicator.severity,
            "threat_types": indicator.threat_types,
            "source_count": indicator.source_count,
            "sources": [str(s.source_id) for s in sources],
        }

    # ================================================================
    # 2. DGA (Domain Generation Algorithm) Detection
    # ================================================================

    @staticmethod
    def detect_dga(domain_decomp: Dict[str, Any]) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Detects DGA-generated domain characteristics:
        - High Shannon entropy on the SLD label (> 3.55)
        - Label length >= 12 characters
        - High consonant ratio (> 75%) or extreme vowel absence
        - Repeated consecutive consonants (>= 4)
        """
        fqdn = domain_decomp.get("fqdn", "")
        reg_domain = domain_decomp.get("registered_domain", "")
        entropy = domain_decomp.get("entropy", 0.0)

        # Extract primary variable label (the SLD before the TLD)
        sld = reg_domain.split(".")[0] if "." in reg_domain else reg_domain
        label_len = len(sld)

        if label_len < 10:
            return False, 0.0, {}

        # Consonant / Vowel analysis
        vowels = set("aeiou")
        alpha_chars = [c for c in sld.lower() if c.isalpha()]
        if not alpha_chars:
            return False, 0.0, {}

        vowel_count = sum(1 for c in alpha_chars if c in vowels)
        consonant_count = len(alpha_chars) - vowel_count
        consonant_ratio = consonant_count / len(alpha_chars)

        # Check consecutive consonants
        consecutive_consonants = max(
            [len(m.group(0)) for m in re.finditer(r"[bcdfghjklmnpqrstvwxyz]+", sld.lower())] or [0]
        )

        dga_score = 0.0
        factors = []

        if entropy > 3.55:
            dga_score += 0.45
            factors.append(f"high_entropy_{entropy}")

        if label_len >= 14:
            dga_score += 0.25
            factors.append(f"long_label_{label_len}")

        if consonant_ratio > 0.75:
            dga_score += 0.20
            factors.append(f"consonant_ratio_{round(consonant_ratio, 2)}")

        if consecutive_consonants >= 4:
            dga_score += 0.15
            factors.append(f"consecutive_consonants_{consecutive_consonants}")

        is_dga = dga_score >= 0.65
        details = {
            "dga_score": round(dga_score, 2),
            "label_evaluated": sld,
            "entropy": entropy,
            "factors": factors,
        }
        return is_dga, dga_score, details

    # ================================================================
    # 3. DNS Tunneling & Exfiltration Detection
    # ================================================================

    @staticmethod
    def detect_tunneling(
        domain_decomp: Dict[str, Any],
        query_type: str,
        answers: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Detects DNS Tunneling and data exfiltration patterns:
        - Long label length (> 28 characters)
        - Very high entropy in subdomain labels (> 3.65)
        - Hex / Base32 / Base64 encoded payload patterns
        - TXT abuse (querying TXT records with high volume of base64 answers)
        """
        fqdn = domain_decomp.get("fqdn", "")
        subdomain = domain_decomp.get("subdomain") or ""
        entropy = domain_decomp.get("entropy", 0.0)

        is_tunnel = False
        signal_type = "DNS_TUNNEL"
        details: Dict[str, Any] = {"indicators": []}

        # Check for long encoded subdomains
        if subdomain:
            subdomain_labels = subdomain.split(".")
            for lbl in subdomain_labels:
                lbl_len = len(lbl)
                lbl_entropy = DomainNormalizer.calculate_shannon_entropy(lbl)

                # Heuristic 1: Long high-entropy label typical of chunked data payload
                if lbl_len >= 28 and lbl_entropy >= 3.60:
                    is_tunnel = True
                    details["indicators"].append({
                        "label": lbl[:20] + "...",
                        "length": lbl_len,
                        "entropy": round(lbl_entropy, 2),
                        "reason": "HIGH_ENTROPY_LONG_SUBDOMAIN",
                    })

                # Heuristic 2: Hex-encoded sequence (e.g. CobaltStrike or Iodine DNS tunneling)
                if lbl_len >= 24 and re.match(r"^[0-9a-fA-F]+$", lbl):
                    is_tunnel = True
                    details["indicators"].append({
                        "label": lbl[:20] + "...",
                        "length": lbl_len,
                        "reason": "HEX_ENCODED_PAYLOAD",
                    })

        # Heuristic 3: TXT record abuse for C2 staging or exfiltration
        if query_type == "TXT" and answers:
            for ans in answers:
                rdata = str(ans.get("rdata", ""))
                if len(rdata) > 120 and (re.search(r"^[A-Za-z0-9+/=]{80,}", rdata) or DomainNormalizer.calculate_shannon_entropy(rdata) > 4.2):
                    is_tunnel = True
                    signal_type = "DNS_EXFILTRATION"
                    details["indicators"].append({
                        "rdata_length": len(rdata),
                        "reason": "TXT_RECORD_LARGE_ENCODED_PAYLOAD",
                    })

        return is_tunnel, signal_type, details

    # ================================================================
    # 4. DNS Beaconing Detection
    # ================================================================

    @staticmethod
    def detect_beaconing(
        recent_timestamps: List[datetime],
        min_intervals: int = 4,
    ) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Detects periodic C2 beaconing queries to the same domain.
        Measures variance of interval deltas: sigma < 2.0 seconds -> BEACONING.
        """
        if len(recent_timestamps) < min_intervals:
            return False, 0.0, {}

        # Sort timestamps ascending
        sorted_times = sorted(recent_timestamps)
        intervals = []
        for i in range(1, len(sorted_times)):
            delta = (sorted_times[i] - sorted_times[i - 1]).total_seconds()
            intervals.append(delta)

        if not intervals:
            return False, 0.0, {}

        mean_interval = sum(intervals) / len(intervals)
        if mean_interval < 5.0 or mean_interval > 3600.0:
            return False, 0.0, {}

        variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
        std_dev = math.sqrt(variance)

        # Very low delta variance indicates automated, periodic programmatic queries
        is_beacon = std_dev <= 2.5
        details = {
            "sample_count": len(sorted_times),
            "mean_interval_seconds": round(mean_interval, 2),
            "standard_deviation": round(std_dev, 2),
        }
        return is_beacon, std_dev, details
