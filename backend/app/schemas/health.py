from datetime import datetime
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field


class LivenessResponse(BaseModel):
    """Process liveness probe response."""
    status: str = Field(default="ok", description="Process execution status")
    timestamp: datetime = Field(description="Current UTC timestamp")


class DependencyHealth(BaseModel):
    """Health status and diagnosis for a single infrastructure dependency."""
    status: str = Field(description="'healthy' | 'unhealthy' | 'not_configured'")
    latency_ms: Optional[float] = Field(default=None, description="Roundtrip check latency in milliseconds")
    details: Optional[str] = Field(default=None, description="Detailed diagnostic or error message")


class ReadinessResponse(BaseModel):
    """Infrastructure readiness probe response."""
    status: str = Field(description="'ready' | 'not_ready'")
    timestamp: datetime = Field(description="Current UTC timestamp")
    dependencies: Dict[str, DependencyHealth] = Field(description="Status of all external dependencies")


class HealthResponse(BaseModel):
    """General platform health and operational metadata."""
    app_name: str = Field(description="Name of the running application")
    environment: str = Field(description="Runtime environment")
    version: str = Field(default="1.0.0", description="API version")
    status: str = Field(description="'operational' | 'degraded'")
    timestamp: datetime = Field(description="Current UTC timestamp")
    dependencies: Dict[str, DependencyHealth] = Field(description="Subsystem health statuses")
