"""
DNS Domain Normalization & Linguistic Entropy Engine.

Provides:
- Canonical domain normalization (lowercase, trim whitespace, remove trailing dots)
- FQDN decomposition into Subdomain, Registered Domain, and TLD
- Punycode & IDN (Internationalized Domain Name) homoglyph classification
- Shannon Entropy calculation for anomaly/tunneling/DGA analysis
"""

import math
import re
from typing import Dict, Any, Tuple, Optional


# Common multi-part and top-level public suffixes for accurate decomposition
COMMON_TLDS = {
    "com", "org", "net", "edu", "gov", "mil", "io", "co", "ai", "app", "dev",
    "xyz", "info", "biz", "online", "site", "live", "store", "tech", "cloud",
    "co.uk", "org.uk", "gov.uk", "ac.uk", "co.jp", "ne.jp", "com.au", "net.au",
    "com.br", "co.in", "net.in", "org.in", "de", "fr", "cn", "ru", "nl", "eu",
}


class DomainNormalizer:
    """Canonical domain parser, normalizer, and linguistic entropy analyzer."""

    @classmethod
    def normalize_domain(cls, raw_query: str) -> str:
        """
        Normalizes a queried name:
        1. Strips leading/trailing whitespace
        2. Lowercases string
        3. Removes trailing dot (e.g., 'API.Company.Com.' -> 'api.company.com')
        """
        if not raw_query:
            return ""
        cleaned = raw_query.strip().lower()
        if cleaned.endswith("."):
            cleaned = cleaned[:-1]
        return cleaned

    @classmethod
    def decompose_domain(cls, normalized_fqdn: str) -> Dict[str, Any]:
        """
        Decomposes a normalized FQDN into:
        - fqdn
        - registered_domain
        - subdomain
        - tld
        - entropy (of the primary SLD/subdomain label)
        - is_idn & punycode representation
        """
        if not normalized_fqdn:
            return {
                "fqdn": "",
                "registered_domain": "",
                "subdomain": "",
                "tld": "",
                "entropy": 0.0,
                "is_idn": False,
                "punycode": None,
                "idn_classification": "NORMAL",
            }

        parts = normalized_fqdn.split(".")
        tld = ""
        reg_domain = normalized_fqdn
        subdomain = ""

        # Check multi-part TLDs first (e.g. .co.uk)
        if len(parts) >= 3:
            candidate_multi = f"{parts[-2]}.{parts[-1]}"
            if candidate_multi in COMMON_TLDS:
                tld = candidate_multi
                reg_domain = f"{parts[-3]}.{tld}"
                subdomain = ".".join(parts[:-3]) if len(parts) > 3 else ""

        if not tld and len(parts) >= 2:
            tld = parts[-1]
            reg_domain = f"{parts[-2]}.{tld}"
            subdomain = ".".join(parts[:-2]) if len(parts) > 2 else ""
        elif not tld:
            tld = parts[0]
            reg_domain = parts[0]

        # Extract primary variable label (either the lowest subdomain label or SLD)
        primary_label = parts[0]
        label_entropy = cls.calculate_shannon_entropy(primary_label)

        # IDN & Punycode analysis
        is_idn, punycode, idn_class = cls.analyze_idn(normalized_fqdn)

        return {
            "fqdn": normalized_fqdn,
            "registered_domain": reg_domain,
            "subdomain": subdomain if subdomain else None,
            "tld": tld,
            "entropy": round(label_entropy, 3),
            "is_idn": is_idn,
            "punycode": punycode,
            "idn_classification": idn_class,
        }

    @staticmethod
    def calculate_shannon_entropy(text: str) -> float:
        """
        Calculates Shannon entropy: H(X) = -sum(P(x) * log2(P(x))).
        Natural English domains typically measure 2.0 - 3.2.
        DGA and Tunneling labels typically measure > 3.6.
        """
        if not text:
            return 0.0
        length = len(text)
        freq: Dict[str, int] = {}
        for char in text:
            freq[char] = freq.get(char, 0) + 1

        entropy = 0.0
        for count in freq.values():
            p = count / length
            entropy -= p * math.log2(p)
        return entropy

    @staticmethod
    def analyze_idn(fqdn: str) -> Tuple[bool, Optional[str], str]:
        """
        Inspects domain for IDN / Punycode / Homograph spoofing.
        Returns: (is_idn, punycode_string, idn_classification)
        """
        is_idn = False
        punycode = None
        classification = "NORMAL"

        # Check for punycode prefix in labels
        labels = fqdn.split(".")
        has_punycode_label = any(l.startswith("xn--") for l in labels)

        # Check for non-ASCII characters
        has_non_ascii = any(ord(c) > 127 for c in fqdn)

        if has_punycode_label or has_non_ascii:
            is_idn = True
            try:
                if has_non_ascii:
                    punycode = fqdn.encode("idna").decode("ascii")
                else:
                    decoded = fqdn.encode("ascii").decode("idna")
                    punycode = fqdn
            except Exception:
                classification = "SUSPICIOUS_IDN"
                return is_idn, punycode, classification

            # Suspicious IDN checks: mixed Cyrillic/Latin homoglyphs imitating popular brands
            homoglyphs = {"а", "с", "е", "о", "р", "х", "у", "і", "ј", "ѕ"}
            if any(c in homoglyphs for c in (punycode or fqdn)):
                classification = "SUSPICIOUS_IDN"
            else:
                classification = "NORMAL"

        return is_idn, punycode, classification
