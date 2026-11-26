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


class TriggerIndexRequest(BaseModel):
    branch: Optional[str] = Field(default="main", description="Target git branch to index")
    commit_sha: Optional[str] = Field(default=None, description="Exact Git commit SHA")
    force_full: bool = Field(default=False, description="Whether to bypass incremental sync and force full re-indexing")


class RepositoryContextResponse(BaseModel):
    repository_id: str
    repository_name: str
    status: str
    commit_sha: Optional[str] = None
    branch: str = "main"
    understanding_score: int = 0
    project: str = ""
    languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    database: List[str] = Field(default_factory=list)
    orm_libraries: List[str] = Field(default_factory=list)
    auth_mechanisms: List[str] = Field(default_factory=list)
    external_integrations: List[str] = Field(default_factory=list)
    architecture: str = "Modular Application"
    modules: List[str] = Field(default_factory=list)
    entryPoints: List[str] = Field(default_factory=list)
    total_files_indexed: int = 0
    total_symbols_indexed: int = 0
    total_endpoints_mapped: int = 0
    total_dependencies_mapped: int = 0
    total_modules_identified: int = 0
    metrics: Dict[str, Any] = Field(default_factory=dict)
    last_indexed_at: Optional[str] = None


class RepositoryArchitectureResponse(BaseModel):
    project_purpose: str = ""
    architecture_style: str = ""
    frontend_frameworks: List[str] = Field(default_factory=list)
    backend_frameworks: List[str] = Field(default_factory=list)
    database_technologies: List[str] = Field(default_factory=list)
    orm_libraries: List[str] = Field(default_factory=list)
    auth_mechanisms: List[str] = Field(default_factory=list)
    external_integrations: List[str] = Field(default_factory=list)
    modules: List[Dict[str, Any]] = Field(default_factory=list)
    execution_entry_points: List[str] = Field(default_factory=list)
    understanding_metrics: Dict[str, Any] = Field(default_factory=dict)


class RepositoryDependencyItem(BaseModel):
    source: str
    target: str
    type: str
    is_external: bool
    file_path: str


class RepositorySyncStatusResponse(BaseModel):
    repository_id: str
    repository_name: str
    has_snapshot: bool
    status: str
    last_commit_sha: Optional[str] = None
    understanding_score: int = 0
    last_synced_at: Optional[str] = None
    recent_sync_events: List[Dict[str, Any]] = Field(default_factory=list)


