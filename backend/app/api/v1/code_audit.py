import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.core.tenant import TenantContext, get_current_tenant_context
from app.models.code_audit_models import (
    CodeAuditRun,
    CodeAuditFinding,
    CodeAuditScoreCard,
    CodeAuditTechnicalDebtReport,
    CodeAuditAutofixProposal,
)
from app.models.github import GitHubRepository
from app.schemas.code_audit_schemas import (
    CodeAuditRunCreate,
    CodeAuditRunResponse,
    CodeAuditFindingResponse,
    CodeAuditFindingStatusUpdate,
    CodeAuditScoreCardResponse,
    CodeAuditTechnicalDebtResponse,
    CodeAuditAutofixProposalResponse,
    CodeAuditAutofixRequest,
    CodeAuditFindingExplainResponse,
    CodeAuditArchitectureResponse,
    CodeAuditOverviewResponse,
)
from app.services.code_audit.orchestrator import CodeAuditOrchestrator
from app.services.code_audit.investigation_agent import CodeAuditInvestigationAgent
from app.services.code_audit.autofix_service import CodeAuditAutofixService

router = APIRouter(tags=["Code Audit Engine"])

orchestrator = CodeAuditOrchestrator()
investigation_agent = CodeAuditInvestigationAgent()
autofix_service = CodeAuditAutofixService()


@router.post(
    "/repositories/{repository_id}/runs",
    response_model=CodeAuditRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger a new Code Audit run for a repository",
)
async def trigger_code_audit(
    repository_id: str,
    payload: CodeAuditRunCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    # Verify repository exists
    repo_res = await db.execute(
        select(GitHubRepository).where(GitHubRepository.id == repository_id)
    )
    repo = repo_res.scalars().first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository '{repository_id}' not found",
        )

    branch = payload.branch or repo.default_branch or "main"
    run = await orchestrator.execute_audit(
        db=db,
        repository_id=repository_id,
        scope=payload.scope,
        branch=branch,
        commit_sha=repo.last_commit_sha or "HEAD",
        trigger_type="MANUAL",
    )
    return run


@router.get(
    "/repositories/{repository_id}/runs",
    response_model=List[CodeAuditRunResponse],
    summary="List all Code Audit runs for a repository",
)
async def list_code_audit_runs(
    repository_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = (
        select(CodeAuditRun)
        .where(CodeAuditRun.repository_id == repository_id)
        .options(
            selectinload(CodeAuditRun.scorecard),
            selectinload(CodeAuditRun.technical_debt),
        )
        .order_by(desc(CodeAuditRun.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get(
    "/overview",
    response_model=CodeAuditOverviewResponse,
    summary="Get overall Code Audit summary and scorecard trends",
)
async def get_code_audit_overview(
    repository_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = (
        select(CodeAuditRun)
        .options(
            selectinload(CodeAuditRun.scorecard),
            selectinload(CodeAuditRun.technical_debt),
        )
        .order_by(desc(CodeAuditRun.created_at))
    )
    if repository_id:
        stmt = stmt.where(CodeAuditRun.repository_id == repository_id)

    res = await db.execute(stmt.limit(10))
    runs = res.scalars().all()

    if not runs:
        return CodeAuditOverviewResponse(
            latest_run=None,
            previous_score=None,
            score_delta=None,
            total_audits=0,
            grade_history=[],
            category_summary={},
        )

    latest = runs[0]
    prev_score = runs[1].overall_score if len(runs) > 1 else None
    delta = round(latest.overall_score - prev_score, 1) if prev_score is not None else 0.0

    history = [
        {
            "run_id": r.id,
            "created_at": r.created_at.isoformat(),
            "score": r.overall_score,
            "grade": r.health_grade,
        }
        for r in runs
    ]

    cat_summary = {}
    if latest.scorecard:
        cat_summary = {
            "QUALITY": latest.scorecard.quality_score,
            "ARCHITECTURE": latest.scorecard.architecture_score,
            "PERFORMANCE": latest.scorecard.performance_score,
            "TESTING": latest.scorecard.testing_score,
            "MAINTAINABILITY": latest.scorecard.maintainability_score,
            "RELIABILITY": latest.scorecard.reliability_score,
            "DOCUMENTATION": latest.scorecard.documentation_score,
        }

    return CodeAuditOverviewResponse(
        latest_run=latest,
        previous_score=prev_score,
        score_delta=delta,
        total_audits=len(runs),
        grade_history=history,
        category_summary=cat_summary,
    )


@router.get(
    "/runs/{run_id}",
    response_model=CodeAuditRunResponse,
    summary="Get single Code Audit run details and scorecard",
)
async def get_code_audit_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = (
        select(CodeAuditRun)
        .where(CodeAuditRun.id == run_id)
        .options(
            selectinload(CodeAuditRun.scorecard),
            selectinload(CodeAuditRun.technical_debt),
        )
    )
    res = await db.execute(stmt)
    run = res.scalars().first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Code audit run '{run_id}' not found",
        )
    return run


@router.get(
    "/runs/{run_id}/findings",
    response_model=List[CodeAuditFindingResponse],
    summary="Get paginated, filterable findings for an audit run",
)
async def get_run_findings(
    run_id: str,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditFinding).where(CodeAuditFinding.run_id == run_id)

    if category:
        stmt = stmt.where(CodeAuditFinding.category == category.upper())
    if severity:
        stmt = stmt.where(CodeAuditFinding.severity == severity.upper())
    if priority:
        stmt = stmt.where(CodeAuditFinding.priority == priority.upper())
    if status_filter:
        stmt = stmt.where(CodeAuditFinding.status == status_filter.upper())
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (CodeAuditFinding.title.ilike(search_term))
            | (CodeAuditFinding.file_path.ilike(search_term))
            | (CodeAuditFinding.rule_id.ilike(search_term))
        )

    stmt = stmt.order_by(
        CodeAuditFinding.severity, CodeAuditFinding.priority
    ).offset(skip).limit(limit)

    res = await db.execute(stmt)
    return res.scalars().all()


@router.get(
    "/runs/{run_id}/scores",
    response_model=CodeAuditScoreCardResponse,
    summary="Get scorecard metrics and formula breakdown for an audit run",
)
async def get_run_scorecard(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditScoreCard).where(CodeAuditScoreCard.run_id == run_id)
    res = await db.execute(stmt)
    sc = res.scalars().first()
    if not sc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scorecard for run '{run_id}' not found",
        )
    return sc


@router.get(
    "/runs/{run_id}/technical-debt",
    response_model=CodeAuditTechnicalDebtResponse,
    summary="Get technical debt analysis, module breakdown, and hotspots",
)
async def get_run_technical_debt(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditTechnicalDebtReport).where(
        CodeAuditTechnicalDebtReport.run_id == run_id
    )
    res = await db.execute(stmt)
    debt = res.scalars().first()
    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Technical debt report for run '{run_id}' not found",
        )
    return debt


@router.get(
    "/runs/{run_id}/architecture",
    response_model=CodeAuditArchitectureResponse,
    summary="Get architecture dependency graph, coupling metrics, and circular dependencies",
)
async def get_run_architecture(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditRun).where(CodeAuditRun.id == run_id)
    res = await db.execute(stmt)
    run = res.scalars().first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Code audit run '{run_id}' not found",
        )

    meta = run.metadata_json or {}
    arch = meta.get("architecture_metadata", {})
    return CodeAuditArchitectureResponse(
        run_id=run.id,
        graph_nodes=arch.get("graph_nodes", []),
        graph_edges=arch.get("graph_edges", []),
        circular_dependencies=arch.get("circular_dependencies", []),
        coupling_index=arch.get("coupling_index", 0.0),
        modular_cohesion=arch.get("modular_cohesion", 1.0),
        god_classes=arch.get("god_classes", []),
    )


