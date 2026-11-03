from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

from app.contracts.enums import (
    ContractScopeType,
    InvariantOperator,
    SubjectType,
)


class FieldRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    field: str = Field(description="Dotted path reference e.g. subject.tenant_id, resource.tenant_id")


class ValueRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: Any = Field(description="Literal constant value")


Operand = Union[FieldRef, ValueRef, Dict[str, Any], List[Any], str, int, float, bool]


class InvariantExpr(BaseModel):
    """
    Deterministic AST node for an invariant or condition expression.
    Supports atomic expressions (operator, left, right) and composite boolean operations (AND, OR, NOT).
    """
    model_config = ConfigDict(extra="forbid")

    operator: InvariantOperator = Field(description="Invariant operator")
    left: Optional[Union[FieldRef, ValueRef, Dict[str, Any], str, int, float, bool, List[Any]]] = None
    right: Optional[Union[FieldRef, ValueRef, Dict[str, Any], str, int, float, bool, List[Any]]] = None
    field: Optional[str] = Field(default=None, description="Direct field for unary operations e.g. EXISTS, NOT_EXISTS")
    conditions: Optional[List["InvariantExpr"]] = Field(default=None, description="Sub-expressions for AND/OR operators")
    operand: Optional["InvariantExpr"] = Field(default=None, description="Sub-expression for NOT operator")


InvariantExpr.model_rebuild()


class ContractScopeDecl(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: ContractScopeType = Field(default=ContractScopeType.PROJECT)
    resource: Optional[str] = None
    resource_type: Optional[str] = None
    environment: Optional[str] = None
    branch: Optional[str] = None
    scope_id: Optional[str] = None
    resource_scope: Dict[str, Any] = Field(default_factory=dict)


class ContractSubject(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(description="USER, AGENT, SERVICE, AUTHENTICATED_USER, etc.")
    id: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)


class ContractAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(description="READ, WRITE, EXECUTE, DEPLOY, TRANSFER, etc.")
    attributes: Dict[str, Any] = Field(default_factory=dict)


class ContractResource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(description="PROJECT, REPOSITORY, INVOICE, SECRET, SCAN, etc.")
    id: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)


class ContractViolationDecl(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(description="Violation classification code e.g. CROSS_TENANT_ACCESS")
    severity: str = Field(default="HIGH", description="LOW | MEDIUM | HIGH | CRITICAL")
    description: str = Field(description="Clear explanation of the security invariant breach")


class EvidenceReqDecl(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(description="Evidence requirement type e.g. AUTHORIZATION_DECISION, AUDIT_EVENT")
    source: Optional[str] = Field(default="SYSTEM")
    required: bool = Field(default=True)
    minimum_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    configuration: Dict[str, Any] = Field(default_factory=dict)


class ContractDependencyDecl(BaseModel):
    model_config = ConfigDict(extra="forbid")
    contract_key: str = Field(description="Target contract key this contract depends upon")
    dependency_type: str = Field(default="REQUIRES", description="REQUIRES | CONFLICTS_WITH | COMPOSES_WITH")


class SecurityContractDefinition(BaseModel):
    """
    Structured, machine-readable declaration of a Security Contract.
    """
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9\-_]+$", description="Semantic key e.g. tenant-isolation")
    name: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5, max_length=2000)
    schema_version: str = Field(default="1.0.0")

    scope: ContractScopeDecl = Field(default_factory=ContractScopeDecl)
    subject: Optional[ContractSubject] = None
    action: Optional[ContractAction] = None
    resource: Optional[ContractResource] = None
    context: Dict[str, Any] = Field(default_factory=dict)

    preconditions: Optional[InvariantExpr] = Field(default=None, description="Preconditions that must hold for contract to apply")
    invariant: InvariantExpr = Field(description="Primary security invariant AST that must evaluate to TRUE")
    postconditions: Optional[List[InvariantExpr]] = Field(default=None, description="Properties that must hold after operation")

    violation: ContractViolationDecl = Field(description="Defined violation when invariant evaluates to FALSE")
    evidence: Optional[Dict[str, List[EvidenceReqDecl]]] = Field(default=None, description="Required evidence sources")
    dependencies: Optional[List[ContractDependencyDecl]] = Field(default=None, description="Inter-contract dependencies")
    enforcement: Dict[str, Any] = Field(default_factory=dict, description="Enforcement mode: BLOCK, WARN, APPROVE")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def contract_key(self) -> str:
        return self.key
