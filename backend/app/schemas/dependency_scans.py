from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DependencyScanJobItem(BaseModel):
    id: str
    job_id: str
    repository: str
    branch: str = "main"
    scan_type: str = "Full SCA"
    status: str = "COMPLETED"
    start_time: str
    duration: str = "14s"
    vulnerabilities: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    license_issues: int = 0
    policy_violations: int = 0
    packages_scanned: int = 0
    triggered_by: str = "SecuLayer Autonomous Scanner"
    engine: str = "Trivy SCA + OSV Engine v0.58.0"


class DependencyScansDashboardResponse(BaseModel):
    total_scans: int
    successful_scans: int
    failed_scans: int
    running_scans: int
    results_by_severity: Dict[str, int] = Field(
        default_factory=lambda: {"critical": 0, "high": 0, "medium": 0, "low": 0}
    )
    scan_trend_7_runs: List[Dict[str, Any]] = Field(default_factory=list)
    status_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"success": 0, "running": 0, "failed": 0, "queued": 0}
    )
    items: List[DependencyScanJobItem] = Field(default_factory=list)
    top_repositories: List[Dict[str, Any]] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    scan_types_summary: Dict[str, int] = Field(
        default_factory=lambda: {"vulnerability": 0, "license": 0, "policy": 0, "sbom": 0}
    )


class RunNewScanRequest(BaseModel):
    repository_name: str
    branch: str = "main"
    scan_type: str = "FULL_SCA"  # VULNERABILITY, LICENSE, POLICY, SBOM, FULL_SCA
    engine: str = "Trivy SCA + OSV Engine"
    depth: str = "DEEP"  # DIRECT, DEEP
    fail_on: str = "CRITICAL"  # NONE, HIGH, CRITICAL


class RunNewScanResponse(BaseModel):
    job_id: str
    scan_id: str
    repository: str
    branch: str
    status: str
    message: str


class DependencyScanDetailResponse(BaseModel):
    id: str
    job_id: str
    repository: str
    branch: str
    scan_type: str
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    duration: str
    triggered_by: str
    engine: str
    vulnerabilities: int
    critical: int
    high: int
    medium: int
    low: int
    license_issues: int
    policy_violations: int
    packages_scanned: int
    command: Optional[str]
    stdout_summary: Optional[str]
    stderr_output: Optional[str]
    logs: List[Dict[str, Any]] = Field(default_factory=list)
    findings: List[Dict[str, Any]] = Field(default_factory=list)


class DependencyScanScheduleItem(BaseModel):
    id: str
    repository_name: str
    branch: str
    schedule_name: str
    frequency: str
    cron_expression: str
    scan_type: str
    engine: str
    active: bool
    last_run_at: Optional[str]
    last_run_status: str
    next_run_at: Optional[str]


class CreateScheduleRequest(BaseModel):
    repository_name: str
    branch: str = "main"
    schedule_name: str
    frequency: str = "DAILY"  # DAILY, WEEKLY, EVERY_6_HOURS, CUSTOM_CRON
    cron_expression: str = "0 2 * * *"
    scan_type: str = "FULL_SCA"
    engine: str = "Trivy SCA + OSV Engine"
    notify_on_failure: bool = True


class DiscoveredManifestItem(BaseModel):
    file_path: str
    ecosystem: str
    type: str  # manifest | lockfile
    dependencies_count: int


class DependencyFindingItem(BaseModel):
    id: str
    package: str
    ecosystem: str
    type: str  # Malicious | Vulnerable | Outdated
    severity: str  # Critical | High | Medium | Low
    version: str
    fixed_version: str
    status: str = "Open"  # Open | Fixed
    cve: str
    cwe: str = ""
    dependency_type: str = "Direct"
    cvss: str = "7.2 · High"
    affected_versions: str = ""
    description: str = ""
    dependency_path: List[str] = Field(default_factory=list)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    pr_title: Optional[str] = None


class DependencyFindingsResponse(BaseModel):
    findings: List[DependencyFindingItem] = Field(default_factory=list)
    fix_coverage: int = 0
    fixed_count: int = 0
    total_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    last_scan: str = "2 min ago"
    manifests: List[str] = Field(default_factory=lambda: ["package.json", "package-lock.json"])
    branch: str = "main"
    repository: str = "Mayur8182/JOB-FINDER-NEW"


class CreatePRRequest(BaseModel):
    title: str
    head_branch: str
    base_branch: str = "main"
    description: str
    auto_merge: bool = True

