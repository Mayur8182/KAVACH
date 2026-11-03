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
        verification_url = f"{settings.public_app_url}/verify-email/success?token={verif_token}"
        try:
            await email_service.send_verification_email(
                recipient_email=created_user.email,
                verification_url=verification_url,
                user_name=created_user.name,
            )
        except Exception:
            pass

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
