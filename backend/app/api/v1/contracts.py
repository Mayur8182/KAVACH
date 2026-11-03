"""
Security Contracts REST API Endpoints.
Complies with Step 12 Specification: Section 37.
"""

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.contracts.models import (
    SecurityContract,
    SecurityContractVersion,
    SecurityContractDependency,
    SecurityContractVerification,
    SecurityContractViolation,
    SecurityContractOverride,
)
from app.contracts.schemas import (
    ContractCreateRequest,
    ContractResponse,
    ContractVersionCreateRequest,
    ContractVersionResponse,
    ContractValidateRequest,
    ContractValidateResponse,
    ContractCompileRequest,
    ContractCompileResponse,
    ContractDependencyCreateRequest,
    ContractDependencyResponse,
    ContractOverrideCreateRequest,
    ContractOverrideResponse,
    ContractVerificationResponse,
    ContractViolationResponse,
)
from app.contracts.service import ContractService
from app.contracts.evaluator.context import EvidenceContext

router = APIRouter(tags=["Security Contracts"])


def _to_contract_response(contract: SecurityContract) -> ContractResponse:
    curr_ver = None
    if contract.current_version_id and contract.versions:
        for v in contract.versions:
            if v.id == contract.current_version_id:
                curr_ver = ContractVersionResponse.model_validate(v)
                break
    elif contract.versions:
        # Fallback to latest version
        curr_ver = ContractVersionResponse.model_validate(contract.versions[0])

    return ContractResponse(
        id=contract.id,
        project_id=contract.project_id,
        name=contract.name,
        description=contract.description,
        contract_key=contract.contract_key,
        status=contract.status,
        current_version_id=contract.current_version_id,
        created_by=contract.created_by,
        created_at=contract.created_at,
        updated_at=contract.updated_at,
        retired_at=contract.retired_at,
        metadata=contract.metadata_,
        current_version=curr_ver,
        versions_count=len(contract.versions) if contract.versions else 0,
    )


