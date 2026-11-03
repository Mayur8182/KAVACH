"""
Thing SAST — Findings Module Schemas
Strict typing for Finding List, Filters, Search, Severity, Status, Category & Repository,
Detail, Actions, and Exports.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SecurityFindingItem(BaseModel):
    id: str
    display_id: str
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    repository_id: Optional[str] = None
    repository: str
    branch: str
    pull_request_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    status: str    # Open, In Progress, Resolved, False Positive, Ignored
    category: str  # Injection, XSS, Path Traversal, Deserialization, Security Misconfig, Data Exposure, Cryptography, Other
    rule_id: str
    cwe_id: Optional[str] = None
    owasp_category: Optional[str] = None
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    line_number: Optional[int] = None
    code_snippet: Optional[str] = None
    snippet: Optional[str] = None
    detected_at: Optional[str] = None
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    assigned_to: Optional[str] = None
    author: Optional[str] = None
    fingerprint: Optional[str] = None
    confidence: Optional[str] = "HIGH"
    remediation: Optional[str] = None
    scanner: Optional[str] = "semgrep"
    scan_id: Optional[str] = None
    commit_sha: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


from app.schemas.pagination import PaginationMeta


class FindingListResponse(BaseModel):
    items: List[SecurityFindingItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    pagination: Optional[PaginationMeta] = None


class CategoryMatrixRow(BaseModel):
    category: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class RepositoryMatrixRow(BaseModel):
    repository: str
    total: int
    critical: int
    high: int
    medium: int
    low: int


class FindingSummaryResponse(BaseModel):
    total_findings: int
    severity_counts: Dict[str, int]
    status_counts: Dict[str, int]
    category_counts: Dict[str, int]
    repository_counts: Dict[str, int]
    branch_counts: Dict[str, int]
    rule_counts: Dict[str, int]
    author_counts: Dict[str, int]


class SeverityViewResponse(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    items: List[SecurityFindingItem]
    page: int
    page_size: int
    total_pages: int


class StatusViewResponse(BaseModel):
    total: int
    open: int
    in_progress: int
    resolved: int
    false_positive: int
    ignored: int
    items: List[SecurityFindingItem]
    page: int
    page_size: int
    total_pages: int


class CategoryViewResponse(BaseModel):
    total_findings: int
    rows: List[CategoryMatrixRow]


class RepositoryViewResponse(BaseModel):
    total_findings: int
    rows: List[RepositoryMatrixRow]


class AssignFindingRequest(BaseModel):
    assigned_to: str


class ChangeStatusRequest(BaseModel):
    status: str
    resolution_note: Optional[str] = None


class CreateIssueRequest(BaseModel):
    integration: Optional[str] = "github"
    title: Optional[str] = None
    description: Optional[str] = None
    labels: Optional[List[str]] = Field(default_factory=lambda: ["security", "vulnerability"])


class CreateIssueResponse(BaseModel):
    success: bool
    status: str  # "CREATED", "NOT_CONFIGURED", "ERROR"
    issue_id: Optional[str] = None
    issue_url: Optional[str] = None
    integration: str
    message: str


class CreatePRResponse(BaseModel):
    success: bool
    status: str
    pr_id: Optional[str] = None
    pr_url: Optional[str] = None
    message: str
