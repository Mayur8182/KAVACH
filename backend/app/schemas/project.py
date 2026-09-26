import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    """Schema for registering a new engineering project."""
    name: str = Field(min_length=1, max_length=255, description="Project or repository name")
    description: Optional[str] = Field(default=None, description="Detailed project description")
    repository_url: Optional[str] = Field(default=None, description="Git repository URL")
    primary_language: Optional[str] = Field(default=None, description="Primary codebase language (e.g., python, typescript)")
    framework: Optional[str] = Field(default=None, description="Web/Application framework (e.g., fastapi, nextjs)")
    database_type: Optional[str] = Field(default=None, description="Database type (e.g., postgresql, redis)")
    cloud_provider: Optional[str] = Field(default=None, description="Target deployment cloud (e.g., aws, gcp)")
    environment: str = Field(default="development", description="Lifecycle environment (development, staging, production)")
    application_type: str = Field(default="web_service", description="Application category (payment_api, saas, microservice)")


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    repository_url: Optional[str] = None
    primary_language: Optional[str] = None
    framework: Optional[str] = None
    database_type: Optional[str] = None
    cloud_provider: Optional[str] = None
    environment: Optional[str] = None
    application_type: Optional[str] = None


class ProjectResponse(BaseModel):
    """Public project schema returned by API."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: Optional[str]
    repository_url: Optional[str]
    primary_language: Optional[str]
    framework: Optional[str]
    database_type: Optional[str]
    cloud_provider: Optional[str]
    environment: str
    application_type: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]
