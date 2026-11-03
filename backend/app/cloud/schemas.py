"""
Thing Cloud — Pydantic Response & Request Schemas
Strictly typed contracts for the Cloud product workspace.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# Primitives & Helpers
# ─────────────────────────────────────────────

class CloudCoverageMetric(BaseModel):
    discovered: int
    evaluated: int
    unknown: int
    status: str  # CONNECTED | NOT_CONNECTED | DEGRADED


class CloudFindingSeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0

    @property
    def total(self) -> int:
        return self.critical + self.high + self.medium + self.low + self.info


# ─────────────────────────────────────────────
# 1. GET /cloud/overview
# ─────────────────────────────────────────────

class CloudConnectionSummary(BaseModel):
    provider: str  # AWS, AZURE, GCP
    status: str    # CONNECTED, NOT_CONNECTED, AUTHENTICATION_FAILED, DEGRADED
    account_count: int
    last_verified_at: Optional[datetime] = None


class CloudAttentionItem(BaseModel):
    id: str
    severity: str
    title: str
    provider: str
    resource_name: str
    resource_type: str
    environment: str
    reason: str
    detected_at: datetime


class CloudOverviewResponse(BaseModel):
    generated_at: datetime
    project_id: Optional[str] = None
    cloud_accounts_count: int
    assets_total_count: int
    critical_findings_count: int
    high_findings_count: int
    providers: Dict[str, CloudConnectionSummary]
    critical_attention: List[CloudAttentionItem]
    coverage: Dict[str, CloudCoverageMetric]


# ─────────────────────────────────────────────
# 2. Connections & Providers
# ─────────────────────────────────────────────

class CloudConnectionItem(BaseModel):
    id: str
    project_id: str
    provider: str
    connection_name: str
    status: str
    authentication_method: str
    account_identifier: Optional[str] = None
    tenant_identifier: Optional[str] = None
    subscription_identifier: Optional[str] = None
    gcp_project_identifier: Optional[str] = None
    default_region: Optional[str] = None
    permissions_mode: str
    last_verified_at: Optional[datetime] = None
    last_error: Optional[str] = None
    cloud_metadata: Dict[str, Any] = {}
    created_at: datetime


class CloudConnectionsResponse(BaseModel):
    items: List[CloudConnectionItem]
    total: int


class ConnectProviderRequest(BaseModel):
    provider: str  # AWS | AZURE | GCP
    connection_name: str
    authentication_method: str
    account_identifier: Optional[str] = None
    tenant_identifier: Optional[str] = None
    subscription_identifier: Optional[str] = None
    gcp_project_identifier: Optional[str] = None
    default_region: Optional[str] = "us-east-1"
    credentials_payload: Optional[Dict[str, Any]] = None  # Processed in memory, never stored in plaintext


# ─────────────────────────────────────────────
# 3. Cloud Assets
# ─────────────────────────────────────────────

class CloudAssetItem(BaseModel):
    id: str
    project_id: str
    cloud_connection_id: str
    provider: str
    resource_type: str
    provider_resource_id: str
    resource_name: str
    resource_uri: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    account_id: Optional[str] = None
    status: str
    environment: str = "PRODUCTION"
    exposure: str = "INTERNAL"  # PUBLIC | INTERNAL | UNKNOWN
    security_state: str = "HEALTHY"  # HEALTHY | ATTENTION | CRITICAL | UNKNOWN
    violations_count: int = 0
    tags: Dict[str, Any] = {}
    discovered_at: datetime
    last_seen_at: datetime


from app.schemas.pagination import PaginationMeta


class CloudAssetsResponse(BaseModel):
    items: List[CloudAssetItem]
    total: int
    limit: int
    offset: int
    has_more: bool
    pagination: Optional[PaginationMeta] = None


class CloudAssetDetailResponse(BaseModel):
    id: str
    project_id: str
    cloud_connection_id: str
    provider: str
    resource_type: str
    provider_resource_id: str
    resource_name: str
    resource_uri: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    account_id: Optional[str] = None
    status: str
    environment: str
    exposure: str
    security_state: str
    reasons: List[str] = []
    tags: Dict[str, Any] = {}
    labels: Dict[str, Any] = {}
    configuration: Dict[str, Any] = {}
    findings: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    evidence_provenance: Optional[Dict[str, Any]] = None
    discovered_at: datetime
    last_seen_at: datetime


# ─────────────────────────────────────────────
# 4. Cloud Findings
# ─────────────────────────────────────────────

class CloudFindingItem(BaseModel):
    id: str
    project_id: str
    cloud_resource_id: str
    resource_name: str
    resource_type: str
    provider: str
    account_id: Optional[str] = None
    finding_type: str  # PUBLIC_EXPOSURE, MISCONFIGURATION, IAM, STORAGE, NETWORK, etc.
    severity: str      # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status: str        # OPEN, RESOLVED, FALSE_POSITIVE, SUPPRESSED
    rule_id: str
    title: str
    description: Optional[str] = None
    environment: str = "PRODUCTION"
    observed_value: Optional[Dict[str, Any]] = None
    expected_value: Optional[Dict[str, Any]] = None
    evidence_id: Optional[str] = None
    detected_at: datetime


class CloudFindingsResponse(BaseModel):
    items: List[CloudFindingItem]
    total: int
    limit: int
    offset: int
    has_more: bool
    pagination: Optional[PaginationMeta] = None


class CloudFindingDetailResponse(BaseModel):
    id: str
    project_id: str
    cloud_resource_id: str
    resource_name: str
    resource_type: str
    provider_resource_id: str
    provider: str
    account_id: Optional[str] = None
    region: Optional[str] = None
    environment: str
    finding_type: str
    severity: str
    status: str
    rule_id: str
    title: str
    description: str
    configuration_path: Optional[str] = None
    observed_value: Optional[Any] = None
    expected_value: Optional[Any] = None
    remediation_guidance: Optional[str] = None
    evidence_source: str
    evidence_id: Optional[str] = None
    attack_path_summary: Optional[str] = None
    detected_at: datetime
    raw_metadata: Dict[str, Any] = {}


# ─────────────────────────────────────────────
# 5. Cloud IAM
# ─────────────────────────────────────────────

class CloudIAMPrincipalItem(BaseModel):
    id: str
    provider: str
    principal_type: str  # USER, ROLE, SERVICE_ACCOUNT, GROUP
    provider_principal_id: str
    principal_name: str
    arn_or_uri: Optional[str] = None
    is_admin: bool
    mfa_enabled: Optional[bool] = None
    permissions_count: int = 0
    risk_level: str = "LOW"  # CRITICAL | HIGH | MEDIUM | LOW
    discovered_at: datetime


class CloudIAMResponse(BaseModel):
    principals: List[CloudIAMPrincipalItem]
    roles_count: int
    policies_count: int
    admin_principals_count: int
    unused_permissions_count: int
    toxic_combinations: List[Dict[str, Any]] = []


# ─────────────────────────────────────────────
# 6. Cloud Network
# ─────────────────────────────────────────────

class CloudNetworkItem(BaseModel):
    id: str
    provider: str
    network_name: str
    provider_network_id: str
    cidr_block: Optional[str] = None
    region: Optional[str] = None
    subnets_count: int = 0
    public_subnets_count: int = 0
    is_default: bool = False


class CloudNetworkResponse(BaseModel):
    networks: List[CloudNetworkItem]
    public_resources_count: int
    critical_exposures_count: int
    security_groups_count: int
    open_management_ports_count: int  # SSH 22, RDP 3389 open to 0.0.0.0/0


# ─────────────────────────────────────────────
# 7. Cloud Storage
# ─────────────────────────────────────────────

class CloudStorageItem(BaseModel):
    id: str
    provider: str
    name: str
    storage_type: str  # S3, AZURE_BLOB, GCS
    region: Optional[str] = None
    public_access_blocked: bool
    encryption_enabled: bool
    versioning_enabled: bool
    logging_enabled: bool
    contains_sensitive_data: bool = False
    security_status: str  # HEALTHY | ATTENTION | CRITICAL


class CloudStorageResponse(BaseModel):
    items: List[CloudStorageItem]
    total_buckets: int
    unencrypted_count: int
    publicly_accessible_count: int


# ─────────────────────────────────────────────
# 8. Cloud Databases
# ─────────────────────────────────────────────

class CloudDatabaseItem(BaseModel):
    id: str
    provider: str
    name: str
    engine: str  # postgres, mysql, aurora, cosmos, rds
    version: Optional[str] = None
    region: Optional[str] = None
    is_publicly_accessible: bool
    storage_encrypted: bool
    backup_retention_days: int
    multi_az: bool
    security_status: str


class CloudDatabaseResponse(BaseModel):
    items: List[CloudDatabaseItem]
    total_databases: int
    publicly_exposed_count: int
    unencrypted_count: int


# ─────────────────────────────────────────────
# 9. Kubernetes & Docker Workspaces
# ─────────────────────────────────────────────

class CloudKubernetesClusterItem(BaseModel):
    id: str
    provider: str  # EKS, AKS, GKE, SELF_HOSTED
    cluster_name: str
    status: str
    version: Optional[str] = None
    nodes_count: int = 0
    namespaces_count: int = 0
    workloads_count: int = 0
    rbac_strict: bool = True
    network_policies_active: bool = False
    open_findings_count: int = 0


class CloudKubernetesResponse(BaseModel):
    clusters: List[CloudKubernetesClusterItem]
    total_clusters: int


class CloudDockerImageItem(BaseModel):
    id: str
    image_name: str
    tag: str
    digest: str
    registry: str
    sbom_available: bool
    vulnerabilities_critical: int
    vulnerabilities_high: int
    signature_verified: bool
    provenance_verified: bool
    last_scanned_at: Optional[datetime] = None


class CloudDockerResponse(BaseModel):
    images: List[CloudDockerImageItem]
    total_images: int


# ─────────────────────────────────────────────
# 10. IaC & Drift
# ─────────────────────────────────────────────

class CloudIaCItem(BaseModel):
    id: str
    repository_name: str
    framework: str  # TERRAFORM, CLOUDFORMATION, K8S
    file_path: str
    resource_type: str
    resource_name: str
    policy_name: str
    severity: str
    status: str  # VIOLATED | COMPLIANT | DRIFTED
    proposed_remediation: Optional[str] = None


class CloudIaCResponse(BaseModel):
    items: List[CloudIaCItem]
    total_checks: int
    drifted_resources_count: int


# ─────────────────────────────────────────────
# 11. Exposures & Attack Paths & Blast Radius
# ─────────────────────────────────────────────

class CloudExposureItem(BaseModel):
    id: str
    resource_name: str
    resource_type: str
    provider: str
    environment: str
    public_ip: Optional[str] = None
    port: Optional[str] = None
    service_type: str
    path_summary: str
    severity: str


class CloudExposuresResponse(BaseModel):
    items: List[CloudExposureItem]
    total_exposures: int
    critical_exposures: int


class CloudAttackPathItem(BaseModel):
    id: str
    title: str
    entry_point: str
    target_asset: str
    confidence: str  # VERIFIED | PARTIAL | UNKNOWN
    blast_radius_score: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    provenance: str


class CloudAttackPathsResponse(BaseModel):
    items: List[CloudAttackPathItem]
    total: int


class BlastRadiusNode(BaseModel):
    id: str
    label: str
    type: str  # RESOURCE | IDENTITY | DATA | NETWORK
    reachability: str  # DIRECT | TRANSITIVE | CONDITIONAL
    risk_level: str


class CloudBlastRadiusResponse(BaseModel):
    starting_asset: str
    reachable_resources_count: int
    reachable_sensitive_data: bool
    reachable_identities_count: int
    nodes: List[BlastRadiusNode]
    edges: List[Dict[str, Any]]


# ─────────────────────────────────────────────
# 12. Compliance & Remediation & Evidence
# ─────────────────────────────────────────────

class CloudComplianceFramework(BaseModel):
    framework_id: str  # CIS_AWS, SOC2, ISO27001, PCI_DSS, NIST_CSF
    framework_name: str
    version: str
    satisfied_controls: int
    violated_controls: int
    total_controls: int
    status: str  # SATISFIED | VIOLATED | PARTIALLY_SATISFIED | NOT_EVALUATED


class CloudComplianceResponse(BaseModel):
    frameworks: List[CloudComplianceFramework]
    total_requirements: int
    satisfied_count: int
    violated_count: int


class CloudRemediationJobItem(BaseModel):
    id: str
    finding_id: str
    resource_name: str
    action_type: str
    status: str  # PROPOSED | APPROVAL_REQUIRED | APPROVED | EXECUTING | COMPLETED | FAILED
    requested_by: str
    requested_at: datetime
    approval_required: bool
    verified_at: Optional[datetime] = None
    error: Optional[str] = None


class CloudRemediationResponse(BaseModel):
    jobs: List[CloudRemediationJobItem]
    total: int


class CloudEvidenceItem(BaseModel):
    id: str
    source: str        # AWS_API | AZURE_API | GCP_API | K8S_API | TERRAFORM
    observed_property: str
    current_value: str
    expected_value: str
    resource_id: str
    resource_name: str
    policy_id: Optional[str] = None
    verification_status: str  # VERIFIED | VIOLATED | UNKNOWN
    recorded_at: datetime
    raw_payload: Optional[Dict[str, Any]] = None


class CloudEvidenceResponse(BaseModel):
    items: List[CloudEvidenceItem]
    total: int
    limit: int
    offset: int
