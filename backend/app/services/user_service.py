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
        existing = await self.repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account with email '{payload.email}' already exists",
            )

        hashed = hash_password(payload.password)
        user = User(
            email=payload.email.lower().strip(),
            name=payload.name.strip(),
            password_hash=hashed,
            is_active=True,
            is_superuser=False,
        )
        created_user = await self.repo.create(user)

        # Record USER_CREATED audit event
        await self.audit.log_event(
            action="USER_CREATED",
            resource_type="user",
            actor_type="user",
            actor_id=str(created_user.id),
            resource_id=str(created_user.id),
            status="SUCCESS",
            metadata={"email": created_user.email, "request_id": request_id},
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
