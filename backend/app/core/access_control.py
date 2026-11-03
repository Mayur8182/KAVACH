"""
Access Control & Dual-Layer Security Gateway
Enforces strict separation between:
1. Product Entitlement (SaaS subscription tier: thing_code, thing_cloud, thing_protect, etc.)
2. Role Authorization (RBAC permissions: code:read, protect:approve, admin, etc.)

Architecture Directives:
- "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
- Never rely on visual hiding; validate both entitlement and authorization at every entry point.
"""

import logging
import uuid
from typing import Callable, Dict, List, Optional, Set, Tuple
from fastapi import Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.invitation import OrganizationMember
from app.services.entitlement_service import EntitlementService, PRODUCT_CATALOG_DEFINITIONS

logger = logging.getLogger("secure-control-plane")

# Authoritative RBAC permission catalog mapped to organization roles
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "superadmin": {"*"},
    "owner": {"*"},
    "admin": {
        "code:read", "code:write", "code:delete", "code:admin",
        "cloud:read", "cloud:write", "cloud:admin",
        "protect:read", "protect:approve", "protect:admin",
        "attack:read", "attack:run",
        "agent:read", "agent:manage",
        "data:read", "data:manage",
        "qa:read", "qa:run",
        "governance:read", "governance:manage",
        "admin", "authenticated",
    },
    "security_lead": {
        "code:read", "code:write",
        "cloud:read", "cloud:write",
        "protect:read", "protect:approve",
        "attack:read", "attack:run",
        "agent:read", "agent:manage",
        "data:read",
        "qa:read", "qa:run",
        "governance:read",
        "authenticated",
    },
    "member": {
        "code:read", "code:write",
        "cloud:read",
        "protect:read",
        "attack:read",
        "agent:read",
        "data:read",
        "qa:read", "qa:run",
        "governance:read",
        "authenticated",
    },
    "developer": {
        "code:read", "code:write",
        "cloud:read",
        "protect:read",
        "qa:read", "qa:run",
        "authenticated",
    },
    "viewer": {
        "code:read",
        "cloud:read",
        "protect:read",
        "attack:read",
        "agent:read",
        "data:read",
        "qa:read",
        "governance:read",
        "authenticated",
    },
    "auditor": {
        "code:read",
        "cloud:read",
        "protect:read",
        "attack:read",
        "agent:read",
        "data:read",
        "qa:read",
        "governance:read",
        "governance:manage",
        "authenticated",
    },
}


async def resolve_user_access_context(
    user: User,
    db: AsyncSession,
    org_id: Optional[uuid.UUID] = None,
) -> Tuple[str, List[str], Optional[Organization]]:
    """
    Deterministically resolves the user's active organization role and permission bundle.
    Returns: (role_name, permissions_list, organization)
    """
    if user.is_superuser:
        # Superuser has wildcard permission over all resources
        return "superadmin", ["*"], None

    # Resolve active organization
    if org_id:
        org_stmt = select(Organization).where(Organization.id == org_id).limit(1)
    else:
        org_stmt = select(Organization).where(Organization.owner_id == user.id).limit(1)

    org_res = await db.execute(org_stmt)
    org = org_res.scalars().first()

    if not org:
        # Fallback to first organization user is member of
        mem_stmt = (
            select(OrganizationMember)
            .where(and_(OrganizationMember.user_id == user.id, OrganizationMember.is_active == True))
            .limit(1)
        )
        mem_res = await db.execute(mem_stmt)
        member_rec = mem_res.scalars().first()

        if member_rec:
            org_res2 = await db.execute(select(Organization).where(Organization.id == member_rec.organization_id))
            org = org_res2.scalars().first()
            role = member_rec.role.lower()
            perms = list(ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["member"]))
            return role, perms, org

        # Fallback if no org is found: treat as owner of default scope
        return "owner", ["*"], None

    # User is owner
    if org.owner_id == user.id:
        return "owner", ["*"], org

    # Look up OrganizationMember record
    mem_stmt = (
        select(OrganizationMember)
        .where(
            and_(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active == True,
            )
        )
        .limit(1)
    )
    mem_res = await db.execute(mem_stmt)
    member_rec = mem_res.scalars().first()

    if member_rec:
        role = member_rec.role.lower()
        perms = list(ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["member"]))
        return role, perms, org

    # Default to standard member
    return "member", list(ROLE_PERMISSIONS["member"]), org


def has_permission(user_permissions: List[str], required_permission: str) -> bool:
    """Checks whether granted permissions satisfy required permission."""
    if "*" in user_permissions:
        return True
    if required_permission == "authenticated":
        return True
    if required_permission in user_permissions:
        return True
    
    # Check domain wildcard: e.g. 'code:*' satisfies 'code:read'
    if ":" in required_permission:
        domain = required_permission.split(":")[0]
        if f"{domain}:*" in user_permissions:
            return True

    return False


def require_permission(permission_code: str) -> Callable:
    """
    FastAPI dependency enforcing deterministic RBAC permission checks.
    Raises 403 Forbidden with exact required permission if unauthorized.
    """
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        if permission_code == "authenticated":
            return

        role, permissions, _ = await resolve_user_access_context(current_user, db)
        
        if not has_permission(permissions, permission_code):
            logger.warning(
                f"RBAC Denied: User {current_user.email} (role: {role}) lacked required permission '{permission_code}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "PERMISSION_DENIED",
                    "required_permission": permission_code,
                    "user_role": role,
                    "message": f"Action requires permission '{permission_code}'. Your current role '{role}' is not authorized.",
                },
            )

    return dependency


def require_access(product_key: str, permission_code: str = "authenticated") -> Callable:
    """
    Dual-layer FastAPI dependency:
    1. SaaS Entitlement Check: Verifies organization has subscribed to product_key.
    2. RBAC Authorization Check: Verifies user role has permission_code within product.
    
    Prevents API bypass and returns distinct, actionable 403 error payloads.
    """
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        # Layer 1: Entitlement Verification
        if product_key != "platform":
            entitlement_service = EntitlementService(db)
            has_entitlement = await entitlement_service.check_access(current_user, product_key)

            if not has_entitlement:
                product_info = PRODUCT_CATALOG_DEFINITIONS.get(product_key, {})
                product_name = product_info.get("name", product_key)

                logger.warning(
                    f"Entitlement Denied: User {current_user.email} attempted to call API for locked product '{product_key}'"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "PRODUCT_NOT_ENTITLED",
                        "product_key": product_key,
                        "product_name": product_name,
                        "message": f"Product '{product_name}' is not included in your workspace subscription. Upgrade your plan to access this API.",
                        "upgrade_url": f"/billing/products?product={product_key}",
                        "price_per_month": product_info.get("price_per_month", 0),
                    },
                )

        # Layer 2: Role Authorization Verification
        if permission_code != "authenticated":
            role, permissions, _ = await resolve_user_access_context(current_user, db)

            if not has_permission(permissions, permission_code):
                logger.warning(
                    f"RBAC Denied: User {current_user.email} (role: {role}) lacked '{permission_code}' in '{product_key}'"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "PERMISSION_DENIED",
                        "product_key": product_key,
                        "required_permission": permission_code,
                        "user_role": role,
                        "message": f"Action requires permission '{permission_code}'. Your current role '{role}' is not authorized.",
                    },
                )

    return dependency
