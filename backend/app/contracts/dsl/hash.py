import hashlib
from typing import Any, Dict
from app.contracts.dsl.normalizer import ContractNormalizer


class ContractHasher:
    """
    Computes cryptographic SHA-256 hash of a normalized contract definition.
    Guarantees tamper detection, evidence binding, and verification reproducibility.
    """

    @classmethod
    def compute_hash(cls, normalized_data: Dict[str, Any]) -> str:
        canonical_bytes = ContractNormalizer.to_canonical_json_bytes(normalized_data)
        return hashlib.sha256(canonical_bytes).hexdigest()

    @classmethod
    def hash_definition(cls, normalized_data: Dict[str, Any]) -> str:
        return cls.compute_hash(normalized_data)
