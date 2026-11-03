from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ProductHealthItem(BaseModel):
    product: str
    name: str
    status: str  # HEALTHY, DEGRADED, DISCONNECTED, NOT_CONFIGURED, FAILED, UNKNOWN
    message: str
    details: Optional[Dict[str, Any]] = None


class HomeProductHealthResponse(BaseModel):
    items: List[ProductHealthItem]
    overall_health: str


class ActivityItem(BaseModel):
    id: str
    timestamp: datetime
    title: str
    description: Optional[str] = None
    actor: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    status: str
    severity: Optional[str] = None
    metadata: Dict[str, Any] = {}


class HomeActivityResponse(BaseModel):
    items: List[ActivityItem]
    total: int


class IncidentItem(BaseModel):
    id: str
    incident_key: str
    title: str
    severity: str
    status: str
    environment: str
    detected_at: datetime


class HomeIncidentsResponse(BaseModel):
    open: int
    investigating: int
    contained: int
    latest: Optional[IncidentItem] = None


class TrendPoint(BaseModel):
    timestamp: str
    value: int


class HomeTrendsResponse(BaseModel):
    metric: str
    window: str
    points: List[TrendPoint]
    has_sufficient_data: bool
    explanation: Optional[str] = None
