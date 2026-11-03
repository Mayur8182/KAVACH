import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.finding import (
    SecurityFindingDetailResponse, 
    ApplyFixRequest, 
    ApplyFixResponse,
    TestFixRequest,
    TestFixResponse,
    CreateRemediationPRRequest,
    CreateRemediationPRResponse
)
from app.services.finding_service import FindingService

router = APIRouter(tags=["Security Findings Detailed Views"])

@router.get(
    "/findings/{finding_id}",
    response_model=SecurityFindingDetailResponse,
    summary="Get Detailed Security Finding",
    description="Retrieves the detailed view of a security finding including evidence and remediation suggestions."
)
async def get_finding_detail(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SecurityFindingDetailResponse:
    service = FindingService(db)
    finding = await service.get_finding_detail(finding_id, current_user)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finding not found"
        )
    return finding

@router.post(
    "/findings/{finding_id}/apply-fix",
    response_model=ApplyFixResponse,
    summary="Apply Security Fix",
    description="Applies a remediation suggestion to the source code and optionally triggers a verification scan."
)
async def apply_finding_fix(
    finding_id: str,
    payload: ApplyFixRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplyFixResponse:
    service = FindingService(db)
    try:
        response = await service.apply_fix(finding_id, payload.suggestion_id, current_user)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post(
    "/findings/{finding_id}/test-fix",
    response_model=TestFixResponse,
    summary="Test Security Fix",
    description="Runs deterministic AST syntax verification and policy check on proposed patch."
)
async def test_finding_fix(
    finding_id: str,
    payload: TestFixRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestFixResponse:
    service = FindingService(db)
    return await service.test_fix(finding_id, payload.suggestion_id, current_user)

@router.post(
    "/findings/{finding_id}/create-pr",
    response_model=CreateRemediationPRResponse,
    summary="Create Remediation Pull Request",
    description="Dispatches GitHub pull request creation with the automated remediation."
)
async def create_remediation_pull_request(
    finding_id: str,
    payload: Optional[CreateRemediationPRRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateRemediationPRResponse:
    service = FindingService(db)
    sug_id = payload.suggestion_id if payload else None
    title = payload.title if payload else None
    branch = payload.branch if payload else None
    return await service.create_pr(finding_id, sug_id, title, branch, current_user)


@router.post(
    "/findings/{finding_id}/pr",
    response_model=CreateRemediationPRResponse,
    summary="Create Remediation PR Alias",
    description="Direct alias for 1-click Pull Request creation from AutoFix studio."
)
async def create_remediation_pull_request_alias(
    finding_id: str,
    payload: Optional[CreateRemediationPRRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateRemediationPRResponse:
    service = FindingService(db)
    sug_id = payload.suggestion_id if payload else None
    title = payload.title if payload else None
    branch = payload.branch if payload else None
    return await service.create_pr(finding_id, sug_id, title, branch, current_user)


@router.post(
    "/findings/{finding_id}/autofix",
    response_model=ApplyFixResponse,
    summary="Apply AutoFix Suggestion",
    description="Direct alias for applying automated remediation fix from AutoFix studio."
)
async def apply_autofix_alias(
    finding_id: str,
    dry_run: bool = False,
    payload: Optional[ApplyFixRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApplyFixResponse:
    service = FindingService(db)
    sug_id = payload.suggestion_id if payload else None
    try:
        return await service.apply_fix(finding_id, sug_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

