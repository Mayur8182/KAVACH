import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HotspotSummaryResponse(BaseModel):
    total: int = Field(..., description="Total detected security hotspots")
    review: int = Field(..., description="Hotspots pending review")
    in_review: int = Field(default=0, description="Hotspots currently under active investigation")
    confirmed_risk: int = Field(default=0, description="Hotspots confirmed as actual security risk")
    acknowledged: int = Field(..., description="Hotspots acknowledged with accepted risk")
    safe: int = Field(..., description="Hotspots manually verified safe")
    fixed: int = Field(..., description="Hotspots remediated and verified fixed")
    false_positive: int = Field(default=0, description="Hotspots marked false positive")
    high_priority: int = Field(default=0, description="High and Critical priority hotspots")
    medium_priority: int = Field(default=0, description="Medium priority hotspots")
    low_priority: int = Field(default=0, description="Low priority hotspots")
    by_category: List[Dict[str, Any]] = Field(default_factory=list)
    by_severity: Dict[str, int] = Field(default_factory=dict)
    by_status: Dict[str, int] = Field(default_factory=dict)
    by_repository: List[Dict[str, Any]] = Field(default_factory=list)


class HotspotListItem(BaseModel):
    id: str
    display_id: str
    title: str
    file: str
    file_path: str
    category: str
    severity: str
    risk_level: str
    status: str
    detected: str
    created_at: Optional[str] = None
    lines: str
    branch: str
    repository: str
    assignee: str
    rule_id: Optional[str] = None
    cwe: Optional[str] = None
    owasp: Optional[str] = None


class HotspotListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[HotspotListItem]


class HotspotDetailResponse(BaseModel):
    id: str
    display_id: str
    title: str
    description: str
    severity: str
    risk_level: str
    category: str
    file_path: str
    branch: str
    commit_sha: Optional[str] = None
    start_line: int
    end_line: int
    code_snippet: Optional[str] = None
    status: str
    assignee_user_id: Optional[str] = None
    assignee_name: Optional[str] = None
    author: Optional[str] = None
    review_comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    cvss_score: Optional[str] = None
    confidence: str = "High"
    exploit_maturity: str = "High"
    references: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str
    updated_at: str
    reviewed_at: Optional[str] = None
    repository_name: Optional[str] = "frontend-app"
    comments: List[Dict[str, Any]] = Field(default_factory=list)
    history: List[Dict[str, Any]] = Field(default_factory=list)


class HotspotCodeLine(BaseModel):
    line_number: int
    content: str
    is_dangerous: bool
    is_hotspot: bool


class HotspotCodeResponse(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    context_start_line: int
    context_end_line: int
    lines: List[HotspotCodeLine]
    full_content: str
    branch: str
    commit_sha: Optional[str] = None
    github_url: str


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="Target review status: TO_REVIEW, IN_REVIEW, CONFIRMED_RISK, SAFE, FALSE_POSITIVE, FIXED, FIXED_VERIFIED, ACKNOWLEDGED")
    comment: Optional[str] = Field(None, description="Mandatory or recommended review justification comment")


class AssignUserRequest(BaseModel):
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    user_id: Optional[str] = None


class AddCommentRequest(BaseModel):
    comment: str = Field(..., description="Review comment text")


class CreateIssueRequest(BaseModel):
    tracker: Optional[str] = "github"
    provider: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class TriggerScanRequest(BaseModel):
    target_path: Optional[str] = None
    branch: str = "main"
