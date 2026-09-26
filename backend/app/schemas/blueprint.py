import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BlueprintCreateRequest(BaseModel):
    """Request payload to generate a dynamic security blueprint."""
    intent_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional intent version ID. If not provided, latest analyzed intent for project is used.",
    )


class RequirementEvidenceResponse(BaseModel):
    """Evidence item linking requirement to intent facts."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_type: str
    source_field: str
    evidence_text: str
    created_at: datetime


class RequirementDependencyResponse(BaseModel):
    """Structured dependency between security requirements."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    depends_on_key: str
    dependency_type: str
    description: Optional[str] = None


class SecurityRequirementResponse(BaseModel):
    """A concrete security requirement in the blueprint."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    blueprint_id: uuid.UUID
    requirement_key: str
    title: str
    description: str
    category: str
    severity: str
    priority: str
    mandatory: bool
    rationale: str
    verification_strategy: List[str]
    status: str
    security_invariant: Optional[str] = None
    created_at: datetime
    evidence_items: List[RequirementEvidenceResponse] = Field(default_factory=list)
    dependencies: List[RequirementDependencyResponse] = Field(default_factory=list)


class SecurityBlueprintResponse(BaseModel):
    """Detailed view of a generated Security Blueprint."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    intent_id: uuid.UUID
    version: int
    status: str
    methodology_version: str
    generated_by: str
    risk_factors: List[str]
    created_at: datetime
    updated_at: datetime
    requirement_count: int = 0
    requirements: Optional[List[SecurityRequirementResponse]] = None


class RequirementDiff(BaseModel):
    requirement_key: str
    title: str
    changes: Dict[str, Dict[str, Any]]  # field_name -> {"old": ..., "new": ...}


class BlueprintComparisonResponse(BaseModel):
    """Detailed comparison between two versions of a project blueprint."""
    blueprint_v1_id: uuid.UUID
    blueprint_v1_version: int
    blueprint_v2_id: uuid.UUID
    blueprint_v2_version: int
    added_requirements: List[SecurityRequirementResponse]
    removed_requirements: List[SecurityRequirementResponse]
    modified_requirements: List[RequirementDiff]
    unchanged_count: int
