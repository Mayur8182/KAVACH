"""
Kavach Phase 4: Change-Set Planner (M2)
Constructs versioned, minimal multi-file remediation plans with deterministic
plan hashes, dependency ordering, and rollback criteria.
"""

from __future__ import annotations

import os
import json
import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.remediation import RemediationPlan, RemediationPlanVersion
from app.intelligence.remediation.models import (
    FileClassification,
    FileOperation,
    MultiFileImpactReport,
    PlannedFileChange,
    MultiFileRemediationPlan,
    RemediationPlanStatus,
)

logger = logging.getLogger("kavach.remediation.plan_manager")

# Configured safety limits (Section 6.2 & Section 15)
MAX_ALLOWED_FILES = 10
PROHIBITED_PATH_PATTERNS = [
    ".git/", ".github/workflows/", "credentials", "secrets.json",
    "id_rsa", "authorized_keys", ".env", "passwd", "shadow"
]


class MultiFileRemediationPlanner:
    """
    Step 1.2 / M2: Creates versioned multi-file remediation plans
    adhering to the minimal-change principle.
    """

    @classmethod
    async def create_plan(
        cls,
        db: AsyncSession,
        impact_report: MultiFileImpactReport,
        repository: str,
        base_commit_sha: str,
        user_id: Optional[str] = None,
        task_id: Optional[str] = None,
        max_files_limit: int = MAX_ALLOWED_FILES,
    ) -> MultiFileRemediationPlan:
        """
        Synthesizes a structured multi-file remediation plan from an impact report.
        """
        # Filter included files
        included_candidates = [
            c for c in impact_report.candidate_files
            if c.is_included_in_plan and c.classification in (
                FileClassification.REQUIRED,
                FileClassification.SUPPORTING,
                FileClassification.TEST,
            )
        ]

        if not included_candidates:
            raise ValueError(f"No valid candidate files to remediate for finding {impact_report.finding_id}")

        if len(included_candidates) > max_files_limit:
            raise ValueError(
                f"Change set exceeds maximum allowed file budget ({len(included_candidates)} > {max_files_limit}). "
                f"Requires architectural decomposition or special administrator approval."
            )

        # Validate against prohibited paths
        for cand in included_candidates:
            for prohibited in PROHIBITED_PATH_PATTERNS:
                if prohibited in cand.file_path.lower():
                    raise PermissionError(
                        f"Target path '{cand.file_path}' contains prohibited pattern '{prohibited}'. "
                        f"Modifications to sensitive infrastructure or credentials are forbidden."
                    )

        # Build planned file changes with explicit dependency ordering
        planned_files: List[PlannedFileChange] = []
        for cand in included_candidates:
            # Order: 0 = primary/required, 1 = supporting types/callers, 2 = tests
            dep_order = 0 if cand.classification == FileClassification.REQUIRED else (
                1 if cand.classification == FileClassification.SUPPORTING else 2
            )
            planned_files.append(
                PlannedFileChange(
                    file_path=cand.file_path,
                    classification=cand.classification,
                    operation=FileOperation.MODIFY,
                    base_file_hash=cand.base_file_hash or "",
                    target_symbols=cand.target_symbols,
                    rationale="; ".join(cand.reasons),
                    dependency_order=dep_order,
                    validation_requirements=["syntax_check", "ast_validation"],
                )
            )

        # Sort files by dependency order then path
        planned_files.sort(key=lambda x: (x.dependency_order, x.file_path))

        # Define explicit remediation invariants
        invariants = [
            {"rule": "AUTH_GUARD_PRESERVATION", "description": "Authentication and authorization checks (@login_required, get_current_user) must remain intact."},
            {"rule": "TENANT_ISOLATION", "description": "Tenant-scoped database filters and organization checks must never be dropped."},
            {"rule": "PUBLIC_INTERFACE_COMPATIBILITY", "description": "Exported function and class signatures must remain backward-compatible with callers."},
        ]

        rollback_strategy = (
            "Transactional workspace rollback: on any syntax error, test failure, or residual finding, "
            "the entire patch set is aborted and the isolated workspace is restored to base commit SHA."
        )

        plan_id = str(uuid.uuid4())
        problem_stmt = f"Remediate security vulnerability in `{impact_report.primary_file}` and coordinate across {len(planned_files)} dependent files."
        security_obj = "Eliminate root-cause flaw without introducing regressions, syntax defects, or unauthenticated pathways."

        # Compute deterministic plan hash
        plan_hash = cls._compute_plan_hash(
            repository=repository,
            base_commit_sha=base_commit_sha,
            finding_ids=[impact_report.finding_id],
            planned_files=planned_files,
        )

        plan = MultiFileRemediationPlan(
            plan_id=plan_id,
            version=1,
            task_id=task_id,
            project_id=impact_report.project_id,
            repository=repository,
            base_commit_sha=base_commit_sha,
            finding_ids=[impact_report.finding_id],
            plan_hash=plan_hash,
            problem_statement=problem_stmt,
            security_objective=security_obj,
            files=planned_files,
            invariants=invariants,
            rollback_strategy=rollback_strategy,
            status=RemediationPlanStatus.PROPOSED,
            requires_approval=True,
        )

        # Persist to PostgreSQL database
        await cls._persist_plan(db, plan, user_id)
        return plan

    @classmethod
    def _compute_plan_hash(
        cls,
        repository: str,
        base_commit_sha: str,
        finding_ids: List[str],
        planned_files: List[PlannedFileChange],
    ) -> str:
        """
        Computes SHA256 plan hash over canonicalized plan properties.
        Any modification to file list, base hashes, or findings changes the hash.
        """
        canonical_dict = {
            "repository": repository,
            "base_commit_sha": base_commit_sha,
            "finding_ids": sorted(finding_ids),
            "files": [
                {
                    "path": f.file_path,
                    "op": f.operation.value,
                    "base_hash": f.base_file_hash,
                    "order": f.dependency_order,
                }
                for f in sorted(planned_files, key=lambda x: x.file_path)
            ],
        }
        canonical_str = json.dumps(canonical_dict, sort_keys=True)
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @classmethod
    async def _persist_plan(
        cls,
        db: AsyncSession,
        plan: MultiFileRemediationPlan,
        user_id: Optional[str],
    ) -> RemediationPlan:
        """Saves plan and plan version records in PostgreSQL."""
        p_uuid = uuid.UUID(plan.plan_id)
        db_plan = RemediationPlan(
            id=p_uuid,
            project_id=uuid.UUID(plan.project_id),
            title=f"Multi-File Remediation: {len(plan.files)} files ({plan.repository})",
            description=plan.problem_statement,
            type="MULTI_FILE_SOURCE_PATCH",
            risk_level="MEDIUM_RISK" if len(plan.files) <= 3 else "HIGH_RISK",
            status=plan.status.value,
            created_by_type="AGENT",
            created_by_id=user_id or "system-agent",
        )
        db.add(db_plan)

        # Plan version
        version_rec = RemediationPlanVersion(
            plan_id=p_uuid,
            version=plan.version,
            plan_json=plan.model_dump(),
            generated_by="MultiFileRemediationPlanner",
            model="gemini-2.5-flash-lite",
            status="ACTIVE",
        )
        db.add(version_rec)
        await db.commit()
        return db_plan

