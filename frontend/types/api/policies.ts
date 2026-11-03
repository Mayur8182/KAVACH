/**
 * Types for Policies & Compliance (/code/settings/policies & /code/policies)
 * Corresponds to backend/app/code/schemas.py Policies & Compliance models.
 */

export interface PolicyComplianceKpis {
  enforced_policies: number;
  enforced_policies_trend: string;
  compliance_frameworks: number;
  policy_violations: number;
  policy_violations_trend: string;
  compliance_score: number;
  compliance_score_trend: string;
}

export interface PolicyViolationsTrendPoint {
  date: string;
  violations: number;
  resolved: number;
}

export interface PolicyTypeBreakdown {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ComplianceFrameworkItem {
  id: string;
  name: string;
  enabled: boolean;
  controls_passed: number;
  controls_total: number;
  score_pct?: number | null;
  badge_color: string;
}

export interface PolicyEnforcementSettings {
  block_merge_on_violation: boolean;
  auto_remediate_safe_issues: boolean;
  notify_on_new_violations: boolean;
  enable_policy_exceptions: boolean;
}

export interface RecentPolicyViolationItem {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  time_ago: string;
  repository: string;
  file_path: string;
}

export interface PolicyComplianceAnalytics {
  trends: PolicyViolationsTrendPoint[];
  by_type: PolicyTypeBreakdown[];
  frameworks: ComplianceFrameworkItem[];
  enforcement_settings: PolicyEnforcementSettings;
  recent_violations: RecentPolicyViolationItem[];
}

export interface PolicyComplianceOverviewResponse {
  kpis: PolicyComplianceKpis;
  analytics: PolicyComplianceAnalytics;
}

export interface SecurityPolicyRow {
  id: string;
  name: string;
  type: string; // Secret | Dependency | Code | Container | IaC | Repository | PR
  scope: string; // All Repositories | docker/ | terraform/ | etc.
  status: 'Enforced' | 'Warning' | 'Disabled' | string;
  violations: number;
  last_updated: string;
  icon_type: string;
  description?: string;
  compliance_frameworks?: string[];
}

export interface SecurityPoliciesTableResponse {
  items: SecurityPolicyRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateSecurityPolicyRequest {
  name: string;
  type: string;
  scope?: string;
  status?: string;
  description?: string;
  compliance_frameworks?: string[];
}

export interface UpdateSecurityPolicyRequest {
  name?: string;
  type?: string;
  scope?: string;
  status?: string;
  description?: string;
}

export interface EnforceAllPoliciesResponse {
  updated_count: number;
  message: string;
}

export interface PolicyTemplateItem {
  id: string;
  name: string;
  category: string;
  framework: string;
  description: string;
  recommended_action: string;
}
