from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.services.audit_service import AuditService


class UserService:
    """Service managing user authentication and account lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)
        self.audit = AuditService(db)

    async def register(self, payload: UserCreate, request_id: Optional[str] = None) -> User:
        import secrets
        from datetime import datetime, timezone
        from app.core.config import get_settings
        from app.services.email_service import email_service

        settings = get_settings()
        existing = await self.repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{payload.email}' already exists",
            )

        hashed = hash_password(payload.password)
        verif_token = secrets.token_urlsafe(32)
        user = User(
            email=payload.email.lower().strip(),
            name=payload.name.strip(),
            password_hash=hashed,
            is_active=True,
            is_superuser=False,
            is_verified=False,
            verification_token=verif_token,
            verification_sent_at=datetime.now(timezone.utc),
        )
        created_user = await self.repo.create(user)

        # Dispatch real SMTP verification email
        app_url = "http://localhost:3002" if "kavachsecurity.me" in settings.public_app_url else settings.public_app_url
        verification_url = f"{app_url}/verify-email/success?token={verif_token}"
        try:
            res = await email_service.send_verification_email(
                recipient_email=created_user.email,
                verification_url=verification_url,
                user_name=created_user.name,
            )
            import logging
            logging.getLogger("secure-control-plane.email").info(
                f"Verification email dispatched to {created_user.email}: {res}"
            )
        except Exception as exc:
            import logging
            logging.getLogger("secure-control-plane.email").error(
                f"Failed to deliver verification email to {created_user.email}: {exc}", exc_info=True
            )

        # Record USER_CREATED audit event
        await self.audit.log_event(
            action="USER_CREATED",
            resource_type="user",
            actor_type="user",
            actor_id=str(created_user.id),
            resource_id=str(created_user.id),
            status="SUCCESS",
            metadata={"email": created_user.email, "request_id": request_id, "verification_sent": True},
        )

        # Deterministically provision user's dedicated Organization, Membership, and Personal Workspace
        import uuid
        from app.models.organization import Organization, Workspace
        from app.models.invitation import OrganizationMember

        org_id = uuid.uuid4()
        user_name = created_user.name or created_user.email.split("@")[0]
        user_org = Organization(
            id=org_id,
            name=f"{user_name}'s Organization",
            slug=f"org-{str(created_user.id)[:8]}",
            owner_id=created_user.id,
            owner_name=user_name,
            owner_email=created_user.email,
            org_type="Enterprise",
            industry="Technology",
            status="ACTIVE",
        )
        self.db.add(user_org)
        await self.db.flush()

        member = OrganizationMember(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=created_user.id,
            role="OWNER",
            is_active=True,
        )
        self.db.add(member)

        ws_id = uuid.uuid4()
        personal_ws = Workspace(
            id=ws_id,
            owner_id=created_user.id,
            organization_id=org_id,
            workspace_type="PERSONAL",
            name="Personal Workspace",
            slug=f"personal-{str(created_user.id)[:8]}",
            description="Personal workspace for internal projects and repositories",
            visibility="Private",
            default_branch="main",
            region="ap-south-1 (Mumbai)",
            deployment_target="Kubernetes",
            admins=[user_name],
            status="ACTIVE",
            environments_count=1,
        )
        self.db.add(personal_ws)

        # Initialize base Free Tier subscription and core product entitlements
        from app.models.organization import OrganizationSubscription, ProductEntitlement
        from app.services.entitlement_service import PRODUCT_CATALOG_DEFINITIONS

        sub = OrganizationSubscription(
            id=uuid.uuid4(),
            organization_id=org_id,
            plan="FREE_TIER",
            status="ACTIVE",
            billing_cycle="monthly",
            max_seats=5,
            used_seats=1,
        )
        self.db.add(sub)

        for prod_key, prod_meta in PRODUCT_CATALOG_DEFINITIONS.items():
            is_enabled = (prod_key == "thing_code")
            ent = ProductEntitlement(
                id=uuid.uuid4(),
                organization_id=org_id,
                product_key=prod_key,
                is_enabled=is_enabled,
                status="ENABLED" if is_enabled else "LOCKED",
                features=[f["name"] for f in prod_meta.get("features", [])],
                source="DEFAULT_INITIALIZATION",
            )
            self.db.add(ent)

        await self.db.commit()
        await self.db.refresh(created_user)
        return created_user

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user
