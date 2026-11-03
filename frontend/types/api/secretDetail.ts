export interface SecretRiskAssessment {
  risk_level: string;
  risk_summary: string;
  risk_description: string;
  potential_impact: string[];
}

export interface SecretMetadataInfo {
  confidence: string;
  validation_status: string;
  account_id: string;
  region: string;
  iam_user_role: string;
  permissions: string;
  last_used: string;
  source: string;
  age: string;
  tags: string[];
}

export interface SecretCodeSnippetLine {
  line_number: number;
  content: string;
  is_highlighted: boolean;
}

export interface SecretCodeContext {
  file_path: string;
  repository: string;
  branch: string;
  commit: string;
  start_line: number;
  highlight_lines: number[];
  lines: SecretCodeSnippetLine[];
}

export interface SecretRepoHistoryCommit {
  commit_sha: string;
  title: string;
  author: string;
  author_initials: string;
  date: string;
  is_culprit?: boolean;
}

export interface SecretRecommendedActionItem {
  id: string;
  title: string;
  description: string;
  action_type: 'revoke' | 'rotate' | 'pr' | string;
  theme_color: 'red' | 'blue' | 'purple' | string;
}

export interface SecretRelatedFindingItem {
  id: string;
  title: string;
  file_path: string;
  severity: string;
  date: string;
  brand_icon: string;
}

export interface SecretActivityLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  status: string;
}

export interface SecretImpactService {
  service_name: string;
  access_level: string;
  resources_count: number;
  risk: string;
}

export interface SecretImpactAnalysis {
  blast_radius_score: number;
  affected_services: SecretImpactService[];
  financial_liability_estimate: string;
  network_exposure: string;
}

export interface SecretRemediationGuide {
  steps: string[];
  git_purge_command: string;
  aws_cli_revoke_command: string;
  env_example: string;
}

export interface SecretDetailResponse {
  id: string;
  secret_title: string;
  secret_type: string;
  type_label: string;
  brand_icon: string;
  severity: string;
  status: string;
  description: string;
  repository: string;
  repository_visibility: string;
  first_detected_date: string;
  first_detected_time: string;
  last_seen_date: string;
  last_seen_time: string;
  pattern: string;
  masked_value: string;
  detected_value: string;
  file_path: string;
  branch: string;
  commit: string;
  commit_sha: string;
  author: string;
  detection_method: string;

  risk_assessment: SecretRiskAssessment;
  metadata: SecretMetadataInfo;
  code_context: SecretCodeContext;
  repo_history: SecretRepoHistoryCommit[];
  recommended_actions: SecretRecommendedActionItem[];
  related_findings: SecretRelatedFindingItem[];

  impact_analysis: SecretImpactAnalysis;
  remediation_guide: SecretRemediationGuide;
  activity_log: SecretActivityLogEntry[];
}

export interface CreateSecretRemediationPRRequest {
  branch_name: string;
  reviewers: string[];
  commit_message: string;
  replacement_env_var?: string;
}

export interface CreateSecretRemediationPRResponse {
  pr_number: number;
  pr_url: string;
  branch_name: string;
  title: string;
  status: string;
  created_at: string;
  message: string;
}

export interface RevokeSecretKeyResponse {
  secret_id: string;
  status: string;
  validation_status: string;
  revoked_at: string;
  message: string;
}

export interface RotateSecretKeyResponse {
  secret_id: string;
  old_key_masked: string;
  new_key_masked: string;
  rotated_at: string;
  message: string;
}
