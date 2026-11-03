import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, Float, Boolean, Text, JSON, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class QATestCase(Base, TimestampMixin):
    """
    Authoritative test case entity for QA test management.
    Includes step definitions, preconditions, expected/actual results, tags, and automation bindings.
    """
    __tablename__ = "qa_test_cases"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"TC-{uuid.uuid4().hex[:6].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    suite: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="Medium")  # Critical, High, Medium, Low
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="Functional")   # Functional, API, UI, Security, Performance
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Active")     # Active, Draft, Deprecated
    automation: Mapped[str] = mapped_column(String(50), nullable=False, default="Manual") # Playwright, Cypress, Postman, Selenium, Manual
    owner: Mapped[str] = mapped_column(String(100), nullable=False, default="QA Engineer")
    last_run: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Never")
    pass_rate: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actual_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    steps: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    automation_script: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggestions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)


class QATestSuite(Base, TimestampMixin):
    """
    Test Suite grouping test cases logically by component or testing stage.
    """
    __tablename__ = "qa_test_suites"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"TS-{uuid.uuid4().hex[:6].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_count: Mapped[int] = mapped_column(Integer, default=0)
    pass_rate: Mapped[float] = mapped_column(Float, default=100.0)
    environment: Mapped[str] = mapped_column(String(50), default="Staging")
    status: Mapped[str] = mapped_column(String(50), default="Active")


class QATestPlan(Base, TimestampMixin):
    """
    Test Plan for releases, sprints, and certification milestones.
    """
    __tablename__ = "qa_test_plans"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"TP-{uuid.uuid4().hex[:6].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), default="v1.0.0")
    milestone: Mapped[str] = mapped_column(String(100), default="Q2 Release")
    status: Mapped[str] = mapped_column(String(50), default="Active")  # Active, Draft, Completed
    target_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    suite_ids: Mapped[List[str]] = mapped_column(JSON, default=list)


class QATestRun(Base, TimestampMixin):
    """
    Execution run record storing aggregated results, environment, and commit references.
    """
    __tablename__ = "qa_test_runs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"RUN-{uuid.uuid4().hex[:6].upper()}")
    run_number: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. #241
    suite: Mapped[str] = mapped_column(String(100), nullable=False)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="Staging")
    commit_hash: Mapped[str] = mapped_column(String(50), default="HEAD")
    branch: Mapped[str] = mapped_column(String(100), default="main")
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    pass_count: Mapped[int] = mapped_column(Integer, default=0)
    fail_count: Mapped[int] = mapped_column(Integer, default=0)
    flaky_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_str: Mapped[str] = mapped_column(String(50), default="1m 30s")
    status: Mapped[str] = mapped_column(String(50), default="Passed") # Passed, Failed, Running, Cancelled
    triggered_by: Mapped[str] = mapped_column(String(100), default="CI/CD Workflow")
    execution_logs: Mapped[List[str]] = mapped_column(JSON, default=list)


class QAFailure(Base, TimestampMixin):
    """
    Individual test failure tracker with file path, stack trace, and component tag.
    """
    __tablename__ = "qa_test_failures"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"FAIL-{uuid.uuid4().hex[:6].upper()}")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    suite: Mapped[str] = mapped_column(String(100), nullable=False)
    component: Mapped[str] = mapped_column(String(100), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_ago: Mapped[str] = mapped_column(String(50), default="Just now")
    test_case_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class QAAutomationMetric(Base, TimestampMixin):
    """
    Automation framework performance tracking (Playwright, Cypress, Selenium).
    """
    __tablename__ = "qa_automation_metrics"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"AUTO-{uuid.uuid4().hex[:6].upper()}")
    framework: Mapped[str] = mapped_column(String(50), nullable=False, default="Playwright")
    total_tests: Mapped[int] = mapped_column(Integer, default=4521)
    pass_rate: Mapped[float] = mapped_column(Float, default=95.7)
    failed_tests: Mapped[int] = mapped_column(Integer, default=112)
    flaky_tests: Mapped[int] = mapped_column(Integer, default=24)
    browser_chromium: Mapped[float] = mapped_column(Float, default=98.0)
    browser_firefox: Mapped[float] = mapped_column(Float, default=94.0)
    browser_webkit: Mapped[float] = mapped_column(Float, default=91.0)
    browser_edge: Mapped[float] = mapped_column(Float, default=96.0)
    trend_history: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)


class QAAPITest(Base, TimestampMixin):
    """
    API endpoint validation and security assertion record.
    """
    __tablename__ = "qa_api_tests"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"API-{uuid.uuid4().hex[:6].upper()}")
    collection: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="GET")
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, default=200)
    latency_ms: Mapped[int] = mapped_column(Integer, default=150)
    result: Mapped[str] = mapped_column(String(50), default="Pass") # Pass, Fail, Security_Alert
    security_checks: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    headers: Mapped[Dict[str, str]] = mapped_column(JSON, default=dict)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class QAPerformanceTest(Base, TimestampMixin):
    """
    Load, Stress, Spike and Endurance performance execution results.
    """
    __tablename__ = "qa_performance_tests"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"PERF-{uuid.uuid4().hex[:6].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="Load") # Load, Stress, Spike, Endurance
    virtual_users: Mapped[int] = mapped_column(Integer, default=1000)
    requests_per_sec: Mapped[float] = mapped_column(Float, default=4612.0)
    avg_latency_ms: Mapped[float] = mapped_column(Float, default=248.0)
    p50_ms: Mapped[float] = mapped_column(Float, default=180.0)
    p90_ms: Mapped[float] = mapped_column(Float, default=420.0)
    p95_ms: Mapped[float] = mapped_column(Float, default=612.0)
    p99_ms: Mapped[float] = mapped_column(Float, default=850.0)
    error_rate: Mapped[float] = mapped_column(Float, default=0.8)
    status: Mapped[str] = mapped_column(String(50), default="Passed") # Passed, Failed
    duration: Mapped[str] = mapped_column(String(50), default="15m")
    time_series: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)


