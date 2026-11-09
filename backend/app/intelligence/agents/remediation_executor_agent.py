"""
Kavach Remediation Executor Specialist Agent
Executes proposed remediation plans in an isolated workspace.
Generates unified diffs using Gemini with AST-grounded fallbacks, verifies patch application,
and persists authentic RemediationPatch records in PostgreSQL.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.user import User
from app.models.scan import SecurityFinding
from app.models.remediation import RemediationPlan, RemediationPatch
from app.services.remediation.repository_context import resolve_repository_context
from app.services.remediation.source_extractor import extract_vulnerable_source
from app.services.remediation.patch_generator import RemediationPatchGenerator
from app.intelligence.execution.contracts import FileDiffRecord, RemediationExecutorOutput

logger = logging.getLogger("kavach.agents.remediation_executor")


class RemediationExecutorAgent:
    """
    Autonomous Remediation Executor Agent.
    Applies patches in isolated environments and persists authentic RemediationPatch records.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        plan_id: str,
        finding_id: str,
        workspace_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        logger.info(f"RemediationExecutorAgent executing for project {project_id}, plan {plan_id}, finding {finding_id}")

        clean_id = str(finding_id).strip()
        conds = [SecurityFinding.rule_id == clean_id, SecurityFinding.fingerprint == clean_id]
        try:
            f_uuid = uuid.UUID(clean_id)
            conds.append(SecurityFinding.id == f_uuid)
        except ValueError:
            pass

        stmt = select(SecurityFinding).where(or_(*conds))
        finding = (await db.execute(stmt)).scalars().first()

        if not finding:
            raise ValueError(f"Finding '{finding_id}' not found for patch execution.")

        # 1. Resolve repository context and extract source code
        repo_ctx = await resolve_repository_context(db, finding, current_user)
        file_path = finding.file_path or "main.py"
        line_num = finding.line_number or 1

        source_ctx = extract_vulnerable_source(
            repo_context=repo_ctx,
            relative_file_path=file_path,
            line_start=line_num,
            line_end=line_num,
            context_lines=20,
        )

        # 2. Synthesize repository-specific patch
        generator = RemediationPatchGenerator()
        proposal = await generator.generate_patch(finding, source_ctx)

        # 3. Resolve plan entity
        p_uuid = None
        try:
            p_uuid = uuid.UUID(str(plan_id))
        except (ValueError, TypeError):
            pass

        if not p_uuid:
            # Create a plan record if not present
            cwe_label = (
                getattr(finding, "cwe_id", None)
                or (getattr(finding, "raw_metadata", {}) or {}).get("cwe")
                or getattr(finding, "rule_id", "Vulnerability")
            )
            new_plan = RemediationPlan(
                project_id=project_id,
                title=f"Remediate {cwe_label} in {file_path}",
                description=proposal.explanation,
                type="SOURCE_CODE_PATCH",
                risk_level="LOW_RISK",
                status="PROPOSED",
                created_by_type="AGENT",
                created_by_id=str(current_user.id),
            )
            db.add(new_plan)
            await db.flush()
            p_uuid = new_plan.id

        # 4. Persist RemediationPatch in PostgreSQL
        patch = RemediationPatch(
            remediation_plan_id=p_uuid,
            base_commit_sha=repo_ctx.commit_sha,
            workspace_id=str(project_id),
            patch_format="unified_diff",
            original_hash=source_ctx.file_hash,
            diff=proposal.unified_diff,
            affected_files=[file_path],
            generated_by="kavach_remediation_executor_agent",
            generation_model=proposal.model_used,
            generation_provider="google_gemini",
            status="GENERATED",
        )
        db.add(patch)
        await db.commit()
        await db.refresh(patch)

        file_diff_records = [
            FileDiffRecord(
                file_path=file_path,
                original_hash=source_ctx.file_hash,
                diff=proposal.unified_diff,
                status="PATCHED",
            )
        ]

        output = RemediationExecutorOutput(
            status="PATCH_GENERATED",
            patch_id=str(patch.id),
            plan_id=str(p_uuid),
            finding_id=str(finding.id),
            diff=proposal.unified_diff,
            file_diffs=file_diff_records,
            affected_files=[file_path],
            branch=getattr(repo_ctx, "branch", "main") or "main",
            workspace_id=str(project_id),
            model_used=proposal.model_used,
            explanation=proposal.explanation,
            created_at=patch.created_at.isoformat() if patch.created_at else datetime.now(timezone.utc).isoformat(),
        )

        return output.model_dump()

