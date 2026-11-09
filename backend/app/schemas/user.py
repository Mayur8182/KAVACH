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
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    """JWT bearer token response."""
    access_token: str
    token_type: str = "bearer"
