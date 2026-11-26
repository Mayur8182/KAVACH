import { getAuthToken } from '@/lib/auth/token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      errorDetail = body.detail || body.message || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export interface CodeAuditRun {
  id: string;
  repository_id: string;
  snapshot_id?: string;
  branch: string;
  commit_sha: string;
  scope: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  overall_score: number;
  health_grade: string;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  total_debt_hours: number;
  duration_seconds: number;
  error_message?: string;
  trigger_type: string;
  created_at: string;
  updated_at: string;
  scorecard?: CodeAuditScoreCard;
  technical_debt?: CodeAuditTechnicalDebt;
}

export interface CodeAuditFinding {
  id: string;
  run_id: string;
  repository_id: string;
  category: 'QUALITY' | 'ARCHITECTURE' | 'PERFORMANCE' | 'TESTING' | 'MAINTAINABILITY' | 'RELIABILITY' | 'DOCUMENTATION';
  rule_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  confidence: string;
  file_path: string;
  start_line?: number;
  end_line?: number;
  code_evidence?: string;
  root_cause?: string;
  technical_impact?: string;
  recommended_solution?: string;
  estimated_remediation_minutes: number;
  related_files: string[];
  related_symbols: string[];
  detection_method: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ACCEPTED_RISK' | 'FALSE_POSITIVE';
  status_reason?: string;
  created_at: string;
}

export interface CodeAuditScoreCard {
  id: string;
  run_id: string;
  quality_score: number;
  architecture_score: number;
  performance_score: number;
  testing_score: number;
  maintainability_score: number;
  reliability_score: number;
  documentation_score: number;
  overall_score: number;
  health_grade: string;
  formula_breakdown: Record<string, any>;
}

export interface CodeAuditTechnicalDebt {
  id: string;
  run_id: string;
  total_debt_hours: number;
  high_priority_hours: number;
  debt_by_module: Record<string, number>;
  debt_by_category: Record<string, number>;
  top_complex_files: Array<{
    file_path: string;
    debt_hours: number;
    findings_count: number;
    categories: string[];
    highest_severity: string;
  }>;
  maintenance_hotspots: Array<{
    file_path: string;
    debt_hours: number;
    findings_count: number;
    categories: string[];
    highest_severity: string;
  }>;
}

export interface CodeAuditAutofixProposal {
  id: string;
  finding_id: string;
  run_id: string;
  diff_patch: string;
  explanation: string;
  validation_command?: string;
  validation_status: string;
  pull_request_url?: string;
  applied_at?: string;
  created_at: string;
}

export interface CodeAuditArchitecture {
  run_id: string;
  graph_nodes: Array<{ id: string; label: string; module: string; in_degree: number; out_degree: number }>;
  graph_edges: Array<{ source: string; target: string }>;
  circular_dependencies: string[][];
  coupling_index: number;
  modular_cohesion: number;
  god_classes: any[];
}

export interface CodeAuditOverview {
  latest_run?: CodeAuditRun;
  previous_score?: number;
  score_delta?: number;
  total_audits: number;
  grade_history: Array<{ run_id: string; created_at: string; score: number; grade: string }>;
  category_summary: Record<string, number>;
}

export const codeAuditApi = {
  triggerAudit: (repositoryId: string, scope = 'FULL', branch?: string) =>
    fetchWithAuth<CodeAuditRun>(`/api/v1/code-audit/repositories/${repositoryId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ scope, branch }),
    }),

  listRuns: (repositoryId: string, limit = 20) =>
    fetchWithAuth<CodeAuditRun[]>(`/api/v1/code-audit/repositories/${repositoryId}/runs?limit=${limit}`),

  getRun: (runId: string) =>
    fetchWithAuth<CodeAuditRun>(`/api/v1/code-audit/runs/${runId}`),

  getFindings: (
    runId: string,
    params?: {
      category?: string;
      severity?: string;
      priority?: string;
      status?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.skip) q.set('skip', params.skip.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    return fetchWithAuth<CodeAuditFinding[]>(`/api/v1/code-audit/runs/${runId}/findings?${q.toString()}`);
  },

  getScorecard: (runId: string) =>
    fetchWithAuth<CodeAuditScoreCard>(`/api/v1/code-audit/runs/${runId}/scores`),

  getTechnicalDebt: (runId: string) =>
    fetchWithAuth<CodeAuditTechnicalDebt>(`/api/v1/code-audit/runs/${runId}/technical-debt`),

  getArchitecture: (runId: string) =>
    fetchWithAuth<CodeAuditArchitecture>(`/api/v1/code-audit/runs/${runId}/architecture`),

  getFinding: (findingId: string) =>
    fetchWithAuth<CodeAuditFinding>(`/api/v1/code-audit/findings/${findingId}`),

  updateFindingStatus: (findingId: string, status: string, reason?: string) =>
    fetchWithAuth<CodeAuditFinding>(`/api/v1/code-audit/findings/${findingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, status_reason: reason }),
    }),

  explainFinding: (findingId: string) =>
    fetchWithAuth<{
      finding_id: string;
      explanation: string;
      root_cause_analysis: string;
      refactoring_pattern: string;
      preventative_advice: string;
    }>(`/api/v1/code-audit/findings/${findingId}/explain`, {
      method: 'POST',
    }),

  generateAutofix: (findingId: string, customInstructions?: string) =>
    fetchWithAuth<CodeAuditAutofixProposal>(`/api/v1/code-audit/findings/${findingId}/autofix`, {
      method: 'POST',
      body: JSON.stringify({ custom_instructions: customInstructions }),
    }),

  getOverview: (repositoryId?: string) => {
    const q = repositoryId ? `?repository_id=${repositoryId}` : '';
    return fetchWithAuth<CodeAuditOverview>(`/api/v1/code-audit/overview${q}`);
  },
};

