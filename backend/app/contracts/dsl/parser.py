from typing import Any, Dict, List, Optional
import json
import yaml
from pydantic import ValidationError

from app.contracts.dsl.ast import SecurityContractDefinition


class ContractParseError(Exception):
    def __init__(self, message: str, errors: Optional[List[Dict[str, Any]]] = None):
        super().__init__(message)
        self.message = message
        self.errors = errors or []


class ContractParser:
    """
    Parses and schema-validates raw contract input (JSON/YAML or Python dict)
    into the typed SecurityContractDefinition AST.
    """

    @classmethod
    def parse_dict(cls, data: Dict[str, Any]) -> SecurityContractDefinition:
        # Unwrap top-level 'contract' key if present (YAML idiom)
        payload = data.get("contract", data) if isinstance(data, dict) else data

        try:
            return SecurityContractDefinition.model_validate(payload)
        except ValidationError as e:
            formatted_errors = []
            for err in e.errors():
                loc = ".".join(str(p) for p in err.get("loc", []))
                formatted_errors.append({
                    "path": loc,
                    "code": err.get("type", "VALIDATION_ERROR"),
                    "message": err.get("msg", "Invalid contract field"),
                })
            raise ContractParseError("Contract schema validation failed.", errors=formatted_errors)

    @classmethod
    def parse_text(cls, text: str) -> SecurityContractDefinition:
        text = text.strip()
        if not text:
            raise ContractParseError("Empty contract input.")
        try:
            if text.startswith("{"):
                raw_dict = json.loads(text)
            else:
                raw_dict = yaml.safe_load(text)
        except Exception as e:
            raise ContractParseError(f"Malformed JSON/YAML: {str(e)}", errors=[{"path": "$", "code": "SYNTAX_ERROR", "message": str(e)}])

        if not isinstance(raw_dict, dict):
            raise ContractParseError("Contract definition must be an object/dictionary.")
        return cls.parse_dict(raw_dict)


SecurityContractDSL = ContractParser
