from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# =========================================================================
# TEST CASE SCHEMAS
# =========================================================================

class TestCaseStep(BaseModel):
    step_number: int
    action: str
    expected: str
    actual: Optional[str] = None
    status: str = "Pending" # Pending, Passed, Failed, Blocked, Skipped


class TestCaseCreate(BaseModel):
    name: str = Field(..., description="Test case title")
    suite: str = Field("General", description="Test suite name")
    priority: str = Field("Medium", description="Critical, High, Medium, Low")
    type: str = Field("Functional", description="Functional, API, UI, Security, Performance")
    status: str = "Active"
    automation: str = Field("Manual", description="Playwright, Cypress, Postman, Selenium, Manual")
    owner: str = "QA Engineer"
    description: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    tags: List[str] = []
    steps: List[TestCaseStep] = []
    automation_script: Optional[str] = None


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    suite: Optional[str] = None
    priority: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    automation: Optional[str] = None
    owner: Optional[str] = None
    pass_rate: Optional[float] = None
    description: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    tags: Optional[List[str]] = None
    steps: Optional[List[Dict[str, Any]]] = None
    automation_script: Optional[str] = None


class TestCaseStepUpdate(BaseModel):
    step_number: int
    actual: str
    status: str # Passed, Failed, Blocked, Skipped


class TestCaseResponse(BaseModel):
    id: str
    name: str
    suite: str
    priority: str
    type: str
    status: str
    automation: str
    owner: str
    last_run: Optional[str] = "Never"
    pass_rate: float
    description: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    tags: List[str] = []
    steps: List[Dict[str, Any]] = []
    automation_script: Optional[str] = None
    ai_suggestions: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================================
# TEST RUN SCHEMAS
# =========================================================================

class TestRunCreate(BaseModel):
    suite: str
    environment: str = "Staging"
    branch: str = "main"
    triggered_by: str = "Manual Trigger"


class TestRunResponse(BaseModel):
    id: str
    run_number: str
    suite: str
    environment: str
    commit_hash: str
    branch: str
    total_tests: int
    pass_count: int
    fail_count: int
    flaky_count: int
    skipped_count: int
    duration_str: str
    status: str
    triggered_by: str
    execution_logs: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FailureResponse(BaseModel):
    id: str
    file_name: str
    suite: str
    component: str
    error_message: str
    stack_trace: Optional[str] = None
    time_ago: str
    test_case_id: Optional[str] = None

    class Config:
        from_attributes = True


# =========================================================================
# AUTOMATION SCHEMAS
# =========================================================================

class AutomationMetricResponse(BaseModel):
    framework: str
    total_tests: int
    pass_rate: float
    failed_tests: int
    flaky_tests: int
    browsers: Dict[str, float]
    trend_history: List[Dict[str, Any]]


# =========================================================================
# API TESTING SCHEMAS
# =========================================================================

class APITestCreate(BaseModel):
    collection: str
    name: str
    method: str = "GET"
    path: str
    headers: Dict[str, str] = {}
    body: Optional[str] = None


class APITestExecuteRequest(BaseModel):
    test_id: str
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = None


class APITestResponse(BaseModel):
    id: str
    collection: str
    name: str
    method: str
    path: str
    status_code: int
    latency_ms: int
    result: str
    security_checks: List[Dict[str, Any]] = []
    headers: Dict[str, str] = {}
    body: Optional[str] = None
    response_body: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================================
# PERFORMANCE TESTING SCHEMAS
# =========================================================================

class PerformanceTestCreate(BaseModel):
    name: str
    type: str = "Load"
    virtual_users: int = 1000
    duration: str = "10m"


class PerformanceTestResponse(BaseModel):
    id: str
    name: str
    type: str
    virtual_users: int
    requests_per_sec: float
    avg_latency_ms: float
    p50_ms: float
    p90_ms: float
    p95_ms: float
    p99_ms: float
    error_rate: float
    status: str
    duration: str
    time_series: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================================
# BROWSER MATRIX SCHEMAS
# =========================================================================

class BrowserMatrixResponse(BaseModel):
    os: str
    browser: str
    status: str
    version: str
    resolution: str


# =========================================================================
# VISUAL DIFF SCHEMAS
# =========================================================================

class VisualDiffResponse(BaseModel):
    id: str
    page_name: str
    baseline_url: str
    current_url: str
    diff_url: str
    differences_count: int
    diff_percentage: float
    status: str
    ai_explanation: Optional[str] = None
    diff_regions: List[Dict[str, Any]] = []
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VisualDiffReviewRequest(BaseModel):
    action: str # approve, reject
    notes: Optional[str] = None


# =========================================================================
# ACCESSIBILITY SCAN SCHEMAS
# =========================================================================

