from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.compiler.semantic_validator import SemanticValidator
from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.dsl.hash import ContractHasher
from app.contracts.dsl.normalizer import ContractNormalizer
from app.contracts.dsl.parser import ContractParseError, ContractParser
from app.contracts.dsl.validator import ContractSyntaxValidator


class CompilationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    contract_key: Optional[str] = None
    name: Optional[str] = None
    version: int = 1
    definition_hash: Optional[str] = None
    normalized_definition: Optional[Dict[str, Any]] = None
    parsed_definition: Optional[SecurityContractDefinition] = None
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class ContractCompiler:
    """
    Production-grade Security Contract Compiler.
    Executes the full compilation pipeline:
    
    Raw Contract
        ↓
    Schema Validation
        ↓
    Syntax Validation
        ↓
    Semantic Validation
        ↓
    Scope Validation
        ↓
    Canonical Normalization
        ↓
    SHA-256 Definition Hashing
        ↓
    Compiled Contract Artifact
    """

    @classmethod
    def compile(cls, raw_input: Dict[str, Any], version: int = 1) -> CompilationResult:
        errors: List[Dict[str, Any]] = []

        # 1. Syntax & Structural Schema Validation
        valid_syntax, syntax_errors, definition = ContractSyntaxValidator.validate(raw_input)
        if not valid_syntax:
            return CompilationResult(
                success=False,
                errors=syntax_errors,
            )

        # 2. Semantic Validation (field namespace, scope conflict)
        semantic_errors = SemanticValidator.validate(definition)
        if semantic_errors:
            return CompilationResult(
                success=False,
                errors=semantic_errors,
                parsed_definition=definition,
            )

        # 3. Canonical Normalization
        normalized = ContractNormalizer.normalize_contract(definition)

        # 4. Cryptographic Definition Hash (SHA-256)
        def_hash = ContractHasher.compute_hash(normalized)

        return CompilationResult(
            success=True,
            contract_key=definition.key,
            name=definition.name,
            version=version,
            definition_hash=def_hash,
            normalized_definition=normalized,
            parsed_definition=definition,
            errors=[],
        )
