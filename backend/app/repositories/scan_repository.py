import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.scan import (
    SecurityScan,
    ScannerExecution,
    SecurityFinding,
    RequirementVerificationResult,
)
from app.engines.scanner.models import FullScanVerificationResult


class ScanRepository:
    """PostgreSQL data access layer for Security Scans, Executions, Findings, and Verifications."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_scan(
        self,
        project_id: uuid.UUID,
        target_type: str,
        target_path: str,
        requested_by: str,
        blueprint_id: Optional[uuid.UUID] = None,
        intent_id: Optional[uuid.UUID] = None,
        target_reference: Optional[str] = None,
    ) -> SecurityScan:
        scan = SecurityScan(
            project_id=project_id,
            blueprint_id=blueprint_id,
            intent_id=intent_id,
            target_type=target_type,
            target_path=target_path,
            target_reference=target_reference,
            status="QUEUED",
            requested_by=requested_by,
        )
        self.session.add(scan)
        await self.session.flush()
        return scan

    async def record_scan_results(
        self,
        scan_id: uuid.UUID,
        scan_result: FullScanVerificationResult,
    ) -> SecurityScan:
        scan = await self.get_by_id(scan_id, include_details=False)
        if not scan:
            raise ValueError(f"Scan with ID '{scan_id}' not found")

        scan.status = scan_result.status
        scan.completed_at = datetime.now(timezone.utc)
        scan.scanner_count = scan_result.scanner_count
        scan.finding_count = scan_result.finding_count
        scan.error_message = scan_result.error_message

        # Persist Executions & Findings
        for exec_res in scan_result.executions:
            execution = ScannerExecution(
                scan_id=scan.id,
                scanner_name=exec_res.scanner_name,
                scanner_type=exec_res.scanner_type,
                status=exec_res.status,
                scanner_version=exec_res.scanner_version,
                command=exec_res.command,
                exit_code=exec_res.exit_code,
                stdout_summary=exec_res.stdout_summary,
                stderr_output=exec_res.stderr_output,
                finding_count=len(exec_res.findings),
                duration_ms=exec_res.duration_ms,
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
            )
            self.session.add(execution)
            await self.session.flush()

            from app.services.unified_findings_service import classify_finding_module

            repo_ref = scan.target_reference or "codebase"
            clean_repo = repo_ref.split("/")[-1].replace(".git", "")

            for f in exec_res.findings:
                # Determine module category robustly
                initial_cat = getattr(f, "category", None) or exec_res.scanner_type or "SAST"
                mod = classify_finding_module(exec_res.scanner_name, f.rule_id, initial_cat)
                finding_cat = mod.value if mod else initial_cat

                finding = SecurityFinding(
                    scan_id=scan.id,
                    scanner_execution_id=execution.id,
                    scanner_name=exec_res.scanner_name,
                    rule_id=f.rule_id,
                    title=f.title,
                    description=f.description,
                    severity=f.severity,
                    file_path=f.file_path,
                    line_number=f.line_number,
                    column_number=f.column_number,
                    snippet=f.snippet,
                    fingerprint=f.fingerprint,
                    raw_metadata=f.raw_metadata,
                    category=finding_cat,
                    project_id=scan.project_id,
                    repository=clean_repo,
                    branch=getattr(scan, "branch", None) or "main",
                    detected_at=scan.started_at or datetime.now(timezone.utc),
                    status="open",
                )
                self.session.add(finding)

        # Persist Requirement Verifications
        for v in scan_result.verifications:
            try:
                req_uuid = uuid.UUID(v.requirement_id)
            except Exception:
                continue

            verification = RequirementVerificationResult(
                scan_id=scan.id,
                requirement_id=req_uuid,
                requirement_key=v.requirement_key,
                status=v.status,
                rationale=v.rationale,
                evidence_summary=v.evidence_summary,
                contributing_findings_count=len(v.contributing_findings),
            )
            self.session.add(verification)

        await self.session.flush()
        return scan

    async def get_by_id(
        self,
        scan_id: uuid.UUID,
        include_details: bool = True,
    ) -> Optional[SecurityScan]:
        query = select(SecurityScan).where(SecurityScan.id == scan_id)
        if include_details:
            query = query.options(
                selectinload(SecurityScan.executions),
                selectinload(SecurityScan.findings),
                selectinload(SecurityScan.verifications),
            )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_by_project(
        self,
        project_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SecurityScan]:
        query = (
            select(SecurityScan)
            .where(SecurityScan.project_id == project_id)
            .options(
                selectinload(SecurityScan.executions),
                selectinload(SecurityScan.findings),
                selectinload(SecurityScan.verifications),
            )
            .order_by(desc(SecurityScan.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_findings_for_scan(
        self,
        scan_id: uuid.UUID,
    ) -> List[SecurityFinding]:
        query = (
            select(SecurityFinding)
            .where(SecurityFinding.scan_id == scan_id)
            .order_by(desc(SecurityFinding.created_at))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_executions_for_scan(
        self,
        scan_id: uuid.UUID,
    ) -> List[ScannerExecution]:
        query = (
            select(ScannerExecution)
            .where(ScannerExecution.scan_id == scan_id)
            .options(selectinload(ScannerExecution.findings))
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_verifications_for_scan(
        self,
        scan_id: uuid.UUID,
    ) -> List[RequirementVerificationResult]:
        query = (
            select(RequirementVerificationResult)
            .where(RequirementVerificationResult.scan_id == scan_id)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
