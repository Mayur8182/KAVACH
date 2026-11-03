from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.qa.service import qa_service
from app.qa.gemini_qa_service import GeminiQAService
from app.qa.schemas import (
    QAOverviewMetrics,
    TestCaseCreate,
    TestCaseUpdate,
    TestCaseStepUpdate,
    TestCaseResponse,
    TestRunCreate,
    TestRunResponse,
    AutomationMetricResponse,
    APITestCreate,
    APITestExecuteRequest,
    APITestResponse,
    PerformanceTestCreate,
    PerformanceTestResponse,
    BrowserMatrixResponse,
    VisualDiffResponse,
    VisualDiffReviewRequest,
    AccessibilityScanResponse,
    DefectCreate,
    DefectResponse,
    QualityGateResponse,
    AITestCaseGenerateRequest,
    AITestCaseGenerateResponse,
    AIAutomateRequest,
    AIAutomateResponse,
    AIFailureAnalysisRequest,
    AIFailureAnalysisResponse,
    AIVisualDiffExplainRequest,
    AIVisualDiffExplainResponse,
    AIA11yRemediateRequest,
    AIA11yRemediateResponse,
    AIAPITestGenerateRequest,
    AIAPITestGenerateResponse,
    TestSuiteCreate,
    TestSuiteResponse,
    TestPlanCreate,
    TestPlanResponse,
)

router = APIRouter(prefix="/qa", tags=["Quality Engineering (QA)"])
gemini_qa = GeminiQAService()


# =========================================================================
# OVERVIEW DASHBOARD
# =========================================================================

@router.get("/overview", response_model=QAOverviewMetrics)
async def get_qa_overview(db: AsyncSession = Depends(get_db)):
    """Returns aggregated high-level QA metrics, execution health, trend, hotspots, runs, and failures."""
    return await qa_service.get_overview_metrics(db)


# =========================================================================
# TEST CASES
# =========================================================================