# 1. Create contract
@router.post(
    "/projects/{project_id}/contracts",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new security contract",
)
async def create_contract(
    project_id: uuid.UUID,
    payload: ContractCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractResponse:
    service = ContractService(db)
    contract = await service.create_contract(
        project_id=project_id,
        request=payload,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return _to_contract_response(contract)


# 2. List contracts for project
@router.get(
    "/projects/{project_id}/contracts",
    response_model=List[ContractResponse],
    summary="List contracts for a project",
)
async def list_contracts(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractResponse]:
    service = ContractService(db)
    contracts = await service.repo.list_contracts_for_project(project_id)
    return [_to_contract_response(c) for c in contracts]


# 3. Get contract by ID
@router.get(
    "/contracts/{contract_id}",
    response_model=ContractResponse,
    summary="Get security contract by ID",
)
async def get_contract(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractResponse:
    service = ContractService(db)
    contract = await service.repo.get_contract_by_id(contract_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")
    return _to_contract_response(contract)


# 4. Create version
@router.post(
    "/contracts/{contract_id}/versions",
    response_model=ContractVersionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new version of an existing contract",
)
async def create_contract_version(
    contract_id: uuid.UUID,
    payload: ContractVersionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractVersionResponse:
    service = ContractService(db)
    version = await service.create_version(
        contract_id=contract_id,
        request=payload,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return ContractVersionResponse.model_validate(version)


# 5. Get versions
@router.get(
    "/contracts/{contract_id}/versions",
    response_model=List[ContractVersionResponse],
    summary="List versions of a contract",
)
async def get_contract_versions(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractVersionResponse]:
    service = ContractService(db)
    versions = await service.repo.list_versions_for_contract(contract_id)
    return [ContractVersionResponse.model_validate(v) for v in versions]


# 6. Validate contract
@router.post(
    "/projects/{project_id}/contracts/validate",
    response_model=ContractValidateResponse,
    summary="Validate contract definition syntax and schema",
)
async def validate_contract(
    project_id: uuid.UUID,
    payload: ContractValidateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractValidateResponse:
    service = ContractService(db)
    return await service.validate_definition(payload.definition)


# 7. Compile contract
@router.post(
    "/projects/{project_id}/contracts/compile",
    response_model=ContractCompileResponse,
    summary="Compile raw contract definition into canonical AST and hash",
)
async def compile_contract(
    project_id: uuid.UUID,
    payload: ContractCompileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractCompileResponse:
    service = ContractService(db)
    return await service.compile_definition(payload.definition)


# 8. Activate version
@router.post(
    "/contracts/{contract_id}/versions/{version_id}/activate",
    response_model=ContractVersionResponse,
    summary="Atomically activate a contract version",
)
async def activate_contract_version(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractVersionResponse:
    service = ContractService(db)
    version = await service.activate_version(
        contract_id=contract_id,
        version_id=version_id,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return ContractVersionResponse.model_validate(version)


# 9. Retire contract
@router.post(
    "/contracts/{contract_id}/retire",
    response_model=ContractResponse,
    summary="Retire a security contract",
)
async def retire_contract(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractResponse:
    service = ContractService(db)
    contract = await service.retire_contract(
        contract_id=contract_id,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return _to_contract_response(contract)


# 10. Get dependencies
@router.get(
    "/contracts/{contract_id}/dependencies",
    response_model=List[ContractDependencyResponse],
    summary="Get dependencies for a contract",
)
async def get_contract_dependencies(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractDependencyResponse]:
    service = ContractService(db)
    deps = await service.repo.get_dependencies_for_contract(contract_id)
    return [ContractDependencyResponse.model_validate(d) for d in deps]


# 11. Add dependency
@router.post(
    "/contracts/{contract_id}/dependencies",
    response_model=ContractDependencyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add dependency between contracts",
)
async def add_contract_dependency(
    contract_id: uuid.UUID,
    payload: ContractDependencyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractDependencyResponse:
    service = ContractService(db)
    dep = await service.add_dependency(
        contract_id=contract_id,
        target_contract_id=payload.depends_on_contract_id,
        dependency_type=payload.dependency_type,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return ContractDependencyResponse.model_validate(dep)


# 12. Get verifications
@router.get(
    "/contracts/{contract_id}/verifications",
    response_model=List[ContractVerificationResponse],
    summary="Get verification history for a contract",
)
async def get_contract_verifications(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractVerificationResponse]:
    service = ContractService(db)
    records = await service.repo.get_verifications_for_contract(contract_id)
    return [ContractVerificationResponse.model_validate(r) for r in records]


# 13. Get violations
@router.get(
    "/contracts/{contract_id}/violations",
    response_model=List[ContractViolationResponse],
    summary="Get violations for a contract",
)
async def get_contract_violations(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractViolationResponse]:
    service = ContractService(db)
    violations = await service.repo.get_violations_for_contract(contract_id)
    return [ContractViolationResponse.model_validate(v) for v in violations]


# 14. Create override request
@router.post(
    "/contracts/{contract_id}/overrides",
    response_model=ContractOverrideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an authorized override for a contract",
)
async def create_contract_override(
    contract_id: uuid.UUID,
    payload: ContractOverrideCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContractOverrideResponse:
    service = ContractService(db)
    override = await service.create_override(
        contract_id=contract_id,
        request=payload,
        actor_id=str(current_user.id),
        actor_type="USER",
    )
    return ContractOverrideResponse.model_validate(override)


# 15. List overrides
@router.get(
    "/contracts/{contract_id}/overrides",
    response_model=List[ContractOverrideResponse],
    summary="List overrides for a contract",
)
async def list_contract_overrides(
    contract_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContractOverrideResponse]:
    service = ContractService(db)
    overrides = await service.repo.get_overrides_for_contract(contract_id)
    return [ContractOverrideResponse.model_validate(o) for o in overrides]


# Helper: Test Evaluation
@router.post(
    "/contracts/{contract_id}/versions/{version_id}/evaluate",
    summary="Execute deterministic evaluation against test evidence context",
)
async def evaluate_contract_version(
    contract_id: uuid.UUID,
    version_id: uuid.UUID,
    evidence_payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = ContractService(db)
    ctx = EvidenceContext.from_dict(evidence_payload)
    result = await service.evaluate_contract(version_id=version_id, evidence_context=ctx)
    return {
        "contract_id": str(contract_id),
        "version_id": str(version_id),
        "truth_value": result.truth_value.value,
        "is_satisfied": result.is_satisfied,
        "is_violated": result.is_violated,
        "is_unknown": result.is_unknown,
        "violation_details": result.violation_details,
        "evaluation_trace": result.evaluation_trace,
        "verifier_version": result.verifier_version,
        "evaluated_at": result.evaluated_at.isoformat(),
    }
