"""
Thing Data — DSPM Pydantic Schemas
"""

import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ── Data Store ────────────────────────────────────────────────────────

class DataStoreItem(BaseModel):
    id: str
    project_id: str
    name: str
    store_type: str
    provider: str
    location: Optional[str]
    region: Optional[str]
    environment: str
    sensitivity: str
    classification_labels: List[str]
    encryption_at_rest: Optional[str]
    encryption_in_transit: Optional[str]
    public_access: str
    mfa_delete: Optional[bool]
    versioning_enabled: Optional[bool]
    backup_enabled: Optional[bool]
    audit_logging_enabled: Optional[bool]
    record_count: Optional[int]
    size_bytes: Optional[int]
    sensitive_record_count: Optional[int]
    pii_field_count: Optional[int]
    compliance_status: str
    last_compliance_check: Optional[datetime]
    compliance_frameworks: List[str]
    discovery_source: str
    last_scanned: Optional[datetime]
    scan_status: str
    tags: Dict[str, Any]
    owner_team: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataStoreListResponse(BaseModel):
    items: List[DataStoreItem]
    total: int
    limit: int
    offset: int


class CreateDataStoreRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=512)
    store_type: str
    provider: str = "AWS"
    location: Optional[str] = None
    region: Optional[str] = None
    environment: str = "production"
    owner_team: Optional[str] = None
    tags: Dict[str, Any] = Field(default_factory=dict)
    project_id: Optional[str] = None


class UpdateDataStoreRequest(BaseModel):
    name: Optional[str] = None
    owner_team: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    sensitivity: Optional[str] = None
    compliance_frameworks: Optional[List[str]] = None


# ── Data Inventory ────────────────────────────────────────────────────

class DataInventoryItem(BaseModel):
    id: str
    project_id: str
    data_store_id: str
    field_name: Optional[str]
    table_name: Optional[str]
    data_type: str
    data_subtype: Optional[str]
    sample_count: Optional[int]
    confidence: float
    is_masked: bool
    is_encrypted: bool
    has_access_control: bool
    risk_score: float
    policy_violations: List[str]
    detected_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DataInventoryListResponse(BaseModel):
    items: List[DataInventoryItem]
    total: int
    limit: int
    offset: int


# ── Data Flow ─────────────────────────────────────────────────────────

class DataFlowItem(BaseModel):
    id: str
    project_id: str
    source_service: str
    destination_service: str
    data_classification: str
    protocol: str
    policy_result: str
    policy_id: Optional[str]
    bytes_transferred: Optional[int]
    latency_ms: Optional[int]
    is_encrypted: bool
    is_authorized: bool
    observed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DataFlowListResponse(BaseModel):
    items: List[DataFlowItem]
    total: int


# ── Classification Policy ─────────────────────────────────────────────

class DataClassificationPolicyItem(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str]
    data_types: List[str]
    action: str
    severity: str
    enabled: bool
    conditions: Dict[str, Any]
    exceptions: List[Any]
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataClassificationPolicyListResponse(BaseModel):
    items: List[DataClassificationPolicyItem]
    total: int


class CreateClassificationPolicyRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    data_types: List[str] = Field(default_factory=list)
    action: str = "ALERT"
    severity: str = "HIGH"
    enabled: bool = True
    conditions: Dict[str, Any] = Field(default_factory=dict)
    project_id: Optional[str] = None


# ── Scan Job ──────────────────────────────────────────────────────────

class DataScanJobItem(BaseModel):
    id: str
    project_id: str
    data_store_id: str
    status: str
    scanner_type: str
    triggered_by: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    records_scanned: Optional[int]
    sensitive_records_found: Optional[int]
    policy_violations_found: Optional[int]
    error_message: Optional[str]
    scan_summary: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class TriggerScanRequest(BaseModel):
    data_store_id: str
    scanner_type: str = "DSPM"
    project_id: Optional[str] = None


# ── Overview ──────────────────────────────────────────────────────────

class DataOverviewMetrics(BaseModel):
    total_stores: int
    compliant_stores: int
    non_compliant_stores: int
    stores_pending_scan: int
    total_sensitive_records: int
    total_pii_fields: int
    critical_stores: int
    high_risk_flows: int
    active_policies: int
    recent_violations: int


class DataOverviewResponse(BaseModel):
    metrics: DataOverviewMetrics
    stores_by_type: Dict[str, int]
    stores_by_sensitivity: Dict[str, int]
    compliance_breakdown: Dict[str, int]
    recent_scans: List[DataScanJobItem]
