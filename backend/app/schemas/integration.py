from typing import Optional, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class IntegrationBase(BaseModel):
    provider: str = Field(..., description="Provider name (e.g., github, aws, gcp, azure)")
    project_id: uuid.UUID = Field(..., description="ID of the project this integration belongs to")

class IntegrationCreate(IntegrationBase):
    credentials_json: str = Field(default="{}", description="JSON string containing credentials")
    is_connected: bool = Field(default=False)

class IntegrationUpdate(BaseModel):
    credentials_json: Optional[str] = None
    is_connected: Optional[bool] = None

class IntegrationResponse(IntegrationBase):
    id: uuid.UUID
    is_connected: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
