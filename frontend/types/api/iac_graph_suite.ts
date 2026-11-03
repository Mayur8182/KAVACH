/**
 * TypeScript interfaces for IaC Infrastructure Graph Suite — Section 12 (Screens 12.1 through 12.8)
 */

// ============================================================================
// 12.1 Infrastructure Graph Overview
// ============================================================================

export interface GraphOverviewKpis {
  total_resources: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface GraphNodeItem {
  id: string;
  name: string;
  category: 'Compute' | 'Storage' | 'Database' | 'Networking' | 'Security' | 'Identity' | 'Other' | string;
  subtext: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  x: number;
  y: number;
  cloud_provider?: string;
  symbol?: string;
}

export interface GraphEdgeItem {
  source: string;
  target: string;
  label?: string;
}

export interface GraphOverviewResponse {
  repository: string;
  environment: string;
  latest_scan_date: string;
  kpis: GraphOverviewKpis;
  nodes: GraphNodeItem[];
  edges: GraphEdgeItem[];
  cloud_provider?: string;
}

// ============================================================================
// 12.2 Resource Graph
// ============================================================================

export interface ResourceTreeNode {
  id: string;
  name: string;
  type: string;
  category: string;
  risk_level: string;
  parent_id?: string;
  cloud_provider?: string;
  symbol?: string;
  children: ResourceTreeNode[];
}

export interface ResourceGraphResponse {
  repository: string;
  environment: string;
  resource_type_filter: string;
  root_nodes: ResourceTreeNode[];
}

// ============================================================================
// 12.3 Resource Detail
// ============================================================================

export interface ResourceTagItem {
  key: string;
  value: string;
}

export interface RiskBreakdownCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ConfigStatusCheck {
  label: string;
  value: string;
  is_compliant: boolean;
}

export interface ResourceDetailResponse {
  resource_id: string;
  name: string;
  display_title: string;
  resource_type: string;
  arn: string;
  region: string;
  environment: string;
  repository: string;
  file_path: string;
  created_at: string;
  last_updated: string;
  tags: ResourceTagItem[];
  risk_level: string;
  open_findings_count: number;
  risk_breakdown: RiskBreakdownCounts;
  config_status: ConfigStatusCheck[];
  cloud_provider?: string;
}

// ============================================================================
// 12.4 Risk View
// ============================================================================

export interface RiskViewNodeItem {
  id: string;
  name: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  findings_count: number;
  x: number;
  y: number;
  category?: string;
  cloud_provider?: string;
  symbol?: string;
}

export interface RiskViewResponse {
  repository: string;
  environment: string;
  nodes: RiskViewNodeItem[];
  edges: GraphEdgeItem[];
  cloud_provider?: string;
}

// ============================================================================
// 12.5 Relationships
// ============================================================================

export interface RelationshipItem {
  id: string;
  source_resource: string;
  source_id: string;
  relationship: string;
  target_resource: string;
  target_id: string;
  risk_impact: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  cloud_provider?: string;
  symbol?: string;
}

export interface RelationshipsPageResponse {
  items: RelationshipItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  relationship_types: string[];
  cloud_provider?: string;
}

// ============================================================================
// 12.6 Blast Radius
// ============================================================================

export interface BlastRadiusSummary {
  total_affected: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface BlastRadiusNode {
  id: string;
  name: string;
  type: string;
  risk_level: string;
  level: number;
  parent_id?: string;
  cloud_provider?: string;
  symbol?: string;
}

export interface BlastRadiusResponse {
  target_resource_id: string;
  target_resource_name: string;
  summary: BlastRadiusSummary;
  nodes: BlastRadiusNode[];
  cloud_provider?: string;
}

// ============================================================================
// 12.7 Change History
// ============================================================================

export interface ChangeHistoryItem {
  id: string;
  time: string;
  resource: string;
  resource_type: string;
  change_type: 'Modified' | 'Created' | 'Deleted' | 'No Change' | string;
  user: string;
  details: string;
  cloud_provider?: string;
  symbol?: string;
}

export interface ChangeHistoryPageResponse {
  items: ChangeHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_resources: string[];
  cloud_provider?: string;
}

// ============================================================================
// 12.8 Graph Settings & Export
// ============================================================================

export interface VisualizationSettingsDTO {
  default_view: string;
  show_resource_labels: boolean;
  show_relationships: boolean;
  group_by_environment: boolean;
  show_risk_indicators: boolean;
}

export interface AnalysisSettingsDTO {
  include_external_resources: boolean;
  enable_blast_radius_analysis: boolean;
  maximum_depth: number;
  show_deprecated_resources: boolean;
}

export interface ExportSettingsDTO {
  export_format: string;
}

export interface GraphSettingsDTO {
  visualization: VisualizationSettingsDTO;
  analysis: AnalysisSettingsDTO;
  export: ExportSettingsDTO;
}

export interface ExportGraphRequest {
  view: string;
  format: string;
}

export interface ExportGraphResponse {
  download_url: string;
  format: string;
  generated_at: string;
  message: string;
}
