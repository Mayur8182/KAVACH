from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from pydantic import BaseModel, Field


class DecisionType(str, Enum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    BLOCK = "BLOCK"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"
    NOT_EVALUATED = "NOT_EVALUATED"


class PolicyScopeType(str, Enum):
    PROJECT = "PROJECT"
    ENVIRONMENT = "ENVIRONMENT"
    OPERATION = "OPERATION"
    GLOBAL = "GLOBAL"


class OperatorType(str, Enum):
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    IN = "IN"
    NOT_IN = "NOT_IN"
    GREATER_THAN = "GREATER_THAN"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN = "LESS_THAN"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
    EXISTS = "EXISTS"
    NOT_EXISTS = "NOT_EXISTS"
    MATCHES = "MATCHES"


class ConditionCriterion(BaseModel):
    operator: OperatorType = OperatorType.EQUALS
    value: Any = None


# Flexible criterion value: can be a simple literal (e.g. "CRITICAL") or a ConditionCriterion object
CriterionField = Union[ConditionCriterion, str, int, float, bool, List[Any]]


class FindingCondition(BaseModel):
    severity: Optional[CriterionField] = None
    status: Optional[CriterionField] = None
    scanner_type: Optional[CriterionField] = None
    rule_id: Optional[CriterionField] = None
    vulnerability_id: Optional[CriterionField] = None


class RequirementCondition(BaseModel):
    status: Optional[CriterionField] = None
    priority: Optional[CriterionField] = None
    severity: Optional[CriterionField] = None
    mandatory: Optional[CriterionField] = None
    requirement_key: Optional[CriterionField] = None
    category: Optional[CriterionField] = None


class RuleWhen(BaseModel):
    finding: Optional[FindingCondition] = None
    requirement: Optional[RequirementCondition] = None
    environment: Optional[CriterionField] = None
    operation: Optional[CriterionField] = None
    actor_type: Optional[CriterionField] = None
    actor_id: Optional[CriterionField] = None
    resource_type: Optional[CriterionField] = None
    application_type: Optional[CriterionField] = None


class RuleDefinition(BaseModel):
    name: str
    description: Optional[str] = None
    when: RuleWhen
    decision: DecisionType
    priority: int = 100
    message: Optional[str] = None


class PolicyScopeDefinition(BaseModel):
    environment: Optional[str] = None
    operation: Optional[str] = None
    resource_type: Optional[str] = None


class PolicyDefinition(BaseModel):
    name: str
    description: str
    scope: Optional[PolicyScopeDefinition] = None
    fail_closed: DecisionType = DecisionType.BLOCK
    priority: int = 100
    rules: List[RuleDefinition] = Field(default_factory=list)


# Context models for evaluation
class ActorContext(BaseModel):
    type: str = "USER"  # USER, AI_AGENT, SYSTEM, SERVICE
    id: str
    name: Optional[str] = None
    roles: List[str] = Field(default_factory=list)


class OperationContext(BaseModel):
    type: str  # DEPLOY, MERGE, PUSH, EXECUTE_TOOL, ACCESS_SECRET, MODIFY_INFRASTRUCTURE, SCAN
    id: Optional[str] = None
    environment: str = "development"  # development, staging, production
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DecisionContext(BaseModel):
    actor: ActorContext
    operation: OperationContext
    project_id: str
    environment: str = "development"
    blueprint_id: Optional[str] = None
    scan_id: Optional[str] = None
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    verifications: List[Dict[str, Any]] = Field(default_factory=list)
    requirements: List[Dict[str, Any]] = Field(default_factory=list)
    context_snapshot: Dict[str, Any] = Field(default_factory=dict)


class EvidenceItem(BaseModel):
    evidence_type: str  # FINDING, REQUIREMENT, ENVIRONMENT, ACTOR, RESOURCE, POLICY_RULE
    source_type: str    # SECURITY_FINDING, REQUIREMENT_VERIFICATION, BLUEPRINT_REQUIREMENT, SCAN_TARGET, CONTEXT
    source_id: Optional[str] = None
    attribute: str
    observed_value: Any
    expected_condition: str
    effect: str
    rule_name: Optional[str] = None
    policy_version_id: Optional[str] = None


class MatchedRule(BaseModel):
    rule_name: str
    policy_name: str
    policy_version_id: str
    decision: DecisionType
    rationale: str
    priority: int = 100
    evidence_items: List[EvidenceItem] = Field(default_factory=list)


class DecisionResult(BaseModel):
    decision: DecisionType
    reason: str
    policy_version_ids: List[str] = Field(default_factory=list)
    matched_rules: List[MatchedRule] = Field(default_factory=list)
    unmatched_rules: List[str] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SimulationResult(BaseModel):
    decision: DecisionType
    reason: str
    policy_version_ids: List[str] = Field(default_factory=list)
    matched_rules: List[MatchedRule] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    simulated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    would_block: bool = False
    would_require_approval: bool = False
    would_warn: bool = False
    would_allow: bool = False
