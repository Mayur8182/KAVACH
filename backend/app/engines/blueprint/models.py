from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RequirementEvidenceItem(BaseModel):
    """Specific fact extracted from intent that triggers this requirement."""
    source_type: str = Field(description="INTENT, ARCHITECTURE, TECHNOLOGY, DATA_DOMAIN, INTERFACE, WORKFLOW, ACTOR, ENVIRONMENT")
    source_field: str = Field(description="Name of the field in NormalizedIntent, e.g. interfaces, technologies, data_domains")
    evidence_text: str = Field(description="Verbatim or structured evidence snippet proving the condition")


class RequirementDependencyItem(BaseModel):
    """Prerequisite or relational dependency on another requirement key."""
    depends_on_key: str = Field(description="Stable key of requirement that must precede or accompany this one")
    dependency_type: str = Field(default="PREREQUISITE", description="PREREQUISITE, ENHANCEMENT, MUTUAL")
    description: Optional[str] = None


class BlueprintRequirementCandidate(BaseModel):
    """
    Intermediate candidate requirement emitted by an individual security rule.
    Subject to deduplication, dependency resolution, and conflict reconciliation.
    """
    requirement_key: str = Field(description="Stable machine-readable identifier")
    title: str
    description: str
    category: str = Field(description="Controlled category: AUTHENTICATION, AUTHORIZATION, API_SECURITY, etc.")
    severity: str = Field(description="CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL")
    priority: str = Field(description="REQUIRED, RECOMMENDED, OPTIONAL")
    mandatory: bool = True
    rationale: str
    verification_strategy: List[str] = Field(default_factory=list)
    security_invariant: Optional[str] = None
    source_rule_id: str
    source_rule_version: str = "1.0.0"
    evidence: List[RequirementEvidenceItem] = Field(default_factory=list)
    dependencies: List[RequirementDependencyItem] = Field(default_factory=list)


class BlueprintEvaluationResult(BaseModel):
    """Result of running all blueprint rules against a NormalizedIntent."""
    requirements: List[BlueprintRequirementCandidate]
    risk_factors: List[str]
    evaluated_rules: List[str]
    methodology_version: str = "2026.1.0"
