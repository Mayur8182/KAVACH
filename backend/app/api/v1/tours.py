"""Persistent Interactive Product Onboarding & Guided Tours API

Authoritative PostgreSQL/SQLite backend implementation providing:
- Per-user and per-workspace persistent onboarding state
- Completed and active tour tracking across multiple devices
- Module-specific walkthrough status for Thing Code, Cloud, Attack, Protect & Compliance
- Deterministic audit event logging for all tour transitions
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.audit_service import AuditService

router = APIRouter(tags=["Guided Tours & Onboarding State"])

# Canonical tour identifiers
KNOWN_TOURS = [
    {
        "id": "dashboard_overview",
        "name": "SecuLayer Control Plane Tour",
        "description": "5-step interactive walkthrough of the unified security workspace",
        "module": "global",
        "steps_count": 5,
    },
    {
        "id": "thing_code",
        "name": "Thing Code Security Walkthrough",
        "description": "Deterministic SAST, secret detection, and signed remediation diffs",
        "module": "code",
        "steps_count": 4,
    },
    {
        "id": "thing_cloud",
        "name": "Thing Cloud & CSPM Walkthrough",
        "description": "Multi-cloud infrastructure posture, Kubernetes drift, and CIS benchmarks",
        "module": "cloud",
        "steps_count": 4,
    },
    {
        "id": "thing_attack",
        "name": "Thing Attack Surface & DAST Walkthrough",
        "description": "External domain discovery, automated penetration testing, and reachability",
        "module": "attack",
        "steps_count": 3,
    },
    {
        "id": "thing_protect",
        "name": "Thing Protect & Runtime Gate Walkthrough",
        "description": "eBPF kernel-level behavioral control and AI agent MCP security proxy",
        "module": "protect",
        "steps_count": 3,
    },
    {
        "id": "thing_compliance",
        "name": "Thing Compliance & Audit Readiness Walkthrough",
        "description": "Automated SOC 2, ISO 27001 evidence packages and OPA policy evaluation",
        "module": "governance",
        "steps_count": 4,
    },
]


class TourCompletePayload(BaseModel):
    tour_id: str = Field(description="Unique identifier of the completed or dismissed tour")
    step_index: Optional[int] = Field(default=None, description="Last viewed step index (0-based)")
    dismissed: bool = Field(default=False, description="True if dismissed early, False if finished all steps")


class TourResetPayload(BaseModel):
    tour_id: str = Field(description="Tour identifier to reset for re-taking")


class OnboardingStatePayload(BaseModel):
    current_step: Optional[str] = Field(default=None, description="Active setup step")
    completed_steps: Optional[List[str]] = Field(default=None, description="List of completed step keys")
    selected_products: Optional[List[str]] = Field(default=None, description="Enabled product keys")
    status: Optional[str] = Field(default=None, description="NOT_STARTED | IN_PROGRESS | COMPLETED")
    onboarding_completed: Optional[bool] = Field(default=None, description="Mark entire onboarding completed")
    role: Optional[str] = Field(default=None, description="User role (e.g. DevSecOps, AppSec Lead, Developer)")
    team_size: Optional[str] = Field(default=None, description="Team size category")
    tech_stack: Optional[List[str]] = Field(default=None, description="Primary technology stack")
    security_requirements: Optional[List[str]] = Field(default=None, description="Compliance & security requirements")
    intended_use_cases: Optional[List[str]] = Field(default=None, description="Primary intended use cases")
    organization_name: Optional[str] = Field(default=None, description="Organization name")
    workspace_name: Optional[str] = Field(default=None, description="Workspace name")
    project_name: Optional[str] = Field(default=None, description="Project name")
    industry: Optional[str] = Field(default=None, description="Industry domain")
    compliance_frameworks: Optional[List[str]] = Field(default=None, description="Compliance frameworks (e.g. SOC2, ISO27001)")


class TourStatusResponse(BaseModel):
    onboarding_completed: bool
    onboarding_state: Dict[str, Any]
    completed_tours: List[str]
    active_tour: Optional[str] = None
    available_tours: List[Dict[str, Any]]


@router.get(
    "/tours/status",
    response_model=TourStatusResponse,
    summary="Get user onboarding and guided tour completion status",
    description="Returns server-persisted onboarding and tour progress for the authenticated user.",
)
async def get_tour_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TourStatusResponse:
    # Ensure raw user properties are sanitized
    state = dict(getattr(current_user, "onboarding_state", {}) or {})
    completed = list(getattr(current_user, "completed_tours", []) or [])
    onboarding_done = bool(getattr(current_user, "onboarding_completed", False))

    if not state:
        state = {
            "status": "COMPLETED" if onboarding_done else "NOT_STARTED",
            "current_step": "completed" if onboarding_done else "welcome",
            "completed_steps": ["welcome", "organization", "project", "products", "repository", "first_scan"] if onboarding_done else [],
            "tour_history": {},
            "selected_products": ["thing_code", "thing_cloud"],
        }

    return TourStatusResponse(
        onboarding_completed=onboarding_done,
        onboarding_state=state,
        completed_tours=completed,
        active_tour=state.get("active_tour"),
        available_tours=KNOWN_TOURS,
    )


@router.post(
    "/tours/complete",
    response_model=TourStatusResponse,
    summary="Record tour completion or dismissal",
    description="Persists completed tour state to the database and logs a tamper-evident audit event.",
)
async def complete_tour(
    payload: TourCompletePayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TourStatusResponse:
    audit = AuditService(db)
    request_id = getattr(request.state, "request_id", None)
    now_iso = datetime.now(timezone.utc).isoformat()

    completed_list = list(getattr(current_user, "completed_tours", []) or [])
    if payload.tour_id not in completed_list:
        completed_list.append(payload.tour_id)

    state = dict(getattr(current_user, "onboarding_state", {}) or {})
    tour_history = dict(state.get("tour_history", {}) or {})
    tour_history[payload.tour_id] = {
        "completed_at": now_iso,
        "dismissed": payload.dismissed,
        "last_step": payload.step_index,
    }
    state["tour_history"] = tour_history
    if state.get("active_tour") == payload.tour_id:
        state["active_tour"] = None
    state["updated_at"] = now_iso

    # Persist in DB
    current_user.completed_tours = completed_list
    current_user.onboarding_state = state

    await audit.log_event(
        action="GUIDED_TOUR_COMPLETED" if not payload.dismissed else "GUIDED_TOUR_DISMISSED",
        resource_type="tour",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=payload.tour_id,
        status="SUCCESS",
        metadata={
            "tour_id": payload.tour_id,
            "dismissed": payload.dismissed,
            "step_index": payload.step_index,
            "request_id": request_id,
        },
    )
    await db.commit()

    return TourStatusResponse(
        onboarding_completed=bool(current_user.onboarding_completed),
        onboarding_state=state,
        completed_tours=completed_list,
        active_tour=None,
        available_tours=KNOWN_TOURS,
    )


@router.post(
    "/tours/reset",
    response_model=TourStatusResponse,
    summary="Reset a tour to take it again",
    description="Removes the specified tour from completed list, enabling the user to replay the guided tour.",
)
async def reset_tour(
    payload: TourResetPayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TourStatusResponse:
    audit = AuditService(db)
    request_id = getattr(request.state, "request_id", None)
    now_iso = datetime.now(timezone.utc).isoformat()

    completed_list = list(getattr(current_user, "completed_tours", []) or [])
    if payload.tour_id in completed_list:
        completed_list.remove(payload.tour_id)

    state = dict(getattr(current_user, "onboarding_state", {}) or {})
    state["active_tour"] = payload.tour_id
    state["updated_at"] = now_iso

    current_user.completed_tours = completed_list
    current_user.onboarding_state = state

    await audit.log_event(
        action="GUIDED_TOUR_RESET",
        resource_type="tour",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=payload.tour_id,
        status="SUCCESS",
        metadata={"tour_id": payload.tour_id, "request_id": request_id},
    )
    await db.commit()

    return TourStatusResponse(
        onboarding_completed=bool(current_user.onboarding_completed),
        onboarding_state=state,
        completed_tours=completed_list,
        active_tour=payload.tour_id,
        available_tours=KNOWN_TOURS,
    )


@router.get(
    "/onboarding/state",
    response_model=TourStatusResponse,
    summary="Get detailed onboarding progress",
    description="Returns current setup step, completed stages, and product entitlements.",
)
async def get_onboarding_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TourStatusResponse:
    return await get_tour_status(current_user=current_user, db=db)


@router.put(
    "/onboarding/state",
    response_model=TourStatusResponse,
    summary="Update onboarding progress",
    description="Persists user onboarding progress, selected products, and completion flags.",
)
async def update_onboarding_state(
    payload: OnboardingStatePayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TourStatusResponse:
    audit = AuditService(db)
    request_id = getattr(request.state, "request_id", None)
    now_iso = datetime.now(timezone.utc).isoformat()

    state = dict(getattr(current_user, "onboarding_state", {}) or {})

    if payload.current_step is not None:
        state["current_step"] = payload.current_step
    if payload.completed_steps is not None:
        existing = set(state.get("completed_steps", []))
        existing.update(payload.completed_steps)
        state["completed_steps"] = list(existing)
    if payload.selected_products is not None:
        state["selected_products"] = payload.selected_products
    if payload.status is not None:
        state["status"] = payload.status
    if payload.role is not None:
        state["role"] = payload.role
    if payload.team_size is not None:
        state["team_size"] = payload.team_size
    if payload.tech_stack is not None:
        state["tech_stack"] = payload.tech_stack
    if payload.security_requirements is not None:
        state["security_requirements"] = payload.security_requirements
    if payload.intended_use_cases is not None:
        state["intended_use_cases"] = payload.intended_use_cases
    if payload.organization_name is not None:
        state["organization_name"] = payload.organization_name
    if payload.workspace_name is not None:
        state["workspace_name"] = payload.workspace_name
    if payload.project_name is not None:
        state["project_name"] = payload.project_name
    if payload.industry is not None:
        state["industry"] = payload.industry
    if payload.compliance_frameworks is not None:
        state["compliance_frameworks"] = payload.compliance_frameworks

    if payload.onboarding_completed is True:
        state["status"] = "COMPLETED"
        state["completed_at"] = now_iso
        current_user.onboarding_completed = True

    state["updated_at"] = now_iso
    current_user.onboarding_state = state

    await audit.log_event(
        action="ONBOARDING_STATE_UPDATED",
        resource_type="onboarding",
        actor_type="user",
        actor_id=str(current_user.id),
        resource_id=str(current_user.id),
        status="SUCCESS",
        metadata={
            "current_step": payload.current_step,
            "onboarding_completed": payload.onboarding_completed,
            "request_id": request_id,
        },
    )
    await db.commit()

    completed_list = list(getattr(current_user, "completed_tours", []) or [])

    return TourStatusResponse(
        onboarding_completed=bool(current_user.onboarding_completed),
        onboarding_state=state,
        completed_tours=completed_list,
        active_tour=state.get("active_tour"),
        available_tours=KNOWN_TOURS,
    )
