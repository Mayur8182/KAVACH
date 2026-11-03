import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DelegationAuthority(BaseModel):
    """Authority payload to delegate to another agent."""
    actions: List[str] = Field(min_length=1, description="Authorized action names e.g. ['SCAN_EXECUTE', 'FINDING_READ']")
    resource_type: str = Field(default="PROJECT", description="Target resource type e.g. PROJECT, REPOSITORY")
    resource_scope: Dict[str, Any] = Field(default_factory=dict, description="Resource identifiers e.g. {'project_id': '...'}")
    environment: str = Field(default="DEVELOPMENT", description="DEVELOPMENT | TEST | STAGING | PRODUCTION")
    branch_scope: Optional[List[str]] = Field(default=None, description="Allowed branches e.g. ['feature/*', 'main']")
    constraints: Dict[str, Any] = Field(default_factory=dict, description="Additional custom execution constraints")
    allow_further_delegation: bool = Field(default=False, description="Whether receiving agent may further delegate this authority")


class DelegationCreateRequest(BaseModel):
    """Schema for requesting a new agent-to-agent delegation."""
    delegate_agent_id: uuid.UUID = Field(description="Receiving agent ID")
    authority: DelegationAuthority
    expires_at: datetime = Field(description="Expiration timestamp for delegated authority")
    allow_further_delegation: bool = Field(default=False)
    reason: str = Field(min_length=3, max_length=1000, description="Justification for delegation")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Structured condition DSL (e.g. {'all': [...]})")
    parent_delegation_id: Optional[uuid.UUID] = Field(default=None, description="Optional parent delegation in multi-hop chain")


class DelegationResponse(BaseModel):
    """Public schema for an Agent Delegation."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    delegator_agent_id: uuid.UUID
    delegate_agent_id: uuid.UUID
    project_id: uuid.UUID
    status: str
    starts_at: datetime
    expires_at: datetime
    reason: str
    allow_further_delegation: bool
    authority_snapshot: Dict[str, Any]
    scope: Dict[str, Any]
    conditions: Dict[str, Any]
    delegation_depth: int
    created_by: str
    created_by_type: str
    approval_id: Optional[uuid.UUID] = None
    parent_delegation_id: Optional[uuid.UUID] = None
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[str] = None
    revocation_reason: Optional[str] = None
    created_at: datetime


class AuthorityEdgeResponse(BaseModel):
    """Represents a directed authority edge in the graph."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    delegation_id: uuid.UUID
    source_agent_id: uuid.UUID
    target_agent_id: uuid.UUID
    project_id: uuid.UUID
    authority: Dict[str, Any]
    scope: Dict[str, Any]
    status: str
    depth: int
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class AuthorityGraphNode(BaseModel):
    """Node in the Authority Graph."""
    id: str
    name: str
    agent_type: str
    status: str
    trust_level: str
    project_id: str


class AuthorityGraphResponse(BaseModel):
    """Full Authority Graph response."""
    project_id: uuid.UUID
    nodes: List[AuthorityGraphNode]
    edges: List[AuthorityEdgeResponse]
    total_edges: int


class AuthorityChainItem(BaseModel):
    """Single step in an authority chain."""
    step: int
    source_agent_id: str
    source_agent_name: str
    target_agent_id: str
    target_agent_name: str
    delegation_id: str
    authority: Dict[str, Any]
    status: str
    expires_at: Optional[datetime] = None


class AuthorityChainResponse(BaseModel):
    """Reconstructed authority chain from root principal to executing agent."""
    agent_id: uuid.UUID
    agent_name: str
    project_id: uuid.UUID
    chain: List[AuthorityChainItem]
    root_principal: str


class EffectiveAuthorityItem(BaseModel):
    """An effective operational capability with full provenance."""
    action: str
    resource_type: str
    source_type: str  # DIRECT_ROLE | DELEGATION
    source_agent_id: Optional[uuid.UUID] = None
    source_agent_name: Optional[str] = None
    delegation_id: Optional[uuid.UUID] = None
    role_name: Optional[str] = None
    scope: Dict[str, Any]
    expires_at: Optional[datetime] = None
    allow_further_delegation: bool = False
    depth: int = 0


class EffectiveAuthorityResponse(BaseModel):
    """Consolidated effective authority profile for an agent."""
    agent_id: uuid.UUID
    agent_name: str
    project_id: uuid.UUID
    status: str
    trust_level: str
    effective_permissions: List[EffectiveAuthorityItem]
    total_effective_actions: int


class DataFlowCreateRequest(BaseModel):
    """Request for data movement between agents."""
    destination_agent_id: uuid.UUID
    data: Dict[str, str] = Field(description="Must contain 'type' and 'classification' (PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE, SECRET, RESTRICTED)")
    source_resource: Dict[str, str] = Field(description="Must contain 'type' and optional 'id'")
    purpose: str = Field(min_length=3, max_length=500)


class DataFlowResponse(BaseModel):
    """Audit and decision response for an agent data flow."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_agent_id: uuid.UUID
    destination_agent_id: uuid.UUID
    project_id: uuid.UUID
    data_type: str
    classification: str
    source_resource_type: str
    source_resource_id: Optional[str] = None
    purpose: str
    status: str
    decision: str
    reason_code: str
    reason: str
    approval_id: Optional[uuid.UUID] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