class QABrowserMatrix(Base, TimestampMixin):
    """
    Cross-browser and multi-device matrix compatibility table.
    """
    __tablename__ = "qa_browser_matrix"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"BM-{uuid.uuid4().hex[:6].upper()}")
    os: Mapped[str] = mapped_column(String(50), nullable=False) # Windows, macOS, Linux, Android, iOS
    browser: Mapped[str] = mapped_column(String(50), nullable=False) # Chrome, Firefox, Safari, Edge
    status: Mapped[str] = mapped_column(String(50), default="Passed") # Passed, Failed
    version: Mapped[str] = mapped_column(String(50), default="latest")
    resolution: Mapped[str] = mapped_column(String(50), default="1920x1080")


class QAVisualDiff(Base, TimestampMixin):
    """
    Visual regression comparison detecting UI pixel shifts and layout alterations.
    """
    __tablename__ = "qa_visual_diffs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"VD-{uuid.uuid4().hex[:6].upper()}")
    page_name: Mapped[str] = mapped_column(String(255), nullable=False)
    baseline_url: Mapped[str] = mapped_column(String(500), default="/visual/baseline_checkout.png")
    current_url: Mapped[str] = mapped_column(String(500), default="/visual/current_checkout.png")
    diff_url: Mapped[str] = mapped_column(String(500), default="/visual/diff_checkout.png")
    differences_count: Mapped[int] = mapped_column(Integer, default=2)
    diff_percentage: Mapped[float] = mapped_column(Float, default=1.0)
    status: Mapped[str] = mapped_column(String(50), default="Pending") # Pending, Approved, Rejected
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diff_regions: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)


class QAAccessibilityScan(Base, TimestampMixin):
    """
    WCAG Accessibility audit scan results and violation items.
    """
    __tablename__ = "qa_accessibility_scans"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"A11Y-{uuid.uuid4().hex[:6].upper()}")
    page_name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_url: Mapped[str] = mapped_column(String(500), default="/checkout")
    wcag_score: Mapped[int] = mapped_column(Integer, default=88)
    level_a: Mapped[int] = mapped_column(Integer, default=100)
    level_aa: Mapped[int] = mapped_column(Integer, default=88)
    level_aaa: Mapped[int] = mapped_column(Integer, default=76)
    total_issues: Mapped[int] = mapped_column(Integer, default=28)
    critical_issues: Mapped[int] = mapped_column(Integer, default=6)
    major_issues: Mapped[int] = mapped_column(Integer, default=12)
    minor_issues: Mapped[int] = mapped_column(Integer, default=10)
    contrast_issues: Mapped[int] = mapped_column(Integer, default=8)
    keyboard_issues: Mapped[int] = mapped_column(Integer, default=6)
    aria_issues: Mapped[int] = mapped_column(Integer, default=5)
    screen_reader_issues: Mapped[int] = mapped_column(Integer, default=5)
    other_issues: Mapped[int] = mapped_column(Integer, default=4)
    violations: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(50), default="Failed") # Passed, Failed


class QADefect(Base, TimestampMixin):
    """
    Defect tracking entity linked to test cases, runs, and root causes.
    """
    __tablename__ = "qa_defects"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"DEF-{uuid.uuid4().hex[:6].upper()}")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Text] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="Critical") # Critical, High, Medium, Low
    status: Mapped[str] = mapped_column(String(50), default="Open") # Open, In_Progress, Resolved, Closed
    test_case_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    test_run_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assignee: Mapped[str] = mapped_column(String(100), default="Unassigned")
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    steps_to_reproduce: Mapped[List[str]] = mapped_column(JSON, default=list)


class QAQualityGate(Base, TimestampMixin):
    """
    CI/CD quality policy gate evaluated prior to release deployment.
    """
    __tablename__ = "qa_quality_gates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=lambda: f"QG-{uuid.uuid4().hex[:6].upper()}")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    environment: Mapped[str] = mapped_column(String(50), default="Production")
    min_pass_rate: Mapped[float] = mapped_column(Float, default=95.0)
    max_critical_bugs: Mapped[int] = mapped_column(Integer, default=0)
    min_coverage: Mapped[float] = mapped_column(Float, default=80.0)
    max_flaky_rate: Mapped[float] = mapped_column(Float, default=2.0)
    status: Mapped[str] = mapped_column(String(50), default="Passed") # Passed, Failed
    is_blocking: Mapped[bool] = mapped_column(Boolean, default=True)
