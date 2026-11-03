/**
 * TypeScript Definitions for IaC Remediation Suite — Section 5 (Screens 5.1 - 5.8)
 * Sourced directly from /api/v1/iac/remediation-suite/*
 */

export interface RemediationStatusPoint {
  date: string;
  open_count: number;
  in_progress_count: number;
  fixed_count: number;
}

export interface RemediationCategoryItem {
  category: string;
  open_count: number;
  in_progress_count: number;
  fixed_count: number;
  total_count: number;
}

export interface IaCRemediationOverviewSuiteResponse {
  open_issues: number;
  fix_available: number;
  auto_fixable: number;
  in_progress: number;
  time_filter: string;
  status_trend: RemediationStatusPoint[];
  top_categories: RemediationCategoryItem[];
}

export interface FixRecommendationItem {
  id: string;
  finding_id: string;
  finding: string;
  resource: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  recommendation: string;
  framework: string;
  provider: string;
  auto_fixable: boolean;
  created_at: string;
  status?: string;
}

export interface FixRecommendationsPageResponse {
  items: FixRecommendationItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  severities: string[];
  frameworks: string[];
  providers: string[];
}

export interface CodeSnippet {
  framework: string;
  vulnerable_code: string;
  remediated_code: string;
  vulnerable_lines?: string;
  remediated_lines?: string;
}

export interface ComplianceReference {
  framework: string;
  control_id: string;
  title: string;
  url?: string;
}

export interface RemediationDetailResponse {
  id: string;
  finding_id: string;
  title: string;
  resource: string;
  severity: string;
  status: string;
  description: string;
  impact: string;
  fix_steps: string[];
  code_examples: Record<string, CodeSnippet>;
  references: ComplianceReference[];
  auto_fixable: boolean;
}

export interface AutoFixItem {
  id: string;
  finding_id: string;
  finding: string;
  resource: string;
  severity: string;
  auto_fix_status: 'Available' | 'In Progress' | 'Generated' | 'Failed' | string;
  framework: string;
  provider: string;
  recommended_pr_title: string;
  target_branch: string;
}

export interface AutoFixListResponse {
  items: AutoFixItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  beta_notice: string;
}

export interface GeneratePRRequest {
  finding_id: string;
  target_branch?: string;
  custom_title?: string;
  include_security_context?: boolean;
  auto_assign_reviewers?: string;
}

export interface GeneratePRResponse {
  pr_number: number;
  pr_id: string;
  title: string;
  repository: string;
  branch: string;
  target_branch: string;
  status: string;
  html_url: string;
  diff_summary: string;
  created_at: string;
  author: string;
  checks_status: string;
}

export interface RemediationPRItem {
  id: string;
  pr_number: number;
  title: string;
  repository: string;
  status: 'Open' | 'Merged' | 'Closed' | string;
  created_at: string;
  author: string;
  branch: string;
  target_branch: string;
  checks_status: string;
  diff_preview?: string;
  finding_id?: string;
  resource?: string;
}

export interface RemediationPRsPageResponse {
  items: RemediationPRItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  repositories: string[];
  statuses: string[];
}

export interface SuppressedFindingItem {
  id: string;
  finding: string;
  resource: string;
  reason: string;
  expires_at: string;
  suppressed_by: string;
  created_at: string;
  status: 'Active' | 'Expired' | 'Revoked' | string;
}

export interface SuppressedFindingsPageResponse {
  items: SuppressedFindingItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  reasons: string[];
  resources: string[];
}

export interface UpdateSuppressionRequest {
  reason?: string;
  expires_at?: string;
  status?: string;
}

export interface RemediationActivityItem {
  id: string;
  timestamp: string;
  action: string;
  finding: string;
  resource: string;
  user: string;
  details?: string;
}

export interface RemediationActivityPageResponse {
  items: RemediationActivityItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  actions: string[];
  users: string[];
}

export interface RemediationSettingsDTO {
  enable_ai_remediation: boolean;
  auto_create_prs: boolean;
  require_manual_approval_critical: boolean;
  include_test_validation: boolean;
  git_provider: string;
  repository: string;
  base_branch: string;
  auto_assign_reviewers: string;
  include_security_context: boolean;
  auto_close_on_merge: boolean;
  notify_pr_creation: boolean;
  notify_pr_merge: boolean;
  notify_failed_autofix: boolean;
}

export interface UpdateRemediationSettingsRequest {
  enable_ai_remediation?: boolean;
  auto_create_prs?: boolean;
  require_manual_approval_critical?: boolean;
  include_test_validation?: boolean;
  git_provider?: string;
  repository?: string;
  base_branch?: string;
  auto_assign_reviewers?: string;
  include_security_context?: boolean;
  auto_close_on_merge?: boolean;
  notify_pr_creation?: boolean;
  notify_pr_merge?: boolean;
  notify_failed_autofix?: boolean;
}