@router.get("/test-cases", response_model=List[TestCaseResponse])
async def list_test_cases(
    search: Optional[str] = Query(None, description="Search term in title or description"),
    suite: Optional[str] = Query(None, description="Filter by suite"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    status: Optional[str] = Query(None, description="Filter by status"),
    automation: Optional[str] = Query(None, description="Filter by framework"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Lists test cases with multi-criteria filtering and pagination."""
    items = await qa_service.list_test_cases(db, search, suite, priority, status, automation, limit, offset)
    return items


@router.post("/test-cases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case(payload: TestCaseCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new test case and persists it to the database."""
    return await qa_service.create_test_case(db, payload)


@router.get("/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def get_test_case(test_case_id: str, db: AsyncSession = Depends(get_db)):
    """Fetches full test case details, step definitions, and automation bindings."""
    tc = await qa_service.get_test_case(db, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case '{test_case_id}' not found.")
    return tc


@router.put("/test-cases/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(test_case_id: str, payload: TestCaseUpdate, db: AsyncSession = Depends(get_db)):
    """Updates test case fields."""
    tc = await qa_service.update_test_case(db, test_case_id, payload)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case '{test_case_id}' not found.")
    return tc


@router.put("/test-cases/{test_case_id}/steps/{step_number}", response_model=TestCaseResponse)
async def update_test_case_step(
    test_case_id: str,
    step_number: int,
    payload: TestCaseStepUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates the execution status and actual outcome of a single step in a test case."""
    tc = await qa_service.update_test_case_step(db, test_case_id, step_number, payload.actual, payload.status)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case '{test_case_id}' not found.")
    return tc


@router.post("/test-cases/{test_case_id}/run", response_model=TestCaseResponse)
async def run_test_case(test_case_id: str, db: AsyncSession = Depends(get_db)):
    """Executes automated verification for a specific test case."""
    tc = await qa_service.run_test_case(db, test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case '{test_case_id}' not found.")
    return tc


# =========================================================================
# TEST RUNS
# =========================================================================

@router.get("/test-runs", response_model=List[TestRunResponse])
async def list_test_runs(limit: int = Query(50, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    """Retrieves all past and current test run executions."""
    return await qa_service.list_test_runs(db, limit)


@router.post("/test-runs", response_model=TestRunResponse, status_code=status.HTTP_201_CREATED)
async def trigger_test_run(payload: TestRunCreate, db: AsyncSession = Depends(get_db)):
    """Triggers an end-to-end execution of a test suite."""
    return await qa_service.create_test_run(db, payload)


# =========================================================================
# AUTOMATION
# =========================================================================

@router.get("/automation", response_model=AutomationMetricResponse)
async def get_automation_overview(db: AsyncSession = Depends(get_db)):
    """Retrieves Playwright/Cypress automation KPIs, browser breakdown, and execution trend."""
    return await qa_service.get_automation_metrics(db)


# =========================================================================
# API TESTING
# =========================================================================

@router.get("/api-testing", response_model=List[APITestResponse])
async def list_api_tests(db: AsyncSession = Depends(get_db)):
    """Retrieves all registered API endpoint tests grouped by collection."""
    return await qa_service.list_api_tests(db)


@router.post("/api-testing", response_model=APITestResponse, status_code=status.HTTP_201_CREATED)
async def create_api_test(payload: APITestCreate, db: AsyncSession = Depends(get_db)):
    """Registers a new API endpoint test with expected response criteria."""
    return await qa_service.create_api_test(db, payload)


@router.post("/api-testing/{test_id}/execute", response_model=APITestResponse)
async def execute_api_test(test_id: str, db: AsyncSession = Depends(get_db)):
    """Executes live network request or simulation against the specified API endpoint."""
    res = await qa_service.execute_api_test(db, test_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"API test '{test_id}' not found.")
    return res


# =========================================================================
# PERFORMANCE TESTING
# =========================================================================

@router.get("/performance", response_model=List[PerformanceTestResponse])
async def list_performance_tests(db: AsyncSession = Depends(get_db)):
    """Lists load, stress, spike, and endurance performance test results."""
    return await qa_service.list_performance_tests(db)


@router.post("/performance/run", response_model=PerformanceTestResponse, status_code=status.HTTP_201_CREATED)
async def run_performance_test(payload: PerformanceTestCreate, db: AsyncSession = Depends(get_db)):
    """Launches virtual user load test simulation."""
    return await qa_service.run_performance_test(db, payload)


# =========================================================================
# BROWSER & DEVICE TESTING
# =========================================================================

@router.get("/browsers", response_model=List[BrowserMatrixResponse])
async def get_browser_matrix(db: AsyncSession = Depends(get_db)):
    """Retrieves OS x Browser cross-compatibility matrix results."""
    return await qa_service.get_browser_matrix(db)


@router.post("/browsers/launch", response_model=BrowserMatrixResponse)
async def launch_browser_test(
    os_name: str = Query("Windows"),
    browser_name: str = Query("Chrome"),
    db: AsyncSession = Depends(get_db)
):
    """Launches Playwright container worker for specified OS and browser."""
    return await qa_service.launch_browser_matrix_test(db, os_name, browser_name)


# =========================================================================
# VISUAL REGRESSION
# =========================================================================

@router.get("/visual-regression", response_model=List[VisualDiffResponse])
async def list_visual_diffs(db: AsyncSession = Depends(get_db)):
    """Lists visual diff comparisons detecting pixel layout changes."""
    return await qa_service.list_visual_diffs(db)


@router.post("/visual-regression/{diff_id}/review", response_model=VisualDiffResponse)
async def review_visual_diff(diff_id: str, payload: VisualDiffReviewRequest, db: AsyncSession = Depends(get_db)):
    """Approves or rejects visual diff changes."""
    diff = await qa_service.review_visual_diff(db, diff_id, payload.action)
    if not diff:
        raise HTTPException(status_code=404, detail=f"Visual diff '{diff_id}' not found.")
    return diff


@router.post("/visual-regression/approve-all")
async def approve_all_visual_diffs(db: AsyncSession = Depends(get_db)):
    """Batch approves all pending visual difference baseline updates."""
    count = await qa_service.approve_all_visual_diffs(db)
    return {"status": "success", "approved_count": count}


# =========================================================================
# ACCESSIBILITY (A11Y)
# =========================================================================

@router.get("/accessibility", response_model=List[AccessibilityScanResponse])
async def list_accessibility_scans(db: AsyncSession = Depends(get_db)):
    """Lists WCAG accessibility compliance scans and violation items."""
    return await qa_service.list_accessibility_scans(db)


@router.post("/accessibility/scan", response_model=AccessibilityScanResponse)
async def trigger_accessibility_scan(
    page_name: str = Query("Checkout Page"),
    target_url: str = Query("/checkout"),
    db: AsyncSession = Depends(get_db)
):
    """Executes automated WCAG 2.1 AA accessibility scanner."""
    return await qa_service.run_accessibility_scan(db, page_name, target_url)


# =========================================================================
# DEFECTS
# =========================================================================

@router.get("/defects", response_model=List[DefectResponse])
async def list_defects(db: AsyncSession = Depends(get_db)):
    """Lists defects discovered during automated or manual test runs."""
    return await qa_service.list_defects(db)


@router.post("/defects", response_model=DefectResponse, status_code=status.HTTP_201_CREATED)
async def create_defect(payload: DefectCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new defect bug report."""
    return await qa_service.create_defect(db, payload)


# =========================================================================
# QUALITY GATES
# =========================================================================

@router.get("/quality-gates", response_model=List[QualityGateResponse])
async def list_quality_gates(db: AsyncSession = Depends(get_db)):
    """Retrieves deployment quality gates policy status."""
    return await qa_service.list_quality_gates(db)


# =========================================================================
# GEMINI AI INTELLIGENCE ENDPOINTS
# =========================================================================

@router.post("/ai/generate-test-cases", response_model=AITestCaseGenerateResponse)
async def ai_generate_test_cases(payload: AITestCaseGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Uses Google Gemini 2.5 to synthesize structured, edge-case resilient test cases."""
    result = await gemini_qa.generate_test_cases(
        prompt=payload.prompt,
        suite=payload.suite or "Authentication",
        priority=payload.priority or "High",
        count=payload.count or 3
    )
    # Automatically persist generated test cases into database
    created_items = []
    for tc_data in result.get("test_cases", []):
        try:
            created = await qa_service.create_test_case(
                db,
                TestCaseCreate(
                    name=tc_data.get("name", "Generated Test"),
                    suite=tc_data.get("suite", payload.suite or "General"),
                    priority=tc_data.get("priority", payload.priority or "Medium"),
                    type=tc_data.get("type", "Functional"),
                    status="Active",
                    automation="Playwright",
                    owner="Gemini AI",
                    description=tc_data.get("description", ""),
                    expected_result=tc_data.get("expected_result", ""),
                    actual_result="Pending first test run execution.",
                    tags=tc_data.get("tags", ["gemini", "ai-generated"]),
                    steps=tc_data.get("steps", [])
                )
            )
            created_items.append(created)
        except Exception:
            pass

    return result


@router.post("/ai/automate-test", response_model=AIAutomateResponse)
async def ai_automate_test(payload: AIAutomateRequest, db: AsyncSession = Depends(get_db)):
    """Generates ready-to-run Playwright TypeScript or Cypress automation code for a test case."""
    tc = await qa_service.get_test_case(db, payload.test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case '{payload.test_case_id}' not found.")
    
    tc_dict = {
        "id": tc.id,
        "name": tc.name,
        "description": tc.description,
        "steps": tc.steps or []
    }
    result = await gemini_qa.automate_test_case(tc_dict, framework=payload.target_framework)
    # Save script to test case
    tc.automation_script = result.get("script")
    tc.automation = payload.target_framework.capitalize()
    await db.commit()
    return result


@router.post("/ai/analyze-failure", response_model=AIFailureAnalysisResponse)
async def ai_analyze_failure(payload: AIFailureAnalysisRequest):
    """Diagnoses test failure root cause, explains error stack, and provides code remediation patch."""
    return await gemini_qa.analyze_failure(
        error_message=payload.error_message,
        stack_trace=payload.stack_trace,
        expected=payload.expected_result,
        actual=payload.actual_result
    )


@router.post("/ai/explain-visual-diff", response_model=AIVisualDiffExplainResponse)
async def ai_explain_visual_diff(payload: AIVisualDiffExplainRequest):
    """Uses Gemini reasoning to explain visual regression bounding boxes and recommend approval or rejection."""
    return await gemini_qa.explain_visual_diff(
        page_name=payload.page_name,
        differences_count=payload.differences_count,
        bounding_boxes=payload.bounding_boxes
    )


@router.post("/ai/remediate-a11y", response_model=AIA11yRemediateResponse)
async def ai_remediate_a11y(payload: AIA11yRemediateRequest):
    """Generates WCAG AA/AAA compliant remediation HTML/CSS for accessibility violations."""
    return await gemini_qa.remediate_a11y(
        violation_rule=payload.violation_rule,
        element_snippet=payload.element_snippet,
        impact=payload.impact
    )


@router.post("/ai/generate-api-tests", response_model=AIAPITestGenerateResponse)
async def ai_generate_api_tests(payload: AIAPITestGenerateRequest):
    """Generates positive, negative, and security boundary test cases for an API endpoint."""
    return await gemini_qa.generate_api_tests(
        endpoint_path=payload.endpoint_path,
        method=payload.method,
        sample_payload=payload.sample_payload
    )


# =========================================================================
# TEST SUITES
# =========================================================================

@router.get("/test-suites", response_model=List[TestSuiteResponse])
async def list_test_suites(db: AsyncSession = Depends(get_db)):
    """Retrieves all registered test suites."""
    return await qa_service.list_test_suites(db)


@router.post("/test-suites", response_model=TestSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_test_suite(payload: TestSuiteCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new test suite."""
    return await qa_service.create_test_suite(db, payload)


# =========================================================================
# TEST PLANS
# =========================================================================

@router.get("/test-plans", response_model=List[TestPlanResponse])
async def list_test_plans(db: AsyncSession = Depends(get_db)):
    """Retrieves all test plans and release certification milestones."""
    return await qa_service.list_test_plans(db)


@router.post("/test-plans", response_model=TestPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_test_plan(payload: TestPlanCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new test plan."""
    return await qa_service.create_test_plan(db, payload)

