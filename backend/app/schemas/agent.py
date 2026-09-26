import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AgentCreate(BaseModel):
    """Schema for registering an AI coding or automation agent to a project."""
    project_id: uuid.UUID = Field(description="Target project to bind agent")
    name: str = Field(min_length=1, max_length=255, description="Unique agent identifier/name")
    agent_type: str = Field(default="coding_assistant", description="Type of agent (coding_assistant, test_agent, deployer)")
    description: Optional[str] = Field(default=None, description="Scope and responsibilities of agent")
    status: str = Field(default="active", description="Operational status (active, disabled, pending)")
    trust_level: str = Field(default="restricted", description="Security clearance (restricted, standard, elevated)")


class AgentUpdate(BaseModel):
    """Schema for updating agent status, clearance, or properties."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    trust_level: Optional[str] = None


class AgentResponse(BaseModel):
    """Public agent schema returned by API."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    agent_type: str
    description: Optional[str]
    status: str
    trust_level: str
    created_at: datetime
    updated_at: datetime
