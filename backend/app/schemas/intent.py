import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.engines.intent.models import NormalizedIntent


class IntentSubmitRequest(BaseModel):
    """Schema for submitting raw developer intent for automated architectural extraction."""
    project_id: uuid.UUID = Field(description="Target project UUID")
    description: str = Field(
        min_length=5,
        max_length=5000,
        description="Raw unmodified natural-language developer intent/instruction",
    )
    environment: str = Field(default="development", description="Lifecycle environment (development, staging, production)")
    preferred_provider: Optional[str] = Field(default=None, description="Optional provider override ('deterministic', 'ollama')")


class IntentResponse(BaseModel):
    """Schema for retrieved developer intent analysis result."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    raw_input: str = Field(description="Exact raw developer input preserved verbatim")
    environment: str
    application_type: str
    purpose: str
    normalized_intent: NormalizedIntent = Field(description="Structured architectural normalization")
    status: str
    provider: str
    model_name: Optional[str] = None
    overall_confidence: float
    created_at: datetime
    updated_at: datetime
