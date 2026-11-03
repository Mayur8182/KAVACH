import logging
from typing import Callable
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.entitlement_service import EntitlementService, PRODUCT_CATALOG_DEFINITIONS

logger = logging.getLogger("secure-control-plane")


def require_product(product_key: str) -> Callable:
    """
    FastAPI endpoint dependency enforcing product-level subscription entitlements.
    Ensures that unentitled users cannot bypass the frontend by directly requesting API routes.
    Raises 403 Forbidden with actionable upgrade details if the product is locked.
    """
    async def dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        service = EntitlementService(db)
        has_access = await service.check_access(current_user, product_key)
        
        if not has_access:
            product_info = PRODUCT_CATALOG_DEFINITIONS.get(product_key, {})
            product_name = product_info.get("name", product_key)
            
            logger.warning(
                f"Access denied: User {current_user.email} attempted to access locked product '{product_key}'"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "PRODUCT_NOT_ENTITLED",
                    "product_key": product_key,
                    "product_name": product_name,
                    "message": f"Product '{product_name}' is not included in your workspace subscription. Upgrade your plan or purchase an add-on to access this feature.",
                    "upgrade_url": f"/billing/products?product={product_key}",
                    "price_per_month": product_info.get("price_per_month", 0),
                },
            )

    return dependency
