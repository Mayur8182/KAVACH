"""
Thing Attack — Pydantic Schemas
Strict schemas for offensive security surface, DAST runs, pentests, attack paths, and verifiable evidence.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Overview Schemas ──────────────────────────────────────────────

class AttackOverviewMetrics(BaseModel):
    exposed_assets: int
    tested_assets: int
    verified_issues: int
    attack_paths: int


class CriticalExploitabilityItem(BaseModel):
    id: str
    title: str
    target: str
    severity: str
    exploitability: str
    attack_type: str
    detected_at: str
    has_evidence: bool


class AttackSurfaceBreakdown(BaseModel):
    domains: int
    apis: int
    services: int
    cloud_assets: int
    containers: int
    kubernetes: int


class RecentTestItem(BaseModel):
    id: str
    test_type: str  # DAST, PENTEST, API_DISCOVERY
    target: str
    environment: str
    status: str
    progress: int
    findings_count: int
    started_at: Optional[str] = None
    duration_ms: Optional[int] = None


class RecentAttackActivityItem(BaseModel):
    id: str
    event_type: str
    title: str
    target: str
    severity: Optional[str] = None
    status: str
    timestamp: str


class AttackOverviewResponse(BaseModel):
    metrics: AttackOverviewMetrics
    critical_exploitability: List[CriticalExploitabilityItem]
    attack_surface_breakdown: AttackSurfaceBreakdown
    recent_tests: List[RecentTestItem]
    recent_activity: List[RecentAttackActivityItem]
    has_targets: bool


# ── Asset Schemas ────────────────────────────────────────────────

class AttackAssetItem(BaseModel):
    id: str
    project_id: str
    name: str
    asset_type: str
    environment: str
    exposure: str
    technology: Optional[str] = None
    target_url: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    last_seen: Optional[str] = None
    last_tested: Optional[str] = None
    risk_level: str
    status: str
    ownership: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)



from app.schemas.pagination import PaginationMeta


class AttackAssetListResponse(BaseModel):
    items: List[AttackAssetItem]
    total: int
    pagination: Optional[PaginationMeta] = None


class CreateAttackAssetRequest(BaseModel):
    name: str
    asset_type: str = Field(..., description="DOMAIN, SUBDOMAIN, IP, WEB_APP, API, GRAPHQL, SERVICE, CLOUD_ASSET, CONTAINER, K8S_SERVICE")
    environment: str = "production"
    exposure: str = "INTERNET"
    technology: Optional[str] = None
    target_url: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    ownership: Optional[str] = None
    project_id: Optional[str] = None


class AttackAssetDetailResponse(BaseModel):
    asset: AttackAssetItem
    endpoints_count: int
    findings_count: int
    attack_paths_count: int
    tests_count: int
    technologies: List[str]
    endpoints: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    attack_paths: List[Dict[str, Any]]
    recent_tests: List[Dict[str, Any]]
    activity_timeline: List[Dict[str, Any]]


# ── API Inventory & Discovery Schemas ────────────────────────────

class AttackApiEndpointItem(BaseModel):
    id: str
    project_id: str
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None
    path: str
    method: str
    auth_type: str
    discovery_source: str
    api_category: str
    risk_level: str
    test_status: str
    last_seen: Optional[str] = None
    last_tested: Optional[str] = None


class AttackApiEndpointListResponse(BaseModel):
    items: List[AttackApiEndpointItem]
    total: int
    pagination: Optional[PaginationMeta] = None


class AttackApiEndpointDetailResponse(BaseModel):
    endpoint: AttackApiEndpointItem
    parameters: List[Dict[str, Any]]
    request_schema: Dict[str, Any]
    response_schema: Dict[str, Any]
    data_access: List[str]
    dependencies: List[str]
    security_checks: Dict[str, Any]
    findings: List[Dict[str, Any]]
    attack_paths: List[Dict[str, Any]]
    recent_evidence: List[Dict[str, Any]]


class TriggerDiscoveryRequest(BaseModel):
    source: str = Field(default="OPENAPI", description="OPENAPI, REPOSITORY, GATEWAY, RUNTIME_TRAFFIC, CRAWLER")
    target: str = Field(..., description="Target URL, repo ID, or gateway spec")
    project_id: Optional[str] = None


class AttackDiscoveryRunItem(BaseModel):
    id: str
    source: str
    target: str
    status: str
    endpoints_discovered: int
    shadow_apis_detected: int
    zombie_apis_detected: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    logs: List[str]
    error_message: Optional[str] = None


class AttackDiscoveryRunListResponse(BaseModel):
    items: List[AttackDiscoveryRunItem]
    total: int


# ── DAST Schemas ─────────────────────────────────────────────────

class StartDastRunRequest(BaseModel):
    target_url: str
    environment: str = "production"
    test_profile: str = "OWASP_TOP_10"
    auth_config: Dict[str, Any] = Field(default_factory=dict)
    scope: Dict[str, Any] = Field(default_factory=dict)
    safety_policy: Dict[str, Any] = Field(
        default_factory=lambda: {"max_rate_limit": 50, "destructive_testing": False, "allowed_methods": ["GET", "POST", "PUT"]}
    )
    project_id: Optional[str] = None


class AttackDastRunItem(BaseModel):
    id: str
    project_id: str
    target_url: str
    environment: str
    status: str
    progress_percentage: int
    test_profile: str
    endpoints_discovered: int
    endpoints_tested: int
    findings_count: int
    requires_approval: bool
    is_approved: bool
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    raw_logs: List[str]
    error_reason: Optional[str] = None


class AttackDastRunListResponse(BaseModel):
    items: List[AttackDastRunItem]
    total: int


# ── Pentest Schemas ──────────────────────────────────────────────

class CreatePentestRequest(BaseModel):
    name: str
    environment: str = "production"
    description: Optional[str] = None
    scope: Dict[str, Any] = Field(
        default_factory=lambda: {
            "allowed_domains": [],
            "allowed_ips": [],
            "allowed_endpoints": [],
            "excluded_targets": [],
        }
    )
    rules_of_engagement: Dict[str, Any] = Field(
        default_factory=lambda: {
            "allowed_techniques": ["SQLI", "SSRF", "AUTH_BYPASS", "BOLA_IDOR"],
            "forbidden_techniques": ["DOS", "BRUTE_FORCE_CREDS"],
            "max_request_rate": 30,
            "max_execution_time_minutes": 60,
            "production_restrictions": True,
            "data_handling_policy": "REDACT_ALL_SECRETS",
        }
    )
    test_modules: List[str] = Field(
        default_factory=lambda: ["SQLI", "SSRF", "BOLA_IDOR", "AUTH_BYPASS", "RATE_LIMIT_ABUSE"]
    )
    project_id: Optional[str] = None


class AttackPentestItem(BaseModel):
    id: str
    project_id: str
    name: str
    environment: str
    status: str
    description: Optional[str] = None
    scope: Dict[str, Any]
    rules_of_engagement: Dict[str, Any]
    test_modules: List[str]
    requires_approval: bool
    approved_by: Optional[str] = None
    findings_count: int
    attack_paths_count: int
    launched_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str


class AttackPentestListResponse(BaseModel):
    items: List[AttackPentestItem]
    total: int


class AttackPentestDetailResponse(BaseModel):
    pentest: AttackPentestItem
    findings: List[Dict[str, Any]]
    attack_paths: List[Dict[str, Any]]
    evidence_items: List[Dict[str, Any]]
    audit_timeline: List[Dict[str, Any]]


# ── Attack Paths Schemas ─────────────────────────────────────────

class AttackPathNode(BaseModel):
    id: str
    label: str
    node_type: str  # INTERNET, PUBLIC_API, AUTH_WEAKNESS, SERVICE, PRIVILEGED_IDENTITY, DATABASE, SENSITIVE_DATA
    provenance: str  # OBSERVED, CONFIGURED, INFERRED, VERIFIED
    metadata: Optional[Dict[str, Any]] = None


class AttackPathEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    provenance: str  # OBSERVED, CONFIGURED, INFERRED, VERIFIED


class AttackPathItem(BaseModel):
    id: str
    project_id: str
    finding_id: Optional[str] = None
    title: str
    risk_score: float
    criticality: str
    nodes: List[AttackPathNode]
    edges: List[AttackPathEdge]
    target_asset: Optional[str] = None
    blast_radius: Optional[str] = None
    mitre_techniques: List[str]
    verified: bool
    created_at: str


class AttackPathListResponse(BaseModel):
    items: List[AttackPathItem]
    total: int


# ── Findings Schemas ─────────────────────────────────────────────

class AttackFindingItem(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    severity: str
    exploitability: str
    attack_type: str
    retest_status: str
    target_url: Optional[str] = None
    asset_id: Optional[str] = None
    endpoint_id: Optional[str] = None
    has_evidence: bool
    created_at: str


class AttackFindingListResponse(BaseModel):
    items: List[AttackFindingItem]
    total: int


class AttackFindingDetailResponse(BaseModel):
    finding: AttackFindingItem
    reproduction_steps: Optional[str] = None
    remediation_guidance: Optional[str] = None
    related_code: Dict[str, Any]
    related_cloud_resource: Dict[str, Any]
    related_runtime_event: Dict[str, Any]
    evidence: Optional[Dict[str, Any]] = None
    attack_path: Optional[AttackPathItem] = None
    retest_history: List[Dict[str, Any]]


class RetestFindingResponse(BaseModel):
    finding_id: str
    retest_job_id: str
    status: str
    message: str


# ── Evidence Schemas ─────────────────────────────────────────────

class AttackEvidenceItemSchema(BaseModel):
    id: str
    project_id: str
    finding_id: Optional[str] = None
    evidence_type: str
    source: str
    target_url: str
    request_headers: Dict[str, Any]
    request_payload: Optional[str] = None
    response_status: Optional[int] = None
    response_headers: Dict[str, Any]
    response_body_redacted: Optional[str] = None
    trace_id: Optional[str] = None
    verification_method: Optional[str] = None
    is_redacted: bool
    observed_at: str


class AttackEvidenceListResponse(BaseModel):
    items: List[AttackEvidenceItemSchema]
    total: int


# ── Schedules, Reports, Policies Schemas ─────────────────────────

class AttackScheduleItem(BaseModel):
    id: str
    name: str
    test_type: str
    frequency: str
    cron_expression: Optional[str] = None
    target_url: Optional[str] = None
    is_active: bool
    last_run_at: Optional[str] = None
    next_run_at: Optional[str] = None
    created_at: str


class AttackScheduleListResponse(BaseModel):
    items: List[AttackScheduleItem]
    total: int


class CreateScheduleRequest(BaseModel):
    name: str
    test_type: str
    frequency: str
    cron_expression: Optional[str] = None
    target_url: Optional[str] = None
    project_id: Optional[str] = None


class AttackReportItem(BaseModel):
    id: str
    title: str
    report_type: str
    status: str
    summary: Optional[str] = None
    metrics: Dict[str, Any]
    file_format: str
    download_url: Optional[str] = None
    generated_at: str


class AttackReportListResponse(BaseModel):
    items: List[AttackReportItem]
    total: int


class CreateReportRequest(BaseModel):
    title: str
    report_type: str
    file_format: str = "JSON"
    project_id: Optional[str] = None


class AttackPolicyItem(BaseModel):
    id: str
    name: str
    policy_type: str
    rules: Dict[str, Any]
    is_enforced: bool
    created_at: str


class AttackPolicyListResponse(BaseModel):
    items: List[AttackPolicyItem]
    total: int


class CreatePolicyRequest(BaseModel):
    name: str
    policy_type: str
    rules: Dict[str, Any]
    is_enforced: bool = True
    project_id: Optional[str] = None
