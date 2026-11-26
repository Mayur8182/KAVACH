from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class CodeAuditRunCreate(BaseModel):
    scope: str = Field(
        default="FULL",
        description="Audit scope: FULL, QUALITY, ARCHITECTURE, PERFORMANCE, TESTING, MAINTAINABILITY, RELIABILITY, DOCUMENTATION",
    )
    branch: Optional[str] = Field(default=None, description="Target branch (defaults to repo default branch)")


class CodeAuditFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    repository_id: str
    category: str
    rule_id: str
    title: str
    description: str
    severity: str
    priority: str
    confidence: str
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    code_evidence: Optional[str] = None
    root_cause: Optional[str] = None
    technical_impact: Optional[str] = None
    recommended_solution: Optional[str] = None
    estimated_remediation_minutes: int
    related_files: List[str] = []
    related_symbols: List[str] = []
    detection_method: str
    status: str
    status_reason: Optional[str] = None
    created_at: datetime


class CodeAuditFindingStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        description="Target status: OPEN, IN_REVIEW, RESOLVED, ACCEPTED_RISK, FALSE_POSITIVE",
    )
    status_reason: Optional[str] = Field(
        default=None,
        description="Audit trail reason explaining why status was changed",
    )


class CodeAuditScoreCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    quality_score: float
    architecture_score: float
    performance_score: float
    testing_score: float
    maintainability_score: float
    reliability_score: float
    documentation_score: float
    overall_score: float
    health_grade: str
    formula_breakdown: Dict[str, Any] = {}


class CodeAuditTechnicalDebtResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    total_debt_hours: float
    high_priority_hours: float
    debt_by_module: Dict[str, float] = {}
    debt_by_category: Dict[str, float] = {}
    top_complex_files: List[Dict[str, Any]] = []
    maintenance_hotspots: List[Dict[str, Any]] = []


class CodeAuditAutofixProposalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_id: str
    run_id: str
    diff_patch: str
    explanation: str
    validation_command: Optional[str] = None
    validation_status: str
    pull_request_url: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime


class CodeAuditAutofixRequest(BaseModel):
    custom_instructions: Optional[str] = Field(
        default=None,
        description="Optional developer guidance to steer patch generation",
    )


class CodeAuditFindingExplainResponse(BaseModel):
    finding_id: str
    explanation: str
    root_cause_analysis: str
    refactoring_pattern: str
    preventative_advice: str


class CodeAuditArchitectureResponse(BaseModel):
    run_id: str
    graph_nodes: List[Dict[str, Any]] = []
    graph_edges: List[Dict[str, Any]] = []
    circular_dependencies: List[List[str]] = []
    coupling_index: float = 0.0
    modular_cohesion: float = 1.0
    god_classes: List[Dict[str, Any]] = []


class CodeAuditRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    snapshot_id: Optional[str] = None
    branch: str
    commit_sha: str
    scope: str
    status: str
    overall_score: float
    health_grade: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    total_debt_hours: float
    duration_seconds: float
    error_message: Optional[str] = None
    trigger_type: str
    created_at: datetime
    updated_at: datetime
    scorecard: Optional[CodeAuditScoreCardResponse] = None
    technical_debt: Optional[CodeAuditTechnicalDebtResponse] = None


class CodeAuditOverviewResponse(BaseModel):
    latest_run: Optional[CodeAuditRunResponse] = None
    previous_score: Optional[float] = None
    score_delta: Optional[float] = None
    total_audits: int = 0
    grade_history: List[Dict[str, Any]] = []
    category_summary: Dict[str, float] = {}

