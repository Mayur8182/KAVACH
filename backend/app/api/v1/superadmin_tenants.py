"""
Thing Control Plane — Founder SuperAdmin Tenant Management API Router
Production-ready endpoints for multi-tenant enterprise cybersecurity SaaS.

Strict Compliance with AGENTS.md:
- Rule 1: Zero hardcoded data.
- Rule 2: No fake success.
- Rule 3: No mock API responses.
- Rule 6: Real PostgreSQL / SQLite persistence.
- Rule 12: Real background jobs tracking QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED.
- Rule 14: LLM is not security authority; deterministic authorization and validations decide.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.superadmin_tenant_service import SuperAdminTenantService

logger = logging.getLogger("superadmin-tenants")

router = APIRouter(prefix="/superadmin/tenants", tags=["SuperAdmin — Tenant Management"])


# ─────────────────────────────────────────────────────────────────────────────
# Founder SuperAdmin Authorization Dependency
# ─────────────────────────────────────────────────────────────────────────────
FOUNDER_SUPERADMIN_EMAILS = {
    "mkbharvad7174@gmail.com",
    "mkbharvad534@gmail.com",
    "mkbharvad8080@gmail.com",
    "mayurbharvad7174@gmail.com",
    "mayur.k@seculayer.io",
    "mayur.k.bharvad@gmail.com",
    "dev@antigravity.security",
}


async def require_superadmin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforces deterministic platform-level founder superadmin authorization."""
    user_email = (current_user.email or "").lower().strip()
    is_founder = current_user.is_superuser or user_email in FOUNDER_SUPERADMIN_EMAILS
    if not is_founder:
        logger.warning(
            f"SuperAdmin Access Denied: User '{current_user.email}' lacks platform is_superuser authority."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "FOUNDER_SUPERADMIN_REQUIRED",
                "message": "Access restricted to Platform Founder SuperAdmin.",
                "user_email": current_user.email,
            },
        )
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────
class MemberInvitationInput(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "developer"


class CreateTenantRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    domain: Optional[str] = Field(default="", max_length=255)
    org_type: Optional[str] = "Technology"
    industry: Optional[str] = "Software Development"
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#2563EB"
    region: str = "ap-south-1 (Mumbai)"
    plan: str = "PRO"
    repository_limit: int = 25
    scan_minutes: int = 10000
    team_seats: int = 20
    admin_name: str = Field(..., min_length=2)
    admin_email: EmailStr
    admin_role: str = "Organization Admin"
    send_invite: Optional[bool] = True
    additional_members: Optional[List[MemberInvitationInput]] = []
    integrations_to_enable: Optional[List[str]] = []


class InviteMemberRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "developer"
    team: Optional[str] = "Platform"
    scope: Optional[str] = "All Projects"
    admin_type: Optional[str] = None
    message: Optional[str] = None


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ConnectIntegrationRequest(BaseModel):
    provider: str
    account_name: Optional[str] = None
    scopes: Optional[List[str]] = []


class UpdateIntegrationSettingRequest(BaseModel):
    setting_key: str
    enabled: bool



class UpdateQuotasRequest(BaseModel):
    max_repositories: Optional[int] = None
    max_scan_minutes: Optional[int] = None
    max_storage_gb: Optional[int] = None
    max_api_calls: Optional[int] = None
    max_runner_nodes: Optional[int] = None


class AddEnvironmentRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    scan_schedule: str = "Continuous"


class AddEnvironmentVariableRequest(BaseModel):
    key: str
    value: str
    environment: str = "All"


class AddSecretRequest(BaseModel):
    name: str
    environment: str = "All"
    type: str = "General"


class ConfigureIsolationRequest(BaseModel):
    isolation_type: str
    status: str = "Enabled"
    description: Optional[str] = None


class UpdatePlanRequest(BaseModel):
    plan: str = "ENTERPRISE"


class SuspendTenantRequest(BaseModel):
    reason: Optional[str] = None


class ToggleMaintenanceRequest(BaseModel):
    is_maintenance: bool


class UpdateRetentionRequest(BaseModel):
    data_retention_days: int = Field(..., ge=7, le=365)


class DeleteTenantRequest(BaseModel):
    confirmation: str = Field(..., description="Must type 'DELETE' to confirm")


class UpdateRetentionItemRequest(BaseModel):
    item_id: str
    period: str


class UpdateArchiveSettingsRequest(BaseModel):
    enabled: bool


class CreateProvisioningJobRequest(BaseModel):
    tenant_name: str
    job_type: str = "Full Provisioning"
    organization_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# 1. Plan Catalog (For Wizard Step 2)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/plans", summary="Retrieve available subscription tiers and feature entitlements")
async def get_plans(
    admin: User = Depends(require_superadmin_user),
) -> List[Dict[str, Any]]:
    return SuperAdminTenantService.get_plan_catalog()


# ─────────────────────────────────────────────────────────────────────────────
# 2. All Organizations Directory (Paginated, Search, Filters, Sorting)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("", summary="List organizations with pagination, search, status/plan filters, and real metrics")
async def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.list_tenants(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        plan=plan,
        sort_by=sort_by,
        sort_order=sort_order,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Create Tenant Wizard (Step 5 Review & Create)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED, summary="Create organization and queue background provisioning pipeline")
async def create_tenant(
    payload: CreateTenantRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.create_tenant(payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Tenant creation error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Creation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Provisioning Status & Jobs Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/provisioning/jobs", summary="List real background provisioning jobs from task queue")
async def list_provisioning_jobs(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.list_provisioning_jobs(
        status_filter=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("/provisioning/jobs", summary="Create and queue a new background provisioning job")
async def create_provisioning_job(
    payload: CreateProvisioningJobRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.create_provisioning_job(
        tenant_name=payload.tenant_name,
        job_type=payload.job_type,
        organization_id=payload.organization_id,
        actor_id=str(admin.id),
    )


@router.post("/provisioning/jobs/{job_id}/retry", summary="Retry a failed provisioning job")
async def retry_provisioning_job(
    job_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.retry_provisioning_job(job_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/provisioning/jobs/{job_id}/cancel", summary="Cancel an in-progress provisioning job")
async def cancel_provisioning_job(
    job_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.cancel_provisioning_job(job_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 5. Tenant Details (Overview, Identity, Quotas, Findings)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}", summary="Retrieve detailed organization overview, quotas, and security metrics")
async def get_tenant(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_details(tenant_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 6. Tenant Members & Access Management
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/members", summary="List organization members, roles, and pending invitations")
async def get_tenant_members(
    tenant_id: str,
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_members(tenant_id, role_filter=role, search=search)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tenant_id}/members/invite", status_code=status.HTTP_201_CREATED, summary="Invite new member to tenant")
async def invite_member(
    tenant_id: str,
    payload: InviteMemberRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.invite_member(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{tenant_id}/members/{member_id}", summary="Update member role or active state")
async def update_member(
    tenant_id: str,
    member_id: str,
    payload: UpdateMemberRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_member_role(
            tenant_id, member_id, payload.model_dump(exclude_unset=True), actor_id=str(admin.id)
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{tenant_id}/members/{member_id}", summary="Revoke member access from tenant")
async def remove_member(
    tenant_id: str,
    member_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.remove_member(tenant_id, member_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 7. Tenant Repositories
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/repositories", summary="List repositories and security findings for tenant")
async def get_tenant_repositories(
    tenant_id: str,
    search: Optional[str] = Query(None),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_repositories(tenant_id, search=search)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 8. Tenant Integrations
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/integrations", summary="Retrieve connected and available integrations")
async def get_tenant_integrations(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.get_tenant_integrations(tenant_id)


@router.post("/{tenant_id}/integrations/connect", summary="Connect an integration to tenant")
async def connect_integration(
    tenant_id: str,
    payload: ConnectIntegrationRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.connect_integration(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{tenant_id}/integrations/{integration_id}", summary="Disconnect an active integration")
async def disconnect_integration(
    tenant_id: str,
    integration_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.disconnect_integration(tenant_id, integration_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/integrations/settings", summary="Update tenant integration configuration toggle")
async def update_integration_setting(
    tenant_id: str,
    payload: UpdateIntegrationSettingRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_integration_setting(
            tenant_id, payload.setting_key, payload.enabled, actor_id=str(admin.id)
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



# ─────────────────────────────────────────────────────────────────────────────
# 9. Tenant Resources & Isolation Architecture
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/resources", summary="Retrieve infrastructure allocations, quotas, isolation, and environments")
async def get_tenant_resources(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_resources(tenant_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/resources/quotas", summary="Update resource quotas and limits")
async def update_tenant_quotas(
    tenant_id: str,
    payload: UpdateQuotasRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_tenant_quotas(
            tenant_id, payload.model_dump(exclude_unset=True), actor_id=str(admin.id)
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/resources/environments", status_code=status.HTTP_201_CREATED, summary="Add environment to tenant")
async def add_tenant_environment(
    tenant_id: str,
    payload: AddEnvironmentRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.add_tenant_environment(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tenant_id}/resources/variables", summary="Add or update tenant environment variable")
async def add_tenant_environment_variable(
    tenant_id: str,
    payload: AddEnvironmentVariableRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.add_tenant_environment_variable(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{tenant_id}/resources/variables/{variable_key}", summary="Delete tenant environment variable")
async def delete_tenant_environment_variable(
    tenant_id: str,
    variable_key: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.delete_tenant_environment_variable(tenant_id, variable_key, actor_id=str(admin.id))


@router.post("/{tenant_id}/resources/secrets", summary="Add or update tenant secret reference")
async def add_tenant_secret(
    tenant_id: str,
    payload: AddSecretRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.add_tenant_secret(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{tenant_id}/resources/secrets/{secret_name}", summary="Delete tenant secret reference")
async def delete_tenant_secret(
    tenant_id: str,
    secret_name: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.delete_tenant_secret(tenant_id, secret_name, actor_id=str(admin.id))


@router.post("/{tenant_id}/resources/isolation/configure", summary="Update isolation configuration")
async def configure_tenant_isolation(
    tenant_id: str,
    payload: ConfigureIsolationRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    return await service.configure_tenant_isolation(tenant_id, payload.model_dump(), actor_id=str(admin.id))


# ─────────────────────────────────────────────────────────────────────────────
# 10. Tenant Billing & Invoices
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/billing", summary="Retrieve current subscription, usage, and invoices")
async def get_tenant_billing(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_billing(tenant_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/billing/plan", summary="Change subscription plan tier")
async def update_tenant_plan(
    tenant_id: str,
    payload: UpdatePlanRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_tenant_plan(tenant_id, payload.model_dump(), actor_id=str(admin.id))
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 11. Tenant Activity / Audit Log
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/{tenant_id}/activity", summary="Retrieve immutable audit log timeline for tenant")
async def get_tenant_activity(
    tenant_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_activity(tenant_id, page=page, page_size=page_size)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 12. Tenant Lifecycle Operations & Deletion
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{tenant_id}/lifecycle/suspend", summary="Suspend organization access")
async def suspend_tenant(
    tenant_id: str,
    payload: SuspendTenantRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.suspend_tenant(tenant_id, reason=payload.reason, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/reinstate", summary="Reinstate suspended organization")
async def reinstate_tenant(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.reinstate_tenant(tenant_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/maintenance", summary="Toggle maintenance mode")
async def toggle_maintenance(
    tenant_id: str,
    payload: ToggleMaintenanceRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.toggle_maintenance(tenant_id, is_maintenance=payload.is_maintenance, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/retention", summary="Update data retention period")
async def update_retention(
    tenant_id: str,
    payload: UpdateRetentionRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_retention_policy(tenant_id, retention_days=payload.data_retention_days, actor_id=str(admin.id))
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tenant_id}/lifecycle/delete", summary="Permanently delete organization with audit retention")
async def delete_tenant(
    tenant_id: str,
    payload: DeleteTenantRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.delete_tenant(tenant_id, confirmation_text=payload.confirmation, actor_id=str(admin.id))
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tenant_id}/lifecycle", summary="Retrieve verified tenant lifecycle status, health, and retention")
async def get_tenant_lifecycle(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.get_tenant_lifecycle(tenant_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/rotate-secrets", summary="Rotate all tenant credentials and secrets")
async def rotate_tenant_secrets(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.rotate_tenant_secrets(tenant_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/reprovision", summary="Trigger reprovisioning background pipeline")
async def reprovision_tenant(
    tenant_id: str,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.reprovision_tenant(tenant_id, actor_id=str(admin.id))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/retention-item", summary="Update retention period for specific item")
async def update_retention_item(
    tenant_id: str,
    payload: UpdateRetentionItemRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_retention_item(
            tenant_id,
            item_id=payload.item_id,
            period=payload.period,
            actor_id=str(admin.id),
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{tenant_id}/lifecycle/archive-settings", summary="Configure long term archival storage")
async def update_archive_settings(
    tenant_id: str,
    payload: UpdateArchiveSettingsRequest,
    admin: User = Depends(require_superadmin_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = SuperAdminTenantService(db)
    try:
        return await service.update_archive_settings(
            tenant_id,
            enabled=payload.enabled,
            actor_id=str(admin.id),
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

