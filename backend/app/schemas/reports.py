"""
Kavach Security Platform — Reporting Schemas
Authoritative schemas for the 13 Enterprise Security Reports catalogue,
on-demand generation payloads, and export metadata.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import uuid


class ReportKeyMetric(BaseModel):
    measure: str
    value: Any
    definition_or_source: str


class ScopeItem(BaseModel):
    item: str
    value: str


class RemediationAction(BaseModel):
    priority: str
    action: str
    owner: str
    due_date: str
    status: str


class SourceManifestEntry(BaseModel):
    source_type: str
    source_id_version: str
    timestamp: str
    status: str


class CryptographicProvenance(BaseModel):
    canonical_payload_hash: str
    signature_algorithm: str = "HMAC-SHA256"
    signing_key_id: str = "kavach-deterministic-authority-v1"
    signature_verification: str = "VERIFIED"
    report_generator_version: str = "Kavach Engine 2.4.0 (Build 20261115)"


class ReportCatalogueItem(BaseModel):
    report_id: str = Field(..., description="Canonical ID, e.g. KAV-RPT-01")
    name: str
    subtitle: str
    priority: str = Field(..., description="P0, P1, or P2")
    product_area: str
    primary_output: str
    supported_formats: List[str]
    purpose: str
    authoritative_data_sources: List[str]
    generation_trigger: str
    audience: List[str]
    data_quality_notice: str


class ReportCatalogueResponse(BaseModel):
    total_reports: int
    standards_version: str = "Kavach Security Reporting Spec v2.4 (12-Section Architecture)"
    reports: List[ReportCatalogueItem]


class GenerateReportRequest(BaseModel):
    report_id: str = Field(..., description="Report ID, e.g. KAV-RPT-01 or KAV-RPT-02")
    format: str = Field("PDF", description="PDF, HTML, JSON, CSV, SARIF, or CYCLONEDX")
    project_id: Optional[str] = None
    repository: Optional[str] = None
    branch: Optional[str] = "main"
    timeframe: Optional[str] = Field("30d", description="7d, 30d, 90d, or 1y")
    resource_id: Optional[str] = None
    severity_filter: Optional[str] = None
    status_filter: Optional[str] = None


class GeneratedReportResponse(BaseModel):
    report_uuid: str
    report_id: str
    title: str
    format: str
    status: str = "READY"
    generated_at_utc: str
    download_url: str
    preview_url: Optional[str] = None
    provenance_hash: str
    total_findings: int = 0
    executive_posture_score: Optional[int] = None

