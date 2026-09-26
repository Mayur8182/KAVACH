import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditEventResponse(BaseModel):
    """Schema for audit trail events."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    actor_type: str
    actor_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    status: str
    timestamp: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="event_metadata")
    error_message: Optional[str] = None
