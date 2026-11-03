from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class HomeScope(BaseModel):
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    environment_id: Optional[str] = None


class AttentionSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class IncidentsSummary(BaseModel):
    open: int = 0
    investigating: int = 0
    contained: int = 0
    closed: int = 0


class CoverageMetric(BaseModel):
    covered: int = 0
    total: int = 0
    unit: str = "items"


class HomeOverviewResponse(BaseModel):
    generated_at: datetime
    scope: HomeScope
    attention: AttentionSummary
    incidents: IncidentsSummary
    coverage: Dict[str, CoverageMetric]


class SecurityStateFactor(BaseModel):
    code: str
    value: int
    description: str


class SecurityStateMethodology(BaseModel):
    version: str = "security-state-v1"
    description: str = "Deterministic evaluation based on open findings, active incidents, degraded connectors, and unverified controls."


class SecurityStateResponse(BaseModel):
    state: str = Field(description="HEALTHY, ATTENTION, CRITICAL, or UNKNOWN")
    reason_codes: List[str]
    factors: List[SecurityStateFactor]
    evidence_count: int
    calculated_at: datetime
    methodology: SecurityStateMethodology
