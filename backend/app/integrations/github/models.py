import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GitHubAppStatus(BaseModel):
    """Reflects real GitHub App configuration & connectivity status."""
    configured: bool
    status: str = Field(description="CONFIGURED | NOT_CONFIGURED | AUTHENTICATION_FAILED | ERROR")
    app_id: Optional[str] = None
    app_name: Optional[str] = None
    client_id: Optional[str] = None
    public_url: Optional[str] = None
    message: Optional[str] = None


class GitHubRepoInfo(BaseModel):
    """Normalized GitHub repository metadata retrieved from GitHub REST API."""
    id: int
    owner: str
    name: str
    full_name: str
    default_branch: str = "main"
    private: bool = True
    html_url: str
    clone_url: str
    ssh_url: Optional[str] = None
    visibility: str = "private"
    archived: bool = False
    permissions: Optional[Dict[str, bool]] = None


class GitHubPullRequestInfo(BaseModel):
    """Normalized GitHub pull request metadata from GitHub API."""
    id: int
    number: int
    title: str
    state: str
    head_sha: str
    base_sha: str
    head_ref: str
    base_ref: str
    author_login: Optional[str] = None
    draft: bool = False
    merged: bool = False
    html_url: str


class GitHubCommitInfo(BaseModel):
    """Normalized commit metadata from GitHub API."""
    sha: str
    branch: Optional[str] = None
    author_login: Optional[str] = None
    message: Optional[str] = None
    committed_at: Optional[datetime] = None


class GitHubCheckRunOutput(BaseModel):
    title: str
    summary: str
    text: Optional[str] = None


class GitHubCheckRunCreate(BaseModel):
    name: str = "Security Control Plane / Policy Check"
    head_sha: str
    status: str = "queued"  # queued, in_progress, completed
    conclusion: Optional[str] = None  # success, failure, neutral, action_required, cancelled, timed_out
    details_url: Optional[str] = None
    output: Optional[GitHubCheckRunOutput] = None


class GitHubCheckRunUpdate(BaseModel):
    status: Optional[str] = None
    conclusion: Optional[str] = None
    output: Optional[GitHubCheckRunOutput] = None
    completed_at: Optional[str] = None


class WebhookEventContext(BaseModel):
    """Parsed and validated GitHub webhook delivery context."""
    delivery_id: str
    event_type: str
    action: Optional[str] = None
    installation_id: Optional[int] = None
    repository_id: Optional[int] = None
    repository_full_name: Optional[str] = None
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    pull_request_number: Optional[int] = None
    sender_login: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
