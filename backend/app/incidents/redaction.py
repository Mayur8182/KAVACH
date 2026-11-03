"""
Step 21 Secret Redaction & Evidence Integrity Engine.

Rules:
- RULE 69: Forensic Evidence is Immutable.
- RULE 73: Secret Redaction (never store raw API keys, passwords, private keys, tokens).
- Section 23: SHA-256 Integrity Verification.
"""

import re
import json
import hashlib
from typing import Dict, Any, Tuple, Union


class SecretRedactor:
    """
    Detects and redacts sensitive credentials, tokens, and private keys from forensic evidence.
    """

    PATTERNS = [
        # AWS Access Key ID
        (re.compile(r'\b(AKIA[0-9A-Z]{16})\b'), "AWS_ACCESS_KEY"),
        # GitHub Personal Access Token
        (re.compile(r'\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b'), "GITHUB_TOKEN"),
        # Generic Bearer JWT
        (re.compile(r'\b(eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]+)\b'), "JWT_BEARER_TOKEN"),
        # Private Keys
        (re.compile(r'-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[^-]+-----END[ A-Z0-9_-]+PRIVATE KEY-----', re.DOTALL), "PRIVATE_KEY"),
        # Generic Secret/Password assignments in JSON/strings
        (re.compile(r'(?i)(password|secret|api_key|token|auth_token|client_secret)\s*[:=]\s*["\']([^"\']{4,})["\']'), "CREDENTIAL_FIELD"),
    ]

    @classmethod
    def redact_text(cls, text: str) -> Tuple[str, bool]:
        """
        Redacts sensitive tokens from text, returning (redacted_text, was_redacted).
        """
        redacted = text
        was_redacted = False

        for pattern, label in cls.PATTERNS:
            def replacer(match):
                nonlocal was_redacted
                was_redacted = True
                val = match.group(0)
                # Compute 12-char SHA-256 fingerprint for forensic reference without exposing secret
                h = hashlib.sha256(val.encode("utf-8")).hexdigest()[:12]
                return f"[REDACTED_{label}:{h}]"

            redacted = pattern.sub(replacer, redacted)

        return redacted, was_redacted

    @classmethod
    def redact_data(cls, data: Union[Dict[str, Any], list, str, Any]) -> Tuple[Any, bool]:
        """
        Recursively redacts secrets in dicts, lists, and strings.
        """
        if isinstance(data, str):
            return cls.redact_text(data)

        if isinstance(data, dict):
            was_redacted = False
            result = {}
            for k, v in data.items():
                k_lower = str(k).lower()
                if any(sec_kw in k_lower for sec_kw in ["password", "secret", "private_key", "token", "credential"]):
                    # Automatically redact sensitive keys
                    if isinstance(v, (str, int, float)):
                        h = hashlib.sha256(str(v).encode("utf-8")).hexdigest()[:12]
                        result[k] = f"[REDACTED_CREDENTIAL:{h}]"
                        was_redacted = True
                    else:
                        red_v, r_flag = cls.redact_data(v)
                        result[k] = red_v
                        was_redacted = was_redacted or r_flag
                else:
                    red_v, r_flag = cls.redact_data(v)
                    result[k] = red_v
                    was_redacted = was_redacted or r_flag
            return result, was_redacted

        if isinstance(data, list):
            was_redacted = False
            result = []
            for item in data:
                red_item, r_flag = cls.redact_data(item)
                result.append(red_item)
                was_redacted = was_redacted or r_flag
            return result, was_redacted

        return data, False


class EvidenceIntegrityEngine:
    """
    Computes cryptographic SHA-256 hashes and verifies integrity of forensic artifacts.
    """

    @staticmethod
    def compute_integrity(content: Union[str, bytes, dict, list]) -> Dict[str, Any]:
        """
        Computes SHA-256 hash and byte length of evidence content.
        """
        if isinstance(content, (dict, list)):
            canonical_bytes = json.dumps(content, sort_keys=True, separators=(',', ':')).encode("utf-8")
        elif isinstance(content, str):
            canonical_bytes = content.encode("utf-8")
        elif isinstance(content, bytes):
            canonical_bytes = content
        else:
            canonical_bytes = str(content).encode("utf-8")

        h = hashlib.sha256(canonical_bytes).hexdigest()
        return {
            "integrity_hash": h,
            "hash_algorithm": "SHA-256",
            "artifact_size_bytes": len(canonical_bytes),
        }

    @staticmethod
    def verify_integrity(content: Union[str, bytes, dict, list], expected_hash: str) -> bool:
        """
        Verifies that content matches expected SHA-256 hash.
        """
        computed = EvidenceIntegrityEngine.compute_integrity(content)["integrity_hash"]
        return computed.lower() == expected_hash.lower()
