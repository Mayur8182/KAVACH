"""
Schemas for Background Task Queue System (AGENTS.md Rule 12)
Tracks asynchronous jobs: QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskCreateRequest(BaseModel):
    task_type: str = Field(..., description="Type of asynchronous job (e.g. CONTAINER_TRIVY_SCAN, SBOM_SYFT_GENERATE, REPOSITORY_SCAN)")
    project_id: Optional[str] = Field(None, description="Associated project UUID")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Job parameters and arguments")
    priority: int = Field(default=0, ge=0, le=10, description="Priority level: 0 (Normal) to 10 (Urgent)")


class TaskResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    task_type: str
    status: str
    priority: int = 0
    progress_percent: int = 0
    current_step: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    result: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    exit_code: Optional[int] = None
    worker_id: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    queued_count: int = 0
    running_count: int = 0
    completed_count: int = 0
    failed_count: int = 0
    page: int = 1
    page_size: int = 20


class TaskCancelResponse(BaseModel):
    task_id: str
    status: str
    message: str


class TaskRetryResponse(BaseModel):
    new_task_id: str
    original_task_id: str
    status: str
    message: str