@router.get(
    "/findings/{finding_id}",
    response_model=CodeAuditFindingResponse,
    summary="Get single finding details, code evidence, root cause, and recommendations",
)
async def get_finding_detail(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditFinding).where(CodeAuditFinding.id == finding_id)
    res = await db.execute(stmt)
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )
    return finding


@router.patch(
    "/findings/{finding_id}/status",
    response_model=CodeAuditFindingResponse,
    summary="Update finding triage status with audit reason",
)
async def update_finding_status(
    finding_id: str,
    payload: CodeAuditFindingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditFinding).where(CodeAuditFinding.id == finding_id)
    res = await db.execute(stmt)
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )

    valid_statuses = ["OPEN", "IN_REVIEW", "RESOLVED", "ACCEPTED_RISK", "FALSE_POSITIVE"]
    if payload.status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Valid statuses: {valid_statuses}",
        )

    finding.status = payload.status.upper()
    finding.status_reason = payload.status_reason
    await db.commit()
    await db.refresh(finding)
    return finding


@router.post(
    "/findings/{finding_id}/explain",
    response_model=CodeAuditFindingExplainResponse,
    summary="AI deep dive explanation of finding, root cause, and refactoring guidance",
)
async def explain_finding_endpoint(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    stmt = select(CodeAuditFinding).where(CodeAuditFinding.id == finding_id)
    res = await db.execute(stmt)
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found",
        )

    expl = investigation_agent.explain_finding(finding)
    return CodeAuditFindingExplainResponse(
        finding_id=finding.id,
        explanation=expl["explanation"],
        root_cause_analysis=expl["root_cause_analysis"],
        refactoring_pattern=expl["refactoring_pattern"],
        preventative_advice=expl["preventative_advice"],
    )


@router.post(
    "/findings/{finding_id}/autofix",
    response_model=CodeAuditAutofixProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI/deterministic autofix patch with validation test command",
)
async def generate_autofix_endpoint(
    finding_id: str,
    payload: Optional[CodeAuditAutofixRequest] = None,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant_context),
):
    try:
        custom_inst = payload.custom_instructions if payload else None
        proposal = await autofix_service.generate_autofix(
            db=db,
            finding_id=finding_id,
            custom_instructions=custom_inst,
        )
        return proposal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

