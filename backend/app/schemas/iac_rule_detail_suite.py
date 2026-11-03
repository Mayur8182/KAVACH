"""
Pydantic Schemas for IaC Rule Detail Suite — Section 7 (Screens 7.1 through 7.8)
Authoritative contracts for Rule Detail, Definition, AST Logic, Risk/CVSS,
Compliance Mappings, Affected Resources, Exceptions, and Version History.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# 7.1 Rule Detail - Overview Schemas
# ============================================================================

class RuleDetailKpis(BaseModel):
    total_findings: int = Field(24, description="Total findings identified across repositories")
    open_findings: int = Field(18, description="Currently unresolved findings")
    resolved_findings: int = Field(5, description="Remediated/fixed findings")
    suppressed_findings: int = Field(1, description="Findings with active suppression or policy exception")


class RuleInformation(BaseModel):
    rule_id: str = Field(..., description="Unique rule identifier, e.g. IAC-AWS-001")
    rule_name: str = Field(..., description="Human-readable rule title")
    category: str = Field("Storage", description="Resource category, e.g. Storage, IAM, Network")
    provider: str = Field("AWS", description="Cloud or IaC provider, e.g. AWS, Azure, GCP, Kubernetes")
    service: str = Field("S3", description="Specific service, e.g. S3, EC2, RDS, IAM")
    severity: str = Field("Critical", description="Critical, High, Medium, Low")
    rule_type: str = Field("Misconfiguration", description="Misconfiguration, Compliance, Secret, Best Practice")
    frameworks: List[str] = Field(default_factory=list, description="Associated frameworks, e.g. CIS AWS, NIST 800-53")
    status: str = Field("Enabled", description="Enabled or Disabled")
    last_updated: str = Field(..., description="Last modification timestamp, e.g. Sep 25, 2026, 10:14 AM")
    version: str = Field("v2.3.0", description="Semantic rule version")


class RuleDetailOverviewResponse(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    description: str
    kpis: RuleDetailKpis
    rule_info: RuleInformation


# ============================================================================
# 7.2 Rule Definition Schemas
# ============================================================================

class RuleReferenceLink(BaseModel):
    title: str = Field(..., description="Reference title")
    url: str = Field(..., description="Authoritative reference documentation link")


class RuleDefinitionResponse(BaseModel):
    rule_id: str
    title: str
    description: str
    rationale: str
    impact: str
    recommendation: str
    references: List[RuleReferenceLink]
    labels: List[str]


# ============================================================================
# 7.3 Rule Logic / AST Schemas
# ============================================================================

class RuleLogicEngineSpec(BaseModel):
    engine_id: str = Field(..., description="Engine ID: terraform_checkov, cloudformation, kubernetes, others")
    engine_label: str = Field(..., description="Display label: Terraform (Checkov), CloudFormation, etc.")
    format: str = Field("yaml", description="Format: yaml, json, rego")
    ast_code: str = Field(..., description="Detection logic YAML / AST rule body")
    test_resource_type: str = Field("Terraform", description="Terraform, CloudFormation, Kubernetes")
    test_resource_code: str = Field(..., description="Non-compliant sample test snippet")


class RuleLogicResponse(BaseModel):
    rule_id: str
    active_engine: str
    engines: List[RuleLogicEngineSpec]


# ============================================================================
# 7.4 Severity & Risk Schemas
# ============================================================================

class RiskTrendMonth(BaseModel):
    month: str
    value: int


class RuleRiskDetailsResponse(BaseModel):
    rule_id: str
    severity: str
    severity_description: str
    likelihood: str
    impact: str
    risk_score: float
    cvss_score: float
    cvss_rating: str
    data_sensitivity: str
    business_impact: str
    exploitability: str
    risk_factors: List[str]
    risk_trend: List[RiskTrendMonth]


# ============================================================================
# 7.5 Framework Mappings Schemas
# ============================================================================

class ComplianceMappingItem(BaseModel):
    id: str
    framework: str
    control_id: str
    control_name: str
    status: str = Field("Mapped", description="Mapped, Pending, Not Applicable")


class RelatedRequirementDTO(BaseModel):
    framework: str
    control_id: str
    title: str
    description: str
    requirement_url: str


class RuleFrameworkMappingsResponse(BaseModel):
    rule_id: str
    mappings: List[ComplianceMappingItem]
    related_requirement: RelatedRequirementDTO


# ============================================================================
# 7.6 Affected Resources Schemas
# ============================================================================

class AffectedResourceItem(BaseModel):
    id: str
    resource: str
    resource_type: str
    environment: str
    region: str
    status: str = Field(..., description="Failed, Passed, Suppressed")
    last_seen: str


class AffectedResourcesKpis(BaseModel):
    total_resources: int
    non_compliant: int
    compliant: int
    suppressed: int


class AffectedResourcesPageResponse(BaseModel):
    kpis: AffectedResourcesKpis
    items: List[AffectedResourceItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    environments: List[str]
    regions: List[str]
    statuses: List[str]


# ============================================================================
# 7.7 Exceptions Schemas
# ============================================================================

class RuleExceptionItem(BaseModel):
    id: str
    rule_id: str
    resource: str
    reason: str
    expires_at: str
    status: str = Field("Active", description="Active, Expired, Pending Review")
    created_at: str
    created_by: str = Field("devsecops-admin", description="User who filed exception")


class RuleExceptionsKpis(BaseModel):
    active_exceptions: int
    expired: int
    pending_review: int


class RuleExceptionsPageResponse(BaseModel):
    kpis: RuleExceptionsKpis
    items: List[RuleExceptionItem]
    total: int


class CreateRuleExceptionRequest(BaseModel):
    resource: str = Field(..., min_length=2, description="Target resource identifier, e.g. my-bucket")
    reason: str = Field(..., min_length=5, description="Justification for policy exception")
    expires_at: str = Field(..., description="Expiration date string e.g. Oct 15, 2026")


# ============================================================================
# 7.8 Rule History Schemas
# ============================================================================

class RuleHistoryItem(BaseModel):
    version: str
    date: str
    changes: str
    updated_by: str


class RuleHistoryResponse(BaseModel):
    rule_id: str
    items: List[RuleHistoryItem]


# ============================================================================
# Actions & Scan Trigger Schemas
# ============================================================================

class TriggerRuleScanRequest(BaseModel):
    environment: Optional[str] = Field("production", description="Target environment")


class TriggerRuleScanResponse(BaseModel):
    rule_id: str
    scan_job_id: str
    status: str = Field("QUEUED", description="QUEUED, RUNNING, COMPLETED")
    started_at: str
    message: str
