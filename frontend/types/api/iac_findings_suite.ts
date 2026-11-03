/**
 * TypeScript definitions for Section 2: IaC Findings Suite
 * Matches backend schemas from app/schemas/iac_findings_suite.py
 */

export interface IaCFindingsKpis {
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCFindingsTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCTopAffectedResourceItem {
  resource: string;
  count: number;
}

export interface IaCTopCategoryCountItem {
  category: string;
  count: number;
}

export interface IaCFindingsOverviewResponse {
  kpis: IaCFindingsKpis;
  trend: IaCFindingsTrendPoint[];
  severity_breakdown: Record<string, number>;
  status_breakdown?: Record<string, number>;
  top_affected_resources: IaCTopAffectedResourceItem[];
  top_findings_by_category?: IaCTopCategoryCountItem[];
}

export interface IaCFindingRowItem {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  resource: string;
  provider: 'AWS' | 'Kubernetes' | 'Azure' | 'GCP' | string;
  framework: string;
  environment: 'Production' | 'Staging' | 'Development' | 'QA' | string;
  status: 'Open' | 'In Progress' | 'Resolved' | string;
  detected_at: string;
}

export interface IaCFindingsAllResponse {
  items: IaCFindingRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_severities: string[];
  available_providers: string[];
  available_frameworks: string[];
  available_statuses: string[];
}

export interface IaCProviderCountItem {
  provider: string;
  count: number;
}

export interface IaCFindingsByProviderResponse {
  providers: IaCProviderCountItem[];
  active_provider: string;
  items: IaCFindingRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IaCSeverityCountItem {
  severity: string;
  count: number;
}

export interface IaCFindingsBySeverityResponse {
  severities: IaCSeverityCountItem[];
  active_severity: string;
  items: IaCFindingRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IaCCategoryRowItem {
  category: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCFindingsByCategoryResponse {
  categories: IaCCategoryRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IaCFrameworkCountItem {
  framework: string;
  count: number;
}

export interface IaCFrameworkRuleRowItem {
  rule_id: string;
  title: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCFindingsByFrameworkResponse {
  frameworks: IaCFrameworkCountItem[];
  active_framework: string;
  rules: IaCFrameworkRuleRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IaCEnvironmentCountItem {
  environment: string;
  count: number;
}

export interface IaCFindingsByEnvironmentResponse {
  environments: IaCEnvironmentCountItem[];
  active_environment: string;
  items: IaCFindingRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ExportFindingsRequest {
  format: 'CSV' | 'JSON' | string;
  severity?: string;
  provider?: string;
  status?: string;
  environment?: string;
  framework?: string;
  category?: string;
  search?: string;
}

export interface ExportFindingsResponse {
  format: string;
  exported_count: number;
  download_content: string;
  filename: string;
}

// ── 3.3 Finding Detail ───────────────────────────────────────────────────────────

export interface FindingEvidenceSnippet {
  file_path: string;
  line_start: number;
  line_end: number;
  code_content: string;
  diff_patch?: string;
}

export interface FindingRemediationGuidance {
  summary: string;
  terraform_snippet: string;
  steps: string[];
  applied: boolean;
  pr_url?: string;
}

export interface FindingCommentItem {
  id: string;
  author: string;
  avatar: string;
  comment: string;
  created_at: string;
}

export interface FindingActivityItem {
  id: string;
  event: string;
  user: string;
  timestamp: string;
  badge_variant: string;
}

export interface IaCFindingDetailResponse {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resource: string;
  provider: string;
  rule_id: string;
  category: string;
  frameworks: string;
  detected_at: string;
  first_seen: string;
  last_seen: string;
  environment: string;
  region: string;
  resource_tags: string;
  cvss_score: string;
  assignee?: string;
  evidence: FindingEvidenceSnippet;
  remediation: FindingRemediationGuidance;
  comments: FindingCommentItem[];
  activity: FindingActivityItem[];
}

export interface AssignFindingRequest {
  assignee: string;
}

export interface CommentFindingRequest {
  comment: string;
  author?: string;
}

export interface RemediateFindingRequest {
  action: 'apply' | 'revert' | string;
}

// ── 3.4 Findings Triage ─────────────────────────────────────────────────────────

export interface IaCFindingsTriageItem {
  id: string;
  title: string;
  severity: string;
  assignee: string;
  status: string;
  resource: string;
  provider: string;
  detected_at: string;
}

export interface IaCFindingsTriageResponse {
  status_counts: Record<string, number>;
  items: IaCFindingsTriageItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  assignees: string[];
}

export interface BulkFindingActionRequest {
  action: 'assign' | 'set_status' | 'suppress' | string;
  finding_ids: string[];
  value: string;
}

// ── 3.5 Findings Trends ─────────────────────────────────────────────────────────

export interface IaCProviderTrendCount {
  provider: string;
  count: number;
}

export interface IaCEnvironmentTrendPct {
  environment: string;
  percentage: number;
  count: number;
}

export interface IaCFindingsTrendsResponse {
  time_range: string;
  trend: IaCFindingsTrendPoint[];
  provider_breakdown: IaCProviderTrendCount[];
  environment_breakdown: IaCEnvironmentTrendPct[];
}

// ── 3.6 Findings by Resource ───────────────────────────────────────────────────

export interface IaCResourceFindingsRowItem {
  resource_type: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCFindingsByResourceResponse {
  items: IaCResourceFindingsRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  providers: string[];
  environments: string[];
}

// ── 3.7 Findings by Framework (Compliance Summary) ─────────────────────────────

export interface IaCFrameworkSummaryRowItem {
  framework: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IaCFindingsByFrameworkSummaryResponse {
  items: IaCFrameworkSummaryRowItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── 3.8 Export & Reports ───────────────────────────────────────────────────────

export interface ExportFindingsAdvancedRequest {
  format: 'CSV' | 'JSON' | 'PDF' | string;
  include_details?: boolean;
  include_resource_config?: boolean;
  include_remediation?: boolean;
  include_evidence?: boolean;
  include_activity?: boolean;
  status?: string;
  severity?: string;
  provider?: string;
  date_range?: string;
}

export interface ScheduledReportItem {
  id: string;
  name: string;
  frequency: string;
  format: string;
  recipients: string;
  status: 'Active' | 'Paused' | string;
  next_run: string;
}

export interface ScheduledReportCreateRequest {
  name: string;
  frequency?: string;
  format?: string;
  recipients: string;
}

export interface ReportHistoryItem {
  id: string;
  name: string;
  format: string;
  generated_at: string;
  size: string;
  generated_by: string;
  download_content: string;
}
