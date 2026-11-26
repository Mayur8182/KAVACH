"""
Kavach Secrets Sub-Engine — Pattern Detection Engine
High-precision regex detection suite for API keys, private keys, tokens, and credentials.
"""

import re
from typing import Dict, Any, List, Tuple


SECRET_PATTERNS: List[Dict[str, Any]] = [
    {
        "id": "KV-SEC-001",
        "name": "AWS Access Key ID",
        "pattern": re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"),
        "severity": "CRITICAL",
        "type": "Cloud Provider Credential",
    },
    {
        "id": "KV-SEC-002",
        "name": "GitHub Personal Access Token",
        "pattern": re.compile(r"gh[pousr]_[A-Za-z0-9_]{36,255}"),
        "severity": "CRITICAL",
        "type": "VCS Token",
    },
    {
        "id": "KV-SEC-003",
        "name": "Stripe API Key",
        "pattern": re.compile(r"(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,99}"),
        "severity": "CRITICAL",
        "type": "Payment Gateway Credential",
    },
    {
        "id": "KV-SEC-004",
        "name": "OpenAI API Key",
        "pattern": re.compile(r"sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20}"),
        "severity": "CRITICAL",
        "type": "AI Provider Credential",
    },
    {
        "id": "KV-SEC-005",
        "name": "Slack Bot / User Token",
        "pattern": re.compile(r"xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}"),
        "severity": "HIGH",
        "type": "Communication API Token",
    },
    {
        "id": "KV-SEC-006",
        "name": "RSA / OpenSSH Private Key Block",
        "pattern": re.compile(r"-----BEGIN (?:RSA|OPENSSH|DSA|EC|PGP)? PRIVATE KEY-----"),
        "severity": "CRITICAL",
        "type": "Cryptographic Private Key",
    },
    {
        "id": "KV-SEC-007",
        "name": "Generic High-Entropy Password Assignment",
        "pattern": re.compile(r"""(?:password|passwd|secret|api_key|auth_token)\s*[:=]\s*['"][a-zA-Z0-9!@#$%^&*()_+\-={}\[\]:;<>,.?\/~`]{10,}['"]""", re.IGNORECASE),
        "severity": "HIGH",
        "type": "Hardcoded Secret",
    },
]


class SecretPatternDetector:
    def detect_patterns(self, content: str) -> List[Dict[str, Any]]:
        matches = []
        lines = content.split("\n")
        for idx, line in enumerate(lines, 1):
            for sp in SECRET_PATTERNS:
                m = sp["pattern"].search(line)
                if m:
                    matches.append({
                        "rule_id": sp["id"],
                        "name": sp["name"],
                        "severity": sp["severity"],
                        "type": sp["type"],
                        "line": idx,
                        "match": m.group(0),
                        "snippet": line.strip(),
                    })
        return matches

