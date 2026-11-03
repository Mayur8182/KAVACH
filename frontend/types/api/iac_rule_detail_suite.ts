/**
 * TypeScript Definitions for IaC Rule Detail Suite — Section 7 (Screens 7.1 through 7.8)
 * Sourced directly from /api/v1/iac/rule-detail-suite/*
 */

// ── 7.1 Rule Detail Overview ──
export interface RuleDetailKpis {
  total_findings: number;
  open_findings: number;
  resolved_findings: number;
  suppressed_findings: number;
}

export interface RuleInformation {
  rule_id: string;
  rule_name: string;
  category: string;
  provider: string;
  service: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  rule_type: string;
  frameworks: string[];
  status: 'Enabled' | 'Disabled' | string;
  last_updated: string;
  version: string;
}

export interface RuleDetailOverviewResponse {
  rule_id: string;
  rule_name: string;
  severity: string;
  description: string;
  kpis: RuleDetailKpis;
  rule_info: RuleInformation;
}

// ── 7.2 Rule Definition ──
export interface RuleReferenceLink {
  title: string;
  url: string;
}

export interface RuleDefinitionResponse {
  rule_id: string;
  title: string;
  description: string;
  rationale: string;
  impact: string;
  recommendation: string;
  references: RuleReferenceLink[];
  labels: string[];
}

// ── 7.3 Rule Logic AST ──
export interface RuleLogicEngineSpec {
  engine_id: string;
  engine_label: string;
  format: string;
  ast_code: string;
  test_resource_type: string;
  test_resource_code: string;
}

export interface RuleLogicResponse {
  rule_id: string;
  active_engine: string;
  engines: RuleLogicEngineSpec[];
}

// ── 7.4 Severity & Risk ──
export interface RiskTrendMonth {
  month: string;
  value: number;
}

export interface RuleRiskDetailsResponse {
  rule_id: string;
  severity: string;
  severity_description: string;
  likelihood: string;
  impact: string;
  risk_score: number;
  cvss_score: number;
  cvss_rating: string;
  data_sensitivity: string;
  business_impact: string;
  exploitability: string;
  risk_factors: string[];
  risk_trend: RiskTrendMonth[];
}

// ── 7.5 Framework Mappings ──
export interface ComplianceMappingItem {
  id: string;
  framework: string;
  control_id: string;
  control_name: string;
  status: string;
}

export interface RelatedRequirementDTO {
  framework: string;
  control_id: string;
  title: string;
  description: string;
  requirement_url: string;
}

export interface RuleFrameworkMappingsResponse {
  rule_id: string;
  mappings: ComplianceMappingItem[];
  related_requirement: RelatedRequirementDTO;
}

// ── 7.6 Affected Resources ──
export interface AffectedResourceItem {
  id: string;
  resource: string;
  resource_type: string;
  environment: string;
  region: string;
  status: 'Failed' | 'Passed' | 'Suppressed' | string;
  last_seen: string;
}

export interface AffectedResourcesKpis {
  total_resources: number;
  non_compliant: number;
  compliant: number;
  suppressed: number;
}

export interface AffectedResourcesPageResponse {
  kpis: AffectedResourcesKpis;
  items: AffectedResourceItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  environments: string[];
  regions: string[];
  statuses: string[];
}

// ── 7.7 Exceptions ──
export interface RuleExceptionItem {
  id: string;
  rule_id: string;
  resource: string;
  reason: string;
  expires_at: string;
  status: 'Active' | 'Expired' | 'Pending Review' | string;
  created_at: string;
  created_by: string;
}

export interface RuleExceptionsKpis {
  active_exceptions: number;
  expired: number;
  pending_review: number;
}

export interface RuleExceptionsPageResponse {
  kpis: RuleExceptionsKpis;
  items: RuleExceptionItem[];
  total: number;
}

export interface CreateRuleExceptionRequest {
  resource: string;
  reason: string;
  expires_at: string;
}

// ── 7.8 Rule History ──
export interface RuleHistoryItem {
  version: string;
  date: string;
  changes: string;
  updated_by: string;
}

export interface RuleHistoryResponse {
  rule_id: string;
  items: RuleHistoryItem[];
}

// ── Actions ──
export interface TriggerRuleScanRequest {
  environment?: string;
}

export interface TriggerRuleScanResponse {
  rule_id: string;
  scan_job_id: string;
  status: string;
  started_at: string;
  message: string;
}
