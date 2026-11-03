"""
Kavach Local Dev Guardrail & Direct-to-IDE Remediation Router
Endpoints:
- GET  /api/v1/local/workspace-info
- POST /api/v1/local/scan
- POST /api/v1/local/apply-patch
- POST /api/v1/local/create-sample-vulnerability
- DELETE /api/v1/local/sample-vulnerability
"""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Query

from app.services.local_audit_service import LocalAuditService

logger = logging.getLogger("kavach.local_audit.api")

router = APIRouter(prefix="/local", tags=["Local Dev Guardrail"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class LocalScanRequest(BaseModel):
    workspace_path: Optional[str] = Field(default=None, description="Local project workspace path on workstation.")
    target_files: Optional[List[str]] = Field(default=None, description="Optional explicit file paths to inspect.")


class ApplyPatchRequest(BaseModel):
    finding_id: str = Field(..., description="Unique ID of the finding being resolved.")
    file_path: str = Field(..., description="Target file path relative to workspace root.")
    patched_code: Optional[str] = Field(default=None, description="Patched code replacement.")
    original_snippet: Optional[str] = Field(default=None, description="Original vulnerable snippet to replace.")
    replacement_lines: Optional[List[Dict[str, Any]]] = Field(default=None, description="List of replaced line objects.")
    workspace_path: Optional[str] = Field(default=None, description="Workspace path.")


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/workspace-info")
async def get_workspace_info(workspace_path: Optional[str] = Query(default=None)):
    """Returns local developer workspace metadata, active git branch, and uncommitted file count."""
    try:
        service = LocalAuditService(workspace_path)
        return service.get_workspace_info()
    except Exception as exc:
        logger.error(f"Failed to fetch workspace info: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect workspace: {str(exc)}"
        )


@router.post("/scan")
async def run_local_scan(payload: LocalScanRequest):
    """
    Executes concurrent 1-click local pre-flight audit across all 6 deterministic scanner suites.
    Runs on dirty/uncommitted git files in under 15 seconds.
    """
    try:
        service = LocalAuditService(payload.workspace_path)
        report = await service.run_local_audit(target_files=payload.target_files)
        return report
    except Exception as exc:
        logger.error(f"Local audit failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local scan execution failed: {str(exc)}"
        )


@router.post("/apply-patch")
async def apply_patch_to_vscode(payload: ApplyPatchRequest):
    """
    Applies approved, verified secure patch directly to the target file on disk.
    Backs up the file first (.kavach_bak), performs atomic write, and re-scans.
    VS Code immediately auto-reloads the buffer on disk with zero Pull Request required.
    """
    try:
        service = LocalAuditService(payload.workspace_path)
        result = service.apply_patch_to_disk(
            finding_id=payload.finding_id,
            file_path=payload.file_path,
            patched_code=payload.patched_code,
            original_snippet=payload.original_snippet,
            replacement_lines=payload.replacement_lines,
        )
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result.get("error", "Patch verification failed")
            )
        return result
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Failed to apply patch to disk: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply patch to file on disk: {str(exc)}"
        )


@router.post("/create-sample-vulnerability")
async def create_sample_vulnerability(workspace_path: Optional[str] = Query(default=None)):
    """Creates a sample test fixture file for instant live demonstration of the guardrail and direct-to-VS Code write."""
    try:
        service = LocalAuditService(workspace_path)
        return service.create_sample_vulnerability()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/sample-vulnerability")
async def cleanup_sample_vulnerability(workspace_path: Optional[str] = Query(default=None)):
    """Removes the sample test fixture file."""
    try:
        service = LocalAuditService(workspace_path)
        return service.cleanup_sample_vulnerability()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
