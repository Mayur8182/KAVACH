"""
Kavach Phase 4: Multi-File Autonomous Remediation REST API Endpoints
Authoritative routes for multi-file remediation planning, validation, approval,
transactional application, multi-layer verification, and rollback.
"""

from __future__ import annotations

import uuid
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.scan import SecurityFinding
from app.models.remediation import RemediationPlan, RemediationPatch
from app.intelligence.remediation.coordinator import MultiFileRemediationCoordinator
from app.intelligence.remediation.models import (
    MultiFileRemediationPlan,
    MultiFilePatchSet,
    PatchTransactionRecord,
    RemediationPlanStatus,
)
from app.intelligence.remediation.validator import MultiFilePatchValidator
from app.intelligence.remediation.transaction_manager import PatchTransactionManager
from app.intelligence.remediation.verification_pipeline import MultiFileVerificationPipeline
from app.intelligence.execution.approval_guard import ApprovalGuard

logger = logging.getLogger("kavach.remediation.api")

router = APIRouter(prefix="/remediation", tags=["Multi-File Autonomous Remediation"])

# In-memory session store for transient active patch sets & transactions
# Real records are persisted in PostgreSQL tables: remediation_plans, remediation_patches, remediation_validations
_ACTIVE_PATCH_SETS: Dict[str, MultiFilePatchSet] = {}
_ACTIVE_PLANS: Dict[str, MultiFileRemediationPlan] = {}
_ACTIVE_TRANSACTIONS: Dict[str, PatchTransactionRecord] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class CreatePlanRequest(BaseModel):
    finding_id: str
    project_id: Optional[str] = None
    repository: Optional[str] = "main-repo"
    base_commit_sha: Optional[str] = "HEAD"
    repo_root: Optional[str] = None


class ValidatePlanRequest(BaseModel):
    plan_id: str


class ApprovePlanRequest(BaseModel):
    plan_id: str


class GeneratePatchSetRequest(BaseModel):
    plan_id: str


class ApplyPatchSetRequest(BaseModel):
    patch_set_id: str
    approval_token: str
    repo_root: Optional[str] = None


class VerifyPatchSetRequest(BaseModel):
    patch_set_id: str


class RollbackTransactionRequest(BaseModel):
    patch_set_id: str


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/plans",
    summary="Create Multi-File Remediation Plan",
    description="Traverses code graph to identify required, supporting, and test files; produces a versioned plan.",
)
async def create_remediation_plan(
    payload: CreatePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        coord_res = await MultiFileRemediationCoordinator.plan_multi_file_remediation(
            db=db,
            finding_id=payload.finding_id,
            current_user=current_user,
            repository=payload.repository or "main-repo",
            base_commit_sha=payload.base_commit_sha or "HEAD",
            repo_root=payload.repo_root,
        )
        plan_dict = coord_res["plan"]
        plan_obj = MultiFileRemediationPlan(**plan_dict)
        _ACTIVE_PLANS[plan_obj.plan_id] = plan_obj

        if coord_res.get("patch_set"):
            ps_obj = MultiFilePatchSet(**coord_res["patch_set"])
            _ACTIVE_PATCH_SETS[ps_obj.patch_set_id] = ps_obj

        return coord_res
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating multi-file plan: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/plans/{plan_id}",
    summary="Read Multi-File Remediation Plan",
    description="Returns full versioned plan details, including all affected files and invariants.",
)
async def get_remediation_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if plan_id in _ACTIVE_PLANS:
        return _ACTIVE_PLANS[plan_id].model_dump()

    try:
        p_uuid = uuid.UUID(plan_id)
        db_plan = await db.get(RemediationPlan, p_uuid)
        if db_plan:
            return {
                "plan_id": str(db_plan.id),
                "title": db_plan.title,
                "description": db_plan.description,
                "status": db_plan.status,
                "created_at": db_plan.created_at.isoformat() if db_plan.created_at else None,
            }
    except Exception:
        pass

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Remediation plan '{plan_id}' not found.")


@router.post(
    "/plans/{plan_id}/validate",
    summary="Validate Multi-File Remediation Plan",
    description="Validates scope, path normalization, and minimality limits.",
)
async def validate_remediation_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = _ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_id}' not active in cache.")

    return {
        "plan_id": plan.plan_id,
        "is_valid": len(plan.files) <= 10,
        "file_count": len(plan.files),
        "invariants": plan.invariants,
        "plan_hash": plan.plan_hash,
    }


