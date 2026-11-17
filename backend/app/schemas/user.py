import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for registering a new user."""
    email: EmailStr = Field(description="Unique email address")
    password: str = Field(min_length=8, description="User password (min 8 characters)")
    name: str = Field(min_length=1, max_length=255, description="Full display name")


class UserLogin(BaseModel):
    """Schema for authenticating a user."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    is_superuser: bool
    is_verified: bool = False
    onboarding_completed: bool = False
    auth_provider: Optional[str] = "oauth"
    github_user_id: Optional[str] = None
    google_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_state: Optional[dict] = None
    github_installed: bool = False
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    """JWT bearer token response."""
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
