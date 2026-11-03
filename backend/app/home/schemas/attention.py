from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class AttentionItem(BaseModel):
    id: str
    severity: str
    title: str
    description: Optional[str] = None
    product: str
    resource: str
    timestamp: datetime
    status: str
    evidence_reference: Optional[str] = None
    drilldown_url: Optional[str] = None


class AttentionListResponse(BaseModel):
    items: List[AttentionItem]
    total: int
    critical_count: int
    high_count: int
