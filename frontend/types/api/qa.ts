/**
 * QA & Quality Engineering Platform API Types
 * Full TypeScript interfaces matching backend models and Gemini AI schemas.
 */

export interface TestCaseStep {
  step_number: number;
  action: string;
  expected: string;
  actual?: string | null;
  status: 'Pending' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
}

export interface TestCaseItem {
  id: string;
  name: string;
  suite: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  type: 'Functional' | 'API' | 'UI' | 'Security' | 'Performance';
  status: 'Active' | 'Draft' | 'Deprecated';
  automation: 'Playwright' | 'Cypress' | 'Postman' | 'Selenium' | 'Manual';
  owner: string;
  last_run?: string;
  pass_rate: number;
  description?: string | null;
  expected_result?: string | null;
  actual_result?: string | null;
  tags: string[];
  steps: TestCaseStep[];
  automation_script?: string | null;
  ai_suggestions?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface TestCaseCreatePayload {
  name: string;
  suite?: string;
  priority?: string;
  type?: string;
  status?: string;
  automation?: string;
  owner?: string;
  description?: string;
  expected_result?: string;
  actual_result?: string;
  tags?: string[];
  steps?: TestCaseStep[];
  automation_script?: string;
}

export interface TestSuiteItem {
  id: string;
  name: string;
  description?: string | null;
  test_count: number;
  pass_rate: number;
  environment: string;
  status: string;
  created_at?: string;
}

export interface TestSuiteCreatePayload {
  name: string;
  description?: string;
  environment?: string;
  status?: string;
}

export interface TestPlanItem {
  id: string;
  name: string;
  version: string;
  milestone: string;
  status: string;
  target_date?: string | null;
  suite_ids: string[];
  created_at?: string;
}

export interface TestPlanCreatePayload {
  name: string;
  version?: string;
  milestone?: string;
  status?: string;
  target_date?: string;
  suite_ids?: string[];
}

export interface TestRunItem {
  id: string;
  run_number: string;
  suite: string;
  environment: string;
  commit_hash: string;
  branch: string;
  total_tests: number;
  pass_count: number;
  fail_count: number;
  flaky_count: number;
  skipped_count: number;
  duration_str: string;
  status: 'Passed' | 'Failed' | 'Running' | 'Cancelled';
  triggered_by: string;
  execution_logs?: string[];
  created_at?: string;
}

export interface FailureItem {
  id: string;
  file_name: string;
  suite: string;
  component: string;
  error_message: string;
  stack_trace?: string | null;
  time_ago: string;
  test_case_id?: string | null;
}

export interface QAOverviewMetricsResponse {
  total_tests: number;
  total_tests_change: number;
  pass_rate: number;
  pass_rate_change: number;
  flaky_tests: number;
  flaky_tests_change: number;
  automation_rate: number;
  automation_rate_change: number;
  coverage: number;
  coverage_change: number;
  defects: number;
  defects_change: number;
  critical_bugs: number;
  critical_bugs_change: number;
  quality_score: number;
  quality_score_change: number;
  execution_health: {
    total: number;
    passed: number;
    passed_pct: number;
    failed: number;
    failed_pct: number;
    flaky: number;
    flaky_pct: number;
    skipped: number;
    skipped_pct: number;
  };
  execution_trends: Array<{
    date: string;
    pass_rate: number;
    automation_rate: number;
  }>;
  quality_hotspots: Array<{
    component: string;
    risk_pct: number;
    color: string;
  }>;
  recent_runs: TestRunItem[];
  recent_failures: FailureItem[];
}

export interface AutomationMetricResponse {
  framework: string;
  total_tests: number;
  pass_rate: number;
  failed_tests: number;
  flaky_tests: number;
  browsers: Record<string, number>;
  trend_history: Array<{
    date: string;
    passed: number;
    failed: number;
    flaky: number;
  }>;
}

export interface APITestItem {
  id: string;
  collection: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  status_code: number;
  latency_ms: number;
  result: 'Pass' | 'Fail' | 'Security_Alert';
  security_checks: Array<{ check: string; passed: boolean }>;
  headers: Record<string, string>;
  body?: string | null;
  response_body?: string | null;
  updated_at?: string;
}

export interface PerformanceTestItem {
  id: string;
  name: string;
  type: string;
  virtual_users: number;
  requests_per_sec: number;
  avg_latency_ms: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
  status: string;
  duration: string;
  time_series: Array<{
    time: string;
    rps: number;
    p50: number;
    p95: number;
  }>;
  created_at?: string;
}

export interface BrowserMatrixItem {
  os: string;
  browser: string;
  status: 'Passed' | 'Failed';
  version: string;
  resolution: string;
}

export interface VisualDiffItem {
  id: string;
  page_name: string;
  baseline_url: string;
  current_url: string;
  diff_url: string;
  differences_count: number;
  diff_percentage: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  ai_explanation?: string | null;
  diff_regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }>;
  updated_at?: string;
}

export interface AccessibilityScanItem {
  id: string;
  page_name: string;
  target_url: string;
  wcag_score: number;
  level_a: number;
  level_aa: number;
  level_aaa: number;
  total_issues: number;
  critical_issues: number;
  major_issues: number;
  minor_issues: number;
  contrast_issues: number;
  keyboard_issues: number;
  aria_issues: number;
  screen_reader_issues: number;
  other_issues: number;
  violations: Array<{
    rule: string;
    impact: string;
    element: string;
    wcag: string;
  }>;
  status: 'Passed' | 'Failed';
  created_at?: string;
}

export interface DefectItem {
  id: string;
  title: string;
  description?: string | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In_Progress' | 'Resolved' | 'Closed';
  test_case_id?: string | null;
  test_run_id?: string | null;
  assignee: string;
  root_cause?: string | null;
  steps_to_reproduce: string[];
  created_at?: string;
}

export interface QualityGateItem {
  id: string;
  name: string;
  environment: string;
  threshold?: string | number;
  current_value?: string | number;
  min_pass_rate: number;
  max_critical_bugs: number;
  min_coverage: number;
  max_flaky_rate: number;
  status: 'Passed' | 'Failed' | 'Warning';
  is_blocking: boolean;
  created_at?: string;
}

// Gemini AI Request / Responses
export interface AITestCaseGenerateResponse {
  generated_count: number;
  test_cases: TestCaseItem[];
  ai_engine: string;
  reasoning: string;
}

export interface AIAutomateResponse {
  test_case_id: string;
  framework: string;
  script: string;
  suggested_assertions: string[];
  ai_engine: string;
}

export interface AIFailureAnalysisResponse {
  root_cause: string;
  severity: string;
  remediation_suggestion: string;
  recommended_fixes?: string[];
  fix_code_snippet?: string | null;
  suggested_patch?: string | null;
  preventive_measures: string[];
  ai_engine: string;
}

export interface AIVisualDiffExplainResponse {
  explanation: string;
  is_regression: boolean;
  recommended_action: 'approve' | 'reject';
  ai_engine: string;
}

export interface AIA11yRemediateResponse {
  wcag_criterion: string;
  remediation_code: string;
  explanation: string;
  ai_engine: string;
}

export interface AIAPITestGenerateResponse {
  generated_tests: Array<{
    name: string;
    method: string;
    path: string;
    payload: string;
    expected_status: number;
    security_check: string;
  }>;
  security_considerations: string[];
  ai_engine: string;
}
