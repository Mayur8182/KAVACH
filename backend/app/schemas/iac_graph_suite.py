"""
Pydantic Schemas for IaC Infrastructure Graph Suite — Section 12 (Screens 12.1 through 12.8)
Authoritative schemas for Infrastructure Overview, Resource Graph, Resource Detail,
Risk View, Relationships, Blast Radius, Change History, and Graph Settings.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# 12.1 Infrastructure Graph Overview Schemas
# ============================================================================

class GraphOverviewKpis(BaseModel):
    total_resources: int = Field(268, description="Total detected infrastructure resources")
    high_risk: int = Field(42, description="Resources with high severity risk")
    medium_risk: int = Field(86, description="Resources with medium risk")
    low_risk: int = Field(140, description="Resources with low risk")


class GraphNodeItem(BaseModel):
    id: str
    name: str
    category: str = Field(..., description="Compute, Storage, Database, Networking, Security, Identity, Other")
    subtext: str
    risk_level: str = Field("Low", description="Critical, High, Medium, Low")
    x: float
    y: float
    cloud_provider: Optional[str] = Field("AWS", description="AWS, Azure, GCP")
    symbol: Optional[str] = Field(None, description="Specific cloud service icon key")


class GraphEdgeItem(BaseModel):
    source: str
    target: str
    label: Optional[str] = None


class GraphOverviewResponse(BaseModel):
    repository: str
    environment: str
    latest_scan_date: str
    kpis: GraphOverviewKpis
    nodes: List[GraphNodeItem]
    edges: List[GraphEdgeItem]
    cloud_provider: Optional[str] = Field("AWS", description="Detected or requested cloud provider")


# ============================================================================
# 12.2 Resource Graph Schemas
# ============================================================================

class ResourceTreeNode(BaseModel):
    id: str
    name: str
    type: str
    category: str
    risk_level: str
    cloud_provider: Optional[str] = Field("AWS")
    symbol: Optional[str] = None
    parent_id: Optional[str] = None
    children: List["ResourceTreeNode"] = Field(default_factory=list)


class ResourceGraphResponse(BaseModel):
    repository: str
    environment: str
    resource_type_filter: str
    root_nodes: List[ResourceTreeNode]


# ============================================================================
# 12.3 Resource Detail Schemas
# ============================================================================

class ResourceTagItem(BaseModel):
    key: str
    value: str


class RiskBreakdownCounts(BaseModel):
    critical: int = Field(2)
    high: int = Field(4)
    medium: int = Field(2)
    low: int = Field(0)


class ConfigStatusCheck(BaseModel):
    label: str
    value: str
    is_compliant: bool = Field(True)


class ResourceDetailResponse(BaseModel):
    resource_id: str
    name: str
    display_title: str = Field("EKS Cluster")
    resource_type: str = Field("AWS EKS Cluster")
    arn: str = Field("arn:aws:eks:ap-south-1:123:cluster/eks-prod")
    region: str = Field("ap-south-1 (Mumbai)")
    environment: str = Field("production")
    repository: str = Field("infrastructure")
    file_path: str = Field("infra/eks/main.tf")
    created_at: str = Field("Sep 12, 2026, 10:24 AM")
    last_updated: str = Field("Sep 28, 2026, 04:11 PM")
    tags: List[ResourceTagItem]
    risk_level: str = Field("High")
    open_findings_count: int = Field(8)
    risk_breakdown: RiskBreakdownCounts
    config_status: List[ConfigStatusCheck]


# ============================================================================
# 12.4 Risk View Schemas
# ============================================================================

class RiskViewNodeItem(BaseModel):
    id: str
    name: str
    risk_level: str = Field(..., description="Critical, High, Medium, Low")
    findings_count: int
    x: float
    y: float
    category: Optional[str] = Field("Compute")
    cloud_provider: Optional[str] = Field("AWS")
    symbol: Optional[str] = None


class RiskViewResponse(BaseModel):
    repository: str
    environment: str
    nodes: List[RiskViewNodeItem]
    edges: List[GraphEdgeItem]
    cloud_provider: Optional[str] = Field("AWS")


# ============================================================================
# 12.5 Relationships Schemas
# ============================================================================

class RelationshipItem(BaseModel):
    id: str
    source_resource: str
    source_id: str
    relationship: str
    target_resource: str
    target_id: str
    risk_impact: str = Field(..., description="High, Medium, Low")
    cloud_provider: Optional[str] = Field("AWS")


class RelationshipsPageResponse(BaseModel):
    items: List[RelationshipItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    relationship_types: List[str]
    cloud_provider: Optional[str] = Field("AWS")


# ============================================================================
# 12.6 Blast Radius Schemas
# ============================================================================

class BlastRadiusSummary(BaseModel):
    total_affected: int = Field(12)
    critical: int = Field(2)
    high: int = Field(6)
    medium: int = Field(3)
    low: int = Field(1)


class BlastRadiusNode(BaseModel):
    id: str
    name: str
    type: str
    risk_level: str
    level: int = Field(1, description="Depth level: 0 (root), 1 (direct), 2 (indirect)")
    parent_id: Optional[str] = None
    cloud_provider: Optional[str] = Field("AWS")
    symbol: Optional[str] = None


class BlastRadiusResponse(BaseModel):
    target_resource_id: str
    target_resource_name: str
    summary: BlastRadiusSummary
    nodes: List[BlastRadiusNode]
    cloud_provider: Optional[str] = Field("AWS")


# ============================================================================
# 12.7 Change History Schemas
# ============================================================================

class ChangeHistoryItem(BaseModel):
    id: str
    time: str
    resource: str
    resource_type: str
    change_type: str = Field(..., description="Modified, Created, Deleted, No Change")
    user: str
    details: str


class ChangeHistoryPageResponse(BaseModel):
    items: List[ChangeHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    available_resources: List[str]


# ============================================================================
# 12.8 Graph Settings Schemas
# ============================================================================

class VisualizationSettingsDTO(BaseModel):
    default_view: str = Field("Logical View")
    show_resource_labels: bool = Field(True)
    show_relationships: bool = Field(True)
    group_by_environment: bool = Field(False)
    show_risk_indicators: bool = Field(True)


class AnalysisSettingsDTO(BaseModel):
    include_external_resources: bool = Field(True)
    enable_blast_radius_analysis: bool = Field(True)
    maximum_depth: int = Field(3)
    show_deprecated_resources: bool = Field(False)


class ExportSettingsDTO(BaseModel):
    export_format: str = Field("PNG")


class GraphSettingsDTO(BaseModel):
    visualization: VisualizationSettingsDTO = Field(default_factory=VisualizationSettingsDTO)
    analysis: AnalysisSettingsDTO = Field(default_factory=AnalysisSettingsDTO)
    export: ExportSettingsDTO = Field(default_factory=ExportSettingsDTO)


class ExportGraphRequest(BaseModel):
    view: str = Field("Logical View")
    format: str = Field("PNG")


class ExportGraphResponse(BaseModel):
    download_url: str
    format: str
    generated_at: str
    message: str
