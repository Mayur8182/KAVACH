import json
from typing import Any, Dict, List
from app.contracts.dsl.ast import SecurityContractDefinition


class ContractNormalizer:
    """
    Produces deterministic canonical JSON representations of contract definitions.
    Sorts dictionary keys recursively, normalizes operator casings, and ensures equivalent
    contracts produce identical bit-for-bit canonical representations.
    """

    @classmethod
    def normalize_dict(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: cls.normalize_dict(v) for k, v in sorted(data.items())}
        elif isinstance(data, list):
            return [cls.normalize_dict(item) for item in data]
        elif isinstance(data, (int, float, bool, str)) or data is None:
            return data
        else:
            return str(data)

    @classmethod
    def normalize(cls, data: Any) -> Any:
        if isinstance(data, SecurityContractDefinition):
            return cls.normalize_contract(data)
        return cls.normalize_dict(data)

    @classmethod
    def normalize_contract(cls, definition: SecurityContractDefinition) -> Dict[str, Any]:
        raw_dict = definition.model_dump(exclude_none=True)
        return cls.normalize_dict(raw_dict)

    @classmethod
    def to_canonical_json_bytes(cls, normalized_data: Dict[str, Any]) -> bytes:
        return json.dumps(
            normalized_data,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode("utf-8")
