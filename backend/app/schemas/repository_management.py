import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ModuleAssignmentItem(BaseModel):
    module: str  # SAST, SCA, IAC, SECRETS, CONTAINER, DAST
    status: str  # ENABLED, OPTIONAL, NOT_ASSIGNED, DISABLED
    project_path: Optional[str] = None
    scan_on_push: bool = True
    scan_on_pr: bool = True
    last_scanned_at: Optional[datetime] = None


class RepositoryManagementItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    name: str
    full_name: str
    owner: str
    default_branch: str
    private: bool
    html_url: str
    github_status: str = "Connected"
    primary_project_path: str = "go.mod"
    findings_count: int = 0
    modules: Dict[str, str] = Field(
        default_factory=lambda: {
            "sast": "Enabled",
            "sca": "Enabled",
            "iac": "Optional",
            "secrets": "Enabled",
            "container": "Enabled",
        }
    )
    assignments: List[ModuleAssignmentItem] = Field(default_factory=list)
    last_synced_at: Optional[datetime] = None


class UpdateRepositoryModulesRequest(BaseModel):
    modules: Dict[str, str] = Field(
        description="Map of module names to statuses (ENABLED, OPTIONAL, NOT_ASSIGNED, DISABLED)"
    )


class DiscoveredProjectItem(BaseModel):
    id: str
    repository_name: str
    project_path: str
    owner: str
    default_branch: str = "main"
    language: str = "Go"
    stars: int = 12
    already_imported: bool = False
    html_url: str = ""


class DiscoverRepositoriesResponse(BaseModel):
    total_scanned: int = 0
    organization_name: str = ""
    connected_via: str = "GitHub App (SecuLayer)"
    items: List[DiscoveredProjectItem] = Field(default_factory=list)


class ImportProjectRequestItem(BaseModel):
    repository_name: str
    project_path: str
    owner: str
    selected_modules: List[str] = Field(default_factory=lambda: ["SAST", "SECRETS", "SCA"])


class ImportRepositoriesRequest(BaseModel):
    projects: List[ImportProjectRequestItem]
    project_id: Optional[str] = None


class AddCustomRepositoryRequest(BaseModel):
    repository_url: Optional[str] = Field(default=None, description="Git / GitHub repository URL or owner/name")
    repo_url: Optional[str] = Field(default=None, description="Alternative key for repository URL")
    default_branch: Optional[str] = Field(default="main", description="Target branch name")
    name: Optional[str] = Field(default=None, description="Optional custom name")
    project_id: Optional[str] = None
    selected_modules: List[str] = Field(default_factory=lambda: ["SAST", "SECRETS", "SCA", "CONTAINER"])

    @property
    def effective_url(self) -> str:
        return (self.repository_url or self.repo_url or "").strip()


class BatchDeleteRepositoriesRequest(BaseModel):
    repository_ids: List[str] = Field(..., min_length=1, description="List of repository IDs to permanently delete")

