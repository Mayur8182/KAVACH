"""
Kavach Remediation Agent
Synthesizes repository-grounded AST security patches using Gemini and deterministic fallbacks.
Persists authentic RemediationPlan and RemediationPatch records.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.user import User
from app.models.scan import SecurityFinding
from app.models.remediation import RemediationPlan, RemediationPatch
from app.services.remediation.repository_context import resolve_repository_context
from app.services.remediation.source_extractor import extract_vulnerable_source
from app.services.remediation.patch_generator import RemediationPatchGenerator

logger = logging.getLogger("kavach.agents.remediation")


class RemediationAgent:
    """
    Autonomous Remediation Agent.
    Generates contextual, AST-grounded patches for authentic findings.
    """

    @classmethod
    async def run(
        cls,
        db: AsyncSession,
        current_user: User,
        project_id: uuid.UUID,
        finding_id: str,
    ) -> Dict[str, Any]:
        logger.info(f"RemediationAgent executing for project {project_id}, finding {finding_id}")

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
            raise ValueError(f"Finding '{finding_id}' not found in project {project_id}")

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

        # 3. Persist RemediationPlan & RemediationPatch in DB
        cwe_label = (
            getattr(finding, "cwe_id", None)
            or (getattr(finding, "raw_metadata", {}) or {}).get("cwe")
            or getattr(finding, "rule_id", "Vulnerability")
        )
        plan = RemediationPlan(
            project_id=project_id,
            title=f"Remediate {cwe_label} in {file_path}",
            description=proposal.explanation,
            type="SOURCE_CODE_PATCH",
            risk_level="LOW_RISK",
            status="PROPOSED",
            created_by_type="AGENT",
            created_by_id=str(current_user.id),
        )
        db.add(plan)
        await db.flush()

        patch = RemediationPatch(
            remediation_plan_id=plan.id,
            base_commit_sha=repo_ctx.commit_sha,
            workspace_id=str(project_id),
            patch_format="unified_diff",
            original_hash=source_ctx.file_hash,
            diff=proposal.unified_diff,
            affected_files=[file_path],
            generated_by="kavach_remediation_agent",
            generation_model=proposal.model_used,
            generation_provider="google_gemini",
            status="GENERATED",
        )
        db.add(patch)
        await db.commit()
        await db.refresh(patch)

        return {
            "status": "PATCH_GENERATED",
            "patch_id": str(patch.id),
            "plan_id": str(plan.id),
            "finding_id": str(finding.id),
            "file_path": file_path,
            "line_number": line_num,
            "diff": proposal.unified_diff,
            "explanation": proposal.explanation,
            "model_used": proposal.model_used,
            "created_at": patch.created_at.isoformat() if patch.created_at else datetime.now(timezone.utc).isoformat(),
        }

