"""
Integrity hashing for runtime evidence payloads.
Produces tamper-evident cryptographic SHA-256 hashes over canonical serialized JSON.
"""

import hashlib
import json
from typing import Any, Dict


class EvidenceIntegrityHasher:
    @staticmethod
    def canonical_json_bytes(data: Dict[str, Any]) -> bytes:
        return json.dumps(
            data,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            default=str,
        ).encode("utf-8")

    @classmethod
    def compute_payload_hash(cls, normalized_payload: Dict[str, Any]) -> str:
        canonical_bytes = cls.canonical_json_bytes(normalized_payload)
        return hashlib.sha256(canonical_bytes).hexdigest()

    @classmethod
    def hash_payload(cls, normalized_payload: Dict[str, Any]) -> str:
        return cls.compute_payload_hash(normalized_payload)

    @classmethod
    def compute_sha256(cls, normalized_payload: Dict[str, Any]) -> str:
        return cls.compute_payload_hash(normalized_payload)


EvidenceIntegrity = EvidenceIntegrityHasher
