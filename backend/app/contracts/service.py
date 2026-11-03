import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contracts.compiler.compiler import ContractCompiler
from app.contracts.compiler.dependency_resolver import DependencyResolver, DependencyCycleError
from app.contracts.dsl.ast import SecurityContractDefinition
from app.contracts.dsl.validator import ContractSyntaxValidator
from app.contracts.evaluator.context import EvidenceContext
from app.contracts.evaluator.evaluator import ContractEvaluator, ContractEvaluationResult
from app.contracts.models import (
    SecurityContract,
    SecurityContractDependency,
    SecurityContractEvidenceRequirement,
    SecurityContractOverride,
    SecurityContractScope,
    SecurityContractVerification,
    SecurityContractVersion,
    SecurityContractViolation,
)
from app.contracts.repository import ContractRepository
from app.contracts.schemas import (
    ContractCompileResponse,
    ContractCreateRequest,
    ContractOverrideCreateRequest,
    ContractValidateResponse,
    ContractVersionCreateRequest,
)
from app.services.audit_service import AuditService


class ContractService:
    """
    Authoritative Orchestration Service for Security Contracts:
    Creation, Compilation, Versioning, Atomic Activation, Dependencies,
    Overrides, and Controlled Invariant Evaluation.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ContractRepository(db)
        self.audit = AuditService(db)

    async def validate_definition(self, definition: Dict[str, Any]) -> ContractValidateResponse:
        valid, errors, _ = ContractSyntaxValidator.validate(definition)
        return ContractValidateResponse(valid=valid, errors=errors)

    async def compile_definition(self, definition: Dict[str, Any], version: int = 1) -> ContractCompileResponse:
        comp_res = ContractCompiler.compile(definition, version=version)
        return ContractCompileResponse(
            success=comp_res.success,
            contract_key=comp_res.contract_key,
            name=comp_res.name,
            version=comp_res.version,
            definition_hash=comp_res.definition_hash,
            normalized_definition=comp_res.normalized_definition,
            errors=comp_res.errors,
        )

    async def create_contract(
        self,
        project_id: uuid.UUID,
        request: ContractCreateRequest,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContract:
        # Check duplicate key
        existing = await self.repo.get_contract_by_key(project_id, request.contract_key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Contract with key '{request.contract_key}' already exists in project.",
            )

        # Compile definition
        comp = ContractCompiler.compile(request.definition, version=1)
        if not comp.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Contract compilation failed.", "errors": comp.errors},
            )

        parsed: SecurityContractDefinition = comp.parsed_definition

        # 1. Create root Contract
        contract = SecurityContract(
            project_id=project_id,
            name=request.name or parsed.name,
            description=request.description or parsed.description,
            contract_key=request.contract_key,
            status="DRAFT",
            created_by=actor_id,
        )
        self.db.add(contract)
        await self.db.flush()

        # 2. Create Version 1
        ver = SecurityContractVersion(
            contract_id=contract.id,
            version=1,
            definition=request.definition,
            normalized_definition=comp.normalized_definition,
            definition_hash=comp.definition_hash,
            schema_version=parsed.schema_version,
            status="DRAFT",
            created_by=actor_id,
        )
        self.db.add(ver)
        await self.db.flush()

        # 3. Create Scopes
        scope_decl = parsed.scope
        scope_record = SecurityContractScope(
            contract_version_id=ver.id,
            scope_type=scope_decl.type.value,
            scope_id=scope_decl.scope_id or str(project_id),
            environment=scope_decl.environment,
            branch=scope_decl.branch,
            resource_type=scope_decl.resource_type or scope_decl.resource,
            resource_scope=scope_decl.resource_scope,
        )
        self.db.add(scope_record)

        # 4. Create Evidence Requirements if present
        if parsed.evidence:
            for ev_list in parsed.evidence.values():
                for ev_req in ev_list:
                    req_row = SecurityContractEvidenceRequirement(
                        contract_version_id=ver.id,
                        evidence_type=ev_req.type,
                        source=ev_req.source or "SYSTEM",
                        required=ev_req.required,
                        minimum_confidence=ev_req.minimum_confidence,
                        configuration=ev_req.configuration,
                    )
                    self.db.add(req_row)

        await self.db.commit()
        await self.db.refresh(contract)

        await self.audit.log_event(
            action="CONTRACT_CREATED",
            resource_type="SECURITY_CONTRACT",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(contract.id),
            project_id=project_id,
            status="SUCCESS",
            metadata={"contract_key": contract.contract_key, "version": 1, "definition_hash": comp.definition_hash},
        )
        return await self.repo.get_contract_by_id(contract.id)

    async def create_version(
        self,
        contract_id: uuid.UUID,
        request: ContractVersionCreateRequest,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContractVersion:
        contract = await self.repo.get_contract_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        if contract.status == "RETIRED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add versions to a RETIRED contract.")

        latest_ver = await self.repo.get_latest_version(contract_id)
        next_ver = (latest_ver.version + 1) if latest_ver else 1

        comp = ContractCompiler.compile(request.definition, version=next_ver)
        if not comp.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Contract version compilation failed.", "errors": comp.errors},
            )

        ver = SecurityContractVersion(
            contract_id=contract.id,
            version=next_ver,
            definition=request.definition,
            normalized_definition=comp.normalized_definition,
            definition_hash=comp.definition_hash,
            schema_version=comp.parsed_definition.schema_version,
            status="DRAFT",
            created_by=actor_id,
        )
        self.db.add(ver)
        await self.db.flush()

        # Scopes & Evidence
        scope_decl = comp.parsed_definition.scope
        self.db.add(SecurityContractScope(
            contract_version_id=ver.id,
            scope_type=scope_decl.type.value,
            scope_id=scope_decl.scope_id or str(contract.project_id),
            environment=scope_decl.environment,
            branch=scope_decl.branch,
            resource_type=scope_decl.resource_type or scope_decl.resource,
            resource_scope=scope_decl.resource_scope,
        ))

        await self.db.commit()
        await self.db.refresh(ver)

        await self.audit.log_event(
            action="CONTRACT_VERSION_CREATED",
            resource_type="SECURITY_CONTRACT_VERSION",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(ver.id),
            project_id=contract.project_id,
            status="SUCCESS",
            metadata={"contract_id": str(contract.id), "version": next_ver, "definition_hash": comp.definition_hash},
        )
        return ver

    async def activate_version(
        self,
        contract_id: uuid.UUID,
        version_id: uuid.UUID,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContractVersion:
        """
        Concurrency-safe atomic activation.
        Deactivates previous active versions and binds contract.current_version_id.
        """
        # Lock contract row for update to prevent concurrent race condition activations
        contract_stmt = select(SecurityContract).where(SecurityContract.id == contract_id).with_for_update()
        contract = (await self.db.execute(contract_stmt)).scalar_one_or_none()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        target_ver = await self.repo.get_version_by_id(version_id)
        if not target_ver or target_ver.contract_id != contract_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract version not found.")

        now = datetime.now(timezone.utc)

        # Deactivate any currently active version
        versions = await self.repo.list_versions_for_contract(contract_id)
        for v in versions:
            if v.status == "ACTIVE" and v.id != version_id:
                v.status = "VALID"

        target_ver.status = "ACTIVE"
        target_ver.activated_at = now

        contract.status = "ACTIVE"
        contract.current_version_id = target_ver.id

        await self.db.commit()
        await self.db.refresh(target_ver)

        await self.audit.log_event(
            action="CONTRACT_ACTIVATED",
            resource_type="SECURITY_CONTRACT",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(contract.id),
            project_id=contract.project_id,
            status="SUCCESS",
            metadata={"version": target_ver.version, "definition_hash": target_ver.definition_hash},
        )
        return target_ver

    async def retire_contract(
        self,
        contract_id: uuid.UUID,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContract:
        contract = await self.repo.get_contract_by_id(contract_id)
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

        now = datetime.now(timezone.utc)
        contract.status = "RETIRED"
        contract.retired_at = now

        versions = await self.repo.list_versions_for_contract(contract_id)
        for v in versions:
            v.status = "RETIRED"
            v.retired_at = now

        await self.db.commit()
        await self.db.refresh(contract)

        await self.audit.log_event(
            action="CONTRACT_RETIRED",
            resource_type="SECURITY_CONTRACT",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(contract.id),
            project_id=contract.project_id,
            status="SUCCESS",
        )
        return contract

    async def add_dependency(
        self,
        contract_id: uuid.UUID,
        target_contract_id: uuid.UUID,
        dependency_type: str,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContractDependency:
        contract = await self.repo.get_contract_by_id(contract_id)
        target = await self.repo.get_contract_by_id(target_contract_id)
        if not contract or not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source or target contract not found.")

        src_ver = await self.repo.get_latest_version(contract_id)
        tgt_ver = await self.repo.get_latest_version(target_contract_id)

        # Cycle Check
        existing_deps = (await self.db.execute(select(SecurityContractDependency))).scalars().all()
        edge_map: Dict[str, set] = {}
        for d in existing_deps:
            edge_map.setdefault(str(d.contract_version_id), set()).add(str(d.depends_on_contract_version_id))

        try:
            DependencyResolver.check_dependency_cycle(str(src_ver.id), str(tgt_ver.id), edge_map)
        except DependencyCycleError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "DEPENDENCY_CYCLE_DETECTED", "message": str(e)},
            )

        dep = SecurityContractDependency(
            contract_version_id=src_ver.id,
            depends_on_contract_version_id=tgt_ver.id,
            dependency_type=dependency_type,
        )
        self.db.add(dep)
        await self.db.commit()
        await self.db.refresh(dep)

        await self.audit.log_event(
            action="CONTRACT_DEPENDENCY_CREATED",
            resource_type="CONTRACT_DEPENDENCY",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(dep.id),
            project_id=contract.project_id,
            status="SUCCESS",
            metadata={"dependency_type": dependency_type},
        )
        return dep

    async def create_override(
        self,
        contract_id: uuid.UUID,
        request: ContractOverrideCreateRequest,
        actor_id: str,
        actor_type: str = "USER",
    ) -> SecurityContractOverride:
        contract = await self.repo.get_contract_by_id(contract_id)
        if not contract or not contract.current_version_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active contract not found.")

        now = datetime.now(timezone.utc)
        override = SecurityContractOverride(
            contract_version_id=contract.current_version_id,
            project_id=contract.project_id,
            actor_type=actor_type,
            actor_id=actor_id,
            reason=request.reason,
            scope=request.scope,
            expires_at=now + timedelta(hours=request.expires_in_hours),
            status="ACTIVE",
        )
        self.db.add(override)
        await self.db.commit()
        await self.db.refresh(override)

        await self.audit.log_event(
            action="CONTRACT_OVERRIDE_REQUESTED",
            resource_type="CONTRACT_OVERRIDE",
            actor_type=actor_type,
            actor_id=actor_id,
            resource_id=str(override.id),
            project_id=contract.project_id,
            status="SUCCESS",
            metadata={"expires_at": override.expires_at.isoformat(), "reason": override.reason},
        )
        return override

    async def evaluate_contract(
        self,
        version_id: uuid.UUID,
        evidence_context: EvidenceContext,
    ) -> ContractEvaluationResult:
        """
        Executes deterministic invariant evaluation over supplied evidence context.
        Persists verification record and violations if violated.
        """
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract version not found.")

        parsed_def = SecurityContractDefinition.model_validate(version.normalized_definition)
        eval_result = ContractEvaluator.evaluate(
            definition=parsed_def,
            definition_hash=version.definition_hash,
            context=evidence_context,
            version=version.version,
        )

        now = datetime.now(timezone.utc)
        # Persist verification record
        verification = SecurityContractVerification(
            contract_version_id=version.id,
            project_id=version.contract.project_id,
            status=eval_result.truth_value.value,
            evaluation_result={"trace": eval_result.evaluation_trace, "truth_value": eval_result.truth_value.value},
            evidence_summary=eval_result.evidence_summary,
            verifier_type="CONTRACT_EVALUATOR",
            verifier_version=eval_result.verifier_version,
            evaluated_at=now,
        )
        self.db.add(verification)
        await self.db.flush()

        # If violated, record violation
        if eval_result.is_violated and eval_result.violation_details:
            v_det = eval_result.violation_details
            violation = SecurityContractViolation(
                contract_version_id=version.id,
                verification_id=verification.id,
                project_id=version.contract.project_id,
                severity=v_det.get("severity", "HIGH"),
                violation_type=v_det.get("type", "INVARIANT_BREACH"),
                description=v_det.get("description", "Security invariant evaluated to FALSE"),
                evidence={"trace": eval_result.evaluation_trace},
                status="OPEN",
                detected_at=now,
            )
            self.db.add(violation)

        await self.db.commit()

        await self.audit.log_event(
            action=f"CONTRACT_{eval_result.truth_value.value}",
            resource_type="CONTRACT_VERIFICATION",
            actor_type="SYSTEM",
            actor_id="contract-evaluator",
            resource_id=str(verification.id),
            project_id=version.contract.project_id,
            status=eval_result.truth_value.value,
            metadata={"truth_value": eval_result.truth_value.value, "version": version.version},
        )
        return eval_result