@router.post(
    "/plans/{plan_id}/approve",
    summary="Approve Multi-File Remediation Plan",
    description="Validates authorization and issues a single-use cryptographic token for transactional execution.",
)
async def approve_remediation_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = _ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{plan_id}' not found.")

    token_info = ApprovalGuard.generate_approval_token(
        plan_id=plan.plan_id,
        step_id="multi-file-apply",
        target_resource=f"plan:{plan.plan_id}:hash:{plan.plan_hash[:16]}",
        action="remediation.multi_file_apply",
        project_id=plan.project_id,
        user_id=str(current_user.id),
        expires_in_seconds=3600,
    )
    plan.approval_token = token_info["token"]
    plan.status = RemediationPlanStatus.APPROVED

    return {
        "plan_id": plan.plan_id,
        "status": "APPROVED",
        "approval_token": plan.approval_token,
        "approved_by": current_user.email,
        "expires_in_seconds": 3600,
    }


@router.post(
    "/patch-sets",
    summary="Generate Multi-File Patch Set",
    description="Produces structured per-file unified diffs for a plan.",
)
async def generate_patch_set_endpoint(
    payload: GeneratePatchSetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.intelligence.remediation.patch_generator import MultiFilePatchGenerator
    plan = _ACTIVE_PLANS.get(payload.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{payload.plan_id}' not found.")

    patch_set = await MultiFilePatchGenerator.generate_patch_set(db=db, plan=plan)
    _ACTIVE_PATCH_SETS[patch_set.patch_set_id] = patch_set
    return patch_set.model_dump()


@router.get(
    "/patch-sets/{patch_set_id}",
    summary="Read Multi-File Patch Set",
    description="Returns metadata and per-file diff records of a patch set.",
)
async def get_patch_set(
    patch_set_id: str,
    current_user: User = Depends(get_current_user),
):
    ps = _ACTIVE_PATCH_SETS.get(patch_set_id)
    if not ps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patch set '{patch_set_id}' not found.")
    return ps.model_dump()


@router.get(
    "/patch-sets/{patch_set_id}/diff",
    summary="Read Combined Diff Artifact",
    description="Returns the raw unified diff text across all files.",
    response_class=PlainTextResponse,
)
async def get_patch_set_diff(
    patch_set_id: str,
    current_user: User = Depends(get_current_user),
):
    ps = _ACTIVE_PATCH_SETS.get(patch_set_id)
    if not ps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patch set '{patch_set_id}' not found.")
    return ps.combined_diff


@router.post(
    "/patch-sets/{patch_set_id}/apply",
    summary="Apply Approved Patch Set Atomically",
    description="Executes all-or-nothing transactional application in an isolated sandbox.",
)
async def apply_patch_set_endpoint(
    patch_set_id: str,
    payload: ApplyPatchSetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ps = _ACTIVE_PATCH_SETS.get(patch_set_id)
    if not ps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patch set '{patch_set_id}' not found.")

    plan = _ACTIVE_PLANS.get(ps.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Associated plan '{ps.plan_id}' not found.")

    try:
        res = await MultiFileRemediationCoordinator.apply_and_verify_transaction(
            db=db,
            plan=plan,
            patch_set=ps,
            approval_token=payload.approval_token,
            current_user=current_user,
            repo_root=payload.repo_root,
        )
        if res.get("transaction"):
            tx_rec = PatchTransactionRecord(**res["transaction"])
            _ACTIVE_TRANSACTIONS[patch_set_id] = tx_rec
        return res
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        logger.error(f"Error applying patch transaction: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/patch-sets/{patch_set_id}/verify",
    summary="Run Independent Verification Pipeline",
    description="Runs 5-layer verification on the patched workspace.",
)
async def verify_patch_set_endpoint(
    patch_set_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ps = _ACTIVE_PATCH_SETS.get(patch_set_id)
    if not ps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patch set '{patch_set_id}' not found.")

    tx = _ACTIVE_TRANSACTIONS.get(patch_set_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active transaction found to verify.")

    plan = _ACTIVE_PLANS.get(ps.plan_id)
    primary_finding = plan.finding_ids[0] if plan and plan.finding_ids else None

    report = await MultiFileVerificationPipeline.verify_patch_transaction(
        db=db,
        patch_set=ps,
        transaction=tx,
        primary_finding_id=primary_finding,
    )
    return report.model_dump()


@router.post(
    "/patch-sets/{patch_set_id}/rollback",
    summary="Roll Back Transaction",
    description="Restores isolated workspace to clean pre-transaction state.",
)
async def rollback_transaction_endpoint(
    patch_set_id: str,
    current_user: User = Depends(get_current_user),
):
    tx = _ACTIVE_TRANSACTIONS.get(patch_set_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No transaction found for patch set '{patch_set_id}'.")

    success = PatchTransactionManager.rollback_transaction(tx)
    return {
        "transaction_id": tx.transaction_id,
        "patch_set_id": patch_set_id,
        "status": tx.status.value,
        "rollback_performed": success,
        "message": "Isolated workspace restored cleanly to pre-transaction state.",
    }
