"""
Kavach Phase 5: Policy Content Hasher
Computes deterministic, reproducible SHA256 hashes of canonical policy definitions.
Ensures immutable policy versions and tamper-evident storage.
"""

from __future__ import annotations

import json
import hashlib
from typing import Any, Dict


def compute_policy_content_hash(definition: Dict[str, Any]) -> str:
    """
    Computes a deterministic 64-character SHA256 hash of a policy definition.
    Canonicalizes dictionary keys and compacts JSON representation to ensure
    identical hashes regardless of formatting or whitespace.
    """
    if not isinstance(definition, dict):
        raise ValueError("Policy definition must be a dictionary.")

    # Sort keys recursively and format as compact canonical JSON (UTF-8)
    canonical_json = json.dumps(
        definition,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def verify_policy_integrity(definition: Dict[str, Any], expected_hash: str) -> bool:
    """
    Verifies that a policy definition matches an expected SHA256 content hash.
    Detects silent policy tampering or accidental mutation.
    """
    actual_hash = compute_policy_content_hash(definition)
    return actual_hash.lower() == (expected_hash or "").lower()

