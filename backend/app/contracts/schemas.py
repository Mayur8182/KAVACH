import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ContractCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str = Field(default="", max_length=2000)
    contract_key: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9\-_]+$")
    definition: Dict[str, Any] = Field(description="Structured contract DSL definition")


class ContractVersionCreateRequest(BaseModel):
    definition: Dict[str, Any] = Field(description="Structured contract DSL definition")


class ContractValidateRequest(BaseModel):
    definition: Dict[str, Any] = Field(description="Raw contract definition to validate")


class ContractValidateResponse(BaseModel):
    valid: bool
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class ContractCompileRequest(BaseModel):
    definition: Dict[str, Any] = Field(description="Contract definition to compile")


class ContractCompileResponse(BaseModel):
    success: bool
    contract_key: Optional[str] = None
    name: Optional[str] = None
    version: int = 1
    definition_hash: Optional[str] = None
    normalized_definition: Optional[Dict[str, Any]] = None
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class ContractVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_id: uuid.UUID
    version: int
    definition: Dict[str, Any]
    normalized_definition: Dict[str, Any]
    definition_hash: str
    schema_version: str
    status: str
    created_by: str
    created_at: datetime
    activated_at: Optional[datetime] = None
    retired_at: Optional[datetime] = None
    methodology_version: str


class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str
    contract_key: str
    status: str
    current_version_id: Optional[uuid.UUID] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    retired_at: Optional[datetime] = None
    metadata_: Dict[str, Any] = Field(default_factory=dict, alias="metadata")
    current_version: Optional[ContractVersionResponse] = None
    versions_count: int = 0


class ContractDependencyCreateRequest(BaseModel):
    depends_on_contract_id: uuid.UUID
    dependency_type: str = Field(default="REQUIRES", description="REQUIRES | CONFLICTS_WITH | COMPOSES_WITH")


class ContractDependencyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_version_id: uuid.UUID
    depends_on_contract_version_id: uuid.UUID
    dependency_type: str
    created_at: datetime


class ContractOverrideCreateRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)
    scope: Dict[str, Any] = Field(default_factory=dict)
    expires_in_hours: int = Field(default=24, ge=1, le=720)


class ContractOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_version_id: uuid.UUID
    project_id: uuid.UUID
    actor_type: str
    actor_id: str
    reason: str
    scope: Dict[str, Any]
    status: str
    created_at: datetime
    expires_at: datetime


class ContractVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_version_id: uuid.UUID
    project_id: uuid.UUID
    status: str
    evaluation_result: Dict[str, Any]
    evidence_summary: Dict[str, Any]
    verifier_type: str
    verifier_version: str
    evaluated_at: datetime
    error_message: Optional[str] = None


class ContractViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contract_version_id: uuid.UUID
    verification_id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    severity: str
    violation_type: str
    description: str
    subject: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    evidence: Dict[str, Any]
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None