class AccessibilityScanResponse(BaseModel):
    id: str
    page_name: str
    target_url: str
    wcag_score: int
    level_a: int
    level_aa: int
    level_aaa: int
    total_issues: int
    critical_issues: int
    major_issues: int
    minor_issues: int
    contrast_issues: int
    keyboard_issues: int
    aria_issues: int
    screen_reader_issues: int
    other_issues: int
    violations: List[Dict[str, Any]] = []
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================================
# DEFECT & QUALITY GATE SCHEMAS
# =========================================================================

class DefectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "Critical"
    test_case_id: Optional[str] = None
    test_run_id: Optional[str] = None
    assignee: str = "Unassigned"
    steps_to_reproduce: List[str] = []


class DefectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    test_case_id: Optional[str] = None
    test_run_id: Optional[str] = None
    assignee: str
    root_cause: Optional[str] = None
    steps_to_reproduce: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QualityGateResponse(BaseModel):
    id: str
    name: str
    environment: str
    min_pass_rate: float
    max_critical_bugs: int
    min_coverage: float
    max_flaky_rate: float
    status: str
    is_blocking: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================================================================
# OVERVIEW AGGREGATION SCHEMA
# =========================================================================

class QAOverviewMetrics(BaseModel):
    total_tests: int
    total_tests_change: float
    pass_rate: float
    pass_rate_change: float
    flaky_tests: int
    flaky_tests_change: float
    automation_rate: float
    automation_rate_change: float
    coverage: float
    coverage_change: float
    defects: int
    defects_change: float
    critical_bugs: int
    critical_bugs_change: float
    quality_score: int
    quality_score_change: float
    execution_health: Dict[str, Any]
    execution_trends: List[Dict[str, Any]]
    quality_hotspots: List[Dict[str, Any]]
    recent_runs: List[TestRunResponse]
    recent_failures: List[FailureResponse]


# =========================================================================
# GEMINI AI REQUEST & RESPONSE SCHEMAS
# =========================================================================

class AITestCaseGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Feature description or requirement text")
    suite: Optional[str] = "Authentication"
    priority: Optional[str] = "High"
    type: Optional[str] = "Functional"
    count: Optional[int] = 3


class AITestCaseGenerateResponse(BaseModel):
    generated_count: int
    test_cases: List[TestCaseCreate]
    ai_engine: str
    reasoning: str


class AIAutomateRequest(BaseModel):
    test_case_id: str
    target_framework: str = "playwright" # playwright, cypress, postman


class AIAutomateResponse(BaseModel):
    test_case_id: str
    framework: str
    script: str
    suggested_assertions: List[str]
    ai_engine: str


class AIFailureAnalysisRequest(BaseModel):
    test_case_id: Optional[str] = None
    error_message: str
    stack_trace: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None


class AIFailureAnalysisResponse(BaseModel):
    root_cause: str
    severity: str
    remediation_suggestion: str
    fix_code_snippet: Optional[str] = None
    preventive_measures: List[str] = []
    ai_engine: str


class AIVisualDiffExplainRequest(BaseModel):
    page_name: str
    differences_count: int
    bounding_boxes: Optional[List[Dict[str, Any]]] = None


class AIVisualDiffExplainResponse(BaseModel):
    explanation: str
    is_regression: bool
    recommended_action: str # approve, reject
    ai_engine: str


class AIA11yRemediateRequest(BaseModel):
    violation_rule: str
    element_snippet: str
    impact: str


class AIA11yRemediateResponse(BaseModel):
    wcag_criterion: str
    remediation_code: str
    explanation: str
    ai_engine: str


class AIAPITestGenerateRequest(BaseModel):
    endpoint_path: str
    method: str = "POST"
    sample_payload: Optional[str] = None


class AIAPITestGenerateResponse(BaseModel):
    generated_tests: List[Dict[str, Any]]
    security_considerations: List[str]
    ai_engine: str


# =========================================================================
# TEST SUITES & PLANS SCHEMAS
# =========================================================================

class TestSuiteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    environment: str = "Staging"
    status: str = "Active"


class TestSuiteResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    test_count: int = 0
    pass_rate: float = 100.0
    environment: str = "Staging"
    status: str = "Active"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TestPlanCreate(BaseModel):
    name: str
    version: str = "v1.0.0"
    milestone: str = "Sprint Hardening"
    status: str = "Active"
    target_date: Optional[str] = None
    suite_ids: List[str] = []


class TestPlanResponse(BaseModel):
    id: str
    name: str
    version: str = "v1.0.0"
    milestone: str = "Sprint Hardening"
    status: str = "Active"
    target_date: Optional[str] = None
    suite_ids: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

