import { SecretCodeContext } from './secretDetail';

export interface DetectionAiAnalysis {
  summary: string;
  potential_impact: string[];
}

export interface DetectionRemediationStep {
  step_number: number;
  title: string;
  description: string;
}

export interface DetectionMetadata {
  account_id: string;
  region: string;
  environment: string;
  permissions: string;
  last_used: string;
  source: string;
  tags: string[];
  status: string;
  age: string;
  rotation_required: string;
}

export interface DetectionTimelineEvent {
  id: string;
  timestamp: string;
  message: string;
  is_latest: boolean;
  badge_label?: string | null;
}

export interface DetectionRelatedFinding {
  id: string;
  title: string;
  file_path: string;
  severity: string;
  date: string;
  brand_icon: string;
}

export interface SecretDetectionDetailResponse {
  id: string;
  secret_title: string;
  secret_type: string;
  type_label: string;
  brand_icon: string;
  severity: string;
  severity_subtitle: string;
  status: string;
  status_subtitle: string;
  description: string;
  repository: string;
  repository_visibility: string;
  first_detected_date: string;
  first_detected_time: string;
  last_seen_date: string;
  last_seen_time: string;
  pattern: string;
  detected_value: string;
  masked_value: string;
  file_path: string;
  branch: string;
  commit: string;
  commit_sha: string;
  author: string;
  detection_method: string;
  confidence_score: number;
  occurrences_label: string;

  code_context: SecretCodeContext;
  ai_analysis: DetectionAiAnalysis;
  remediation_steps: DetectionRemediationStep[];
  metadata: DetectionMetadata;
  related_findings: DetectionRelatedFinding[];
  timeline: DetectionTimelineEvent[];

  previous_id?: string | null;
  next_id?: string | null;
}
