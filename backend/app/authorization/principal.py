import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuthenticatedPrincipal(BaseModel):
    """
    Internal security principal passed across all authorization, policy, and execution layers.
    Never trust unverified client assertions; identity is established cryptographically.
    """
    model_config = ConfigDict(frozen=True)

    principal_id: str = Field(description="Unique subject identifier (agent UUID, user email/UUID, system string)")
    principal_type: str = Field(description="AGENT | USER | SYSTEM | SERVICE")
    agent_id: Optional[uuid.UUID] = Field(default=None, description="Bound agent ID if principal_type == AGENT")
    project_id: Optional[uuid.UUID] = Field(default=None, description="Bound project ID")
    credential_id: Optional[uuid.UUID] = Field(default=None, description="Credential ID used to authenticate")
    authentication_method: str = Field(default="AGENT_API_KEY", description="AGENT_API_KEY | JWT | SESSION | INTERNAL")
    authenticated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: Optional[uuid.UUID] = Field(default=None, description="Active MCP session ID if applicable")
    trust_level: str = Field(default="STANDARD", description="UNTRUSTED | LOW | STANDARD | ELEVATED")
    delegation_chain: List[Dict[str, Any]] = Field(default_factory=list, description="Traceable upstream delegation chain")
    delegating_agent_id: Optional[uuid.UUID] = Field(default=None, description="Immediate delegator agent if acting via delegation")
    delegation_id: Optional[uuid.UUID] = Field(default=None, description="Active delegation ID granting authority")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def is_agent(self) -> bool:
        return self.principal_type == "AGENT"

    @property
    def is_user(self) -> bool:
        return self.principal_type == "USER"
