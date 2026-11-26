import time
import os
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.code_audit_models import (
    CodeAuditRun,
    CodeAuditFinding,
    CodeAuditScoreCard,
    CodeAuditTechnicalDebtReport,
)
from app.models.repository_intelligence import (
    RepositorySnapshot,
    RepositoryFileIndex,
    RepositoryCodeSymbol,
    RepositoryApiEndpoint,
    RepositoryArchitectureMap,
    RepositoryDependencyRelation,
)
from app.services.code_audit.scoring_engine import CodeAuditScoringEngine
from app.services.code_audit.technical_debt_engine import CodeAuditTechnicalDebtEngine
from app.services.code_audit.code_quality_agent import CodeQualityAuditAgent
from app.services.code_audit.architecture_audit_agent import ArchitectureAuditAgent
from app.services.code_audit.performance_audit_agent import PerformanceAuditAgent
from app.services.code_audit.testing_audit_agent import TestingAuditAgent
from app.services.code_audit.maintainability_agent import MaintainabilityAgent
from app.services.code_audit.reliability_audit_agent import ReliabilityAuditAgent
from app.services.code_audit.documentation_audit_agent import DocumentationAuditAgent
from app.services.code_audit.investigation_agent import CodeAuditInvestigationAgent


class CodeAuditOrchestrator:
    """
    Master orchestrator for the Kavach Enterprise Code Audit Engine.
    Dispatches specialized audit agents, aggregates evidence, computes scores,
    and stores atomic audit records.
    """

    def __init__(self):
        self.quality_agent = CodeQualityAuditAgent()
        self.arch_agent = ArchitectureAuditAgent()
        self.perf_agent = PerformanceAuditAgent()
        self.testing_agent = TestingAuditAgent()
        self.maint_agent = MaintainabilityAgent()
        self.rel_agent = ReliabilityAuditAgent()
        self.doc_agent = DocumentationAuditAgent()
        self.investigation_agent = CodeAuditInvestigationAgent()

    async def execute_audit(
        self,
        db: AsyncSession,
        repository_id: str,
        scope: str = "FULL",
        branch: str = "main",
        commit_sha: str = "HEAD",
        files: Optional[List[Any]] = None,
        snapshot_id: Optional[str] = None,
        trigger_type: str = "MANUAL",
    ) -> CodeAuditRun:
        start_time = time.time()

        # Create initial run record
        run = CodeAuditRun(
            repository_id=repository_id,
            snapshot_id=snapshot_id,
            branch=branch,
            commit_sha=commit_sha,
            scope=scope.upper(),
            status="RUNNING",
            trigger_type=trigger_type,
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        try:
            repo_uuid = uuid.UUID(str(repository_id))
        except Exception:
            repo_uuid = repository_id

        try:
            # If files not provided directly, load from database RepositoryFileIndex
            if not files:
                file_stmt = (
                    select(RepositoryFileIndex)
                    .where(RepositoryFileIndex.repository_id == repo_uuid)
                )
                if snapshot_id:
                    file_stmt = file_stmt.where(RepositoryFileIndex.snapshot_id == snapshot_id)
                res = await db.execute(file_stmt)
                files = res.scalars().all()

            # Load symbols, dependencies, and endpoints for cross-module intelligence
            sym_stmt = select(RepositoryCodeSymbol).where(RepositoryCodeSymbol.repository_id == repo_uuid)
            if snapshot_id:
                sym_stmt = sym_stmt.where(RepositoryCodeSymbol.snapshot_id == snapshot_id)
            sym_res = await db.execute(sym_stmt)
            symbols = sym_res.scalars().all()

            dep_stmt = select(RepositoryDependencyRelation).where(RepositoryDependencyRelation.repository_id == repo_uuid)
            if snapshot_id:
                dep_stmt = dep_stmt.where(RepositoryDependencyRelation.snapshot_id == snapshot_id)
            dep_res = await db.execute(dep_stmt)
            dependencies = dep_res.scalars().all()

            ep_stmt = select(RepositoryApiEndpoint).where(RepositoryApiEndpoint.repository_id == repo_uuid)
            if snapshot_id:
                ep_stmt = ep_stmt.where(RepositoryApiEndpoint.snapshot_id == snapshot_id)
            ep_res = await db.execute(ep_stmt)
            endpoints = ep_res.scalars().all()

            arch_stmt = select(RepositoryArchitectureMap).where(RepositoryArchitectureMap.repository_id == repo_uuid)
            if snapshot_id:
                arch_stmt = arch_stmt.where(RepositoryArchitectureMap.snapshot_id == snapshot_id)
            arch_res = await db.execute(arch_stmt)
            arch_map = arch_res.scalars().first()

            raw_findings: List[Dict[str, Any]] = []
            arch_meta: Dict[str, Any] = {}
            maint_file_metrics: List[Dict[str, Any]] = []

            # Dispatch agents according to scope
            target_scope = scope.upper()

            if target_scope in ("FULL", "QUALITY"):
                raw_findings.extend(self.quality_agent.analyze(files, symbols))

            if target_scope in ("FULL", "ARCHITECTURE"):
                arch_finds, arch_meta = self.arch_agent.analyze(files, dependencies, symbols)
                raw_findings.extend(arch_finds)

            if target_scope in ("FULL", "PERFORMANCE"):
                raw_findings.extend(self.perf_agent.analyze(files, endpoints))

            if target_scope in ("FULL", "TESTING"):
                raw_findings.extend(self.testing_agent.analyze(files, symbols))

            if target_scope in ("FULL", "MAINTAINABILITY"):
                maint_finds, maint_file_metrics = self.maint_agent.analyze(files, symbols)
                raw_findings.extend(maint_finds)

            if target_scope in ("FULL", "RELIABILITY"):
                raw_findings.extend(self.rel_agent.analyze(files, symbols))

            if target_scope in ("FULL", "DOCUMENTATION"):
                raw_findings.extend(self.doc_agent.analyze(files, symbols))

            # Correlate, deduplicate, and prioritize findings
            processed_findings = self.investigation_agent.correlate_and_prioritize(
                raw_findings, symbols, arch_map
            )

            # Calculate scores
            scores = CodeAuditScoringEngine.calculate_scores(processed_findings)

            # Calculate technical debt
            debt_result = CodeAuditTechnicalDebtEngine.calculate_debt(processed_findings)

            # Update run metrics
            duration = round(time.time() - start_time, 2)
            sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
            for f in processed_findings:
                s = f.get("severity", "MEDIUM").upper()
                if s in sev_counts:
                    sev_counts[s] += 1

            run.status = "COMPLETED"
            run.overall_score = scores.overall_score
            run.health_grade = scores.health_grade
            run.total_findings = len(processed_findings)
            run.critical_count = sev_counts["CRITICAL"]
            run.high_count = sev_counts["HIGH"]
            run.medium_count = sev_counts["MEDIUM"]
            run.low_count = sev_counts["LOW"]
            run.info_count = sev_counts["INFO"]
            run.total_debt_hours = debt_result.total_debt_hours
            run.duration_seconds = duration
            run.metadata_json = {
                "architecture_metadata": arch_meta,
                "maintainability_metrics": maint_file_metrics[:20],
            }

            # Create findings records
            db_findings = []
            for f in processed_findings:
                finding_rec = CodeAuditFinding(
                    run_id=run.id,
                    repository_id=repository_id,
                    category=f.get("category", "QUALITY"),
                    rule_id=f.get("rule_id", "KAV-AUDIT-001"),
                    title=f.get("title", ""),
                    description=f.get("description", ""),
                    severity=f.get("severity", "MEDIUM"),
                    priority=f.get("priority", "P2"),
                    confidence=f.get("confidence", "HIGH"),
                    file_path=f.get("file_path", ""),
                    start_line=f.get("start_line"),
                    end_line=f.get("end_line"),
                    code_evidence=f.get("code_evidence"),
                    root_cause=f.get("root_cause"),
                    technical_impact=f.get("technical_impact"),
                    recommended_solution=f.get("recommended_solution"),
                    estimated_remediation_minutes=f.get("estimated_remediation_minutes", 15),
                    related_files=f.get("related_files", []),
                    related_symbols=f.get("related_symbols", []),
                    detection_method=f.get("detection_method", "AST_ANALYSIS"),
                    status="OPEN",
                )
                db.add(finding_rec)
                db_findings.append(finding_rec)

            # Create ScoreCard
            scorecard = CodeAuditScoreCard(
                run_id=run.id,
                quality_score=scores.quality_score,
                architecture_score=scores.architecture_score,
                performance_score=scores.performance_score,
                testing_score=scores.testing_score,
                maintainability_score=scores.maintainability_score,
                reliability_score=scores.reliability_score,
                documentation_score=scores.documentation_score,
                overall_score=scores.overall_score,
                health_grade=scores.health_grade,
                formula_breakdown=scores.formula_breakdown,
            )
            db.add(scorecard)

            # Create Technical Debt Report
            debt_report = CodeAuditTechnicalDebtReport(
                run_id=run.id,
                total_debt_hours=debt_result.total_debt_hours,
                high_priority_hours=debt_result.high_priority_hours,
                debt_by_module=debt_result.debt_by_module,
                debt_by_category=debt_result.debt_by_category,
                top_complex_files=debt_result.top_complex_files,
                maintenance_hotspots=debt_result.maintenance_hotspots,
            )
            db.add(debt_report)

            await db.commit()
            await db.refresh(run)

            # Re-query with eager loaded relationships
            stmt = (
                select(CodeAuditRun)
                .where(CodeAuditRun.id == run.id)
                .options(
                    selectinload(CodeAuditRun.scorecard),
                    selectinload(CodeAuditRun.technical_debt),
                    selectinload(CodeAuditRun.findings),
                )
            )
            res = await db.execute(stmt)
            return res.scalars().first()

        except Exception as e:
            await db.rollback()
            run.status = "FAILED"
            run.error_message = str(e)
            run.duration_seconds = round(time.time() - start_time, 2)
            db.add(run)
            await db.commit()
            raise
