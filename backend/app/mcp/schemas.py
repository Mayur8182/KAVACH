import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


from app.authorization.principal import AuthenticatedPrincipal


class AgentIdentity(BaseModel):
    """Authenticated identity of an AI Agent connecting to the MCP Gateway."""
    model_config = ConfigDict(from_attributes=True)

    agent_id: uuid.UUID
    project_id: uuid.UUID
    agent_name: str
    agent_type: str = "CODING_AGENT"
    trust_level: str = "STANDARD"
    authenticated_principal: str
    permissions: List[str] = Field(default_factory=list)


class MCPContext(BaseModel):
    """Context carried across the entire MCP tool invocation pipeline."""
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    identity: AgentIdentity
    request_id: str
    client_name: str = "unknown"
    client_version: str = "1.0.0"
    transport: str = "stdio"
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    principal: Optional[AuthenticatedPrincipal] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolDefinition(BaseModel):
    """Definition of an MCP tool registered in the gateway."""
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: str
    version: str = "1.0.0"
    category: str  # SECURITY | PROJECT | SCAN | BLUEPRINT | POLICY | GITHUB
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    risk_level: str = "LOW"  # LOW | MEDIUM | HIGH | CRITICAL
    enabled: bool = True
    requires_approval: bool = False
    required_permission: str = "PROJECT_READ"
    required_permissions: List[str] = Field(default_factory=list)
    allowed_resource_types: List[str] = Field(default_factory=list)
    minimum_trust_level: str = "LOW"
    approval_mode: str = "STANDARD"
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ToolExecutionResult(BaseModel):
    """Standardized tool execution result."""
    model_config = ConfigDict(from_attributes=True)

    status: str  # SUCCESS | FAILED | DENIED | REQUIRES_APPROVAL | NOT_CONFIGURED | NOT_FOUND | INVALID_INPUT | TIMEOUT
    data: Optional[Dict[str, Any]] = None
    message: str = ""
    error_code: Optional[str] = None
    approval_id: Optional[str] = None
    result_reference: Optional[str] = None
    execution_time_ms: float = 0.0


# Schema models for administrative REST endpoints
class MCPSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_id: uuid.UUID
    project_id: uuid.UUID
    authenticated_principal: str
    transport: str
    client_name: str
    client_version: str
    status: str
    last_activity_at: datetime
    expires_at: datetime
    created_at: datetime


class MCPToolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    version: str
    category: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    risk_level: str
    enabled: bool
    requires_approval: bool
    required_permission: str


class MCPInvocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    agent_id: uuid.UUID
    project_id: uuid.UUID
    tool_name: str
    tool_version: str
    request_id: str
    operation: str
    resource_type: str
    resource_id: Optional[str]
    authorization_decision: str
    policy_decision: str
    approval_id: Optional[uuid.UUID]
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    result_reference: Optional[str]
    input_summary: Dict[str, Any]
    output_summary: Optional[Dict[str, Any]]
    error_code: Optional[str]
    error_message: Optional[str]
    created_at: datetime


class MCPGatewayStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    server_name: str
    server_version: str
    transport: str
    active_sessions_count: int
    registered_tools_count: int
    total_invocations_count: int
    denied_invocations_count: int
    approvals_pending_count: int
