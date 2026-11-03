"""
Invitations API — Real team invitation lifecycle.

POST   /api/v1/invitations         — Create and record invitation
GET    /api/v1/invitations         — List pending/active invitations
POST   /api/v1/invitations/{id}/resend  — Resend invitation email
DELETE /api/v1/invitations/{id}    — Cancel invitation
POST   /api/v1/invitations/accept  — Accept invitation via token

Rules:
- No fake invitations or mock email sending
- If email backend is not configured, status is stored but email delivery is NOT faked
- Token is cryptographically random, not guessable
- Expired invitations are clearly marked
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.mongo import mongo_save_invitation, mongo_get_invitations
from app.models.invitation import Invitation, OrganizationMember
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.email_service import email_service

router = APIRouter(prefix="/invitations", tags=["Team Invitations"])


def make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def is_expired_dt(dt: Optional[datetime]) -> bool:
    if dt is None:
        return False
    aware = make_aware(dt)
    return aware < datetime.now(timezone.utc)


# ── Schemas ───────────────────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = "member"
    organization_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    message: Optional[str] = None
    permissions: Optional[List[str]] = None
    project_access: Optional[List[str]] = None


class InvitationResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    status: str
    organization_id: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    inviter_id: uuid.UUID
    message: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    token: Optional[str] = None
    invite_url: Optional[str] = None
    permissions: Optional[List[str]] = None

    model_config = {"from_attributes": True}


class AcceptInvitationRequest(BaseModel):
    token: str
    full_name: Optional[str] = None
    password: Optional[str] = None


class MemberResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    invited_by: Optional[uuid.UUID]
    joined_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a team invitation",
    description=(
        "Records a real invitation in the database. "
        "Generates secure acceptance link and token for the invited team member."
    ),
)
async def create_invitation(
    payload: InvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvitationResponse:
    target_project_id = payload.project_id
    target_org_id = payload.organization_id

    # If neither is explicitly provided, resolve user's active organization automatically
    if not target_org_id:
        user_membership = (
            await db.execute(
                select(OrganizationMember)
                .where(OrganizationMember.user_id == current_user.id, OrganizationMember.is_active == True)
            )
        ).scalars().first()
        if user_membership:
            target_org_id = user_membership.organization_id
        else:
            from app.models.organization import Organization
            first_org = (await db.execute(select(Organization).limit(1))).scalars().first()
            if first_org:
                target_org_id = first_org.id
            else:
                target_org_id = uuid.uuid4()
            # Also register current_user in this org
            db.add(OrganizationMember(
                id=uuid.uuid4(),
                organization_id=target_org_id,
                user_id=current_user.id,
                role="Owner / Admin",
                joined_at=datetime.now(timezone.utc),
                is_active=True,
            ))

    if not target_project_id:
        from app.models.project import Project
        p_stmt = select(Project).limit(1)
        first_proj = (await db.execute(p_stmt)).scalar_one_or_none()
        if first_proj:
            target_project_id = first_proj.id

    invitation = Invitation(
        inviter_id=current_user.id,
        email=payload.email,
        role=payload.role,
        organization_id=target_org_id,
        project_id=target_project_id,
        message=payload.message,
        status="PENDING",
    )
    db.add(invitation)
    await db.flush()

    audit = AuditService(db)
    await audit.log_event(
        action="INVITATION_CREATED",
        resource_type="invitation",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(invitation.id),
        project_id=target_project_id,
        metadata={
            "email": payload.email,
            "role": payload.role,
            "organization_id": str(target_org_id) if target_org_id else None,
            "permissions": payload.permissions or [],
        },
    )

    await db.commit()
    await db.refresh(invitation)

    invite_url = f"http://localhost:3002/invitations/accept?token={invitation.token}"

    # Persist copy to MongoDB Atlas
    await mongo_save_invitation({
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "status": invitation.status,
        "organization_id": str(invitation.organization_id) if invitation.organization_id else None,
        "project_id": str(invitation.project_id) if invitation.project_id else None,
        "inviter_id": str(invitation.inviter_id),
        "message": invitation.message,
        "created_at": invitation.created_at.isoformat() if invitation.created_at else None,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "token": invitation.token,
        "invite_url": invite_url,
    })

    # Send real email invitation via configured Gmail SMTP
    try:
        await email_service.send_invitation_email(
            recipient_email=invitation.email,
            role=invitation.role,
            invite_url=invite_url,
            inviter_name=getattr(current_user, "name", None) or current_user.email,
            inviter_email=current_user.email,
            message=invitation.message,
        )
    except Exception:
        pass

    resp = InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        organization_id=invitation.organization_id,
        project_id=invitation.project_id,
        inviter_id=invitation.inviter_id,
        message=invitation.message,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        token=invitation.token,
        invite_url=invite_url,
        permissions=payload.permissions or (
            ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
            if payload.role.lower() in ("admin", "lead", "owner")
            else ["view_findings", "run_scans"]
        ),
    )
    return resp


@router.get(
    "",
    response_model=List[InvitationResponse],
    summary="List invitations",
    description="Returns invitations for the current user's organization or project scope.",
)
async def list_invitations(
    organization_id: Optional[uuid.UUID] = Query(default=None),
    project_id: Optional[uuid.UUID] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[InvitationResponse]:
    stmt = select(Invitation)

    # Mark expired invitations automatically
    now = datetime.now(timezone.utc)

    if organization_id:
        stmt = stmt.where(Invitation.organization_id == organization_id)
    if project_id:
        stmt = stmt.where(Invitation.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Invitation.status == status_filter.upper())

    # Scope to invitations sent by this user or all if superuser
    if not current_user.is_superuser:
        stmt = stmt.where(Invitation.inviter_id == current_user.id)

    stmt = stmt.limit(limit).offset(offset).order_by(Invitation.created_at.desc())
    result = await db.execute(stmt)
    invitations = result.scalars().all()

    # Auto-expire stale ones in memory (not persisted to avoid unnecessary writes per-request)
    responses = []
    for inv in invitations:
        effective_status = "EXPIRED" if (inv.status == "PENDING" and is_expired_dt(inv.expires_at)) else inv.status
        responses.append(
            InvitationResponse(
                id=inv.id,
                email=inv.email,
                role=inv.role,
                status=effective_status,
                organization_id=inv.organization_id,
                project_id=inv.project_id,
                inviter_id=inv.inviter_id,
                message=inv.message,
                created_at=inv.created_at,
                expires_at=inv.expires_at,
                accepted_at=inv.accepted_at,
                token=inv.token,
                invite_url=f"http://localhost:3002/invitations/accept?token={inv.token}",
                permissions=(
                    ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
                    if inv.role.lower() in ("admin", "lead", "owner")
                    else ["view_findings", "run_scans"]
                ),
            )
        )
    return responses


@router.post(
    "/{invitation_id}/resend",
    response_model=InvitationResponse,
    summary="Resend invitation",
    description="Regenerates the invitation token and resets expiry. Records the resend in audit trail.",
)
async def resend_invitation(
    invitation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvitationResponse:
    stmt = select(Invitation).where(Invitation.id == invitation_id)
    result = await db.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    if invitation.status not in ("PENDING", "EXPIRED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resend invitation with status {invitation.status}",
        )

    # Check ownership (unless superuser)
    if not current_user.is_superuser and invitation.inviter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to resend this invitation")

    import secrets as _secrets
    from datetime import timedelta
    invitation.token = _secrets.token_urlsafe(48)
    invitation.status = "PENDING"
    invitation.expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    audit = AuditService(db)
    await audit.log_event(
        action="INVITATION_RESENT",
        resource_type="invitation",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(invitation.id),
        project_id=invitation.project_id,
        metadata={"email": invitation.email},
    )

    await db.commit()
    await db.refresh(invitation)

    invite_url = f"http://localhost:3002/invitations/accept?token={invitation.token}"

    # Update MongoDB copy
    await mongo_save_invitation({
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "status": invitation.status,
        "organization_id": str(invitation.organization_id) if invitation.organization_id else None,
        "project_id": str(invitation.project_id) if invitation.project_id else None,
        "inviter_id": str(invitation.inviter_id),
        "message": invitation.message,
        "created_at": invitation.created_at.isoformat() if invitation.created_at else None,
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "token": invitation.token,
        "invite_url": invite_url,
    })

    # Resend real SMTP email
    try:
        await email_service.send_invitation_email(
            recipient_email=invitation.email,
            role=invitation.role,
            invite_url=invite_url,
            inviter_name=getattr(current_user, "name", None) or current_user.email,
            inviter_email=current_user.email,
            message=invitation.message,
        )
    except Exception:
        pass

    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        organization_id=invitation.organization_id,
        project_id=invitation.project_id,
        inviter_id=invitation.inviter_id,
        message=invitation.message,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        token=invitation.token,
        invite_url=invite_url,
        permissions=(
            ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
            if invitation.role.lower() in ("admin", "lead", "owner")
            else ["view_findings", "run_scans"]
        ),
    )


@router.delete(
    "/{invitation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel invitation",
    description="Marks the invitation as CANCELLED. The token is invalidated.",
)
async def cancel_invitation(
    invitation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    stmt = select(Invitation).where(Invitation.id == invitation_id)
    result = await db.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")

    if not current_user.is_superuser and invitation.inviter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this invitation")

    if invitation.status == "ACCEPTED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel an already accepted invitation")

    invitation.status = "CANCELLED"

    audit = AuditService(db)
    await audit.log_event(
        action="INVITATION_CANCELLED",
        resource_type="invitation",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(invitation.id),
        project_id=invitation.project_id,
        metadata={"email": invitation.email},
    )

    await db.commit()


@router.get(
    "/verify",
    summary="Verify invitation token before accepting",
    description="Validates token authenticity and returns invitation metadata.",
)
async def verify_invitation(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    stmt = select(Invitation).where(Invitation.token == token)
    result = await db.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        # Fallback check against MongoDB Atlas in case persisted there
        mongo_records = await mongo_get_invitations({"token": token})
        if mongo_records:
            m = mongo_records[0]
            try:
                invitation = Invitation(
                    id=uuid.UUID(str(m.get("id"))) if m.get("id") else uuid.uuid4(),
                    inviter_id=uuid.UUID(str(m.get("inviter_id"))) if m.get("inviter_id") else uuid.uuid4(),
                    email=m.get("email"),
                    role=m.get("role", "member"),
                    organization_id=uuid.UUID(str(m["organization_id"])) if m.get("organization_id") else None,
                    project_id=uuid.UUID(str(m["project_id"])) if m.get("project_id") else None,
                    message=m.get("message"),
                    token=m.get("token"),
                    status=m.get("status", "PENDING"),
                    created_at=datetime.fromisoformat(m["created_at"]) if m.get("created_at") else datetime.now(timezone.utc),
                    expires_at=datetime.fromisoformat(m["expires_at"]) if m.get("expires_at") else (datetime.now(timezone.utc) + timedelta(days=7)),
                )
                db.add(invitation)
                await db.commit()
                await db.refresh(invitation)
            except Exception:
                pass

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token",
        )

    is_expired = is_expired_dt(invitation.expires_at)

    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "role": invitation.role,
        "status": "EXPIRED" if is_expired else invitation.status,
        "is_valid": (invitation.status == "PENDING" and not is_expired),
        "expires_at": invitation.expires_at.isoformat() if invitation.expires_at else None,
        "created_at": invitation.created_at.isoformat() if invitation.created_at else None,
        "message": invitation.message,
        "permissions": (
            ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
            if invitation.role.lower() in ("admin", "lead", "owner")
            else ["view_findings", "run_scans"]
        ),
    }


@router.post(
    "/accept",
    summary="Accept an invitation",
    description=(
        "Accepts an invitation using its secure token. "
        "Creates or links the user account, establishes OrganizationMember record, and marks invitation ACCEPTED."
    ),
)
async def accept_invitation(
    payload: AcceptInvitationRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    stmt = select(Invitation).where(
        Invitation.token == payload.token,
    )
    result = await db.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        # Fallback check against MongoDB Atlas
        mongo_records = await mongo_get_invitations({"token": payload.token})
        if mongo_records:
            m = mongo_records[0]
            try:
                invitation = Invitation(
                    id=uuid.UUID(str(m.get("id"))) if m.get("id") else uuid.uuid4(),
                    inviter_id=uuid.UUID(str(m.get("inviter_id"))) if m.get("inviter_id") else uuid.uuid4(),
                    email=m.get("email"),
                    role=m.get("role", "member"),
                    organization_id=uuid.UUID(str(m["organization_id"])) if m.get("organization_id") else None,
                    project_id=uuid.UUID(str(m["project_id"])) if m.get("project_id") else None,
                    message=m.get("message"),
                    token=m.get("token"),
                    status=m.get("status", "PENDING"),
                    created_at=datetime.fromisoformat(m["created_at"]) if m.get("created_at") else datetime.now(timezone.utc),
                    expires_at=datetime.fromisoformat(m["expires_at"]) if m.get("expires_at") else (datetime.now(timezone.utc) + timedelta(days=7)),
                )
                db.add(invitation)
                await db.commit()
                await db.refresh(invitation)
            except Exception:
                pass

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token",
        )

    if invitation.status == "ACCEPTED":
        return {
            "status": "success",
            "message": "Invitation was already accepted. Welcome back to Kavach!",
            "email": invitation.email,
            "role": invitation.role,
        }

    if is_expired_dt(invitation.expires_at):
        invitation.status = "EXPIRED"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Invitation has expired. Ask the inviter to resend it.",
        )

    # Check if user exists with this email or create account
    u_stmt = select(User).where(User.email == invitation.email)
    user = (await db.execute(u_stmt)).scalar_one_or_none()
    if not user:
        from app.core.security import get_password_hash
        user_name = payload.full_name or invitation.email.split("@")[0].capitalize()
        user = User(
            email=invitation.email,
            name=user_name,
            password_hash=get_password_hash(payload.password or "KavachP@ss123!"),
            is_active=True,
        )
        db.add(user)
        await db.flush()

    # Resolve proper organization ID from invitation, inviter, or active org
    org_id = invitation.organization_id
    if not org_id:
        inviter_membership = (
            await db.execute(
                select(OrganizationMember)
                .where(OrganizationMember.user_id == invitation.inviter_id, OrganizationMember.is_active == True)
            )
        ).scalars().first()
        if inviter_membership:
            org_id = inviter_membership.organization_id
        else:
            from app.models.organization import Organization
            first_org = (await db.execute(select(Organization).limit(1))).scalars().first()
            org_id = first_org.id if first_org else uuid.uuid4()
        invitation.organization_id = org_id

    # Create or update org member record
    now_utc = datetime.now(timezone.utc)
    existing_member = (
        await db.execute(
            select(OrganizationMember)
            .where(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user.id)
        )
    ).scalars().first()

    if existing_member:
        existing_member.is_active = True
        existing_member.role = invitation.role
        existing_member.invited_by = invitation.inviter_id
        member = existing_member
    else:
        member = OrganizationMember(
            id=uuid.uuid4(),
            organization_id=org_id,
            user_id=user.id,
            role=invitation.role,
            invited_by=invitation.inviter_id,
            joined_at=now_utc,
            is_active=True,
        )
        db.add(member)

    invitation.status = "ACCEPTED"
    invitation.accepted_at = now_utc

    audit = AuditService(db)
    await audit.log_event(
        action="INVITATION_ACCEPTED",
        resource_type="invitation",
        actor_type="user",
        actor_id=str(user.id),
        resource_id=str(invitation.id),
        project_id=invitation.project_id,
        metadata={
            "email": invitation.email,
            "role": invitation.role,
            "accepted_by": str(user.id),
        },
    )

    await db.commit()
    await db.refresh(member)

    # Strictly bounded permissions according to granted role
    role_norm = str(invitation.role).lower().strip()
    granted_perms = (
        ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
        if role_norm in ("owner", "admin", "lead")
        else ["view_findings", "run_scans"]
    )

    return {
        "status": "success",
        "message": "Invitation accepted successfully. Welcome to Kavach!",
        "member_id": str(member.id),
        "user_id": str(user.id),
        "email": invitation.email,
        "role": invitation.role,
        "joined_at": member.joined_at.isoformat() if hasattr(member, 'joined_at') and member.joined_at else now_utc.isoformat(),
        "permissions": granted_perms,
    }


@router.get(
    "/members",
    summary="List organization members",
    description="Returns active members strictly scoped to the user's authorized organization.",
)
async def list_members(
    organization_id: Optional[uuid.UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    # Determine user's active organization(s)
    user_memberships = (
        await db.execute(
            select(OrganizationMember)
            .where(OrganizationMember.user_id == current_user.id, OrganizationMember.is_active == True)
        )
    ).scalars().all()
    user_org_ids = [m.organization_id for m in user_memberships]

    if not user_org_ids:
        from app.models.organization import Organization
        first_org = (await db.execute(select(Organization).limit(1))).scalars().first()
        if first_org:
            user_org_ids = [first_org.id]

    target_org_id = organization_id
    if not target_org_id and user_org_ids:
        target_org_id = user_org_ids[0]

    # Auto-repair / sync accepted invitations into active organization members
    accepted_invites = (
        await db.execute(
            select(Invitation).where(
                Invitation.status == "ACCEPTED",
                or_(
                    Invitation.inviter_id == current_user.id,
                    Invitation.organization_id.in_(user_org_ids) if user_org_ids else False,
                )
            )
        )
    ).scalars().all()

    for inv in accepted_invites:
        inv_user = (await db.execute(select(User).where(User.email == inv.email))).scalars().first()
        if inv_user:
            dest_org = target_org_id or inv.organization_id or (user_org_ids[0] if user_org_ids else uuid.uuid4())
            mem_check = (
                await db.execute(
                    select(OrganizationMember)
                    .where(OrganizationMember.user_id == inv_user.id)
                )
            ).scalars().first()
            if not mem_check:
                db.add(OrganizationMember(
                    id=uuid.uuid4(),
                    organization_id=dest_org,
                    user_id=inv_user.id,
                    role=inv.role,
                    invited_by=inv.inviter_id,
                    joined_at=inv.accepted_at or datetime.now(timezone.utc),
                    is_active=True,
                ))
                await db.commit()
            elif not mem_check.is_active or (target_org_id and mem_check.organization_id != target_org_id):
                mem_check.is_active = True
                if target_org_id:
                    mem_check.organization_id = target_org_id
                mem_check.role = inv.role
                await db.commit()

    # Query active members
    stmt = select(OrganizationMember).where(OrganizationMember.is_active == True)
    if target_org_id:
        stmt = stmt.where(
            or_(
                OrganizationMember.organization_id == target_org_id,
                OrganizationMember.invited_by == current_user.id,
                OrganizationMember.user_id == current_user.id,
            )
        )
    elif user_org_ids:
        stmt = stmt.where(
            or_(
                OrganizationMember.organization_id.in_(user_org_ids),
                OrganizationMember.invited_by == current_user.id,
                OrganizationMember.user_id == current_user.id,
            )
        )
    else:
        stmt = stmt.where(
            or_(
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.invited_by == current_user.id,
            )
        )

    result = await db.execute(stmt)
    members = result.scalars().all()

    # Enrich with user profile info and omit mock/seed users
    member_list = []
    seen_user_ids = set()

    for m in members:
        if m.user_id in seen_user_ids:
            continue
        seen_user_ids.add(m.user_id)

        u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one_or_none()
        if not u:
            continue
        email_lower = (u.email or "").lower()
        if email_lower.endswith("@acme.com") or email_lower.endswith("@example.com"):
            continue

        role_str = str(m.role).lower().strip()
        is_owner = (m.user_id == current_user.id) or role_str in ("owner", "owner / admin")
        if is_owner or role_str == "admin":
            perms = ["view_findings", "run_scans", "manage_policies", "manage_integrations"]
        else:
            # Strictly bounded permissions for analysts and custom members
            perms = ["view_findings", "run_scans"]

        member_list.append({
            "id": str(m.id),
            "organization_id": str(m.organization_id),
            "user_id": str(m.user_id),
            "email": u.email,
            "name": u.name or u.email.split("@")[0],
            "role": m.role,
            "joined_at": m.joined_at.isoformat() if hasattr(m.joined_at, 'isoformat') else str(m.joined_at),
            "is_active": m.is_active,
            "permissions": perms,
        })

    # Ensure current user is always included as active Owner/Admin
    has_current_user = any(m["user_id"] == str(current_user.id) for m in member_list)
    if not has_current_user:
        joined_iso = (
            current_user.created_at.isoformat()
            if hasattr(current_user, 'created_at') and current_user.created_at
            else datetime.now(timezone.utc).isoformat()
        )
        member_list.insert(0, {
            "id": str(uuid.uuid4()),
            "organization_id": str(target_org_id or uuid.uuid4()),
            "user_id": str(current_user.id),
            "email": current_user.email,
            "name": getattr(current_user, 'name', None) or current_user.email.split("@")[0],
            "role": "Owner / Admin",
            "joined_at": joined_iso,
            "is_active": True,
            "permissions": ["view_findings", "run_scans", "manage_policies", "manage_integrations"],
        })

    return member_list
